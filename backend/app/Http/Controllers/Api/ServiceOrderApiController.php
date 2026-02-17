<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use App\Models\BillingAccount;
use App\Services\ManualRadiusOperationsService;
use App\Services\PppoeUsernameService;
use Illuminate\Support\Facades\Auth;

class ServiceOrderApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $page = $request->input('page', 1);
            $limit = $request->input('limit', 50); // Default 50 for faster response
            $search = $request->input('search', '');
            // Fast mode variable kept for compatibility but new logic is inherently faster
            $fastMode = $request->input('fast', false); 

            // Base query on service_orders
            $query = DB::table('service_orders as so')
                ->select('so.*', 'so.id as ticket_id');
            
            // Apply filters
            if ($request->has('assigned_email')) {
                $query->where('so.assigned_email', $request->input('assigned_email'));
            }
            
            if ($request->has('account_no')) {
                $query->where('so.account_no', 'LIKE', "%" . $request->input('account_no') . "%");
            }

            if ($request->has('support_status')) {
                $query->where('so.support_status', $request->input('support_status'));
            }

            // Handle Search
            if ($search) {
                // Only join when strictly necessary for search
                $query->leftJoin('billing_accounts as ba', 'so.account_no', '=', 'ba.account_no')
                      ->leftJoin('customers as c', 'ba.customer_id', '=', 'c.id');
                      
                $query->where(function ($q) use ($search) {
                    $q->where('so.account_no', 'LIKE', "%{$search}%")
                      ->orWhere('so.id', 'LIKE', "%{$search}%")
                      ->orWhere('c.first_name', 'LIKE', "%{$search}%")
                      ->orWhere('c.last_name', 'LIKE', "%{$search}%");
                });
            }

            $query->orderBy('so.created_at', 'desc');

            // Fetch one extra record to check if there are more pages
            $serviceOrders = $query->skip(($page - 1) * $limit)
                ->take($limit + 1)
                ->get();

            // Check if there are more pages
            $hasMore = $serviceOrders->count() > $limit;

            // Remove the extra record if it exists
            if ($hasMore) {
                $serviceOrders = $serviceOrders->slice(0, $limit);
            }
            
            // Extract Account Numbers for eager loading
            $accountNos = $serviceOrders->pluck('account_no')->filter()->unique()->values();
            
            // Eager load related data efficiently
            if ($accountNos->isNotEmpty()) {
                $billingAccounts = \App\Models\BillingAccount::with('customer')
                    ->whereIn('account_no', $accountNos)
                    ->get()
                    ->keyBy('account_no');
                    
                $technicalDetails = \App\Models\TechnicalDetail::whereIn('account_no', $accountNos)
                    ->get()
                    ->keyBy('account_no');
            } else {
                $billingAccounts = collect();
                $technicalDetails = collect();
            }
            
            // Map related data to service orders
            $mappedOrders = $serviceOrders->map(function ($so) use ($billingAccounts, $technicalDetails) {
                $ba = $billingAccounts->get($so->account_no);
                $c = $ba ? $ba->customer : null;
                $td = $technicalDetails->get($so->account_no);
                
                // Manually populate fields that were previously joined
                $so->account_id = $ba ? $ba->id : null;
                $so->date_installed = $ba ? $ba->date_installed : null;
                
                // Customer details
                $so->full_name = $c ? trim(($c->first_name ?? '') . ' ' . ($c->middle_initial ?? '') . ' ' . ($c->last_name ?? '')) : null;
                $so->contact_number = $c ? $c->contact_number_primary : null;
                $so->full_address = $c ? trim(($c->address ?? '') . ', ' . ($c->barangay ?? '') . ', ' . ($c->city ?? '') . ', ' . ($c->region ?? '')) : null;
                $so->contact_address = $c ? $c->address : null;
                $so->email_address = $c ? $c->email_address : null;
                $so->house_front_picture_url = $c ? $c->house_front_picture_url : null;
                $so->plan = $c ? $c->desired_plan : null;
                $so->region = $c ? $c->region : null;
                $so->city = $c ? $c->city : null;
                $so->barangay = $c ? $c->barangay : null;
                
                // Technical details
                $so->username = $td ? $td->username : null;
                $so->connection_type = $td ? $td->connection_type : null;
                $so->router_modem_sn = $td ? $td->router_modem_sn : null;
                $so->lcp = $td ? $td->lcp : null;
                $so->nap = $td ? $td->nap : null;
                $so->port = $td ? $td->port : null;
                $so->vlan = $td ? $td->vlan : null;
                
                return $so;
            });
            
            return response()->json([
                'success' => true,
                'data' => $mappedOrders->values(),
                'pagination' => [
                    'current_page' => (int) $page,
                    'per_page' => (int) $limit,
                    'has_more' => $hasMore,
                    'count' => $mappedOrders->count()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching service orders: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service orders',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    public function store(Request $request): JsonResponse
    {
        try {
            Log::info('Service order creation request', ['data' => $request->all()]);
            
            $validated = $request->validate([
                'account_no' => 'required|string|max:255',
                'timestamp' => 'nullable|date',
                'support_status' => 'nullable|string|max:100',
                'concern' => 'required|string|max:255',
                'concern_remarks' => 'nullable|string',
                'priority_level' => 'nullable|string|max:50',
                'requested_by' => 'nullable|string|max:255',
                'assigned_email' => 'nullable|string|max:255',
                'visit_status' => 'nullable|string|max:100',
                'visit_by_user' => 'nullable|string|max:255',
                'visit_with' => 'nullable|string|max:255',
                'visit_remarks' => 'nullable|string',
                'repair_category' => 'nullable|string|max:255',
                'support_remarks' => 'nullable|string',
                'service_charge' => 'nullable|numeric',
                'new_router_modem_sn' => 'nullable|string|max:255',
                'new_lcpnap' => 'nullable|string|max:255',
                'new_plan' => 'nullable|string|max:255',
                'status' => 'nullable|string|max:50',
                'created_by_user' => 'nullable|string|max:255',
                'updated_by_user' => 'nullable|string|max:255'
            ]);
            
            $ticketId = $this->generateTicketId();
            Log::info('Generated ticket_id: ' . $ticketId);
            
            $timestamp = null;
            if (isset($validated['timestamp'])) {
                try {
                    $timestamp = Carbon::parse($validated['timestamp'])->format('Y-m-d H:i:s');
                } catch (\Exception $e) {
                    Log::warning('Invalid timestamp format, using current time', ['timestamp' => $validated['timestamp']]);
                    $timestamp = now()->format('Y-m-d H:i:s');
                }
            } else {
                $timestamp = now()->format('Y-m-d H:i:s');
            }
            
            $data = [
                'ticket_id' => $ticketId,
                'account_no' => $validated['account_no'],
                'timestamp' => $timestamp,
                'support_status' => $validated['support_status'] ?? 'Open',
                'concern' => $validated['concern'],
                'concern_remarks' => $validated['concern_remarks'] ?? null,
                'priority_level' => $validated['priority_level'] ?? 'Medium',
                'requested_by' => $validated['requested_by'] ?? null,
                'assigned_email' => $validated['assigned_email'] ?? null,
                'visit_status' => $validated['visit_status'] ?? 'Pending',
                'visit_by_user' => $validated['visit_by_user'] ?? null,
                'visit_with' => $validated['visit_with'] ?? null,
                'visit_remarks' => $validated['visit_remarks'] ?? null,
                'repair_category' => $validated['repair_category'] ?? null,
                'support_remarks' => $validated['support_remarks'] ?? null,
                'service_charge' => $validated['service_charge'] ?? null,
                'new_router_modem_sn' => $validated['new_router_modem_sn'] ?? null,
                'new_lcpnap' => $validated['new_lcpnap'] ?? null,
                'new_plan' => $validated['new_plan'] ?? null,
                'status' => $validated['status'] ?? 'unused',
                'created_by_user' => $validated['created_by_user'] ?? null,
                'updated_by_user' => $validated['updated_by_user'] ?? null,
                'created_at' => now(),
                'updated_at' => now()
            ];
            
            Log::info('Insert data: ', $data);
            
            $id = DB::table('service_orders')->insertGetId($data);
            
            $serviceOrder = DB::table('service_orders')->where('id', $id)->first();
            
            Log::info('Service order created successfully', [
                'id' => $id,
                'ticket_id' => $ticketId,
                'inserted_data' => (array)$serviceOrder
            ]);

            // Trigger Reconnection if concern is 'Reconnect'
            $currentConcern = trim($request->input('concern'));
            $supportStatus = strtolower(trim($request->input('support_status') ?? ''));

            \Log::info('Reconnection check (store) debug:', [
                'current_concern' => $currentConcern,
                'request_support_status' => $supportStatus
            ]);

            $reconnectStatus = null;
            if ($currentConcern && strtolower($currentConcern) === 'reconnect' && $supportStatus === 'resolved') {
                $billingAccount = BillingAccount::where('account_no', $validated['account_no'])->first();
                if ($billingAccount) {
                    Log::info('Triggering auto-reconnect for NEW Service Order with Reconnect concern', [
                        'account_no' => $validated['account_no']
                    ]);
                    $reconnectStatus = $this->attemptReconnection($billingAccount);
                }
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Service order created successfully',
                'data' => $serviceOrder,
                'reconnect_status' => $reconnectStatus
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation error creating service order', [
                'errors' => $e->errors(),
                'input' => $request->all()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating service order', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create service order',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    private function generateTicketId(): string
    {
        $currentYear = date('Y');
        
        $lastTicket = DB::selectOne(
            "SELECT ticket_id FROM service_orders WHERE ticket_id LIKE ? ORDER BY ticket_id DESC LIMIT 1",
            [$currentYear . '%']
        );
        
        if ($lastTicket && $lastTicket->ticket_id) {
            $lastNumber = (int) substr($lastTicket->ticket_id, 4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        $ticketId = $currentYear . str_pad($newNumber, 6, '0', STR_PAD_LEFT);
        
        Log::info('Generated ticket ID: ' . $ticketId);
        
        return $ticketId;
    }
    
    public function show($id): JsonResponse
    {
        try {
            $serviceOrder = DB::table('service_orders as so')
                ->leftJoin('billing_accounts as ba', 'so.account_no', '=', 'ba.account_no')
                ->leftJoin('customers as c', 'ba.customer_id', '=', 'c.id')
                ->leftJoin('technical_details as td', 'so.account_no', '=', 'td.account_no')
                ->select(
                    'so.id',
                    'so.id as ticket_id',
                    'so.account_no',
                    'so.timestamp',
                    'ba.id as account_id',
                    'ba.date_installed',
                    DB::raw("CONCAT(IFNULL(c.first_name, ''), ' ', IFNULL(c.middle_initial, ''), ' ', IFNULL(c.last_name, '')) as full_name"),
                    'c.contact_number_primary as contact_number',
                    DB::raw("CONCAT(IFNULL(c.address, ''), ', ', IFNULL(c.barangay, ''), ', ', IFNULL(c.city, ''), ', ', IFNULL(c.region, '')) as full_address"),
                    'c.address as contact_address',
                    'c.email_address',
                    'c.house_front_picture_url',
                    'c.desired_plan as plan',
                    'c.region',
                    'c.city',
                    'c.barangay',
                    'td.username',
                    'td.connection_type',
                    'td.router_modem_sn',
                    'td.lcp',
                    'td.nap',
                    'td.port',
                    'td.vlan',
                    'so.concern',
                    'so.concern_remarks',
                    'so.requested_by',
                    'so.support_status',
                    'so.assigned_email',
                    'so.repair_category',
                    'so.visit_status',
                    'so.priority_level',
                    'so.visit_by_user',
                    'so.visit_with',
                    'so.visit_remarks',
                    'so.support_remarks',
                    'so.service_charge',
                    'so.new_router_modem_sn',
                    'so.new_lcp',
                    'so.new_nap',
                    'so.new_port',
                    'so.new_vlan',
                    'so.router_model',
                    'so.old_lcp',
                    'so.old_nap',
                    'so.old_port',
                    'so.old_vlan',
                    'so.old_router_modem_sn',
                    'so.new_lcpnap',
                    'so.new_plan',
                    'so.client_signature_url',
                    'so.image1_url',
                    'so.image2_url',
                    'so.image3_url',
                    'so.status',
                    'so.created_at',
                    'so.created_by_user',
                    'so.updated_at',
                    'so.updated_by_user'
                )
                ->where('so.id', $id)
                ->first();
            
            if (!$serviceOrder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service order not found'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'data' => $serviceOrder
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching service order details: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service order',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    public function update(Request $request, $id): JsonResponse
    {
        try {
            Log::info('Service order update request', [
                'id' => $id,
                'data' => $request->all()
            ]);
            
            $serviceOrder = DB::table('service_orders')->where('id', $id)->first();
            
            if (!$serviceOrder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service order not found'
                ], 404);
            }
            
            $allowedFields = [
                'account_no',
                'timestamp',
                'support_status',
                'concern',
                'concern_remarks',
                'priority_level',
                'requested_by',
                'assigned_email',
                'visit_status',
                'visit_by_user',
                'visit_with',
                'visit_remarks',
                'repair_category',
                'support_remarks',
                'service_charge',
                'new_router_modem_sn',
                'new_lcp',
                'new_nap',
                'new_port',
                'new_vlan',
                'router_model',
                'old_lcp',
                'old_nap',
                'old_port',
                'old_vlan',
                'old_router_modem_sn',
                'old_lcpnap',
                'old_plan',
                'new_lcpnap',
                'new_plan',
                'client_signature_url',
                'image1_url',
                'image2_url',
                'image3_url',
                'status'
            ];
            
            $data = [];
            foreach ($allowedFields as $field) {
                if ($request->has($field)) {
                    $data[$field] = $request->input($field);
                }
            }
            
            $data['updated_at'] = now();
            
            Log::info('Filtered data for update', ['data' => $data]);
            
            // Handle technical details update if new values are provided
            $hasNewTechnicalDetails = 
                $request->filled('new_lcp') || 
                $request->filled('new_nap') || 
                $request->filled('new_port') || 
                $request->filled('new_vlan') || 
                $request->filled('new_router_modem_sn');
            
            if ($hasNewTechnicalDetails) {
                Log::info('New technical details detected, updating technical_details table');
                
                // Get current technical details
                $technicalDetails = DB::table('technical_details')
                    ->where('account_no', $serviceOrder->account_no)
                    ->first();
                
                if ($technicalDetails) {
                    // Store old values in service_orders
                    $data['old_lcp'] = $technicalDetails->lcp;
                    $data['old_nap'] = $technicalDetails->nap;
                    $data['old_port'] = $technicalDetails->port;
                    $data['old_vlan'] = $technicalDetails->vlan;
                    $data['old_router_modem_sn'] = $technicalDetails->router_modem_sn;
                    $data['old_lcpnap'] = $technicalDetails->lcpnap;

                    // Prepare updates for technical_details
                    $newLcp = $request->filled('new_lcp') ? $request->input('new_lcp') : $technicalDetails->lcp;
                    $newNap = $request->filled('new_nap') ? $request->input('new_nap') : $technicalDetails->nap;
                    $newPort = $request->filled('new_port') ? $request->input('new_port') : $technicalDetails->port;
                    $newVlan = $request->filled('new_vlan') ? $request->input('new_vlan') : $technicalDetails->vlan;
                    $newSN = $request->filled('new_router_modem_sn') ? $request->input('new_router_modem_sn') : $technicalDetails->router_modem_sn;
                    
                    // Calculate LCPNAP (LCP + NAP)
                    $newLcpNap = trim(($newLcp ?? '') . ' - ' . ($newNap ?? ''), ' - ');

                    // Add new values to $data for service_orders
                    $data['new_lcp'] = $newLcp;
                    $data['new_nap'] = $newNap;
                    $data['new_port'] = $newPort;
                    $data['new_vlan'] = $newVlan;
                    $data['new_router_modem_sn'] = $newSN;
                    $data['new_lcpnap'] = $newLcpNap;

                    // Update technical_details table
                    DB::table('technical_details')
                        ->where('account_no', $serviceOrder->account_no)
                        ->update([
                            'lcp' => $newLcp,
                            'nap' => $newNap,
                            'port' => $newPort,
                            'vlan' => $newVlan,
                            'router_modem_sn' => $newSN,
                            'lcpnap' => $newLcpNap,
                            'updated_at' => now(),
                            'updated_by' => Auth::user()->name ?? 'API'
                        ]);
                }
            }

            // Handle plan update if provided
            if ($request->filled('new_plan')) {
                $billingAccount = DB::table('billing_accounts')
                    ->where('account_no', $serviceOrder->account_no)
                    ->first();
                
                if ($billingAccount) {
                    $oldPlan = DB::table('customers')
                        ->where('id', $billingAccount->customer_id)
                        ->value('desired_plan');
                    
                    $data['old_plan'] = $oldPlan;

                    DB::table('customers')
                        ->where('id', $billingAccount->customer_id)
                        ->update([
                            'desired_plan' => $request->input('new_plan'),
                            'updated_at' => now()
                        ]);
                    Log::info('Updated customer desired_plan to ' . $request->input('new_plan'), [
                        'account_no' => $serviceOrder->account_no,
                        'customer_id' => $billingAccount->customer_id
                    ]);
                }
            }
            
            $shouldAddServiceCharge = false;
            $statusChanged = false;
            
            if ($request->has('support_status') && $request->input('support_status') === 'Resolved' && $serviceOrder->support_status !== 'Resolved') {
                $shouldAddServiceCharge = true;
                $statusChanged = true;
                Log::info('Support status changed to Resolved, will add service charge to account balance');
            }
            
            if ($request->has('visit_status') && $request->input('visit_status') === 'Done' && $serviceOrder->visit_status !== 'Done') {
                $shouldAddServiceCharge = true;
                $statusChanged = true;
                Log::info('Visit status changed to Done, will add service charge to account balance');
            }
            
            if ($shouldAddServiceCharge && $statusChanged && $request->has('service_charge')) {
                $serviceCharge = floatval($request->input('service_charge'));
                if ($serviceCharge > 0) {
                    $billingAccount = DB::table('billing_accounts')
                        ->where('account_no', $serviceOrder->account_no)
                        ->first();
                    
                    if ($billingAccount) {
                        $currentBalance = floatval($billingAccount->account_balance);
                        $newBalance = $currentBalance + $serviceCharge;
                        
                        DB::table('billing_accounts')
                            ->where('account_no', $serviceOrder->account_no)
                            ->update([
                                'account_balance' => $newBalance,
                                'balance_update_date' => now()
                            ]);
                        
                        $data['status'] = 'used';
                        
                        Log::info("Updated account balance from {$currentBalance} to {$newBalance} (added service charge: {$serviceCharge}). Status changed to 'used'.");
                    } else {
                        Log::warning('Billing account not found for account_no: ' . $serviceOrder->account_no);
                    }
                }
            }
            
            DB::table('service_orders')->where('id', $id)->update($data);
            
            // Trigger Reconnection if concern is 'Reconnect'
            $currentConcern = trim($request->input('concern'));
            if (!$currentConcern && isset($serviceOrder->concern)) {
                $currentConcern = trim($serviceOrder->concern);
            }

            $supportStatus = strtolower(trim($request->input('support_status') ?? ''));
            if (empty($supportStatus) && isset($serviceOrder->support_status)) {
                $supportStatus = strtolower(trim($serviceOrder->support_status));
            }

            \Log::info('Reconnection check debug:', [
                'current_concern' => $currentConcern,
                'request_support_status' => $supportStatus
            ]);

            $reconnectStatus = null;
            $normalizedConcern = $currentConcern ? strtolower(trim($currentConcern)) : '';
            if ($normalizedConcern && ($normalizedConcern === 'reconnect' || $normalizedConcern === 'upgrade/downgrade plan') && $supportStatus === 'resolved') {
                $billingAccount = BillingAccount::where('account_no', $serviceOrder->account_no)->first();
                if ($billingAccount) {
                    \Log::info("Triggering auto-reconnect for Service Order with {$currentConcern} concern", [
                        'account_no' => $serviceOrder->account_no
                    ]);
                    $reconnectStatus = $this->attemptReconnection($billingAccount);
                }
            }

            // Trigger Disconnection if concern is 'Disconnect' and support status is 'Resolved'
            $disconnectStatus = null;
            if ($currentConcern && strtolower($currentConcern) === 'disconnect' && $supportStatus === 'resolved') {
                $billingAccount = BillingAccount::where('account_no', $serviceOrder->account_no)->first();
                if ($billingAccount) {
                    \Log::info('Triggering auto-disconnect for Service Order with Disconnect concern', [
                        'account_no' => $serviceOrder->account_no
                    ]);
                    $disconnectStatus = $this->attemptDisconnection($billingAccount);
                }
            }

            // Trigger Pullout if repair category is 'Pullout' and visit status is 'Done'
            $pulloutStatus = null;
            
            $visitStatus = strtolower(trim($request->input('visit_status') ?? ''));
            if (empty($visitStatus) && isset($serviceOrder->visit_status)) {
                $visitStatus = strtolower(trim($serviceOrder->visit_status));
            }
            
            $repairCategory = strtolower(trim($request->input('repair_category') ?? ''));
            if (empty($repairCategory) && isset($serviceOrder->repair_category)) {
                $repairCategory = strtolower(trim($serviceOrder->repair_category));
            }

            if ($repairCategory === 'pullout' && $visitStatus === 'done') {
                $billingAccount = BillingAccount::where('account_no', $serviceOrder->account_no)->first();
                if ($billingAccount) {
                    \Log::info('Triggering auto-pullout for Service Order with Pullout repair category', [
                        'account_no' => $serviceOrder->account_no
                    ]);
                    $pulloutStatus = $this->attemptPullout($billingAccount);
                }
            }

            // Trigger Migration if repair category is 'Migrate', 'Relocate', or 'Relocate Router' and visit status is 'Done'
            $migrationStatus = null;
            if (($repairCategory === 'migrate' || $repairCategory === 'relocate' || $repairCategory === 'relocate router' || $repairCategory === 'transfer lcp/nap/port') && $visitStatus === 'done') {
                $billingAccount = BillingAccount::where('account_no', $serviceOrder->account_no)->first();
                if ($billingAccount) {
                    $newRouterModemSN = $request->input('new_router_modem_sn');
                    if ($newRouterModemSN) {
                        \Log::info('Triggering auto-migration for Service Order', [
                            'account_no' => $serviceOrder->account_no,
                            'new_sn' => $newRouterModemSN
                        ]);
                        $migrationStatus = $this->attemptMigration($billingAccount, $newRouterModemSN);
                    }
                }
            }

            $updatedServiceOrder = DB::table('service_orders')->where('id', $id)->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Service order updated successfully',
                'data' => $updatedServiceOrder,
                'reconnect_status' => $reconnectStatus,
                'disconnect_status' => $disconnectStatus,
                'pullout_status' => $pulloutStatus,
                'migration_status' => $migrationStatus
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update service order', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update service order',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    public function destroy($id): JsonResponse
    {
        try {
            $serviceOrder = DB::table('service_orders')->where('id', $id)->first();
            
            if (!$serviceOrder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service order not found'
                ], 404);
            }
            
            DB::table('service_orders')->where('id', $id)->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Service order deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete service order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function attemptReconnection($billingAccount): string
    {
        try {
            // Reload billing account
            $billingAccount = BillingAccount::find($billingAccount->id);
            $accountNo = $billingAccount->account_no;
            
            \Log::info('[API SERVICE ORDER RECONNECT] Force starting for account: ' . $accountNo);

            // Step 3: Get account details (PPPoE Username and Plan)
            $accountInfo = DB::table('billing_accounts')
                ->leftJoin('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                ->leftJoin('technical_details', 'billing_accounts.id', '=', 'technical_details.account_id')
                ->where('billing_accounts.id', $billingAccount->id)
                ->select('technical_details.username as pppoe_username', 'customers.desired_plan')
                ->first();

            $username = $accountInfo->pppoe_username ?? null;
            $plan = $accountInfo->desired_plan ?? null;

            if (empty($username)) {
                \Log::info('[API SERVICE ORDER RECONNECT SKIP] No PPPoE username found in technical_details');
                return 'no_username';
            }

            if (empty($plan)) {
                \Log::info('[API SERVICE ORDER RECONNECT SKIP] No plan found');
                return 'no_plan';
            }

            \Log::info('[API SERVICE ORDER RECONNECT PROCEED] Reconnecting user for account: ' . $accountNo);

            // Step 4: Update billing_status_id to 1 (Active) BEFORE reconnecting
            $billingAccount->billing_status_id = 1;
            $billingAccount->updated_at = now();
            $billingAccount->updated_by = Auth::id();
            $billingAccount->save();
            
            \Log::info('[API SERVICE ORDER RECONNECT DB] Updated billing_status_id to 1 for Account: ' . $accountNo);

            // Step 5: Prepare parameters for ManualRadiusOperationsService
            $params = [
                'accountNumber' => $accountNo,
                'username' => $username,
                'plan' => $plan,
                'updatedBy' => 'API Service Order Auto-Reconnect'
            ];

            // Step 6: Call ManualRadiusOperationsService reconnectUser
            \Log::info('[API SERVICE ORDER RECONNECT EXECUTE] Calling ManualRadiusOperationsService for ' . $username);
            
            $manualRadiusService = new ManualRadiusOperationsService();
            $result = $manualRadiusService->reconnectUser($params);

            if ($result['status'] === 'success') {
                \Log::info('[API SERVICE ORDER RECONNECT SUCCESS] Reconnection completed successfully');

                // Send SMS Notification
                try {
                    $smsTemplate = DB::table('sms_templates')
                        ->where('template_type', 'Reconnect')
                        ->where('is_active', 1)
                        ->first();

                    if ($smsTemplate) {
                        $customerInfo = DB::table('billing_accounts')
                            ->join('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                            ->where('billing_accounts.account_no', $accountNo)
                            ->select(
                                'customers.contact_number_primary',
                                'customers.email_address',
                                DB::raw("CONCAT(customers.first_name, ' ', IFNULL(customers.middle_initial, ''), ' ', customers.last_name) as full_name")
                            )
                            ->first();

                        if ($customerInfo && !empty($customerInfo->contact_number_primary)) {
                            $message = $smsTemplate->message_content;
                            $message = str_replace('{{customer_name}}', $customerInfo->full_name, $message);

                            $smsService = new \App\Services\ItexmoSmsService();
                            $smsResult = $smsService->send([
                                'contact_no' => $customerInfo->contact_number_primary,
                                'message' => $message
                            ]);

                            if ($smsResult['success']) {
                                \Log::info('[API SERVICE ORDER RECONNECT SMS] SMS sent');
                            }
                        }
                    }
                } catch (\Exception $e) {
                    \Log::error('[API SERVICE ORDER RECONNECT SMS EXCEPTION] ' . $e->getMessage());
                }

                // Send Email Notification
                try {
                    $emailTemplate = \App\Models\EmailTemplate::where('Template_Code', 'RECONNECT')->first();
                    
                    if ($emailTemplate && !empty($customerInfo->email_address)) {
                         $body = $emailTemplate->email_body;
                         
                         if (!empty($body)) {
                             $emailService = app(\App\Services\EmailQueueService::class);
                             $emailService->queueEmail([
                                 'account_no' => $accountNo,
                                 'recipient_email' => $customerInfo->email_address,
                                 'subject' => $emailTemplate->Subject_Line ?? 'Reconnection Notice', 
                                 'body_html' => nl2br($body), 
                                 'attachment_path' => null
                             ]);
                             \Log::info('[API SERVICE ORDER RECONNECT EMAIL] Email queued');
                         }
                    }
                } catch (\Exception $e) {
                    \Log::error('[API SERVICE ORDER RECONNECT EMAIL EXCEPTION] ' . $e->getMessage());
                }

                return 'success';
            } else {
                \Log::info('[API SERVICE ORDER RECONNECT FAILED] ' . $result['message']);
                return 'failed';
            }

        } catch (\Exception $e) {
            \Log::error('[API SERVICE ORDER RECONNECT EXCEPTION] ' . $e->getMessage());
            return 'exception';
        }
    }

    private function attemptDisconnection($billingAccount): string
    {
        try {
            // Reload billing account
            $billingAccount = BillingAccount::find($billingAccount->id);
            $accountNo = $billingAccount->account_no;
            
            \Log::info('[API SERVICE ORDER DISCONNECT] Force starting for account: ' . $accountNo);

            // Get account details (PPPoE Username)
            $accountInfo = DB::table('billing_accounts')
                ->leftJoin('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                ->leftJoin('technical_details', 'billing_accounts.id', '=', 'technical_details.account_id')
                ->where('billing_accounts.id', $billingAccount->id)
                ->select('technical_details.username as pppoe_username')
                ->first();

            $username = $accountInfo->pppoe_username ?? null;

            if (empty($username)) {
                \Log::info('[API SERVICE ORDER DISCONNECT SKIP] No PPPoE username found in technical_details');
                return 'no_username';
            }

            \Log::info('[API SERVICE ORDER DISCONNECT PROCEED] Disconnecting user for account: ' . $accountNo);

            // Prepare parameters for ManualRadiusOperationsService
            $params = [
                'accountNumber' => $accountNo,
                'username' => $username,
                'remarks' => 'Disconnect',
                'updatedBy' => 'API Service Order Auto-Disconnect'
            ];

            // Call ManualRadiusOperationsService disconnectUser
            \Log::info('[API SERVICE ORDER DISCONNECT EXECUTE] Calling ManualRadiusOperationsService for ' . $username);
            
            $manualRadiusService = new ManualRadiusOperationsService();
            $result = $manualRadiusService->disconnectUser($params);

            if ($result['status'] === 'success') {
                \Log::info('[API SERVICE ORDER DISCONNECT SUCCESS] Disconnection completed successfully');

                // Update billing_status_id to 4 (Disconnected) AFTER successful RADIUS disconnect
                $billingAccount->billing_status_id = 4;
                $billingAccount->updated_at = now();
                $billingAccount->updated_by = Auth::id();
                $billingAccount->save();
                
                \Log::info('[API SERVICE ORDER DISCONNECT DB] Updated billing_status_id to 4 (Disconnected) for Account: ' . $accountNo);

                // Send SMS Notification
                try {
                    $smsTemplate = DB::table('sms_templates')
                        ->where('template_type', 'Disconnected')
                        ->where('is_active', 1)
                        ->first();

                    if ($smsTemplate) {
                        $customerInfo = DB::table('billing_accounts')
                            ->join('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                            ->where('billing_accounts.account_no', $accountNo)
                            ->select(
                                'customers.contact_number_primary',
                                'customers.email_address',
                                DB::raw("CONCAT(customers.first_name, ' ', IFNULL(customers.middle_initial, ''), ' ', customers.last_name) as full_name"),
                                'billing_accounts.account_balance'
                            )
                            ->first();

                        if ($customerInfo && !empty($customerInfo->contact_number_primary)) {
                            $message = $smsTemplate->message_content;
                            $message = str_replace('{{customer_name}}', $customerInfo->full_name, $message);
                            $message = str_replace('{{account_no}}', $accountNo, $message);
                            $message = str_replace('{{amount_due}}', number_format($customerInfo->account_balance, 2), $message);
                            $message = str_replace('{{balance}}', number_format($customerInfo->account_balance, 2), $message);

                            $smsService = new \App\Services\ItexmoSmsService();
                            $smsResult = $smsService->send([
                                'contact_no' => $customerInfo->contact_number_primary,
                                'message' => $message
                            ]);

                            if ($smsResult['success']) {
                                \Log::info('[API SERVICE ORDER DISCONNECT SMS] SMS sent');
                            }
                        }
                    }
                } catch (\Exception $e) {
                    \Log::error('[API SERVICE ORDER DISCONNECT SMS EXCEPTION] ' . $e->getMessage());
                }

                // Send Email Notification
                try {
                    $emailTemplate = \App\Models\EmailTemplate::where('Template_Code', 'DISCONNECTED')->first();
                    
                    if ($emailTemplate && !empty($customerInfo->email_address)) {
                         $body = $emailTemplate->email_body;
                         
                         if (!empty($body)) {
                             $emailService = app(\App\Services\EmailQueueService::class);
                             $emailService->queueEmail([
                                 'account_no' => $accountNo,
                                 'recipient_email' => $customerInfo->email_address,
                                 'subject' => $emailTemplate->Subject_Line ?? 'Disconnection Notice', 
                                 'body_html' => nl2br($body), 
                                 'attachment_path' => null
                             ]);
                             \Log::info('[API SERVICE ORDER DISCONNECT EMAIL] Email queued');
                         }
                    }
                } catch (\Exception $e) {
                    \Log::error('[API SERVICE ORDER DISCONNECT EMAIL EXCEPTION] ' . $e->getMessage());
                }

                return 'success';
            } else {
                \Log::info('[API SERVICE ORDER DISCONNECT FAILED] ' . $result['message']);
                return 'failed';
            }

        } catch (\Exception $e) {
            \Log::error('[API SERVICE ORDER DISCONNECT EXCEPTION] ' . $e->getMessage());
            return 'exception';
        }
    }

    private function attemptPullout($billingAccount): string
    {
        try {
            // Reload billing account
            $billingAccount = BillingAccount::find($billingAccount->id);
            $accountNo = $billingAccount->account_no;
            
            \Log::info('[API SERVICE ORDER PULLOUT] Force starting for account: ' . $accountNo);

            // Get account details (PPPoE Username)
            $accountInfo = DB::table('billing_accounts')
                ->leftJoin('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                ->leftJoin('technical_details', 'billing_accounts.id', '=', 'technical_details.account_id')
                ->where('billing_accounts.id', $billingAccount->id)
                ->select('technical_details.username as pppoe_username')
                ->first();

            $username = $accountInfo->pppoe_username ?? null;

            if (empty($username)) {
                \Log::info('[API SERVICE ORDER PULLOUT SKIP] No PPPoE username found in technical_details');
                return 'no_username';
            }

            \Log::info('[API SERVICE ORDER PULLOUT PROCEED] Executing pullout for account: ' . $accountNo);

            // Prepare parameters for ManualRadiusOperationsService
            $params = [
                'accountNumber' => $accountNo,
                'username' => $username,
                'remarks' => 'Pullout',
                'updatedBy' => 'API Service Order Auto-Pullout'
            ];

            // Call ManualRadiusOperationsService disconnectUser
            \Log::info('[API SERVICE ORDER PULLOUT EXECUTE] Calling ManualRadiusOperationsService for ' . $username);
            
            $manualRadiusService = new ManualRadiusOperationsService();
            $result = $manualRadiusService->disconnectUser($params);

            if ($result['status'] === 'success') {
                \Log::info('[API SERVICE ORDER PULLOUT SUCCESS] Disconnection completed successfully');

                // Update billing_status_id to 5 (Pullout) AFTER successful RADIUS disconnect
                $billingAccount->billing_status_id = 5;
                $billingAccount->updated_at = now();
                $billingAccount->updated_by = Auth::id();
                $billingAccount->save();
                
                \Log::info('[API SERVICE ORDER PULLOUT DB] Updated billing_status_id to 5 (Pullout) for Account: ' . $accountNo);

                // Clear technical details
                DB::table('technical_details')
                    ->where('account_no', $accountNo)
                    ->update([
                        'connection_type' => null,
                        'router_model' => null,
                        'router_modem_sn' => null,
                        'ip_address' => null,
                        'lcp' => null,
                        'nap' => null,
                        'port' => null,
                        'vlan' => null,
                        'lcpnap' => null,
                        'usage_type' => null,
                        'updated_at' => now()
                    ]);

                \Log::info('[API SERVICE ORDER PULLOUT DB] Cleared technical details for Account: ' . $accountNo);

                // Send SMS Notification
                try {
                    $smsTemplate = DB::table('sms_templates')
                        ->where('template_type', 'Disconnected')
                        ->where('is_active', 1)
                        ->first();

                    if ($smsTemplate) {
                        $customerInfo = DB::table('billing_accounts')
                            ->join('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                            ->where('billing_accounts.account_no', $accountNo)
                            ->select(
                                'customers.contact_number_primary',
                                'customers.email_address',
                                DB::raw("CONCAT(customers.first_name, ' ', IFNULL(customers.middle_initial, ''), ' ', customers.last_name) as full_name"),
                                'billing_accounts.account_balance'
                            )
                            ->first();

                        if ($customerInfo && !empty($customerInfo->contact_number_primary)) {
                            $message = $smsTemplate->message_content;
                            $message = str_replace('{{customer_name}}', $customerInfo->full_name, $message);
                            $message = str_replace('{{account_no}}', $accountNo, $message);
                            $message = str_replace('{{amount_due}}', number_format($customerInfo->account_balance, 2), $message);
                            $message = str_replace('{{balance}}', number_format($customerInfo->account_balance, 2), $message);

                            $smsService = new \App\Services\ItexmoSmsService();
                            $smsResult = $smsService->send([
                                'contact_no' => $customerInfo->contact_number_primary,
                                'message' => $message
                            ]);

                            if ($smsResult['success']) {
                                \Log::info('[API SERVICE ORDER PULLOUT SMS] SMS sent');
                            }
                        }
                    }
                } catch (\Exception $e) {
                    \Log::error('[API SERVICE ORDER PULLOUT SMS EXCEPTION] ' . $e->getMessage());
                }

                // Send Email Notification
                try {
                    $emailTemplate = \App\Models\EmailTemplate::where('Template_Code', 'DISCONNECTED')->first();
                    
                    if ($emailTemplate && !empty($customerInfo->email_address)) {
                         $body = $emailTemplate->email_body;
                         
                         if (!empty($body)) {
                             $emailService = app(\App\Services\EmailQueueService::class);
                             $emailService->queueEmail([
                                 'account_no' => $accountNo,
                                 'recipient_email' => $customerInfo->email_address,
                                 'subject' => $emailTemplate->Subject_Line ?? 'Disconnection Notice', 
                                 'body_html' => nl2br($body), 
                                 'attachment_path' => null
                             ]);
                             \Log::info('[API SERVICE ORDER PULLOUT EMAIL] Email queued');
                         }
                    }
                } catch (\Exception $e) {
                    \Log::error('[API SERVICE ORDER PULLOUT EMAIL EXCEPTION] ' . $e->getMessage());
                }

                return 'success';
            } else {
                \Log::info('[API SERVICE ORDER PULLOUT FAILED] ' . $result['message']);
                return 'failed';
            }

        } catch (\Exception $e) {
            \Log::error('[API SERVICE ORDER PULLOUT EXCEPTION] ' . $e->getMessage());
            return 'exception';
        }
    }

    private function attemptMigration($billingAccount, $newRouterModemSN): string
    {
        try {
            $accountNo = $billingAccount->account_no;
            
            \Log::info('[API SERVICE ORDER MIGRATION] Force starting for account: ' . $accountNo);

            // Get data for username generation
            $fullInfo = DB::table('billing_accounts')
                ->join('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                ->leftJoin('technical_details', 'billing_accounts.id', '=', 'technical_details.account_id')
                ->where('billing_accounts.account_no', $accountNo)
                ->select(
                    'customers.first_name',
                    'customers.middle_initial',
                    'customers.last_name',
                    'customers.contact_number_primary as mobile_number',
                    'technical_details.lcp',
                    'technical_details.nap',
                    'technical_details.port',
                    'technical_details.username as pppoe_username'
                )
                ->first();

            $oldUsername = $fullInfo->pppoe_username ?? null;

            if (empty($oldUsername)) {
                \Log::info('[API SERVICE ORDER MIGRATION SKIP] No PPPoE username found');
                return 'no_username';
            }

            // Generate new username using the same logic as JobOrderController
            $pppoeService = new PppoeUsernameService();
            $customerData = (array)$fullInfo;
            $newUsername = $pppoeService->generateUniqueUsername($customerData);

            \Log::info('[API SERVICE ORDER MIGRATION] Generated new username', [
                'old' => $oldUsername,
                'new' => $newUsername
            ]);

            // Prepare parameters for ManualRadiusOperationsService
            // Password is NOT changed during migration
            $params = [
                'accountNumber' => $accountNo,
                'username' => $oldUsername,
                'newUsername' => $newUsername,
                'updatedBy' => 'API Service Order Auto-Migration'
            ];

            \Log::info('[API SERVICE ORDER MIGRATION EXECUTE] Calling ManualRadiusOperationsService for ' . $oldUsername);
            
            $manualRadiusService = new ManualRadiusOperationsService();
            $result = $manualRadiusService->updateCredentials($params);

            if ($result['status'] === 'success') {
                \Log::info('[API SERVICE ORDER MIGRATION SUCCESS] Migration completed successfully');
                return 'success';
            } else {
                \Log::info('[API SERVICE ORDER MIGRATION FAILED] ' . $result['message']);
                return 'failed';
            }

        } catch (\Exception $e) {
            \Log::error('[API SERVICE ORDER MIGRATION EXCEPTION] ' . $e->getMessage());
            return 'exception';
        }
    }
}

