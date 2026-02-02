<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class PaymentWorkerService
{
    private $lockName = 'payment_worker';
    private $lockTimeout = 300; // 5 minutes max execution time
    private $hasLock = false;
    private $radiusReconnectionService;
    private $manualRadiusService;

    public function __construct()
    {
        $this->radiusReconnectionService = new RadiusReconnectionService();
        $this->manualRadiusService = new ManualRadiusOperationsService();
    }

    /**
     * Main worker function - processes queued payments
     */
    public function processPayments()
    {
        $this->workerLog('===========================================');
        $this->workerLog('Payment Worker Started: ' . now()->format('Y-m-d H:i:s'));
        $this->workerLog('===========================================');

        if (!$this->acquireLock()) {
            $this->workerLog('Another worker is already running. Exiting.');
            $this->workerLog('===========================================');
            return false;
        }

        try {
            $this->workerLog('Checking for payments to process...');

            $payments = DB::table('pending_payments')
                ->where('status', 'QUEUED')
                ->orWhere(function($query) {
                    $query->where('status', 'PENDING')
                          ->whereNotNull('callback_payload')
                          ->where(function($q) {
                              $q->where('callback_payload', 'LIKE', '%PAID%')
                                ->orWhere('callback_payload', 'LIKE', '%PAYMENT_SUCCESS%');
                          });
                })
                ->limit(20)
                ->get();

            if ($payments->isEmpty()) {
                $this->workerLog('No payments to process');
                $this->workerLog('===========================================');
                $this->workerLog('Payment Worker Completed: ' . now()->format('Y-m-d H:i:s'));
                $this->workerLog('===========================================');
                return true;
            }

            $this->workerLog("Found {$payments->count()} transactions to process");

            foreach ($payments as $payment) {
                $this->processPayment($payment);
            }

            $this->workerLog('===========================================');
            $this->workerLog('Payment Worker Completed: ' . now()->format('Y-m-d H:i:s'));
            $this->workerLog('===========================================');
            return true;

        } catch (Exception $e) {
            $this->workerLog('Worker Error: ' . $e->getMessage());
            Log::error('Payment Worker Exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $this->workerLog('===========================================');
            return false;
        } finally {
            $this->releaseLock();
        }
    }

    /**
     * Process individual payment
     */
    private function processPayment($payment)
    {
        DB::beginTransaction();
        
        try {
            $id = $payment->id;
            $ref = $payment->reference_no;
            $accountNo = $payment->account_no;
            $amount = floatval($payment->amount);
            $rawPayload = $payment->callback_payload;

            // Validate payment status from callback
            if ($rawPayload) {
                $json = json_decode($rawPayload, true);
                $gwStatus = strtoupper($json['status'] ?? '');
                
                $isLegitPaid = in_array($gwStatus, ['PAID', 'COMPLETED', 'SETTLED', 'PAYMENT_SUCCESS']);

                if (!$isLegitPaid) {
                    $this->workerLog("AUDIT FAIL: Ref $ref has payload but status is $gwStatus. Marking FAILED.");
                    
                    DB::table('pending_payments')
                        ->where('id', $id)
                        ->update(['status' => 'FAILED', 'updated_at' => now()]);
                    
                    DB::commit();
                    return;
                }
            }

            // Lock record for processing
            DB::table('pending_payments')
                ->where('id', $id)
                ->update([
                    'status' => 'PROCESSING',
                    'last_attempt_at' => now(),
                    'updated_at' => now()
                ]);

            // Get account information
            $account = DB::table('billing_accounts')
                ->join('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                ->where('billing_accounts.account_no', $accountNo)
                ->select(
                    'billing_accounts.id as account_id',
                    'billing_accounts.account_no',
                    'billing_accounts.account_balance',
                    DB::raw("CONCAT(customers.first_name, ' ', IFNULL(customers.middle_initial, ''), ' ', customers.last_name) as full_name"),
                    'customers.contact_number_primary',
                    'customers.desired_plan'
                )
                ->first();

            if (!$account) {
                $this->workerLog("ERROR: Account not found for payment $ref");
                DB::table('pending_payments')
                    ->where('id', $id)
                    ->update(['status' => 'FAILED', 'updated_at' => now()]);
                DB::commit();
                return;
            }

            // Update billing - distribute payment to invoices
            $result = $this->updateBilling($account, $amount, $ref);

            if ($result['success']) {
                // Mark payment as PAID
                DB::table('pending_payments')
                    ->where('id', $id)
                    ->update([
                        'status' => 'PAID',
                        'updated_at' => now()
                    ]);

                // Parse callback payload for payment details
                $json = json_decode($rawPayload, true);
                $checkoutID = $json['id'] ?? $payment->payment_id ?? 'N/A';
                $paymentChannel = $json['payment_channel'] ?? $json['bank_code'] ?? null;
                $ewalletType = $json['ewallet_type'] ?? null;
                $status = $json['status'] ?? 'PAID';
                $type = $json['type'] ?? null;

                // Insert into payment_portal_logs
                DB::table('payment_portal_logs')->insert([
                    'reference_no' => $ref,
                    'account_id' => $account->account_id,
                    'total_amount' => $amount,
                    'date_time' => now(),
                    'checkout_id' => $checkoutID,
                    'status' => $status,
                    'transaction_status' => 'COMPLETED',
                    'ewallet_type' => $ewalletType,
                    'payment_channel' => $paymentChannel,
                    'type' => $type,
                    'payment_url' => $payment->payment_url ?? null,
                    'json_payload' => $payment->json_payload ?? null,
                    'callback_payload' => $rawPayload,
                    'updated_at' => now()
                ]);

                $this->workerLog("Success: Logged Ref $ref - Amount: ₱" . number_format($amount, 2) . " - {$result['distribution_summary']}");

                // Check if reconnection is needed
                $currentBalance = DB::table('billing_accounts')
                    ->where('account_no', $accountNo)
                    ->value('account_balance');

                if ($currentBalance <= 0) {
                    $reconnectStatus = $this->attemptReconnect($account);
                    
                    DB::table('pending_payments')
                        ->where('id', $id)
                        ->update(['reconnect_status' => $reconnectStatus]);
                    
                    $this->workerLog("Reconnect attempt for $ref: $reconnectStatus");
                }

                DB::commit();
                
            } else {
                // Billing update failed
                DB::table('pending_payments')
                    ->where('id', $id)
                    ->update(['status' => 'API_RETRY', 'updated_at' => now()]);
                
                $this->workerLog("Billing update failed for Ref $ref: " . $result['message']);
                DB::rollBack();
            }

        } catch (Exception $e) {
            DB::rollBack();
            $this->workerLog("Failed to process payment {$payment->reference_no}: {$e->getMessage()}");
            
            DB::table('pending_payments')
                ->where('id', $payment->id)
                ->update(['status' => 'API_RETRY', 'updated_at' => now()]);
        }
    }

    /**
     * Update billing - distribute payment to unpaid invoices
     */
    private function updateBilling($account, $paymentAmount, $referenceNo)
    {
        try {
            $accountNo = $account->account_no;
            $remainingAmount = $paymentAmount;
            $distributionLog = [];

            // Get unpaid invoices ordered by invoice_date (oldest first)
            $unpaidInvoices = DB::table('invoices')
                ->where('account_no', $accountNo)
                ->where('status', '!=', 'Paid')
                ->orderBy('invoice_date', 'asc')
                ->orderBy('id', 'asc')
                ->get();

            if ($unpaidInvoices->isEmpty()) {
                // No unpaid invoices - apply as credit/advance payment
                $newBalance = floatval($account->account_balance) - $paymentAmount;
                
                DB::table('billing_accounts')
                    ->where('account_no', $accountNo)
                    ->update([
                        'account_balance' => $newBalance,
                        'updated_at' => now()
                    ]);

                return [
                    'success' => true,
                    'distribution_summary' => "Applied as credit (No unpaid invoices)",
                    'distributed_amount' => $paymentAmount,
                    'remaining_amount' => 0
                ];
            }

            // Distribute payment to invoices
            foreach ($unpaidInvoices as $invoice) {
                if ($remainingAmount <= 0) {
                    break;
                }

                $invoiceId = $invoice->id;
                $invoiceBalance = floatval($invoice->total_amount) - floatval($invoice->received_payment);
                
                if ($invoiceBalance <= 0) {
                    continue; // Skip already paid invoices
                }

                $amountToApply = min($remainingAmount, $invoiceBalance);
                $newReceivedPayment = floatval($invoice->received_payment) + $amountToApply;
                $newInvoiceBalance = floatval($invoice->total_amount) - $newReceivedPayment;

                // Determine new status
                $newStatus = 'Unpaid';
                if ($newInvoiceBalance <= 0.01) { // Fully paid (accounting for floating point)
                    $newStatus = 'Paid';
                } elseif ($newReceivedPayment > 0) { // Partially paid
                    $newStatus = 'Partial';
                }

                // Update invoice
                DB::table('invoices')
                    ->where('id', $invoiceId)
                    ->update([
                        'received_payment' => $newReceivedPayment,
                        'status' => $newStatus,
                        'transaction_id' => $referenceNo,
                        'updated_at' => now(),
                        'updated_by' => 'Payment Worker'
                    ]);

                $distributionLog[] = "Invoice #{$invoiceId}: ₱" . number_format($amountToApply, 2) . " ({$newStatus})";
                $remainingAmount -= $amountToApply;

                $this->workerLog("Distributed ₱" . number_format($amountToApply, 2) . " to Invoice #{$invoiceId} - Status: {$newStatus}");
            }

            // Update account balance
            $newAccountBalance = floatval($account->account_balance) - $paymentAmount;
            
            DB::table('billing_accounts')
                ->where('account_no', $accountNo)
                ->update([
                    'account_balance' => $newAccountBalance,
                    'updated_at' => now()
                ]);

            $distributionSummary = implode(', ', $distributionLog);
            
            if ($remainingAmount > 0.01) {
                $distributionSummary .= " | Credit: ₱" . number_format($remainingAmount, 2);
            }

            return [
                'success' => true,
                'distribution_summary' => $distributionSummary,
                'distributed_amount' => $paymentAmount - $remainingAmount,
                'remaining_amount' => $remainingAmount
            ];

        } catch (Exception $e) {
            Log::error('Billing update failed', [
                'account_no' => $account->account_no,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Attempt to reconnect user account
     * Enhanced version: Checks session_status from online_status table
     */
    private function attemptReconnect($account)
    {
        try {
            $accountNo = $account->account_no;
            $this->workerLog("[RECONNECT CHECK] Starting for account: {$accountNo}");
            
            // Step 1: Get account details with PPPoE username and plan
            $accountDetails = DB::table('billing_accounts')
                ->join('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                ->where('billing_accounts.account_no', $accountNo)
                ->select(
                    'billing_accounts.id as account_id',
                    'billing_accounts.account_no',
                    'billing_accounts.pppoe_username',
                    'billing_accounts.account_balance',
                    'customers.desired_plan'
                )
                ->first();

            if (!$accountDetails) {
                $this->workerLog("[RECONNECT SKIP] Account not found: {$accountNo}");
                return 'account_not_found';
            }

            $username = $accountDetails->pppoe_username;
            if (!$username) {
                $this->workerLog("[RECONNECT SKIP] No PPPoE username found for account: {$accountNo}");
                return 'no_username';
            }

            // Step 2: Check session_status from online_status table
            $onlineStatus = DB::table('online_status')
                ->where('account_id', $accountDetails->account_id)
                ->orWhere('username', $username)
                ->select('session_status', 'username')
                ->first();

            if (!$onlineStatus) {
                $this->workerLog("[RECONNECT SKIP] No online_status record found for account: {$accountNo} (username: {$username})");
                return 'no_online_status';
            }

            $sessionStatus = strtolower($onlineStatus->session_status ?? '');
            $this->workerLog("[SESSION STATUS] Account: {$accountNo}, Username: {$username}, Status: {$sessionStatus}");

            // Step 3: Only proceed if session_status is 'inactive' or 'blocked'
            if (!in_array($sessionStatus, ['inactive', 'blocked'])) {
                $this->workerLog("[RECONNECT SKIP] Session status is '{$sessionStatus}' (not inactive/blocked). No reconnection needed.");
                return 'status_not_disconnected';
            }

            // Step 4: Verify account_balance is 0 or negative
            $balance = floatval($accountDetails->account_balance);
            if ($balance > 0) {
                $this->workerLog("[RECONNECT SKIP] Account still has positive balance: ₱{$balance}");
                return 'balance_remaining';
            }

            $this->workerLog("[RECONNECT PROCEED] Conditions met - Session: {$sessionStatus}, Balance: ₱{$balance}");

            // Step 5: Prepare parameters for ManualRadiusOperationsService
            $params = [
                'accountNumber' => $accountNo,
                'username' => $username,
                'plan' => $accountDetails->desired_plan ?? '',
                'updatedBy' => 'Payment Worker Auto-Reconnect'
            ];

            // Step 6: Call ManualRadiusOperationsService reconnectUser
            $this->workerLog("[RECONNECT EXECUTE] Calling ManualRadiusOperationsService for {$username}");
            $result = $this->manualRadiusService->reconnectUser($params);
            
            if ($result['status'] === 'success') {
                // Step 7: Update billing_status_id to 5 (Active status)
                DB::table('billing_accounts')
                    ->where('account_no', $accountNo)
                    ->update([
                        'billing_status_id' => 5,
                        'updated_at' => now(),
                        'updated_by' => 'Payment Worker'
                    ]);
                
                $this->workerLog("[RECONNECT SUCCESS] {$result['message']} - billing_status_id updated to 5");
                return 'success';
            } else {
                $this->workerLog("[RECONNECT FAILED] {$result['message']}");
                return 'failed';
            }
            
        } catch (Exception $e) {
            $this->workerLog("[RECONNECT EXCEPTION] Failed for {$account->account_no}: {$e->getMessage()}");
            $this->workerLog("[RECONNECT EXCEPTION] Trace: {$e->getTraceAsString()}");
            return 'exception';
        }
    }

    /**
     * Acquire lock to prevent concurrent execution using database
     */
    private function acquireLock()
    {
        try {
            // Check if lock exists and is not expired
            $existingLock = DB::table('worker_locks')
                ->where('lock_name', $this->lockName)
                ->first();

            if ($existingLock) {
                $lockedAt = \Carbon\Carbon::parse($existingLock->locked_at);
                $expiresAt = $lockedAt->addSeconds($this->lockTimeout);

                // If lock is still valid (not expired)
                if (now()->lessThan($expiresAt)) {
                    $this->workerLog('Lock is held by another process. Expires at: ' . $expiresAt->format('Y-m-d H:i:s'));
                    return false;
                }

                // Lock expired, clean it up
                $this->workerLog('Found expired lock. Cleaning up and acquiring new lock.');
                DB::table('worker_locks')
                    ->where('lock_name', $this->lockName)
                    ->delete();
            }

            // Try to acquire lock
            DB::table('worker_locks')->insert([
                'lock_name' => $this->lockName,
                'locked_at' => now(),
                'locked_by' => gethostname() . ':' . getmypid(),
                'created_at' => now()
            ]);

            $this->hasLock = true;
            $this->workerLog('Lock acquired successfully');
            return true;

        } catch (Exception $e) {
            // Unique constraint violation means another process got the lock first
            $this->workerLog('Failed to acquire lock: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Release lock
     */
    private function releaseLock()
    {
        if ($this->hasLock) {
            try {
                DB::table('worker_locks')
                    ->where('lock_name', $this->lockName)
                    ->delete();
                
                $this->workerLog('Lock released successfully');
                $this->hasLock = false;
            } catch (Exception $e) {
                $this->workerLog('Failed to release lock: ' . $e->getMessage());
            }
        }
    }

    /**
     * Write log message
     */
    private function workerLog($message)
    {
        $timestamp = now()->format('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] [Payment Worker] {$message}";
        
        // Log to custom paymentworker.log file
        $logPath = storage_path('logs/paymentworker.log');
        file_put_contents($logPath, $logMessage . PHP_EOL, FILE_APPEND);
        
        // Also log to Laravel default log
        Log::channel('single')->info('[Payment Worker] ' . $message);
    }

    /**
     * Get worker statistics
     */
    public function getStatistics()
    {
        return [
            'pending' => DB::table('pending_payments')
                ->where('status', 'PENDING')
                ->count(),
            'queued' => DB::table('pending_payments')
                ->where('status', 'QUEUED')
                ->count(),
            'processing' => DB::table('pending_payments')
                ->where('status', 'PROCESSING')
                ->count(),
            'paid' => DB::table('pending_payments')
                ->where('status', 'PAID')
                ->whereDate('updated_at', today())
                ->count(),
            'failed' => DB::table('pending_payments')
                ->where('status', 'FAILED')
                ->whereDate('updated_at', today())
                ->count(),
            'api_retry' => DB::table('pending_payments')
                ->where('status', 'API_RETRY')
                ->count(),
        ];
    }

    /**
     * Retry failed payments
     */
    public function retryFailedPayments()
    {
        $retryPayments = DB::table('pending_payments')
            ->where('status', 'API_RETRY')
            ->limit(10)
            ->get();

        foreach ($retryPayments as $payment) {
            DB::table('pending_payments')
                ->where('id', $payment->id)
                ->update(['status' => 'QUEUED', 'updated_at' => now()]);
        }

        return $retryPayments->count();
    }
}

