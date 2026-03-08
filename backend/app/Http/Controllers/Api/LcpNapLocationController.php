<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LCPNAPLocation;
use App\Services\GoogleDriveService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

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
            $limit = min((int) $request->get('limit', 1000), 10000);
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
            $minimal = (bool) $request->get('minimal', false);
            
            // Fast 5-minute cache to avoid hammer results in huge DB load
            $cacheKey = 'lcpnap_locations_' . ($minimal ? 'min_v2' : 'full_v2');
            
            return Cache::remember($cacheKey, 300, function () use ($minimal) {
                $baseQuery = LCPNAPLocation::whereNotNull('coordinates')
                    ->where('coordinates', '!=', '')
                    ->orderBy('id', 'desc');

                if ($minimal) {
                    // Phase 1 (Pins only): returning numeric lat/lng and minimal keys (n, lat, lng)
                    // saves massive amount of bytes in JSON payload and frontend CPU parse time.
                    return [
                        'success' => true,
                        'data' => $baseQuery->select(['id', 'lcpnap_name', 'coordinates', 'port_total'])
                            ->get()
                            ->map(function ($item) {
                                $coords = explode(',', $item->coordinates);
                                if (count($coords) !== 2) return null;
                                return [
                                    'id' => $item->id,
                                    'lcpnap_name' => $item->lcpnap_name, // keep for search
                                    'latitude' => (float) trim($coords[0]),
                                    'longitude' => (float) trim($coords[1]),
                                    'port_total' => (int) $item->port_total,
                                    'total_technical_details' => 0, // Placeholder
                                    'is_minimal' => true
                                ];
                            })
                            ->filter()
                            ->values()
                    ];
                }

                // Phase 2 (Full enrichment): compute all session counts in 2 DB round-trips
                // 1. tech counts
                $techCounts = DB::table('technical_details')
                    ->select('lcpnap', DB::raw('COUNT(*) as total_technical_details'))
                    ->whereNotNull('lcpnap')
                    ->groupBy('lcpnap')
                    ->get()
                    ->keyBy('lcpnap');

                // 2. status counts
                $sessionRows = DB::table('technical_details as td')
                    ->join('online_status as os', 'td.account_id', '=', 'os.account_id')
                    ->select('td.lcpnap', 'os.session_status', DB::raw('COUNT(*) as cnt'))
                    ->whereNotNull('td.lcpnap')
                    ->groupBy('td.lcpnap', 'os.session_status')
                    ->get();

                $sessionMap = [];
                foreach ($sessionRows as $row) {
                    if (!isset($sessionMap[$row->lcpnap])) {
                        $sessionMap[$row->lcpnap] = ['Online' => 0, 'Inactive' => 0, 'Offline' => 0, 'Blocked' => 0, 'Not Found' => 0, 'total' => 0];
                    }
                    $status = $row->session_status;
                    $count = (int)$row->cnt;
                    $sessionMap[$row->lcpnap][$status] = $count;
                    $sessionMap[$row->lcpnap]['total'] += $count;
                }

                $data = $baseQuery->select(['id', 'lcpnap_name', 'lcp', 'nap', 'coordinates', 'street', 'city', 'region', 'barangay', 'location', 'port_total', 'reading_image_url', 'image1_url', 'image2_url', 'modified_by', 'modified_date'])
                    ->get()
                    ->map(function ($item) use ($techCounts, $sessionMap) {
                        $name = $item->lcpnap_name;
                        $tech = $techCounts->get($name);
                        $session = $sessionMap[$name] ?? [];
                        $coords = explode(',', $item->coordinates);

                        return [
                            'id' => $item->id,
                            'lcpnap_name' => $name,
                            'lcp_name' => $item->lcp,
                            'nap_name' => $item->nap,
                            'latitude' => (float) trim($coords[0] ?? 0),
                            'longitude' => (float) trim($coords[1] ?? 0),
                            'street' => $item->street,
                            'city' => $item->city,
                            'region' => $item->region,
                            'barangay' => $item->barangay,
                            'location' => $item->location,
                            'port_total' => (int)$item->port_total,
                            'reading_image_url' => $item->reading_image_url,
                            'image1_url' => $item->image1_url,
                            'image2_url' => $item->image2_url,
                            'modified_by' => $item->modified_by,
                            'modified_date' => $item->modified_date,
                            'active_sessions' => $session['Online'] ?? 0,
                            'inactive_sessions' => $session['Inactive'] ?? 0,
                            'offline_sessions' => $session['Offline'] ?? 0,
                            'blocked_sessions' => $session['Blocked'] ?? 0,
                            'not_found_sessions' => $session['Not Found'] ?? 0,
                            'total_technical_details' => (int)($tech->total_technical_details ?? 0),
                            'total_sessions' => $session['total'] ?? 0,
                            'is_minimal' => false
                        ];
                    });

                return ['success' => true, 'data' => $data];
            });

        } catch (\Exception $e) {
            Log::error('LCPNAP Locations Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error fetching locations: ' . $e->getMessage()], 500);
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

    public function getMostUsedLCPNAPs()
    {
        try {
            $mostUsed = \Illuminate\Support\Facades\DB::table('job_orders')
                ->select('lcpnap', \Illuminate\Support\Facades\DB::raw('count(*) as count'))
                ->whereNotNull('lcpnap')
                ->where('lcpnap', '!=', '')
                ->groupBy('lcpnap')
                ->orderBy('count', 'desc')
                ->take(5)
                ->get();

            $names = $mostUsed->pluck('lcpnap')->toArray();
            
            $locations = LCPNAPLocation::whereIn('lcpnap_name', $names)
                ->get()
                ->sortBy(function($location) use ($names) {
                    return array_search($location->lcpnap_name, $names);
                })
                ->values();

            return response()->json([
                'success' => true,
                'data' => $locations
            ]);
        } catch (\Exception $e) {
            Log::error('Most used LCP/NAP error', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch most used LCP/NAP records',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

