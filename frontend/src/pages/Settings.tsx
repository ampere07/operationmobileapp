import React, { useState, useEffect } from 'react';
import { Palette, Sun, Moon, Plus, Image, Loader2, CheckCircle, XCircle } from 'lucide-react';
import AddColorPaletteModal from '../modals/AddColorPaletteModal';
import { settingsImageSizeService, ImageSize } from '../services/settingsImageSizeService';
import { settingsColorPaletteService, ColorPalette as DbColorPalette } from '../services/settingsColorPaletteService';
import { userSettingsService } from '../services/userSettingsService';
import { systemConfigService } from '../services/systemConfigService';

interface ColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

const Settings: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState<boolean>(true);
  const [showAddPaletteModal, setShowAddPaletteModal] = useState<boolean>(false);
  const [dbPalettes, setDbPalettes] = useState<DbColorPalette[]>([]);
  const [imageSizes, setImageSizes] = useState<ImageSize[]>([]);
  const [activeImageSizeId, setActiveImageSizeId] = useState<number | null>(null);
  const [selectedImageSizeId, setSelectedImageSizeId] = useState<number | null>(null);
  const [isEditingImageSize, setIsEditingImageSize] = useState<boolean>(false);
  const [isSavingImageSize, setIsSavingImageSize] = useState<boolean>(false);
  const [colorPalette, setColorPalette] = useState<DbColorPalette | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTogglingDarkMode, setIsTogglingDarkMode] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showError, setShowError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);

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
    const loadLogo = async () => {
      try {
        const url = await systemConfigService.getLogo();
        setLogoUrl(url);
      } catch (error) {
        console.error('Failed to load logo:', error);
      }
    };

    loadLogo();
  }, []);

  useEffect(() => {
    const loadUserPreferences = async () => {
      setIsLoadingPreferences(true);
      try {
        const authData = localStorage.getItem('authData');
        console.log('[Settings] Loading preferences, authData:', authData);
        
        if (authData) {
          const userData = JSON.parse(authData);
          // User ID is at root level, not under user property
          const userId = userData.id;
          console.log('[Settings] User ID:', userId);
          
          if (userId) {
            console.log('[Settings] Fetching dark mode from API...');
            const response = await userSettingsService.getDarkMode(userId);
            console.log('[Settings] API response:', response);
            
            if (response.success && response.data) {
              const darkmodeValue = response.data.darkmode;
              const isDark = darkmodeValue === 'active';
              
              console.log('[Settings] Darkmode value from DB:', darkmodeValue);
              console.log('[Settings] Setting isDark to:', isDark);
              
              setIsDarkMode(isDark);
              localStorage.setItem('theme', isDark ? 'dark' : 'light');
              
              if (isDark) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
              
              console.log('[Settings] Theme applied:', isDark ? 'dark' : 'light');
            }
          }
        }
      } catch (error) {
        console.error('[Settings] Failed to load dark mode preference:', error);
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
          setIsDarkMode(savedTheme === 'dark');
        }
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    loadUserPreferences();
    loadImageSizes();
    loadColorPalettes();
  }, []);

  const loadColorPalettes = async () => {
    try {
      const palettes = await settingsColorPaletteService.getAll();
      setDbPalettes(palettes);
    } catch (error) {
      console.error('Failed to load color palettes:', error);
    }
  };

  const loadImageSizes = async () => {
    try {
      const sizes = await settingsImageSizeService.getAll();
      setImageSizes(sizes);
      const active = sizes.find(size => size.status === 'active');
      if (active) {
        setActiveImageSizeId(active.id);
        setSelectedImageSizeId(active.id);
      }
    } catch (error) {
      console.error('Failed to load image sizes:', error);
    }
  };

  const handleThemeToggle = async () => {
    const newTheme = !isDarkMode;
    const darkmodeValue = newTheme ? 'active' : 'inactive';
    
    console.log('Toggle dark mode started', { newTheme, darkmodeValue });
    setIsTogglingDarkMode(true);
    
    try {
      const authData = localStorage.getItem('authData');
      console.log('Auth data:', authData);
      
      if (authData) {
        const userData = JSON.parse(authData);
        console.log('Parsed user data:', userData);
        
        // User ID is at root level, not under user property
        const userId = userData.id;
        console.log('User ID:', userId);
        
        if (userId) {
          console.log('Making API call with:', { userId, darkmodeValue });
          
          const response = await userSettingsService.updateDarkMode(userId, darkmodeValue);
          console.log('API response:', response);
          
          setIsDarkMode(newTheme);
          localStorage.setItem('theme', newTheme ? 'dark' : 'light');
          
          if (newTheme) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          
          setIsTogglingDarkMode(false);
          setSuccessMessage('Theme updated successfully');
          setShowSuccess(true);
          
          setTimeout(() => {
            setShowSuccess(false);
          }, 1500);
        } else {
          console.error('No user ID found');
          throw new Error('User ID not found');
        }
      } else {
        console.error('No auth data found');
        throw new Error('Not authenticated');
      }
    } catch (error) {
      console.error('Failed to update dark mode:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        response: (error as any)?.response?.data,
        status: (error as any)?.response?.status
      });
      
      setIsTogglingDarkMode(false);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update theme preference');
      setShowError(true);
      
      setTimeout(() => {
        setShowError(false);
      }, 3000);
    }
  };

  const handlePaletteStatusChange = async (id: number, status: 'active' | 'inactive') => {
    setIsLoading(true);
    setLoadingMessage('Activating color palette...');
    setShowError(false);

    try {
      await settingsColorPaletteService.updateStatus(id, status);
      await loadColorPalettes();
      
      if (status === 'active') {
        const palette = dbPalettes.find(p => p.id === id);
        if (palette) {
          document.documentElement.style.setProperty('--color-primary', palette.primary);
          document.documentElement.style.setProperty('--color-secondary', palette.secondary);
          document.documentElement.style.setProperty('--color-accent', palette.accent);
        }
      }

      setIsLoading(false);
      setSuccessMessage('Color palette activated successfully!');
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      setIsLoading(false);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to activate color palette');
      setShowError(true);

      setTimeout(() => {
        setShowError(false);
      }, 3000);
    }
  };

  const handleEditImageSize = () => {
    setIsEditingImageSize(true);
  };

  const handleCancelImageSize = () => {
    setSelectedImageSizeId(activeImageSizeId);
    setIsEditingImageSize(false);
  };

  const handleSaveImageSize = async () => {
    if (selectedImageSizeId === null) return;

    setIsLoading(true);
    setLoadingMessage('Updating image upload size...');
    setShowError(false);

    try {
      await settingsImageSizeService.updateStatus(selectedImageSizeId, 'active');
      await loadImageSizes();
      setIsEditingImageSize(false);

      setIsLoading(false);
      setSuccessMessage('Image upload size updated successfully!');
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      setIsLoading(false);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update image upload size');
      setShowError(true);

      setTimeout(() => {
        setShowError(false);
      }, 3000);
    }
  };

  const handleAddPalette = async (newPalette: ColorPalette) => {
    await settingsColorPaletteService.create({
      palette_name: newPalette.name,
      primary: newPalette.primary,
      secondary: newPalette.secondary,
      accent: newPalette.accent,
      updated_by: 'system'
    });
    
    await loadColorPalettes();
  };

  const handleDeletePalette = async (id: number) => {
    try {
      await settingsColorPaletteService.delete(id);
      await loadColorPalettes();
    } catch (error) {
      console.error('Failed to delete color palette:', error);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('File size must be less than 5MB');
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
        return;
      }
      setLogoFile(file);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;

    setIsUploadingLogo(true);
    setLoadingMessage('Uploading logo to Google Drive...');

    try {
      const authData = localStorage.getItem('authData');
      const userData = authData ? JSON.parse(authData) : null;
      const updatedBy = userData?.username || 'system';

      const result = await systemConfigService.uploadLogo(logoFile, updatedBy);
      
      if (result.success && result.data) {
        setLogoUrl(result.data.logo_url);
        setLogoFile(null);
        localStorage.setItem('logoUpdated', Date.now().toString());
        window.dispatchEvent(new Event('storage'));
        setSuccessMessage('Logo uploaded successfully!');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload logo');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!window.confirm('Are you sure you want to delete the logo?')) return;

    setIsLoading(true);
    setLoadingMessage('Deleting logo...');

    try {
      const authData = localStorage.getItem('authData');
      const userData = authData ? JSON.parse(authData) : null;
      const updatedBy = userData?.username || 'system';

      await systemConfigService.deleteLogo(updatedBy);
      setLogoUrl(null);
      localStorage.setItem('logoUpdated', Date.now().toString());
      window.dispatchEvent(new Event('storage'));
      setSuccessMessage('Logo deleted successfully!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete logo');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`p-6 min-h-screen ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className={`mb-6 pb-6 border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-300'
      }`}>
        <h2 className={`text-2xl font-semibold ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        } mb-2`}>
          Settings
        </h2>
      </div>

      <div className="space-y-6">
        <div className={`pb-6 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-300'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <Image className="h-5 w-5" style={{ color: colorPalette?.primary || '#ea580c' }} />
            <h3 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              System Logo
            </h3>
          </div>
          
          <div className={`p-6 rounded border ${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
          }`}>
            {logoUrl ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center p-4 bg-white rounded">
                  <img 
                    src={logoUrl} 
                    alt="System Logo" 
                    className="max-h-32 object-contain"
                    onError={(e) => {
                      console.error('Failed to load logo image');
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <label
                    className="px-4 py-2 text-white rounded transition-colors cursor-pointer text-sm"
                    style={{
                      backgroundColor: colorPalette?.primary || '#ea580c'
                    }}
                    onMouseEnter={(e) => {
                      if (colorPalette?.accent) {
                        e.currentTarget.style.backgroundColor = colorPalette.accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                    }}
                  >
                    Change Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={handleDeleteLogo}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                  >
                    Delete Logo
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded ${
                  isDarkMode ? 'border-gray-600' : 'border-gray-400'
                }`}>
                  <Image className={`h-12 w-12 mb-4 ${
                    isDarkMode ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm mb-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    No logo uploaded
                  </p>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    Supported formats: JPEG, PNG, GIF, SVG (Max 5MB)
                  </p>
                </div>
                {logoFile ? (
                  <div className="space-y-2">
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Selected: {logoFile.name}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUploadLogo}
                        disabled={isUploadingLogo}
                        className="px-4 py-2 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        style={{
                          backgroundColor: isUploadingLogo ? '#4b5563' : (colorPalette?.primary || '#ea580c')
                        }}
                        onMouseEnter={(e) => {
                          if (!isUploadingLogo && colorPalette?.accent) {
                            e.currentTarget.style.backgroundColor = colorPalette.accent;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isUploadingLogo) {
                            e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                          }
                        }}
                      >
                        {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                      </button>
                      <button
                        onClick={() => setLogoFile(null)}
                        disabled={isUploadingLogo}
                        className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    className="px-4 py-2 text-white rounded transition-colors cursor-pointer inline-block text-sm"
                    style={{
                      backgroundColor: colorPalette?.primary || '#ea580c'
                    }}
                    onMouseEnter={(e) => {
                      if (colorPalette?.accent) {
                        e.currentTarget.style.backgroundColor = colorPalette.accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                    }}
                  >
                    Select Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={`pb-6 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-300'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <Sun className="h-5 w-5" style={{ color: colorPalette?.primary || '#ea580c' }} />
            <h3 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Theme Mode
            </h3>
          </div>
          
          <div className={`flex items-center justify-between p-6 rounded border ${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
          }`}>
            <div>
              <p className={`font-medium mb-1 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
              </p>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Switch between light and dark theme
              </p>
            </div>
            
            <button
              onClick={handleThemeToggle}
              disabled={isTogglingDarkMode}
              className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isDarkMode ? (colorPalette?.primary || '#ea580c') : '#4b5563'
              }}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  isDarkMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              >
                {isDarkMode ? (
                  <Moon className="h-4 w-4 m-1" style={{ color: colorPalette?.primary || '#ea580c' }} />
                ) : (
                  <Sun className="h-4 w-4 text-gray-600 m-1" />
                )}
              </span>
            </button>
          </div>
        </div>

        <div className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="h-5 w-5" style={{ color: colorPalette?.primary || '#ea580c' }} />
            <h3 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Color Palette
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dbPalettes.map((palette) => {
              const isDefault = palette.palette_name.toLowerCase() === 'default';
              return (
                <div
                  key={palette.id}
                  className={`p-4 rounded border transition-all relative ${
                    isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
                  }`}
                  style={{
                    borderColor: palette.status === 'active' ? (colorPalette?.primary || '#ea580c') : undefined,
                    boxShadow: palette.status === 'active' ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)' : undefined
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`font-medium text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {palette.palette_name}
                    </h4>
                    <div className="flex items-center gap-2">
                      {palette.status === 'active' && (
                        <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}>
                          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {palette.status === 'inactive' && (
                        <button
                          onClick={() => handlePaletteStatusChange(palette.id, 'active')}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            isDarkMode 
                              ? 'bg-gray-700 text-white hover:bg-gray-600' 
                              : 'bg-gray-300 text-gray-900 hover:bg-gray-400'
                          }`}
                        >
                          Activate
                        </button>
                      )}
                      {!isDefault && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${palette.palette_name}?`)) {
                              handleDeletePalette(palette.id);
                            }
                          }}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900 rounded transition-colors"
                          title="Delete palette"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div
                      className="h-10 rounded"
                      style={{ backgroundColor: palette.primary }}
                    />
                    <p className={`text-xs mt-1 text-center ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Primary
                    </p>
                  </div>
                  <div className="flex-1">
                    <div
                      className="h-10 rounded"
                      style={{ backgroundColor: palette.secondary }}
                    />
                    <p className="text-xs text-gray-400 mt-1 text-center">
                      Secondary
                    </p>
                  </div>
                  <div className="flex-1">
                    <div
                      className="h-10 rounded"
                      style={{ backgroundColor: palette.accent }}
                    />
                    <p className="text-xs text-gray-400 mt-1 text-center">
                      Accent
                    </p>
                  </div>
                </div>
              </div>
              );
            })}
            
            <button
              onClick={() => setShowAddPaletteModal(true)}
              className={`p-4 rounded border border-dashed transition-all flex flex-col items-center justify-center gap-2 min-h-[140px] ${
                isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
              }`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                isDarkMode ? 'bg-gray-800' : 'bg-gray-200'
              }`}>
                <Plus className="h-5 w-5" style={{ color: colorPalette?.primary || '#ea580c' }} />
              </div>
              <p className={`font-medium text-sm ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Add Custom Palette</p>
              <p className={`text-xs text-center ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Create your own color scheme
              </p>
            </button>
          </div>
        </div>

        <div className={`pt-6 border-t ${
          isDarkMode ? 'border-gray-700' : 'border-gray-300'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <Image className="h-5 w-5" style={{ color: colorPalette?.primary || '#ea580c' }} />
            <h3 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Image Upload Size
            </h3>
          </div>

          <div className={`p-4 rounded border ${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
          }`}>
            <div className="space-y-2 mb-4">
              {imageSizes.map((size) => (
                <div
                  key={size.id}
                  onClick={() => isEditingImageSize && setSelectedImageSizeId(size.id)}
                  className={`flex items-center justify-between p-3 rounded border transition-all ${
                    isEditingImageSize ? 'cursor-pointer' : ''
                  }`}
                  style={{
                    borderColor: selectedImageSizeId === size.id ? (colorPalette?.primary || '#ea580c') : undefined,
                    backgroundColor: selectedImageSizeId === size.id ? `${colorPalette?.primary || '#ea580c'}1A` : undefined
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {size.image_size}
                    </span>
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      -{size.image_size_value}% maximum size
                    </span>
                  </div>
                  {size.status === 'active' && !isEditingImageSize && (
                    <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}>
                      <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {selectedImageSizeId === size.id && isEditingImageSize && (
                    <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}>
                      <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {!isEditingImageSize ? (
                <button
                  onClick={handleEditImageSize}
                  className="px-4 py-2 text-white rounded transition-colors text-sm"
                  style={{
                    backgroundColor: colorPalette?.primary || '#ea580c'
                  }}
                  onMouseEnter={(e) => {
                    if (colorPalette?.accent) {
                      e.currentTarget.style.backgroundColor = colorPalette.accent;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                  }}
                >
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSaveImageSize}
                    disabled={isSavingImageSize || selectedImageSizeId === activeImageSizeId}
                    className="px-4 py-2 text-white rounded transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
                    style={{
                      backgroundColor: (isSavingImageSize || selectedImageSizeId === activeImageSizeId) ? '#4b5563' : (colorPalette?.primary || '#ea580c')
                    }}
                    onMouseEnter={(e) => {
                      if (!isSavingImageSize && selectedImageSizeId !== activeImageSizeId && colorPalette?.accent) {
                        e.currentTarget.style.backgroundColor = colorPalette.accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSavingImageSize && selectedImageSizeId !== activeImageSizeId) {
                        e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                      }
                    }}
                  >
                    {isSavingImageSize ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelImageSize}
                    disabled={isSavingImageSize}
                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <AddColorPaletteModal
        isOpen={showAddPaletteModal}
        onClose={() => setShowAddPaletteModal(false)}
        onSave={handleAddPalette}
      />

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-gray-800 rounded-lg p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin" style={{ color: colorPalette?.primary || '#ea580c' }} />
            <p className="text-white font-medium">{loadingMessage}</p>
          </div>
        </div>
      )}

      {isTogglingDarkMode && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-gray-800 rounded-lg p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin" style={{ color: colorPalette?.primary || '#ea580c' }} />
            <p className="text-white font-medium">Updating theme preference...</p>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-gray-800 rounded-lg p-8 flex flex-col items-center gap-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className="text-white font-medium text-lg">{successMessage}</p>
          </div>
        </div>
      )}

      {showError && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-gray-800 rounded-lg p-8 flex flex-col items-center gap-4">
            <XCircle className="h-16 w-16 text-red-500" />
            <p className="text-white font-medium text-lg">Error</p>
            <p className="text-gray-300 text-sm text-center max-w-md">{errorMessage}</p>
            <button
              onClick={() => setShowError(false)}
              className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
