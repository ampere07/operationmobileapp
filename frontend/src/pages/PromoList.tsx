import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Filter, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import PromoFormModal from '../modals/PromoFormModal';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface Promo {
  id: number;
  name: string;
  promo_name?: string;
  description?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

const PromoList: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [promos, setPromos] = useState<Promo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
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

  useEffect(() => {
    loadPromos();
  }, []);

  const loadPromos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/promos`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setPromos(data.data || []);
      } else {
        console.error('API returned error:', data.message);
        setPromos([]);
      }
    } catch (error) {
      console.error('Error loading promos:', error);
      setPromos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (promo: Promo) => {
    if (!window.confirm(`⚠️ PERMANENT DELETE WARNING ⚠️\n\nAre you sure you want to permanently delete "${promo.name}"?\n\nThis will PERMANENTLY REMOVE the promo from the database and CANNOT BE UNDONE!\n\nClick OK to permanently delete, or Cancel to keep the promo.`)) {
      return;
    }

    setDeletingItems(prev => {
      const newSet = new Set(prev);
      newSet.add(promo.id);
      return newSet;
    });
    
    try {
      const response = await fetch(`${API_BASE_URL}/promos/${promo.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        await loadPromos();
        alert('✅ Promo permanently deleted from database: ' + (data.message || 'Promo deleted successfully'));
      } else {
        alert('❌ Failed to delete promo: ' + (data.message || 'Failed to delete promo'));
      }
    } catch (error) {
      console.error('Error deleting promo:', error);
      alert('Failed to delete promo: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(promo.id);
        return newSet;
      });
    }
  };

  const handleEdit = (promo: Promo) => {
    setEditingPromo(promo);
    setShowAddPanel(true);
  };

  const handleCloseModal = () => {
    setShowAddPanel(false);
    setEditingPromo(null);
  };

  const handleSaveModal = () => {
    loadPromos();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-PH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getFilteredPromos = () => {
    if (!searchQuery) return promos;
    
    return promos.filter(promo => 
      promo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (promo.status && promo.status.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const renderListItem = (promo: Promo) => {
    return (
      <div key={promo.id} className={`border-b ${
        isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className={`font-medium text-lg ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>{promo.name}</h3>
              {promo.status && (
                <span className={`text-xs px-2 py-1 rounded ${
                  promo.status === 'Active' 
                    ? 'bg-green-800 text-green-400' 
                    : promo.status === 'Inactive'
                    ? 'bg-red-800 text-red-400'
                    : 'bg-blue-800 text-blue-400'
                }`}>
                  {promo.status}
                </span>
              )}
            </div>
            <div className={`flex items-center gap-4 mt-2 text-xs ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>
              <span>Created: {formatDate(promo.created_at)}</span>
              <span>Updated: {formatDate(promo.updated_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEdit(promo)}
              className={`p-2 rounded transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(promo)}
              disabled={deletingItems.has(promo.id)}
              className={`p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                  : 'text-gray-600 hover:text-red-600 hover:bg-gray-100'
              }`}
              title={deletingItems.has(promo.id) ? 'Permanently Deleting...' : 'Permanently Delete'}
            >
              {deletingItems.has(promo.id) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const filteredPromos = getFilteredPromos();

  return (
    <div className={`min-h-screen relative ${
      isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      <div className={`border-b ${
        isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className={`text-xl font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Promo List</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditingPromo(null);
                  setShowAddPanel(true);
                }}
                className="px-4 py-2 text-white rounded-lg flex items-center gap-2 transition-colors"
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
                Add
              </button>
              <button className={`p-2 rounded transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}>
                <Filter className="h-5 w-5" />
              </button>
              <button className={`p-2 rounded transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <input
              type="text"
              placeholder="Search Promo List"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none ${
                isDarkMode
                  ? 'bg-gray-800 text-white border-gray-700'
                  : 'bg-white text-gray-900 border-gray-300'
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
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className={`h-8 w-8 animate-spin ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`} />
          </div>
        ) : filteredPromos.length > 0 ? (
          <div>
            {filteredPromos.map(renderListItem)}
          </div>
        ) : (
          <div className={`text-center py-20 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-600'
          }`}>
            No promos found
          </div>
        )}
      </div>

      <PromoFormModal
        isOpen={showAddPanel}
        onClose={handleCloseModal}
        onSave={handleSaveModal}
        editingPromo={editingPromo}
      />
    </div>
  );
};

export default PromoList;
