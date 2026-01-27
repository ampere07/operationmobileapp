import React, { useState, useEffect } from 'react';
import { FileText, Upload, Clock, Info, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { getServiceOrders, createServiceOrder } from '../services/serviceOrderService';

interface SupportRequest {
  id: string;
  date: string;
  requestId: string;
  issue: string;
  issueDetails: string;
  status: string;
  statusNote: string;
  assignedEmail: string;
  visitNote: string;
  visitInfo: {
    status: string;
  };
}

const Support: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [selectedConcern, setSelectedConcern] = useState<string>('No Internet');
  const [details, setDetails] = useState<string>('');  
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitMessage, setSubmitMessage] = useState<string>('');
  const [remainingRequests, setRemainingRequests] = useState<number>(5);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userAccountNo, setUserAccountNo] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showLoadingModal, setShowLoadingModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  const concernOptions = [
    'No Internet',
    'Slow Internet',
    'Intermittent Connection',
    'Router Issue',
    'Cable Problem',
    'Port Issue',
    'Others'
  ];

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

  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const authData = localStorage.getItem('authData');
    if (authData) {
      try {
        const user = JSON.parse(authData);
        console.log('[Support] User auth data:', user);
        const accountNo = user.account_no || user.username || '';
        const email = user.email || '';
        console.log('[Support] Using account identifier:', accountNo);
        console.log('[Support] Using email:', email);
        setUserAccountNo(accountNo);
        setUserEmail(email);
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    } else {
      console.error('[Support] No auth data found');
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
    if (userAccountNo) {
      fetchServiceOrders();
    }
  }, [userAccountNo]);

  const fetchServiceOrders = async () => {
    if (!userAccountNo) {
      console.log('[Support] No account number available, skipping fetch');
      setIsLoading(false);
      setRequests([]);
      return;
    }

    try {
      setIsLoading(true);
      console.log('[Support] Fetching service orders for account:', userAccountNo);
      
      const response = await getServiceOrders();
      console.log('[Support] Service orders response:', response);
      
      if (response.success && response.data) {
        console.log('[Support] Total service orders:', response.data.length);
        
        const filteredOrders = response.data
          .filter(order => {
            const matches = order.account_no === userAccountNo || 
                          order.username === userAccountNo;
            if (matches) {
              console.log('[Support] Matched order:', order);
            }
            return matches;
          })
          .map(order => ({
            id: order.id,
            date: order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
            requestId: order.ticket_id,
            issue: order.concern || '',
            issueDetails: order.concern_remarks || '',
            status: order.support_status || 'Pending',
            statusNote: order.support_remarks || '',
            assignedEmail: order.assigned_email || '',
            visitNote: order.visit_remarks || '',
            visitInfo: {
              status: order.visit_status || 'Pending'
            }
          }));
        
        console.log('[Support] Filtered orders count:', filteredOrders.length);
        setRequests(filteredOrders);
      } else {
        console.error('[Support] Invalid response:', response);
        setRequests([]);
      }
    } catch (error) {
      console.error('[Support] Failed to fetch service orders:', error);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!details.trim()) {
      setSubmitMessage('Please provide details about your issue');
      setTimeout(() => setSubmitMessage(''), 3000);
      return;
    }

    if (!userAccountNo) {
      setSubmitMessage('Account number not found. Please log in again.');
      setTimeout(() => setSubmitMessage(''), 3000);
      return;
    }

    if (remainingRequests <= 0) {
      setSubmitMessage('Request limit reached. Please wait for cooldown.');
      setTimeout(() => setSubmitMessage(''), 3000);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setShowLoadingModal(true);

    try {
      const newServiceOrder = {
        account_no: userAccountNo,
        username: userAccountNo,
        concern: selectedConcern,
        concern_remarks: details,
        created_by_user: userEmail,
        requested_by: userEmail,
        support_status: 'Pending',
        visit_status: 'Pending'
      };

      console.log('[Support] Submitting service order:', newServiceOrder);
      const response = await createServiceOrder(newServiceOrder);
      console.log('[Support] Submit response:', response);
      
      if (response.success) {
        setShowLoadingModal(false);
        setShowSuccessModal(true);
        await fetchServiceOrders();
        setDetails('');
        setRemainingRequests(remainingRequests - 1);
      } else {
        setShowLoadingModal(false);
        setSubmitMessage('Failed to submit request. Please try again.');
        setTimeout(() => setSubmitMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to submit request:', error);
      setShowLoadingModal(false);
      setSubmitMessage('Failed to submit request. Please try again.');
      setTimeout(() => setSubmitMessage(''), 3000);
    }
  };

  const handleRequestPlanUpdate = () => {
    window.open('https://forms.gle/your-plan-update-form', '_blank');
  };

  return (
    <div className={`h-full overflow-auto ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-1 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <div className="flex items-center mb-6">
              <FileText className={`mr-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`} size={20} />
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                New Request
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Concern
                </label>
                <select
                  value={selectedConcern}
                  onChange={(e) => setSelectedConcern(e.target.value)}
                  className={`w-full px-3 py-2 rounded border focus:outline-none focus:ring-1 ${
                    isDarkMode
                      ? 'bg-gray-800 text-white border-gray-700'
                      : 'bg-white text-gray-900 border-gray-300'
                  }`}
                  style={{
                    '--tw-ring-color': colorPalette?.primary || '#ea580c'
                  } as React.CSSProperties}
                >
                  {concernOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Details
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe your issue..."
                  rows={5}
                  className={`w-full px-3 py-2 rounded border focus:outline-none focus:ring-1 resize-none ${
                    isDarkMode
                      ? 'bg-gray-800 text-white border-gray-700 placeholder-gray-500'
                      : 'bg-white text-gray-900 border-gray-300 placeholder-gray-400'
                  }`}
                  style={{
                    '--tw-ring-color': colorPalette?.primary || '#ea580c'
                  } as React.CSSProperties}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || remainingRequests <= 0}
                className="w-full text-white py-3 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: (isSubmitting || remainingRequests <= 0) ? '#6b7280' : (colorPalette?.primary || '#1e40af')
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting && remainingRequests > 0 && colorPalette?.accent) {
                    e.currentTarget.style.backgroundColor = colorPalette.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting && remainingRequests > 0 && colorPalette?.primary) {
                    e.currentTarget.style.backgroundColor = colorPalette.primary;
                  }
                }}
              >
                SUBMIT TICKET
              </button>

              <div className={`mt-3 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <Clock className="inline mr-1" size={14} />
                Limit: {remainingRequests} requests/day. 1 hour cooldown.
              </div>

              {submitMessage && (
                <div className={`mt-3 p-3 rounded text-sm text-center ${
                  submitMessage.includes('Failed') || submitMessage.includes('limit') || submitMessage.includes('not found')
                    ? isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700'
                    : isDarkMode ? 'bg-green-900/50 text-green-200' : 'bg-green-100 text-green-700'
                }`}>
                  {submitMessage}
                </div>
              )}
            </form>

            <button
              onClick={handleRequestPlanUpdate}
              className={`w-full mt-4 py-3 rounded font-medium border-2 transition-colors ${
                isDarkMode
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Upload className="inline mr-2" size={16} />
              Request Plan Update
            </button>
          </div>

          <div className={`lg:col-span-2 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <h2 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Latest Request
            </h2>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className={`py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="animate-pulse flex flex-col items-center">
                    <div className={`h-4 w-1/3 rounded mb-4 ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                    }`}></div>
                    <div className={`h-4 w-1/2 rounded ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  <p className="mt-4">Loading support requests...</p>
                </div>
              ) : (
                <>
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className={`sticky top-0 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} z-10`}>
                        <tr className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                          <th className={`text-left py-3 px-3 font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Date</th>
                          <th className={`text-left py-3 px-3 font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>ID</th>
                          <th className={`text-left py-3 px-3 font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Issue</th>
                          <th className={`text-left py-3 px-3 font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Status</th>
                          <th className={`text-left py-3 px-3 font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Visit Info</th>
                          <th className={`text-left py-3 px-3 font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                      {requests.map((request) => (
                        <tr key={request.id} className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                          <td className={`py-4 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {request.date}
                          </td>
                          <td className={`py-4 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {request.requestId}
                          </td>
                          <td className={`py-4 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <div>{request.issue}</div>
                            <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              {request.issueDetails}
                            </div>
                          </td>
                          <td className={`py-4 px-3`}>
                            <div className={`inline-flex items-center px-3 py-1 rounded ${
                              isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                            }`}>
                              <Info className="mr-1" size={14} />
                              {request.status}
                            </div>
                            <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              Note: {request.statusNote || 'N/A'}
                            </div>
                          </td>
                          <td className={`py-4 px-3`}>
                            <div className={`inline-flex items-center px-3 py-2 rounded ${
                              request.visitInfo.status === 'Done'
                                ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50'
                                : isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                            }`}>
                              <CheckCircle className="mr-1" size={14} />
                              {request.visitInfo.status}
                            </div>
            <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Techs: {request.assignedEmail || 'Not assigned'}
            </div>
            <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Note: {request.visitNote || 'N/A'}
            </div>
                          </td>
                          <td className={`py-4 px-3`}>
                            <button
                              className="px-4 py-1 rounded text-sm transition-colors"
                              style={{
                                color: colorPalette?.primary || '#3b82f6',
                                border: `1px solid ${colorPalette?.primary || '#3b82f6'}`
                              }}
                              onMouseEnter={(e) => {
                                if (colorPalette?.primary) {
                                  e.currentTarget.style.backgroundColor = `${colorPalette.primary}20`;
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>

                  {requests.length === 0 && (
                    <div className={`py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <FileText className="mx-auto mb-4 opacity-50" size={48} strokeWidth={1} />
                      <p className="text-lg font-medium">No support requests</p>
                      <p className="text-sm mt-1">Submit a ticket to get started</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-xl p-6 max-w-md w-full mx-4`}>
            <div className="mb-4">
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Confirm Submission
              </h3>
            </div>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Are you sure you want to submit this support ticket?
            </p>
            <div className={`mb-4 p-3 rounded ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Concern: {selectedConcern}
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Details: {details.substring(0, 100)}{details.length > 100 ? '...' : ''}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="flex-1 py-2 px-4 rounded font-medium text-white transition-colors"
                style={{
                  backgroundColor: colorPalette?.primary || '#1e40af'
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
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-xl p-8 max-w-sm w-full mx-4`}>
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 mb-4"
                style={{
                  borderColor: colorPalette?.primary || '#1e40af'
                }}
              ></div>
              <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Submitting Ticket
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Please wait...
              </p>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-xl p-6 max-w-md w-full mx-4`}>
            <div className="flex flex-col items-center">
              <div className="rounded-full p-3 mb-4"
                style={{
                  backgroundColor: `${colorPalette?.primary || '#1e40af'}20`
                }}
              >
                <CheckCircle
                  size={48}
                  style={{
                    color: colorPalette?.primary || '#1e40af'
                  }}
                />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Ticket Submitted Successfully
              </h3>
              <p className={`text-sm text-center mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Your support ticket has been created. We will get back to you soon.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-2 px-4 rounded font-medium text-white transition-colors"
                style={{
                  backgroundColor: colorPalette?.primary || '#1e40af'
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
    </div>
  );
};

export default Support;
