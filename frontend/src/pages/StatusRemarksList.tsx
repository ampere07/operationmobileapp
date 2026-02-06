import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface StatusRemark {
  id: number;
  status_remarks: string;
  created_at?: string;
  created_by_user_id?: number;
  updated_at?: string;
  updated_by_user_id?: number;
}

const StatusRemarksList: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [statusRemarks, setStatusRemarks] = useState<StatusRemark[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRemark, setEditingRemark] = useState<StatusRemark | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  const [formData, setFormData] = useState({
    status_remarks: ''
  });

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
    fetchStatusRemarks();
  }, []);

  const fetchStatusRemarks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/status-remarks`);
      const data = await response.json();
      
      if (data.success) {
        setStatusRemarks(data.data);
      } else {
        setError(data.message || 'Failed to fetch status remarks');
      }
    } catch (error) {
      console.error('Error fetching status remarks:', error);
      setError('Failed to fetch status remarks');
    } finally {
      setLoading(false);
    }
  };

  const filteredRemarks = statusRemarks.filter(remark =>
    remark.status_remarks.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddClick = () => {
    setEditingRemark(null);
    setFormData({ status_remarks: '' });
    setShowAddModal(true);
  };

  const handleEditClick = (remark: StatusRemark) => {
    setEditingRemark(remark);
    setFormData({
      status_remarks: remark.status_remarks
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this status remark?')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`${API_BASE_URL}/status-remarks/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        await fetchStatusRemarks();
      } else {
        alert('Failed to delete status remark: ' + data.message);
      }
    } catch (error) {
      console.error('Error deleting status remark:', error);
      alert('Failed to delete status remark');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.status_remarks.trim()) {
      alert('Please enter a status remark');
      return;
    }

    setSaving(true);
    try {
      const url = editingRemark 
        ? `${API_BASE_URL}/status-remarks/${editingRemark.id}`
        : `${API_BASE_URL}/status-remarks`;
      
      const method = editingRemark ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status_remarks: formData.status_remarks.trim()
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setShowAddModal(false);
        setFormData({ status_remarks: '' });
        await fetchStatusRemarks();
      } else {
        alert(data.message || 'Failed to save status remark');
      }
    } catch (error) {
      console.error('Error saving status remark:', error);
      alert('Failed to save status remark');
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
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

  if (loading && statusRemarks.length === 0) {
    return (
      <div className={`h-full flex items-center justify-center ${
        isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 mb-4 mx-auto" style={{ color: colorPalette?.primary || '#ea580c' }} />
          <div className={`text-lg ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Loading status remarks...</div>
        </div>
      </div>
    );
  }

  if (error && statusRemarks.length === 0) {
    return (
      <div className={`h-full flex items-center justify-center ${
        isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className={`text-lg mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Error Loading Status Remarks</div>
          <div className={`mb-4 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>{error}</div>
          <button 
            onClick={fetchStatusRemarks}
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
    <div className={`h-full flex flex-col ${
      isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      <div className={`px-6 py-4 border-b flex-shrink-0 ${
        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <h1 className={`text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Status Remarks List</h1>
        </div>
      </div>

      <div className={`px-6 py-4 border-b flex-shrink-0 ${
        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search Status Remarks"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded pl-10 pr-4 py-2 focus:outline-none ${
                isDarkMode
                  ? 'bg-gray-800 text-white border border-gray-600'
                  : 'bg-white text-gray-900 border border-gray-300'
              }`}
              onFocus={(e) => {
                if (colorPalette?.primary) {
                  e.currentTarget.style.borderColor = colorPalette.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isDarkMode ? '#4b5563' : '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <Search className={`absolute left-3 top-2.5 h-4 w-4 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
          </div>
          <button 
            onClick={handleAddClick}
            className="text-white px-4 py-2 rounded text-sm flex items-center space-x-2 transition-colors ml-4"
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
            <span>Add</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredRemarks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`border-b sticky top-0 ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
              }`}>
                <tr>
                  <th className={`px-6 py-4 text-left font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Status Remarks</th>
                  <th className={`px-6 py-4 text-left font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Created By User ID</th>
                  <th className={`px-6 py-4 text-left font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Created At</th>
                  <th className={`px-6 py-4 text-left font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Updated By User ID</th>
                  <th className={`px-6 py-4 text-left font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Updated At</th>
                  <th className={`px-6 py-4 text-left font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRemarks.map((remark) => (
                  <tr key={remark.id} className={`border-b transition-colors ${
                    isDarkMode ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}>
                    <td className={`px-6 py-4 font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{remark.status_remarks}</td>
                    <td className={`px-6 py-4 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>{remark.created_by_user_id || 'N/A'}</td>
                    <td className={`px-6 py-4 text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>{formatDateTime(remark.created_at)}</td>
                    <td className={`px-6 py-4 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>{remark.updated_by_user_id || 'N/A'}</td>
                    <td className={`px-6 py-4 text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>{formatDateTime(remark.updated_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(remark)}
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
                          onClick={() => handleDelete(remark.id)}
                          disabled={deletingId === remark.id}
                          className={`p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                            isDarkMode
                              ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                              : 'text-gray-600 hover:text-red-600 hover:bg-gray-100'
                          }`}
                          title="Delete"
                        >
                          {deletingId === remark.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`p-12 text-center ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <div className="text-lg mb-2">No status remarks found</div>
            <div className="text-sm">
              {searchQuery 
                ? 'Try adjusting your search filter' 
                : 'Start by adding some status remarks'
              }
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowAddModal(false)}
          />
          
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
              <div className={`px-6 py-4 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-600'
              }`}>
                <h2 className="text-xl font-semibold text-white">
                  {editingRemark ? 'Edit Status Remark' : 'Add Status Remark'}
                </h2>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status Remark<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.status_remarks}
                    onChange={(e) => setFormData({ ...formData, status_remarks: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none"
                    onFocus={(e) => {
                      if (colorPalette?.primary) {
                        e.currentTarget.style.borderColor = colorPalette.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 1px ${colorPalette.primary}`;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#4b5563';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    placeholder="Enter status remark"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className={`flex-1 px-4 py-2 border rounded transition-colors ${
                      isDarkMode
                        ? 'text-gray-300 border-gray-600 hover:bg-gray-700'
                        : 'text-gray-700 border-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: colorPalette?.primary || '#ea580c'
                    }}
                    onMouseEnter={(e) => {
                      if (!saving && colorPalette?.accent) {
                        e.currentTarget.style.backgroundColor = colorPalette.accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!saving && colorPalette?.primary) {
                        e.currentTarget.style.backgroundColor = colorPalette.primary;
                      }
                    }}
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingRemark ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatusRemarksList;
