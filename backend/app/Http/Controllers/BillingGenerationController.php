<?php

namespace App\Http\Controllers;

use App\Services\BillingGenerationService;
use App\Services\EnhancedBillingGenerationServiceWithNotifications;
use App\Services\BillingNotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class BillingGenerationController extends Controller
{
    protected $billingService;
    protected $enhancedBillingService;
    protected $notificationService;

    public function __construct(
        BillingGenerationService $billingService,
        EnhancedBillingGenerationServiceWithNotifications $enhancedBillingService,
        BillingNotificationService $notificationService
    ) {
        $this->billingService = $billingService;
        $this->enhancedBillingService = $enhancedBillingService;
        $this->notificationService = $notificationService;
    }

    public function generateInvoices(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'billing_day' => 'required|integer|min:1|max:31'
            ]);

            $userId = $request->user()->id ?? 1;

            $results = $this->billingService->generateInvoicesForBillingDay(
                $validated['billing_day'],
                $userId
            );

            return response()->json([
                'success' => true,
                'message' => "Generated {$results['success']} invoices successfully",
                'data' => $results
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating invoices: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate invoices',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function generateStatements(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'billing_day' => 'required|integer|min:1|max:31'
            ]);

            $userId = $request->user()->id ?? 1;

            $results = $this->billingService->generateStatementsForBillingDay(
                $validated['billing_day'],
                $userId
            );

            return response()->json([
                'success' => true,
                'message' => "Generated {$results['success']} statements successfully",
                'data' => $results
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating statements: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate statements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function generateTodaysBillings(Request $request): JsonResponse
    {
        try {
            $userId = $request->user()->id ?? 1;

            $results = $this->enhancedBillingService->generateAllBillingsForToday($userId);

            $totalGenerated = $results['invoices']['success'] + $results['statements']['success'];

            return response()->json([
                'success' => true,
                'message' => "Generated {$totalGenerated} billing records successfully",
                'data' => $results
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating today\'s billings: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate today\'s billings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function generateEnhancedInvoices(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'billing_day' => 'required|integer|min:1|max:31',
                'generation_date' => 'nullable|date'
            ]);

            $userId = $request->user()->id ?? 1;
            $generationDate = $validated['generation_date'] 
                ? Carbon::parse($validated['generation_date']) 
                : Carbon::now();

            $results = $this->enhancedBillingService->generateInvoicesForBillingDay(
                $validated['billing_day'],
                $generationDate,
                $userId
            );

            return response()->json([
                'success' => true,
                'message' => "Generated {$results['success']} invoices successfully",
                'data' => $results
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating enhanced invoices: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate invoices',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function generateEnhancedStatements(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'billing_day' => 'required|integer|min:1|max:31',
                'generation_date' => 'nullable|date'
            ]);

            $userId = $request->user()->id ?? 1;
            $generationDate = $validated['generation_date'] 
                ? Carbon::parse($validated['generation_date']) 
                : Carbon::now();

            $results = $this->enhancedBillingService->generateSOAForBillingDay(
                $validated['billing_day'],
                $generationDate,
                $userId
            );

            return response()->json([
                'success' => true,
                'message' => "Generated {$results['success']} statements successfully",
                'data' => $results
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating enhanced statements: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate statements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function generateBillingsForDay(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'billing_day' => 'required|integer|min:1|max:31'
            ]);

            $userId = $request->user()->id ?? 1;

            $results = $this->enhancedBillingService->generateBillingsForSpecificDay(
                $validated['billing_day'],
                $userId
            );

            $totalGenerated = $results['invoices']['success'] + $results['statements']['success'];

            return response()->json([
                'success' => true,
                'message' => "Generated {$totalGenerated} billing records for day {$validated['billing_day']}",
                'data' => $results
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating billings for specific day: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate billings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function generateSampleData(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'account_no' => 'required|string|exists:billing_accounts,account_no',
                'send_notifications' => 'boolean'
            ]);

            $sendNotifications = $validated['send_notifications'] ?? true;
            $userId = $request->user()->id ?? 1;
            $generationDate = Carbon::now();

            $account = \App\Models\BillingAccount::where('account_no', $validated['account_no'])
                ->with(['customer', 'technicalDetails', 'plan'])
                ->first();

            if (!$account) {
                return response()->json([
                    'success' => false,
                    'message' => 'Account not found'
                ], 404);
            }

            if (!$account->customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'No customer linked to this account'
                ], 400);
            }

            $results = [
                'account_no' => $account->account_no,
                'customer_name' => $account->customer->full_name,
                'soa' => null,
                'invoice' => null,
                'notifications' => [
                    'email_queued' => false,
                    'sms_sent' => false,
                    'pdf_generated' => false,
                    'errors' => []
                ]
            ];

            Log::info('Generating sample data', [
                'account_no' => $account->account_no,
                'customer_name' => $account->customer->full_name,
                'send_notifications' => $sendNotifications
            ]);

            try {
                $statement = $this->enhancedBillingService->createEnhancedStatement(
                    $account, 
                    $generationDate, 
                    $userId
                );

                $results['soa'] = [
                    'id' => $statement->id,
                    'total_amount_due' => $statement->total_amount_due,
                    'due_date' => $statement->due_date->format('Y-m-d'),
                    'statement_date' => $statement->statement_date->format('Y-m-d')
                ];

                Log::info('SOA generated successfully', [
                    'account_no' => $account->account_no,
                    'soa_id' => $statement->id
                ]);

                if ($sendNotifications) {
                    $notificationResult = $this->notificationService->notifyBillingGenerated(
                        $account, 
                        null, 
                        $statement
                    );

                    $results['notifications'] = [
                        'email_queued' => $notificationResult['email_queued'],
                        'sms_sent' => $notificationResult['sms_sent'],
                        'pdf_generated' => $notificationResult['pdf_generated'],
                        'pdf_url' => $notificationResult['pdf_url'] ?? null,
                        'errors' => $notificationResult['errors']
                    ];

                    Log::info('SOA notification sent', [
                        'account_no' => $account->account_no,
                        'email_queued' => $notificationResult['email_queued'],
                        'sms_sent' => $notificationResult['sms_sent'],
                        'pdf_generated' => $notificationResult['pdf_generated']
                    ]);
                }

            } catch (\Exception $e) {
                Log::error('SOA generation failed', [
                    'account_no' => $account->account_no,
                    'error' => $e->getMessage()
                ]);
                $results['soa'] = ['error' => $e->getMessage()];
            }

            try {
                $account->refresh();
                
                $invoice = $this->enhancedBillingService->createEnhancedInvoice(
                    $account, 
                    $generationDate, 
                    $userId
                );

                $results['invoice'] = [
                    'id' => $invoice->id,
                    'total_amount' => $invoice->total_amount,
                    'due_date' => $invoice->due_date->format('Y-m-d'),
                    'invoice_date' => $invoice->invoice_date->format('Y-m-d')
                ];

                Log::info('Invoice generated successfully', [
                    'account_no' => $account->account_no,
                    'invoice_id' => $invoice->id
                ]);

            } catch (\Exception $e) {
                Log::error('Invoice generation failed', [
                    'account_no' => $account->account_no,
                    'error' => $e->getMessage()
                ]);
                $results['invoice'] = ['error' => $e->getMessage()];
            }

            return response()->json([
                'success' => true,
                'message' => "Sample data generated successfully for account {$account->account_no}",
                'data' => $results
            ]);

        } catch (\Exception $e) {
            Log::error('Error generating sample data: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate sample data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getInvoices(Request $request): JsonResponse
    {
        try {
            $query = \App\Models\Invoice::with([
                'billingAccount.customer',
                'billingAccount.technicalDetails',
                'billingAccount.plan',
                'discounts',
                'staggeredInstallations',
                'transactions'
            ]);

            if ($request->has('account_no')) {
                $query->where('account_no', $request->account_no);
            }

            if ($request->has('account_id')) {
                $query->where('account_no', $request->account_id);
            }

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('date_from') && $request->has('date_to')) {
                $query->whereBetween('invoice_date', [
                    $request->date_from,
                    $request->date_to
                ]);
            }

            $invoices = $query->orderBy('invoice_date', 'desc')->get();

            Log::info('Fetched invoices with complete data', [
                'count' => $invoices->count()
            ]);

            return response()->json([
                'success' => true,
                'data' => $invoices,
                'count' => $invoices->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching invoices: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch invoices',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getStatements(Request $request): JsonResponse
    {
        try {
            $query = \App\Models\StatementOfAccount::with([
                'billingAccount.customer',
                'billingAccount.technicalDetails',
                'billingAccount.plan',
                'discounts',
                'staggeredInstallations',
                'transactions'
            ]);

            if ($request->has('account_no')) {
                $query->where('account_no', $request->account_no);
            }

            if ($request->has('account_id')) {
                $query->where('account_no', $request->account_id);
            }

            if ($request->has('date_from') && $request->has('date_to')) {
                $query->whereBetween('statement_date', [
                    $request->date_from,
                    $request->date_to
                ]);
            }

            $statements = $query->orderBy('statement_date', 'desc')->get();

            Log::info('Fetched statements with complete data', [
                'count' => $statements->count()
            ]);

            return response()->json([
                'success' => true,
                'data' => $statements,
                'count' => $statements->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching statements: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function forceGenerateAll(Request $request): JsonResponse
    {
        $startTime = microtime(true);
        
        try {
            $validated = $request->validate([
                'generation_date' => 'nullable|date',
                'send_notifications' => 'boolean'
            ]);

            $sendNotifications = $validated['send_notifications'] ?? false;
            $userId = $request->user()->id ?? 1;
            $generationDate = isset($validated['generation_date']) 
                ? Carbon::parse($validated['generation_date']) 
                : Carbon::now();

            $accounts = \App\Models\BillingAccount::with(['customer'])
                ->whereNotNull('date_installed')
                ->whereNotNull('account_no')
                ->get();

            Log::info('Force generate started - ALL ACCOUNTS', [
                'total_accounts' => $accounts->count(),
                'generation_date' => $generationDate->format('Y-m-d'),
                'send_notifications' => $sendNotifications,
                'note' => 'Generating for ALL accounts regardless of billing_status_id or billing_day'
            ]);

            if ($accounts->count() === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'No accounts found with date_installed and account_no',
                    'data' => [
                        'total_accounts' => 0,
                        'criteria' => 'date_installed IS NOT NULL AND account_no IS NOT NULL'
                    ]
                ], 404);
            }

            $invoiceResults = [
                'success' => 0,
                'failed' => 0,
                'errors' => [],
                'details' => [],
                'notifications' => []
            ];

            $soaResults = [
                'success' => 0,
                'failed' => 0,
                'errors' => [],
                'details' => [],
                'notifications' => []
            ];

            foreach ($accounts as $account) {
                $accountStartTime = microtime(true);
                
                if (!$account->account_no || trim($account->account_no) === '') {
                    $error = [
                        'account_id' => $account->id,
                        'account_no' => $account->account_no ?? 'NULL',
                        'error' => 'Billing account has no account_no value',
                        'customer_id' => $account->customer_id ?? 'NULL'
                    ];
                    $invoiceResults['failed']++;
                    $soaResults['failed']++;
                    $invoiceResults['errors'][] = $error;
                    $soaResults['errors'][] = $error;
                    Log::error('Account has no account_no', $error);
                    continue;
                }

                if (!$account->customer) {
                    $error = [
                        'account_id' => $account->id,
                        'account_no' => $account->account_no,
                        'error' => 'No customer linked to this billing account',
                        'customer_id' => $account->customer_id ?? 'NULL'
                    ];
                    $invoiceResults['failed']++;
                    $soaResults['failed']++;
                    $invoiceResults['errors'][] = $error;
                    $soaResults['errors'][] = $error;
                    Log::error('Account has no customer', $error);
                    continue;
                }

                $customerName = $account->customer->full_name;
                $desiredPlan = $account->customer->desired_plan ?? 'NO PLAN';

                Log::info('Processing account', [
                    'account_no' => $account->account_no,
                    'customer_id' => $account->customer_id,
                    'customer_name' => $customerName,
                    'desired_plan' => $desiredPlan,
                    'billing_day' => $account->billing_day,
                    'billing_status_id' => $account->billing_status_id,
                    'date_installed' => $account->date_installed
                ]);

                try {
                    $account->refresh();
                    $statement = $this->enhancedBillingService->createEnhancedStatement($account, $generationDate, $userId);
                    $soaResults['success']++;
                    $soaResults['details'][] = [
                        'account_no' => $account->account_no,
                        'customer_name' => $customerName,
                        'statement_id' => $statement->id,
                        'total_amount_due' => $statement->total_amount_due
                    ];
                    
                    Log::info('SOA created successfully', [
                        'account_no' => $account->account_no,
                        'customer_name' => $customerName,
                        'statement_id' => $statement->id
                    ]);
                } catch (\Exception $e) {
                    $soaResults['failed']++;
                    $soaResults['errors'][] = [
                        'account_id' => $account->id,
                        'account_no' => $account->account_no,
                        'customer_name' => $customerName,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ];
                    Log::error('SOA generation failed', [
                        'account_no' => $account->account_no,
                        'customer_name' => $customerName,
                        'error' => $e->getMessage()
                    ]);
                }

                try {
                    $account->refresh();
                    $invoice = $this->enhancedBillingService->createEnhancedInvoice($account, $generationDate, $userId);
                    $invoiceResults['success']++;
                    $invoiceResults['details'][] = [
                        'account_no' => $account->account_no,
                        'customer_name' => $customerName,
                        'invoice_id' => $invoice->id,
                        'total_amount' => $invoice->total_amount
                    ];
                    
                    if ($sendNotifications && isset($statement)) {
                        try {
                            $account->refresh();
                            $notificationResult = $this->notificationService->notifyBillingGenerated($account, null, $statement);
                            $soaResults['notifications'][] = [
                                'account_no' => $account->account_no,
                                'email_queued' => $notificationResult['email_queued'],
                                'sms_sent' => $notificationResult['sms_sent'],
                                'pdf_generated' => $notificationResult['pdf_generated']
                            ];
                        } catch (\Exception $notifErr) {
                            Log::warning('SOA notification failed', [
                                'account_no' => $account->account_no,
                                'error' => $notifErr->getMessage()
                            ]);
                        }
                    }
                    
                    Log::info('Invoice created successfully', [
                        'account_no' => $account->account_no,
                        'customer_name' => $customerName,
                        'invoice_id' => $invoice->id
                    ]);
                } catch (\Exception $e) {
                    $invoiceResults['failed']++;
                    $invoiceResults['errors'][] = [
                        'account_id' => $account->id,
                        'account_no' => $account->account_no,
                        'customer_name' => $customerName,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ];
                    Log::error('Invoice generation failed', [
                        'account_no' => $account->account_no,
                        'customer_name' => $customerName,
                        'error' => $e->getMessage()
                    ]);
                }
                
                $accountEndTime = microtime(true);
                $accountDuration = round($accountEndTime - $accountStartTime, 2);
                
                Log::info('Account processing completed', [
                    'account_no' => $account->account_no,
                    'duration_seconds' => $accountDuration,
                    'soa_success' => isset($statement),
                    'invoice_success' => isset($invoice)
                ]);
            }

            $totalGenerated = $invoiceResults['success'] + $soaResults['success'];
            
            $endTime = microtime(true);
            $totalDuration = round($endTime - $startTime, 2);
            $averageDuration = $accounts->count() > 0 ? round($totalDuration / $accounts->count(), 2) : 0;
            
            Log::info('Force generate completed - PERFORMANCE SUMMARY', [
                'total_duration_seconds' => $totalDuration,
                'total_accounts' => $accounts->count(),
                'average_per_account' => $averageDuration,
                'invoices_generated' => $invoiceResults['success'],
                'statements_generated' => $soaResults['success'],
                'emails_queued' => count($soaResults['notifications']),
                'notifications_enabled' => $sendNotifications
            ]);

            return response()->json([
                'success' => true,
                'message' => "Force generated {$totalGenerated} billing records for {$accounts->count()} accounts",
                'data' => [
                    'invoices' => $invoiceResults,
                    'statements' => $soaResults,
                    'total_accounts' => $accounts->count(),
                    'generation_date' => $generationDate->format('Y-m-d'),
                    'notifications_enabled' => $sendNotifications,
                    'performance' => [
                        'total_duration_seconds' => $totalDuration,
                        'average_per_account_seconds' => $averageDuration
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in force generate all: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Failed to force generate billings',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }
}
