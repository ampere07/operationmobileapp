<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SmartOlt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

use App\Models\TechnicalDetail;

class SmartOltController extends Controller
{
    public function index()
    {
        try {
            $configs = SmartOlt::all();
            return response()->json([
                'success' => true,
                'data' => $configs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching configs: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'sub_domain' => 'required|string',
                'token' => 'required|string'
            ]);

            $config = SmartOlt::create($validated);

            return response()->json([
                'success' => true,
                'message' => 'SmartOLT configuration created successfully',
                'data' => $config
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating config: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $config = SmartOlt::findOrFail($id);

            $validated = $request->validate([
                'sub_domain' => 'required|string',
                'token' => 'required|string'
            ]);

            $config->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'SmartOLT configuration updated successfully',
                'data' => $config
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating config: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $config = SmartOlt::findOrFail($id);
            $config->delete();

            return response()->json([
                'success' => true,
                'message' => 'SmartOLT configuration deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting config: ' . $e->getMessage()
            ], 500);
        }
    }

    public function validateOnuSn(Request $request)

    {
        try {
            Log::info('Validating ONU SN Request:', $request->all());

            $sn = $request->input('sn');

            if (!$sn) {
                return response()->json([
                    'success' => false,
                    'message' => 'Router Modem SN is required'
                ], 400);
            }

            // Get SmartOLT configuration from database
            $config = SmartOlt::first();

            if (!$config) {
                Log::error('SmartOLT configuration not found in database');
                return response()->json([
                    'success' => false,
                    'message' => 'SmartOLT configuration not found'
                ], 404);
            }

            $subDomain = $config->sub_domain;
            $token = $config->token;

            // Construct URL
            // https://{{subdomain}}.smartolt.com/api/onu/get_onus_details_by_sn/{{onu_sn}}
                $url = "https://{$subDomain}.smartolt.com/api/onu/get_all_onus_details";

            Log::info("Calling SmartOLT API: $url");

            // Make request
            $response = Http::withHeaders([
                'X-Token' => $token
            ])->get($url);

            Log::info('SmartOLT API Response Status: ' . $response->status());
            
            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['onus']) && is_array($data['onus'])) {
                    $found = false;
                    $onuDetails = null;

                    foreach ($data['onus'] as $onu) {
                        if (isset($onu['sn']) && $onu['sn'] === $sn) {
                            $found = true;
                            $onuDetails = $onu;
                            break;
                        }
                    }

                    if ($found) {
                        // Check if SN is already in use in technical_details
                        $exists = TechnicalDetail::where('router_modem_sn', $sn)->exists();

                        if ($exists) {
                            return response()->json([
                                'success' => false,
                                'message' => 'already exist'
                            ]);
                        }

                        return response()->json([
                            'success' => true,
                            'data' => $onuDetails,
                            'message' => 'Valid router model sn'
                        ]);
                    } else {
                         return response()->json([
                            'success' => false,
                            'message' => 'Invalid router model sn: SN not found in SmartOLT system'
                        ], 200);
                    }
                } else {
                     return response()->json([
                        'success' => false,
                        'message' => 'Invalid response structure from SmartOLT'
                    ], 500);
                }

            } else {
                // Return 400 if not found or error
                return response()->json([
                    'success' => false,
                    'message' => 'Error communicating with SmartOLT: ' . $response->status()
                ], 400);
            }

        } catch (\Exception $e) {
            Log::error('SmartOLT Validation Exception: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error validating router model sn: ' . $e->getMessage()
            ], 500);
        }
    }
}

