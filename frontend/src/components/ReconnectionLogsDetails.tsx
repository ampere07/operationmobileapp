import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, Info } from 'lucide-react';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface ReconnectionRecord {
  id?: string;
  accountNo: string;
  customerName: string;
  address?: string;
  contactNumber?: string;
  emailAddress?: string;
  plan?: string;
  balance?: number;
  status?: string;
  reconnectionDate?: string;
  reconnectedBy?: string;
  reason?: string;
  remarks?: string;
  provider?: string;
  appliedDate?: string;
  reconnectionFee?: number;
  daysDisconnected?: number;
  reconnectionCode?: string;
  username?: string;
  splynxId?: string;
  mikrotikId?: string;
  date?: string;
  barangay?: string;
  city?: string;
  dateFormat?: string;
}

interface ReconnectionLogsDetailsProps {
  reconnectionRecord: ReconnectionRecord;
}

const ReconnectionLogsDetails: React.FC<ReconnectionLogsDetailsProps> = ({ reconnectionRecord }) => {
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

  const title = `${reconnectionRecord.accountNo} | ${reconnectionRecord.customerName} | ${reconnectionRecord.address}`;
  
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
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Account No.</h3>
            <p className="text-red-500">
              {reconnectionRecord.accountNo} | {reconnectionRecord.customerName} | {reconnectionRecord.address}
            </p>
          </div>
          
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>id</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {reconnectionRecord.splynxId || '202509181617722'}
            </p>
          </div>
          
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Mikrotik ID</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {reconnectionRecord.mikrotikId || '*1C7E'}
            </p>
          </div>
          
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Provider</h3>
            <div className="flex items-center">
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                {reconnectionRecord.provider || 'SWITCH'}
              </p>
              <Info size={16} className={`ml-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`} />
            </div>
          </div>
          
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Username</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {reconnectionRecord.username || 'santosg0701251450'}
            </p>
          </div>
          
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Date</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {reconnectionRecord.date || '9/18/2025 4:17:22 PM'}
            </p>
          </div>
          
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Plan</h3>
            <div className="flex items-center">
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                {reconnectionRecord.plan || 'SwitchLite - P699'}
              </p>
              <Info size={16} className={`ml-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`} />
            </div>
          </div>
          
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Reconnection Fee</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              ₱{reconnectionRecord.reconnectionFee !== undefined ? reconnectionRecord.reconnectionFee.toFixed(2) : '0.00'}
            </p>
          </div>
          
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Remarks</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {reconnectionRecord.remarks || 'Transaction'}
            </p>
          </div>
          
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Barangay</h3>
            <div className="flex items-center">
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                {reconnectionRecord.barangay || 'Tatala'}
              </p>
              <Info size={16} className={`ml-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`} />
            </div>
          </div>
          
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>City</h3>
            <div className="flex items-center">
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                {reconnectionRecord.city || 'Binangonan'}
              </p>
              <Info size={16} className={`ml-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`} />
            </div>
          </div>
          
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Date Format</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {reconnectionRecord.dateFormat || '9/18/2025'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconnectionLogsDetails;