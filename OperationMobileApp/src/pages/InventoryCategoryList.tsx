import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Search, Plus, Eye, Edit, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AddInventoryCategoryModal from '../modals/AddInventoryCategoryModal';
import { 
  getInventoryCategories, 
  createInventoryCategory, 
  deleteInventoryCategory,
  InventoryCategory 
} from '../services/inventoryCategoryService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

const InventoryCategoryList: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getInventoryCategories();
      setCategories(data);
      
    } catch (error) {
      console.error('Error fetching inventory categories:', error);
      setError('Failed to fetch inventory categories');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleView = (category: InventoryCategory) => {
    console.log('View category:', category);
  };

  const handleEdit = (category: InventoryCategory) => {
    console.log('Edit category:', category);
  };

  const handleDelete = async (category: InventoryCategory) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete the category "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInventoryCategory(category.id);
              setCategories(prev => prev.filter(c => c.id !== category.id));
              console.log('Category deleted:', category);
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Error', 'Failed to delete category. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleAddCategory = async (categoryData: { name: string; modified_by?: string }) => {
    try {
      const newCategory = await createInventoryCategory(categoryData);
      setCategories(prev => [newCategory, ...prev]);
      console.log('Category added:', newCategory);
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to add category. Please try again.');
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return 'N/A';
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
            Loading categories...
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
          <Text style={{ 
            fontSize: 18,
            marginBottom: 8,
            color: isDarkMode ? '#ffffff' : '#111827'
          }}>
            Error Loading Categories
          </Text>
          <Text style={{ 
            marginBottom: 16,
            color: isDarkMode ? '#9ca3af' : '#6b7280'
          }}>
            {error}
          </Text>
          <Pressable 
            onPress={fetchCategories}
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
      height: '100%',
      flexDirection: 'column',
      backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
    }}>
      <View style={{ 
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        flexShrink: 0,
        backgroundColor: isDarkMode ? '#111827' : '#ffffff',
        borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ 
            fontSize: 24,
            fontWeight: 'bold',
            color: isDarkMode ? '#ffffff' : '#111827'
          }}>
            Inventory Category List
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>☰</Text>
            </Pressable>
            <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>⚙️</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={{ 
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        flexShrink: 0,
        backgroundColor: isDarkMode ? '#111827' : '#ffffff',
        borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ position: 'relative', flex: 1, maxWidth: 448 }}>
            <TextInput
              placeholder="Search Inventory Category List"
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
                  : isDarkMode ? '#4b5563' : '#d1d5db'
              }}
            />
            <View style={{ position: 'absolute', left: 12, top: 10 }}>
              <Search size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
            </View>
          </View>
          <Pressable 
            onPress={() => setIsAddModalOpen(true)}
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
              marginLeft: 16,
              backgroundColor: addButtonHovered && colorPalette?.accent
                ? colorPalette.accent
                : colorPalette?.primary || '#ea580c'
            }}
          >
            <Plus size={16} color="#ffffff" />
            <Text style={{ color: '#ffffff' }}>Add</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {filteredCategories.length > 0 ? (
          <View>
            {filteredCategories.map((category) => (
              <Pressable
                key={category.id}
                style={({ pressed }) => ({
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: pressed 
                    ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                    : 'transparent'
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    fontWeight: '500',
                    fontSize: 18,
                    color: isDarkMode ? '#ffffff' : '#111827'
                  }}>
                    {category.name}
                  </Text>
                  {(category.modified_date || category.updated_at) && (
                    <Text style={{ 
                      fontSize: 14,
                      marginTop: 4,
                      color: isDarkMode ? '#9ca3af' : '#6b7280'
                    }}>
                      {formatDateTime(category.modified_date || category.updated_at || '')}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    onPress={() => handleView(category)}
                    style={({ pressed }) => ({
                      padding: 8,
                      borderRadius: 4,
                      backgroundColor: pressed 
                        ? (isDarkMode ? '#1e3a8a' : '#dbeafe')
                        : 'transparent'
                    })}
                  >
                    <Eye size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleEdit(category)}
                    style={({ pressed }) => ({
                      padding: 8,
                      borderRadius: 4,
                      backgroundColor: pressed 
                        ? (isDarkMode ? '#14532d' : '#dcfce7')
                        : 'transparent'
                    })}
                  >
                    <Edit size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(category)}
                    style={({ pressed }) => ({
                      padding: 8,
                      borderRadius: 4,
                      backgroundColor: pressed 
                        ? (isDarkMode ? '#7f1d1d' : '#fee2e2')
                        : 'transparent'
                    })}
                  >
                    <Trash2 size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={{ 
            padding: 48,
            alignItems: 'center'
          }}>
            <Text style={{ 
              fontSize: 18,
              marginBottom: 8,
              color: isDarkMode ? '#9ca3af' : '#6b7280'
            }}>
              No categories found
            </Text>
            <Text style={{ 
              fontSize: 14,
              color: isDarkMode ? '#9ca3af' : '#6b7280'
            }}>
              {categories.length === 0 
                ? 'Start by adding some inventory categories' 
                : 'Try adjusting your search filter'
              }
            </Text>
          </View>
        )}
      </ScrollView>

      <AddInventoryCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddCategory}
      />
    </View>
  );
};

export default InventoryCategoryList;
