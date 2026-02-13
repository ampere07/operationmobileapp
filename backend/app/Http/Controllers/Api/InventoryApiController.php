<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Inventory;
use App\Models\InventoryCategory;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InventoryApiController extends Controller
{
    /**
     * Get current user email
     */
    private function getCurrentUser()
    {
        if (auth()->check()) {
            return auth()->user()->email;
        }
        return 'ravenampere0123@gmail.com';
    }

    /**
     * Get all items from inventory_items table
     */
    public function index()
    {
        try {
            $items = Inventory::with('category')->orderBy('item_name')->get();
            
            $formattedItems = $items->map(function ($item) {
                return [
                    'item_name' => $item->item_name,
                    'item_description' => $item->item_description,
                    'supplier' => $item->supplier_id,
                    'quantity_alert' => $item->quantity_alert,
                    'image' => $item->image_url,
                    'category' => $item->category ? $item->category->category_name : null,
                    'category_id' => $item->category_id,
                    'item_id' => $item->id,
                    'modified_by' => $this->getCurrentUser(),
                    'modified_date' => $item->updated_at,
                    'modified_date' => $item->updated_at,
                    'user_email' => $this->getCurrentUser(),
                    'total_quantity' => $item->total_quantity
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $formattedItems
            ]);
            
        } catch (\Exception $e) {
            Log::error('Inventory API Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching inventory items: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new item in inventory_items table
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'item_name' => 'required|string|max:255|unique:inventory_items,item_name',
                'item_description' => 'nullable|string',
                'supplier' => 'nullable|string|max:255',
                'quantity_alert' => 'nullable|integer|min:0',
                'category' => 'nullable|string|max:255',
                'image' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Look up category_id from category name
            $categoryId = null;
            if ($request->has('category') && !empty($request->category)) {
                $category = InventoryCategory::where('category_name', $request->category)->first();
                if ($category) {
                    $categoryId = $category->id;
                } else {
                    return response()->json([
                        'success' => false,
                        'message' => 'Category not found: ' . $request->category
                    ], 422);
                }
            }
            
            $item = new Inventory();
            $item->item_name = $request->item_name;
            $item->item_description = $request->item_description;
            $item->category_id = $categoryId;
            $item->supplier_id = null;
            $item->quantity_alert = $request->quantity_alert ?? 0;
            $item->image_url = $request->image ?? '';
            $item->created_by_user_id = auth()->id();
            $item->updated_by_user_id = auth()->id();
            $item->save();
            
            $item->load('category');
            
            return response()->json([
                'success' => true,
                'message' => 'Inventory item added successfully',
                'data' => [
                    'item_name' => $item->item_name,
                    'item_description' => $item->item_description,
                    'supplier' => $item->supplier_id,
                    'quantity_alert' => $item->quantity_alert,
                    'image' => $item->image_url,
                    'category' => $item->category ? $item->category->category_name : null,
                    'category_id' => $item->category_id,
                    'item_id' => $item->id,
                    'modified_by' => $this->getCurrentUser(),
                    'modified_date' => $item->updated_at,
                    'modified_date' => $item->updated_at,
                    'user_email' => $this->getCurrentUser(),
                    'total_quantity' => $item->total_quantity
                ]
            ], 201);
            
        } catch (\Exception $e) {
            Log::error('Inventory Store Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error adding inventory item: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific item from inventory_items table
     */
    public function show($itemName)
    {
        try {
            $decodedItemName = urldecode($itemName);
            
            $item = Inventory::with('category')->where('item_name', $decodedItemName)->first();
            
            if (!$item) {
                return response()->json([
                    'success' => false,
                    'message' => 'Inventory item not found'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'data' => [
                    'item_name' => $item->item_name,
                    'item_description' => $item->item_description,
                    'supplier' => $item->supplier_id,
                    'quantity_alert' => $item->quantity_alert,
                    'image' => $item->image_url,
                    'category' => $item->category ? $item->category->category_name : null,
                    'category_id' => $item->category_id,
                    'item_id' => $item->id,
                    'modified_by' => $this->getCurrentUser(),
                    'modified_date' => $item->updated_at,
                    'modified_date' => $item->updated_at,
                    'user_email' => $this->getCurrentUser(),
                    'total_quantity' => $item->total_quantity
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Inventory Show Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching inventory item: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update an existing item in inventory_items table
     */
    public function update(Request $request, $itemName)
    {
        try {
            $decodedItemName = urldecode($itemName);
            
            $item = Inventory::where('item_name', $decodedItemName)->first();
            
            if (!$item) {
                return response()->json([
                    'success' => false,
                    'message' => 'Inventory item not found'
                ], 404);
            }
            
            $validator = Validator::make($request->all(), [
                'item_name' => 'required|string|max:255|unique:inventory_items,item_name,' . $item->id,
                'item_description' => 'nullable|string',
                'supplier' => 'nullable|string|max:255',
                'quantity_alert' => 'nullable|integer|min:0',
                'category' => 'nullable|string|max:255',
                'image' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Look up category_id from category name
            $categoryId = null;
            if ($request->has('category') && !empty($request->category)) {
                $category = InventoryCategory::where('category_name', $request->category)->first();
                if ($category) {
                    $categoryId = $category->id;
                } else {
                    return response()->json([
                        'success' => false,
                        'message' => 'Category not found: ' . $request->category
                    ], 422);
                }
            }
            
            $item->item_name = $request->item_name;
            $item->item_description = $request->item_description;
            $item->category_id = $categoryId;
            $item->quantity_alert = $request->quantity_alert ?? 0;
            $item->image_url = $request->image ?? '';
            $item->updated_by_user_id = auth()->id();
            $item->save();
            
            $item->load('category');
            
            return response()->json([
                'success' => true,
                'message' => 'Inventory item updated successfully',
                'data' => [
                    'item_name' => $item->item_name,
                    'item_description' => $item->item_description,
                    'supplier' => $item->supplier_id,
                    'quantity_alert' => $item->quantity_alert,
                    'image' => $item->image_url,
                    'category' => $item->category ? $item->category->category_name : null,
                    'category_id' => $item->category_id,
                    'item_id' => $item->id,
                    'modified_by' => $this->getCurrentUser(),
                    'modified_date' => $item->updated_at,
                    'modified_date' => $item->updated_at,
                    'user_email' => $this->getCurrentUser(),
                    'total_quantity' => $item->total_quantity
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Inventory Update Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error updating inventory item: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete an item from inventory_items
     */
    public function destroy($itemName)
    {
        try {
            $decodedItemName = urldecode($itemName);
            $item = Inventory::where('item_name', $decodedItemName)->first();
            
            if (!$item) {
                return response()->json([
                    'success' => false,
                    'message' => 'Inventory item not found'
                ], 404);
            }
            
            $item->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Inventory item deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Inventory Delete Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error deleting inventory item: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all categories
     */
    public function getCategories()
    {
        try {
            $categories = InventoryCategory::orderBy('category_name')->get();
            return response()->json([
                'success' => true,
                'data' => $categories
            ]);
        } catch (\Exception $e) {
            Log::error('Get Categories Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching categories: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all suppliers
     */
    public function getSuppliers()
    {
        return response()->json([
            'success' => true,
            'data' => []
        ]);
    }

    /**
     * Get statistics
     */
    public function getStatistics()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'total_items' => Inventory::count(),
                'low_stock' => Inventory::whereRaw('id in (select item_id from inventory_logs group by item_id having sum(item_quantity) < 10)')->count() // dummy logic
            ]
        ]);
    }

    /**
     * Debug method
     */
    public function debug()
    {
        return response()->json([
            'success' => true,
            'message' => 'Inventory API is working'
        ]);
    }

    /**
     * Upload an image for inventory item
     */
    public function uploadImage(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'image' => 'required|image|max:10240', // Max 10MB
                'folder_name' => 'nullable|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $folderName = $request->input('folder_name', 'Inventory Items');
            $driveService = new \App\Services\GoogleDriveService();
            
            $folderId = $driveService->createFolder($folderName);

            $file = $request->file('image');
            $fileName = 'inventory_' . time() . '_' . $file->getClientOriginalName();
            
            $imageUrl = $driveService->uploadFile(
                $file,
                $folderId,
                $fileName,
                $file->getMimeType()
            );

            if (strpos($imageUrl, 'drive.google.com') !== false && strpos($imageUrl, '/view') === false) {
                 if (!preg_match('/\/view$/', $imageUrl) && !preg_match('/\/view\?/', $imageUrl)) {
                     $imageUrl = rtrim($imageUrl, '/') . '/view';
                 }
            }

            return response()->json([
                'success' => true,
                'message' => 'Image uploaded successfully',
                'url' => $imageUrl
            ]);

        } catch (\Exception $e) {
            Log::error('Inventory Image Upload Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error uploading image: ' . $e->getMessage()
            ], 500);
        }
    }
}

