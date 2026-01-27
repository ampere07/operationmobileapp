<?php

namespace App\Http\Controllers;

use App\Models\StaggeredInstallation;
use App\Models\BillingAccount;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class StaggeredInstallationController extends Controller
{
    public function index(): JsonResponse
    {
        try {
            $staggeredInstallations = StaggeredInstallation::with(['billingAccount.customer'])
                ->orderBy('modified_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $staggeredInstallations,
                'count' => $staggeredInstallations->count()
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching staggered installations: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch staggered installations',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'account_no' => 'required|exists:billing_accounts,account_no',
                'staggered_install_no' => 'required|string|max:255',
                'staggered_date' => 'required|date',
                'staggered_balance' => 'required|numeric|min:0',
                'months_to_pay' => 'required|integer|min:1|max:12',
                'monthly_payment' => 'required|numeric|min:0',
                'modified_by' => 'required|string|email',
                'modified_date' => 'required|string',
                'user_email' => 'required|string|email',
                'remarks' => 'nullable|string',
            ]);

            DB::beginTransaction();

            $validated['status'] = 'Pending';

            $staggeredInstallation = StaggeredInstallation::create($validated);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Staggered installation created successfully',
                'data' => $staggeredInstallation->load(['billingAccount.customer'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error creating staggered installation: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create staggered installation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $staggered = StaggeredInstallation::findOrFail($id);

            $validated = $request->validate([
                'account_no' => 'sometimes|exists:billing_accounts,account_no',
                'staggered_install_no' => 'sometimes|string|max:255',
                'staggered_date' => 'sometimes|date',
                'staggered_balance' => 'sometimes|numeric|min:0',
                'months_to_pay' => 'sometimes|integer|min:0|max:12',
                'monthly_payment' => 'sometimes|numeric|min:0',
                'modified_by' => 'sometimes|string|email',
                'modified_date' => 'sometimes|string',
                'user_email' => 'sometimes|string|email',
                'remarks' => 'nullable|string',
                'status' => 'sometimes|string|in:Pending,Active,Completed',
            ]);

            DB::beginTransaction();

            if (!isset($validated['modified_date'])) {
                $validated['modified_date'] = now();
            }

            $staggered->update($validated);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Staggered installation updated successfully',
                'data' => $staggered->fresh()->load(['billingAccount.customer'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error updating staggered installation: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update staggered installation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function approve(string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $staggered = StaggeredInstallation::findOrFail($id);

            if ($staggered->status !== 'Pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only pending staggered installations can be approved'
                ], 400);
            }

            $accountNo = $staggered->account_no;
            $staggeredBalance = floatval($staggered->staggered_balance);

            if (!$accountNo) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Staggered installation has no associated account number'
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

            \Log::info('Staggered installation approval started', [
                'staggered_id' => $staggered->id,
                'account_no' => $accountNo,
                'staggered_balance' => $staggeredBalance
            ]);

            // Apply staggered balance to account
            $currentBalance = floatval($billingAccount->account_balance ?? 0);
            $newBalance = $currentBalance - $staggeredBalance;

            $billingAccount->account_balance = round($newBalance, 2);
            $billingAccount->balance_update_date = now();
            if (Auth::check() && Auth::user()->id) {
                $billingAccount->updated_by = Auth::user()->id;
            }
            $billingAccount->timestamps = false;
            $billingAccount->save();

            // Apply staggered balance to invoices
            $invoiceResult = $this->applyStaggeredBalanceToInvoices($accountNo, $staggeredBalance);

            // Update staggered installation status
            $staggered->status = 'Active';
            if (Auth::check() && Auth::user()->email) {
                $staggered->modified_by = Auth::user()->email;
            }
            $staggered->modified_date = now();
            $staggered->timestamps = false;
            $staggered->save();

            DB::commit();

            \Log::info('Staggered installation approved successfully', [
                'staggered_id' => $staggered->id,
                'account_no' => $accountNo,
                'status' => 'Active'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Staggered installation approved successfully',
                'data' => [
                    'staggered' => $staggered,
                    'new_balance' => $newBalance,
                    'invoices_paid' => $invoiceResult['invoices_paid'],
                    'invoices_partial' => $invoiceResult['invoices_partial']
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error approving staggered installation: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve staggered installation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function applyStaggeredBalanceToInvoices(string $accountNo, float $staggeredBalance): array
    {
        $invoices = Invoice::where('account_no', $accountNo)
            ->whereIn('status', ['Unpaid', 'Partial'])
            ->orderBy('invoice_date', 'asc')
            ->get();

        \Log::info('Applying staggered balance to invoices', [
            'account_no' => $accountNo,
            'staggered_balance' => $staggeredBalance,
            'unpaid_invoices_count' => $invoices->count()
        ]);

        $remainingBalance = $staggeredBalance;
        $invoicesPaid = [];
        $invoicesPartial = [];

        foreach ($invoices as $invoice) {
            if ($remainingBalance <= 0) {
                break;
            }

            $totalAmount = floatval($invoice->total_amount ?? 0);
            $currentReceived = floatval($invoice->received_payment ?? 0);
            $amountDue = $totalAmount - $currentReceived;

            if ($remainingBalance >= $amountDue) {
                $invoice->received_payment = round($totalAmount, 2);
                $invoice->status = 'Paid';
                $remainingBalance -= $amountDue;
                $invoicesPaid[] = [
                    'invoice_id' => $invoice->id,
                    'amount_paid' => $amountDue,
                    'status' => 'Paid'
                ];
            } else {
                $invoice->received_payment = round($currentReceived + $remainingBalance, 2);
                $invoice->status = 'Partial';
                $invoicesPartial[] = [
                    'invoice_id' => $invoice->id,
                    'amount_paid' => $remainingBalance,
                    'status' => 'Partial'
                ];
                $remainingBalance = 0;
            }

            if (Auth::check() && Auth::user()->id) {
                $invoice->updated_by = Auth::user()->id;
            }
            $invoice->timestamps = false;
            $invoice->save();
        }

        return [
            'invoices_paid' => $invoicesPaid,
            'invoices_partial' => $invoicesPartial,
            'remaining_balance' => $remainingBalance
        ];
    }

    public static function processMonthlyPayment(string $accountNo, int $invoiceId): void
    {
        try {
            // Get active staggered installations for this account
            $staggeredInstallations = StaggeredInstallation::where('account_no', $accountNo)
                ->where('status', 'Active')
                ->where('months_to_pay', '>', 0)
                ->get();

            foreach ($staggeredInstallations as $staggered) {
                $monthlyPayment = floatval($staggered->monthly_payment);
                $monthsRemaining = intval($staggered->months_to_pay);

                // Get the next empty month column
                $monthColumn = null;
                for ($i = 1; $i <= 12; $i++) {
                    $col = 'month' . $i;
                    if (empty($staggered->$col)) {
                        $monthColumn = $col;
                        break;
                    }
                }

                if (!$monthColumn) {
                    \Log::warning('No available month column for staggered installation', [
                        'staggered_id' => $staggered->id,
                        'account_no' => $accountNo
                    ]);
                    continue;
                }

                // Store invoice ID in the month column
                $staggered->$monthColumn = (string)$invoiceId;

                // Deduct 1 from months_to_pay
                $staggered->months_to_pay = $monthsRemaining - 1;

                // If months_to_pay reaches 0, mark as completed
                if ($staggered->months_to_pay <= 0) {
                    $staggered->status = 'Completed';
                }

                $staggered->modified_by = 'system';
                $staggered->modified_date = now();
                $staggered->save();

                // Apply monthly payment to the invoice
                $invoice = Invoice::find($invoiceId);
                if ($invoice) {
                    $currentReceived = floatval($invoice->received_payment ?? 0);
                    $invoice->received_payment = round($currentReceived + $monthlyPayment, 2);

                    // Update invoice status
                    $totalAmount = floatval($invoice->total_amount ?? 0);
                    if ($invoice->received_payment >= $totalAmount) {
                        $invoice->status = 'Paid';
                    } else if ($invoice->received_payment > 0) {
                        $invoice->status = 'Partial';
                    }

                    // Only set updated_by if user is authenticated
                    if (Auth::check() && Auth::user()->id) {
                        $invoice->updated_by = Auth::user()->id;
                    }
                    $invoice->timestamps = false;
                    $invoice->save();
                }

                \Log::info('Monthly payment processed for staggered installation', [
                    'staggered_id' => $staggered->id,
                    'account_no' => $accountNo,
                    'invoice_id' => $invoiceId,
                    'monthly_payment' => $monthlyPayment,
                    'months_remaining' => $staggered->months_to_pay,
                    'month_column' => $monthColumn
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Error processing monthly payment for staggered installation: ' . $e->getMessage());
        }
    }
}
