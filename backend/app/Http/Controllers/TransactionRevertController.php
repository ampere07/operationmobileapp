<?php

namespace App\Http\Controllers;

use App\Models\TransactionRevert;
use App\Models\Transaction;
use App\Models\User;
use App\Models\BillingAccount;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Events\TransactionUpdated;

class TransactionRevertController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = TransactionRevert::with([
                'transaction.account.customer',
                'transaction.processor',
                'transaction.paymentMethodInfo',
                'requester',
                'updater'
            ]);

            if ($request->has('updated_since')) {
                $query->where('updated_at', '>', $request->input('updated_since'));
            }

            $reverts = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $reverts,
                'count' => $reverts->count(),
                'server_time' => now()->toISOString()
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching transaction reverts: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch revert requests',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'transaction_id' => 'required|exists:transactions,id',
                'remarks' => 'nullable|string',
                'reason' => 'required|string',
                'requested_by' => 'nullable|string',
            ]);

            // Find user by email address
            $requestedByUserId = null;
            if (!empty($validated['requested_by'])) {
                $user = User::where('email_address', $validated['requested_by'])->first();
                if ($user) {
                    $requestedByUserId = $user->id;
                }
            }

            // Check if there's already a pending revert request for this transaction
            $existing = TransactionRevert::where('transaction_id', $validated['transaction_id'])
                ->where('status', 'pending')
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'There is already a pending revert request for this transaction'
                ], 400);
            }

            $revert = TransactionRevert::create([
                'transaction_id' => $validated['transaction_id'],
                'remarks' => $validated['remarks'] ?? null,
                'reason' => $validated['reason'],
                'status' => 'pending',
                'requested_by' => $requestedByUserId,
                'updated_by' => null,
            ]);

            $revert->load(['transaction.account.customer', 'transaction.processor', 'transaction.paymentMethodInfo', 'requester', 'updater']);

            \Log::info('Transaction revert request created', [
                'revert_id' => $revert->id,
                'transaction_id' => $validated['transaction_id'],
                'requested_by' => $validated['requested_by']
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Revert request submitted successfully',
                'data' => $revert
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Error creating transaction revert request: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit revert request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show(string $id): JsonResponse
    {
        try {
            $revert = TransactionRevert::with([
                'transaction.account.customer',
                'transaction.processor',
                'transaction.paymentMethodInfo',
                'requester',
                'updater'
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $revert
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Revert request not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'status' => 'required|string|in:pending,done,rejected',
                'updated_by' => 'nullable|string',
            ]);

            DB::beginTransaction();

            $revert = TransactionRevert::findOrFail($id);

            $updatedByUserId = null;
            if (!empty($validated['updated_by'])) {
                $user = User::where('email_address', $validated['updated_by'])->first();
                if ($user) {
                    $updatedByUserId = $user->id;
                }
            }

            $revert->status = $validated['status'];
            $revert->updated_by = $updatedByUserId ?? (Auth::id() ?? $revert->updated_by);
            $revert->save();

            // If status is being set to 'done', perform the actual revert on the transaction
            if ($validated['status'] === 'done') {
                $transaction = Transaction::findOrFail($revert->transaction_id);

                if ($transaction->status === 'Done') {
                    $accountNo = $transaction->account_no;
                    $paymentToRevert = floatval($transaction->received_payment);
                    $transactionId = $transaction->id;
                    $userId = Auth::id();
                    $currentTime = now();

                    if ($accountNo) {
                        $billingAccount = BillingAccount::where('account_no', $accountNo)->first();

                        if ($billingAccount && $transaction->transaction_type !== 'Security Deposit') {
                            $currentBalance = floatval($billingAccount->account_balance ?? 0);
                            $newBalance = $currentBalance + $paymentToRevert;

                            $billingAccount->account_balance = round($newBalance, 2);
                            $billingAccount->balance_update_date = $currentTime;
                            $billingAccount->updated_by = $userId;
                            $billingAccount->save();

                            // Revert Invoice Payments
                            $invoices = \App\Models\Invoice::where('transaction_id', $transactionId)
                                ->orderBy('invoice_date', 'desc')
                                ->get();

                            $remainingToRevert = $paymentToRevert;

                            foreach ($invoices as $invoice) {
                                if ($remainingToRevert <= 0) break;

                                $currentReceived = floatval($invoice->received_payment ?? 0);
                                $toSubtract = min($currentReceived, $remainingToRevert);
                                $newReceived = $currentReceived - $toSubtract;
                                $invoice->received_payment = round($newReceived, 2);

                                if ($newReceived <= 0) {
                                    $invoice->status = 'Unpaid';
                                } else {
                                    $invoice->status = 'Partial';
                                }

                                $invoice->transaction_id = null;
                                $invoice->updated_by = Auth::check() ? Auth::user()->email_address : 'unknown';
                                $invoice->updated_at = $currentTime;
                                $invoice->save();

                                $remainingToRevert -= $toSubtract;
                            }
                        }

                        // Update transaction status
                        $transaction->status = 'Pending';
                        $transaction->date_processed = null;
                        $transaction->approved_by = null;
                        $transaction->account_balance_before = null;
                        $transaction->updated_by_user = Auth::check() ? Auth::user()->email_address : 'unknown';
                        $transaction->save();

                        // Activity log
                        \App\Models\ActivityLog::log(
                            'Transaction Reverted via Revert Request',
                            "Transaction #{$transactionId} ({$accountNo}) reverted after revert request #{$revert->id} approved",
                            'warning',
                            [
                                'resource_type' => 'Transaction',
                                'resource_id' => $transactionId,
                                'additional_data' => [
                                    'revert_request_id' => $revert->id,
                                    'account_no' => $accountNo,
                                    'payment_amount' => $paymentToRevert,
                                ]
                            ]
                        );

                        event(new TransactionUpdated(['action' => 'reverted', 'transaction_id' => $transactionId, 'account_no' => $accountNo]));
                    }
                }
            }

            DB::commit();

            $revert->load(['transaction.account.customer', 'transaction.processor', 'transaction.paymentMethodInfo', 'requester', 'updater']);

            return response()->json([
                'success' => true,
                'message' => 'Revert request status updated successfully',
                'data' => $revert
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error updating revert request status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
