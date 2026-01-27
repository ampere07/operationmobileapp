<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Invoice;
use App\Models\BillingConfig;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ProcessDisconnectionNotices extends Command
{
    protected $signature = 'cron:process-disconnection-notices';

    protected $description = 'Populate disconnection_notice table with accounts scheduled for disconnection';

    private $logFile = 'disconnection/disconnectionlogs.log';

    public function handle()
    {
        $this->logMessage("=== STARTING DISCONNECTION NOTICE PROCESS ===");
        $this->info("Starting disconnection notice process...");

        try {
            // Get billing configuration
            $config = BillingConfig::first();
            
            if (!$config) {
                $this->logMessage("[ERROR] Billing configuration not found");
                $this->error("Billing configuration not found");
                return 1;
            }

            $disconnectionNotice = $config->disconnection_notice;
            $this->logMessage("[CONFIG] Disconnection Notice Days: {$disconnectionNotice}");

            $today = Carbon::today();
            $this->logMessage("[INFO] Today's Date: " . $today->format('Y-m-d'));

            // Update disconnection_notice table
            $this->updateDisconnectionNoticeTable($today, $disconnectionNotice);

            $this->logMessage("=== DISCONNECTION NOTICE PROCESS COMPLETED ===");
            $this->info("Disconnection notice process completed successfully");
            return 0;

        } catch (\Exception $e) {
            $this->logMessage("[CRITICAL ERROR] " . $e->getMessage());
            $this->logMessage("[TRACE] " . $e->getTraceAsString());
            $this->error("Error: " . $e->getMessage());
            return 1;
        }
    }

    private function updateDisconnectionNoticeTable($today, $disconnectionNoticeDays)
    {
        $this->logMessage("--- Updating Disconnection Notice Table ---");

        try {
            // Clear existing records for today
            DB::table('disconnection_notice')->whereDate('created_at', $today)->delete();
            $this->logMessage("[DC NOTICE TABLE] Cleared existing records for today");

            // Calculate target due date (accounts that will be disconnected soon)
            // If disconnection_notice = 14, find invoices with due_date = today - 14 days
            $targetDueDate = $today->copy()->subDays($disconnectionNoticeDays)->format('Y-m-d');
            $this->logMessage("[DC NOTICE TABLE] Target Due Date: {$targetDueDate}");
            $this->logMessage("[DC NOTICE TABLE] Accounts with this due date are {$disconnectionNoticeDays} days overdue");

            // Get invoices matching disconnection notice criteria
            $invoices = Invoice::with(['billingAccount.customer'])
                ->whereIn('status', ['Unpaid', 'Partial'])
                ->whereDate('due_date', $targetDueDate)
                ->get();

            $this->logMessage("[DC NOTICE TABLE] Found " . $invoices->count() . " invoices scheduled for disconnection");

            $insertedCount = 0;
            $skippedCount = 0;

            foreach ($invoices as $invoice) {
                $accountNo = $invoice->account_no;
                $billingAccount = $invoice->billingAccount;

                if (!$billingAccount || !$billingAccount->customer) {
                    $this->logMessage("[DC NOTICE SKIP] Account {$accountNo}: No billing account or customer");
                    $skippedCount++;
                    continue;
                }

                $customer = $billingAccount->customer;
                $dueDate = Carbon::parse($invoice->due_date);

                // Determine print_link based on invoice
                $printLink = null;
                if (!empty($invoice->id)) {
                    $printLink = url('/api/invoices/' . $invoice->id . '/print');
                }

                // Insert into disconnection_notice table
                DB::table('disconnection_notice')->insert([
                    'account_no' => $accountNo,
                    'invoice_id' => $invoice->id,
                    'overdue_date' => $dueDate->format('Y-m-d'),
                    'print_link' => $printLink,
                    'created_at' => Carbon::now(),
                    'created_by_user_id' => null, // System-generated
                    'updated_at' => Carbon::now(),
                    'updated_by_user_id' => null
                ]);

                $insertedCount++;

                // Log every 50 records
                if ($insertedCount % 50 == 0) {
                    $this->logMessage("[DC NOTICE TABLE] Processed {$insertedCount} records...");
                }
            }

            $this->logMessage("[DC NOTICE TABLE SUMMARY] Inserted: {$insertedCount}, Skipped: {$skippedCount}");
            $this->info("Disconnection notice table updated: {$insertedCount} records inserted");

        } catch (\Exception $e) {
            $this->logMessage("[DC NOTICE TABLE ERROR] " . $e->getMessage());
            $this->error("Failed to update disconnection notice table: " . $e->getMessage());
        }
    }

    private function logMessage($message)
    {
        $timestamp = Carbon::now()->format('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] {$message}";
        
        Log::channel('disconnection')->info($message);
        
        // Also output to console
        $this->line($logMessage);
    }
}
