<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Overdue;
use App\Models\BillingDetail;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

class OverdueApiController extends Controller
{
    public function index(Request $request)
    {
        try {
            $page = $request->input('page', 1);
            $limit = $request->input('limit', 100);
            $search = $request->input('search', '');
            $date = $request->input('date', '');

            $query = Overdue::orderBy('overdue_date', 'desc');

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('account_no', 'LIKE', "%{$search}%");
                });
            }

            if ($date) {
                $query->whereDate('overdue_date', $date);
            }

            $total = $query->count();

            $overdues = $query->skip(($page - 1) * $limit)
                ->take($limit)
                ->get();

            $enrichedData = $overdues->map(function ($overdue) {
                $billingDetail = BillingDetail::where('account_no', $overdue->account_no)->first();
                
                return [
                    'id' => $overdue->id,
                    'account_no' => $overdue->account_no,
                    'invoice_id' => $overdue->invoice_id,
                    'overdue_date' => $overdue->overdue_date?->format('Y-m-d H:i:s'),
                    'print_link' => $overdue->print_link,
                    'created_at' => $overdue->created_at?->format('Y-m-d H:i:s'),
                    'created_by_user_id' => $overdue->created_by_user_id,
                    'updated_at' => $overdue->updated_at?->format('Y-m-d H:i:s'),
                    'updated_by_user_id' => $overdue->updated_by_user_id,
                    'full_name' => $billingDetail?->full_name ?? null,
                    'contact_number' => $billingDetail?->contact_number ?? null,
                    'email_address' => $billingDetail?->email_address ?? null,
                    'address' => $billingDetail?->address ?? null,
                    'plan' => $billingDetail?->plan ?? null,
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
            Log::error('Overdue API error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch Overdue records',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $overdue = Overdue::findOrFail($id);

            $billingDetail = BillingDetail::where('account_no', $overdue->account_no)->first();
            
            $data = [
                'id' => $overdue->id,
                'account_no' => $overdue->account_no,
                'invoice_id' => $overdue->invoice_id,
                'overdue_date' => $overdue->overdue_date?->format('Y-m-d H:i:s'),
                'print_link' => $overdue->print_link,
                'created_at' => $overdue->created_at?->format('Y-m-d H:i:s'),
                'created_by_user_id' => $overdue->created_by_user_id,
                'updated_at' => $overdue->updated_at?->format('Y-m-d H:i:s'),
                'updated_by_user_id' => $overdue->updated_by_user_id,
                'full_name' => $billingDetail?->full_name ?? null,
                'contact_number' => $billingDetail?->contact_number ?? null,
                'email_address' => $billingDetail?->email_address ?? null,
                'address' => $billingDetail?->address ?? null,
                'plan' => $billingDetail?->plan ?? null,
            ];

            return response()->json([
                'success' => true,
                'data' => $data
            ]);

        } catch (Exception $e) {
            Log::error('Overdue show error', [
                'id' => $id,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Overdue record not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'account_no' => 'required|string',
                'invoice_id' => 'nullable|integer',
                'overdue_date' => 'required|date',
                'print_link' => 'nullable|string|max:255',
            ]);

            $authData = $request->user();
            $validated['created_by_user_id'] = $authData?->id;

            $overdue = Overdue::create($validated);

            return response()->json([
                'success' => true,
                'message' => 'Overdue record created successfully',
                'data' => $overdue
            ], 201);

        } catch (Exception $e) {
            Log::error('Overdue create error', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create Overdue record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $overdue = Overdue::findOrFail($id);

            $validated = $request->validate([
                'account_no' => 'sometimes|required|string',
                'invoice_id' => 'nullable|integer',
                'overdue_date' => 'sometimes|required|date',
                'print_link' => 'nullable|string|max:255',
            ]);

            $authData = $request->user();
            $validated['updated_by_user_id'] = $authData?->id;

            $overdue->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Overdue record updated successfully',
                'data' => $overdue
            ]);

        } catch (Exception $e) {
            Log::error('Overdue update error', [
                'id' => $id,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update Overdue record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $overdue = Overdue::findOrFail($id);
            $overdue->delete();

            return response()->json([
                'success' => true,
                'message' => 'Overdue record deleted successfully'
            ]);

        } catch (Exception $e) {
            Log::error('Overdue delete error', [
                'id' => $id,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete Overdue record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getStatistics()
    {
        try {
            $total = Overdue::count();
            $thisMonth = Overdue::whereMonth('overdue_date', now()->month)
                ->whereYear('overdue_date', now()->year)
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_overdue' => $total,
                    'this_month' => $thisMonth,
                ]
            ]);

        } catch (Exception $e) {
            Log::error('Overdue statistics error', [
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
