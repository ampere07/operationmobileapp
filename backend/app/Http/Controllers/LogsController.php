<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class LogsController extends Controller
{
    public function index(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'level' => 'nullable|string|in:info,warning,error,debug',
                'action' => 'nullable|string',
                'user_id' => 'nullable|integer',
                'resource_type' => 'nullable|string',
                'search' => 'nullable|string',
                'per_page' => 'nullable|integer|min:1|max:100',
                'page' => 'nullable|integer|min:1',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $query = ActivityLog::with(['user:user_id,username,full_name', 'targetUser:user_id,username,full_name'])
                ->orderBy('created_at', 'desc');

            // Apply filters
            if ($request->filled('level')) {
                $query->byLevel($request->level);
            }

            if ($request->filled('action')) {
                $query->byAction($request->action);
            }

            if ($request->filled('user_id')) {
                $query->byUser($request->user_id);
            }

            if ($request->filled('resource_type')) {
                $query->byResourceType($request->resource_type);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('message', 'like', "%{$search}%")
                      ->orWhere('action', 'like', "%{$search}%")
                      ->orWhereHas('user', function ($userQuery) use ($search) {
                          $userQuery->where('username', 'like', "%{$search}%")
                                   ->orWhere('full_name', 'like', "%{$search}%");
                      });
                });
            }

            // Default to recent logs (last 30 days) if no specific date range
            if (!$request->filled('all_time')) {
                $query->recent(30);
            }

            $perPage = $request->get('per_page', 50);
            $logs = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $logs->items(),
                'pagination' => [
                    'current_page' => $logs->currentPage(),
                    'last_page' => $logs->lastPage(),
                    'per_page' => $logs->perPage(),
                    'total' => $logs->total(),
                    'from' => $logs->firstItem(),
                    'to' => $logs->lastItem(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch logs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $log = ActivityLog::with(['user:user_id,username,full_name', 'targetUser:user_id,username,full_name'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $log
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Log not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function getStats(Request $request)
    {
        try {
            $days = $request->get('days', 7);

            $stats = [
                'total_logs' => ActivityLog::recent($days)->count(),
                'by_level' => [
                    'info' => ActivityLog::recent($days)->byLevel('info')->count(),
                    'warning' => ActivityLog::recent($days)->byLevel('warning')->count(),
                    'error' => ActivityLog::recent($days)->byLevel('error')->count(),
                    'debug' => ActivityLog::recent($days)->byLevel('debug')->count(),
                ],
                'recent_actions' => ActivityLog::recent($days)
                    ->select('action')
                    ->selectRaw('COUNT(*) as count')
                    ->groupBy('action')
                    ->orderBy('count', 'desc')
                    ->limit(10)
                    ->get(),
                'active_users' => ActivityLog::recent($days)
                    ->whereNotNull('user_id')
                    ->with('user:user_id,username,full_name')
                    ->select('user_id')
                    ->selectRaw('COUNT(*) as activity_count')
                    ->groupBy('user_id')
                    ->orderBy('activity_count', 'desc')
                    ->limit(10)
                    ->get(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch log statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function export(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'format' => 'nullable|string|in:json,csv',
                'level' => 'nullable|string|in:info,warning,error,debug',
                'action' => 'nullable|string',
                'days' => 'nullable|integer|min:1|max:365',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $format = $request->get('format', 'json');
            $days = $request->get('days', 30);

            $query = ActivityLog::with(['user:user_id,username,full_name', 'targetUser:user_id,username,full_name'])
                ->recent($days)
                ->orderBy('created_at', 'desc');

            if ($request->filled('level')) {
                $query->byLevel($request->level);
            }

            if ($request->filled('action')) {
                $query->byAction($request->action);
            }

            $logs = $query->limit(1000)->get(); // Limit export to 1000 records for performance

            if ($format === 'csv') {
                $filename = 'activity_logs_' . now()->format('Y-m-d_H-i-s') . '.csv';
                
                $headers = [
                    'Content-Type' => 'text/csv',
                    'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                ];

                $callback = function () use ($logs) {
                    $file = fopen('php://output', 'w');
                    
                    // Add CSV headers
                    fputcsv($file, [
                        'ID', 'Level', 'Action', 'Message', 'User', 'Target User', 
                        'Resource Type', 'Resource ID', 'IP Address', 'Date/Time'
                    ]);

                    foreach ($logs as $log) {
                        fputcsv($file, [
                            $log->log_id,
                            $log->level,
                            $log->action,
                            $log->message,
                            $log->user ? $log->user->username : 'System',
                            $log->targetUser ? $log->targetUser->username : '',
                            $log->resource_type,
                            $log->resource_id,
                            $log->ip_address,
                            $log->created_at->format('Y-m-d H:i:s')
                        ]);
                    }
                    
                    fclose($file);
                };

                return response()->stream($callback, 200, $headers);
            }

            // Default JSON export
            return response()->json([
                'success' => true,
                'data' => $logs,
                'export_info' => [
                    'format' => 'json',
                    'total_records' => $logs->count(),
                    'export_date' => now()->toISOString(),
                    'date_range' => $days . ' days'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to export logs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function clear(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'older_than_days' => 'nullable|integer|min:1',
                'level' => 'nullable|string|in:info,warning,error,debug',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $query = ActivityLog::query();

            if ($request->filled('older_than_days')) {
                $query->where('created_at', '<', now()->subDays($request->older_than_days));
            }

            if ($request->filled('level')) {
                $query->byLevel($request->level);
            }

            $deletedCount = $query->delete();

            return response()->json([
                'success' => true,
                'message' => "Cleared {$deletedCount} log entries",
                'deleted_count' => $deletedCount
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to clear logs',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
