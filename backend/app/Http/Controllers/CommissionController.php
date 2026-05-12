<?php

namespace App\Http\Controllers;

use App\Models\JobOrder;
use App\Models\AgentCommissionHistory;
use App\Models\BillingConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CommissionController extends Controller
{
    public function index()
    {
        try {
            $user = auth()->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            $billingConfig = BillingConfig::first();
            $agentCommission = $billingConfig ? $billingConfig->agent_commission : 0;

            $commissions = JobOrder::whereHas('application', function($q) use ($user) {
                $fn1 = strtolower(trim($user->first_name . ' ' . $user->last_name));
                $fn2 = strtolower(trim($user->full_name));
                $email = strtolower(trim($user->email_address ?? ''));
                
                $q->where(DB::raw('LOWER(referred_by)'), 'LIKE', '%' . $fn1 . '%')
                  ->orWhere(DB::raw('LOWER(referred_by)'), 'LIKE', '%' . $fn2 . '%');
                
                if ($email) {
                    $q->orWhere(DB::raw('LOWER(referred_by)'), 'LIKE', '%' . $email . '%');
                }
            })
            ->where(function($q) {
                $q->where(DB::raw('LOWER(onsite_status)'), 'done')
                  ->orWhere(DB::raw('LOWER(onsite_status)'), 'completed');
            })
            ->with('application')
            ->orderBy('created_at', 'desc')
            ->get();

            // Transform data for the frontend
            $data = $commissions->map(function ($item) use ($agentCommission) {
                return [
                    'id' => 'JO-' . str_pad($item->transaction_id, 5, '0', STR_PAD_LEFT),
                    'customer' => $item->first_name . ' ' . $item->last_name,
                    'service' => $item->desired_plan,
                    'date' => $item->date_installed ? date('M d, Y', strtotime($item->date_installed)) : date('M d, Y', strtotime($item->created_at)),
                    'status' => 'Paid',
                    'amount' => '₱' . number_format($agentCommission, 2)
                ];
            });

            // Calculate totals
            $totalCommission = $commissions->count() * $agentCommission;
            $thisMonthCommission = $commissions->whereBetween('updated_at', [now()->startOfMonth(), now()->endOfMonth()])->count() * $agentCommission;

            return response()->json([
                'success' => true,
                'data' => $data,
                'stats' => [
                    'total' => '₱' . number_format($totalCommission, 2),
                    'pending' => '₱' . number_format(0, 2),
                    'thisMonth' => '₱' . number_format($thisMonthCommission, 2),
                    'totalCount' => $commissions->count()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch commissions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getHistory(Request $request)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
            }

            $agentId = $user->id;

            $history = AgentCommissionHistory::where('agent_id', $agentId)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $history
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payout history',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getTrend(Request $request)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
            }

            $fullName = $user->full_name;
            $filter = $request->input('filter', 'monthly');

            $billingConfig = BillingConfig::first();
            $commissionValue = $billingConfig ? $billingConfig->agent_commission : 0;

            $query = JobOrder::whereHas('application', function($q) use ($user) {
                $fn1 = strtolower(trim($user->first_name . ' ' . $user->last_name));
                $fn2 = strtolower(trim($user->full_name));
                $email = strtolower(trim($user->email_address ?? ''));

                $q->where(function($sq) use ($fn1, $fn2, $email) {
                    $sq->where(DB::raw('LOWER(referred_by)'), 'LIKE', '%' . $fn1 . '%')
                       ->orWhere(DB::raw('LOWER(referred_by)'), 'LIKE', '%' . $fn2 . '%');
                    
                    if ($email) {
                        $sq->orWhere(DB::raw('LOWER(referred_by)'), 'LIKE', '%' . $email . '%');
                    }
                });
            })
            ->where(function($q) {
                $q->where(DB::raw('LOWER(onsite_status)'), 'done')
                  ->orWhere(DB::raw('LOWER(onsite_status)'), 'completed');
            });

            $dateExpr = 'COALESCE(job_orders.date_installed, job_orders.timestamp, job_orders.created_at)';

            $now = Carbon::now();
            $data = [];
            $labels = [];

            if ($filter === 'monthly') {
                for ($i = 3; $i >= 0; $i--) {
                    $start = $now->copy()->subWeeks($i)->startOfWeek();
                    $end = $now->copy()->subWeeks($i)->endOfWeek();
                    $count = (clone $query)->whereBetween(DB::raw($dateExpr), [$start, $end])->count();
                    $data[] = (float)($count * $commissionValue);
                    $labels[] = 'Week ' . (4 - $i);
                }
            } else if ($filter === '3months') {
                for ($i = 2; $i >= 0; $i--) {
                    $date = $now->copy()->subMonths($i);
                    $start = $date->copy()->startOfMonth();
                    $end = $date->copy()->endOfMonth();
                    $count = (clone $query)->whereBetween(DB::raw($dateExpr), [$start, $end])->count();
                    $data[] = (float)($count * $commissionValue);
                    $labels[] = $date->format('M');
                }
            } else if ($filter === 'yearly') {
                for ($i = 1; $i <= 12; $i++) {
                    $date = $now->copy()->month($i)->startOfMonth();
                    $count = (clone $query)->whereYear(DB::raw($dateExpr), $now->year)
                        ->whereMonth(DB::raw($dateExpr), $i)
                        ->count();
                    $data[] = (float)($count * $commissionValue);
                    $labels[] = $date->format('M');
                }
            } else if ($filter === '5years') {
                for ($i = 4; $i >= 0; $i--) {
                    $year = $now->year - $i;
                    $count = (clone $query)->whereYear(DB::raw($dateExpr), $year)->count();
                    $data[] = (float)($count * $commissionValue);
                    $labels[] = (string)$year;
                }
            }

            $totalCount = (clone $query)->count();
            $totalCommission = (float)($totalCount * $commissionValue);

            return response()->json([
                'success' => true,
                'data' => [
                    'points' => $data,
                    'labels' => $labels,
                    'summary' => [
                        'total_count' => $totalCount,
                        'total_commission' => $totalCommission,
                        'commission_rate' => $commissionValue
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch commission trend',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
