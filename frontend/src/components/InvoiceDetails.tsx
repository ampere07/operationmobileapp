import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, X, Info } from 'lucide-react';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface InvoiceRecord {
  id: string;
  invoiceDate: string;
  invoiceStatus: string;
  accountNo: string;
  fullName: string;
  contactNumber: string;
  emailAddress: string;
  address: string;
  plan: string;
  dateInstalled?: string;
  provider?: string;
  invoiceNo?: string;
  invoiceBalance?: number;
  otherCharges?: number;
  totalAmountDue?: number;
  dueDate?: string;
  invoicePayment?: number;
  paymentMethod?: string;
  dateProcessed?: string;
  processedBy?: string;
  remarks?: string;
  vat?: number;
  amountDue?: number;
  balanceFromPreviousBill?: number;
  paymentReceived?: number;
  remainingBalance?: number;
  monthlyServiceFee?: number;
  staggeredPaymentsCount?: number;
}

interface InvoiceDetailsProps {
  invoiceRecord: InvoiceRecord;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ invoiceRecord }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [detailsWidth, setDetailsWidth] = useState<number>(600);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

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

  return (
    <div className={`h-full flex flex-col border-l relative ${
      isDarkMode
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
      {/* Header with Invoice No and Actions */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gray-100 border-gray-200'
      }`}>
        <h1 className={`text-lg font-semibold truncate pr-4 min-w-0 flex-1 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {invoiceRecord.invoiceNo || '2508182' + invoiceRecord.id}
        </h1>
        <div className="flex items-center space-x-2 flex-shrink-0">
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
      <div className="flex-1 overflow-y-auto">
        <div className={`divide-y ${
          isDarkMode ? 'divide-gray-800' : 'divide-gray-200'
        }`}>
          {/* Invoice Info */}
          <div className="px-5 py-4">
            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Invoice No.</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{invoiceRecord.invoiceNo || '2508182' + invoiceRecord.id}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Account No.</span>
              <div className="flex items-center">
                <span className="text-red-500">
                  {invoiceRecord.accountNo} | {invoiceRecord.fullName} | {invoiceRecord.address}
                </span>
                <Info size={16} className={`ml-2 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} />
              </div>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Full Name</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{invoiceRecord.fullName}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Invoice Date</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{invoiceRecord.invoiceDate}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Contact Number</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{invoiceRecord.contactNumber}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Email Address</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{invoiceRecord.emailAddress}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Plan</span>
              <div className="flex items-center">
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{invoiceRecord.plan}</span>
                <Info size={16} className={`ml-2 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} />
              </div>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Provider</span>
              <div className="flex items-center">
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{invoiceRecord.provider || 'SWITCH'}</span>
                <Info size={16} className={`ml-2 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} />
              </div>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Remarks</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{invoiceRecord.remarks || 'System Generated'}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Invoice Balance</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                ₱{invoiceRecord.invoiceBalance?.toFixed(2) || '0.00'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Invoice Status</span>
              <span className={`${invoiceRecord.invoiceStatus === 'Unpaid' ? 'text-red-500' : 'text-green-500'}`}>
                {invoiceRecord.invoiceStatus || 'Unpaid'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Others and Basic Charges</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                ₱{invoiceRecord.otherCharges?.toFixed(2) || '0.00'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Total Amount</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                ₱{invoiceRecord.totalAmountDue?.toFixed(2) || '0.00'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Invoice Payment</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                ₱{invoiceRecord.invoicePayment?.toFixed(2) || '0.00'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Due Date</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{invoiceRecord.dueDate || '9/30/2025'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Staggered Payments Section */}
      <div className={`mt-auto border-t ${
        isDarkMode ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <div className={`px-5 py-3 flex justify-between items-center border-b ${
          isDarkMode
            ? 'bg-gray-850 border-gray-700'
            : 'bg-gray-100 border-gray-200'
        }`}>
          <div className="flex items-center">
            <h2 className={`font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Related Staggered Payments</h2>
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
              isDarkMode
                ? 'bg-gray-700 text-gray-300'
                : 'bg-gray-300 text-gray-700'
            }`}>
              {invoiceRecord.staggeredPaymentsCount || 0}
            </span>
          </div>
        </div>
        {/* Empty State */}
        <div className={`px-5 py-16 text-center ${
          isDarkMode ? 'text-gray-500' : 'text-gray-400'
        }`}>
          No items
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetails;