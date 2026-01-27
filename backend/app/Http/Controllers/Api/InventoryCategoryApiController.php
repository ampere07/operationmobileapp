<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\InventoryCategory;
use Illuminate\Support\Facades\Validator;

class InventoryCategoryApiController extends Controller
{
    public function index()
    {
        try {
            $categories = InventoryCategory::orderBy('id', 'desc')->get();
            $formattedCategories = $categories->map(function ($category) {
                return [
                    'id' => $category->id,
                    'name' => $category->category_name,
                    'created_at' => $category->created_at,
                    'updated_at' => $category->updated_at,
                    'modified_date' => $category->updated_at,
                    'modified_by' => 'admin'
                ];
            });
            return response()->json([
                'success' => true,
                'data' => $formattedCategories
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching inventory categories: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:inventory_category,category_name'
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        
        try {
            $category = new InventoryCategory();
            $category->category_name = $request->name;
            $category->created_by_user_id = $request->created_by_user_id ?? null;
            $category->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Inventory category added successfully',
                'data' => [
                    'id' => $category->id,
                    'name' => $category->category_name,
                    'created_at' => $category->created_at,
                    'updated_at' => $category->updated_at,
                    'modified_by' => $request->modified_by ?? 'system',
                    'modified_date' => $category->updated_at
                ]
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error adding inventory category: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $category = InventoryCategory::findOrFail($id);
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $category->id,
                    'name' => $category->category_name,
                    'created_at' => $category->created_at,
                    'updated_at' => $category->updated_at,
                    'modified_date' => $category->updated_at,
                    'modified_by' => 'admin'
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Inventory category not found'
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:inventory_category,category_name,' . $id
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        
        try {
            $category = InventoryCategory::findOrFail($id);
            $category->category_name = $request->name;
            $category->updated_by_user_id = $request->updated_by_user_id ?? null;
            $category->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Inventory category updated successfully',
                'data' => [
                    'id' => $category->id,
                    'name' => $category->category_name,
                    'created_at' => $category->created_at,
                    'updated_at' => $category->updated_at,
                    'modified_date' => $category->updated_at,
                    'modified_by' => $request->modified_by ?? 'admin'
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating inventory category: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $category = InventoryCategory::findOrFail($id);
            $category->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Inventory category deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting inventory category: ' . $e->getMessage()
            ], 500);
        }
    }
}
