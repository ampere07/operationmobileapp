<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class NapApiController extends Controller
{
    /**
     * Get current user email from session/auth (fallback for now)
     */
    private function getCurrentUser()
    {
        // For now, return a default user - you can modify this to get from session/auth
        return 'ravenampere0123@gmail.com';
    }

    /**
     * Get all NAP items from app_nap table with pagination and search
     */
    public function index(Request $request)
    {
        try {
            // First check if table exists
            $tableExists = DB::select("SHOW TABLES LIKE 'nap'");
            if (empty($tableExists)) {
                return response()->json([
                    'success' => false,
                    'message' => 'nap table does not exist'
                ], 500);
            }

            // Get pagination parameters
            $page = (int) $request->get('page', 1);
            $limit = min((int) $request->get('limit', 10), 100); // Max 100 items per page
            $search = $request->get('search', '');
            
            $offset = ($page - 1) * $limit;

            // Build the base query
            $whereClause = '';
            $params = [];
            
            if (!empty($search)) {
                $whereClause = 'WHERE nap_name LIKE ?';
                $params[] = '%' . $search . '%';
            }

            // Get total count
            $countQuery = "SELECT COUNT(*) as total FROM nap $whereClause";
            $totalResult = DB::select($countQuery, $params);
            $totalItems = $totalResult[0]->total ?? 0;
            
            // Calculate pagination
            $totalPages = ceil($totalItems / $limit);
            
            // Get paginated data
            $dataQuery = "SELECT id, nap_name, created_at, updated_at 
                         FROM nap $whereClause 
                         ORDER BY nap_name 
                         LIMIT ? OFFSET ?";
            $dataParams = array_merge($params, [$limit, $offset]);
            
            $napItems = DB::select($dataQuery, $dataParams);
            
            return response()->json([
                'success' => true,
                'data' => $napItems,
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
            \Log::error('NAP API Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching NAP items: ' . $e->getMessage(),
                'error_details' => [
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]
            ], 500);
        }
    }

    /**
     * Store a new NAP item in app_nap table
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $name = $request->input('name');
            
            // Automatically set modified date and user
            $currentUser = $this->getCurrentUser();
            $now = now();
            
            // Check for duplicate NAP name in nap table
            $existing = DB::select('SELECT id FROM nap WHERE LOWER(nap_name) = LOWER(?)', [$name]);
            if (!empty($existing)) {
                return response()->json([
                    'success' => false,
                    'message' => 'A NAP with this name already exists'
                ], 422);
            }
            
            // Insert new NAP
            $insertData = [
                'nap_name' => $name,
                'created_at' => $now,
                'updated_at' => $now
            ];
            
            $id = DB::table('nap')->insertGetId($insertData);
            
            // Get the inserted record
            $nap = DB::select('SELECT id, nap_name, created_at, updated_at FROM nap WHERE id = ?', [$id])[0];
            
            return response()->json([
                'success' => true,
                'message' => 'NAP added successfully',
                'data' => $nap
            ], 201);
            
        } catch (\Exception $e) {
            \Log::error('NAP Store Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error adding NAP: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified NAP from app_nap table
     */
    public function show($id)
    {
        try {
            $nap = DB::select('SELECT id, nap_name, created_at, updated_at FROM nap WHERE id = ?', [$id]);
            
            if (empty($nap)) {
                return response()->json([
                    'success' => false,
                    'message' => 'NAP not found'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'data' => $nap[0]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching NAP: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified NAP in app_nap table
     */
    public function update(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if NAP exists in nap table
            $existing = DB::select('SELECT * FROM nap WHERE id = ?', [$id]);
            if (empty($existing)) {
                return response()->json([
                    'success' => false,
                    'message' => 'NAP not found'
                ], 404);
            }
            
            $name = $request->input('name');
            
            // Automatically set modified date and user
            $currentUser = $this->getCurrentUser();
            $now = now();
            
            // Check for duplicate name (excluding current NAP)
            $duplicates = DB::select('SELECT id FROM nap WHERE LOWER(nap_name) = LOWER(?) AND id != ?', [$name, $id]);
            if (!empty($duplicates)) {
                return response()->json([
                    'success' => false,
                    'message' => 'A NAP with this name already exists'
                ], 422);
            }
            
            // Update NAP
            $updateData = [
                'nap_name' => $name,
                'updated_at' => $now
            ];
            
            DB::table('nap')->where('id', $id)->update($updateData);
            
            // Get updated record
            $nap = DB::select('SELECT id, nap_name, created_at, updated_at FROM nap WHERE id = ?', [$id])[0];
            
            return response()->json([
                'success' => true,
                'message' => 'NAP updated successfully',
                'data' => $nap
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating NAP: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * HARD DELETE - Permanently remove the specified NAP from app_nap table
     */
    public function destroy($id)
    {
        try {
            // Check if NAP exists
            $existing = DB::select('SELECT * FROM nap WHERE id = ?', [$id]);
            if (empty($existing)) {
                return response()->json([
                    'success' => false,
                    'message' => 'NAP not found'
                ], 404);
            }
            
            // HARD DELETE - permanently remove from database
            $deleted = DB::table('nap')->where('id', $id)->delete();
            
            if ($deleted) {
                return response()->json([
                    'success' => true,
                    'message' => 'NAP permanently deleted from database'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to delete NAP from database'
                ], 500);
            }
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting NAP: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get NAP statistics from app_nap table
     */
    public function getStatistics()
    {
        try {
            $totalNap = DB::select("SELECT COUNT(*) as count FROM nap")[0]->count ?? 0;
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total_nap' => (int) $totalNap
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
