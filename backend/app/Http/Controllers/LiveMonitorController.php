<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LiveMonitorController extends Controller
{
    private function getData($action, $param, $scope, $year, $bgy)
    {
        $response = ['status' => 'empty', 'data' => [], 'barangays' => []];

        try {
            $barangays = DB::table('barangay')
                ->select('barangay as Name')
                ->whereNotNull('barangay')
                ->where('barangay', '!=', '')
                ->get();
            
            $response['barangays'] = $barangays;
            $data = [];

            switch ($action) {
                case 'billing_status':
                    $query = DB::table('billing_accounts as ba')
                        ->leftJoin('billing_status as bs', 'ba.billing_status_id', '=', 'bs.id')
                        ->leftJoin('customers as c', 'ba.customer_id', '=', 'c.id')
                        ->select('bs.status_name as label', DB::raw('COUNT(*) as value'))
                        ->whereNotNull('bs.status_name');

                    if ($bgy !== 'All') {
                        $query->where(DB::raw('TRIM(c.barangay)'), $bgy);
                    }

                    $data = $query->groupBy('bs.status_name')->get();
                    break;

                case 'online_status':
                    $data = DB::table('online_status')
                        ->select(
                            DB::raw("CASE 
                                WHEN session_status = 'active' THEN 'Online'
                                WHEN session_status = 'inactive' THEN 'Offline'
                                ELSE COALESCE(session_status, 'Unknown')
                            END as label"),
                            DB::raw('COUNT(*) as value')
                        )
                        ->whereNotNull('session_status')
                        ->groupBy('session_status')
                        ->get();
                    break;

                case 'app_status':
                    $query = DB::table('applications')
                        ->select('status as label', DB::raw('COUNT(*) as value'))
                        ->whereNotNull('status');

                    if ($scope === 'today') {
                        $query->whereDate('timestamp', Carbon::today());
                    }

                    if ($bgy !== 'All') {
                        $query->where(DB::raw('TRIM(barangay)'), $bgy);
                    }

                    $data = $query->groupBy('status')->get();
                    break;

                case 'so_status':
                    $col = $param === 'support' ? 'support_status' : 'visit_status';
                    $query = DB::table('service_orders')
                        ->select("$col as label", DB::raw('COUNT(*) as value'))
                        ->whereNotNull($col)
                        ->where($col, '!=', '');

                    if ($scope === 'today') {
                        $query->whereDate('timestamp', Carbon::today());
                    }

                    if ($bgy !== 'All') {
                        $query->whereExists(function($q) use ($bgy) {
                            $q->select(DB::raw(1))
                              ->from('billing_accounts as ba')
                              ->leftJoin('customers as c', 'ba.customer_id', '=', 'c.id')
                              ->whereColumn('ba.account_no', 'service_orders.account_no')
                              ->where(DB::raw('TRIM(c.barangay)'), $bgy);
                        });
                    }

                    $data = $query->groupBy($col)->get();
                    break;

                case 'jo_status':
                    $col = 'onsite_status';
                    $query = DB::table('job_orders')
                        ->select("$col as label", DB::raw('COUNT(*) as value'))
                        ->whereNotNull($col)
                        ->where($col, '!=', '');

                    if ($scope === 'today') {
                        $query->whereDate('timestamp', Carbon::today());
                    }

                    if ($bgy !== 'All') {
                        $query->whereExists(function($q) use ($bgy) {
                            $q->select(DB::raw(1))
                              ->from('billing_accounts as ba')
                              ->leftJoin('customers as c', 'ba.customer_id', '=', 'c.id')
                              ->whereColumn('ba.id', 'job_orders.account_id')
                              ->where(DB::raw('TRIM(c.barangay)'), $bgy);
                        });
                    }

                    $data = $query->groupBy($col)->get();
                    break;

                case 'queue_mon':
                    $table = $param === 'jo' ? 'job_orders' : 'service_orders';
                    $statusCol = $param === 'jo' ? 'onsite_status' : 'visit_status';

                    $query = DB::table($table)
                        ->select('assigned_email as raw_email', DB::raw('COUNT(*) as value'))
                        ->where($statusCol, 'In Progress')
                        ->whereNotNull('assigned_email')
                        ->where('assigned_email', '!=', '');

                    if ($scope === 'today') {
                        $query->whereDate('timestamp', Carbon::today());
                    }

                    $raw = $query->groupBy('assigned_email')->get();

                    foreach ($raw as $row) {
                        $name = ucwords(str_replace(['.', '_'], ' ', strstr($row->raw_email, '@', true) ?: $row->raw_email));
                        $data[] = ['label' => $name, 'value' => $row->value];
                    }
                    break;

                case 'tech_mon_jo':
                case 'tech_mon_so':
                    $table = $action === 'tech_mon_jo' ? 'job_orders' : 'service_orders';
                    $statusCol = $action === 'tech_mon_jo' ? 'onsite_status' : 'visit_status';

                    $query1 = DB::table($table)
                        ->select(
                            DB::raw("UPPER(TRIM(visit_by_user)) as Tech"),
                            "$statusCol as Status"
                        );
                    
                    if ($scope === 'today') {
                        $query1->whereDate('updated_at', Carbon::today());
                    }

                    $query2 = DB::table($table)
                        ->select(
                            DB::raw("UPPER(TRIM(visit_with)) as Tech"),
                            "$statusCol as Status"
                        );
                    
                    if ($scope === 'today') {
                        $query2->whereDate('updated_at', Carbon::today());
                    }

                    $subQuery = $query1->unionAll($query2);

                    $raw = DB::table(DB::raw("({$subQuery->toSql()}) as T"))
                        ->mergeBindings($subQuery)
                        ->select('Tech as label', 'Status', DB::raw('COUNT(*) as count'))
                        ->whereNotNull('Tech')
                        ->where('Tech', '!=', '')
                        ->whereIn('Status', ['Done', 'Reschedule', 'Failed'])
                        ->groupBy('Tech', 'Status')
                        ->get();

                    $structured = [];
                    foreach ($raw as $row) {
                        $tech = ucwords(strtolower($row->label));
                        if (!isset($structured[$tech])) {
                            $structured[$tech] = ['label' => $tech, 'series' => []];
                        }
                        $structured[$tech]['series'][$row->Status] = $row->count;
                    }

                    $data = array_values($structured);
                    break;

                case 'expenses_mon':
                    $query = DB::table('expenses_log as el')
                        ->leftJoin('expenses_category as ec', 'el.category_id', '=', 'ec.id')
                        ->select('ec.category_name as label', DB::raw('SUM(el.amount) as value'))
                        ->whereNotNull('ec.category_name');

                    if ($scope === 'today') {
                        $query->whereDate('el.expense_date', Carbon::today());
                    }

                    $data = $query->groupBy('ec.category_name')
                        ->orderBy('value', 'desc')
                        ->get();
                    break;

                case 'pay_method_mon':
                    $query = DB::table('transactions')
                        ->select('payment_method as label', DB::raw('SUM(received_payment) as value'))
                        ->whereNotNull('payment_method')
                        ->where('payment_method', '!=', '');

                    if ($scope === 'today') {
                        $query->whereDate('date_processed', Carbon::today());
                    }

                    $data = $query->groupBy('payment_method')
                        ->orderBy('value', 'desc')
                        ->get();
                    break;

                case 'invoice_mon':
                case 'transactions_mon':
                case 'portal_mon':
                    $table = $action === 'invoice_mon' ? 'invoices' : 
                            ($action === 'transactions_mon' ? 'transactions' : 'payment_portal_logs');
                    
                    $dateCol = $action === 'invoice_mon' ? 'invoice_date' : 
                              ($action === 'transactions_mon' ? 'date_processed' : 'date_time');
                    
                    $statusCol = 'status';
                    $valCol = 'COUNT(*)';

                    if ($action === 'invoice_mon') {
                        $valCol = $param === 'amount' ? 
                            "SUM(CASE WHEN status = 'Unpaid' THEN COALESCE(invoice_balance, 0) ELSE COALESCE(received_payment, 0) END)" : 
                            "COUNT(*)";
                    } elseif ($action === 'transactions_mon' || $action === 'portal_mon') {
                        $valueCol = $action === 'transactions_mon' ? 'received_payment' : 'total_amount';
                        $valCol = $param === 'amount' ? "SUM(COALESCE($valueCol, 0))" : "COUNT(*)";
                    }

                    $query = DB::table($table)
                        ->select(
                            DB::raw("MONTHNAME($dateCol) as label"),
                            "$statusCol as Status",
                            DB::raw("$valCol as val")
                        )
                        ->whereYear($dateCol, $year)
                        ->whereNotNull($statusCol);

                    if ($action === 'invoice_mon') {
                        $query->whereIn('status', ['Paid', 'Unpaid', 'Partial']);
                    }

                    $raw = $query->groupBy(DB::raw("MONTH($dateCol)"), $statusCol)
                        ->orderBy(DB::raw("MONTH($dateCol)"))
                        ->get();

                    $months = ['January', 'February', 'March', 'April', 'May', 'June', 
                              'July', 'August', 'September', 'October', 'November', 'December'];
                    
                    $structured = [];
                    foreach ($months as $m) {
                        $structured[$m] = ['label' => $m, 'series' => []];
                    }

                    foreach ($raw as $row) {
                        if (isset($structured[$row->label])) {
                            $structured[$row->label]['series'][$row->Status] = $row->val;
                        }
                    }

                    $data = array_values($structured);
                    break;

                case 'jo_refer_rank':
                    $query = DB::table('job_orders as jo')
                        ->leftJoin('billing_accounts as ba', 'jo.account_id', '=', 'ba.id')
                        ->leftJoin('customers as c', 'ba.customer_id', '=', 'c.id')
                        ->select('c.referred_by as label', DB::raw('COUNT(*) as value'))
                        ->where('jo.onsite_status', 'Done')
                        ->whereNotNull('c.referred_by')
                        ->where('c.referred_by', '!=', '');

                    if ($scope === 'today') {
                        $query->whereDate('jo.timestamp', Carbon::today());
                    }

                    $data = $query->groupBy('c.referred_by')
                        ->orderBy('value', 'desc')
                        ->limit(20)
                        ->get();
                    break;

                case 'invoice_overall':
                    $data = DB::table('invoices')
                        ->select('status as label', DB::raw('COUNT(*) as value'))
                        ->whereIn('status', ['Paid', 'Unpaid', 'Partial'])
                        ->groupBy('status')
                        ->get();
                    break;

                case 'app_map':
                    $query = DB::table('applications')
                        ->select(
                            DB::raw("CONCAT_WS(' ', first_name, middle_initial, last_name) as full_name"),
                            'address_coordinates',
                            'desired_plan',
                            'barangay'
                        )
                        ->whereNotNull('address_coordinates')
                        ->where('address_coordinates', '!=', '');

                    if ($scope === 'today') {
                        $query->whereDate('timestamp', Carbon::today());
                    }

                    if ($bgy !== 'All') {
                        $query->where(DB::raw('TRIM(barangay)'), $bgy);
                    }

                    $raw = $query->get();

                    foreach ($raw as $row) {
                        $data[] = [
                            'name' => $row->full_name,
                            'coords' => $row->address_coordinates,
                            'plan' => $row->desired_plan,
                            'bgy' => $row->barangay
                        ];
                    }
                    break;
            }

            if (!empty($data)) {
                $response['status'] = 'success';
                $response['data'] = $data;
            }
        } catch (\Exception $e) {
            $response['status'] = 'error';
            $response['message'] = $e->getMessage();
        }

        return response()->json($response);
    }

    public function billingStatus(Request $request) 
    { 
        return $this->getData(
            'billing_status',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function onlineStatus(Request $request) 
    { 
        return $this->getData(
            'online_status',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function appStatus(Request $request) 
    { 
        return $this->getData(
            'app_status',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function soStatus(Request $request) 
    { 
        return $this->getData(
            'so_status',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function joStatus(Request $request) 
    { 
        return $this->getData(
            'jo_status',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function queueMon(Request $request) 
    { 
        return $this->getData(
            'queue_mon',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function techMonJo(Request $request) 
    { 
        return $this->getData(
            'tech_mon_jo',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function techMonSo(Request $request) 
    { 
        return $this->getData(
            'tech_mon_so',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function expensesMon(Request $request) 
    { 
        return $this->getData(
            'expenses_mon',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function payMethodMon(Request $request) 
    { 
        return $this->getData(
            'pay_method_mon',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function invoiceMon(Request $request) 
    { 
        return $this->getData(
            'invoice_mon',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function transactionsMon(Request $request) 
    { 
        return $this->getData(
            'transactions_mon',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function portalMon(Request $request) 
    { 
        return $this->getData(
            'portal_mon',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function joReferRank(Request $request) 
    { 
        return $this->getData(
            'jo_refer_rank',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function invoiceOverall(Request $request) 
    { 
        return $this->getData(
            'invoice_overall',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function appMap(Request $request) 
    { 
        return $this->getData(
            'app_map',
            $request->input('param', ''),
            $request->input('scope', 'overall'),
            $request->input('year', date('Y')),
            $request->input('bgy', 'All')
        );
    }

    public function getTemplates(Request $request)
    {
        try {
            $templates = DB::table('dashboard_templates')
                ->select('id', 'template_name', 'layout_data', 'style_data', 'created_at', 'updated_at')
                ->orderBy('created_at', 'desc')
                ->get();

            $formatted = $templates->map(function($template) {
                return [
                    'id' => $template->id,
                    'name' => $template->template_name,
                    'states' => json_decode($template->layout_data, true),
                    'timestamp' => $template->created_at
                ];
            });

            return response()->json([
                'status' => 'success',
                'data' => $formatted
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function saveTemplate(Request $request)
    {
        try {
            $request->validate([
                'template_name' => 'required|string|max:255',
                'layout_data' => 'required'
            ]);

            $id = DB::table('dashboard_templates')->insertGetId([
                'template_name' => $request->input('template_name'),
                'layout_data' => json_encode($request->input('layout_data')),
                'style_data' => json_encode($request->input('style_data', [])),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Template saved successfully',
                'data' => [
                    'id' => $id,
                    'name' => $request->input('template_name'),
                    'states' => $request->input('layout_data'),
                    'timestamp' => now()->toISOString()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteTemplate(Request $request, $id)
    {
        try {
            $deleted = DB::table('dashboard_templates')
                ->where('id', $id)
                ->delete();

            if ($deleted) {
                return response()->json([
                    'status' => 'success',
                    'message' => 'Template deleted successfully'
                ]);
            }

            return response()->json([
                'status' => 'error',
                'message' => 'Template not found'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
