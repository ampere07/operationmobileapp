import React, { useState, useEffect } from 'react';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface TransactConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  amount?: string;
  description?: string;
  billingRecord?: any;
}

const TransactConfirmationModal: React.FC<TransactConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  amount,
  description,
  billingRecord
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  useEffect(() => {
    const checkDarkMode = () => {
      const theme = localStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();

    const observer = new MutationObserver(() => {
      checkDarkMode();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchColorPalette = async () => {
      const palette = await settingsColorPaletteService.getActive();
      setColorPalette(palette);
    };
    fetchColorPalette();
  }, []);

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`rounded shadow-lg p-6 max-w-md ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="mb-4">
          <h3 className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Confirm Transaction</h3>
        </div>
        <div className={`mb-6 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          <p className="mb-2">Are you sure you want to proceed with this transaction?</p>
        </div>
        <div className="flex justify-end space-x-4">
          <button 
            className={`px-4 py-2 rounded transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
            }`}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className="text-white px-4 py-2 rounded transition-colors"
            onClick={onConfirm}
            style={{
              backgroundColor: colorPalette?.primary || '#ea580c'
            }}
            onMouseEnter={(e) => {
              if (colorPalette?.accent) {
                e.currentTarget.style.backgroundColor = colorPalette.accent;
              }
            }}
            onMouseLeave={(e) => {
              if (colorPalette?.primary) {
                e.currentTarget.style.backgroundColor = colorPalette.primary;
              }
            }}
          >
            Confirm Transaction
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactConfirmationModal;
