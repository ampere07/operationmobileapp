<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\BillingAccount;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class TransactionController extends Controller
{
    public function index(): JsonResponse
    {
        try {
            $transactions = Transaction::with(['account.customer', 'account.technicalDetails', 'processedByUser'])
                ->orderBy('created_at', 'desc')
                ->get();

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
                'count' => $transactions->count()
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
            $validated['created_by_user'] = Auth::check() ? Auth::user()->email : 'unknown';
            $validated['updated_by_user'] = Auth::check() ? Auth::user()->email : 'unknown';

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
                    $this->applyPaymentToAccount(
                        $billingAccount->id,
                        $transaction->account_no,
                        $transaction->received_payment,
                        $transaction->id,
                        Auth::id(),
                        now()
                    );

                    $transaction->status = 'Done';
                    $transaction->save();

                    \Log::info('Payment auto-applied successfully', [
                        'transaction_id' => $transaction->id
                    ]);
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
                'data' => $transaction->load(['account.customer', 'account.technicalDetails', 'processedByUser'])
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
            $transaction = Transaction::with(['account.customer', 'account.technicalDetails', 'processedByUser'])
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

    public function approve(string $id): JsonResponse
    {
        try {
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
            $transaction->updated_by_user = Auth::check() ? Auth::user()->email : 'unknown';
            $transaction->save();

            DB::commit();

            \Log::info('Transaction approved successfully', [
                'transaction_id' => $transactionId,
                'account_no' => $accountNo,
                'status' => 'Done',
                'invoices_paid' => $invoiceUpdateResult['invoices_paid'],
                'invoices_partial' => $invoiceUpdateResult['invoices_partial']
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Transaction approved successfully',
                'data' => [
                    'transaction' => $transaction,
                    'new_balance' => $newBalance,
                    'status' => 'Done',
                    'invoices_paid' => $invoiceUpdateResult['invoices_paid'],
                    'invoices_partial' => $invoiceUpdateResult['invoices_partial'],
                    'payment_distribution' => $invoiceUpdateResult['distribution']
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
            $invoice->updated_by = Auth::check() ? Auth::user()->email : 'unknown';
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
            $transaction->updated_by_user = Auth::check() ? Auth::user()->email : 'unknown';
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
                'transaction_ids.*' => 'required|exists:transactions,id'
            ]);

            $transactionIds = $validated['transaction_ids'];
            $results = [
                'success' => [],
                'failed' => [],
                'total' => count($transactionIds)
            ];

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
                    $transaction->updated_by_user = Auth::check() ? Auth::user()->email : 'unknown';
                    $transaction->save();

                    DB::commit();

                    $results['success'][] = [
                        'transaction_id' => $transactionId,
                        'account_no' => $accountNo,
                        'payment_applied' => $paymentReceived,
                        'new_balance' => $newBalance,
                        'invoices_paid' => count($invoiceUpdateResult['invoices_paid']),
                        'invoices_partial' => count($invoiceUpdateResult['invoices_partial'])
                    ];

                    \Log::info('Batch approval - Transaction approved', [
                        'transaction_id' => $transactionId,
                        'account_no' => $accountNo
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
}
