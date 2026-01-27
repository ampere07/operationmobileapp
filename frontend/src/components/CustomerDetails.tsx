import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Wrench, Edit, ChevronLeft, ChevronRight as ChevronRightNav, Maximize2, X, ExternalLink, Settings } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import TransactConfirmationModal from '../modals/TransactConfirmationModal';
import TransactionFormModal from '../modals/TransactionFormModal';
import StaggeredInstallationFormModal from '../modals/StaggeredInstallationFormModal';
import DiscountFormModal from '../modals/DiscountFormModal';
import SORequestFormModal from '../modals/SORequestFormModal';
import CustomerDetailsEditModal from '../modals/CustomerDetailsEditModal';
import { BillingDetailRecord } from '../types/billing';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { customerDetailUpdateService } from '../services/customerDetailUpdateService';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OnlineStatusRecord {
  id: string;
  status: string;
  accountNo: string;
  username: string;
  group: string;
  splynxId: string;
}

interface BillingDetailsProps {
  billingRecord: BillingDetailRecord;
  onlineStatusRecords?: OnlineStatusRecord[];
  onClose?: () => void;
}

const BillingDetails: React.FC<BillingDetailsProps> = ({
  billingRecord,
  onlineStatusRecords = [],
  onClose
}) => {
  console.log('CustomerDetails - Received billingRecord:', billingRecord);
  console.log('CustomerDetails - houseFrontPicture value:', billingRecord.houseFrontPicture);
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    invoices: false,
    paymentPortalLogs: false,
    transactions: false,
    advancedPayments: false,
    discounts: false,
    staggeredInstallations: false,
    staggeredPayments: false,
    serviceOrders: false,
    serviceOrderLogs: false,
    reconnectionLogs: false,
    disconnectedLogs: false,
    detailsUpdateLogs: false,
    inventoryLogs: false,
    onlineStatus: true,
    borrowedLogs: false,
    planChangeLogs: false,
    serviceChargeLogs: false,
    changeDueLogs: false,
    securityDeposits: false
  });
  const [showTransactModal, setShowTransactModal] = useState(false);
  const [showTransactionFormModal, setShowTransactionFormModal] = useState(false);
  const [showStaggeredInstallationModal, setShowStaggeredInstallationModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showSORequestConfirmModal, setShowSORequestConfirmModal] = useState(false);
  const [showSORequestFormModal, setShowSORequestFormModal] = useState(false);
  const [showDetailsEditModal, setShowDetailsEditModal] = useState(false);
  const [editType, setEditType] = useState<'customer_details' | 'billing_details' | 'technical_details'>('customer_details');
  const [detailsWidth, setDetailsWidth] = useState<number>(600);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [showColumnVisibility, setShowColumnVisibility] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const COLUMN_VISIBILITY_KEY = 'customerDetailsColumnVisibility';
  const FIELD_ORDER_KEY = 'customerDetailsFieldOrder';

  const defaultFieldOrder = {
    customerDetails: [
      'fullName',
      'emailAddress',
      'contactNumber',
      'secondContactNumber',
      'address',
      'barangay',
      'city',
      'region',
      'referredBy',
      'addressCoordinates',
      'houseFrontPicture'
    ],
    technicalDetails: [
      'usageType',
      'dateInstalled',
      'username',
      'connectionType',
      'routerModel',
      'routerModemSN',
      'onlineStatus',
      'mikrotikId',
      'lcpnap',
      'vlan',
      'sessionIp'
    ],
    billingDetails: [
      'accountNumber',
      'billingStatus',
      'billingDay',
      'plan',
      'accountBalance',
      'totalPaid'
    ]
  };

  const defaultColumnVisibility = {
    customerDetails: true,
    technicalDetails: true,
    billingDetails: true
  };

  const [columnVisibility, setColumnVisibility] = useState(() => {
    const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY);
    return saved ? JSON.parse(saved) : defaultColumnVisibility;
  });

  const [fieldOrder, setFieldOrder] = useState(() => {
    const saved = localStorage.getItem(FIELD_ORDER_KEY);
    return saved ? JSON.parse(saved) : defaultFieldOrder;
  });

  const [draggedItem, setDraggedItem] = useState<{ section: string; index: number } | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

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
    localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  useEffect(() => {
    localStorage.setItem(FIELD_ORDER_KEY, JSON.stringify(fieldOrder));
  }, [fieldOrder]);

  const toggleColumnVisibility = (column: string) => {
    setColumnVisibility((prev: Record<string, boolean>) => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const selectAllColumns = () => {
    const allVisible = Object.keys(defaultColumnVisibility).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setColumnVisibility(allVisible);
  };

  const deselectAllColumns = () => {
    const allHidden = Object.keys(defaultColumnVisibility).reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {} as Record<string, boolean>);
    setColumnVisibility(allHidden);
  };

  const handleDragStart = (section: string, index: number) => {
    setDraggedItem({ section, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (section: string, dropIndex: number) => {
    if (!draggedItem || draggedItem.section !== section) return;

    const newOrder = [...fieldOrder[section]];
    const [removed] = newOrder.splice(draggedItem.index, 1);
    newOrder.splice(dropIndex, 0, removed);

    setFieldOrder({
      ...fieldOrder,
      [section]: newOrder
    });
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const toggleSectionExpansion = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const resetFieldOrder = () => {
    setFieldOrder(defaultFieldOrder);
  };

  const getFieldLabel = (fieldKey: string): string => {
    const labels: Record<string, string> = {
      fullName: 'Full Name',
      emailAddress: 'Email Address',
      contactNumber: 'Contact Number',
      secondContactNumber: 'Second Contact Number',
      address: 'Address',
      barangay: 'Barangay',
      city: 'City',
      region: 'Region',
      referredBy: 'Referred By',
      addressCoordinates: 'Address Coordinates',
      houseFrontPicture: 'House Front Picture',
      usageType: 'Usage Type',
      dateInstalled: 'Date Installed',
      username: 'PPPOE Username',
      connectionType: 'Connection Type',
      routerModel: 'Router Model',
      routerModemSN: 'Router Serial Number',
      onlineStatus: 'Online Status',
      mikrotikId: 'Mikrotik ID',
      lcpnap: 'LCP NAP PORT',
      vlan: 'VLAN',
      sessionIp: 'SESSION IP',
      accountNumber: 'Account Number',
      billingStatus: 'Billing Status',
      billingDay: 'Billing Day',
      plan: 'Plan',
      accountBalance: 'Account Balance',
      totalPaid: 'Total Paid'
    };
    return labels[fieldKey] || fieldKey;
  };

  const renderField = (fieldKey: string, billingRecord: BillingDetailRecord): React.ReactElement | null => {
    const fieldRenderers: Record<string, () => React.ReactElement | null> = {
      fullName: () => (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Full Name</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.customerName}</span>
        </div>
      ),
      emailAddress: () => (billingRecord.emailAddress || billingRecord.email) ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Email Address</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.emailAddress || billingRecord.email}</span>
        </div>
      ) : null,
      contactNumber: () => billingRecord.contactNumber ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Contact Number</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.contactNumber}</span>
        </div>
      ) : null,
      secondContactNumber: () => billingRecord.secondContactNumber ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Second Contact Number</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.secondContactNumber}</span>
        </div>
      ) : null,
      address: () => billingRecord.address?.split(',')[0] ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Address</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.address.split(',')[0]}</span>
        </div>
      ) : null,
      barangay: () => billingRecord.barangay ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Barangay</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.barangay}</span>
        </div>
      ) : null,
      city: () => billingRecord.city ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>City</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.city}</span>
        </div>
      ) : null,
      region: () => billingRecord.region ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Region</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.region}</span>
        </div>
      ) : null,
      referredBy: () => billingRecord.referredBy ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Referred By</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.referredBy}</span>
        </div>
      ) : null,
      addressCoordinates: () => {
        if (!billingRecord.addressCoordinates) return null;
        
        // Parse coordinates - expecting format like "14.1234,121.5678" or "14.1234, 121.5678"
        const coords = billingRecord.addressCoordinates.split(',').map(c => parseFloat(c.trim()));
        
        if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
          return (
            <div className="space-y-2">
              <span className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Address Coordinates</span>
              <div className={`w-full h-24 border rounded flex items-center justify-center ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-gray-100 border-gray-300'
              }`}>
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-600'
                }`}>{billingRecord.addressCoordinates}</span>
              </div>
            </div>
          );
        }

        const [lat, lng] = coords;

        return (
          <div className="space-y-2">
            <span className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>Address Coordinates</span>
            <div className={`w-full h-64 border rounded overflow-hidden ${
              isDarkMode
                ? 'border-gray-700'
                : 'border-gray-300'
            }`}>
              <MapContainer
                center={[lat, lng]}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[lat, lng]}>
                  <Popup>
                    {billingRecord.customerName}<br />
                    {billingRecord.address}
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
            <div className={`text-xs ${
              isDarkMode ? 'text-gray-500' : 'text-gray-600'
            }`}>
              Latitude: {lat}, Longitude: {lng}
            </div>
          </div>
        );
      },
      houseFrontPicture: () => billingRecord.houseFrontPicture ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>House Front Picture</span>
          <button 
            onClick={() => window.open(billingRecord.houseFrontPicture, '_blank')}
            className={isDarkMode
              ? 'text-blue-400 hover:text-blue-300 flex items-center space-x-1'
              : 'text-blue-600 hover:text-blue-700 flex items-center space-x-1'
            }
          >
            <span className="text-sm truncate max-w-xs">{billingRecord.houseFrontPicture}</span>
            <ExternalLink size={14} />
          </button>
        </div>
      ) : null,
      usageType: () => billingRecord.usageType ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Usage Type</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.usageType}</span>
        </div>
      ) : null,
      dateInstalled: () => billingRecord.dateInstalled ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Date Installed</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.dateInstalled}</span>
        </div>
      ) : null,
      username: () => billingRecord.username ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>PPPOE Username</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.username}</span>
        </div>
      ) : null,
      connectionType: () => billingRecord.connectionType ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Connection Type</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.connectionType}</span>
        </div>
      ) : null,
      routerModel: () => billingRecord.routerModel ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Router Model</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.routerModel}</span>
        </div>
      ) : null,
      routerModemSN: () => billingRecord.routerModemSN ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Router Serial Number</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.routerModemSN}</span>
        </div>
      ) : null,
      onlineStatus: () => billingRecord.onlineStatus ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Online Status</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              billingRecord.onlineStatus === 'Online' ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span className={`font-medium ${
              billingRecord.onlineStatus === 'Online' ? 'text-green-400' : 'text-red-400'
            }`}>{billingRecord.onlineStatus}</span>
          </div>
        </div>
      ) : null,
      mikrotikId: () => billingRecord.mikrotikId ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Mikrotik ID</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.mikrotikId}</span>
        </div>
      ) : null,
      lcpnap: () => billingRecord.lcpnap ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>LCP NAP PORT</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.lcpnap}</span>
        </div>
      ) : null,
      vlan: () => billingRecord.vlan ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>VLAN</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.vlan}</span>
        </div>
      ) : null,
      sessionIp: () => (billingRecord.sessionIp || billingRecord.sessionIP) ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>SESSION IP</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.sessionIp || billingRecord.sessionIP}</span>
        </div>
      ) : null,
      accountNumber: () => (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Account Number</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.applicationId}</span>
        </div>
      ),
      billingStatus: () => (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Billing Status</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.status}</span>
        </div>
      ),
      billingDay: () => (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Billing Day</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.billingDay === 0 ? 'Every end of month' : (billingRecord.billingDay || '-')}</span>
        </div>
      ),
      plan: () => billingRecord.plan ? (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Plan</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>{billingRecord.plan}</span>
        </div>
      ) : null,
      accountBalance: () => (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Account Balance</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>₱{billingRecord.accountBalance || billingRecord.balance || '0.00'}</span>
        </div>
      ),
      totalPaid: () => (
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Total Paid</span>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>₱{billingRecord.totalPaid || '0.00'}</span>
        </div>
      )
    };

    const renderer = fieldRenderers[fieldKey];
    return renderer ? renderer() : null;
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev: Record<string, boolean>) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleTransactClick = () => {
    setShowTransactModal(true);
  };

  const handleTransactConfirm = () => {
    setShowTransactModal(false);
    setShowTransactionFormModal(true);
    console.log('Transaction confirmed for:', billingRecord.applicationId);
  };

  const handleTransactCancel = () => {
    setShowTransactModal(false);
  };

  const handleTransactionFormSave = (formData: any) => {
    console.log('Transaction form saved:', formData);
    setShowTransactionFormModal(false);
  };

  const handleTransactionFormClose = () => {
    setShowTransactionFormModal(false);
  };

  const handleStaggeredInstallationAdd = () => {
    setShowStaggeredInstallationModal(true);
  };

  const handleStaggeredInstallationFormSave = (formData: any) => {
    console.log('Staggered installation form saved:', formData);
    setShowStaggeredInstallationModal(false);
  };

  const handleStaggeredInstallationFormClose = () => {
    setShowStaggeredInstallationModal(false);
  };

  const handleDiscountAdd = () => {
    setShowDiscountModal(true);
  };

  const handleDiscountFormSave = (formData: any) => {
    console.log('Discount form saved:', formData);
    setShowDiscountModal(false);
  };

  const handleDiscountFormClose = () => {
    setShowDiscountModal(false);
  };

  const handleWrenchClick = () => {
    setShowSORequestConfirmModal(true);
  };

  const handleSORequestConfirm = () => {
    setShowSORequestConfirmModal(false);
    setShowSORequestFormModal(true);
  };

  const handleSORequestCancel = () => {
    setShowSORequestConfirmModal(false);
  };

  const handleSORequestFormSave = () => {
    console.log('SO Request saved for:', billingRecord.applicationId);
    setShowSORequestFormModal(false);
  };

  const handleSORequestFormClose = () => {
    setShowSORequestFormModal(false);
  };

  const handleEditClick = () => {
    setEditType('customer_details');
    setShowDetailsEditModal(true);
  };

  const handleDetailsEditSave = async (formData: any) => {
    try {
      if (editType === 'customer_details') {
        await customerDetailUpdateService.updateCustomerDetails(
          billingRecord.applicationId,
          formData
        );
        console.log('Customer details updated successfully');
      } else if (editType === 'billing_details') {
        await customerDetailUpdateService.updateBillingDetails(
          billingRecord.applicationId,
          formData
        );
        console.log('Billing details updated successfully');
      } else if (editType === 'technical_details') {
        await customerDetailUpdateService.updateTechnicalDetails(
          billingRecord.applicationId,
          formData
        );
        console.log('Technical details updated successfully');
      }
      
      setShowDetailsEditModal(false);
      
      // TODO: Refresh the customer details to show updated data
      // You may want to call a parent component refresh function here
    } catch (error) {
      console.error('Failed to update details:', error);
      alert('Failed to update details. Please try again.');
    }
  };

  const handleDetailsEditClose = () => {
    setShowDetailsEditModal(false);
  };

  const defaultOnlineStatus: OnlineStatusRecord[] = onlineStatusRecords.length > 0 ? onlineStatusRecords : [
    {
      id: '1',
      status: 'Online',
      accountNo: billingRecord.applicationId || '',
      username: billingRecord.username || '',
      group: billingRecord.groupName || '',
      splynxId: '1'
    }
  ];

  return (
    <div className={`h-full flex flex-col border-l relative ${
      isDarkMode
        ? 'bg-gray-900 text-white border-white border-opacity-30'
        : 'bg-white text-gray-900 border-gray-300'
    }`} style={{ width: `${detailsWidth}px` }}>
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors z-50"
        style={{
          backgroundColor: isResizing ? (colorPalette?.primary || '#ea580c') : 'transparent'
        }}
        onMouseEnter={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = colorPalette?.accent || '#ea580c';
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        onMouseDown={handleMouseDownResize}
      />
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gray-100 border-gray-200'
      }`}>
        <h1 className={`text-lg font-semibold truncate pr-4 min-w-0 flex-1 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {billingRecord.applicationId} | {billingRecord.customerName} | {billingRecord.address}
        </h1>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button 
            onClick={handleWrenchClick}
            className={`p-2 rounded transition-colors ${
              isDarkMode
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <Wrench size={18} />
          </button>
          <button 
            onClick={handleEditClick}
            className={`p-2 rounded transition-colors ${
              isDarkMode
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <Edit size={18} />
          </button>
          <button 
            onClick={handleTransactClick}
            className="px-3 py-1 rounded text-sm transition-colors text-white"
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
            Transact
          </button>
          <div className="relative">
            <button
              onClick={() => setShowColumnVisibility(!showColumnVisibility)}
              className={`p-2 rounded transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
              title="Column Visibility"
            >
              <Settings size={18} />
            </button>
            {showColumnVisibility && (
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
                  }`}>Column Visibility & Order</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={selectAllColumns}
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      Show All
                    </button>
                    <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>|</span>
                    <button
                      onClick={deselectAllColumns}
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      Hide All
                    </button>
                    <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>|</span>
                    <button
                      onClick={resetFieldOrder}
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      Reset Order
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  {Object.entries({
                    customerDetails: 'Customer Details',
                    technicalDetails: 'Technical Details',
                    billingDetails: 'Billing Details'
                  }).map(([sectionKey, sectionLabel]) => (
                    <div key={sectionKey} className={`mb-2 border rounded ${
                      isDarkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                      <div
                        className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleSectionExpansion(sectionKey)}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={columnVisibility[sectionKey]}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleColumnVisibility(sectionKey);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`font-medium text-sm ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>{sectionLabel}</span>
                        </div>
                        {expandedSection === sectionKey ? (
                          <ChevronDown size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                        ) : (
                          <ChevronRight size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                        )}
                      </div>
                      {expandedSection === sectionKey && (
                        <div className={`px-2 pb-2 border-t ${
                          isDarkMode ? 'border-gray-700' : 'border-gray-200'
                        }`}>
                          <div className={`text-xs mt-2 mb-1 px-2 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            Drag to reorder fields
                          </div>
                          {fieldOrder[sectionKey].map((fieldKey: string, index: number) => (
                            <div
                              key={fieldKey}
                              draggable
                              onDragStart={() => handleDragStart(sectionKey, index)}
                              onDragOver={handleDragOver}
                              onDrop={() => handleDrop(sectionKey, index)}
                              onDragEnd={handleDragEnd}
                              className={`flex items-center space-x-2 px-2 py-1.5 rounded cursor-move transition-colors ${
                                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                              } ${
                                draggedItem?.section === sectionKey && draggedItem?.index === index
                                  ? isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
                                  : ''
                              }`}
                            >
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
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={handleClose}
            className={`p-2 rounded transition-colors ${
              isDarkMode
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {columnVisibility.customerDetails && (
          <div className="space-y-4">
            <h3 className={`font-semibold text-sm mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Customer Details</h3>
            {fieldOrder.customerDetails.map((fieldKey: string) => (
              <React.Fragment key={fieldKey}>
                {renderField(fieldKey, billingRecord)}
              </React.Fragment>
            ))}
          </div>
        )}

        {columnVisibility.technicalDetails && (
          <div className="space-y-4">
            <h3 className={`font-semibold text-sm mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Technical Details</h3>
            {fieldOrder.technicalDetails.map((fieldKey: string) => (
              <React.Fragment key={fieldKey}>
                {renderField(fieldKey, billingRecord)}
              </React.Fragment>
            ))}
          </div>
        )}

        {columnVisibility.billingDetails && (
          <div className="space-y-4">
            <h3 className={`font-semibold text-sm mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Billing Details</h3>
            {fieldOrder.billingDetails.map((fieldKey: string) => (
              <React.Fragment key={fieldKey}>
                {renderField(fieldKey, billingRecord)}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <div className={`border-t ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}></div>

      <div className="flex-1 overflow-y-auto">
        <div className={`border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={() => toggleSection('invoices')}
            className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
              isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className={`font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Related Invoices</span>
              <span className={`text-xs px-2 py-1 rounded ${
                isDarkMode
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-300 text-gray-900'
              }`}>0</span>
            </div>
            {expandedSections.invoices ? (
              <ChevronDown size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
            ) : (
              <ChevronRight size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
            )}
          </button>

          {expandedSections.invoices && (
            <div className="px-6 pb-4">
              <div className={`text-center py-8 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>No items</div>
            </div>
          )}
        </div>

        <div className={`border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={() => toggleSection('paymentPortalLogs')}
            className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
              isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className={`font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Related Payment Portal Logs</span>
              <span className={`text-xs px-2 py-1 rounded ${
                isDarkMode
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-300 text-gray-900'
              }`}>0</span>
            </div>
            {expandedSections.paymentPortalLogs ? (
              <ChevronDown size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
            ) : (
              <ChevronRight size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
            )}
          </button>

          {expandedSections.paymentPortalLogs && (
            <div className="px-6 pb-4">
              <div className={`text-center py-8 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>No items</div>
            </div>
          )}
        </div>

        <div className={`border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={() => toggleSection('transactions')}
            className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
              isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className={`font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Related Transactions</span>
              <span className={`text-xs px-2 py-1 rounded ${
                isDarkMode
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-300 text-gray-900'
              }`}>0</span>
            </div>
            {expandedSections.transactions ? (
              <ChevronDown size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
            ) : (
              <ChevronRight size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
            )}
          </button>

          {expandedSections.transactions && (
            <div className="px-6 pb-4">
              <div className={`text-center py-8 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>No items</div>
              <div className="flex justify-end">
                <button className={isDarkMode
                  ? 'text-red-400 hover:text-red-300 text-sm'
                  : 'text-red-600 hover:text-red-700 text-sm'
                }>Add</button>
              </div>
            </div>
          )}
        </div>

        <div className={`border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={() => toggleSection('staggeredInstallations')}
            className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
              isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className={`font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Related Staggered</span>
              <span className={`text-xs px-2 py-1 rounded ${
                isDarkMode
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-300 text-gray-900'
              }`}>0</span>
            </div>
            {expandedSections.staggeredInstallations ? (
              <ChevronDown size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
            ) : (
              <ChevronRight size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
            )}
          </button>

          {expandedSections.staggeredInstallations && (
            <div className="px-6 pb-4">
              <div className={`text-center py-8 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>No items</div>
              <div className="flex justify-end">
                <button 
                  onClick={handleStaggeredInstallationAdd}
                  className={isDarkMode
                    ? 'text-red-400 hover:text-red-300 text-sm'
                    : 'text-red-600 hover:text-red-700 text-sm'
                  }
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={`border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={() => toggleSection('discounts')}
            className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
              isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className={`font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Related Discounts</span>
              <span className={`text-xs px-2 py-1 rounded ${
                isDarkMode
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-300 text-gray-900'
              }`}>0</span>
            </div>
            {expandedSections.discounts ? (
              <ChevronDown size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
            ) : (
              <ChevronRight size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
            )}
          </button>

          {expandedSections.discounts && (
            <div className="px-6 pb-4">
              <div className={`text-center py-8 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>No items</div>
              <div className="flex justify-end">
                <button 
                  onClick={handleDiscountAdd}
                  className={isDarkMode
                    ? 'text-red-400 hover:text-red-300 text-sm'
                    : 'text-red-600 hover:text-red-700 text-sm'
                  }
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
        {[
          { key: 'serviceOrders', label: 'Related Service Orders' },
          { key: 'reconnectionLogs', label: 'Related Reconnection Logs' },
          { key: 'disconnectedLogs', label: 'Related Disconnected Logs' },
          { key: 'detailsUpdateLogs', label: 'Related Details Update Logs' },
          { key: 'planChangeLogs', label: 'Related Plan Change Logs' },
          { key: 'serviceChargeLogs', label: 'Related Service Charge Logs' },
          { key: 'changeDueLogs', label: 'Related Change Due Logs' },
          { key: 'securityDeposits', label: 'Related Security Deposits' }
        ].map((section) => (
          <div key={section.key} className={`border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <button
              onClick={() => toggleSection(section.key)}
              className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${
                isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className={`font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{section.label}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  isDarkMode
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-300 text-gray-900'
                }`}>0</span>
              </div>
              {expandedSections[section.key] ? (
                <ChevronDown size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
              ) : (
                <ChevronRight size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
              )}
            </button>

            {expandedSections[section.key] && (
              <div className="px-6 pb-4">
                <div className={`text-center py-8 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-600'
                }`}>No items</div>
                <div className="flex justify-end">
                  <button className={isDarkMode
                    ? 'text-red-400 hover:text-red-300 text-sm'
                    : 'text-red-600 hover:text-red-700 text-sm'
                  }>Add</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <TransactConfirmationModal
        isOpen={showTransactModal}
        onConfirm={handleTransactConfirm}
        onCancel={handleTransactCancel}
        amount={`₱${billingRecord.accountBalance || '0.00'}`}
        description={`Transaction for ${billingRecord.customerName} - Account: ${billingRecord.applicationId}`}
        billingRecord={billingRecord}
      />

      <TransactionFormModal
        isOpen={showTransactionFormModal}
        onClose={handleTransactionFormClose}
        onSave={handleTransactionFormSave}
        billingRecord={billingRecord}
      />

      <StaggeredInstallationFormModal
        isOpen={showStaggeredInstallationModal}
        onClose={handleStaggeredInstallationFormClose}
        onSave={handleStaggeredInstallationFormSave}
        customerData={{
          accountNo: billingRecord.applicationId,
          fullName: billingRecord.customerName,
          contactNo: billingRecord.contactNumber,
          emailAddress: billingRecord.emailAddress || billingRecord.email || '',
          address: billingRecord.address?.split(',')[0] || '',
          plan: billingRecord.plan,
          barangay: billingRecord.barangay || '',
          city: billingRecord.city || ''
        }}
      />

      <DiscountFormModal
        isOpen={showDiscountModal}
        onClose={handleDiscountFormClose}
        onSave={handleDiscountFormSave}
        customerData={{
          accountNo: billingRecord.applicationId,
          fullName: billingRecord.customerName,
          address: billingRecord.address
        }}
      />

      {showSORequestConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-xl font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Create Service Order Request</h3>
            <p className={`mb-6 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Do you want to create a service order request for account <span className={`font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>{billingRecord.applicationId}</span>?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleSORequestCancel}
                className={`px-4 py-2 rounded transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSORequestConfirm}
                className="px-4 py-2 rounded transition-colors text-white"
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
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <SORequestFormModal
        isOpen={showSORequestFormModal}
        onClose={handleSORequestFormClose}
        onSave={handleSORequestFormSave}
        customerData={{
          accountNo: billingRecord.applicationId,
          dateInstalled: billingRecord.dateInstalled || '',
          fullName: billingRecord.customerName,
          contactNumber: billingRecord.contactNumber || '',
          plan: billingRecord.plan || '',
          provider: billingRecord.provider || '',
          username: billingRecord.username || '',
          emailAddress: billingRecord.emailAddress || billingRecord.email || ''
        }}
      />



      <CustomerDetailsEditModal
        isOpen={showDetailsEditModal}
        onClose={handleDetailsEditClose}
        onSave={handleDetailsEditSave}
        recordData={billingRecord}
        editType={editType}
      />
    </div>
  );
};

export default BillingDetails;
