<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;

class ReportPdfService
{
    public function generateSummaryPdf($report)
    {
        $csvService = new ReportCsvService();
        $metrics = $csvService->getSummaryMetrics($report->date_range);

        $data = [
            'reportName' => $report->report_name,
            'reportType' => $report->report_type,
            'dateRange'  => $report->date_range,
            'createdBy'  => $report->created_by,
            'metrics'    => $metrics,
        ];

        $pdf = Pdf::loadView('pdf.summary_report', $data);
        
        $fileName = 'Summary_Report_' . time() . '.pdf';
        $tempPath = sys_get_temp_dir() . '/' . $fileName;
        $pdf->save($tempPath);

        return $tempPath;
    }
}
