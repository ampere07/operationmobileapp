<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Models\ServiceOrderItem;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\BillingAccount;
use App\Services\ManualRadiusOperationsService;
use App\Services\PppoeUsernameService;
use Illuminate\Support\Facades\Auth;

class ServiceOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $page = $request->input('page', 1);
            $limit = $request->input('limit', 50);
            $search = $request->input('search', '');
            $fastMode = $request->input('fast', false);

            Log::info('ServiceOrderController: Starting to fetch service orders', [
                'page' => $page,
                'limit' => $limit,
                'search' => $search,
                'fast_mode' => $fastMode
            ]);
            
            $query = "SELECT * FROM service_orders";
            $params = [];
            $whereClauses = [];
            
            if ($request->has('assigned_email')) {
                Log::info('Filtering by assigned_email: ' . $request->assigned_email);
                $whereClauses[] = "assigned_email = ?";
                $params[] = $request->assigned_email;
            }
            
            if ($request->has('user_role') && strtolower($request->query('user_role')) === 'technician') {
                $sevenDaysAgo = now()->subDays(7)->format('Y-m-d H:i:s');
                $whereClauses[] = "updated_at >= ?";
                $params[] = $sevenDaysAgo;
                Log::info('Filtering service orders for technician role: only showing records from last 7 days', [
                    'cutoff_date' => $sevenDaysAgo
                ]);
            }

            // Apply search filter
            if ($search) {
                $whereClauses[] = "(account_no LIKE ? OR assigned_email LIKE ? OR support_status LIKE ?)";
                $searchTerm = "%{$search}%";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
            
            if (!empty($whereClauses)) {
                $query .= " WHERE " . implode(' AND ', $whereClauses);
            }
            
            $query .= " ORDER BY created_at DESC";
            
            // Add pagination with +1 for hasMore check
            $offset = ($page - 1) * $limit;
            $query .= " LIMIT ? OFFSET ?";
            $params[] = $limit + 1;
            $params[] = $offset;
            
            $serviceOrders = DB::select($query, $params);
            
            // Check if there are more pages
            $hasMore = count($serviceOrders) > $limit;
            
            // Remove the extra record if it exists
            if ($hasMore) {
                array_pop($serviceOrders);
            }

            Log::info('ServiceOrderController: Fetched ' . count($serviceOrders) . ' service orders');

            // Fast mode: Return minimal data
            if ($fastMode) {
                $enrichedOrders = [];
                foreach ($serviceOrders as $order) {
                    $customer = DB::selectOne("SELECT * FROM customers WHERE account_no = ?", [$order->account_no]);
                    
                    $enrichedOrders[] = [
                        'id' => $order->id,
                        'ticket_id' => $order->ticket_id ?? $order->id,
                        'timestamp' => $order->timestamp,
                        'account_no' => $order->account_no,
                        'full_name' => $customer ? trim(($customer->first_name ?? '') . ' ' . ($customer->middle_initial ?? '') . ' ' . ($customer->last_name ?? '')) : null,
                        'support_status' => $order->support_status,
                        'assigned_email' => $order->assigned_email,
                        'visit_status' => $order->visit_status,
                        'updated_at' => $order->updated_at,
                    ];
                }

                return response()->json([
                    'success' => true,
                    'data' => $enrichedOrders,
                    'pagination' => [
                        'current_page' => (int) $page,
                        'per_page' => (int) $limit,
                        'has_more' => $hasMore
                    ]
                ]);
            }

            // Normal mode: Return full data with all relationships
            $enrichedOrders = [];
            foreach ($serviceOrders as $order) {
                $customer = DB::selectOne("SELECT * FROM customers WHERE account_no = ?", [$order->account_no]);
                $billingAccount = DB::selectOne("SELECT * FROM billing_accounts WHERE account_no = ?", [$order->account_no]);
                $technicalDetails = DB::selectOne("SELECT * FROM technical_details WHERE account_no = ?", [$order->account_no]);
                $supportConcern = $order->concern_id ? DB::selectOne("SELECT * FROM support_concern WHERE id = ?", [$order->concern_id]) : null;
                $repairCategory = $order->repair_category_id ? DB::selectOne("SELECT * FROM repair_category WHERE id = ?", [$order->repair_category_id]) : null;
                $createdUser = $order->created_by_user_id ? DB::selectOne("SELECT * FROM users WHERE id = ?", [$order->created_by_user_id]) : null;
                $updatedUser = $order->updated_by_user_id ? DB::selectOne("SELECT * FROM users WHERE id = ?", [$order->updated_by_user_id]) : null;
                $visitUser = $order->visit_by_user_id ? DB::selectOne("SELECT * FROM users WHERE id = ?", [$order->visit_by_user_id]) : null;
                
                $firstItem = DB::selectOne("SELECT * FROM service_order_items WHERE service_order_id = ? ORDER BY id ASC LIMIT 1", [$order->id]);
                $itemName1 = null;
                if ($firstItem && $firstItem->item_id) {
                    $item = DB::selectOne("SELECT * FROM inventory_items WHERE id = ?", [$firstItem->item_id]);
                    $itemName1 = $item->item_name ?? null;
                }
                
                $enrichedOrders[] = [
                    'id' => $order->id,
                    'ticket_id' => $order->ticket_id ?? $order->id,
                    'timestamp' => $order->timestamp,
                    'account_no' => $order->account_no,
                    'account_id' => $billingAccount->id ?? null,
                    'full_name' => $customer ? trim(($customer->first_name ?? '') . ' ' . ($customer->middle_initial ?? '') . ' ' . ($customer->last_name ?? '')) : null,
                    'contact_number' => $customer->contact_number_primary ?? null,
                    'full_address' => $customer ? trim(($customer->address ?? '') . ', ' . ($customer->barangay ?? '') . ', ' . ($customer->city ?? '') . ', ' . ($customer->region ?? '')) : null,
                    'contact_address' => $customer->address ?? null,
                    'date_installed' => $billingAccount->date_installed ?? null,
                    'email_address' => $customer->email_address ?? null,
                    'house_front_picture_url' => $customer->house_front_picture_url ?? null,
                    'plan' => $customer->desired_plan ?? null,
                    'group_name' => $customer->group_name ?? null,
                    'username' => $technicalDetails->username ?? null,
                    'connection_type' => $technicalDetails->connection_type ?? null,
                    'router_modem_sn' => $technicalDetails->router_modem_sn ?? null,
                    'lcp' => $technicalDetails->lcp ?? null,
                    'nap' => $technicalDetails->nap ?? null,
                    'port' => $technicalDetails->port ?? null,
                    'vlan' => $technicalDetails->vlan ?? null,
                    'lcpnap' => $technicalDetails->lcpnap ?? null,
                    'item_name_1' => $itemName1,
                    'concern' => $supportConcern->name ?? null,
                    'concern_remarks' => $order->concern_remarks,
                    'requested_by' => $order->requested_by,
                    'support_status' => $order->support_status,
                    'assigned_email' => $order->assigned_email,
                    'repair_category' => $repairCategory->name ?? null,
                    'visit_status' => $order->visit_status,
                    'visit_by' => $order->visit_by ?? null,
                    'visit_with' => $order->visit_with ?? null,
                    'visit_with_other' => $order->visit_with_other ?? null,
                    'priority_level' => $order->priority_level,
                    'visit_by_user' => $visitUser->name ?? null,
                    'visit_remarks' => $order->visit_remarks,
                    'support_remarks' => $order->support_remarks,
                    'service_charge' => $order->service_charge,
                    'new_router_sn' => $order->new_router_sn,
                    'new_lcpnap_id' => $order->new_lcpnap_id,
                    'new_plan_id' => $order->new_plan_id,
                    'client_signature_url' => $order->client_signature_url,
                    'image1_url' => $order->image1_url,
                    'image2_url' => $order->image2_url,
                    'image3_url' => $order->image3_url,
                    'time_in_image_url' => $order->time_in_image_url ?? null,
                    'modem_setup_image_url' => $order->modem_setup_image_url ?? null,
                    'time_out_image_url' => $order->time_out_image_url ?? null,
                    'status' => $order->status ?? 'unused',
                    'created_at' => $order->created_at,
                    'created_by_user' => $createdUser->name ?? null,
                    'updated_at' => $order->updated_at,
                    'updated_by_user' => $updatedUser->name ?? null,
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $enrichedOrders,
                'pagination' => [
                    'current_page' => (int) $page,
                    'per_page' => (int) $limit,
                    'has_more' => $hasMore
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching service orders: ' . $e->getMessage());
            Log::error('Trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service orders',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            Log::info('Creating service order', $request->all());
            
            $ticketId = $this->generateTicketId();
            Log::info('Generated ticket_id: ' . $ticketId);
            
            $insertData = [
                'ticket_id' => $ticketId,
                'account_no' => $request->account_no,
                'timestamp' => $request->timestamp ?? now(),
                'support_status' => $request->support_status ?? 'In Progress',
                'concern_id' => null,
                'concern_remarks' => $request->concern_remarks,
                'priority_level' => $request->priority_level,
                'requested_by' => $request->requested_by,
                'visit_status' => $request->visit_status,
                'status' => $request->status ?? 'unused',
                'created_by_user_id' => null,
                'created_at' => now(),
                'updated_at' => now()
            ];
            
            Log::info('Insert data before concern lookup:', $insertData);
            
            if ($request->has('concern') && !empty($request->concern)) {
                $supportConcern = DB::selectOne("SELECT id FROM support_concern WHERE name = ?", [$request->concern]);
                if ($supportConcern) {
                    $insertData['concern_id'] = $supportConcern->id;
                }
            }
            
            if ($request->has('created_by_user') && !empty($request->created_by_user)) {
                $user = DB::selectOne("SELECT id FROM users WHERE email = ?", [$request->created_by_user]);
                if ($user) {
                    $insertData['created_by_user_id'] = $user->id;
                }
            }
            
            Log::info('Insert data before insertion:', $insertData);
            Log::info('Columns: ' . implode(', ', array_keys($insertData)));
            Log::info('Values: ' . json_encode(array_values($insertData)));
            
            $columns = implode(', ', array_keys($insertData));
            $placeholders = implode(', ', array_fill(0, count($insertData), '?'));
            $query = "INSERT INTO service_orders ({$columns}) VALUES ({$placeholders})";
            
            Log::info('SQL Query: ' . $query);
            
            DB::insert($query, array_values($insertData));
            $serviceOrderId = DB::getPdo()->lastInsertId();
            
            $insertedOrder = DB::selectOne("SELECT * FROM service_orders WHERE id = ?", [$serviceOrderId]);
            Log::info('Inserted service order:', (array)$insertedOrder);
            
            Log::info('Service order created successfully', ['id' => $serviceOrderId, 'ticket_id' => $ticketId]);
            
            $currentConcern = trim($request->input('concern'));
            $supportStatus = strtolower(trim($request->input('support_status')));
            
            \Log::info('Reconnection check (store) debug:', [
                'current_concern' => $currentConcern,
                'request_support_status' => $supportStatus
            ]);
            
            $reconnectStatus = null;
            if ($currentConcern && strtolower($currentConcern) === 'reconnect' && $supportStatus === 'resolved') {
                $billingAccount = BillingAccount::where('account_no', $request->account_no)->first();
                if ($billingAccount) {
                    Log::info('Triggering auto-reconnect for NEW Service Order with Reconnect concern', [
                        'account_no' => $request->account_no
                    ]);
                    $reconnectStatus = $this->attemptReconnection($billingAccount);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Service order created successfully',
                'data' => [
                    'id' => $serviceOrderId,
                    'ticket_id' => $ticketId,
                    'reconnect_status' => $reconnectStatus
                ],
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating service order: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create service order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function show($id): JsonResponse
    {
        try {
            Log::info("Fetching service order with ID: {$id}");
            
            $order = DB::selectOne("SELECT * FROM service_orders WHERE id = ?", [$id]);

            if (!$order) {
                Log::warning("Service order not found: {$id}");
                return response()->json([
                    'success' => false,
                    'message' => 'Service order not found',
                ], 404);
            }
            
            $customer = DB::selectOne("SELECT * FROM customers WHERE account_no = ?", [$order->account_no]);
            $billingAccount = DB::selectOne("SELECT * FROM billing_accounts WHERE account_no = ?", [$order->account_no]);
            $technicalDetails = DB::selectOne("SELECT * FROM technical_details WHERE account_no = ?", [$order->account_no]);
            $supportConcern = $order->concern_id ? DB::selectOne("SELECT * FROM support_concern WHERE id = ?", [$order->concern_id]) : null;
            $repairCategory = $order->repair_category_id ? DB::selectOne("SELECT * FROM repair_category WHERE id = ?", [$order->repair_category_id]) : null;
            $createdUser = $order->created_by_user_id ? DB::selectOne("SELECT * FROM users WHERE id = ?", [$order->created_by_user_id]) : null;
            $updatedUser = $order->updated_by_user_id ? DB::selectOne("SELECT * FROM users WHERE id = ?", [$order->updated_by_user_id]) : null;
            $visitUser = $order->visit_by_user_id ? DB::selectOne("SELECT * FROM users WHERE id = ?", [$order->visit_by_user_id]) : null;
            
            $firstItem = DB::selectOne("SELECT * FROM service_order_items WHERE service_order_id = ? ORDER BY id ASC LIMIT 1", [$order->id]);
            $itemName1 = null;
            if ($firstItem && $firstItem->item_id) {
                $item = DB::selectOne("SELECT * FROM inventory_items WHERE id = ?", [$firstItem->item_id]);
                $itemName1 = $item->item_name ?? null;
            }
            
            $enrichedOrder = [
                'id' => $order->id,
                'ticket_id' => $order->ticket_id ?? $order->id,
                'timestamp' => $order->timestamp,
                'account_no' => $order->account_no,
                'account_id' => $billingAccount->id ?? null,
                'full_name' => $customer ? trim(($customer->first_name ?? '') . ' ' . ($customer->middle_initial ?? '') . ' ' . ($customer->last_name ?? '')) : null,
                'contact_number' => $customer->contact_number_primary ?? null,
                'full_address' => $customer ? trim(($customer->address ?? '') . ', ' . ($customer->barangay ?? '') . ', ' . ($customer->city ?? '') . ', ' . ($customer->region ?? '')) : null,
                'contact_address' => $customer->address ?? null,
                'date_installed' => $billingAccount->date_installed ?? null,
                'email_address' => $customer->email_address ?? null,
                'house_front_picture_url' => $customer->house_front_picture_url ?? null,
                'plan' => $customer->desired_plan ?? null,
                'group_name' => $customer->group_name ?? null,
                'username' => $technicalDetails->username ?? null,
                'connection_type' => $technicalDetails->connection_type ?? null,
                'router_modem_sn' => $technicalDetails->router_modem_sn ?? null,
                'lcp' => $technicalDetails->lcp ?? null,
                'nap' => $technicalDetails->nap ?? null,
                'port' => $technicalDetails->port ?? null,
                'vlan' => $technicalDetails->vlan ?? null,
                'lcpnap' => $technicalDetails->lcpnap ?? null,
                'item_name_1' => $itemName1,
                'concern' => $supportConcern->name ?? null,
                'concern_remarks' => $order->concern_remarks,
                'requested_by' => $order->requested_by,
                'support_status' => $order->support_status,
                'assigned_email' => $order->assigned_email,
                'repair_category' => $repairCategory->name ?? null,
                'visit_status' => $order->visit_status,
                'visit_by' => $order->visit_by ?? null,
                'visit_with' => $order->visit_with ?? null,
                'visit_with_other' => $order->visit_with_other ?? null,
                'priority_level' => $order->priority_level,
                'visit_by_user' => $visitUser->name ?? null,
                'visit_remarks' => $order->visit_remarks,
                'support_remarks' => $order->support_remarks,
                'service_charge' => $order->service_charge,
                'new_router_sn' => $order->new_router_sn,
                'new_lcpnap_id' => $order->new_lcpnap_id,
                'new_plan_id' => $order->new_plan_id,
                'client_signature_url' => $order->client_signature_url,
                'image1_url' => $order->image1_url,
                'image2_url' => $order->image2_url,
                'image3_url' => $order->image3_url,
                'time_in_image_url' => $order->time_in_image_url ?? null,
                'modem_setup_image_url' => $order->modem_setup_image_url ?? null,
                'time_out_image_url' => $order->time_out_image_url ?? null,
                'status' => $order->status ?? 'unused',
                'created_at' => $order->created_at,
                'created_by_user' => $createdUser->name ?? null,
                'updated_at' => $order->updated_at,
                'updated_by_user' => $updatedUser->name ?? null,
            ];

            return response()->json([
                'success' => true,
                'data' => $enrichedOrder,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching service order: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Service order not found',
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            Log::info("Updating service order with ID: {$id}");
            Log::info('Update data:', $request->all());
            
            $order = DB::selectOne("SELECT * FROM service_orders WHERE id = ?", [$id]);
            
            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service order not found',
                ], 404);
            }
            
            $updateData = [];
            $billingUpdateData = [];
            $customerUpdateData = [];
            $technicalUpdateData = [];
            
            if ($request->has('date_installed')) {
                $billingUpdateData['date_installed'] = $request->date_installed;
            }
            
            if ($request->has('full_name')) {
                $nameParts = explode(' ', $request->full_name);
                if (count($nameParts) >= 2) {
                    $customerUpdateData['first_name'] = $nameParts[0];
                    $customerUpdateData['last_name'] = end($nameParts);
                    if (count($nameParts) === 3) {
                        $customerUpdateData['middle_initial'] = $nameParts[1];
                    }
                }
            }
            
            if ($request->has('contact_number')) {
                $customerUpdateData['contact_number_primary'] = $request->contact_number;
            }
            
            if ($request->has('email_address')) {
                $customerUpdateData['email_address'] = $request->email_address;
            }
            
            if ($request->has('plan')) {
                $customerUpdateData['desired_plan'] = $request->plan;
            }

            if ($request->has('new_plan')) {
                $billingAccount = DB::table('billing_accounts')
                    ->where('account_no', $order->account_no)
                    ->first();
                
                if ($billingAccount) {
                    $oldPlan = DB::table('customers')
                        ->where('id', $billingAccount->customer_id)
                        ->value('desired_plan');
                    $updateData['old_plan'] = $oldPlan;
                }

                $customerUpdateData['desired_plan'] = $request->new_plan;
                $updateData['new_plan'] = $request->new_plan;
            }
            
            // Handle technical details and old/new preservation
            $technicalDetails = DB::table('technical_details')
                ->where('account_no', $order->account_no)
                ->first();

            if ($technicalDetails) {
                // Preservation and update logic
                $hasTechUpdate = $request->filled('new_lcp') || $request->filled('new_nap') || 
                                $request->filled('new_port') || $request->filled('new_vlan') || 
                                $request->filled('new_router_modem_sn') || $request->filled('router_modem_sn') ||
                                $request->filled('lcp') || $request->filled('nap') || $request->filled('port') || $request->filled('vlan');

                if ($hasTechUpdate) {
                    Log::info('Technical details update detected in ServiceOrderController');
                    
                    // Old values
                    $updateData['old_lcp'] = $technicalDetails->lcp;
                    $updateData['old_nap'] = $technicalDetails->nap;
                    $updateData['old_port'] = $technicalDetails->port;
                    $updateData['old_vlan'] = $technicalDetails->vlan;
                    $updateData['old_router_modem_sn'] = $technicalDetails->router_modem_sn;
                    $updateData['old_lcpnap'] = $technicalDetails->lcpnap;

                    // New values (checking both 'new_lcp' and legacy 'lcp' fields)
                    $newLcp = $request->input('new_lcp') ?? $request->input('lcp') ?? $technicalDetails->lcp;
                    $newNap = $request->input('new_nap') ?? $request->input('nap') ?? $technicalDetails->nap;
                    $newPort = $request->input('new_port') ?? $request->input('port') ?? $technicalDetails->port;
                    $newVlan = $request->input('new_vlan') ?? $request->input('vlan') ?? $technicalDetails->vlan;
                    $newSN = $request->input('new_router_modem_sn') ?? $request->input('router_modem_sn') ?? $technicalDetails->router_modem_sn;
                    
                    // Calculate LCPNAP
                    $newLcpNap = trim(($newLcp ?? '') . ' - ' . ($newNap ?? ''), ' - ');

                    // Store new values in service_orders
                    $updateData['new_lcp'] = $newLcp;
                    $updateData['new_nap'] = $newNap;
                    $updateData['new_port'] = $newPort;
                    $updateData['new_vlan'] = $newVlan;
                    $updateData['new_router_modem_sn'] = $newSN;
                    $updateData['new_lcpnap'] = $newLcpNap;

                    // Sync to technical_details table
                    $technicalUpdateData = [
                        'lcp' => $newLcp,
                        'nap' => $newNap,
                        'port' => $newPort,
                        'vlan' => $newVlan,
                        'router_modem_sn' => $newSN,
                        'lcpnap' => $newLcpNap,
                        'updated_at' => now(),
                        'updated_by' => Auth::user()->name ?? 'Web'
                    ];
                }
            }

            if ($request->has('username')) {
                $technicalUpdateData['username'] = $request->username;
            }
            
            if ($request->has('connection_type')) {
                $technicalUpdateData['connection_type'] = $request->connection_type;
            }
            
            if ($request->has('concern_remarks')) {
                $updateData['concern_remarks'] = $request->concern_remarks;
            }
            
            if ($request->has('support_status')) {
                $updateData['support_status'] = $request->support_status;
            }
            
            if ($request->has('assigned_email')) {
                $updateData['assigned_email'] = $request->assigned_email;
            }
            
            if ($request->has('visit_by')) {
                $updateData['visit_by'] = $request->visit_by;
            }
            
            if ($request->has('visit_with')) {
                $updateData['visit_with'] = $request->visit_with;
            }
            
            if ($request->has('visit_with_other')) {
                $updateData['visit_with_other'] = $request->visit_with_other;
            }
            
            if ($request->has('visit_status')) {
                $updateData['visit_status'] = $request->visit_status;
            }
            
            if ($request->has('visit_remarks')) {
                $updateData['visit_remarks'] = $request->visit_remarks;
            }
            
            if ($request->has('support_remarks')) {
                $updateData['support_remarks'] = $request->support_remarks;
            }
            
            if ($request->has('service_charge')) {
                $updateData['service_charge'] = $request->service_charge;
            }
            
            if ($request->has('image1_url')) {
                $updateData['image1_url'] = $request->image1_url;
            }
            
            if ($request->has('image2_url')) {
                $updateData['image2_url'] = $request->image2_url;
            }
            
            if ($request->has('image3_url')) {
                $updateData['image3_url'] = $request->image3_url;
            }
            
            if ($request->has('client_signature_url')) {
                $updateData['client_signature_url'] = $request->client_signature_url;
            }
            
            $shouldAddServiceCharge = false;
            $statusChanged = false;
            
            if ($request->has('support_status') && $request->support_status === 'Resolved' && $order->support_status !== 'Resolved') {
                $shouldAddServiceCharge = true;
                $statusChanged = true;
                Log::info('Support status changed to Resolved, will add service charge to account balance');
            }
            
            if ($request->has('visit_status') && $request->visit_status === 'Done' && $order->visit_status !== 'Done') {
                $shouldAddServiceCharge = true;
                $statusChanged = true;
                Log::info('Visit status changed to Done, will add service charge to account balance');
            }
            
            if ($shouldAddServiceCharge && $statusChanged && $request->has('service_charge')) {
                $serviceCharge = floatval($request->service_charge);
                if ($serviceCharge > 0) {
                    $billingAccount = DB::selectOne("SELECT account_balance FROM billing_accounts WHERE account_no = ?", [$order->account_no]);
                    if ($billingAccount) {
                        $currentBalance = floatval($billingAccount->account_balance);
                        $newBalance = $currentBalance + $serviceCharge;
                        DB::update("UPDATE billing_accounts SET account_balance = ?, balance_update_date = ? WHERE account_no = ?", 
                            [$newBalance, now(), $order->account_no]);
                        Log::info("Updated account balance from {$currentBalance} to {$newBalance} (added service charge: {$serviceCharge})");
                    }
                }
            }
            
            if ($request->has('updated_by')) {
                $updateData['updated_by'] = $request->updated_by;
            }
            
            $updateData['updated_at'] = now();
            
            if (!empty($updateData)) {
                $sets = [];
                $params = [];
                foreach ($updateData as $key => $value) {
                    $sets[] = "{$key} = ?";
                    $params[] = $value;
                }
                $params[] = $id;
                $query = "UPDATE service_orders SET " . implode(', ', $sets) . " WHERE id = ?";
                DB::update($query, $params);
                Log::info('Updated service_orders table');
            }
            
            if (!empty($billingUpdateData)) {
                $sets = [];
                $params = [];
                foreach ($billingUpdateData as $key => $value) {
                    $sets[] = "{$key} = ?";
                    $params[] = $value;
                }
                $params[] = $order->account_no;
                $query = "UPDATE billing_accounts SET " . implode(', ', $sets) . " WHERE account_no = ?";
                DB::update($query, $params);
                Log::info('Updated billing_accounts table');
            }
            
            if (!empty($customerUpdateData)) {
                $sets = [];
                $params = [];
                foreach ($customerUpdateData as $key => $value) {
                    $sets[] = "{$key} = ?";
                    $params[] = $value;
                }
                $params[] = $order->account_no;
                $query = "UPDATE customers SET " . implode(', ', $sets) . " WHERE account_no = ?";
                DB::update($query, $params);
                Log::info('Updated customers table');
            }
            
            if (!empty($technicalUpdateData)) {
                $sets = [];
                $params = [];
                foreach ($technicalUpdateData as $key => $value) {
                    $sets[] = "{$key} = ?";
                    $params[] = $value;
                }
                $params[] = $order->account_no;
                $query = "UPDATE technical_details SET " . implode(', ', $sets) . " WHERE account_no = ?";
                DB::update($query, $params);
                Log::info('Updated technical_details table');
            }
            
            if ($request->has('item_name_1') && !empty($request->item_name_1)) {
                Log::info('Processing item_name_1: ' . $request->item_name_1);
                
                $inventoryItem = DB::selectOne("SELECT * FROM inventory_items WHERE item_name = ?", [$request->item_name_1]);
                
                if ($inventoryItem) {
                    $existingItem = DB::selectOne("SELECT * FROM service_order_items WHERE service_order_id = ? ORDER BY id ASC LIMIT 1", [$id]);
                    
                    if ($existingItem) {
                        DB::update("UPDATE service_order_items SET item_id = ?, quantity = 1 WHERE id = ?", [$inventoryItem->id, $existingItem->id]);
                        Log::info('Updated existing service_order_item');
                    } else {
                        DB::insert("INSERT INTO service_order_items (service_order_id, item_id, quantity) VALUES (?, ?, 1)", [$id, $inventoryItem->id]);
                        Log::info('Created new service_order_item');
                    }
                } else {
                    Log::warning('Inventory item not found for: ' . $request->item_name_1);
                }
            }

            // Trigger Reconnection if concern is 'Reconnect'
            $currentConcern = trim($request->input('concern'));
            if (!$currentConcern && isset($order->concern)) {
                $currentConcern = trim($order->concern);
            }

            $supportStatus = strtolower(trim($request->input('support_status') ?? ''));
            if (empty($supportStatus) && isset($order->support_status)) {
                $supportStatus = strtolower(trim($order->support_status));
            }

            \Log::info('Reconnection check debug:', [
                'current_concern' => $currentConcern,
                'request_support_status' => $supportStatus
            ]);

            $reconnectStatus = null;
            $normalizedConcern = $currentConcern ? strtolower(trim($currentConcern)) : '';
            if ($normalizedConcern && ($normalizedConcern === 'reconnect' || $normalizedConcern === 'upgrade/downgrade plan') && $supportStatus === 'resolved') {
                $billingAccount = BillingAccount::where('account_no', $order->account_no)->first();
                if ($billingAccount) {
                    \Log::info("Triggering auto-reconnect for Service Order with {$currentConcern} concern", [
                        'account_no' => $order->account_no
                    ]);
                    $reconnectStatus = $this->attemptReconnection($billingAccount);
                }
            }

            // Trigger Disconnection if concern is 'Disconnect' and support status is 'Resolved'
            $disconnectStatus = null;
            if ($currentConcern && strtolower($currentConcern) === 'disconnect' && $supportStatus === 'resolved') {
                $billingAccount = BillingAccount::where('account_no', $order->account_no)->first();
                if ($billingAccount) {
                    \Log::info('Triggering auto-disconnect for Service Order with Disconnect concern', [
                        'account_no' => $order->account_no
                    ]);
                    $disconnectStatus = $this->attemptDisconnection($billingAccount);
                }
            }

            // Trigger Pullout if repair category is 'Pullout' and visit status is 'Done'
            $pulloutStatus = null;
            
            $visitStatus = strtolower(trim($request->input('visit_status') ?? ''));
            if (empty($visitStatus) && isset($order->visit_status)) {
                $visitStatus = strtolower(trim($order->visit_status));
            }
            
            $repairCategory = strtolower(trim($request->input('repair_category') ?? ''));
            if (empty($repairCategory) && isset($order->repair_category)) {
                $repairCategory = strtolower(trim($order->repair_category));
            }

            if ($repairCategory === 'pullout' && $visitStatus === 'done') {
                $billingAccount = BillingAccount::where('account_no', $order->account_no)->first();
                if ($billingAccount) {
                    \Log::info('Triggering auto-pullout for Service Order with Pullout repair category', [
                        'account_no' => $order->account_no
                    ]);
                    $pulloutStatus = $this->attemptPullout($billingAccount);
                }
            }

            // Trigger Migration if repair category is 'Migrate' and visit status is 'Done'
            $migrationStatus = null;
            if ($repairCategory === 'migrate' && $visitStatus === 'done') {
                $billingAccount = BillingAccount::where('account_no', $order->account_no)->first();
                if ($billingAccount) {
                    $newRouterModemSN = $request->input('new_router_modem_sn');
                    if ($newRouterModemSN) {
                        \Log::info('Triggering auto-migration for Service Order', [
                            'account_no' => $order->account_no,
                            'new_sn' => $newRouterModemSN
                        ]);
                        $migrationStatus = $this->attemptMigration($billingAccount, $newRouterModemSN);
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Service order updated successfully',
                'reconnect_status' => $reconnectStatus,
                'disconnect_status' => $disconnectStatus,
                'pullout_status' => $pulloutStatus,
                'migration_status' => $migrationStatus
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating service order: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update service order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $serviceOrder = ServiceOrder::findOrFail($id);
            $serviceOrder->delete();

            return response()->json([
                'success' => true,
                'message' => 'Service order deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete service order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function attemptReconnection($billingAccount): string
    {
        try {
            // Reload billing account
            $billingAccount = BillingAccount::find($billingAccount->id);
            $accountNo = $billingAccount->account_no;
            
            \Log::info('[SERVICE ORDER RECONNECT] Force starting for account: ' . $accountNo);

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
                \Log::info('[SERVICE ORDER RECONNECT SKIP] No PPPoE username found in technical_details');
                return 'no_username';
            }

            if (empty($plan)) {
                \Log::info('[SERVICE ORDER RECONNECT SKIP] No plan found');
                return 'no_plan';
            }

            \Log::info('[SERVICE ORDER RECONNECT PROCEED] Reconnecting user for account: ' . $accountNo);

            // Step 4: Update billing_status_id to 1 (Active) BEFORE reconnecting
            $billingAccount->billing_status_id = 1;
            $billingAccount->updated_at = now();
            $billingAccount->updated_by = Auth::id();
            $billingAccount->save();
            
            \Log::info('[SERVICE ORDER RECONNECT DB] Updated billing_status_id to 1 for Account: ' . $accountNo);

            // Step 5: Prepare parameters for ManualRadiusOperationsService
            $params = [
                'accountNumber' => $accountNo,
                'username' => $username,
                'plan' => $plan,
                'updatedBy' => 'Service Order Auto-Reconnect'
            ];

            // Step 6: Call ManualRadiusOperationsService reconnectUser
            \Log::info('[SERVICE ORDER RECONNECT EXECUTE] Calling ManualRadiusOperationsService for ' . $username);
            
            $manualRadiusService = new ManualRadiusOperationsService();
            $result = $manualRadiusService->reconnectUser($params);

            if ($result['status'] === 'success') {
                \Log::info('[SERVICE ORDER RECONNECT SUCCESS] Reconnection completed successfully');

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
                                'customers.desired_plan as plan_name',
                                DB::raw("CONCAT(customers.first_name, ' ', IFNULL(customers.middle_initial, ''), ' ', customers.last_name) as full_name")
                            )
                            ->first();

                        if ($customerInfo && !empty($customerInfo->contact_number_primary)) {
                            $message = $smsTemplate->message_content;
                            $planNameFormatted = str_replace('₱', 'P', $customerInfo->plan_name ?? '');
                            $customerName = preg_replace('/\s+/', ' ', trim($customerInfo->full_name));
                            $message = str_replace('{{customer_name}}', $customerName, $message);
                            $message = str_replace('{{account_no}}', $accountNo, $message);
                            $message = str_replace('{{plan_name}}', $planNameFormatted, $message);
                            $message = str_replace('{{plan_nam}}', $planNameFormatted, $message);

                            $smsService = new \App\Services\ItexmoSmsService();
                            $smsResult = $smsService->send([
                                'contact_no' => $customerInfo->contact_number_primary,
                                'message' => $message
                            ]);

                            if ($smsResult['success']) {
                                \Log::info('[SERVICE ORDER RECONNECT SMS] SMS sent');
                            }
                        }
                    }
                } catch (\Exception $e) {
                    \Log::error('[SERVICE ORDER RECONNECT SMS EXCEPTION] ' . $e->getMessage());
                }

                // Send Email Notification
                try {
                    $emailTemplate = \App\Models\EmailTemplate::where('Template_Code', 'RECONNECT')->first();
                    
                         if (!empty($emailTemplate) && !empty($customerInfo->email_address)) {
                              $emailService = app(\App\Services\EmailQueueService::class);
                              $emailData = [
                                  'customer_name' => $customerInfo->full_name,
                                  'account_no' => $accountNo,
                                  'recipient_email' => $customerInfo->email_address,
                              ];
                              $emailService->queueFromTemplate('RECONNECT', $emailData);
                              \Log::info('[SERVICE ORDER RECONNECT EMAIL] Email queued');
                         }
                } catch (\Exception $e) {
                    \Log::error('[SERVICE ORDER RECONNECT EMAIL EXCEPTION] ' . $e->getMessage());
                }

                return 'success';
            } else {
                \Log::info('[SERVICE ORDER RECONNECT FAILED] ' . $result['message']);
                return 'failed';
            }

        } catch (\Exception $e) {
            \Log::error('[SERVICE ORDER RECONNECT EXCEPTION] ' . $e->getMessage());
            return 'exception';
        }
    }

    private function attemptDisconnection($billingAccount): string
    {
        try {
            // Reload billing account
            $billingAccount = BillingAccount::find($billingAccount->id);
            $accountNo = $billingAccount->account_no;
            
            \Log::info('[SERVICE ORDER DISCONNECT] Force starting for account: ' . $accountNo);

            // Get account details (PPPoE Username)
            $accountInfo = DB::table('billing_accounts')
                ->leftJoin('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                ->leftJoin('technical_details', 'billing_accounts.id', '=', 'technical_details.account_id')
                ->where('billing_accounts.id', $billingAccount->id)
                ->select('technical_details.username as pppoe_username')
                ->first();

            $username = $accountInfo->pppoe_username ?? null;

            if (empty($username)) {
                \Log::info('[SERVICE ORDER DISCONNECT SKIP] No PPPoE username found in technical_details');
                return 'no_username';
            }

            \Log::info('[SERVICE ORDER DISCONNECT PROCEED] Disconnecting user for account: ' . $accountNo);

            // Prepare parameters for ManualRadiusOperationsService
            $params = [
                'accountNumber' => $accountNo,
                'username' => $username,
                'remarks' => 'Disconnect',
                'updatedBy' => 'Service Order Auto-Disconnect'
            ];

            // Call ManualRadiusOperationsService disconnectUser
            \Log::info('[SERVICE ORDER DISCONNECT EXECUTE] Calling ManualRadiusOperationsService for ' . $username);
            
            $manualRadiusService = new ManualRadiusOperationsService();
            $result = $manualRadiusService->disconnectUser($params);

            if ($result['status'] === 'success') {
                \Log::info('[SERVICE ORDER DISCONNECT SUCCESS] Disconnection completed successfully');

                // Update billing_status_id to 4 (Disconnected) AFTER successful RADIUS disconnect
                $billingAccount->billing_status_id = 4;
                $billingAccount->updated_at = now();
                $billingAccount->updated_by = Auth::id();
                $billingAccount->save();
                
                \Log::info('[SERVICE ORDER DISCONNECT DB] Updated billing_status_id to 4 (Disconnected) for Account: ' . $accountNo);

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
                                'customers.desired_plan as plan_name',
                                DB::raw("CONCAT(customers.first_name, ' ', IFNULL(customers.middle_initial, ''), ' ', customers.last_name) as full_name"),
                                'billing_accounts.account_balance'
                            )
                            ->first();

                        if ($customerInfo && !empty($customerInfo->contact_number_primary)) {
                            $message = $smsTemplate->message_content;
                            $planNameFormatted = str_replace('₱', 'P', $customerInfo->plan_name ?? '');
                            $customerName = preg_replace('/\s+/', ' ', trim($customerInfo->full_name));
                            $message = str_replace('{{customer_name}}', $customerName, $message);
                            $message = str_replace('{{account_no}}', $accountNo, $message);
                            $message = str_replace('{{plan_name}}', $planNameFormatted, $message);
                            $message = str_replace('{{plan_nam}}', $planNameFormatted, $message);
                            $message = str_replace('{{amount_due}}', number_format($customerInfo->account_balance, 2), $message);
                            $message = str_replace('{{balance}}', number_format($customerInfo->account_balance, 2), $message);

                            $smsService = new \App\Services\ItexmoSmsService();
                            $smsResult = $smsService->send([
                                'contact_no' => $customerInfo->contact_number_primary,
                                'message' => $message
                            ]);

                            if ($smsResult['success']) {
                                \Log::info('[SERVICE ORDER DISCONNECT SMS] SMS sent');
                            }
                        }
                    }
                } catch (\Exception $e) {
                    \Log::error('[SERVICE ORDER DISCONNECT SMS EXCEPTION] ' . $e->getMessage());
                }

                // Send Email Notification
                try {
                    $emailTemplate = \App\Models\EmailTemplate::where('Template_Code', 'DISCONNECTED')->first();
                    
                         if (!empty($emailTemplate) && !empty($customerInfo->email_address)) {
                              $emailService = app(\App\Services\EmailQueueService::class);
                              $emailData = [
                                  'customer_name' => $customerInfo->full_name,
                                  'account_no' => $accountNo,
                                  'amount_due' => number_format($customerInfo->account_balance, 2),
                                  'balance' => number_format($customerInfo->account_balance, 2),
                                  'recipient_email' => $customerInfo->email_address,
                              ];
                              $emailService->queueFromTemplate('DISCONNECTED', $emailData);
                              \Log::info('[SERVICE ORDER DISCONNECT EMAIL] Email queued');
                         }
                } catch (\Exception $e) {
                    \Log::error('[SERVICE ORDER DISCONNECT EMAIL EXCEPTION] ' . $e->getMessage());
                }

                return 'success';
            } else {
                \Log::info('[SERVICE ORDER DISCONNECT FAILED] ' . $result['message']);
                return 'failed';
            }

        } catch (\Exception $e) {
            \Log::error('[SERVICE ORDER DISCONNECT EXCEPTION] ' . $e->getMessage());
            return 'exception';
        }
    }

    private function attemptPullout($billingAccount): string
    {
        try {
            // Reload billing account
            $billingAccount = BillingAccount::find($billingAccount->id);
            $accountNo = $billingAccount->account_no;
            
            \Log::info('[SERVICE ORDER PULLOUT] Force starting for account: ' . $accountNo);

            // Get account details (PPPoE Username)
            $accountInfo = DB::table('billing_accounts')
                ->leftJoin('customers', 'billing_accounts.customer_id', '=', 'customers.id')
                ->leftJoin('technical_details', 'billing_accounts.id', '=', 'technical_details.account_id')
                ->where('billing_accounts.id', $billingAccount->id)
                ->select('technical_details.username as pppoe_username')
                ->first();

            $username = $accountInfo->pppoe_username ?? null;

            if (empty($username)) {
                \Log::info('[SERVICE ORDER PULLOUT SKIP] No PPPoE username found in technical_details');
                return 'no_username';
            }

            \Log::info('[SERVICE ORDER PULLOUT PROCEED] Executing pullout for account: ' . $accountNo);

            // Prepare parameters for ManualRadiusOperationsService
            $params = [
                'accountNumber' => $accountNo,
                'username' => $username,
                'remarks' => 'Pullout',
                'updatedBy' => 'Service Order Auto-Pullout'
            ];

            // Call ManualRadiusOperationsService disconnectUser
            \Log::info('[SERVICE ORDER PULLOUT EXECUTE] Calling ManualRadiusOperationsService for ' . $username);
            
            $manualRadiusService = new ManualRadiusOperationsService();
            $result = $manualRadiusService->disconnectUser($params);

            if ($result['status'] === 'success') {
                \Log::info('[SERVICE ORDER PULLOUT SUCCESS] Disconnection completed successfully');

                // Update billing_status_id to 5 (Pullout) AFTER successful RADIUS disconnect
                $billingAccount->billing_status_id = 5;
                $billingAccount->updated_at = now();
                $billingAccount->updated_by = Auth::id();
                $billingAccount->save();
                
                \Log::info('[SERVICE ORDER PULLOUT DB] Updated billing_status_id to 5 (Pullout) for Account: ' . $accountNo);

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

                \Log::info('[SERVICE ORDER PULLOUT DB] Cleared technical details for Account: ' . $accountNo);

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
                                'customers.desired_plan as plan_name',
                                DB::raw("CONCAT(customers.first_name, ' ', IFNULL(customers.middle_initial, ''), ' ', customers.last_name) as full_name"),
                                'billing_accounts.account_balance'
                            )
                            ->first();

                        if ($customerInfo && !empty($customerInfo->contact_number_primary)) {
                            $message = $smsTemplate->message_content;
                            $planNameFormatted = str_replace('₱', 'P', $customerInfo->plan_name ?? '');
                            $customerName = preg_replace('/\s+/', ' ', trim($customerInfo->full_name));
                            $message = str_replace('{{customer_name}}', $customerName, $message);
                            $message = str_replace('{{account_no}}', $accountNo, $message);
                            $message = str_replace('{{plan_name}}', $planNameFormatted, $message);
                            $message = str_replace('{{plan_nam}}', $planNameFormatted, $message);
                            $message = str_replace('{{amount_due}}', number_format($customerInfo->account_balance, 2), $message);
                            $message = str_replace('{{balance}}', number_format($customerInfo->account_balance, 2), $message);

                            $smsService = new \App\Services\ItexmoSmsService();
                            $smsResult = $smsService->send([
                                'contact_no' => $customerInfo->contact_number_primary,
                                'message' => $message
                            ]);

                            if ($smsResult['success']) {
                                \Log::info('[SERVICE ORDER PULLOUT SMS] SMS sent');
                            }
                        }
                    }
                } catch (\Exception $e) {
                    \Log::error('[SERVICE ORDER PULLOUT SMS EXCEPTION] ' . $e->getMessage());
                }

                // Send Email Notification
                try {
                    $emailTemplate = \App\Models\EmailTemplate::where('Template_Code', 'DISCONNECTED')->first();
                    
                         if (!empty($emailTemplate) && !empty($customerInfo->email_address)) {
                              $emailService = app(\App\Services\EmailQueueService::class);
                              $emailData = [
                                  'customer_name' => $customerInfo->full_name,
                                  'account_no' => $accountNo,
                                  'amount_due' => number_format($customerInfo->account_balance, 2),
                                  'balance' => number_format($customerInfo->account_balance, 2),
                                  'recipient_email' => $customerInfo->email_address,
                              ];
                              $emailService->queueFromTemplate('DISCONNECTED', $emailData);
                              \Log::info('[SERVICE ORDER PULLOUT EMAIL] Email queued');
                         }
                } catch (\Exception $e) {
                    \Log::error('[SERVICE ORDER PULLOUT EMAIL EXCEPTION] ' . $e->getMessage());
                }

                return 'success';
            } else {
                \Log::info('[SERVICE ORDER PULLOUT FAILED] ' . $result['message']);
                return 'failed';
            }

        } catch (\Exception $e) {
            \Log::error('[SERVICE ORDER PULLOUT EXCEPTION] ' . $e->getMessage());
            return 'exception';
        }
    }

    private function attemptMigration($billingAccount, $newRouterModemSN): string
    {
        try {
            $accountNo = $billingAccount->account_no;
            
            \Log::info('[SERVICE ORDER MIGRATION] Force starting for account: ' . $accountNo);

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
                \Log::info('[SERVICE ORDER MIGRATION SKIP] No PPPoE username found');
                return 'no_username';
            }

            // Generate new username using the same logic as JobOrderController
            $pppoeService = new PppoeUsernameService();
            $customerData = (array)$fullInfo;
            $newUsername = $pppoeService->generateUniqueUsername($customerData);

            \Log::info('[SERVICE ORDER MIGRATION] Generated new username', [
                'old' => $oldUsername,
                'new' => $newUsername
            ]);

            // Prepare parameters for ManualRadiusOperationsService
            // Password is NOT changed during migration
            $params = [
                'accountNumber' => $accountNo,
                'username' => $oldUsername,
                'newUsername' => $newUsername,
                'updatedBy' => 'Service Order Auto-Migration'
            ];

            \Log::info('[SERVICE ORDER MIGRATION EXECUTE] Calling ManualRadiusOperationsService for ' . $oldUsername);
            
            $manualRadiusService = new ManualRadiusOperationsService();
            $result = $manualRadiusService->updateCredentials($params);

            if ($result['status'] === 'success') {
                \Log::info('[SERVICE ORDER MIGRATION SUCCESS] Migration completed successfully');
                return 'success';
            } else {
                \Log::info('[SERVICE ORDER MIGRATION FAILED] ' . $result['message']);
                return 'failed';
            }

        } catch (\Exception $e) {
            \Log::error('[SERVICE ORDER MIGRATION EXCEPTION] ' . $e->getMessage());
            return 'exception';
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
}

