import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { 
  createRegion, 
  createCity, 
  createBarangay, 
  createLocation,
  getRegions,
  getCities,
  getBoroughs,
  getLocations,
  Region,
  City,
  Borough,
  LocationDetail 
} from '../services/cityService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (locationData: LocationFormData) => void;
  initialLocationType?: 'region' | 'city' | 'barangay' | 'location';
}

interface LocationFormData {
  regionId: number | null;
  cityId: number | null;
  barangayId: number | null;
}

const AddLocationModal: React.FC<AddLocationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialLocationType
}) => {
  const [formData, setFormData] = useState<LocationFormData>({
    regionId: null,
    cityId: null,
    barangayId: null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const [newRegionName, setNewRegionName] = useState('');
  const [newCityName, setNewCityName] = useState('');
  const [newBarangayName, setNewBarangayName] = useState('');
  const [newLocationName, setNewLocationName] = useState('');

  const [showNewRegionInput, setShowNewRegionInput] = useState(false);
  const [showNewCityInput, setShowNewCityInput] = useState(false);
  const [showNewBarangayInput, setShowNewBarangayInput] = useState(false);
  const [showNewLocationInput, setShowNewLocationInput] = useState(false);

  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [allCities, setAllCities] = useState<City[]>([]);
  const [allBarangays, setAllBarangays] = useState<Borough[]>([]);
  const [allLocations, setAllLocations] = useState<LocationDetail[]>([]);

  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [filteredBarangays, setFilteredBarangays] = useState<Borough[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<LocationDetail[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(localStorage.getItem('theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchColorPalette = async () => {
      try {
        const activePalette = await settingsColorPaletteService.getActive();
        setColorPalette(activePalette);
      } catch (err) {
        console.error('Failed to fetch color palette:', err);
      }
    };
    fetchColorPalette();
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAllLocationData();
    }
  }, [isOpen]);

  const fetchAllLocationData = async () => {
    setDataLoading(true);
    try {
      const [regions, cities, barangays, locations] = await Promise.all([
        getRegions(),
        getCities(),
        getBoroughs(),
        getLocations()
      ]);

      console.log('Fetched regions:', regions);
      console.log('Fetched cities:', cities);
      console.log('Fetched barangays:', barangays);
      console.log('Fetched locations:', locations);

      setAllRegions(regions);
      setAllCities(cities);
      setAllBarangays(barangays);
      setAllLocations(locations);
    } catch (error) {
      console.error('Error fetching location data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (formData.regionId) {
      const filtered = allCities.filter(city => city.region_id === formData.regionId);
      setFilteredCities(filtered);
      console.log(`Filtered ${filtered.length} cities for region ${formData.regionId}`);
    } else {
      setFilteredCities([]);
    }
    setFormData(prev => ({ ...prev, cityId: null, barangayId: null }));
  }, [formData.regionId, allCities]);

  useEffect(() => {
    if (formData.cityId) {
      const filtered = allBarangays.filter(barangay => barangay.city_id === formData.cityId);
      setFilteredBarangays(filtered);
      console.log(`Filtered ${filtered.length} barangays for city ${formData.cityId}`);
    } else {
      setFilteredBarangays([]);
    }
    setFormData(prev => ({ ...prev, barangayId: null }));
  }, [formData.cityId, allBarangays]);

  useEffect(() => {
    if (formData.barangayId) {
      const filtered = allLocations.filter(location => 
        location.barangay_id === formData.barangayId
      );
      setFilteredLocations(filtered);
      console.log(`Filtered ${filtered.length} locations for barangay ${formData.barangayId}`);
    } else {
      setFilteredLocations([]);
    }
  }, [formData.barangayId, allLocations]);

  const handleInputChange = (field: keyof LocationFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRegionChange = (value: string) => {
    if (value === 'add_new') {
      setShowNewRegionInput(true);
      handleInputChange('regionId', null);
    } else {
      setShowNewRegionInput(false);
      handleInputChange('regionId', parseInt(value));
    }
  };

  const handleCityChange = (value: string) => {
    if (value === 'add_new') {
      setShowNewCityInput(true);
      handleInputChange('cityId', null);
    } else {
      setShowNewCityInput(false);
      handleInputChange('cityId', parseInt(value));
    }
  };

  const handleBarangayChange = (value: string) => {
    if (value === 'add_new') {
      setShowNewBarangayInput(true);
      handleInputChange('barangayId', null);
    } else {
      setShowNewBarangayInput(false);
      handleInputChange('barangayId', parseInt(value));
    }
  };

  const handleLocationToggle = (value: string) => {
    if (value === 'add_new') {
      setShowNewLocationInput(!showNewLocationInput);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.regionId && !showNewRegionInput) {
      newErrors.regionId = 'Region is required';
    }

    if ((formData.cityId || showNewCityInput) && !formData.regionId && !showNewRegionInput) {
      newErrors.regionId = 'Region must be selected before adding a city';
    }

    if ((formData.barangayId || showNewBarangayInput) && !formData.cityId && !showNewCityInput) {
      newErrors.cityId = 'City must be selected before adding a barangay';
    }

    if (showNewLocationInput && !formData.barangayId && !showNewBarangayInput) {
      newErrors.barangayId = 'Barangay must be selected before adding a location';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    const isValid = validateForm();
    
    if (!isValid) {
      return;
    }

    setLoading(true);
    
    try {
      const locationData: any = {
        region: {
          isNew: showNewRegionInput,
          name: showNewRegionInput ? newRegionName : null,
          id: formData.regionId
        },
        city: {
          isNew: showNewCityInput,
          name: showNewCityInput ? newCityName : null,
          id: formData.cityId
        },
        barangay: {
          isNew: showNewBarangayInput,
          name: showNewBarangayInput ? newBarangayName : null,
          id: formData.barangayId
        },
        location: {
          isNew: showNewLocationInput,
          name: showNewLocationInput ? newLocationName : null,
          id: null
        }
      };

      if (locationData.location.isNew && !locationData.barangay.isNew && !locationData.barangay.id) {
        alert('Please select a barangay or create a new one before adding a location');
        setLoading(false);
        return;
      }

      if ((locationData.barangay.isNew || locationData.location.isNew) && !locationData.city.isNew && !locationData.city.id) {
        alert('Please select a city or create a new one before adding a barangay or location');
        setLoading(false);
        return;
      }

      if ((locationData.city.isNew || locationData.barangay.isNew || locationData.location.isNew) && !locationData.region.isNew && !locationData.region.id) {
        alert('Please select a region or create a new one before adding a city, barangay, or location');
        setLoading(false);
        return;
      }

      if (locationData.region.isNew && !locationData.region.name.trim()) {
        alert('Please enter a region name');
        setLoading(false);
        return;
      }

      if (locationData.city.isNew && !locationData.city.name.trim()) {
        alert('Please enter a city name');
        setLoading(false);
        return;
      }

      if (locationData.barangay.isNew && !locationData.barangay.name.trim()) {
        alert('Please enter a barangay name');
        setLoading(false);
        return;
      }

      if (locationData.location.isNew && !locationData.location.name.trim()) {
        alert('Please enter a location name');
        setLoading(false);
        return;
      }

      console.log('Cascading location creation:', locationData);
      
      let regionId = locationData.region.id;
      if (locationData.region.isNew) {
        console.log('Creating new region:', locationData.region.name);
        const newRegion = await createRegion({ name: locationData.region.name });
        regionId = newRegion.id;
        console.log('Region created with ID:', regionId);
      }

      let cityId = locationData.city.id;
      if (locationData.city.isNew && regionId) {
        console.log('Creating new city:', locationData.city.name, 'with region_id:', regionId);
        const newCity = await createCity({ 
          name: locationData.city.name, 
          region_id: regionId 
        });
        cityId = newCity.id;
        console.log('City created with ID:', cityId);
      }

      let barangayId = locationData.barangay.id;
      if (locationData.barangay.isNew && cityId) {
        console.log('Creating new barangay:', locationData.barangay.name, 'with city_id:', cityId);
        const newBarangay = await createBarangay({ 
          name: locationData.barangay.name, 
          city_id: cityId 
        });
        barangayId = newBarangay.id;
        console.log('Barangay created with ID:', barangayId);
      }

      if (locationData.location.isNew && barangayId) {
        console.log('Creating new location:', locationData.location.name, 'with barangay_id:', barangayId);
        const newLocation = await createLocation({ 
          name: locationData.location.name, 
          barangay_id: barangayId 
        });
        console.log('Location created with ID:', newLocation.id);
      }

      const createdLocations = [];
      if (locationData.region.isNew) createdLocations.push(`Region: ${locationData.region.name}`);
      if (locationData.city.isNew) createdLocations.push(`City: ${locationData.city.name}`);
      if (locationData.barangay.isNew) createdLocations.push(`Barangay: ${locationData.barangay.name}`);
      if (locationData.location.isNew) createdLocations.push(`Location: ${locationData.location.name}`);
      
      if (createdLocations.length > 0) {
        alert(`Successfully created:\n${createdLocations.join('\n')}`);
      }
      
      onSave(locationData);
      setLoading(false);
      handleClose();
    } catch (error: any) {
      console.error('Error creating location:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create location. Please try again.';
      alert(`Error: ${errorMessage}`);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      regionId: null,
      cityId: null,
      barangayId: null
    });
    setErrors({});
    setShowNewRegionInput(false);
    setShowNewCityInput(false);
    setShowNewBarangayInput(false);
    setShowNewLocationInput(false);
    setNewRegionName('');
    setNewCityName('');
    setNewBarangayName('');
    setNewLocationName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50" onClick={handleClose}>
      <div 
        className={`h-full w-3/4 md:w-full md:max-w-2xl shadow-2xl transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-gray-900' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-6 py-4 flex items-center justify-between border-b ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-gray-100 border-gray-300'
        }`}>
          <h2 className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Add Location</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleClose}
              className={`px-4 py-2 rounded text-sm ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm flex items-center"
              style={{
                backgroundColor: colorPalette?.primary || '#ea580c'
              }}
              onMouseEnter={(e) => {
                if (colorPalette?.accent && !loading) {
                  e.currentTarget.style.backgroundColor = colorPalette.accent;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
              }}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
            <button
              onClick={handleClose}
              className={isDarkMode ? 'text-gray-400 hover:text-white transition-colors' : 'text-gray-600 hover:text-gray-900 transition-colors'}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {dataLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Region<span className="text-red-500">*</span>
                </label>
                {showNewRegionInput ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={newRegionName}
                      onChange={(e) => setNewRegionName(e.target.value)}
                      placeholder="Enter new region name"
                      className={`w-full px-3 py-2 border border-orange-500 rounded focus:outline-none focus:border-orange-500 ${
                        isDarkMode
                          ? 'bg-gray-800 text-white'
                          : 'bg-white text-gray-900'
                      }`}
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setShowNewRegionInput(false);
                        setNewRegionName('');
                      }}
                      className={isDarkMode ? 'absolute right-3 top-2.5 text-gray-400 hover:text-white' : 'absolute right-3 top-2.5 text-gray-600 hover:text-gray-900'}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={formData.regionId?.toString() || ''}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${
                        errors.regionId ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                      } ${
                        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      }`}
                    >
                      <option value="">Select Region</option>
                      {allRegions.map(region => (
                        <option key={region.id} value={region.id}>{region.name}</option>
                      ))}
                      <option value="add_new" className="text-orange-400">+ Add New Region</option>
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`} size={20} />
                  </div>
                )}
                {errors.regionId && <p className="text-red-500 text-xs mt-1">{errors.regionId}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  City<span className="text-red-500">*</span>
                </label>
                {showNewCityInput ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={newCityName}
                      onChange={(e) => setNewCityName(e.target.value)}
                      placeholder="Enter new city name"
                      className={`w-full px-3 py-2 border border-orange-500 rounded focus:outline-none focus:border-orange-500 ${
                        isDarkMode
                          ? 'bg-gray-800 text-white'
                          : 'bg-white text-gray-900'
                      }`}
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setShowNewCityInput(false);
                        setNewCityName('');
                      }}
                      className={isDarkMode ? 'absolute right-3 top-2.5 text-gray-400 hover:text-white' : 'absolute right-3 top-2.5 text-gray-600 hover:text-gray-900'}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={formData.cityId?.toString() || ''}
                      onChange={(e) => handleCityChange(e.target.value)}
                      disabled={!formData.regionId && !showNewRegionInput}
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        errors.cityId ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                      } ${
                        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      }`}
                    >
                      <option value="">Select City</option>
                      {filteredCities.map(city => (
                        <option key={city.id} value={city.id}>{city.name}</option>
                      ))}
                      <option value="add_new" className="text-orange-400">+ Add New City</option>
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`} size={20} />
                  </div>
                )}
                {errors.cityId && <p className="text-red-500 text-xs mt-1">{errors.cityId}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Barangay<span className="text-red-500">*</span>
                </label>
                {showNewBarangayInput ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={newBarangayName}
                      onChange={(e) => setNewBarangayName(e.target.value)}
                      placeholder="Enter new barangay name"
                      className={`w-full px-3 py-2 border border-orange-500 rounded focus:outline-none focus:border-orange-500 ${
                        isDarkMode
                          ? 'bg-gray-800 text-white'
                          : 'bg-white text-gray-900'
                      }`}
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setShowNewBarangayInput(false);
                        setNewBarangayName('');
                      }}
                      className={isDarkMode ? 'absolute right-3 top-2.5 text-gray-400 hover:text-white' : 'absolute right-3 top-2.5 text-gray-600 hover:text-gray-900'}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={formData.barangayId?.toString() || ''}
                      onChange={(e) => handleBarangayChange(e.target.value)}
                      disabled={!formData.cityId && !showNewCityInput}
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        errors.barangayId ? 'border-red-500' : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                      } ${
                        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      }`}
                    >
                      <option value="">Select Barangay</option>
                      {filteredBarangays.map(barangay => (
                        <option key={barangay.id} value={barangay.id}>{barangay.name}</option>
                      ))}
                      <option value="add_new" className="text-orange-400">+ Add New Barangay</option>
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`} size={20} />
                  </div>
                )}
                {errors.barangayId && <p className="text-red-500 text-xs mt-1">{errors.barangayId}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Location
                </label>
                {showNewLocationInput ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      placeholder="Enter new location name"
                      className={`w-full px-3 py-2 border border-orange-500 rounded focus:outline-none focus:border-orange-500 ${
                        isDarkMode
                          ? 'bg-gray-800 text-white'
                          : 'bg-white text-gray-900'
                      }`}
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setShowNewLocationInput(false);
                        setNewLocationName('');
                      }}
                      className={isDarkMode ? 'absolute right-3 top-2.5 text-gray-400 hover:text-white' : 'absolute right-3 top-2.5 text-gray-600 hover:text-gray-900'}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value=""
                      onChange={(e) => handleLocationToggle(e.target.value)}
                      disabled={!formData.barangayId && !showNewBarangayInput}
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Select Location</option>
                      {filteredLocations.map(location => (
                        <option key={location.id} value={location.id}>{location.location_name}</option>
                      ))}
                      <option value="add_new" className="text-orange-400">+ Add New Location</option>
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`} size={20} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddLocationModal;
