<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Services\ActivityLogService;

class OrganizationController extends Controller
{
    public function index()
    {
        try {
            $organizations = Organization::with(['users'])->get();
            return response()->json([
                'success' => true,
                'data' => $organizations
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch organizations',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'organization_name' => 'required|string|max:255',
            'address' => 'nullable|string|max:500',
            'contact_number' => 'nullable|string|max:50',
            'email_address' => 'nullable|email|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $organization = Organization::create([
                'organization_name' => $request->organization_name,
                'address' => $request->address,
                'contact_number' => $request->contact_number,
                'email_address' => $request->email_address,
            ]);

            try {
                ActivityLogService::organizationCreated(
                    null,
                    $organization,
                    ['created_by' => 'system']
                );
            } catch (\Exception $logError) {
                \Log::warning('Failed to log organization creation activity: ' . $logError->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'Organization created successfully',
                'data' => $organization
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create organization',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $organization = Organization::with(['users'])->findOrFail($id);
            return response()->json([
                'success' => true,
                'data' => $organization
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Organization not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'organization_name' => 'sometimes|string|max:255',
            'address' => 'sometimes|nullable|string|max:500',
            'contact_number' => 'sometimes|nullable|string|max:50',
            'email_address' => 'sometimes|nullable|email|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $organization = Organization::findOrFail($id);
            $oldData = $organization->toArray();
            $organization->update($request->only(['organization_name', 'address', 'contact_number', 'email_address']));

            try {
                $changes = array_diff_assoc($request->only(['organization_name', 'address', 'contact_number', 'email_address']), $oldData);
                ActivityLogService::organizationUpdated(
                    null,
                    $organization,
                    $changes
                );
            } catch (\Exception $logError) {
                \Log::warning('Failed to log organization update activity: ' . $logError->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'Organization updated successfully',
                'data' => $organization
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update organization',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $organization = Organization::findOrFail($id);
            $orgName = $organization->organization_name;
            $organization->delete();

            try {
                ActivityLogService::organizationDeleted(
                    null,
                    $id,
                    $orgName
                );
            } catch (\Exception $logError) {
                \Log::warning('Failed to log organization deletion activity: ' . $logError->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'Organization deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete organization',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
