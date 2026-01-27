<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Port;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PortApiController extends Controller
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
            $excludeUsed = $request->get('exclude_used', false);
            $currentJobOrderId = $request->get('current_job_order_id', null);
            $lcpnap = $request->get('lcpnap', '');
            
            $query = Port::query();
            
            if (!empty($search)) {
                $query->where('PORT_ID', 'like', '%' . $search . '%');
            }
            
            if ($excludeUsed && !empty($lcpnap)) {
                $usedPortsQuery = \DB::table('job_orders')
                    ->whereNotNull('PORT')
                    ->whereNotNull('LCPNAP')
                    ->where('PORT', '!=', '')
                    ->where('LCPNAP', '=', $lcpnap);
                
                if ($currentJobOrderId) {
                    $usedPortsQuery->where('id', '!=', $currentJobOrderId);
                }
                
                $usedPorts = $usedPortsQuery->pluck('PORT')->toArray();
                
                if (!empty($usedPorts)) {
                    $query->whereNotIn('Label', $usedPorts);
                }
            }
            
            $totalItems = $query->count();
            $totalPages = ceil($totalItems / $limit);
            
            $portItems = $query->orderBy('Label')
                             ->skip(($page - 1) * $limit)
                             ->take($limit)
                             ->get();
            
            return response()->json([
                'success' => true,
                'data' => $portItems,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_items' => $totalItems,
                    'items_per_page' => $limit,
                    'has_next' => $page < $totalPages,
                    'has_prev' => $page > 1
                ],
                'filters' => [
                    'lcpnap' => $lcpnap,
                    'exclude_used' => $excludeUsed,
                    'current_job_order_id' => $currentJobOrderId
                ]
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Port API Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching Port items: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'label' => 'required|string|max:255',
                'port_id' => 'required|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $label = $request->input('label');
            $portId = $request->input('port_id');
            
            $existing = Port::where('PORT_ID', $portId)->first();
            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'A Port with this PORT_ID already exists'
                ], 422);
            }
            
            $port = new Port();
            $port->PORT_ID = $portId;
            $port->Label = $label;
            $port->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Port added successfully',
                'data' => $port
            ], 201);
            
        } catch (\Exception $e) {
            \Log::error('Port Store Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error adding Port: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $port = Port::find($id);
            
            if (!$port) {
                return response()->json([
                    'success' => false,
                    'message' => 'Port not found'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'data' => $port
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching Port: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'label' => 'required|string|max:255',
                'port_id' => 'required|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $port = Port::find($id);
            if (!$port) {
                return response()->json([
                    'success' => false,
                    'message' => 'Port not found'
                ], 404);
            }
            
            $label = $request->input('label');
            $portId = $request->input('port_id');
            
            $duplicate = Port::where('PORT_ID', $portId)->where('id', '!=', $id)->first();
            if ($duplicate) {
                return response()->json([
                    'success' => false,
                    'message' => 'A Port with this PORT_ID already exists'
                ], 422);
            }
            
            $port->PORT_ID = $portId;
            $port->Label = $label;
            $port->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Port updated successfully',
                'data' => $port
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating Port: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $port = Port::find($id);
            if (!$port) {
                return response()->json([
                    'success' => false,
                    'message' => 'Port not found'
                ], 404);
            }
            
            $port->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Port permanently deleted from database'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting Port: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStatistics()
    {
        try {
            $totalPort = Port::count();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total_port' => $totalPort
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
