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
        $param  = $request->query('param', '');
        $year   = $request->query('year', date('Y'));

        // scope: overall | today | custom
        $scope  = $request->query('scope', 'overall');
        $start  = $request->query('start', '');
        $end    = $request->query('end', '');

        // barangay filter (uses applications.barangay / customers.barangay where available)
        $bgy    = $request->query('bgy', 'All');

        $response = [
            'status' => 'empty',
            'data' => [],
        ];

        try {
            // -------------------------
            // Helpers
            // -------------------------
            $applyScope = function ($qb, string $col) use ($scope, $start, $end) {
                if ($scope === 'today') {
                    return $qb->whereDate($col, now()->toDateString());
                }

                if ($scope === 'custom' && $start && $end) {
                    // If you pass date only (YYYY-MM-DD), it still works.
                    return $qb->whereBetween($col, [$start, $end]);
                }

                return $qb; // overall
            };

            $applyBarangayOnApplications = function ($qb, string $col = 'applications.barangay') use ($bgy) {
                if (!$bgy || $bgy === 'All') return $qb;
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
                $name   = $request->input('name', 'Untitled');
                $layout = $request->input('layout', '[]');
                $styles = $request->input('styles', '{}');

                if (is_string($layout)) {
                    $decoded = json_decode($layout, true);
                    if (json_last_error() === JSON_ERROR_NONE) $layout = $decoded;
                }
                
                if (is_string($styles)) {
                    $decoded = json_decode($styles, true);
                    if (json_last_error() === JSON_ERROR_NONE) $styles = $decoded;
                }

                $template = \App\Models\DashboardTemplate::create([
                    'template_name' => $name,
                    'layout_data'   => $layout,
                    'style_data'    => $styles,
                ]);

                return response()->json([
                    'status' => 'success',
                    'id' => $template->id,
                    'message' => 'Template saved successfully',
                ]);
            }

            if ($action === 'update_template') {
                $id     = $request->input('id');
                $layout = $request->input('layout', '[]');
                $styles = $request->input('styles', '{}');

                if (is_string($layout)) {
                    $decoded = json_decode($layout, true);
                    if (json_last_error() === JSON_ERROR_NONE) $layout = $decoded;
                }
                
                if (is_string($styles)) {
                    $decoded = json_decode($styles, true);
                    if (json_last_error() === JSON_ERROR_NONE) $styles = $decoded;
                }

                $template = \App\Models\DashboardTemplate::find($id);
                if ($template) {
                    $template->update([
                        'layout_data' => $layout,
                        'style_data'  => $styles,
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

                if ($template) return response()->json(['status' => 'success', 'data' => $template]);
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
                        DB::raw("COALESCE(billing_status.status_name, 'Unknown') as label"),
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
                        DB::raw("COALESCE(status, 'Unknown') as label"),
                        DB::raw('COUNT(*) as value')
                    );

                $applyScope($qb, 'applications.timestamp');
                $applyBarangayOnApplications($qb, 'applications.barangay');

                $qb->groupBy('applications.status');

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
                    $data[] = ['label' => $name, 'value' => (int)$row->value];
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
                    if ($tech === '') continue;
                    if (!isset($structured[$tech])) $structured[$tech] = ['label' => $tech, 'series' => []];
                    $structured[$tech]['series'][$r->status] = ($structured[$tech]['series'][$r->status] ?? 0) + (int)$r->count;
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
                    if ($tech === '') continue;
                    if (!isset($structured[$tech])) $structured[$tech] = ['label' => $tech, 'series' => []];
                    $structured[$tech]['series'][$r->status] = ($structured[$tech]['series'][$r->status] ?? 0) + (int)$r->count;
                }

                return response()->json(['status' => 'success', 'data' => array_values($structured), 'barangays' => $response['barangays']]);
            }

            // 7) INVOICE/TRANSACTIONS/PORTAL yearly chart
            // Shows count of each status (Paid, Unpaid, etc.) for the selected year
            // X-axis: Status values (Paid, Unpaid, Pending, etc.), Y-axis: Count or Amount
            if (in_array($action, ['invoice_mon', 'transactions_mon', 'portal_mon'], true)) {
                if ($action === 'invoice_mon') {
                    // Get count/sum for each invoice status in the given year
                    $qb = DB::table('invoices')
                        ->select(
                            DB::raw("IFNULL(status, 'Unknown') as label"),
                            // Count records or sum amounts based on param
                            $param === 'amount' 
                                ? DB::raw("SUM(IFNULL(total_amount, 0)) as value")
                                : DB::raw("COUNT(*) as value")
                        )
                        ->whereYear('invoice_date', $year)
                        ->whereNotNull('invoice_date')
                        ->groupBy(DB::raw("IFNULL(status, 'Unknown')"))
                        ->orderByDesc('value')
                        ->get();
                    
                    return response()->json([
                        'status' => 'success', 
                        'data' => $qb, 
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
                    $months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                    $result = [];
                    
                    foreach ($months as $month) {
                        $result[$month] = ['label' => $month, 'series' => []];
                    }
                    
                    foreach ($qb as $row) {
                        if (isset($result[$row->month_name])) {
                            $result[$row->month_name]['series'][$row->status_value] = (float)$row->value;
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
                    $months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                    $result = [];
                    
                    foreach ($months as $month) {
                        $result[$month] = ['label' => $month, 'series' => []];
                    }
                    
                    foreach ($qb as $row) {
                        if (isset($result[$row->month_name])) {
                            $result[$row->month_name]['series'][$row->status_value] = (float)$row->value;
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
                        'name'  => trim(($row->first_name ?? '').' '.($row->last_name ?? '')),
                        'coords'=> $row->long_lat,
                        'plan'  => $row->desired_plan,
                        'bgy'   => $row->barangay,
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

            // 13) TECHNICIAN AVAILABILITY
            if ($action === 'technician_availability') {
                $techs = DB::table('users')
                    ->where('role_id', 2)
                    ->select('username', 'email_address', 'first_name', 'last_name')
                    ->get();

                $data = [];

                foreach ($techs as $tech) {
                    $email = $tech->email_address;
                    $name = trim(($tech->first_name ?? '') . ' ' . ($tech->last_name ?? ''));
                    if (!$name) $name = $tech->username;

                    // Check Job Orders (Working if not Done)
                    $activeJO = DB::table('job_orders')
                        ->where('assigned_email', $email)
                        ->where('onsite_status', '!=', 'Done')
                        ->orderByDesc('updated_at')
                        ->first();

                    // Check Service Orders (Working if not Resolved)
                    $activeSO = DB::table('service_orders')
                        ->where('assigned_email', $email)
                        ->where('support_status', '!=', 'Resolved')
                        ->orderByDesc('updated_at')
                        ->first();

                    // Default to Available
                    $status = 'Available';
                    $details = 'Ready to accept tasks';
                    $since = null;
                    $type = null;

                    // If active JO exists, they are working
                    if ($activeJO) {
                        $status = 'Working';
                        $details = 'Job Order #' . $activeJO->id . ' (' . ($activeJO->onsite_status ?? 'Unknown') . ')';
                        $since = $activeJO->updated_at ?? $activeJO->created_at;
                        $type = 'jo';
                    } 
                    // Else if active SO exists, they are working
                    elseif ($activeSO) {
                        $status = 'Working';
                        $details = 'Service Order #' . $activeSO->id . ' (' . ($activeSO->support_status ?? 'Unknown') . ')';
                        $since = $activeSO->updated_at ?? $activeSO->created_at;
                        $type = 'so';
                    } 
                    // Otherwise they are available, find when they finished last task
                    else {
                        // Find last finished JO
                        $lastJO = DB::table('job_orders')
                            ->where('assigned_email', $email)
                            ->where('onsite_status', 'Done')
                            ->orderByDesc('updated_at')
                            ->first();

                        // Find last finished SO
                        $lastSO = DB::table('service_orders')
                            ->where('assigned_email', $email)
                            ->where('support_status', 'Resolved')
                            ->orderByDesc('updated_at')
                            ->first();
                        
                        $joTime = $lastJO ? ($lastJO->updated_at ?? $lastJO->created_at) : null;
                        $soTime = $lastSO ? ($lastSO->updated_at ?? $lastSO->created_at) : null;
                        
                        // Compare who is later
                        if ($joTime && $soTime) {
                            $since = ($joTime > $soTime) ? $joTime : $soTime;
                        } else {
                            $since = $joTime ?? $soTime ?? null;
                        }
                    }

                    // Parse timestamp to ensure correct timezone (PH Time)
                    if ($since) {
                        try {
                            $since = \Carbon\Carbon::parse($since)->setTimezone('Asia/Manila')->toIso8601String();
                        } catch (\Exception $e) {
                            // keep original string if parse fails
                        }
                    }

                    $data[] = [
                        'label' => $name, // For generic chart compatibility if needed
                        'value' => $status === 'Available' ? 1 : 0, // Just a dummy value
                        'meta' => [
                            'email' => $email,
                            'status' => $status,
                            'details' => $details,
                            'since' => $since,
                            'type' => $type
                        ]
                    ];
                }

                return response()->json(['status' => 'success', 'data' => $data]);
            }

            // 14) TEAM DETAILED QUEUE
            if ($action === 'team_detailed_queue') {
                // Ensure columns match EXACTLY for UNION
                // 1) Job Orders
                $jobs = DB::table('job_orders')
                    ->join('users', 'job_orders.assigned_email', '=', 'users.email_address')
                    ->join('applications', 'job_orders.application_id', '=', 'applications.id')
                    ->select(
                        'users.username as team_name',
                        DB::raw("'Job Order' as type"),
                        DB::raw("CONCAT(applications.first_name, ' ', applications.last_name) as customer"),
                        DB::raw("CONCAT(
                            COALESCE(applications.installation_address, ''), ' ', 
                            COALESCE(applications.landmark, ''), ' ', 
                            COALESCE(applications.location, ''), ' ', 
                            COALESCE(applications.barangay, ''), ' ', 
                            COALESCE(applications.city, ''), ' ', 
                            COALESCE(applications.region, '')
                        ) as address"),
                        // Cast updated_at to char to match service_orders type if diff, or just for safety
                        DB::raw("CAST(job_orders.updated_at AS CHAR) as start_time_str"),
                        'job_orders.onsite_status as status'
                    )
                    ->where('job_orders.onsite_status', '!=', 'Done')
                    ->whereNotNull('job_orders.assigned_email')
                    ->where('job_orders.assigned_email', '!=', '');

                // 2) Service Orders
                $services = DB::table('service_orders')
                    ->join('users', 'service_orders.assigned_email', '=', 'users.email_address')
                    ->join('billing_accounts', 'service_orders.account_no', '=', 'billing_accounts.account_no')
                    ->join('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                    ->select(
                        'users.username as team_name',
                        DB::raw("COALESCE(service_orders.concern, 'Service Order') as type"),
                        DB::raw("CONCAT(customers.first_name, ' ', customers.last_name) as customer"),
                        DB::raw("CONCAT(
                            COALESCE(customers.address, ''), ' ', 
                            COALESCE(customers.location, ''), ' ', 
                            COALESCE(customers.barangay, ''), ' ', 
                            COALESCE(customers.city, ''), ' ', 
                            COALESCE(customers.region, '')
                        ) as address"),
                        DB::raw("CAST(service_orders.updated_at AS CHAR) as start_time_str"),
                        'service_orders.visit_status as status'
                    )
                    ->where('service_orders.visit_status', '!=', 'Resolved')
                    ->where('service_orders.visit_status', '!=', 'Done') 
                    ->whereNotNull('service_orders.assigned_email')
                    ->where('service_orders.assigned_email', '!=', '');

                $all = $jobs->union($services)->get();

                // Calculate duration in PHP
                $data = $all->map(function ($item) {
                    $startStr = $item->start_time_str ?? null;
                    $start = $startStr ? \Carbon\Carbon::parse($startStr) : null;
                    
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

                    $now = \Carbon\Carbon::now();
                    
                    // Duration string
                    $diff = $start->diff($now);
                    $duration = "";
                    if ($diff->d > 0) $duration .= $diff->d . "d ";
                    if ($diff->h > 0) $duration .= $diff->h . "h ";
                    $duration .= $diff->i . "m";

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
