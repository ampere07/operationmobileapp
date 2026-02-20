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
                    $results['errors'][] = "SMS failed: " . ($smsResult['error'] ?? 'Unknown');
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
                
                // Use template code from config
                $templateCode = config('billing.templates.overdue_email', 'OVERDUE_DESIGN_EMAIL');
                
                $emailQueued = $this->emailQueueService->queueFromTemplate(
                    $templateCode,
                    array_merge($emailData, [
                        'recipient_email' => $customer->email_address,
                        'google_drive_url' => $pdfResult['url'],
                        'filename' => $pdfResult['filename']
                    ])
                );
                
                // If failed to find template, log it but don't crash
                if ($emailQueued === null) {
                    $results['errors'][] = "Email template '{$templateCode}' not found.";
                }
                
                $results['email_queued'] = $emailQueued !== null;
            }

            if ($customer->contact_number_primary) {
                $smsResult = $this->sendOverdueSms($account, $invoice);
                $results['sms_sent'] = $smsResult['success'];
                
                if (!$smsResult['success']) {
                    $results['errors'][] = "SMS failed: " . ($smsResult['error'] ?? 'Unknown');
                }
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
                
                // Use template code from config
                $templateCode = config('billing.templates.dc_notice_email', 'DCNOTICE_DESIGN_EMAIL');
                
                $emailQueued = $this->emailQueueService->queueFromTemplate(
                    $templateCode,
                    array_merge($emailData, [
                        'recipient_email' => $customer->email_address,
                        'google_drive_url' => $pdfResult['url'],
                        'filename' => $pdfResult['filename']
                    ])
                );
                
                if ($emailQueued === null) {
                    $results['errors'][] = "Email template '{$templateCode}' not found.";
                }
                
                $results['email_queued'] = $emailQueued !== null;
            }

            if ($customer->contact_number_primary) {
                $smsResult = $this->sendDcNoticeSms($account, $invoice);
                $results['sms_sent'] = $smsResult['success'];
                
                if (!$smsResult['success']) {
                    $results['errors'][] = "SMS failed: " . ($smsResult['error'] ?? 'Unknown');
                }
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
        $tempPdfPath = null;
        
        try {
            // Determine Document Type and Template
            $templateCode = $soa 
                ? config('billing.templates.soa_email', 'SOA_DESIGN_EMAIL')
                : config('billing.templates.invoice_email', 'INVOICE_DESIGN_EMAIL');
                
            // Prepare Data for Template
            $emailData = $this->prepareEmailData($account, $invoice, $soa);
            
            // Handle PDF Attachment (if physical attachment is needed)
            // Note: queueFromTemplate creates the body from template, but we can pass attachment connection
            if (config('billing.notifications.include_pdf_attachment', true)) {
                $fileUrl = $pdfResult['url'];
                preg_match('/\/d\/(.*?)\//', $fileUrl, $matches);
                $fileId = $matches[1] ?? null;

                if ($fileId) {
                    // This creates a temp file
                    $tempPdfPath = $this->pdfService->downloadPdfFromGoogleDrive($fileId);
                }
            }

            // Queue using Template
            $emailQueued = $this->emailQueueService->queueFromTemplate(
                $templateCode,
                array_merge($emailData, [
                    'recipient_email' => $customer->email_address,
                    'google_drive_url' => $pdfResult['url'],
                    'filename' => $pdfResult['filename'],
                    'attachment_path' => $tempPdfPath // Pass the temp path if it exists
                ])
            );
            
            if ($emailQueued === null) {
                Log::error("Email template '{$templateCode}' not found for account {$account->account_no}");
                return false;
            }

            // DO NOT delete temp file here - let email processor delete it after sending
            // The temp file will be cleaned up by the email processor

            return true;
            
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

    protected function sendBillingSms(BillingAccount $account, ?Invoice $invoice, ?StatementOfAccount $soa): array
    {
        try {
            $customer = $account->customer;
            
            if ($customer && !empty($customer->contact_number_primary)) {
                $template = DB::table('sms_templates')
                    ->where('template_type', 'SOA')
                    ->where('is_active', 1)
                    ->first();
                    
                if ($template) {
                    $amount = $soa ? $soa->total_amount_due : $invoice->total_amount;
                    $dueDate = $soa ? $soa->due_date : $invoice->due_date;
                    $paymentLink = config('app.payment_link', 'https://sync.atssfiber.ph');
                    
                    $message = $template->message_content;
                    
                    $planNameRaw = $account->plan ? $account->plan->plan_name : ($account->customer->desired_plan ?? 'N/A');
                    $planNameFormatted = str_replace('₱', 'P', $planNameRaw);
                    $customerName = preg_replace('/\s+/', ' ', trim($customer->full_name));

                    $message = str_replace('{{customer_name}}', $customerName, $message);
                    $message = str_replace('{{account_no}}', $account->account_no, $message);
                    $message = str_replace('{{plan_name}}', $planNameFormatted, $message);
                    $message = str_replace('{{plan_nam}}', $planNameFormatted, $message);
                    $message = str_replace('{{amount_due}}', number_format($amount, 2), $message);
                    $message = str_replace('{{amount}}', number_format($amount, 2), $message);
                    $message = str_replace('{{balance}}', number_format($amount, 2), $message);
                    $message = str_replace('{{due_date}}', $dueDate->format('M d, Y'), $message);
                    $message = str_replace('{{payment_link}}', $paymentLink, $message);
                    
                    $soaDateStr = $soa && $soa->statement_date ? $soa->statement_date->format('M d, Y') : date('M d, Y');
                    $message = str_replace('{{soa_date}}', $soaDateStr, $message);
                    
                    $message = $this->replaceGlobalVariables($message);
                    
                    $result = $this->smsService->send([
                        'contact_no' => $customer->contact_number_primary,
                        'message' => $message
                    ]);
                    
                    if ($result['success']) {
                        Log::info('Billing SMS sent', [
                            'account_no' => $account->account_no
                        ]);
                        return ['success' => true];
                    } else {
                        Log::error('Billing SMS Failed: ' . ($result['error'] ?? 'Unknown error'));
                        return ['success' => false, 'error' => $result['error'] ?? 'Unknown error'];
                    }
                } else {
                    Log::warning('Billing SMS Template not found or inactive');
                    return ['success' => false, 'error' => 'Template not found'];
                }
            } else {
                return ['success' => false, 'error' => 'No contact number'];
            }
        } catch (\Exception $e) {
            Log::error('Failed to send billing SMS: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    protected function sendOverdueSms(BillingAccount $account, Invoice $invoice): array
    {
        try {
            $customer = $account->customer;
            
            if ($customer && !empty($customer->contact_number_primary)) {
                $template = DB::table('sms_templates')
                    ->where('template_type', 'Overdue')
                    ->where('is_active', 1)
                    ->first();
                    
                if ($template) {
                    $message = $template->message_content;
                    
                    $planNameRaw = $account->plan ? $account->plan->plan_name : ($account->customer->desired_plan ?? 'N/A');
                    $planNameFormatted = str_replace('₱', 'P', $planNameRaw);
                    $customerName = preg_replace('/\s+/', ' ', trim($customer->full_name));

                    $message = str_replace('{{customer_name}}', $customerName, $message);
                    $message = str_replace('{{account_no}}', $account->account_no, $message);
                    $message = str_replace('{{plan_name}}', $planNameFormatted, $message);
                    $message = str_replace('{{plan_nam}}', $planNameFormatted, $message);
                    $message = str_replace('{{amount_due}}', number_format($invoice->total_amount, 2), $message);
                    $message = str_replace('{{amount}}', number_format($invoice->total_amount, 2), $message);
                    $message = str_replace('{{balance}}', number_format($invoice->total_amount, 2), $message);
                    $message = str_replace('{{due_date}}', $invoice->due_date->format('M d, Y'), $message);
                    
                    $message = $this->replaceGlobalVariables($message);
                    
                    $result = $this->smsService->send([
                        'contact_no' => $customer->contact_number_primary,
                        'message' => $message
                    ]);
                    
                    if ($result['success']) {
                        Log::info('Overdue SMS sent', [
                            'account_no' => $account->account_no,
                            'invoice_id' => $invoice->id
                        ]);
                        return ['success' => true];
                    } else {
                        Log::error('Overdue SMS Failed: ' . ($result['error'] ?? 'Unknown error'));
                        return ['success' => false, 'error' => $result['error'] ?? 'Unknown error'];
                    }
                } else {
                    Log::warning('Overdue SMS Template not found or inactive');
                    return ['success' => false, 'error' => 'Template not found'];
                }
            } else {
                return ['success' => false, 'error' => 'No contact number'];
            }
        } catch (\Exception $e) {
            Log::error('Failed to send overdue SMS: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    protected function sendDcNoticeSms(BillingAccount $account, Invoice $invoice): array
    {
        try {
            $customer = $account->customer;
            
            if ($customer && !empty($customer->contact_number_primary)) {
                $template = DB::table('sms_templates')
                    ->where('template_type', 'DCNotice')
                    ->where('is_active', 1)
                    ->first();
                    
                if ($template) {
                    $dcDate = $invoice->due_date->copy()->addDays(4);
                    $message = $template->message_content;
                    
                    $planNameRaw = $account->plan ? $account->plan->plan_name : ($account->customer->desired_plan ?? 'N/A');
                    $planNameFormatted = str_replace('₱', 'P', $planNameRaw);
                    $customerName = preg_replace('/\s+/', ' ', trim($customer->full_name));

                    $message = str_replace('{{customer_name}}', $customerName, $message);
                    $message = str_replace('{{account_no}}', $account->account_no, $message);
                    $message = str_replace('{{plan_name}}', $planNameFormatted, $message);
                    $message = str_replace('{{plan_nam}}', $planNameFormatted, $message);
                    $message = str_replace('{{amount_due}}', number_format($invoice->total_amount, 2), $message);
                    $message = str_replace('{{amount}}', number_format($invoice->total_amount, 2), $message);
                    $message = str_replace('{{balance}}', number_format($invoice->total_amount, 2), $message);
                    $message = str_replace('{{dc_date}}', $dcDate->format('M d, Y'), $message);
                    
                    $message = $this->replaceGlobalVariables($message);
                    
                    $result = $this->smsService->send([
                        'contact_no' => $customer->contact_number_primary,
                        'message' => $message
                    ]);
                    
                    if ($result['success']) {
                        Log::info('DC Notice SMS sent', [
                            'account_no' => $account->account_no,
                            'invoice_id' => $invoice->id
                        ]);
                        return ['success' => true];
                    } else {
                        Log::error('DC Notice SMS Failed: ' . ($result['error'] ?? 'Unknown error'));
                        return ['success' => false, 'error' => $result['error'] ?? 'Unknown error'];
                    }
                } else {
                    Log::warning('DC Notice SMS Template not found or inactive');
                    return ['success' => false, 'error' => 'Template not found'];
                }
            } else {
                return ['success' => false, 'error' => 'No contact number'];
            }
        } catch (\Exception $e) {
            Log::error('Failed to send DC Notice SMS: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
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

        $customerName = preg_replace('/\s+/', ' ', trim($customer->full_name));
        $planFormatted = str_replace('₱', 'P', $customer->desired_plan ?? '');

        // Common Data
        $data = [
            'Full_Name' => $customerName,
            'Address' => $customer->address,
            'Contact_No' => $customer->contact_number_primary,
            'Email' => $customer->email_address,
            'Account_No' => $account->account_no,
            'Plan' => $planFormatted,
            'Due_Date' => $dueDate->format('F d, Y'),
            'DC_Date' => $dcDate->format('F d, Y'),
            'Total_Due' => number_format($amount ?? 0, 2),
            'Amount_Due' => number_format($amount ?? 0, 2),
            // Legacy mapping used by some simple templates
            'account_no' => $account->account_no,
            'customer_name' => $customerName,
            'total_amount' => number_format($amount ?? 0, 2),
            'due_date' => $dueDate->format('F d, Y'),
            'plan' => $planFormatted,
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
    private function replaceGlobalVariables(string $message): string
    {
        $portalUrl = 'sync.atssfiber.ph';
        $brandName = \DB::table('form_ui')->value('brand_name') ?? 'Your ISP';

        $message = str_replace('{{portal_url}}', $portalUrl, $message);
        $message = str_replace('{{company_name}}', $brandName, $message);

        return $message;
    }
}

