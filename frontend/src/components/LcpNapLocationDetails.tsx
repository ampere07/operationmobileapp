import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface LocationMarker {
  id: number;
  lcpnap_name: string;
  lcp_name: string;
  nap_name: string;
  coordinates: string;
  latitude: number;
  longitude: number;
  street?: string;
  city?: string;
  region?: string;
  barangay?: string;
  port_total?: number;
  reading_image_url?: string;
  image1_url?: string;
  image2_url?: string;
  modified_by?: string;
  modified_date?: string;
  active_sessions?: number;
  inactive_sessions?: number;
  offline_sessions?: number;
  blocked_sessions?: number;
  not_found_sessions?: number;
}

interface LcpNapLocationDetailsProps {
  location: LocationMarker;
  onClose: () => void;
  isMobile?: boolean;
}

const LcpNapLocationDetails: React.FC<LcpNapLocationDetailsProps> = ({
  location,
  onClose,
  isMobile = false
}) => {
  const [detailsWidth, setDetailsWidth] = useState<number>(600);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  useEffect(() => {
    const checkDarkMode = () => {
      const theme = localStorage.getItem('theme');
      setIsDarkMode(theme === 'dark');
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

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
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const diff = startXRef.current - e.clientX;
      const newWidth = Math.max(600, Math.min(1200, startWidthRef.current + diff));

      setDetailsWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = detailsWidth;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Not available';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div
      className={`h-full flex flex-col overflow-hidden ${!isMobile ? 'md:border-l' : ''} relative w-full md:w-auto ${isDarkMode ? 'bg-gray-950 border-white border-opacity-30' : 'bg-gray-50 border-gray-300'
        }`}
      style={!isMobile && window.innerWidth >= 768 ? { width: `${detailsWidth}px` } : undefined}
    >
      {!isMobile && (
        <div
          className={`hidden md:block absolute left-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors z-50 ${isDarkMode ? 'hover:bg-orange-500' : 'hover:bg-orange-600'
            }`}
          onMouseDown={handleMouseDownResize}
        />
      )}

      {/* Header */}
      <div className={`p-3 flex items-center justify-between border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
        <div className="flex items-center flex-1 min-w-0">
          <h2 className={`font-medium truncate ${isMobile ? 'max-w-[200px] text-sm' : ''} ${isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
            {location.lcpnap_name}
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className={isDarkMode ? 'hover:text-white text-gray-400' : 'hover:text-gray-900 text-gray-600'}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className={`max-w-2xl mx-auto py-6 px-4 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
          }`}>
          <div className="space-y-4">
            {/* LCP Name */}
            <div className={`flex border-b pb-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>LCP:</div>
              <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{location.lcp_name}</div>
            </div>

            {/* NAP Name */}
            <div className={`flex border-b pb-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>NAP:</div>
              <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{location.nap_name}</div>
            </div>

            {/* Street */}
            {location.street && (
              <div className={`flex border-b pb-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
                }`}>
                <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Street:</div>
                <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{location.street}</div>
              </div>
            )}

            {/* Barangay */}
            {location.barangay && (
              <div className={`flex border-b pb-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
                }`}>
                <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Barangay:</div>
                <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{location.barangay}</div>
              </div>
            )}

            {/* City */}
            {location.city && (
              <div className={`flex border-b pb-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
                }`}>
                <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>City:</div>
                <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{location.city}</div>
              </div>
            )}

            {/* Region */}
            {location.region && (
              <div className={`flex border-b pb-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
                }`}>
                <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Region:</div>
                <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{location.region}</div>
              </div>
            )}

            {/* Port Total */}
            {location.port_total !== undefined && (
              <div className={`flex border-b pb-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
                }`}>
                <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Port Total:</div>
                <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{location.port_total}</div>
              </div>
            )}

            {/* Session Status */}
            <div className={`border-b pb-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
              }`}>
              <div className={`w-40 text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Session Status:</div>
              <div className="flex-1 space-y-2">
                {/* Online */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-500">Online</span>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {location.active_sessions || 0}
                  </span>
                </div>

                {/* Offline */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-orange-500">Offline</span>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                    {location.offline_sessions || 0}
                  </span>
                </div>

                {/* Inactive */}
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>Inactive</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {location.inactive_sessions || 0}
                  </span>
                </div>

                {/* Blocked */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-500">Blocked</span>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    {location.blocked_sessions || 0}
                  </span>
                </div>

                {/* Not Found */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-500">Not Found</span>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    {location.not_found_sessions || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Coordinates */}
            <div className={`flex border-b pb-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Coordinates:</div>
              <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </div>
            </div>

            {/* Reading Image */}
            {location.reading_image_url && (
              <div className={`flex border-b py-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
                }`}>
                <div className={`w-40 text-sm whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Reading Image</div>
                <div className={`flex-1 flex items-center justify-between min-w-0 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                  <span className="truncate mr-2">
                    {location.reading_image_url}
                  </span>
                  <button
                    className={`flex-shrink-0 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    onClick={() => window.open(location.reading_image_url)}
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Image 1 */}
            {location.image1_url && (
              <div className={`flex border-b py-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
                }`}>
                <div className={`w-40 text-sm whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Image 1</div>
                <div className={`flex-1 flex items-center justify-between min-w-0 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                  <span className="truncate mr-2">
                    {location.image1_url}
                  </span>
                  <button
                    className={`flex-shrink-0 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    onClick={() => window.open(location.image1_url)}
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Image 2 */}
            {location.image2_url && (
              <div className={`flex border-b py-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
                }`}>
                <div className={`w-40 text-sm whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Image 2</div>
                <div className={`flex-1 flex items-center justify-between min-w-0 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                  <span className="truncate mr-2">
                    {location.image2_url}
                  </span>
                  <button
                    className={`flex-shrink-0 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    onClick={() => window.open(location.image2_url)}
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Modified By */}
            {location.modified_by && (
              <div className={`flex border-b pb-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
                }`}>
                <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Modified By:</div>
                <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{location.modified_by}</div>
              </div>
            )}

            {/* Modified Date */}
            {location.modified_date && (
              <div className={`flex border-b pb-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
                }`}>
                <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Modified Date:</div>
                <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                  {formatDate(location.modified_date)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LcpNapLocationDetails;
