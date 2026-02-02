<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Overdue;
use App\Models\BillingAccount;
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
            $limit = $request->input('limit', 50); // Reduced to 50 for faster response
            $search = $request->input('search', '');
            $date = $request->input('date', '');
            $fastMode = $request->input('fast', false); // Fast mode: skip customer data loading

            $query = Overdue::orderBy('overdue_date', 'desc');

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('account_no', 'LIKE', "%{$search}%");
                });
            }

            if ($date) {
                $query->whereDate('overdue_date', $date);
            }

            // Fetch one extra record to check if there are more pages (more efficient than COUNT)
            $overdues = $query->skip(($page - 1) * $limit)
                ->take($limit + 1) // Fetch one extra
                ->get();

            // Check if there are more pages
            $hasMore = $overdues->count() > $limit;

            // Remove the extra record if it exists
            if ($hasMore) {
                $overdues = $overdues->slice(0, $limit);
            }

            // Fast mode: Return data immediately without customer details
            if ($fastMode) {
                $enrichedData = $overdues->map(function ($overdue) {
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
                    ];
                });

                return response()->json([
                    'success' => true,
                    'data' => $enrichedData->values(),
                    'pagination' => [
                        'current_page' => (int) $page,
                        'per_page' => (int) $limit,
                        'has_more' => $hasMore
                    ]
                ]);
            }

            // Normal mode: Fetch customer data in bulk to avoid N+1 queries
            $accountNos = $overdues->pluck('account_no')->unique()->toArray();

            // Bulk fetch accounts with customers
            $accounts = BillingAccount::whereIn('account_no', $accountNos)
                ->with('customer')
                ->get()
                ->keyBy('account_no');

            $enrichedData = $overdues->map(function ($overdue) use ($accounts) {
                $billingAccount = $accounts->get($overdue->account_no);
                $customer = $billingAccount?->customer;
                
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
                    'full_name' => $customer?->full_name ?? null,
                    'contact_number' => $customer?->contact_number_primary ?? null,
                    'email_address' => $customer?->email_address ?? null,
                    'address' => $customer?->address ?? null,
                    'plan' => $customer?->desired_plan ?? null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $enrichedData->values(),
                'pagination' => [
                    'current_page' => (int) $page,
                    'per_page' => (int) $limit,
                    'has_more' => $hasMore
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

            $billingAccount = BillingAccount::where('account_no', $overdue->account_no)->with('customer')->first();
            $customer = $billingAccount?->customer;
            
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
                'full_name' => $customer?->full_name ?? null,
                'contact_number' => $customer?->contact_number_primary ?? null,
                'email_address' => $customer?->email_address ?? null,
                'address' => $customer?->address ?? null,
                'plan' => $customer?->desired_plan ?? null,
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
