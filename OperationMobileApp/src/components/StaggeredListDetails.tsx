import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ArrowRight, Maximize2, X, Info, 
  ExternalLink, CheckCircle
} from 'lucide-react';
import LoadingModal from './LoadingModal';
import { staggeredInstallationService } from '../services/staggeredInstallationService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface StaggeredInstallation {
  id: string;
  account_no: string;
  staggered_install_no: string;
  staggered_date: string;
  staggered_balance: number;
  months_to_pay: number;
  monthly_payment: number;
  modified_by: string;
  modified_date: string;
  user_email: string;
  remarks: string;
  status: string;
  month1: string | null;
  month2: string | null;
  month3: string | null;
  month4: string | null;
  month5: string | null;
  month6: string | null;
  month7: string | null;
  month8: string | null;
  month9: string | null;
  month10: string | null;
  month11: string | null;
  month12: string | null;
  created_at: string;
  updated_at: string;
  billing_account?: {
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

interface StaggeredListDetailsProps {
  staggered: StaggeredInstallation;
  onClose: () => void;
}

const StaggeredListDetails: React.FC<StaggeredListDetailsProps> = ({ staggered, onClose }) => {
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [loading, setLoading] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [detailsWidth, setDetailsWidth] = useState<number>(600);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(localStorage.getItem('theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const authData = localStorage.getItem('authData');
    if (authData) {
      try {
        const userData = JSON.parse(authData);
        setCurrentUserEmail(userData.email || '');
      } catch (error) {
        console.error('Failed to parse auth data:', error);
      }
    }
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

  const handleApproveStaggered = async () => {
    if (!window.confirm('Are you sure you want to approve this staggered installation? This will deduct the staggered balance from the account and apply it to unpaid invoices.')) {
      return;
    }

    try {
      setLoading(true);
      setLoadingPercentage(0);
      setError(null);
      
      setLoadingPercentage(20);
      
      const result = await staggeredInstallationService.approve(staggered.id);
      
      setLoadingPercentage(60);
      
      if (result.success) {
        setLoadingPercentage(100);
        
        staggered.status = 'Active';
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setSuccessMessage(result.message || 'Staggered installation approved successfully');
        setShowSuccessModal(true);
      } else {
        throw new Error(result.message || 'Failed to approve staggered installation');
      }
    } catch (err: any) {
      setError(`Failed to approve staggered installation: ${err.message || 'Unknown error'}`);
      console.error('Approve staggered error:', err);
    } finally {
      setLoading(false);
      setLoadingPercentage(0);
    }
  };

  const getAccountDisplayText = () => {
    const accountNo = staggered.billing_account?.account_no || staggered.account_no || '-';
    const fullName = staggered.billing_account?.customer?.full_name || '-';
    const address = staggered.billing_account?.customer?.address || '';
    const barangay = staggered.billing_account?.customer?.barangay || '';
    const city = staggered.billing_account?.customer?.city || '';
    const region = staggered.billing_account?.customer?.region || '';
    
    const location = [address, barangay, city, region].filter(Boolean).join(', ');
    return `${accountNo} | ${fullName}${location ? ` | ${location}` : ''}`;
  };

  const getMonthPayments = (): Array<{ month: number; invoiceId: string }> => {
    const months: Array<{ month: number; invoiceId: string }> = [];
    for (let i = 1; i <= 12; i++) {
      const monthKey = `month${i}` as keyof StaggeredInstallation;
      const value = staggered[monthKey];
      if (typeof value === 'string' && value) {
        months.push({ month: i, invoiceId: value });
      }
    }
    return months;
  };

  return (
    <>
      <LoadingModal 
        isOpen={loading} 
        message="Approving staggered installation..." 
        percentage={loadingPercentage} 
      />
      
      <div className={`flex flex-col overflow-hidden border-l relative ${
        isDarkMode
          ? 'bg-gray-950 border-white border-opacity-30'
          : 'bg-white border-gray-300'
      }`} style={{ width: `${detailsWidth}px`, height: '100%' }}>
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors z-50"
          onMouseDown={handleMouseDownResize}
          style={{
            backgroundColor: isResizing ? (colorPalette?.primary || '#f97316') : 'transparent'
          }}
          onMouseEnter={(e) => {
            if (!isResizing && colorPalette?.accent) {
              e.currentTarget.style.backgroundColor = colorPalette.accent;
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        />
        <div className={`p-3 flex items-center justify-between border-b ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-gray-100 border-gray-200'
        }`}>
          <div className="flex items-center min-w-0 flex-1">
            <h2 className={`font-medium truncate pr-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>{getAccountDisplayText()}</h2>
            {loading && <div className="ml-3 animate-pulse text-orange-500 text-sm flex-shrink-0">Loading...</div>}
          </div>
          
          <div className="flex items-center space-x-3">
            {staggered.status.toLowerCase() === 'pending' && 
             currentUserEmail && 
             staggered.modified_by.toLowerCase() === currentUserEmail.toLowerCase() && (
              <button
                onClick={handleApproveStaggered}
                disabled={loading}
                className="flex items-center space-x-2 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-sm transition-colors"
                style={{
                  backgroundColor: loading ? '#4b5563' : (colorPalette?.primary || '#ea580c')
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
          <div className={`border p-3 m-3 rounded ${
            isDarkMode
              ? 'bg-red-900 bg-opacity-20 border-red-700 text-red-400'
              : 'bg-red-100 border-red-300 text-red-900'
          }`}>
            {error}
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto">
          <div className={`mx-auto py-1 px-4 ${
            isDarkMode ? 'bg-gray-950' : 'bg-white'
          }`}>
            <div className="space-y-1">
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Staggered ID</div>
                <div className={`flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{staggered.id}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Install No.</div>
                <div className={`flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{staggered.staggered_install_no}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Account No.</div>
                <div className="text-red-400 flex-1 font-medium flex items-center">
                  {staggered.billing_account?.account_no || staggered.account_no || '-'}
                  <button className={isDarkMode ? 'ml-2 text-gray-400 hover:text-white' : 'ml-2 text-gray-600 hover:text-gray-900'}>
                    <Info size={16} />
                  </button>
                </div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Full Name</div>
                <div className={`flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{staggered.billing_account?.customer?.full_name || '-'}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Contact No.</div>
                <div className={`flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{staggered.billing_account?.customer?.contact_number_primary || '-'}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Staggered Balance</div>
                <div className={`flex-1 font-bold text-lg ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{formatCurrency(staggered.staggered_balance)}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Monthly Payment</div>
                <div className={`flex-1 font-bold text-lg ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{formatCurrency(staggered.monthly_payment)}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Months to Pay</div>
                <div className={isDarkMode ? 'text-white flex-1' : 'text-gray-900 flex-1'}>
                  <span className={`font-bold ${staggered.months_to_pay === 0 ? 'text-green-500' : 'text-orange-400'}`}>
                    {staggered.months_to_pay}
                  </span>
                  <span className={`ml-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {staggered.months_to_pay === 0 ? 'Completed' : `${staggered.months_to_pay} month${staggered.months_to_pay !== 1 ? 's' : ''} remaining`}
                  </span>
                </div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Staggered Date</div>
                <div className={`flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{formatDate(staggered.staggered_date)}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Modified By</div>
                <div className={`flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{staggered.modified_by || '-'}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>User Email</div>
                <div className={`flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{staggered.user_email || '-'}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Remarks</div>
                <div className={`flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{staggered.remarks || 'No remarks'}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Status</div>
                <div className="flex-1">
                  <div className={`capitalize ${
                    staggered.status.toLowerCase() === 'active' ? 'text-green-500' :
                    staggered.status.toLowerCase() === 'pending' ? 'text-yellow-500' :
                    staggered.status.toLowerCase() === 'completed' ? 'text-blue-500' :
                    'text-gray-400'
                  }`}>
                    {staggered.status}
                  </div>
                </div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Barangay</div>
                <div className={`flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{staggered.billing_account?.customer?.barangay || '-'}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>City</div>
                <div className={`flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{staggered.billing_account?.customer?.city || '-'}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Region</div>
                <div className={`flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{staggered.billing_account?.customer?.region || '-'}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Plan</div>
                <div className={`flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{staggered.billing_account?.customer?.desired_plan || '-'}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Account Balance</div>
                <div className={`flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{formatCurrency(staggered.billing_account?.account_balance || 0)}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Created At</div>
                <div className={`flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{formatDate(staggered.created_at)}</div>
              </div>
              
              <div className={`flex py-2 ${
                isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
              }`}>
                <div className={`w-40 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Updated At</div>
                <div className={`flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{formatDate(staggered.updated_at)}</div>
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
                }`}>Monthly Payment History</h3>
                <span className={`ml-2 text-xs px-2 py-1 rounded ${
                  isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-900'
                }`}>
                  {getMonthPayments().length}
                </span>
              </div>
              {getMonthPayments().length > 0 ? (
                <div className="space-y-2">
                  {getMonthPayments().map((payment) => (
                    <div key={payment.month} className={`flex items-center justify-between p-3 rounded ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                        <span className="font-medium">Month {payment.month}</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <span>Invoice ID: {payment.invoiceId}</span>
                        <ExternalLink size={14} className="text-orange-500 cursor-pointer hover:text-orange-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-8 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  No payment history yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 border ${
            isDarkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-300'
          }`}>
            <h3 className={`text-xl font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Success</h3>
            <p className={`mb-6 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
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
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StaggeredListDetails;
