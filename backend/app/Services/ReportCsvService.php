<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ReportCsvService
{
    public function generateFile($reportType)
    {
        $fileName = 'Report_' . time() . '_' . str_replace(' ', '_', $reportType) . '.csv';
        $tempPath = sys_get_temp_dir() . '/' . $fileName;
        
        $fileHandle = fopen($tempPath, 'w');

        if (strtolower($reportType) === 'summary') {
            $this->generateSummaryCSV($fileHandle);
        } else {
            $tableName = $this->getTableNameForType($reportType);
            if ($tableName) {
                $this->generateTableCSV($fileHandle, $tableName);
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

    private function generateTableCSV($fileHandle, $tableName)
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

        DB::table($tableName)->orderBy('id')->chunk(500, function ($rows) use ($fileHandle, $columns) {
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

    private function generateSummaryCSV($fileHandle)
    {
        // Calculate all metrics requested
        $metrics = [];

        // transactions table data count
        $txnDataCount = Schema::hasTable('transactions') ? DB::table('transactions')->count() : 0;
        $metrics['Transactions Count'] = $txnDataCount;

        // transactions table total received_payment column
        $txnReceivedSum = Schema::hasTable('transactions') ? DB::table('transactions')->sum('received_payment') : 0;
        $metrics['Transactions Total Received Payment'] = $txnReceivedSum;

        // payment_portal_logs table count
        $pplDataCount = Schema::hasTable('payment_portal_logs') ? DB::table('payment_portal_logs')->count() : 0;
        $metrics['Payment Portal Logs Count'] = $pplDataCount;

        // payment_portal_logs total total_amount column
        $pplTotalSum = Schema::hasTable('payment_portal_logs') ? DB::table('payment_portal_logs')->sum('total_amount') : 0;
        $metrics['Payment Portal Logs Total Amount'] = $pplTotalSum;

        // sales total count = txn sum + ppl sum
        $salesTotalCount = $txnReceivedSum + $pplTotalSum;
        $metrics['Sales Total (Value)'] = $salesTotalCount;

        // sales transaction count = txn count + ppl count
        $salesDataCount = $txnDataCount + $pplDataCount;
        $metrics['Sales Total (Count)'] = $salesDataCount;

        // low count stock and good stock count from inventory_items
        $lowStockCount = 0;
        $goodStockCount = 0;
        if (Schema::hasTable('inventory_items')) {
            $items = DB::table('inventory_items')->get();
            foreach ($items as $item) {
                $qty = $item->total_quantity ?? 0;
                $alert = $item->quantity_alert ?? 0;
                if ($qty <= $alert) {
                    $lowStockCount++;
                } else {
                    $goodStockCount++;
                }
            }
        }
        $metrics['Low Stock Count'] = $lowStockCount;
        $metrics['Good Stock Count'] = $goodStockCount;

        // job_orders table count of onsite_status value Done
        $joDoneCount = Schema::hasTable('job_orders') ? DB::table('job_orders')->where('onsite_status', 'Done')->count() : 0;
        $metrics['Job Orders (Onsite Status = Done)'] = $joDoneCount;

        // job_orders table count of onsite_status In Progress
        $joInProgressCount = Schema::hasTable('job_orders') ? DB::table('job_orders')->where('onsite_status', 'In Progress')->count() : 0;
        $metrics['Job Orders (Onsite Status = In Progress)'] = $joInProgressCount;

        // service_orders table support_status value resolve count
        $soResolveCount = Schema::hasTable('service_orders') ? DB::table('service_orders')->where('support_status', 'like', '%resolv%')->count() : 0;
        $metrics['Service Orders (Support Status = Resolved)'] = $soResolveCount;

        // service_orders table visit_status value Done count
        $soVisitDoneCount = Schema::hasTable('service_orders') ? DB::table('service_orders')->where('visit_status', 'Done')->count() : 0;
        $metrics['Service Orders (Visit Status = Done)'] = $soVisitDoneCount;

        // service_orders table repair_category value pullout count
        $soPulloutCount = Schema::hasTable('service_orders') ? DB::table('service_orders')->where('repair_category', 'pullout')->count() : 0;
        $metrics['Service Orders (Repair Category = Pullout)'] = $soPulloutCount;

        // service_orders: visit_status Done and repair_category pullout
        $soDoneAndPulloutCount = Schema::hasTable('service_orders') ? DB::table('service_orders')->where('visit_status', 'Done')->where('repair_category', 'pullout')->count() : 0;
        $metrics['Service Orders (Done & Pullout)'] = $soDoneAndPulloutCount;

        // service_orders: visit_status In Progress count
        $soVisitInProgressCount = Schema::hasTable('service_orders') ? DB::table('service_orders')->where('visit_status', 'In Progress')->count() : 0;
        $metrics['Service Orders (Visit Status = In Progress)'] = $soVisitInProgressCount;

        // work_order table work_status Completed count
        $woTable = Schema::hasTable('work_order') ? 'work_order' : (Schema::hasTable('work_orders') ? 'work_orders' : null);
        $woCompletedCount = 0;
        $woPendingCount = 0;
        if ($woTable) {
            $woCompletedCount = DB::table($woTable)->where('work_status', 'Completed')->count();
            $woPendingCount = DB::table($woTable)->where('work_status', 'Pending')->count();
        }
        $metrics['Work Orders (Completed)'] = $woCompletedCount;
        $metrics['Work Orders (Pending)'] = $woPendingCount;

        // Write to CSV (Header Row)
        fputcsv($fileHandle, array_keys($metrics));
        
        // Write to CSV (Data Row)
        fputcsv($fileHandle, array_values($metrics));
    }
}
