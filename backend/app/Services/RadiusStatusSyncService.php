<?php

namespace App\Services;

use App\Models\OnlineStatus;
use App\Models\BillingAccount;
use App\Models\TechnicalDetail;
use App\Models\RadiusConfig;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RadiusStatusSyncService
{
    private const MAX_RETRIES = 3;
    private const RETRY_DELAY = 2;

    public function syncRadiusStatus(): array
    {
        $stats = [
            'synced' => 0,
            'inserted' => 0,
            'updated' => 0,
            'not_found' => 0,
            'offline' => 0,
            'online' => 0,
            'inactive' => 0,
            'blocked' => 0,
            'errors' => 0
        ];

        try {
            DB::beginTransaction();

            $this->syncAccountsToOnlineStatus($stats);
            
            $radiusConfig = RadiusConfig::first();
            if (!$radiusConfig) {
                throw new \Exception('RADIUS configuration not found');
            }

            $radiusUsers = $this->fetchRadiusUsers($radiusConfig);
            $radiusSessions = $this->fetchRadiusSessions($radiusConfig);

            $this->processAccounts($radiusUsers, $radiusSessions, $stats);

            DB::commit();

            return $stats;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('RADIUS Status Sync Failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    private function syncAccountsToOnlineStatus(array &$stats): void
    {
        $inserted = DB::statement("
            INSERT IGNORE INTO online_status (account_id, account_no, username, created_at, updated_at)
            SELECT ba.id, ba.account_no, td.username, NOW(), NOW()
            FROM billing_accounts ba
            LEFT JOIN technical_details td ON ba.id = td.account_id
            WHERE td.username IS NOT NULL
        ");

        if ($inserted) {
            $insertedCount = DB::select("SELECT ROW_COUNT() as count")[0]->count ?? 0;
            $stats['inserted'] = $insertedCount;
            Log::info('Synced new accounts to online_status', ['count' => $insertedCount]);
        }
    }

    private function fetchRadiusUsers(RadiusConfig $config): array
    {
        $url = sprintf(
            '%s://%s:%s/rest/user-manage/user',
            $config->ssl_type,
            $config->ip,
            $config->port
        );

        $users = [];
        $response = $this->callRadiusApi($url, 'GET', $config);

        if ($response && is_array($response)) {
            foreach ($response as $user) {
                $username = $user['name'] ?? null;
                if ($username) {
                    $users[$username] = [
                        'id' => $user['.id'] ?? '',
                        'group' => $user['group'] ?? '',
                        'disabled' => ($user['disabled'] ?? 'false') === 'true'
                    ];
                }
            }
            Log::info('Fetched RADIUS users', ['count' => count($users)]);
        }

        return $users;
    }

    private function fetchRadiusSessions(RadiusConfig $config): array
    {
        $url = sprintf(
            '%s://%s:%s/rest/user-manage/session',
            $config->ssl_type,
            $config->ip,
            $config->port
        );

        $sessions = [];
        $response = $this->callRadiusApi($url, 'GET', $config);

        if ($response && is_array($response)) {
            foreach ($response as $session) {
                $username = $session['user'] ?? null;
                if ($username) {
                    $sessions[$username] = [
                        'session_id' => $session['.id'] ?? '',
                        'ip' => $session['user-address'] ?? '',
                        'mac' => $session['calling-station-id'] ?? '',
                        'upload' => $session['upload'] ?? 0,
                        'download' => $session['download'] ?? 0
                    ];
                }
            }
            Log::info('Fetched RADIUS sessions', ['count' => count($sessions)]);
        }

        return $sessions;
    }

    private function processAccounts(array $radiusUsers, array $radiusSessions, array &$stats): void
    {
        $accounts = DB::table('billing_accounts as ba')
            ->leftJoin('technical_details as td', 'ba.id', '=', 'td.account_id')
            ->select('ba.id as account_id', 'ba.account_no', 'td.username')
            ->whereNotNull('td.username')
            ->get();

        Log::info('Processing accounts for RADIUS sync', ['count' => count($accounts)]);

        foreach ($accounts as $account) {
            try {
                $username = trim($account->username);
                $accountNo = $account->account_no;

                $status = 'Offline';
                $group = null;
                $sessionId = null;
                $ip = null;
                $mac = null;
                $download = null;
                $upload = null;

                if (isset($radiusUsers[$username])) {
                    $user = $radiusUsers[$username];
                    $group = $user['group'];
                    $hasSession = isset($radiusSessions[$username]);

                    if ($group === 'Disconnected' || $group === 'Mikrotik-Group:Disconnected') {
                        if ($hasSession) {
                            $status = 'Blocked';
                            $stats['blocked']++;
                        } else {
                            $status = 'Inactive';
                            $stats['inactive']++;
                        }
                    } else {
                        if ($hasSession) {
                            $status = 'Online';
                            $stats['online']++;
                        } else {
                            $status = 'Offline';
                            $stats['offline']++;
                        }
                    }

                    if ($hasSession) {
                        $session = $radiusSessions[$username];
                        $sessionId = $session['session_id'];
                        $ip = $session['ip'];
                        $mac = $session['mac'];
                        $download = $session['download'];
                        $upload = $session['upload'];
                    }
                } else {
                    $status = 'Not Found';
                    $stats['not_found']++;
                }

                DB::table('online_status')
                    ->updateOrInsert(
                        ['account_no' => $accountNo],
                        [
                            'account_id' => $account->account_id,
                            'username' => $username,
                            'session_status' => $status,
                            'session_group' => $group,
                            'session_id' => $sessionId,
                            'ip_address' => $ip,
                            'session_mac_address' => $mac,
                            'total_download' => $download,
                            'total_upload' => $upload,
                            'updated_at' => now(),
                            'updated_by_user' => 'system'
                        ]
                    );

                $stats['updated']++;

            } catch (\Exception $e) {
                $stats['errors']++;
                Log::error('Error processing account for RADIUS sync', [
                    'account_no' => $account->account_no ?? 'unknown',
                    'username' => $account->username ?? 'unknown',
                    'error' => $e->getMessage()
                ]);
            }
        }

        $stats['synced'] = $stats['updated'];
    }

    private function callRadiusApi(string $url, string $method, RadiusConfig $config): ?array
    {
        for ($attempt = 1; $attempt <= self::MAX_RETRIES; $attempt++) {
            try {
                $response = Http::withBasicAuth($config->username, $config->password)
                    ->withOptions([
                        'verify' => false,
                        'timeout' => 10,
                    ])
                    ->$method($url);

                if ($response->successful()) {
                    return $response->json();
                }

                Log::warning('RADIUS API request failed', [
                    'url' => $url,
                    'attempt' => $attempt,
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

            } catch (\Exception $e) {
                Log::warning('RADIUS API request exception', [
                    'url' => $url,
                    'attempt' => $attempt,
                    'error' => $e->getMessage()
                ]);
            }

            if ($attempt < self::MAX_RETRIES) {
                sleep(self::RETRY_DELAY);
            }
        }

        return null;
    }
}
