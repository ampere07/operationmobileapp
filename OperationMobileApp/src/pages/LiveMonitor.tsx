import React, { useState, useEffect, useRef } from 'react';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { 
  Activity, 
  BarChart3, 
  LineChart, 
  PieChart, 
  List,
  RefreshCw,
  Settings,
  Save,
  Maximize2,
  Minimize2
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface WidgetConfig {
  title: string;
  w: number;
  h: number;
  type: 'chart' | 'map';
  api: string;
  param: string;
  hasFilters?: boolean;
  filterType?: string;
}

interface WidgetData {
  label: string;
  value: number;
  series?: Record<string, number>;
}

interface WidgetState {
  viewType: 'bar' | 'line' | 'pie' | 'list';
  scope: 'overall' | 'today';
  year?: string;
  bgy?: string;
  visible: boolean;
}

const WIDGETS: Record<string, WidgetConfig> = {
  w_billing_stat: { title: 'Billing Status', w: 4, h: 4, type: 'chart', api: 'billing_status', param: 'status', hasFilters: true, filterType: 'bgy_only' },
  w_expenses: { title: 'Expenses', w: 4, h: 4, type: 'chart', api: 'expenses_mon', param: 'cat', hasFilters: true, filterType: 'toggle_today' },
  w_pay_methods: { title: 'Payment Methods', w: 4, h: 4, type: 'chart', api: 'pay_method_mon', param: 'method', hasFilters: true, filterType: 'toggle_today' },
  w_jo_queue: { title: 'JO Queue', w: 4, h: 5, type: 'chart', api: 'queue_mon', param: 'jo', hasFilters: true, filterType: 'toggle_today' },
  w_so_queue: { title: 'SO Queue', w: 4, h: 5, type: 'chart', api: 'queue_mon', param: 'so', hasFilters: true, filterType: 'toggle_today' },
  w_online_stat: { title: 'Online Status', w: 4, h: 4, type: 'chart', api: 'online_status', param: 'status' },
  w_app_mon: { title: 'Application Monitoring', w: 4, h: 4, type: 'chart', api: 'app_status', param: 'status', hasFilters: true, filterType: 'date_bgy' },
  w_so_support: { title: 'SO Support Status', w: 4, h: 4, type: 'chart', api: 'so_status', param: 'support', hasFilters: true, filterType: 'date_bgy' },
  w_so_visit: { title: 'SO Visit Status', w: 4, h: 4, type: 'chart', api: 'so_status', param: 'visit', hasFilters: true, filterType: 'date_bgy' },
  w_jo_onsite: { title: 'JO Onsite Status', w: 4, h: 4, type: 'chart', api: 'jo_status', param: 'onsite', hasFilters: true, filterType: 'date_bgy' },
  w_jo_tech: { title: 'JO Tech Performance', w: 8, h: 5, type: 'chart', api: 'tech_mon_jo', param: 'jo', hasFilters: true, filterType: 'toggle_today' },
  w_so_tech: { title: 'SO Tech Performance', w: 8, h: 5, type: 'chart', api: 'tech_mon_so', param: 'so', hasFilters: true, filterType: 'toggle_today' },
  w_jo_refer: { title: 'JO Refer Rank', w: 4, h: 5, type: 'chart', api: 'jo_refer_rank', param: 'refer', hasFilters: true, filterType: 'toggle_today' },
  w_inv_stat: { title: 'Invoice Status', w: 6, h: 5, type: 'chart', api: 'invoice_mon', param: 'count', hasFilters: true, filterType: 'year' },
  w_inv_amt: { title: 'Invoice Revenue', w: 6, h: 5, type: 'chart', api: 'invoice_mon', param: 'amount', hasFilters: true, filterType: 'year' },
  w_inv_overall: { title: 'Invoice (Overall)', w: 4, h: 4, type: 'chart', api: 'invoice_overall', param: 'status' },
  w_trans_stat: { title: 'Transactions (#)', w: 6, h: 5, type: 'chart', api: 'transactions_mon', param: 'count', hasFilters: true, filterType: 'year' },
  w_trans_amt: { title: 'Transactions (Amt)', w: 6, h: 5, type: 'chart', api: 'transactions_mon', param: 'amount', hasFilters: true, filterType: 'year' },
  w_portal_stat: { title: 'Portal Logs (#)', w: 6, h: 5, type: 'chart', api: 'portal_mon', param: 'count', hasFilters: true, filterType: 'year' },
  w_portal_amt: { title: 'Portal Logs (Amt)', w: 6, h: 5, type: 'chart', api: 'portal_mon', param: 'amount', hasFilters: true, filterType: 'year' }
};

const LiveMonitor: React.FC = () => {
  const [widgets, setWidgets] = useState<Record<string, any>>({});
  const [widgetStates, setWidgetStates] = useState<Record<string, WidgetState>>({});
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  const [barangays, setBarangays] = useState<string[]>([]);
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    setIsDarkMode(theme === 'dark' || theme === null);
    
    const initialStates: Record<string, WidgetState> = {};
    Object.keys(WIDGETS).forEach(id => {
      initialStates[id] = {
        viewType: 'bar',
        scope: 'overall',
        year: new Date().getFullYear().toString(),
        bgy: 'All',
        visible: ['w_billing_stat', 'w_online_stat', 'w_expenses', 'w_jo_queue', 'w_so_queue', 'w_app_mon'].includes(id)
      };
    });
    setWidgetStates(initialStates);

    fetchAllWidgets(initialStates);
    refreshInterval.current = setInterval(() => fetchAllWidgets(), 15000);

    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, []);

  const fetchAllWidgets = async (states?: Record<string, WidgetState>) => {
    const timestamp = new Date().toLocaleTimeString();
    setLastUpdate(timestamp);

    const currentStates = states || widgetStates;

    for (const [id, config] of Object.entries(WIDGETS)) {
      const state = currentStates[id];
      if (state && !state.visible) continue;

      try {
        const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
        const widgetState = state || { scope: 'overall', year: new Date().getFullYear().toString(), bgy: 'All' };
        
        let params = `param=${config.param}&scope=${widgetState.scope}`;
        if (widgetState.year) params += `&year=${widgetState.year}`;
        if (widgetState.bgy) params += `&bgy=${widgetState.bgy}`;

        const response = await fetch(`${baseUrl}/monitor/${config.api}?${params}`);
        const data = await response.json();
        
        if (data.status === 'success' && data.data) {
          setWidgets(prev => ({ ...prev, [id]: { config, data: data.data } }));
          
          if (data.barangays && barangays.length === 0) {
            setBarangays(data.barangays.map((b: any) => b.Name));
          }
        }
      } catch (error) {
        console.error(`Error fetching ${id}:`, error);
      }
    }
  };

  const updateWidgetState = (id: string, updates: Partial<WidgetState>) => {
    setWidgetStates(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  };

  const toggleWidgetVisibility = (id: string) => {
    setWidgetStates(prev => ({
      ...prev,
      [id]: { ...prev[id], visible: !prev[id].visible }
    }));
  };

  const generateChartData = (widgetData: WidgetData[], widgetId: string) => {
    const colors = [
      '#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545',
      '#fd7e14', '#ffc107', '#198754', '#20c997', '#0dcaf0'
    ];

    if (!widgetData || widgetData.length === 0) return null;

    if (widgetData[0].series) {
      const labels = widgetData.map(d => d.label);
      const seriesKeys = Array.from(new Set(widgetData.flatMap(d => Object.keys(d.series || {}))));
      
      return {
        labels,
        datasets: seriesKeys.map((key, idx) => ({
          label: key,
          data: widgetData.map(d => d.series?.[key] || 0),
          backgroundColor: colors[idx % colors.length],
          borderWidth: 0
        }))
      };
    }

    return {
      labels: widgetData.map(d => d.label),
      datasets: [{
        label: 'Count',
        data: widgetData.map(d => d.value),
        backgroundColor: widgetData.map((_, idx) => colors[idx % colors.length]),
        borderWidth: 0
      }]
    };
  };

  const getChartOptions = (type: string): ChartOptions<any> => {
    const baseOptions: ChartOptions<any> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: isDarkMode ? '#999' : '#333',
            boxWidth: 12,
            font: { size: 10 }
          }
        }
      }
    };

    if (type !== 'pie' && type !== 'doughnut') {
      baseOptions.scales = {
        x: {
          stacked: true,
          ticks: { color: isDarkMode ? '#999' : '#333', font: { size: 10 } },
          grid: { color: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
        },
        y: {
          stacked: true,
          ticks: { color: isDarkMode ? '#999' : '#333', font: { size: 10 } },
          grid: { color: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
        }
      };
    }

    return baseOptions;
  };

  const renderChart = (id: string, chartData: any, viewType: string) => {
    const options = getChartOptions(viewType);

    switch (viewType) {
      case 'line':
        return <Line data={chartData} options={options} />;
      case 'pie':
        return <Pie data={chartData} options={options} />;
      case 'bar':
      default:
        return <Bar data={chartData} options={options} />;
    }
  };

  const renderListView = (widgetData: WidgetData[], widgetId: string) => {
    const isCurrency = ['w_inv_amt', 'w_trans_amt', 'w_portal_amt', 'w_expenses', 'w_pay_methods'].includes(widgetId);
    
    if (widgetData[0]?.series) {
      return (
        <div className="space-y-2 overflow-y-auto max-h-64">
          {widgetData.map((row, idx) => (
            <div key={idx} className={`rounded-lg border p-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="font-semibold text-sm mb-2 border-b pb-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}">{row.label}</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(row.series || {}).map(([key, value]) => (
                  <div key={key} className={`text-center p-2 rounded ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                    <div className="text-xs opacity-70">{key}</div>
                    <div className="text-sm font-bold text-blue-600">
                      {isCurrency ? `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-64">
        {widgetData.map((row, idx) => (
          <div key={idx} className={`rounded-lg border p-3 text-center ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="text-xs opacity-70 truncate" title={row.label}>{row.label}</div>
            <div className="text-lg font-bold text-blue-600">
              {isCurrency ? `₱${Number(row.value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : row.value}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderWidget = (id: string) => {
    const widget = widgets[id];
    const state = widgetStates[id];

    if (!widget || !widget.data || !state) {
      return (
        <div className={`text-center py-8 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <RefreshCw className="animate-spin mx-auto mb-2" size={20} />
          Loading...
        </div>
      );
    }

    const chartData = generateChartData(widget.data, id);
    if (!chartData) {
      return (
        <div className={`text-center py-8 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          No Data Available
        </div>
      );
    }

    if (state.viewType === 'list') {
      return renderListView(widget.data, id);
    }

    return (
      <div className="h-64">
        {renderChart(id, chartData, state.viewType)}
      </div>
    );
  };

  const renderFilters = (id: string, config: WidgetConfig) => {
    const state = widgetStates[id];
    if (!config.hasFilters || !state) return null;

    return (
      <div className="flex gap-2 items-center text-xs">
        {(config.filterType === 'toggle_today' || config.filterType === 'date' || config.filterType === 'date_bgy') && (
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={state.scope === 'today'}
              onChange={(e) => updateWidgetState(id, { scope: e.target.checked ? 'today' : 'overall' })}
              className="rounded"
            />
            <span>Today</span>
          </label>
        )}

        {config.filterType === 'year' && (
          <select
            value={state.year}
            onChange={(e) => updateWidgetState(id, { year: e.target.value })}
            className={`px-2 py-1 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
          >
            <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
          </select>
        )}

        {(config.filterType === 'bgy_only' || config.filterType === 'date_bgy') && barangays.length > 0 && (
          <select
            value={state.bgy}
            onChange={(e) => updateWidgetState(id, { bgy: e.target.value })}
            className={`px-2 py-1 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
          >
            <option value="All">All Brgy</option>
            {barangays.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-50 border-b ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Activity size={24} />
              Live Monitor
            </h1>
            <span className="text-xs uppercase tracking-wider text-gray-500">Powered by: SYNC</span>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-sm text-gray-500">
              Updated: <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{lastUpdate}</span>
            </div>

            <button
              onClick={() => setShowWidgetMenu(!showWidgetMenu)}
              className={`px-3 py-2 rounded flex items-center gap-2 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <Settings size={16} />
              Widgets
            </button>

            <button
              onClick={() => fetchAllWidgets()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Widget Menu */}
      {showWidgetMenu && (
        <div className={`border-b ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="container mx-auto px-4 py-4">
            <h3 className="text-sm font-semibold mb-3">Toggle Widgets</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(WIDGETS).map(([id, config]) => (
                <label key={id} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                  <input
                    type="checkbox"
                    checked={widgetStates[id]?.visible || false}
                    onChange={() => toggleWidgetVisibility(id)}
                    className="rounded"
                  />
                  <span className="text-sm">{config.title}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Widgets Grid */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(WIDGETS).map(([id, config]) => {
            if (!widgetStates[id]?.visible) return null;

            return (
              <div
                key={id}
                className={`rounded-lg border-l-4 border-blue-600 shadow-lg ${
                  isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
                }`}
              >
                <div className="p-4">
                  {/* Widget Header */}
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide">
                      {config.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {renderFilters(id, config)}
                    </div>
                  </div>

                  {/* View Type Controls */}
                  <div className="flex gap-1 mb-3">
                    <button
                      onClick={() => updateWidgetState(id, { viewType: 'bar' })}
                      className={`p-1.5 rounded ${widgetStates[id]?.viewType === 'bar' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      <BarChart3 size={14} />
                    </button>
                    <button
                      onClick={() => updateWidgetState(id, { viewType: 'line' })}
                      className={`p-1.5 rounded ${widgetStates[id]?.viewType === 'line' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      <LineChart size={14} />
                    </button>
                    <button
                      onClick={() => updateWidgetState(id, { viewType: 'pie' })}
                      className={`p-1.5 rounded ${widgetStates[id]?.viewType === 'pie' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      <PieChart size={14} />
                    </button>
                    <button
                      onClick={() => updateWidgetState(id, { viewType: 'list' })}
                      className={`p-1.5 rounded ${widgetStates[id]?.viewType === 'list' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      <List size={14} />
                    </button>
                  </div>

                  {/* Widget Content */}
                  {renderWidget(id)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LiveMonitor;
