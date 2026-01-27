<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DCNotice;
use App\Models\BillingDetail;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

class DCNoticeApiController extends Controller
{
    public function index(Request $request)
    {
        try {
            $page = $request->input('page', 1);
            $limit = $request->input('limit', 100);
            $search = $request->input('search', '');
            $date = $request->input('date', '');

            $query = DCNotice::with(['account', 'invoice'])
                ->orderBy('dc_notice_date', 'desc');

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('account', function ($accountQuery) use ($search) {
                        $accountQuery->where('account_no', 'LIKE', "%{$search}%")
                            ->orWhere('full_name', 'LIKE', "%{$search}%");
                    });
                });
            }

            if ($date) {
                $query->whereDate('dc_notice_date', $date);
            }

            $total = $query->count();

            $dcNotices = $query->skip(($page - 1) * $limit)
                ->take($limit)
                ->get();

            $enrichedData = $dcNotices->map(function ($notice) {
                $account = $notice->account;
                
                return [
                    'id' => $notice->id,
                    'account_id' => $notice->account_id,
                    'invoice_id' => $notice->invoice_id,
                    'dc_notice_date' => $notice->dc_notice_date?->format('Y-m-d H:i:s'),
                    'print_link' => $notice->print_link,
                    'created_at' => $notice->created_at?->format('Y-m-d H:i:s'),
                    'created_by_user_id' => $notice->created_by_user_id,
                    'updated_at' => $notice->updated_at?->format('Y-m-d H:i:s'),
                    'updated_by_user_id' => $notice->updated_by_user_id,
                    'account_no' => $account?->account_no ?? null,
                    'full_name' => $account?->full_name ?? null,
                    'contact_number' => $account?->contact_number ?? null,
                    'email_address' => $account?->email_address ?? null,
                    'address' => $account?->address ?? null,
                    'plan' => $account?->plan ?? null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $enrichedData,
                'pagination' => [
                    'current_page' => (int) $page,
                    'total_pages' => (int) ceil($total / $limit),
                    'total_items' => $total,
                    'per_page' => (int) $limit,
                    'from' => (($page - 1) * $limit) + 1,
                    'to' => min($page * $limit, $total)
                ]
            ]);

        } catch (Exception $e) {
            Log::error('DC Notice API error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch DC Notice records',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $dcNotice = DCNotice::with(['account', 'invoice'])->findOrFail($id);

            $account = $dcNotice->account;
            
            $data = [
                'id' => $dcNotice->id,
                'account_id' => $dcNotice->account_id,
                'invoice_id' => $dcNotice->invoice_id,
                'dc_notice_date' => $dcNotice->dc_notice_date?->format('Y-m-d H:i:s'),
                'print_link' => $dcNotice->print_link,
                'created_at' => $dcNotice->created_at?->format('Y-m-d H:i:s'),
                'created_by_user_id' => $dcNotice->created_by_user_id,
                'updated_at' => $dcNotice->updated_at?->format('Y-m-d H:i:s'),
                'updated_by_user_id' => $dcNotice->updated_by_user_id,
                'account_no' => $account?->account_no ?? null,
                'full_name' => $account?->full_name ?? null,
                'contact_number' => $account?->contact_number ?? null,
                'email_address' => $account?->email_address ?? null,
                'address' => $account?->address ?? null,
                'plan' => $account?->plan ?? null,
            ];

            return response()->json([
                'success' => true,
                'data' => $data
            ]);

        } catch (Exception $e) {
            Log::error('DC Notice show error', [
                'id' => $id,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'DC Notice record not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'account_id' => 'required|integer',
                'invoice_id' => 'nullable|integer',
                'dc_notice_date' => 'required|date',
                'print_link' => 'nullable|string|max:255',
            ]);

            $authData = $request->user();
            $validated['created_by_user_id'] = $authData?->id;

            $dcNotice = DCNotice::create($validated);

            return response()->json([
                'success' => true,
                'message' => 'DC Notice record created successfully',
                'data' => $dcNotice
            ], 201);

        } catch (Exception $e) {
            Log::error('DC Notice create error', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create DC Notice record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $dcNotice = DCNotice::findOrFail($id);

            $validated = $request->validate([
                'account_id' => 'sometimes|required|integer',
                'invoice_id' => 'nullable|integer',
                'dc_notice_date' => 'sometimes|required|date',
                'print_link' => 'nullable|string|max:255',
            ]);

            $authData = $request->user();
            $validated['updated_by_user_id'] = $authData?->id;

            $dcNotice->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'DC Notice record updated successfully',
                'data' => $dcNotice
            ]);

        } catch (Exception $e) {
            Log::error('DC Notice update error', [
                'id' => $id,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update DC Notice record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $dcNotice = DCNotice::findOrFail($id);
            $dcNotice->delete();

            return response()->json([
                'success' => true,
                'message' => 'DC Notice record deleted successfully'
            ]);

        } catch (Exception $e) {
            Log::error('DC Notice delete error', [
                'id' => $id,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete DC Notice record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getStatistics()
    {
        try {
            $total = DCNotice::count();
            $thisMonth = DCNotice::whereMonth('dc_notice_date', now()->month)
                ->whereYear('dc_notice_date', now()->year)
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_notices' => $total,
                    'this_month' => $thisMonth,
                ]
            ]);

        } catch (Exception $e) {
            Log::error('DC Notice statistics error', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
