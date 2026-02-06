<?php

namespace App\Http\Controllers;

use App\Models\BillingAccount;
use App\Models\Customer;
use App\Models\TechnicalDetail;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class BillingController extends Controller
{
    public function index(): JsonResponse
    {
        try {
            $billingData = BillingAccount::with(['customer', 'technicalDetails', 'onlineStatus', 'billingStatus'])
                ->get()
                ->map(function ($billingAccount) {
                    $customer = $billingAccount->customer;
                    $technicalDetail = $billingAccount->technicalDetails->first();
                    
                    return [
                        'id' => $billingAccount->id,
                        'Account_No' => $billingAccount->account_no,
                        'Date_Installed' => $billingAccount->date_installed ? $billingAccount->date_installed->format('Y-m-d') : null,
                        'Billing_Day' => $billingAccount->billing_day == 0 ? 'Every end of month' : $billingAccount->billing_day,
                        'Billing_Status_ID' => $billingAccount->billing_status_id,
                        'Billing_Status_Name' => $billingAccount->billingStatus ? $billingAccount->billingStatus->status_name : null,
                        'Account_Balance' => $billingAccount->account_balance,
                        'account_balance' => $billingAccount->account_balance,
                        'Balance_Update_Date' => $billingAccount->balance_update_date ? $billingAccount->balance_update_date->format('Y-m-d H:i:s') : null,
                        
                        'First_Name' => $customer ? $customer->first_name : null,
                        'Middle_Initial' => $customer ? $customer->middle_initial : null,
                        'Last_Name' => $customer ? $customer->last_name : null,
                        'Full_Name' => $customer ? trim(($customer->first_name ?? '') . ' ' . ($customer->middle_initial ?? '') . ' ' . ($customer->last_name ?? '')) : null,
                        'Email_Address' => $customer ? $customer->email_address : null,
                        'Contact_Number' => $customer ? $customer->contact_number_primary : null,
                        'Second_Contact_Number' => $customer ? $customer->contact_number_secondary : null,
                        'Address' => $customer ? $customer->address : null,
                        'Location' => $customer ? $customer->location : null,
                        'Barangay' => $customer ? $customer->barangay : null,
                        'City' => $customer ? $customer->city : null,
                        'Region' => $customer ? $customer->region : null,
                        'Address_Coordinates' => $customer ? $customer->address_coordinates : null,
                        'Housing_Status' => $customer ? $customer->housing_status : null,
                        'Referred_By' => $customer ? $customer->referred_by : null,
                        'Desired_Plan' => $customer ? $customer->desired_plan : null,
                        'house_front_picture_url' => $customer ? $customer->house_front_picture_url : null,
                        'Group_ID' => $customer ? $customer->group_id : null,
                        
                        'Username' => $technicalDetail ? $technicalDetail->username : null,
                        'Username_Status' => $technicalDetail ? $technicalDetail->username_status : null,
                        'Connection_Type' => $technicalDetail ? $technicalDetail->connection_type : null,
                        'Router_Model' => $technicalDetail ? $technicalDetail->router_model : null,
                        'Router_Modem_SN' => $technicalDetail ? $technicalDetail->router_modem_sn : null,
                        'IP_Address' => $technicalDetail ? $technicalDetail->ip_address : null,
                        'LCP' => $technicalDetail ? $technicalDetail->lcp : null,
                        'NAP' => $technicalDetail ? $technicalDetail->nap : null,
                        'PORT' => $technicalDetail ? $technicalDetail->port : null,
                        'VLAN' => $technicalDetail ? $technicalDetail->vlan : null,
                        'LCPNAP' => $technicalDetail ? $technicalDetail->lcpnap : null,
                        'Usage_Type' => $technicalDetail ? $technicalDetail->usage_type : null,
                        
                        'Status' => $billingAccount->billing_status_id == 1 ? 'Active' : ($billingAccount->billingStatus ? $billingAccount->billingStatus->status_name : 'Inactive'),
                        'Modified_By' => $customer ? $customer->updated_by : null,
                        'Modified_Date' => $billingAccount->updated_at ? $billingAccount->updated_at->format('Y-m-d H:i:s') : null,
                        
                        'Plan' => $customer ? $customer->desired_plan : null,
                        'Provider' => null,
                        'LCPNAPPORT' => $technicalDetail ? ($technicalDetail->lcpnap . ($technicalDetail->port ? '-' . $technicalDetail->port : '')) : null,
                        'Online_Session_Status' => $billingAccount->onlineStatus ? $billingAccount->onlineStatus->session_status : null,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $billingData,
                'count' => $billingData->count()
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching billing data: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch billing data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $billingAccount = BillingAccount::with(['customer', 'technicalDetails', 'onlineStatus', 'billingStatus'])->findOrFail($id);
            $customer = $billingAccount->customer;
            $technicalDetail = $billingAccount->technicalDetails->first();
            
            \Log::info('BillingController - Customer data:', [
                'customer_id' => $customer ? $customer->id : 'null',
                'house_front_picture_url' => $customer ? $customer->house_front_picture_url : 'null',
                'raw_customer' => $customer ? $customer->toArray() : 'null'
            ]);
            
            $data = [
                'id' => $billingAccount->id,
                'Account_No' => $billingAccount->account_no,
                'Date_Installed' => $billingAccount->date_installed ? $billingAccount->date_installed->format('Y-m-d') : null,
                'Billing_Day' => $billingAccount->billing_day == 0 ? 'Every end of month' : $billingAccount->billing_day,
                'Billing_Status_ID' => $billingAccount->billing_status_id,
                'Billing_Status_Name' => $billingAccount->billingStatus ? $billingAccount->billingStatus->status_name : null,
                'Account_Balance' => $billingAccount->account_balance,
                'account_balance' => $billingAccount->account_balance,
                'Balance_Update_Date' => $billingAccount->balance_update_date ? $billingAccount->balance_update_date->format('Y-m-d H:i:s') : null,
                
                'First_Name' => $customer ? $customer->first_name : null,
                'Middle_Initial' => $customer ? $customer->middle_initial : null,
                'Last_Name' => $customer ? $customer->last_name : null,
                'Full_Name' => $customer ? trim(($customer->first_name ?? '') . ' ' . ($customer->middle_initial ?? '') . ' ' . ($customer->last_name ?? '')) : null,
                'Email_Address' => $customer ? $customer->email_address : null,
                'Contact_Number' => $customer ? $customer->contact_number_primary : null,
                'Second_Contact_Number' => $customer ? $customer->contact_number_secondary : null,
                'Address' => $customer ? $customer->address : null,
                'Location' => $customer ? $customer->location : null,
                'Barangay' => $customer ? $customer->barangay : null,
                'City' => $customer ? $customer->city : null,
                'Region' => $customer ? $customer->region : null,
                'Address_Coordinates' => $customer ? $customer->address_coordinates : null,
                'Housing_Status' => $customer ? $customer->housing_status : null,
                'Referred_By' => $customer ? $customer->referred_by : null,
                'Desired_Plan' => $customer ? $customer->desired_plan : null,
                'house_front_picture_url' => $customer ? $customer->house_front_picture_url : null,
                'Group_ID' => $customer ? $customer->group_id : null,
                
                'Username' => $technicalDetail ? $technicalDetail->username : null,
                'Username_Status' => $technicalDetail ? $technicalDetail->username_status : null,
                'Connection_Type' => $technicalDetail ? $technicalDetail->connection_type : null,
                'Router_Model' => $technicalDetail ? $technicalDetail->router_model : null,
                'Router_Modem_SN' => $technicalDetail ? $technicalDetail->router_modem_sn : null,
                'IP_Address' => $technicalDetail ? $technicalDetail->ip_address : null,
                'LCP' => $technicalDetail ? $technicalDetail->lcp : null,
                'NAP' => $technicalDetail ? $technicalDetail->nap : null,
                'PORT' => $technicalDetail ? $technicalDetail->port : null,
                'VLAN' => $technicalDetail ? $technicalDetail->vlan : null,
                'LCPNAP' => $technicalDetail ? $technicalDetail->lcpnap : null,
                'Usage_Type' => $technicalDetail ? $technicalDetail->usage_type : null,
                
                'Status' => $billingAccount->billing_status_id == 1 ? 'Active' : ($billingAccount->billingStatus ? $billingAccount->billingStatus->status_name : 'Inactive'),
                'Modified_By' => $customer ? $customer->updated_by : null,
                'Modified_Date' => $billingAccount->updated_at ? $billingAccount->updated_at->format('Y-m-d H:i:s') : null,
                
                'Plan' => $customer ? $customer->desired_plan : null,
                'Provider' => null,
                'LCPNAPPORT' => $technicalDetail ? ($technicalDetail->lcpnap . ($technicalDetail->port ? '-' . $technicalDetail->port : '')) : null,
                'Online_Session_Status' => $billingAccount->onlineStatus ? $billingAccount->onlineStatus->session_status : null,
            ];

            return response()->json([
                'success' => true,
                'data' => $data
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching billing record: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Billing record not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }
}
