<?php

namespace App\Http\Controllers;

use App\Models\BillingAccount;
use App\Models\Customer;
use App\Models\TechnicalDetail;
use App\Models\LCPNAPLocation;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CustomerDetailController extends Controller
{
    public function show($accountNo): JsonResponse
    {
        try {
            \Log::info('CustomerDetailController - Fetching details for account:', ['account_no' => $accountNo]);
            
            $billingAccount = BillingAccount::where('account_no', $accountNo)
                ->with(['customer', 'technicalDetails', 'onlineStatus', 'billingStatus'])
                ->firstOrFail();
            
            $customer = $billingAccount->customer;
            $technicalDetail = $billingAccount->technicalDetails->first();

            // Fetch LCP and NAP from LCPNAPLocation table based on lcpnap name
            $lcpNapLocation = null;
            if ($technicalDetail && $technicalDetail->lcpnap) {
                $lcpNapLocation = LCPNAPLocation::where('lcpnap_name', $technicalDetail->lcpnap)->first();
            }
            
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
            
            // Calculate total paid from transactions table (status = 'done')
            $transactionsPaid = \DB::table('transactions')
                ->where('account_no', $accountNo)
                ->where('status', 'done')
                ->sum('received_payment');
            
            // Calculate total paid from payment_portal_logs table (status = 'success')
            $portalPaid = \DB::table('payment_portal_logs')
                ->where('account_id', $billingAccount->id)
                ->where('status', 'success')
                ->sum('total_amount');
            
            // Total paid is the sum of both
            $totalPaid = ($transactionsPaid ?? 0) + ($portalPaid ?? 0);
            
            \Log::info('CustomerDetailController - Payment calculation:', [
                'account_no' => $accountNo,
                'billing_account_id' => $billingAccount->id,
                'transactions_paid' => $transactionsPaid,
                'portal_paid' => $portalPaid,
                'total_paid' => $totalPaid
            ]);
            
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
                'groupName' => $customer->group_name,
                'createdBy' => $customer->created_by,
                'updatedBy' => $customer->updated_by,
                'totalPaid' => $totalPaid,
                
                'billingAccount' => [
                    'id' => $billingAccount->id,
                    'customerId' => $billingAccount->customer_id,
                    'accountNo' => $billingAccount->account_no,
                    'dateInstalled' => $billingAccount->date_installed ? $billingAccount->date_installed->format('Y-m-d') : null,
                    'planId' => $billingAccount->plan_id,
                    'billingDay' => $billingAccount->billing_day,
                    'billingStatusId' => $billingAccount->billing_status_id,
                    'billingStatusName' => $billingAccount->billingStatus ? $billingAccount->billingStatus->status_name : null,
                    'accountBalance' => $billingAccount->account_balance,
                    'balanceUpdateDate' => $billingAccount->balance_update_date ? $billingAccount->balance_update_date->format('Y-m-d H:i:s') : null,
                    'createdBy' => $billingAccount->created_by,
                    'createdAt' => $billingAccount->created_at ? $billingAccount->created_at->format('Y-m-d H:i:s') : null,
                    'updatedBy' => $billingAccount->updated_by,
                    'updatedAt' => $billingAccount->updated_at ? $billingAccount->updated_at->format('Y-m-d H:i:s') : null,
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
                    'lcp' => $lcpNapLocation ? $lcpNapLocation->lcp : $technicalDetail->lcp,
                    'nap' => $lcpNapLocation ? $lcpNapLocation->nap : $technicalDetail->nap,
                    'port' => $technicalDetail->port,
                    'vlan' => $technicalDetail->vlan,
                    'lcpnap' => $technicalDetail->lcpnap,
                    'usageTypeId' => $technicalDetail->usage_type_id,
                    'usageType' => $technicalDetail->usage_type,
                    'createdBy' => $technicalDetail->created_by,
                    'updatedBy' => $technicalDetail->updated_by,
                ] : null,
                
                'createdAt' => $customer->created_at?->format('Y-m-d H:i:s'),
                'updatedAt' => $customer->updated_at?->format('Y-m-d H:i:s'),
                
                'onlineSessionStatus' => $billingAccount->onlineStatus ? $billingAccount->onlineStatus->session_status : null,
                'onlineStatusData' => $billingAccount->onlineStatus ? $billingAccount->onlineStatus->toArray() : null,
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

