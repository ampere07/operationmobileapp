import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Trash2, X, FileText, Copy, Printer, ChevronLeft, ChevronRight as ChevronRightNav, Maximize2, AlertTriangle } from 'lucide-react';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { relatedDataService } from '../services/relatedDataService';
import RelatedDataTable from './RelatedDataTable';
import { relatedDataColumns } from '../config/relatedDataColumns';

interface InventoryItem {
  item_name: string;
  item_description?: string;
  supplier?: string;
  quantity_alert?: number;
  image?: string;
  category?: string;
  item_id?: number;
  modified_by?: string;
  modified_date?: string;
  user_email?: string;
}

interface InventoryLog {
  id: string;
  date: string;
  itemQuantity: number;
  requestedBy: string;
  requestedWith: string;
}

interface BorrowedLog {
  id: string;
  date: string;
  borrowedBy: string;
  quantity: number;
  returnDate?: string;
  status: string;
}

interface JobOrder {
  id: string;
  jobOrderNumber: string;
  date: string;
  assignedTo: string;
  quantity: number;
  status: string;
}

interface ServiceOrder {
  id: string;
  serviceOrderNumber: string;
  date: string;
  technician: string;
  quantity: number;
  status: string;
}

interface DefectiveLog {
  id: string;
  date: string;
  reportedBy: string;
  quantity: number;
  defectType: string;
  description: string;
}

interface InventoryDetailsProps {
  item: InventoryItem;
  inventoryLogs?: InventoryLog[];
  borrowedLogs?: BorrowedLog[];
  jobOrders?: JobOrder[];
  serviceOrders?: ServiceOrder[];
  defectiveLogs?: DefectiveLog[];
  totalStockIn?: number;
  totalStockAvailable?: number;
  onEdit?: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
  onClose?: () => void;
}

const InventoryDetails: React.FC<InventoryDetailsProps> = ({
  item,
  inventoryLogs = [
    {
      id: '1',
      date: '2023-11-27T14:07:58',
      itemQuantity: 4,
      requestedBy: 'None',
      requestedWith: 'None'
    }
  ],
  borrowedLogs = [],
  jobOrders = [],
  serviceOrders = [],
  defectiveLogs = [],
  totalStockIn = 4,
  totalStockAvailable = 4,
  onEdit,
  onDelete,
  onClose
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    inventoryLogs: true,
    borrowedLogs: false,
    jobOrders: false,
    serviceOrders: false,
    defectiveLogs: false
  });
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Related data counts
  const [inventoryLogsCount, setInventoryLogsCount] = useState(inventoryLogs.length);
  const [borrowedLogsCount, setBorrowedLogsCount] = useState(borrowedLogs.length);
  const [jobOrdersCount, setJobOrdersCount] = useState(jobOrders.length);
  const [serviceOrdersCount, setServiceOrdersCount] = useState(serviceOrders.length);
  const [defectiveLogsCount, setDefectiveLogsCount] = useState(defectiveLogs.length);
  
  // Related data
  const [inventoryLogsData, setInventoryLogsData] = useState<any[]>(inventoryLogs);
  const [borrowedLogsData, setBorrowedLogsData] = useState<any[]>(borrowedLogs);
  const [jobOrdersData, setJobOrdersData] = useState<any[]>(jobOrders);
  const [serviceOrdersData, setServiceOrdersData] = useState<any[]>(serviceOrders);
  const [defectiveLogsData, setDefectiveLogsData] = useState<any[]>(defectiveLogs);

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
  
  // Fetch related data when item_id changes
  useEffect(() => {
    const fetchRelatedData = async () => {
      if (!item.item_id) {
        console.log('❌ No item_id found in item');
        return;
      }
      
      const itemId = item.item_id;
      console.log('🔍 Fetching related data for item:', itemId);
      
      // Fetch all related data
      const fetchPromises = [
        { key: 'inventoryLogs', fn: relatedDataService.getRelatedInventoryLogs, setState: setInventoryLogsData, setCount: setInventoryLogsCount },
        { key: 'borrowedLogs', fn: relatedDataService.getRelatedBorrowedLogs, setState: setBorrowedLogsData, setCount: setBorrowedLogsCount },
        { key: 'defectiveLogs', fn: relatedDataService.getRelatedDefectiveLogs, setState: setDefectiveLogsData, setCount: setDefectiveLogsCount },
        { key: 'jobOrders', fn: relatedDataService.getRelatedJobOrdersByItem, setState: setJobOrdersData, setCount: setJobOrdersCount },
        { key: 'serviceOrders', fn: relatedDataService.getRelatedServiceOrdersByItem, setState: setServiceOrdersData, setCount: setServiceOrdersCount }
      ];
      
      for (const { key, fn, setState, setCount } of fetchPromises) {
        try {
          console.log(`⏳ Fetching ${key}...`);
          const result = await fn(itemId);
          console.log(`✅ ${key} fetched:`, { count: result.count || 0, hasData: (result.data || []).length > 0 });
          setState(result.data || []);
          setCount(result.count || 0);
        } catch (error) {
          console.error(`❌ Error fetching ${key}:`, error);
          setState([]);
          setCount(0);
        }
      }
    };
    
    fetchRelatedData();
  }, [item.item_id]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(item);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      if (window.confirm(`Are you sure you want to delete "${item.item_name}"?`)) {
        onDelete(item);
      }
    }
  };

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
  };

  if (isExpanded) {
    // Render expanded view that takes over the main content area only
    return (
      <div className={`fixed right-0 bottom-0 z-40 flex flex-col ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}
           style={{ left: '256px', top: '64px' }}>
        {/* Toolbar */}
        <div className={`px-6 py-2 border-b ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-gray-100 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            {/* Left side - Breadcrumb Navigation */}
            <div className={`flex items-center text-sm ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              <span>Inventory Category List</span>
              <ChevronRight size={16} className="mx-2" />
              <span>{item.category || 'EVENT'}</span>
              <ChevronRight size={16} className="mx-2" />
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{item.item_name}</span>
            </div>
            
            {/* Right side - Toolbar buttons */}
            <div className="flex items-center space-x-1">
              <button 
                onClick={handleDelete}
                className={`p-2 rounded transition-colors ${
                  isDarkMode
                    ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                    : 'text-gray-600 hover:text-red-600 hover:bg-gray-200'
                }`}
                title="Delete"
              >
                <Trash2 size={18} />
              </button>
              <button className={`p-2 rounded transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}>
                <X size={18} />
              </button>
              <button className={`p-2 rounded transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}>
                <Printer size={18} />
              </button>
              <button className={`p-2 rounded transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}>
                <Copy size={18} />
              </button>
              <button 
                onClick={handleEdit}
                className="px-3 py-1.5 rounded text-sm transition-colors flex items-center space-x-1 text-white"
                style={{
                  backgroundColor: colorPalette?.primary || '#ea580c'
                }}
                onMouseEnter={(e) => {
                  if (colorPalette?.accent) {
                    e.currentTarget.style.backgroundColor = colorPalette.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                }}
              >
                <span>Edit</span>
              </button>
              <button 
                onClick={handleCollapse}
                className={`p-2 rounded transition-colors ${
                  isDarkMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
                title="Back to side panel view"
              >
                <ChevronLeft size={18} />
              </button>
              <button className={`p-2 rounded transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}>
                <ChevronRightNav size={18} />
              </button>
              <button 
                onClick={handleCollapse}
                className={`p-2 rounded transition-colors ${
                  isDarkMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
                title="Collapse to side panel view"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex h-full">
            {/* Left Side - Image */}
            <div className="w-1/2 p-6">
              <div className={`w-full h-80 flex items-center justify-center border rounded ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-gray-100 border-gray-200'
              }`}>
                <AlertTriangle size={64} className={isDarkMode ? 'text-gray-600' : 'text-gray-400'} />
              </div>
            </div>

            {/* Right Side - Item Details and Related Sections */}
            <div className="w-1/2 p-6 overflow-y-auto">
              <div className="space-y-6">
              {/* Item Details Section */}
              <div className={`border rounded ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <div className={`px-6 py-4 border-b ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>Category</span>
                    <span className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{item.category || 'EVENT'}</span>
                  </div>
                </div>
                
                <div className="px-6 py-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>Item Name</span>
                    <span className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{item.item_name}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>Quantity Alert</span>
                    <span className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{item.quantity_alert || 10}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>Item Description</span>
                    <span className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{item.item_description || item.item_name}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>Total Stock IN</span>
                    <span className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{totalStockIn}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>Total Stock Available</span>
                    <span className="text-green-400 font-bold text-lg">{totalStockAvailable}</span>
                  </div>
                </div>
              </div>

              {/* Related Inventory Logs */}
              <div className={`border rounded ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <div className={`px-6 py-4 border-b ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <span className={`font-medium text-lg ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>Related Inventory Logs</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      isDarkMode
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }`}>
                      {inventoryLogsCount}
                    </span>
                  </div>
                </div>
                
                {inventoryLogsData.length > 0 ? (
                  <div className={`divide-y ${
                    isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                  }`}>
                    {inventoryLogsData.map((log) => (
                      <div key={log.id} className={`px-6 py-4 flex items-center justify-between transition-colors group ${
                        isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'
                      }`}>
                        <div>
                          <div className={`font-medium ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            Log Entry #{log.id}
                          </div>
                          <div className={`text-sm ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {formatDate(log.date)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className={`p-2 rounded transition-colors ${
                            isDarkMode
                              ? 'text-gray-400 hover:text-white'
                              : 'text-gray-600 hover:text-gray-900'
                          }`} title="View Details">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button className={`p-2 rounded transition-colors ${
                            isDarkMode
                              ? 'text-gray-400 hover:text-red-400'
                              : 'text-gray-600 hover:text-red-600'
                          }`} title="Delete">
                            <Trash2 size={16} />
                          </button>
                          <button className={`p-2 rounded transition-colors ${
                            isDarkMode
                              ? 'text-gray-400 hover:text-white'
                              : 'text-gray-600 hover:text-gray-900'
                          }`} title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Footer with Expand and Add Item buttons */}
                    <div className={`px-6 py-3 border-t flex items-center justify-between ${
                      isDarkMode
                        ? 'bg-gray-750 border-gray-700'
                        : 'bg-gray-100 border-gray-200'
                    }`}>
                      <span className="text-red-500 text-sm cursor-pointer hover:underline">Expand</span>
                      <button 
                        className="px-3 py-1 rounded text-sm transition-colors text-white"
                        style={{
                          backgroundColor: colorPalette?.primary || '#ea580c'
                        }}
                        onMouseEnter={(e) => {
                          if (colorPalette?.accent) {
                            e.currentTarget.style.backgroundColor = colorPalette.accent;
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                        }}
                      >
                        Add Item
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`px-6 py-12 text-center ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    No items
                  </div>
                )}
              </div>

              {/* Related Borrowed Logs */}
              <div className={`border rounded ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <div className={`px-6 py-4 border-b ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <span className={`font-medium text-lg ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>Related Borrowed Logs</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      isDarkMode
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }`}>
                      {borrowedLogsCount}
                    </span>
                  </div>
                </div>
                <div className={`px-6 py-12 text-center ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  No items
                </div>
              </div>

              {/* Related Job Orders */}
              <div className={`border rounded ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <div className={`px-6 py-4 border-b ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <span className={`font-medium text-lg ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>Related Job Orders</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      isDarkMode
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }`}>
                      {jobOrdersCount}
                    </span>
                  </div>
                </div>
                <div className={`px-6 py-12 text-center ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  No items
                </div>
              </div>

              {/* Related Service Orders */}
              <div className={`border rounded ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <div className={`px-6 py-4 border-b ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <span className={`font-medium text-lg ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>Related Service Orders</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      isDarkMode
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }`}>
                      {serviceOrdersCount}
                    </span>
                  </div>
                </div>
                <div className={`px-6 py-12 text-center ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  No items
                </div>
              </div>

              {/* Related Defective Logs */}
              <div className={`border rounded ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <div className={`px-6 py-4 border-b ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <span className={`font-medium text-lg ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>Related Defective Logs</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      isDarkMode
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }`}>
                      {defectiveLogsCount}
                    </span>
                  </div>
                </div>
                <div className={`px-6 py-12 text-center ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  No items
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${
      isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
    }`}>
      {/* Header */}
      <div className={`flex items-center px-4 py-2 ${
        isDarkMode ? 'bg-gray-800' : 'bg-gray-100 border-b border-gray-200'
      }`}>
        <div className={`px-2 py-1 rounded text-sm uppercase font-medium mr-3 ${
          isDarkMode
            ? 'bg-gray-700 text-gray-300'
            : 'bg-gray-300 text-gray-700'
        }`}>
          {item.category || 'EVENT'}
        </div>
        <div className="flex-1 text-center">
          <h1 className={`text-lg font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{item.item_name}</h1>
        </div>
        <button 
          onClick={onClose}
          className={`transition-colors ml-3 ${
            isDarkMode
              ? 'text-gray-400 hover:text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <X size={20} />
        </button>
      </div>

      {/* Toolbar */}
      <div className={`px-4 py-2 border-b ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gray-100 border-gray-200'
      }`}>
        <div className="flex items-center justify-center space-x-1">
          <button 
            onClick={handleDelete}
            className={`p-2 rounded transition-colors ${
              isDarkMode
                ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                : 'text-gray-600 hover:text-red-600 hover:bg-gray-200'
            }`}
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
          <button className={`p-2 rounded transition-colors ${
            isDarkMode
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}>
            <X size={18} />
          </button>
          <button className={`p-2 rounded transition-colors ${
            isDarkMode
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}>
            <Printer size={18} />
          </button>
          <button className={`p-2 rounded transition-colors ${
            isDarkMode
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}>
            <Copy size={18} />
          </button>
          <button 
            onClick={handleEdit}
            className="px-3 py-1.5 rounded text-sm transition-colors flex items-center space-x-1 text-white"
            style={{
              backgroundColor: colorPalette?.primary || '#ea580c'
            }}
            onMouseEnter={(e) => {
              if (colorPalette?.accent) {
                e.currentTarget.style.backgroundColor = colorPalette.accent;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
            }}
          >
            <span>Edit</span>
          </button>
          <button className={`p-2 rounded transition-colors ${
            isDarkMode
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}>
            <ChevronLeft size={18} />
          </button>
          <button className={`p-2 rounded transition-colors ${
            isDarkMode
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}>
            <ChevronRightNav size={18} />
          </button>
          <button 
            onClick={handleExpand}
            className={`p-2 rounded transition-colors ${
              isDarkMode
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Expand to full view"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      {/* Main Image/Content Area */}
      <div className={`h-64 flex items-center justify-center border-b ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gray-100 border-gray-200'
      }`}>
        <div className="text-center">
          <AlertTriangle size={48} className={isDarkMode ? 'text-gray-600' : 'text-gray-400'} />
        </div>
      </div>

      {/* Item Details */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-4">
          {/* Category */}
          <div className="flex items-center justify-between py-2">
            <span className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>Category</span>
            <div className="flex items-center">
              <span className={`px-2 py-1 rounded text-sm uppercase font-medium ${
                isDarkMode
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-300 text-gray-700'
              }`}>
                {item.category || 'EVENT'}
              </span>
            </div>
          </div>

          {/* Item Name */}
          <div className="flex items-center justify-between py-2">
            <span className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>Item Name</span>
            <span className={`font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>{item.item_name}</span>
          </div>

          {/* Quantity Alert */}
          <div className="flex items-center justify-between py-2">
            <span className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>Quantity Alert</span>
            <span className={`font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>{item.quantity_alert || 10}</span>
          </div>

          {/* Item Description */}
          <div className="flex items-center justify-between py-2">
            <span className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>Item Description</span>
            <span className={`font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>{item.item_description || item.item_name}</span>
          </div>

          {/* Total Stock IN */}
          <div className="flex items-center justify-between py-2">
            <span className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>Total Stock IN</span>
            <span className={`font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>{totalStockIn}</span>
          </div>

          {/* Total Stock Available */}
          <div className="flex items-center justify-between py-2">
            <span className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>Total Stock Available</span>
            <span className="text-green-400 font-bold text-lg">{totalStockAvailable}</span>
          </div>
        </div>

        {/* Related Sections */}
        <div className={`border-t ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          {/* Related Inventory Logs */}
          <div className={`border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <button
              onClick={() => toggleSection('inventoryLogs')}
              className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
                isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={`font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Related Inventory Logs</span>
                <span className={`text-xs px-2 py-1 rounded min-w-[20px] text-center ${
                  isDarkMode
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}>
                  {inventoryLogsCount}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {expandedSections.inventoryLogs ? (
                  <ChevronDown size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                ) : (
                  <ChevronRight size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                )}
              </div>
            </button>

            {expandedSections.inventoryLogs && (
              <div className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                {inventoryLogsData.length > 0 ? (
                  <div>
                    {/* Table Header */}
                    <div className={`grid grid-cols-4 gap-4 px-6 py-3 text-sm font-medium ${
                      isDarkMode
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      <div className="flex items-center">
                        Date <ChevronDown size={14} className="ml-1" />
                      </div>
                      <div className="text-center">Item Quantity</div>
                      <div className="text-center">Requested By</div>
                      <div className="text-center">Requested With</div>
                    </div>
                    
                    {/* Table Row */}
                    {inventoryLogsData.map((log) => (
                      <div key={log.id} className={`grid grid-cols-4 gap-4 px-6 py-3 border-b last:border-b-0 ${
                        isDarkMode ? 'border-gray-700' : 'border-gray-200'
                      }`}>
                        <div className={`text-sm ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>{formatDate(log.date)}</div>
                        <div className={`text-sm text-center ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>{log.itemQuantity}</div>
                        <div className={`text-sm text-center ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>{log.requestedBy}</div>
                        <div className={`text-sm text-center ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>{log.requestedWith}</div>
                      </div>
                    ))}
                    
                    {/* Navigation */}
                    <div className={`px-6 py-2 flex items-center justify-between ${
                      isDarkMode ? 'bg-gray-750' : 'bg-gray-100'
                    }`}>
                      <button className={isDarkMode
                        ? 'p-1 text-gray-400 hover:text-white'
                        : 'p-1 text-gray-600 hover:text-gray-900'
                      }>
                        <ChevronLeft size={16} />
                      </button>
                      <div className={`flex-1 h-1 rounded mx-4 ${
                        isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                      }`}>
                        <div className={`h-full rounded ${
                          isDarkMode ? 'bg-gray-500' : 'bg-gray-400'
                        }`} style={{ width: '50%' }}></div>
                      </div>
                      <button className={isDarkMode
                        ? 'p-1 text-gray-400 hover:text-white'
                        : 'p-1 text-gray-600 hover:text-gray-900'
                      }>
                        <ChevronRightNav size={16} />
                      </button>
                    </div>
                    
                    <div className="px-6 py-2 text-right">
                      <button 
                        onClick={handleExpand}
                        className="text-red-500 text-sm cursor-pointer hover:underline bg-transparent border-none"
                      >
                        Expand
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`text-center py-8 ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    No items
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Related Borrowed Logs */}
          <div className={`border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <button
              onClick={() => toggleSection('borrowedLogs')}
              className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
                isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={`font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Related Borrowed Logs</span>
                <span className={`text-xs px-2 py-1 rounded min-w-[20px] text-center ${
                  isDarkMode
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}>
                  {borrowedLogsCount}
                </span>
              </div>
              {expandedSections.borrowedLogs ? (
                <ChevronDown size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
              ) : (
                <ChevronRight size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
              )}
            </button>

            {expandedSections.borrowedLogs && (
              <div className={`px-6 py-8 text-center ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`}>
                No items
              </div>
            )}
          </div>

          {/* Related Job Orders */}
          <div className={`border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <button
              onClick={() => toggleSection('jobOrders')}
              className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
                isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={`font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Related Job Orders</span>
                <span className={`text-xs px-2 py-1 rounded min-w-[20px] text-center ${
                  isDarkMode
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}>
                  {jobOrdersCount}
                </span>
              </div>
              {expandedSections.jobOrders ? (
                <ChevronDown size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
              ) : (
                <ChevronRight size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
              )}
            </button>

            {expandedSections.jobOrders && (
              <div className={`px-6 py-8 text-center ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`}>
                No items
              </div>
            )}
          </div>

          {/* Related Service Orders */}
          <div className={`border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <button
              onClick={() => toggleSection('serviceOrders')}
              className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
                isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={`font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Related Service Orders</span>
                <span className={`text-xs px-2 py-1 rounded min-w-[20px] text-center ${
                  isDarkMode
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}>
                  {serviceOrdersCount}
                </span>
              </div>
              {expandedSections.serviceOrders ? (
                <ChevronDown size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
              ) : (
                <ChevronRight size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
              )}
            </button>

            {expandedSections.serviceOrders && (
              <div className={`px-6 py-8 text-center ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`}>
                No items
              </div>
            )}
          </div>

          {/* Related Defective Logs */}
          <div>
            <button
              onClick={() => toggleSection('defectiveLogs')}
              className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
                isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={`font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Related Defective Logs</span>
                <span className={`text-xs px-2 py-1 rounded min-w-[20px] text-center ${
                  isDarkMode
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}>
                  {defectiveLogsCount}
                </span>
              </div>
              {expandedSections.defectiveLogs ? (
                <ChevronDown size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
              ) : (
                <ChevronRight size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
              )}
            </button>

            {expandedSections.defectiveLogs && (
              <div className={`px-6 py-8 text-center ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`}>
                No items
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDetails;