<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Services\ActivityLogService;

class UserController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = User::with(['organization', 'role']);
            
            if ($request->has('role')) {
                $roleName = $request->input('role');
                $query->whereHas('role', function($q) use ($roleName) {
                    $q->where('role_name', 'LIKE', '%' . $roleName . '%');
                });
            }

            if ($request->has('role_id')) {
                $query->where('role_id', $request->input('role_id'));
            }
            
            $users = $query->get();
            return response()->json([
                'success' => true,
                'data' => $users
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch users',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'salutation' => 'nullable|string|max:10|in:Mr,Ms,Mrs,Dr,Prof',
            'first_name' => 'required|string|max:255',
            'middle_initial' => 'nullable|string|max:1',
            'last_name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users',
            'email_address' => 'required|string|email|max:255|unique:users,email_address',
            'contact_number' => 'nullable|string|max:20|regex:/^[+]?[0-9\s\-\(\)]+$/',
            'password' => 'required|string|min:8',
            'organization_id' => 'nullable|integer',
            'role_id' => 'nullable|integer|exists:roles,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Generate user ID with proper error handling
            
                $userData = [
                    'salutation' => $request->salutation,
                    'first_name' => $request->first_name,
                    'middle_initial' => $request->middle_initial,
                    'last_name' => $request->last_name,
                    'username' => $request->username,
                    'email_address' => $request->email_address,   // correct field
                    'contact_number' => $request->contact_number, // correct field
                    'password_hash' => $request->password,
                    'organization_id' => $request->organization_id && $request->organization_id > 0 ? $request->organization_id : null,
                    'role_id' => $request->role_id && $request->role_id > 0 ? $request->role_id : null,
                ];
            
            $user = User::create($userData);
            
            if (!$user) {
                throw new \Exception('Failed to create user');
            }

            // Try to log user creation activity (but don't fail if logging fails)
            try {
                ActivityLogService::userCreated(
                    null, // For now, no authenticated user
                    $user,
                    ['created_by' => 'system']
                );
            } catch (\Exception $logError) {
                \Log::warning('Failed to log user creation activity: ' . $logError->getMessage());
            }
            
            $responseUser = $user->load(['organization', 'role']);

            return response()->json([
                'success' => true,
                'message' => 'User created successfully',
                'data' => $responseUser
            ], 201);
        } catch (\Exception $e) {
            \Log::error('User creation failed: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $user = User::with(['organization', 'role'])->findOrFail($id);
            return response()->json([
                'success' => true,
                'data' => $user
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        // Validate the user ID first
        if (!$id || $id <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid user ID provided',
                'error' => 'User ID must be a positive integer'
            ], 400);
        }
        
        $validator = Validator::make($request->all(), [
            'salutation' => 'sometimes|string|max:10|in:Mr,Ms,Mrs,Dr,Prof',
            'first_name' => 'sometimes|string|max:255',
            'middle_initial' => 'sometimes|nullable|string|max:1',
            'last_name' => 'sometimes|string|max:255',
            'username' => 'sometimes|string|max:255|unique:users,username,' . $id . ',id',
            'email_address' => 'sometimes|string|email|max:255|unique:users,email_address,' . $id . ',id',
            'contact_number' => 'sometimes|string|max:20|regex:/^[+]?[0-9\s\-\(\)]+$/',
            'password' => 'sometimes|string|min:8',
            'organization_id' => 'sometimes|nullable|integer',
            'role_id' => 'sometimes|nullable|integer|exists:roles,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = User::findOrFail($id);
            
            $oldData = $user->toArray();
            $updateData = $request->only(['salutation', 'first_name', 'middle_initial','last_name','username', 'email_address', 'contact_number', 'organization_id', 'role_id']);
            
            if ($request->has('password')) {
                $updateData['password_hash'] = $request->password;
            }
            
            // Handle organization_id properly - ensure it is null if not provided or 0
            if (array_key_exists('organization_id', $updateData)) {
                $updateData['organization_id'] = $updateData['organization_id'] && $updateData['organization_id'] > 0 ? $updateData['organization_id'] : null;
            }
            
            // Handle role_id properly - ensure it is null if not provided or 0
            if (array_key_exists('role_id', $updateData)) {
                $updateData['role_id'] = $updateData['role_id'] && $updateData['role_id'] > 0 ? $updateData['role_id'] : null;
            }
            
            // Remove empty values to avoid unnecessary updates
            $updateData = array_filter($updateData, function($value, $key) {
                return $value !== null && $value !== '' && $key !== 'organization_id' && $key !== 'role_id';
            }, ARRAY_FILTER_USE_BOTH);
            
            // Add organization_id back if it was in the request (even if null)
            if ($request->has('organization_id')) {
                $updateData['organization_id'] = $request->organization_id && $request->organization_id > 0 ? $request->organization_id : null;
            }
            
            // Add role_id back if it was in the request (even if null)
            if ($request->has('role_id')) {
                $updateData['role_id'] = $request->role_id && $request->role_id > 0 ? $request->role_id : null;
            }

            $user->update($updateData);

            // Try to log user update activity (but don't fail if logging fails)
            try {
                $changes = array_diff_assoc($updateData, $oldData);
                ActivityLogService::userUpdated(
                    null, // For now, no authenticated user
                    $user,
                    $changes
                );
            } catch (\Exception $logError) {
                \Log::warning('Failed to log user update activity: ' . $logError->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'data' => $user->load(['organization', 'role'])
            ]);
        } catch (\Exception $e) {
            \Log::error('User update failed for ID ' . $id . ': ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $user = User::findOrFail($id);
            $username = $user->username;
            $user->delete();

            // Try to log user deletion activity (but don't fail if logging fails)
            try {
                ActivityLogService::userDeleted(
                    null, // For now, no authenticated user
                    $id,
                    $username
                );
            } catch (\Exception $logError) {
                \Log::warning('Failed to log user deletion activity: ' . $logError->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete user',
                'error' => $e->getMessage()
            ], 500);
        }
    }


}

