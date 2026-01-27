<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Models\ServiceOrderItem;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ServiceOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            Log::info('Fetching service orders with related data');
            
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
            
            if (!empty($whereClauses)) {
                $query .= " WHERE " . implode(' AND ', $whereClauses);
            }
            
            $query .= " ORDER BY created_at DESC";
            $serviceOrders = DB::select($query, $params);
            
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

            $count = count($enrichedOrders);
            Log::info('Found ' . $count . ' service orders');

            return response()->json([
                'success' => true,
                'data' => $enrichedOrders,
                'count' => $count
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching service orders: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service orders: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'file' => $e->getFile() . ':' . $e->getLine()
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
                'support_status' => $request->support_status ?? 'Pending',
                'concern_id' => null,
                'concern_remarks' => $request->concern_remarks,
                'priority_level' => $request->priority_level,
                'requested_by' => $request->requested_by,
                'visit_status' => $request->visit_status ?? 'Pending',
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

            return response()->json([
                'success' => true,
                'message' => 'Service order created successfully',
                'data' => [
                    'id' => $serviceOrderId,
                    'ticket_id' => $ticketId
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
            
            if ($request->has('username')) {
                $technicalUpdateData['username'] = $request->username;
            }
            
            if ($request->has('connection_type')) {
                $technicalUpdateData['connection_type'] = $request->connection_type;
            }
            
            if ($request->has('router_modem_sn')) {
                $technicalUpdateData['router_modem_sn'] = $request->router_modem_sn;
            }
            
            if ($request->has('lcp')) {
                $technicalUpdateData['lcp'] = $request->lcp;
            }
            
            if ($request->has('nap')) {
                $technicalUpdateData['nap'] = $request->nap;
            }
            
            if ($request->has('port')) {
                $technicalUpdateData['port'] = $request->port;
            }
            
            if ($request->has('vlan')) {
                $technicalUpdateData['vlan'] = $request->vlan;
            }
            
            if ($request->has('lcpnap')) {
                $technicalUpdateData['lcpnap'] = $request->lcpnap;
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

            return response()->json([
                'success' => true,
                'message' => 'Service order updated successfully',
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
