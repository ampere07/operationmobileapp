import React, { useState, useEffect } from 'react';
import { Trash2, Edit, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface SMSBlastRecord {
  id?: string;
  title?: string;
  message: string;
  modifiedDate: string;
  modifiedEmail: string;
  userEmail?: string;
  recipients?: number;
  status?: string;
  sentDate?: string;
  sentTime?: string;
  createdBy?: string;
  createdDate?: string;
  messageType?: string;
  isBulk?: boolean;
  isCritical?: boolean;
  targetGroup?: string;
  deliveryStatus?: string;
  deliveryRate?: number;
  failedCount?: number;
  remarks?: string;
  barangay?: string;
  city?: string;
}

interface SMSBlastDetailsProps {
  smsBlastRecord: SMSBlastRecord;
}

const SMSBlastDetails: React.FC<SMSBlastDetailsProps> = ({ smsBlastRecord }) => {
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
          {smsBlastRecord.title || "NOTICE TO THE PUBLIC"}
        </h1>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button className={`p-2 rounded transition-colors ${
            isDarkMode
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}>
            <Trash2 size={18} />
          </button>
          <button 
            className="px-3 py-1 text-white rounded text-sm transition-colors flex items-center space-x-1"
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
            <Edit size={16} />
            <span>Edit</span>
          </button>
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
          <div className="mb-6">
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>message</h3>
            <div className={`whitespace-pre-wrap break-words ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <p className="font-medium mb-3">{smsBlastRecord.title || "NOTICE TO THE PUBLIC"}</p>
              <p className="mb-4">
                {smsBlastRecord.message || 
                "This is to inform everyone that Mr. ELMER F. SOLIMAN, former Sales Agent is no longer employed to our company. He's NOT AUTHORIZED to transact any business, impose any fees, or pull out modems and other peripherals on behalf of Switch Fiber.\n\nReport immediately if you encountered any transactions from Mr. Elmer Soliman. Contact us at (Globe) 0915 407 7565 or (Smart) 0919 486 9998"}
              </p>
            </div>
          </div>
          
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>modified date</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {smsBlastRecord.modifiedDate || "6/28/2024 9:38:30 AM"}
            </p>
          </div>
          
          <div>
            <h3 className={`text-sm uppercase mb-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>modified email</h3>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              {smsBlastRecord.modifiedEmail || "heatherlynn.hernandez@switchfiber.ph"}
            </p>
          </div>
          
          {smsBlastRecord.recipients && (
            <div>
              <h3 className={`text-sm uppercase mb-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>recipients</h3>
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{smsBlastRecord.recipients}</p>
            </div>
          )}
          
          {smsBlastRecord.status && (
            <div>
              <h3 className={`text-sm uppercase mb-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>status</h3>
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{smsBlastRecord.status}</p>
            </div>
          )}
          
          {smsBlastRecord.barangay && (
            <div>
              <h3 className={`text-sm uppercase mb-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>barangay</h3>
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{smsBlastRecord.barangay}</p>
            </div>
          )}
          
          {smsBlastRecord.city && (
            <div>
              <h3 className={`text-sm uppercase mb-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>city</h3>
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{smsBlastRecord.city}</p>
            </div>
          )}
          
          {smsBlastRecord.messageType && (
            <div>
              <h3 className={`text-sm uppercase mb-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>message type</h3>
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{smsBlastRecord.messageType}</p>
            </div>
          )}
          
          {smsBlastRecord.targetGroup && (
            <div>
              <h3 className={`text-sm uppercase mb-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>target group</h3>
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{smsBlastRecord.targetGroup}</p>
            </div>
          )}
          
          {smsBlastRecord.deliveryStatus && (
            <div>
              <h3 className={`text-sm uppercase mb-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>delivery status</h3>
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{smsBlastRecord.deliveryStatus}</p>
            </div>
          )}
          
          {smsBlastRecord.deliveryRate !== undefined && (
            <div>
              <h3 className={`text-sm uppercase mb-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>delivery rate</h3>
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{smsBlastRecord.deliveryRate}%</p>
            </div>
          )}
          
          {smsBlastRecord.failedCount !== undefined && (
            <div>
              <h3 className={`text-sm uppercase mb-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>failed count</h3>
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{smsBlastRecord.failedCount}</p>
            </div>
          )}
          
          {smsBlastRecord.remarks && (
            <div>
              <h3 className={`text-sm uppercase mb-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>remarks</h3>
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{smsBlastRecord.remarks}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SMSBlastDetails;