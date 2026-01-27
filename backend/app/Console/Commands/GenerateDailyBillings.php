<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\EnhancedBillingGenerationServiceWithNotifications;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class GenerateDailyBillings extends Command
{
    protected $signature = 'billing:generate-daily';
    protected $description = 'Generate daily billings with PDF and notifications';

    protected EnhancedBillingGenerationServiceWithNotifications $billingService;

    public function __construct(EnhancedBillingGenerationServiceWithNotifications $billingService)
    {
        parent::__construct();
        $this->billingService = $billingService;
    }

    public function handle()
    {
        $startTime = microtime(true);
        $today = Carbon::now();
        
        // Log to billing channel - Command started
        Log::channel('billing')->info('=================================================================');
        Log::channel('billing')->info('Daily Billing Generation Command Started', [
            'timestamp' => $today->format('Y-m-d H:i:s'),
            'day_of_month' => $today->day,
            'command' => 'billing:generate-daily'
        ]);
        Log::channel('billing')->info('=================================================================');

        $this->info('Starting daily billing generation...');

        try {
            $advanceDays = config('billing.advance_generation_days', 7);
            $targetDate = $today->copy()->addDays($advanceDays);
            $targetBillingDay = $targetDate->day;

            Log::channel('billing')->info('Configuration loaded', [
                'advance_generation_days' => $advanceDays,
                'target_date' => $targetDate->format('Y-m-d'),
                'target_billing_day' => $targetBillingDay
            ]);

            $this->info("Target billing day: {$targetBillingDay}");

            // Check if there are accounts to process
            $accountsCount = \App\Models\BillingAccount::where('billing_status_id', 2)
                ->whereNotNull('date_installed')
                ->whereNotNull('account_no')
                ->where('billing_day', $targetBillingDay)
                ->count();

            Log::channel('billing')->info('Accounts found for processing', [
                'billing_day' => $targetBillingDay,
                'accounts_count' => $accountsCount,
                'status' => $accountsCount > 0 ? 'READY_TO_PROCESS' : 'NO_ACCOUNTS_FOUND'
            ]);

            if ($accountsCount === 0) {
                Log::channel('billing')->info('No accounts scheduled for billing today', [
                    'billing_day' => $targetBillingDay,
                    'message' => 'Command executed successfully but no billing generated - no accounts due today'
                ]);
                
                $this->info("No accounts found for billing day {$targetBillingDay}");
                $this->info("Command executed successfully - system is running properly");
                
                $endTime = microtime(true);
                $duration = round($endTime - $startTime, 2);
                
                Log::channel('billing')->info('=================================================================');
                Log::channel('billing')->info('Daily Billing Generation Command Completed (No Generation Needed)', [
                    'timestamp' => Carbon::now()->format('Y-m-d H:i:s'),
                    'duration_seconds' => $duration,
                    'status' => 'SUCCESS',
                    'accounts_processed' => 0
                ]);
                Log::channel('billing')->info('=================================================================');
                
                return 0;
            }

            // Generate SOAs
            Log::channel('billing')->info('Starting SOA generation', [
                'billing_day' => $targetBillingDay,
                'accounts_to_process' => $accountsCount
            ]);

            $soaResults = $this->billingService->generateSOAForBillingDay(
                $targetBillingDay,
                $today,
                1
            );

            Log::channel('billing')->info('SOA generation completed', [
                'success' => $soaResults['success'],
                'failed' => $soaResults['failed'],
                'total_accounts' => $accountsCount
            ]);

            $this->info("SOA Generation: {$soaResults['success']} successful, {$soaResults['failed']} failed");

            // Generate Invoices
            Log::channel('billing')->info('Starting Invoice generation', [
                'billing_day' => $targetBillingDay,
                'accounts_to_process' => $accountsCount
            ]);

            $invoiceResults = $this->billingService->generateInvoicesForBillingDay(
                $targetBillingDay,
                $today,
                1
            );

            Log::channel('billing')->info('Invoice generation completed', [
                'success' => $invoiceResults['success'],
                'failed' => $invoiceResults['failed'],
                'total_accounts' => $accountsCount
            ]);

            $this->info("Invoice Generation: {$invoiceResults['success']} successful, {$invoiceResults['failed']} failed");

            $totalSuccess = $soaResults['success'] + $invoiceResults['success'];
            $totalFailed = $soaResults['failed'] + $invoiceResults['failed'];

            $endTime = microtime(true);
            $duration = round($endTime - $startTime, 2);

            Log::channel('billing')->info('=================================================================');
            Log::channel('billing')->info('Daily Billing Generation Command Completed', [
                'timestamp' => Carbon::now()->format('Y-m-d H:i:s'),
                'duration_seconds' => $duration,
                'status' => 'SUCCESS',
                'summary' => [
                    'accounts_found' => $accountsCount,
                    'soa_success' => $soaResults['success'],
                    'soa_failed' => $soaResults['failed'],
                    'invoice_success' => $invoiceResults['success'],
                    'invoice_failed' => $invoiceResults['failed'],
                    'total_success' => $totalSuccess,
                    'total_failed' => $totalFailed
                ]
            ]);
            Log::channel('billing')->info('=================================================================');

            $this->info("Daily billing generation completed successfully!");
            $this->info("Total generated: {$totalSuccess}");
            $this->info("Duration: {$duration} seconds");

            return 0;

        } catch (\Exception $e) {
            $endTime = microtime(true);
            $duration = round($endTime - $startTime, 2);

            Log::channel('billing')->error('=================================================================');
            Log::channel('billing')->error('Daily Billing Generation Command Failed', [
                'timestamp' => Carbon::now()->format('Y-m-d H:i:s'),
                'duration_seconds' => $duration,
                'status' => 'FAILED',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            Log::channel('billing')->error('=================================================================');

            $this->error('Failed to generate daily billings: ' . $e->getMessage());

            return 1;
        }
    }
}
