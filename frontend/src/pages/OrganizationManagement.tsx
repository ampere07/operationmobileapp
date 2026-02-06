import React, { useState, useEffect } from 'react';
import { Organization } from '../types/api';
import { organizationService } from '../services/userService';
import Breadcrumb from './Breadcrumb';
import AddNewOrganizationForm from '../components/AddNewOrganizationForm';
import EditOrganizationForm from '../components/EditOrganizationForm';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

const OrganizationManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

  useEffect(() => {
    loadOrganizations();
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

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      console.log('Loading organizations...');
      const response = await organizationService.getAllOrganizations();
      console.log('Organizations API response:', response);
      
      if (response.success && response.data) {
        console.log('Organizations data:', response.data);
        setOrganizations(response.data);
      } else {
        console.error('API returned success=false or no data:', response);
      }
    } catch (error: any) {
      console.error('Failed to load organizations:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.address && org.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (org.email_address && org.email_address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalItems = filteredOrganizations.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrganizations = filteredOrganizations.slice(startIndex, endIndex);
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

  const handleOrganizationCreated = (newOrg: Organization) => {
    if (!newOrg) {
      console.error('Received invalid organization from creation');
      alert('Warning: Failed to receive organization data. Please refresh the page.');
      return;
    }
    
    console.log('Organization created successfully:', newOrg);
    setOrganizations(prev => [...prev, newOrg]);
    setShowAddForm(false);
  };

  const handleEdit = (org: Organization) => {
    if (!org) {
      console.error('Cannot edit organization: No organization data');
      alert('Cannot edit organization: No organization data');
      return;
    }
    
    setEditingOrg(org);
  };

  const handleCancelEdit = () => {
    setEditingOrg(null);
  };

  const handleOrganizationUpdated = (updatedOrg: Organization) => {
    setOrganizations(prev => prev.map(org => 
      org.id === updatedOrg.id ? updatedOrg : org
    ));
    setEditingOrg(null);
  };

  const handleDeleteClick = (org: Organization) => {
    setDeletingOrg(org);
  };

  const handleCancelDelete = () => {
    setDeletingOrg(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingOrg) return;

    try {
      const response = await organizationService.deleteOrganization(deletingOrg.id);
      
      if (response.success) {
        setOrganizations(prev => prev.filter(org => org.id !== deletingOrg.id));
        setDeletingOrg(null);
      } else {
        const errorMessage = response.message || 'Failed to delete organization';
        alert(errorMessage);
      }
    } catch (error: any) {
      console.error('Failed to delete organization:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete organization';
      alert(errorMessage);
    }
  };

  if (showAddForm) {
    return <AddNewOrganizationForm onCancel={handleCancelAdd} onOrganizationCreated={handleOrganizationCreated} />;
  }

  if (editingOrg) {
    return <EditOrganizationForm organization={editingOrg} onCancel={handleCancelEdit} onOrganizationUpdated={handleOrganizationUpdated} />;
  }

  return (
    <div className="p-6">
      <Breadcrumb items={[
        { label: 'Organizations' }
      ]} />
      <div className={`rounded-lg border overflow-hidden text-white ${
        isDarkMode
          ? 'bg-gray-800 border-gray-600'
          : 'bg-white border-gray-300'
      }`}>
        <div className="p-6">
          <div className="mb-8">
            <h2 className={`text-2xl font-semibold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Organization Management
            </h2>
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Manage organizations and their settings
            </p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-8">
            <input
              type="text"
              placeholder="Search organizations by name, address, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`px-4 py-3 border rounded placeholder-gray-500 focus:outline-none w-full md:w-80 ${
                isDarkMode
                  ? 'bg-gray-900 border-gray-600 text-white focus:border-gray-100'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-gray-500'
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
            <button 
              onClick={handleAddNew}
              className="px-6 py-3 rounded transition-colors text-sm font-medium whitespace-nowrap text-white"
              style={{
                backgroundColor: colorPalette?.primary || '#3b82f6'
              }}
              onMouseEnter={(e) => {
                if (colorPalette?.accent) {
                  e.currentTarget.style.backgroundColor = colorPalette.accent;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colorPalette?.primary || '#3b82f6';
              }}
            >
              Add New Organization
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading organizations...</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`hidden md:block rounded border overflow-hidden ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="">
                        <th className={`px-4 py-4 text-left text-sm font-medium border-b ${
                          isDarkMode
                            ? 'text-gray-300 border-gray-600'
                            : 'text-gray-700 border-gray-300'
                        }`}>Name</th>
                        <th className={`px-4 py-4 text-left text-sm font-medium border-b ${
                          isDarkMode
                            ? 'text-gray-300 border-gray-600'
                            : 'text-gray-700 border-gray-300'
                        }`}>Address</th>
                        <th className={`px-4 py-4 text-left text-sm font-medium border-b ${
                          isDarkMode
                            ? 'text-gray-300 border-gray-600'
                            : 'text-gray-700 border-gray-300'
                        }`}>Contact Number</th>
                        <th className={`px-4 py-4 text-left text-sm font-medium border-b ${
                          isDarkMode
                            ? 'text-gray-300 border-gray-600'
                            : 'text-gray-700 border-gray-300'
                        }`}>Email</th>
                        <th className={`px-4 py-4 text-left text-sm font-medium border-b ${
                          isDarkMode
                            ? 'text-gray-300 border-gray-600'
                            : 'text-gray-700 border-gray-300'
                        }`}>Created</th>
                        <th className={`px-4 py-4 text-left text-sm font-medium border-b ${
                          isDarkMode
                            ? 'text-gray-300 border-gray-600'
                            : 'text-gray-700 border-gray-300'
                        }`}>Updated</th>
                        <th className={`px-4 py-4 text-left text-sm font-medium border-b ${
                          isDarkMode
                            ? 'text-gray-300 border-gray-600'
                            : 'text-gray-700 border-gray-300'
                        }`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentOrganizations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className={`px-6 py-8 text-center ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            No organizations found
                          </td>
                        </tr>
                      ) : (
                        currentOrganizations.map((org: Organization) => (
                          <tr key={org.id} className={`border-b ${
                            isDarkMode
                              ? 'border-gray-700 hover:bg-gray-750'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}>
                            <td className={`px-4 py-4 text-sm font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {org.organization_name}
                            </td>
                            <td className={`px-4 py-4 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {org.address || '-'}
                            </td>
                            <td className={`px-4 py-4 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {org.contact_number || '-'}
                            </td>
                            <td className={`px-4 py-4 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {org.email_address || '-'}
                            </td>
                            <td className={`px-4 py-4 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {new Date(org.created_at).toLocaleDateString()}
                            </td>
                            <td className={`px-4 py-4 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {new Date(org.updated_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleEdit(org)}
                                  className={`p-2 rounded transition-colors ${
                                    isDarkMode
                                      ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900'
                                      : 'text-blue-600 hover:text-blue-700 hover:bg-blue-100'
                                  }`}
                                  title="Edit organization"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button 
                                  onClick={() => handleDeleteClick(org)}
                                  className={`p-2 rounded transition-colors ${
                                    isDarkMode
                                      ? 'text-red-400 hover:text-red-300 hover:bg-red-900'
                                      : 'text-red-600 hover:text-red-700 hover:bg-red-100'
                                  }`}
                                  title="Delete organization"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {currentOrganizations.length === 0 ? (
                  <div className={`rounded border p-6 text-center ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-600 text-gray-400'
                      : 'bg-white border-gray-300 text-gray-600'
                  }`}>
                    No organizations found
                  </div>
                ) : (
                  currentOrganizations.map((org: Organization) => (
                    <div key={org.id} className={`rounded border p-4 ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-600'
                        : 'bg-white border-gray-300'
                    }`}>
                      <div className="mb-3">
                        <div className={`font-medium text-lg mb-1 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {org.organization_name}
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Address:</span>
                          <span className={`truncate ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{org.address || '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Contact:</span>
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{org.contact_number || '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Email:</span>
                          <span className={`truncate ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{org.email_address || '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Created:</span>
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{new Date(org.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Updated:</span>
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{new Date(org.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className={`flex gap-2 pt-3 border-t ${
                        isDarkMode ? 'border-gray-700' : 'border-gray-300'
                      }`}>
                        <button 
                          onClick={() => handleEdit(org)}
                          className={`flex-1 px-4 py-2 border rounded transition-colors text-sm font-medium ${
                            isDarkMode
                              ? 'text-blue-400 border-blue-400 hover:bg-blue-900'
                              : 'text-blue-600 border-blue-600 hover:bg-blue-100'
                          }`}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(org)}
                          className={`flex-1 px-4 py-2 border rounded transition-colors text-sm font-medium ${
                            isDarkMode
                              ? 'text-red-400 border-red-400 hover:bg-red-900'
                              : 'text-red-600 border-red-600 hover:bg-red-100'
                          }`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {totalItems > 0 && (
            <div className="mt-4">
              <div className="px-4 md:px-6 py-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <div className={`text-sm text-center sm:text-left ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Showing {showingStart} to {showingEnd} of {totalItems} entries
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className={`px-3 py-1 border rounded text-sm focus:outline-none ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-600 text-white focus:border-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-gray-500'
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
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>entries</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || totalPages === 0}
                    className={`px-3 py-1 text-sm border rounded whitespace-nowrap ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                        : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <div className="hidden sm:flex items-center gap-1">
                  {totalPages > 0 && Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      const distance = Math.abs(page - currentPage);
                      return distance <= 2 || page === 1 || page === totalPages;
                    })
                    .map((page, index, array) => {
                      const prevPage = array[index - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;
                      
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && (
                            <span className={`px-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>...</span>
                          )}
                          <button
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1 text-sm border rounded ${
                              currentPage === page
                                ? isDarkMode
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-blue-500 border-blue-500 text-white'
                                : isDarkMode
                                  ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700'
                                  : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>
                  
                  <div className={`sm:hidden text-sm px-3 py-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {currentPage} / {totalPages}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`px-3 py-1 text-sm border rounded whitespace-nowrap ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                        : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Delete Confirmation Modal */}
        {deletingOrg && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded border max-w-md w-full mx-4 ${
              isDarkMode
                ? 'bg-gray-900 border-gray-700'
                : 'bg-white border-gray-300'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Confirm Delete Organization
              </h3>
              <p className={`mb-6 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Are you sure you want to delete organization "{deletingOrg.organization_name}"? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleCancelDelete}
                  className={`px-4 py-2 border rounded transition-colors text-sm font-medium ${
                    isDarkMode
                      ? 'border-gray-600 text-white hover:bg-gray-800'
                      : 'border-gray-300 text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Delete Organization
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationManagement;
