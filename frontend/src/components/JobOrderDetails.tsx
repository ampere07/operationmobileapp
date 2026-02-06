import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Modal, ActivityIndicator, Linking } from 'react-native';
import { X, ExternalLink, Edit, Settings } from 'lucide-react-native';
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
  const [showFieldSettings, setShowFieldSettings] = useState(false);

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
    return defaultFields.reduce((acc: Record<string, boolean>, field) => ({ ...acc, [field]: true }), {});
  });

  const [fieldOrder, setFieldOrder] = useState<string[]>(defaultFields);

  useEffect(() => {
    const loadSettings = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark');

      const savedVisibility = await AsyncStorage.getItem(FIELD_VISIBILITY_KEY);
      if (savedVisibility) {
        setFieldVisibility(JSON.parse(savedVisibility));
      }

      const savedOrder = await AsyncStorage.getItem(FIELD_ORDER_KEY);
      if (savedOrder) {
        setFieldOrder(JSON.parse(savedOrder));
      }

      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        try {
          const userData = JSON.parse(authData);
          setUserRole(userData.role?.toLowerCase() || '');
        } catch (error) {
          console.error('Error parsing auth data:', error);
        }
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(FIELD_VISIBILITY_KEY, JSON.stringify(fieldVisibility));
  }, [fieldVisibility]);

  useEffect(() => {
    AsyncStorage.setItem(FIELD_ORDER_KEY, JSON.stringify(fieldOrder));
  }, [fieldOrder]);

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

  const resetFieldSettings = () => {
    const allVisible: Record<string, boolean> = defaultFields.reduce((acc: Record<string, boolean>, field) => ({ ...acc, [field]: true }), {});
    setFieldVisibility(allVisible);
    setFieldOrder(defaultFields);
  };

  const renderFieldContent = (fieldKey: string) => {
    if (!fieldVisibility[fieldKey]) return null;

    const baseFieldStyle = { flexDirection: 'row' as const, borderBottomWidth: 1, paddingBottom: 16, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' };
    const labelStyle = { width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' };
    const valueStyle = { flex: 1, color: isDarkMode ? '#ffffff' : '#111827' };

    switch (fieldKey) {
      case 'timestamp':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Timestamp:</Text>
            <Text style={valueStyle}>{formatDate(jobOrder.Create_DateTime || jobOrder.created_at || jobOrder.timestamp)}</Text>
          </View>
        );

      case 'jobOrderNumber':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Job Order #:</Text>
            <Text style={valueStyle}>{jobOrder.id || jobOrder.JobOrder_ID || (applicationData ? 'App-' + applicationData.id : 'N/A')}</Text>
          </View>
        );

      case 'referredBy':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Referred By:</Text>
            <Text style={valueStyle}>{jobOrder.Referred_By || jobOrder.referred_by || (applicationData?.referred_by) || 'None'}</Text>
          </View>
        );

      case 'fullName':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Full Name:</Text>
            <Text style={valueStyle}>{getClientFullName()}</Text>
          </View>
        );

      case 'contactNumber':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Contact Number:</Text>
            <Text style={valueStyle}>
              {jobOrder.Contact_Number || jobOrder.mobile_number || (applicationData?.mobile_number) || 'Not provided'}
            </Text>
          </View>
        );

      case 'secondContactNumber':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Second Contact Number:</Text>
            <Text style={valueStyle}>
              {jobOrder.Second_Contact_Number || jobOrder.secondary_mobile_number || (applicationData?.secondary_mobile_number) || 'Not provided'}
            </Text>
          </View>
        );

      case 'emailAddress':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Email Address:</Text>
            <Text style={valueStyle}>
              {jobOrder.Email_Address || jobOrder.email_address || (applicationData?.email_address) || 'Not provided'}
            </Text>
          </View>
        );

      case 'fullAddress':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Full Address:</Text>
            <Text style={valueStyle}>{getClientFullAddress()}</Text>
          </View>
        );

      case 'billingStatus':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Billing Status:</Text>
            <Text style={valueStyle}>{jobOrder.billing_status || jobOrder.Billing_Status || 'Not Set'}</Text>
          </View>
        );

      case 'billingDay':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Billing Day:</Text>
            <Text style={valueStyle}>{getBillingDayDisplay(jobOrder.Billing_Day || jobOrder.billing_day)}</Text>
          </View>
        );

      case 'choosePlan':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Choose Plan:</Text>
            <Text style={valueStyle}>
              {jobOrder.Desired_Plan || jobOrder.desired_plan || jobOrder.Choose_Plan || jobOrder.choose_plan || (applicationData?.desired_plan) || 'Not specified'}
            </Text>
          </View>
        );

      case 'statusRemarks':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Status Remarks:</Text>
            <Text style={valueStyle}>{jobOrder.Status_Remarks || jobOrder.status_remarks || 'No remarks'}</Text>
          </View>
        );

      case 'remarks':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Remarks:</Text>
            <Text style={valueStyle}>{jobOrder.Remarks || jobOrder.onsite_remarks || 'No remarks'}</Text>
          </View>
        );

      case 'installationLandmark':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Installation Landmark:</Text>
            <Text style={valueStyle}>{jobOrder.Installation_Landmark || jobOrder.installation_landmark || jobOrder.landmark || (applicationData?.landmark) || 'Not provided'}</Text>
          </View>
        );

      case 'connectionType':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Connection Type:</Text>
            <Text style={valueStyle}>{jobOrder.Connection_Type || jobOrder.connection_type || 'Not specified'}</Text>
          </View>
        );

      case 'modemRouterSn':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Modem/Router SN:</Text>
            <Text style={valueStyle}>{jobOrder.Modem_Router_SN || jobOrder.modem_router_sn || jobOrder.Modem_SN || jobOrder.modem_sn || 'Not specified'}</Text>
          </View>
        );

      case 'routerModel':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Router Model:</Text>
            <Text style={valueStyle}>{jobOrder.Router_Model || jobOrder.router_model || 'Not specified'}</Text>
          </View>
        );

      case 'affiliateName':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Affiliate Name:</Text>
            <Text style={valueStyle}>{jobOrder.group_name || jobOrder.Group_Name || 'Not specified'}</Text>
          </View>
        );

      case 'lcpnap':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>LCPNAP:</Text>
            <Text style={valueStyle}>{jobOrder.LCPNAP || jobOrder.lcpnap || 'Not specified'}</Text>
          </View>
        );

      case 'port':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>PORT:</Text>
            <Text style={valueStyle}>{jobOrder.PORT || jobOrder.Port || jobOrder.port || 'Not specified'}</Text>
          </View>
        );

      case 'vlan':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>VLAN:</Text>
            <Text style={valueStyle}>{jobOrder.VLAN || jobOrder.vlan || 'Not specified'}</Text>
          </View>
        );

      case 'username':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Username:</Text>
            <Text style={valueStyle}>{jobOrder.Username || jobOrder.username || jobOrder.pppoe_username || 'Not provided'}</Text>
          </View>
        );

      case 'ipAddress':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>IP Address:</Text>
            <Text style={valueStyle}>{jobOrder.IP_Address || jobOrder.ip_address || jobOrder.IP || jobOrder.ip || 'Not specified'}</Text>
          </View>
        );

      case 'usageType':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Usage Type:</Text>
            <Text style={valueStyle}>{jobOrder.Usage_Type || jobOrder.usage_type || 'Not specified'}</Text>
          </View>
        );

      case 'dateInstalled':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Date Installed:</Text>
            <Text style={valueStyle}>
              {(jobOrder.Date_Installed || jobOrder.date_installed)
                ? formatDate(jobOrder.Date_Installed || jobOrder.date_installed)
                : 'Not installed yet'}
            </Text>
          </View>
        );

      case 'visitBy':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Visit By:</Text>
            <Text style={valueStyle}>{jobOrder.Visit_By || jobOrder.visit_by || 'Not assigned'}</Text>
          </View>
        );

      case 'visitWith':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Visit With:</Text>
            <Text style={valueStyle}>{jobOrder.Visit_With || jobOrder.visit_with || 'None'}</Text>
          </View>
        );

      case 'visitWithOther':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Visit With Other:</Text>
            <Text style={valueStyle}>{jobOrder.Visit_With_Other || jobOrder.visit_with_other || 'None'}</Text>
          </View>
        );

      case 'onsiteStatus':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Onsite Status:</Text>
            <Text style={{ flex: 1, textTransform: 'capitalize', color: getStatusColor(jobOrder.Onsite_Status, 'onsite') }}>
              {jobOrder.Onsite_Status === 'inprogress' ? 'In Progress' : (jobOrder.Onsite_Status || 'Not set')}
            </Text>
          </View>
        );

      case 'contractTemplate':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Contract Template:</Text>
            <Text style={valueStyle}>{jobOrder.Contract_Template || 'Standard'}</Text>
          </View>
        );

      case 'contractLink':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Contract Link:</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>
                {jobOrder.Contract_Link || 'Not available'}
              </Text>
              {jobOrder.Contract_Link && (
                <Pressable onPress={() => Linking.openURL(jobOrder.Contract_Link || '')} style={{ marginLeft: 8 }}>
                  <ExternalLink width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </Pressable>
              )}
            </View>
          </View>
        );

      case 'modifiedBy':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Modified By:</Text>
            <Text style={valueStyle}>{jobOrder.Modified_By || 'System'}</Text>
          </View>
        );

      case 'modifiedDate':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Modified Date:</Text>
            <Text style={valueStyle}>{formatDate(jobOrder.Modified_Date)}</Text>
          </View>
        );

      case 'assignedEmail':
        return (
          <View style={baseFieldStyle}>
            <Text style={labelStyle}>Assigned Email:</Text>
            <Text style={valueStyle}>{jobOrder.Assigned_Email || 'Not assigned'}</Text>
          </View>
        );

      case 'setupImage':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Setup Image</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ flex: 1, marginRight: 8, color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>
                {jobOrder.setup_image_url || jobOrder.Setup_Image_URL || jobOrder.Setup_Image_Url || 'No image available'}
              </Text>
              {(jobOrder.setup_image_url || jobOrder.Setup_Image_URL || jobOrder.Setup_Image_Url) && (
                <Pressable onPress={() => Linking.openURL(jobOrder.setup_image_url || jobOrder.Setup_Image_URL || jobOrder.Setup_Image_Url || '')}>
                  <ExternalLink width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </Pressable>
              )}
            </View>
          </View>
        );

      case 'speedtestImage':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Speedtest Image</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ flex: 1, marginRight: 8, color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>
                {jobOrder.speedtest_image_url || jobOrder.Speedtest_Image_URL || jobOrder.speedtest_image || jobOrder.Speedtest_Image || 'No image available'}
              </Text>
              {(jobOrder.speedtest_image_url || jobOrder.Speedtest_Image_URL || jobOrder.speedtest_image || jobOrder.Speedtest_Image) && (
                <Pressable onPress={() => Linking.openURL(jobOrder.speedtest_image_url || jobOrder.Speedtest_Image_URL || jobOrder.speedtest_image || jobOrder.Speedtest_Image || '')}>
                  <ExternalLink width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </Pressable>
              )}
            </View>
          </View>
        );

      case 'signedContractImage':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Signed Contract Image</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ flex: 1, marginRight: 8, color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>
                {jobOrder.signed_contract_image_url || jobOrder.Signed_Contract_Image_URL || jobOrder.signed_contract_url || jobOrder.Signed_Contract_URL || 'No image available'}
              </Text>
              {(jobOrder.signed_contract_image_url || jobOrder.Signed_Contract_Image_URL || jobOrder.signed_contract_url || jobOrder.Signed_Contract_URL) && (
                <Pressable onPress={() => Linking.openURL(jobOrder.signed_contract_image_url || jobOrder.Signed_Contract_Image_URL || jobOrder.signed_contract_url || jobOrder.Signed_Contract_URL || '')}>
                  <ExternalLink width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </Pressable>
              )}
            </View>
          </View>
        );

      case 'boxReadingImage':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Box Reading Image</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ flex: 1, marginRight: 8, color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>
                {jobOrder.box_reading_image_url || jobOrder.Box_Reading_Image_URL || jobOrder.box_reading_url || jobOrder.Box_Reading_URL || 'No image available'}
              </Text>
              {(jobOrder.box_reading_image_url || jobOrder.Box_Reading_Image_URL || jobOrder.box_reading_url || jobOrder.Box_Reading_URL) && (
                <Pressable onPress={() => Linking.openURL(jobOrder.box_reading_image_url || jobOrder.Box_Reading_Image_URL || jobOrder.box_reading_url || jobOrder.Box_Reading_URL || '')}>
                  <ExternalLink width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </Pressable>
              )}
            </View>
          </View>
        );

      case 'routerReadingImage':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Router Reading Image</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ flex: 1, marginRight: 8, color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>
                {jobOrder.router_reading_image_url || jobOrder.Router_Reading_Image_URL || jobOrder.router_reading_url || jobOrder.Router_Reading_URL || 'No image available'}
              </Text>
              {(jobOrder.router_reading_image_url || jobOrder.Router_Reading_Image_URL || jobOrder.router_reading_url || jobOrder.Router_Reading_URL) && (
                <Pressable onPress={() => Linking.openURL(jobOrder.router_reading_image_url || jobOrder.Router_Reading_Image_URL || jobOrder.router_reading_url || jobOrder.Router_Reading_URL || '')}>
                  <ExternalLink width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </Pressable>
              )}
            </View>
          </View>
        );

      case 'portLabelImage':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>Port Label Image</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ flex: 1, marginRight: 8, color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>
                {jobOrder.port_label_image_url || jobOrder.Port_Label_Image_URL || jobOrder.port_label_url || jobOrder.Port_Label_URL || 'No image available'}
              </Text>
              {(jobOrder.port_label_image_url || jobOrder.Port_Label_Image_URL || jobOrder.port_label_url || jobOrder.Port_Label_URL) && (
                <Pressable onPress={() => Linking.openURL(jobOrder.port_label_image_url || jobOrder.Port_Label_Image_URL || jobOrder.port_label_url || jobOrder.Port_Label_URL || '')}>
                  <ExternalLink width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </Pressable>
              )}
            </View>
          </View>
        );

      case 'houseFrontPicture':
        return (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 8, borderBottomColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
            <Text style={{ width: 160, fontSize: 14, color: isDarkMode ? '#9ca3af' : '#4b5563' }}>House Front Picture</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ flex: 1, marginRight: 8, color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>
                {jobOrder.house_front_picture_url || jobOrder.House_Front_Picture_URL || jobOrder.house_front_picture || jobOrder.House_Front_Picture || 'No image available'}
              </Text>
              {(jobOrder.house_front_picture_url || jobOrder.House_Front_Picture_URL || jobOrder.house_front_picture || jobOrder.House_Front_Picture) && (
                <Pressable onPress={() => Linking.openURL(jobOrder.house_front_picture_url || jobOrder.House_Front_Picture_URL || jobOrder.house_front_picture || jobOrder.House_Front_Picture || '')}>
                  <ExternalLink width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
                </Pressable>
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={{ height: '100%', flexDirection: 'column', overflow: 'hidden', position: 'relative', width: '100%', borderLeftWidth: !isMobile ? 1 : 0, backgroundColor: isDarkMode ? '#030712' : '#f9fafb', borderLeftColor: isDarkMode ? 'rgba(255,255,255,0.3)' : '#d1d5db' }}>
      <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={{ fontWeight: '500', maxWidth: isMobile ? 200 : undefined, fontSize: isMobile ? 14 : 16, color: isDarkMode ? '#ffffff' : '#111827' }} numberOfLines={1}>{getClientFullName()}</Text>
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
              <Text style={{ color: '#ffffff', fontSize: isMobile ? 14 : 16, fontWeight: '500' }}>Done</Text>
            </Pressable>
          )}

          <Pressable onPress={() => setShowFieldSettings(!showFieldSettings)} style={{ position: 'relative' }}>
            <Settings width={16} height={16} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
          </Pressable>

          <Pressable onPress={onClose}>
            <X width={18} height={18} color={isDarkMode ? '#9ca3af' : '#4b5563'} />
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

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ maxWidth: 672, marginHorizontal: 'auto', paddingVertical: 24, paddingHorizontal: 16, backgroundColor: isDarkMode ? '#030712' : '#f9fafb' }}>
          <View style={{ gap: 16 }}>
            {fieldOrder.map((fieldKey) => (
              <React.Fragment key={fieldKey}>
                {renderFieldContent(fieldKey)}
              </React.Fragment>
            ))}
          </View>
        </View>
      </ScrollView>

      {showFieldSettings && (
        <Modal
          visible={showFieldSettings}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFieldSettings(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setShowFieldSettings(false)}
          >
            <Pressable
              style={{ width: '90%', maxWidth: 400, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, borderWidth: 1, maxHeight: '80%', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                <Text style={{ fontWeight: '600', color: isDarkMode ? '#ffffff' : '#111827' }}>Field Visibility</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable onPress={selectAllFields}>
                    <Text style={{ color: '#2563eb', fontSize: 12 }}>Show All</Text>
                  </Pressable>
                  <Text style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>|</Text>
                  <Pressable onPress={deselectAllFields}>
                    <Text style={{ color: '#2563eb', fontSize: 12 }}>Hide All</Text>
                  </Pressable>
                  <Text style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>|</Text>
                  <Pressable onPress={resetFieldSettings}>
                    <Text style={{ color: '#2563eb', fontSize: 12 }}>Reset</Text>
                  </Pressable>
                </View>
              </View>
              <ScrollView style={{ padding: 8 }} showsVerticalScrollIndicator={false}>
                {fieldOrder.map((fieldKey) => (
                  <Pressable
                    key={fieldKey}
                    onPress={() => toggleFieldVisibility(fieldKey)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4 }}
                  >
                    <View style={{ height: 16, width: 16, borderRadius: 4, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: fieldVisibility[fieldKey] ? '#2563eb' : '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
                      {fieldVisibility[fieldKey] && <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                    </View>
                    <Text style={{ fontSize: 14, color: isDarkMode ? '#d1d5db' : '#374151' }}>
                      {getFieldLabel(fieldKey)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

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
