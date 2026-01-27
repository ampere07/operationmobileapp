import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ExternalLink, Edit, FileCheck, Settings 
} from 'lucide-react';
import ServiceOrderEditModal from '../modals/ServiceOrderEditModal';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface ServiceOrderDetailsProps {
  serviceOrder: {
    id: string;
    ticketId: string;
    timestamp: string;
    accountNumber: string;
    fullName: string;
    contactAddress: string;
    dateInstalled: string;
    contactNumber: string;
    fullAddress: string;
    houseFrontPicture: string;
    emailAddress: string;
    plan: string;
    affiliate: string;
    username: string;
    connectionType: string;
    routerModemSN: string;
    lcp: string;
    nap: string;
    port: string;
    vlan: string;
    concern: string;
    concernRemarks: string;
    visitStatus: string;
    visitBy: string;
    visitWith: string;
    visitWithOther: string;
    visitRemarks: string;
    modifiedBy: string;
    modifiedDate: string;
    userEmail: string;
    requestedBy: string;
    assignedEmail: string;
    supportRemarks: string;
    serviceCharge: string;
    repairCategory?: string;
    supportStatus?: string;
    priorityLevel?: string;
    newRouterSn?: string;
    newLcpnap?: string;
    newPlan?: string;
    clientSignatureUrl?: string;
    image1Url?: string;
    image2Url?: string;
    image3Url?: string;
  };
  onClose: () => void;
  isMobile?: boolean;
}

const ServiceOrderDetails: React.FC<ServiceOrderDetailsProps> = ({ serviceOrder, onClose, isMobile = false }) => {
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [detailsWidth, setDetailsWidth] = useState<number>(600);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const FIELD_VISIBILITY_KEY = 'serviceOrderDetailsFieldVisibility';
  const FIELD_ORDER_KEY = 'serviceOrderDetailsFieldOrder';

  const defaultFields = [
    'ticketId',
    'timestamp',
    'accountNumber',
    'dateInstalled',
    'fullName',
    'contactNumber',
    'fullAddress',
    'houseFrontPicture',
    'emailAddress',
    'plan',
    'affiliate',
    'username',
    'connectionType',
    'routerModemSN',
    'lcp',
    'nap',
    'port',
    'vlan',
    'concern',
    'concernRemarks',
    'visitStatus',
    'visitBy',
    'visitWith',
    'visitWithOther',
    'visitRemarks',
    'modifiedBy',
    'modifiedDate',
    'userEmail',
    'requestedBy',
    'assignedEmail',
    'supportRemarks',
    'supportStatus',
    'repairCategory',
    'priorityLevel',
    'newRouterSn',
    'newLcpnap',
    'newPlan',
    'image1Url',
    'image2Url',
    'image3Url',
    'clientSignatureUrl',
    'serviceCharge'
  ];

  const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(FIELD_VISIBILITY_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return defaultFields.reduce((acc: Record<string, boolean>, field) => ({ ...acc, [field]: true }), {});
  });

  const [fieldOrder, setFieldOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(FIELD_ORDER_KEY);
    return saved ? JSON.parse(saved) : defaultFields;
  });

  useEffect(() => {
    localStorage.setItem(FIELD_VISIBILITY_KEY, JSON.stringify(fieldVisibility));
  }, [fieldVisibility]);

  useEffect(() => {
    localStorage.setItem(FIELD_ORDER_KEY, JSON.stringify(fieldOrder));
  }, [fieldOrder]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(localStorage.getItem('theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
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
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const diff = startXRef.current - e.clientX;
      const newWidth = Math.max(600, Math.min(1200, startWidthRef.current + diff));
      
      setDetailsWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = detailsWidth;
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleSaveEdit = (formData: any) => {
    console.log('Service order updated:', formData);
    setIsEditModalOpen(false);
  };

  const getFieldLabel = (fieldKey: string): string => {
    const labels: Record<string, string> = {
      ticketId: 'Ticket ID',
      timestamp: 'Timestamp',
      accountNumber: 'Account No.',
      dateInstalled: 'Date Installed',
      fullName: 'Full Name',
      contactNumber: 'Contact Number',
      fullAddress: 'Full Address',
      houseFrontPicture: 'House Front Picture',
      emailAddress: 'Email Address',
      plan: 'Plan',
      affiliate: 'Affiliate',
      username: 'Username',
      connectionType: 'Connection Type',
      routerModemSN: 'Router/Modem SN',
      lcp: 'LCP',
      nap: 'NAP',
      port: 'PORT',
      vlan: 'VLAN',
      concern: 'Concern',
      concernRemarks: 'Concern Remarks',
      visitStatus: 'Visit Status',
      visitBy: 'Visit By',
      visitWith: 'Visit With',
      visitWithOther: 'Visit With Other',
      visitRemarks: 'Visit Remarks',
      modifiedBy: 'Modified By',
      modifiedDate: 'Modified Date',
      userEmail: 'User Email',
      requestedBy: 'Requested by',
      assignedEmail: 'Assigned Email',
      supportRemarks: 'Support Remarks',
      supportStatus: 'Support Status',
      repairCategory: 'Repair Category',
      priorityLevel: 'Priority Level',
      newRouterSn: 'New Router SN',
      newLcpnap: 'New LCP/NAP',
      newPlan: 'New Plan',
      image1Url: 'Time In Image',
      image2Url: 'Modem Setup Image',
      image3Url: 'Time Out Image',
      clientSignatureUrl: 'Client Signature',
      serviceCharge: 'Service Charge'
    };
    return labels[fieldKey] || fieldKey;
  };

  const toggleFieldVisibility = (field: string) => {
    setFieldVisibility((prev: Record<string, boolean>) => ({ ...prev, [field]: !prev[field] }));
  };

  const selectAllFields = () => {
    const allVisible: Record<string, boolean> = defaultFields.reduce((acc: Record<string, boolean>, field) => ({ ...acc, [field]: true }), {});
    setFieldVisibility(allVisible);
  };

  const deselectAllFields = () => {
    const allHidden: Record<string, boolean> = defaultFields.reduce((acc: Record<string, boolean>, field) => ({ ...acc, [field]: false }), {});
    setFieldVisibility(allHidden);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null) return;
    const newOrder = [...fieldOrder];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, removed);
    setFieldOrder(newOrder);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const resetFieldSettings = () => {
    const allVisible: Record<string, boolean> = defaultFields.reduce((acc: Record<string, boolean>, field) => ({ ...acc, [field]: true }), {});
    setFieldVisibility(allVisible);
    setFieldOrder(defaultFields);
  };

  const getStatusColor = (status: string | undefined, type: 'support' | 'visit'): string => {
    if (!status) return 'text-gray-400';
    
    if (type === 'support') {
      switch (status.toLowerCase()) {
        case 'resolved':
        case 'completed':
          return 'text-green-400';
        case 'in-progress':
        case 'in progress':
          return 'text-blue-400';
        case 'pending':
          return 'text-orange-400';
        case 'closed':
        case 'cancelled':
          return 'text-gray-400';
        default:
          return 'text-gray-400';
      }
    } else {
      switch (status.toLowerCase()) {
        case 'completed':
          return 'text-green-400';
        case 'scheduled':
        case 'reschedule':
        case 'in progress':
          return 'text-blue-400';
        case 'pending':
          return 'text-orange-400';
        case 'cancelled':
        case 'failed':
          return 'text-red-500';
        default:
          return 'text-gray-400';
      }
    }
  };

  const renderField = (label: string, value: any) => (
    <div className={`flex py-2 ${
      isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
    }`}>
      <div className={`w-40 text-sm ${
        isDarkMode ? 'text-gray-400' : 'text-gray-600'
      }`}>{label}</div>
      <div className={`flex-1 ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>
        {value || '-'}
      </div>
    </div>
  );

  const renderImageField = (label: string, url: string | undefined, displayText: string) => (
    <div className={`flex py-2 ${
      isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
    }`}>
      <div className={`w-40 text-sm ${
        isDarkMode ? 'text-gray-400' : 'text-gray-600'
      }`}>{label}</div>
      <div className={`flex-1 flex items-center min-w-0 ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <span className="truncate mr-2" title={url}>
          {url ? displayText : '-'}
        </span>
        {url && (
          <button 
            className={`flex-shrink-0 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
            onClick={() => window.open(url, '_blank')}
          >
            <ExternalLink size={16} />
          </button>
        )}
      </div>
    </div>
  );

  const renderFieldContent = (fieldKey: string) => {
    if (!fieldVisibility[fieldKey]) return null;

    switch (fieldKey) {
      case 'ticketId':
        return renderField('Ticket ID', serviceOrder.ticketId);
      case 'timestamp':
        return renderField('Timestamp', serviceOrder.timestamp);
      case 'accountNumber':
        return (
          <div className={`flex py-2 ${
            isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
          }`}>
            <div className={`w-40 text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>Account No.</div>
            <div className="text-red-500 flex-1">
              {serviceOrder.accountNumber} | {serviceOrder.fullName} | {serviceOrder.fullAddress}
            </div>
          </div>
        );
      case 'dateInstalled':
        return renderField('Date Installed', serviceOrder.dateInstalled);
      case 'fullName':
        return renderField('Full Name', serviceOrder.fullName);
      case 'contactNumber':
        return renderField('Contact Number', serviceOrder.contactNumber);
      case 'fullAddress':
        return renderField('Full Address', serviceOrder.fullAddress);
      case 'houseFrontPicture':
        return renderImageField('House Front Picture', serviceOrder.houseFrontPicture, serviceOrder.houseFrontPicture);
      case 'emailAddress':
        return renderField('Email Address', serviceOrder.emailAddress);
      case 'plan':
        return renderField('Plan', serviceOrder.plan);
      case 'affiliate':
        return renderField('Affiliate', serviceOrder.affiliate);
      case 'username':
        return renderField('Username', serviceOrder.username);
      case 'connectionType':
        return renderField('Connection Type', serviceOrder.connectionType);
      case 'routerModemSN':
        return renderField('Router/Modem SN', serviceOrder.routerModemSN);
      case 'lcp':
        return renderField('LCP', serviceOrder.lcp);
      case 'nap':
        return renderField('NAP', serviceOrder.nap);
      case 'port':
        return renderField('PORT', serviceOrder.port);
      case 'vlan':
        return renderField('VLAN', serviceOrder.vlan);
      case 'concern':
        return renderField('Concern', serviceOrder.concern);
      case 'concernRemarks':
        return renderField('Concern Remarks', serviceOrder.concernRemarks);
      case 'visitStatus':
        return (
          <div className={`flex py-2 ${
            isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
          }`}>
            <div className={`w-40 text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>Visit Status</div>
            <div className={`flex-1 font-bold uppercase ${
              getStatusColor(serviceOrder.visitStatus, 'visit')
            }`}>
              {serviceOrder.visitStatus || '-'}
            </div>
          </div>
        );
      case 'visitBy':
        return renderField('Visit By', serviceOrder.visitBy);
      case 'visitWith':
        return renderField('Visit With', serviceOrder.visitWith);
      case 'visitWithOther':
        return renderField('Visit With Other', serviceOrder.visitWithOther);
      case 'visitRemarks':
        return renderField('Visit Remarks', serviceOrder.visitRemarks);
      case 'modifiedBy':
        return renderField('Modified By', serviceOrder.modifiedBy);
      case 'modifiedDate':
        return renderField('Modified Date', serviceOrder.modifiedDate);
      case 'userEmail':
        return renderField('User Email', serviceOrder.userEmail);
      case 'requestedBy':
        return renderField('Requested by', serviceOrder.requestedBy);
      case 'assignedEmail':
        return renderField('Assigned Email', serviceOrder.assignedEmail);
      case 'supportRemarks':
        return renderField('Support Remarks', serviceOrder.supportRemarks);
      case 'supportStatus':
        return (
          <div className={`flex py-2 ${
            isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'
          }`}>
            <div className={`w-40 text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>Support Status</div>
            <div className={`flex-1 font-bold uppercase ${
              getStatusColor(serviceOrder.supportStatus, 'support')
            }`}>
              {serviceOrder.supportStatus || '-'}
            </div>
          </div>
        );
      case 'repairCategory':
        return renderField('Repair Category', serviceOrder.repairCategory);
      case 'priorityLevel':
        return renderField('Priority Level', serviceOrder.priorityLevel);
      case 'newRouterSn':
        return renderField('New Router SN', serviceOrder.newRouterSn);
      case 'newLcpnap':
        return renderField('New LCP/NAP', serviceOrder.newLcpnap);
      case 'newPlan':
        return renderField('New Plan', serviceOrder.newPlan);
      case 'image1Url':
        return renderImageField('Time In Image', serviceOrder.image1Url, 'View Image');
      case 'image2Url':
        return renderImageField('Modem Setup Image', serviceOrder.image2Url, 'View Image');
      case 'image3Url':
        return renderImageField('Time Out Image', serviceOrder.image3Url, 'View Image');
      case 'clientSignatureUrl':
        return renderImageField('Client Signature', serviceOrder.clientSignatureUrl, 'View Signature');
      case 'serviceCharge':
        return (
          <div className="flex py-2">
            <div className={`w-40 text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>Service Charge</div>
            <div className={`flex-1 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>{serviceOrder.serviceCharge}</div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden relative ${!isMobile ? 'border-l' : ''} ${
      isDarkMode
        ? 'bg-gray-950 border-white border-opacity-30'
        : 'bg-white border-gray-300'
    }`} style={!isMobile ? { width: `${detailsWidth}px` } : undefined}>
      {!isMobile && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors z-50 ${
            isDarkMode ? 'hover:bg-orange-500' : 'hover:bg-orange-600'
          }`}
          onMouseDown={handleMouseDownResize}
        />
      )}
      <div className={`p-3 flex items-center justify-between border-b ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gray-100 border-gray-200'
      }`}>
        <div className="flex items-center">
          <h2 className={`font-medium truncate ${isMobile ? 'max-w-[200px] text-sm' : 'max-w-md'} ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{serviceOrder.accountNumber} | {serviceOrder.fullName} | {serviceOrder.contactAddress}</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className={isDarkMode ? 'hover:text-white text-gray-400' : 'hover:text-gray-900 text-gray-600'}>
            <FileCheck size={16} />
          </button>
          <button 
            className="text-white px-3 py-1 rounded-sm flex items-center" 
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
            onClick={handleEditClick}
          >
            <Edit size={16} className="mr-1" />
            <span>Edit</span>
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowFieldSettings(!showFieldSettings)}
              className={isDarkMode ? 'hover:text-white text-gray-400' : 'hover:text-gray-900 text-gray-600'}
              title="Field Settings"
            >
              <Settings size={16} />
            </button>
            {showFieldSettings && (
              <div className={`absolute right-0 mt-2 w-80 rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <div className={`px-4 py-3 border-b flex items-center justify-between ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <h3 className={`font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Field Visibility & Order</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={selectAllFields}
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      Show All
                    </button>
                    <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>|</span>
                    <button
                      onClick={deselectAllFields}
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      Hide All
                    </button>
                    <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>|</span>
                    <button
                      onClick={resetFieldSettings}
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  <div className={`text-xs mb-2 px-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Drag to reorder fields
                  </div>
                  {fieldOrder.map((fieldKey, index) => (
                    <div
                      key={fieldKey}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center space-x-2 px-2 py-1.5 rounded cursor-move transition-colors ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      } ${
                        draggedIndex === index
                          ? isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
                          : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={fieldVisibility[fieldKey]}
                        onChange={() => toggleFieldVisibility(fieldKey)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-xs ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                      }`}>☰</span>
                      <span className={`text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {getFieldLabel(fieldKey)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={onClose}
            className={isDarkMode ? 'hover:text-white text-gray-400' : 'hover:text-gray-900 text-gray-600'}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className={`mx-auto py-1 px-4 ${
          isDarkMode ? 'bg-gray-950' : 'bg-white'
        }`}>
          <div className="space-y-1">
            {fieldOrder.map((fieldKey) => (
              <React.Fragment key={fieldKey}>
                {renderFieldContent(fieldKey)}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <ServiceOrderEditModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onSave={handleSaveEdit}
          serviceOrderData={serviceOrder}
        />
      )}
    </div>
  );
};

export default ServiceOrderDetails;
