<?php

namespace App\Http\Controllers;

use App\Services\ItexmoSmsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class SmsController extends Controller
{
    protected ItexmoSmsService $smsService;

    public function __construct(ItexmoSmsService $smsService)
    {
        $this->smsService = $smsService;
    }

    public function sendSms(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'contact_no' => 'required|string',
                'message' => 'required|string|max:1000'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $result = $this->smsService->send($request->all());

            return response()->json($result, $result['success'] ? 200 : 500);

        } catch (\Exception $e) {
            Log::error('SMS sending failed', [
                'error' => $e->getMessage(),
                'request_data' => $request->except(['password'])
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send SMS',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function sendBlast(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'filterType' => 'required|string|in:Barangay,LCP,LCPNAP,Location',
                'filterValue' => 'required|string',
                'message' => 'required|string|max:1000'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $result = $this->smsService->sendBlast($request->all());

            return response()->json($result, $result['success'] ? 200 : 500);

        } catch (\Exception $e) {
            Log::error('SMS blast failed', [
                'error' => $e->getMessage(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send SMS blast',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
