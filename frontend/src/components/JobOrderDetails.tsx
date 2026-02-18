import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Modal, ActivityIndicator, Linking, useWindowDimensions } from 'react-native';
import { X, ExternalLink, Edit } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { getJobOrderItems, JobOrderItem } from '../services/jobOrderItemService';

const JobOrderDetails: React.FC<JobOrderDetailsProps> = ({ jobOrder, onClose, onRefresh, isMobile: propIsMobile = false }) => {
  const { width } = useWindowDimensions();
  const isMobile = propIsMobile || width < 768;
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
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [applicationData, setApplicationData] = useState<Application | null>(null);
  const [jobOrderItems, setJobOrderItems] = useState<JobOrderItem[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');


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
    'lcpnap',
    'port',
    'vlan',
    'username',
    'ipAddress',
    'usageType',
    'installationFee',
    'jobOrderItems',
    'dateInstalled',
    'visitBy',
    'visitWith',
    'visitWithOther',
    'onsiteStatus',
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



  useEffect(() => {
    const loadSettings = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark');

      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        try {
          const userData = JSON.parse(authData);
          setUserRole(userData.role?.toLowerCase() || '');
          setUserRoleId(userData.role_id);
        } catch (error) {
          console.error('Error parsing auth data:', error);
        }
      }
    };
    loadSettings();
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
    const fetchItems = async () => {
      // Get the correct numeric Job Order ID
      const rawId = jobOrder.JobOrder_ID || jobOrder.id;

      // If it's an application ID (e.g. "App-123"), skip fetching
      if (!rawId || (typeof rawId === 'string' && rawId.startsWith('App-'))) {
        setJobOrderItems([]);
        return;
      }

      const id = Number(rawId);
      if (!isNaN(id)) {
        try {
          const response = await getJobOrderItems(id);
          if (response.success && Array.isArray(response.data)) {
            setJobOrderItems(response.data);
          } else if (jobOrder.job_order_items && Array.isArray(jobOrder.job_order_items)) {
            // Fallback to items already in the prop if fetch fails or returns empty
            setJobOrderItems(jobOrder.job_order_items);
          }
        } catch (error) {
          console.error('Error fetching job order items:', error);
          if (jobOrder.job_order_items && Array.isArray(jobOrder.job_order_items)) {
            setJobOrderItems(jobOrder.job_order_items);
          }
        }
      } else if (jobOrder.job_order_items && Array.isArray(jobOrder.job_order_items)) {
        setJobOrderItems(jobOrder.job_order_items);
      }
    };
    fetchItems();
  }, [jobOrder]);

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
      jobOrder.Barangay || jobOrder.barangay,
      jobOrder.City || jobOrder.city,
      jobOrder.Region || jobOrder.region
    ].filter(Boolean);

    if (joAddressParts.length > 0) return joAddressParts.join(', ');

    if (applicationData) {
      const appAddressParts = [
        applicationData.installation_address,
        applicationData.barangay,
        applicationData.city,
        applicationData.region
      ].filter(Boolean);

      if (appAddressParts.length > 0) return appAddressParts.join(', ');
    }

    return 'No address provided';
  };

  const getStatusColor = (status: string | undefined | null, type: 'onsite' | 'billing') => {
    if (!status) return '#9ca3af';

    if (type === 'onsite') {
      switch (status.toLowerCase()) {
        case 'done':
        case 'completed':
          return '#4ade80';
        case 'reschedule':
          return '#60a5fa';
        case 'inprogress':
        case 'in progress':
          return '#60a5fa';
        case 'pending':
          return '#fb923c';
        case 'failed':
        case 'cancelled':
          return '#ef4444';
        default:
          return '#9ca3af';
      }
    } else {
      switch (status.toLowerCase()) {
        case 'done':
        case 'active':
        case 'completed':
          return '#4ade80';
        case 'pending':
        case 'in progress':
          return '#fb923c';
        case 'suspended':
        case 'overdue':
          return '#ef4444';
        case 'cancelled':
          return '#ef4444';
        default:
          return '#9ca3af';
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
      lcpnap: 'LCPNAP',
      port: 'PORT',
      vlan: 'VLAN',
      username: 'Username',
      ipAddress: 'IP Address',
      usageType: 'Usage Type',
      installationFee: 'Installation Fee',
      jobOrderItems: 'Job Order Items',
      dateInstalled: 'Date Installed',
      visitBy: 'Visit By',
      visitWith: 'Visit With',
      visitWithOther: 'Visit With Other',
      onsiteStatus: 'Onsite Status',
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



  const linkStyle = { marginLeft: 8 };
  const valueStyle = {
    color: isDarkMode ? '#ffffff' : '#111827',
    fontSize: 16,
  };

  const renderImageLink = (url: string | undefined | null) => (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ flex: 1, marginRight: 8, ...valueStyle }} numberOfLines={1} selectable={true}>
        {url || 'No image available'}
      </Text>
      {url && (
        <Pressable onPress={() => Linking.openURL(url || '')}>
          <ExternalLink width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
        </Pressable>
      )}
    </View>
  );

  const fieldRenderers: Record<string, () => React.ReactNode> = {
    timestamp: () => <Text style={valueStyle} selectable={true}>{formatDate(jobOrder.Create_DateTime || jobOrder.created_at || jobOrder.timestamp)}</Text>,
    jobOrderNumber: () => <Text style={valueStyle} selectable={true}>{jobOrder.id || jobOrder.JobOrder_ID || (applicationData ? 'App-' + applicationData.id : 'N/A')}</Text>,
    referredBy: () => <Text style={valueStyle} selectable={true}>{jobOrder.Referred_By || jobOrder.referred_by || (applicationData?.referred_by) || 'None'}</Text>,
    fullName: () => <Text style={valueStyle} selectable={true}>{getClientFullName()}</Text>,
    contactNumber: () => <Text style={valueStyle} selectable={true}>{jobOrder.Contact_Number || jobOrder.mobile_number || (applicationData?.mobile_number) || 'Not provided'}</Text>,
    secondContactNumber: () => <Text style={valueStyle} selectable={true}>{jobOrder.Second_Contact_Number || jobOrder.secondary_mobile_number || (applicationData?.secondary_mobile_number) || 'Not provided'}</Text>,
    emailAddress: () => <Text style={valueStyle} selectable={true}>{jobOrder.Email_Address || jobOrder.email_address || (applicationData?.email_address) || 'Not provided'}</Text>,
    fullAddress: () => <Text style={valueStyle} selectable={true}>{getClientFullAddress()}</Text>,
    billingStatus: () => <Text style={valueStyle} selectable={true}>{jobOrder.billing_status || jobOrder.Billing_Status || 'Not Set'}</Text>,
    billingDay: () => <Text style={valueStyle} selectable={true}>{getBillingDayDisplay(jobOrder.Billing_Day || jobOrder.billing_day)}</Text>,
    choosePlan: () => <Text style={valueStyle} selectable={true}>{jobOrder.Desired_Plan || jobOrder.desired_plan || jobOrder.Choose_Plan || jobOrder.choose_plan || (applicationData?.desired_plan) || 'Not specified'}</Text>,
    statusRemarks: () => <Text style={valueStyle} selectable={true}>{jobOrder.Status_Remarks || jobOrder.status_remarks || 'No remarks'}</Text>,
    remarks: () => <Text style={valueStyle} selectable={true}>{jobOrder.Remarks || jobOrder.onsite_remarks || 'No remarks'}</Text>,
    installationLandmark: () => <Text style={valueStyle} selectable={true}>{jobOrder.Installation_Landmark || jobOrder.installation_landmark || jobOrder.landmark || (applicationData?.landmark) || 'Not provided'}</Text>,
    connectionType: () => <Text style={valueStyle} selectable={true}>{jobOrder.Connection_Type || jobOrder.connection_type || 'Not specified'}</Text>,
    modemRouterSn: () => <Text style={valueStyle} selectable={true}>{jobOrder.Modem_Router_SN || jobOrder.modem_router_sn || jobOrder.Modem_SN || jobOrder.modem_sn || 'Not specified'}</Text>,
    routerModel: () => <Text style={valueStyle} selectable={true}>{jobOrder.Router_Model || jobOrder.router_model || 'Not specified'}</Text>,
    lcpnap: () => <Text style={valueStyle} selectable={true}>{jobOrder.LCPNAP || jobOrder.lcpnap || 'Not specified'}</Text>,
    port: () => <Text style={valueStyle} selectable={true}>{jobOrder.PORT || jobOrder.Port || jobOrder.port || 'Not specified'}</Text>,
    vlan: () => <Text style={valueStyle} selectable={true}>{jobOrder.VLAN || jobOrder.vlan || 'Not specified'}</Text>,
    username: () => <Text style={valueStyle} selectable={true}>{jobOrder.Username || jobOrder.username || jobOrder.pppoe_username || 'Not provided'}</Text>,
    ipAddress: () => <Text style={valueStyle} selectable={true}>{jobOrder.IP_Address || jobOrder.ip_address || jobOrder.IP || jobOrder.ip || 'Not specified'}</Text>,
    usageType: () => <Text style={valueStyle} selectable={true}>{jobOrder.Usage_Type || jobOrder.usage_type || 'Not specified'}</Text>,
    installationFee: () => <Text style={valueStyle} selectable={true}>{formatPrice(jobOrder.installation_fee || jobOrder.Installation_Fee)}</Text>,
    jobOrderItems: () => (
      <View style={{ flexDirection: 'column', gap: 4 }}>
        {jobOrderItems.length > 0 ? (
          jobOrderItems.map((item, index) => (
            <Text key={index} style={valueStyle} selectable={true}>
              {item.item_name || (item as any).Item_Name || (item as any).itemName} (Qty: {item.quantity || (item as any).Quantity || (item as any).qty || 0})
            </Text>
          ))
        ) : (
          <Text style={valueStyle} selectable={true}>No items recorded</Text>
        )}
      </View>
    ),
    dateInstalled: () => <Text style={valueStyle} selectable={true}>{(jobOrder.Date_Installed || jobOrder.date_installed) ? formatDate(jobOrder.Date_Installed || jobOrder.date_installed) : 'Not installed yet'}</Text>,
    visitBy: () => <Text style={valueStyle} selectable={true}>{jobOrder.Visit_By || jobOrder.visit_by || 'Not assigned'}</Text>,
    visitWith: () => <Text style={valueStyle} selectable={true}>{jobOrder.Visit_With || jobOrder.visit_with || 'None'}</Text>,
    visitWithOther: () => <Text style={valueStyle} selectable={true}>{jobOrder.Visit_With_Other || jobOrder.visit_with_other || 'None'}</Text>,
    onsiteStatus: () => (
      <Text style={{ textTransform: 'capitalize', color: getStatusColor(jobOrder.Onsite_Status, 'onsite') }} selectable={true}>
        {jobOrder.Onsite_Status === 'inprogress' ? 'In Progress' : (jobOrder.Onsite_Status || 'Not set')}
      </Text>
    ),
    modifiedBy: () => <Text style={valueStyle} selectable={true}>{jobOrder.Modified_By || 'System'}</Text>,
    modifiedDate: () => <Text style={valueStyle} selectable={true}>{formatDate(jobOrder.Modified_Date)}</Text>,
    assignedEmail: () => <Text style={valueStyle} selectable={true}>{jobOrder.Assigned_Email || 'Not assigned'}</Text>,
    setupImage: () => renderImageLink(jobOrder.setup_image_url || jobOrder.Setup_Image_URL || jobOrder.Setup_Image_Url),
    speedtestImage: () => renderImageLink(jobOrder.speedtest_image_url || jobOrder.Speedtest_Image_URL || jobOrder.speedtest_image || jobOrder.Speedtest_Image),
    signedContractImage: () => renderImageLink(jobOrder.signed_contract_image_url || jobOrder.Signed_Contract_Image_URL || jobOrder.signed_contract_url || jobOrder.Signed_Contract_URL),
    boxReadingImage: () => renderImageLink(jobOrder.box_reading_image_url || jobOrder.Box_Reading_Image_URL || jobOrder.box_reading_url || jobOrder.Box_Reading_URL),
    routerReadingImage: () => renderImageLink(jobOrder.router_reading_image_url || jobOrder.Router_Reading_Image_URL || jobOrder.router_reading_url || jobOrder.Router_Reading_URL),
    portLabelImage: () => renderImageLink(jobOrder.port_label_image_url || jobOrder.Port_Label_Image_URL || jobOrder.port_label_url || jobOrder.Port_Label_URL),
    houseFrontPicture: () => renderImageLink(jobOrder.house_front_picture_url || jobOrder.House_Front_Picture_URL || jobOrder.house_front_picture || jobOrder.House_Front_Picture),
  };

  const renderFieldContent = (fieldKey: string) => {


    const renderer = fieldRenderers[fieldKey];
    if (!renderer) return null;

    const baseFieldStyle = {
      flexDirection: 'column' as const,
      borderBottomWidth: 1,
      paddingVertical: 4,
      paddingHorizontal: 16,
      borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb',
      alignItems: 'flex-start' as const,
      gap: 2
    };
    const labelStyle = {
      fontSize: 14,
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      fontWeight: '500' as const
    };
    const valueContainerStyle = {
      width: '100%' as import('react-native').DimensionValue,
    };

    return (
      <View style={baseFieldStyle}>
        <Text style={labelStyle}>{getFieldLabel(fieldKey)}</Text>
        <View style={valueContainerStyle}>
          {renderer()}
        </View>
      </View>
    );
  };

  return (
    <View style={{ height: '100%', flexDirection: 'column', overflow: 'hidden', position: 'relative', width: '100%', borderLeftWidth: !isMobile ? 1 : 0, backgroundColor: isDarkMode ? '#030712' : '#f9fafb', borderLeftColor: isDarkMode ? 'rgba(255,255,255,0.3)' : '#d1d5db' }}>
      <View style={{ padding: 12, paddingTop: isMobile ? 60 : 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={{ fontWeight: '500', maxWidth: isMobile ? 200 : undefined, fontSize: isMobile ? 20 : 24, color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>{getClientFullName()}</Text>
          {loading && <Text style={{ marginLeft: 12, fontSize: 14, color: isDarkMode ? '#fb923c' : '#ea580c' }}>Loading...</Text>}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {userRole !== 'technician' && (
            <Pressable style={{ padding: 4, borderRadius: 2, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? '#1f2937' : '#e5e7eb', borderColor: isDarkMode ? '#374151' : '#d1d5db' }}>
              <ExternalLink width={16} height={16} color={isDarkMode ? '#ffffff' : '#111827'} />
            </Pressable>
          )}
          {shouldShowApproveButton() && (
            <Pressable
              style={{ backgroundColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 2, flexDirection: 'row', alignItems: 'center' }}
              onPress={handleApproveClick}
              disabled={loading}
            >
              <Text style={{ color: '#ffffff' }}>Approve</Text>
            </Pressable>
          )}
          {!(jobOrder.Onsite_Status && jobOrder.Onsite_Status.toLowerCase() === 'done') && (
            <Pressable
              style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 2, flexDirection: 'row', alignItems: 'center', backgroundColor: colorPalette?.primary || '#ea580c' }}
              onPress={handleDoneClick}
              disabled={loading}
            >
              <Text style={{ color: '#ffffff', fontSize: isMobile ? 14 : 16, fontWeight: '500' }}>{(userRoleId === 2 || userRole === 'technician') ? 'Edit' : 'Done'}</Text>

            </Pressable>
          )}



          <Pressable onPress={onClose}>
            <X width={28} height={28} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
          </Pressable>
        </View>
      </View>

      {userRole !== 'technician' && (
        <View style={{ paddingVertical: 12, borderBottomWidth: 1, backgroundColor: isDarkMode ? '#111827' : '#f3f4f6', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
            <Pressable
              onPress={handleEditClick}
              disabled={loading}
              style={{ flexDirection: 'column', alignItems: 'center', padding: 8, borderRadius: 6 }}
            >
              <View style={{ padding: 8, borderRadius: 9999, backgroundColor: loading ? (isDarkMode ? '#4b5563' : '#9ca3af') : (colorPalette?.primary || '#ea580c') }}>
                <Edit width={18} height={18} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 12, marginTop: 4, color: isDarkMode ? '#d1d5db' : '#374151' }}>Edit</Text>
            </Pressable>
          </View>
        </View>
      )}

      {error && (
        <View style={{ padding: 12, margin: 12, borderRadius: 4, backgroundColor: isDarkMode ? 'rgba(127, 29, 29, 0.2)' : '#fef2f2', borderWidth: 1, borderColor: isDarkMode ? '#991b1b' : '#fca5a5' }}>
          <Text style={{ color: isDarkMode ? '#fca5a5' : '#991b1b' }}>{error}</Text>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ width: '100%', minHeight: '100%', paddingVertical: 8, paddingHorizontal: 0, backgroundColor: isDarkMode ? '#030712' : '#f9fafb' }}>
          <View>
            {defaultFields.map((fieldKey) => (
              <React.Fragment key={fieldKey}>
                {renderFieldContent(fieldKey)}
              </React.Fragment>
            ))}
          </View>
        </View>
      </ScrollView>

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
    </View>
  );
};

export default JobOrderDetails;
