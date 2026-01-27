<?php

namespace App\Console\Commands;

use App\Services\EmailQueueService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ProcessEmailQueueCron extends Command
{
    protected $signature = 'cron:process-email-queue';

    protected $description = 'Cron job to process pending emails from the email queue';

    protected EmailQueueService $emailQueueService;

    public function __construct(EmailQueueService $emailQueueService)
    {
        parent::__construct();
        $this->emailQueueService = $emailQueueService;
    }

    public function handle(): int
    {
        $logPath = storage_path('logs/emailqueue');
        if (!file_exists($logPath)) {
            mkdir($logPath, 0755, true);
        }

        Log::build([
            'driver' => 'single',
            'path' => $logPath . '/emailqueue.log',
        ])->info('Email queue cron job started', ['timestamp' => now()->toDateTimeString()]);

        try {
            $stats = $this->emailQueueService->processPendingEmails(50);

            Log::build([
                'driver' => 'single',
                'path' => $logPath . '/emailqueue.log',
            ])->info('Email queue cron job completed', [
                'timestamp' => now()->toDateTimeString(),
                'processed' => $stats['processed'],
                'sent' => $stats['sent'],
                'failed' => $stats['failed']
            ]);

            if ($stats['failed'] > 0) {
                Log::build([
                    'driver' => 'single',
                    'path' => $logPath . '/emailqueue.log',
                ])->warning('Email queue had failures', [
                    'timestamp' => now()->toDateTimeString(),
                    'failed_count' => $stats['failed']
                ]);
            }

            return Command::SUCCESS;

        } catch (\Exception $e) {
            Log::build([
                'driver' => 'single',
                'path' => $logPath . '/emailqueue.log',
            ])->error('Email queue cron job failed', [
                'timestamp' => now()->toDateTimeString(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return Command::FAILURE;
        }
    }
}
