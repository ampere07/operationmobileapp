<?php

namespace App\Http\Controllers;

use App\Models\SystemConfig;
use App\Models\FormUI;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SystemConfigController extends Controller
{


    public function getLogo()
    {
        try {
            $config = FormUI::first();
            
            return response()->json([
                'success' => true,
                'data' => $config ? $config->logo_url : null
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching logo: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch logo'
            ], 500);
        }
    }

    public function uploadLogo(Request $request)
    {
        try {
            $request->validate([
                'logo' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:5120',
                'updated_by' => 'required|string'
            ]);

            $file = $request->file('logo');
            $filename = 'logo_' . time() . '.' . $file->getClientOriginalExtension();

            $driveService = resolve(\App\Services\GoogleDriveService::class);
            $folderId = $driveService->getParentFolderId();
            
            $fileUrl = $driveService->uploadFile($file, $folderId, $filename, $file->getMimeType());
            
            // Extract file ID from URL: https://drive.google.com/file/d/ID/view
            preg_match('/\/d\/(.+?)\/view/', $fileUrl, $matches);
            $fileId = $matches[1] ?? '';
            
            if (!$fileId) {
                throw new \Exception('Failed to extract file ID from Drive URL: ' . $fileUrl);
            }

            $directLink = "https://drive.google.com/uc?export=view&id={$fileId}";

            $config = SystemConfig::updateOrCreate(
                ['config_key' => 'image_logo'],
                [
                    'config_value' => $directLink,
                    'updated_by' => $request->updated_by
                ]
            );

            // Update form_ui table - only one entry should exist
            if (FormUI::exists()) {
                FormUI::query()->update(['logo_url' => $directLink]);
            } else {
                FormUI::create(['logo_url' => $directLink]);
            }

            Log::info('Logo uploaded successfully', [
                'file_id' => $fileId,
                'direct_link' => $directLink,
                'updated_by' => $request->updated_by
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Logo uploaded successfully',
                'data' => [
                    'logo_url' => $directLink,
                    'file_id' => $fileId
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error uploading logo: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload logo: ' . $e->getMessage()
            ], 500);
        }
    }

    public function deleteLogo(Request $request)
    {
        try {
            $config = SystemConfig::where('config_key', 'image_logo')->first();
            
            if ($config && $config->config_value) {
                $config->config_value = null;
                $config->updated_by = $request->query('updated_by', 'system');
                $config->save();

                // Update form_ui table
                FormUI::query()->update(['logo_url' => null]);

                return response()->json([
                    'success' => true,
                    'message' => 'Logo deleted successfully'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'No logo found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error deleting logo: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete logo'
            ], 500);
        }
    }
}
