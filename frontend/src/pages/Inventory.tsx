import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Search, Package, X } from 'lucide-react';
import InventoryFormModal from '../modals/InventoryFormModal';
import InventoryDetails from '../components/InventoryDetails';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import apiClient from '../config/api';

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

interface Category {
  id: string;
  name: string;
  count: number;
}

interface InventoryFormData {
  itemName: string;
  itemDescription: string;
  supplier: string;
  quantityAlert: number;
  image: File | null;
  modifiedBy: string;
  modifiedDate: string;
  userEmail: string;
  category: string;
  totalStockAvailable: number;
  totalStockIn: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

const Inventory: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dbCategories, setDbCategories] = useState<{ id: number; name: string }[]>([]);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

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
    const observer = new MutationObserver(() => {
      const theme = localStorage.getItem('theme');
      setIsDarkMode(theme !== 'light');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const theme = localStorage.getItem('theme');
    setIsDarkMode(theme !== 'light');

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetchInventoryData();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (dbCategories.length > 0) {
      const categoriesWithCount: Category[] = [
        {
          id: 'all',
          name: 'ALL',
          count: inventoryItems.length
        },
        ...dbCategories.map((cat) => {
          const categoryId = cat.name.toLowerCase().replace(/\s+/g, '-');
          const count = inventoryItems.filter(item => {
            const itemCategory = (item.category || '').toLowerCase().replace(/\s+/g, '-');
            return itemCategory === categoryId;
          }).length;
          return {
            id: categoryId,
            name: cat.name,
            count
          };
        })
      ];
      setCategories(categoriesWithCount);
    }
  }, [inventoryItems, dbCategories]);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<ApiResponse<InventoryItem[]>>('/inventory');
      const data = response.data;
      
      if (data.success) {
        setInventoryItems(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch inventory data');
        console.error('API Error:', data);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get<ApiResponse<{ id: number; name: string }[]>>('/inventory-categories');
      const data = response.data;
      
      if (data.success) {
        setDbCategories(data.data || []);
      } else {
        console.error('Failed to fetch categories:', data.message);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredItems = selectedCategory === '' ? [] : inventoryItems.filter(item => {
    const itemCategory = (item.category || '').toLowerCase().replace(/\s+/g, '-');
    const matchesCategory = selectedCategory === 'all' || itemCategory === selectedCategory;
    
    const matchesSearch = searchQuery === '' || 
                         item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.item_description && item.item_description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const handleItemClick = (item: InventoryItem) => {
    setSelectedItem(item);
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setShowInventoryForm(true);
  };

  const getSelectedCategoryName = (): string => {
    if (selectedCategory === 'all' || selectedCategory === '') {
      return '';
    }
    const category = categories.find(cat => cat.id === selectedCategory);
    return category ? category.name : '';
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setShowInventoryForm(true);
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    try {
      const response = await apiClient.delete<ApiResponse>(`/inventory/${encodeURIComponent(item.item_name)}`);
      const data = response.data;
      
      if (data.success) {
        alert('Inventory item deleted successfully!');
        if (selectedItem?.item_name === item.item_name) {
          setSelectedItem(null);
        }
        await fetchInventoryData();
      } else {
        alert('Failed to delete inventory item: ' + data.message);
        console.error('Delete Error:', data);
      }
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      alert('Failed to delete inventory item: Network error');
    }
  };

  const handleSaveInventoryItem = async (formData: InventoryFormData) => {
    try {
      console.log('Saving inventory item:', formData);
      
      const isEditing = editingItem !== null;
      const payload = {
        item_name: formData.itemName,
        item_description: formData.itemDescription,
        supplier: formData.supplier,
        quantity_alert: formData.quantityAlert,
        category: formData.category,
        item_id: null,
        image: '',
      };
      
      const response = isEditing
        ? await apiClient.put<ApiResponse>(`/inventory/${encodeURIComponent(editingItem.item_name)}`, payload)
        : await apiClient.post<ApiResponse>('/inventory', payload);

      const data = response.data;
      
      if (data.success) {
        const message = isEditing ? 'Inventory item updated successfully!' : 'Inventory item added successfully!';
        alert(message);
        setShowInventoryForm(false);
        setEditingItem(null);
        await fetchInventoryData();
        await fetchCategories();
      } else {
        alert('Failed to save inventory item: ' + data.message);
        console.error('Save Error:', data);
      }
    } catch (error) {
      console.error('Error saving inventory item:', error);
      alert('Failed to save inventory item: Network error');
    }
  };

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${
        isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
          <div className={`text-lg ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Loading inventory...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-full flex items-center justify-center ${
        isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4 mx-auto" />
          <div className={`text-lg mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Error Loading Inventory</div>
          <div className={`mb-4 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>{error}</div>
          <button 
            onClick={fetchInventoryData}
            className="text-white px-4 py-2 rounded transition-colors"
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
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${
      isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
    } h-full flex flex-col md:flex-row overflow-hidden`}>
      {/* Category Sidebar - Desktop Only */}
      <div className={`hidden md:flex md:w-64 md:border-r flex-shrink-0 flex-col order-1 ${
        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className={`p-4 border-b flex-shrink-0 ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold flex items-center ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <Package className="mr-2" size={20} />
            Inventory
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                  isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
                style={selectedCategory === category.id ? {
                  backgroundColor: colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)',
                  color: colorPalette?.primary || '#fb923c',
                  fontWeight: 500,
                  borderRight: '2px solid',
                  borderRightColor: colorPalette?.primary || '#ea580c'
                } : {
                  color: isDarkMode ? '#d1d5db' : '#374151'
                }}
              >
                <span className="uppercase font-medium text-xs md:text-sm whitespace-nowrap">{category.name}</span>
                <span
                  className="px-2 py-1 rounded-full text-xs"
                  style={selectedCategory === category.id ? {
                    backgroundColor: colorPalette?.primary || '#ea580c',
                    color: 'white'
                  } : {
                    backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                    color: isDarkMode ? '#d1d5db' : '#374151'
                  }}
                >
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 overflow-hidden order-2 pb-16 md:pb-0 ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="flex flex-col h-full">
          {/* Search Bar */}
          <div className={`p-4 border-b flex-shrink-0 ${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search inventory..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full rounded pl-10 pr-4 py-2 border focus:outline-none ${
                    isDarkMode 
                      ? 'bg-gray-800 text-white border-gray-700' 
                      : 'bg-gray-100 text-gray-900 border-gray-300'
                  }`}
                  onFocus={(e) => {
                    if (colorPalette?.primary) {
                      e.currentTarget.style.borderColor = colorPalette.primary;
                      e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <Search className={`absolute left-3 top-2.5 h-4 w-4 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </div>
              <button 
                className="text-white px-4 py-2 rounded text-sm flex items-center space-x-2 transition-colors"
                onClick={handleAddItem}
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
                <Plus size={16} />
                <span className="hidden sm:inline">Add Item</span>
              </button>
            </div>
          </div>
          
          {/* Items List */}
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-gray-700">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, index) => (
                  <div 
                    key={item.item_name + index} 
                    className={`px-6 py-4 flex items-center justify-between transition-colors cursor-pointer group ${
                      isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                    } ${
                      selectedItem?.item_name === item.item_name 
                        ? isDarkMode ? 'bg-gray-800 border-r-2 border-orange-500' : 'bg-gray-100 border-r-2 border-orange-500' 
                        : ''
                    }`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div>
                      <div className={`font-medium text-base ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {item.item_name}
                      </div>
                      {item.modified_date && (
                        <div className={`text-sm mt-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {new Date(item.modified_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        className={`p-2 rounded transition-colors ${
                          isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                        }`} 
                        title="View Details"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button 
                        className={`p-2 rounded transition-colors ${
                          isDarkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-600 hover:text-red-600'
                        }`} 
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item);
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <button 
                        className="p-2 text-gray-400 hover:text-white rounded transition-colors" 
                        title="Edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditItem(item);
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`p-12 text-center ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <Package size={48} className="mx-auto mb-4 text-gray-600" />
                  <div className="text-lg mb-2">
                    {selectedCategory === '' ? 'Select a category to view items' : 'No items found'}
                  </div>
                  <div className="text-sm">
                    {selectedCategory === '' 
                      ? 'Choose a category from the sidebar to see inventory items'
                      : inventoryItems.length === 0 
                        ? 'Start by adding some inventory items' 
                        : 'Try adjusting your search or category filter'
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 border-t z-40 ${
        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex overflow-x-auto hide-scrollbar">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex-shrink-0 flex flex-col items-center justify-center px-4 py-2 text-xs transition-colors ${
                selectedCategory === category.id
                  ? ''
                  : 'text-gray-300'
              }`}
              style={selectedCategory === category.id ? {
                backgroundColor: colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)',
                color: colorPalette?.primary || '#fb923c'
              } : {}}
            >
              <Package className="h-5 w-5 mb-1" />
              <span className="capitalize whitespace-nowrap">{category.name}</span>
              {category.count > 0 && (
                <span className="mt-1 px-2 py-0.5 rounded-full text-xs"
                  style={selectedCategory === category.id ? {
                    backgroundColor: colorPalette?.primary || '#ea580c',
                    color: 'white'
                  } : {
                    backgroundColor: '#374151',
                    color: '#d1d5db'
                  }}>
                  {category.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Details Panel */}
      {selectedItem && (
        <div className="flex-shrink-0 overflow-hidden order-3">
          <InventoryDetails
            item={selectedItem}
            inventoryLogs={[]}
            borrowedLogs={[]}
            jobOrders={[]}
            serviceOrders={[]}
            defectiveLogs={[]}
            totalStockIn={0}
            totalStockAvailable={0}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onClose={handleCloseDetails}
          />
        </div>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Inventory Form Modal */}
      <InventoryFormModal
        isOpen={showInventoryForm}
        onClose={() => {
          setShowInventoryForm(false);
          setEditingItem(null);
        }}
        onSave={handleSaveInventoryItem}
        initialCategory={getSelectedCategoryName()}
        editData={editingItem ? {
          itemName: editingItem.item_name,
          itemDescription: editingItem.item_description || '',
          supplier: editingItem.supplier || '',
          quantityAlert: editingItem.quantity_alert || 0,
          image: null,
          modifiedBy: editingItem.modified_by || 'ravenampere0123@gmail.com',
          modifiedDate: editingItem.modified_date || new Date().toISOString().slice(0, 16),
          userEmail: editingItem.user_email || 'ravenampere0123@gmail.com',
          category: editingItem.category || '',
          totalStockAvailable: 0,
          totalStockIn: 0
        } : null}
      />
    </div>
  );
};

export default Inventory;
