<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Region;
use App\Models\City;
use App\Models\Barangay;
use App\Models\Village;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class LocationApiController extends Controller
{
    /**
     * Get all locations with hierarchical structure
     */
    public function getAllLocations()
    {
        try {
            $regions = Region::with(['cities.barangays'])
                ->orderBy('region')
                ->get();
            
            $result = $regions->map(function($region) {
                return [
                    'id' => $region->id,
                    'name' => $region->region,
                    'active_cities' => $region->cities->map(function($city) {
                        return [
                            'id' => $city->id,
                            'name' => $city->city,
                            'region_id' => $city->region_id,
                            'active_barangays' => $city->barangays->map(function($barangay) {
                                return [
                                    'id' => $barangay->id,
                                    'name' => $barangay->barangay,
                                    'city_id' => $barangay->city_id
                                ];
                            })
                        ];
                    })
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $result
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching locations: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all regions
     */
    public function getRegions()
    {
        try {
            $regions = Region::orderBy('region')->get();
            
            // Transform to match frontend expectations
            $transformedRegions = $regions->map(function($region) {
                return [
                    'id' => $region->id,
                    'name' => $region->region,
                    'region' => $region->region
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $transformedRegions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching regions: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get cities by region
     */
    public function getCitiesByRegion($regionId)
    {
        try {
            $cities = City::where('region_id', $regionId)
                ->orderBy('city')
                ->get();
            
            // Transform to match frontend expectations
            $transformedCities = $cities->map(function($city) {
                return [
                    'id' => $city->id,
                    'name' => $city->city,
                    'city' => $city->city,
                    'region_id' => $city->region_id
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $transformedCities
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching cities: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all cities
     */
    public function getAllCities()
    {
        try {
            $cities = City::orderBy('city')->get();
            
            // Transform to match frontend expectations
            $transformedCities = $cities->map(function($city) {
                return [
                    'id' => $city->id,
                    'name' => $city->city,
                    'city' => $city->city,
                    'region_id' => $city->region_id
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $transformedCities
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching cities: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get barangays by city
     */
    public function getBarangaysByCity($cityId)
    {
        try {
            $barangays = Barangay::where('city_id', $cityId)
                ->orderBy('barangay')
                ->get();
            
            // Transform to match frontend expectations
            $transformedBarangays = $barangays->map(function($barangay) {
                return [
                    'id' => $barangay->id,
                    'name' => $barangay->barangay,
                    'barangay' => $barangay->barangay,
                    'city_id' => $barangay->city_id
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $transformedBarangays
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching barangays: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all barangays
     */
    public function getAllBarangays()
    {
        try {
            $barangays = Barangay::orderBy('barangay')->get();
            
            // Transform to match frontend expectations
            $transformedBarangays = $barangays->map(function($barangay) {
                return [
                    'id' => $barangay->id,
                    'name' => $barangay->barangay,
                    'barangay' => $barangay->barangay,
                    'city_id' => $barangay->city_id
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $transformedBarangays
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching barangays: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get villages by barangay
     */
    public function getVillagesByBarangay($barangayId)
    {
        try {
            $villages = Village::where('barangay_id', $barangayId)
                ->orderBy('village')
                ->get();
            
            // Transform to match frontend expectations
            $transformedVillages = $villages->map(function($village) {
                return [
                    'id' => $village->id,
                    'name' => $village->village,
                    'village' => $village->village,
                    'barangay_id' => $village->barangay_id,
                    'borough_id' => $village->barangay_id  // Frontend uses borough_id
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $transformedVillages
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching villages: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all villages
     */
    public function getAllVillages()
    {
        try {
            $villages = Village::orderBy('village')->get();
            
            // Transform to match frontend expectations
            $transformedVillages = $villages->map(function($village) {
                return [
                    'id' => $village->id,
                    'name' => $village->village,
                    'village' => $village->village,
                    'barangay_id' => $village->barangay_id,
                    'borough_id' => $village->barangay_id  // Frontend uses borough_id
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $transformedVillages
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching villages: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add new region
     */
    public function addRegion(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $name = $request->input('name');
            
            $existing = Region::whereRaw('LOWER(region) = ?', [strtolower($name)])->first();
            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'A region with this name already exists'
                ], 422);
            }
            
            $region = Region::create([
                'region' => $name
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Region added successfully',
                'data' => $region
            ], 201);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error adding region: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add new city
     */
    public function addCity(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'region_id' => 'required|integer|exists:region,id',
                'name' => 'required|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $regionId = $request->input('region_id');
            $name = $request->input('name');
            
            $existing = City::where('region_id', $regionId)
                ->whereRaw('LOWER(city) = ?', [strtolower($name)])
                ->first();
                
            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'A city with this name already exists in this region'
                ], 422);
            }
            
            $city = City::create([
                'region_id' => $regionId,
                'city' => $name
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'City added successfully',
                'data' => $city
            ], 201);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error adding city: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add new barangay
     */
    public function addBarangay(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'city_id' => 'required|integer|exists:city,id',
                'name' => 'required|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $cityId = $request->input('city_id');
            $name = $request->input('name');
            
            $existing = Barangay::where('city_id', $cityId)
                ->whereRaw('LOWER(barangay) = ?', [strtolower($name)])
                ->first();
                
            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'A barangay with this name already exists in this city'
                ], 422);
            }
            
            $barangay = Barangay::create([
                'city_id' => $cityId,
                'barangay' => $name
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Barangay added successfully',
                'data' => $barangay
            ], 201);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error adding barangay: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add new village
     */
    public function addVillage(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'barangay_id' => 'nullable|integer',
                'name' => 'required|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $barangayId = $request->input('barangay_id');
            $name = $request->input('name');
            
            // Check if barangay exists if barangay_id is provided
            if ($barangayId) {
                $barangayExists = Barangay::find($barangayId);
                if (!$barangayExists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Barangay not found'
                    ], 422);
                }
            }
            
            // Check for duplicate village name in same barangay
            $query = Village::whereRaw('LOWER(village) = ?', [strtolower($name)]);
            if ($barangayId) {
                $query->where('barangay_id', $barangayId);
            }
            $existing = $query->first();
                
            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'A village with this name already exists in this barangay'
                ], 422);
            }
            
            $village = Village::create([
                'barangay_id' => $barangayId,
                'village' => $name
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Village added successfully',
                'data' => $village
            ], 201);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error adding village: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update location
     */
    public function updateLocation($type, $id, Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $name = $request->input('name');
            
            $validTypes = ['region', 'city', 'barangay', 'village'];
            if (!in_array($type, $validTypes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid location type'
                ], 400);
            }
            
            switch ($type) {
                case 'region':
                    $location = Region::find($id);
                    if (!$location) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Region not found'
                        ], 404);
                    }
                    
                    $existing = Region::where('id', '!=', $id)
                        ->whereRaw('LOWER(region) = ?', [strtolower($name)])
                        ->first();
                    if ($existing) {
                        return response()->json([
                            'success' => false,
                            'message' => 'A region with this name already exists'
                        ], 422);
                    }
                    
                    $location->region = $name;
                    $location->save();
                    break;
                    
                case 'city':
                    $location = City::find($id);
                    if (!$location) {
                        return response()->json([
                            'success' => false,
                            'message' => 'City not found'
                        ], 404);
                    }
                    
                    $existing = City::where('id', '!=', $id)
                        ->where('region_id', $location->region_id)
                        ->whereRaw('LOWER(city) = ?', [strtolower($name)])
                        ->first();
                    if ($existing) {
                        return response()->json([
                            'success' => false,
                            'message' => 'A city with this name already exists in this region'
                        ], 422);
                    }
                    
                    $location->city = $name;
                    $location->save();
                    break;
                    
                case 'barangay':
                    $location = Barangay::find($id);
                    if (!$location) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Barangay not found'
                        ], 404);
                    }
                    
                    $existing = Barangay::where('id', '!=', $id)
                        ->where('city_id', $location->city_id)
                        ->whereRaw('LOWER(barangay) = ?', [strtolower($name)])
                        ->first();
                    if ($existing) {
                        return response()->json([
                            'success' => false,
                            'message' => 'A barangay with this name already exists in this city'
                        ], 422);
                    }
                    
                    $location->barangay = $name;
                    $location->save();
                    break;
                    
                case 'village':
                    $location = Village::find($id);
                    if (!$location) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Village not found'
                        ], 404);
                    }
                    
                    $existing = Village::where('id', '!=', $id)
                        ->where('barangay_id', $location->barangay_id)
                        ->whereRaw('LOWER(village) = ?', [strtolower($name)])
                        ->first();
                    if ($existing) {
                        return response()->json([
                            'success' => false,
                            'message' => 'A village with this name already exists in this barangay'
                        ], 422);
                    }
                    
                    $location->village = $name;
                    $location->save();
                    break;
            }
            
            return response()->json([
                'success' => true,
                'message' => ucfirst($type) . ' updated successfully',
                'data' => $location
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => "Error updating {$type}: " . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete location with cascade support
     */
    public function deleteLocation($type, $id, Request $request)
    {
        try {
            $validTypes = ['region', 'city', 'barangay', 'village'];
            if (!in_array($type, $validTypes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid location type'
                ], 400);
            }
            
            $cascade = $request->query('cascade', false);
            
            DB::beginTransaction();
            
            try {
                switch ($type) {
                    case 'region':
                        $region = Region::find($id);
                        if (!$region) {
                            DB::rollBack();
                            return response()->json([
                                'success' => false,
                                'message' => 'Region not found'
                            ], 404);
                        }
                        
                        $cities = City::where('region_id', $id)->get();
                        
                        if ($cities->count() > 0 && !$cascade) {
                            $barangayCount = 0;
                            foreach ($cities as $city) {
                                $barangayCount += Barangay::where('city_id', $city->id)->count();
                            }
                            
                            DB::rollBack();
                            return response()->json([
                                'success' => false,
                                'message' => 'Cannot delete region: contains cities and barangays',
                                'data' => [
                                    'can_cascade' => true,
                                    'type' => 'region',
                                    'name' => $region->region,
                                    'city_count' => $cities->count(),
                                    'barangay_count' => $barangayCount
                                ]
                            ], 422);
                        }
                        
                        if ($cascade) {
                            foreach ($cities as $city) {
                                $barangays = Barangay::where('city_id', $city->id)->get();
                                foreach ($barangays as $barangay) {
                                    Village::where('barangay_id', $barangay->id)->delete();
                                }
                                Barangay::where('city_id', $city->id)->delete();
                            }
                            City::where('region_id', $id)->delete();
                        }
                        
                        $region->delete();
                        break;
                        
                    case 'city':
                        $city = City::find($id);
                        if (!$city) {
                            DB::rollBack();
                            return response()->json([
                                'success' => false,
                                'message' => 'City not found'
                            ], 404);
                        }
                        
                        $barangays = Barangay::where('city_id', $id)->get();
                        
                        if ($barangays->count() > 0 && !$cascade) {
                            DB::rollBack();
                            return response()->json([
                                'success' => false,
                                'message' => 'Cannot delete city: contains barangays',
                                'data' => [
                                    'can_cascade' => true,
                                    'type' => 'city',
                                    'name' => $city->city,
                                    'barangay_count' => $barangays->count()
                                ]
                            ], 422);
                        }
                        
                        if ($cascade) {
                            foreach ($barangays as $barangay) {
                                Village::where('barangay_id', $barangay->id)->delete();
                            }
                            Barangay::where('city_id', $id)->delete();
                        }
                        
                        $city->delete();
                        break;
                        
                    case 'barangay':
                        $barangay = Barangay::find($id);
                        if (!$barangay) {
                            DB::rollBack();
                            return response()->json([
                                'success' => false,
                                'message' => 'Barangay not found'
                            ], 404);
                        }
                        
                        $villages = Village::where('barangay_id', $id)->get();
                        
                        if ($villages->count() > 0 && !$cascade) {
                            DB::rollBack();
                            return response()->json([
                                'success' => false,
                                'message' => 'Cannot delete barangay: contains villages',
                                'data' => [
                                    'can_cascade' => true,
                                    'type' => 'barangay',
                                    'name' => $barangay->barangay,
                                    'village_count' => $villages->count()
                                ]
                            ], 422);
                        }
                        
                        if ($cascade) {
                            Village::where('barangay_id', $id)->delete();
                        }
                        
                        $barangay->delete();
                        break;
                        
                    case 'village':
                        $village = Village::find($id);
                        if (!$village) {
                            DB::rollBack();
                            return response()->json([
                                'success' => false,
                                'message' => 'Village not found'
                            ], 404);
                        }
                        
                        $village->delete();
                        break;
                }
                
                DB::commit();
                
                $message = ucfirst($type) . ' deleted successfully';
                if ($cascade) {
                    $message .= ' (with all dependent locations)';
                }
                
                return response()->json([
                    'success' => true,
                    'message' => $message
                ]);
                
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => "Error deleting {$type}: " . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get statistics
     */
    public function getStatistics()
    {
        try {
            $regions = Region::count();
            $cities = City::count();  
            $barangays = Barangay::count();
            $villages = Village::count();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'regions' => $regions,
                    'cities' => $cities,
                    'barangays' => $barangays,
                    'villages' => $villages,
                    'total' => $regions + $cities + $barangays + $villages
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error getting statistics: ' . $e->getMessage()
            ], 500);
        }
    }
}
