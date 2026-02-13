<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LCP;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class LcpApiController extends Controller
{
    private function getCurrentUser()
    {
        return 'ravenampere0123@gmail.com';
    }

    public function index(Request $request)
    {
        try {
            $page = (int) $request->get('page', 1);
            $limit = min((int) $request->get('limit', 10), 100);
            $search = $request->get('search', '');
            
            $query = LCP::query();
            
            if (!empty($search)) {
                $query->where('lcp_name', 'like', '%' . $search . '%');
            }
            
            $totalItems = $query->count();
            $totalPages = ceil($totalItems / $limit);
            
            $lcpItems = $query->orderBy('lcp_name')
                             ->skip(($page - 1) * $limit)
                             ->take($limit)
                             ->get();
            
            return response()->json([
                'success' => true,
                'data' => $lcpItems,
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
            \Log::error('LCP API Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching LCP items: ' . $e->getMessage()
            ], 500);
        }
    }

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
            
            $existing = LCP::where('lcp_name', $name)->first();
            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'A LCP with this name already exists'
                ], 422);
            }
            
            $lcp = new LCP();
            $lcp->lcp_name = $name;
            $lcp->save();
            
            return response()->json([
                'success' => true,
                'message' => 'LCP added successfully',
                'data' => $lcp
            ], 201);
            
        } catch (\Exception $e) {
            \Log::error('LCP Store Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error adding LCP: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $lcp = LCP::find($id);
            
            if (!$lcp) {
                return response()->json([
                    'success' => false,
                    'message' => 'LCP not found'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'data' => $lcp
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching LCP: ' . $e->getMessage()
            ], 500);
        }
    }

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

            $lcp = LCP::find($id);
            if (!$lcp) {
                return response()->json([
                    'success' => false,
                    'message' => 'LCP not found'
                ], 404);
            }
            
            $name = $request->input('name');
            
            $duplicate = LCP::where('lcp_name', $name)->where('id', '!=', $id)->first();
            if ($duplicate) {
                return response()->json([
                    'success' => false,
                    'message' => 'A LCP with this name already exists'
                ], 422);
            }
            
            $lcp->lcp_name = $name;
            $lcp->save();
            
            return response()->json([
                'success' => true,
                'message' => 'LCP updated successfully',
                'data' => $lcp
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating LCP: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $lcp = LCP::find($id);
            if (!$lcp) {
                return response()->json([
                    'success' => false,
                    'message' => 'LCP not found'
                ], 404);
            }
            
            $lcp->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'LCP permanently deleted from database'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting LCP: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStatistics()
    {
        try {
            $totalLcp = LCP::count();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total_lcp' => $totalLcp
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

