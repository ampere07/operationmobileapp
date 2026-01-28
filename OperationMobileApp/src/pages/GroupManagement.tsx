import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Group } from '../types/api';
import { groupService } from '../services/userService';
import Breadcrumb from './Breadcrumb';
import AddNewGroupForm from '../components/AddNewGroupForm';
import EditGroupForm from '../components/EditGroupForm';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

const GroupManagement: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [addButtonHovered, setAddButtonHovered] = useState(false);
  const [selectFocused, setSelectFocused] = useState(false);

  useEffect(() => {
    loadGroups();
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
    const loadTheme = async () => {
      try {
        const theme = await AsyncStorage.getItem('theme');
        setIsDarkMode(theme === 'dark');
      } catch (err) {
        console.error('Failed to load theme:', err);
      }
    };
    
    loadTheme();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const response = await groupService.getAllGroups();
      
      if (response.success && response.data) {
        setGroups(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.company_name && group.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (group.email && group.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalItems = filteredGroups.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentGroups = filteredGroups.slice(startIndex, endIndex);
  const showingStart = totalItems === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(endIndex, totalItems);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleAddNew = () => {
    setShowAddForm(true);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
  };

  const handleGroupCreated = (newGroup: Group) => {
    if (!newGroup) {
      console.error('Received invalid Affiliate from creation');
      return;
    }
    
    console.log('Affiliate created successfully:', newGroup);
    setGroups(prev => [...prev, newGroup]);
    setShowAddForm(false);
  };

  const handleEdit = (group: Group) => {
    if (!group) {
      console.error('Cannot edit Affiliate: No Affiliate data');
      return;
    }
    
    setEditingGroup(group);
  };

  const handleCancelEdit = () => {
    setEditingGroup(null);
  };

  const handleGroupUpdated = (updatedGroup: Group) => {
    setGroups(prev => prev.map(group => 
      group.group_id === updatedGroup.group_id ? updatedGroup : group
    ));
    setEditingGroup(null);
  };

  const handleDeleteClick = (group: Group) => {
    setDeletingGroup(group);
  };

  const handleCancelDelete = () => {
    setDeletingGroup(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingGroup) return;

    try {
      const response = await groupService.deleteGroup(deletingGroup.group_id);
      
      if (response.success) {
        setGroups(prev => prev.filter(group => group.group_id !== deletingGroup.group_id));
        setDeletingGroup(null);
      }
    } catch (error: any) {
      console.error('Failed to delete Affiliate:', error);
    }
  };

  if (showAddForm) {
    return <AddNewGroupForm onCancel={handleCancelAdd} onGroupCreated={handleGroupCreated} />;
  }

  if (editingGroup) {
    return <EditGroupForm group={editingGroup} onCancel={handleCancelEdit} onGroupUpdated={handleGroupUpdated} />;
  }

  return (
    <View style={{ padding: 24 }}>
      <Breadcrumb items={[
        { label: 'Affiliates' }
      ]} />
      <View style={{ 
        borderRadius: 8,
        borderWidth: 1,
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: isDarkMode ? '#4b5563' : '#d1d5db'
      }}>
        <View style={{ padding: 24 }}>
          <View style={{ marginBottom: 32 }}>
            <Text style={{ 
              fontSize: 24,
              fontWeight: '600',
              marginBottom: 8,
              color: isDarkMode ? '#ffffff' : '#111827'
            }}>
              Affiliate Management
            </Text>
            <Text style={{ 
              fontSize: 14,
              color: isDarkMode ? '#9ca3af' : '#6b7280'
            }}>
              Manage user Affiliate and their settings
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <TextInput
              placeholder="Search Affiliates by name, company, or email..."
              placeholderTextColor="#6b7280"
              value={searchTerm}
              onChangeText={(text) => setSearchTerm(text)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderWidth: 1,
                borderRadius: 4,
                flex: 1,
                maxWidth: 320,
                backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                borderColor: searchFocused && colorPalette?.primary
                  ? colorPalette.primary
                  : isDarkMode ? '#4b5563' : '#d1d5db',
                color: isDarkMode ? '#ffffff' : '#111827'
              }}
            />
            <Pressable 
              onPress={handleAddNew}
              onPressIn={() => setAddButtonHovered(true)}
              onPressOut={() => setAddButtonHovered(false)}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 4,
                backgroundColor: addButtonHovered && colorPalette?.accent
                  ? colorPalette.accent
                  : colorPalette?.primary || '#3b82f6'
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '500' }}>
                Add New Affiliate
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <ActivityIndicator size="large" color={colorPalette?.primary || '#3b82f6'} />
              <Text style={{ 
                marginTop: 16,
                color: isDarkMode ? '#9ca3af' : '#6b7280'
              }}>
                Loading Affiliates...
              </Text>
            </View>
          ) : (
            <>
              <View style={{ 
                borderRadius: 4,
                borderWidth: 1,
                overflow: 'hidden',
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                borderColor: isDarkMode ? '#4b5563' : '#d1d5db'
              }}>
                <ScrollView horizontal>
                  <View>
                    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#4b5563' : '#d1d5db' }}>
                      <View style={{ paddingHorizontal: 16, paddingVertical: 16, width: 200 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#d1d5db' : '#374151' }}>
                          Affiliate Name
                        </Text>
                      </View>
                      <View style={{ paddingHorizontal: 16, paddingVertical: 16, width: 200 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#d1d5db' : '#374151' }}>
                          Company Name
                        </Text>
                      </View>
                      <View style={{ paddingHorizontal: 16, paddingVertical: 16, width: 200 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#d1d5db' : '#374151' }}>
                          Email
                        </Text>
                      </View>
                      <View style={{ paddingHorizontal: 16, paddingVertical: 16, width: 150 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#d1d5db' : '#374151' }}>
                          Hotline
                        </Text>
                      </View>
                      <View style={{ paddingHorizontal: 16, paddingVertical: 16, width: 150 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#d1d5db' : '#374151' }}>
                          Modified Date
                        </Text>
                      </View>
                      <View style={{ paddingHorizontal: 16, paddingVertical: 16, width: 120 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#d1d5db' : '#374151' }}>
                          Actions
                        </Text>
                      </View>
                    </View>
                    
                    {currentGroups.length === 0 ? (
                      <View style={{ paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center' }}>
                        <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                          No Affiliate found
                        </Text>
                      </View>
                    ) : (
                      currentGroups.map((group: Group) => (
                        <Pressable 
                          key={group.group_id}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            borderBottomWidth: 1,
                            borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
                            backgroundColor: pressed ? (isDarkMode ? '#374151' : '#f9fafb') : 'transparent'
                          })}
                        >
                          <View style={{ paddingHorizontal: 16, paddingVertical: 16, width: 200 }}>
                            <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#ffffff' : '#111827' }}>
                              {group.group_name}
                            </Text>
                          </View>
                          <View style={{ paddingHorizontal: 16, paddingVertical: 16, width: 200 }}>
                            <Text style={{ fontSize: 14, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                              {group.company_name || '-'}
                            </Text>
                          </View>
                          <View style={{ paddingHorizontal: 16, paddingVertical: 16, width: 200 }}>
                            <Text style={{ fontSize: 14, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                              {group.email || '-'}
                            </Text>
                          </View>
                          <View style={{ paddingHorizontal: 16, paddingVertical: 16, width: 150 }}>
                            <Text style={{ fontSize: 14, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                              {group.hotline || '-'}
                            </Text>
                          </View>
                          <View style={{ paddingHorizontal: 16, paddingVertical: 16, width: 150 }}>
                            <Text style={{ fontSize: 14, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                              {group.modified_date ? new Date(group.modified_date).toLocaleDateString() : '-'}
                            </Text>
                          </View>
                          <View style={{ paddingHorizontal: 16, paddingVertical: 16, width: 120, flexDirection: 'row', gap: 8 }}>
                            <Pressable 
                              onPress={() => handleEdit(group)}
                              style={({ pressed }) => ({
                                padding: 8,
                                borderRadius: 4,
                                backgroundColor: pressed 
                                  ? (isDarkMode ? '#1e3a8a' : '#dbeafe')
                                  : 'transparent'
                              })}
                            >
                              <Text style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}>✏️</Text>
                            </Pressable>
                            <Pressable 
                              onPress={() => handleDeleteClick(group)}
                              style={({ pressed }) => ({
                                padding: 8,
                                borderRadius: 4,
                                backgroundColor: pressed 
                                  ? (isDarkMode ? '#7f1d1d' : '#fee2e2')
                                  : 'transparent'
                              })}
                            >
                              <Text style={{ color: isDarkMode ? '#f87171' : '#dc2626' }}>🗑️</Text>
                            </Pressable>
                          </View>
                        </Pressable>
                      ))
                    )}
                  </View>
                </ScrollView>
              </View>
            </>
          )}

          {totalItems > 0 && (
            <View style={{ marginTop: 16 }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <Text style={{ fontSize: 14, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    Showing {showingStart} to {showingEnd} of {totalItems} entries
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 14, color: isDarkMode ? '#d1d5db' : '#374151' }}>Show</Text>
                    <Pressable
                      onPress={() => {
                        const options = [10, 25, 50, 100];
                        const currentIndex = options.indexOf(itemsPerPage);
                        const nextIndex = (currentIndex + 1) % options.length;
                        handleItemsPerPageChange(options[nextIndex]);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderWidth: 1,
                        borderRadius: 4,
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                        borderColor: isDarkMode ? '#4b5563' : '#d1d5db'
                      }}
                    >
                      <Text style={{ fontSize: 14, color: isDarkMode ? '#ffffff' : '#111827' }}>
                        {itemsPerPage}
                      </Text>
                    </Pressable>
                    <Text style={{ fontSize: 14, color: isDarkMode ? '#d1d5db' : '#374151' }}>entries</Text>
                  </View>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <Pressable
                    onPress={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || totalPages === 0}
                    style={({ pressed }) => ({
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      fontSize: 14,
                      borderWidth: 1,
                      borderRadius: 4,
                      backgroundColor: pressed 
                        ? (isDarkMode ? '#374151' : '#f3f4f6')
                        : (isDarkMode ? '#1f2937' : '#ffffff'),
                      borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
                      opacity: currentPage === 1 || totalPages === 0 ? 0.5 : 1
                    })}
                  >
                    <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>Previous</Text>
                  </Pressable>
                  
                  <Text style={{ fontSize: 14, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                    {currentPage} / {totalPages}
                  </Text>
                  
                  <Pressable
                    onPress={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    style={({ pressed }) => ({
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      fontSize: 14,
                      borderWidth: 1,
                      borderRadius: 4,
                      backgroundColor: pressed 
                        ? (isDarkMode ? '#374151' : '#f3f4f6')
                        : (isDarkMode ? '#1f2937' : '#ffffff'),
                      borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
                      opacity: currentPage === totalPages || totalPages === 0 ? 0.5 : 1
                    })}
                  >
                    <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>Next</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
        
        <Modal
          visible={deletingGroup !== null}
          transparent
          animationType="fade"
          onRequestClose={handleCancelDelete}
        >
          <View style={{ 
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <View style={{ 
              padding: 24,
              borderRadius: 8,
              borderWidth: 1,
              maxWidth: 448,
              width: '100%',
              marginHorizontal: 16,
              backgroundColor: isDarkMode ? '#111827' : '#ffffff',
              borderColor: isDarkMode ? '#374151' : '#d1d5db'
            }}>
              <Text style={{ 
                fontSize: 18,
                fontWeight: '600',
                marginBottom: 16,
                color: isDarkMode ? '#ffffff' : '#111827'
              }}>
                Confirm Delete Group
              </Text>
              <Text style={{ 
                marginBottom: 24,
                color: isDarkMode ? '#d1d5db' : '#374151'
              }}>
                Are you sure you want to delete group "{deletingGroup?.group_name}"? This action cannot be undone.
              </Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Pressable
                  onPress={handleCancelDelete}
                  style={({ pressed }) => ({
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderRadius: 4,
                    fontSize: 14,
                    fontWeight: '500',
                    backgroundColor: pressed 
                      ? (isDarkMode ? '#1f2937' : '#f3f4f6')
                      : 'transparent',
                    borderColor: isDarkMode ? '#4b5563' : '#d1d5db'
                  })}
                >
                  <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmDelete}
                  style={({ pressed }) => ({
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 4,
                    fontSize: 14,
                    fontWeight: '500',
                    backgroundColor: pressed ? '#b91c1c' : '#dc2626'
                  })}
                >
                  <Text style={{ color: '#ffffff' }}>Delete Group</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
};

export default GroupManagement;
