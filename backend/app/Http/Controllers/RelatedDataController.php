<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RelatedDataController extends Controller
{
    /**
     * Get related invoices by account number
     */
    public function getInvoicesByAccount(string $accountNo): JsonResponse
    {
        try {
            $invoices = DB::table('invoices')
                ->where('account_no', $accountNo)
                ->orderBy('invoice_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $invoices,
                'count' => $invoices->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching invoices for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch invoices',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related payment portal logs by account number
     */
    public function getPaymentPortalLogsByAccount(string $accountNo): JsonResponse
    {
        try {
            // First find the numeric account ID from the account number
            $billingAccount = DB::table('billing_accounts')
                ->where('account_no', $accountNo)
                ->first();
            
            if (!$billingAccount) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'count' => 0
                ]);
            }

            $logs = DB::table('payment_portal_logs')
                ->where('account_id', $billingAccount->id)
                ->select(['id', 'total_amount', 'date_time', 'status'])
                ->orderBy('date_time', 'desc')
                ->orderBy('updated_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'count' => $logs->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching payment portal logs for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment portal logs',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related transactions by account number
     */
    public function getTransactionsByAccount(string $accountNo): JsonResponse
    {
        try {
            $transactions = DB::table('transactions')
                ->leftJoin('payment_methods', 'transactions.payment_method', '=', 'payment_methods.id')
                ->where('transactions.account_no', $accountNo)
                ->select([
                    'transactions.*',
                    'payment_methods.payment_method as payment_method_name'
                ])
                ->orderBy('transactions.created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $transactions,
                'count' => $transactions->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching transactions for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch transactions',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related staggered installations by account number
     */
    public function getStaggeredByAccount(string $accountNo): JsonResponse
    {
        try {
            $staggered = DB::table('staggered_installation')
                ->where('account_no', $accountNo)
                ->select(['id', 'staggered_date', 'staggered_balance', 'monthly_payment', 'modified_date'])
                ->orderBy('staggered_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $staggered,
                'count' => $staggered->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching staggered installations for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch staggered installations',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related discounts by account number
     */
    public function getDiscountsByAccount(string $accountNo): JsonResponse
    {
        try {
            $discounts = DB::table('discounts')
                ->where('account_no', $accountNo)
                ->select(['id', 'discount_amount', 'status', 'used_date'])
                ->orderBy('used_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $discounts,
                'count' => $discounts->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching discounts for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch discounts',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related service orders by account number
     */
    public function getServiceOrdersByAccount(string $accountNo): JsonResponse
    {
        try {
            $serviceOrders = DB::table('service_orders')
                ->where('account_no', $accountNo)
                ->select(['id', 'concern', 'support_status', 'assigned_email', 'timestamp'])
                ->orderBy('timestamp', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $serviceOrders,
                'count' => $serviceOrders->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching service orders for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service orders',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related reconnection logs by account number
     */
    public function getReconnectionLogsByAccount(string $accountNo): JsonResponse
    {
        try {
            // First find the numeric account ID from the account number
            $billingAccount = DB::table('billing_accounts')
                ->where('account_no', $accountNo)
                ->first();
            
            if (!$billingAccount) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'count' => 0
                ]);
            }

            $logs = DB::table('reconnection_logs')
                ->leftJoin('plan_list', 'reconnection_logs.plan_id', '=', 'plan_list.id')
                ->where('reconnection_logs.account_id', $billingAccount->id)
                ->select([
                    'reconnection_logs.id',
                    'reconnection_logs.reconnection_fee',
                    'reconnection_logs.created_at',
                    'plan_list.plan_name'
                ])
                ->orderBy('reconnection_logs.created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'count' => $logs->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching reconnection logs for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch reconnection logs',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related disconnected logs by account number
     */
    public function getDisconnectedLogsByAccount(string $accountNo): JsonResponse
    {
        try {
            // First find the numeric account ID from the account number
            $billingAccount = DB::table('billing_accounts')
                ->where('account_no', $accountNo)
                ->first();
            
            if (!$billingAccount) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'count' => 0
                ]);
            }

            $logs = DB::table('disconnected_logs')
                ->where('account_id', $billingAccount->id)
                ->select(['id', 'remarks', 'created_at'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'count' => $logs->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching disconnected logs for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch disconnected logs',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related details update logs by account number
     */
    public function getDetailsUpdateLogsByAccount(string $accountNo): JsonResponse
    {
        try {
            // First find the numeric account ID from the account number
            $billingAccount = DB::table('billing_accounts')
                ->where('account_no', $accountNo)
                ->first();
            
            if (!$billingAccount) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'count' => 0
                ]);
            }

            $logs = DB::table('details_update_logs')
                ->where('account_id', $billingAccount->id)
                ->select(['id', 'old_details', 'new_details', 'updated_at', 'updated_by_user_id'])
                ->orderBy('updated_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'count' => $logs->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching details update logs for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch details update logs',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related plan change logs by account number
     */
    public function getPlanChangeLogsByAccount(string $accountNo): JsonResponse
    {
        try {
            // First find the numeric account ID from the account number
            $billingAccount = DB::table('billing_accounts')
                ->where('account_no', $accountNo)
                ->first();
            
            if (!$billingAccount) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'count' => 0
                ]);
            }

            $logs = DB::table('plan_change_logs')
                ->leftJoin('plan_list as old_plans', 'plan_change_logs.old_plan_id', '=', 'old_plans.id')
                ->leftJoin('plan_list as new_plans', 'plan_change_logs.new_plan_id', '=', 'new_plans.id')
                ->where('plan_change_logs.account_id', $billingAccount->id)
                ->select([
                    'plan_change_logs.id',
                    'plan_change_logs.status',
                    'plan_change_logs.date_changed',
                    'plan_change_logs.date_used',
                    'plan_change_logs.created_at',
                    'old_plans.plan_name as old_plan_name',
                    'new_plans.plan_name as new_plan_name'
                ])
                ->orderBy('plan_change_logs.created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'count' => $logs->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching plan change logs for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch plan change logs',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related service charge logs by account number
     */
    public function getServiceChargeLogsByAccount(string $accountNo): JsonResponse
    {
        try {
            $logs = DB::table('service_charge_logs')
                ->where('account_no', $accountNo)
                ->select(['id', 'service_charge', 'status', 'date_used'])
                ->orderBy('date_used', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'count' => $logs->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching service charge logs for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service charge logs',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related change due logs by account number
     */
    public function getChangeDueLogsByAccount(string $accountNo): JsonResponse
    {
        try {
            // First find the numeric account ID from the account number
            $billingAccount = DB::table('billing_accounts')
                ->where('account_no', $accountNo)
                ->first();
            
            if (!$billingAccount) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'count' => 0
                ]);
            }

            $logs = DB::table('change_due_logs')
                ->where('account_id', $billingAccount->id)
                ->select(['id', 'previous_date', 'changed_date', 'added_balance', 'remarks', 'created_at'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'count' => $logs->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching change due logs for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch change due logs',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related security deposits by account number
     */
    public function getSecurityDepositsByAccount(string $accountNo): JsonResponse
    {
        try {
            // First find the numeric account ID from the account number
            $billingAccount = DB::table('billing_accounts')
                ->where('account_no', $accountNo)
                ->first();
            
            if (!$billingAccount) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'count' => 0
                ]);
            }

            $deposits = DB::table('security_deposits')
                ->where('account_id', $billingAccount->id)
                ->select(['id', 'amount', 'status', 'payment_date', 'reference_no', 'created_by', 'created_at'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $deposits,
                'count' => $deposits->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching security deposits for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch security deposits',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related statement of accounts by account number
     */
    public function getStatementOfAccountsByAccount(string $accountNo): JsonResponse
    {
        try {
            $soas = DB::table('statement_of_accounts')
                ->where('account_no', $accountNo)
                ->select([
                    'id',
                    'statement_date',
                    'balance_from_previous_bill',
                    'payment_received_previous',
                    'remaining_balance_previous',
                    'amount_due',
                    'total_amount_due'
                ])
                ->orderBy('statement_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $soas,
                'count' => $soas->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching statement of accounts for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statement of accounts',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }
    /**
     * Get statement of account by ID
     */
    public function getStatementOfAccountById($id): JsonResponse
    {
        try {
            $soa = \App\Models\StatementOfAccount::with([
                'billingAccount.customer',
                'billingAccount.technicalDetails'
            ])->find($id);

            if (!$soa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Statement of Account not found'
                ], 404);
            }

            // Map the data to match what SOADetails expects
            $customer = $soa->billingAccount?->customer;
            
            $data = [
                'id' => $soa->id,
                'statementDate' => $soa->statement_date ? $soa->statement_date->format('Y-m-d') : null,
                'accountNo' => $soa->account_no,
                'dateInstalled' => $soa->billingAccount?->date_installed,
                'fullName' => $customer?->full_name ?? '',
                'contactNumber' => $customer?->contact_number_primary ?? '',
                'emailAddress' => $customer?->email_address ?? '',
                'address' => $customer?->address ?? '',
                'plan' => $customer?->desired_plan ?? '',
                'provider' => null,
                'balanceFromPreviousBill' => $soa->balance_from_previous_bill,
                'statementNo' => null,
                'paymentReceived' => $soa->payment_received_previous,
                'remainingBalance' => $soa->remaining_balance_previous,
                'monthlyServiceFee' => $soa->monthly_service_fee,
                'serviceCharge' => (float)($soa->service_charge ?? 0),
                'rebate' => (float)($soa->rebate ?? 0),
                'discounts' => (float)($soa->discounts ?? 0),
                'staggered' => (float)($soa->staggered ?? 0),
                'vat' => $soa->vat,
                'dueDate' => $soa->due_date ? $soa->due_date->format('Y-m-d') : null,
                'amountDue' => $soa->amount_due,
                'totalAmountDue' => $soa->total_amount_due,
                'deliveryStatus' => null,
                'printLink' => $soa->print_link,
                'barangay' => $customer?->barangay ?? '',
                'city' => $customer?->city ?? '',
                'region' => $customer?->region ?? '',
            ];

            return response()->json([
                'success' => true,
                'data' => $data
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching statement of account: ' . $id, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statement of account',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * Get invoice by ID
     */
    public function getInvoiceById($id): JsonResponse
    {
        try {
            $invoice = \App\Models\Invoice::with([
                'billingAccount.customer',
                'billingAccount.technicalDetails'
            ])->find($id);

            if (!$invoice) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice not found'
                ], 404);
            }

            // Map the data to match what InvoiceDetails expects
            $customer = $invoice->billingAccount?->customer;
            
            $data = [
                'id' => $invoice->id,
                'invoiceDate' => $invoice->invoice_date ? $invoice->invoice_date->format('Y-m-d') : null,
                'invoiceStatus' => $invoice->status,
                'accountNo' => $invoice->account_no,
                'fullName' => $customer?->full_name ?? '',
                'contactNumber' => $customer?->contact_number_primary ?? '',
                'emailAddress' => $customer?->email_address ?? '',
                'address' => $customer?->address ?? '',
                'plan' => $customer?->desired_plan ?? '',
                'dateInstalled' => $invoice->billingAccount?->date_installed,
                'provider' => null,
                'invoiceNo' => null, // Let frontend handle fallback
                'invoiceBalance' => (float)($invoice->invoice_balance ?? 0),
                'serviceCharge' => (float)($invoice->service_charge ?? 0),
                'rebate' => (float)($invoice->rebate ?? 0),
                'discounts' => (float)($invoice->discounts ?? 0),
                'staggered' => (float)($invoice->staggered ?? 0),
                'totalAmountDue' => (float)($invoice->total_amount ?? 0),
                'dueDate' => $invoice->due_date ? $invoice->due_date->format('Y-m-d') : null,
                'invoicePayment' => (float)($invoice->received_payment ?? 0),
                'paymentMethod' => null,
                'dateProcessed' => null,
                'processedBy' => null,
                'remarks' => null,
                'vat' => null,
                'amountDue' => (float)($invoice->amount_due ?? 0),
                'balanceFromPreviousBill' => (float)($invoice->balance_from_previous_bill ?? 0),
                'paymentReceived' => (float)($invoice->payment_received ?? 0),
                'remainingBalance' => (float)($invoice->remaining_balance ?? 0),
                'monthlyServiceFee' => (float)($invoice->monthly_service_fee ?? 0),
                'staggeredPaymentsCount' => 0,
            ];

            return response()->json([
                'success' => true,
                'data' => $data
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching invoice: ' . $id, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * Get payment portal log by ID
     */
    public function getPaymentPortalLogById($id): JsonResponse
    {
        try {
            $log = DB::table('payment_portal_logs')
                ->leftJoin('billing_accounts', 'payment_portal_logs.account_id', '=', 'billing_accounts.id')
                ->leftJoin('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                ->where('payment_portal_logs.id', $id)
                ->select([
                    'payment_portal_logs.*',
                    'billing_accounts.account_no as accountNo',
                    'billing_accounts.account_balance as accountBalance',
                    'customers.first_name',
                    'customers.middle_initial',
                    'customers.last_name',
                    'customers.contact_number_primary as contactNo',
                    'customers.address',
                    'customers.barangay',
                    'customers.city',
                    'customers.desired_plan as plan'
                ])
                ->first();

            if (!$log) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment portal log not found'
                ], 404);
            }

            // Manually add fullName if needed (though the DB might have it if it's a persisted field, but Customer model has it as an attribute)
            $log->fullName = trim(($log->first_name ?? '') . ' ' . ($log->middle_initial ?? '') . ' ' . ($log->last_name ?? ''));

            return response()->json([
                'success' => true,
                'data' => $log
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching payment portal log: ' . $id, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment portal log',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * Get transaction by ID
     */
    public function getTransactionById($id): JsonResponse
    {
        try {
            $transaction = DB::table('transactions')
                ->leftJoin('payment_methods', 'transactions.payment_method', '=', 'payment_methods.id')
                ->leftJoin('billing_accounts', 'transactions.account_no', '=', 'billing_accounts.account_no')
                ->leftJoin('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                ->where('transactions.id', $id)
                ->select([
                    'transactions.*',
                    'payment_methods.payment_method as payment_method_name',
                    'billing_accounts.id as billing_account_id',
                    'billing_accounts.account_no as billing_account_no',
                    'billing_accounts.account_balance',
                    'customers.first_name',
                    'customers.middle_initial',
                    'customers.last_name',
                    'customers.contact_number_primary',
                    'customers.address',
                    'customers.barangay',
                    'customers.city',
                    'customers.region',
                    'customers.desired_plan'
                ])
                ->first();

            if (!$transaction) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction not found'
                ], 404);
            }

            // Structure the data to match the frontend Transaction interface
            $data = [
                'id' => $transaction->id,
                'account_no' => $transaction->account_no,
                'transaction_type' => $transaction->transaction_type,
                'received_payment' => (float)$transaction->received_payment,
                'payment_date' => $transaction->payment_date,
                'date_processed' => $transaction->date_processed,
                'processed_by_user' => $transaction->processed_by_user,
                'payment_method' => $transaction->payment_method,
                'reference_no' => $transaction->reference_no,
                'or_no' => $transaction->or_no,
                'remarks' => $transaction->remarks,
                'status' => $transaction->status,
                'image_url' => $transaction->image_url,
                'created_at' => $transaction->created_at,
                'updated_at' => $transaction->updated_at,
                'payment_method_info' => [
                    'id' => $transaction->payment_method,
                    'payment_method' => $transaction->payment_method_name
                ],
                'account' => [
                    'id' => $transaction->billing_account_id,
                    'account_no' => $transaction->billing_account_no,
                    'account_balance' => (float)$transaction->account_balance,
                    'customer' => [
                        'full_name' => trim(($transaction->first_name ?? '') . ' ' . ($transaction->middle_initial ?? '') . ' ' . ($transaction->last_name ?? '')),
                        'contact_number_primary' => $transaction->contact_number_primary,
                        'address' => $transaction->address,
                        'barangay' => $transaction->barangay,
                        'city' => $transaction->city,
                        'region' => $transaction->region,
                        'desired_plan' => $transaction->desired_plan
                    ]
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $data
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching transaction: ' . $id, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch transaction',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

