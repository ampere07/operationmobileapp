<?php

namespace App\Http\Controllers;

use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class ApplicationController extends Controller
{
    public function index()
    {
        try {
            Log::info('ApplicationController: Starting to fetch applications');
            
            $applications = Application::all();
            Log::info('ApplicationController: Fetched ' . $applications->count() . ' applications');
            
            $formattedApplications = $applications->map(function ($app) {
                return [
                    'id' => (string)$app->id,
                    'customer_name' => $this->getFullName($app),
                    'timestamp' => $app->timestamp ? $app->timestamp->format('Y-m-d H:i:s') : null,
                    'address' => $app->installation_address ?? '',
                    'address_line' => $app->installation_address ?? '',
                    'status' => $app->status ?? 'pending',
                    'email_address' => $app->email_address,
                    'first_name' => $app->first_name,
                    'middle_initial' => $app->middle_initial,
                    'last_name' => $app->last_name,
                    'mobile_number' => $app->mobile_number,
                    'secondary_mobile_number' => $app->secondary_mobile_number,
                    'installation_address' => $app->installation_address,
                    'landmark' => $app->landmark,
                    'region' => $app->region,
                    'city' => $app->city,
                    'barangay' => $app->barangay,
                    'location' => $app->location,
                    'desired_plan' => $app->desired_plan,
                    'promo' => $app->promo,
                    'referrer_account_id' => $app->referrer_account_id,
                    'referred_by' => $app->referred_by,
                    'proof_of_billing_url' => $app->proof_of_billing_url,
                    'government_valid_id_url' => $app->government_valid_id_url,
                    'secondary_government_valid_id_url' => $app->secondary_government_valid_id_url,
                    'house_front_picture_url' => $app->house_front_picture_url,
                    'promo_url' => $app->promo_url,
                    'nearest_landmark1_url' => $app->nearest_landmark1_url,
                    'nearest_landmark2_url' => $app->nearest_landmark2_url,
                    'document_attachment_url' => $app->document_attachment_url,
                    'other_isp_bill_url' => $app->other_isp_bill_url,
                    'terms_agreed' => $app->terms_agreed,
                    'created_at' => $app->created_at ? $app->created_at->format('Y-m-d H:i:s') : null,
                    'updated_at' => $app->updated_at ? $app->updated_at->format('Y-m-d H:i:s') : null,
                    'created_by_user_id' => $app->created_by_user_id,
                    'updated_by_user_id' => $app->updated_by_user_id,
                    
                    'create_date' => $app->timestamp ? $app->timestamp->format('Y-m-d') : null,
                    'create_time' => $app->timestamp ? $app->timestamp->format('H:i:s') : null
                ];
            });
            
            return response()->json([
                'applications' => $formattedApplications,
                'success' => true
            ]);
        } catch (\Exception $e) {
            Log::error('ApplicationController error: ' . $e->getMessage());
            Log::error('ApplicationController trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'error' => $e->getMessage(),
                'message' => 'Failed to fetch applications from database',
                'success' => false
            ], 500);
        }
    }
    
    private function getFullName($app)
    {
        $parts = array_filter([
            $app->first_name ?? '',
            $app->middle_initial ?? '',
            $app->last_name ?? ''
        ]);
        
        return implode(' ', $parts) ?: 'Unknown';
    }
    
    private function getLocationName($region, $city)
    {
        try {
            $locationParts = array_filter([$region, $city]);
            return implode(', ', $locationParts) ?: 'Unknown Location';
        } catch (\Exception $e) {
            Log::error('Failed to get location name: ' . $e->getMessage());
            return 'Unknown Location';
        }
    }

    private function broadcastNewApplication($application)
    {
        try {
            $data = [
                'id' => $application->id,
                'customer_name' => $this->getFullName($application),
                'plan_name' => $application->desired_plan ?? 'Unknown',
                'status' => $application->status ?? 'pending',
                'created_at' => $application->created_at,
                'formatted_date' => $application->created_at->diffForHumans(),
            ];

            Http::timeout(2)->post('http://127.0.0.1:3001/broadcast/new-application', $data);
        } catch (\Exception $e) {
            Log::warning('Failed to broadcast new application to socket server', [
                'error' => $e->getMessage()
            ]);
        }
    }

    public function store(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'email_address' => 'required|email',
                'first_name' => 'required|string|max:255',
                'middle_initial' => 'nullable|string|max:1',
                'last_name' => 'required|string|max:255',
                'mobile_number' => 'required|string|max:50',
                'secondary_mobile_number' => 'nullable|string|max:50',
                'region' => 'required|string|max:255',
                'city' => 'required|string|max:255',
                'barangay' => 'nullable|string|max:255',
                'installation_address' => 'required',
                'landmark' => 'nullable',
                'referred_by' => 'nullable|string|max:255',
                'desired_plan' => 'nullable|string|max:255',
                'promo' => 'nullable|string|max:255',
                'proof_of_billing_url' => 'nullable|string|max:255',
                'government_valid_id_url' => 'nullable|string|max:255',
                'secondary_government_valid_id_url' => 'nullable|string|max:255',
                'house_front_picture_url' => 'nullable|string|max:255',
                'promo_url' => 'nullable|string|max:255',
                'nearest_landmark1_url' => 'nullable|string|max:255',
                'nearest_landmark2_url' => 'nullable|string|max:255',
                'document_attachment_url' => 'nullable|string|max:255',
                'other_isp_bill_url' => 'nullable|string|max:255',
                'terms_agreed' => 'nullable|boolean',
                'status' => 'nullable|string|max:100'
            ]);

            $validatedData['timestamp'] = now();
            $validatedData['created_by_user_id'] = auth()->id();

            $application = Application::create($validatedData);

            $this->broadcastNewApplication($application);

            $formattedApplication = [
                'id' => (string)$application->id,
                'customer_name' => $this->getFullName($application),
                'timestamp' => $application->timestamp ? $application->timestamp->format('Y-m-d H:i:s') : null,
                'address' => $application->installation_address ?? '',
                'status' => $application->status ?? 'pending',
                'location' => $this->getLocationName($application->region ?? '', $application->city ?? ''),
                'email_address' => $application->email_address,
                'first_name' => $application->first_name,
                'middle_initial' => $application->middle_initial,
                'last_name' => $application->last_name,
                'mobile_number' => $application->mobile_number,
                'secondary_mobile_number' => $application->secondary_mobile_number,
                'installation_address' => $application->installation_address,
                'landmark' => $application->landmark,
                'region' => $application->region,
                'city' => $application->city,
                'barangay' => $application->barangay,
                'desired_plan' => $application->desired_plan,
                'promo' => $application->promo,
                'referred_by' => $application->referred_by,
                'proof_of_billing_url' => $application->proof_of_billing_url,
                'government_valid_id_url' => $application->government_valid_id_url,
                'secondary_government_valid_id_url' => $application->secondary_government_valid_id_url,
                'house_front_picture_url' => $application->house_front_picture_url,
                'promo_url' => $application->promo_url,
                'nearest_landmark1_url' => $application->nearest_landmark1_url,
                'nearest_landmark2_url' => $application->nearest_landmark2_url,
                'document_attachment_url' => $application->document_attachment_url,
                'other_isp_bill_url' => $application->other_isp_bill_url,
                'terms_agreed' => $application->terms_agreed,
            ];

            return response()->json([
                'message' => 'Application created successfully',
                'application' => $formattedApplication,
                'success' => true
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('ApplicationController store validation error: ' . json_encode($e->errors()));
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
                'success' => false
            ], 422);
        } catch (\Exception $e) {
            Log::error('ApplicationController store error: ' . $e->getMessage());
            Log::error('ApplicationController store trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'message' => 'Failed to create application',
                'error' => $e->getMessage(),
                'success' => false
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            Log::info('ApplicationController show: Fetching application ID: ' . $id);
            
            $application = Application::findOrFail($id);
            
            $formattedApplication = [
                'id' => (string)$application->id,
                'customer_name' => $this->getFullName($application),
                'timestamp' => $application->timestamp ? $application->timestamp->format('Y-m-d H:i:s') : null,
                'address' => $application->installation_address ?? '',
                'address_line' => $application->installation_address ?? '',
                'status' => $application->status ?? 'pending',
                'email_address' => $application->email_address,
                'first_name' => $application->first_name,
                'middle_initial' => $application->middle_initial,
                'last_name' => $application->last_name,
                'mobile_number' => $application->mobile_number,
                'secondary_mobile_number' => $application->secondary_mobile_number,
                'installation_address' => $application->installation_address,
                'landmark' => $application->landmark,
                'region' => $application->region,
                'city' => $application->city,
                'barangay' => $application->barangay,
                'location' => $application->location,
                'desired_plan' => $application->desired_plan,
                'promo' => $application->promo,
                'referrer_account_id' => $application->referrer_account_id,
                'referred_by' => $application->referred_by,
                'proof_of_billing_url' => $application->proof_of_billing_url,
                'government_valid_id_url' => $application->government_valid_id_url,
                'secondary_government_valid_id_url' => $application->secondary_government_valid_id_url,
                'house_front_picture_url' => $application->house_front_picture_url,
                'promo_url' => $application->promo_url,
                'nearest_landmark1_url' => $application->nearest_landmark1_url,
                'nearest_landmark2_url' => $application->nearest_landmark2_url,
                'document_attachment_url' => $application->document_attachment_url,
                'other_isp_bill_url' => $application->other_isp_bill_url,
                'terms_agreed' => $application->terms_agreed,
                'created_at' => $application->created_at ? $application->created_at->format('Y-m-d H:i:s') : null,
                'updated_at' => $application->updated_at ? $application->updated_at->format('Y-m-d H:i:s') : null,
                'created_by_user_id' => $application->created_by_user_id,
                'updated_by_user_id' => $application->updated_by_user_id,
                
                'create_date' => $application->timestamp ? $application->timestamp->format('Y-m-d') : null,
                'create_time' => $application->timestamp ? $application->timestamp->format('H:i:s') : null
            ];
            
            return response()->json([
                'application' => $formattedApplication,
                'success' => true
            ]);
        } catch (\Exception $e) {
            Log::error('ApplicationController show error: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Application not found or error retrieving application',
                'error' => $e->getMessage(),
                'success' => false
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $validatedData = $request->validate([
                'status' => 'nullable|string|max:100',
                'email_address' => 'nullable|email',
                'first_name' => 'nullable|string|max:255',
                'middle_initial' => 'nullable|string|max:1',
                'last_name' => 'nullable|string|max:255',
                'mobile_number' => 'nullable|string|max:50',
                'secondary_mobile_number' => 'nullable|string|max:50',
                'region' => 'nullable|string|max:255',
                'city' => 'nullable|string|max:255',
                'barangay' => 'nullable|string|max:255',
                'location' => 'nullable|string|max:255',
                'installation_address' => 'nullable',
                'landmark' => 'nullable',
                'referred_by' => 'nullable|string|max:255',
                'desired_plan' => 'nullable|string|max:255',
                'promo' => 'nullable|string|max:255'
            ]);

            $application = Application::findOrFail($id);
            $validatedData['updated_by_user_id'] = auth()->id();
            $application->update($validatedData);

            return response()->json([
                'message' => 'Application updated successfully',
                'application' => $application,
                'success' => true
            ]);
        } catch (\Exception $e) {
            Log::error('ApplicationController update error: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Failed to update application',
                'error' => $e->getMessage(),
                'success' => false
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $application = Application::findOrFail($id);
            $application->delete();

            return response()->json([
                'message' => 'Application deleted successfully',
                'success' => true
            ]);
        } catch (\Exception $e) {
            Log::error('ApplicationController destroy error: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Failed to delete application',
                'error' => $e->getMessage(),
                'success' => false
            ], 500);
        }
    }
}
