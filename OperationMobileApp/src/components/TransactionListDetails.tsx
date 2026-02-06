import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ArrowRight, Maximize2, X, Phone, MessageSquare, Info,
  ExternalLink, Mail, Edit, Trash2, Receipt, RefreshCw, CheckCircle,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { transactionService } from '../services/transactionService';
import { relatedDataService } from '../services/relatedDataService';
import LoadingModal from './LoadingModal';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import RelatedDataTable from './RelatedDataTable';
import { relatedDataColumns } from '../config/relatedDataColumns';

interface Transaction {
  id: string;
  account_no: string;
  transaction_type: string;
  received_payment: number;
  payment_date: string;
  date_processed: string;
  processed_by_user: string;
  payment_method: string;
  reference_no: string;
  or_no: string;
  remarks: string;
  status: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  account?: {
    id: number;
    account_no: string;
    customer: {
      full_name: string;
      contact_number_primary: string;
      barangay: string;
      city: string;
      desired_plan: string;
      address: string;
      region: string;
    };
    account_balance: number;
  };
}

interface TransactionListDetailsProps {
  transaction: Transaction;
  onClose: () => void;
  onNavigate?: (section: string, extra?: string) => void;
  onViewCustomer?: (accountNo: string) => void;
}

const TransactionListDetails: React.FC<TransactionListDetailsProps> = ({ transaction, onClose, onNavigate, onViewCustomer }) => {
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [loading, setLoading] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
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

  // Fetch related invoices when account number changes
  useEffect(() => {
    const fetchRelatedInvoices = async () => {
      if (!transaction.account_no) {
        console.log('❌ No account_no found in transaction');
        return;
      }

      const accountNo = transaction.account_no;
      console.log('🔍 Fetching related invoices for account:', accountNo);

      try {
        const result = await relatedDataService.getRelatedInvoices(accountNo);
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
  }, [transaction.account_no]);

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

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₱${numAmount.toFixed(2)}`;
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'No date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateStr;
    }
  };

  const handleApproveTransaction = async () => {
    if (!window.confirm('Are you sure you want to approve this transaction?')) {
      return;
    }

    try {
      setLoading(true);
      setLoadingPercentage(0);
      setError(null);

      setLoadingPercentage(20);

      const result = await transactionService.approveTransaction(transaction.id);

      setLoadingPercentage(60);

      if (result.success) {
        setLoadingPercentage(100);

        const status = result.data?.status || 'Done';
        transaction.status = status;

        await new Promise(resolve => setTimeout(resolve, 500));

        setSuccessMessage(`Transaction approved successfully. Status: ${status}`);
        setShowSuccessModal(true);
      } else {
        setError(result.message || 'Failed to approve transaction');
      }
    } catch (err: any) {
      setError(`Failed to approve transaction: ${err.message}`);
      console.error('Approve transaction error:', err);
    } finally {
      setLoading(false);
      setLoadingPercentage(0);
    }
  };

  const getAccountDisplayText = () => {
    const accountNo = transaction.account?.account_no || '-';
    const fullName = transaction.account?.customer?.full_name || '-';
    const address = transaction.account?.customer?.address || '';
    const barangay = transaction.account?.customer?.barangay || '';
    const city = transaction.account?.customer?.city || '';
    const region = transaction.account?.customer?.region || '';

    const location = [address, barangay, city, region].filter(Boolean).join(', ');
    return `${accountNo} | ${fullName}${location ? ` | ${location}` : ''}`;
  };

  const renderField = (label: string, value: any, hasInfo: boolean = false, isBold: boolean = false) => (
    <div className={`flex py-2 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
      }`}>
      <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>{label}</div>
      <div className={`flex-1 flex items-center ${isBold ? 'font-bold text-lg' : ''} ${isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
        {value || '-'}
        {hasInfo && (
          <button className={isDarkMode ? 'ml-2 text-gray-400 hover:text-white' : 'ml-2 text-gray-600 hover:text-gray-900'}>
            <Info size={16} />
          </button>
        )}
      </div>
    </div>
  );

  const handleExpandModalOpen = (sectionKey: string) => {
    setExpandedModalSection(sectionKey);
  };

  const handleExpandModalClose = () => {
    setExpandedModalSection(null);
  };

  return (
    <>
      <LoadingModal
        isOpen={loading}
        message="Approving transaction..."
        percentage={loadingPercentage}
      />

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
              }`}>{getAccountDisplayText()}</h2>
            {loading && <div className="ml-3 animate-pulse text-orange-500 text-sm flex-shrink-0">Loading...</div>}
          </div>

          <div className="flex items-center space-x-3">
            {transaction.status.toLowerCase() === 'pending' && (
              <button
                onClick={handleApproveTransaction}
                disabled={loading}
                className="flex items-center space-x-2 text-white px-3 py-1.5 rounded text-sm transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: loading ? '#4b5563' : (colorPalette?.primary || '#22c55e')
                }}
                onMouseEnter={(e) => {
                  if (!loading && colorPalette?.accent) {
                    e.currentTarget.style.backgroundColor = colorPalette.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && colorPalette?.primary) {
                    e.currentTarget.style.backgroundColor = colorPalette.primary;
                  }
                }}
              >
                <CheckCircle size={16} />
                <span>{loading ? 'Approving...' : 'Approve'}</span>
              </button>
            )}
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
          <div className={`mx-auto py-1 px-4 ${isDarkMode ? 'bg-gray-950' : 'bg-white'
            }`}>
            <div className="space-y-1">
              {renderField('Transaction ID', transaction.id)}

              <div className={`flex py-2 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
                }`}>
                <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Account No.</div>
                <div className="text-red-400 flex-1 font-medium flex items-center">
                  {transaction.account?.account_no || '-'}
                  <button
                    onClick={() => {
                      if (onViewCustomer && transaction.account?.account_no) {
                        onViewCustomer(transaction.account.account_no);
                      } else {
                        onNavigate?.('customer', transaction.account?.account_no);
                      }
                    }}
                    className={isDarkMode ? 'ml-2 text-gray-400 hover:text-white' : 'ml-2 text-gray-600 hover:text-gray-900'}
                  >
                    <Info size={16} />
                  </button>
                </div>
              </div>

              {renderField('Full Name', transaction.account?.customer?.full_name)}
              {renderField('Contact No.', transaction.account?.customer?.contact_number_primary)}
              {renderField('Transaction Type', transaction.transaction_type)}
              {renderField('Received Payment', formatCurrency(transaction.received_payment), false, true)}
              {renderField('Payment Date', formatDate(transaction.payment_date))}
              {renderField('Date Processed', formatDate(transaction.date_processed))}
              {renderField('Processed By', transaction.processed_by_user, true)}
              {renderField('Payment Method', transaction.payment_method, true)}
              {renderField('Reference No.', transaction.reference_no)}
              {renderField('OR No.', transaction.or_no)}
              {renderField('Remarks', transaction.remarks || 'No remarks')}

              <div className={`flex py-2 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
                }`}>
                <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Status</div>
                <div className="flex-1">
                  <div className={`capitalize ${transaction.status.toLowerCase() === 'done' ? 'text-green-500' :
                    transaction.status.toLowerCase() === 'pending' ? 'text-yellow-500' :
                      transaction.status.toLowerCase() === 'processing' ? 'text-blue-500' :
                        'text-gray-400'
                    }`}>
                    {transaction.status}
                  </div>
                </div>
              </div>

              {renderField('Barangay', transaction.account?.customer?.barangay, true)}
              {renderField('City', transaction.account?.customer?.city)}
              {renderField('Region', transaction.account?.customer?.region)}
              {renderField('Plan', transaction.account?.customer?.desired_plan, true)}
              {renderField('Account Balance', formatCurrency(transaction.account?.account_balance || 0))}

              {transaction.image_url && (
                <div className={`flex py-2 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
                  }`}>
                  <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>Payment Proof</div>
                  <div className={isDarkMode ? 'text-white flex-1' : 'text-gray-900 flex-1'}>
                    <a
                      href={transaction.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-500 hover:text-orange-400 flex items-center"
                    >
                      View Image <ExternalLink size={14} className="ml-1" />
                    </a>
                  </div>
                </div>
              )}

              {renderField('Created At', formatDate(transaction.created_at))}
              {renderField('Updated At', formatDate(transaction.updated_at))}
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

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 border ${isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-300'
            }`}>
            <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Success</h3>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>{successMessage}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  if (onClose) {
                    onClose();
                  }
                }}
                className="text-white px-6 py-2 rounded transition-colors"
                style={{
                  backgroundColor: colorPalette?.primary || '#22c55e'
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
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TransactionListDetails;
