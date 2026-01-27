<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class JobOrderNotificationController extends Controller
{
    public function createJobOrderDoneNotification(Request $request)
    {
        try {
            $validated = $request->validate([
                'job_order_id' => 'required',
                'customer_name' => 'required|string',
                'account_no' => 'nullable|string',
                'onsite_status' => 'required|string',
                'plan_name' => 'nullable|string'
            ]);

            $notification = DB::table('job_order_notifications')->insert([
                'job_order_id' => $validated['job_order_id'],
                'customer_name' => $validated['customer_name'],
                'account_no' => $validated['account_no'] ?? null,
                'onsite_status' => $validated['onsite_status'],
                'plan_name' => $validated['plan_name'] ?? 'N/A',
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Notification created successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to create job order notification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create notification',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getRecentJobOrderNotifications(Request $request)
    {
        try {
            $limit = $request->query('limit', 10);

            $notifications = DB::table('job_order_notifications')
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get()
                ->map(function ($notification) {
                    return [
                        'id' => $notification->id,
                        'job_order_id' => $notification->job_order_id,
                        'customer_name' => $notification->customer_name,
                        'account_no' => $notification->account_no,
                        'plan_name' => $notification->plan_name ?? 'N/A',
                        'onsite_status' => $notification->onsite_status,
                        'status' => 'Job Order ' . $notification->onsite_status,
                        'is_read' => (bool) $notification->is_read,
                        'created_at' => $notification->created_at,
                        'formatted_date' => \Carbon\Carbon::parse($notification->created_at)->diffForHumans()
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $notifications
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch job order notifications: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch notifications',
                'data' => []
            ], 500);
        }
    }

    public function getUnreadCount(Request $request)
    {
        try {
            $count = DB::table('job_order_notifications')
                ->where('is_read', false)
                ->count();

            return response()->json([
                'success' => true,
                'count' => $count
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch unread notification count: ' . $e->getMessage());
            return response()->json([
                'success' => true,
                'count' => 0
            ]);
        }
    }

    public function markAsRead(Request $request, $id)
    {
        try {
            DB::table('job_order_notifications')
                ->where('id', $id)
                ->update([
                    'is_read' => true,
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Notification marked as read'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to mark notification as read: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark notification as read'
            ], 500);
        }
    }

    public function markAllAsRead(Request $request)
    {
        try {
            DB::table('job_order_notifications')
                ->where('is_read', false)
                ->update([
                    'is_read' => true,
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'All notifications marked as read'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to mark all notifications as read: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark all notifications as read'
            ], 500);
        }
    }
}
