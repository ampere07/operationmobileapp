<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LCPNAPLocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

class LCPNAPApiController extends Controller
{
    public function index(Request $request)
    {
        try {
            $page = $request->input('page', 1);
            $limit = $request->input('limit', 100);
            $search = $request->input('search', '');

            $query = LCPNAPLocation::query();

            if ($search) {
                $query->where('lcpnap_name', 'LIKE', "%{$search}%");
            }

            $total = $query->count();
            
            $locations = $query->skip(($page - 1) * $limit)
                ->take($limit)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $locations,
                'pagination' => [
                    'current_page' => (int) $page,
                    'total_pages' => (int) ceil($total / $limit),
                    'total_items' => $total,
                    'per_page' => (int) $limit,
                    'from' => (($page - 1) * $limit) + 1,
                    'to' => min($page * $limit, $total)
                ]
            ]);

        } catch (Exception $e) {
            Log::error('LCP/NAP API error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch LCP/NAP records',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $location = LCPNAPLocation::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $location
            ]);

        } catch (Exception $e) {
            Log::error('LCP/NAP show error', [
                'id' => $id,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'LCP/NAP record not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'lcpnap_name' => 'required|string|max:255',
            ]);

            $location = LCPNAPLocation::create($validated);

            return response()->json([
                'success' => true,
                'message' => 'LCP/NAP record created successfully',
                'data' => $location
            ], 201);

        } catch (Exception $e) {
            Log::error('LCP/NAP create error', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create LCP/NAP record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $location = LCPNAPLocation::findOrFail($id);

            $validated = $request->validate([
                'lcpnap_name' => 'sometimes|required|string|max:255',
            ]);

            $location->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'LCP/NAP record updated successfully',
                'data' => $location
            ]);

        } catch (Exception $e) {
            Log::error('LCP/NAP update error', [
                'id' => $id,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update LCP/NAP record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $location = LCPNAPLocation::findOrFail($id);
            $location->delete();

            return response()->json([
                'success' => true,
                'message' => 'LCP/NAP record deleted successfully'
            ]);

        } catch (Exception $e) {
            Log::error('LCP/NAP delete error', [
                'id' => $id,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete LCP/NAP record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getStatistics()
    {
        try {
            $total = LCPNAPLocation::count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_locations' => $total,
                ]
            ]);

        } catch (Exception $e) {
            Log::error('LCP/NAP statistics error', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getLookupData()
    {
        try {
            $lcpnaps = LCPNAPLocation::select('id', 'lcpnap_name')->get();

            return response()->json([
                'success' => true,
                'data' => $lcpnaps
            ]);

        } catch (Exception $e) {
            Log::error('LCP/NAP lookup error', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch lookup data',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
