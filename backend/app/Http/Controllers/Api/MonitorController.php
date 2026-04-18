<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MonitorController extends Controller
{
    public function handle(Request $request)
    {
        $action = $request->query('action', $request->input('action', ''));
        $param = $request->query('param', '');
        $year = $request->query('year', date('Y'));

        // scope: overall | today | custom
        $scope = $request->query('scope', 'overall');
        $start = $request->query('start', '');
        $end = $request->query('end', '');

        // barangay filter (uses applications.barangay / customers.barangay where available)
        $bgy = $request->query('bgy', 'All');

        $response = [
            'status' => 'empty',
            'data' => [],
        ];

        try {
            // -------------------------
            // Helpers
            // -------------------------
            $applyScope = function ($qb, string $col) use ($scope, $start, $end) {
                $now = \Carbon\Carbon::now('Asia/Manila');

                if ($scope === 'today') {
                    // Start of literal today
                    return $qb->where($col, '>=', $now->copy()->startOfDay());
                }

                if ($scope === 'weekly') {
                    // Start of current week
                    return $qb->where($col, '>=', $now->copy()->startOfWeek());
                }

                if ($scope === '3weeks') {
                    // Start of 3 weeks ago
                    return $qb->where($col, '>=', $now->copy()->subWeeks(3)->startOfDay());
                }

                if ($scope === 'monthly') {
                    // Start of current month
                    return $qb->where($col, '>=', $now->copy()->startOfMonth());
                }

                if ($scope === '3months') {
                    // Start of 3 months ago
                    return $qb->where($col, '>=', $now->copy()->subMonths(3)->startOfMonth());
                }

                if ($scope === 'yearly') {
                    // Start of current year
                    return $qb->where($col, '>=', $now->copy()->startOfYear());
                }

                if ($scope === 'custom' && $start && $end) {
                    // If you pass date only (YYYY-MM-DD), it still works.
                    return $qb->whereBetween($col, [$start, $end]);
                }

                return $qb; // overall
            };

            $applyBarangayOnApplications = function ($qb, string $col = 'applications.barangay') use ($bgy) {
                if (!$bgy || $bgy === 'All')
                    return $qb;
                return $qb->where($col, $bgy);
            };

            // -------------------------
            // Barangay list (from barangay table)
            // -------------------------
            $barangays = DB::table('barangay')
                ->select(DB::raw('TRIM(barangay) as Name'))
                ->where('barangay', '!=', '')
                ->orderBy('barangay')
                ->get();

            $response['barangays'] = $barangays;

            // -------------------------
            // TEMPLATE MANAGEMENT
            // dashboard_templates: id, template_name, layout_data, style_data
            // -------------------------
            // -------------------------
            // TEMPLATE MANAGEMENT
            // Uses App\Models\DashboardTemplate
            // -------------------------
            if ($action === 'save_template') {
                $name = $request->input('name', 'Untitled');
                $layout = $request->input('layout', '[]');
                $styles = $request->input('styles', '{}');

                if (is_string($layout)) {
                    $decoded = json_decode($layout, true);
                    if (json_last_error() === JSON_ERROR_NONE)
                        $layout = $decoded;
                }

                if (is_string($styles)) {
                    $decoded = json_decode($styles, true);
                    if (json_last_error() === JSON_ERROR_NONE)
                        $styles = $decoded;
                }

                $template = \App\Models\DashboardTemplate::create([
                    'template_name' => $name,
                    'layout_data' => $layout,
                    'style_data' => $styles,
                ]);

                return response()->json([
                    'status' => 'success',
                    'id' => $template->id,
                    'message' => 'Template saved successfully',
                ]);
            }

            if ($action === 'update_template') {
                $id = $request->input('id');
                $layout = $request->input('layout', '[]');
                $styles = $request->input('styles', '{}');

                if (is_string($layout)) {
                    $decoded = json_decode($layout, true);
                    if (json_last_error() === JSON_ERROR_NONE)
                        $layout = $decoded;
                }

                if (is_string($styles)) {
                    $decoded = json_decode($styles, true);
                    if (json_last_error() === JSON_ERROR_NONE)
                        $styles = $decoded;
                }

                $template = \App\Models\DashboardTemplate::find($id);
                if ($template) {
                    $template->update([
                        'layout_data' => $layout,
                        'style_data' => $styles,
                    ]);
                    return response()->json(['status' => 'success', 'message' => 'Template updated successfully']);
                }
                return response()->json(['status' => 'error', 'message' => 'Template not found'], 404);
            }

            if ($action === 'list_templates') {
                $data = \App\Models\DashboardTemplate::select('id', 'template_name', 'created_at')
                    ->orderByDesc('created_at')
                    ->get();

                return response()->json(['status' => 'success', 'data' => $data]);
            }

            if ($action === 'load_template') {
                $id = $request->query('id', 0);
                $template = \App\Models\DashboardTemplate::find($id);

                if ($template)
                    return response()->json(['status' => 'success', 'data' => $template]);
                return response()->json(['status' => 'error', 'message' => 'Template not found'], 404);
            }

            if ($action === 'delete_template') {
                $id = $request->input('id', 0);
                \App\Models\DashboardTemplate::destroy($id);
                return response()->json(['status' => 'success']);
            }

            // -------------------------
            // DATA ACTIONS (based on your SQL dump tables)
            // -------------------------

            // 1) BILLING STATUS (based on billing_accounts + billing_status)
            // NOTE: billing_accounts.billing_status_id -> billing_status.id
            if ($action === 'billing_status') {
                $qb = DB::table('billing_accounts')
                    ->leftJoin('billing_status', 'billing_accounts.billing_status_id', '=', 'billing_status.id')
                    // OPTIONAL barangay filtering via customers table
                    ->leftJoin('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                    ->select(
                        DB::raw("COALESCE(billing_status.status_name, 'Regular') as label"),
                        DB::raw('COUNT(*) as value')
                    )
                    ->groupBy('billing_status.status_name');

                if ($bgy && $bgy !== 'All') {
                    $qb->where('customers.barangay', $bgy);
                }

                $response['data'] = $qb->get();
                $response['status'] = 'success';
                return response()->json($response);
            }

            // 2) ONLINE STATUS (online_status.session_status or session_status?)
            if ($action === 'online_status') {
                $qb = DB::table('online_status')
                    ->select(
                        DB::raw("COALESCE(session_status, 'Unknown') as label"),
                        DB::raw('COUNT(*) as value')
                    )
                    ->groupBy('session_status');

                $response['data'] = $qb->get();
                $response['status'] = 'success';
                return response()->json($response);
            }

            // 3) APPLICATION STATUS (applications.status)
            if ($action === 'app_status') {
                $qb = DB::table('applications')
                    ->select(
                        DB::raw("COALESCE(status, 'Pending') as label"),
                        DB::raw('COUNT(*) as value')
                    );

                $applyScope($qb, 'applications.timestamp');
                $applyBarangayOnApplications($qb, 'applications.barangay');

                $qb->groupBy(DB::raw("COALESCE(status, 'Pending')"));

                $response['data'] = $qb->get();
                $response['status'] = 'success';
                return response()->json($response);
            }

            // 4) SO/JO STATUS
            // - job_orders: onsite_status / visit_status is in service_orders (visit_status)
            if ($action === 'jo_status') {
                // param: onsite | billing (you had more in old file; your table has onsite_status)
                $col = ($param === 'onsite') ? 'job_orders.onsite_status' : 'job_orders.onsite_status';

                $qb = DB::table('job_orders')
                    ->select(
                        DB::raw("COALESCE($col, 'Unknown') as label"),
                        DB::raw('COUNT(*) as value')
                    );

                $applyScope($qb, 'job_orders.timestamp');

                // optional barangay filter via applications (job_orders.application_id)
                $qb->leftJoin('applications', 'job_orders.application_id', '=', 'applications.id');
                $applyBarangayOnApplications($qb, 'applications.barangay');

                $qb->whereNotNull($col)->where($col, '!=', '');
                $qb->groupBy(DB::raw($col));

                $response['data'] = $qb->get();
                $response['status'] = 'success';
                return response()->json($response);
            }

            if ($action === 'so_status') {
                // param: visit | support (your table has support_status + visit_status)
                $col = ($param === 'support') ? 'service_orders.support_status' : 'service_orders.visit_status';

                $qb = DB::table('service_orders')
                    ->select(
                        DB::raw("COALESCE($col, 'Unknown') as label"),
                        DB::raw('COUNT(*) as value')
                    );

                $applyScope($qb, 'service_orders.timestamp');

                // optional barangay filter via billing_accounts->customers
                $qb->leftJoin('billing_accounts', 'service_orders.account_no', '=', 'billing_accounts.account_no')
                    ->leftJoin('customers', 'billing_accounts.customer_id', '=', 'customers.id');

                if ($bgy && $bgy !== 'All') {
                    $qb->where('customers.barangay', $bgy);
                }

                $qb->whereNotNull($col)->where($col, '!=', '');
                $qb->groupBy(DB::raw($col));

                $response['data'] = $qb->get();
                $response['status'] = 'success';
                return response()->json($response);
            }

            // 5) QUEUE MONITOR (In Progress per assigned_email)
            if ($action === 'queue_mon') {
                $isJo = ($param === 'jo');

                if ($isJo) {
                    $qb = DB::table('job_orders')
                        ->select('assigned_email as raw_email', DB::raw('COUNT(*) as value'))
                        ->where('onsite_status', 'In Progress')
                        ->whereNotNull('assigned_email')
                        ->where('assigned_email', '!=', '');

                    $applyScope($qb, 'job_orders.timestamp');
                    $qb->groupBy('assigned_email');

                    // optional barangay filter via applications
                    $qb->leftJoin('applications', 'job_orders.application_id', '=', 'applications.id');
                    $applyBarangayOnApplications($qb, 'applications.barangay');
                } else {
                    $qb = DB::table('service_orders')
                        ->select('assigned_email as raw_email', DB::raw('COUNT(*) as value'))
                        ->where('visit_status', 'In Progress')
                        ->whereNotNull('assigned_email')
                        ->where('assigned_email', '!=', '');

                    $applyScope($qb, 'service_orders.timestamp');
                    $qb->groupBy('assigned_email');

                    // optional barangay filter via billing_accounts->customers
                    $qb->leftJoin('billing_accounts', 'service_orders.account_no', '=', 'billing_accounts.account_no')
                        ->leftJoin('customers', 'billing_accounts.customer_id', '=', 'customers.id');

                    if ($bgy && $bgy !== 'All') {
                        $qb->where('customers.barangay', $bgy);
                    }
                }

                $raw = $qb->get();

                $data = [];
                foreach ($raw as $row) {
                    $email = $row->raw_email ?? '';
                    $beforeAt = explode('@', $email)[0] ?? $email;
                    $name = ucwords(str_replace(['.', '_'], ' ', $beforeAt));
                    $data[] = ['label' => $name, 'value' => (int) $row->value];
                }

                return response()->json(['status' => 'success', 'data' => $data, 'barangays' => $response['barangays']]);
            }

            // 6) TECH PERFORMANCE (Done/Reschedule/Failed)
            // job_orders: visit_by, visit_with, visit_with_other + onsite_status
            // service_orders: visit_by_user, visit_with + visit_status
            if ($action === 'tech_mon_jo') {
                // Query 1: visit_by
                $qb1 = DB::table('job_orders')
                    ->select(
                        DB::raw("UPPER(TRIM(visit_by)) as tech"),
                        DB::raw("onsite_status as status"),
                        DB::raw("COUNT(*) as count")
                    )
                    ->whereIn('onsite_status', ['Done', 'Reschedule', 'Failed'])
                    ->whereNotNull('visit_by')->where('visit_by', '!=', '');

                $applyScope($qb1, 'job_orders.updated_at');
                $rows1 = $qb1->groupBy(DB::raw("UPPER(TRIM(visit_by))"), 'onsite_status')->get();

                // Query 2: visit_with
                $qb2 = DB::table('job_orders')
                    ->select(DB::raw("UPPER(TRIM(visit_with)) as tech"), DB::raw("onsite_status as status"), DB::raw("COUNT(*) as count"))
                    ->whereIn('onsite_status', ['Done', 'Reschedule', 'Failed'])
                    ->whereNotNull('visit_with')->where('visit_with', '!=', '');

                $applyScope($qb2, 'job_orders.updated_at');
                $rows2 = $qb2->groupBy(DB::raw("UPPER(TRIM(visit_with))"), 'onsite_status')->get();

                // Query 3: visit_with_other
                $qb3 = DB::table('job_orders')
                    ->select(DB::raw("UPPER(TRIM(visit_with_other)) as tech"), DB::raw("onsite_status as status"), DB::raw("COUNT(*) as count"))
                    ->whereIn('onsite_status', ['Done', 'Reschedule', 'Failed'])
                    ->whereNotNull('visit_with_other')->where('visit_with_other', '!=', '');

                $applyScope($qb3, 'job_orders.updated_at');
                $rows3 = $qb3->groupBy(DB::raw("UPPER(TRIM(visit_with_other))"), 'onsite_status')->get();

                $all = $rows1->concat($rows2)->concat($rows3);

                $structured = [];
                foreach ($all as $r) {
                    $tech = ucwords(strtolower($r->tech ?? ''));
                    if ($tech === '')
                        continue;
                    if (!isset($structured[$tech]))
                        $structured[$tech] = ['label' => $tech, 'series' => []];
                    $structured[$tech]['series'][$r->status] = ($structured[$tech]['series'][$r->status] ?? 0) + (int) $r->count;
                }

                return response()->json(['status' => 'success', 'data' => array_values($structured), 'barangays' => $response['barangays']]);
            }

            if ($action === 'tech_mon_so') {
                // Query 1: visit_by_user
                $qb1 = DB::table('service_orders')
                    ->select(DB::raw("UPPER(TRIM(visit_by_user)) as tech"), DB::raw("visit_status as status"), DB::raw("COUNT(*) as count"))
                    ->whereIn('visit_status', ['Done', 'Reschedule', 'Failed'])
                    ->whereNotNull('visit_by_user')->where('visit_by_user', '!=', '');

                $applyScope($qb1, 'service_orders.updated_at');
                $rows1 = $qb1->groupBy(DB::raw("UPPER(TRIM(visit_by_user))"), 'visit_status')->get();

                // Query 2: visit_with
                $qb2 = DB::table('service_orders')
                    ->select(DB::raw("UPPER(TRIM(visit_with)) as tech"), DB::raw("visit_status as status"), DB::raw("COUNT(*) as count"))
                    ->whereIn('visit_status', ['Done', 'Reschedule', 'Failed'])
                    ->whereNotNull('visit_with')->where('visit_with', '!=', '');

                $applyScope($qb2, 'service_orders.updated_at');
                $rows2 = $qb2->groupBy(DB::raw("UPPER(TRIM(visit_with))"), 'visit_status')->get();

                $all = $rows1->concat($rows2);

                $structured = [];
                foreach ($all as $r) {
                    $tech = ucwords(strtolower($r->tech ?? ''));
                    if ($tech === '')
                        continue;
                    if (!isset($structured[$tech]))
                        $structured[$tech] = ['label' => $tech, 'series' => []];
                    $structured[$tech]['series'][$r->status] = ($structured[$tech]['series'][$r->status] ?? 0) + (int) $r->count;
                }

                return response()->json(['status' => 'success', 'data' => array_values($structured), 'barangays' => $response['barangays']]);
            }

            // 7) INVOICE/TRANSACTIONS/PORTAL yearly chart
            // Shows count of each status (Paid, Unpaid, etc.) for the selected year
            // X-axis: Status values (Paid, Unpaid, Pending, etc.), Y-axis: Count or Amount
            if (in_array($action, ['invoice_mon', 'transactions_mon', 'portal_mon'], true)) {
                if ($action === 'invoice_mon') {
                    // Get count/sum for each invoice status per month in the given year
                    $qb = DB::table('invoices')
                        ->select(
                            DB::raw("MONTH(invoice_date) as month_num"),
                            DB::raw("MONTHNAME(invoice_date) as month_name"),
                            DB::raw("IFNULL(status, 'Unknown') as status_value"),
                            // Count records or sum amounts based on param
                            $param === 'amount'
                            ? DB::raw("SUM(IFNULL(total_amount, 0)) as value")
                            : DB::raw("COUNT(*) as value")
                        )
                        ->whereYear('invoice_date', $year)
                        ->whereNotNull('invoice_date')
                        ->groupBy(DB::raw("MONTH(invoice_date)"), DB::raw("MONTHNAME(invoice_date)"), DB::raw("IFNULL(status, 'Unknown')"))
                        ->orderBy(DB::raw("MONTH(invoice_date)"))
                        ->get();

                    // Transform to: {label: "January", series: {"Paid": 1000, "Unpaid": 200}}
                    $months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    $result = [];

                    foreach ($months as $month) {
                        $result[$month] = ['label' => $month, 'series' => []];
                    }

                    foreach ($qb as $row) {
                        if (isset($result[$row->month_name])) {
                            $result[$row->month_name]['series'][$row->status_value] = (float) $row->value;
                        }
                    }

                    return response()->json([
                        'status' => 'success',
                        'data' => array_values($result),
                        'barangays' => $response['barangays']
                    ]);
                } elseif ($action === 'transactions_mon') {
                    // Get all transaction statuses per month
                    $qb = DB::table('transactions')
                        ->select(
                            DB::raw("MONTH(date_processed) as month_num"),
                            DB::raw("MONTHNAME(date_processed) as month_name"),
                            DB::raw("IFNULL(status, 'Unknown') as status_value"),
                            // Count records or sum amounts based on param
                            $param === 'amount'
                            ? DB::raw("SUM(IFNULL(received_payment, 0)) as value")
                            : DB::raw("COUNT(*) as value")
                        )
                        ->whereYear('date_processed', $year)
                        ->whereNotNull('date_processed')
                        ->groupBy(DB::raw("MONTH(date_processed)"), DB::raw("MONTHNAME(date_processed)"), DB::raw("IFNULL(status, 'Unknown')"))
                        ->orderBy(DB::raw("MONTH(date_processed)"))
                        ->get();

                    // Transform to: {label: "January", series: {"Completed": 100, "Pending": 20}}
                    $months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    $result = [];

                    foreach ($months as $month) {
                        $result[$month] = ['label' => $month, 'series' => []];
                    }

                    foreach ($qb as $row) {
                        if (isset($result[$row->month_name])) {
                            $result[$row->month_name]['series'][$row->status_value] = (float) $row->value;
                        }
                    }

                    return response()->json([
                        'status' => 'success',
                        'data' => array_values($result),
                        'barangays' => $response['barangays']
                    ]);
                } else {
                    // Get all portal payment statuses per month
                    $qb = DB::table('payment_portal_logs')
                        ->select(
                            DB::raw("MONTH(date_time) as month_num"),
                            DB::raw("MONTHNAME(date_time) as month_name"),
                            DB::raw("IFNULL(status, 'Unknown') as status_value"),
                            // Count records or sum amounts based on param
                            $param === 'amount'
                            ? DB::raw("SUM(IFNULL(total_amount, 0)) as value")
                            : DB::raw("COUNT(*) as value")
                        )
                        ->whereYear('date_time', $year)
                        ->whereNotNull('date_time')
                        ->groupBy(DB::raw("MONTH(date_time)"), DB::raw("MONTHNAME(date_time)"), DB::raw("IFNULL(status, 'Unknown')"))
                        ->orderBy(DB::raw("MONTH(date_time)"))
                        ->get();

                    // Transform to: {label: "January", series: {"Success": 80, "Failed": 5}}
                    $months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    $result = [];

                    foreach ($months as $month) {
                        $result[$month] = ['label' => $month, 'series' => []];
                    }

                    foreach ($qb as $row) {
                        if (isset($result[$row->month_name])) {
                            $result[$row->month_name]['series'][$row->status_value] = (float) $row->value;
                        }
                    }

                    return response()->json([
                        'status' => 'success',
                        'data' => array_values($result),
                        'barangays' => $response['barangays']
                    ]);
                }
            }

            // 8) EXPENSES (your real table is expenses_log; category_id exists)
            if ($action === 'expenses_mon') {
                $qb = DB::table('expenses_log')
                    ->leftJoin('expenses_category', 'expenses_log.category_id', '=', 'expenses_category.id')
                    ->select(
                        DB::raw("COALESCE(expenses_category.category_name, 'Unknown') as label"),
                        DB::raw("SUM(COALESCE(expenses_log.amount,0)) as value")
                    );

                $applyScope($qb, 'expenses_log.expense_date');
                $qb->groupBy('expenses_category.category_name')
                    ->orderByDesc('value');

                return response()->json(['status' => 'success', 'data' => $qb->get(), 'barangays' => $response['barangays']]);
            }

            // 9) PAYMENT METHODS (transactions.payment_method)
            if ($action === 'pay_method_mon') {
                $qb = DB::table('transactions')
                    ->select(
                        DB::raw("COALESCE(payment_method, 'Unknown') as label"),
                        DB::raw("SUM(COALESCE(received_payment,0)) as value")
                    )
                    ->whereNotNull('payment_method')
                    ->where('payment_method', '!=', '');

                $applyScope($qb, 'transactions.date_processed');
                $qb->groupBy('payment_method')
                    ->orderByDesc('value');

                return response()->json(['status' => 'success', 'data' => $qb->get(), 'barangays' => $response['barangays']]);
            }

            // 10) MAP (applications.long_lat or applications.location? you have long_lat varchar(255))
            if ($action === 'app_map') {
                $qb = DB::table('applications')
                    ->select('first_name', 'middle_initial', 'last_name', 'long_lat', 'desired_plan', 'barangay')
                    ->whereNotNull('long_lat')
                    ->where('long_lat', '!=', '');

                $applyScope($qb, 'applications.timestamp');
                $applyBarangayOnApplications($qb, 'applications.barangay');

                $raw = $qb->get();
                $data = [];
                foreach ($raw as $row) {
                    $data[] = [
                        'name' => trim(($row->first_name ?? '') . ' ' . ($row->last_name ?? '')),
                        'coords' => $row->long_lat,
                        'plan' => $row->desired_plan,
                        'bgy' => $row->barangay,
                    ];
                }

                return response()->json(['status' => 'success', 'data' => $data, 'barangays' => $response['barangays']]);
            }

            // 11) REFER RANK (applications.referred_by via job_orders.application_id)
            if ($action === 'jo_refer_rank') {
                $qb = DB::table('job_orders')
                    ->join('applications', 'job_orders.application_id', '=', 'applications.id')
                    ->select(
                        DB::raw("COALESCE(applications.referred_by, 'Unknown') as label"),
                        DB::raw("COUNT(*) as value")
                    )
                    ->where('job_orders.onsite_status', 'Done')
                    ->whereNotNull('applications.referred_by')
                    ->where('applications.referred_by', '!=', '');

                $applyScope($qb, 'job_orders.timestamp');

                $qb->groupBy('applications.referred_by')
                    ->orderByDesc('value')
                    ->limit(20);

                return response()->json(['status' => 'success', 'data' => $qb->get(), 'barangays' => $response['barangays']]);
            }

            // 12) INVOICE OVERALL (invoices.status)
            if ($action === 'invoice_overall') {
                $qb = DB::table('invoices')
                    ->select(
                        DB::raw("COALESCE(status, 'Unknown') as label"),
                        DB::raw("COUNT(*) as value")
                    )
                    ->groupBy('status');

                return response()->json(['status' => 'success', 'data' => $qb->get(), 'barangays' => $response['barangays']]);
            }

            // 12.1) DASHBOARD COUNTS (New)
            if ($action === 'dashboard_counts') {
                $counts = [
                    'so_support_in_progress' => DB::table('service_orders')->where('support_status', 'In Progress')->count(),
                    'so_visit_in_progress' => DB::table('service_orders')->where('visit_status', 'In Progress')->count(),
                    'so_visit_pullout_in_progress' => DB::table('service_orders')
                        ->leftJoin('support_concern', 'service_orders.concern_id', '=', 'support_concern.id')
                        ->where('service_orders.visit_status', 'In Progress')
                        ->where(function ($q) {
                            $q->where('support_concern.concern_name', 'LIKE', '%Pullout%')
                                ->orWhere('service_orders.concern_remarks', 'LIKE', '%Pullout%');
                        })
                        ->count(),
                    'app_pending' => DB::table('applications')->where('status', 'Pending')->count(),
                    'jo_in_progress' => DB::table('job_orders')->where('onsite_status', 'In Progress')->count(),
                    'radius_online' => DB::table('online_status')->where('session_status', 'Online')->count(),
                    'radius_offline' => DB::table('online_status')->where('session_status', 'Offline')->count(),
                    'radius_restricted' => DB::table('online_status')->where('session_status', 'Restricted')->count(),
                    'radius_disconnected' => DB::table('online_status')->where('session_status', 'Disconnected')->count(),
                ];

                return response()->json(['status' => 'success', 'data' => $counts]);
            }


            // 13) TECHNICIAN AVAILABILITY
            if ($action === 'technician_availability') {
                $customStartTime = $request->query('custom_start_time');
                $techs = DB::table('users')
                    ->where('role_id', 2)
                    ->select('username', 'email_address', 'first_name', 'last_name', 'created_at')
                    ->get();

                $data = [];
                $now = \Carbon\Carbon::now('Asia/Manila');
                $viewStart = $now->copy()->startOfDay();

                // Apply custom start time if provided (format HH:mm)
                $applyCustomStart = function($baseDate) use ($customStartTime) {
                    if ($customStartTime && preg_match('/^([01][0-9]|2[0-3]):([0-5][0-9])$/', $customStartTime)) {
                        try {
                            return \Carbon\Carbon::createFromFormat('Y-m-d H:i', $baseDate->toDateString() . ' ' . $customStartTime, 'Asia/Manila');
                        } catch (\Exception $e) {
                            return $baseDate->startOfDay();
                        }
                    }
                    return $baseDate->startOfDay();
                };

                switch ($scope) {
                    case 'today':
                        $viewStart = $applyCustomStart($now->copy());
                        break;
                    case 'weekly':
                        $viewStart = $now->copy()->startOfWeek();
                        break;
                    case '3weeks':
                        $viewStart = $now->copy()->subWeeks(3)->startOfDay();
                        break;
                    case 'monthly':
                        $viewStart = $now->copy()->startOfMonth();
                        break;
                    case '3months':
                        $viewStart = $now->copy()->subMonths(3)->startOfMonth();
                        break;
                    case 'yearly':
                        $viewStart = $now->copy()->startOfYear();
                        break;
                    case 'custom':
                        $viewStart = $start ? \Carbon\Carbon::parse($start, 'Asia/Manila') : $now->copy()->startOfDay();
                        break;
                    case 'overall':
                    default:
                        $viewStart = \Carbon\Carbon::create(2000, 1, 1, 0, 0, 0, 'Asia/Manila');
                        break;
                }

                $viewStartStr = $viewStart->toDateTimeString();

                foreach ($techs as $tech) {
                    $email = $tech->email_address;
                    $name = trim(($tech->first_name ?? '') . ' ' . ($tech->last_name ?? ''));
                    if (!$name) $name = $tech->username;

                    // 1. Fetch ALL tasks (JO/SO) strictly where start_time is Today onwards
                    $dailyJOs = DB::table('job_orders')
                        ->where('assigned_email', $email)
                        ->where('start_time', '>=', $viewStartStr)
                        ->select('id', 'start_time', 'end_time', 'onsite_status as status', DB::raw("'jo' as task_type"))
                        ->get();

                    $dailySOs = DB::table('service_orders')
                        ->where('assigned_email', $email)
                        ->where('start_time', '>=', $viewStartStr)
                        ->select('id', 'start_time', 'end_time', 'visit_status as status', DB::raw("'so' as task_type"))
                        ->get();

                    $allTasks = $dailyJOs->concat($dailySOs)->sortBy('start_time');

                    // 2. Timeline Calculation: Flattened to avoid double-counting overlapping tasks
                    $totalWorkingSeconds = 0;
                    $totalAvailableSeconds = 0;
                    $currentTime = \Carbon\Carbon::parse($viewStartStr, 'Asia/Manila');

                    $sortedTasks = $allTasks->sortBy('start_time');

                    foreach ($sortedTasks as $task) {
                        $tStart = \Carbon\Carbon::parse($task->start_time, 'Asia/Manila');
                        $tEnd = $task->end_time ? \Carbon\Carbon::parse($task->end_time, 'Asia/Manila') : $now;

                        // Add idle time before this task
                        if ($tStart->gt($currentTime)) {
                            $totalAvailableSeconds += $currentTime->diffInSeconds($tStart);
                            $currentTime = $tStart->copy();
                        }

                        // Add working time (bounded by currentTime to avoid double-counting overlaps)
                        if ($tEnd->gt($currentTime)) {
                            $totalWorkingSeconds += $currentTime->diffInSeconds($tEnd);
                            $currentTime = $tEnd->copy();
                        }
                    }

                    // Add final idle time until now
                    if ($currentTime->lt($now)) {
                        $totalAvailableSeconds += $currentTime->diffInSeconds($now);
                    }

                    // Format Times
                    $wHours = floor($totalWorkingSeconds / 3600);
                    $wMins = floor(($totalWorkingSeconds % 3600) / 60);
                    $workingTimeStr = "{$wHours}h {$wMins}m";

                    $aHours = floor($totalAvailableSeconds / 3600);
                    $aMins = floor(($totalAvailableSeconds % 3600) / 60);
                    $availableTimeStr = "{$aHours}h {$aMins}m";

                    // 3. Status Logic
                    $workingTask = $allTasks->filter(function($t) { return !$t->end_time; })->last();

                    if ($workingTask) {
                        $status = 'Working';
                        $details = ($workingTask->task_type === 'jo' ? 'Job Order #' : 'Service Order #') . $workingTask->id . ' (' . ($workingTask->status ?? 'In Progress') . ')';
                        $since = $workingTask->start_time;
                        $primaryTimeDisp = $workingTimeStr;
                    } else {
                        $status = 'Available';
                        $lastFinished = $allTasks->filter(function($t) { return $t->end_time; })->last();
                        if ($lastFinished) {
                            $details = ($lastFinished->task_type === 'jo' ? 'Job Order #' : 'Service Order #') . $lastFinished->id . ' (' . ($lastFinished->status ?? 'Done') . ')';
                            $since = $lastFinished->end_time;
                        } else {
                            $details = 'Ready to accept tasks (Today)';
                            $since = $viewStartStr;
                        }
                        $primaryTimeDisp = $availableTimeStr;
                    }

                    if ($since) {
                        try {
                            $since = \Carbon\Carbon::parse($since)->setTimezone('Asia/Manila')->toIso8601String();
                        } catch (\Exception $e) {}
                    }

                    $data[] = [
                        'label' => $name,
                        'value' => $totalWorkingSeconds,
                        'meta' => [
                            'email' => $email,
                            'status' => $status,
                            'details' => $details,
                            'since' => $since,
                            'primary_time_str' => $primaryTimeDisp,
                            'total_working_str' => $workingTimeStr,
                            'total_available_str' => $availableTimeStr
                        ]
                    ];
                }

                return response()->json(['status' => 'success', 'data' => $data]);
            }


            // 14) TEAM DETAILED QUEUE (For Technicians)
            if ($action === 'team_detailed_queue') {
                // 1) Job Orders
                $jobs = DB::table('job_orders')
                    ->leftJoin('users', 'job_orders.assigned_email', '=', 'users.email_address')
                    ->join('applications', 'job_orders.application_id', '=', 'applications.id')
                    ->select(
                        DB::raw("COALESCE(users.username, job_orders.assigned_email) as team_name"),
                        DB::raw("'Installation (Joborder)' as type"),
                        DB::raw("CONCAT(applications.first_name, ' ', applications.last_name) as customer"),
                        DB::raw("CONCAT(
                            COALESCE(applications.installation_address, ''), ' ', 
                            COALESCE(applications.landmark, ''), ' ', 
                            COALESCE(applications.location, ''), ' ', 
                            COALESCE(applications.barangay, ''), ' ', 
                            COALESCE(applications.city, ''), ' ', 
                            COALESCE(applications.region, '')
                        ) as address"),
                        DB::raw("CAST(COALESCE(job_orders.start_time, job_orders.updated_at) AS CHAR) as start_time_str"),
                        DB::raw("CAST(job_orders.end_time AS CHAR) as end_time_str"),
                        'job_orders.onsite_status as status'
                    )
                    ->where('job_orders.onsite_status', '!=', 'Done')
                    ->whereNotNull('job_orders.assigned_email')
                    ->where('job_orders.assigned_email', '!=', '');

                $jobs = $applyScope($jobs, 'job_orders.timestamp');

                // 2) Service Orders
                $services = DB::table('service_orders')
                    ->leftJoin('users', 'service_orders.assigned_email', '=', 'users.email_address')
                    ->join('billing_accounts', 'service_orders.account_no', '=', 'billing_accounts.account_no')
                    ->join('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                    ->select(
                        DB::raw("COALESCE(users.username, service_orders.assigned_email) as team_name"),
                        DB::raw("CONCAT(COALESCE(service_orders.repair_category, service_orders.concern, 'Repair'), ' (Service Order)') as type"),
                        DB::raw("CONCAT(customers.first_name, ' ', customers.last_name) as customer"),
                        DB::raw("CONCAT(
                            COALESCE(customers.address, ''), ' ', 
                            COALESCE(customers.location, ''), ' ', 
                            COALESCE(customers.barangay, ''), ' ', 
                            COALESCE(customers.city, ''), ' ', 
                            COALESCE(customers.region, '')
                        ) as address"),
                        DB::raw("CAST(COALESCE(service_orders.start_time, service_orders.updated_at) AS CHAR) as start_time_str"),
                        DB::raw("CAST(service_orders.end_time AS CHAR) as end_time_str"),
                        'service_orders.visit_status as status'
                    )
                    ->where('service_orders.visit_status', '!=', 'Resolved')
                    ->where('service_orders.visit_status', '!=', 'Done')
                    ->whereNotNull('service_orders.assigned_email')
                    ->where('service_orders.assigned_email', '!=', '');

                $services = $applyScope($services, 'service_orders.timestamp');

                $all = $jobs->union($services)->get();

                // Calculate duration in PHP
                $data = $all->map(function ($item) {
                    $startStr = $item->start_time_str ?? null;
                    $endStr = $item->end_time_str ?? null;
                    $start = $startStr ? \Carbon\Carbon::parse($startStr) : null;
                    $end = $endStr ? \Carbon\Carbon::parse($endStr) : null;

                    if (!$start) {
                        return [
                            'team_name' => $item->team_name,
                            'type' => $item->type,
                            'customer' => $item->customer,
                            'address' => trim($item->address),
                            'start' => '-',
                            'duration' => '-'
                        ];
                    }

                    $endTime = $end ?: \Carbon\Carbon::now();

                    // Duration string
                    $diff = $start->diff($endTime);
                    $duration = "";
                    if ($diff->d > 0)
                        $duration .= $diff->d . "d ";
                    if ($diff->h > 0)
                        $duration .= $diff->h . "h ";
                    $duration .= $diff->i . "m ";
                    $duration .= $diff->s . "s";

                    return [
                        'team_name' => $item->team_name,
                        'type' => $item->type,
                        'customer' => $item->customer,
                        'address' => trim($item->address),
                        'start' => $start->format('M d, Y h:i A'),
                        'duration' => $duration
                    ];
                });

                return response()->json(['status' => 'success', 'data' => $data]);
            }

            // 15) AGENT DETAILED QUEUE
            if ($action === 'agent_detailed_queue') {
                // 1) Job Orders
                $jobs = DB::table('job_orders')
                    ->join('applications', 'job_orders.application_id', '=', 'applications.id')
                    ->select(
                        'applications.referred_by as team_name',
                        DB::raw("'Installation (Joborder)' as type"),
                        DB::raw("CONCAT(applications.first_name, ' ', applications.last_name) as customer"),
                        DB::raw("CONCAT(
                            COALESCE(applications.installation_address, ''), ' ', 
                            COALESCE(applications.landmark, ''), ' ', 
                            COALESCE(applications.location, ''), ' ', 
                            COALESCE(applications.barangay, ''), ' ', 
                            COALESCE(applications.city, ''), ' ', 
                            COALESCE(applications.region, '')
                        ) as address"),
                        DB::raw("CAST(COALESCE(job_orders.start_time, job_orders.updated_at) AS CHAR) as start_time_str"),
                        DB::raw("CAST(job_orders.end_time AS CHAR) as end_time_str"),
                        'job_orders.onsite_status as status'
                    )
                    ->where('job_orders.onsite_status', '!=', 'Done')
                    ->whereNotNull('applications.referred_by')
                    ->where('applications.referred_by', '!=', '');

                $jobs = $applyScope($jobs, 'job_orders.timestamp');

                // 2) Service Orders
                $services = DB::table('service_orders')
                    ->join('billing_accounts', 'service_orders.account_no', '=', 'billing_accounts.account_no')
                    ->join('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                    ->select(
                        'customers.referred_by as team_name',
                        DB::raw("CONCAT(COALESCE(service_orders.repair_category, service_orders.concern, 'Repair'), ' (Service Order)') as type"),
                        DB::raw("CONCAT(customers.first_name, ' ', customers.last_name) as customer"),
                        DB::raw("CONCAT(
                            COALESCE(customers.address, ''), ' ', 
                            COALESCE(customers.location, ''), ' ', 
                            COALESCE(customers.barangay, ''), ' ', 
                            COALESCE(customers.city, ''), ' ', 
                            COALESCE(customers.region, '')
                        ) as address"),
                        DB::raw("CAST(COALESCE(service_orders.start_time, service_orders.updated_at) AS CHAR) as start_time_str"),
                        DB::raw("CAST(service_orders.end_time AS CHAR) as end_time_str"),
                        'service_orders.visit_status as status'
                    )
                    ->where('service_orders.visit_status', '!=', 'Resolved')
                    ->where('service_orders.visit_status', '!=', 'Done')
                    ->whereNotNull('customers.referred_by')
                    ->where('customers.referred_by', '!=', '');

                $services = $applyScope($services, 'service_orders.timestamp');

                $all = $jobs->union($services)->get();

                $data = $all->map(function ($item) {
                    $startStr = $item->start_time_str ?? null;
                    $endStr = $item->end_time_str ?? null;
                    $start = $startStr ? \Carbon\Carbon::parse($startStr) : null;
                    $end = $endStr ? \Carbon\Carbon::parse($endStr) : null;

                    if (!$start) {
                        return [
                            'team_name' => $item->team_name,
                            'type' => $item->type,
                            'customer' => $item->customer,
                            'address' => trim($item->address),
                            'start' => '-',
                            'duration' => '-'
                        ];
                    }

                    $endTime = $end ?: \Carbon\Carbon::now();
                    $diff = $start->diff($endTime);
                    $duration = "";
                    if ($diff->d > 0)
                        $duration .= $diff->d . "d ";
                    if ($diff->h > 0)
                        $duration .= $diff->h . "h ";
                    $duration .= $diff->i . "m ";
                    $duration .= $diff->s . "s";

                    return [
                        'team_name' => $item->team_name,
                        'type' => $item->type,
                        'customer' => $item->customer,
                        'address' => trim($item->address),
                        'start' => $start->format('M d, Y h:i A'),
                        'duration' => $duration
                    ];
                });

                return response()->json(['status' => 'success', 'data' => $data]);
            }

            return response()->json([
                'status' => 'error',
                'message' => "Unknown action: $action",
                'barangays' => $response['barangays'],
            ], 400);

        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}

