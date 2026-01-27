<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\EnhancedBillingGenerationServiceWithNotifications;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class GenerateDailyBillingsCron extends Command
{
    protected $signature = 'cron:generate-daily-billings';
    protected $description = 'Cron job to generate daily billings with PDF and notifications at 1:00 AM';

    protected EnhancedBillingGenerationServiceWithNotifications $billingService;

    public function __construct(EnhancedBillingGenerationServiceWithNotifications $billingService)
    {
        parent::__construct();
        $this->billingService = $billingService;
    }

    public function handle(): int
    {
        $logPath = storage_path('logs/billing');
        if (!file_exists($logPath)) {
            mkdir($logPath, 0755, true);
        }

        $logger = Log::build([
            'driver' => 'single',
            'path' => $logPath . '/billinggeneration.log',
        ]);

        $startTime = microtime(true);
        $today = Carbon::now();
        
        $logger->info('=================================================================');
        $logger->info('Daily Billing Generation Cron Job Started', [
            'timestamp' => $today->format('Y-m-d H:i:s'),
            'day_of_month' => $today->day,
            'command' => 'cron:generate-daily-billings'
        ]);
        $logger->info('=================================================================');

        try {
            $advanceDays = config('billing.advance_generation_days', 7);
            $targetDate = $today->copy()->addDays($advanceDays);
            $targetBillingDay = $targetDate->day;

            $logger->info('Configuration loaded', [
                'advance_generation_days' => $advanceDays,
                'target_date' => $targetDate->format('Y-m-d'),
                'target_billing_day' => $targetBillingDay
            ]);

            $accountsCount = \App\Models\BillingAccount::where('billing_status_id', 2)
                ->whereNotNull('date_installed')
                ->whereNotNull('account_no')
                ->where('billing_day', $targetBillingDay)
                ->count();

            $logger->info('Accounts found for processing', [
                'billing_day' => $targetBillingDay,
                'accounts_count' => $accountsCount,
                'status' => $accountsCount > 0 ? 'READY_TO_PROCESS' : 'NO_ACCOUNTS_FOUND'
            ]);

            if ($accountsCount === 0) {
                $logger->info('No accounts scheduled for billing today', [
                    'billing_day' => $targetBillingDay,
                    'message' => 'Cron executed successfully but no billing generated - no accounts due today'
                ]);
                
                $endTime = microtime(true);
                $duration = round($endTime - $startTime, 2);
                
                $logger->info('=================================================================');
                $logger->info('Daily Billing Generation Cron Job Completed (No Generation Needed)', [
                    'timestamp' => Carbon::now()->format('Y-m-d H:i:s'),
                    'duration_seconds' => $duration,
                    'status' => 'SUCCESS',
                    'accounts_processed' => 0
                ]);
                $logger->info('=================================================================');
                
                return Command::SUCCESS;
            }

            $logger->info('Starting SOA generation', [
                'billing_day' => $targetBillingDay,
                'accounts_to_process' => $accountsCount
            ]);

            $soaResults = $this->billingService->generateSOAForBillingDay(
                $targetBillingDay,
                $today,
                1
            );

            $logger->info('SOA generation completed', [
                'success' => $soaResults['success'],
                'failed' => $soaResults['failed'],
                'total_accounts' => $accountsCount
            ]);

            $logger->info('Starting Invoice generation', [
                'billing_day' => $targetBillingDay,
                'accounts_to_process' => $accountsCount
            ]);

            $invoiceResults = $this->billingService->generateInvoicesForBillingDay(
                $targetBillingDay,
                $today,
                1
            );

            $logger->info('Invoice generation completed', [
                'success' => $invoiceResults['success'],
                'failed' => $invoiceResults['failed'],
                'total_accounts' => $accountsCount
            ]);

            $totalSuccess = $soaResults['success'] + $invoiceResults['success'];
            $totalFailed = $soaResults['failed'] + $invoiceResults['failed'];

            $endTime = microtime(true);
            $duration = round($endTime - $startTime, 2);

            $logger->info('=================================================================');
            $logger->info('Daily Billing Generation Cron Job Completed', [
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
            $logger->info('=================================================================');

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $endTime = microtime(true);
            $duration = round($endTime - $startTime, 2);

            $logger->error('=================================================================');
            $logger->error('Daily Billing Generation Cron Job Failed', [
                'timestamp' => Carbon::now()->format('Y-m-d H:i:s'),
                'duration_seconds' => $duration,
                'status' => 'FAILED',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $logger->error('=================================================================');

            return Command::FAILURE;
        }
    }
}
