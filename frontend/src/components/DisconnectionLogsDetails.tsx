import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, Info } from 'lucide-react';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface DisconnectionRecord {
  id?: string;
  accountNo: string;
  customerName: string;
  address?: string;
  contactNumber?: string;
  emailAddress?: string;
  plan?: string;
  balance?: number;
  status?: string;
  disconnectionDate?: string;
  disconnectedBy?: string;
  reason?: string;
  remarks?: string;
  provider?: string;
  appliedDate?: string;
  reconnectionFee?: number;
  daysDisconnected?: number;
  disconnectionCode?: string;
  reconnectionDate?: string;
  reconnectedBy?: string;
  paymentStatus?: string;
  totalDue?: number;
  username?: string;
  splynxId?: string;
  mikrotikId?: string;
  date?: string;
  barangay?: string;
  city?: string;
  dateFormat?: string;
}

interface DisconnectionLogsDetailsProps {
  disconnectionRecord: DisconnectionRecord;
}

const DisconnectionLogsDetails: React.FC<DisconnectionLogsDetailsProps> = ({ disconnectionRecord }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

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

  const title = `${disconnectionRecord.accountNo} | ${disconnectionRecord.customerName} | ${disconnectionRecord.address}`;
  
  return (
    <div className={`h-full flex flex-col ${
      isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
    }`}>
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gray-100 border-gray-200'
      }`}>
        <h1 className={`text-lg font-semibold truncate pr-4 min-w-0 flex-1 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {title}
        </h1>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button className={`p-2 rounded transition-colors ${
            isDarkMode
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}>
            <ChevronLeft size={18} />
          </button>
          <button className={`p-2 rounded transition-colors ${
            isDarkMode
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}>
            <ChevronRight size={18} />
          </button>
          <button className={`p-2 rounded transition-colors ${
            isDarkMode
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}>
            <Maximize2 size={18} />
          </button>
          <button className={`p-2 rounded transition-colors ${
            isDarkMode
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Account No */}
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Account No.</h3>
            <p className="text-red-500">
              {disconnectionRecord.accountNo} | {disconnectionRecord.customerName} | {disconnectionRecord.address}
            </p>
          </div>
          
          {/* ID */}
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>id</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {disconnectionRecord.splynxId || '202509181547536099'}
            </p>
          </div>
          
          {/* Mikrotik ID */}
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Mikrotik ID</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {disconnectionRecord.mikrotikId || '*1528'}
            </p>
          </div>
          
          {/* Provider */}
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Provider</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {disconnectionRecord.provider || 'SWITCH'}
            </p>
          </div>
          
          {/* Username */}
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Username</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {disconnectionRecord.username || 'manucaye0220251214'}
            </p>
          </div>
          
          {/* Date */}
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Date</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {disconnectionRecord.date || '9/18/2025 3:47:54 PM'}
            </p>
          </div>
          
          {/* Remarks */}
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Remarks</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {disconnectionRecord.remarks || 'Pullout'}
            </p>
          </div>
          
          {/* Barangay */}
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Barangay</h3>
            <div className="flex items-center">
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                {disconnectionRecord.barangay || 'Tatala'}
              </p>
              <Info size={16} className={`ml-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`} />
            </div>
          </div>
          
          {/* City */}
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>City</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {disconnectionRecord.city || 'Binangonan'}
            </p>
          </div>
          
          {/* Date Format */}
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Date Format</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {disconnectionRecord.dateFormat || disconnectionRecord.date?.split(' ')[0] || '9/18/2025'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisconnectionLogsDetails;