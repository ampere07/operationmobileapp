<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class WorkOrderApiController extends Controller
{
    public function index(Request $request)
    {
        try {
            $page = (int) $request->get('page', 1);
            $limit = min((int) $request->get('limit', 50), 100);
            $search = $request->get('search', '');
            $status = $request->get('status', '');
            
            $query = WorkOrder::query();
            
            if (!empty($search)) {
                $query->where(function($q) use ($search) {
                    $q->where('instructions', 'like', '%' . $search . '%')
                      ->orWhere('report_to', 'like', '%' . $search . '%')
                      ->orWhere('assign_to', 'like', '%' . $search . '%')
                      ->orWhere('requested_by', 'like', '%' . $search . '%');
                });
            }
            
            if (!empty($status) && strtolower($status) !== 'all') {
                $query->where('work_status', $status);
            }
            
            $totalItems = $query->count();
            $totalPages = ceil($totalItems / $limit);
            
            $workOrders = $query->orderBy('requested_date', 'desc')
                             ->skip(($page - 1) * $limit)
                             ->take($limit)
                             ->get();
            
            return response()->json([
                'success' => true,
                'data' => $workOrders,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => max(1, $totalPages),
                    'total_items' => $totalItems,
                    'items_per_page' => $limit,
                    'has_next' => $page < $totalPages,
                    'has_prev' => $page > 1
                ]
            ]);
            
        } catch (\Exception $e) {
            \Log::error('WorkOrder API Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching work orders: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'instructions' => 'required|string',
                'report_to' => 'required|string|max:255',
                'assign_to' => 'nullable|string|max:255',
                'remarks' => 'nullable|string',
                'work_status' => 'nullable|string|max:100',
                'work_category' => 'nullable|string|max:255',
                'requested_by' => 'required|string|max:255',
                'updated_by' => 'nullable|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $workOrder = new WorkOrder();
            
            $data = $request->except(['image_1', 'image_2', 'image_3', 'signature']);
            $workOrder->fill($data);
            
            if (!$request->has('work_status')) {
                $workOrder->work_status = 'Pending';
            }

            // Handle file uploads
            $uploadPath = 'work_orders';
            
            if ($request->hasFile('image_1')) {
                $file = $request->file('image_1');
                $filename = time() . '_img1.' . $file->getClientOriginalExtension();
                $file->move(public_path($uploadPath), $filename);
                $workOrder->image_1 = '/' . $uploadPath . '/' . $filename;
            }
            
            if ($request->hasFile('image_2')) {
                $file = $request->file('image_2');
                $filename = time() . '_img2.' . $file->getClientOriginalExtension();
                $file->move(public_path($uploadPath), $filename);
                $workOrder->image_2 = '/' . $uploadPath . '/' . $filename;
            }
            
            if ($request->hasFile('image_3')) {
                $file = $request->file('image_3');
                $filename = time() . '_img3.' . $file->getClientOriginalExtension();
                $file->move(public_path($uploadPath), $filename);
                $workOrder->image_3 = '/' . $uploadPath . '/' . $filename;
            }
            
            if ($request->hasFile('signature')) {
                $file = $request->file('signature');
                $filename = time() . '_sig.' . $file->getClientOriginalExtension();
                $file->move(public_path($uploadPath), $filename);
                $workOrder->signature = '/' . $uploadPath . '/' . $filename;
            }

            $workOrder->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Work order created successfully',
                'data' => $workOrder
            ], 201);
            
        } catch (\Exception $e) {
            \Log::error('WorkOrder Store Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error adding work order: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $workOrder = WorkOrder::find($id);
            
            if (!$workOrder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Work order not found'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'data' => $workOrder
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching work order: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'instructions' => 'nullable|string',
                'report_to' => 'nullable|string|max:255',
                'assign_to' => 'nullable|string|max:255',
                'remarks' => 'nullable|string',
                'work_status' => 'nullable|string|max:100',
                'work_category' => 'nullable|string|max:255',
                'updated_by' => 'nullable|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $workOrder = WorkOrder::find($id);
            if (!$workOrder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Work order not found'
                ], 404);
            }
            
            $data = $request->only([
                'instructions', 'report_to', 'assign_to', 'remarks', 
                'work_status', 'work_category', 'updated_by'
            ]);
            
            $workOrder->fill($data);

            $driveService = new \App\Services\GoogleDriveService();
            $folderName = 'WorkOrder_' . $workOrder->id;
            
            $images = ['image_1', 'image_2', 'image_3', 'signature'];
            $folderId = null;

            foreach ($images as $imgField) {
                if ($request->hasFile($imgField)) {
                    if (!$folderId) {
                        $folderId = $driveService->createFolder($folderName);
                    }
                    
                    $file = $request->file($imgField);
                    $fileName = 'workorder_' . $workOrder->id . '_' . time() . '_' . $file->getClientOriginalName();
                    
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
                    $workOrder->$imgField = $imageUrl;
                }
            }

            $workOrder->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Work order updated successfully',
                'data' => $workOrder
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating work order: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $workOrder = WorkOrder::find($id);
            if (!$workOrder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Work order not found'
                ], 404);
            }
            
            $workOrder->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Work order permanently deleted from database'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting work order: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStatistics()
    {
        try {
            $total = WorkOrder::count();
            $pending = WorkOrder::where('work_status', 'Pending')->count();
            $completed = WorkOrder::where('work_status', 'Completed')->count();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total_work_orders' => $total,
                    'pending' => $pending,
                    'completed' => $completed
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
