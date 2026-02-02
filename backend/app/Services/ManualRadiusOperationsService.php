<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Exception;

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
            $status = ($remarks === "Pullout") ? "Pullout" : "Inactive";
            $this->writeLog("Status Set: $status");

            // Get RADIUS configurations
            $radiusEndpoints = $this->getRadiusEndpoints();

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

            $this->writeLog("[SUCCESS] User disconnected successfully");
            $this->writeLog("=== DISCONNECT USER END ===");

            return [
                'status' => 'success',
                'message' => 'User disconnected successfully',
                'output' => 'Success: User Disconnected'
            ];

        } catch (Exception $e) {
            $this->writeLog("[EXCEPTION] " . $e->getMessage());
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
            $this->radiusOps(
                $radiusEndpoints,
                $username,
                $cleanPlan,
                'Active',
                false, // isDisconnectAction
                $accountNo,
                $updatedBy
            );

            $this->writeLog("[SUCCESS] User reconnected successfully");
            $this->writeLog("=== RECONNECT USER END ===");

            return [
                'status' => 'success',
                'message' => 'User reconnected successfully',
                'output' => 'Success: User Reconnected'
            ];

        } catch (Exception $e) {
            $this->writeLog("[EXCEPTION] " . $e->getMessage());
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

            if (empty($newUsername) || empty($newPassword)) {
                throw new Exception("New username and password are required");
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

        } catch (Exception $e) {
            $this->writeLog("[EXCEPTION] " . $e->getMessage());
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
    private function updateRadiusCredentials(array $radiusEndpoints, string $oldUsername, string $newUsername, string $newPassword): bool
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

        // Step 2: Patch the user (rename & new password)
        $payload = [
            'name' => $newUsername,
            'password' => $newPassword
        ];

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
     * Update database credentials (username only, no password in DB)
     */
    private function updateDatabaseCredentials(string $accountNo, string $oldUsername, string $newUsername, string $updatedBy): void
    {
        $rowsUpdated = 0;

        // Try via Account No first
        if (!empty($accountNo)) {
            $rowsUpdated = DB::table('billing_accounts')
                ->where('account_no', $accountNo)
                ->update([
                    'pppoe_username' => $newUsername,
                    'updated_at' => now(),
                    'updated_by' => $updatedBy
                ]);

            if ($rowsUpdated > 0) {
                $this->writeLog("[DB] Updated username via Account No: $accountNo");
                return;
            }
        }

        // Fallback to old username
        $this->writeLog("[DB] Account No update failed/skipped. Trying old username...");
        $rowsUpdated = DB::table('billing_accounts')
            ->where('pppoe_username', $oldUsername)
            ->update([
                'pppoe_username' => $newUsername,
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
                        $this->writeLog("[PATCH] Success at {$endpoint['url']}");
                        $patchHappened = true;
                    }
                }
            }

            // Determine if session should be killed
            $shouldKill = $isDisconnectAction || $patchHappened;

            if ($shouldKill) {
                $this->writeLog("[DECISION] Killing session...");
                $this->killUserSession($radiusEndpoints, $username);
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
        $rowsUpdated = 0;

        // Try via Account No first
        if (!empty($accountNo)) {
            $rowsUpdated = DB::table('billing_accounts')
                ->where('account_no', $accountNo)
                ->update([
                    'billing_status' => $dbStatus,
                    'updated_at' => now(),
                    'updated_by' => $updatedBy
                ]);
        }

        // Fallback to username
        if ($rowsUpdated === 0) {
            $rowsUpdated = DB::table('billing_accounts')
                ->where('pppoe_username', $username)
                ->update([
                    'billing_status' => $dbStatus,
                    'updated_at' => now(),
                    'updated_by' => $updatedBy
                ]);
        }

        if ($rowsUpdated > 0) {
            $this->writeLog("[DB] Status updated to: $dbStatus");
        } else {
            $this->writeLog("[WARNING] Database status update affected 0 rows");
        }
    }

    /**
     * Kill active user sessions
     */
    private function killUserSession(array $radiusEndpoints, string $username): void
    {
        $sessPath = "/rest/user-manage/session?user=" . urlencode($username);
        $sessions = null;

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
                $this->writeLog("[SESSION] Found " . count($sessions) . " active session(s)");
                break;
            }
        }

        if (!$sessions || empty($sessions)) {
            $this->writeLog("[SESSION] No active session found");
            return;
        }

        // Kill all sessions
        foreach ($sessions as $session) {
            if (isset($session['.id'])) {
                $sessionId = $session['.id'];
                
                foreach ($radiusEndpoints as $endpoint) {
                    $delUrl = $endpoint['url'] . "/rest/user-manage/session/" . $sessionId;
                    $this->callApiWithRetry(
                        $delUrl,
                        'DELETE',
                        null,
                        $endpoint['username'],
                        $endpoint['password']
                    );
                    $this->writeLog("[KILL] Terminated session ID $sessionId");
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
        int $retries = 3
    ) {
        for ($attempt = 1; $attempt <= $retries; $attempt++) {
            try {
                $this->writeLog("[API] Attempt $attempt/$retries: $method $url");

                $response = Http::withBasicAuth($username, $password)
                    ->timeout(10)
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
