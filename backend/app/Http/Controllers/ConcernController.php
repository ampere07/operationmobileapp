<?php

namespace App\Http\Controllers;

use App\Models\Concern;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ConcernController extends Controller
{
    public function index()
    {
        try {
            $concerns = Concern::orderBy('concern_name', 'asc')->get();
            return response()->json([
                'success' => true,
                'data' => $concerns
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch concerns',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'concern_name' => 'required|string|max:255|unique:concern,concern_name'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $concern = Concern::create([
                'concern_name' => $request->concern_name,
                'created_by_user_id' => $request->created_by_user_id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Concern created successfully',
                'data' => $concern
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create concern',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $concern = Concern::findOrFail($id);
            return response()->json([
                'success' => true,
                'data' => $concern
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Concern not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'concern_name' => 'sometimes|string|max:255|unique:concern,concern_name,' . $id
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $concern = Concern::findOrFail($id);
            $concern->update([
                'concern_name' => $request->concern_name ?? $concern->concern_name,
                'updated_by_user_id' => $request->updated_by_user_id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Concern updated successfully',
                'data' => $concern
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update concern',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $concern = Concern::findOrFail($id);
            $concern->delete();

            return response()->json([
                'success' => true,
                'message' => 'Concern deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete concern',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
