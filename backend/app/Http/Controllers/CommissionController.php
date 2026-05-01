<?php

namespace App\Http\Controllers;

use App\Models\JobOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

            $fullName = $user->full_name;

            $commissions = JobOrder::join('applications', 'job_orders.application_id', '=', 'applications.id')
                ->where('applications.referred_by', $fullName)
                ->select(
                    'job_orders.id as transaction_id',
                    'applications.first_name',
                    'applications.last_name',
                    'applications.desired_plan',
                    'job_orders.date_installed',
                    'job_orders.onsite_status',
                    'job_orders.installation_fee',
                    'job_orders.created_at'
                )
                ->orderBy('job_orders.created_at', 'desc')
                ->get();

            // Transform data for the frontend
            $data = $commissions->map(function ($item) {
                return [
                    'id' => 'JO-' . str_pad($item->transaction_id, 5, '0', STR_PAD_LEFT),
                    'customer' => $item->first_name . ' ' . $item->last_name,
                    'service' => $item->desired_plan,
                    'date' => $item->date_installed ? date('M d, Y', strtotime($item->date_installed)) : date('M d, Y', strtotime($item->created_at)),
                    'status' => $item->onsite_status === 'done' ? 'Paid' : 'Pending', // Simple logic for now
                    'amount' => '₱' . number_format($item->installation_fee ?? 500, 2) // Defaulting to 500 if null
                ];
            });

            // Calculate totals
            $totalCommission = $commissions->sum('installation_fee') ?: 0;
            $pendingPayout = $commissions->where('onsite_status', '!=', 'done')->sum('installation_fee') ?: 0;
            $thisMonthCommission = $commissions->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])->sum('installation_fee') ?: 0;

            return response()->json([
                'success' => true,
                'data' => $data,
                'stats' => [
                    'total' => '₱' . number_format($totalCommission, 2),
                    'pending' => '₱' . number_format($pendingPayout, 2),
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
}
