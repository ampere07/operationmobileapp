<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ServiceOrderApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = DB::table('service_orders as so')
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
                ->orderBy('so.created_at', 'desc');
            
            if ($request->has('assigned_email')) {
                $query->where('so.assigned_email', $request->input('assigned_email'));
            }
            
            if ($request->has('account_no')) {
                $query->where('so.account_no', $request->input('account_no'));
            }
            
            if ($request->has('support_status')) {
                $query->where('so.support_status', $request->input('support_status'));
            }
            
            $serviceOrders = $query->get();
            
            return response()->json([
                'success' => true,
                'data' => $serviceOrders,
                'count' => $serviceOrders->count()
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
            
            return response()->json([
                'success' => true,
                'message' => 'Service order created successfully',
                'data' => $serviceOrder,
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
                    if ($request->filled('new_lcp') && !empty($technicalDetails->lcp)) {
                        $data['old_lcp'] = $technicalDetails->lcp;
                    }
                    if ($request->filled('new_nap') && !empty($technicalDetails->nap)) {
                        $data['old_nap'] = $technicalDetails->nap;
                    }
                    if ($request->filled('new_port') && !empty($technicalDetails->port)) {
                        $data['old_port'] = $technicalDetails->port;
                    }
                    if ($request->filled('new_vlan') && !empty($technicalDetails->vlan)) {
                        $data['old_vlan'] = $technicalDetails->vlan;
                    }
                    if ($request->filled('new_router_modem_sn') && !empty($technicalDetails->router_modem_sn)) {
                        $data['old_router_modem_sn'] = $technicalDetails->router_modem_sn;
                    }
                    
                    // Prepare updates for technical_details
                    $technicalUpdates = [];
                    if ($request->filled('new_lcp')) {
                        $technicalUpdates['lcp'] = $request->input('new_lcp');
                    }
                    if ($request->filled('new_nap')) {
                        $technicalUpdates['nap'] = $request->input('new_nap');
                    }
                    if ($request->filled('new_port')) {
                        $technicalUpdates['port'] = $request->input('new_port');
                    }
                    if ($request->filled('new_vlan')) {
                        $technicalUpdates['vlan'] = $request->input('new_vlan');
                    }
                    if ($request->filled('new_router_modem_sn')) {
                        $technicalUpdates['router_modem_sn'] = $request->input('new_router_modem_sn');
                    }
                    
                    // Update technical_details table
                    if (!empty($technicalUpdates)) {
                        $technicalUpdates['updated_at'] = now();
                        DB::table('technical_details')
                            ->where('account_no', $serviceOrder->account_no)
                            ->update($technicalUpdates);
                        
                        Log::info('Updated technical_details', [
                            'account_no' => $serviceOrder->account_no,
                            'updates' => $technicalUpdates,
                            'old_values' => [
                                'old_lcp' => $data['old_lcp'] ?? null,
                                'old_nap' => $data['old_nap'] ?? null,
                                'old_port' => $data['old_port'] ?? null,
                                'old_vlan' => $data['old_vlan'] ?? null,
                                'old_router_modem_sn' => $data['old_router_modem_sn'] ?? null
                            ]
                        ]);
                    }
                } else {
                    Log::warning('No technical details found for account_no: ' . $serviceOrder->account_no);
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
            
            $updatedServiceOrder = DB::table('service_orders')->where('id', $id)->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Service order updated successfully',
                'data' => $updatedServiceOrder
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
}
