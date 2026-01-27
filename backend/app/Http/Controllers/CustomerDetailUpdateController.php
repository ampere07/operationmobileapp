<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\BillingAccount;
use App\Models\TechnicalDetail;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CustomerDetailUpdateController extends Controller
{
    /**
     * Update customer details
     */
    public function updateCustomerDetails(Request $request, $accountNo): JsonResponse
    {
        try {
            $validated = $request->validate([
                'firstName' => 'required|string|max:255',
                'middleInitial' => 'nullable|string|max:1',
                'lastName' => 'required|string|max:255',
                'emailAddress' => 'required|email|max:255',
                'contactNumberPrimary' => 'required|string|max:20',
                'contactNumberSecondary' => 'nullable|string|max:20',
                'address' => 'required|string|max:255',
                'region' => 'required|string|max:255',
                'city' => 'required|string|max:255',
                'barangay' => 'required|string|max:255',
                'location' => 'required|string|max:255',
                'addressCoordinates' => 'nullable|string|max:255',
                'housingStatus' => 'nullable|string|max:50',
                'referredBy' => 'nullable|string|max:255',
                'groupName' => 'nullable|string|max:255',
                'houseFrontPicture' => 'nullable'
            ]);

            DB::beginTransaction();

            $billingAccount = BillingAccount::where('account_no', $accountNo)->firstOrFail();
            $customer = Customer::findOrFail($billingAccount->customer_id);

            // Handle house front picture upload if provided
            if ($request->hasFile('houseFrontPicture')) {
                $file = $request->file('houseFrontPicture');
                
                // Upload to Google Drive (you'll need to implement this)
                $houseFrontPictureUrl = $this->uploadToGoogleDrive($file, $accountNo);
                
                $validated['houseFrontPictureUrl'] = $houseFrontPictureUrl;
            }

            // Update customer record
            $customer->update([
                'first_name' => $validated['firstName'],
                'middle_initial' => $validated['middleInitial'],
                'last_name' => $validated['lastName'],
                'email_address' => $validated['emailAddress'],
                'contact_number_primary' => $validated['contactNumberPrimary'],
                'contact_number_secondary' => $validated['contactNumberSecondary'],
                'address' => $validated['address'],
                'region' => $validated['region'],
                'city' => $validated['city'],
                'barangay' => $validated['barangay'],
                'location' => $validated['location'],
                'address_coordinates' => $validated['addressCoordinates'],
                'housing_status' => $validated['housingStatus'],
                'referred_by' => $validated['referredBy'],
                'group_name' => $validated['groupName'],
                'house_front_picture_url' => $validated['houseFrontPictureUrl'] ?? $customer->house_front_picture_url,
                'updated_by' => $request->user()->id ?? 1,
            ]);

            DB::commit();

            Log::info('Customer details updated', [
                'account_no' => $accountNo,
                'customer_id' => $customer->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Customer details updated successfully',
                'data' => $customer->fresh()
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update customer details', [
                'account_no' => $accountNo,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update customer details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update billing details
     */
    public function updateBillingDetails(Request $request, $accountNo): JsonResponse
    {
        try {
            $validated = $request->validate([
                'plan' => 'required|string|max:255',
                'billingDay' => 'nullable|integer|min:0|max:31',
                'billingStatus' => 'required|in:Active,Inactive,Suspended,Pending,Disconnected'
            ]);

            DB::beginTransaction();

            $billingAccount = BillingAccount::where('account_no', $accountNo)->firstOrFail();

            // Map billing status to billing_status_id
            $statusMap = [
                'Active' => 2,
                'Inactive' => 1,
                'Suspended' => 3,
                'Pending' => 4,
                'Disconnected' => 5
            ];

            $billingAccount->update([
                'billing_day' => $validated['billingDay'],
                'billing_status_id' => $statusMap[$validated['billingStatus']] ?? 1,
                'updated_by' => $request->user()->id ?? 1,
            ]);

            // Update customer's desired plan
            $customer = Customer::findOrFail($billingAccount->customer_id);
            $customer->update([
                'desired_plan' => $validated['plan'],
                'updated_by' => $request->user()->id ?? 1,
            ]);

            DB::commit();

            Log::info('Billing details updated', [
                'account_no' => $accountNo,
                'billing_account_id' => $billingAccount->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Billing details updated successfully',
                'data' => $billingAccount->fresh()
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update billing details', [
                'account_no' => $accountNo,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update billing details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update technical details
     */
    public function updateTechnicalDetails(Request $request, $accountNo): JsonResponse
    {
        try {
            $validated = $request->validate([
                'username' => 'required|string|max:255',
                'usernameStatus' => 'nullable|in:Online,Offline',
                'connectionType' => 'required|in:Antenna,Fiber,Local',
                'routerModel' => 'required|string|max:255',
                'routerModemSn' => 'nullable|string|max:255',
                'ipAddress' => 'nullable|string|max:45',
                'lcp' => 'nullable|string|max:50',
                'nap' => 'nullable|string|max:50',
                'port' => 'nullable|string|max:50',
                'vlan' => 'nullable|string|max:50',
                'usageType' => 'nullable|string|max:50'
            ]);

            DB::beginTransaction();

            $billingAccount = BillingAccount::where('account_no', $accountNo)->firstOrFail();
            
            // Get or create technical details
            $technicalDetail = TechnicalDetail::where('account_id', $billingAccount->id)->first();
            
            if (!$technicalDetail) {
                $technicalDetail = new TechnicalDetail();
                $technicalDetail->account_id = $billingAccount->id;
                $technicalDetail->created_by = $request->user()->id ?? 1;
            }

            // Generate LCPNAP if LCP and NAP are provided
            $lcpnap = '';
            if (!empty($validated['lcp']) && !empty($validated['nap'])) {
                $lcpnap = $validated['lcp'] . '-' . $validated['nap'];
            }

            $technicalDetail->username = $validated['username'];
            $technicalDetail->username_status = $validated['usernameStatus'] ?? $technicalDetail->username_status;
            $technicalDetail->connection_type = $validated['connectionType'];
            $technicalDetail->router_model = $validated['routerModel'];
            $technicalDetail->router_modem_sn = $validated['routerModemSn'];
            $technicalDetail->ip_address = $validated['ipAddress'];
            $technicalDetail->lcp = $validated['lcp'];
            $technicalDetail->nap = $validated['nap'];
            $technicalDetail->port = $validated['port'];
            $technicalDetail->vlan = $validated['vlan'];
            $technicalDetail->lcpnap = $lcpnap;
            $technicalDetail->updated_by = $request->user()->id ?? 1;
            
            $technicalDetail->save();

            DB::commit();

            Log::info('Technical details updated', [
                'account_no' => $accountNo,
                'technical_detail_id' => $technicalDetail->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Technical details updated successfully',
                'data' => $technicalDetail->fresh()
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update technical details', [
                'account_no' => $accountNo,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update technical details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload file to Google Drive (placeholder - implement based on your setup)
     */
    private function uploadToGoogleDrive($file, $accountNo)
    {
        // TODO: Implement Google Drive upload
        // For now, return a placeholder URL
        return 'https://drive.google.com/file/d/placeholder';
    }
}
