import React, { useState, useEffect, useRef } from 'react';
import {
  X, ExternalLink, Edit, Settings
} from 'lucide-react';
import { updateJobOrder, approveJobOrder } from '../services/jobOrderService';
import { getBillingStatuses, BillingStatus } from '../services/lookupService';
import { JobOrderDetailsProps } from '../types/jobOrder';
import JobOrderDoneFormModal from '../modals/JobOrderDoneFormModal';
import JobOrderDoneFormTechModal from '../modals/JobOrderDoneFormTechModal';
import JobOrderEditFormModal from '../modals/JobOrderEditFormModal';
import ApprovalConfirmationModal from '../modals/ApprovalConfirmationModal';
import ConfirmationModal from '../modals/MoveToJoModal';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { getApplication } from '../services/applicationService';
import { Application } from '../types/application';

const JobOrderDetails: React.FC<JobOrderDetailsProps> = ({ jobOrder, onClose, onRefresh, isMobile = false }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDoneModalOpen, setIsDoneModalOpen] = useState(false);
  const [isDoneTechModalOpen, setIsDoneTechModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [billingStatuses, setBillingStatuses] = useState<BillingStatus[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [applicationData, setApplicationData] = useState<Application | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [detailsWidth, setDetailsWidth] = useState<number>(600);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const FIELD_VISIBILITY_KEY = 'jobOrderDetailsFieldVisibility';
  const FIELD_ORDER_KEY = 'jobOrderDetailsFieldOrder';

  const defaultFields = [
    'timestamp',
    'jobOrderNumber',
    'referredBy',
    'fullName',
    'contactNumber',
    'secondContactNumber',
    'emailAddress',
    'fullAddress',
    'billingStatus',
    'billingDay',
    'choosePlan',
    'statusRemarks',
    'remarks',
    'installationLandmark',
    'connectionType',
    'modemRouterSn',
    'routerModel',
    'affiliateName',
    'lcpnap',
    'port',
    'vlan',
    'username',
    'ipAddress',
    'usageType',
    'dateInstalled',
    'visitBy',
    'visitWith',
    'visitWithOther',
    'onsiteStatus',
    'contractTemplate',
    'contractLink',
    'modifiedBy',
    'modifiedDate',
    'assignedEmail',
    'setupImage',
    'speedtestImage',
    'signedContractImage',
    'boxReadingImage',
    'routerReadingImage',
    'portLabelImage',
    'houseFrontPicture'
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
    const authData = localStorage.getItem('authData');
    if (authData) {
      try {
        const userData = JSON.parse(authData);
        setUserRole(userData.role?.toLowerCase() || '');
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    }
  }, []);

  useEffect(() => {
    const fetchBillingStatuses = async () => {
      try {
        const statuses = await getBillingStatuses();
        setBillingStatuses(statuses);
      } catch (error) {
        console.error('Error fetching billing statuses:', error);
      }
    };
    fetchBillingStatuses();
  }, []);

  useEffect(() => {
    const fetchApplicationData = async () => {
      const appId = jobOrder.application_id || jobOrder.Application_ID || jobOrder.account_id;
      if (appId) {
        try {
          const app = await getApplication(appId.toString());
          setApplicationData(app);
        } catch (error) {
          console.error('Error fetching application data:', error);
        }
      }
    };

    if (jobOrder) {
      fetchApplicationData();
    }
  }, [jobOrder]);

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

  const getBillingStatusName = (statusId?: number | null): string => {
    if (!statusId) return 'Not Set';

    if (billingStatuses.length === 0) {
      const defaultStatuses: { [key: number]: string } = {
        1: 'In Progress',
        2: 'Active',
        3: 'Suspended',
        4: 'Cancelled',
        5: 'Overdue'
      };
      return defaultStatuses[statusId] || 'Loading...';
    }

    const status = billingStatuses.find(s => s.id === statusId);
    return status ? status.status_name : `Unknown (ID: ${statusId})`;
  };

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return 'Not scheduled';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  const formatPrice = (price?: string | number | null): string => {
    if (price === null || price === undefined) return '₱0.00';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `₱${numPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getLastDayOfMonth = (): number => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.getDate();
  };

  const getBillingDayDisplay = (billingDay?: string | number | null): string => {
    const day = billingDay ?? null;
    if (day === null || day === undefined) return 'Not set';
    const dayValue = Number(day);
    if (isNaN(dayValue)) return 'Not set';
    return dayValue === 0 ? String(getLastDayOfMonth()) : String(dayValue);
  };

  const getClientFullName = (): string => {
    const joName = [
      jobOrder.First_Name || jobOrder.first_name || '',
      jobOrder.Middle_Initial || jobOrder.middle_initial ? (jobOrder.Middle_Initial || jobOrder.middle_initial) + '.' : '',
      jobOrder.Last_Name || jobOrder.last_name || ''
    ].filter(Boolean).join(' ').trim();

    if (joName) return joName;

    if (applicationData) {
      return [
        applicationData.first_name || '',
        applicationData.middle_initial ? applicationData.middle_initial + '.' : '',
        applicationData.last_name || ''
      ].filter(Boolean).join(' ').trim();
    }

    return 'Unknown Client';
  };

  const getClientFullAddress = (): string => {
    const joAddressParts = [
      jobOrder.Installation_Address || jobOrder.installation_address || jobOrder.Address || jobOrder.address,
      jobOrder.Location || jobOrder.location,
      jobOrder.Barangay || jobOrder.barangay,
      jobOrder.City || jobOrder.city,
      jobOrder.Region || jobOrder.region
    ].filter(Boolean);

    if (joAddressParts.length > 0) return joAddressParts.join(', ');

    if (applicationData) {
      const appAddressParts = [
        applicationData.installation_address,
        applicationData.location,
        applicationData.barangay,
        applicationData.city,
        applicationData.region
      ].filter(Boolean);

      if (appAddressParts.length > 0) return appAddressParts.join(', ');
    }

    return 'No address provided';
  };

  const getStatusColor = (status: string | undefined | null, type: 'onsite' | 'billing') => {
    if (!status) return 'text-gray-400';

    if (type === 'onsite') {
      switch (status.toLowerCase()) {
        case 'done':
        case 'completed':
          return 'text-green-400';
        case 'reschedule':
          return 'text-blue-400';
        case 'inprogress':
        case 'in progress':
          return 'text-blue-400';
        case 'pending':
          return 'text-orange-400';
        case 'failed':
        case 'cancelled':
          return 'text-red-500';
        default:
          return 'text-gray-400';
      }
    } else {
      switch (status.toLowerCase()) {
        case 'done':
        case 'active':
        case 'completed':
          return 'text-green-400';
        case 'pending':
        case 'in progress':
          return 'text-orange-400';
        case 'suspended':
        case 'overdue':
          return 'text-red-500';
        case 'cancelled':
          return 'text-red-500';
        default:
          return 'text-gray-400';
      }
    }
  };

  const handleDoneClick = () => {
    if (userRole === 'technician') {
      setIsDoneTechModalOpen(true);
    } else {
      setIsDoneModalOpen(true);
    }
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleDoneSave = async (formData: any) => {
    try {
      setLoading(true);

      if (!jobOrder.id) {
        throw new Error('Cannot update job order: Missing ID');
      }

      await updateJobOrder(jobOrder.id, {
        Onsite_Status: formData.onsiteStatus,
        Modified_By: formData.modifiedBy,
        Modified_Date: formData.modifiedDate,
        Contract_Link: formData.contractLink,
        Contract_Template: formData.contractTemplate,
        Assigned_Email: formData.assignedEmail
      });

      setSuccessMessage('Job Order updated successfully!');
      setShowSuccessModal(true);
      setIsDoneModalOpen(false);
    } catch (err: any) {
      setError(`Failed to update job order: ${err.message}`);
      console.error('Update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async (formData: any) => {
    try {
      setLoading(true);

      if (!jobOrder.id) {
        throw new Error('Cannot update job order: Missing ID');
      }

      await updateJobOrder(jobOrder.id, {
        Referred_By: formData.referredBy,
        Date_Installed: formData.dateInstalled,
        Usage_Type: formData.usageType,
        First_Name: formData.firstName,
        Middle_Initial: formData.middleInitial,
        Last_Name: formData.lastName,
        Contact_Number: formData.contactNumber,
        Second_Contact_Number: formData.secondContactNumber,
        Email_Address: formData.email,
        Address: formData.address,
        Barangay: formData.barangay,
        City: formData.city,
        Region: formData.region,
        Address_Coordinates: formData.addressCoordinates,
        Choose_Plan: formData.choosePlan,
        Status: formData.status,
        Connection_Type: formData.connectionType,
        Router_Model: formData.routerModel,
        Modem_SN: formData.modemSN,
        Provider: formData.provider,
        LCP: formData.lcp,
        NAP: formData.nap,
        PORT: formData.port,
        VLAN: formData.vlan,
        Username: formData.username,
        Onsite_Status: formData.onsiteStatus,
        Onsite_Remarks: formData.onsiteRemarks,
        Modified_By: formData.modifiedBy,
        Modified_Date: formData.modifiedDate,
        Contract_Link: formData.contractLink,
        Contract_Template: formData.contractTemplate,
        Assigned_Email: formData.assignedEmail,
        Item_Name_1: formData.itemName1,
        Visit_By: formData.visitBy,
        Visit_With: formData.visitWith,
        Visit_With_Other: formData.visitWithOther,
        Status_Remarks: formData.statusRemarks
      });

      setSuccessMessage('Job Order updated successfully!');
      setShowSuccessModal(true);
      setIsEditModalOpen(false);
    } catch (err: any) {
      setError(`Failed to update job order: ${err.message}`);
      console.error('Update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = () => {
    setIsApprovalModalOpen(true);
  };

  const handleApproveConfirm = async () => {
    try {
      setLoading(true);

      if (!jobOrder.id) {
        throw new Error('Cannot approve job order: Missing ID');
      }

      const response = await approveJobOrder(jobOrder.id);

      if (response.success) {
        const accountNumber = response.data?.account_number || 'N/A';
        const contactNumber = response.data?.contact_number_primary || 'N/A';
        const userCreated = response.data?.user_created;

        let message = 'Job Order approved successfully! Customer, billing account, and technical details have been created.';

        if (userCreated) {
          message += `\n\nCustomer Login Credentials:\nUsername: ${accountNumber}\nPassword: ${contactNumber}`;
        }

        setSuccessMessage(message);
        setShowSuccessModal(true);
        setIsApprovalModalOpen(false);
        if (onRefresh) {
          onRefresh();
        }
        onClose();
      } else {
        throw new Error(response.message || 'Failed to approve job order');
      }
    } catch (err: any) {
      setError(`Failed to approve job order: ${err.message}`);
      console.error('Approve error:', err);
    } finally {
      setLoading(false);
    }
  };

  const shouldShowApproveButton = () => {
    const onsiteStatus = (jobOrder.Onsite_Status || '').toLowerCase();
    const billingStatus = (jobOrder.billing_status || jobOrder.Billing_Status || '').toLowerCase();
    const isAdministrator = userRole === 'administrator';

    return onsiteStatus === 'done' && billingStatus !== 'done' && isAdministrator;
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setLoading(true);

      if (!jobOrder.id) {
        throw new Error('Cannot update job order: Missing ID');
      }

      await updateJobOrder(jobOrder.id, {
        Onsite_Status: newStatus,
        Modified_By: 'current_user@ampere.com',
      });

      jobOrder.Onsite_Status = newStatus;

      setSuccessMessage(`Status updated to ${newStatus}`);
      setShowSuccessModal(true);
    } catch (err: any) {
      setError(`Failed to update status: ${err.message}`);
      console.error('Status update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = (fieldKey: string): string => {
    const labels: Record<string, string> = {
      timestamp: 'Timestamp',
      jobOrderNumber: 'Job Order Number',
      referredBy: 'Referred By',
      fullName: 'Full Name',
      contactNumber: 'Contact Number',
      secondContactNumber: 'Second Contact Number',
      emailAddress: 'Email Address',
      fullAddress: 'Full Address',
      billingStatus: 'Billing Status',
      billingDay: 'Billing Day',
      choosePlan: 'Choose Plan',
      statusRemarks: 'Status Remarks',
      remarks: 'Remarks',
      installationLandmark: 'Installation Landmark',
      connectionType: 'Connection Type',
      modemRouterSn: 'Modem/Router SN',
      routerModel: 'Router Model',
      affiliateName: 'Affiliate Name',
      lcpnap: 'LCPNAP',
      port: 'PORT',
      vlan: 'VLAN',
      username: 'Username',
      ipAddress: 'IP Address',
      usageType: 'Usage Type',
      dateInstalled: 'Date Installed',
      visitBy: 'Visit By',
      visitWith: 'Visit With',
      visitWithOther: 'Visit With Other',
      onsiteStatus: 'Onsite Status',
      contractTemplate: 'Contract Template',
      contractLink: 'Contract Link',
      modifiedBy: 'Modified By',
      modifiedDate: 'Modified Date',
      assignedEmail: 'Assigned Email',
      setupImage: 'Setup Image',
      speedtestImage: 'Speedtest Image',
      signedContractImage: 'Signed Contract Image',
      boxReadingImage: 'Box Reading Image',
      routerReadingImage: 'Router Reading Image',
      portLabelImage: 'Port Label Image',
      houseFrontPicture: 'House Front Picture'
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

  const renderFieldContent = (fieldKey: string) => {
    if (!fieldVisibility[fieldKey]) return null;

    const baseFieldClass = `flex border-b pb-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`;
    const labelClass = `w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`;
    const valueClass = `flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`;

    switch (fieldKey) {
      case 'timestamp':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Timestamp:</div>
            <div className={valueClass}>{formatDate(jobOrder.Create_DateTime || jobOrder.created_at || jobOrder.timestamp)}</div>
          </div>
        );

      case 'jobOrderNumber':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Job Order #:</div>
            <div className={valueClass}>{jobOrder.id || jobOrder.JobOrder_ID || (applicationData ? 'App-' + applicationData.id : 'N/A')}</div>
          </div>
        );

      case 'referredBy':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Referred By:</div>
            <div className={valueClass}>{jobOrder.Referred_By || jobOrder.referred_by || (applicationData?.referred_by) || 'None'}</div>
          </div>
        );

      case 'fullName':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Full Name:</div>
            <div className={valueClass}>{getClientFullName()}</div>
          </div>
        );

      case 'contactNumber':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Contact Number:</div>
            <div className={valueClass}>
              {jobOrder.Contact_Number || jobOrder.mobile_number || (applicationData?.mobile_number) || 'Not provided'}
            </div>
          </div>
        );

      case 'secondContactNumber':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Second Contact Number:</div>
            <div className={valueClass}>
              {jobOrder.Second_Contact_Number || jobOrder.secondary_mobile_number || (applicationData?.secondary_mobile_number) || 'Not provided'}
            </div>
          </div>
        );

      case 'emailAddress':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Email Address:</div>
            <div className={valueClass}>
              {jobOrder.Email_Address || jobOrder.email_address || (applicationData?.email_address) || 'Not provided'}
            </div>
          </div>
        );

      case 'fullAddress':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Full Address:</div>
            <div className={valueClass}>{getClientFullAddress()}</div>
          </div>
        );

      case 'billingStatus':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Billing Status:</div>
            <div className={valueClass}>{jobOrder.billing_status || jobOrder.Billing_Status || 'Not Set'}</div>
          </div>
        );

      case 'billingDay':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Billing Day:</div>
            <div className={valueClass}>{getBillingDayDisplay(jobOrder.Billing_Day || jobOrder.billing_day)}</div>
          </div>
        );

      case 'choosePlan':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Choose Plan:</div>
            <div className={valueClass}>
              {jobOrder.Desired_Plan || jobOrder.desired_plan || jobOrder.Choose_Plan || jobOrder.choose_plan || (applicationData?.desired_plan) || 'Not specified'}
            </div>
          </div>
        );

      case 'statusRemarks':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Status Remarks:</div>
            <div className={valueClass}>{jobOrder.Status_Remarks || jobOrder.status_remarks || 'No remarks'}</div>
          </div>
        );

      case 'remarks':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Remarks:</div>
            <div className={valueClass}>{jobOrder.Remarks || jobOrder.onsite_remarks || 'No remarks'}</div>
          </div>
        );

      case 'installationLandmark':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Installation Landmark:</div>
            <div className={valueClass}>{jobOrder.Installation_Landmark || jobOrder.installation_landmark || jobOrder.landmark || (applicationData?.landmark) || 'Not provided'}</div>
          </div>
        );

      case 'connectionType':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Connection Type:</div>
            <div className={valueClass}>{jobOrder.Connection_Type || jobOrder.connection_type || 'Not specified'}</div>
          </div>
        );

      case 'modemRouterSn':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Modem/Router SN:</div>
            <div className={valueClass}>{jobOrder.Modem_Router_SN || jobOrder.modem_router_sn || jobOrder.Modem_SN || jobOrder.modem_sn || 'Not specified'}</div>
          </div>
        );

      case 'routerModel':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Router Model:</div>
            <div className={valueClass}>{jobOrder.Router_Model || jobOrder.router_model || 'Not specified'}</div>
          </div>
        );

      case 'affiliateName':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Affiliate Name:</div>
            <div className={valueClass}>{jobOrder.group_name || jobOrder.Group_Name || 'Not specified'}</div>
          </div>
        );

      case 'lcpnap':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>LCPNAP:</div>
            <div className={valueClass}>{jobOrder.LCPNAP || jobOrder.lcpnap || 'Not specified'}</div>
          </div>
        );

      case 'port':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>PORT:</div>
            <div className={valueClass}>{jobOrder.PORT || jobOrder.Port || jobOrder.port || 'Not specified'}</div>
          </div>
        );

      case 'vlan':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>VLAN:</div>
            <div className={valueClass}>{jobOrder.VLAN || jobOrder.vlan || 'Not specified'}</div>
          </div>
        );

      case 'username':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Username:</div>
            <div className={valueClass}>{jobOrder.Username || jobOrder.username || jobOrder.pppoe_username || 'Not provided'}</div>
          </div>
        );

      case 'ipAddress':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>IP Address:</div>
            <div className={valueClass}>{jobOrder.IP_Address || jobOrder.ip_address || jobOrder.IP || jobOrder.ip || 'Not specified'}</div>
          </div>
        );

      case 'usageType':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Usage Type:</div>
            <div className={valueClass}>{jobOrder.Usage_Type || jobOrder.usage_type || 'Not specified'}</div>
          </div>
        );

      case 'dateInstalled':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Date Installed:</div>
            <div className={valueClass}>
              {(jobOrder.Date_Installed || jobOrder.date_installed)
                ? formatDate(jobOrder.Date_Installed || jobOrder.date_installed)
                : 'Not installed yet'}
            </div>
          </div>
        );

      case 'visitBy':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Visit By:</div>
            <div className={valueClass}>{jobOrder.Visit_By || jobOrder.visit_by || 'Not assigned'}</div>
          </div>
        );

      case 'visitWith':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Visit With:</div>
            <div className={valueClass}>{jobOrder.Visit_With || jobOrder.visit_with || 'None'}</div>
          </div>
        );

      case 'visitWithOther':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Visit With Other:</div>
            <div className={valueClass}>{jobOrder.Visit_With_Other || jobOrder.visit_with_other || 'None'}</div>
          </div>
        );

      case 'onsiteStatus':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Onsite Status:</div>
            <div className={`${getStatusColor(jobOrder.Onsite_Status, 'onsite')} flex-1 capitalize`}>
              {jobOrder.Onsite_Status === 'inprogress' ? 'In Progress' : (jobOrder.Onsite_Status || 'Not set')}
            </div>
          </div>
        );

      case 'contractTemplate':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Contract Template:</div>
            <div className={valueClass}>{jobOrder.Contract_Template || 'Standard'}</div>
          </div>
        );

      case 'contractLink':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Contract Link:</div>
            <div className={`flex-1 truncate flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {jobOrder.Contract_Link || 'Not available'}
              {jobOrder.Contract_Link && (
                <button className={isDarkMode ? 'text-gray-400 hover:text-white ml-2' : 'text-gray-600 hover:text-gray-900 ml-2'}>
                  <ExternalLink size={16} />
                </button>
              )}
            </div>
          </div>
        );

      case 'modifiedBy':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Modified By:</div>
            <div className={valueClass}>{jobOrder.Modified_By || 'System'}</div>
          </div>
        );

      case 'modifiedDate':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Modified Date:</div>
            <div className={valueClass}>{formatDate(jobOrder.Modified_Date)}</div>
          </div>
        );

      case 'assignedEmail':
        return (
          <div className={baseFieldClass}>
            <div className={labelClass}>Assigned Email:</div>
            <div className={valueClass}>{jobOrder.Assigned_Email || 'Not assigned'}</div>
          </div>
        );

      case 'setupImage':
        return (
          <div className={`flex border-b py-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className={`w-40 text-sm whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Setup Image</div>
            <div className={`flex-1 flex items-center justify-between min-w-0 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <span className="truncate mr-2">
                {jobOrder.setup_image_url || jobOrder.Setup_Image_URL || jobOrder.Setup_Image_Url || 'No image available'}
              </span>
              {(jobOrder.setup_image_url || jobOrder.Setup_Image_URL || jobOrder.Setup_Image_Url) && (
                <button
                  className={`flex-shrink-0 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  onClick={() => window.open(jobOrder.setup_image_url || jobOrder.Setup_Image_URL || jobOrder.Setup_Image_Url || '')}
                >
                  <ExternalLink size={16} />
                </button>
              )}
            </div>
          </div>
        );

      case 'speedtestImage':
        return (
          <div className={`flex border-b py-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className={`w-40 text-sm whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Speedtest Image</div>
            <div className={`flex-1 flex items-center justify-between min-w-0 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <span className="truncate mr-2">
                {jobOrder.speedtest_image_url || jobOrder.Speedtest_Image_URL || jobOrder.speedtest_image || jobOrder.Speedtest_Image || 'No image available'}
              </span>
              {(jobOrder.speedtest_image_url || jobOrder.Speedtest_Image_URL || jobOrder.speedtest_image || jobOrder.Speedtest_Image) && (
                <button
                  className={`flex-shrink-0 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  onClick={() => window.open(jobOrder.speedtest_image_url || jobOrder.Speedtest_Image_URL || jobOrder.speedtest_image || jobOrder.Speedtest_Image || '')}
                >
                  <ExternalLink size={16} />
                </button>
              )}
            </div>
          </div>
        );

      case 'signedContractImage':
        return (
          <div className={`flex border-b py-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className={`w-40 text-sm whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Signed Contract Image</div>
            <div className={`flex-1 flex items-center justify-between min-w-0 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <span className="truncate mr-2">
                {jobOrder.signed_contract_image_url || jobOrder.Signed_Contract_Image_URL || jobOrder.signed_contract_url || jobOrder.Signed_Contract_URL || 'No image available'}
              </span>
              {(jobOrder.signed_contract_image_url || jobOrder.Signed_Contract_Image_URL || jobOrder.signed_contract_url || jobOrder.Signed_Contract_URL) && (
                <button
                  className={`flex-shrink-0 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  onClick={() => window.open(jobOrder.signed_contract_image_url || jobOrder.Signed_Contract_Image_URL || jobOrder.signed_contract_url || jobOrder.Signed_Contract_URL || '')}
                >
                  <ExternalLink size={16} />
                </button>
              )}
            </div>
          </div>
        );

      case 'boxReadingImage':
        return (
          <div className={`flex border-b py-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className={`w-40 text-sm whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Box Reading Image</div>
            <div className={`flex-1 flex items-center justify-between min-w-0 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <span className="truncate mr-2">
                {jobOrder.box_reading_image_url || jobOrder.Box_Reading_Image_URL || jobOrder.box_reading_url || jobOrder.Box_Reading_URL || 'No image available'}
              </span>
              {(jobOrder.box_reading_image_url || jobOrder.Box_Reading_Image_URL || jobOrder.box_reading_url || jobOrder.Box_Reading_URL) && (
                <button
                  className={`flex-shrink-0 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  onClick={() => window.open(jobOrder.box_reading_image_url || jobOrder.Box_Reading_Image_URL || jobOrder.box_reading_url || jobOrder.Box_Reading_URL || '')}
                >
                  <ExternalLink size={16} />
                </button>
              )}
            </div>
          </div>
        );

      case 'routerReadingImage':
        return (
          <div className={`flex border-b py-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className={`w-40 text-sm whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Router Reading Image</div>
            <div className={`flex-1 flex items-center justify-between min-w-0 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <span className="truncate mr-2">
                {jobOrder.router_reading_image_url || jobOrder.Router_Reading_Image_URL || jobOrder.router_reading_url || jobOrder.Router_Reading_URL || 'No image available'}
              </span>
              {(jobOrder.router_reading_image_url || jobOrder.Router_Reading_Image_URL || jobOrder.router_reading_url || jobOrder.Router_Reading_URL) && (
                <button
                  className={`flex-shrink-0 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  onClick={() => window.open(jobOrder.router_reading_image_url || jobOrder.Router_Reading_Image_URL || jobOrder.router_reading_url || jobOrder.Router_Reading_URL || '')}
                >
                  <ExternalLink size={16} />
                </button>
              )}
            </div>
          </div>
        );

      case 'portLabelImage':
        return (
          <div className={`flex border-b py-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className={`w-40 text-sm whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Port Label Image</div>
            <div className={`flex-1 flex items-center justify-between min-w-0 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <span className="truncate mr-2">
                {jobOrder.port_label_image_url || jobOrder.Port_Label_Image_URL || jobOrder.port_label_url || jobOrder.Port_Label_URL || 'No image available'}
              </span>
              {(jobOrder.port_label_image_url || jobOrder.Port_Label_Image_URL || jobOrder.port_label_url || jobOrder.Port_Label_URL) && (
                <button
                  className={`flex-shrink-0 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  onClick={() => window.open(jobOrder.port_label_image_url || jobOrder.Port_Label_Image_URL || jobOrder.port_label_url || jobOrder.Port_Label_URL || '')}
                >
                  <ExternalLink size={16} />
                </button>
              )}
            </div>
          </div>
        );

      case 'houseFrontPicture':
        return (
          <div className={`flex border-b py-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className={`w-40 text-sm whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>House Front Picture</div>
            <div className={`flex-1 flex items-center justify-between min-w-0 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <span className="truncate mr-2">
                {jobOrder.house_front_picture_url || jobOrder.House_Front_Picture_URL || jobOrder.house_front_picture || jobOrder.House_Front_Picture || 'No image available'}
              </span>
              {(jobOrder.house_front_picture_url || jobOrder.House_Front_Picture_URL || jobOrder.house_front_picture || jobOrder.House_Front_Picture) && (
                <button
                  className={`flex-shrink-0 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  onClick={() => window.open(jobOrder.house_front_picture_url || jobOrder.House_Front_Picture_URL || jobOrder.house_front_picture || jobOrder.House_Front_Picture || '')}
                >
                  <ExternalLink size={16} />
                </button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`h-full flex flex-col overflow-hidden ${!isMobile ? 'md:border-l' : ''} relative w-full md:w-auto ${isDarkMode ? 'bg-gray-950 border-white border-opacity-30' : 'bg-gray-50 border-gray-300'
        }`}
      style={!isMobile && window.innerWidth >= 768 ? { width: `${detailsWidth}px` } : undefined}
    >
      {!isMobile && (
        <div
          className={`hidden md:block absolute left-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors z-50 ${isDarkMode ? 'hover:bg-orange-500' : 'hover:bg-orange-600'
            }`}
          onMouseDown={handleMouseDownResize}
        />
      )}
      <div className={`p-3 flex items-center justify-between border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
        <div className="flex items-center flex-1 min-w-0">
          <h2 className={`font-medium truncate ${isMobile ? 'max-w-[200px] text-sm' : ''} ${isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>{getClientFullName()}</h2>
          {loading && <div className={`ml-3 animate-pulse text-sm flex-shrink-0 ${isDarkMode ? 'text-orange-500' : 'text-orange-600'
            }`}>Loading...</div>}
        </div>

        <div className="flex items-center space-x-3">
          {userRole !== 'technician' && (
            <>
              <button className={`p-1 rounded-sm border flex items-center justify-center ${isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900 border-gray-300'
                }`}>
                <ExternalLink size={16} />
              </button>
            </>
          )}
          {shouldShowApproveButton() && (
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-sm flex items-center"
              onClick={handleApproveClick}
              disabled={loading}
            >
              <span>Approve</span>
            </button>
          )}
          {!(jobOrder.Onsite_Status && jobOrder.Onsite_Status.toLowerCase() === 'done') && (
            <button
              className="text-white px-3 py-1 rounded-sm flex items-center transition-colors text-sm md:text-base font-medium"
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
              onClick={handleDoneClick}
              disabled={loading}
            >
              <span>Done</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowFieldSettings(!showFieldSettings)}
              className={isDarkMode ? 'hover:text-white text-gray-400' : 'hover:text-gray-900 text-gray-600'}
              title="Field Settings"
            >
              <Settings size={16} />
            </button>
            {showFieldSettings && (
              <div className={`absolute right-0 mt-2 w-80 rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto ${isDarkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
                }`}>
                <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
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
                  <div className={`text-xs mb-2 px-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
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
                      className={`flex items-center space-x-2 px-2 py-1.5 rounded cursor-move transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        } ${draggedIndex === index
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
                      <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                        }`}>☰</span>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
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

      {userRole !== 'technician' && (
        <div className={`py-3 border-b ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-200'
          }`}>
          <div className="flex items-center justify-center px-4">
            <button
              onClick={handleEditClick}
              disabled={loading}
              className={`flex flex-col items-center text-center p-2 rounded-md transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
                }`}
            >
              <div
                className="p-2 rounded-full transition-colors"
                style={{
                  backgroundColor: loading ? (isDarkMode ? '#4b5563' : '#9ca3af') : (colorPalette?.primary || '#ea580c')
                }}
                onMouseEnter={(e) => {
                  if (!loading && colorPalette?.accent) {
                    e.currentTarget.style.backgroundColor = colorPalette.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ea580c';
                  }
                }}
              >
                <Edit className="text-white" size={18} />
              </div>
              <span className={`text-xs mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Edit</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className={`p-3 m-3 rounded ${isDarkMode
          ? 'bg-red-900 bg-opacity-20 border border-red-700 text-red-400'
          : 'bg-red-100 border border-red-300 text-red-700'
          }`}>
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className={`max-w-2xl mx-auto py-6 px-4 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
          }`}>
          <div className="space-y-4">
            {fieldOrder.map((fieldKey) => (
              <React.Fragment key={fieldKey}>
                {renderFieldContent(fieldKey)}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <JobOrderDoneFormModal
        isOpen={isDoneModalOpen}
        onClose={() => setIsDoneModalOpen(false)}
        onSave={handleDoneSave}
        jobOrderData={jobOrder}
      />

      <JobOrderDoneFormTechModal
        isOpen={isDoneTechModalOpen}
        onClose={() => setIsDoneTechModalOpen(false)}
        onSave={handleDoneSave}
        jobOrderData={jobOrder}
      />

      <JobOrderEditFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditSave}
        jobOrderData={jobOrder}
      />

      <ApprovalConfirmationModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        onConfirm={handleApproveConfirm}
        loading={loading}
      />

      <ConfirmationModal
        isOpen={showSuccessModal}
        title="Success"
        message={successMessage}
        confirmText="OK"
        cancelText="Close"
        onConfirm={() => setShowSuccessModal(false)}
        onCancel={() => setShowSuccessModal(false)}
      />
    </div>
  );
};

export default JobOrderDetails;
