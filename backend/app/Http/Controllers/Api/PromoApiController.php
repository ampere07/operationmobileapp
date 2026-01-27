<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Promo;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class PromoApiController extends Controller
{
    public function index(): JsonResponse
    {
        try {
            $promos = Promo::orderBy('name', 'asc')->get();

            $formattedPromos = $promos->map(function ($promo) {
                return [
                    'id' => $promo->id,
                    'promo_name' => $promo->name,
                    'name' => $promo->name,
                    'description' => $promo->status,
                    'status' => $promo->status,
                    'created_at' => $promo->created_at ? $promo->created_at->format('Y-m-d H:i:s') : null,
                    'updated_at' => $promo->updated_at ? $promo->updated_at->format('Y-m-d H:i:s') : null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedPromos,
            ]);
        } catch (\Exception $e) {
            Log::error('PromoApiController index error: ' . $e->getMessage());
            Log::error('Trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch promos',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'status' => 'nullable|string|max:100',
            ]);

            $validated['created_by_user_id'] = auth()->id() ?? 1;
            $validated['updated_by_user_id'] = auth()->id() ?? 1;

            $promo = Promo::create($validated);

            return response()->json([
                'success' => true,
                'message' => 'Promo created successfully',
                'data' => [
                    'id' => $promo->id,
                    'promo_name' => $promo->name,
                    'name' => $promo->name,
                    'description' => $promo->status,
                    'status' => $promo->status,
                ],
            ], 201);
        } catch (\Exception $e) {
            Log::error('PromoApiController store error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create promo',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $promo = Promo::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $promo->id,
                    'promo_name' => $promo->name,
                    'name' => $promo->name,
                    'description' => $promo->status,
                    'status' => $promo->status,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('PromoApiController show error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Promo not found',
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $promo = Promo::findOrFail($id);

            $validated = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'status' => 'nullable|string|max:100',
            ]);

            $validated['updated_by_user_id'] = auth()->id() ?? 1;

            $promo->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Promo updated successfully',
                'data' => [
                    'id' => $promo->id,
                    'promo_name' => $promo->name,
                    'name' => $promo->name,
                    'description' => $promo->status,
                    'status' => $promo->status,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('PromoApiController update error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update promo',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $promo = Promo::findOrFail($id);
            $promo->delete();

            return response()->json([
                'success' => true,
                'message' => 'Promo deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('PromoApiController destroy error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete promo',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
