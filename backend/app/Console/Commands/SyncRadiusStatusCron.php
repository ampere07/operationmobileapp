<?php

namespace App\Console\Commands;

use App\Services\RadiusStatusSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncRadiusStatusCron extends Command
{
    protected $signature = 'cron:sync-radius-status';

    protected $description = 'Sync RADIUS user status and session data to online_status table';

    protected RadiusStatusSyncService $syncService;

    public function __construct(RadiusStatusSyncService $syncService)
    {
        parent::__construct();
        $this->syncService = $syncService;
    }

    public function handle(): int
    {
        $logPath = storage_path('logs/radiussync');
        if (!file_exists($logPath)) {
            mkdir($logPath, 0755, true);
        }

        Log::build([
            'driver' => 'single',
            'path' => $logPath . '/radiussync.log',
        ])->info('RADIUS status sync cron job started', ['timestamp' => now()->toDateTimeString()]);

        try {
            $stats = $this->syncService->syncRadiusStatus();

            Log::build([
                'driver' => 'single',
                'path' => $logPath . '/radiussync.log',
            ])->info('RADIUS status sync cron job completed', [
                'timestamp' => now()->toDateTimeString(),
                'synced' => $stats['synced'],
                'inserted' => $stats['inserted'],
                'updated' => $stats['updated'],
                'online' => $stats['online'],
                'offline' => $stats['offline'],
                'inactive' => $stats['inactive'],
                'blocked' => $stats['blocked'],
                'not_found' => $stats['not_found'],
                'errors' => $stats['errors']
            ]);

            if ($stats['errors'] > 0) {
                Log::build([
                    'driver' => 'single',
                    'path' => $logPath . '/radiussync.log',
                ])->warning('RADIUS status sync had errors', [
                    'timestamp' => now()->toDateTimeString(),
                    'error_count' => $stats['errors']
                ]);
            }

            $this->info('RADIUS Status Sync Completed');
            $this->info("Synced: {$stats['synced']} | Online: {$stats['online']} | Offline: {$stats['offline']} | Inactive: {$stats['inactive']} | Blocked: {$stats['blocked']} | Not Found: {$stats['not_found']} | Errors: {$stats['errors']}");

            return Command::SUCCESS;

        } catch (\Exception $e) {
            Log::build([
                'driver' => 'single',
                'path' => $logPath . '/radiussync.log',
            ])->error('RADIUS status sync cron job failed', [
                'timestamp' => now()->toDateTimeString(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $this->error('RADIUS Status Sync Failed: ' . $e->getMessage());

            return Command::FAILURE;
        }
    }
}
