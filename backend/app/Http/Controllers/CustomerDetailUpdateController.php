<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\BillingAccount;
use App\Models\TechnicalDetail;
use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CustomerDetailUpdateController extends Controller
{
    /**
     * Unified update method dispatches based on editType
     */
    public function update(Request $request, $accountNo): JsonResponse
    {
        $editType = $request->input('editType');

        if ($editType === 'customer_details') {
            return $this->updateCustomerDetails($request, $accountNo);
        } elseif ($editType === 'billing_details') {
            return $this->updateBillingDetails($request, $accountNo);
        } elseif ($editType === 'technical_details') {
            return $this->updateTechnicalDetails($request, $accountNo);
        }

        return response()->json([
            'success' => false,
            'message' => 'Invalid or missing edit type'
        ], 400);
    }

    /**
     * Update customer details
     */
    public function updateCustomerDetails(Request $request, $accountNo): JsonResponse
    {
        try {
            $validated = $request->validate([
                'firstName' => 'required|string|max:255',
                'middleInitial' => 'nullable|string|max:10',
                'lastName' => 'required|string|max:255',
                'emailAddress' => 'nullable|string|max:255',
                'contactNumberPrimary' => 'required|string|max:50',
                'contactNumberSecondary' => 'nullable|string|max:50',
                'address' => 'required|string',
                'region' => 'required|string|max:255',
                'city' => 'required|string|max:255',
                'barangay' => 'required|string|max:255',
                'location' => 'nullable|string|max:255',
                'addressCoordinates' => 'nullable|string|max:255',
                'housingStatus' => 'nullable|string|max:255',
                'referredBy' => 'nullable|string|max:255',
                'groupName' => 'nullable|string|max:255',
                'houseFrontPicture' => 'nullable'
            ]);

            DB::beginTransaction();

            $billingAccount = BillingAccount::where('account_no', $accountNo)->firstOrFail();
            $customer = Customer::findOrFail($billingAccount->customer_id);

            $houseFrontPictureUrl = $customer->house_front_picture_url;

            // Handle house front picture upload if provided
            if ($request->hasFile('houseFrontPicture')) {
                $file = $request->file('houseFrontPicture');
                $houseFrontPictureUrl = $this->uploadToGoogleDrive($file, $accountNo);
            }

            // Update customer record
            $customer->update([
                'first_name' => $validated['firstName'],
                'middle_initial' => $validated['middleInitial'] ?? $customer->middle_initial,
                'last_name' => $validated['lastName'],
                'email_address' => $validated['emailAddress'],
                'contact_number_primary' => $validated['contactNumberPrimary'],
                'contact_number_secondary' => $validated['contactNumberSecondary'] ?? $customer->contact_number_secondary,
                'address' => $validated['address'],
                'region' => $validated['region'],
                'city' => $validated['city'],
                'barangay' => $validated['barangay'],
                'location' => $validated['location'] ?? $customer->location,
                'address_coordinates' => $validated['addressCoordinates'] ?? $customer->address_coordinates,
                'housing_status' => $validated['housingStatus'] ?? $customer->housing_status,
                'referred_by' => $validated['referredBy'] ?? $customer->referred_by,
                'group_name' => $validated['groupName'] ?? $customer->group_name,
                'house_front_picture_url' => $houseFrontPictureUrl,
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
                'billingStatus' => 'nullable',
                'billingDay' => 'nullable|integer|min:1|max:31'
            ]);

            DB::beginTransaction();

            $billingAccount = BillingAccount::where('account_no', $accountNo)->firstOrFail();

            // Resolve billing_status_id
            $billingStatusId = $billingAccount->billing_status_id;
            if (!empty($validated['billingStatus'])) {
                if (is_numeric($validated['billingStatus'])) {
                    $billingStatusId = (int)$validated['billingStatus'];
                } else {
                    // Attempt to find by name in the database
                    $dbStatus = DB::table('billing_status')->where('status_name', $validated['billingStatus'])->first();
                    if ($dbStatus) {
                        $billingStatusId = $dbStatus->id;
                    } else {
                        // Fallback mapping
                        $statusMap = [
                            'Active' => 1,
                            'Disconnected' => 2,
                            'Pending' => 3,
                            'Terminated' => 4,
                            'Suspended' => 5
                        ];
                        $billingStatusId = $statusMap[$validated['billingStatus']] ?? $billingStatusId;
                    }
                }
            }

            $updateData = [
                'billing_status_id' => $billingStatusId,
                'updated_by' => $request->user()->id ?? 1,
            ];

            if ($request->has('billingDay')) {
                $updateData['billing_day'] = $validated['billingDay'];
            }

            $billingAccount->update($updateData);

            DB::commit();

            Log::info('Billing details updated', [
                'account_no' => $accountNo,
                'billing_account_id' => $billingAccount->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Billing status updated successfully',
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
                'username' => 'nullable|string|max:255',
                'connectionType' => 'nullable|string|max:100',
                'routerModel' => 'nullable|string|max:255',
                'routerModemSn' => 'nullable|string|max:255',
                'ipAddress' => 'nullable|string|max:45',
                'lcp' => 'nullable|string|max:255',
                'nap' => 'nullable|string|max:255',
                'lcpnap' => 'nullable|string|max:255',
                'port' => 'nullable|string|max:255',
                'vlan' => 'nullable|string|max:255',
                'usageType' => 'nullable|string|max:255'
            ]);

            DB::beginTransaction();

            $billingAccount = BillingAccount::where('account_no', $accountNo)->firstOrFail();
            
            // Get or create technical details
            $technicalDetail = TechnicalDetail::where('account_id', $billingAccount->id)->first();
            
            if (!$technicalDetail) {
                $technicalDetail = new TechnicalDetail();
                $technicalDetail->account_id = $billingAccount->id;
                $technicalDetail->account_no = $billingAccount->account_no;
                $technicalDetail->created_by = $request->user()->id ?? 1;
            }

            // Generate LCPNAP if LCP and NAP are provided, or use direct lcpnap
            $lcpnap = $technicalDetail->lcpnap;
            $newLcp = $validated['lcp'] ?? null;
            $newNap = $validated['nap'] ?? null;
            $newLcpNapInput = $validated['lcpnap'] ?? null;

            if ($newLcp && $newNap) {
                $lcpnap = trim($newLcp . ' - ' . $newNap);
            } elseif ($newLcpNapInput) {
                $lcpnap = $newLcpNapInput;
                // If lcp/nap are missing but lcpnap is present, try to split them
                if (!$newLcp || !$newNap) {
                    $parts = preg_split('/[-\s]+/', $newLcpNapInput);
                    if (count($parts) >= 2) {
                        $newLcp = $parts[0];
                        $newNap = $parts[1];
                    }
                }
            }

            $technicalDetail->username = (!empty($validated['username'])) ? $validated['username'] : $technicalDetail->username;
            $technicalDetail->connection_type = (!empty($validated['connectionType'])) ? $validated['connectionType'] : $technicalDetail->connection_type;
            $technicalDetail->router_model = (!empty($validated['routerModel'])) ? $validated['routerModel'] : $technicalDetail->router_model;
            $technicalDetail->router_modem_sn = $validated['routerModemSn'] ?? $technicalDetail->router_modem_sn;
            $technicalDetail->ip_address = $validated['ipAddress'] ?? $technicalDetail->ip_address;
            $technicalDetail->lcp = $newLcp ?? $technicalDetail->lcp;
            $technicalDetail->nap = $newNap ?? $technicalDetail->nap;
            $technicalDetail->port = $validated['port'] ?? $technicalDetail->port;
            $technicalDetail->vlan = $validated['vlan'] ?? $technicalDetail->vlan;
            $technicalDetail->lcpnap = $lcpnap;
            $technicalDetail->usage_type = $validated['usageType'] ?? $technicalDetail->usage_type;
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
        // For now, return a placeholder URL or use existing logic if any
        return 'https://drive.google.com/file/d/placeholder';
    }
}


