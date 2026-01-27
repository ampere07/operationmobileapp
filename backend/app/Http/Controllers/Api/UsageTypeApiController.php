<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UsageType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class UsageTypeApiController extends Controller
{
    private function getCurrentUser()
    {
        return 'ravenampere0123@gmail.com';
    }

    public function index(Request $request)
    {
        try {
            $page = (int) $request->get('page', 1);
            $limit = min((int) $request->get('limit', 100), 100);
            $search = $request->get('search', '');
            
            $query = UsageType::query();
            
            if (!empty($search)) {
                $query->where('usage_name', 'like', '%' . $search . '%');
            }
            
            $totalItems = $query->count();
            $totalPages = ceil($totalItems / $limit);
            
            $usageTypes = $query->orderBy('usage_name')
                             ->skip(($page - 1) * $limit)
                             ->take($limit)
                             ->get();
            
            return response()->json([
                'success' => true,
                'data' => $usageTypes,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_items' => $totalItems,
                    'items_per_page' => $limit,
                    'has_next' => $page < $totalPages,
                    'has_prev' => $page > 1
                ]
            ]);
            
        } catch (\Exception $e) {
            \Log::error('UsageType API Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching usage types: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'usage_name' => 'required|string|max:255|unique:usage_type,usage_name',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $usageType = new UsageType();
            $usageType->usage_name = $request->input('usage_name');
            $usageType->created_by_user_id = 1;
            $usageType->updated_by_user_id = 1;
            $usageType->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Usage type added successfully',
                'data' => $usageType
            ], 201);
            
        } catch (\Exception $e) {
            \Log::error('UsageType Store Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error adding usage type: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $usageType = UsageType::find($id);
            
            if (!$usageType) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usage type not found'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'data' => $usageType
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching usage type: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'usage_name' => 'required|string|max:255|unique:usage_type,usage_name,' . $id,
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $usageType = UsageType::find($id);
            if (!$usageType) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usage type not found'
                ], 404);
            }
            
            $usageType->usage_name = $request->input('usage_name');
            $usageType->updated_by_user_id = 1;
            $usageType->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Usage type updated successfully',
                'data' => $usageType
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating usage type: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $usageType = UsageType::find($id);
            if (!$usageType) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usage type not found'
                ], 404);
            }
            
            $usageType->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Usage type permanently deleted from database'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting usage type: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStatistics()
    {
        try {
            $totalUsageTypes = UsageType::count();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total_usage_types' => $totalUsageTypes
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error getting statistics: ' . $e->getMessage()
            ], 500);
        }
    }
}
