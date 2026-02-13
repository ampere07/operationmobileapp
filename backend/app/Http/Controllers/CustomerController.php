<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class CustomerController extends Controller
{
    public function index(): JsonResponse
    {
        try {
            // Pre-calculate transactions total for 'done' status
            $transactions = \DB::table('transactions')
                ->where('status', 'done')
                ->select('account_no', \DB::raw('SUM(received_payment) as total'))
                ->groupBy('account_no')
                ->get()
                ->pluck('total', 'account_no');

            // Pre-calculate payment portal logs total for 'success' status
            $portalLogs = \DB::table('payment_portal_logs')
                ->where('status', 'success')
                ->select('account_id', \DB::raw('SUM(total_amount) as total'))
                ->groupBy('account_id')
                ->get()
                ->pluck('total', 'account_id');

            $customers = Customer::with(['group', 'billingAccounts'])
                ->get()
                ->map(function ($customer) use ($transactions, $portalLogs) {
                    $totalPaid = 0;
                    foreach ($customer->billingAccounts as $account) {
                        $accNo = $account->account_no;
                        $totalPaid += ($transactions[$accNo] ?? 0) + ($portalLogs[$accNo] ?? 0);
                    }

                    return [
                        'id' => $customer->id,
                        'first_name' => $customer->first_name,
                        'middle_initial' => $customer->middle_initial,
                        'last_name' => $customer->last_name,
                        'full_name' => $customer->full_name,
                        'email_address' => $customer->email_address,
                        'contact_number_primary' => $customer->contact_number_primary,
                        'contact_number_secondary' => $customer->contact_number_secondary,
                        'address' => $customer->address,
                        'location' => $customer->location,
                        'barangay' => $customer->barangay,
                        'city' => $customer->city,
                        'region' => $customer->region,
                        'address_coordinates' => $customer->address_coordinates,
                        'housing_status' => $customer->housing_status,
                        'referred_by' => $customer->referred_by,
                        'desired_plan' => $customer->desired_plan,
                        'house_front_picture_url' => $customer->house_front_picture_url,
                        'group_id' => $customer->group_id,
                        'group_name' => $customer->group_name,
                        'groupName' => $customer->group_name,
                        'total_paid' => $totalPaid,
                        'created_by' => $customer->created_by,
                        'updated_by' => $customer->updated_by,
                        'created_at' => $customer->created_at?->format('Y-m-d H:i:s'),
                        'updated_at' => $customer->updated_at?->format('Y-m-d H:i:s'),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $customers,
                'count' => $customers->count()
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching customers: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch customers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $customer = Customer::with(['group', 'billingAccounts'])->findOrFail($id);
            
            $data = [
                'id' => $customer->id,
                'first_name' => $customer->first_name,
                'middle_initial' => $customer->middle_initial,
                'last_name' => $customer->last_name,
                'full_name' => $customer->full_name,
                'email_address' => $customer->email_address,
                'contact_number_primary' => $customer->contact_number_primary,
                'contact_number_secondary' => $customer->contact_number_secondary,
                'address' => $customer->address,
                'location' => $customer->location,
                'barangay' => $customer->barangay,
                'city' => $customer->city,
                'region' => $customer->region,
                'address_coordinates' => $customer->address_coordinates,
                'housing_status' => $customer->housing_status,
                'referred_by' => $customer->referred_by,
                'desired_plan' => $customer->desired_plan,
                'house_front_picture_url' => $customer->house_front_picture_url,
                'group_id' => $customer->group_id,
                'group_name' => $customer->group_name,
                'groupName' => $customer->group_name,
                'created_by' => $customer->created_by,
                'updated_by' => $customer->updated_by,
                'created_at' => $customer->created_at?->format('Y-m-d H:i:s'),
                'updated_at' => $customer->updated_at?->format('Y-m-d H:i:s'),
                'billing_accounts' => $customer->billingAccounts->map(function ($account) {
                    return [
                        'id' => $account->id,
                        'account_no' => $account->account_no,
                        'billing_status_id' => $account->billing_status_id,
                        'account_balance' => $account->account_balance,
                    ];
                }),
            ];

            return response()->json([
                'success' => true,
                'data' => $data
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching customer: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Customer not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'first_name' => 'required|string|max:255',
                'middle_initial' => 'nullable|string|max:10',
                'last_name' => 'required|string|max:255',
                'email_address' => 'nullable|email|max:255',
                'contact_number_primary' => 'required|string|max:20',
                'contact_number_secondary' => 'nullable|string|max:20',
                'address' => 'required|string',
                'location' => 'nullable|string|max:255',
                'barangay' => 'nullable|string|max:255',
                'city' => 'nullable|string|max:255',
                'region' => 'nullable|string|max:255',
                'address_coordinates' => 'nullable|string|max:255',
                'housing_status' => 'nullable|string|max:255',
                'referred_by' => 'nullable|string|max:255',
                'desired_plan' => 'nullable|string|max:255',
                'house_front_picture_url' => 'nullable|string|max:500',
                'group_id' => 'nullable|exists:groups,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $customer = Customer::create($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Customer created successfully',
                'data' => $customer
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Error creating customer: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create customer',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $customer = Customer::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'first_name' => 'sometimes|required|string|max:255',
                'middle_initial' => 'nullable|string|max:10',
                'last_name' => 'sometimes|required|string|max:255',
                'email_address' => 'nullable|email|max:255',
                'contact_number_primary' => 'sometimes|required|string|max:20',
                'contact_number_secondary' => 'nullable|string|max:20',
                'address' => 'sometimes|required|string',
                'location' => 'nullable|string|max:255',
                'barangay' => 'nullable|string|max:255',
                'city' => 'nullable|string|max:255',
                'region' => 'nullable|string|max:255',
                'address_coordinates' => 'nullable|string|max:255',
                'housing_status' => 'nullable|string|max:255',
                'referred_by' => 'nullable|string|max:255',
                'desired_plan' => 'nullable|string|max:255',
                'house_front_picture_url' => 'nullable|string|max:500',
                'group_id' => 'nullable|exists:groups,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $customer->update($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Customer updated successfully',
                'data' => $customer
            ]);
        } catch (\Exception $e) {
            \Log::error('Error updating customer: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update customer',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $customer = Customer::findOrFail($id);
            $customer->delete();

            return response()->json([
                'success' => true,
                'message' => 'Customer deleted successfully'
            ]);
        } catch (\Exception $e) {
            \Log::error('Error deleting customer: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete customer',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

