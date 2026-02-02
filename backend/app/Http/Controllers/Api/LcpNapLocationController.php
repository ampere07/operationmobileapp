<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LCPNAPLocation;
use App\Services\GoogleDriveService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class LcpNapLocationController extends Controller
{
    protected $googleDriveService;

    public function __construct(GoogleDriveService $googleDriveService)
    {
        $this->googleDriveService = $googleDriveService;
    }

    public function index(Request $request)
    {
        try {
            $page = (int) $request->get('page', 1);
            $limit = min((int) $request->get('limit', 1000), 1000);
            $search = $request->get('search', '');
            
            $query = LCPNAPLocation::query();
            
            if (!empty($search)) {
                $query->where(function($q) use ($search) {
                    $q->where('lcpnap_name', 'like', '%' . $search . '%')
                      ->orWhere('lcp', 'like', '%' . $search . '%')
                      ->orWhere('nap', 'like', '%' . $search . '%')
                      ->orWhere('location', 'like', '%' . $search . '%');
                });
            }
            
            $totalItems = $query->count();
            $totalPages = $limit > 0 ? ceil($totalItems / $limit) : 1;
            
            $lcpnapItems = $query->orderBy('id', 'desc')
                                 ->skip(($page - 1) * $limit)
                                 ->take($limit)
                                 ->get();
            
            return response()->json([
                'success' => true,
                'data' => $lcpnapItems,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_items' => $totalItems,
                    'items_per_page' => $limit,
                    'has_next' => $page < $totalPages,
                    'has_prev' => $page > 1
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('LCPNAP API Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching LCPNAP items: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getLocations(Request $request)
    {
        try {
            // Enable query logging for debugging
            \DB::enableQueryLog();
            
            $lcpnapLocations = LCPNAPLocation::select('lcpnap.*')
                ->selectRaw('(
                    SELECT COUNT(DISTINCT os.id)
                    FROM technical_details td
                    LEFT JOIN online_status os ON td.account_id = os.account_id
                    WHERE td.lcpnap = (SELECT lcpnap_name FROM lcpnap AS l WHERE l.id = lcpnap.id)
                    AND os.session_status = "Online"
                ) as active_sessions')
                ->selectRaw('(
                    SELECT COUNT(DISTINCT os.id)
                    FROM technical_details td
                    LEFT JOIN online_status os ON td.account_id = os.account_id
                    WHERE td.lcpnap = (SELECT lcpnap_name FROM lcpnap AS l WHERE l.id = lcpnap.id)
                    AND os.session_status = "Inactive"
                ) as inactive_sessions')
                ->selectRaw('(
                    SELECT COUNT(DISTINCT os.id)
                    FROM technical_details td
                    LEFT JOIN online_status os ON td.account_id = os.account_id
                    WHERE td.lcpnap = (SELECT lcpnap_name FROM lcpnap AS l WHERE l.id = lcpnap.id)
                    AND os.session_status = "Offline"
                ) as offline_sessions')
                ->selectRaw('(
                    SELECT COUNT(DISTINCT os.id)
                    FROM technical_details td
                    LEFT JOIN online_status os ON td.account_id = os.account_id
                    WHERE td.lcpnap = (SELECT lcpnap_name FROM lcpnap AS l WHERE l.id = lcpnap.id)
                    AND os.session_status = "Blocked"
                ) as blocked_sessions')
                ->selectRaw('(
                    SELECT COUNT(DISTINCT os.id)
                    FROM technical_details td
                    LEFT JOIN online_status os ON td.account_id = os.account_id
                    WHERE td.lcpnap = (SELECT lcpnap_name FROM lcpnap AS l WHERE l.id = lcpnap.id)
                    AND os.session_status = "Not Found"
                ) as not_found_sessions')
                ->selectRaw('(
                    SELECT COUNT(DISTINCT td.id)
                    FROM technical_details td
                    WHERE td.lcpnap = (SELECT lcpnap_name FROM lcpnap AS l WHERE l.id = lcpnap.id)
                ) as total_technical_details')
                ->selectRaw('(
                    SELECT COUNT(DISTINCT os.id)
                    FROM technical_details td
                    INNER JOIN online_status os ON td.account_id = os.account_id
                    WHERE td.lcpnap = (SELECT lcpnap_name FROM lcpnap AS l WHERE l.id = lcpnap.id)
                ) as total_sessions')
                ->whereNotNull('coordinates')
                ->where('coordinates', '!=', '')
                ->orderBy('id', 'desc')
                ->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'lcpnap_name' => $item->lcpnap_name,
                        'lcp_name' => $item->lcp,
                        'nap_name' => $item->nap,
                        'coordinates' => $item->coordinates,
                        'street' => $item->street,
                        'city' => $item->city,
                        'region' => $item->region,
                        'barangay' => $item->barangay,
                        'location' => $item->location,
                        'port_total' => $item->port_total,
                        'reading_image_url' => $item->reading_image_url,
                        'image1_url' => $item->image1_url,
                        'image2_url' => $item->image2_url,
                        'modified_by' => $item->modified_by,
                        'modified_date' => $item->modified_date,
                        'active_sessions' => (int) $item->active_sessions,
                        'inactive_sessions' => (int) $item->inactive_sessions,
                        'offline_sessions' => (int) $item->offline_sessions,
                        'blocked_sessions' => (int) $item->blocked_sessions,
                        'not_found_sessions' => (int) $item->not_found_sessions,
                        'total_technical_details' => (int) $item->total_technical_details,
                        'total_sessions' => (int) $item->total_sessions
                    ];
                });
            
            // Log the queries for debugging
            $queries = \DB::getQueryLog();
            Log::info('LCP/NAP Location Queries', ['queries' => $queries]);
            
            return response()->json([
                'success' => true,
                'data' => $lcpnapLocations,
                'debug_queries' => $queries // Temporary for debugging
            ]);
            
        } catch (\Exception $e) {
            Log::error('LCPNAP Locations Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching locations: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            Log::info('LCPNAP Store Request', [
                'has_reading_image' => $request->hasFile('reading_image'),
                'has_image' => $request->hasFile('image'),
                'has_image_2' => $request->hasFile('image_2'),
                'all_data' => $request->except(['reading_image', 'image', 'image_2'])
            ]);

            $validator = Validator::make($request->all(), [
                'lcpnap_name' => 'required|string|max:255',
                'street' => 'required|string|max:255',
                'region' => 'required|string|max:255',
                'city' => 'required|string|max:255',
                'barangay' => 'required|string|max:255',
                'location' => 'required|string|max:255',
                'lcp_id' => 'required|string|max:255',
                'nap_id' => 'required|string|max:255',
                'port_total' => 'required|integer|min:1',
                'coordinates' => 'nullable|string|max:255',
                'reading_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10240',
                'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10240',
                'image_2' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10240',
                'modified_by' => 'required|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $existing = LCPNAPLocation::where('lcpnap_name', $request->lcpnap_name)->first();
            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'A LCPNAP with this name already exists'
                ], 422);
            }

            $folderName = "(lcpnap)" . $request->lcpnap_name;
            $folderId = $this->googleDriveService->createFolder($folderName);

            $readingImageUrl = null;
            $image1Url = null;
            $image2Url = null;

            if ($request->hasFile('reading_image')) {
                $readingImageUrl = $this->uploadImageToDrive(
                    $request->file('reading_image'),
                    $folderId,
                    'reading_image_' . time()
                );
            }

            if ($request->hasFile('image')) {
                $image1Url = $this->uploadImageToDrive(
                    $request->file('image'),
                    $folderId,
                    'image1_' . time()
                );
            }

            if ($request->hasFile('image_2')) {
                $image2Url = $this->uploadImageToDrive(
                    $request->file('image_2'),
                    $folderId,
                    'image2_' . time()
                );
            }

            $lcpnap = new LCPNAPLocation();
            $lcpnap->lcpnap_name = $request->lcpnap_name;
            $lcpnap->reading_image_url = $readingImageUrl;
            $lcpnap->street = $request->street;
            $lcpnap->region = $request->region;
            $lcpnap->city = $request->city;
            $lcpnap->barangay = $request->barangay;
            $lcpnap->location = $request->location;
            $lcpnap->lcp = $request->lcp_id;
            $lcpnap->nap = $request->nap_id;
            $lcpnap->port_total = $request->port_total;
            $lcpnap->image1_url = $image1Url;
            $lcpnap->image2_url = $image2Url;
            $lcpnap->modified_by = $request->modified_by;
            $lcpnap->modified_date = now();
            $lcpnap->coordinates = $request->coordinates;
            $lcpnap->save();

            Log::info('LCPNAP Created Successfully', [
                'id' => $lcpnap->id,
                'name' => $lcpnap->lcpnap_name
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'LCPNAP location added successfully',
                'data' => $lcpnap
            ], 201);
            
        } catch (\Exception $e) {
            Log::error('LCPNAP Store Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error adding LCPNAP location: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $lcpnap = LCPNAPLocation::find($id);
            
            if (!$lcpnap) {
                return response()->json([
                    'success' => false,
                    'message' => 'LCPNAP location not found'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'data' => $lcpnap
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching LCPNAP location: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'lcpnap_name' => 'required|string|max:255',
                'street' => 'required|string|max:255',
                'region' => 'required|string|max:255',
                'city' => 'required|string|max:255',
                'barangay' => 'required|string|max:255',
                'location' => 'required|string|max:255',
                'lcp_id' => 'required|string|max:255',
                'nap_id' => 'required|string|max:255',
                'port_total' => 'required|integer|min:1',
                'coordinates' => 'nullable|string|max:255',
                'reading_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10240',
                'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10240',
                'image_2' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10240',
                'modified_by' => 'required|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $lcpnap = LCPNAPLocation::find($id);
            if (!$lcpnap) {
                return response()->json([
                    'success' => false,
                    'message' => 'LCPNAP location not found'
                ], 404);
            }

            $duplicate = LCPNAPLocation::where('lcpnap_name', $request->lcpnap_name)
                ->where('id', '!=', $id)
                ->first();
            if ($duplicate) {
                return response()->json([
                    'success' => false,
                    'message' => 'A LCPNAP with this name already exists'
                ], 422);
            }

            $folderName = "(lcpnap)" . $request->lcpnap_name;
            $folderId = $this->googleDriveService->createFolder($folderName);

            if ($request->hasFile('reading_image')) {
                $lcpnap->reading_image_url = $this->uploadImageToDrive(
                    $request->file('reading_image'),
                    $folderId,
                    'reading_image_' . time()
                );
            }

            if ($request->hasFile('image')) {
                $lcpnap->image1_url = $this->uploadImageToDrive(
                    $request->file('image'),
                    $folderId,
                    'image1_' . time()
                );
            }

            if ($request->hasFile('image_2')) {
                $lcpnap->image2_url = $this->uploadImageToDrive(
                    $request->file('image_2'),
                    $folderId,
                    'image2_' . time()
                );
            }

            $lcpnap->lcpnap_name = $request->lcpnap_name;
            $lcpnap->street = $request->street;
            $lcpnap->region = $request->region;
            $lcpnap->city = $request->city;
            $lcpnap->barangay = $request->barangay;
            $lcpnap->location = $request->location;
            $lcpnap->lcp = $request->lcp_id;
            $lcpnap->nap = $request->nap_id;
            $lcpnap->port_total = $request->port_total;
            $lcpnap->modified_by = $request->modified_by;
            $lcpnap->modified_date = now();
            $lcpnap->coordinates = $request->coordinates;
            $lcpnap->save();
            
            return response()->json([
                'success' => true,
                'message' => 'LCPNAP location updated successfully',
                'data' => $lcpnap
            ]);
            
        } catch (\Exception $e) {
            Log::error('LCPNAP Update Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error updating LCPNAP location: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $lcpnap = LCPNAPLocation::find($id);
            if (!$lcpnap) {
                return response()->json([
                    'success' => false,
                    'message' => 'LCPNAP location not found'
                ], 404);
            }
            
            $lcpnap->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'LCPNAP location permanently deleted from database'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting LCPNAP location: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStatistics()
    {
        try {
            $totalLcpnap = LCPNAPLocation::count();
            $totalPorts = LCPNAPLocation::sum('port_total');
            $uniqueLocations = LCPNAPLocation::distinct('location')->count('location');
            
            return response()->json([
                'success' => true,
                'data' => [
                    'total_lcpnap' => $totalLcpnap,
                    'total_ports' => $totalPorts,
                    'unique_locations' => $uniqueLocations
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error getting statistics: ' . $e->getMessage()
            ], 500);
        }
    }

    private function uploadImageToDrive($file, $folderId, $filePrefix)
    {
        try {
            $extension = $file->getClientOriginalExtension();
            $fileName = $filePrefix . '.' . $extension;
            
            $fileUrl = $this->googleDriveService->uploadFile(
                $file,
                $folderId,
                $fileName,
                $file->getMimeType()
            );
            
            return $fileUrl;
        } catch (\Exception $e) {
            Log::error('Failed to upload image to Google Drive', [
                'error' => $e->getMessage(),
                'file_prefix' => $filePrefix
            ]);
            throw $e;
        }
    }
}
