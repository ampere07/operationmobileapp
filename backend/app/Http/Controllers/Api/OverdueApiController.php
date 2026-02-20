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

            // Fetch with eager loading
            $overdues = $query->with(['account.customer'])
                ->skip(($page - 1) * $limit)
                ->take($limit + 1)
                ->get();

            // Check if there are more pages
            $hasMore = $overdues->count() > $limit;

            // Remove the extra record if it exists
            if ($hasMore) {
                $overdues = $overdues->slice(0, $limit);
            }

            // Map data
            $enrichedData = $overdues->map(function ($overdue) {
                $customer = $overdue->account?->customer;
                
                // Safe date formatting
                $overdue_date = null;
                if ($overdue->overdue_date instanceof \DateTimeInterface) {
                    $overdue_date = $overdue->overdue_date->format('Y-m-d H:i:s');
                } elseif (is_string($overdue->overdue_date)) {
                    $overdue_date = $overdue->overdue_date;
                }

                $created_at = null;
                if ($overdue->created_at instanceof \DateTimeInterface) {
                    $created_at = $overdue->created_at->format('Y-m-d H:i:s');
                }

                $updated_at = null;
                if ($overdue->updated_at instanceof \DateTimeInterface) {
                    $updated_at = $overdue->updated_at->format('Y-m-d H:i:s');
                }

                return [
                    'id' => $overdue->id,
                    'account_no' => $overdue->account_no,
                    'invoice_id' => $overdue->invoice_id,
                    'overdue_date' => $overdue_date,
                    'print_link' => $overdue->print_link,
                    'created_at' => $created_at,
                    'created_by_user_id' => $overdue->created_by_user_id,
                    'updated_at' => $updated_at,
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
                    'has_more' => $hasMore,
                    'total' => Overdue::count()
                ]
            ]);

        } catch (\Throwable $e) {
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
            $overdue = Overdue::with(['account.customer'])->findOrFail($id);
            $customer = $overdue->account?->customer;
            
            // Safe date formatting
            $overdue_date = null;
            if ($overdue->overdue_date instanceof \DateTimeInterface) {
                $overdue_date = $overdue->overdue_date->format('Y-m-d H:i:s');
            } elseif (is_string($overdue->overdue_date)) {
                $overdue_date = $overdue->overdue_date;
            }

            $created_at = null;
            if ($overdue->created_at instanceof \DateTimeInterface) {
                $created_at = $overdue->created_at->format('Y-m-d H:i:s');
            }

            $updated_at = null;
            if ($overdue->updated_at instanceof \DateTimeInterface) {
                $updated_at = $overdue->updated_at->format('Y-m-d H:i:s');
            }

            $data = [
                'id' => $overdue->id,
                'account_no' => $overdue->account_no,
                'invoice_id' => $overdue->invoice_id,
                'overdue_date' => $overdue_date,
                'print_link' => $overdue->print_link,
                'created_at' => $created_at,
                'created_by_user_id' => $overdue->created_by_user_id,
                'updated_at' => $updated_at,
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

        } catch (\Throwable $e) {
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

        } catch (\Throwable $e) {
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

        } catch (\Throwable $e) {
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

        } catch (\Throwable $e) {
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

        } catch (\Throwable $e) {
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

