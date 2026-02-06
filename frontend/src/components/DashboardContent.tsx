import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Globe, Wifi, Ticket, Receipt } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

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
  const statsCards = [
    {
      title: "TODAY'S SALES",
      value: "₱0",
      subtitle: "0%",
      icon: TrendingUp
    },
    {
      title: "SUBSCRIPTIONS",
      value: "0",
      subtitle: "",
      icon: Users
    },
    {
      title: "IP ADDRESSES",
      value: "0",
      subtitle: "0 used IPs",
      icon: Globe
    },
    {
      title: "HOTSPOT USERS",
      value: "0",
      subtitle: "0 online",
      icon: Wifi
    },
    {
      title: "TOTAL TICKETS",
      value: "0",
      subtitle: "0 Open",
      icon: Ticket
    },
    {
      title: "INVOICES",
      value: "0",
      subtitle: "0 Unpaid",
      icon: Receipt
    }
  ];

  return (
    <div className={`min-h-screen ${
      isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="p-6">
        <div className="mb-8">
          <h2 className={`text-2xl font-semibold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Dashboard Overview
          </h2>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Your business management system overview and key metrics
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {statsCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <div key={index} className={`p-4 rounded border ${
                isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <IconComponent className={`h-5 w-5 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`} />
                </div>
                <h3 className={`text-xs font-medium mb-2 uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {card.title}
                </h3>
                <div className={`text-2xl font-bold mb-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {card.value}
                </div>
                {card.subtitle && (
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {card.subtitle}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* System Statistics */}
        <div className="mb-8">
          <h3 className={`text-lg font-semibold mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            SYSTEM STATISTICS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Memory</span>
                <span className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>0%</span>
              </div>
              <div className={`w-full rounded-full h-3 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
              }`}>
                <div className="bg-blue-500 h-3 rounded-full" style={{ width: '0%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Hard Disk Space</span>
                <span className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>0%</span>
              </div>
              <div className={`w-full rounded-full h-3 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
              }`}>
                <div className="bg-blue-500 h-3 rounded-full" style={{ width: '0%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>CPU</span>
                <span className={`text-sm ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>0%</span>
              </div>
              <div className={`w-full rounded-full h-3 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
              }`}>
                <div className="bg-blue-500 h-3 rounded-full" style={{ width: '0%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className={`p-6 rounded border ${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              INVOICE SUMMARY
            </h3>
            <div className="h-48 flex items-center justify-center">
              <div className="relative w-full h-32">
                <svg className="w-full h-full">
                  <defs>
                    <linearGradient id="invoiceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  <polyline
                    fill="none"
                    stroke="url(#invoiceGradient)"
                    strokeWidth="2"
                    points="0,64 50,64 100,64 150,64 200,64 250,64 300,64 350,64 400,64"
                  />
                  {[0, 50, 100, 150, 200, 250, 300, 350, 400].map((x, i) => (
                    <circle key={i} cx={x} cy={64} r="3" fill="#06b6d4" />
                  ))}
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>2025-09-17</div>
              <div className="text-sm text-green-400">Grand Total: 0</div>
            </div>
          </div>

          <div className={`p-6 rounded border ${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              TRANSACTION SUMMARY
            </h3>
            <div className="h-48 flex items-center justify-center">
              <div className="relative w-full h-32">
                <svg className="w-full h-full">
                  <defs>
                    <linearGradient id="transactionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                  <polyline
                    fill="none"
                    stroke="url(#transactionGradient)"
                    strokeWidth="2"
                    points="0,64 50,64 100,64 150,64 200,64 250,64 300,64 350,64 400,64"
                  />
                  {[0, 50, 100, 150, 200, 250, 300, 350, 400].map((x, i) => (
                    <circle key={i} cx={x} cy={64} r="3" fill="#10b981" />
                  ))}
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>2025-09-17</div>
              <div className="text-sm text-green-400">Grand Total: 0</div>
            </div>
          </div>
        </div>

        {/* Recent Tickets */}
        <div className={`rounded border ${
          isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
        }`}>
          <div className={`p-6 border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-300'
          }`}>
            <div className="flex justify-between items-center">
              <h3 className={`text-lg font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                RECENT TICKETS
              </h3>
              <button className={`${
                isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`border-b ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-200 border-gray-300'
              }`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>SUBJECT</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>CUSTOMER</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>CONTACT NUMBER</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>STATUS</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>LAST UPDATED</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>PRIORITY</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>CATEGORY</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className={`px-6 py-12 text-center ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    You don't have any open tickets assigned to you.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
