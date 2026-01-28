import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { AlertTriangle, Plus, Search, Package, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [addButtonHovered, setAddButtonHovered] = useState(false);
  const [retryButtonHovered, setRetryButtonHovered] = useState(false);

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
    const loadTheme = async () => {
      try {
        const theme = await AsyncStorage.getItem('theme');
        setIsDarkMode(theme !== 'light');
      } catch (err) {
        console.error('Failed to load theme:', err);
      }
    };

    loadTheme();
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
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.item_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiClient.delete<ApiResponse>(`/inventory/${encodeURIComponent(item.item_name)}`);
              const data = response.data;
              
              if (data.success) {
                Alert.alert('Success', 'Inventory item deleted successfully!');
                if (selectedItem?.item_name === item.item_name) {
                  setSelectedItem(null);
                }
                await fetchInventoryData();
              } else {
                Alert.alert('Error', 'Failed to delete inventory item: ' + data.message);
                console.error('Delete Error:', data);
              }
            } catch (error) {
              console.error('Error deleting inventory item:', error);
              Alert.alert('Error', 'Failed to delete inventory item: Network error');
            }
          }
        }
      ]
    );
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
        Alert.alert('Success', message);
        setShowInventoryForm(false);
        setEditingItem(null);
        await fetchInventoryData();
        await fetchCategories();
      } else {
        Alert.alert('Error', 'Failed to save inventory item: ' + data.message);
        console.error('Save Error:', data);
      }
    } catch (error) {
      console.error('Error saving inventory item:', error);
      Alert.alert('Error', 'Failed to save inventory item: Network error');
    }
  };

  if (loading) {
    return (
      <View style={{ 
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
      }}>
        <View style={{ alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#ea580c" style={{ marginBottom: 16 }} />
          <Text style={{ 
            fontSize: 18,
            color: isDarkMode ? '#ffffff' : '#111827'
          }}>
            Loading inventory...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ 
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
      }}>
        <View style={{ alignItems: 'center' }}>
          <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <Text style={{ 
            fontSize: 18,
            marginBottom: 8,
            color: isDarkMode ? '#ffffff' : '#111827'
          }}>
            Error Loading Inventory
          </Text>
          <Text style={{ 
            marginBottom: 16,
            color: isDarkMode ? '#9ca3af' : '#6b7280'
          }}>
            {error}
          </Text>
          <Pressable 
            onPress={fetchInventoryData}
            onPressIn={() => setRetryButtonHovered(true)}
            onPressOut={() => setRetryButtonHovered(false)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 4,
              backgroundColor: retryButtonHovered && colorPalette?.accent
                ? colorPalette.accent
                : colorPalette?.primary || '#ea580c'
            }}
          >
            <Text style={{ color: '#ffffff' }}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ 
      backgroundColor: isDarkMode ? '#030712' : '#f9fafb',
      height: '100%',
      flexDirection: 'row',
      overflow: 'hidden'
    }}>
      <View style={{ 
        width: 256,
        borderRightWidth: 1,
        flexShrink: 0,
        flexDirection: 'column',
        backgroundColor: isDarkMode ? '#111827' : '#ffffff',
        borderRightColor: isDarkMode ? '#374151' : '#e5e7eb'
      }}>
        <View style={{ 
          padding: 16,
          borderBottomWidth: 1,
          flexShrink: 0,
          borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Package size={20} color={isDarkMode ? '#ffffff' : '#111827'} style={{ marginRight: 8 }} />
            <Text style={{ 
              fontSize: 18,
              fontWeight: '600',
              color: isDarkMode ? '#ffffff' : '#111827'
            }}>
              Inventory
            </Text>
          </View>
        </View>
        
        <ScrollView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'column' }}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 14,
                  backgroundColor: selectedCategory === category.id
                    ? (colorPalette?.primary ? `${colorPalette.primary}33` : 'rgba(249, 115, 22, 0.2)')
                    : 'transparent',
                  borderRightWidth: selectedCategory === category.id ? 2 : 0,
                  borderRightColor: colorPalette?.primary || '#ea580c'
                }}
              >
                <Text style={{ 
                  textTransform: 'uppercase',
                  fontWeight: '500',
                  fontSize: 14,
                  color: selectedCategory === category.id 
                    ? (colorPalette?.primary || '#fb923c')
                    : (isDarkMode ? '#d1d5db' : '#374151')
                }}>
                  {category.name}
                </Text>
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 9999,
                  fontSize: 12,
                  backgroundColor: selectedCategory === category.id
                    ? (colorPalette?.primary || '#ea580c')
                    : (isDarkMode ? '#374151' : '#e5e7eb')
                }}>
                  <Text style={{ 
                    color: selectedCategory === category.id 
                      ? '#ffffff'
                      : (isDarkMode ? '#d1d5db' : '#374151')
                  }}>
                    {category.count}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={{ 
        flex: 1,
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#111827' : '#ffffff'
      }}>
        <View style={{ flexDirection: 'column', height: '100%' }}>
          <View style={{ 
            padding: 16,
            borderBottomWidth: 1,
            flexShrink: 0,
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ position: 'relative', flex: 1 }}>
                <TextInput
                  placeholder="Search inventory..."
                  placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                  value={searchQuery}
                  onChangeText={(text) => setSearchQuery(text)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  style={{
                    width: '100%',
                    borderRadius: 4,
                    paddingLeft: 40,
                    paddingRight: 16,
                    paddingVertical: 8,
                    borderWidth: 1,
                    backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
                    color: isDarkMode ? '#ffffff' : '#111827',
                    borderColor: searchFocused && colorPalette?.primary
                      ? colorPalette.primary
                      : isDarkMode ? '#374151' : '#d1d5db'
                  }}
                />
                <View style={{ position: 'absolute', left: 12, top: 10 }}>
                  <Search size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                </View>
              </View>
              <Pressable 
                onPress={handleAddItem}
                onPressIn={() => setAddButtonHovered(true)}
                onPressOut={() => setAddButtonHovered(false)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 4,
                  fontSize: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: addButtonHovered && colorPalette?.accent
                    ? colorPalette.accent
                    : colorPalette?.primary || '#ea580c'
                }}
              >
                <Plus size={16} color="#ffffff" />
                <Text style={{ color: '#ffffff' }}>Add Item</Text>
              </Pressable>
            </View>
          </View>
          
          <ScrollView style={{ flex: 1 }}>
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => (
                <Pressable 
                  key={item.item_name + index}
                  onPress={() => handleItemClick(item)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: selectedItem?.item_name === item.item_name
                      ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                      : pressed
                        ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                        : 'transparent',
                    borderRightWidth: selectedItem?.item_name === item.item_name ? 2 : 0,
                    borderRightColor: '#ea580c'
                  })}
                >
                  <View>
                    <Text style={{ 
                      fontWeight: '500',
                      fontSize: 16,
                      color: isDarkMode ? '#ffffff' : '#111827'
                    }}>
                      {item.item_name}
                    </Text>
                    {item.modified_date && (
                      <Text style={{ 
                        fontSize: 14,
                        marginTop: 4,
                        color: isDarkMode ? '#9ca3af' : '#6b7280'
                      }}>
                        {new Date(item.modified_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true
                        })}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable 
                      onPress={(e) => {
                        e.stopPropagation();
                        handleItemClick(item);
                      }}
                      style={{ padding: 8, borderRadius: 4 }}
                    >
                      <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>👁️</Text>
                    </Pressable>
                    <Pressable 
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item);
                      }}
                      style={{ padding: 8, borderRadius: 4 }}
                    >
                      <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>🗑️</Text>
                    </Pressable>
                    <Pressable 
                      onPress={(e) => {
                        e.stopPropagation();
                        handleEditItem(item);
                      }}
                      style={{ padding: 8, borderRadius: 4 }}
                    >
                      <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>✏️</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={{ 
                padding: 48,
                alignItems: 'center'
              }}>
                <Package size={48} color={isDarkMode ? '#6b7280' : '#9ca3af'} style={{ marginBottom: 16 }} />
                <Text style={{ 
                  fontSize: 18,
                  marginBottom: 8,
                  color: isDarkMode ? '#9ca3af' : '#6b7280'
                }}>
                  {selectedCategory === '' ? 'Select a category to view items' : 'No items found'}
                </Text>
                <Text style={{ 
                  fontSize: 14,
                  color: isDarkMode ? '#9ca3af' : '#6b7280'
                }}>
                  {selectedCategory === '' 
                    ? 'Choose a category from the sidebar to see inventory items'
                    : inventoryItems.length === 0 
                      ? 'Start by adding some inventory items' 
                      : 'Try adjusting your search or category filter'
                  }
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {selectedItem && (
        <View style={{ flexShrink: 0, overflow: 'hidden' }}>
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
        </View>
      )}

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
    </View>
  );
};

export default Inventory;
