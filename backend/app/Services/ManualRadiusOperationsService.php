<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Throwable;
use Exception;
use App\Models\DisconnectedLog;
use App\Models\ReconnectionLog;

class ManualRadiusOperationsService
{
    private $logName = 'Manual_DCRC';

    /**
     * Disconnect user from RADIUS and update database
     */
    public function disconnectUser(array $params): array
    {
        try {
            $accountNo = $params['accountNumber'] ?? '';
            $username = $params['username'] ?? '';
            $remarks = $params['remarks'] ?? '';
            $updatedBy = $params['updatedBy'] ?? 'System';

            $this->writeLog("=== DISCONNECT USER START ===");
            $this->writeLog("Account: $accountNo | Username: $username | Remarks: $remarks");

            if (empty($username)) {
                throw new Exception("Username is required for disconnect operation");
            }

            // Determine status based on remarks
            $status = ($remarks === "Pullout") ? "Pullout" : "Disconnected";
            $this->writeLog("Status Set: $status");

            // Get RADIUS configurations
            $radiusEndpoints = $this->getRadiusEndpoints();

            // Try to get active session ID before it's gone
            $sessionId = null;
            if (!empty($username)) {
                $sessPath = "/rest/user-manage/session?user=" . urlencode($username);
                foreach ($radiusEndpoints as $endpoint) {
                    $fullUrl = $endpoint['url'] . $sessPath;
                    $sessResult = $this->callApiWithRetry($fullUrl, 'GET', null, $endpoint['username'], $endpoint['password']);
                    if ($sessResult && is_array($sessResult) && isset($sessResult[0]['.id'])) {
                        $sessionId = $sessResult[0]['.id'];
                        $this->writeLog("[SESSION] Found session ID for logging: $sessionId");
                        break;
                    }
                }
            }

            // Perform RADIUS operations
            $this->radiusOps(
                $radiusEndpoints,
                $username,
                'Disconnected',
                $status,
                true, // isDisconnectAction
                $accountNo,
                $updatedBy
            );

            // LOG DISCONNECTION TO DATABASE
            try {
                $billingAccount = null;
                if (!empty($accountNo)) {
                    $billingAccount = DB::table('billing_accounts')->where('account_no', $accountNo)->first();
                }

                if (!$billingAccount && !empty($username)) {
                    $techDetail = DB::table('technical_details')->where('username', $username)->first();
                    if ($techDetail) {
                        $billingAccount = DB::table('billing_accounts')->where('id', $techDetail->account_id)->first();
                    }
                }

                if ($billingAccount) {
                    // Find user ID for created_by/updated_by columns
                    $userId = null;
                    if (!empty($updatedBy) && $updatedBy !== 'System') {
                        $userId = DB::table('users')
                            ->where('username', $updatedBy)
                            ->orWhere('email_address', $updatedBy)
                            ->orWhere('contact_number', $updatedBy)
                            ->value('id');
                    }

                    DisconnectedLog::create([
                        'account_id' => $billingAccount->id,
                        'session_id' => $sessionId,
                        'username' => $username,
                        'remarks' => $remarks ?: "Manual Disconnect",
                        'created_by_user' => $userId ? (string)$userId : $updatedBy,
                        'updated_by_user' => $userId ? (string)$userId : $updatedBy
                    ]);
                    $this->writeLog("[DB] Disconnection log entry created for Account: " . ($billingAccount->account_no ?? 'Unknown'));
                }
            } catch (Throwable $dbEx) {
                $this->writeLog("[DB ERROR] Failed to create disconnection log: " . $dbEx->getMessage());
            }

            $this->writeLog("[SUCCESS] User disconnected successfully");
            $this->writeLog("=== DISCONNECT USER END ===");

            return [
                'status' => 'success',
                'message' => 'User disconnected successfully',
                'output' => 'Success: User Disconnected'
            ];

        } catch (Throwable $e) {
            $this->writeLog("[EXCEPTION] " . $e->getMessage());
            $this->writeLog("[TRACE] " . $e->getTraceAsString());
            $this->writeLog("=== DISCONNECT USER END ===");
            
            return [
                'status' => 'error',
                'message' => $e->getMessage(),
                'output' => 'Error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Reconnect user to RADIUS and update database
     */
    public function reconnectUser(array $params): array
    {
        try {
            $accountNo = $params['accountNumber'] ?? '';
            $username = $params['username'] ?? '';
            $rawPlan = $params['plan'] ?? '';
            $updatedBy = $params['updatedBy'] ?? 'System';

            $this->writeLog("=== RECONNECT USER START ===");
            $this->writeLog("Account: $accountNo | Username: $username | Raw Plan: $rawPlan");

            if (empty($username)) {
                throw new Exception("Username is required for reconnect operation");
            }

            if (empty($rawPlan)) {
                throw new Exception("Plan is required for reconnect operation");
            }

            // Clean plan name (use first word only)
            $planParts = explode(' ', $rawPlan);
            $cleanPlan = $planParts[0];
            $this->writeLog("Clean Plan: $cleanPlan");

            // Get RADIUS configurations
            $radiusEndpoints = $this->getRadiusEndpoints();

            // Perform RADIUS operations
            try {
                // MOVE LOGGING HERE to ensure it captures the attempt
                // Global Reconnection Logging
                try {
                    $billingAccount = null;
                    if (!empty($accountNo)) {
                        $billingAccount = DB::table('billing_accounts')->where('account_no', $accountNo)->first();
                    }

                    if (!$billingAccount && !empty($username)) {
                        $techDetail = DB::table('technical_details')->where('username', $username)->first();
                        if ($techDetail) {
                            $billingAccount = DB::table('billing_accounts')->where('id', $techDetail->account_id)->first();
                        }
                    }

                    if ($billingAccount) {
                        // User requested: plan value will be from account_no -> billing_accounts (customer_id) -> customers (desired_plan)
                        $customer = DB::table('customers')->where('id', $billingAccount->customer_id)->first();
                        $desiredPlan = $customer ? $customer->desired_plan : ($rawPlan ?: 'N/A');
                        
                        $planId = null;
                        if ($desiredPlan && $desiredPlan != 'N/A') {
                            $cleanPlanForId = $desiredPlan;
                            if (strpos($desiredPlan, ' - ') !== false) {
                                $cleanPlanForId = explode(' - ', $desiredPlan)[0];
                            }
                            // FIXED: Changed table name from 'plans' to 'plan_list'
                            $planId = DB::table('plan_list')->where('plan_name', $cleanPlanForId)->value('id');
                            if (!$planId) {
                                // Try searching in description if not found in name
                                $planId = DB::table('plan_list')->where('description', 'like', "%{$cleanPlanForId}%")->value('id');
                            }
                        }

                        $reconnectionFee = $params['reconnectionFee'] ?? 0;
                        $remarks = $params['remarks'] ?? 'Auto-Reconnect via RADIUS Service';
                        
                        // Extra check: if it's a Service Order, try to get fee
                        if ($reconnectionFee == 0 && isset($params['serviceOrderId'])) {
                            $reconnectionFee = DB::table('service_orders')->where('id', $params['serviceOrderId'])->value('service_charge') ?? 0;
                        }

                        // Insert into reconnection_logs
                        // Find user ID for created_by/updated_by columns
                        $userId = null;
                        if (!empty($updatedBy) && $updatedBy !== 'System') {
                            $userId = DB::table('users')
                                ->where('username', $updatedBy)
                                ->orWhere('email_address', $updatedBy)
                                ->orWhere('contact_number', $updatedBy)
                                ->value('id');
                        }

                        ReconnectionLog::create([
                            'account_id' => $billingAccount->id,
                            'username' => $username,
                            'plan_id' => $planId,
                            'reconnection_fee' => $reconnectionFee,
                            'remarks' => $remarks,
                            'created_by_user' => $userId ? (string)$userId : $updatedBy,
                            'updated_by_user' => $userId ? (string)$userId : $updatedBy,
                        ]);
                        
                        $this->writeLog("[DB] Reconnection log entry created for Account: " . ($billingAccount->account_no ?? 'Unknown'));
                    } else {
                        $this->writeLog("[WARNING] Could not find billing account for reconnection log (Account: $accountNo, User: $username)");
                    }
                } catch (Throwable $dbEx) {
                    $this->writeLog("[DB ERROR] Failed to create reconnection log: " . $dbEx->getMessage());
                    // Log the full error to help debugging
                    \Log::error("Reconnection Log Insertion Failed: " . $dbEx->getMessage(), [
                        'accountNo' => $accountNo,
                        'username' => $username,
                        'updatedBy' => $updatedBy
                    ]);
                }

                $this->radiusOps(
                    $radiusEndpoints,
                    $username,
                    $cleanPlan,
                    'Active',
                    true, // isDisconnectAction
                    $accountNo,
                    $updatedBy
                );
            } catch (Throwable $radiusEx) {
                $this->writeLog("[RADIUS ERROR] Operation failed: " . $radiusEx->getMessage());
                throw $radiusEx; // Re-throw to be caught by outer catch
            }

            // Global Email Notification for Reconnection
            try {
                if (!isset($billingAccount) || !$billingAccount) {
                    if (!empty($accountNo)) {
                        $billingAccount = DB::table('billing_accounts')->where('account_no', $accountNo)->first();
                    }
                }
                
                if (isset($billingAccount) && $billingAccount && $billingAccount->customer_id) {
                    $customerInfo = DB::table('customers')->where('id', $billingAccount->customer_id)->first();
                    
                    if ($customerInfo && !empty($customerInfo->email_address)) {
                        $emailTemplate = DB::table('email_templates')->where('Template_Code', 'RECONNECT')->first();
                        
                        if ($emailTemplate) {
                            $emailService = app(\App\Services\EmailQueueService::class);
                            
                            $customerName = preg_replace('/\s+/', ' ', trim($customerInfo->first_name . ' ' . ($customerInfo->middle_initial ?? '') . ' ' . $customerInfo->last_name));
                            $planNameFormatted = str_replace('₱', 'P', $rawPlan ?? ($customerInfo->desired_plan ?? ''));
                            
                            $emailData = [
                                'Full_Name' => $customerName,
                                'customer_name' => $customerName,
                                'Plan' => $planNameFormatted,
                                'plan_name' => $planNameFormatted,
                                'Account_No' => $billingAccount->account_no,
                                'account_no' => $billingAccount->account_no,
                                'recipient_email' => $customerInfo->email_address,
                            ];
                            
                            $emailService->queueFromTemplate('RECONNECT', $emailData);
                            $this->writeLog("[EMAIL] Reconnect email queued via template for {$customerInfo->email_address}");
                        } else {
                            $this->writeLog("[EMAIL SKIP] RECONNECT email template not found");
                        }
                    } else {
                        $this->writeLog("[EMAIL SKIP] No email address found for customer");
                    }
                }
            } catch (Throwable $emailEx) {
                $this->writeLog("[EMAIL ERROR] Failed to queue reconnect email: " . $emailEx->getMessage());
            }

            $this->writeLog("[SUCCESS] User reconnected successfully");
            $this->writeLog("=== RECONNECT USER END ===");

            return [
                'status' => 'success',
                'message' => 'User reconnected successfully',
                'output' => 'Success: User Reconnected'
            ];

        } catch (Throwable $e) {
            $this->writeLog("[EXCEPTION] " . $e->getMessage());
            $this->writeLog("[TRACE] " . $e->getTraceAsString());
            $this->writeLog("=== RECONNECT USER END ===");
            
            return [
                'status' => 'error',
                'message' => $e->getMessage(),
                'output' => 'Error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Update user credentials in RADIUS and database
     */
    public function updateCredentials(array $params): array
    {
        try {
            $accountNo = $params['accountNumber'] ?? '';
            $oldUsername = $params['username'] ?? '';
            $newUsername = $params['newUsername'] ?? '';
            $newPassword = $params['newPassword'] ?? '';
            $updatedBy = $params['updatedBy'] ?? 'System';

            $this->writeLog("=== UPDATE CREDENTIALS START ===");
            $this->writeLog("Account: $accountNo | Old User: $oldUsername | New User: $newUsername");

            if (empty($oldUsername)) {
                throw new Exception("Current username is required");
            }

            if (empty($newUsername)) {
                throw new Exception("New username is required");
            }

            // Get RADIUS configurations
            $radiusEndpoints = $this->getRadiusEndpoints();

            // Step 1: Update RADIUS credentials
            $radiusSuccess = $this->updateRadiusCredentials(
                $radiusEndpoints,
                $oldUsername,
                $newUsername,
                $newPassword
            );

            if (!$radiusSuccess) {
                throw new Exception("Failed to update RADIUS credentials");
            }

            // Step 2: Update database (only username, not password)
            $this->updateDatabaseCredentials(
                $accountNo,
                $oldUsername,
                $newUsername,
                $updatedBy
            );

            $this->writeLog("[SUCCESS] Credentials updated successfully");
            $this->writeLog("=== UPDATE CREDENTIALS END ===");

            return [
                'status' => 'success',
                'message' => 'Credentials updated successfully',
                'output' => 'Success: Credentials Updated (RADIUS updated, DB username updated)'
            ];

        } catch (Throwable $e) {
            $this->writeLog("[EXCEPTION] " . $e->getMessage());
            $this->writeLog("[TRACE] " . $e->getTraceAsString());
            $this->writeLog("=== UPDATE CREDENTIALS END ===");
            
            return [
                'status' => 'error',
                'message' => $e->getMessage(),
                'output' => 'Error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Update RADIUS credentials (username and password)
     */
    public function updateRadiusCredentials(array $radiusEndpoints, string $oldUsername, string $newUsername, ?string $newPassword = null): bool
    {
        $this->writeLog("[CREDENTIALS] Attempting to update from '$oldUsername' to '$newUsername'");

        $radiusId = null;
        $foundEndpoint = null;

        // Step 1: Find the old user
        $userPath = "/rest/user-manage/user/" . urlencode($oldUsername);

        foreach ($radiusEndpoints as $endpoint) {
            $fullUrl = $endpoint['url'] . $userPath;
            $result = $this->callApiWithRetry(
                $fullUrl,
                'GET',
                null,
                $endpoint['username'],
                $endpoint['password']
            );

            if ($result && isset($result['.id'])) {
                $radiusId = $result['.id'];
                $foundEndpoint = $endpoint;
                $this->writeLog("[CREDENTIALS] Found user '$oldUsername' on RADIUS ID: $radiusId");
                break;
            }
        }

        if (!$radiusId) {
            $this->writeLog("[ERROR] User '$oldUsername' not found in RADIUS");
            return false;
        }

        // Step 2: Patch the user (rename & optionally new password)
        $payload = [
            'name' => $newUsername
        ];

        if (!empty($newPassword)) {
            $payload['password'] = $newPassword;
        }

        $updateSuccess = false;
        foreach ($radiusEndpoints as $endpoint) {
            $targetUrl = $endpoint['url'] . "/rest/user-manage/user/" . $radiusId;
            $result = $this->callApiWithRetry(
                $targetUrl,
                'PATCH',
                $payload,
                $endpoint['username'],
                $endpoint['password']
            );

            if ($result !== false) {
                $this->writeLog("[CREDENTIALS] Updated RADIUS user at {$endpoint['url']}");
                $updateSuccess = true;
            }
        }

        // Step 3: Force kill old session
        if ($updateSuccess) {
            $this->killUserSession($radiusEndpoints, $oldUsername);
            return true;
        }

        return false;
    }

    /**
     * Update database credentials (username only)
     */
    private function updateDatabaseCredentials(string $accountNo, string $oldUsername, string $newUsername, string $updatedBy): void
    {
        $rowsUpdated = 0;

        // PPPoE Username is in technical_details table, not billing_accounts
        if (!empty($accountNo)) {
            $billingAccount = DB::table('billing_accounts')->where('account_no', $accountNo)->first();
            if ($billingAccount) {
                $rowsUpdated = DB::table('technical_details')
                    ->where('account_id', $billingAccount->id)
                    ->update([
                        'username' => $newUsername,
                        'updated_at' => now(),
                        'updated_by' => $updatedBy
                    ]);
            }

            if ($rowsUpdated > 0) {
                $this->writeLog("[DB] Updated username via Account No: $accountNo");
                return;
            }
        }

        // Fallback to old username in technical_details
        $this->writeLog("[DB] Account No update failed/skipped. Trying old username...");
        $rowsUpdated = DB::table('technical_details')
            ->where('username', $oldUsername)
            ->update([
                'username' => $newUsername,
                'updated_at' => now(),
                'updated_by' => $updatedBy
            ]);

        if ($rowsUpdated > 0) {
            $this->writeLog("[DB] Database credentials updated successfully via username");
        } else {
            $this->writeLog("[WARNING] RADIUS updated, but database update affected 0 rows");
        }
    }

    /**
     * Core RADIUS operations (disconnect/reconnect)
     */
    private function radiusOps(
        array $radiusEndpoints,
        string $username,
        string $targetGroup,
        string $dbStatus,
        bool $isDisconnectAction,
        string $accountNo = '',
        string $updatedBy = 'System'
    ): void {
        $this->writeLog("[RADIUS OPS] User: $username | Target: $targetGroup | isDC: " . ($isDisconnectAction ? 'Yes' : 'No'));

        $radiusId = null;
        $currentRadiusGroup = null;
        $userPath = "/rest/user-manage/user/" . urlencode($username);

        // Find user in RADIUS servers
        foreach ($radiusEndpoints as $endpoint) {
            $fullUrl = $endpoint['url'] . $userPath;
            $result = $this->callApiWithRetry(
                $fullUrl,
                'GET',
                null,
                $endpoint['username'],
                $endpoint['password']
            );

            if ($result && isset($result['.id'])) {
                $radiusId = $result['.id'];
                $currentRadiusGroup = $result['group'] ?? '';
                $this->writeLog("[FOUND] RADIUS ID: $radiusId | Current Group: '$currentRadiusGroup'");
                break;
            }
        }

        if ($radiusId) {
            $patchHappened = false;

            // Check if group needs updating
            if ($currentRadiusGroup !== $targetGroup) {
                $this->writeLog("[PATCH] Mismatch ($currentRadiusGroup != $targetGroup). Updating group...");
                $payload = ['group' => $targetGroup];

                // FAILOVER LOGIC: Try each server in order, stop on first success
                foreach ($radiusEndpoints as $index => $endpoint) {
                    $this->writeLog("[PATCH] Trying RADIUS server #" . ($index + 1) . ": {$endpoint['url']}");
                    $targetUrl = $endpoint['url'] . "/rest/user-manage/user/" . $radiusId;
                    $result = $this->callApiWithRetry(
                        $targetUrl,
                        'PATCH',
                        $payload,
                        $endpoint['username'],
                        $endpoint['password']
                    );

                    if ($result !== false) {
                        $this->writeLog("[PATCH] Success at {$endpoint['url']} (Server #" . ($index + 1) . ")");
                        $patchHappened = true;
                        break; // Stop on first successful server
                    } else {
                        $this->writeLog("[PATCH] Failed at {$endpoint['url']}, trying next server...");
                    }
                }
            }

            // Determine if session should be killed
            $shouldKill = $isDisconnectAction || $patchHappened;

            if ($shouldKill) {
                $this->writeLog("[DECISION] Killing session...");
                $this->killUserSession($radiusEndpoints, $username, $patchHappened);
            } else {
                $this->writeLog("[DECISION] No changes needed, keeping session");
            }
        } else {
            $this->writeLog("[WARNING] User '$username' not found in RADIUS");
        }

        // Update database
        $this->updateDatabaseStatus($accountNo, $username, $dbStatus, $updatedBy);
    }

    /**
     * Update database status
     */
    private function updateDatabaseStatus(string $accountNo, string $username, string $dbStatus, string $updatedBy): void
    {
        // Get status ID from billing_status table
        $statusId = DB::table('billing_status')->where('status_name', $dbStatus)->value('id');

        // If status name not found (e.g. "Inactive"), try "Disconnected" as fallback
        if (!$statusId && $dbStatus === 'Inactive') {
             $statusId = DB::table('billing_status')->where('status_name', 'Disconnected')->value('id');
        }

        if (!$statusId) {
            $this->writeLog("[WARNING] Status '$dbStatus' not found in billing_status table. Database update skipped.");
            return;
        }

        $rowsUpdated = 0;

        // Try via Account No first
        if (!empty($accountNo)) {
            $rowsUpdated = DB::table('billing_accounts')
                ->where('account_no', $accountNo)
                ->update([
                    'billing_status_id' => $statusId,
                    'updated_at' => now(),
                    'updated_by' => $updatedBy
                ]);
        }

        // Fallback to searching technical_details since billing_accounts doesn't have username
        if ($rowsUpdated === 0 && !empty($username)) {
            try {
                $techDetail = DB::table('technical_details')->where('username', $username)->first();
                if ($techDetail) {
                    $rowsUpdated = DB::table('billing_accounts')
                        ->where('id', $techDetail->account_id)
                        ->update([
                            'billing_status_id' => $statusId,
                            'updated_at' => now(),
                            'updated_by' => $updatedBy
                        ]);
                }
            } catch (Throwable $e) {
                $this->writeLog("[DB ERROR] Error updating status via tech details: " . $e->getMessage());
            }
        }

        if ($rowsUpdated > 0) {
            $this->writeLog("[DB] Status updated to: $dbStatus (ID: $statusId)");
        } else {
            $this->writeLog("[WARNING] Database status update affected 0 rows for Account: $accountNo, User: $username");
        }
    }

    /**
     * Kill active user sessions (with failover support)
     */
    private function killUserSession(array $radiusEndpoints, string $username, bool $useFailover = true): void
    {
        $sessPath = "/rest/user-manage/session?user=" . urlencode($username);
        $sessions = null;
        $activeEndpoint = null;

        // Find active sessions
        foreach ($radiusEndpoints as $endpoint) {
            $fullUrl = $endpoint['url'] . $sessPath;
            $result = $this->callApiWithRetry(
                $fullUrl,
                'GET',
                null,
                $endpoint['username'],
                $endpoint['password']
            );

            if ($result && is_array($result)) {
                $sessions = $result;
                $activeEndpoint = $endpoint;
                $this->writeLog("[SESSION] Found " . count($sessions) . " active session(s) on {$endpoint['url']}");
                break;
            }
        }

        if (!$sessions || empty($sessions)) {
            $this->writeLog("[SESSION] No active session found");
            return;
        }

        // Kill sessions - FAILOVER LOGIC: only kill on the server where we found the session
        foreach ($sessions as $session) {
            if (isset($session['.id'])) {
                $sessionId = $session['.id'];
                
                if ($useFailover && $activeEndpoint) {
                    // Only kill on the active endpoint
                    $delUrl = $activeEndpoint['url'] . "/rest/user-manage/session/" . $sessionId;
                    $result = $this->callApiWithRetry(
                        $delUrl,
                        'DELETE',
                        null,
                        $activeEndpoint['username'],
                        $activeEndpoint['password']
                    );
                    if ($result !== false) {
                        $this->writeLog("[KILL] Terminated session ID $sessionId on {$activeEndpoint['url']}");
                    }
                } else {
                    // Legacy: Kill on all endpoints
                    foreach ($radiusEndpoints as $endpoint) {
                        $delUrl = $endpoint['url'] . "/rest/user-manage/session/" . $sessionId;
                        $this->callApiWithRetry(
                            $delUrl,
                            'DELETE',
                            null,
                            $endpoint['username'],
                            $endpoint['password']
                        );
                        $this->writeLog("[KILL] Terminated session ID $sessionId on {$endpoint['url']}");
                    }
                }
            }
        }
    }

    /**
     * Get RADIUS endpoint configurations
     */
    private function getRadiusEndpoints(): array
    {
        $radiusConfigs = DB::table('radius_config')
            ->orderBy('id')
            ->get();

        if ($radiusConfigs->isEmpty()) {
            throw new Exception("No RADIUS configurations found");
        }

        $endpoints = [];
        foreach ($radiusConfigs as $config) {
            $endpoints[] = [
                'url' => "{$config->ssl_type}://{$config->ip}:{$config->port}",
                'username' => $config->username,
                'password' => $config->password
            ];
        }

        return $endpoints;
    }

    /**
     * Call API with retry logic
     */
    private function callApiWithRetry(
        string $url,
        string $method,
        ?array $payload,
        string $username,
        string $password,
        int $retries = 2
    ) {
        for ($attempt = 1; $attempt <= $retries; $attempt++) {
            try {
                $this->writeLog("[API] Attempt $attempt/$retries: $method $url");

                $response = Http::withBasicAuth($username, $password)
                    ->timeout(5)
                    ->withOptions(['verify' => false]);

                switch (strtoupper($method)) {
                    case 'GET':
                        $response = $response->get($url);
                        break;
                    case 'POST':
                        $response = $response->post($url, $payload);
                        break;
                    case 'PATCH':
                        $response = $response->patch($url, $payload);
                        break;
                    case 'DELETE':
                        $response = $response->delete($url);
                        break;
                    default:
                        return false;
                }

                if ($response->successful()) {
                    $data = $response->json();
                    return $data;
                } else {
                    $this->writeLog("[API] HTTP Error {$response->status()}");
                }

            } catch (Exception $e) {
                $this->writeLog("[API] Exception on attempt $attempt: " . $e->getMessage());
                
                if ($attempt < $retries) {
                    sleep(1);
                }
            }
        }

        $this->writeLog("[API] Failed after $retries attempts");
        return false;
    }

    /**
     * Write to log file
     */
    private function writeLog(string $message): void
    {
        $timestamp = now()->format('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] [{$this->logName}] {$message}";
        
        // Write to custom log file
        $logPath = storage_path('logs/manual_radius_operations.log');
        file_put_contents($logPath, $logMessage . PHP_EOL, FILE_APPEND);
        
        // Also log to Laravel default log
        Log::channel('single')->info("[{$this->logName}] {$message}");
    }
}


