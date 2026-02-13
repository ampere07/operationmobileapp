<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PlanApiController extends Controller
{
    private function getCurrentUserId()
    {
        $user = DB::table('users')->first();
        return $user ? $user->id : null;
    }

    public function index()
    {
        try {
            $plans = DB::table('plan_list')
                ->select(
                    'id',
                    'plan_name as name',
                    'description',
                    'price',
                    'modified_date',
                    'modified_by_user as modified_by'
                )
                ->orderBy('plan_name')
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $plans
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Plan API Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching plans: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255|unique:plan_list,plan_name',
                'description' => 'nullable|string',
                'price' => 'required|numeric|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $currentUserId = $this->getCurrentUserId();
            $now = now();
            
            $planId = DB::table('plan_list')->insertGetId([
                'plan_name' => $request->input('name'),
                'description' => $request->input('description', ''),
                'price' => $request->input('price'),
                'modified_date' => $now,
                'modified_by_user' => $currentUserId
            ]);
            
            $plan = DB::table('plan_list')
                ->select(
                    'id',
                    'plan_name as name',
                    'description',
                    'price',
                    'modified_date',
                    'modified_by_user_id as modified_by'
                )
                ->where('id', $planId)
                ->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Plan added successfully',
                'data' => $plan
            ], 201);
            
        } catch (\Exception $e) {
            \Log::error('Plan Store Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error adding plan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $plan = DB::table('plan_list')
                ->select(
                    'id',
                    'plan_name as name',
                    'description',
                    'price',
                    'modified_date',
                    'modified_by_user as modified_by'
                )
                ->where('id', $id)
                ->first();
            
            if (!$plan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Plan not found'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'data' => $plan
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching plan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'price' => 'required|numeric|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $existing = DB::table('plan_list')->where('id', $id)->first();
            if (!$existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Plan not found'
                ], 404);
            }
            
            $duplicate = DB::table('plan_list')
                ->where('plan_name', $request->input('name'))
                ->where('id', '!=', $id)
                ->first();
                
            if ($duplicate) {
                return response()->json([
                    'success' => false,
                    'message' => 'A plan with this name already exists'
                ], 422);
            }
            
            $currentUserId = $this->getCurrentUserId();
            $now = now();
            
            DB::table('plan_list')
                ->where('id', $id)
                ->update([
                    'plan_name' => $request->input('name'),
                    'description' => $request->input('description', ''),
                    'price' => $request->input('price'),
                    'modified_date' => $now,
                    'modified_by_user' => $currentUserId
                ]);
            
            $plan = DB::table('plan_list')
                ->select(
                    'id',
                    'plan_name as name',
                    'description',
                    'price',
                    'modified_date',
                    'modified_by_user as modified_by'
                )
                ->where('id', $id)
                ->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Plan updated successfully',
                'data' => $plan
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating plan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $existing = DB::table('plan_list')->where('id', $id)->first();
            if (!$existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Plan not found'
                ], 404);
            }
            
            DB::table('plan_list')->where('id', $id)->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Plan permanently deleted from database'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting plan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStatistics()
    {
        try {
            $totalPlans = DB::table('plan_list')->count();
            $avgPrice = DB::table('plan_list')->avg('price') ?? 0;
            $minPrice = DB::table('plan_list')->min('price') ?? 0;
            $maxPrice = DB::table('plan_list')->max('price') ?? 0;
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total_plans' => $totalPlans,
                    'average_price' => round($avgPrice, 2),
                    'min_price' => $minPrice,
                    'max_price' => $maxPrice
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error getting statistics: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getAllPlans()
    {
        return $this->index();
    }

    public function restore($id)
    {
        return response()->json([
            'success' => false,
            'message' => 'Restore not implemented - using hard deletes'
        ], 501);
    }

    public function forceDelete($id)
    {
        return $this->destroy($id);
    }
}

