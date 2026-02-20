<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\BillingAccount;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Services\ManualRadiusOperationsService;

class TransactionController extends Controller
{
    public function index(): JsonResponse
    {
        try {
            $limit = request()->input('limit');
            $offset = request()->input('offset');

            $query = Transaction::with(['account.customer', 'account.technicalDetails', 'processor', 'paymentMethodInfo'])
                ->orderBy('created_at', 'desc')
                ->orderBy('id', 'desc');

            if ($limit && $limit > 0) {
                $transactions = $query->skip($offset ?? 0)->take($limit)->get();
            } else {
                $transactions = $query->get();
            }

            \Log::info('Fetched transactions', [
                'count' => $transactions->count(),
                'sample_transaction' => $transactions->first() ? [
                    'id' => $transactions->first()->id,
                    'account_no' => $transactions->first()->account_no,
                    'has_account' => $transactions->first()->account ? true : false,
                    'has_customer' => $transactions->first()->account && $transactions->first()->account->customer ? true : false,
                    'customer_full_name' => $transactions->first()->account && $transactions->first()->account->customer ? $transactions->first()->account->customer->full_name : null
                ] : null
            ]);

            return response()->json([
                'success' => true,
                'data' => $transactions,
                'count' => $transactions->count(),
                'total' => Transaction::count()
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching transactions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch transactions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            \Log::info('Transaction store request received', [
                'request_data' => $request->all()
            ]);

            $validated = $request->validate([
                'account_no' => 'nullable|exists:billing_accounts,account_no',
                'transaction_type' => 'required|in:Installation Fee,Recurring Fee,Security Deposit',
                'received_payment' => 'required|numeric|min:0',
                'payment_date' => 'required|date',
                'date_processed' => 'nullable|date',
                'processed_by_user_id' => 'nullable|exists:users,id',
                'processed_by_user' => 'nullable|string|max:255',
                'payment_method' => 'required|string|max:255',
                'reference_no' => 'required|string|max:255',
                'or_no' => 'required|string|max:255',
                'remarks' => 'nullable|string',
                'status' => 'nullable|string|max:100',
                'image_url' => 'nullable|string|max:255',
                'auto_apply_payment' => 'nullable|boolean',
            ]);

            \Log::info('Transaction validation passed', [
                'validated_data' => $validated
            ]);

            DB::beginTransaction();

            $validated['payment_date'] = \Carbon\Carbon::parse($validated['payment_date'])->format('Y-m-d H:i:s');
            $validated['date_processed'] = isset($validated['date_processed']) 
                ? \Carbon\Carbon::parse($validated['date_processed'])->format('Y-m-d H:i:s')
                : now()->format('Y-m-d H:i:s');
            $validated['status'] = $validated['status'] ?? 'Pending';
            $validated['created_by_user'] = Auth::check() ? Auth::user()->email_address : 'unknown';
            $validated['updated_by_user'] = Auth::check() ? Auth::user()->email_address : 'unknown';
            
            // If processed_by_user is not provided in request, default to authenticated user
            if (!isset($validated['processed_by_user'])) {
                $validated['processed_by_user'] = Auth::check() ? Auth::user()->email_address : 'unknown';
            }

            $autoApplyPayment = $validated['auto_apply_payment'] ?? false;
            unset($validated['auto_apply_payment']);

            \Log::info('Creating transaction record', [
                'data_to_create' => $validated
            ]);

            $transaction = Transaction::create($validated);

            \Log::info('Transaction record created', [
                'transaction_id' => $transaction->id,
                'account_no' => $transaction->account_no
            ]);

            if ($autoApplyPayment && $transaction->account_no) {
                \Log::info('Auto-applying payment', [
                    'transaction_id' => $transaction->id,
                    'account_no' => $transaction->account_no
                ]);

                $billingAccount = BillingAccount::where('account_no', $transaction->account_no)->first();
                if ($billingAccount) {
                    $appliedData = $this->applyPaymentToAccount(
                        $billingAccount->id,
                        $transaction->account_no,
                        $transaction->received_payment,
                        $transaction->id,
                        Auth::id(),
                        now()
                    );

                    $transaction->status = 'Done';
                    $transaction->account_balance_before = $appliedData['old_balance'];
                    $transaction->approved_by = Auth::check() ? Auth::user()->email : 'unknown';
                    $transaction->save();

                    \Log::info('Payment auto-applied successfully', [
                        'transaction_id' => $transaction->id
                    ]);

                    // Send Approval Notifications
                    if ($billingAccount) {
                        $this->sendApprovalSms($billingAccount, $appliedData['invoices_updated']['invoices_paid'] ?? [], $transaction->received_payment);
                        $this->sendApprovalEmail($billingAccount, $appliedData['invoices_updated']['invoices_paid'] ?? [], $transaction->received_payment);
                    }

                } else {
                    \Log::warning('Billing account not found for auto-apply', [
                        'account_no' => $transaction->account_no
                    ]);
                }
            }

            DB::commit();

            \Log::info('Transaction created successfully', [
                'transaction_id' => $transaction->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Transaction created successfully',
                'data' => $transaction->load(['account.customer', 'account.technicalDetails', 'processor', 'paymentMethodInfo'])
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            \Log::error('Transaction validation failed', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error creating transaction', [
                'error_message' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'stack_trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create transaction',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show(string $id): JsonResponse
    {
        try {
            $transaction = Transaction::with(['account.customer', 'account.technicalDetails', 'processor', 'paymentMethodInfo'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $transaction
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching transaction: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Transaction not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        try {
            $request->validate([
                'approved_by' => 'nullable|string|email'
            ]);

            DB::beginTransaction();

            $transaction = Transaction::findOrFail($id);

            if ($transaction->status !== 'Pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only pending transactions can be approved'
                ], 400);
            }

            $accountNo = $transaction->account_no;
            $paymentReceived = $transaction->received_payment;
            $transactionId = $transaction->id;
            $userId = Auth::id();
            $currentTime = now();

            if (!$accountNo) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction has no associated account number'
                ], 400);
            }

            $billingAccount = BillingAccount::where('account_no', $accountNo)->first();
            if (!$billingAccount) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Billing account not found'
                ], 404);
            }

            \Log::info('Transaction approval started', [
                'transaction_id' => $transactionId,
                'account_no' => $accountNo,
                'account_id' => $billingAccount->id,
                'payment_received' => $paymentReceived,
                'current_balance' => $billingAccount->account_balance
            ]);

            $currentBalance = floatval($billingAccount->account_balance ?? 0);
            $newBalance = $currentBalance - $paymentReceived;

            $billingAccount->account_balance = round($newBalance, 2);
            $billingAccount->balance_update_date = $currentTime;
            $billingAccount->updated_by = $userId;
            $billingAccount->save();

            \Log::info('Account balance updated', [
                'account_no' => $accountNo,
                'account_id' => $billingAccount->id,
                'old_balance' => $currentBalance,
                'new_balance' => $newBalance,
                'payment_applied' => $paymentReceived
            ]);

            $invoiceUpdateResult = $this->updateInvoiceDetails($accountNo, $paymentReceived, $transactionId, $userId, $currentTime);

            $transaction->status = 'Done';
            $transaction->date_processed = $currentTime;
            $transaction->updated_by_user = Auth::check() ? Auth::user()->email_address : 'unknown';
            $transaction->approved_by = $request->input('approved_by') ?? (Auth::check() ? Auth::user()->email_address : 'unknown');
            $transaction->account_balance_before = $currentBalance;
            $transaction->save();

            DB::commit();

            \Log::info('Transaction approved successfully', [
                'transaction_id' => $transactionId,
                'account_no' => $accountNo,
                'status' => 'Done',
                'invoices_paid' => $invoiceUpdateResult['invoices_paid'],
                'invoices_partial' => $invoiceUpdateResult['invoices_partial']
            ]);

            // Send Approval Notifications (previously only on Paid status)
            $this->sendApprovalSms($billingAccount, $invoiceUpdateResult['invoices_paid'] ?? [], $paymentReceived);
            $this->sendApprovalEmail($billingAccount, $invoiceUpdateResult['invoices_paid'] ?? [], $paymentReceived);


            // Attempt reconnection after successful approval
            $reconnectStatus = $this->attemptReconnectionAfterApproval($billingAccount);

            return response()->json([
                'success' => true,
                'message' => 'Transaction approved successfully',
                'data' => [
                    'transaction' => $transaction,
                    'new_balance' => $newBalance,
                    'status' => 'Done',
                    'invoices_paid' => $invoiceUpdateResult['invoices_paid'],
                    'invoices_partial' => $invoiceUpdateResult['invoices_partial'],
                    'payment_distribution' => $invoiceUpdateResult['distribution'],
                    'reconnect_status' => $reconnectStatus
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error approving transaction: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve transaction',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function applyPaymentToAccount(int $accountId, string $accountNo, float $paymentReceived, int $transactionId, ?int $userId, $currentTime): array
    {
        $billingAccount = BillingAccount::find($accountId);
        if (!$billingAccount) {
            throw new \Exception('Billing account not found');
        }

        $currentBalance = floatval($billingAccount->account_balance ?? 0);
        $newBalance = $currentBalance - $paymentReceived;

        $billingAccount->account_balance = round($newBalance, 2);
        $billingAccount->balance_update_date = $currentTime;
        $billingAccount->updated_by = $userId;
        $billingAccount->save();

        $invoiceResults = $this->updateInvoiceDetails($accountNo, $paymentReceived, $transactionId, $userId, $currentTime);

        return [
            'old_balance' => $currentBalance,
            'new_balance' => $newBalance,
            'payment_applied' => $paymentReceived,
            'invoices_updated' => $invoiceResults
        ];
    }

    private function updateInvoiceDetails(string $accountNo, float $paymentReceived, int $transactionId, ?int $userId, $currentTime): array
    {
        $invoices = \App\Models\Invoice::where('account_no', $accountNo)
            ->whereIn('status', ['Unpaid', 'Partial'])
            ->orderBy('invoice_date', 'asc')
            ->get();

        \Log::info('Processing invoices for payment', [
            'account_no' => $accountNo,
            'payment_amount' => $paymentReceived,
            'unpaid_invoices_count' => $invoices->count()
        ]);

        $remainingPayment = $paymentReceived;
        $invoicesPaid = [];
        $invoicesPartial = [];
        $distribution = [];

        foreach ($invoices as $invoice) {
            if ($remainingPayment <= 0) {
                break;
            }

            $totalAmount = floatval($invoice->total_amount ?? 0);
            $currentReceived = floatval($invoice->received_payment ?? 0);
            $amountDue = $totalAmount - $currentReceived;

            \Log::info('Processing invoice', [
                'invoice_id' => $invoice->id,
                'total_amount' => $totalAmount,
                'current_received' => $currentReceived,
                'amount_due' => $amountDue,
                'remaining_payment' => $remainingPayment
            ]);

            $paymentApplied = 0;

            if ($remainingPayment >= $amountDue) {
                $invoice->received_payment = round($totalAmount, 2);
                $invoice->status = 'Paid';
                $paymentApplied = $amountDue;
                $remainingPayment -= $amountDue;
                $invoicesPaid[] = [
                    'invoice_id' => $invoice->id,
                    'invoice_date' => $invoice->invoice_date,
                    'amount_paid' => $amountDue,
                    'total_amount' => $totalAmount,
                    'status' => 'Paid'
                ];
                \Log::info('Invoice fully paid', [
                    'invoice_id' => $invoice->id,
                    'amount_paid' => $amountDue,
                    'remaining_payment' => $remainingPayment
                ]);
            } else {
                $invoice->received_payment = round($currentReceived + $remainingPayment, 2);
                $invoice->status = 'Partial';
                $paymentApplied = $remainingPayment;
                $invoicesPartial[] = [
                    'invoice_id' => $invoice->id,
                    'invoice_date' => $invoice->invoice_date,
                    'amount_paid' => $remainingPayment,
                    'amount_due' => $amountDue - $remainingPayment,
                    'total_amount' => $totalAmount,
                    'status' => 'Partial'
                ];
                \Log::info('Invoice partially paid', [
                    'invoice_id' => $invoice->id,
                    'amount_paid' => $remainingPayment,
                    'new_received' => $invoice->received_payment,
                    'still_owed' => $amountDue - $remainingPayment
                ]);
                $remainingPayment = 0;
            }

            $distribution[] = [
                'invoice_id' => $invoice->id,
                'invoice_date' => $invoice->invoice_date,
                'total_amount' => $totalAmount,
                'previous_received' => $currentReceived,
                'payment_applied' => $paymentApplied,
                'new_received' => $invoice->received_payment,
                'status' => $invoice->status
            ];

            $invoice->transaction_id = $transactionId;
            $invoice->updated_by = Auth::check() ? Auth::user()->email_address : 'unknown';
            $invoice->updated_at = $currentTime;
            $invoice->save();
        }

        \Log::info('Invoice payment distribution complete', [
            'total_payment' => $paymentReceived,
            'remaining_payment' => $remainingPayment,
            'invoices_paid_count' => count($invoicesPaid),
            'invoices_partial_count' => count($invoicesPartial)
        ]);

        return [
            'invoices_paid' => $invoicesPaid,
            'invoices_partial' => $invoicesPartial,
            'distribution' => $distribution,
            'remaining_payment' => $remainingPayment
        ];
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        try {
            $request->validate([
                'status' => 'required|string|in:Pending,Done,Processing,Cancelled'
            ]);

            DB::beginTransaction();

            $transaction = Transaction::findOrFail($id);
            $transaction->status = $request->status;
            $transaction->updated_by_user = Auth::check() ? Auth::user()->email_address : 'unknown';
            $transaction->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Transaction status updated successfully',
                'data' => $transaction
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error updating transaction status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update transaction status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function batchApprove(Request $request): JsonResponse
    {
        try {
            \Log::info('Batch approve request received', [
                'transaction_ids' => $request->input('transaction_ids'),
                'transaction_ids_type' => gettype($request->input('transaction_ids')),
                'first_id_type' => $request->input('transaction_ids.0') ? gettype($request->input('transaction_ids.0')) : 'null'
            ]);

            $validated = $request->validate([
                'transaction_ids' => 'required|array',
                'transaction_ids.*' => 'required|exists:transactions,id',
                'approved_by' => 'nullable|string|email'
            ]);

            $transactionIds = $validated['transaction_ids'];
            $results = [
                'success' => [],
                'failed' => [],
                'total' => count($transactionIds)
            ];

            $accountPayments = []; // Track consolidated payments per account for notifications

            foreach ($transactionIds as $transactionId) {
                try {
                    DB::beginTransaction();

                    $transaction = Transaction::findOrFail($transactionId);

                    if ($transaction->status !== 'Pending') {
                        $results['failed'][] = [
                            'transaction_id' => $transactionId,
                            'reason' => 'Only pending transactions can be approved',
                            'current_status' => $transaction->status
                        ];
                        DB::rollBack();
                        continue;
                    }

                    $accountNo = $transaction->account_no;
                    $paymentReceived = $transaction->received_payment;
                    $userId = Auth::id();
                    $currentTime = now();

                    if (!$accountNo) {
                        $results['failed'][] = [
                            'transaction_id' => $transactionId,
                            'reason' => 'Transaction has no associated account number'
                        ];
                        DB::rollBack();
                        continue;
                    }

                    $billingAccount = BillingAccount::where('account_no', $accountNo)->first();
                    if (!$billingAccount) {
                        $results['failed'][] = [
                            'transaction_id' => $transactionId,
                            'reason' => 'Billing account not found',
                            'account_no' => $accountNo
                        ];
                        DB::rollBack();
                        continue;
                    }

                    $currentBalance = floatval($billingAccount->account_balance ?? 0);
                    $newBalance = $currentBalance - $paymentReceived;

                    $billingAccount->account_balance = round($newBalance, 2);
                    $billingAccount->balance_update_date = $currentTime;
                    $billingAccount->updated_by = $userId;
                    $billingAccount->save();

                    $invoiceUpdateResult = $this->updateInvoiceDetails($accountNo, $paymentReceived, $transaction->id, $userId, $currentTime);

                    $transaction->status = 'Done';
                    $transaction->date_processed = $currentTime;
                    $transaction->updated_by_user = Auth::check() ? Auth::user()->email_address : 'unknown';
                    $transaction->approved_by = $request->input('approved_by') ?? (Auth::check() ? Auth::user()->email_address : 'unknown');
                    $transaction->account_balance_before = $currentBalance;
                    $transaction->save();

                    DB::commit();

                    // Track for consolidated notification (Always track success now)
                    if (!isset($accountPayments[$accountNo])) {
                        $accountPayments[$accountNo] = [
                            'account' => $billingAccount,
                            'invoices' => [],
                            'total' => 0
                        ];
                    }
                    if (!empty($invoiceUpdateResult['invoices_paid'])) {
                        $accountPayments[$accountNo]['invoices'] = array_merge($accountPayments[$accountNo]['invoices'], $invoiceUpdateResult['invoices_paid']);
                    }
                    $accountPayments[$accountNo]['total'] += $paymentReceived;

                    // Attempt reconnection after successful approval
                    $reconnectStatus = $this->attemptReconnectionAfterApproval($billingAccount);

                    $results['success'][] = [
                        'transaction_id' => $transactionId,
                        'account_no' => $accountNo,
                        'payment_applied' => $paymentReceived,
                        'new_balance' => $newBalance,
                        'invoices_paid' => count($invoiceUpdateResult['invoices_paid']),
                        'invoices_partial' => count($invoiceUpdateResult['invoices_partial']),
                        'reconnect_status' => $reconnectStatus
                    ];

                    \Log::info('Batch approval - Transaction approved', [
                        'transaction_id' => $transactionId,
                        'account_no' => $accountNo,
                        'reconnect_status' => $reconnectStatus
                    ]);
                } catch (\Exception $e) {
                    DB::rollBack();
                    $results['failed'][] = [
                        'transaction_id' => $transactionId,
                        'reason' => $e->getMessage()
                    ];
                    \Log::error('Batch approval - Transaction failed', [
                        'transaction_id' => $transactionId,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Send consolidated notifications for each account (Successfully approved)
            foreach ($accountPayments as $accountNo => $data) {
                $this->sendApprovalSms($data['account'], $data['invoices'], $data['total']);
                $this->sendApprovalEmail($data['account'], $data['invoices'], $data['total']);
            }


            $successCount = count($results['success']);
            $failedCount = count($results['failed']);

            \Log::info('Batch approval completed', [
                'total' => $results['total'],
                'success' => $successCount,
                'failed' => $failedCount
            ]);

            return response()->json([
                'success' => true,
                'message' => "Batch approval completed: {$successCount} successful, {$failedCount} failed",
                'data' => $results
            ]);
        } catch (\Exception $e) {
            \Log::error('Batch approval error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to process batch approval',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function uploadImages(Request $request): JsonResponse
    {
        try {
            $folderName = $request->input('folder_name', 'transactions');
            
            $googleDriveService = new \App\Services\GoogleDriveService();
            $folderId = $googleDriveService->createFolder($folderName);
            
            $imageUrls = [];
            
            if ($request->hasFile('payment_proof_image')) {
                $file = $request->file('payment_proof_image');
                $fileName = 'payment_proof_' . time() . '.' . $file->getClientOriginalExtension();
                
                $fileUrl = $googleDriveService->uploadFile(
                    $file,
                    $folderId,
                    $fileName,
                    $file->getMimeType()
                );
                
                if ($fileUrl) {
                    $imageUrls['payment_proof_image_url'] = $fileUrl;
                }
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Images uploaded successfully',
                'data' => $imageUrls,
                'folder_id' => $folderId
            ]);
        } catch (\Exception $e) {
            \Log::error('Error uploading transaction images: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload images',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Attempt to reconnect user account after transaction approval
     * Only reconnects if billing_status_id is not 1 (Active) and balance is 0 or negative
     */
    private function attemptReconnectionAfterApproval($billingAccount): string
    {
        try {
            // Reload billing account to get latest balance and status
            $billingAccount = BillingAccount::find($billingAccount->id);
            $accountNo = $billingAccount->account_no;
            
            \Log::info('[TRANSACTION RECONNECT] Starting check for account: ' . $accountNo);

            // Step 1: Check if balance qualifies (0 or negative)
            $balance = floatval($billingAccount->account_balance ?? 0);
            if ($balance > 0) {
                \Log::info('[TRANSACTION RECONNECT SKIP] Balance is positive: ₱' . $balance);
                return 'balance_positive';
            }

            // Step 2: Check if billing status is NOT 1 (Active)
            if ($billingAccount->billing_status_id == 1) {
                \Log::info('[TRANSACTION RECONNECT SKIP] Account is already Active (Status ID: 1)');
                return 'already_active';
            }

            // Step 3: Get account details (PPPoE Username and Plan)
            // Join with technical_details for username, and customers for plan
            $accountInfo = DB::table('billing_accounts')
                ->leftJoin('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                ->leftJoin('technical_details', 'billing_accounts.id', '=', 'technical_details.account_id')
                ->where('billing_accounts.id', $billingAccount->id)
                ->select('technical_details.username as pppoe_username', 'customers.desired_plan')
                ->first();

            $username = $accountInfo->pppoe_username ?? null;
            $plan = $accountInfo->desired_plan ?? null;

            if (empty($username)) {
                \Log::info('[TRANSACTION RECONNECT SKIP] No PPPoE username found in technical_details');
                return 'no_username';
            }

            if (empty($plan)) {
                \Log::info('[TRANSACTION RECONNECT SKIP] No plan found');
                return 'no_plan';
            }

            \Log::info('[TRANSACTION RECONNECT PROCEED] Conditions met - Status not Active, Balance: ₱' . $balance);

            // Step 4: Update billing_status_id to 1 (Active) BEFORE reconnecting
            // The user requested: "it will update the billing_status_id of that account_no to 1 and after the update it will use the reconnectUser"
            $billingAccount->billing_status_id = 1;
            $billingAccount->updated_at = now();
            $billingAccount->updated_by = Auth::id();
            $billingAccount->save();
            
            \Log::info('[TRANSACTION RECONNECT DB] Updated billing_status_id to 1 for Account: ' . $accountNo);

            // Step 5: Prepare parameters for ManualRadiusOperationsService
            $params = [
                'accountNumber' => $accountNo,
                'username' => $username,
                'plan' => $plan,
                'updatedBy' => 'Transaction Approval Auto-Reconnect'
            ];

            // Step 6: Call ManualRadiusOperationsService reconnectUser
            // This will:
            // 1. Update Radius Group (to plan name)
            // 2. Kill User Session (isDisconnectAction = true)
            // 3. Update DB Status (again)
            \Log::info('[TRANSACTION RECONNECT EXECUTE] Calling ManualRadiusOperationsService for ' . $username);
            
            $manualRadiusService = new ManualRadiusOperationsService();
            $result = $manualRadiusService->reconnectUser($params);

            if ($result['status'] === 'success') {
                \Log::info('[TRANSACTION RECONNECT SUCCESS] Reconnection and Session Kill completed successfully');

                // Send SMS Notification
                try {
                    // Fetch SMS template
                    $smsTemplate = DB::table('sms_templates')
                        ->where('template_type', 'Reconnect')
                        ->where('is_active', 1)
                        ->first();

                    if ($smsTemplate) {
                        // Get Customer Name and Contact Number
                        $customerInfo = DB::table('billing_accounts')
                            ->join('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                            ->where('billing_accounts.account_no', $accountNo)
                            ->select(
                                'customers.contact_number_primary',
                                'customers.email_address',
                                DB::raw("CONCAT(customers.first_name, ' ', IFNULL(customers.middle_initial, ''), ' ', customers.last_name) as full_name")
                            )
                            ->first();

                        if ($customerInfo && !empty($customerInfo->contact_number_primary)) {
                            // Replace variables
                            $message = $smsTemplate->message_content;
                            $customerName = preg_replace('/\s+/', ' ', trim($customerInfo->full_name));
                            $planNameFormatted = str_replace('₱', 'P', $plan ?? '');
                            
                            $message = str_replace('{{customer_name}}', $customerName, $message);
                            $message = str_replace('{{account_no}}', $accountNo, $message);
                            $message = str_replace('{{plan_name}}', $planNameFormatted, $message);
                            $message = str_replace('{{plan_nam}}', $planNameFormatted, $message);

                            // Send SMS
                            $smsService = new \App\Services\ItexmoSmsService();
                            $smsResult = $smsService->send([
                                'contact_no' => $customerInfo->contact_number_primary,
                                'message' => $message
                            ]);

                            if ($smsResult['success']) {
                                \Log::info('[TRANSACTION RECONNECT SMS] SMS sent to ' . $customerInfo->contact_number_primary);
                            } else {
                                \Log::error('[TRANSACTION RECONNECT SMS FAILED] ' . ($smsResult['error'] ?? 'Unknown error'));
                            }
                        } else {
                            \Log::warning('[TRANSACTION RECONNECT SMS SKIP] No contact number found for account ' . $accountNo);
                        }
                    } else {
                        \Log::warning('[TRANSACTION RECONNECT SMS SKIP] No active Reconnect SMS template found');
                    }
                } catch (\Exception $e) {
                    \Log::error('[TRANSACTION RECONNECT SMS EXCEPTION] ' . $e->getMessage());
                }

                // Send Email Notification
                try {
                    if (!empty($customerInfo->email_address)) {
                         $emailService = app(\App\Services\EmailQueueService::class);
                         
                         $emailData = [
                             'Full_Name' => $customerInfo->full_name,
                             'Plan' => $plan,
                             'Account_No' => $accountNo,
                             'account_no' => $accountNo,
                             'recipient_email' => $customerInfo->email_address,
                         ];

                         $emailService->queueFromTemplate('RECONNECT', $emailData);
                         
                         \Log::info('[TRANSACTION RECONNECT EMAIL] Email queued for ' . $customerInfo->email_address);
                    } else {
                        \Log::warning('[TRANSACTION RECONNECT EMAIL SKIP] No email address for customer');
                    }
                } catch (\Exception $e) {
                    \Log::error('[TRANSACTION RECONNECT EMAIL EXCEPTION] ' . $e->getMessage());
                }

                return 'success';
            } else {
                \Log::info('[TRANSACTION RECONNECT FAILED] ' . $result['message']);
                return 'failed';
            }

        } catch (\Exception $e) {
            \Log::error('[TRANSACTION RECONNECT EXCEPTION] ' . $e->getMessage());
            \Log::error('[TRANSACTION RECONNECT EXCEPTION] Trace: ' . $e->getTraceAsString());
            return 'exception';
        }
    }

    private function replaceGlobalVariables(string $message): string
    {
        $portalUrl = 'sync.atssfiber.ph';
        $brandName = DB::table('form_ui')->value('brand_name') ?? 'Your ISP';

        $message = str_replace('{{portal_url}}', $portalUrl, $message);
        $message = str_replace('{{company_name}}', $brandName, $message);

        return $message;
    }

    /**
     * Send Transaction Approval SMS notification
     */
    private function sendApprovalSms($billingAccount, $invoicesPaid, $totalPaidAmount)
    {
        try {
            $billingAccount->load('customer');
            $customer = $billingAccount->customer;
            
            if ($customer && !empty($customer->contact_number_primary)) {
                $paidTemplate = DB::table('sms_templates')
                    ->where('template_name', 'Paid')
                    ->where('is_active', 1)
                    ->first();
                    
                if ($paidTemplate) {
                    $smsService = new \App\Services\ItexmoSmsService();
                    
                    // Consolidate invoice IDs or use N/A if none
                    $invoiceIds = !empty($invoicesPaid) 
                        ? collect($invoicesPaid)->pluck('invoice_id')->unique()->implode(', ')
                        : 'N/A';
                    
                    $message = $paidTemplate->message_content;
                    
                    // Replace variables
                    $customerName = preg_replace('/\s+/', ' ', trim($customer->full_name));
                    $planNameRaw = $billingAccount->plan ? $billingAccount->plan->plan_name : ($customer->desired_plan ?? 'N/A');
                    $planNameFormatted = str_replace('₱', 'P', $planNameRaw);

                    $message = str_replace('{{customer_name}}', $customerName, $message);
                    $message = str_replace('{{account_no}}', $billingAccount->account_no, $message);
                    $message = str_replace('{{plan_name}}', $planNameFormatted, $message);
                    $message = str_replace('{{plan_nam}}', $planNameFormatted, $message);
                    $message = str_replace('{{invoice_id}}', $invoiceIds, $message);
                    
                    // Support multiple variations of placeholders
                    $formattedAmount = number_format($totalPaidAmount, 2);
                    $currentDate = date('Y-m-d');
                    
                    $message = str_replace('{{amount_paid}}', $formattedAmount, $message);
                    $message = str_replace('{{amount}}', $formattedAmount, $message);
                    $message = str_replace('{{date}}', $currentDate, $message);
                    $message = str_replace('{{payment_date}}', $currentDate, $message);
                    
                    $message = $this->replaceGlobalVariables($message);
                    
                    $result = $smsService->send([
                        'contact_no' => $customer->contact_number_primary,
                        'message' => $message
                    ]);
                    
                    if ($result['success']) {
                        \Log::info('Approval SMS sent', [
                            'account_no' => $billingAccount->account_no,
                            'transaction_id' => !empty($invoicesPaid) ? null : 'approved'
                        ]);
                    } else {
                        \Log::error('Approval SMS Failed: ' . ($result['error'] ?? 'Unknown error'));
                    }
                }
            }
        } catch (\Exception $e) {
            \Log::error('Failed to send Approval SMS: ' . $e->getMessage());
        }
    }

    /**
     * Send Transaction Approval Email notification
     */
    private function sendApprovalEmail($billingAccount, $invoicesPaid, $totalPaidAmount)
    {
        try {
            $billingAccount->load('customer');
            $customer = $billingAccount->customer;
            
            if ($customer && !empty($customer->email_address)) {
                $emailService = app(\App\Services\EmailQueueService::class);
                
                // Consolidate invoice IDs or use N/A
                $invoiceIds = !empty($invoicesPaid) 
                    ? collect($invoicesPaid)->pluck('invoice_id')->unique()->implode(', ')
                    : 'N/A';
                    
                $brandName = DB::table('form_ui')->value('brand_name') ?? 'Your ISP';
                
                $emailData = [
                    'Amount' => number_format($totalPaidAmount, 2),
                    'Company_Name' => $brandName,
                    'Account_No' => $billingAccount->account_no,
                    'account_no' => $billingAccount->account_no,
                    'Date' => date('Y-m-d'),
                    'Full_Name' => $customer->full_name,
                    'invoice_ids' => $invoiceIds,
                    'recipient_email' => $customer->email_address,
                ];

                $emailService->queueFromTemplate('PAID', $emailData);
                
                \Log::info('Approval Email queued via template', [
                    'account_no' => $billingAccount->account_no
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Failed to send Approval Email: ' . $e->getMessage());
        }
    }

}

