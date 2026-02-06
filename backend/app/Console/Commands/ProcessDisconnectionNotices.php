<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Invoice;
use App\Models\BillingConfig;
use App\Services\ItexmoSmsService;
use App\Services\EmailQueueService;
use App\Services\GoogleDrivePdfGenerationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ProcessDisconnectionNotices extends Command
{
    protected $signature = 'cron:process-disconnection-notices';

    protected $description = 'Populate disconnection_notice table with accounts scheduled for disconnection and send notifications';

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
        $this->logMessage("=== STARTING DISCONNECTION NOTICE PROCESS ===");
        $this->logMessage("Start Time: " . $startTime->format('Y-m-d H:i:s'));
        $this->info("Starting disconnection notice process...");

        try {
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

            $this->updateDisconnectionNoticeTable($today, $disconnectionNotice);

            $endTime = Carbon::now();
            $duration = $endTime->diffInSeconds($startTime);
            
            $this->logMessage("=== DISCONNECTION NOTICE PROCESS COMPLETED ===");
            $this->logMessage("End Time: " . $endTime->format('Y-m-d H:i:s'));
            $this->logMessage("Duration: {$duration} seconds");
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
        $updateStartTime = Carbon::now();
        $this->logMessage("--- Updating Disconnection Notice Table ---");
        $this->logMessage("Update Start Time: " . $updateStartTime->format('Y-m-d H:i:s'));

        try {
            $existingRecords = DB::table('disconnection_notice')->whereDate('created_at', $today)->count();
            $this->logMessage("[DC NOTICE TABLE] Found {$existingRecords} existing records for today");
            
            DB::table('disconnection_notice')->whereDate('created_at', $today)->delete();
            $this->logMessage("[DC NOTICE TABLE] Cleared {$existingRecords} existing records for today");

            $targetDueDate = $today->copy()->subDays($disconnectionNoticeDays)->format('Y-m-d');
            $this->logMessage("[DC NOTICE TABLE] Target Due Date: {$targetDueDate}");
            $this->logMessage("[DC NOTICE TABLE] Accounts with this due date are {$disconnectionNoticeDays} days overdue");

            $invoices = Invoice::with(['billingAccount.customer', 'billingAccount.technicalDetails'])
                ->whereIn('status', ['Unpaid', 'Partial'])
                ->whereDate('due_date', $targetDueDate)
                ->get();

            $invoiceCount = $invoices->count();
            $this->logMessage("[DC NOTICE TABLE] Found {$invoiceCount} invoices scheduled for disconnection");
            $this->info("Found {$invoiceCount} invoices scheduled for disconnection");

            if ($invoiceCount === 0) {
                $this->logMessage("[DC NOTICE TABLE] No invoices to process");
                $this->logMessage("Update End Time: " . Carbon::now()->format('Y-m-d H:i:s'));
                $this->info("No invoices to process");
                return;
            }

            $insertedCount = 0;
            $skippedCount = 0;
            $successCount = 0;
            $errorCount = 0;
            $emailQueuedCount = 0;
            $smsCount = 0;

            foreach ($invoices as $invoice) {
                try {
                    $accountNo = $invoice->account_no;
                    $billingAccount = $invoice->billingAccount;

                    if (!$billingAccount || !$billingAccount->customer) {
                        $this->logMessage("[DC NOTICE SKIP] Account {$accountNo}: No billing account or customer");
                        $skippedCount++;
                        continue;
                    }

                    $customer = $billingAccount->customer;
                    $contactNumber = $customer->contact_number_primary;
                    $emailAddress = $customer->email_address;
                    $dueDate = Carbon::parse($invoice->due_date);

                    $printLink = null;
                    if (!empty($invoice->id)) {
                        $printLink = url('/api/invoices/' . $invoice->id . '/print');
                    }

                    DB::table('disconnection_notice')->insert([
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
                    $this->logMessage("[DC NOTICE INSERT] Account {$accountNo}: Record inserted into disconnection_notice table");

                    if (empty($contactNumber) && empty($emailAddress)) {
                        $this->logMessage("[SKIP] Account {$accountNo}: No contact number or email address");
                        $skippedCount++;
                        continue;
                    }

                    if ($this->wasNotificationSentToday($accountNo, 'DISCONNECTION_NOTICE')) {
                        $this->logMessage("[SKIP] Account {$accountNo}: Notification already sent today");
                        $skippedCount++;
                        continue;
                    }

                    $this->logMessage("[PROCESSING] Account {$accountNo}: Starting notification process");

                    $emailSent = false;
                    $smsSent = false;

                    if (!empty($emailAddress)) {
                        $this->logMessage("[EMAIL] Account {$accountNo}: Generating PDF for email to {$emailAddress}");
                        
                        $pdfResult = $this->pdfService->generateDcNoticePdf($invoice);

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
                                    'DCNOTICE_DESIGN',
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
                        $message = $this->buildSmsMessage($invoice, $customer, $disconnectionNoticeDays);

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
                            'DISCONNECTION_NOTICE',
                            $statusMessage
                        );
                        
                        $this->logMessage("[COMPLETED] Account {$accountNo}: {$statusMessage}");
                        $successCount++;
                    } else {
                        if (!empty($contactNumber) || !empty($emailAddress)) {
                            $this->logMessage("[ERROR] Account {$accountNo}: Both email and SMS failed");
                            $errorCount++;
                        }
                    }

                    if ($insertedCount % 50 == 0) {
                        $this->logMessage("[DC NOTICE TABLE] Processed {$insertedCount} records...");
                    }

                    if ($successCount % 20 == 0 && $successCount > 0) {
                        sleep(2);
                    }

                } catch (\Exception $e) {
                    $this->logMessage("[ERROR] Account {$invoice->account_no}: " . $e->getMessage());
                    $this->logMessage("[ERROR TRACE] " . $e->getTraceAsString());
                    $errorCount++;
                }
            }

            $updateEndTime = Carbon::now();
            $updateDuration = $updateEndTime->diffInSeconds($updateStartTime);
            
            $this->logMessage("[DC NOTICE TABLE SUMMARY]:");
            $this->logMessage("  Total Invoices Found: {$invoiceCount}");
            $this->logMessage("  Records Inserted: {$insertedCount}");
            $this->logMessage("  Notifications Sent Successfully: {$successCount}");
            $this->logMessage("  Emails Queued: {$emailQueuedCount}");
            $this->logMessage("  SMS Sent: {$smsCount}");
            $this->logMessage("  Skipped: {$skippedCount}");
            $this->logMessage("  Errors: {$errorCount}");
            $this->logMessage("  Update Duration: {$updateDuration} seconds");
            $this->logMessage("Update End Time: " . $updateEndTime->format('Y-m-d H:i:s'));
            
            $this->info("Disconnection notice table updated: {$insertedCount} records inserted");
            $this->info("Notifications - Success: {$successCount}, Emails: {$emailQueuedCount}, SMS: {$smsCount}, Errors: {$errorCount}");

        } catch (\Exception $e) {
            $this->logMessage("[DC NOTICE TABLE ERROR] " . $e->getMessage());
            $this->logMessage("[DC NOTICE TABLE ERROR TRACE] " . $e->getTraceAsString());
            $this->error("Failed to update disconnection notice table: " . $e->getMessage());
        }
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

    private function buildSmsMessage($invoice, $customer, $daysOverdue)
    {
        $fullName = $customer->full_name;
        $accountNo = $invoice->account_no;
        $balance = number_format($invoice->total_amount - $invoice->received_payment, 2);
        $dueDate = Carbon::parse($invoice->due_date);
        $dcDate = $dueDate->copy()->addDays(4);

        return "DISCONNECTION NOTICE: Dear {$fullName}, your account ({$accountNo}) is {$daysOverdue} days overdue. Balance: PHP {$balance}. Your service will be disconnected on {$dcDate->format('F d, Y')} if payment is not received. Please settle immediately. Thank you!";
    }

    private function wasNotificationSentToday($accountNo, $type)
    {
        $today = Carbon::today()->format('Y-m-d');
        
        return DB::table('sms_logs')
            ->where('account_no', $accountNo)
            ->where('sms_type', $type)
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

    private function logMessage($message)
    {
        $timestamp = Carbon::now()->format('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] {$message}";
        
        $logPath = storage_path('logs/disconnection');
        if (!file_exists($logPath)) {
            mkdir($logPath, 0755, true);
        }
        
        $logFile = $logPath . '/disconnection_notices.log';
        file_put_contents($logFile, $logMessage . PHP_EOL, FILE_APPEND);
        
        $this->line($logMessage);
    }
}
