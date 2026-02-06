import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Filter, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import AddPlanModal from '../modals/AddPlanModal';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface Plan {
  id: number;
  name: string;
  description?: string;
  price: number;
  is_active?: boolean;
  modified_date?: string;
  modified_by?: string;
  created_at?: string;
  updated_at?: string;
}

const PlanList: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
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
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/plans`, {
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
        setPlans(data.data || []);
      } else {
        console.error('API returned error:', data.message);
        setPlans([]);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!window.confirm(`⚠️ PERMANENT DELETE WARNING ⚠️\n\nAre you sure you want to permanently delete "${plan.name}"?\n\nThis will PERMANENTLY REMOVE the plan from the database and CANNOT BE UNDONE!\n\nClick OK to permanently delete, or Cancel to keep the plan.`)) {
      return;
    }

    setDeletingItems(prev => {
      const newSet = new Set(prev);
      newSet.add(plan.id);
      return newSet;
    });
    
    try {
      const response = await fetch(`${API_BASE_URL}/plans/${plan.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        await loadPlans();
        alert('✅ Plan permanently deleted from database: ' + (data.message || 'Plan deleted successfully'));
      } else {
        alert('❌ Failed to delete plan: ' + (data.message || 'Failed to delete plan'));
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Failed to delete plan: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(plan.id);
        return newSet;
      });
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
  };

  const handleModalSave = () => {
    loadPlans();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(price);
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

  const getFilteredPlans = () => {
    if (!searchQuery) return plans;
    
    return plans.filter(plan => 
      plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plan.description && plan.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const renderListItem = (plan: Plan) => {
    const isActive = plan.is_active !== undefined ? plan.is_active : true;
    
    return (
      <div key={plan.id} className={`border-b ${
        isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className={`font-medium text-lg ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>{plan.name}</h3>
              <span className="text-green-400 font-semibold">
                {formatPrice(plan.price)}
              </span>
              {isActive && (
                <span className="text-xs px-2 py-1 rounded bg-green-800 text-green-400">
                  Active
                </span>
              )}
            </div>
            {plan.description && (
              <p className={`text-sm mt-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>{plan.description}</p>
            )}
            <div className={`flex items-center gap-4 mt-2 text-xs ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>
              <span>Modified: {formatDate(plan.modified_date)}</span>
              <span>By: {plan.modified_by || 'System'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEdit(plan)}
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
              onClick={() => handleDelete(plan)}
              disabled={deletingItems.has(plan.id)}
              className={`p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                  : 'text-gray-600 hover:text-red-600 hover:bg-gray-100'
              }`}
              title={deletingItems.has(plan.id) ? 'Permanently Deleting...' : 'Permanently Delete'}
            >
              {deletingItems.has(plan.id) ? (
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

  const filteredPlans = getFilteredPlans();

  return (
    <div className={`min-h-screen ${
      isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      <div className={`border-b ${
        isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className={`text-xl font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Plan List</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddNew}
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
              placeholder="Search Plan List"
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
        ) : filteredPlans.length > 0 ? (
          <div>
            {filteredPlans.map(renderListItem)}
          </div>
        ) : (
          <div className={`text-center py-20 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-600'
          }`}>
            No plans found
          </div>
        )}
      </div>

      <AddPlanModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        editingPlan={editingPlan}
      />
    </div>
  );
};

export default PlanList;
