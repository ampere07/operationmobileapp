<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\InventoryCategory;
use Illuminate\Support\Facades\Validator;
use App\Models\ActivityLog;
use App\Events\InventoryCategoryUpdated;

class InventoryCategoryApiController extends Controller
{
    private function getCurrentUser(Request $request)
    {
        if ($request->has('user_email')) {
            return $request->user_email;
        }
        if ($request->has('modified_by')) {
            return $request->modified_by;
        }
        if ($request->has('modifiedBy')) {
            return $request->modifiedBy;
        }
        if (auth()->check()) {
            return auth()->user()->email;
        }
        throw new \Exception('Unauthenticated: User email is required for this operation.');
    }

    private function resolveUserId(Request $request)
    {
        $email = $request->modified_by ?? $request->modifiedBy ?? $request->user_email;
        if (!$email && auth()->check()) {
            $email = auth()->user()->email;
        }

        if ($email) {
            $user = \App\Models\User::where('email', $email)->first();
            if ($user) return $user->id;
            throw new \Exception("User not found with email: {$email}");
        }
        
        if (auth()->check()) return auth()->id();
        
        throw new \Exception('Unauthenticated: User identification is required for this operation.');
    }

    public function index(Request $request)
    {
        try {
            $categories = InventoryCategory::orderBy('id', 'desc')->get();
            $formattedCategories = $categories->map(function ($category) use ($request) {
                return [
                    'id' => $category->id,
                    'name' => $category->category_name,
                    'created_at' => $category->created_at,
                    'updated_at' => $category->updated_at,
                    'modified_date' => $category->updated_at,
                    'modified_by' => $this->getCurrentUser($request)
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
            $userId = $this->resolveUserId($request);
            $category->created_by_user_id = $userId;
            $category->updated_by_user_id = $userId;
            $category->save();
            
            // Log Activity
            ActivityLog::log(
                'Inventory Category Created',
                "New inventory category created: {$category->category_name}",
                'info',
                [
                    'resource_type' => 'InventoryCategory',
                    'resource_id' => $category->id,
                    'additional_data' => $category->toArray()
                ]
            );
            
            event(new InventoryCategoryUpdated(['action' => 'created', 'category_id' => $category->id, 'name' => $category->category_name]));

            return response()->json([
                'success' => true,
                'message' => 'Inventory category added successfully',
                'data' => [
                    'id' => $category->id,
                    'name' => $category->category_name,
                    'created_at' => $category->created_at,
                    'updated_at' => $category->updated_at,
                    'modified_by' => $this->getCurrentUser($request),
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

    public function show(Request $request, $id)
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
                    'modified_by' => $this->getCurrentUser($request)
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
            $category->updated_by_user_id = $this->resolveUserId($request);
            $category->save();
            
            // Log Activity
            ActivityLog::log(
                'Inventory Category Updated',
                "Inventory category updated: {$category->category_name} (ID: {$id})",
                'info',
                [
                    'resource_type' => 'InventoryCategory',
                    'resource_id' => $category->id,
                    'additional_data' => $category->toArray()
                ]
            );
            
            event(new InventoryCategoryUpdated(['action' => 'updated', 'category_id' => $category->id, 'name' => $category->category_name]));

            return response()->json([
                'success' => true,
                'message' => 'Inventory category updated successfully',
                'data' => [
                    'id' => $category->id,
                    'name' => $category->category_name,
                    'created_at' => $category->created_at,
                    'updated_at' => $category->updated_at,
                    'modified_date' => $category->updated_at,
                    'modified_by' => $this->getCurrentUser($request)
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
            $categoryData = $category->toArray();
            $categoryName = $category->category_name;
            $category->delete();
            
            // Log Activity
            ActivityLog::log(
                'Inventory Category Deleted',
                "Inventory category deleted: {$categoryName} (ID: {$id})",
                'warning',
                [
                    'resource_type' => 'InventoryCategory',
                    'resource_id' => $id,
                    'additional_data' => $categoryData
                ]
            );
            
            event(new InventoryCategoryUpdated(['action' => 'deleted', 'category_id' => $id, 'name' => $categoryName]));

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
