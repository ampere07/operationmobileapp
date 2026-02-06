// src/pages/LiveMonitor.tsx
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
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Move,
  LayoutGrid,
  Maximize,
  Minimize,
  Table
} from 'lucide-react';
import { Responsive } from 'react-grid-layout';
// WidthProvider was moved to legacy in v2.0
// @ts-ignore - Ignore type issues with legacy import if any
import { WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  WidgetConfig,
  WidgetData,
  WidgetState,
  WidgetResponse,
  DashboardTemplate,
  WIDGETS,
  CHART_COLORS,
  DEFAULT_VISIBLE_WIDGETS,
  CURRENCY_WIDGETS
} from '../types/monitor.types';
import { API_BASE_URL } from '../config/api';


const ResponsiveGridLayout = WidthProvider(Responsive);

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

const LiveMonitor: React.FC = () => {
  const [widgets, setWidgets] = useState<Record<string, any>>({});
  const [widgetStates, setWidgetStates] = useState<Record<string, WidgetState>>({});
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  const [barangays, setBarangays] = useState<string[]>([]);
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [currentTemplateName, setCurrentTemplateName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDraggable, setIsDraggable] = useState(false);

  // React Grid Layout state
  const [layouts, setLayouts] = useState<any>({ lg: [] });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshInterval = useRef<NodeJS.Timeout | null>(null);



  const buildHandleUrl = (params: Record<string, string | number | undefined>) => {
    const url = new URL(`${API_BASE_URL}/monitor/handle`);
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      url.searchParams.set(k, String(v));
    });
    return url.toString();
  };

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    setIsDarkMode(theme === 'dark' || theme === null);

    const initialStates: Record<string, WidgetState> = {};
    Object.keys(WIDGETS).forEach(id => {
      const savedState = localStorage.getItem(`widget_state_${id}`);
      if (savedState) {
        initialStates[id] = JSON.parse(savedState);
      } else {
        initialStates[id] = {
          viewType: id === 'tech_availability' ? 'grid' : (id === 'team_detailed_queue' ? 'table' : 'bar'),
          scope: 'overall',
          year: new Date().getFullYear().toString(),
          bgy: 'All',
          visible: DEFAULT_VISIBLE_WIDGETS.includes(id)
        };
      }
    });

    // Initialize layout from saved state or default
    const savedLayouts = localStorage.getItem('dashboard_layouts');
    if (savedLayouts) {
      setLayouts(JSON.parse(savedLayouts));
    } else {
      // Create default layout
      const defaultLayout = Object.keys(WIDGETS).map((id, i) => {
        const config = WIDGETS[id];
        return {
          i: id,
          x: (i * 4) % 12,
          y: Math.floor(i / 3) * 6,
          w: config.w || 4,
          h: 6 // default height
        };
      });
      setLayouts({ lg: defaultLayout, md: defaultLayout, sm: defaultLayout });
    }

    setWidgetStates(initialStates);

    // First loads
    fetchAllWidgets(initialStates);
    loadTemplates();

    refreshInterval.current = setInterval(() => fetchAllWidgets(), 15000);

    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllWidgets = async (states?: Record<string, WidgetState>) => {
    const timestamp = new Date().toLocaleTimeString();
    setLastUpdate(timestamp);

    const currentStates = states || widgetStates;

    for (const [id, config] of Object.entries(WIDGETS)) {
      const state = currentStates[id];
      if (state && !state.visible) continue;

      try {
        const widgetState = state || {
          viewType: id === 'tech_availability' ? 'grid' : 'bar',
          scope: 'overall',
          year: new Date().getFullYear().toString(),
          bgy: 'All',
          visible: true
        };

        const url = buildHandleUrl({
          action: config.api,
          param: config.param || '',
          scope: widgetState.scope,
          year: widgetState.year || '',
          bgy: widgetState.bgy || 'All',
          start: widgetState.startDate || '',
          end: widgetState.endDate || ''
        });

        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        const data: WidgetResponse = await response.json();

        if (data.status === 'success' && data.data) {
          setWidgets(prev => ({ ...prev, [id]: { config, data: data.data } }));

          if (data.barangays && barangays.length === 0) {
            setBarangays(data.barangays.map((b) => b.Name));
          }
        }
      } catch (error) {
        console.error(`Error fetching widget ${id}:`, error);
      }
    }
  };

  const updateWidgetState = (id: string, updates: Partial<WidgetState>) => {
    setWidgetStates(prev => {
      const newState = { ...prev, [id]: { ...prev[id], ...updates } };
      localStorage.setItem(`widget_state_${id}`, JSON.stringify(newState[id]));
      return newState;
    });

    setTimeout(() => fetchAllWidgets(), 100);
  };

  const toggleWidgetVisibility = (id: string) => {
    updateWidgetState(id, { visible: !widgetStates[id]?.visible });
  };

  const generateChartData = (widgetData: WidgetData[], widgetId: string) => {
    if (!widgetData || widgetData.length === 0) return null;

    // Handle multi-series data (e.g., Invoice Yearly Count with Paid/Unpaid statuses per month)
    // Data format: [{label: "January", series: {"Paid": 150, "Unpaid": 30}}, ...]
    if (widgetData[0].series) {
      const labels = widgetData.map(d => d.label); // Months: January, February, etc.

      // Extract all unique status values (Paid, Unpaid, Pending, etc.) from all months
      const seriesKeys = Array.from(new Set(widgetData.flatMap(d => Object.keys(d.series || {}))));

      return {
        labels, // X-axis: Months
        datasets: seriesKeys.map((key, idx) => ({
          label: key, // Each status becomes a line/series (Paid, Unpaid, etc.)
          data: widgetData.map(d => Number(d.series?.[key] || 0)), // Y-axis: counts/amounts per month
          backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
          borderWidth: 0
        }))
      };
    }

    // Handle simple data (single value per label)
    // Data format: [{label: "Category A", value: 100}, ...]
    return {
      labels: widgetData.map(d => d.label),
      datasets: [{
        label: 'Count',
        data: widgetData.map(d => Number(d.value || 0)),
        backgroundColor: widgetData.map((_, idx) => CHART_COLORS[idx % CHART_COLORS.length]),
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
        },
        tooltip: {
          callbacks: {
            label: function (context: any) {
              let label = context.dataset.label || '';
              if (label) label += ': ';

              const raw = context.parsed?.y ?? context.raw;
              const val = Number(raw ?? 0);

              // detect currency widgets by container id (we set id on wrapper)
              const widgetId = context.chart.canvas?.parentElement?.id;
              if (widgetId && CURRENCY_WIDGETS.includes(widgetId)) {
                label += '₱' + val.toLocaleString('en-PH', { minimumFractionDigits: 2 });
              } else {
                label += val.toLocaleString();
              }
              return label;
            }
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
      case 'doughnut':
        return <Doughnut data={chartData} options={options} />;
      case 'bar':
      default:
        return <Bar data={chartData} options={options} />;
    }
  };

  const renderListView = (widgetData: WidgetData[], widgetId: string) => {
    const isCurrency = CURRENCY_WIDGETS.includes(widgetId);

    if (widgetData[0]?.series) {
      return (
        <div className="space-y-2 overflow-y-auto max-h-64">
          {widgetData.map((row, idx) => (
            <div
              key={idx}
              className={`rounded-lg border p-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
            >
              <div className={`font-semibold text-sm mb-2 border-b pb-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                {row.label}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(row.series || {}).map(([key, value]) => (
                  <div key={key} className={`text-center p-2 rounded ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                    <div className="text-xs opacity-70">{key}</div>
                    <div className="text-sm font-bold text-blue-600">
                      {isCurrency
                        ? `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                        : Number(value).toLocaleString()}
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
          <div
            key={idx}
            className={`rounded-lg border p-3 text-center ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
          >
            <div className="text-xs opacity-70 truncate" title={row.label}>
              {row.label}
            </div>
            <div className="text-lg font-bold text-blue-600">
              {isCurrency
                ? `₱${Number(row.value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                : Number(row.value || 0).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    );
  };



  const renderGridView = (widgetData: WidgetData[], widgetId: string) => {
    return (
      <div className="flex gap-4 overflow-x-auto overflow-y-hidden p-2 pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
        {widgetData.map((row, idx) => {
          const meta: any = (row as any).meta || {};
          const status = meta.status || 'Unknown';
          const isAvailable = status === 'Available';

          const bgColor = isAvailable
            ? (isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200')
            : (isDarkMode ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200');

          const textColor = isAvailable
            ? (isDarkMode ? 'text-green-400' : 'text-green-700')
            : (isDarkMode ? 'text-orange-400' : 'text-orange-700');

          let timeString = '--';
          if (meta.since) {
            const start = new Date(meta.since).getTime();
            const now = new Date().getTime();
            const diff = Math.max(0, now - start);
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            timeString = `${h}h ${m}m`;
          }

          return (
            <div
              key={idx}
              className={`flex-shrink-0 w-64 rounded-2xl border p-4 flex flex-col justify-between items-center relative h-64 transition-all hover:scale-[1.02] shadow-sm ${bgColor}`}
            >
              {/* Status - Top Left */}
              <div className={`absolute top-4 left-4 text-xs font-bold uppercase tracking-wider ${textColor}`}>
                {status}
              </div>

              {/* Name - Top Center (slightly pushed down to not overlap with status if name is long) */}
              <div className="w-full text-center mt-6">
                <div className={`font-bold text-lg truncate px-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`} title={row.label}>
                  {row.label}
                </div>
              </div>

              {/* Time - Center Large */}
              <div className="flex-1 flex items-center justify-center">
                <div className={`text-5xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {timeString}
                </div>
              </div>

              {/* Details - Bottom */}
              {meta.details && (
                <div className={`w-full text-center text-[10px] opacity-60 truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} title={meta.details}>
                  {meta.details}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTable = (data: any[], id: string) => {
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <div className={`text-center py-8 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          No Data Available
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className={`min-w-full text-xs text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <thead className={`font-semibold border-b ${isDarkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
            <tr>
              <th className="py-2 px-3">Team Name</th>
              <th className="py-2 px-3">Type</th>
              <th className="py-2 px-3">Customer</th>
              <th className="py-2 px-3">Address</th>
              <th className="py-2 px-3">Start</th>
              <th className="py-2 px-3">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {data.map((row, idx) => (
              <tr key={idx} className={`${isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}>
                <td className="py-2 px-3 font-medium">{row.team_name}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wide font-bold ${row.type?.toLowerCase().includes('job')
                    ? 'bg-blue-500/20 text-blue-500'
                    : 'bg-purple-500/20 text-purple-500'
                    }`}>
                    {row.type}
                  </span>
                </td>
                <td className="py-2 px-3">{row.customer}</td>
                <td className="py-2 px-3 max-w-xs truncate" title={row.address}>{row.address}</td>
                <td className="py-2 px-3 whitespace-nowrap">{row.start}</td>
                <td className="py-2 px-3 font-mono font-bold text-orange-500">{row.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderWidget = (id: string) => {
    const widget = widgets[id];
    const state = widgetStates[id];

    if (!widget || !state) {
      return (
        <div className={`text-center py-8 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <RefreshCw className="animate-spin mx-auto mb-2" size={20} />
          Loading...
        </div>
      );
    }

    const hasData = widget.data && (Array.isArray(widget.data) ? widget.data.length > 0 : true);

    if (!hasData) {
      return (
        <div className={`text-center py-8 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {widget.data ? 'No Data Available' : 'Loading...'}
        </div>
      );
    }

    // Handler for table view
    if (state.viewType === 'table') {
      return (
        <div className="h-full overflow-y-auto custom-scrollbar">
          {renderTable(widget.data, id)}
        </div>
      );
    }

    // Special handler for generic lists like technician availability
    if (state.viewType === 'grid') return renderGridView(widget.data, id);
    if (state.viewType === 'list' || id === 'technician_availability') return renderListView(widget.data, id);

    const chartData = generateChartData(widget.data, id);
    if (!chartData) {
      return (
        <div className={`text-center py-8 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          No Data Available
        </div>
      );
    }

    // IMPORTANT: put id on the chart container so tooltip can detect widgetId for currency
    return (
      <div className="h-64" id={id}>
        {renderChart(id, chartData, state.viewType)}
      </div>
    );
  };

  const renderFilters = (id: string, config: WidgetConfig) => {
    const state = widgetStates[id];
    if (!config.hasFilters || !state) return null;

    return (
      <div className="flex gap-2 items-center text-xs flex-wrap">
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
            className={`px-2 py-1 rounded border text-xs ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
          >
            <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
            <option value={new Date().getFullYear() - 2}>{new Date().getFullYear() - 2}</option>
          </select>
        )}

        {(config.filterType === 'bgy_only' || config.filterType === 'date_bgy') && barangays.length > 0 && (
          <select
            value={state.bgy}
            onChange={(e) => updateWidgetState(id, { bgy: e.target.value })}
            className={`px-2 py-1 rounded border text-xs ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
          >
            <option value="All">All Brgy</option>
            {barangays.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        )}

        {/* Optional: custom date range UI if you want it:
            set scope='custom' and set startDate/endDate
            (You already support it in backend)
        */}
      </div>
    );
  };

  // -------- TEMPLATES (MATCH YOUR BACKEND ACTIONS) --------

  const loadTemplates = async () => {
    try {
      const url = buildHandleUrl({ action: 'list_templates' });
      const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
      const data = await response.json();

      if (data.status === 'success' && Array.isArray(data.data)) {
        setTemplates(data.data);
      } else {
        console.error('Template list error:', data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const saveTemplate = async () => {
    if (!currentTemplateName.trim()) {
      window.alert('Please enter a template name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/monitor/handle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          action: 'save_template',
          name: currentTemplateName,
          layout: JSON.stringify(widgetStates),
          // We now save the visual layout (positions/sizes) in 'style_data' for backward compatibility 
          // or ideally, we should update the DB schema to have a 'positions_data' column. 
          // For now, let's piggyback on style_data to store the layouts as 'layoutPositions'
          styles: JSON.stringify({
            darkMode: isDarkMode,
            layoutPositions: layouts
          })
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        window.alert('Template saved successfully!');
        setCurrentTemplateName('');
        loadTemplates();
        setShowTemplateMenu(false);
      } else {
        console.error('Save template failed:', data);
        window.alert(data.message || 'Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      window.alert('Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplate = async (templateId: number) => {
    setIsLoading(true);
    try {
      const url = buildHandleUrl({ action: 'load_template', id: templateId });
      const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
      const data = await response.json();

      if (data.status === 'success' && data.data) {
        const template = data.data as DashboardTemplate;

        const layoutData = typeof template.layout_data === 'string'
          ? JSON.parse(template.layout_data)
          : template.layout_data || {};

        const styleData = typeof template.style_data === 'string'
          ? JSON.parse(template.style_data)
          : template.style_data || {};

        setWidgetStates(layoutData);

        if (styleData.darkMode !== undefined) {
          setIsDarkMode(!!styleData.darkMode);
          localStorage.setItem('theme', styleData.darkMode ? 'dark' : 'light');
        }

        if (styleData.layoutPositions) {
          setLayouts(styleData.layoutPositions);
          localStorage.setItem('dashboard_layouts', JSON.stringify(styleData.layoutPositions));
        }

        Object.entries(layoutData).forEach(([id, state]) => {
          localStorage.setItem(`widget_state_${id}`, JSON.stringify(state));
        });

        fetchAllWidgets(layoutData as any);
        window.alert('Template loaded successfully!');
      } else {
        console.error('Load template failed:', data);
        window.alert(data.message || 'Failed to load template');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      window.alert('Failed to load template');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTemplate = async (templateId: number) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/monitor/handle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          action: 'delete_template',
          id: templateId
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        window.alert('Template deleted successfully!');
        loadTemplates();
      } else {
        console.error('Delete template failed:', data);
        window.alert(data.message || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      window.alert('Failed to delete template');
      setIsLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div ref={containerRef} className={`min-h-screen ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'} ${isFullscreen ? 'overflow-y-auto' : ''}`}>
      {/* Header */}
      <div className={`sticky top-0 z-50 border-b ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Activity size={24} className="text-blue-600" />
              Live Monitor
            </h1>
            <span className="text-xs uppercase tracking-wider text-gray-500">
              Real-time Dashboard Analytics
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-sm text-gray-500">
              Updated: <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{lastUpdate}</span>
            </div>

            <button
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className={`px-3 py-2 rounded flex items-center gap-2 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
              title="Manage Templates"
            >
              <Save size={16} />
              Templates
            </button>

            <button
              onClick={() => setShowWidgetMenu(!showWidgetMenu)}
              className={`px-3 py-2 rounded flex items-center gap-2 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
              title="Widget Settings"
            >
              <Settings size={16} />
              Widgets
            </button>

            <button
              onClick={() => fetchAllWidgets()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm flex items-center gap-2"
              title="Refresh All Widgets"
            >
              <RefreshCw size={16} />
            </button>

            <button
              onClick={toggleFullscreen}
              className={`px-3 py-2 rounded flex items-center gap-2 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
              title={isFullscreen ? "Exit Full Screen" : "Full Screen"}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              <span className="hidden sm:inline">{isFullscreen ? "Exit" : "Full Screen"}</span>
            </button>

            <button
              onClick={() => setIsDraggable(!isDraggable)}
              className={`px-4 py-2 rounded text-white text-sm flex items-center gap-2 ${isDraggable ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-600 hover:bg-gray-700'}`}
              title={isDraggable ? "Lock Layout" : "Edit Layout"}
            >
              <Move size={16} />
              {isDraggable ? "Done" : "Edit"}
            </button>
          </div>
        </div>
      </div>

      {/* Template Menu */}
      {showTemplateMenu && (
        <div className={`border-b ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="container mx-auto px-4 py-4">
            <h3 className="text-sm font-semibold mb-3">Dashboard Templates</h3>

            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={currentTemplateName}
                onChange={(e) => setCurrentTemplateName(e.target.value)}
                placeholder="Template name..."
                className={`flex-1 px-3 py-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
              />
              <button
                onClick={saveTemplate}
                disabled={isLoading || !currentTemplateName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-white text-sm flex items-center gap-2"
              >
                <Save size={16} />
                Save Current Layout
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 rounded border flex items-center justify-between ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{template.template_name}</div>
                    <div className="text-xs text-gray-500">{new Date(template.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => loadTemplate(template.id)}
                      disabled={isLoading}
                      className="p-2 rounded hover:bg-blue-600 hover:text-white transition-colors"
                      title="Load Template"
                    >
                      <Upload size={14} />
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      disabled={isLoading}
                      className="p-2 rounded hover:bg-red-600 hover:text-white transition-colors"
                      title="Delete Template"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* Widget Menu */}
      {showWidgetMenu && (
        <div className={`border-b ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Toggle Widgets</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => Object.keys(WIDGETS).forEach(id => updateWidgetState(id, { visible: true }))}
                  className="text-xs px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white"
                >
                  <Eye size={12} className="inline mr-1" />
                  Show All
                </button>
                <button
                  onClick={() => Object.keys(WIDGETS).forEach(id => updateWidgetState(id, { visible: false }))}
                  className="text-xs px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
                >
                  <EyeOff size={12} className="inline mr-1" />
                  Hide All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(WIDGETS).map(([id, config]) => (
                <label
                  key={id}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                >
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

      {/* Widgets Grid - Replaced with ResponsiveGridLayout */}
      <div className="container mx-auto px-4 py-6">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          isDraggable={isDraggable}

          isResizable={isDraggable}
          onLayoutChange={(currentLayout: any, allLayouts: any) => {
            setLayouts(allLayouts);
            localStorage.setItem('dashboard_layouts', JSON.stringify(allLayouts));
          }}
          draggableHandle=".drag-handle"
        >
          {Object.entries(WIDGETS).map(([id, config]) => {
            if (!widgetStates[id]?.visible) return null;

            return (
              <div
                key={id}
                className={`rounded-lg border-l-4 border-blue-600 shadow-lg flex flex-col ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} ${isDraggable ? 'ring-2 ring-blue-500/50' : ''}`}
              >
                <div className="p-4 flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2 slide-header">
                    <div className="flex items-center gap-2">
                      {isDraggable && (
                        <div className="drag-handle cursor-move p-1 rounded hover:bg-white/10" title="Drag to move">
                          <Move size={14} className="text-gray-400" />
                        </div>
                      )}
                      <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide truncate">
                        {config.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      {renderFilters(id, config)}
                    </div>
                  </div>

                  <div className="flex gap-1 mb-3">
                    <button
                      onClick={() => updateWidgetState(id, { viewType: 'bar' })}
                      className={`p-1.5 rounded transition-colors ${widgetStates[id]?.viewType === 'bar'
                        ? 'bg-blue-600 text-white'
                        : isDarkMode
                          ? 'bg-gray-800 hover:bg-gray-700'
                          : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      title="Bar Chart"
                    >
                      <BarChart3 size={14} />
                    </button>

                    <button
                      onClick={() => updateWidgetState(id, { viewType: 'line' })}
                      className={`p-1.5 rounded transition-colors ${widgetStates[id]?.viewType === 'line'
                        ? 'bg-blue-600 text-white'
                        : isDarkMode
                          ? 'bg-gray-800 hover:bg-gray-700'
                          : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      title="Line Chart"
                    >
                      <LineChart size={14} />
                    </button>

                    <button
                      onClick={() => updateWidgetState(id, { viewType: 'pie' })}
                      className={`p-1.5 rounded transition-colors ${widgetStates[id]?.viewType === 'pie'
                        ? 'bg-blue-600 text-white'
                        : isDarkMode
                          ? 'bg-gray-800 hover:bg-gray-700'
                          : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      title="Pie Chart"
                    >
                      <PieChart size={14} />
                    </button>

                    <button
                      onClick={() => updateWidgetState(id, { viewType: 'list' })}
                      className={`p-1.5 rounded transition-colors ${widgetStates[id]?.viewType === 'list'
                        ? 'bg-blue-600 text-white'
                        : isDarkMode
                          ? 'bg-gray-800 hover:bg-gray-700'
                          : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      title="List View"
                    >
                      <List size={14} />
                    </button>

                    <button
                      onClick={() => updateWidgetState(id, { viewType: 'table' })}
                      className={`p-1.5 rounded transition-colors ${widgetStates[id]?.viewType === 'table'
                        ? 'bg-blue-600 text-white'
                        : isDarkMode
                          ? 'bg-gray-800 hover:bg-gray-700'
                          : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      title="Table View"
                    >
                      <Table size={14} />
                    </button>

                    <button
                      onClick={() => updateWidgetState(id, { viewType: 'grid' })}
                      className={`p-1.5 rounded transition-colors ${widgetStates[id]?.viewType === 'grid'
                        ? 'bg-blue-600 text-white'
                        : isDarkMode
                          ? 'bg-gray-800 hover:bg-gray-700'
                          : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      title="Grid View"
                    >
                      <LayoutGrid size={14} />
                    </button>
                  </div>

                  {renderWidget(id)}
                </div>
              </div>
            );
          })}
        </ResponsiveGridLayout>

        {Object.values(widgetStates).length > 0 && Object.values(widgetStates).every(state => !state.visible) && (
          <div className="text-center py-20">
            <Activity size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No Widgets Visible</h3>
            <p className="text-gray-500 mb-4">Enable some widgets to start monitoring your system</p>
            <button
              onClick={() => setShowWidgetMenu(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
            >
              Open Widget Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMonitor;
