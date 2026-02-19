<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SmartOlt;
use App\Models\TechnicalDetail;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmartOltController extends Controller
{
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
                        // Check if the SN is already used in the technical_details table
                        $accountId = $request->input('account_id');
                        $query = TechnicalDetail::where('router_modem_sn', $sn);

                        // If account_id is provided, exclude it from the check (to allow updating the same record)
                        if ($accountId) {
                            $query->where('account_id', '!=', $accountId);
                        }

                        if ($query->exists()) {
                            return response()->json([
                                'success' => false,
                                'message' => 'already being used'
                            ], 200);
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

