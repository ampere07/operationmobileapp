<?php

namespace App\Http\Controllers;

use App\Models\JobOrder;
use App\Models\Customer;
use App\Models\TechnicalDetail;
use App\Models\BillingAccount;
use App\Models\Application;
use App\Models\ModemRouterSN;
use App\Models\ContractTemplate;
use App\Models\Port;
use App\Models\VLAN;
use App\Models\LCPNAPLocation;
use App\Models\Plan;
use App\Models\User;
use App\Models\Role;
use App\Models\OnlineStatus;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;

use App\Services\GoogleDriveService;
use App\Services\PppoeUsernameService;
use App\Models\RadiusConfig;

class JobOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $page = $request->input('page', 1);
            $limit = $request->input('limit', 50); // Default 50 for faster response
            $search = $request->input('search', '');
            $fastMode = $request->input('fast', false); // Fast mode: skip heavy processing

            \Log::info('JobOrderController: Starting to fetch job orders', [
                'page' => $page,
                'limit' => $limit,
                'search' => $search,
                'fast_mode' => $fastMode
            ]);

            $query = JobOrder::with('application')->orderBy('id', 'desc');
            
            if ($request->has('assigned_email')) {
                $assignedEmail = $request->query('assigned_email');
                \Log::info('Filtering job orders by assigned_email: ' . $assignedEmail);
                $query->where('assigned_email', $assignedEmail);
            }
            
            if ($request->has('user_role') && strtolower($request->query('user_role')) === 'technician') {
                $sevenDaysAgo = now()->subDays(7);
                $query->where('updated_at', '>=', $sevenDaysAgo);
                \Log::info('Filtering job orders for technician role: only showing records from last 7 days', [
                    'cutoff_date' => $sevenDaysAgo->toDateTimeString()
                ]);
            }

            // Apply search filter
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('assigned_email', 'LIKE', "%{$search}%")
                      ->orWhere('onsite_status', 'LIKE', "%{$search}%")
                      ->orWhere('username', 'LIKE', "%{$search}%")
                      ->orWhereHas('application', function ($appQuery) use ($search) {
                          $appQuery->where('first_name', 'LIKE', "%{$search}%")
                                   ->orWhere('last_name', 'LIKE', "%{$search}%")
                                   ->orWhere('city', 'LIKE', "%{$search}%");
                      });
                });
            }

            // Fetch one extra record to check if there are more pages
            $jobOrders = $query->skip(($page - 1) * $limit)
                ->take($limit + 1)
                ->get();

            // Check if there are more pages
            $hasMore = $jobOrders->count() > $limit;

            // Remove the extra record if it exists
            if ($hasMore) {
                $jobOrders = $jobOrders->slice(0, $limit);
            }

            \Log::info('JobOrderController: Fetched ' . $jobOrders->count() . ' job orders');

            // Fast mode: Return minimal data immediately
            if ($fastMode) {
                $formattedJobOrders = $jobOrders->map(function ($jobOrder) {
                    $application = $jobOrder->application;
                    
                    return [
                        'id' => $jobOrder->id,
                        'JobOrder_ID' => $jobOrder->id,
                        'application_id' => $jobOrder->application_id,
                        'Timestamp' => $jobOrder->timestamp ? $jobOrder->timestamp->format('Y-m-d H:i:s') : null,
                        'Onsite_Status' => $jobOrder->onsite_status,
                        'Assigned_Email' => $jobOrder->assigned_email,
                        'Username' => $jobOrder->username,
                        'First_Name' => $application ? $application->first_name : null,
                        'Last_Name' => $application ? $application->last_name : null,
                        'updated_at' => $jobOrder->updated_at ? $jobOrder->updated_at->format('Y-m-d H:i:s') : null,
                    ];
                });

                return response()->json([
                    'success' => true,
                    'data' => $formattedJobOrders->values(),
                    'pagination' => [
                        'current_page' => (int) $page,
                        'per_page' => (int) $limit,
                        'has_more' => $hasMore
                    ]
                ]);
            }

            // Normal mode: Return full data
            $formattedJobOrders = $jobOrders->map(function ($jobOrder) {
                $application = $jobOrder->application;
                
                return [
                    'id' => $jobOrder->id,
                    'JobOrder_ID' => $jobOrder->id,
                    'application_id' => $jobOrder->application_id,
                    'Timestamp' => $jobOrder->timestamp ? $jobOrder->timestamp->format('Y-m-d H:i:s') : null,
                    'Installation_Fee' => $jobOrder->installation_fee,
                    'Billing_Day' => $jobOrder->billing_day,
                    'Onsite_Status' => $jobOrder->onsite_status,
                    'billing_status_id' => $jobOrder->billing_status_id,
                    'Status_Remarks' => $jobOrder->status_remarks,
                    'Assigned_Email' => $jobOrder->assigned_email,
                    'Contract_Template' => $jobOrder->contract_link,
                    'contract_link' => $jobOrder->contract_link,
                    'Modified_By' => $jobOrder->created_by_user_email,
                    'Modified_Date' => $jobOrder->updated_at ? $jobOrder->updated_at->format('Y-m-d H:i:s') : null,
                    'Username' => $jobOrder->username,
                    'group_name' => $jobOrder->group_name,
                    'pppoe_username' => $jobOrder->pppoe_username,
                    'pppoe_password' => $jobOrder->pppoe_password,
                    
                    'date_installed' => $jobOrder->date_installed,
                    'usage_type' => $jobOrder->usage_type,
                    'connection_type' => $jobOrder->connection_type,
                    'router_model' => $jobOrder->router_model,
                    'modem_router_sn' => $jobOrder->modem_router_sn,
                    'Modem_SN' => $jobOrder->modem_router_sn,
                    'modem_sn' => $jobOrder->modem_router_sn,
                    'lcpnap' => $jobOrder->lcpnap,
                    'port' => $jobOrder->port,
                    'vlan' => $jobOrder->vlan,
                    'visit_by' => $jobOrder->visit_by,
                    'visit_with' => $jobOrder->visit_with,
                    'visit_with_other' => $jobOrder->visit_with_other,
                    'ip_address' => $jobOrder->ip_address,
                    'address_coordinates' => $jobOrder->address_coordinates,
                    'onsite_remarks' => $jobOrder->onsite_remarks,
                    'username_status' => $jobOrder->username_status,
                    
                    'client_signature_url' => $jobOrder->client_signature_url,
                    'setup_image_url' => $jobOrder->setup_image_url,
                    'speedtest_image_url' => $jobOrder->speedtest_image_url,
                    'signed_contract_image_url' => $jobOrder->signed_contract_image_url,
                    'box_reading_image_url' => $jobOrder->box_reading_image_url,
                    'router_reading_image_url' => $jobOrder->router_reading_image_url,
                    'port_label_image_url' => $jobOrder->port_label_image_url,
                    'house_front_picture_url' => $jobOrder->house_front_picture_url,
                    'installation_landmark' => $jobOrder->installation_landmark,
                    
                    'created_at' => $jobOrder->created_at ? $jobOrder->created_at->format('Y-m-d H:i:s') : null,
                    'updated_at' => $jobOrder->updated_at ? $jobOrder->updated_at->format('Y-m-d H:i:s') : null,
                    'created_by_user_email' => $jobOrder->created_by_user_email,
                    'updated_by_user_email' => $jobOrder->updated_by_user_email,
                    
                    'First_Name' => $application ? $application->first_name : null,
                    'Middle_Initial' => $application ? $application->middle_initial : null,
                    'Last_Name' => $application ? $application->last_name : null,
                    'Address' => $application ? $application->installation_address : null,
                    'Installation_Address' => $application ? $application->installation_address : null,
                    'Location' => $application ? $application->location : null,
                    'City' => $application ? $application->city : null,
                    'Region' => $application ? $application->region : null,
                    'Barangay' => $application ? $application->barangay : null,
                    'Email_Address' => $application ? $application->email_address : null,
                    'Mobile_Number' => $application ? $application->mobile_number : null,
                    'Secondary_Mobile_Number' => $application ? $application->secondary_mobile_number : null,
                    'Desired_Plan' => $application ? $application->desired_plan : null,
                    'Referred_By' => $application ? $application->referred_by : null,
                    'Billing_Status' => $jobOrder->billing_status_id,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedJobOrders->values(),
                'pagination' => [
                    'current_page' => (int) $page,
                    'per_page' => (int) $limit,
                    'has_more' => $hasMore
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching job orders: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch job orders',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    public function store(Request $request): JsonResponse
    {
        try {
            \Log::info('JobOrder Store Request', [
                'request_data' => $request->all()
            ]);

            $validator = Validator::make($request->all(), [
                'application_id' => 'required|integer|exists:applications,id',
                'timestamp' => 'nullable|date',
                'installation_fee' => 'nullable|numeric|min:0',
                'billing_day' => 'nullable|integer|min:0|max:31',
                'billing_status_id' => 'nullable|integer|exists:billing_status,id',
                'onsite_status' => 'nullable|string|max:255',
                'assigned_email' => 'nullable|email|max:255',
                'onsite_remarks' => 'nullable|string',
                'status_remarks' => 'nullable|string|max:255',
                'modem_router_sn' => 'nullable|string|max:255',
                'username' => 'nullable|string|max:255',
                'group_name' => 'nullable|string|max:255',
                'installation_landmark' => 'nullable|string|max:255',
                'created_by_user_email' => 'nullable|email|max:255',
                'updated_by_user_email' => 'nullable|email|max:255',
                'contract_link' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                \Log::error('JobOrder Store Validation Failed', [
                    'errors' => $validator->errors()->toArray()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $data = $request->all();

            // Sync pppoe_username to username if present
            if (isset($data['pppoe_username']) && !empty($data['pppoe_username'])) {
                $data['username'] = $data['pppoe_username'];
            }
            
            // Set default values if not provided
            if (!isset($data['billing_status_id'])) {
                $data['billing_status_id'] = 2; // Default to pending/initial status (assuming 1 is Active)
            }
            
            if (!isset($data['onsite_status'])) {
                $data['onsite_status'] = 'Pending';
            }
            
            \Log::info('JobOrder Creating with data', [
                'data' => $data
            ]);
            
            $jobOrder = JobOrder::create($data);

            $jobOrder->load('application');

            \Log::info('JobOrder Created Successfully', [
                'id' => $jobOrder->id,
                'application_id' => $jobOrder->application_id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Job order created successfully',
                'data' => $jobOrder,
            ], 201);
        } catch (\Exception $e) {
            \Log::error('JobOrder Store Failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create job order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    public function show($id): JsonResponse
    {
        try {
            $jobOrder = JobOrder::with('application')->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $jobOrder,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Job order not found',
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            \Log::info('JobOrder Update Request', [
                'id' => $id,
                'request_data' => $request->all()
            ]);

            $jobOrder = JobOrder::with('lcpnapLocation')->findOrFail($id);
            
            $generateCredentials = $request->input('generate_credentials', false);
            
            // Auto-generate credentials if pppoe_username is provided but pppoe_password is empty
            $hasUsername = $request->has('pppoe_username') && !empty($request->input('pppoe_username'));
            $hasPassword = $request->has('pppoe_password') && !empty($request->input('pppoe_password'));
            
            if ($hasUsername && !$hasPassword) {
                // Case 1: Username provided, password missing - generate password
                $application = $jobOrder->application;
                
                if ($application) {
                    $pppoeService = new PppoeUsernameService();
                    
                    $lcpnapValue = $request->input('lcpnap', $jobOrder->lcpnap);
                    $portValue = $request->input('port', $jobOrder->port);
                    $lcpnapData = null;
                    
                    if ($lcpnapValue) {
                        $lcpnapData = LCPNAPLocation::where('lcpnap_name', trim($lcpnapValue))
                                                 ->orWhere('id', trim($lcpnapValue))
                                                 ->first();
                    }
                    
                    $customerData = [
                        'first_name' => $application->first_name ?? '',
                        'middle_initial' => $application->middle_initial ?? '',
                        'last_name' => $application->last_name ?? '',
                        'mobile_number' => $application->mobile_number ?? '',
                        'lcp' => trim($lcpnapData->lcp ?? ''),
                        'nap' => trim($lcpnapData->nap ?? ''),
                        'port' => trim($portValue ?? ''),
                        'tech_input_username' => $request->input('pppoe_username'),
                        'custom_password' => $request->input('custom_password'),
                    ];
                    
                    $password = $pppoeService->generatePassword($customerData);
                    
                    $request->merge([
                        'pppoe_password' => $password,
                    ]);
                    
                    \Log::info('Auto-generated PPPoE password for provided username', [
                        'job_order_id' => $id,
                        'username' => $request->input('pppoe_username'),
                        'password_length' => strlen($password),
                        'password_merged' => $request->has('pppoe_password'),
                        'password_in_request' => $request->input('pppoe_password') ? 'YES' : 'NO',
                        'lcp_value' => $jobOrder->lcpnapLocation->lcp ?? 'NOT SET',
                        'nap_value' => $jobOrder->lcpnapLocation->nap ?? 'NOT SET'
                    ]);
                }
            } elseif (!$hasUsername && $hasPassword) {
                // Case 2: Password provided (from RADIUS), username missing - generate username
                $application = $jobOrder->application;
                
                if ($application) {
                    $pppoeService = new PppoeUsernameService();
                    
                    $lcpnapValue = $request->input('lcpnap', $jobOrder->lcpnap);
                    $portValue = $request->input('port', $jobOrder->port);
                    $lcpnapData = null;
                    
                    if ($lcpnapValue) {
                        $lcpnapData = LCPNAPLocation::where('lcpnap_name', trim($lcpnapValue))
                                                 ->orWhere('id', trim($lcpnapValue))
                                                 ->first();
                    }
                    
                    $customerData = [
                        'first_name' => $application->first_name ?? '',
                        'middle_initial' => $application->middle_initial ?? '',
                        'last_name' => $application->last_name ?? '',
                        'mobile_number' => $application->mobile_number ?? '',
                        'lcp' => trim($lcpnapData->lcp ?? ''),
                        'nap' => trim($lcpnapData->nap ?? ''),
                        'port' => trim($portValue ?? ''),
                        'tech_input_username' => $request->input('tech_input_username'),
                        'custom_password' => $request->input('custom_password'),
                    ];
                    
                    $username = $pppoeService->generateUniqueUsername($customerData, $id);
                    
                    $request->merge([
                        'pppoe_username' => $username,
                    ]);
                    
                    \Log::info('Auto-generated PPPoE username for provided password', [
                        'job_order_id' => $id,
                        'username' => $username,
                        'username_length' => strlen($username),
                        'password_from_radius' => true,
                        'lcp_value' => $jobOrder->lcpnapLocation->lcp ?? 'NOT SET',
                        'nap_value' => $jobOrder->lcpnapLocation->nap ?? 'NOT SET'
                    ]);
                }
            } elseif ($generateCredentials && empty($jobOrder->pppoe_username)) {
                // Case 3: No credentials provided - generate both
                $application = $jobOrder->application;
                
                if ($application) {
                    $pppoeService = new PppoeUsernameService();
                    
                    $lcpnapValue = $request->input('lcpnap', $jobOrder->lcpnap);
                    $portValue = $request->input('port', $jobOrder->port);
                    $lcpnapData = null;
                    
                    if ($lcpnapValue) {
                        $lcpnapData = LCPNAPLocation::where('lcpnap_name', trim($lcpnapValue))
                                                 ->orWhere('id', trim($lcpnapValue))
                                                 ->first();
                    }
                    
                    $customerData = [
                        'first_name' => $application->first_name ?? '',
                        'middle_initial' => $application->middle_initial ?? '',
                        'last_name' => $application->last_name ?? '',
                        'mobile_number' => $application->mobile_number ?? '',
                        'lcp' => trim($lcpnapData->lcp ?? ''),
                        'nap' => trim($lcpnapData->nap ?? ''),
                        'port' => trim($portValue ?? ''),
                        'tech_input_username' => $request->input('tech_input_username'),
                        'custom_password' => $request->input('custom_password'),
                    ];
                    
                    $username = $pppoeService->generateUniqueUsername($customerData, $id);
                    $password = $pppoeService->generatePassword($customerData);
                    
                    $request->merge([
                        'pppoe_username' => $username,
                        'pppoe_password' => $password,
                    ]);
                    
                    \Log::info('Auto-generated PPPoE credentials', [
                        'job_order_id' => $id,
                        'username' => $username,
                        'username_length' => strlen($username),
                        'password_length' => strlen($password),
                        'lcp_value' => $jobOrder->lcpnapLocation->lcp ?? 'NOT SET',
                        'nap_value' => $jobOrder->lcpnapLocation->nap ?? 'NOT SET'
                    ]);
                }
            }

            $validator = Validator::make($request->all(), [
                'application_id' => 'nullable|integer|exists:applications,id',
                'timestamp' => 'nullable|date',
                'date_installed' => 'nullable|date',
                'installation_fee' => 'nullable|numeric|min:0',
                'billing_day' => 'nullable|integer|min:0',
                'onsite_status' => 'nullable|string|max:100',
                'assigned_email' => 'nullable|email|max:255',
                'onsite_remarks' => 'nullable|string',
                'status_remarks' => 'nullable|string|max:255',
                'modem_router_sn' => 'nullable|string|max:255',
                'router_model' => 'nullable|string|max:255',
                'connection_type' => 'nullable|string|max:100',
                'usage_type' => 'nullable|string|max:255',
                'ip_address' => 'nullable|string|max:45',
                'lcpnap' => 'nullable|string|max:255',
                'port' => 'nullable|string|max:255',
                'vlan' => 'nullable|string|max:255',
                'visit_by' => 'nullable|string|max:255',
                'visit_with' => 'nullable|string|max:255',
                'visit_with_other' => 'nullable|string|max:255',
                'address_coordinates' => 'nullable|string|max:255',
                'username' => 'nullable|string|max:255',
                'group_name' => 'nullable|string|max:255',
                'installation_landmark' => 'nullable|string|max:255',
                'pppoe_username' => 'nullable|string|max:255',
                'pppoe_password' => 'nullable|string|max:255',
                'custom_password' => 'nullable|string|max:255',
                'created_by_user_email' => 'nullable|email|max:255',
                'updated_by_user_email' => 'nullable|email|max:255',
            ]);

            if ($validator->fails()) {
                \Log::error('JobOrder Update Validation Failed', [
                    'id' => $id,
                    'errors' => $validator->errors()->toArray()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $data = $request->all();

            // Sync pppoe_username to username if present
            if (isset($data['pppoe_username']) && !empty($data['pppoe_username'])) {
                $data['username'] = $data['pppoe_username'];
            }
            
            \Log::info('JobOrder Updating with data', [
                'id' => $id,
                'data' => $data,
                'has_pppoe_password_in_data' => isset($data['pppoe_password']),
                'pppoe_password_value' => $data['pppoe_password'] ?? 'NOT SET',
                'pppoe_password_length' => isset($data['pppoe_password']) ? strlen($data['pppoe_password']) : 0
            ]);

            $jobOrder->update($data);
            
            \Log::info('JobOrder After Update', [
                'id' => $id,
                'pppoe_password_in_model' => $jobOrder->pppoe_password ?? 'NULL',
                'pppoe_password_length' => $jobOrder->pppoe_password ? strlen($jobOrder->pppoe_password) : 0,
                'pppoe_username_in_model' => $jobOrder->pppoe_username ?? 'NULL'
            ]);

            // Update technical_details if account_id exists
            if ($jobOrder->account_id) {
                $technicalDetail = TechnicalDetail::where('account_id', $jobOrder->account_id)->first();
                
                if ($technicalDetail) {
                    $technicalUpdateData = [];
                    
                    if (isset($data['usage_type'])) {
                        $technicalUpdateData['usage_type'] = $data['usage_type'];
                    }
                    if (isset($data['connection_type'])) {
                        $technicalUpdateData['connection_type'] = $data['connection_type'];
                    }
                    if (isset($data['router_model'])) {
                        $technicalUpdateData['router_model'] = $data['router_model'];
                    }
                    if (isset($data['modem_router_sn'])) {
                        $technicalUpdateData['router_modem_sn'] = $data['modem_router_sn'];
                    }
                    if (isset($data['ip_address'])) {
                        $technicalUpdateData['ip_address'] = $data['ip_address'];
                    }
                    if (isset($data['lcpnap'])) {
                        $technicalUpdateData['lcpnap'] = $data['lcpnap'];
                        
                        $lcpnapValue = $data['lcpnap'];
                        $loc = LCPNAPLocation::where('lcpnap_name', trim($lcpnapValue))
                                           ->orWhere('id', trim($lcpnapValue))
                                           ->first();
                        
                        if ($loc) {
                            $technicalUpdateData['lcp'] = $loc->lcp;
                            $technicalUpdateData['nap'] = $loc->nap;
                        } else {
                            // Fallback if not found in lookup, but try to keep behavior safe
                             $technicalUpdateData['lcp'] = null;
                             $technicalUpdateData['nap'] = null;
                        }
                    }
                    if (isset($data['port'])) {
                        $technicalUpdateData['port'] = $data['port'];
                    }
                    if (isset($data['vlan'])) {
                        $technicalUpdateData['vlan'] = $data['vlan'];
                    }
                    
                    if (!empty($technicalUpdateData)) {
                        $technicalDetail->update($technicalUpdateData);
                        
                        \Log::info('TechnicalDetail Updated', [
                            'account_id' => $jobOrder->account_id,
                            'updated_fields' => array_keys($technicalUpdateData)
                        ]);
                    }
                }
            }

            \Log::info('JobOrder Updated Successfully', [
                'id' => $id,
                'updated_fields' => array_keys($data)
            ]);

            $jobOrder->load('application');

            return response()->json([
                'success' => true,
                'message' => 'Job order updated successfully',
                'data' => $jobOrder,
            ]);
        } catch (\Exception $e) {
            \Log::error('JobOrder Update Failed', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update job order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $jobOrder = JobOrder::findOrFail($id);
            $jobOrder->delete();

            return response()->json([
                'success' => true,
                'message' => 'Job order deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete job order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function approve($id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $jobOrder = JobOrder::with(['application', 'lcpnapLocation'])->lockForUpdate()->findOrFail($id);
            
            if (!$jobOrder->application) {
                throw new \Exception('Job order must have an associated application');
            }

            $application = $jobOrder->application;
            $defaultUserId = 1;

            \Log::info('Job Order Approval - Application Data', [
                'application_id' => $application->id,
                'mobile_number' => $application->mobile_number,
                'secondary_mobile_number' => $application->secondary_mobile_number,
                'first_name' => $application->first_name,
                'last_name' => $application->last_name,
            ]);

            if (empty($application->secondary_mobile_number)) {
                \Log::warning('Secondary mobile number is empty in application', [
                    'application_id' => $application->id,
                    'job_order_id' => $id
                ]);
            }

            $customer = Customer::create([
                'first_name' => $application->first_name,
                'middle_initial' => $application->middle_initial,
                'last_name' => $application->last_name,
                'email_address' => $application->email_address,
                'contact_number_primary' => $application->mobile_number,
                'contact_number_secondary' => $application->secondary_mobile_number,
                'address' => $application->installation_address,
                'location' => $application->location,
                'barangay' => $application->barangay,
                'city' => $application->city,
                'region' => $application->region,
                'address_coordinates' => $jobOrder->address_coordinates,
                'housing_status' => $application->housing_status,
                'referred_by' => $application->referred_by,
                'desired_plan' => $application->desired_plan,
                'house_front_picture_url' => $jobOrder->house_front_picture_url,
                'created_by' => $defaultUserId,
                'updated_by' => $defaultUserId,
            ]);

            \Log::info('Customer Created with Contact Numbers', [
                'customer_id' => $customer->id,
                'contact_number_primary' => $customer->contact_number_primary,
                'contact_number_secondary' => $customer->contact_number_secondary,
                'from_application_secondary' => $application->secondary_mobile_number,
            ]);

            $accountNumber = $this->generateAccountNumber();
            
            \Log::info('Generated account number', [
                'generated_account_no' => $accountNumber
            ]);

            $installationFee = $jobOrder->installation_fee ?? 0;
            
            $planId = null;
            if ($application->desired_plan) {
                $desiredPlan = $application->desired_plan;
                
                \Log::info('Parsing desired_plan', [
                    'desired_plan' => $desiredPlan
                ]);
                
                if (strpos($desiredPlan, ' - P') !== false) {
                    $parts = explode(' - P', $desiredPlan);
                    $planName = trim($parts[0]);
                    $priceString = trim($parts[1]);
                    $price = (float) str_replace(',', '', $priceString);
                    
                    \Log::info('Parsed plan components', [
                        'plan_name' => $planName,
                        'price' => $price
                    ]);
                    
                    $plan = Plan::where('plan_name', $planName)
                                ->where('price', $price)
                                ->first();
                    
                    if ($plan) {
                        $planId = $plan->id;
                        \Log::info('Plan found successfully', [
                            'plan_name' => $planName,
                            'price' => $price,
                            'plan_id' => $planId
                        ]);
                    } else {
                        \Log::warning('Plan not found with exact match', [
                            'plan_name' => $planName,
                            'price' => $price
                        ]);
                    }
                } else {
                    \Log::warning('desired_plan format unexpected', [
                        'desired_plan' => $desiredPlan,
                        'expected_format' => 'PLAN_NAME - PPRICE'
                    ]);
                }
            }
            
            $billingAccount = BillingAccount::create([
                'customer_id' => $customer->id,
                'account_no' => $accountNumber,
                'date_installed' => $jobOrder->date_installed ?? now(),
                'plan_id' => $planId,
                'account_balance' => $installationFee,
                'balance_update_date' => now(),
                'billing_day' => $jobOrder->billing_day,
                'billing_status_id' => 1,
                'created_by' => $defaultUserId,
                'updated_by' => $defaultUserId,
            ]);
            
            \Log::info('BillingAccount created', [
                'billing_account_id' => $billingAccount->id,
                'plan_id_stored' => $billingAccount->plan_id
            ]);

            $lastName = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $application->last_name ?? 'user'));
            $mobileNumber = preg_replace('/[^0-9]/', '', $application->mobile_number ?? '');
            $usernameForTechnical = $lastName . $mobileNumber;
            
            $existingUsername = TechnicalDetail::where('username', $usernameForTechnical)->first();
            if ($existingUsername) {
                $usernameForTechnical = $usernameForTechnical . '_' . time();
            }

            $modemSN = $jobOrder->modem_router_sn;
            if ($modemSN) {
                $existingModemSN = TechnicalDetail::where('router_modem_sn', $modemSN)->first();
                if ($existingModemSN) {
                    $modemSN = $modemSN . '_' . time();
                }
            }

            $usernameForTechnical = \DB::table('billing_accounts')->where('account_no', $accountNumber)->value('username');

            // Manual lookup for LCPNAP Location to ensure trimming
            $lcpnapValue = trim($jobOrder->lcpnap);
            $lcpnapData = LCPNAPLocation::where('lcpnap_name', $lcpnapValue)
                                      ->orWhere('id', $lcpnapValue)
                                      ->first();

            $lcpValue = trim($lcpnapData->lcp ?? '');
            $napValue = trim($lcpnapData->nap ?? '');
            $portValue = $jobOrder->port ?? '';

            $technicalDetail = TechnicalDetail::create([
                'account_id' => $billingAccount->id,
                'account_no' => $accountNumber,
                'username' => $usernameForTechnical,
                'username_status' => $jobOrder->username_status,
                'connection_type' => $jobOrder->connection_type,
                'router_model' => $jobOrder->router_model,
                'router_modem_sn' => $modemSN,
                'ip_address' => $jobOrder->ip_address,
                'lcp' => $lcpValue,
                'nap' => $napValue,
                'port' => $portValue,
                'vlan' => $jobOrder->vlan,
                'lcpnap' => $jobOrder->lcpnap,
                'usage_type' => $jobOrder->usage_type,
                'created_by' => $defaultUserId,
                'updated_by' => $defaultUserId,
            ]);



            // Generate PPPoE credentials using pattern-based service
            \Log::info('=== STARTING PPPOE CREDENTIAL GENERATION ===', [
                'job_order_id' => $id,
                'customer_first_name' => $application->first_name,
                'customer_last_name' => $application->last_name,
                'customer_mobile' => $application->mobile_number
            ]);
            
            $pppoeService = new PppoeUsernameService();
            
            // Using the already fetched and trimmed technical info
            $customerData = [
                'first_name' => $application->first_name ?? '',
                'middle_initial' => $application->middle_initial ?? '',
                'last_name' => $application->last_name ?? '',
                'mobile_number' => $application->mobile_number ?? '',
                'lcp' => $lcpValue,
                'nap' => $napValue,
                'port' => $portValue,
            ];
            
            // Generate unique PPPoE username based on patterns
            $pppoeUsername = $pppoeService->generateUniqueUsername($customerData, $id);
            $pppoePassword = $pppoeService->generatePassword($customerData);
            
            if (empty($pppoeUsername)) {
                throw new \Exception('Failed to generate PPPoE username');
            }
            
            if (empty($pppoePassword)) {
                throw new \Exception('Failed to generate PPPoE password');
            }

            OnlineStatus::create([
                'account_id' => $billingAccount->id,
                'account_no' => $accountNumber,
                'username' => $pppoeUsername,
                'session_status' => '',
            ]);
            
            \Log::info('PPPoE credentials generated successfully', [
                'job_order_id' => $id,
                'pppoe_username' => $pppoeUsername,
                'pppoe_password' => '***' . substr($pppoePassword, -4), // Masked for security
                'username_length' => strlen($pppoeUsername),
                'password_length' => strlen($pppoePassword),
                'username_pattern_source' => 'pppoe_username_patterns table (pattern_type=username)',
                'password_pattern_source' => 'pppoe_username_patterns table (pattern_type=password)'
            ]);

            $jobOrder->update([
                'billing_status' => 'Done',
                'account_id' => $billingAccount->id,
                'pppoe_username' => $pppoeUsername,
                'pppoe_password' => $pppoePassword,
                'updated_by_user_email' => 'system@ampere.com'
            ]);
            
            \Log::info('PPPoE credentials saved to job_orders table', [
                'job_order_id' => $id,
                'table' => 'job_orders',
                'columns_updated' => ['pppoe_username', 'pppoe_password', 'billing_status', 'account_id'],
                'pppoe_username_saved' => $pppoeUsername
            ]);

            $customerRoleId = 3;

            $existingUser = User::where('username', $accountNumber)->first();
            if ($existingUser) {
                \Log::warning('User with account number already exists', [
                    'account_number' => $accountNumber,
                    'existing_user_id' => $existingUser->id,
                ]);
            } else {
                // Create user with direct password hash assignment to avoid mutator
                $userData = [
                    'username' => $accountNumber,
                    'email_address' => $customer->email_address,
                    'first_name' => $customer->first_name,
                    'middle_initial' => $customer->middle_initial,
                    'last_name' => $customer->last_name,
                    'contact_number' => $customer->contact_number_primary,
                    'role_id' => $customerRoleId,
                    'status' => 'active',
                    'created_by_user_id' => $defaultUserId,
                    'updated_by_user_id' => $defaultUserId,
                ];
                
                // Directly insert into database to bypass mutator
                $userId = \DB::table('users')->insertGetId(array_merge($userData, [
                    'password_hash' => Hash::make($customer->contact_number_primary),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
                
                $user = User::find($userId);

                \Log::info('Customer user account created', [
                    'user_id' => $user->id,
                    'username' => $accountNumber,
                    'email_address' => $customer->email_address,
                    'role_id' => $customerRoleId,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Job order approved successfully',
                'data' => [
                    'customer_id' => $customer->id,
                    'billing_account_id' => $billingAccount->id,
                    'technical_detail_id' => $technicalDetail->id,
                    'account_number' => $accountNumber,
                    'plan_id' => $planId,
                    'desired_plan' => $application->desired_plan,
                    'installation_fee' => $installationFee,
                    'account_balance' => $installationFee,
                    'contact_number_primary' => $customer->contact_number_primary,
                    'contact_number_secondary' => $customer->contact_number_secondary,
                    'user_created' => !isset($existingUser),
                    'user_username' => $accountNumber,
                    'pppoe_username' => $pppoeUsername,
                    'pppoe_password' => $pppoePassword,
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            \Log::error('Error approving job order: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve job order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function generateAccountNumber(): string
    {
        DB::table('billing_accounts')->lockForUpdate()->get();
        
        $customAccountNumber = DB::table('custom_account_number')->first();
        
        if (!$customAccountNumber) {
            \Log::info('No custom_account_number record found, using default generation');
            return $this->generateDefaultAccountNumber();
        }
        
        $prefix = $customAccountNumber->starting_number;
        
        if ($prefix === null) {
            $prefix = '';
        } else {
            $prefix = (string)$prefix;
        }
        
        \Log::info('Custom account number config', [
            'prefix' => $prefix,
            'prefix_length' => strlen($prefix)
        ]);
        
        $prefixLength = strlen($prefix);
        $minIncrementLength = 4;
        
        $pattern = '^' . preg_quote($prefix, '/') . '\d+$';
        
        $latestAccount = BillingAccount::where('account_no', 'REGEXP', $pattern)
            ->where('account_no', 'LIKE', $prefix . '%')
            ->orderByRaw('LENGTH(account_no) DESC, account_no DESC')
            ->lockForUpdate()
            ->first();
        
        \Log::info('Latest account search', [
            'prefix' => $prefix,
            'pattern' => $pattern,
            'found' => $latestAccount ? $latestAccount->account_no : 'none'
        ]);
        
        if ($latestAccount) {
            $numericPart = substr($latestAccount->account_no, $prefixLength);
            $lastIncrement = (int)$numericPart;
            $lastIncrementLength = strlen($numericPart);
            $nextIncrement = $lastIncrement + 1;
            
            $nextIncrementLength = max($lastIncrementLength, strlen((string)$nextIncrement));
            
            \Log::info('Incrementing from existing account', [
                'last_account' => $latestAccount->account_no,
                'last_increment' => $lastIncrement,
                'last_increment_length' => $lastIncrementLength,
                'next_increment' => $nextIncrement,
                'next_increment_length' => $nextIncrementLength
            ]);
        } else {
            $nextIncrement = 1;
            $nextIncrementLength = $minIncrementLength;
            
            \Log::info('No existing account found, starting from 1', [
                'next_increment' => $nextIncrement,
                'next_increment_length' => $nextIncrementLength
            ]);
        }
        
        $newAccountNumber = $prefix . str_pad($nextIncrement, $nextIncrementLength, '0', STR_PAD_LEFT);
        
        \Log::info('Generated account number', [
            'account_number' => $newAccountNumber,
            'prefix' => $prefix,
            'increment' => $nextIncrement,
            'increment_length' => $nextIncrementLength
        ]);
        
        return $newAccountNumber;
    }

    private function generateDefaultAccountNumber(): string
    {
        $latestAccount = BillingAccount::orderBy('account_no', 'desc')
            ->lockForUpdate()
            ->first();
        
        if ($latestAccount && is_numeric($latestAccount->account_no)) {
            $nextNumber = (int) $latestAccount->account_no + 1;
            return str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
        }
        
        return '0001';
    }

    public function getModemRouterSNs(): JsonResponse
    {
        try {
            $modems = ModemRouterSN::all();
            return response()->json([
                'success' => true,
                'data' => $modems,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch modem router SNs',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function getContractTemplates(): JsonResponse
    {
        try {
            $templates = ContractTemplate::all();
            return response()->json([
                'success' => true,
                'data' => $templates,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch contract templates',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function getPorts(): JsonResponse
    {
        try {
            $ports = Port::all();
            return response()->json([
                'success' => true,
                'data' => $ports,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch ports',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function getVLANs(): JsonResponse
    {
        try {
            $vlans = VLAN::all();
            return response()->json([
                'success' => true,
                'data' => $vlans,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch VLANs',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function getLCPNAPs(): JsonResponse
    {
        try {
            $lcpnaps = LCPNAPLocation::all();
            return response()->json([
                'success' => true,
                'data' => $lcpnaps,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch LCPNAPs',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function uploadImages(Request $request, $id): JsonResponse
    {
        try {
            Log::info('[BACKEND] Upload images request received', [
                'job_order_id' => $id,
                'folder_name' => $request->input('folder_name'),
                'has_signed_contract' => $request->hasFile('signed_contract_image'),
                'has_setup' => $request->hasFile('setup_image'),
                'has_box_reading' => $request->hasFile('box_reading_image'),
                'has_router_reading' => $request->hasFile('router_reading_image'),
                'has_port_label' => $request->hasFile('port_label_image'),
                'has_client_signature' => $request->hasFile('client_signature_image'),
                'has_speed_test' => $request->hasFile('speed_test_image'),
            ]);

            $validator = Validator::make($request->all(), [
                'folder_name' => 'required|string|max:255',
                'signed_contract_image' => 'nullable|image|max:10240',
                'setup_image' => 'nullable|image|max:10240',
                'box_reading_image' => 'nullable|image|max:10240',
                'router_reading_image' => 'nullable|image|max:10240',
                'port_label_image' => 'nullable|image|max:10240',
                'client_signature_image' => 'nullable|image|max:10240',
                'speed_test_image' => 'nullable|image|max:10240',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $jobOrder = JobOrder::findOrFail($id);
            $folderName = $request->input('folder_name');

            $driveService = new GoogleDriveService();
            
            $folderId = $driveService->createFolder($folderName);

            $imageUrls = [];

            if ($request->hasFile('signed_contract_image')) {
                $file = $request->file('signed_contract_image');
                $fileSizeKB = round($file->getSize() / 1024, 2);
                Log::info('[BACKEND] Signed contract received', [
                    'size_kb' => $fileSizeKB,
                    'size_mb' => round($fileSizeKB / 1024, 2),
                    'mime_type' => $file->getMimeType(),
                ]);
                $fileName = 'signed_contract_' . time() . '.' . $file->getClientOriginalExtension();
                $imageUrls['signed_contract_image_url'] = $driveService->uploadFile(
                    $file,
                    $folderId,
                    $fileName,
                    $file->getMimeType()
                );
            }

            if ($request->hasFile('setup_image')) {
                $file = $request->file('setup_image');
                $fileSizeKB = round($file->getSize() / 1024, 2);
                Log::info('[BACKEND] Setup image received', [
                    'size_kb' => $fileSizeKB,
                    'size_mb' => round($fileSizeKB / 1024, 2),
                    'mime_type' => $file->getMimeType(),
                ]);
                $fileName = 'setup_' . time() . '.' . $file->getClientOriginalExtension();
                $imageUrls['setup_image_url'] = $driveService->uploadFile(
                    $file,
                    $folderId,
                    $fileName,
                    $file->getMimeType()
                );
            }

            if ($request->hasFile('box_reading_image')) {
                $file = $request->file('box_reading_image');
                $fileSizeKB = round($file->getSize() / 1024, 2);
                Log::info('[BACKEND] Box reading image received', [
                    'size_kb' => $fileSizeKB,
                    'size_mb' => round($fileSizeKB / 1024, 2),
                    'mime_type' => $file->getMimeType(),
                ]);
                $fileName = 'box_reading_' . time() . '.' . $file->getClientOriginalExtension();
                $imageUrls['box_reading_image_url'] = $driveService->uploadFile(
                    $file,
                    $folderId,
                    $fileName,
                    $file->getMimeType()
                );
            }

            if ($request->hasFile('router_reading_image')) {
                $file = $request->file('router_reading_image');
                $fileSizeKB = round($file->getSize() / 1024, 2);
                Log::info('[BACKEND] Router reading image received', [
                    'size_kb' => $fileSizeKB,
                    'size_mb' => round($fileSizeKB / 1024, 2),
                    'mime_type' => $file->getMimeType(),
                ]);
                $fileName = 'router_reading_' . time() . '.' . $file->getClientOriginalExtension();
                $imageUrls['router_reading_image_url'] = $driveService->uploadFile(
                    $file,
                    $folderId,
                    $fileName,
                    $file->getMimeType()
                );
            }

            if ($request->hasFile('port_label_image')) {
                $file = $request->file('port_label_image');
                $fileSizeKB = round($file->getSize() / 1024, 2);
                Log::info('[BACKEND] Port label image received', [
                    'size_kb' => $fileSizeKB,
                    'size_mb' => round($fileSizeKB / 1024, 2),
                    'mime_type' => $file->getMimeType(),
                ]);
                $fileName = 'port_label_' . time() . '.' . $file->getClientOriginalExtension();
                $imageUrls['port_label_image_url'] = $driveService->uploadFile(
                    $file,
                    $folderId,
                    $fileName,
                    $file->getMimeType()
                );
            }

            if ($request->hasFile('client_signature_image')) {
                $file = $request->file('client_signature_image');
                $fileSizeKB = round($file->getSize() / 1024, 2);
                Log::info('[BACKEND] Client signature image received', [
                    'size_kb' => $fileSizeKB,
                    'size_mb' => round($fileSizeKB / 1024, 2),
                    'mime_type' => $file->getMimeType(),
                ]);
                $fileName = 'client_signature_' . time() . '.' . $file->getClientOriginalExtension();
                $imageUrls['client_signature_image_url'] = $driveService->uploadFile(
                    $file,
                    $folderId,
                    $fileName,
                    $file->getMimeType()
                );
            }

            if ($request->hasFile('speed_test_image')) {
                $file = $request->file('speed_test_image');
                $fileSizeKB = round($file->getSize() / 1024, 2);
                Log::info('[BACKEND] Speed test image received', [
                    'size_kb' => $fileSizeKB,
                    'size_mb' => round($fileSizeKB / 1024, 2),
                    'mime_type' => $file->getMimeType(),
                ]);
                $fileName = 'speed_test_' . time() . '.' . $file->getClientOriginalExtension();
                $imageUrls['speedtest_image_url'] = $driveService->uploadFile(
                    $file,
                    $folderId,
                    $fileName,
                    $file->getMimeType()
                );
            }

            Log::info('Job order images uploaded successfully', [
                'job_order_id' => $id,
                'folder_name' => $folderName,
                'folder_id' => $folderId,
                'image_count' => count($imageUrls),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Images uploaded successfully to Google Drive',
                'data' => $imageUrls,
                'folder_id' => $folderId,
            ]);

        } catch (\Exception $e) {
            Log::error('Error uploading job order images', [
                'job_order_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to upload images to Google Drive',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function createRadiusAccount($id): JsonResponse
    {
        try {
            \Log::info('=== CREATE RADIUS ACCOUNT REQUEST ===', [
                'job_order_id' => $id
            ]);

            DB::beginTransaction();

            $radiusConfig = RadiusConfig::first();
            
            if (!$radiusConfig) {
                \Log::error('RADIUS configuration not found in database');
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'RADIUS configuration not found. Please configure RADIUS settings first.',
                ], 500);
            }

            $radiusUrl = $radiusConfig->ssl_type . '://' . $radiusConfig->ip . ':' . $radiusConfig->port . '/rest/user-manage/user';
            $radiusUsername = $radiusConfig->username;
            $radiusPassword = $radiusConfig->password;

            \Log::info('RADIUS configuration loaded', [
                'ssl_type' => $radiusConfig->ssl_type,
                'ip' => $radiusConfig->ip,
                'port' => $radiusConfig->port,
                'url' => $radiusUrl,
                'username' => $radiusConfig->username
            ]);

            $jobOrder = JobOrder::with(['application', 'lcpnapLocation'])->findOrFail($id);
            
            if (!$jobOrder->application) {
                throw new \Exception('Job order must have an associated application');
            }

            $application = $jobOrder->application;

            \Log::info('Job order and application loaded', [
                'job_order_id' => $id,
                'application_id' => $application->id,
                'customer_name' => $application->first_name . ' ' . $application->last_name,
                'existing_username' => $jobOrder->pppoe_username,
                'existing_password' => $jobOrder->pppoe_password ? 'EXISTS' : 'NULL'
            ]);

            $credentialsExist = !empty($jobOrder->pppoe_username) && !empty($jobOrder->pppoe_password);
            $pppoeUsername = $jobOrder->pppoe_username;
            $pppoePassword = $jobOrder->pppoe_password;
            $radiusSubmitted = false;
            $radiusError = null;

            // Fetch LCP/NAP details regardless of whether credentials exist
            $lcpnapValue = trim($jobOrder->lcpnap);
            $lcpnapData = LCPNAPLocation::where('lcpnap_name', $lcpnapValue)
                                      ->orWhere('id', $lcpnapValue)
                                      ->first();

            $lcpValue = trim($lcpnapData->lcp ?? '');
            $napValue = trim($lcpnapData->nap ?? '');
            $portValue = $jobOrder->port ?? '';

            if (!$credentialsExist) {
                \Log::info('No existing credentials found, generating new ones', [
                    'job_order_id' => $id
                ]);
                
                $pppoeService = new PppoeUsernameService();
                
                \Log::info('LCPNAP/Port technical info', [
                    'lcpnap_value' => $lcpnapValue,
                    'lcp' => $lcpValue,
                    'nap' => $napValue,
                    'port' => $portValue
                ]);
                
                $customerData = [
                    'first_name' => $application->first_name ?? '',
                    'middle_initial' => $application->middle_initial ?? '',
                    'last_name' => $application->last_name ?? '',
                    'mobile_number' => $application->mobile_number ?? '',
                    'lcp' => $lcpValue,
                    'nap' => $napValue,
                    'port' => $portValue,
                ];
                
                $pppoeUsername = $pppoeService->generateUniqueUsername($customerData, $id);
                $pppoePassword = $pppoeService->generatePassword($customerData);
                
                if (empty($pppoeUsername) || empty($pppoePassword)) {
                    throw new \Exception('Failed to generate PPPoE credentials');
                }
                
                \Log::info('New PPPoE credentials generated', [
                    'job_order_id' => $id,
                    'pppoe_username' => $pppoeUsername,
                    'username_length' => strlen($pppoeUsername),
                    'password_length' => strlen($pppoePassword)
                ]);

                $updateResult = $jobOrder->update([
                    'pppoe_username' => $pppoeUsername,
                    'pppoe_password' => $pppoePassword,
                    'updated_by_user_email' => request()->input('updated_by_user_email', 'system@ampere.com')
                ]);
                
                $jobOrder->refresh();
                
                \Log::info('PPPoE credentials saved to job_orders table', [
                    'job_order_id' => $id,
                    'update_result' => $updateResult,
                    'pppoe_username_saved' => $jobOrder->pppoe_username,
                    'pppoe_password_saved_length' => strlen($jobOrder->pppoe_password ?? '')
                ]);
            } else {
                \Log::info('Credentials already exist, reusing existing credentials', [
                    'job_order_id' => $id,
                    'pppoe_username' => $pppoeUsername
                ]);
            }

            $desiredPlan = $application->desired_plan;
            $plan = $desiredPlan;
            
            if ($desiredPlan && strpos($desiredPlan, ' - ') !== false) {
                $parts = explode(' - ', $desiredPlan);
                $plan = trim($parts[0]);
            }
            
            \Log::info('Extracted plan name', [
                'desired_plan' => $desiredPlan,
                'extracted_plan' => $plan
            ]);

            try {
                $payload = [
                    'name' => $pppoeUsername,
                    'group' => $plan,
                    'password' => $pppoePassword
                ];

                \Log::info('Submitting to RADIUS API', [
                    'url' => $radiusUrl,
                    'method' => 'PUT',
                    'payload' => [
                        'name' => $pppoeUsername,
                        'group' => $plan,
                        'password' => '***'
                    ],
                    'auth_username' => $radiusUsername
                ]);

                $response = Http::withOptions([
                    'verify' => false
                ])
                ->withBasicAuth($radiusUsername, $radiusPassword)
                ->put($radiusUrl, $payload);

                $statusCode = $response->status();

                if ($statusCode === 204 || $response->successful()) {
                    $radiusSubmitted = true;
                    \Log::info('RADIUS API submission successful', [
                        'status' => $statusCode,
                        'response' => $statusCode === 204 ? 'No Content (Success)' : $response->json()
                    ]);
                } else {
                    $radiusError = 'HTTP ' . $statusCode . ': ' . $response->body();
                    \Log::error('RADIUS API submission failed', [
                        'status' => $statusCode,
                        'error' => $response->body(),
                        'headers' => $response->headers()
                    ]);
                    
                    if (!$credentialsExist) {
                        DB::rollBack();
                        return response()->json([
                            'success' => false,
                            'message' => 'Failed to create RADIUS account',
                            'error' => $radiusError,
                            'radius_url' => $radiusUrl,
                            'http_status' => $statusCode
                        ], 500);
                    }
                }
            } catch (\Exception $mikrotikException) {
                $radiusError = $mikrotikException->getMessage();
                \Log::error('RADIUS API submission exception', [
                    'error' => $radiusError,
                    'trace' => $mikrotikException->getTraceAsString()
                ]);
                
                if (!$credentialsExist) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to connect to RADIUS server',
                        'error' => $radiusError,
                        'radius_url' => $radiusUrl
                    ], 500);
                }
            }

            DB::commit();

            \Log::info('=== RADIUS ACCOUNT OPERATION COMPLETED ===', [
                'job_order_id' => $id,
                'credentials_existed' => $credentialsExist,
                'pppoe_username' => $pppoeUsername,
                'radius_submitted' => $radiusSubmitted,
                'radius_error' => $radiusError
            ]);

            return response()->json([
                'success' => true,
                'message' => $credentialsExist ? 'RADIUS credentials already exist' : 'RADIUS account created successfully',
                'data' => [
                    'job_order_id' => $id,
                    'username' => $pppoeUsername,
                    'password' => $pppoePassword,
                    'group' => $plan,
                    'credentials_exist' => $credentialsExist,
                    'radius_response' => [
                        'submitted' => $radiusSubmitted,
                        'status' => $radiusSubmitted ? 'success' : 'failed',
                        'error' => $radiusError
                    ],
                    'customer_name' => $application->first_name . ' ' . $application->last_name,
                    'plan' => $plan,
                    'radius_config' => [
                        'url' => $radiusUrl,
                        'ssl_type' => $radiusConfig->ssl_type,
                        'ip' => $radiusConfig->ip,
                        'port' => $radiusConfig->port
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            \Log::error('=== RADIUS ACCOUNT CREATION FAILED ===', [
                'job_order_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create RADIUS account',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}