import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, X, Info } from 'lucide-react';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface SOARecord {
  id: string;
  statementDate: string;
  accountNo: string;
  dateInstalled: string;
  fullName: string;
  contactNumber: string;
  emailAddress: string;
  address: string;
  plan: string;
  provider?: string;
  balanceFromPreviousBill?: number;
  statementNo?: string;
  paymentReceived?: number;
  remainingBalance?: number;
  monthlyServiceFee?: number;
  otherCharges?: number;
  vat?: number;
  dueDate?: string;
  amountDue?: number;
  totalAmountDue?: number;
  deliveryStatus?: string;
  deliveryDate?: string;
  deliveredBy?: string;
  deliveryRemarks?: string;
  deliveryProof?: string;
  modifiedBy?: string;
  modifiedDate?: string;
  printLink?: string;
  barangay?: string;
  city?: string;
  region?: string;
}

interface SOADetailsProps {
  soaRecord: SOARecord;
  onViewCustomer?: (accountNo: string) => void;
  onClose?: () => void;
}

const SOADetails: React.FC<SOADetailsProps> = ({ soaRecord, onViewCustomer, onClose }) => {
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [detailsWidth, setDetailsWidth] = useState<number>(600);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

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

  const handleOpenGDrive = () => {
    if (soaRecord.printLink) {
      window.open(soaRecord.printLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`h-full flex flex-col border-l relative ${isDarkMode
      ? 'bg-gray-900 text-white border-white border-opacity-30'
      : 'bg-white text-gray-900 border-gray-300'
      }`} style={{ width: `${detailsWidth}px` }}>
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors z-50"
        style={{
          backgroundColor: isResizing ? (colorPalette?.primary || '#ea580c') : 'transparent'
        }}
        onMouseEnter={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = colorPalette?.accent || '#ea580c';
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        onMouseDown={handleMouseDownResize}
      />
      <div className={`px-4 py-3 flex items-center justify-between border-b ${isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-gray-100 border-gray-200'
        }`}>
        <h1 className={`text-lg font-semibold truncate pr-4 min-w-0 flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
          {soaRecord.accountNo} | {soaRecord.fullName} | {soaRecord.address.split(',')[0]}
        </h1>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={handleOpenGDrive}
            disabled={!soaRecord.printLink}
            className={`p-2 rounded transition-colors ${isDarkMode
              ? 'text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            title={soaRecord.printLink ? 'Open SOA in Google Drive' : 'No Google Drive link available'}
          >
            <ExternalLink size={18} />
          </button>
          <button
            onClick={onClose}
            className={`p-2 rounded transition-colors ${isDarkMode
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className={isDarkMode ? 'divide-y divide-gray-800' : 'divide-y divide-gray-300'}>
          <div className="px-5 py-4">
            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Statement No.</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{soaRecord.statementNo || '2509180' + soaRecord.id}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Full Name</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{soaRecord.fullName}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Statement Date</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{soaRecord.statementDate}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Account No.</span>
              <div className="flex items-center">
                <span className="text-red-500">
                  {soaRecord.accountNo} | {soaRecord.fullName} | {soaRecord.address}
                </span>
                <button
                  onClick={() => onViewCustomer?.(soaRecord.accountNo)}
                  className={`ml-2 p-1 rounded transition-colors ${isDarkMode ? 'text-gray-500 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                  title="View Customer Details"
                >
                  <Info size={16} />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Date Installed</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{soaRecord.dateInstalled}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Contact Number</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{soaRecord.contactNumber}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Email Address</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{soaRecord.emailAddress}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Plan</span>
              <div className="flex items-center">
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{soaRecord.plan}</span>
                <Info size={16} className={`ml-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'
                  }`} />
              </div>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Provider</span>
              <div className="flex items-center">
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{soaRecord.provider || 'SWITCH'}</span>
                <Info size={16} className={`ml-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'
                  }`} />
              </div>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Balance from Previous Bill</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                ₱{soaRecord.balanceFromPreviousBill?.toFixed(2) || '0.00'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Payment Received from Previous Bill</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                ₱{soaRecord.paymentReceived || '0'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Remaining Balance from Previous Bill</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                ₱{soaRecord.remainingBalance?.toFixed(2) || '0.00'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Monthly Service Fee</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                ₱{soaRecord.monthlyServiceFee?.toFixed(2) || '624.11'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Others and Basic Charges</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                ₱{soaRecord.otherCharges?.toFixed(2) || '0.00'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>VAT</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                ₱{soaRecord.vat?.toFixed(2) || '74.89'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>DUE DATE</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{soaRecord.dueDate || '9/30/2025'}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>AMOUNT DUE</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                ₱{soaRecord.amountDue?.toFixed(2) || '699.00'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>TOTAL AMOUNT DUE</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                ₱{soaRecord.totalAmountDue?.toFixed(2) || '699.00'}
              </span>
            </div>

            {soaRecord.deliveryStatus && (
              <div className="flex justify-between items-center py-2">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Delivery Status</span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{soaRecord.deliveryStatus}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SOADetails;
