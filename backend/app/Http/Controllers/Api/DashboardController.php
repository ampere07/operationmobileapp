<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function getCounts(Request $request)
    {
        try {
            $now = Carbon::now();
            $todayStr = $now->toDateString();
            $year = $now->year;
            $month = $now->month;

            $dateField = DB::raw('COALESCE(updated_at, created_at)');

            $counts = [
                // Radius Stats (Overall)
                'radius_online' => DB::table('online_status')->where('session_status', 'Online')->count(),
                'radius_offline' => DB::table('online_status')->where('session_status', 'Offline')->count(),
                'radius_blocked' => DB::table('online_status')->where('session_status', 'Blocked')->count(),

                // Support Status Today (Based on timestamp)
                'support_status_in_progress' => DB::table('service_orders')->where('support_status', 'In Progress')->whereDate('timestamp', $todayStr)->count(),
                'support_status_for_visit' => DB::table('service_orders')->where('support_status', 'For Visit')->whereDate('timestamp', $todayStr)->count(),
                'support_status_resolved' => DB::table('service_orders')->where('support_status', 'Resolved')->whereDate('timestamp', $todayStr)->count(),
                'support_status_failed' => DB::table('service_orders')->where('support_status', 'Failed')->whereDate('timestamp', $todayStr)->count(),

                // Visit Status Today (Based on timestamp)
                'visit_status_in_progress' => DB::table('service_orders')->where('visit_status', 'In Progress')->whereDate('timestamp', $todayStr)->count(),
                'visit_status_done' => DB::table('service_orders')->where('visit_status', 'Done')->whereDate('timestamp', $todayStr)->count(),
                'visit_status_rescheduled' => DB::table('service_orders')->where('visit_status', 'Reschedule')->whereDate('timestamp', $todayStr)->count(),
                'visit_status_failed' => DB::table('service_orders')->where('visit_status', 'Failed')->whereDate('timestamp', $todayStr)->count(),

                // Monthly Summary Data
                'monthly_support_concerns' => DB::table('service_orders')
                    ->whereYear($dateField, $year)->whereMonth($dateField, $month)
                    ->where('concern', '<>', '')->whereNotNull('concern')
                    ->select('concern as label', DB::raw('count(*) as count'))
                    ->groupBy('concern')->orderByRaw('count(*) desc')->limit(10)->get(),

                'monthly_repair_categories' => DB::table('service_orders')
                    ->whereYear($dateField, $year)->whereMonth($dateField, $month)
                    ->where('repair_category', '<>', '')->whereNotNull('repair_category')
                    ->select('repair_category as label', DB::raw('count(*) as count'))
                    ->groupBy('repair_category')->orderByRaw('count(*) desc')->limit(10)->get(),

                // Job Orders Status Today (Based on timestamp)
                'jo_status_pending' => DB::table('job_orders')->where('onsite_status', 'Pending')->whereDate('timestamp', $todayStr)->count(),
                'jo_status_in_progress' => DB::table('job_orders')->where('onsite_status', 'In Progress')->whereDate('timestamp', $todayStr)->count(),
                'jo_status_done' => DB::table('job_orders')->where('onsite_status', 'Done')->whereDate('timestamp', $todayStr)->count(),
                'jo_status_failed' => DB::table('job_orders')->where('onsite_status', 'Failed')->whereDate('timestamp', $todayStr)->count(),

                // Applications Status Today
                'app_status_scheduled' => DB::table('applications')->where('status', 'Scheduled')->whereDate('timestamp', $todayStr)->count(),
                'app_status_in_progress' => DB::table('applications')->where('status', 'In Progress')->whereDate('timestamp', $todayStr)->count(),
                'app_status_no_facility' => DB::table('applications')->where('status', 'No Facility')->whereDate('timestamp', $todayStr)->count(),
                'app_status_cancelled' => DB::table('applications')->where('status', 'Cancelled')->whereDate('timestamp', $todayStr)->count(),
                'app_status_no_slot' => DB::table('applications')->where('status', 'No Slot')->whereDate('timestamp', $todayStr)->count(),
                'app_status_duplicate' => DB::table('applications')->where('status', 'Duplicate')->whereDate('timestamp', $todayStr)->count(),

                // Legacy counts
                'so_support_in_progress' => DB::table('service_orders')->where('support_status', 'In Progress')->whereDate($dateField, $todayStr)->count(),
                'so_visit_in_progress' => DB::table('service_orders')->where('visit_status', 'In Progress')->whereDate($dateField, $todayStr)->count(),
                'app_pending' => DB::table('applications')->where('status', 'Pending')->count(),
                'jo_in_progress' => DB::table('job_orders')->where('onsite_status', 'In Progress')->count(),
            ];

            return response()->json([
                'status' => 'success',
                'data' => $counts
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
