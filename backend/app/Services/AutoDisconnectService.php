<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\BillingAccount;
use App\Models\ServiceOrder;
use App\Models\BillingConfig;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Exception;

class AutoDisconnectService
{
    private $logName = 'Auto_DC';
    private $radiusService;
    private $smsService;

    public function __construct(
        ManualRadiusOperationsService $radiusService,
        ?ItexmoSmsService $smsService = null
    ) {
        $this->radiusService = $radiusService;
        $this->smsService = $smsService;
    }

    /**
     * Process automatic disconnections based on overdue invoices
     */
    public function processAutoDisconnect(): array
    {
        $this->writeLog("╔════════════════════════════════════════════════════════════════╗");
        $this->writeLog("║         STARTING AUTO DISCONNECTION PROCESS                    ║");
        $this->writeLog("╚════════════════════════════════════════════════════════════════╝");
        $startTime = Carbon::now();
        $this->writeLog("Start Time: " . $startTime->format('Y-m-d H:i:s'));
        $this->writeLog("");

        try {
            $config = BillingConfig::first();
            
            if (!$config) {
                $this->writeLog("[ERROR] Billing configuration not found");
                throw new Exception("Billing configuration not found");
            }

            $dcActualOffset = $config->disconnection_day ?? 4;
            $dcFee = $config->disconnection_fee ?? 0.00;
            $targetDate = Carbon::today()->subDays($dcActualOffset)->format('Y-m-d');
            
            $this->writeLog("[CONFIG] Disconnection Day Offset: {$dcActualOffset} days");
            $this->writeLog("[CONFIG] Disconnection Fee: ₱" . number_format($dcFee, 2));
            $this->writeLog("[CONFIG] Target Due Date: {$targetDate}");
            $this->writeLog("");

            // Fetch overdue invoices
            $this->writeLog("[QUERY] Searching for overdue invoices...");
            $invoices = Invoice::with(['billingAccount.customer', 'billingAccount.technicalDetails'])
                ->whereIn('status', ['Unpaid', 'Partial'])
                ->whereDate('due_date', $targetDate)
                ->get();

            $totalCount = $invoices->count();
            $this->writeLog("[RESULT] Found {$totalCount} invoice(s) with due date = {$targetDate}");
            $this->writeLog("");

            if ($totalCount === 0) {
                $this->writeLog("[INFO] No invoices to process for disconnection today.");
                $this->writeLog("[INFO] Criteria: Status IN ('Unpaid', 'Partial') AND Due Date = {$targetDate}");
                $endTime = Carbon::now();
                $duration = $endTime->diffInSeconds($startTime);
                $this->writeLog("");
                $this->writeLog("╔════════════════════════════════════════════════════════════════╗");
                $this->writeLog("║         AUTO DISCONNECTION COMPLETE (No Actions)               ║");
                $this->writeLog("╚════════════════════════════════════════════════════════════════╝");
                $this->writeLog("End Time: " . $endTime->format('Y-m-d H:i:s'));
                $this->writeLog("Duration: {$duration} second(s)");
                $this->writeLog("");
                
                return [
                    'success' => true,
                    'processed' => 0,
                    'skipped' => 0,
                    'errors' => [],
                    'duration' => $duration
                ];
            }

            $this->writeLog("[PROCESS] Starting disconnection process...");
            $this->writeLog("─────────────────────────────────────────────────────────────────");

            $processedCount = 0;
            $skippedCount = 0;
            $errors = [];
            $counter = 0;

            foreach ($invoices as $invoice) {
                $counter++;
                $this->writeLog("");
                $this->writeLog("[{$counter}/{$totalCount}] ══════════════════════════════════════════════");
                
                try {
                    $result = $this->processDisconnection($invoice, $dcActualOffset);
                    
                    if ($result['success']) {
                        $processedCount++;
                        $this->writeLog("[{$counter}/{$totalCount}] ✓ SUCCESS");
                    } else {
                        $skippedCount++;
                        $this->writeLog("[{$counter}/{$totalCount}] ⊘ SKIPPED: {$result['reason']}");
                        if (isset($result['reason'])) {
                            $errors[] = "Account {$invoice->account_no}: {$result['reason']}";
                        }
                    }
                } catch (Exception $e) {
                    $this->writeLog("[{$counter}/{$totalCount}] ✗ ERROR: " . $e->getMessage());
                    $this->writeLog("[TRACE] " . $e->getTraceAsString());
                    $errors[] = "Account {$invoice->account_no}: " . $e->getMessage();
                    $skippedCount++;
                }
            }

            $endTime = Carbon::now();
            $duration = $endTime->diffInSeconds($startTime);
            
            $this->writeLog("");
            $this->writeLog("╔════════════════════════════════════════════════════════════════╗");
            $this->writeLog("║         AUTO DISCONNECTION COMPLETE                            ║");
            $this->writeLog("╚════════════════════════════════════════════════════════════════╝");
            $this->writeLog("Summary:");
            $this->writeLog("  • Total Found: {$totalCount}");
            $this->writeLog("  • Successfully Processed: {$processedCount}");
            $this->writeLog("  • Skipped: {$skippedCount}");
            $this->writeLog("  • Errors: " . count($errors));
            $this->writeLog("  • Duration: {$duration} second(s)");
            $this->writeLog("End Time: " . $endTime->format('Y-m-d H:i:s'));
            $this->writeLog("");

            if (!empty($errors)) {
                $this->writeLog("[ERROR DETAILS]");
                foreach ($errors as $error) {
                    $this->writeLog("  × {$error}");
                }
                $this->writeLog("");
            }

            return [
                'success' => true,
                'processed' => $processedCount,
                'skipped' => $skippedCount,
                'errors' => $errors,
                'duration' => $duration
            ];

        } catch (Exception $e) {
            $endTime = Carbon::now();
            $duration = $endTime->diffInSeconds($startTime);
            
            $this->writeLog("");
            $this->writeLog("╔════════════════════════════════════════════════════════════════╗");
            $this->writeLog("║         CRITICAL ERROR                                         ║");
            $this->writeLog("╚════════════════════════════════════════════════════════════════╝");
            $this->writeLog("[CRITICAL] " . $e->getMessage());
            $this->writeLog("[TRACE] " . $e->getTraceAsString());
            $this->writeLog("End Time: " . $endTime->format('Y-m-d H:i:s'));
            $this->writeLog("Duration: {$duration} second(s)");
            $this->writeLog("");
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Process a single disconnection
     */
    private function processDisconnection(Invoice $invoice, int $dcActualOffset): array
    {
        $accountNo = $invoice->account_no;
        $this->writeLog("[ACCOUNT] {$accountNo}");

        $billingAccount = $invoice->billingAccount;

        if (!$billingAccount) {
            $this->writeLog("  [SKIP] Billing account not found");
            return ['success' => false, 'reason' => 'Billing account not found'];
        }

        // Check if already disconnected today
        $alreadyDisconnected = DB::table('disconnected_logs')
            ->where('account_no', $accountNo)
            ->whereDate('date', Carbon::today())
            ->exists();

        if ($alreadyDisconnected) {
            $this->writeLog("  [SKIP] Already disconnected today");
            return ['success' => false, 'reason' => 'Already disconnected today'];
        }

        // Validate account balance
        $currentBalance = floatval($billingAccount->account_balance);
        $this->writeLog("  [INFO] Current Balance: ₱" . number_format($currentBalance, 2));

        if ($currentBalance <= 0.00) {
            $this->writeLog("  [SKIP] Balance is zero or negative (already paid)");
            return ['success' => false, 'reason' => 'Balance already paid'];
        }

        // Check if already inactive or pullout
        $billingStatus = $billingAccount->billingStatus->status ?? '';
        $this->writeLog("  [INFO] Current Status: {$billingStatus}");
        
        if (in_array($billingStatus, ['Inactive', 'Pullout'])) {
            $this->writeLog("  [SKIP] Status is already {$billingStatus}");
            return ['success' => false, 'reason' => "Already {$billingStatus}"];
        }

        // Get technical details for username
        $technicalDetail = $billingAccount->technicalDetails->first();
        if (!$technicalDetail || empty($technicalDetail->pppoe_username)) {
            $this->writeLog("  [SKIP] PPPoE username not found");
            return ['success' => false, 'reason' => 'PPPoE username not found'];
        }

        $username = $technicalDetail->pppoe_username;
        $this->writeLog("  [INFO] Username: {$username}");

        DB::beginTransaction();
        try {
            $config = BillingConfig::first();
            $dcFee = floatval($config->disconnection_fee ?? 0);

            // Apply disconnection fee if configured
            if ($dcFee > 0) {
                $this->writeLog("  [FEE] Applying disconnection fee: ₱" . number_format($dcFee, 2));

                // Update invoice
                $invoice->service_charge += $dcFee;
                $invoice->total_amount += $dcFee;
                $invoice->invoice_balance += $dcFee;
                $invoice->updated_by = 'System';
                $invoice->save();

                // Update account balance
                $newBalance = $currentBalance + $dcFee;
                $billingAccount->account_balance = $newBalance;
                $billingAccount->updated_by = 'System';
                $billingAccount->save();

                $this->writeLog("  [FEE] New Balance: ₱" . number_format($newBalance, 2));

                // Log service charge
                DB::table('service_charge_logs')->insert([
                    'account_no' => $accountNo,
                    'invoice_id' => $invoice->id,
                    'service_charge_type' => 'Disconnection Fee',
                    'amount' => $dcFee,
                    'date_applied' => Carbon::now(),
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                    'created_by' => 'System',
                    'updated_by' => 'System'
                ]);

            } else {
                $this->writeLog("  [FEE] No disconnection fee (set to 0)");
            }

            // Disconnect via RADIUS using existing service
            $this->writeLog("  [RADIUS] Initiating disconnection...");
            $disconnectResult = $this->radiusService->disconnectUser([
                'username' => $username,
                'accountNumber' => $accountNo,
                'remarks' => 'Auto DC',
                'updatedBy' => 'System'
            ]);

            if ($disconnectResult['status'] !== 'success') {
                throw new Exception("RADIUS disconnect failed: " . ($disconnectResult['message'] ?? 'Unknown error'));
            }
            $this->writeLog("  [RADIUS] ✓ Successfully disconnected");

            // Log disconnection
            $customer = $billingAccount->customer;
            DB::table('disconnected_logs')->insert([
                'account_no' => $accountNo,
                'splynx_id' => $technicalDetail->splynx_id ?? null,
                'mikrotik_id' => $technicalDetail->mikrotik_id ?? null,
                'provider' => $technicalDetail->provider ?? null,
                'username' => $username,
                'date' => Carbon::now(),
                'remarks' => "System Auto DC (Overdue {$dcActualOffset} days)",
                'user_email' => 'System',
                'name' => $customer->full_name ?? null,
                'barangay' => $customer->barangay ?? null,
                'city' => $customer->city ?? null,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now()
            ]);
            $this->writeLog("  [LOG] Recorded in disconnected_logs");

            // Send SMS notification if service is available
            if ($this->smsService && $customer && $customer->contact_number_primary) {
                $this->writeLog("  [SMS] Sending notification to {$customer->contact_number_primary}");
                $this->triggerSMS($accountNo, 'dcTxt', [
                    'name' => $customer->full_name,
                    'balance' => number_format($currentBalance + $dcFee, 2)
                ]);
            }

            DB::commit();
            $this->writeLog("  [COMPLETE] Account {$accountNo} successfully disconnected");

            return ['success' => true];

        } catch (Exception $e) {
            DB::rollBack();
            $this->writeLog("  [ERROR] Transaction rolled back: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Process automatic pullout requests
     */
    public function processAutoPullout(): array
    {
        $this->writeLog("");
        $this->writeLog("╔════════════════════════════════════════════════════════════════╗");
        $this->writeLog("║         STARTING AUTO PULLOUT PROCESS                          ║");
        $this->writeLog("╚════════════════════════════════════════════════════════════════╝");
        $startTime = Carbon::now();
        $this->writeLog("Start Time: " . $startTime->format('Y-m-d H:i:s'));
        $this->writeLog("");

        try {
            $config = BillingConfig::first();
            
            if (!$config) {
                $this->writeLog("[ERROR] Billing configuration not found");
                throw new Exception("Billing configuration not found");
            }

            $pulloutOffset = $config->pullout_offset ?? 30;
            $targetDate = Carbon::today()->subDays($pulloutOffset)->format('Y-m-d');
            
            $this->writeLog("[CONFIG] Pullout Offset: {$pulloutOffset} days");
            $this->writeLog("[CONFIG] Target Due Date: {$targetDate}");
            $this->writeLog("");

            // Fetch overdue invoices for pullout
            $this->writeLog("[QUERY] Searching for pullout candidates...");
            $invoices = Invoice::with(['billingAccount.customer', 'billingAccount.technicalDetails'])
                ->whereIn('status', ['Unpaid', 'Partial'])
                ->whereDate('due_date', $targetDate)
                ->get();

            $totalCount = $invoices->count();
            $this->writeLog("[RESULT] Found {$totalCount} invoice(s) with due date = {$targetDate}");
            $this->writeLog("");

            if ($totalCount === 0) {
                $this->writeLog("[INFO] No invoices to process for pullout today.");
                $this->writeLog("[INFO] Criteria: Status IN ('Unpaid', 'Partial') AND Due Date = {$targetDate}");
                $endTime = Carbon::now();
                $duration = $endTime->diffInSeconds($startTime);
                $this->writeLog("");
                $this->writeLog("╔════════════════════════════════════════════════════════════════╗");
                $this->writeLog("║         AUTO PULLOUT COMPLETE (No Actions)                     ║");
                $this->writeLog("╚════════════════════════════════════════════════════════════════╝");
                $this->writeLog("End Time: " . $endTime->format('Y-m-d H:i:s'));
                $this->writeLog("Duration: {$duration} second(s)");
                $this->writeLog("");
                
                return [
                    'success' => true,
                    'created' => 0,
                    'skipped' => 0,
                    'errors' => [],
                    'duration' => $duration
                ];
            }

            $this->writeLog("[PROCESS] Starting pullout request creation...");
            $this->writeLog("─────────────────────────────────────────────────────────────────");

            $createdCount = 0;
            $skippedCount = 0;
            $errors = [];
            $counter = 0;

            foreach ($invoices as $invoice) {
                $counter++;
                $accountNo = $invoice->account_no;
                
                $this->writeLog("");
                $this->writeLog("[{$counter}/{$totalCount}] ══════════════════════════════════════════════");
                $this->writeLog("[ACCOUNT] {$accountNo}");
                
                try {
                    // Check if pullout request already exists
                    $existingPullout = ServiceOrder::where('account_no', $accountNo)
                        ->where('concern', 'Pullout')
                        ->whereNotIn('support_status', ['Closed', 'Cancelled'])
                        ->exists();

                    if ($existingPullout) {
                        $this->writeLog("  [SKIP] Pullout request already exists");
                        $this->writeLog("[{$counter}/{$totalCount}] ⊘ SKIPPED");
                        $skippedCount++;
                        continue;
                    }

                    $billingAccount = $invoice->billingAccount;
                    if (!$billingAccount) {
                        $this->writeLog("  [SKIP] Billing account not found");
                        $this->writeLog("[{$counter}/{$totalCount}] ⊘ SKIPPED");
                        $skippedCount++;
                        continue;
                    }

                    $this->writeLog("  [CREATE] Creating pullout service order...");
                    $this->createPulloutRequest($billingAccount, $pulloutOffset);
                    $createdCount++;
                    $this->writeLog("  [COMPLETE] Pullout request created");
                    $this->writeLog("[{$counter}/{$totalCount}] ✓ SUCCESS");

                } catch (Exception $e) {
                    $this->writeLog("  [ERROR] " . $e->getMessage());
                    $this->writeLog("  [TRACE] " . $e->getTraceAsString());
                    $this->writeLog("[{$counter}/{$totalCount}] ✗ ERROR");
                    $errors[] = "Account {$accountNo}: " . $e->getMessage();
                    $skippedCount++;
                }
            }

            $endTime = Carbon::now();
            $duration = $endTime->diffInSeconds($startTime);
            
            $this->writeLog("");
            $this->writeLog("╔════════════════════════════════════════════════════════════════╗");
            $this->writeLog("║         AUTO PULLOUT COMPLETE                                  ║");
            $this->writeLog("╚════════════════════════════════════════════════════════════════╝");
            $this->writeLog("Summary:");
            $this->writeLog("  • Total Found: {$totalCount}");
            $this->writeLog("  • Service Orders Created: {$createdCount}");
            $this->writeLog("  • Skipped: {$skippedCount}");
            $this->writeLog("  • Errors: " . count($errors));
            $this->writeLog("  • Duration: {$duration} second(s)");
            $this->writeLog("End Time: " . $endTime->format('Y-m-d H:i:s'));
            $this->writeLog("");

            if (!empty($errors)) {
                $this->writeLog("[ERROR DETAILS]");
                foreach ($errors as $error) {
                    $this->writeLog("  × {$error}");
                }
                $this->writeLog("");
            }

            return [
                'success' => true,
                'created' => $createdCount,
                'skipped' => $skippedCount,
                'errors' => $errors,
                'duration' => $duration
            ];

        } catch (Exception $e) {
            $endTime = Carbon::now();
            $duration = $endTime->diffInSeconds($startTime);
            
            $this->writeLog("");
            $this->writeLog("╔════════════════════════════════════════════════════════════════╗");
            $this->writeLog("║         CRITICAL ERROR                                         ║");
            $this->writeLog("╚════════════════════════════════════════════════════════════════╝");
            $this->writeLog("[CRITICAL] " . $e->getMessage());
            $this->writeLog("[TRACE] " . $e->getTraceAsString());
            $this->writeLog("End Time: " . $endTime->format('Y-m-d H:i:s'));
            $this->writeLog("Duration: {$duration} second(s)");
            $this->writeLog("");
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Create a pullout service order
     */
    private function createPulloutRequest(BillingAccount $billingAccount, int $pulloutOffset): void
    {
        $customer = $billingAccount->customer;
        $technicalDetail = $billingAccount->technicalDetails->first();

        $serviceOrder = new ServiceOrder();
        $serviceOrder->timestamp = Carbon::now();
        $serviceOrder->account_no = $billingAccount->account_no;
        $serviceOrder->date_installed = $billingAccount->date_installed;
        $serviceOrder->full_name = $customer->full_name ?? null;
        $serviceOrder->contact_number = $customer->contact_number_primary ?? null;
        $serviceOrder->email_address = $customer->email_address ?? null;
        $serviceOrder->address = $customer->complete_address ?? null;
        $serviceOrder->location = $customer->location ?? null;
        $serviceOrder->plan = $billingAccount->plan->name ?? null;
        $serviceOrder->provider = $technicalDetail->provider ?? null;
        $serviceOrder->username = $technicalDetail->pppoe_username ?? null;
        $serviceOrder->connection_type = $technicalDetail->connection_type ?? null;
        $serviceOrder->router_modem_sn = $technicalDetail->router_model ?? null;
        $serviceOrder->lcp = $technicalDetail->lcp ?? null;
        $serviceOrder->nap = $technicalDetail->nap ?? null;
        $serviceOrder->port = $technicalDetail->port ?? null;
        $serviceOrder->vlan = $technicalDetail->vlan ?? null;
        $serviceOrder->support_status = 'In Progress';
        $serviceOrder->concern = 'Pullout';
        $serviceOrder->concern_remarks = "System Auto Generated (Overdue {$pulloutOffset} Days)";
        $serviceOrder->requested_by = 'System';
        $serviceOrder->barangay = $customer->barangay ?? null;
        $serviceOrder->city = $customer->city ?? null;
        $serviceOrder->created_by = 'System';
        $serviceOrder->updated_by = 'System';
        $serviceOrder->save();
    }

    /**
     * Trigger SMS notification
     */
    private function triggerSMS(string $accountNo, string $type, array $data): void
    {
        try {
            if (!$this->smsService) {
                return;
            }

            $billingAccount = BillingAccount::with('customer')
                ->where('account_no', $accountNo)
                ->first();

            if (!$billingAccount || !$billingAccount->customer) {
                return;
            }

            $customer = $billingAccount->customer;
            $contactNumber = $customer->contact_number_primary;

            if (empty($contactNumber)) {
                return;
            }

            $message = $this->buildSmsMessage($type, $customer->full_name, $accountNo, $data);

            if (!empty($message)) {
                $this->smsService->sendSms($contactNumber, $message);
                $this->writeLog("SMS triggered for $accountNo");
            }

        } catch (Exception $e) {
            $this->writeLog("SMS Error: " . $e->getMessage());
            // Don't throw - SMS failure shouldn't stop the process
        }
    }

    /**
     * Build SMS message based on type
     */
    private function buildSmsMessage(string $type, string $name, string $accountNo, array $data): string
    {
        switch ($type) {
            case 'dcTxt':
                $balance = $data['balance'] ?? '0.00';
                return "DISCONNECTION NOTICE: Dear {$name}, your account ({$accountNo}) has been disconnected due to non-payment. Outstanding balance: PHP {$balance}. Please settle immediately to restore service. Thank you!";
                
            default:
                return '';
        }
    }

    /**
     * Write to log file
     */
    private function writeLog(string $message): void
    {
        $timestamp = Carbon::now()->format('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] [{$this->logName}] {$message}";
        
        // Write to custom log file
        $logPath = storage_path('logs/disconnectionday.log');
        file_put_contents($logPath, $logMessage . PHP_EOL, FILE_APPEND);
        
        // Also log to Laravel default log
        Log::channel('single')->info("[{$this->logName}] {$message}");
    }
}
