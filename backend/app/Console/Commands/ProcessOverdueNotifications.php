<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Invoice;
use App\Models\BillingConfig;
use App\Models\BillingAccount;
use App\Services\ItexmoSmsService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ProcessOverdueNotifications extends Command
{
    protected $signature = 'cron:process-overdue-notifications';

    protected $description = 'Process overdue invoice notifications based on billing_config settings';

    private $smsService;
    private $logFile = 'overdue/overduelogs.log';

    public function __construct(ItexmoSmsService $smsService)
    {
        parent::__construct();
        $this->smsService = $smsService;
    }

    public function handle()
    {
        $this->logMessage("=== STARTING OVERDUE NOTIFICATION PROCESS ===");
        $this->info("Starting overdue notification process...");

        try {
            // Get billing configuration
            $config = BillingConfig::first();
            
            if (!$config) {
                $this->logMessage("[ERROR] Billing configuration not found");
                $this->error("Billing configuration not found");
                return 1;
            }

            $overdueDay = $config->overdue_day;
            $disconnectionNotice = $config->disconnection_notice;
            $disconnectionDay = $config->disconnection_day;

            $this->logMessage("[CONFIG] Overdue Day: {$overdueDay}");
            $this->logMessage("[CONFIG] Disconnection Notice: {$disconnectionNotice}");
            $this->logMessage("[CONFIG] Disconnection Day: {$disconnectionDay}");

            $today = Carbon::today();
            $this->logMessage("[INFO] Today's Date: " . $today->format('Y-m-d'));

            // Update overdue table with all current overdue invoices
            $this->updateOverdueTable($today);

            // Process different overdue stages
            $this->processOverdueStage($overdueDay, 'OVERDUE_DAY_1', $today);
            $this->processOverdueStage(3, 'OVERDUE_DAY_3', $today);
            $this->processOverdueStage(7, 'OVERDUE_DAY_7', $today);
            $this->processOverdueStage($disconnectionNotice, 'DISCONNECTION_NOTICE', $today);

            $this->logMessage("=== OVERDUE NOTIFICATION PROCESS COMPLETED ===");
            $this->info("Overdue notification process completed successfully");
            return 0;

        } catch (\Exception $e) {
            $this->logMessage("[CRITICAL ERROR] " . $e->getMessage());
            $this->logMessage("[TRACE] " . $e->getTraceAsString());
            $this->error("Error: " . $e->getMessage());
            return 1;
        }
    }

    private function processOverdueStage($daysOverdue, $stage, $today)
    {
        $this->logMessage("--- Processing Stage: {$stage} (Days Overdue: {$daysOverdue}) ---");

        // Calculate target due date
        $targetDueDate = $today->copy()->subDays($daysOverdue)->format('Y-m-d');
        $this->logMessage("[STAGE] Target Due Date: {$targetDueDate}");

        // Find invoices matching criteria
        $invoices = Invoice::with(['billingAccount.customer', 'billingAccount.technicalDetails'])
            ->whereIn('status', ['Unpaid', 'Partial'])
            ->whereDate('due_date', $targetDueDate)
            ->get();

        $this->logMessage("[STAGE] Found " . $invoices->count() . " invoices for {$stage}");
        $this->info("Found {$invoices->count()} invoices for {$stage}");

        $successCount = 0;
        $skipCount = 0;
        $errorCount = 0;

        foreach ($invoices as $invoice) {
            try {
                $accountNo = $invoice->account_no;
                $billingAccount = $invoice->billingAccount;

                if (!$billingAccount || !$billingAccount->customer) {
                    $this->logMessage("[SKIP] Account {$accountNo}: No billing account or customer data");
                    $skipCount++;
                    continue;
                }

                $customer = $billingAccount->customer;
                $contactNumber = $customer->contact_number_primary;

                if (empty($contactNumber)) {
                    $this->logMessage("[SKIP] Account {$accountNo}: No contact number");
                    $skipCount++;
                    continue;
                }

                // Check if already sent today for this stage
                if ($this->wasNotificationSentToday($accountNo, $stage)) {
                    $this->logMessage("[SKIP] Account {$accountNo}: Notification already sent today for {$stage}");
                    $skipCount++;
                    continue;
                }

                // Prepare SMS message
                $message = $this->buildSmsMessage($stage, $daysOverdue, $invoice, $customer);

                // Send SMS
                $this->logMessage("[SEND] Account {$accountNo}: Sending SMS to {$contactNumber}");
                $result = $this->smsService->sendSms($contactNumber, $message);

                if ($result['success']) {
                    $this->logMessage("[SUCCESS] Account {$accountNo}: SMS sent successfully");
                    
                    // Log notification
                    $this->logNotification($accountNo, $contactNumber, $message, $stage, 'Success');
                    
                    $successCount++;
                } else {
                    $this->logMessage("[ERROR] Account {$accountNo}: Failed to send SMS - " . $result['message']);
                    $this->logNotification($accountNo, $contactNumber, $message, $stage, 'Failed: ' . $result['message']);
                    $errorCount++;
                }

                // Rate limiting - sleep between sends
                if ($successCount % 20 == 0) {
                    sleep(2);
                }

            } catch (\Exception $e) {
                $this->logMessage("[ERROR] Account {$invoice->account_no}: " . $e->getMessage());
                $errorCount++;
            }
        }

        $this->logMessage("[STAGE SUMMARY] {$stage} - Success: {$successCount}, Skipped: {$skipCount}, Errors: {$errorCount}");
        $this->info("{$stage} - Success: {$successCount}, Skipped: {$skipCount}, Errors: {$errorCount}");
    }

    private function buildSmsMessage($stage, $daysOverdue, $invoice, $customer)
    {
        $fullName = $customer->full_name;
        $accountNo = $invoice->account_no;
        $balance = number_format($invoice->total_amount - $invoice->received_payment, 2);
        $dueDate = Carbon::parse($invoice->due_date)->format('F d, Y');

        switch ($stage) {
            case 'OVERDUE_DAY_1':
                return "Dear {$fullName}, your account ({$accountNo}) is now 1 day overdue. Balance: PHP {$balance}. Due date was {$dueDate}. Please settle your payment to avoid service interruption. Thank you!";

            case 'OVERDUE_DAY_3':
                return "Dear {$fullName}, your account ({$accountNo}) is now 3 days overdue. Balance: PHP {$balance}. Please settle immediately to avoid disconnection. Thank you!";

            case 'OVERDUE_DAY_7':
                return "URGENT: Dear {$fullName}, your account ({$accountNo}) is now 7 days overdue. Balance: PHP {$balance}. Disconnection is imminent. Please settle your payment immediately. Thank you!";

            case 'DISCONNECTION_NOTICE':
                return "FINAL NOTICE: Dear {$fullName}, your account ({$accountNo}) is {$daysOverdue} days overdue. Balance: PHP {$balance}. Your service will be disconnected soon if payment is not received. Please settle immediately. Thank you!";

            default:
                return "Dear {$fullName}, your account ({$accountNo}) is {$daysOverdue} days overdue. Balance: PHP {$balance}. Please settle your payment. Thank you!";
        }
    }

    private function wasNotificationSentToday($accountNo, $stage)
    {
        $today = Carbon::today()->format('Y-m-d');
        
        return DB::table('sms_logs')
            ->where('account_no', $accountNo)
            ->where('sms_type', $stage)
            ->whereDate('sent_at', $today)
            ->exists();
    }

    private function logNotification($accountNo, $contactNumber, $message, $type, $status)
    {
        try {
            DB::table('sms_logs')->insert([
                'account_no' => $accountNo,
                'contact_no' => $contactNumber,
                'message' => $message,
                'sms_type' => $type,
                'status' => $status,
                'sent_at' => Carbon::now(),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now()
            ]);
        } catch (\Exception $e) {
            $this->logMessage("[LOG ERROR] Failed to log notification: " . $e->getMessage());
        }
    }

    private function updateOverdueTable($today)
    {
        $this->logMessage("--- Updating Overdue Table ---");

        try {
            // Clear existing overdue records for today
            DB::table('overdue')->whereDate('created_at', $today)->delete();
            $this->logMessage("[OVERDUE TABLE] Cleared existing records for today");

            // Get all overdue invoices (Unpaid or Partial, past due date)
            $overdueInvoices = Invoice::with(['billingAccount.customer'])
                ->whereIn('status', ['Unpaid', 'Partial'])
                ->where('due_date', '<', $today)
                ->get();

            $this->logMessage("[OVERDUE TABLE] Found " . $overdueInvoices->count() . " overdue invoices");

            $insertedCount = 0;
            $skippedCount = 0;

            foreach ($overdueInvoices as $invoice) {
                $accountNo = $invoice->account_no;
                $billingAccount = $invoice->billingAccount;

                if (!$billingAccount || !$billingAccount->customer) {
                    $this->logMessage("[OVERDUE TABLE SKIP] Account {$accountNo}: No billing account or customer");
                    $skippedCount++;
                    continue;
                }

                $customer = $billingAccount->customer;
                $dueDate = Carbon::parse($invoice->due_date);
                $daysOverdue = $today->diffInDays($dueDate);

                // Determine print_link based on invoice
                $printLink = null;
                if (!empty($invoice->id)) {
                    $printLink = url('/api/invoices/' . $invoice->id . '/print');
                }

                // Insert into overdue table
                DB::table('overdue')->insert([
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

                // Log every 100 records
                if ($insertedCount % 100 == 0) {
                    $this->logMessage("[OVERDUE TABLE] Processed {$insertedCount} records...");
                }
            }

            $this->logMessage("[OVERDUE TABLE SUMMARY] Inserted: {$insertedCount}, Skipped: {$skippedCount}");
            $this->info("Overdue table updated: {$insertedCount} records inserted");

        } catch (\Exception $e) {
            $this->logMessage("[OVERDUE TABLE ERROR] " . $e->getMessage());
            $this->error("Failed to update overdue table: " . $e->getMessage());
        }
    }

    private function logMessage($message)
    {
        $timestamp = Carbon::now()->format('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] {$message}";
        
        Log::channel('overdue')->info($message);
        
        // Also output to console
        $this->line($logMessage);
    }
}
