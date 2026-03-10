<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MassRebate;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use App\Models\ActivityLog;
use App\Events\RebateUpdated;

class MassRebateApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = MassRebate::query();

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('billing_day')) {
                $query->where('billing_day', $request->billing_day);
            }

            if ($request->has('barangay_code')) {
                $query->where('barangay_code', $request->barangay_code);
            }

            $rebates = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $rebates,
                'count' => $rebates->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching mass rebates: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch mass rebates',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'rebate_days' => 'required|integer|min:1',
                'billing_day' => 'required|integer|min:1|max:31',
                'barangay_code' => 'required|string',
                'rebate_date' => 'required|date',
                'description' => 'nullable|string',
                'remarks' => 'nullable|string'
            ]);

            $validated['status'] = 'Unused';
            $validated['created_by_user_id'] = $request->user()->id ?? 1;
            $validated['updated_by_user_id'] = $request->user()->id ?? 1;

            $rebate = MassRebate::create($validated);

            // Create Activity Log
            ActivityLog::log(
                'Mass Rebate Created',
                "New Mass Rebate created with {$validated['rebate_days']} days for Billing Day {$validated['billing_day']} in {$validated['barangay_code']}",
                'info',
                [
                    'resource_type' => 'MassRebate',
                    'resource_id' => $rebate->id,
                    'additional_data' => [
                        'rebate_days' => $validated['rebate_days'],
                        'billing_day' => $validated['billing_day'],
                        'barangay_code' => $validated['barangay_code'],
                        'rebate_date' => $validated['rebate_date'],
                        'status' => $validated['status']
                    ]
                ]
            );

            event(new RebateUpdated(['action' => 'created', 'rebate_id' => $rebate->id]));

            return response()->json([
                'success' => true,
                'message' => 'Mass rebate created successfully',
                'data' => $rebate
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating mass rebate: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create mass rebate',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $rebate = MassRebate::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $rebate
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Mass rebate not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $rebate = MassRebate::findOrFail($id);

            $validated = $request->validate([
                'rebate_days' => 'sometimes|integer|min:1',
                'billing_day' => 'sometimes|integer|min:1|max:31',
                'barangay_code' => 'sometimes|string',
                'rebate_date' => 'sometimes|date',
                'status' => 'sometimes|in:Unused,Used',
                'description' => 'nullable|string',
                'remarks' => 'nullable|string'
            ]);

            $validated['updated_by_user_id'] = $request->user()->id ?? 1;

            $rebate->update($validated);

            // Create Activity Log
            ActivityLog::log(
                'Mass Rebate Updated',
                "Mass Rebate #{$id} updated. Current Status: " . ($validated['status'] ?? $rebate->status),
                'info',
                [
                    'resource_type' => 'MassRebate',
                    'resource_id' => $id,
                    'additional_data' => $validated
                ]
            );

            event(new RebateUpdated(['action' => 'updated', 'rebate_id' => $id]));

            return response()->json([
                'success' => true,
                'message' => 'Mass rebate updated successfully',
                'data' => $rebate
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating mass rebate: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update mass rebate',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $rebate = MassRebate::findOrFail($id);
            $rebateData = $rebate->toArray();
            $rebate->delete();

            // Create Activity Log
            ActivityLog::log(
                'Mass Rebate Deleted',
                "Mass Rebate #{$id} deleted. Was for Billing Day {$rebateData['billing_day']}",
                'warning',
                [
                    'resource_type' => 'MassRebate',
                    'resource_id' => $id,
                    'additional_data' => $rebateData
                ]
            );

            event(new RebateUpdated(['action' => 'deleted', 'rebate_id' => $id]));

            return response()->json([
                'success' => true,
                'message' => 'Mass rebate deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting mass rebate: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete mass rebate',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function markAsUsed(Request $request, $id): JsonResponse
    {
        try {
            $rebate = MassRebate::findOrFail($id);
            
            $rebate->update([
                'status' => 'Used',
                'updated_by_user_id' => $request->user()->id ?? 1
            ]);

            // Create Activity Log
            ActivityLog::log(
                'Mass Rebate Applied',
                "Mass Rebate #{$id} marked as Used/Applied",
                'info',
                [
                    'resource_type' => 'MassRebate',
                    'resource_id' => $id,
                    'additional_data' => [
                        'status' => 'Used',
                        'rebate_days' => $rebate->rebate_days,
                        'billing_day' => $rebate->billing_day
                    ]
                ]
            );

            event(new RebateUpdated(['action' => 'marked_used', 'rebate_id' => $id]));

            return response()->json([
                'success' => true,
                'message' => 'Mass rebate marked as used',
                'data' => $rebate
            ]);
        } catch (\Exception $e) {
            Log::error('Error marking rebate as used: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark rebate as used',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
