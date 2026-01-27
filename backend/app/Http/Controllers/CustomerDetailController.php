<?php

namespace App\Http\Controllers;

use App\Models\BillingAccount;
use App\Models\Customer;
use App\Models\TechnicalDetail;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CustomerDetailController extends Controller
{
    public function show($accountNo): JsonResponse
    {
        try {
            \Log::info('CustomerDetailController - Fetching details for account:', ['account_no' => $accountNo]);
            
            $billingAccount = BillingAccount::where('account_no', $accountNo)
                ->with(['customer', 'technicalDetails'])
                ->firstOrFail();
            
            $customer = $billingAccount->customer;
            $technicalDetail = $billingAccount->technicalDetails->first();
            
            \Log::info('CustomerDetailController - Customer found:', [
                'customer_id' => $customer ? $customer->id : null,
                'house_front_picture_url' => $customer ? $customer->house_front_picture_url : null,
                'all_customer_fields' => $customer ? $customer->toArray() : null
            ]);
            
            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Customer not found for billing account'
                ], 404);
            }
            
            $data = [
                'id' => $customer->id,
                'firstName' => $customer->first_name,
                'middleInitial' => $customer->middle_initial,
                'lastName' => $customer->last_name,
                'fullName' => trim(($customer->first_name ?? '') . ' ' . ($customer->middle_initial ?? '') . ' ' . ($customer->last_name ?? '')),
                'emailAddress' => $customer->email_address,
                'contactNumberPrimary' => $customer->contact_number_primary,
                'contactNumberSecondary' => $customer->contact_number_secondary,
                'address' => $customer->address,
                'location' => $customer->location,
                'barangay' => $customer->barangay,
                'city' => $customer->city,
                'region' => $customer->region,
                'addressCoordinates' => $customer->address_coordinates,
                'housingStatus' => $customer->housing_status,
                'referredBy' => $customer->referred_by,
                'desiredPlan' => $customer->desired_plan,
                'houseFrontPictureUrl' => $customer->house_front_picture_url,
                'groupName' => $customer->group_name ?? ($customer->group ? $customer->group->name : null),
                'createdBy' => $customer->created_by,
                'updatedBy' => $customer->updated_by,
                
                'billingAccount' => [
                    'id' => $billingAccount->id,
                    'customerId' => $billingAccount->customer_id,
                    'accountNo' => $billingAccount->account_no,
                    'dateInstalled' => $billingAccount->date_installed ? $billingAccount->date_installed->format('Y-m-d') : null,
                    'planId' => $billingAccount->plan_id,
                    'billingDay' => $billingAccount->billing_day,
                    'billingStatusId' => $billingAccount->billing_status_id,
                    'accountBalance' => $billingAccount->account_balance,
                    'balanceUpdateDate' => $billingAccount->balance_update_date ? $billingAccount->balance_update_date->format('Y-m-d H:i:s') : null,
                    'createdBy' => $billingAccount->created_by,
                    'updatedBy' => $billingAccount->updated_by,
                ],
                
                'technicalDetails' => $technicalDetail ? [
                    'id' => $technicalDetail->id,
                    'accountId' => $technicalDetail->account_id,
                    'username' => $technicalDetail->username,
                    'usernameStatus' => $technicalDetail->username_status,
                    'connectionType' => $technicalDetail->connection_type,
                    'routerModel' => $technicalDetail->router_model,
                    'routerModemSn' => $technicalDetail->router_modem_sn,
                    'ipAddress' => $technicalDetail->ip_address,
                    'lcp' => $technicalDetail->lcp,
                    'nap' => $technicalDetail->nap,
                    'port' => $technicalDetail->port,
                    'vlan' => $technicalDetail->vlan,
                    'lcpnap' => $technicalDetail->lcpnap,
                    'usageTypeId' => $technicalDetail->usage_type_id,
                    'createdBy' => $technicalDetail->created_by,
                    'updatedBy' => $technicalDetail->updated_by,
                ] : null,
                
                'createdAt' => $customer->created_at?->format('Y-m-d H:i:s'),
                'updatedAt' => $customer->updated_at?->format('Y-m-d H:i:s'),
            ];
            
            \Log::info('CustomerDetailController - Response data:', [
                'houseFrontPictureUrl' => $data['houseFrontPictureUrl']
            ]);

            return response()->json([
                'success' => true,
                'data' => $data
            ]);
        } catch (\Exception $e) {
            \Log::error('CustomerDetailController - Error:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Customer details not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }
}
