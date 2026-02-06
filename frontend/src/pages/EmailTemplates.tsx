import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../config/api';
import { Editor } from '@tinymce/tinymce-react';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface EmailTemplateData {
  Template_Code: string;
  Subject_Line: string;
  Body_HTML: string;
  Description: string;
  Is_Active: boolean;
}

interface EmailTemplateResponse {
  success: boolean;
  data: EmailTemplateData[];
  count: number;
}

interface ModalConfig {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const EmailTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplateData[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [operationLoading, setOperationLoading] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  
  const editorRef = useRef<any>(null);

  const [formData, setFormData] = useState({
    Template_Code: '',
    Subject_Line: '',
    Body_HTML: '',
    Description: '',
    Is_Active: true
  });

  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<EmailTemplateResponse>('/email-templates');
      if (response.data.success && response.data.data) {
        setTemplates(response.data.data);
        if (response.data.data.length > 0 && !selectedTemplate) {
          setSelectedTemplate(response.data.data[0]);
          setFormData({
            Template_Code: response.data.data[0].Template_Code,
            Subject_Line: response.data.data[0].Subject_Line,
            Body_HTML: response.data.data[0].Body_HTML,
            Description: response.data.data[0].Description || '',
            Is_Active: response.data.data[0].Is_Active
          });
        }
      }
    } catch (error) {
      console.error('Error fetching email templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
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

  const handleTemplateSelect = (template: EmailTemplateData) => {
    setSelectedTemplate(template);
    setFormData({
      Template_Code: template.Template_Code,
      Subject_Line: template.Subject_Line,
      Body_HTML: template.Body_HTML,
      Description: template.Description || '',
      Is_Active: template.Is_Active
    });
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedTemplate(null);
    setFormData({
      Template_Code: '',
      Subject_Line: '',
      Body_HTML: '',
      Description: '',
      Is_Active: true
    });
  };

  const handleSave = async () => {
    try {
      setOperationLoading(true);

      const payload = {
        ...formData,
        Body_HTML: editorRef.current?.getContent() || formData.Body_HTML
      };

      if (isCreating) {
        await apiClient.post('/email-templates', payload);
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Email template created successfully'
        });
        setIsCreating(false);
      } else if (selectedTemplate) {
        await apiClient.put(`/email-templates/${selectedTemplate.Template_Code}`, payload);
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Email template updated successfully'
        });
        setIsEditing(false);
      }

      await fetchTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: `Failed to save: ${errorMessage}`
      });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDelete = async (templateCode: string) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this email template?',
      onConfirm: async () => {
        try {
          setModal({ ...modal, isOpen: false });
          setOperationLoading(true);
          await apiClient.delete(`/email-templates/${templateCode}`);
          setModal({
            isOpen: true,
            type: 'success',
            title: 'Success',
            message: 'Email template deleted successfully'
          });
          setSelectedTemplate(null);
          await fetchTemplates();
        } catch (error: any) {
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: `Failed to delete: ${error.response?.data?.message || error.message}`
          });
        } finally {
          setOperationLoading(false);
        }
      },
      onCancel: () => {
        setModal({ ...modal, isOpen: false });
      }
    });
  };

  const handleCancel = () => {
    if (selectedTemplate) {
      setFormData({
        Template_Code: selectedTemplate.Template_Code,
        Subject_Line: selectedTemplate.Subject_Line,
        Body_HTML: selectedTemplate.Body_HTML,
        Description: selectedTemplate.Description || '',
        Is_Active: selectedTemplate.Is_Active
      });
    }
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleToggleActive = async (template: EmailTemplateData) => {
    try {
      setOperationLoading(true);
      await apiClient.post(`/email-templates/${template.Template_Code}/toggle-active`);
      await fetchTemplates();
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Success',
        message: 'Template status updated successfully'
      });
    } catch (error: any) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: `Failed to update status: ${error.response?.data?.message || error.message}`
      });
    } finally {
      setOperationLoading(false);
    }
  };

  const insertTag = (tag: string) => {
    if (editorRef.current) {
      editorRef.current.insertContent(tag);
    }
  };

  const insertHeader = () => {
    const html = '<img src="https://via.placeholder.com/800x150?text=FULL+BLEED+HEADER" alt="Header" style="width: 100%; height: auto; display: block; margin: 0; border: 0;">';
    if (editorRef.current) {
      editorRef.current.insertContent(html);
    }
  };

  const insertFooter = () => {
    const html = '<img src="https://via.placeholder.com/800x100?text=FULL+BLEED+FOOTER" alt="Footer" style="width: 100%; height: auto; display: block; margin: 0; border: 0;">';
    if (editorRef.current) {
      editorRef.current.insertContent(html);
    }
  };

  const canEdit = selectedTemplate && !isCreating;
  const canSave = (isEditing || isCreating);

  return (
    <div className={`flex h-screen ${
      isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      {/* Sidebar */}
      <div className={`w-72 border-r overflow-y-auto ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-300'
      }`}>
        <div className={`p-4 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-300'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Email Templates</h2>
            <button
              onClick={handleStartCreate}
              className="px-3 py-1.5 text-white text-sm rounded transition-colors"
              style={{
                backgroundColor: colorPalette?.primary || '#ea580c'
              }}
              onMouseEnter={(e) => {
                if (colorPalette?.accent) {
                  e.currentTarget.style.backgroundColor = colorPalette.accent;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
              }}
              disabled={isCreating}
            >
              New
            </button>
          </div>
        </div>

        {/* Template List */}
        <div className="p-2">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.Template_Code}
                onClick={() => handleTemplateSelect(template)}
                className={`p-3 mb-2 rounded cursor-pointer transition-colors ${
                  selectedTemplate?.Template_Code === template.Template_Code
                    ? isDarkMode
                      ? 'bg-orange-600 bg-opacity-20 border-l-2 border-orange-500'
                      : 'bg-orange-100 border-l-2 border-orange-500'
                    : isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{template.Template_Code}</p>
                    <p className={`text-xs truncate ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>{template.Subject_Line}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        template.Is_Active ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                      title={template.Is_Active ? 'Active' : 'Inactive'}
                    ></span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Variable Tags */}
        <div className={`p-4 border-t ${
          isDarkMode ? 'border-gray-700' : 'border-gray-300'
        }`}>
          <h3 className={`text-xs font-semibold mb-2 uppercase ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Design Elements</h3>
          <button
            onClick={insertHeader}
            className={`w-full text-left px-2 py-1 mb-1 text-xs rounded ${
              isDarkMode
                ? 'text-orange-400 bg-gray-700 hover:bg-gray-600'
                : 'text-orange-600 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            [+] Header (Full Bleed)
          </button>
          <button
          onClick={insertFooter}
          className={`w-full text-left px-2 py-1 mb-3 text-xs rounded ${
              isDarkMode
                  ? 'text-orange-400 bg-gray-700 hover:bg-gray-600'
                  : 'text-orange-600 bg-gray-100 hover:bg-gray-200'
              }`}
            >
            [+] Footer (Full Bleed)
          </button>

          <h3 className={`text-xs font-semibold mb-2 uppercase ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Smart Rows</h3>
          {['Row_Discounts', 'Row_Rebates', 'Row_Service', 'Row_Staggered', 'Row_Install'].map(tag => (
          <button
          key={tag}
          onClick={() => insertTag(`{{${tag}}}`)} 
          className={`w-full text-left px-2 py-1 mb-1 text-xs font-mono rounded border-l-2 border-green-500 ${
            isDarkMode
              ? 'text-green-400 bg-gray-700 hover:bg-gray-600'
              : 'text-green-600 bg-gray-100 hover:bg-gray-200'
          }`}
          >
          {`{{${tag}}}`}
          </button>
          ))}

          <h3 className={`text-xs font-semibold mb-2 mt-3 uppercase ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Others & Basic Charges</h3>
          <div className="mb-2">
            <p className={`text-xs mb-1 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Labels (always show):</p>
            <button
              onClick={() => insertTag('{{Label_Discounts}}')}
              className={`w-full text-left px-2 py-1 mb-1 text-xs font-mono rounded border-l-2 border-purple-500 ${
                isDarkMode
                  ? 'text-purple-400 bg-gray-700 hover:bg-gray-600'
                  : 'text-purple-600 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {'{{Label_Discounts}}'}
            </button>
            <button
              onClick={() => insertTag('{{Label_Rebates}}')}
              className={`w-full text-left px-2 py-1 mb-1 text-xs font-mono rounded border-l-2 border-purple-500 ${
                isDarkMode
                  ? 'text-purple-400 bg-gray-700 hover:bg-gray-600'
                  : 'text-purple-600 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {'{{Label_Rebates}}'}
            </button>
            <button
              onClick={() => insertTag('{{Label_Service}}')}
              className={`w-full text-left px-2 py-1 mb-1 text-xs font-mono rounded border-l-2 border-purple-500 ${
                isDarkMode
                  ? 'text-purple-400 bg-gray-700 hover:bg-gray-600'
                  : 'text-purple-600 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {'{{Label_Service}}'}
            </button>
            <button
              onClick={() => insertTag('{{Label_Staggered}}')}
              className={`w-full text-left px-2 py-1 mb-1 text-xs font-mono rounded border-l-2 border-purple-500 ${
                isDarkMode
                  ? 'text-purple-400 bg-gray-700 hover:bg-gray-600'
                  : 'text-purple-600 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {'{{Label_Staggered}}'}
            </button>
          </div>
          <div className="mb-3">
            <p className={`text-xs mb-1 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>Amounts (always show):</p>
            {['Amount_Discounts', 'Amount_Rebates', 'Amount_Service', 'Amount_Install'].map(tag => (
              <button
                key={tag}
                onClick={() => insertTag(`{{${tag}}}`)} 
                className={`w-full text-left px-2 py-1 mb-1 text-xs font-mono rounded border-l-2 border-yellow-500 ${
                  isDarkMode
                    ? 'text-yellow-400 bg-gray-700 hover:bg-gray-600'
                    : 'text-yellow-600 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {`{{${tag}}}`}
              </button>
            ))}
          </div>

          <h3 className={`text-xs font-semibold mb-2 mt-3 uppercase ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Customer</h3>
          {['Full_Name', 'Address', 'Account_No', 'Contact_No', 'Email', 'Plan'].map(tag => (
            <button
              key={tag}
              onClick={() => insertTag(`{{${tag}}}`)}
              className={`w-full text-left px-2 py-1 mb-1 text-xs font-mono rounded border-l-2 border-blue-500 ${
                isDarkMode
                  ? 'text-blue-400 bg-gray-700 hover:bg-gray-600'
                  : 'text-blue-600 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {`{{${tag}}}`}
            </button>
          ))}

          <h3 className={`text-xs font-semibold mb-2 mt-3 uppercase ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Financials</h3>
          {['Prev_Balance', 'Monthly_Fee', 'VAT', 'Amount_Due', 'Total_Due'].map(tag => (
            <button
              key={tag}
              onClick={() => insertTag(`{{${tag}}}`)}
              className={`w-full text-left px-2 py-1 mb-1 text-xs font-mono rounded border-l-2 border-blue-500 ${
                isDarkMode
                  ? 'text-blue-400 bg-gray-700 hover:bg-gray-600'
                  : 'text-blue-600 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {`{{${tag}}}`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className={`flex-1 flex flex-col ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {isCreating || isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={formData.Template_Code}
                    onChange={(e) => handleInputChange('Template_Code', e.target.value)}
                    placeholder="Template Code (e.g., SOA_DESIGN)"
                    className={`w-full px-3 py-2 text-sm rounded ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    disabled={!isCreating}
                  />
                  <input
                    type="text"
                    value={formData.Subject_Line}
                    onChange={(e) => handleInputChange('Subject_Line', e.target.value)}
                    placeholder="Subject Line"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  />
                  <input
                    type="text"
                    value={formData.Description}
                    onChange={(e) => handleInputChange('Description', e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  />
                </div>
              ) : selectedTemplate ? (
                <div>
                  <h2 className={`text-xl font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{selectedTemplate.Template_Code}</h2>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>{selectedTemplate.Subject_Line}</p>
                  {selectedTemplate.Description && (
                    <p className={`text-xs mt-1 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>{selectedTemplate.Description}</p>
                  )}
                </div>
              ) : (
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Select a template or create a new one</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canSave && (
                <>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 text-white text-sm rounded transition-colors"
                    style={{
                      backgroundColor: colorPalette?.primary || '#ea580c'
                    }}
                    onMouseEnter={(e) => {
                      if (colorPalette?.accent) {
                        e.currentTarget.style.backgroundColor = colorPalette.accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className={`px-4 py-2 text-white text-sm rounded transition-colors ${
                      isDarkMode
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  >
                    Cancel
                  </button>
                </>
              )}
              {canEdit && !isEditing && (
                <>
                  <button
                    onClick={handleStartEdit}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => selectedTemplate && handleToggleActive(selectedTemplate)}
                    className={`px-4 py-2 text-white text-sm rounded transition-colors ${
                      selectedTemplate?.Is_Active
                        ? 'bg-yellow-600 hover:bg-yellow-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {selectedTemplate?.Is_Active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => selectedTemplate && handleDelete(selectedTemplate.Template_Code)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto p-4">
          {(selectedTemplate || isCreating) ? (
            <div className="max-w-5xl mx-auto">
              <Editor
                apiKey="koft0pszyzdf8zd077qxchxr3welx07gfttfzgexnte5qx4z"
                onInit={(evt, editor) => editorRef.current = editor}
                initialValue={formData.Body_HTML}
                disabled={!isEditing && !isCreating}
                init={{
                  height: 800,
                  menubar: false,
                  plugins: [
                    'table', 'code', 'preview', 'image', 'searchreplace', 'lists'
                  ],
                  toolbar: 'undo redo | fontfamily fontsize | bold italic underline | alignleft aligncenter alignright | table | bullist numlist | code preview',
                  content_style: `
                    html { background-color: #444; padding: 20px; display: flex; justify-content: center; }
                    body { 
                      font-family: Helvetica, Arial, sans-serif; 
                      font-size: 10pt; 
                      width: 210mm;
                      min-height: 297mm; 
                      margin: 0 auto;    
                      padding: 0px;      
                      background-color: #fff;
                      box-shadow: 0 0 15px rgba(0,0,0,0.5); 
                    }
                    p { margin: 0 0 8px 0; }
                    table { width: 100%; border-collapse: collapse; border-spacing: 0; }
                    td, th { padding: 4px; vertical-align: top; border: 1px dashed #eee; }
                    table[border='1'] td, table[border='1'] th { border: 1px solid #000 !important; }
                    .no-border td { border: none !important; }
                  `
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className={`text-lg ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>Select a template to view or edit</p>
            </div>
          )}
        </div>
      </div>

      {/* Loading Modal */}
      {operationLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className={`border rounded-lg p-6 max-w-sm w-full mx-4 ${
            isDarkMode
              ? 'bg-gray-900 border-gray-700'
              : 'bg-white border-gray-300'
          }`}>
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
              <p className={`text-base font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Processing...</p>
              <p className={`text-sm mt-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Please wait</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`border rounded-lg p-4 max-w-md w-full mx-4 ${
            isDarkMode
              ? 'bg-gray-900 border-gray-700'
              : 'bg-white border-gray-300'
          }`}>
            <h3 className={`text-base font-semibold mb-3 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>{modal.title}</h3>
            <p className={`text-sm mb-4 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>{modal.message}</p>
            <div className="flex items-center justify-end gap-2">
              {modal.type === 'confirm' ? (
                <>
                  <button
                    onClick={modal.onCancel}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                      isDarkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={modal.onConfirm}
                    className="px-3 py-1.5 text-sm text-white rounded transition-colors"
                    style={{
                      backgroundColor: colorPalette?.primary || '#ea580c'
                    }}
                    onMouseEnter={(e) => {
                      if (colorPalette?.accent) {
                        e.currentTarget.style.backgroundColor = colorPalette.accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                    }}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setModal({ ...modal, isOpen: false })}
                  className="px-3 py-1.5 text-sm text-white rounded transition-colors"
                  style={{
                    backgroundColor: colorPalette?.primary || '#ea580c'
                  }}
                  onMouseEnter={(e) => {
                    if (colorPalette?.accent) {
                      e.currentTarget.style.backgroundColor = colorPalette.accent;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                  }}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplates;
