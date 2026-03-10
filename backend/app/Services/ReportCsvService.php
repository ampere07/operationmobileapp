<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ReportCsvService
{
    public function generateFile($reportType, $dateRange = null)
    {
        $fileName = 'Report_' . time() . '_' . str_replace(' ', '_', $reportType) . '.csv';
        $tempPath = sys_get_temp_dir() . '/' . $fileName;
        
        $fileHandle = fopen($tempPath, 'w');

        [$startDate, $endDate] = $this->parseDateRange($dateRange);

        if (strtolower($reportType) === 'summary') {
            $this->generateSummaryCSV($fileHandle, $dateRange);
        } else {
            $tableName = $this->getTableNameForType($reportType);
            if ($tableName) {
                $this->generateTableCSV($fileHandle, $tableName, $startDate, $endDate);
            } else {
                fclose($fileHandle);
                @unlink($tempPath);
                throw new \Exception('Unknown report type.');
            }
        }

        fclose($fileHandle);
        return $tempPath;
    }

    private function getTableNameForType($type)
    {
        $map = [
            'manual transaction' => 'transactions',
            'payment portal' => 'payment_portal_logs',
            'inventory' => 'inventory_logs',
            'job order' => 'job_orders',
            'service order' => 'service_orders',
            'work order' => 'work_order',
        ];

        $key = strtolower($type);
        return $map[$key] ?? null;
    }

    public function parseDateRange($dateRange)
    {
        $startDate = null;
        $endDate = null;
        if ($dateRange && strpos($dateRange, ' to ') !== false) {
            $parts = explode(' to ', $dateRange);
            if (count($parts) === 2) {
                $startDate = trim($parts[0]);
                $endDate = trim($parts[1]);
            }
        }
        return [$startDate, $endDate];
    }

    private function getDateColumnForTable($tableName)
    {
        $map = [
            'transactions' => 'payment_date',
            'payment_portal_logs' => 'created_at',
            'inventory_logs' => 'created_at',
            'job_orders' => 'created_at',
            'service_orders' => 'created_at',
            'work_order' => 'created_at',
            'work_orders' => 'created_at',
        ];
        return $map[$tableName] ?? 'created_at';
    }

    private function generateTableCSV($fileHandle, $tableName, $startDate = null, $endDate = null)
    {
        // For work order, fallback to work_orders if work_order doesn't exist
        if ($tableName === 'work_order' && !Schema::hasTable($tableName)) {
            $tableName = 'work_orders';
        }

        if (!Schema::hasTable($tableName)) {
            fputcsv($fileHandle, ['Error: Table not found in database.']);
            return;
        }

        $columns = Schema::getColumnListing($tableName);
        fputcsv($fileHandle, $columns);

        $query = DB::table($tableName);

        if ($startDate && $endDate) {
            $dateCol = $this->getDateColumnForTable($tableName);
            $query->whereBetween($dateCol, [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);
        }

        $query->orderBy('id')->chunk(500, function ($rows) use ($fileHandle, $columns) {
            foreach ($rows as $row) {
                $rowArray = (array) $row;
                $csvRow = [];
                foreach ($columns as $column) {
                    $csvRow[] = $rowArray[$column] ?? null;
                }
                fputcsv($fileHandle, $csvRow);
            }
        });
    }

    private function generateSummaryCSV($fileHandle, $dateRange = null)
    {
        $metrics = $this->getSummaryMetrics($dateRange);

        // Write to CSV (Header Row)
        fputcsv($fileHandle, array_keys($metrics));
        
        // Write to CSV (Data Row)
        fputcsv($fileHandle, array_values($metrics));
    }

    public function getSummaryMetrics($dateRange = null)
    {
        [$startDate, $endDate] = $this->parseDateRange($dateRange);

        // Calculate all metrics requested
        $metrics = [];
        $hasRange = $startDate && $endDate;

        // transactions table data count
        if (Schema::hasTable('transactions')) {
            $query = DB::table('transactions');
            if ($hasRange) $query->whereBetween('payment_date', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);
            $metrics['Transactions Count'] = $query->count();
            
            $querySum = DB::table('transactions');
            if ($hasRange) $querySum->whereBetween('payment_date', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);
            $metrics['Transactions Total Received Payment'] = $querySum->sum('received_payment');
        } else {
            $metrics['Transactions Count'] = 0;
            $metrics['Transactions Total Received Payment'] = 0;
        }

        // payment_portal_logs table
        if (Schema::hasTable('payment_portal_logs')) {
            $query = DB::table('payment_portal_logs');
            if ($hasRange) $query->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);
            $metrics['Payment Portal Logs Count'] = $query->count();
            
            $querySum = DB::table('payment_portal_logs');
            if ($hasRange) $querySum->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);
            $metrics['Payment Portal Logs Total Amount'] = $querySum->sum('total_amount');
        } else {
            $metrics['Payment Portal Logs Count'] = 0;
            $metrics['Payment Portal Logs Total Amount'] = 0;
        }

        // sales total count = txn sum + ppl sum
        $metrics['Sales Total (Value)'] = $metrics['Transactions Total Received Payment'] + $metrics['Payment Portal Logs Total Amount'];
        $metrics['Sales Total (Count)'] = $metrics['Transactions Count'] + $metrics['Payment Portal Logs Count'];

        // inventory items (not usually date filtered as it is current stock)
        $lowStockCount = 0;
        $goodStockCount = 0;
        if (Schema::hasTable('inventory_items')) {
            $items = DB::table('inventory_items')->get();
            foreach ($items as $item) {
                $qty = $item->total_quantity ?? 0;
                $alert = $item->quantity_alert ?? 0;
                if ($qty <= $alert) $lowStockCount++; else $goodStockCount++;
            }
        }
        $metrics['Low Stock Count'] = $lowStockCount;
        $metrics['Good Stock Count'] = $goodStockCount;

        // job_orders
        if (Schema::hasTable('job_orders')) {
            $qDone = DB::table('job_orders')->where('onsite_status', 'Done');
            $qProg = DB::table('job_orders')->where('onsite_status', 'In Progress');
            if ($hasRange) {
                $qDone->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);
                $qProg->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);
            }
            $metrics['Job Orders (Onsite Status = Done)'] = $qDone->count();
            $metrics['Job Orders (Onsite Status = In Progress)'] = $qProg->count();
        }

        // service_orders
        if (Schema::hasTable('service_orders')) {
            $qRes = DB::table('service_orders')->where('support_status', 'like', '%resolv%');
            $qVisDone = DB::table('service_orders')->where('visit_status', 'Done');
            $qPull = DB::table('service_orders')->where('repair_category', 'pullout');
            $qDonePull = DB::table('service_orders')->where('visit_status', 'Done')->where('repair_category', 'pullout');
            $qVisProg = DB::table('service_orders')->where('visit_status', 'In Progress');

            if ($hasRange) {
                $range = [$startDate . ' 00:00:00', $endDate . ' 23:59:59'];
                $qRes->whereBetween('created_at', $range);
                $qVisDone->whereBetween('created_at', $range);
                $qPull->whereBetween('created_at', $range);
                $qDonePull->whereBetween('created_at', $range);
                $qVisProg->whereBetween('created_at', $range);
            }

            $metrics['Service Orders (Support Status = Resolved)'] = $qRes->count();
            $metrics['Service Orders (Visit Status = Done)'] = $qVisDone->count();
            $metrics['Service Orders (Repair Category = Pullout)'] = $qPull->count();
            $metrics['Service Orders (Done & Pullout)'] = $qDonePull->count();
            $metrics['Service Orders (Visit Status = In Progress)'] = $qVisProg->count();
        }

        // work_order
        $woTable = Schema::hasTable('work_order') ? 'work_order' : (Schema::hasTable('work_orders') ? 'work_orders' : null);
        if ($woTable) {
            $qComp = DB::table($woTable)->where('work_status', 'Completed');
            $qPend = DB::table($woTable)->where('work_status', 'Pending');
            if ($hasRange) {
                $range = [$startDate . ' 00:00:00', $endDate . ' 23:59:59'];
                $qComp->whereBetween('created_at', $range);
                $qPend->whereBetween('created_at', $range);
            }
            $metrics['Work Orders (Completed)'] = $qComp->count();
            $metrics['Work Orders (Pending)'] = $qPend->count();
        } else {
            $metrics['Work Orders (Completed)'] = 0;
            $metrics['Work Orders (Pending)'] = 0;
        }

        return $metrics;
    }
}
