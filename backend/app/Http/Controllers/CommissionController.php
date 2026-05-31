<?php

namespace App\Http\Controllers;

use App\Models\JobOrder;
use App\Models\AgentCommissionHistory;
use App\Models\AgentBalance;
use App\Models\BillingConfig;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CommissionController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            $agentId = $request->input('agent_id');
            $userRole = strtolower($user->role->role_name ?? '');

            // Non-admins can only see their own history
            if (!in_array($userRole, ['admin', 'billing', 'superadmin'])) {
                $agentId = $user->id;
            }

            $limit = $request->input('limit', 2000);
            $offset = $request->input('offset', 0);
            $updatedAfter = $request->input('updated_after');

            $query = AgentCommissionHistory::with('agent');

            if ($agentId) {
                $query->where('agent_id', $agentId);
            }

            if ($updatedAfter) {
                $query->where('updated_at', '>=', $updatedAfter);
            }

            $type = $request->input('type');
            if ($type) {
                if ($type === 'commission') {
                    $query->where(function($q) {
                        $q->where('type', 'commission')
                          ->orWhereNull('type');
                    });
                } else {
                    $query->where('type', $type);
                }
            }

            $total = $query->count();

            $history = $query->orderBy('created_at', 'desc')
                ->offset($offset)
                ->limit($limit)
                ->get();

            // Transform data for the frontend
            $data = $history->map(function ($item) {
                return [
                    'id' => 'JO-' . str_pad($item->id, 5, '0', STR_PAD_LEFT),
                    'customer' => $item->agent ? ($item->agent->full_name ?? ($item->agent->first_name . ' ' . $item->agent->last_name)) : 'Unknown',
                    'service' => 'Payout (Ref: ' . $item->ref_number . ')',
                    'date' => $item->created_at ? date('M d, Y', strtotime($item->created_at)) : null,
                    'status' => 'Paid',
                    'amount' => '₱' . number_format($item->total_amount, 2),
                    'commission_id_list' => $item->commission_id_list,
                    'type' => $item->type
                ];
            });

            // Calculate totals
            $totalCommission = $history->sum('total_amount');
            $thisMonthCommission = $history->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])->sum('total_amount');

            return response()->json([
                'success' => true,
                'data' => $data,
                'stats' => [
                    'total' => '₱' . number_format($totalCommission, 2),
                    'pending' => '₱' . number_format(0, 2),
                    'thisMonth' => '₱' . number_format($thisMonthCommission, 2),
                    'totalCount' => $total,
                    'user_name' => $user->full_name ?? ($user->first_name . ' ' . $user->last_name),
                    'user_created_at' => $user->created_at ? $user->created_at->format('M d, Y') : null
                ],
                'total' => $total
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

            $agentId = $request->input('agent_id');
            $userRole = strtolower($user->role->role_name ?? '');

            // Non-admins can only see their own history
            if (!in_array($userRole, ['admin', 'billing', 'superadmin'])) {
                $agentId = $user->id;
            }

            $limit = $request->input('limit', 2000);
            $offset = $request->input('offset', 0);
            $updatedAfter = $request->input('updated_after');

            $query = AgentCommissionHistory::with('agent');

            if ($agentId) {
                $query->where('agent_id', $agentId);
            }

            if ($updatedAfter) {
                $query->where('updated_at', '>=', $updatedAfter);
            }

            $type = $request->input('type');
            if ($type) {
                if ($type === 'commission') {
                    $query->where(function($q) {
                        $q->where('type', 'commission')
                          ->orWhereNull('type');
                    });
                } elseif ($type === 'incentives') {
                    $query->whereIn('type', ['incentives', 'incentives_payout']);
                } else {
                    $query->where('type', $type);
                }
            }
            
            $total = $query->count();

            $history = $query->orderBy('created_at', 'desc')
                ->offset($offset)
                ->limit($limit)
                ->get();

            $data = $history->map(function($item) {
                return [
                    'id' => $item->id,
                    'ref_number' => $item->ref_number,
                    'total_amount' => $item->total_amount,
                    'created_by' => $item->created_by,
                    'created_at' => $item->created_at,
                    'remarks' => $item->remarks,
                    'proof_of_payment' => $item->proof_of_payment,
                    'agent_id' => $item->agent_id,
                    'agent_name' => $item->agent ? ($item->agent->full_name ?? ($item->agent->first_name . ' ' . $item->agent->last_name)) : 'Unknown',
                    'commission_id_list' => $item->commission_id_list,
                    'updated_by' => $item->updated_by,
                    'updated_at' => $item->updated_at,
                    'approved_by' => $item->approved_by,
                    'type' => $item->type
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $data,
                'total' => $total
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payout history',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function storeHistory(Request $request)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
            }

            $validated = $request->validate([
                'agent_id'      => 'required|integer',
                'ref_number'    => 'required|string|max:100',
                'total_amount'  => 'required|numeric|min:0',
                'remarks'       => 'required|string',
                'proof_of_payment' => 'required|string',
                'job_order_ids' => 'nullable|array',
                'job_order_ids.*' => 'integer',
                'type'          => 'nullable|string|max:50',
            ]);

            $jobOrderIds = $validated['job_order_ids'] ?? [];
            unset($validated['job_order_ids']);

            $validated['type'] = $validated['type'] ?? 'commission';
            $validated['commission_id_list'] = !empty($jobOrderIds) ? implode(',', $jobOrderIds) : null;
            $validated['created_by'] = $user->full_name ?? $user->email_address ?? 'System';
            $validated['organization_id'] = $user->organization_id ?? null;

            $history = AgentCommissionHistory::create($validated);

            // Mark all referenced job orders as commission paid
            if (!empty($jobOrderIds)) {
                JobOrder::whereIn('id', $jobOrderIds)
                    ->update(['commission_status' => 'Paid']);
            }

            // Update the agent's balance (add if incentives, deduct if incentives_payout or commission payout)
            $agentBalance = AgentBalance::where('agent_id', $validated['agent_id'])->first();
            if ($agentBalance) {
                if ($validated['type'] === 'incentives') {
                    $newBalance = (float)$agentBalance->balance + (float)$validated['total_amount'];
                    $newIncentives = (float)$agentBalance->incentives + (float)$validated['total_amount'];
                    $agentBalance->update([
                        'balance' => $newBalance,
                        'incentives' => $newIncentives
                    ]);
                } elseif ($validated['type'] === 'incentives_payout') {
                    $newBalance = max(0, (float)$agentBalance->balance - (float)$validated['total_amount']);
                    $newIncentives = max(0, (float)$agentBalance->incentives - (float)$validated['total_amount']);
                    $agentBalance->update([
                        'balance' => $newBalance,
                        'incentives' => $newIncentives
                    ]);
                } else {
                    $newBalance = max(0, (float)$agentBalance->balance - (float)$validated['total_amount']);
                    $agentBalance->update(['balance' => $newBalance]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => $validated['type'] === 'incentives' 
                    ? 'Incentive recorded successfully' 
                    : ($validated['type'] === 'incentives_payout' 
                        ? 'Incentive payout recorded successfully' 
                        : 'Commission payment recorded successfully'),
                'data'    => $history,
                'updated_job_orders' => count($jobOrderIds),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to record commission payment',
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

    /**
     * Get job orders referred by a specific agent name, plus the agent's commission rate.
     * Used by the payout modal to auto-populate job order list and total amount.
     */
    public function getJobOrdersByAgent(Request $request)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
            }

            $agentId   = $request->input('agent_id');
            $agentName = trim($request->input('agent_name', ''));

            if (!$agentId && !$agentName) {
                return response()->json(['success' => false, 'message' => 'agent_id or agent_name is required'], 422);
            }

            // Resolve commission rate from agent_balance
            $commissionRate = 0;
            if ($agentId) {
                $balance = AgentBalance::where('agent_id', $agentId)->first();
                $commissionRate = $balance ? (float)$balance->commission : 0;
            }

            // Build name variants to match against referred_by
            $nameVariants = [];
            if ($agentName) {
                $nameVariants[] = strtolower($agentName);
            }
            if ($agentId) {
                $agent = User::find($agentId);
                if ($agent) {
                    $nameVariants[] = strtolower(trim($agent->first_name . ' ' . $agent->last_name));
                    if ($agent->full_name) {
                        $nameVariants[] = strtolower(trim($agent->full_name));
                    }
                }
            }
            $nameVariants = array_unique(array_filter($nameVariants));

            if (empty($nameVariants)) {
                return response()->json([
                    'success' => true,
                    'data' => ['job_order_ids' => [], 'commission_rate' => $commissionRate, 'total_amount' => 0]
                ]);
            }

            // Query job orders via application's referred_by
            $query = JobOrder::whereHas('application', function ($q) use ($nameVariants) {
                $q->where(function ($sq) use ($nameVariants) {
                    foreach ($nameVariants as $name) {
                        $sq->orWhere(DB::raw('LOWER(referred_by)'), 'LIKE', '%' . $name . '%');
                    }
                });
            })
            ->where(DB::raw('LOWER(onsite_status)'), 'done')
            ->where(function ($q) {
                $q->whereNull('commission_status')
                  ->orWhere(DB::raw('LOWER(commission_status)'), '!=', 'paid');
            })
            ->orderBy('id', 'asc');

            $jobOrders = $query->get(['id']);
            $ids = $jobOrders->pluck('id')->toArray();
            $count = count($ids);
            $totalAmount = $count * $commissionRate;

            return response()->json([
                'success' => true,
                'data' => [
                    'job_order_ids'   => $ids,
                    'commission_rate' => $commissionRate,
                    'total_amount'    => $totalAmount,
                    'count'           => $count,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch agent job orders',
                'error'   => $e->getMessage()
            ], 500);
        }
    }
}

