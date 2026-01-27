<?php

namespace App\Http\Controllers;

use App\Models\Discount;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class DiscountController extends Controller
{
    public function index(): JsonResponse
    {
        try {
            $discounts = Discount::with([
                'billingAccount.customer',
                'billingAccount.plan',
                'processedByUser',
                'approvedByUser',
                'createdByUser',
                'updatedByUser'
            ])
            ->orderBy('created_at', 'desc')
            ->get();

            return response()->json([
                'success' => true,
                'data' => $discounts,
                'count' => $discounts->count()
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching discounts: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch discounts',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'account_no' => 'required|exists:billing_accounts,account_no',
                'discount_amount' => 'required|numeric|min:0',
                'remaining' => 'required|integer|min:0',
                'status' => 'required|in:Pending,Unused,Used,Permanent,Monthly',
                'processed_date' => 'required|date',
                'processed_by_user_id' => 'required|exists:users,id',
                'approved_by_user_id' => 'required|exists:users,id',
                'remarks' => 'nullable|string',
                'invoice_used_id' => 'nullable|exists:invoices,id',
                'used_date' => 'nullable|date',
            ]);

            if ($validated['status'] === 'Monthly' && $validated['remaining'] <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Remaining cycles must be greater than 0 for Monthly discounts',
                    'errors' => ['remaining' => ['Remaining cycles must be greater than 0 for Monthly discounts']]
                ], 422);
            }

            DB::beginTransaction();

            $validated['created_by_user_id'] = Auth::id();
            $validated['updated_by_user_id'] = Auth::id();

            $discount = Discount::create($validated);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Discount created successfully',
                'data' => $discount->load([
                    'billingAccount.customer',
                    'billingAccount.plan',
                    'processedByUser',
                    'approvedByUser',
                    'createdByUser',
                    'updatedByUser'
                ])
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error creating discount: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create discount',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show(string $id): JsonResponse
    {
        try {
            $discount = Discount::with([
                'billingAccount.customer',
                'billingAccount.plan',
                'processedByUser',
                'approvedByUser',
                'createdByUser',
                'updatedByUser'
            ])
            ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $discount
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching discount: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Discount not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $discount = Discount::findOrFail($id);

            $validated = $request->validate([
                'account_no' => 'sometimes|exists:billing_accounts,account_no',
                'discount_amount' => 'sometimes|numeric|min:0',
                'remaining' => 'sometimes|integer|min:0',
                'status' => 'sometimes|in:Pending,Unused,Used,Permanent,Monthly',
                'processed_date' => 'sometimes|date',
                'processed_by_user_id' => 'sometimes|exists:users,id',
                'approved_by_user_id' => 'sometimes|exists:users,id',
                'remarks' => 'nullable|string',
                'invoice_used_id' => 'nullable|exists:invoices,id',
                'used_date' => 'nullable|date',
            ]);

            if (isset($validated['status']) && $validated['status'] === 'Monthly' && isset($validated['remaining']) && $validated['remaining'] <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Remaining cycles must be greater than 0 for Monthly discounts',
                    'errors' => ['remaining' => ['Remaining cycles must be greater than 0 for Monthly discounts']]
                ], 422);
            }

            DB::beginTransaction();

            $validated['updated_by_user_id'] = Auth::id();

            $discount->update($validated);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Discount updated successfully',
                'data' => $discount->load([
                    'billingAccount.customer',
                    'billingAccount.plan',
                    'processedByUser',
                    'approvedByUser',
                    'createdByUser',
                    'updatedByUser'
                ])
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error updating discount: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update discount',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(string $id): JsonResponse
    {
        try {
            $discount = Discount::findOrFail($id);

            DB::beginTransaction();

            $discount->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Discount deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error deleting discount: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete discount',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
