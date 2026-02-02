<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Invoice;
use App\Models\BillingConfig;
use App\Models\BillingAccount;
use App\Services\ItexmoSmsService;
use App\Services\EmailQueueService;
use App\Services\GoogleDrivePdfGenerationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ProcessOverdueNotifications extends Command
{
    protected $signature = 'cron:process-overdue-notifications';

    protected $description = 'Process overdue invoice notifications based on billing_config settings';

    private $smsService;
    private $emailQueueService;
    private $pdfService;

    public function __construct(
        ItexmoSmsService $smsService,
        EmailQueueService $emailQueueService,
        GoogleDrivePdfGenerationService $pdfService
    ) {
        parent::__construct();
        $this->smsService = $smsService;
        $this->emailQueueService = $emailQueueService;
        $this->pdfService = $pdfService;
    }

    public function handle()
    {
        $startTime = Carbon::now();
        $this->logMessage("=== STARTING OVERDUE NOTIFICATION PROCESS ===");
        $this->logMessage("Start Time: " . $startTime->format('Y-m-d H:i:s'));
        $this->info("Starting overdue notification process...");

        try {
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

            $this->updateOverdueTable($today);

            $this->logMessage("[INFO] Processing overdue notification stages...");
            
            $this->processOverdueStage($overdueDay, 'OVERDUE_DAY_1', $today);
            $this->processOverdueStage(3, 'OVERDUE_DAY_3', $today);
            $this->processOverdueStage(7, 'OVERDUE_DAY_7', $today);
            $this->processOverdueStage($disconnectionNotice, 'DISCONNECTION_NOTICE', $today);

            $endTime = Carbon::now();
            $duration = $endTime->diffInSeconds($startTime);
            
            $this->logMessage("=== OVERDUE NOTIFICATION PROCESS COMPLETED ===");
            $this->logMessage("End Time: " . $endTime->format('Y-m-d H:i:s'));
            $this->logMessage("Duration: {$duration} seconds");
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
        $stageStartTime = Carbon::now();
        $this->logMessage("--- Processing Stage: {$stage} (Days Overdue: {$daysOverdue}) ---");
        $this->logMessage("Stage Start Time: " . $stageStartTime->format('Y-m-d H:i:s'));

        $targetDueDate = $today->copy()->subDays($daysOverdue)->format('Y-m-d');
        $this->logMessage("[STAGE] Target Due Date: {$targetDueDate}");

        $invoices = Invoice::with(['billingAccount.customer', 'billingAccount.technicalDetails'])
            ->whereIn('status', ['Unpaid', 'Partial'])
            ->whereDate('due_date', $targetDueDate)
            ->get();

        $invoiceCount = $invoices->count();
        $this->logMessage("[STAGE] Found {$invoiceCount} invoices for {$stage}");
        $this->info("Found {$invoiceCount} invoices for {$stage}");

        if ($invoiceCount === 0) {
            $this->logMessage("[STAGE] No invoices to process for {$stage}");
            $this->logMessage("Stage End Time: " . Carbon::now()->format('Y-m-d H:i:s'));
            $this->info("No invoices to process for {$stage}");
            return;
        }

        $successCount = 0;
        $skipCount = 0;
        $errorCount = 0;
        $emailQueuedCount = 0;
        $smsCount = 0;

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
                $emailAddress = $customer->email_address;

                if (empty($contactNumber) && empty($emailAddress)) {
                    $this->logMessage("[SKIP] Account {$accountNo}: No contact number or email address");
                    $skipCount++;
                    continue;
                }

                if ($this->wasNotificationSentToday($accountNo, $stage)) {
                    $this->logMessage("[SKIP] Account {$accountNo}: Notification already sent today for {$stage}");
                    $skipCount++;
                    continue;
                }

                $this->logMessage("[PROCESSING] Account {$accountNo}: Starting notification process");

                $pdfResult = null;
                $emailSent = false;
                $smsSent = false;

                if (!empty($emailAddress)) {
                    $this->logMessage("[EMAIL] Account {$accountNo}: Generating PDF for email to {$emailAddress}");
                    
                    $pdfResult = $this->pdfService->generateOverduePdf($invoice);

                    if ($pdfResult['success']) {
                        $this->logMessage("[PDF SUCCESS] Account {$accountNo}: PDF generated - {$pdfResult['url']}");
                        
                        $tempPdfPath = null;
                        
                        try {
                            preg_match('/\/d\/(.*?)\//', $pdfResult['url'], $matches);
                            $fileId = $matches[1] ?? null;

                            if ($fileId) {
                                $tempPdfPath = $this->pdfService->downloadPdfFromGoogleDrive($fileId);
                                $this->logMessage("[PDF DOWNLOAD] Account {$accountNo}: PDF downloaded to temp path");
                            }

                            $emailData = $this->prepareEmailData($billingAccount, $invoice);
                            
                            $emailQueued = $this->emailQueueService->queueFromTemplate(
                                'OVERDUE_DESIGN',
                                array_merge($emailData, [
                                    'recipient_email' => $emailAddress,
                                    'attachment_path' => $tempPdfPath
                                ])
                            );

                            if ($emailQueued) {
                                $this->logMessage("[EMAIL SUCCESS] Account {$accountNo}: Email queued (ID: {$emailQueued->id}) with PDF attachment to {$emailAddress}");
                                $emailQueuedCount++;
                                $emailSent = true;
                            } else {
                                $this->logMessage("[EMAIL ERROR] Account {$accountNo}: Failed to queue email");
                                
                                if ($tempPdfPath && file_exists($tempPdfPath)) {
                                    unlink($tempPdfPath);
                                }
                            }

                        } catch (\Exception $e) {
                            $this->logMessage("[EMAIL ERROR] Account {$accountNo}: " . $e->getMessage());
                            
                            if ($tempPdfPath && file_exists($tempPdfPath)) {
                                unlink($tempPdfPath);
                            }
                        }
                    } else {
                        $this->logMessage("[PDF ERROR] Account {$accountNo}: " . $pdfResult['error']);
                    }
                } else {
                    $this->logMessage("[EMAIL SKIP] Account {$accountNo}: No email address available");
                }

                if (!empty($contactNumber)) {
                    $message = $this->buildSmsMessage($stage, $daysOverdue, $invoice, $customer);

                    $this->logMessage("[SMS] Account {$accountNo}: Sending SMS to {$contactNumber}");
                    $result = $this->smsService->sendSms($contactNumber, $message);

                    if ($result['success']) {
                        $this->logMessage("[SMS SUCCESS] Account {$accountNo}: SMS sent successfully to {$contactNumber}");
                        $smsSent = true;
                        $smsCount++;
                    } else {
                        $this->logMessage("[SMS ERROR] Account {$accountNo}: Failed to send SMS - " . $result['message']);
                    }
                } else {
                    $this->logMessage("[SMS SKIP] Account {$accountNo}: No contact number available");
                }

                if ($emailSent || $smsSent) {
                    $notificationStatus = [];
                    if ($emailSent) $notificationStatus[] = 'Email queued';
                    if ($smsSent) $notificationStatus[] = 'SMS sent';
                    
                    $statusMessage = implode(', ', $notificationStatus);
                    
                    $this->logNotification(
                        $accountNo,
                        $contactNumber,
                        $message ?? 'Email only',
                        $stage,
                        $statusMessage
                    );
                    
                    $this->logMessage("[COMPLETED] Account {$accountNo}: {$statusMessage}");
                    $successCount++;
                } else {
                    $this->logMessage("[ERROR] Account {$accountNo}: Both email and SMS failed");
                    $errorCount++;
                }

                if ($successCount % 20 == 0) {
                    sleep(2);
                }

            } catch (\Exception $e) {
                $this->logMessage("[ERROR] Account {$invoice->account_no}: " . $e->getMessage());
                $this->logMessage("[ERROR TRACE] " . $e->getTraceAsString());
                $errorCount++;
            }
        }

        $stageEndTime = Carbon::now();
        $stageDuration = $stageEndTime->diffInSeconds($stageStartTime);
        
        $this->logMessage("[STAGE SUMMARY] {$stage}:");
        $this->logMessage("  Total Invoices Found: {$invoiceCount}");
        $this->logMessage("  Successfully Processed: {$successCount}");
        $this->logMessage("  Emails Queued: {$emailQueuedCount}");
        $this->logMessage("  SMS Sent: {$smsCount}");
        $this->logMessage("  Skipped: {$skipCount}");
        $this->logMessage("  Errors: {$errorCount}");
        $this->logMessage("  Stage Duration: {$stageDuration} seconds");
        $this->logMessage("Stage End Time: " . $stageEndTime->format('Y-m-d H:i:s'));
        
        $this->info("{$stage} - Success: {$successCount}, Emails: {$emailQueuedCount}, SMS: {$smsCount}, Skipped: {$skipCount}, Errors: {$errorCount}");
    }

    private function prepareEmailData($billingAccount, $invoice)
    {
        $customer = $billingAccount->customer;
        $dueDate = Carbon::parse($invoice->due_date);
        $balance = $invoice->total_amount - $invoice->received_payment;

        return [
            'account_no' => $billingAccount->account_no,
            'customer_name' => $customer->full_name,
            'total_amount' => number_format($balance, 2),
            'due_date' => $dueDate->format('F d, Y'),
            'plan' => $customer->desired_plan ?? 'N/A',
            'contact_no' => $customer->contact_number_primary ?? 'N/A'
        ];
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
            
            $this->logMessage("[DB LOG] Notification logged to sms_logs table for account {$accountNo}");
        } catch (\Exception $e) {
            $this->logMessage("[LOG ERROR] Failed to log notification: " . $e->getMessage());
        }
    }

    private function updateOverdueTable($today)
    {
        $updateStartTime = Carbon::now();
        $this->logMessage("--- Updating Overdue Table ---");
        $this->logMessage("Update Start Time: " . $updateStartTime->format('Y-m-d H:i:s'));

        try {
            $existingRecords = DB::table('overdue')->whereDate('created_at', $today)->count();
            $this->logMessage("[OVERDUE TABLE] Found {$existingRecords} existing records for today");
            
            DB::table('overdue')->whereDate('created_at', $today)->delete();
            $this->logMessage("[OVERDUE TABLE] Cleared {$existingRecords} existing records for today");

            $overdueInvoices = Invoice::with(['billingAccount.customer'])
                ->whereIn('status', ['Unpaid', 'Partial'])
                ->where('due_date', '<', $today)
                ->get();

            $totalOverdue = $overdueInvoices->count();
            $this->logMessage("[OVERDUE TABLE] Found {$totalOverdue} overdue invoices to process");

            if ($totalOverdue === 0) {
                $this->logMessage("[OVERDUE TABLE] No overdue invoices found");
                $this->logMessage("Update End Time: " . Carbon::now()->format('Y-m-d H:i:s'));
                return;
            }

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

                $printLink = null;
                if (!empty($invoice->id)) {
                    $printLink = url('/api/invoices/' . $invoice->id . '/print');
                }

                DB::table('overdue')->insert([
                    'account_no' => $accountNo,
                    'invoice_id' => $invoice->id,
                    'overdue_date' => $dueDate->format('Y-m-d'),
                    'print_link' => $printLink,
                    'created_at' => Carbon::now(),
                    'created_by_user_id' => null,
                    'updated_at' => Carbon::now(),
                    'updated_by_user_id' => null
                ]);

                $insertedCount++;

                if ($insertedCount % 100 == 0) {
                    $this->logMessage("[OVERDUE TABLE] Processed {$insertedCount} records...");
                }
            }

            $updateEndTime = Carbon::now();
            $updateDuration = $updateEndTime->diffInSeconds($updateStartTime);
            
            $this->logMessage("[OVERDUE TABLE SUMMARY]:");
            $this->logMessage("  Total Overdue Invoices: {$totalOverdue}");
            $this->logMessage("  Inserted: {$insertedCount}");
            $this->logMessage("  Skipped: {$skippedCount}");
            $this->logMessage("  Update Duration: {$updateDuration} seconds");
            $this->logMessage("Update End Time: " . $updateEndTime->format('Y-m-d H:i:s'));
            
            $this->info("Overdue table updated: {$insertedCount} records inserted");

        } catch (\Exception $e) {
            $this->logMessage("[OVERDUE TABLE ERROR] " . $e->getMessage());
            $this->logMessage("[OVERDUE TABLE ERROR TRACE] " . $e->getTraceAsString());
            $this->error("Failed to update overdue table: " . $e->getMessage());
        }
    }

    private function logMessage($message)
    {
        $timestamp = Carbon::now()->format('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] {$message}";
        
        try {
            Log::channel('overdue')->info($message);
        } catch (\Exception $e) {
            $logFile = storage_path('logs/overdue.log');
            file_put_contents($logFile, $logMessage . PHP_EOL, FILE_APPEND);
        }
        
        $this->line($logMessage);
    }
}
