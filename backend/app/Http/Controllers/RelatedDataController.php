<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RelatedDataController extends Controller
{
    /**
     * Get related invoices by account number
     */
    public function getInvoicesByAccount(string $accountNo): JsonResponse
    {
        try {
            $invoices = DB::table('invoices')
                ->where('account_no', $accountNo)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $invoices,
                'count' => $invoices->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching invoices for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch invoices',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related payment portal logs by account number
     */
    public function getPaymentPortalLogsByAccount(string $accountNo): JsonResponse
    {
        try {
            $logs = DB::table('payment_portal_logs')
                ->where('account_id', $accountNo)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'count' => $logs->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching payment portal logs for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment portal logs',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related transactions by account number
     */
    public function getTransactionsByAccount(string $accountNo): JsonResponse
    {
        try {
            $transactions = DB::table('transactions')
                ->where('account_no', $accountNo)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $transactions,
                'count' => $transactions->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching transactions for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch transactions',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related staggered installations by account number
     */
    public function getStaggeredByAccount(string $accountNo): JsonResponse
    {
        try {
            $staggered = DB::table('staggered_installation')
                ->where('account_no', $accountNo)
                ->orderBy('staggered_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $staggered,
                'count' => $staggered->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching staggered installations for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch staggered installations',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related discounts by account number
     */
    public function getDiscountsByAccount(string $accountNo): JsonResponse
    {
        try {
            $discounts = DB::table('discounts')
                ->where('account_no', $accountNo)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $discounts,
                'count' => $discounts->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching discounts for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch discounts',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related service orders by account number
     */
    public function getServiceOrdersByAccount(string $accountNo): JsonResponse
    {
        try {
            $serviceOrders = DB::table('service_orders')
                ->where('account_no', $accountNo)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $serviceOrders,
                'count' => $serviceOrders->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching service orders for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service orders',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related reconnection logs by account number
     */
    public function getReconnectionLogsByAccount(string $accountNo): JsonResponse
    {
        try {
            $logs = DB::table('reconnection_logs')
                ->where('account_id', $accountNo)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'count' => $logs->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching reconnection logs for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch reconnection logs',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related disconnected logs by account number
     */
    public function getDisconnectedLogsByAccount(string $accountNo): JsonResponse
    {
        try {
            $logs = DB::table('disconnected_logs')
                ->where('account_id', $accountNo)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'count' => $logs->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching disconnected logs for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch disconnected logs',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related details update logs by account number
     */
    public function getDetailsUpdateLogsByAccount(string $accountNo): JsonResponse
    {
        try {
            $logs = DB::table('details_update_logs')
                ->where('account_id', $accountNo)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'count' => $logs->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching details update logs for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch details update logs',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related plan change logs by account number
     */
    public function getPlanChangeLogsByAccount(string $accountNo): JsonResponse
    {
        try {
            $logs = DB::table('plan_change_logs')
                ->where('account_id', $accountNo)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'count' => $logs->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching plan change logs for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch plan change logs',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related service charge logs by account number
     */
    public function getServiceChargeLogsByAccount(string $accountNo): JsonResponse
    {
        try {
            $logs = DB::table('service_charge_logs')
                ->where('account_no', $accountNo)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'count' => $logs->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching service charge logs for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service charge logs',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related change due logs by account number
     */
    public function getChangeDueLogsByAccount(string $accountNo): JsonResponse
    {
        try {
            $logs = DB::table('change_due_logs')
                ->where('account_id', $accountNo)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $logs,
                'count' => $logs->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching change due logs for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch change due logs',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }

    /**
     * Get related security deposits by account number
     */
    public function getSecurityDepositsByAccount(string $accountNo): JsonResponse
    {
        try {
            $deposits = DB::table('security_deposits')
                ->where('account_id', $accountNo)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $deposits,
                'count' => $deposits->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching security deposits for account: ' . $accountNo, [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch security deposits',
                'error' => $e->getMessage(),
                'data' => [],
                'count' => 0
            ], 500);
        }
    }
}
