import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
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

  const handleDelete = async (item: Concern, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!window.confirm(`⚠️ PERMANENT DELETE WARNING ⚠️\n\nAre you sure you want to permanently delete "${item.concern_name}"?\n\nThis action CANNOT BE UNDONE!\n\nClick OK to permanently delete, or Cancel to keep the item.`)) {
      return;
    }

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
      alert('Failed to delete concern: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const handleEdit = (item: Concern, event: React.MouseEvent) => {
    event.stopPropagation();
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
    <div className={`${
      isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
    } h-full flex overflow-hidden`}>
      <div className={`${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      } overflow-hidden flex-1`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`p-4 border-b flex-shrink-0 ${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search Concerns"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full rounded pl-10 pr-4 py-2 focus:outline-none ${
                    isDarkMode 
                      ? 'bg-gray-800 text-white border-gray-700' 
                      : 'bg-gray-100 text-gray-900 border-gray-300'
                  } border`}
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
                onClick={handleAddNew}
                className="text-white px-4 py-2 rounded text-sm transition-colors flex items-center space-x-1"
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
                <Plus className="h-4 w-4" />
                <span>Add</span>
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {isLoading ? (
                <div className={`px-4 py-12 text-center ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <div className="animate-pulse flex flex-col items-center">
                    <div className={`h-4 w-1/3 rounded mb-4 ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                    }`}></div>
                    <div className={`h-4 w-1/2 rounded ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  <p className="mt-4">Loading concerns...</p>
                </div>
              ) : error ? (
                <div className={`px-4 py-12 text-center text-red-400`}>
                  <p>{error}</p>
                  <button 
                    onClick={() => loadConcerns()}
                    className="mt-4 px-4 py-2 rounded text-white transition-colors"
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
                    }}>
                    Retry
                  </button>
                </div>
              ) : filteredConcerns.length > 0 ? (
                <div className="space-y-0">
                  {filteredConcerns.map((item) => (
                    <div
                      key={item.id}
                      className={`px-4 py-3 cursor-pointer transition-colors border-b ${
                        isDarkMode 
                          ? 'hover:bg-gray-800 border-gray-800' 
                          : 'hover:bg-gray-100 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm mb-1 uppercase ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {item.concern_name}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                          <button
                            onClick={(e) => handleEdit(item, e)}
                            className={`p-1.5 rounded transition-colors ${
                              isDarkMode 
                                ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700' 
                                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-200'
                            }`}
                            title="Edit Concern"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(item, e)}
                            disabled={deletingItems.has(item.id)}
                            className={`p-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              isDarkMode 
                                ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700' 
                                : 'text-gray-600 hover:text-red-600 hover:bg-gray-200'
                            }`}
                            title={deletingItems.has(item.id) ? 'Deleting...' : 'Delete Concern'}
                          >
                            {deletingItems.has(item.id) ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  No concerns found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit/Add Concern Modal */}
      <EditConcernModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
        concernItem={editingItem}
      />
    </div>
  );
};

export default ConcernConfig;
