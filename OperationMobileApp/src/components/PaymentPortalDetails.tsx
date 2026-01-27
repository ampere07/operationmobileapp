import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ArrowRight, Maximize2, X, Phone, MessageSquare, Info, 
  ExternalLink, Mail, Edit, Trash2, Globe, RefreshCw, CheckCircle
} from 'lucide-react';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface PaymentPortalDetailsProps {
  record: {
    id: string;
    dateTime: string;
    accountNo: string;
    receivedPayment: number;
    status: string;
    referenceNo: string;
    contactNo: string;
    accountBalance: number;
    checkoutId: string;
    transactionStatus: string;
    provider: string;
    paymentMethod?: string;
    fullName?: string;
    city?: string;
    barangay?: string;
    plan?: string;
    created_at: string;
    updated_at: string;
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
    return `${record.accountNo} | ${record.fullName || 'Unknown'} | ${record.provider} Payment`;
  };

  return (
    <div className={`flex flex-col overflow-hidden border-l relative ${
      isDarkMode
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
      <div className={`p-3 flex items-center justify-between border-b ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gray-100 border-gray-200'
      }`}>
        <div className="flex items-center min-w-0 flex-1">
          <h2 className={`font-medium truncate pr-4 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
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
        <div className={`border p-3 m-3 rounded ${
          isDarkMode
            ? 'bg-red-900 bg-opacity-20 border-red-700 text-red-400'
            : 'bg-red-100 border-red-300 text-red-900'
        }`}>
          {error}
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        <div className={`mx-auto py-4 px-4 ${
          isDarkMode ? 'bg-gray-950' : 'bg-white'
        }`}>
          <div className="space-y-4">
            <div className={`flex py-3 ${
              isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
            }`}>
              <div className={`w-40 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Reference No</div>
              <div className={`flex-1 font-mono ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {record.referenceNo || `${record.accountNo}-049b6beb4b39a844f8f95b`}
              </div>
            </div>
            
            <div className={`flex py-3 ${
              isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
            }`}>
              <div className={`w-40 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Account No</div>
              <div className="text-red-400 flex-1 font-medium flex items-center">
                {record.accountNo} | {record.fullName || 'Unknown'} | 0337 B San Roque St Cervo Cpd, {record.barangay || 'Bilibiran'}, {record.city || 'Binangonan'}, Rizal
                <button className={isDarkMode ? 'ml-2 text-gray-400 hover:text-white' : 'ml-2 text-gray-600 hover:text-gray-900'}>
                  <Info size={16} />
                </button>
              </div>
            </div>
            
            <div className={`flex py-3 ${
              isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
            }`}>
              <div className={`w-40 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Contact No</div>
              <div className={`flex-1 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {record.contactNo}
              </div>
            </div>
            
            <div className={`flex py-3 ${
              isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
            }`}>
              <div className={`w-40 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Account Balance</div>
              <div className={`flex-1 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>{formatCurrency(record.accountBalance)}</div>
            </div>
            
            <div className={`flex py-3 ${
              isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
            }`}>
              <div className={`w-40 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Received Payment</div>
              <div className={`flex-1 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>{formatCurrency(record.receivedPayment)}</div>
            </div>
            
            <div className={`flex py-3 ${
              isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
            }`}>
              <div className={`w-40 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Date Time</div>
              <div className={`flex-1 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>{record.dateTime}</div>
            </div>
            
            <div className={`flex py-3 ${
              isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
            }`}>
              <div className={`w-40 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Checkout ID</div>
              <div className={`flex-1 font-mono ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>{record.checkoutId}</div>
            </div>
            
            <div className={`flex py-3 ${
              isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
            }`}>
              <div className={`w-40 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Status</div>
              <div className={`flex-1 capitalize font-medium ${getStatusColor(record.status)}`}>
                {record.status}
              </div>
            </div>
            
            <div className={`flex py-3 ${
              isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
            }`}>
              <div className={`w-40 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Transaction Status</div>
              <div className={`flex-1 capitalize font-medium ${getStatusColor(record.transactionStatus)}`}>
                {record.transactionStatus}
              </div>
            </div>
            
            <div className={`flex py-3 ${
              isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
            }`}>
              <div className={`w-40 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Provider</div>
              <div className={`flex-1 flex items-center ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {record.provider}
                <button className={isDarkMode ? 'ml-2 text-gray-400 hover:text-white' : 'ml-2 text-gray-600 hover:text-gray-900'}>
                  <Info size={16} />
                </button>
              </div>
            </div>
            
            <div className={`flex py-3 ${
              isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
            }`}>
              <div className={`w-40 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Plan</div>
              <div className={`flex-1 flex items-center ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {record.plan || 'SwitchNet - P999'}
                <button className={isDarkMode ? 'ml-2 text-gray-400 hover:text-white' : 'ml-2 text-gray-600 hover:text-gray-900'}>
                  <Info size={16} />
                </button>
              </div>
            </div>
            
            <div className={`flex py-3 ${
              isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
            }`}>
              <div className={`w-40 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Name</div>
              <div className={`flex-1 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>{record.fullName || 'Unknown'}</div>
            </div>
            
            <div className={`flex py-3 ${
              isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
            }`}>
              <div className={`w-40 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Barangay</div>
              <div className={`flex-1 flex items-center ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {record.barangay || 'Bilibiran'}
                <button className={isDarkMode ? 'ml-2 text-gray-400 hover:text-white' : 'ml-2 text-gray-600 hover:text-gray-900'}>
                  <Info size={16} />
                </button>
              </div>
            </div>
            
            <div className="flex py-3">
              <div className={`w-40 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>City</div>
              <div className={`flex-1 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>{record.city || 'Binangonan'}</div>
            </div>
          </div>
        </div>
        
        <div className={`mx-auto px-4 mt-4 ${
          isDarkMode ? 'bg-gray-950' : 'bg-white'
        }`}>
          <div className={`pt-4 ${
            isDarkMode ? 'border-t border-gray-800' : 'border-t border-gray-300'
          }`}>
            <div className="flex items-center mb-4">
              <h3 className={`font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Related Invoices</h3>
              <span className={`ml-2 text-xs px-2 py-1 rounded ${
                isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-900'
              }`}>1</span>
            </div>
            
            <div className="overflow-x-scroll overflow-y-hidden">
              <table className="w-max min-w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className={`sticky top-0 z-10 ${
                    isDarkMode
                      ? 'border-b border-gray-700 bg-gray-800'
                      : 'border-b border-gray-300 bg-gray-100'
                  }`}>
                    <th className={`text-left py-3 px-3 font-normal min-w-28 whitespace-nowrap ${
                      isDarkMode
                        ? 'text-gray-400 border-r border-gray-700 bg-gray-800'
                        : 'text-gray-600 border-r border-gray-300 bg-gray-100'
                    }`}>Invoice Status</th>
                    {['Invoice Date', 'Due Date', 'Total Amount', 'Invoice Payment', 'Account No.', 'Invoice No.', 'Full Name', 'Contact Number', 'Email Address', 'Address', 'Plan', 'Provider', 'Remarks', 'Invoice Balance', 'Others and Basic Charges', 'Date Processed', 'Processed By', 'Payment Method', 'Reference', 'Reference No.', 'OR No.', 'Modified By', 'Modified Date', 'Transaction ID', 'Barangay', 'City', 'Related Staggered Payments', 'Related Collection Requests'].map((header, index) => (
                      <th key={index} className={`text-left py-3 px-3 font-normal border-r min-w-28 whitespace-nowrap ${
                        isDarkMode
                          ? 'text-gray-400 border-gray-700 bg-gray-800'
                          : 'text-gray-600 border-gray-300 bg-gray-100'
                      }`}>{header}</th>
                    ))}
                    <th className={`text-left py-3 px-3 font-normal min-w-48 whitespace-nowrap ${
                      isDarkMode
                        ? 'text-gray-400 bg-gray-800'
                        : 'text-gray-600 bg-gray-100'
                    }`}>Related DC Notices</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={isDarkMode ? 'border-b border-gray-800 hover:bg-gray-900' : 'border-b border-gray-300 hover:bg-gray-100'}>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'border-gray-800' : 'border-gray-300'
                    }`}>
                      <span className="text-green-500 font-medium">Paid</span>
                    </td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>8/18/2025</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>8/30/2025</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>{formatCurrency(999.00)}</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>{formatCurrency(999.00)}</td>
                    <td className={`py-4 px-3 text-red-400 border-r whitespace-nowrap ${
                      isDarkMode ? 'border-gray-800' : 'border-gray-300'
                    }`}>{record.accountNo}</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>INV-001</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>{record.fullName || 'Leopoldo III G De Jesus'}</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>{record.contactNo}</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>customer@email.com</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>0337 B San Roque St Cervo Cpd</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>{record.plan || 'SwitchNet - P999'}</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>{record.provider}</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>-</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>{formatCurrency(0.00)}</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>{formatCurrency(999.00)}</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>8/18/2025</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>System</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>Online</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>{record.referenceNo}</td>
                    <td className={`py-4 px-3 font-mono border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>{record.referenceNo}</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>OR-001</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>Admin</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>8/18/2025 9:14:13 PM</td>
                    <td className={`py-4 px-3 font-mono border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>{record.checkoutId}</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>{record.barangay || 'Bilibiran'}</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-300'
                    }`}>{record.city || 'Binangonan'}</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-gray-400 border-gray-800' : 'text-gray-600 border-gray-300'
                    }`}>-</td>
                    <td className={`py-4 px-3 border-r whitespace-nowrap ${
                      isDarkMode ? 'text-gray-400 border-gray-800' : 'text-gray-600 border-gray-300'
                    }`}>-</td>
                    <td className={`py-4 px-3 whitespace-nowrap ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>-</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end mt-4 mb-6">
              <button 
                className="text-sm font-medium"
                style={{
                  color: colorPalette?.primary || (isDarkMode ? '#f97316' : '#ea580c')
                }}
                onMouseEnter={(e) => {
                  if (colorPalette?.accent) {
                    e.currentTarget.style.color = colorPalette.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (colorPalette?.primary) {
                    e.currentTarget.style.color = colorPalette.primary;
                  }
                }}
              >
                Expand
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPortalDetails;
