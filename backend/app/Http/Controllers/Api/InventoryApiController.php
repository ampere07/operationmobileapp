<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Inventory;
use App\Models\InventoryCategory;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class InventoryApiController extends Controller
{
    /**
     * Get current user email
     */
    private function getCurrentUser()
    {
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
                    'user_email' => $this->getCurrentUser()
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $formattedItems
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Inventory API Error: ' . $e->getMessage());
            
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
                    // Category doesn't exist, return error
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
            $item->supplier_id = null; // Handle supplier later if needed
            $item->quantity_alert = $request->quantity_alert ?? 0;
            $item->image_url = $request->image ?? '';
            $item->created_by_user_id = null;
            $item->updated_by_user_id = null;
            $item->save();
            
            // Load the category relationship
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
                    'user_email' => $this->getCurrentUser()
                ]
            ], 201);
            
        } catch (\Exception $e) {
            \Log::error('Inventory Store Error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
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
                    'user_email' => $this->getCurrentUser()
                ]
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Inventory Show Error: ' . $e->getMessage());
            
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
            $item->updated_by_user_id = null;
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
                    'user_email' => $this->getCurrentUser()
                ]
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Inventory Update Error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Error updating inventory item: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete an item from inventory_items table
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
            \Log::error('Inventory Delete Error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Error deleting inventory item: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get inventory statistics
     */
    public function getStatistics()
    {
        try {
            $totalItems = Inventory::count();
            $itemsWithAlerts = Inventory::where('quantity_alert', '>', 0)->count();
            $categories = Inventory::whereNotNull('category_id')->distinct('category_id')->count();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total_items' => $totalItems,
                    'items_with_alerts' => $itemsWithAlerts,
                    'total_categories' => $categories,
                    'total_suppliers' => 0
                ]
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Inventory Statistics Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching inventory statistics: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all categories
     */
    public function getCategories()
    {
        try {
            $categories = InventoryCategory::orderBy('category_name')->pluck('category_name');
            
            return response()->json([
                'success' => true,
                'data' => $categories
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Get Categories Error: ' . $e->getMessage());
            
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
        try {
            return response()->json([
                'success' => true,
                'data' => []
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Get Suppliers Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching suppliers: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Debug inventory
     */
    public function debug()
    {
        try {
            $response = [
                'items_count' => Inventory::count(),
                'categories_count' => InventoryCategory::count(),
                'sample_items' => Inventory::with('category')->take(5)->get(),
                'all_categories' => InventoryCategory::all()
            ];
            
            return response()->json([
                'success' => true,
                'data' => $response
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Debug failed: ' . $e->getMessage()
            ], 500);
        }
    }
}
