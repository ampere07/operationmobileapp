import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Modal, ActivityIndicator, Linking, useWindowDimensions, StyleSheet, Alert } from 'react-native';
import { X, ExternalLink, Edit, ChevronLeft, Play, Square, MapPin } from 'lucide-react-native';
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
import { useJobOrderContext } from '../contexts/JobOrderContext';

interface JobOrderDetailsPropsExtended extends JobOrderDetailsProps {
  userRoleProp?: string;
  userRoleIdProp?: number | null;
}

interface JobOrderDetailsPropsExtended extends JobOrderDetailsProps {
  userRoleProp?: string;
  userRoleIdProp?: number | null;
  billingStatusesProp?: BillingStatus[];
}

const JobOrderDetails: React.FC<JobOrderDetailsPropsExtended> = ({ jobOrder, onClose, onRefresh, isMobile: propIsMobile = false, userRoleProp, userRoleIdProp, billingStatusesProp }) => {
  const { width } = useWindowDimensions();
  const isMobile = propIsMobile || width < 768;
  const { silentRefresh } = useJobOrderContext();

  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(() => settingsColorPaletteService.getActiveSync());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDoneModalOpen, setIsDoneModalOpen] = useState(false);
  const [isDoneTechModalOpen, setIsDoneTechModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [billingStatuses, setBillingStatuses] = useState<BillingStatus[]>(billingStatusesProp || []);
  const [userRole, setUserRole] = useState<string>(userRoleProp || '');
  const [userRoleId, setUserRoleId] = useState<number | null>(userRoleIdProp || null);
  const [applicationData, setApplicationData] = useState<Application | null>(null);
  const [jobOrderItems, setJobOrderItems] = useState<JobOrderItem[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isStarted, setIsStarted] = useState(!!(jobOrder as any).start_time);
  const [isEnded, setIsEnded] = useState(!!(jobOrder as any).end_time);

  useEffect(() => {
    setIsStarted(!!(jobOrder as any).start_time);
    setIsEnded(!!(jobOrder as any).end_time);
  }, [jobOrder]);

  const isAgent = userRole === 'agent' || userRoleId === 4 || String(userRoleId) === '4';

  const defaultFields = [
    'timestamp',
    'jobOrderNumber',
    'referredBy',
    'fullName',
    'contactNumber',
    'secondContactNumber',
    'emailAddress',
    'fullAddress',
    'addressCoordinates',
    'billingStatus',
    'billingDay',
    'choosePlan',
    'statusRemarks',
    'remarks',
    'installationLandmark',
    'connectionType',
    ...(!isAgent ? [
      'modemRouterSn',
      'routerModel',
      'lcpnap',
      'port',
      'vlan',
      'username',
      'ipAddress',
      'usageType',
      'installation_fee',
      'itemsUsed',
    ] : []),
    'dateInstalled',
    'startTime',
    'endTime',
    'duration',
    'visitBy',
    'visitWith',
    'visitWithOther',
    'onsiteStatus',
    'modifiedBy',
    'modifiedDate',
    'assignedEmail',
    ...(!isAgent ? [
      'setupImage',
      'speedtestImage',
      'signedContractImage',
      'boxReadingImage',
      'routerReadingImage',
      'portLabelImage',
      'houseFrontPicture',
      'proof_of_billing_url',
      'government_valid_id_url',
      'second_government_valid_id_url',
      'document_attachment_url',
      'other_isp_bill_url'
    ] : [])
  ];



  useEffect(() => {
    const loadSettings = async () => {


      const authData = await AsyncStorage.getItem('authData');
      if (authData && (!userRoleProp || userRoleIdProp === null)) {
        try {
          const userData = JSON.parse(authData);
          if (!userRoleProp) setUserRole(userData.role?.toLowerCase() || '');
          if (userRoleIdProp === null) setUserRoleId(Number(userData.role_id));
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
    if (billingStatusesProp && billingStatusesProp.length > 0) {
      setBillingStatuses(billingStatusesProp);
      return;
    }
    const fetchBillingStatuses = async () => {
      try {
        const statuses = await getBillingStatuses();
        setBillingStatuses(statuses);
      } catch (error) {
        console.error('Error fetching billing statuses:', error);
      }
    };
    fetchBillingStatuses();
  }, [billingStatusesProp]);

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
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const datePart = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
      const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${datePart} ${timePart}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr?: string | null): string => {
    if (!dateStr) return 'Not scheduled';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
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
      switch (status.toLowerCase().trim()) {
        case 'done':
        case 'completed':
          return '#4ade80';
        case 'reschedule':
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
      switch (status.toLowerCase().trim()) {
        case 'done':
        case 'active':
        case 'completed':
          return '#4ade80';
        case 'pending':
        case 'in progress':
          return '#fb923c';
        case 'suspended':
        case 'overdue':
        case 'cancelled':
          return '#ef4444';
        default:
          return '#9ca3af';
      }
    }
  };

  const handleDoneClick = () => {
    if (userRole === 'technician' || userRoleId === 2 || String(userRoleId) === '2') {
      if (!isStarted) {
        Alert.alert(
          'Action Required',
          'You need to start the job order first.',
          [{ text: 'OK' }]
        );
        return;
      }
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
      silentRefresh();
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
      silentRefresh();
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
    const isAgent = userRole === 'agent' || userRoleId === 4;

    if (isAgent) return false;

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
      silentRefresh();
    } catch (err: any) {
      setError(`Failed to update status: ${err.message}`);
      console.error('Status update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMySQLDate = () => {
    const now = new Date();
    return now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0') + ' ' + 
      String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0') + ':' + 
      String(now.getSeconds()).padStart(2, '0');
  };

  const handleStartTimer = async () => {
    try {
      setLoading(true);
      if (!jobOrder.id) throw new Error('Cannot update job order: Missing ID');

      const currentTime = formatMySQLDate();
      await updateJobOrder(jobOrder.id, {
        start_time: currentTime,
      } as any);

      (jobOrder as any).start_time = currentTime;
      setIsStarted(true);
      setSuccessMessage('Timer started successfully!');
      setShowSuccessModal(true);
      silentRefresh();
    } catch (err: any) {
      setError(`Failed to start timer: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getDurationString = (start?: string | null, end?: string | null): string => {
    if (!start || !end) return 'N/A';
    const startTime = new Date(start.replace(' ', 'T')).getTime();
    const endTime = new Date(end.replace(' ', 'T')).getTime();
    if (isNaN(startTime) || isNaN(endTime)) return 'N/A';
    
    const diff = Math.max(0, endTime - startTime);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
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
      addressCoordinates: 'Address Coordinates',
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
      installation_fee: 'Installation Fee',
      itemsUsed: 'Item Used',
      dateInstalled: 'Date Installed',
      startTime: 'Start Time',
      endTime: 'End Time',
      duration: 'Duration',
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
      houseFrontPicture: 'House Front Picture',
      proof_of_billing_url: 'Proof of Billing',
      government_valid_id_url: 'Government Valid ID',
      second_government_valid_id_url: 'Second Government Valid ID',
      document_attachment_url: 'Document Attachment',
      other_isp_bill_url: 'Other ISP Bill'
    };
    return labels[fieldKey] || fieldKey;
  };



  const dynamicValueColor = '#111827';

  const renderImageLink = (url: string | undefined | null) => (
    <View style={st.imageLinkRow}>
      <Text style={[st.imageLinkText, { color: dynamicValueColor }]} numberOfLines={1} selectable={true}>
        {url || 'No image available'}
      </Text>
      {url && (
        <Pressable onPress={() => Linking.openURL(url || '')}>
          <ExternalLink width={16} height={16} color={'#4b5563'} />
        </Pressable>
      )}
    </View>
  );

  const valStyle = [st.valueText, { color: dynamicValueColor }];

  const fieldRenderers: Record<string, () => React.ReactNode> = useMemo(() => ({
    timestamp: () => <Text style={valStyle} selectable={true}>{formatDate(jobOrder.Create_DateTime || jobOrder.created_at || jobOrder.timestamp)}</Text>,
    jobOrderNumber: () => <Text style={valStyle} selectable={true}>{jobOrder.id || jobOrder.JobOrder_ID || (applicationData ? 'App-' + applicationData.id : 'N/A')}</Text>,
    referredBy: () => <Text style={valStyle} selectable={true}>{jobOrder.Referred_By || jobOrder.referred_by || (applicationData?.referred_by) || 'None'}</Text>,
    fullName: () => <Text style={valStyle} selectable={true}>{getClientFullName()}</Text>,
    contactNumber: () => <Text style={valStyle} selectable={true}>{jobOrder.Contact_Number || jobOrder.mobile_number || (applicationData?.mobile_number) || 'Not provided'}</Text>,
    secondContactNumber: () => <Text style={valStyle} selectable={true}>{jobOrder.Second_Contact_Number || jobOrder.secondary_mobile_number || (applicationData?.secondary_mobile_number) || 'Not provided'}</Text>,
    emailAddress: () => <Text style={valStyle} selectable={true}>{jobOrder.Email_Address || jobOrder.email_address || (applicationData?.email_address) || 'Not provided'}</Text>,
    fullAddress: () => <Text style={valStyle} selectable={true}>{getClientFullAddress()}</Text>,
    addressCoordinates: () => {
      const coords = applicationData?.address_coordinates || jobOrder.Address_Coordinates || jobOrder.address_coordinates;
      return (
        <View style={st.imageLinkRow}>
          <Text style={valStyle} selectable={true}>{coords || 'Not provided'}</Text>
          {coords && (
            <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`)}>
              <MapPin width={24} height={24} color={'#4b5563'} />
            </Pressable>
          )}
        </View>
      );
    },
    billingStatus: () => <Text style={valStyle} selectable={true}>{jobOrder.billing_status || jobOrder.Billing_Status || 'Not Set'}</Text>,
    billingDay: () => <Text style={valStyle} selectable={true}>{getBillingDayDisplay(jobOrder.Billing_Day || jobOrder.billing_day)}</Text>,
    choosePlan: () => <Text style={valStyle} selectable={true}>{jobOrder.Desired_Plan || jobOrder.desired_plan || jobOrder.Choose_Plan || jobOrder.choose_plan || (applicationData?.desired_plan) || 'Not specified'}</Text>,
    statusRemarks: () => <Text style={valStyle} selectable={true}>{jobOrder.Status_Remarks || jobOrder.status_remarks || 'No remarks'}</Text>,
    remarks: () => <Text style={valStyle} selectable={true}>{jobOrder.Remarks || jobOrder.onsite_remarks || 'No remarks'}</Text>,
    installationLandmark: () => <Text style={valStyle} selectable={true}>{jobOrder.Installation_Landmark || jobOrder.installation_landmark || jobOrder.landmark || (applicationData?.landmark) || 'Not provided'}</Text>,
    connectionType: () => <Text style={valStyle} selectable={true}>{jobOrder.Connection_Type || jobOrder.connection_type || 'Not specified'}</Text>,
    modemRouterSn: () => <Text style={valStyle} selectable={true}>{jobOrder.Modem_Router_SN || jobOrder.modem_router_sn || jobOrder.Modem_SN || jobOrder.modem_sn || 'Not specified'}</Text>,
    routerModel: () => <Text style={valStyle} selectable={true}>{jobOrder.Router_Model || jobOrder.router_model || 'Not specified'}</Text>,
    lcpnap: () => <Text style={valStyle} selectable={true}>{jobOrder.LCPNAP || jobOrder.lcpnap || 'Not specified'}</Text>,
    port: () => <Text style={valStyle} selectable={true}>{jobOrder.PORT || jobOrder.Port || jobOrder.port || 'Not specified'}</Text>,
    vlan: () => <Text style={valStyle} selectable={true}>{jobOrder.VLAN || jobOrder.vlan || 'Not specified'}</Text>,
    username: () => <Text style={valStyle} selectable={true}>{jobOrder.Username || jobOrder.username || jobOrder.pppoe_username || 'Not provided'}</Text>,
    ipAddress: () => <Text style={valStyle} selectable={true}>{jobOrder.IP_Address || jobOrder.ip_address || jobOrder.IP || jobOrder.ip || 'Not specified'}</Text>,
    usageType: () => <Text style={valStyle} selectable={true}>{jobOrder.Usage_Type || jobOrder.usage_type || 'Not specified'}</Text>,
    installation_fee: () => <Text style={valStyle} selectable={true}>{formatPrice(jobOrder.installation_fee || jobOrder.Installation_Fee)}</Text>,
    itemsUsed: () => (
      <View style={st.itemsCol}>
        {jobOrderItems.length > 0 ? (
          jobOrderItems.map((item, index) => (
            <Text key={index} style={valStyle} selectable={true}>
              {item.item_name || (item as any).Item_Name || (item as any).itemName} (Qty: {item.quantity || (item as any).Quantity || (item as any).qty || 0})
            </Text>
          ))
        ) : (
          <Text style={valStyle} selectable={true}>No items recorded</Text>
        )}
      </View>
    ),
    dateInstalled: () => <Text style={valStyle} selectable={true}>{(jobOrder.Date_Installed || jobOrder.date_installed) ? formatDateOnly(jobOrder.Date_Installed || jobOrder.date_installed) : 'Not installed yet'}</Text>,
    startTime: () => <Text style={valStyle} selectable={true}>{formatDate((jobOrder as any).start_time)}</Text>,
    endTime: () => <Text style={valStyle} selectable={true}>{formatDate((jobOrder as any).end_time)}</Text>,
    duration: () => <Text style={valStyle} selectable={true}>{getDurationString((jobOrder as any).start_time, (jobOrder as any).end_time)}</Text>,
    visitBy: () => <Text style={valStyle} selectable={true}>{jobOrder.Visit_By || jobOrder.visit_by || 'Not assigned'}</Text>,
    visitWith: () => <Text style={valStyle} selectable={true}>{jobOrder.Visit_With || jobOrder.visit_with || 'None'}</Text>,
    visitWithOther: () => <Text style={valStyle} selectable={true}>{jobOrder.Visit_With_Other || jobOrder.visit_with_other || 'None'}</Text>,
    onsiteStatus: () => (
      <Text style={[st.statusCapitalize, { color: getStatusColor(jobOrder.Onsite_Status, 'onsite') }]} selectable={true}>
        {jobOrder.Onsite_Status === 'inprogress' ? 'In Progress' : (jobOrder.Onsite_Status || 'Not set')}
      </Text>
    ),
    modifiedBy: () => <Text style={valStyle} selectable={true}>{jobOrder.Modified_By || 'System'}</Text>,
    modifiedDate: () => <Text style={valStyle} selectable={true}>{formatDate(jobOrder.Modified_Date)}</Text>,
    assignedEmail: () => <Text style={valStyle} selectable={true}>{jobOrder.Assigned_Email || 'Not assigned'}</Text>,
    setupImage: () => renderImageLink(jobOrder.setup_image_url || jobOrder.Setup_Image_URL || jobOrder.Setup_Image_Url),
    speedtestImage: () => renderImageLink(jobOrder.speedtest_image_url || jobOrder.Setup_Image_URL || jobOrder.setup_image_url || jobOrder.Setup_Image_Url),
    signedContractImage: () => renderImageLink(jobOrder.signed_contract_image_url || jobOrder.Signed_Contract_Image_URL || jobOrder.signed_contract_url || jobOrder.Signed_Contract_URL),
    boxReadingImage: () => renderImageLink(jobOrder.box_reading_image_url || jobOrder.Box_Reading_Image_URL || jobOrder.box_reading_url || jobOrder.Box_Reading_URL),
    routerReadingImage: () => renderImageLink(jobOrder.router_reading_image_url || jobOrder.Router_Reading_Image_URL || jobOrder.router_reading_url || jobOrder.Router_Reading_URL),
    portLabelImage: () => renderImageLink(jobOrder.port_label_image_url || jobOrder.Port_Label_Image_URL || jobOrder.port_label_url || jobOrder.Port_Label_URL),
    houseFrontPicture: () => renderImageLink(applicationData?.house_front_picture_url || jobOrder.house_front_picture_url || jobOrder.House_Front_Picture_URL || jobOrder.house_front_picture || jobOrder.House_Front_Picture),
    proof_of_billing_url: () => renderImageLink(applicationData?.proof_of_billing_url || jobOrder.proof_of_billing_url),
    government_valid_id_url: () => renderImageLink(applicationData?.government_valid_id_url || jobOrder.government_valid_id_url),
    second_government_valid_id_url: () => renderImageLink(applicationData?.secondary_government_valid_id_url || jobOrder.second_government_valid_id_url),
    document_attachment_url: () => renderImageLink(applicationData?.document_attachment_url || jobOrder.document_attachment_url),
    other_isp_bill_url: () => renderImageLink(applicationData?.other_isp_bill_url || jobOrder.other_isp_bill_url),
  }), [jobOrder, applicationData, jobOrderItems, billingStatuses]);

  const isFieldEmpty = (fieldKey: string): boolean => {
    switch (fieldKey) {
      case 'timestamp': return !(jobOrder.Create_DateTime || jobOrder.created_at || jobOrder.timestamp);
      case 'jobOrderNumber': return !(jobOrder.id || jobOrder.JobOrder_ID || applicationData?.id);
      case 'referredBy': return !(jobOrder.Referred_By || jobOrder.referred_by || applicationData?.referred_by);
      case 'fullName': return !getClientFullName() || getClientFullName() === 'Unknown Client';
      case 'contactNumber': return !(jobOrder.Contact_Number || jobOrder.mobile_number || applicationData?.mobile_number);
      case 'secondContactNumber': return !(jobOrder.Second_Contact_Number || jobOrder.secondary_mobile_number || applicationData?.secondary_mobile_number);
      case 'emailAddress': return !(jobOrder.Email_Address || jobOrder.email_address || applicationData?.email_address);
      case 'fullAddress': return !getClientFullAddress() || getClientFullAddress() === 'No address provided';
      case 'addressCoordinates': return !(applicationData?.address_coordinates || jobOrder.Address_Coordinates || jobOrder.address_coordinates);
      case 'billingStatus': return !(jobOrder.billing_status || jobOrder.Billing_Status);
      case 'billingDay': return jobOrder.Billing_Day === null || jobOrder.Billing_Day === undefined;
      case 'choosePlan': return !(jobOrder.Desired_Plan || jobOrder.desired_plan || jobOrder.Choose_Plan || jobOrder.choose_plan || applicationData?.desired_plan);
      case 'statusRemarks': return !(jobOrder.Status_Remarks || jobOrder.status_remarks);
      case 'remarks': return !(jobOrder.Remarks || jobOrder.onsite_remarks);
      case 'installationLandmark': return !(jobOrder.Installation_Landmark || jobOrder.installation_landmark || jobOrder.landmark || applicationData?.landmark);
      case 'connectionType': return !(jobOrder.Connection_Type || jobOrder.connection_type);
      case 'modemRouterSn': return !(jobOrder.Modem_Router_SN || jobOrder.modem_router_sn || jobOrder.Modem_SN || jobOrder.modem_sn);
      case 'routerModel': return !(jobOrder.Router_Model || jobOrder.router_model);
      case 'lcpnap': return !(jobOrder.LCPNAP || jobOrder.lcpnap);
      case 'port': return !(jobOrder.PORT || jobOrder.Port || jobOrder.port);
      case 'vlan': return !(jobOrder.VLAN || jobOrder.vlan);
      case 'username': return !(jobOrder.Username || jobOrder.username || jobOrder.pppoe_username);
      case 'ipAddress': return !(jobOrder.IP_Address || jobOrder.ip_address || jobOrder.IP || jobOrder.ip);
      case 'usageType': return !(jobOrder.Usage_Type || jobOrder.usage_type);
      case 'installation_fee': return !(jobOrder.installation_fee || jobOrder.Installation_Fee);
      case 'itemsUsed': return jobOrderItems.length === 0;
      case 'dateInstalled': return !(jobOrder.Date_Installed || jobOrder.date_installed);
      case 'startTime': return !(jobOrder as any).start_time;
      case 'endTime': return !(jobOrder as any).end_time;
      case 'duration': return !(jobOrder as any).start_time || !(jobOrder as any).end_time;
      case 'visitBy': return !(jobOrder.Visit_By || jobOrder.visit_by);
      case 'visitWith': return !(jobOrder.Visit_With || jobOrder.visit_with);
      case 'visitWithOther': return !(jobOrder.Visit_With_Other || jobOrder.visit_with_other);
      case 'onsiteStatus': return !jobOrder.Onsite_Status;
      case 'modifiedBy': return !jobOrder.Modified_By;
      case 'modifiedDate': return !jobOrder.Modified_Date;
      case 'assignedEmail': return !jobOrder.Assigned_Email;
      case 'setupImage': return !(jobOrder.setup_image_url || jobOrder.Setup_Image_URL || jobOrder.Setup_Image_Url);
      case 'speedtestImage': return !(jobOrder.speedtest_image_url || jobOrder.Setup_Image_URL || jobOrder.setup_image_url || jobOrder.Setup_Image_Url);
      case 'signedContractImage': return !(jobOrder.signed_contract_image_url || jobOrder.Signed_Contract_Image_URL || jobOrder.signed_contract_url || jobOrder.Signed_Contract_URL);
      case 'boxReadingImage': return !(jobOrder.box_reading_image_url || jobOrder.Box_Reading_Image_URL || jobOrder.box_reading_url || jobOrder.Box_Reading_URL);
      case 'routerReadingImage': return !(jobOrder.router_reading_image_url || jobOrder.Router_Reading_Image_URL || jobOrder.router_reading_url || jobOrder.Router_Reading_URL);
      case 'portLabelImage': return !(jobOrder.port_label_image_url || jobOrder.Port_Label_Image_URL || jobOrder.port_label_url || jobOrder.Port_Label_URL);
      case 'houseFrontPicture': return !(applicationData?.house_front_picture_url || jobOrder.house_front_picture_url || jobOrder.House_Front_Picture_URL || jobOrder.house_front_picture || jobOrder.House_Front_Picture);
      case 'proof_of_billing_url': return !(applicationData?.proof_of_billing_url || jobOrder.proof_of_billing_url);
      case 'government_valid_id_url': return !(applicationData?.government_valid_id_url || jobOrder.government_valid_id_url);
      case 'second_government_valid_id_url': return !(applicationData?.secondary_government_valid_id_url || jobOrder.second_government_valid_id_url);
      case 'document_attachment_url': return !(applicationData?.document_attachment_url || jobOrder.document_attachment_url);
      case 'other_isp_bill_url': return !(applicationData?.other_isp_bill_url || jobOrder.other_isp_bill_url);
      default: return false;
    }
  };

  const renderFieldContent = (fieldKey: string) => {
    const renderer = fieldRenderers[fieldKey];
    if (!renderer || isFieldEmpty(fieldKey)) return null;

    return (
      <View style={[st.fieldRow, { borderBottomColor: '#e5e7eb' }]}>
        <Text style={[st.fieldLabel, { color: '#6b7280' }]}>{getFieldLabel(fieldKey)}</Text>
        <View style={st.fieldValueWrap}>
          {renderer()}
        </View>
      </View>
    );
  };

  return (
    <View style={[st.container, {
      borderLeftWidth: !isMobile ? 1 : 0,
      backgroundColor: '#f9fafb',
      borderLeftColor: '#d1d5db'
    }]}>
      <View style={[st.header, {
        paddingTop: isMobile ? 60 : 12,
        backgroundColor: '#ffffff',
        borderBottomColor: '#e5e7eb'
      }]}>
        <View style={st.headerLeft}>
          <Pressable onPress={onClose} style={st.backBtn}>
            <ChevronLeft width={28} height={28} color={'#4b5563'} />
          </Pressable>
          <View style={st.headerNameContainer}>
            <Text style={[st.headerName, { maxWidth: isMobile ? 180 : undefined, fontSize: isMobile ? 20 : 24, color: '#111827' }]} numberOfLines={1}>{getClientFullName()}</Text>
          </View>
        </View>

        <View style={st.headerActions}>
          {!isEnded && !['done', 'completed'].includes(jobOrder.Onsite_Status?.toLowerCase().trim() || '') && (userRoleId === 2 || userRole?.toLowerCase() === 'technician') && (
            <>
              {!isStarted && (
                <Pressable
                  style={[st.iconBtn, { backgroundColor: colorPalette?.primary || '#10b981' }]}
                  onPress={handleStartTimer}
                  disabled={loading}
                >
                  <Play width={18} height={18} color="#ffffff" />
                </Pressable>
              )}
            </>
          )}

          {shouldShowApproveButton() && (
            <Pressable style={st.approveBtn} onPress={handleApproveClick} disabled={loading}>
              <Text style={st.whiteTxt}>Approve</Text>
            </Pressable>
          )}

          {!(
            ['done', 'completed'].includes(jobOrder.Onsite_Status?.toLowerCase().trim() || '') &&
            (userRoleId === 2 || userRole === 'technician')
          ) && userRole !== 'agent' && userRoleId !== 4 && (
              <Pressable
                style={[st.actionBtn, { backgroundColor: colorPalette?.primary || '#7c3aed' }]}
                onPress={handleDoneClick}
                disabled={loading}
              >
                <Text style={[st.actionBtnText, { fontSize: isMobile ? 14 : 16 }]}>{(userRoleId === 2 || userRole === 'technician') ? 'Edit' : 'Done'}</Text>
              </Pressable>
            )}
          {/* Invisible placeholder for centering symmetry if no actions */}
          {!shouldShowApproveButton() && !(
            !(
              ['done', 'completed'].includes(jobOrder.Onsite_Status?.toLowerCase().trim() || '') &&
              (userRoleId === 2 || userRole === 'technician')
            ) && userRole !== 'agent' && userRoleId !== 4
          ) && (
              <View style={{ width: 28 }} />
            )}
        </View>
      </View>

      {userRole !== 'technician' && userRole !== 'agent' && userRoleId !== 4 && userRoleId !== 2 && (
        <View style={[st.editBar, {
          backgroundColor: '#f3f4f6',
          borderBottomColor: '#e5e7eb'
        }]}>
          <View style={st.editBarInner}>
            <Pressable onPress={handleEditClick} disabled={loading} style={st.editBtnWrap}>
              <View style={[st.editIconCircle, { backgroundColor: loading ? '#9ca3af' : (colorPalette?.primary || '#7c3aed') }]}>
                <Edit width={18} height={18} color="#ffffff" />
              </View>
              <Text style={[st.editLabel, { color: '#374151' }]}>Edit</Text>
            </Pressable>
          </View>
        </View>
      )}

      {error && (
        <View style={[st.errorBox, {
          backgroundColor: '#fef2f2',
          borderColor: '#fca5a5'
        }]}>
          <Text style={{ color: '#991b1b' }}>{error}</Text>
        </View>
      )}

      <ScrollView style={st.flex1} showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollContent}>
        <View style={[st.fieldsContainer, { backgroundColor: '#f9fafb' }]}>
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

const st = StyleSheet.create({
  container: { height: '100%', flexDirection: 'column', overflow: 'hidden', position: 'relative', width: '100%' },
  header: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, position: 'relative' },
  backBtn: { position: 'absolute', left: 0, zIndex: 10 },
  headerNameContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerName: { fontWeight: '500', textAlign: 'center' },
  loadingLabel: { marginLeft: 12, fontSize: 14 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  approveBtn: { backgroundColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 2, flexDirection: 'row', alignItems: 'center' },
  whiteTxt: { color: '#ffffff' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 2, flexDirection: 'row', alignItems: 'center' },
  actionBtnText: { color: '#ffffff', fontWeight: '500' },
  iconBtn: { padding: 6, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  editBar: { paddingVertical: 12, borderBottomWidth: 1 },
  editBarInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  editBtnWrap: { flexDirection: 'column', alignItems: 'center', padding: 8, borderRadius: 6 },
  editIconCircle: { padding: 8, borderRadius: 9999 },
  editLabel: { fontSize: 12, marginTop: 4 },
  errorBox: { padding: 12, margin: 12, borderRadius: 4, borderWidth: 1 },
  flex1: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  fieldsContainer: { width: '100%', minHeight: '100%', paddingVertical: 8, paddingHorizontal: 0 },
  fieldRow: { flexDirection: 'column', borderBottomWidth: 1, paddingVertical: 4, paddingHorizontal: 16, alignItems: 'flex-start', gap: 2 },
  fieldLabel: { fontSize: 14, fontWeight: '500' },
  fieldValueWrap: { width: '100%' },
  valueText: { fontSize: 16 },
  statusCapitalize: { textTransform: 'capitalize' },
  itemsCol: { flexDirection: 'column', gap: 4 },
  imageLinkRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  imageLinkText: { flex: 1, marginRight: 8, fontSize: 16 },
});

export default JobOrderDetails;
