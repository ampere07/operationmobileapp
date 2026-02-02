<?php

namespace App\Http\Controllers;

use App\Models\ApplicationVisit;
use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class ApplicationVisitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $page = $request->input('page', 1);
            $limit = $request->input('limit', 50); // Default 50 for faster response
            $search = $request->input('search', '');
            $fastMode = $request->input('fast', false); // Fast mode: skip heavy processing

            Log::info('ApplicationVisitController: Starting to fetch visits', [
                'page' => $page,
                'limit' => $limit,
                'search' => $search,
                'fast_mode' => $fastMode
            ]);

            $query = ApplicationVisit::with('application')->orderBy('id', 'desc');
            
            // Filter by assigned email if provided
            if ($request->has('assigned_email')) {
                $query->where('assigned_email', $request->input('assigned_email'));
                Log::info('Filtering application visits by email: ' . $request->input('assigned_email'));
            }

            // Apply search filter
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('assigned_email', 'LIKE', "%{$search}%")
                      ->orWhere('visit_status', 'LIKE', "%{$search}%")
                      ->orWhere('application_status', 'LIKE', "%{$search}%")
                      ->orWhereHas('application', function ($appQuery) use ($search) {
                          $appQuery->where('first_name', 'LIKE', "%{$search}%")
                                   ->orWhere('last_name', 'LIKE', "%{$search}%")
                                   ->orWhere('city', 'LIKE', "%{$search}%");
                      });
                });
            }

            // Fetch one extra record to check if there are more pages (more efficient than COUNT)
            $visits = $query->skip(($page - 1) * $limit)
                ->take($limit + 1) // Fetch one extra
                ->get();

            // Check if there are more pages
            $hasMore = $visits->count() > $limit;

            // Remove the extra record if it exists
            if ($hasMore) {
                $visits = $visits->slice(0, $limit);
            }

            Log::info('ApplicationVisitController: Fetched ' . $visits->count() . ' visits');

            // Fast mode: Return minimal data immediately
            if ($fastMode) {
                $visitsData = $visits->map(function ($visit) {
                    $application = $visit->application;
                    $fullName = $application 
                        ? trim("{$application->first_name} {$application->middle_initial} {$application->last_name}")
                        : '';

                    return [
                        'id' => $visit->id,
                        'application_id' => $visit->application_id,
                        'timestamp' => $visit->timestamp,
                        'assigned_email' => $visit->assigned_email,
                        'visit_status' => $visit->visit_status,
                        'application_status' => $visit->application_status,
                        'full_name' => $fullName,
                        'created_at' => $visit->created_at,
                        'updated_at' => $visit->updated_at,
                    ];
                });

                return response()->json([
                    'success' => true,
                    'data' => $visitsData->values(),
                    'pagination' => [
                        'current_page' => (int) $page,
                        'per_page' => (int) $limit,
                        'has_more' => $hasMore
                    ]
                ]);
            }

            // Normal mode: Return full data with application details
            $visitsWithApplicationData = $visits->map(function ($visit) {
                $application = $visit->application;
                
                $fullName = $application 
                    ? trim("{$application->first_name} {$application->middle_initial} {$application->last_name}")
                    : '';
                
                $fullAddress = $application
                    ? trim("{$application->installation_address}, {$application->location}, {$application->barangay}, {$application->city}, {$application->region}")
                    : '';
                
                return [
                    'id' => $visit->id,
                    'application_id' => $visit->application_id,
                    'timestamp' => $visit->timestamp,
                    'assigned_email' => $visit->assigned_email,
                    'visit_by' => $visit->visit_by,
                    'visit_with' => $visit->visit_with,
                    'visit_with_other' => $visit->visit_with_other,
                    'visit_status' => $visit->visit_status,
                    'visit_remarks' => $visit->visit_remarks,
                    'application_status' => $visit->application_status,
                    'status_remarks' => $visit->status_remarks,
                    'image1_url' => $visit->image1_url,
                    'image2_url' => $visit->image2_url,
                    'image3_url' => $visit->image3_url,
                    'house_front_picture_url' => $visit->house_front_picture_url,
                    'created_at' => $visit->created_at,
                    'created_by_user_email' => $visit->created_by_user_email,
                    'updated_at' => $visit->updated_at,
                    'updated_by_user_email' => $visit->updated_by_user_email,
                    'full_name' => $fullName,
                    'full_address' => $fullAddress,
                    'referred_by' => $application ? $application->referred_by : null,
                    'first_name' => $application ? $application->first_name : null,
                    'middle_initial' => $application ? $application->middle_initial : null,
                    'last_name' => $application ? $application->last_name : null,
                    'installation_address' => $application ? $application->installation_address : null,
                    'location' => $application ? $application->location : null,
                    'barangay' => $application ? $application->barangay : null,
                    'city' => $application ? $application->city : null,
                    'region' => $application ? $application->region : null,
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $visitsWithApplicationData->values(),
                'count' => $visits->count(),
                'pagination' => [
                    'current_page' => (int) $page,
                    'per_page' => (int) $limit,
                    'has_more' => $hasMore
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching application visits: ' . $e->getMessage());
            Log::error('Trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch application visits',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    
    public function store(Request $request): JsonResponse
    {
        try {
            Log::info('Received application visit create request', [
                'data' => $request->all()
            ]);
            
            $validatedData = $request->validate([
                'application_id' => 'required|integer|exists:applications,id',
                'assigned_email' => ['required', 'string', 'max:255', function ($attribute, $value, $fail) {
                    if ($value !== 'Office' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        $fail('The assigned email must be a valid email address or "Office".');
                    }
                }],
                'visit_by' => 'nullable|string|max:255',
                'visit_with' => 'nullable|string|max:255',
                'visit_with_other' => 'nullable|string|max:255',
                'visit_status' => 'required|string|max:100',
                'visit_remarks' => 'nullable|string',
                'application_status' => 'nullable|string|max:100',
                'status_remarks' => 'nullable|string|max:255',
                'image1_url' => 'nullable|string|max:255',
                'image2_url' => 'nullable|string|max:255',
                'image3_url' => 'nullable|string|max:255',
                'house_front_picture_url' => 'nullable|string|max:255',
                'created_by_user_email' => 'nullable|email|max:255',
                'updated_by_user_email' => 'nullable|email|max:255'
            ]);

            Log::info('Validation passed', ['validated_data' => $validatedData]);

            $validatedData['timestamp'] = now();
            
            Log::info('Creating application visit', ['data' => $validatedData]);
            
            $visit = ApplicationVisit::create($validatedData);
            
            Log::info('Application visit created successfully', ['visit_id' => $visit->id]);
            
            if ($request->has('application_status')) {
                $application = Application::findOrFail($request->application_id);
                $application->status = $request->application_status;
                $application->save();
                Log::info('Updated application status', [
                    'application_id' => $application->id,
                    'new_status' => $request->application_status
                ]);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Application visit created successfully',
                'data' => $visit,
            ], 201);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Application visit validation failed', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating application visit', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create application visit',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }
    
    public function show($id): JsonResponse
    {
        try {
            $visit = ApplicationVisit::findOrFail($id);
            
            return response()->json([
                'success' => true,
                'data' => $visit,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Application visit not found',
                'error' => $e->getMessage(),
            ], 404);
        }
    }
    
    public function getByApplication($applicationId): JsonResponse
    {
        try {
            Log::info("Fetching visits for application ID: {$applicationId}");
            
            $query = ApplicationVisit::query();
            
            if ($applicationId !== 'all') {
                $query->where('application_id', $applicationId);
            }
            
            $visits = $query->get();
            
            Log::info('Found ' . $visits->count() . ' application visits');
            
            return response()->json([
                'success' => true,
                'data' => $visits,
                'count' => $visits->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getByApplication: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch application visits',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    public function update(Request $request, $id): JsonResponse
    {
        try {
            Log::info('Updating application visit', [
                'id' => $id,
                'data' => $request->all()
            ]);
            
            $visit = ApplicationVisit::findOrFail($id);
            
            $validatedData = $request->validate([
                'application_id' => 'nullable|integer|exists:applications,id',
                'assigned_email' => ['nullable', 'string', 'max:255', function ($attribute, $value, $fail) {
                    if ($value && $value !== 'Office' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        $fail('The assigned email must be a valid email address or "Office".');
                    }
                }],
                'visit_by' => 'nullable|string|max:255',
                'visit_with' => 'nullable|string|max:255',
                'visit_with_other' => 'nullable|string|max:255',
                'visit_status' => 'nullable|string|max:100',
                'visit_remarks' => 'nullable|string',
                'application_status' => 'nullable|string|max:100',
                'status_remarks' => 'nullable|string|max:255',
                'image1_url' => 'nullable|string|max:255',
                'image2_url' => 'nullable|string|max:255',
                'image3_url' => 'nullable|string|max:255',
                'house_front_picture_url' => 'nullable|string|max:255',
                'updated_by_user_email' => 'nullable|email|max:255',
                'region' => 'nullable|string|max:255',
                'city' => 'nullable|string|max:255',
                'barangay' => 'nullable|string|max:255',
                'location' => 'nullable|string|max:255',
                'choose_plan' => 'nullable|string|max:255'
            ]);
            
            $visitData = collect($validatedData)->except(['region', 'city', 'barangay', 'location', 'choose_plan'])->toArray();
            $visit->update($visitData);
            
            Log::info('Application visit updated successfully', ['visit_id' => $visit->id]);
            
            if ($visit->application_id && collect($validatedData)->intersectByKeys(array_flip(['region', 'city', 'barangay', 'location', 'choose_plan']))->isNotEmpty()) {
                $application = Application::findOrFail($visit->application_id);
                
                $applicationData = [];
                if (isset($validatedData['region'])) {
                    $applicationData['region'] = $validatedData['region'];
                }
                if (isset($validatedData['city'])) {
                    $applicationData['city'] = $validatedData['city'];
                }
                if (isset($validatedData['barangay'])) {
                    $applicationData['barangay'] = $validatedData['barangay'];
                }
                if (isset($validatedData['location'])) {
                    $applicationData['location'] = $validatedData['location'];
                }
                if (isset($validatedData['choose_plan'])) {
                    $applicationData['desired_plan'] = $validatedData['choose_plan'];
                }
                
                if (!empty($applicationData)) {
                    $application->update($applicationData);
                    Log::info('Application table updated with location and plan data', [
                        'application_id' => $application->id,
                        'updated_fields' => array_keys($applicationData)
                    ]);
                }
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Application visit updated successfully',
                'data' => $visit,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Application visit update validation failed', [
                'errors' => $e->errors()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating application visit: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update application visit',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    
    public function destroy($id): JsonResponse
    {
        try {
            $visit = ApplicationVisit::findOrFail($id);
            $visit->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Application visit deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete application visit',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
