<?php

namespace App\Services;

use App\Models\BillingAccount;
use App\Models\Invoice;
use App\Models\StatementOfAccount;
use App\Models\SMSTemplate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class BillingNotificationService
{
    protected EmailQueueService $emailQueueService;
    protected ItexmoSmsService $smsService;
    protected GoogleDrivePdfGenerationService $pdfService;

    public function __construct(
        EmailQueueService $emailQueueService,
        ItexmoSmsService $smsService,
        GoogleDrivePdfGenerationService $pdfService
    ) {
        $this->emailQueueService = $emailQueueService;
        $this->smsService = $smsService;
        $this->pdfService = $pdfService;
    }

    public function notifyBillingGenerated(
        BillingAccount $account,
        ?Invoice $invoice = null,
        ?StatementOfAccount $soa = null
    ): array {
        $results = [
            'email_queued' => false,
            'sms_sent' => false,
            'pdf_generated' => false,
            'errors' => []
        ];

        try {
            $customer = $account->customer;

            if (!$customer) {
                throw new \Exception("Customer not found for account {$account->account_no}");
            }

            $pdfResult = $this->pdfService->generateBillingPdf($account, $invoice, $soa);

            if (!$pdfResult['success']) {
                $results['errors'][] = "PDF generation failed: " . $pdfResult['error'];
                return $results;
            }

            $results['pdf_generated'] = true;
            $results['pdf_url'] = $pdfResult['url'];
            $results['google_drive_file_id'] = $pdfResult['folder_id'];
            $results['filename'] = $pdfResult['filename'];

            if ($soa) {
                $this->updateSoaPdfLink($soa, $pdfResult['url']);
            }

            if ($customer->email_address) {
                $emailQueued = $this->queueBillingEmail($account, $invoice, $soa, $pdfResult);
                $results['email_queued'] = $emailQueued;
            } else {
                Log::warning('Customer has no email address', [
                    'account_no' => $account->account_no,
                    'customer_id' => $customer->id
                ]);
                $results['errors'][] = 'Customer has no email address';
            }

            if ($customer->contact_number_primary) {
                $smsResult = $this->sendBillingSms($account, $invoice, $soa);
                $results['sms_sent'] = $smsResult['success'];
                
                if (!$smsResult['success']) {
                    $results['errors'][] = "SMS failed: " . $smsResult['error'];
                }
            } else {
                Log::warning('Customer has no phone number', [
                    'account_no' => $account->account_no,
                    'customer_id' => $customer->id
                ]);
                $results['errors'][] = 'Customer has no phone number';
            }

            Log::info('Billing notification completed', [
                'account_no' => $account->account_no,
                'email_queued' => $results['email_queued'],
                'sms_sent' => $results['sms_sent'],
                'google_drive_url' => $pdfResult['url']
            ]);

        } catch (\Exception $e) {
            $results['errors'][] = $e->getMessage();
            Log::error('Billing notification failed', [
                'account_no' => $account->account_no,
                'error' => $e->getMessage()
            ]);
        }

        return $results;
    }

    public function notifyOverdue(Invoice $invoice): array
    {
        $results = [
            'email_queued' => false,
            'sms_sent' => false,
            'pdf_generated' => false,
            'errors' => []
        ];

        try {
            $account = $invoice->billingAccount;
            $customer = $account->customer;

            if (!$customer) {
                throw new \Exception("Customer not found for invoice {$invoice->id}");
            }

            $pdfResult = $this->pdfService->generateOverduePdf($invoice);

            if (!$pdfResult['success']) {
                $results['errors'][] = "PDF generation failed: " . $pdfResult['error'];
                return $results;
            }

            $results['pdf_generated'] = true;
            $results['pdf_url'] = $pdfResult['url'];

            if ($customer->email_address) {
                $emailData = $this->prepareEmailData($account, $invoice, null);
                $emailQueued = $this->emailQueueService->queueFromTemplate(
                    'OVERDUE_DESIGN',
                    array_merge($emailData, [
                        'recipient_email' => $customer->email_address,
                        'google_drive_url' => $pdfResult['url'],
                        'filename' => $pdfResult['filename']
                    ])
                );
                $results['email_queued'] = $emailQueued !== null;
            }

            if ($customer->contact_number_primary) {
                $message = $this->buildOverdueSmsMessage($account, $invoice);
                $smsResult = $this->smsService->send([
                    'contact_no' => $customer->contact_number_primary,
                    'message' => $message
                ]);
                $results['sms_sent'] = $smsResult['success'];
            }

        } catch (\Exception $e) {
            $results['errors'][] = $e->getMessage();
            Log::error('Overdue notification failed', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage()
            ]);
        }

        return $results;
    }

    public function notifyDcNotice(Invoice $invoice): array
    {
        $results = [
            'email_queued' => false,
            'sms_sent' => false,
            'pdf_generated' => false,
            'errors' => []
        ];

        try {
            $account = $invoice->billingAccount;
            $customer = $account->customer;

            if (!$customer) {
                throw new \Exception("Customer not found for invoice {$invoice->id}");
            }

            $pdfResult = $this->pdfService->generateDcNoticePdf($invoice);

            if (!$pdfResult['success']) {
                $results['errors'][] = "PDF generation failed: " . $pdfResult['error'];
                return $results;
            }

            $results['pdf_generated'] = true;
            $results['pdf_url'] = $pdfResult['url'];

            if ($customer->email_address) {
                $emailData = $this->prepareEmailData($account, $invoice, null);
                $emailQueued = $this->emailQueueService->queueFromTemplate(
                    'DCNOTICE_DESIGN',
                    array_merge($emailData, [
                        'recipient_email' => $customer->email_address,
                        'google_drive_url' => $pdfResult['url'],
                        'filename' => $pdfResult['filename']
                    ])
                );
                $results['email_queued'] = $emailQueued !== null;
            }

            if ($customer->contact_number_primary) {
                $message = $this->buildDcNoticeSmsMessage($account, $invoice);
                $smsResult = $this->smsService->send([
                    'contact_no' => $customer->contact_number_primary,
                    'message' => $message
                ]);
                $results['sms_sent'] = $smsResult['success'];
            }

        } catch (\Exception $e) {
            $results['errors'][] = $e->getMessage();
            Log::error('DC Notice notification failed', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage()
            ]);
        }

        return $results;
    }

    protected function queueBillingEmail(
        BillingAccount $account,
        ?Invoice $invoice,
        ?StatementOfAccount $soa,
        array $pdfResult
    ): bool {
        $customer = $account->customer;

        $amount = $soa ? $soa->total_amount_due : $invoice->total_amount;
        $dueDate = $soa ? $soa->due_date : $invoice->due_date;
        $documentType = $soa ? 'Statement of Account' : 'Invoice';

        // Simple plain text email body without Google Drive link
        $emailBody = "Dear {$customer->full_name},\n\n";
        $emailBody .= "Please find attached your {$documentType} for account {$account->account_no}.\n\n";
        $emailBody .= "Total Amount Due: ₱" . number_format($amount, 2) . "\n";
        $emailBody .= "Due Date: " . $dueDate->format('F d, Y') . "\n\n";
        $emailBody .= "Thank you for your business.\n\n";
        $emailBody .= "This is an automated email. Please do not reply.";

        $tempPdfPath = null;
        
        try {
            $fileUrl = $pdfResult['url'];
            preg_match('/\/d\/(.*?)\//', $fileUrl, $matches);
            $fileId = $matches[1] ?? null;

            if ($fileId) {
                $tempPdfPath = $this->pdfService->downloadPdfFromGoogleDrive($fileId);
            }

            // Queue email directly without template
            $emailQueued = $this->emailQueueService->queueEmail([
                'account_no' => $account->account_no,
                'recipient_email' => $customer->email_address,
                'subject' => "Your {$documentType} - {$account->account_no}",
                'body_html' => nl2br($emailBody),
                'attachment_path' => $tempPdfPath
            ]);

            // DO NOT delete temp file here - let email processor delete it after sending
            // The temp file will be cleaned up by the email processor

            return $emailQueued !== null;
            
        } catch (\Exception $e) {
            Log::error('Failed to queue billing email', [
                'account_no' => $account->account_no,
                'error' => $e->getMessage()
            ]);
            
            if ($tempPdfPath && file_exists($tempPdfPath)) {
                unlink($tempPdfPath);
            }
            
            return false;
        }
    }

    protected function sendBillingSms(
        BillingAccount $account,
        ?Invoice $invoice,
        ?StatementOfAccount $soa
    ): array {
        $customer = $account->customer;
        $message = $this->buildBillingSmsMessage($account, $invoice, $soa);

        return $this->smsService->send([
            'contact_no' => $customer->contact_number_primary,
            'message' => $message
        ]);
    }

    protected function prepareEmailData(
        BillingAccount $account,
        ?Invoice $invoice,
        ?StatementOfAccount $soa
    ): array {
        $customer = $account->customer;

        $amount = $invoice ? $invoice->total_amount : $soa->total_amount_due;
        $dueDate = $invoice ? $invoice->due_date : $soa->due_date;
        $dcDate = $dueDate->copy()->addDays(4); // Default rule

        // Common Data
        $data = [
            'Full_Name' => $customer->full_name,
            'Address' => $customer->address,
            'Contact_No' => $customer->contact_number_primary,
            'Email' => $customer->email_address,
            'Account_No' => $account->account_no,
            'Plan' => $customer->desired_plan,
            'Due_Date' => $dueDate->format('F d, Y'),
            'DC_Date' => $dcDate->format('F d, Y'),
            'Total_Due' => number_format($amount ?? 0, 2),
            'Amount_Due' => number_format($amount ?? 0, 2),
            // Legacy mapping used by some simple templates
            'account_no' => $account->account_no,
            'customer_name' => $customer->full_name,
            'total_amount' => number_format($amount ?? 0, 2),
            'due_date' => $dueDate->format('F d, Y'),
            'plan' => $customer->desired_plan,
            'contact_no' => $customer->contact_number_primary
        ];

        if ($soa) {
            $data['SOA_No'] = $soa->statement_no ?? '';
            $data['Statement_Date'] = $soa->statement_date ? $soa->statement_date->format('F d, Y') : '';
            $data['Prev_Balance'] = number_format($soa->balance_from_previous_bill ?? 0, 2);
            $data['Prev_Payment'] = number_format($soa->payment_received_previous ?? 0, 2);
            $data['Rem_Balance'] = number_format($soa->remaining_balance_previous ?? 0, 2);
            // SOA usually covers a billing period; simplified here as start/end might be logic-dependent
            $data['Period_Start'] = ''; 
            $data['Period_End'] = ''; 
        } elseif ($invoice) {
             // Invoice specific data
            $data['SOA_No'] = $invoice->invoice_no ?? ''; // Or N/A
            $data['Statement_Date'] = $invoice->invoice_date ? $invoice->invoice_date->format('F d, Y') : '';
            $data['Prev_Balance'] = '0.00';
            $data['Prev_Payment'] = number_format($invoice->received_payment ?? 0, 2);
            $data['Rem_Balance'] = number_format($invoice->invoice_balance ?? 0, 2);
            $data['Period_Start'] = '';
            $data['Period_End'] = '';
        }

        return $data;
    }

    protected function buildBillingSmsMessage(
        BillingAccount $account,
        ?Invoice $invoice,
        ?StatementOfAccount $soa
    ): string {
        $customer = $account->customer;
        $accountBalance = $account->account_balance;
        $dueDate = $soa ? $soa->due_date : $invoice->due_date;
        $paymentLink = config('app.payment_link', 'https://pay.example.com');

        $template = SMSTemplate::where('template_type', 'StatementofAccount')
            ->where('is_active', true)
            ->first();

        if ($template) {
            $message = $template->message_content;
            $message = str_replace('{{customer_name}}', $customer->full_name, $message);
            $message = str_replace('{{account_no}}', $account->account_no, $message);
            $message = str_replace('{{amount_due}}', number_format($accountBalance, 2), $message);
            $message = str_replace('{{due_date}}', $dueDate->format('M d, Y'), $message);
            $message = str_replace('{{payment_link}}', $paymentLink, $message);
            return $message;
        }

        return sprintf(
            "Your billing statement for %s is ready. Amount Due: ₱%s. Due Date: %s. Check your email for details or pay online at %s",
            $account->account_no,
            number_format($accountBalance, 2),
            $dueDate->format('M d, Y'),
            $paymentLink
        );
    }

    protected function buildOverdueSmsMessage(BillingAccount $account, Invoice $invoice): string
    {
        $template = SMSTemplate::where('template_type', 'Overdue')
            ->where('is_active', true)
            ->first();

        if ($template) {
            $message = $template->message_content;
            $message = str_replace('{{customer_name}}', $account->customer->full_name, $message);
            $message = str_replace('{{account_no}}', $account->account_no, $message);
            $message = str_replace('{{amount_due}}', number_format($invoice->total_amount, 2), $message);
            $message = str_replace('{{due_date}}', $invoice->due_date->format('M d, Y'), $message);
            return $message;
        }

        return sprintf(
            "OVERDUE NOTICE: Your account %s has an overdue balance of ₱%s. Original due date: %s. Please settle immediately to avoid service interruption.",
            $account->account_no,
            number_format($invoice->total_amount, 2),
            $invoice->due_date->format('M d, Y')
        );
    }

    protected function buildDcNoticeSmsMessage(BillingAccount $account, Invoice $invoice): string
    {
        $dcDate = $invoice->due_date->copy()->addDays(4);
        
        $template = SMSTemplate::where('template_type', 'DCNotice')
            ->where('is_active', true)
            ->first();

        if ($template) {
            $message = $template->message_content;
            $message = str_replace('{{customer_name}}', $account->customer->full_name, $message);
            $message = str_replace('{{account_no}}', $account->account_no, $message);
            $message = str_replace('{{amount_due}}', number_format($invoice->total_amount, 2), $message);
            $message = str_replace('{{dc_date}}', $dcDate->format('M d, Y'), $message);
            return $message;
        }

        return sprintf(
            "DISCONNECTION NOTICE: Your account %s will be disconnected on %s. Outstanding balance: ₱%s. Pay now to avoid service interruption.",
            $account->account_no,
            $dcDate->format('M d, Y'),
            number_format($invoice->total_amount, 2)
        );
    }

    protected function updateSoaPdfLink(StatementOfAccount $soa, string $url): void
    {
        try {
            $soa->update(['print_link' => $url]);
        } catch (\Exception $e) {
            Log::warning('Failed to update SOA PDF link', [
                'soa_id' => $soa->id,
                'error' => $e->getMessage()
            ]);
        }
    }
}

