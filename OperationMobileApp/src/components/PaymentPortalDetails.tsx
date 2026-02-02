import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ArrowRight, Maximize2, X, Phone, MessageSquare, Info,
  ExternalLink, Mail, Edit, Trash2, Globe, RefreshCw, CheckCircle,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { relatedDataService } from '../services/relatedDataService';
import RelatedDataTable from './RelatedDataTable';
import { relatedDataColumns } from '../config/relatedDataColumns';

interface PaymentPortalDetailsProps {
  record: {
    id: string;
    reference_no: string;
    account_id: number | string;
    total_amount: number;
    date_time: string;
    checkout_id: string;
    status: string;
    transaction_status: string;
    ewallet_type?: string;
    payment_channel?: string;
    type?: string;
    payment_url?: string;
    json_payload?: string;
    callback_payload?: string;
    created_at?: string;
    updated_at?: string;
    // Additional fields from join with accounts table
    accountNo?: string;
    fullName?: string;
    contactNo?: string;
    accountBalance?: number;
    provider?: string;
    city?: string;
    barangay?: string;
    plan?: string;
    [key: string]: any;
  };
  onClose: () => void;
}

const PaymentPortalDetails: React.FC<PaymentPortalDetailsProps> = ({ record, onClose }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsWidth, setDetailsWidth] = useState<number>(600);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Related invoices state
  const [expandedInvoices, setExpandedInvoices] = useState(false);
  const [relatedInvoices, setRelatedInvoices] = useState<any[]>([]);
  const [fullRelatedInvoices, setFullRelatedInvoices] = useState<any[]>([]);
  const [invoicesCount, setInvoicesCount] = useState(0);
  const [expandedModalSection, setExpandedModalSection] = useState<string | null>(null);

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

  // Fetch related invoices when account number changes
  useEffect(() => {
    const fetchRelatedInvoices = async () => {
      const accountNo = record.accountNo || record.account_id;
      if (!accountNo) {
        console.log('❌ No accountNo or account_id found in payment portal record');
        return;
      }

      console.log('🔍 Fetching related invoices for account:', accountNo);

      try {
        const result = await relatedDataService.getRelatedInvoices(String(accountNo));
        console.log('✅ Invoices fetched:', { count: result.count || 0, hasData: (result.data || []).length > 0 });
        // Store full data for modal view
        setFullRelatedInvoices(result.data || []);
        // Limit to 5 latest items for dropdown display
        setRelatedInvoices((result.data || []).slice(0, 5));
        setInvoicesCount(result.count || 0);
      } catch (error) {
        console.error('❌ Error fetching invoices:', error);
        setRelatedInvoices([]);
        setFullRelatedInvoices([]);
        setInvoicesCount(0);
      }
    };

    fetchRelatedInvoices();
  }, [record.accountNo, record.account_id]);

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

  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed' || statusLower === 'success' || statusLower === 'approved' || statusLower === 'paid') return 'text-green-500';
    if (statusLower === 'pending') return 'text-yellow-500';
    if (statusLower === 'processing') return 'text-blue-500';
    if (statusLower === 'failed') return 'text-red-500';
    return 'text-gray-400';
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setLoading(true);
      console.log(`Updating payment portal record ${record.id} status to ${newStatus}`);

      await new Promise(resolve => setTimeout(resolve, 1000));

      record.status = newStatus;
      alert(`Payment portal status updated to ${newStatus}`);
    } catch (err: any) {
      setError(`Failed to update status: ${err.message}`);
      console.error('Status update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayTitle = () => {
    return `${record.accountNo || record.account_id} | ${record.fullName || 'Unknown'} | ${record.provider || 'Payment'}`;
  };

  const handleExpandModalOpen = (sectionKey: string) => {
    setExpandedModalSection(sectionKey);
  };

  const handleExpandModalClose = () => {
    setExpandedModalSection(null);
  };

  return (
    <div className={`flex flex-col overflow-hidden border-l relative ${isDarkMode
        ? 'bg-gray-950 border-white border-opacity-30'
        : 'bg-white border-gray-300'
      }`} style={{ width: `${detailsWidth}px`, height: '100%' }}>
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
      <div className={`p-3 flex items-center justify-between border-b ${isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gray-100 border-gray-200'
        }`}>
        <div className="flex items-center min-w-0 flex-1">
          <h2 className={`font-medium truncate pr-4 ${isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>{getDisplayTitle()}</h2>
          {loading && <div className="ml-3 animate-pulse text-orange-500 text-sm flex-shrink-0">Loading...</div>}
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

      {error && (
        <div className={`border p-3 m-3 rounded ${isDarkMode
            ? 'bg-red-900 bg-opacity-20 border-red-700 text-red-400'
            : 'bg-red-100 border-red-300 text-red-900'
          }`}>
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className={`mx-auto py-4 px-4 ${isDarkMode ? 'bg-gray-950' : 'bg-white'
          }`}>
          <div className="space-y-4">
            <div className={`flex py-3 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Reference No</div>
              <div className={`flex-1 font-mono ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                {record.reference_no || 'N/A'}
              </div>
            </div>

            <div className={`flex py-3 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Account No</div>
              <div className="text-red-400 flex-1 font-medium flex items-center">
                {record.accountNo || record.account_id} | {record.fullName || 'Unknown'} | {record.address || 'Address not available'}
                <button className={isDarkMode ? 'ml-2 text-gray-400 hover:text-white' : 'ml-2 text-gray-600 hover:text-gray-900'}>
                  <Info size={16} />
                </button>
              </div>
            </div>

            <div className={`flex py-3 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Contact No</div>
              <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                {record.contactNo || 'N/A'}
              </div>
            </div>

            <div className={`flex py-3 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Account Balance</div>
              <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{formatCurrency(record.accountBalance || 0)}</div>
            </div>

            <div className={`flex py-3 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Total Amount</div>
              <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{formatCurrency(record.total_amount || 0)}</div>
            </div>

            <div className={`flex py-3 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Date Time</div>
              <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{record.date_time || 'N/A'}</div>
            </div>

            <div className={`flex py-3 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Checkout ID</div>
              <div className={`flex-1 font-mono ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{record.checkout_id || 'N/A'}</div>
            </div>

            <div className={`flex py-3 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Status</div>
              <div className={`flex-1 capitalize font-medium ${getStatusColor(record.status)}`}>
                {record.status || 'N/A'}
              </div>
            </div>

            <div className={`flex py-3 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Transaction Status</div>
              <div className={`flex-1 capitalize font-medium ${getStatusColor(record.transaction_status || '')}`}>
                {record.transaction_status || 'N/A'}
              </div>
            </div>

            <div className={`flex py-3 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>E-Wallet Type</div>
              <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{record.ewallet_type || 'N/A'}</div>
            </div>

            <div className={`flex py-3 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Payment Channel</div>
              <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{record.payment_channel || 'N/A'}</div>
            </div>

            <div className={`flex py-3 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Type</div>
              <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{record.type || 'N/A'}</div>
            </div>

            <div className={`flex py-3 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Plan</div>
              <div className={`flex-1 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                {record.plan || 'SwitchNet - P999'}
                <button className={isDarkMode ? 'ml-2 text-gray-400 hover:text-white' : 'ml-2 text-gray-600 hover:text-gray-900'}>
                  <Info size={16} />
                </button>
              </div>
            </div>

            <div className={`flex py-3 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Name</div>
              <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{record.fullName || 'Unknown'}</div>
            </div>

            <div className={`flex py-3 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Barangay</div>
              <div className={`flex-1 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                {record.barangay || 'Bilibiran'}
                <button className={isDarkMode ? 'ml-2 text-gray-400 hover:text-white' : 'ml-2 text-gray-600 hover:text-gray-900'}>
                  <Info size={16} />
                </button>
              </div>
            </div>

            <div className="flex py-3">
              <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>City</div>
              <div className={`flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{record.city || 'Binangonan'}</div>
            </div>
          </div>
        </div>

        <div className={`mx-auto px-4 mt-4 ${isDarkMode ? 'bg-gray-950' : 'bg-white'
          }`}>
          <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
            <div className={`w-full px-6 py-4 flex items-center justify-between ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}>
              <div className="flex items-center space-x-2">
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Related Invoices</span>
                <span className={`text-xs px-2 py-1 rounded ${isDarkMode
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-300 text-gray-900'
                  }`}>{invoicesCount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExpandModalOpen('invoices');
                  }}
                  className={`text-sm transition-colors hover:underline ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-500'
                    }`}
                >
                  {expandedInvoices ? 'Collapse' : 'Expand'}
                </button>
                <button
                  onClick={() => setExpandedInvoices(!expandedInvoices)}
                  className="flex items-center"
                >
                  {expandedInvoices ? (
                    <ChevronDown size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  ) : (
                    <ChevronRight size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  )}
                </button>
              </div>
            </div>

            {expandedInvoices && (
              <div className="px-6 pb-4">
                <RelatedDataTable
                  data={relatedInvoices}
                  columns={relatedDataColumns.invoices}
                  isDarkMode={isDarkMode}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Modal for Related Data */}
      {expandedModalSection && (
        <div className="absolute inset-0 flex flex-col" style={{ backgroundColor: isDarkMode ? '#111827' : '#ffffff', zIndex: 9999 }}>
          {/* Modal Header */}
          <div className={`px-6 py-4 flex items-center justify-between border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
            }`}>
            <div className="flex items-center space-x-3">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                All Related Invoices
              </h2>
              <span className={`text-xs px-2 py-1 rounded ${isDarkMode
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-300 text-gray-900'
                }`}>
                {invoicesCount} items
              </span>
            </div>
            <button
              onClick={handleExpandModalClose}
              className={`p-2 rounded transition-colors ${isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <RelatedDataTable
              data={fullRelatedInvoices}
              columns={relatedDataColumns.invoices}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPortalDetails;
