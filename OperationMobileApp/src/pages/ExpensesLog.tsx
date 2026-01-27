import React, { useState, useEffect } from 'react';
import { Search, Eye, X } from 'lucide-react';
import ExpensesLogDetails from '../components/ExpensesLogDetails';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface ExpenseRecord {
  id: string;
  expensesId: string;
  date: string;
  amount: number;
  payee: string;
  category: string;
  description: string;
  invoiceNo: string;
  provider: string;
  photo?: string;
  processedBy: string;
  modifiedBy: string;
  modifiedDate: string;
  userEmail: string;
  receivedDate: string;
  supplier: string;
  city: string;
}

const ExpensesLog: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

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
    const fetchExpenseData = async () => {
      try {
        setIsLoading(true);
        
        const sampleData: ExpenseRecord[] = [
          {
            id: '1',
            expensesId: '20240426104031000',
            date: '4/17/2024',
            amount: 140000.00,
            payee: 'John Smith Construction',
            category: 'Materials',
            description: 'Concrete Pole 40pcs',
            invoiceNo: 'MRF229',
            provider: 'SWITCH',
            processedBy: 'Jane Doe',
            modifiedBy: 'Jane Doe',
            modifiedDate: '4/26/2024 10:40:31 AM',
            userEmail: 'jane.doe@switchfiber.ph',
            receivedDate: '4/17/2024',
            supplier: 'John Smith Construction',
            city: 'All'
          },
          {
            id: '2',
            expensesId: '20240426103730000',
            date: '4/16/2024',
            amount: 906356.89,
            payee: 'ABC TECH SOLUTIONS...',
            category: 'Modem',
            description: 'Fullpayment for 2000pcs modem',
            invoiceNo: 'MRF223',
            provider: 'SWITCH',
            processedBy: 'Jane Doe',
            modifiedBy: 'Jane Doe',
            modifiedDate: '4/26/2024 10:37:30 AM',
            userEmail: 'jane.doe@switchfiber.ph',
            receivedDate: '4/16/2024',
            supplier: 'ABC TECH SOLUTIONS...',
            city: 'All'
          },
          {
            id: '3',
            expensesId: '20240426103423000',
            date: '4/15/2024',
            amount: 11491.00,
            payee: 'Sales Team & Installation',
            category: 'Commission',
            description: 'Sales Agent & Installer Commis...',
            invoiceNo: 'MRF225',
            provider: 'SWITCH',
            processedBy: 'Jane Doe',
            modifiedBy: 'Jane Doe',
            modifiedDate: '4/26/2024 10:34:23 AM',
            userEmail: 'jane.doe@switchfiber.ph',
            receivedDate: '4/15/2024',
            supplier: 'Sales Team & Installation',
            city: 'All'
          },
          {
            id: '4',
            expensesId: '20240425082911000',
            date: '4/15/2024',
            amount: 16311.00,
            payee: 'Online Store Inc',
            category: 'Materials',
            description: 'Payment for Stainless Strap, Bu...',
            invoiceNo: 'MRF226',
            provider: 'SWITCH',
            processedBy: 'Jane Doe',
            modifiedBy: 'Jane Doe',
            modifiedDate: '4/25/2024 8:29:11 AM',
            userEmail: 'jane.doe@switchfiber.ph',
            receivedDate: '4/15/2024',
            supplier: 'Online Store Inc',
            city: 'All'
          },
          {
            id: '5',
            expensesId: '20240425082731000',
            date: '4/15/2024',
            amount: 159357.52,
            payee: 'Metro Networks Inc',
            category: 'Data Center',
            description: 'Payment for Metro Data Center...',
            invoiceNo: 'MRF224',
            provider: 'SWITCH',
            processedBy: 'Jane Doe',
            modifiedBy: 'Jane Doe',
            modifiedDate: '4/25/2024 8:27:31 AM',
            userEmail: 'jane.doe@switchfiber.ph',
            receivedDate: '4/15/2024',
            supplier: 'Metro Networks Inc',
            city: 'All'
          },
          {
            id: '6',
            expensesId: '20240425082347000',
            date: '4/9/2024',
            amount: 100000.00,
            payee: 'Robert Johnson',
            category: 'Consultation /Professional fee',
            description: 'Consultation fee for the month o...',
            invoiceNo: 'MRF221',
            provider: 'SWITCH',
            processedBy: 'Jane Doe',
            modifiedBy: 'Jane Doe',
            modifiedDate: '4/25/2024 8:23:47 AM',
            userEmail: 'jane.doe@switchfiber.ph',
            receivedDate: '4/9/2024',
            supplier: 'Robert Johnson',
            city: 'All'
          },
          {
            id: '7',
            expensesId: '20240424053621000',
            date: '4/9/2024',
            amount: 21400.00,
            payee: 'GLOBAL TELECOMMUNICATIO...',
            category: 'Materials',
            description: 'Payment for Grounding Rod, Ma...',
            invoiceNo: 'MRF222',
            provider: 'SWITCH',
            processedBy: 'Jane Doe',
            modifiedBy: 'Jane Doe',
            modifiedDate: '4/24/2024 5:36:21 PM',
            userEmail: 'jane.doe@switchfiber.ph',
            receivedDate: '4/9/2024',
            supplier: 'GLOBAL TELECOMMUNICATIO...',
            city: 'All'
          },
          {
            id: '8',
            expensesId: '20240424053451000',
            date: '4/9/2024',
            amount: 92120.00,
            payee: 'MIKE RODRIGUEZ',
            category: 'Contractor',
            description: 'BRCC Cable Laying & Fixing ; 80 ...',
            invoiceNo: 'MRF220',
            provider: 'SWITCH',
            processedBy: 'Jane Doe',
            modifiedBy: 'Jane Doe',
            modifiedDate: '4/24/2024 5:34:51 PM',
            userEmail: 'jane.doe@switchfiber.ph',
            receivedDate: '4/9/2024',
            supplier: 'MIKE RODRIGUEZ',
            city: 'All'
          },
          {
            id: '9',
            expensesId: '20240424051813000',
            date: '4/8/2024',
            amount: 140180.64,
            payee: 'PRIME TELECOM',
            category: 'Services',
            description: 'Payment for the Month of March...',
            invoiceNo: 'MRF215',
            provider: 'SWITCH',
            processedBy: 'Jane Doe',
            modifiedBy: 'Jane Doe',
            modifiedDate: '4/24/2024 5:18:13 PM',
            userEmail: 'jane.doe@switchfiber.ph',
            receivedDate: '4/8/2024',
            supplier: 'PRIME TELECOM',
            city: 'All'
          },
          {
            id: '10',
            expensesId: '20240424051607000',
            date: '4/8/2024',
            amount: 241500.00,
            payee: 'FIBER NETWORK SOLUTIONS...',
            category: 'Cables',
            description: 'Cable Mini Figure 12 & 24 cores',
            invoiceNo: 'MRF216',
            provider: 'SWITCH',
            processedBy: 'Jane Doe',
            modifiedBy: 'Jane Doe',
            modifiedDate: '4/24/2024 5:16:07 PM',
            userEmail: 'jane.doe@switchfiber.ph',
            receivedDate: '4/8/2024',
            supplier: 'FIBER NETWORK SOLUTIONS...',
            city: 'All'
          },
          {
            id: '11',
            expensesId: '20240424051505000',
            date: '4/8/2024',
            amount: 101075.00,
            payee: 'TECH CABLE DESIGN & SERVI...',
            category: 'AutoCad',
            description: 'Payment for Cad Operator for M...',
            invoiceNo: 'MRF217',
            provider: 'SWITCH',
            processedBy: 'Jane Doe',
            modifiedBy: 'Jane Doe',
            modifiedDate: '4/24/2024 5:15:05 PM',
            userEmail: 'jane.doe@switchfiber.ph',
            receivedDate: '4/8/2024',
            supplier: 'TECH CABLE DESIGN & SERVI...',
            city: 'All'
          },
          {
            id: '12',
            expensesId: '20240424051322000',
            date: '4/8/2024',
            amount: 18995.00,
            payee: 'SMART COMMUNICATIONS INC',
            category: 'Utilities',
            description: 'Payment for the Month of March...',
            invoiceNo: 'MRF219',
            provider: 'SWITCH',
            processedBy: 'Jane Doe',
            modifiedBy: 'Jane Doe',
            modifiedDate: '4/24/2024 5:13:22 PM',
            userEmail: 'jane.doe@switchfiber.ph',
            receivedDate: '4/8/2024',
            supplier: 'SMART COMMUNICATIONS INC',
            city: 'All'
          }
        ];
        
        setExpenseRecords(sampleData);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch expense data:', err);
        setError('Failed to load expense records. Please try again.');
        setExpenseRecords([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExpenseData();
  }, []);

  const filteredExpenseRecords = expenseRecords.filter(record => {
    const matchesSearch = searchQuery === '' || 
                         record.payee.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         record.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         record.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         record.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const handleRowClick = (record: ExpenseRecord) => {
    setSelectedExpense(record);
  };

  const handleCloseDetails = () => {
    setSelectedExpense(null);
  };

  return (
    <div className={`h-full flex overflow-hidden ${
      isDarkMode ? 'bg-slate-900' : 'bg-gray-50'
    }`}>
      {/* Main Table Area */}
      <div className={`${selectedExpense ? 'flex-1' : 'w-full'} flex flex-col overflow-hidden`}>
        {/* Search Bar */}
        <div className={`p-4 border-b flex-shrink-0 ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className="relative">
            <input
              type="text"
              placeholder="Search expense records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded pl-10 pr-4 py-3 focus:outline-none text-sm ${
                isDarkMode 
                  ? 'bg-slate-700 text-white border-slate-600' 
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
              onFocus={(e) => {
                if (colorPalette?.primary) {
                  e.currentTarget.style.borderColor = colorPalette.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isDarkMode ? '#475569' : '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <Search className={`absolute left-3 top-3.5 h-4 w-4 ${
              isDarkMode ? 'text-slate-400' : 'text-gray-500'
            }`} />
          </div>
        </div>
        
        {/* Table Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {isLoading ? (
              <div className={`px-4 py-12 text-center ${
                isDarkMode ? 'text-slate-400' : 'text-gray-600'
              }`}>
                <div className="animate-pulse flex flex-col items-center">
                  <div className={`h-4 w-1/3 rounded mb-4 ${
                    isDarkMode ? 'bg-slate-700' : 'bg-gray-300'
                  }`}></div>
                  <div className={`h-4 w-1/2 rounded ${
                    isDarkMode ? 'bg-slate-700' : 'bg-gray-300'
                  }`}></div>
                </div>
                <p className="mt-4">Loading expense records...</p>
              </div>
            ) : error ? (
              <div className={`px-4 py-12 text-center ${
                isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>
                <p>{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className={`mt-4 text-white px-4 py-2 rounded ${
                    isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-500 hover:bg-gray-600'
                  }`}>
                  Retry
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-max min-w-full text-sm">
                  <thead>
                    <tr className={`border-b ${
                      isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <th className={`text-left py-3 px-4 font-medium min-w-28 whitespace-nowrap ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-600'
                      }`}>Date</th>
                      <th className={`text-left py-3 px-4 font-medium min-w-32 whitespace-nowrap ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-600'
                      }`}>Amount</th>
                      <th className={`text-left py-3 px-4 font-medium min-w-56 whitespace-nowrap ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-600'
                      }`}>Payee</th>
                      <th className={`text-left py-3 px-4 font-medium min-w-40 whitespace-nowrap ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-600'
                      }`}>Category</th>
                      <th className={`text-left py-3 px-4 font-medium min-w-64 whitespace-nowrap ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-600'
                      }`}>Description</th>
                      <th className={`text-left py-3 px-4 font-medium min-w-32 whitespace-nowrap ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-600'
                      }`}>Invoice No.</th>
                      <th className={`text-left py-3 px-4 font-medium min-w-28 whitespace-nowrap ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-600'
                      }`}>Provider</th>
                      <th className={`text-left py-3 px-4 font-medium min-w-24 whitespace-nowrap ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-600'
                      }`}>Photo</th>
                      <th className={`text-left py-3 px-4 font-medium min-w-40 whitespace-nowrap ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-600'
                      }`}>Processed By</th>
                      <th className={`text-left py-3 px-4 font-medium min-w-36 whitespace-nowrap ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-600'
                      }`}>Modified By</th>
                      <th className={`text-left py-3 px-4 font-medium min-w-40 whitespace-nowrap ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-600'
                      }`}>Modified Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenseRecords.length > 0 ? (
                      filteredExpenseRecords.map((record) => (
                        <tr 
                          key={record.id} 
                          className={`border-b cursor-pointer transition-colors ${
                            isDarkMode 
                              ? 'border-slate-800 hover:bg-slate-800' 
                              : 'border-gray-200 hover:bg-gray-50'
                          } ${
                            selectedExpense?.id === record.id 
                              ? isDarkMode ? 'bg-slate-800' : 'bg-gray-100' 
                              : ''
                          }`}
                          onClick={() => handleRowClick(record)}
                        >
                          <td className={`py-3 px-4 whitespace-nowrap ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>{record.date}</td>
                          <td className={`py-3 px-4 whitespace-nowrap ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>₱{record.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className={`py-3 px-4 whitespace-nowrap ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`} title={record.payee}>{record.payee}</td>
                          <td className={`py-3 px-4 whitespace-nowrap ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>{record.category}</td>
                          <td className={`py-3 px-4 whitespace-nowrap ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`} title={record.description}>{record.description}</td>
                          <td className={`py-3 px-4 whitespace-nowrap ${
                            isDarkMode ? 'text-red-400' : 'text-red-600'
                          }`}>{record.invoiceNo}</td>
                          <td className={`py-3 px-4 whitespace-nowrap ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>{record.provider}</td>
                          <td className={`py-3 px-4 whitespace-nowrap ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {record.photo ? (
                              <button className={isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}>
                                <Eye size={16} />
                              </button>
                            ) : (
                              <span className={isDarkMode ? 'text-slate-500' : 'text-gray-400'}>-</span>
                            )}
                          </td>
                          <td className={`py-3 px-4 whitespace-nowrap ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>{record.processedBy}</td>
                          <td className={`py-3 px-4 whitespace-nowrap ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>{record.modifiedBy}</td>
                          <td className={`py-3 px-4 whitespace-nowrap ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>{record.modifiedDate}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className={`px-4 py-12 text-center ${
                          isDarkMode ? 'text-slate-400' : 'text-gray-600'
                        }`}>
                          No expense records found matching your search
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expense Details Panel */}
      {selectedExpense && (
        <div className={`w-full max-w-3xl border-l flex-shrink-0 relative ${
          isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={handleCloseDetails}
              className={`transition-colors rounded p-1 ${
                isDarkMode 
                  ? 'text-slate-400 hover:text-white bg-slate-800' 
                  : 'text-gray-600 hover:text-gray-900 bg-gray-100'
              }`}
            >
              <X size={20} />
            </button>
          </div>
          <ExpensesLogDetails expenseRecord={selectedExpense} />
        </div>
      )}
    </div>
  );
};

export default ExpensesLog;
