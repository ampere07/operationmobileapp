import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Search, Plus, Edit2, Trash2, Loader2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { concernService, Concern } from '../services/concernService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import EditConcernModal from '../modals/EditConcernModal';

interface ConcernFormData {
  name: string;
}

const ConcernConfig: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Concern | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingItems, setDeletingItems] = useState<Set<number>>(new Set());
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
    loadConcerns();
  }, []);

  const loadConcerns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await concernService.getAllConcerns();
      setConcerns(data);
    } catch (error) {
      console.error('Error loading concerns:', error);
      setError('Failed to load concerns. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (item: Concern, event: any) => {
    Alert.alert(
      '⚠️ PERMANENT DELETE WARNING ⚠️',
      `Are you sure you want to permanently delete "${item.concern_name}"?\n\nThis action CANNOT BE UNDONE!\n\nClick OK to permanently delete, or Cancel to keep the item.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'OK',
          onPress: async () => {
            setDeletingItems(prev => {
              const newSet = new Set(prev);
              newSet.add(item.id);
              return newSet;
            });
            
            try {
              await concernService.deleteConcern(item.id);
              await loadConcerns();
            } catch (error) {
              console.error('Error deleting concern:', error);
              Alert.alert('Error', 'Failed to delete concern: ' + (error instanceof Error ? error.message : 'Unknown error'));
            } finally {
              setDeletingItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(item.id);
                return newSet;
              });
            }
          }
        }
      ]
    );
  };

  const handleEdit = (item: Concern, event: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleSave = async (formData: ConcernFormData) => {
    try {
      if (editingItem) {
        await concernService.updateConcern(editingItem.id, formData.name.trim());
      } else {
        await concernService.createConcern(formData.name.trim());
      }
      await loadConcerns();
    } catch (error) {
      console.error('Error submitting form:', error);
      throw error;
    }
  };

  const filteredConcerns = concerns.filter(item => {
    if (!searchQuery) return true;
    return item.concern_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <View style={{ 
      backgroundColor: isDarkMode ? '#030712' : '#f9fafb',
      height: '100%',
      flexDirection: 'row',
      overflow: 'hidden'
    }}>
      <View style={{ 
        backgroundColor: isDarkMode ? '#111827' : '#ffffff',
        overflow: 'hidden',
        flex: 1
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
                  placeholder="Search Concerns"
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
                    backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
                    color: isDarkMode ? '#ffffff' : '#111827',
                    borderWidth: 1,
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
                onPress={handleAddNew}
                onPressIn={() => setAddButtonHovered(true)}
                onPressOut={() => setAddButtonHovered(false)}
                style={{
                  backgroundColor: addButtonHovered && colorPalette?.accent 
                    ? colorPalette.accent 
                    : colorPalette?.primary || '#ea580c',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 4,
                  fontSize: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Plus size={16} color="#ffffff" />
                <Text style={{ color: '#ffffff' }}>Add</Text>
              </Pressable>
            </View>
          </View>
          
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <ScrollView style={{ height: '100%' }}>
              {isLoading ? (
                <View style={{ 
                  paddingHorizontal: 16,
                  paddingVertical: 48,
                  alignItems: 'center'
                }}>
                  <ActivityIndicator size="large" color={colorPalette?.primary || '#ea580c'} />
                  <Text style={{ 
                    marginTop: 16,
                    color: isDarkMode ? '#9ca3af' : '#6b7280'
                  }}>
                    Loading concerns...
                  </Text>
                </View>
              ) : error ? (
                <View style={{ 
                  paddingHorizontal: 16,
                  paddingVertical: 48,
                  alignItems: 'center'
                }}>
                  <Text style={{ color: '#f87171' }}>{error}</Text>
                  <Pressable 
                    onPress={() => loadConcerns()}
                    onPressIn={() => setRetryButtonHovered(true)}
                    onPressOut={() => setRetryButtonHovered(false)}
                    style={{
                      marginTop: 16,
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
              ) : filteredConcerns.length > 0 ? (
                <View>
                  {filteredConcerns.map((item) => (
                    <View
                      key={item.id}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb'
                      }}
                    >
                      <View style={{ 
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between'
                      }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ 
                            fontWeight: '500',
                            fontSize: 14,
                            marginBottom: 4,
                            textTransform: 'uppercase',
                            color: isDarkMode ? '#ffffff' : '#111827'
                          }}>
                            {item.concern_name}
                          </Text>
                        </View>
                        <View style={{ 
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          marginLeft: 16,
                          flexShrink: 0
                        }}>
                          <Pressable
                            onPress={(e) => handleEdit(item, e)}
                            style={({ pressed }) => ({
                              padding: 6,
                              borderRadius: 4,
                              backgroundColor: pressed 
                                ? (isDarkMode ? '#374151' : '#e5e7eb')
                                : 'transparent'
                            })}
                          >
                            <Edit2 
                              size={16} 
                              color={isDarkMode ? '#9ca3af' : '#6b7280'} 
                            />
                          </Pressable>
                          <Pressable
                            onPress={(e) => handleDelete(item, e)}
                            disabled={deletingItems.has(item.id)}
                            style={({ pressed }) => ({
                              padding: 6,
                              borderRadius: 4,
                              backgroundColor: pressed 
                                ? (isDarkMode ? '#374151' : '#e5e7eb')
                                : 'transparent',
                              opacity: deletingItems.has(item.id) ? 0.5 : 1
                            })}
                          >
                            {deletingItems.has(item.id) ? (
                              <ActivityIndicator size={16} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
                            ) : (
                              <Trash2 
                                size={16} 
                                color={isDarkMode ? '#9ca3af' : '#6b7280'} 
                              />
                            )}
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ 
                  alignItems: 'center',
                  paddingVertical: 48
                }}>
                  <Text style={{ 
                    color: isDarkMode ? '#9ca3af' : '#6b7280'
                  }}>
                    No concerns found
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>

      <EditConcernModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
        concernItem={editingItem}
      />
    </View>
  );
};

export default ConcernConfig;
