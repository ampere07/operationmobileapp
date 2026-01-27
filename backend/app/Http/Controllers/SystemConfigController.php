<?php

namespace App\Http\Controllers;

use App\Models\SystemConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SystemConfigController extends Controller
{
    private function uploadToGoogleDrive($file, $filename)
    {
        try {
            $client = new \Google\Client();
            $client->setClientId(env('GOOGLE_DRIVE_CLIENT_ID'));
            $client->setClientSecret(env('GOOGLE_DRIVE_CLIENT_SECRET'));
            $client->setRedirectUri(env('GOOGLE_DRIVE_REDIRECT_URI'));
            $client->setAccessType('offline');
            $client->setScopes([\Google_Service_Drive::DRIVE_FILE]);
            
            $accessToken = [
                'access_token' => env('GOOGLE_DRIVE_ACCESS_TOKEN'),
                'refresh_token' => env('GOOGLE_DRIVE_REFRESH_TOKEN'),
                'expires_in' => 3600,
                'created' => time()
            ];
            $client->setAccessToken($accessToken);

            if ($client->isAccessTokenExpired()) {
                $newToken = $client->fetchAccessTokenWithRefreshToken($client->getRefreshToken());
                if (isset($newToken['access_token'])) {
                    $client->setAccessToken($newToken);
                }
            }

            $service = new \Google_Service_Drive($client);
            
            $fileMetadata = new \Google_Service_Drive_DriveFile([
                'name' => $filename,
                'parents' => [env('GOOGLE_DRIVE_FOLDER_ID')]
            ]);

            $content = file_get_contents($file->getRealPath());
            
            $driveFile = $service->files->create($fileMetadata, [
                'data' => $content,
                'mimeType' => $file->getMimeType(),
                'uploadType' => 'multipart',
                'fields' => 'id,webViewLink'
            ]);

            $service->permissions->create(
                $driveFile->id,
                new \Google_Service_Drive_Permission([
                    'type' => 'anyone',
                    'role' => 'reader'
                ])
            );

            return [
                'success' => true,
                'file_id' => $driveFile->id,
                'web_view_link' => $driveFile->webViewLink,
                'direct_link' => "https://drive.google.com/uc?export=view&id={$driveFile->id}"
            ];
        } catch (\Exception $e) {
            Log::error('Google Drive upload failed: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    public function getLogo()
    {
        try {
            $config = SystemConfig::where('config_key', 'image_logo')->first();
            
            return response()->json([
                'success' => true,
                'data' => $config ? $config->config_value : null
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

            $uploadResult = $this->uploadToGoogleDrive($file, $filename);

            if (!$uploadResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to upload to Google Drive: ' . $uploadResult['error']
                ], 500);
            }

            $config = SystemConfig::updateOrCreate(
                ['config_key' => 'image_logo'],
                [
                    'config_value' => $uploadResult['direct_link'],
                    'updated_by' => $request->updated_by
                ]
            );

            Log::info('Logo uploaded successfully', [
                'file_id' => $uploadResult['file_id'],
                'direct_link' => $uploadResult['direct_link'],
                'updated_by' => $request->updated_by
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Logo uploaded successfully',
                'data' => [
                    'logo_url' => $uploadResult['direct_link'],
                    'file_id' => $uploadResult['file_id']
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
