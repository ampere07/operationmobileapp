<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkOrderCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class WorkOrderCategoryApiController extends Controller
{
    public function index(Request $request)
    {
        try {
            $page = (int) $request->get('page', 1);
            $limit = min((int) $request->get('limit', 100), 100);
            $search = $request->get('search', '');
            
            $query = WorkOrderCategory::query();
            
            if (!empty($search)) {
                $query->where('category', 'like', '%' . $search . '%');
            }
            
            $totalItems = $query->count();
            $totalPages = ceil($totalItems / $limit);
            
            $categories = $query->orderBy('category')
                             ->skip(($page - 1) * $limit)
                             ->take($limit)
                             ->get();
            
            return response()->json([
                'success' => true,
                'data' => $categories,
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
            \Log::error('WorkOrderCategory API Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching work categories: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'category' => 'required|string|max:255|unique:work_order_category,category',
                'created_by' => 'nullable|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $category = new WorkOrderCategory();
            $category->category = $request->input('category');
            $category->created_by = $request->input('created_by', 'system');
            $category->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Work category added successfully',
                'data' => $category
            ], 201);
            
        } catch (\Exception $e) {
            \Log::error('WorkOrderCategory Store Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error adding work category: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $category = WorkOrderCategory::find($id);
            
            if (!$category) {
                return response()->json([
                    'success' => false,
                    'message' => 'Work category not found'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'data' => $category
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching work category: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'category' => 'required|string|max:255|unique:work_order_category,category,' . $id,
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $category = WorkOrderCategory::find($id);
            if (!$category) {
                return response()->json([
                    'success' => false,
                    'message' => 'Work category not found'
                ], 404);
            }
            
            $category->category = $request->input('category');
            $category->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Work category updated successfully',
                'data' => $category
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating work category: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $category = WorkOrderCategory::find($id);
            if (!$category) {
                return response()->json([
                    'success' => false,
                    'message' => 'Work category not found'
                ], 404);
            }
            
            $category->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Work category permanently deleted from database'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting work category: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStatistics()
    {
        try {
            $total = WorkOrderCategory::count();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total_work_categories' => $total
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
