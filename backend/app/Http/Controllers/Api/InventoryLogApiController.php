<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\InventoryLog;
use App\Models\Inventory;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class InventoryLogApiController extends Controller
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
     * Get all logs
     */
    public function index()
    {
        try {
            $logs = InventoryLog::orderBy('date', 'desc')->get();
            return response()->json([
                'success' => true,
                'data' => $logs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching logs: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new log and update item quantity
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'item_id' => 'required|exists:inventory_items,id',
                'item_quantity' => 'required|integer',
                'requested_by' => 'nullable|string',
                'requested_with' => 'nullable|string',
                'requested_with_10' => 'nullable|string',
                'status' => 'nullable|string',
                'remarks' => 'nullable|string',
                'sn' => 'nullable|string',
                'account_no' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $item = Inventory::findOrFail($request->item_id);

            DB::beginTransaction();

            // Create the log
            $log = new InventoryLog();
            $log->id = (string) Str::uuid(); // Generate a UUID for the ID
            $log->date = now();
            $log->item_name = $item->item_name;
            $log->item_description = Str::limit($item->item_description, 192, ''); // Truncate to 192 chars without '...' suffix
            $log->item_id = $item->id;
            $log->item_quantity = $request->item_quantity;
            $log->requested_by = $request->requested_by;
            $log->requested_with = $request->requested_with;
            $log->requested_with_10 = $request->requested_with_10;
            $log->status = $request->status;
            $log->remarks = $request->remarks;
            $log->sn = $request->sn;
            $log->account_no = $request->account_no;
            $log->modified_by = $this->getCurrentUser();
            $log->modified_date = now();
            $log->user_email = $this->getCurrentUser();
            $log->save();

            // Update item total quantity
            // item_quantity column(inveontory_logs) + total_quantity column (inventory_items)
            $item->total_quantity = ($item->total_quantity ?? 0) + $request->item_quantity;
            $item->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Inventory log created and item quantity updated successfully',
                'data' => $log
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Inventory Log Store Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error storing inventory log: ' . $e->getMessage()
            ], 500);
        }
    }
}
