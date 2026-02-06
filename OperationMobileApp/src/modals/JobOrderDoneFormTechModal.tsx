import React, { useState, useEffect } from 'react';
import { X, Calendar, ChevronDown, Camera, MapPin, CheckCircle, AlertCircle, XCircle, Loader2, Search } from 'lucide-react';
import { UserData } from '../types/api';
import { updateJobOrder } from '../services/jobOrderService';
import { userService } from '../services/userService';
import { planService, Plan } from '../services/planService';
import { routerModelService, RouterModel } from '../services/routerModelService';
import { getAllPorts, Port } from '../services/portService';
import { getAllLCPNAPs, LCPNAP } from '../services/lcpnapService';
import { getAllVLANs, VLAN } from '../services/vlanService';

import { getAllUsageTypes, UsageType } from '../services/usageTypeService';
import { getAllInventoryItems, InventoryItem } from '../services/inventoryItemService';
import { createJobOrderItems, JobOrderItem, deleteJobOrderItems } from '../services/jobOrderItemService';
import { getRegions, getCities, City } from '../services/cityService';
import { barangayService, Barangay } from '../services/barangayService';
import { locationDetailService, LocationDetail } from '../services/locationDetailService';
import { updateApplication } from '../services/applicationService';
import apiClient from '../config/api';
import { getActiveImageSize, resizeImage, ImageSizeSetting } from '../services/imageSettingsService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import LocationPicker from '../components/LocationPicker';
import { pppoeService, UsernamePattern } from '../services/pppoeService';

interface Region {
  id: number;
  name: string;
}

interface JobOrderDoneFormTechModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  jobOrderData?: any;
}



interface JobOrderDoneFormData {
  dateInstalled: string;
  usageType: string;
  choosePlan: string;
  connectionType: string;
  routerModel: string;
  modemSN: string;

  region: string;
  city: string;
  barangay: string;
  location: string;
  lcpnap: string;
  port: string;
  vlan: string;
  onsiteStatus: string;
  onsiteRemarks: string;
  signedContractImage: File | null;
  setupImage: File | null;
  boxReadingImage: File | null;
  routerReadingImage: File | null;
  portLabelImage: File | null;
  clientSignatureImage: File | null;
  speedTestImage: File | null;
  modifiedBy: string;
  modifiedDate: string;
  itemName1: string;
  visit_by: string;
  visit_with: string;
  visit_with_other: string;
  statusRemarks: string;
  ip: string;
  addressCoordinates: string;
}

interface OrderItem {
  itemId: string;
  quantity: string;
}

const JobOrderDoneFormTechModal: React.FC<JobOrderDoneFormTechModalProps> = ({
  isOpen,
  onClose,
  onSave,
  jobOrderData
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

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

  const getCurrentUser = (): UserData | null => {
    try {
      const authData = localStorage.getItem('authData');
      if (authData) {
        return JSON.parse(authData);
      }
    } catch (error) {
    }
    return null;
  };

  const currentUser = getCurrentUser();
  const currentUserEmail = currentUser?.email || 'unknown@unknown.com';

  const [formData, setFormData] = useState<JobOrderDoneFormData>({
    dateInstalled: '',
    usageType: '',
    choosePlan: '',
    connectionType: '',
    routerModel: '',
    modemSN: '',

    region: '',
    city: '',
    barangay: '',
    location: '',
    lcpnap: '',
    port: '',
    vlan: '',
    onsiteStatus: 'In Progress',
    onsiteRemarks: '',
    signedContractImage: null,
    setupImage: null,
    boxReadingImage: null,
    routerReadingImage: null,
    portLabelImage: null,
    clientSignatureImage: null,
    speedTestImage: null,
    modifiedBy: currentUserEmail,
    modifiedDate: new Date().toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }),
    itemName1: '',
    visit_by: '',
    visit_with: '',
    visit_with_other: '',
    statusRemarks: '',
    ip: '',
    addressCoordinates: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [technicians, setTechnicians] = useState<Array<{ email: string; name: string }>>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [routerModels, setRouterModels] = useState<RouterModel[]>([]);
  const [lcpnaps, setLcpnaps] = useState<LCPNAP[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [vlans, setVlans] = useState<VLAN[]>([]);

  const [usageTypes, setUsageTypes] = useState<UsageType[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ itemId: '', quantity: '' }]);
  const [imagePreviews, setImagePreviews] = useState<{
    signedContractImage: string | null;
    setupImage: string | null;
    boxReadingImage: string | null;
    routerReadingImage: string | null;
    portLabelImage: string | null;
    clientSignatureImage: string | null;
    speedTestImage: string | null;
  }>({
    signedContractImage: null,
    setupImage: null,
    boxReadingImage: null,
    routerReadingImage: null,
    portLabelImage: null,
    clientSignatureImage: null,
    speedTestImage: null
  });

  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    messages: Array<{ type: 'success' | 'warning' | 'error'; text: string }>;
  }>({ title: '', messages: [] });
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [activeImageSize, setActiveImageSize] = useState<ImageSizeSetting | null>(null);
  const [usernamePattern, setUsernamePattern] = useState<UsernamePattern | null>(null);
  const [techInputValue, setTechInputValue] = useState<string>('');
  const [lcpnapSearch, setLcpnapSearch] = useState('');
  const [isLcpnapOpen, setIsLcpnapOpen] = useState(false);

  const convertGoogleDriveUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;

    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
    }

    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
    }

    return url;
  };

  const isGoogleDriveUrl = (url: string | null): boolean => {
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('docs.google.com');
  };

  const isCloudUrl = (url: string | null): boolean => {
    if (!url) return false;
    return url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1');
  };

  const ImagePreview: React.FC<{
    imageUrl: string | null;
    label: string;
    onUpload: (file: File) => void;
    error?: string;
  }> = ({ imageUrl, label, onUpload, error }) => {
    const [imageLoadError, setImageLoadError] = useState(false);
    const isGDrive = isGoogleDriveUrl(imageUrl);
    const isBlobUrl = imageUrl?.startsWith('blob:');
    const isCloud = isCloudUrl(imageUrl);

    return (
      <div>
        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>{label}</label>
        <div className={`relative w-full h-48 border rounded overflow-hidden cursor-pointer ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
          }`}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onUpload(e.target.files[0]);
                setImageLoadError(false);
              }
            }}
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
          />
          {imageUrl && !imageLoadError ? (
            <div className="relative w-full h-full">
              {isBlobUrl ? (
                <img
                  src={imageUrl}
                  alt={label}
                  className="w-full h-full object-contain"
                  onError={() => setImageLoadError(true)}
                />
              ) : isCloud ? (
                <div className={`w-full h-full flex flex-col items-center justify-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                  <Camera size={48} className="mb-2 opacity-50" />
                  <span className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isGDrive ? 'Image stored in Google Drive' : 'Image stored in Cloud'}
                  </span>
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline z-20"
                    style={{ color: colorPalette?.primary || '#ea580c' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    View in {isGDrive ? 'Drive' : 'Source'}
                  </a>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <Camera size={32} />
                  <span className="text-sm mt-2">Invalid image source</span>
                </div>
              )}
              <div className="absolute bottom-3 right-3 bg-[#22c55e] text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center shadow-lg pointer-events-none z-30">
                <Camera className="mr-2" size={16} />Uploaded
              </div>
            </div>
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
              <Camera size={32} />
              <span className="text-sm mt-2 font-medium">Click to upload</span>
            </div>
          )}
        </div>
        {error && (
          <div className="flex items-center mt-1">
            <div
              className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2 shadow-sm"
              style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
            >!</div>
            <p className="text-xs font-medium" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const fetchImageSizeSettings = async () => {
      if (isOpen) {
        try {
          const settings = await getActiveImageSize();
          setActiveImageSize(settings);
        } catch (error) {
          setActiveImageSize(null);
        }
      }
    };

    fetchImageSizeSettings();
  }, [isOpen]);

  useEffect(() => {
    const fetchUsernamePattern = async () => {
      if (isOpen) {
        try {
          const patterns = await pppoeService.getPatterns('username');
          if (patterns && patterns.length > 0) {
            const pattern = patterns[0];
            setUsernamePattern(pattern);

            // Load existing pppoe_username if available
            const existingUsername = jobOrderData?.pppoe_username || jobOrderData?.PPPoE_Username || '';
            if (existingUsername && pattern.sequence.some(item => item.type === 'tech_input')) {
              setTechInputValue(existingUsername);
            }
          }
        } catch (error) {
          console.error('Failed to fetch username pattern:', error);
          setUsernamePattern(null);
        }
      }
    };

    fetchUsernamePattern();
  }, [isOpen, jobOrderData]);

  useEffect(() => {
    if (!isOpen) return;

    if (jobOrderData) {
      const isValidImageUrl = (url: any): boolean => {
        if (!url) return false;
        if (typeof url !== 'string') return false;
        const trimmed = url.trim().toLowerCase();
        return trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined';
      };

      const getImageUrl = (fieldVariations: string[]): string | null => {
        for (const field of fieldVariations) {
          const value = jobOrderData?.[field];
          if (isValidImageUrl(value)) {
            return value;
          }
        }
        return null;
      };

      const clientSignatureVariations = [
        'client_signature_image_url',
        'Client_Signature_Image_URL',
        'client_sig_image_url',
        'signature_image_url',
        'clientSignatureImageUrl',
        'ClientSignatureImageURL',
        'client_signature_url',
        'clientSignatureUrl'
      ];

      const newImagePreviews = {
        signedContractImage: convertGoogleDriveUrl(jobOrderData?.signed_contract_image_url || jobOrderData?.Signed_Contract_Image_URL),
        setupImage: convertGoogleDriveUrl(jobOrderData?.setup_image_url || jobOrderData?.Setup_Image_URL),
        boxReadingImage: convertGoogleDriveUrl(jobOrderData?.box_reading_image_url || jobOrderData?.Box_Reading_Image_URL),
        routerReadingImage: convertGoogleDriveUrl(jobOrderData?.router_reading_image_url || jobOrderData?.Router_Reading_Image_URL),
        portLabelImage: convertGoogleDriveUrl(jobOrderData?.port_label_image_url || jobOrderData?.Port_Label_Image_URL),
        clientSignatureImage: convertGoogleDriveUrl(getImageUrl(clientSignatureVariations)),
        speedTestImage: convertGoogleDriveUrl(jobOrderData?.speedtest_image_url || jobOrderData?.Speedtest_Image_URL)
      };

      setImagePreviews(newImagePreviews);

      const errorsToClear: string[] = [];
      if (newImagePreviews.signedContractImage) errorsToClear.push('signedContractImage');
      if (newImagePreviews.setupImage) errorsToClear.push('setupImage');
      if (newImagePreviews.boxReadingImage) errorsToClear.push('boxReadingImage');
      if (newImagePreviews.routerReadingImage) errorsToClear.push('routerReadingImage');
      if (newImagePreviews.portLabelImage) errorsToClear.push('portLabelImage');
      if (newImagePreviews.clientSignatureImage) errorsToClear.push('clientSignatureImage');
      if (newImagePreviews.speedTestImage) errorsToClear.push('speedTestImage');

      if (errorsToClear.length > 0) {
        setErrors(prev => {
          const newErrors = { ...prev };
          errorsToClear.forEach(key => delete newErrors[key]);
          return newErrors;
        });
      }
    } else {
      setImagePreviews({
        signedContractImage: null,
        setupImage: null,
        boxReadingImage: null,
        routerReadingImage: null,
        portLabelImage: null,
        clientSignatureImage: null,
        speedTestImage: null
      });
    }
  }, [jobOrderData, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setOrderItems([{ itemId: '', quantity: '' }]);
      setTechInputValue('');
      Object.values(imagePreviews).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    }
  }, [isOpen, imagePreviews]);

  // Load existing job order items from database
  useEffect(() => {
    const fetchJobOrderItems = async () => {
      if (isOpen && jobOrderData) {
        const jobOrderId = jobOrderData.id || jobOrderData.JobOrder_ID;
        if (jobOrderId) {
          try {
            const response = await apiClient.get(`/job-order-items?job_order_id=${jobOrderId}`);
            const data = response.data as { success: boolean; data: any[] };

            if (data.success && Array.isArray(data.data)) {
              const items = data.data;

              if (items.length > 0) {
                const uniqueItems = new Map();

                items.forEach((item: any) => {
                  const key = item.item_name;
                  if (uniqueItems.has(key)) {
                    const existing = uniqueItems.get(key);
                    uniqueItems.set(key, {
                      itemId: item.item_name || '',
                      quantity: (parseInt(existing.quantity) + parseInt(item.quantity || 0)).toString()
                    });
                  } else {
                    uniqueItems.set(key, {
                      itemId: item.item_name || '',
                      quantity: item.quantity ? item.quantity.toString() : ''
                    });
                  }
                });

                const formattedItems = Array.from(uniqueItems.values());
                formattedItems.push({ itemId: '', quantity: '' });

                setOrderItems(formattedItems);
              } else {
                setOrderItems([{ itemId: '', quantity: '' }]);
              }
            }
          } catch (error) {
            setOrderItems([{ itemId: '', quantity: '' }]);
          }
        }
      }
    };

    fetchJobOrderItems();
  }, [isOpen, jobOrderData]);

  useEffect(() => {
    const fetchLcpnaps = async () => {
      if (isOpen) {
        try {
          const response = await getAllLCPNAPs('', 1, 1000);

          if (response.success && Array.isArray(response.data)) {
            setLcpnaps(response.data);
          } else {
            setLcpnaps([]);
          }
        } catch (error) {
          setLcpnaps([]);
        }
      }
    };

    fetchLcpnaps();
  }, [isOpen]);

  useEffect(() => {
    const fetchPorts = async () => {
      if (isOpen && formData.lcpnap) {
        try {
          const jobOrderId = jobOrderData?.id || jobOrderData?.JobOrder_ID;
          const response = await getAllPorts(formData.lcpnap, 1, 100, true, jobOrderId);

          if (response.success && Array.isArray(response.data)) {
            setPorts(response.data);
          } else {
            setPorts([]);
          }
        } catch (error) {
          setPorts([]);
        }
      } else if (isOpen && !formData.lcpnap) {
        setPorts([]);
      }
    };
    fetchPorts();
  }, [isOpen, jobOrderData, formData.lcpnap]);

  useEffect(() => {
    const fetchVlans = async () => {
      if (isOpen) {
        try {
          const response = await getAllVLANs();
          if (response.success && Array.isArray(response.data)) {
            setVlans(response.data);
          } else {
            setVlans([]);
          }
        } catch (error) {
          setVlans([]);
        }
      }
    };
    fetchVlans();
  }, [isOpen]);



  useEffect(() => {
    const fetchUsageTypes = async () => {
      if (isOpen) {
        try {
          const response = await getAllUsageTypes();

          if (response.success && Array.isArray(response.data)) {
            setUsageTypes(response.data);
          } else {
            setUsageTypes([]);
          }
        } catch (error) {
          setUsageTypes([]);
        }
      }
    };

    fetchUsageTypes();
  }, [isOpen]);

  useEffect(() => {
    const fetchInventoryItems = async () => {
      if (isOpen) {
        try {
          const response = await getAllInventoryItems();

          if (response.success && Array.isArray(response.data)) {
            setInventoryItems(response.data);
          } else {
            setInventoryItems([]);
          }
        } catch (error) {
          setInventoryItems([]);
        }
      }
    };

    fetchInventoryItems();
  }, [isOpen]);



  useEffect(() => {
    const fetchTechnicians = async () => {
      if (isOpen) {
        try {
          const response = await userService.getUsersByRole('technician');
          if (response.success && response.data) {
            const technicianList = response.data
              .filter((user: any) => user.first_name || user.last_name)
              .map((user: any) => {
                const firstName = (user.first_name || '').trim();
                const lastName = (user.last_name || '').trim();
                const fullName = `${firstName} ${lastName}`.trim();
                return {
                  email: user.email_address || user.email || '',
                  name: fullName || user.username || user.email_address || user.email || ''
                };
              })
              .filter((tech: any) => tech.name);
            setTechnicians(technicianList);
          }
        } catch (error) {
        }
      }
    };

    fetchTechnicians();
  }, [isOpen]);

  useEffect(() => {
    const fetchPlans = async () => {
      if (isOpen) {
        try {
          const fetchedPlans = await planService.getAllPlans();
          setPlans(fetchedPlans);
        } catch (error) {
        }
      }
    };

    fetchPlans();
  }, [isOpen]);

  useEffect(() => {
    const fetchRouterModels = async () => {
      if (isOpen) {
        try {
          const fetchedRouterModels = await routerModelService.getAllRouterModels();
          setRouterModels(fetchedRouterModels);
        } catch (error) {
        }
      }
    };

    fetchRouterModels();
  }, [isOpen]);

  useEffect(() => {
    if (jobOrderData && isOpen) {

      const loadedOnsiteStatus = jobOrderData.Onsite_Status || jobOrderData.onsite_status || 'In Progress';

      const isEmptyValue = (value: any): boolean => {
        if (value === null || value === undefined || value === '') return true;
        if (typeof value === 'string') {
          const trimmed = value.trim().toLowerCase();
          return trimmed === 'null';
        }
        return false;
      };

      const getValue = (value: any, fieldName: string): string => {
        const result = isEmptyValue(value) ? '' : value;
        return result;
      };

      const formatDateForInput = (dateValue: any): string => {
        if (!dateValue || isEmptyValue(dateValue)) return '';

        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return '';

          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');

          return `${year}-${month}-${day}`;
        } catch (error) {
          return '';
        }
      };

      const fetchApplicationData = async () => {
        try {
          const applicationId = jobOrderData.application_id || jobOrderData.Application_ID;
          if (applicationId) {
            const appResponse = await apiClient.get<{ success: boolean; application: any }>(`/applications/${applicationId}`);
            if (appResponse.data.success && appResponse.data.application) {
              const appData = appResponse.data.application;

              const newFormData = {
                dateInstalled: formatDateForInput(jobOrderData.Date_Installed || jobOrderData.date_installed),
                usageType: getValue(jobOrderData.Usage_Type || jobOrderData.usage_type, 'usageType'),
                choosePlan: getValue(jobOrderData.Desired_Plan || jobOrderData.desired_plan || jobOrderData.Choose_Plan || jobOrderData.choose_plan || jobOrderData.plan, 'choosePlan'),
                connectionType: getValue(jobOrderData.Connection_Type || jobOrderData.connection_type, 'connectionType'),
                routerModel: getValue(jobOrderData.Router_Model || jobOrderData.router_model, 'routerModel'),
                modemSN: getValue(jobOrderData.Modem_SN || jobOrderData.modem_sn, 'modemSN'),

                lcpnap: getValue(jobOrderData.LCPNAP || jobOrderData.lcpnap, 'lcpnap'),
                port: getValue(jobOrderData.PORT || jobOrderData.port, 'port'),
                vlan: getValue(jobOrderData.VLAN || jobOrderData.vlan, 'vlan'),
                region: getValue(appData.region || jobOrderData.Region || jobOrderData.region, 'region'),
                city: getValue(appData.city || jobOrderData.City || jobOrderData.city, 'city'),
                barangay: getValue(appData.barangay || jobOrderData.Barangay || jobOrderData.barangay, 'barangay'),
                location: getValue(appData.location || jobOrderData.Location || jobOrderData.location, 'location'),
                onsiteStatus: loadedOnsiteStatus,
                onsiteRemarks: getValue(jobOrderData.Onsite_Remarks || jobOrderData.onsite_remarks, 'onsiteRemarks'),
                itemName1: getValue(jobOrderData.Item_Name_1 || jobOrderData.item_name_1, 'itemName1'),
                visit_by: getValue(jobOrderData.Visit_By || jobOrderData.visit_by, 'visit_by'),
                visit_with: getValue(jobOrderData.Visit_With || jobOrderData.visit_with, 'visit_with'),
                visit_with_other: getValue(jobOrderData.Visit_With_Other || jobOrderData.visit_with_other, 'visit_with_other'),
                statusRemarks: getValue(jobOrderData.Status_Remarks || jobOrderData.status_remarks, 'statusRemarks'),
                ip: getValue(jobOrderData.IP || jobOrderData.ip, 'ip'),
                addressCoordinates: getValue(jobOrderData.Address_Coordinates || jobOrderData.address_coordinates, 'addressCoordinates')
              };

              setFormData(prev => ({
                ...prev,
                ...newFormData
              }));

              // Initialize image previews from database values (only if they are actual URLs)
              const safeConvert = (val: any) => {
                const url = val || '';
                if (url && typeof url === 'string' && url.startsWith('http')) {
                  return convertGoogleDriveUrl(url);
                }
                return null;
              };

              setImagePreviews({
                signedContractImage: safeConvert(jobOrderData.signed_contract_image_url || jobOrderData.Signed_Contract_Image_URL),
                setupImage: safeConvert(jobOrderData.setup_image_url || jobOrderData.Setup_Image_URL),
                boxReadingImage: safeConvert(jobOrderData.box_reading_image_url || jobOrderData.Box_Reading_Image_URL),
                routerReadingImage: safeConvert(jobOrderData.router_reading_image_url || jobOrderData.Router_Reading_Image_URL),
                portLabelImage: safeConvert(jobOrderData.port_label_image_url || jobOrderData.Port_Label_Image_URL),
                clientSignatureImage: safeConvert(jobOrderData.client_signature_url || jobOrderData.Client_Signature_URL),
                speedTestImage: safeConvert(jobOrderData.speedtest_image_url || jobOrderData.Speedtest_Image_URL)
              });
            }
          } else {
            loadDefaultFormData();
          }
        } catch (error) {
          loadDefaultFormData();
        }
      };

      const loadDefaultFormData = () => {
        const newFormData = {
          dateInstalled: formatDateForInput(jobOrderData.Date_Installed || jobOrderData.date_installed),
          usageType: getValue(jobOrderData.Usage_Type || jobOrderData.usage_type, 'usageType'),
          choosePlan: getValue(jobOrderData.Desired_Plan || jobOrderData.desired_plan || jobOrderData.Choose_Plan || jobOrderData.choose_plan || jobOrderData.plan, 'choosePlan'),
          connectionType: getValue(jobOrderData.Connection_Type || jobOrderData.connection_type, 'connectionType'),
          routerModel: getValue(jobOrderData.Router_Model || jobOrderData.router_model, 'routerModel'),
          modemSN: getValue(jobOrderData.Modem_SN || jobOrderData.modem_sn, 'modemSN'),

          lcpnap: getValue(jobOrderData.LCPNAP || jobOrderData.lcpnap, 'lcpnap'),
          port: getValue(jobOrderData.PORT || jobOrderData.port, 'port'),
          vlan: getValue(jobOrderData.VLAN || jobOrderData.vlan, 'vlan'),
          region: getValue(jobOrderData.Region || jobOrderData.region, 'region'),
          city: getValue(jobOrderData.City || jobOrderData.city, 'city'),
          barangay: getValue(jobOrderData.Barangay || jobOrderData.barangay, 'barangay'),
          location: getValue(jobOrderData.Location || jobOrderData.location, 'location'),
          onsiteStatus: loadedOnsiteStatus,
          onsiteRemarks: getValue(jobOrderData.Onsite_Remarks || jobOrderData.onsite_remarks, 'onsiteRemarks'),
          itemName1: getValue(jobOrderData.Item_Name_1 || jobOrderData.item_name_1, 'itemName1'),
          visit_by: getValue(jobOrderData.Visit_By || jobOrderData.visit_by, 'visit_by'),
          visit_with: getValue(jobOrderData.Visit_With || jobOrderData.visit_with, 'visit_with'),
          visit_with_other: getValue(jobOrderData.Visit_With_Other || jobOrderData.visit_with_other, 'visit_with_other'),
          statusRemarks: getValue(jobOrderData.Status_Remarks || jobOrderData.status_remarks, 'statusRemarks'),
          ip: getValue(jobOrderData.IP || jobOrderData.ip, 'ip'),
          addressCoordinates: getValue(jobOrderData.Address_Coordinates || jobOrderData.address_coordinates, 'addressCoordinates')
        };

        setFormData(prev => ({
          ...prev,
          ...newFormData
        }));

        // Initialize image previews from database values (only if they are actual URLs)
        const safeConvertDefault = (val: any) => {
          const url = val || '';
          if (url && typeof url === 'string' && url.startsWith('http')) {
            return convertGoogleDriveUrl(url);
          }
          return null;
        };

        setImagePreviews({
          signedContractImage: safeConvertDefault(jobOrderData.signed_contract_image_url || jobOrderData.Signed_Contract_Image_URL),
          setupImage: safeConvertDefault(jobOrderData.setup_image_url || jobOrderData.Setup_Image_URL),
          boxReadingImage: safeConvertDefault(jobOrderData.box_reading_image_url || jobOrderData.Box_Reading_Image_URL),
          routerReadingImage: safeConvertDefault(jobOrderData.router_reading_image_url || jobOrderData.Router_Reading_Image_URL),
          portLabelImage: safeConvertDefault(jobOrderData.port_label_image_url || jobOrderData.Port_Label_Image_URL),
          clientSignatureImage: safeConvertDefault(jobOrderData.client_signature_url || jobOrderData.Client_Signature_URL),
          speedTestImage: safeConvertDefault(jobOrderData.speedtest_image_url || jobOrderData.Speedtest_Image_URL)
        });
      };

      fetchApplicationData();
    }
  }, [jobOrderData, isOpen]);

  const handleInputChange = (field: keyof JobOrderDoneFormData, value: string | File | null) => {
    if (field === 'addressCoordinates') {
      console.log('[INPUT DEBUG] Address Coordinates changed to:', value);
    }

    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'lcpnap') {
        newData.port = '';
      }
      if (field === 'region') {
        newData.city = '';
        newData.barangay = '';
        newData.location = '';
      }
      if (field === 'city') {
        newData.barangay = '';
        newData.location = '';
      }
      if (field === 'barangay') {
        newData.location = '';
      }
      return newData;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageUpload = async (field: 'signedContractImage' | 'setupImage' | 'boxReadingImage' | 'routerReadingImage' | 'portLabelImage' | 'clientSignatureImage' | 'speedTestImage', file: File) => {
    try {
      let processedFile = file;
      const originalSize = (file.size / 1024 / 1024).toFixed(2);

      if (activeImageSize && activeImageSize.image_size_value < 100) {
        try {
          const resizedFile = await resizeImage(file, activeImageSize.image_size_value);
          const resizedSize = (resizedFile.size / 1024 / 1024).toFixed(2);

          if (resizedFile.size < file.size) {
            processedFile = resizedFile;
            console.log(`[RESIZE SUCCESS] ${field}: ${originalSize}MB → ${resizedSize}MB (${activeImageSize.image_size_value}%, saved ${((1 - resizedFile.size / file.size) * 100).toFixed(1)}%)`);
          } else {
            console.log(`[RESIZE SKIP] ${field}: Resized file (${resizedSize}MB) is not smaller than original (${originalSize}MB), using original`);
          }
        } catch (resizeError) {
          console.error(`[RESIZE FAILED] ${field}:`, resizeError);
          processedFile = file;
        }
      }

      setFormData(prev => {
        const updated = { ...prev, [field]: processedFile };
        console.log(`[STATE UPDATE] ${field} stored: ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
        return updated;
      });

      if (imagePreviews[field] && imagePreviews[field]?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviews[field]!);
      }

      const previewUrl = URL.createObjectURL(processedFile);
      setImagePreviews(prev => ({ ...prev, [field]: previewUrl }));

      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    } catch (error) {
      console.error(`[UPLOAD ERROR] ${field}:`, error);
      setFormData(prev => ({ ...prev, [field]: file }));

      if (imagePreviews[field] && imagePreviews[field]?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviews[field]!);
      }

      const previewUrl = URL.createObjectURL(file);
      setImagePreviews(prev => ({ ...prev, [field]: previewUrl }));

      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  const handleItemChange = (index: number, field: 'itemId' | 'quantity', value: string) => {
    const newOrderItems = [...orderItems];
    newOrderItems[index][field] = value;
    setOrderItems(newOrderItems);

    if (field === 'itemId' && value && index === orderItems.length - 1) {
      setOrderItems([...newOrderItems, { itemId: '', quantity: '' }]);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (orderItems.length > 1) {
      const newOrderItems = orderItems.filter((_, i) => i !== index);
      setOrderItems(newOrderItems);
    }
  };

  const showMessageModal = (title: string, messages: Array<{ type: 'success' | 'warning' | 'error'; text: string }>) => {
    setModalContent({ title, messages });
    setShowModal(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const isValidImageUrl = (url: any): boolean => {
      if (!url) return false;
      if (typeof url !== 'string') return false;
      const trimmed = url.trim().toLowerCase();
      return trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined';
    };

    if (!formData.choosePlan.trim()) newErrors.choosePlan = 'Choose Plan is required';
    if (!formData.onsiteStatus.trim()) newErrors.onsiteStatus = 'Onsite Status is required';

    if (!formData.region.trim()) newErrors.region = 'Region is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.barangay.trim()) newErrors.barangay = 'Barangay is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';

    if (formData.onsiteStatus === 'Done') {
      if (!formData.dateInstalled.trim()) newErrors.dateInstalled = 'Date Installed is required';
      if (!formData.usageType.trim()) newErrors.usageType = 'Usage Type is required';
      if (!formData.connectionType.trim()) newErrors.connectionType = 'Connection Type is required';
      if (!formData.routerModel.trim()) newErrors.routerModel = 'Router Model is required';
      if (!formData.modemSN.trim()) newErrors.modemSN = 'Modem SN is required';

      // Check if tech_input is required for PPPoE username
      if (usernamePattern && usernamePattern.sequence.some(item => item.type === 'tech_input')) {
        if (!techInputValue.trim()) {
          newErrors.techInput = 'PPPoE Username is required';
        }
      }

      if (formData.connectionType === 'Antenna') {
        if (!formData.ip.trim()) newErrors.ip = 'IP is required';

      } else if (formData.connectionType === 'Fiber') {
        if (!formData.lcpnap.trim()) newErrors.lcpnap = 'LCP-NAP is required';
        if (!formData.port.trim()) newErrors.port = 'PORT is required';
        if (!formData.vlan.trim()) newErrors.vlan = 'VLAN is required';
      } else if (formData.connectionType === 'Local') {

      }

      if (!formData.visit_by.trim()) newErrors.visit_by = 'Visit By is required';
      if (!formData.visit_with.trim()) newErrors.visit_with = 'Visit With is required';
      if (!formData.visit_with_other.trim()) newErrors.visit_with_other = 'Visit With(Other) is required';
      if (!formData.onsiteRemarks.trim()) newErrors.onsiteRemarks = 'Onsite Remarks is required';
      if (!formData.addressCoordinates.trim()) newErrors.addressCoordinates = 'Address Coordinates is required';

      const validItems = orderItems.filter(item => item.itemId && item.quantity);
      if (validItems.length === 0) {
        newErrors.items = 'At least one item with quantity is required';
      } else {
        for (let i = 0; i < validItems.length; i++) {
          if (!validItems[i].itemId) {
            newErrors[`item_${i}`] = 'Item is required';
          }
          if (!validItems[i].quantity || parseInt(validItems[i].quantity) <= 0) {
            newErrors[`quantity_${i}`] = 'Valid quantity is required';
          }
        }
      }


    }

    if (formData.onsiteStatus === 'Failed' || formData.onsiteStatus === 'Reschedule') {
      if (!formData.visit_by.trim()) newErrors.visit_by = 'Visit By is required';
      if (!formData.visit_with.trim()) newErrors.visit_with = 'Visit With is required';
      if (!formData.visit_with_other.trim()) newErrors.visit_with_other = 'Visit With(Other) is required';
      if (!formData.onsiteRemarks.trim()) newErrors.onsiteRemarks = 'Onsite Remarks is required';
      if (!formData.statusRemarks.trim()) newErrors.statusRemarks = 'Status Remarks is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    console.log('[SAVE START] ========================================');
    console.log('[SAVE START] handleSave function called');
    console.log('[SAVE START] jobOrderData:', jobOrderData);
    console.log('[SAVE START] jobOrderData.id:', jobOrderData?.id);
    console.log('[SAVE START] jobOrderData.JobOrder_ID:', jobOrderData?.JobOrder_ID);

    const updatedFormData = {
      ...formData,
      modifiedBy: currentUserEmail,
      modifiedDate: new Date().toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    };

    console.log('[SAVE START] updatedFormData:', updatedFormData);
    setFormData(updatedFormData);

    if (!validateForm()) {
      console.log('[SAVE VALIDATION] Form validation failed');
      console.log('[SAVE VALIDATION] Errors:', errors);
      showMessageModal('Validation Error', [
        { type: 'error', text: 'Please fill in all required fields before saving.' }
      ]);
      return;
    }

    console.log('[SAVE VALIDATION] Form validation passed');

    if (!jobOrderData?.id && !jobOrderData?.JobOrder_ID) {
      console.error('[SAVE ERROR] Cannot proceed - jobOrderData is missing ID');
      console.error('[SAVE ERROR] jobOrderData:', jobOrderData);
      showMessageModal('Error', [
        { type: 'error', text: 'Cannot update job order: Missing ID' }
      ]);
      return;
    }

    console.log('[SAVE ID CHECK] Job order has ID, proceeding...');

    setLoading(true);
    setShowLoadingModal(true);
    setLoadingPercentage(0);

    const progressInterval = setInterval(() => {
      setLoadingPercentage(prev => {
        if (prev >= 99) return 99;
        if (prev >= 90) return prev + 0.5;
        if (prev >= 70) return prev + 1;
        return prev + 3;
      });
    }, 200);

    const saveMessages: Array<{ type: 'success' | 'warning' | 'error'; text: string }> = [];

    try {
      const jobOrderId = jobOrderData.id || jobOrderData.JobOrder_ID;

      if (!jobOrderId) {
        console.error('[SAVE ERROR] ========================================');
        console.error('[SAVE ERROR] Missing job order ID');
        console.error('[SAVE ERROR] jobOrderData_keys:', Object.keys(jobOrderData || {}));
        console.error('[SAVE ERROR] jobOrderData_id:', jobOrderData?.id);
        console.error('[SAVE ERROR] jobOrderData_JobOrder_ID:', jobOrderData?.JobOrder_ID);
        console.error('[SAVE ERROR] ========================================');

        saveMessages.push({
          type: 'error',
          text: 'Cannot update: Missing job order ID'
        });

        setLoading(false);
        setShowLoadingModal(false);
        showMessageModal('Error', saveMessages);
        return;
      }

      console.log('[SAVE ID CHECK] ========================================');
      console.log('[SAVE ID CHECK] Job Order ID found:', jobOrderId);
      console.log('[SAVE ID CHECK] typeof jobOrderId:', typeof jobOrderId);
      console.log('[SAVE ID CHECK] This ID will be used to UPDATE existing record');
      console.log('[SAVE ID CHECK] ========================================');

      const jobOrderUpdateData: any = {
        date_installed: updatedFormData.dateInstalled,
        usage_type: updatedFormData.usageType,
        router_model: updatedFormData.routerModel,
        lcpnap: updatedFormData.lcpnap,
        port: updatedFormData.port,
        vlan: updatedFormData.vlan,
        visit_by: updatedFormData.visit_by,
        visit_with: updatedFormData.visit_with,
        visit_with_other: updatedFormData.visit_with_other,
        updated_by_user_email: updatedFormData.modifiedBy,
        desired_plan: updatedFormData.choosePlan
      };

      if (updatedFormData.onsiteStatus === 'Done') {
        jobOrderUpdateData.connection_type = updatedFormData.connectionType;
        jobOrderUpdateData.modem_router_sn = updatedFormData.modemSN;
        jobOrderUpdateData.ip_address = updatedFormData.ip;
        jobOrderUpdateData.onsite_remarks = updatedFormData.onsiteRemarks;
        jobOrderUpdateData.address_coordinates = updatedFormData.addressCoordinates || '';
        jobOrderUpdateData.onsite_status = 'Done';


        console.log('[SAVE DEBUG] Address Coordinates:', updatedFormData.addressCoordinates);

        const hasTechInput = usernamePattern && usernamePattern.sequence.some(item => item.type === 'tech_input');

        if (hasTechInput && techInputValue.trim()) {
          jobOrderUpdateData.pppoe_username = techInputValue.trim();
          // Password will be auto-generated by backend when username is provided without password
          console.log('[SAVE DEBUG] Tech Input PPPoE Username:', techInputValue.trim());
          console.log('[SAVE DEBUG] Password will be auto-generated by backend');
        } else {
          const planNameForRadius = updatedFormData.choosePlan.includes(' - P')
            ? updatedFormData.choosePlan.split(' - P')[0].trim()
            : updatedFormData.choosePlan;

          try {
            const radiusResponse = await apiClient.post<{
              success: boolean;
              message: string;
              data?: {
                username: string;
                password: string;
                group: string;
                credentials_exist?: boolean;
                radius_response?: any;
              };
            }>(`/job-orders/${jobOrderId}/create-radius-account`);

            if (radiusResponse.data.success && radiusResponse.data.data) {
              const { username, password, credentials_exist } = radiusResponse.data.data;

              // Always update the job order with the credentials
              jobOrderUpdateData.pppoe_username = username;
              jobOrderUpdateData.pppoe_password = password;

              if (credentials_exist) {
                saveMessages.push({
                  type: 'warning',
                  text: `PPPoE credentials already exist: Username: ${username}, Password: ${password}, Plan: ${planNameForRadius}`
                });
              } else {
                saveMessages.push({
                  type: 'success',
                  text: `RADIUS Account Created: Username: ${username}, Password: ${password}, Plan: ${planNameForRadius}`
                });
              }
            } else {
              saveMessages.push({
                type: 'warning',
                text: `RADIUS account creation failed: ${radiusResponse.data.message}`
              });
            }
          } catch (radiusError: any) {
            const errorMsg = radiusError.response?.data?.message || radiusError.message || 'Unknown error';
            saveMessages.push({
              type: 'warning',
              text: `RADIUS account creation failed: ${errorMsg}`
            });
          }
        }

        const firstName = (jobOrderData?.First_Name || jobOrderData?.first_name || '').trim();
        const middleInitial = (jobOrderData?.Middle_Initial || jobOrderData?.middle_initial || '').trim();
        const fullLastName = (jobOrderData?.Last_Name || jobOrderData?.last_name || '').trim();
        const folderName = `(joborder)${firstName} ${middleInitial} ${fullLastName}`.trim();

        const imageFormData = new FormData();
        imageFormData.append('folder_name', folderName);

        console.log('[UPLOAD START] Preparing images for upload...');

        if (formData.signedContractImage) {
          console.log(`[APPEND] Signed Contract: ${(formData.signedContractImage.size / 1024 / 1024).toFixed(2)}MB`);
          imageFormData.append('signed_contract_image', formData.signedContractImage, formData.signedContractImage.name);
        }
        if (formData.setupImage) {
          console.log(`[APPEND] Setup: ${(formData.setupImage.size / 1024 / 1024).toFixed(2)}MB`);
          imageFormData.append('setup_image', formData.setupImage, formData.setupImage.name);
        }
        if (formData.boxReadingImage) {
          console.log(`[APPEND] Box Reading: ${(formData.boxReadingImage.size / 1024 / 1024).toFixed(2)}MB`);
          imageFormData.append('box_reading_image', formData.boxReadingImage, formData.boxReadingImage.name);
        }
        if (formData.routerReadingImage) {
          console.log(`[APPEND] Router Reading: ${(formData.routerReadingImage.size / 1024 / 1024).toFixed(2)}MB`);
          imageFormData.append('router_reading_image', formData.routerReadingImage, formData.routerReadingImage.name);
        }
        if (formData.portLabelImage) {
          console.log(`[APPEND] Port Label: ${(formData.portLabelImage.size / 1024 / 1024).toFixed(2)}MB`);
          imageFormData.append('port_label_image', formData.portLabelImage, formData.portLabelImage.name);
        }
        if (formData.clientSignatureImage) {
          console.log(`[APPEND] Client Signature: ${(formData.clientSignatureImage.size / 1024 / 1024).toFixed(2)}MB`);
          imageFormData.append('client_signature_image', formData.clientSignatureImage, formData.clientSignatureImage.name);
        }
        if (formData.speedTestImage) {
          console.log(`[APPEND] Speed Test: ${(formData.speedTestImage.size / 1024 / 1024).toFixed(2)}MB`);
          imageFormData.append('speed_test_image', formData.speedTestImage, formData.speedTestImage.name);
        }

        console.log('[UPLOAD] FormData prepared, sending to backend...');

        try {
          const uploadResponse = await apiClient.post<{
            success: boolean;
            message: string;
            data?: {
              signed_contract_image_url?: string;
              setup_image_url?: string;
              box_reading_image_url?: string;
              router_reading_image_url?: string;
              port_label_image_url?: string;
              client_signature_image_url?: string;
              speedtest_image_url?: string;
            };
            folder_id?: string;
          }>(`/job-orders/${jobOrderId}/upload-images`, imageFormData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });

          if (uploadResponse.data.success && uploadResponse.data.data) {
            const imageUrls = uploadResponse.data.data;

            if (imageUrls.signed_contract_image_url) {
              jobOrderUpdateData.signed_contract_image_url = imageUrls.signed_contract_image_url;
            }
            if (imageUrls.setup_image_url) {
              jobOrderUpdateData.setup_image_url = imageUrls.setup_image_url;
            }
            if (imageUrls.box_reading_image_url) {
              jobOrderUpdateData.box_reading_image_url = imageUrls.box_reading_image_url;
            }
            if (imageUrls.router_reading_image_url) {
              jobOrderUpdateData.router_reading_image_url = imageUrls.router_reading_image_url;
            }
            if (imageUrls.port_label_image_url) {
              jobOrderUpdateData.port_label_image_url = imageUrls.port_label_image_url;
            }
            if (imageUrls.client_signature_image_url) {
              jobOrderUpdateData.client_signature_url = imageUrls.client_signature_image_url;
            }
            if (imageUrls.speedtest_image_url) {
              jobOrderUpdateData.speedtest_image_url = imageUrls.speedtest_image_url;
            }
          }
        } catch (uploadError: any) {
          const errorMsg = uploadError.response?.data?.message || uploadError.message || 'Unknown error';
          saveMessages.push({
            type: 'warning',
            text: `Failed to upload images to Google Drive: ${errorMsg}`
          });
        }
      }

      if (updatedFormData.onsiteStatus === 'Failed' || updatedFormData.onsiteStatus === 'Reschedule') {
        jobOrderUpdateData.onsite_remarks = updatedFormData.onsiteRemarks;
        jobOrderUpdateData.status_remarks = updatedFormData.statusRemarks;
        jobOrderUpdateData.onsite_status = updatedFormData.onsiteStatus;
      }

      if (updatedFormData.onsiteStatus === 'In Progress') {
        jobOrderUpdateData.onsite_status = 'In Progress';

      }

      console.log('[API CALL] ========================================');
      console.log('[API CALL] ABOUT TO CALL: updateJobOrder()');
      console.log('[API CALL] Method: PUT');
      console.log('[API CALL] Endpoint: /job-orders/' + jobOrderId);
      console.log('[API CALL] Job Order ID:', jobOrderId);
      console.log('[API CALL] typeof jobOrderId:', typeof jobOrderId);
      console.log('[API CALL] Update Data Keys:', Object.keys(jobOrderUpdateData));
      console.log('[API CALL] Full Update Data:', JSON.stringify(jobOrderUpdateData, null, 2));
      console.log('[API CALL] IMPORTANT: This should UPDATE existing row, NOT create new row');
      console.log('[API CALL] ========================================');

      const jobOrderResponse = await updateJobOrder(jobOrderId, jobOrderUpdateData);

      console.log('[API RESPONSE] ========================================');
      console.log('[API RESPONSE] updateJobOrder completed');
      console.log('[API RESPONSE] Full response:', JSON.stringify(jobOrderResponse, null, 2));
      console.log('[API RESPONSE] success:', jobOrderResponse?.success);
      console.log('[API RESPONSE] message:', jobOrderResponse?.message);
      console.log('[API RESPONSE] data:', jobOrderResponse?.data);
      console.log('[API RESPONSE] ========================================');

      if (!jobOrderResponse.success) {
        console.error('[SAVE ERROR] updateJobOrder failed:', jobOrderResponse);
        throw new Error(jobOrderResponse.message || 'Job order update failed');
      }

      console.log('[SAVE SUCCESS] Job order updated successfully');

      saveMessages.push({
        type: 'success',
        text: 'Job order updated successfully'
      });

      let applicationId = jobOrderData.application_id || jobOrderData.Application_ID || jobOrderData.account_id;

      if (!applicationId) {
        try {
          const jobOrderResponse = await apiClient.get<{ success: boolean; data: any }>(`/job-orders/${jobOrderId}`);
          if (jobOrderResponse.data.success && jobOrderResponse.data.data) {
            applicationId = jobOrderResponse.data.data.application_id;
          }
        } catch (fetchError: any) {
        }
      }

      if (applicationId) {
        try {
          const firstName = jobOrderData?.First_Name || jobOrderData?.first_name || '';
          const middleInitial = jobOrderData?.Middle_Initial || jobOrderData?.middle_initial || '';
          const lastName = jobOrderData?.Last_Name || jobOrderData?.last_name || '';
          const mobileNumber = jobOrderData?.Mobile_Number || jobOrderData?.mobile_number || '';
          const secondaryMobile = jobOrderData?.Secondary_Mobile_Number || jobOrderData?.secondary_mobile_number || '';
          const emailAddress = jobOrderData?.Email_Address || jobOrderData?.email_address || '';
          const installationAddress = jobOrderData?.Installation_Address || jobOrderData?.installation_address || '';
          const landmark = jobOrderData?.Landmark || jobOrderData?.landmark || '';
          const referredBy = jobOrderData?.Referred_By || jobOrderData?.referred_by || '';
          const promo = jobOrderData?.Promo || jobOrderData?.promo || '';

          const applicationUpdateData: any = {
            first_name: firstName,
            middle_initial: middleInitial,
            last_name: lastName,
            mobile_number: mobileNumber,
            secondary_mobile_number: secondaryMobile,
            email_address: emailAddress,
            installation_address: installationAddress,
            landmark: landmark,
            region: updatedFormData.region,
            city: updatedFormData.city,
            barangay: updatedFormData.barangay,
            location: updatedFormData.location,
            desired_plan: updatedFormData.choosePlan,
            referred_by: referredBy,
            promo: promo
          };

          const applicationResponse = await updateApplication(applicationId.toString(), applicationUpdateData);

          saveMessages.push({
            type: 'success',
            text: `Application updated: Plan: ${updatedFormData.choosePlan}, Location: ${updatedFormData.region}, ${updatedFormData.city}, ${updatedFormData.barangay}, ${updatedFormData.location}`
          });
        } catch (appError: any) {
          const errorMsg = appError.response?.data?.message || appError.message || 'Unknown error';
          saveMessages.push({
            type: 'warning',
            text: `Application update failed: ${errorMsg} (Application ID: ${applicationId})`
          });
        }
      } else {
        saveMessages.push({
          type: 'warning',
          text: 'Cannot update application - missing application ID'
        });
      }

      if (updatedFormData.onsiteStatus === 'Done') {
        const validItems = orderItems.filter(item => {
          const quantity = parseInt(item.quantity);
          const isValid = item.itemId && item.itemId.trim() !== '' && !isNaN(quantity) && quantity > 0;
          return isValid;
        });

        console.log('[SAVE ITEMS] Valid items found:', validItems.length, validItems);

        if (validItems.length > 0) {
          try {
            // Ensure we have a numeric ID
            const numericJobOrderId = parseInt((jobOrderData.JobOrder_ID || jobOrderData.id || 0).toString());
            console.log('[SAVE ITEMS] Using Job Order ID:', numericJobOrderId);

            if (!numericJobOrderId || isNaN(numericJobOrderId)) {
              throw new Error('Invalid Job Order ID for items saving');
            }

            // Get existing items from database
            const existingItemsResponse = await apiClient.get<{ success: boolean; data: any[] }>(`/job-order-items?job_order_id=${numericJobOrderId}`);

            if (existingItemsResponse.data.success && Array.isArray(existingItemsResponse.data.data)) {
              const existingItems = existingItemsResponse.data.data;
              console.log('[SAVE ITEMS] Existing items count:', existingItems.length);

              const existingItemsMap = new Map();
              existingItems.forEach((item: any) => {
                existingItemsMap.set(item.item_name, item);
              });

              const itemsToUpdate = [];
              const itemsToCreate = [];
              const processedItemNames = new Set<string>();

              for (const item of validItems) {
                processedItemNames.add(item.itemId);
                const existingItem = existingItemsMap.get(item.itemId);

                if (existingItem) {
                  itemsToUpdate.push({ id: existingItem.id, item_name: item.itemId, quantity: parseInt(item.quantity) });
                } else {
                  itemsToCreate.push({ job_order_id: numericJobOrderId, item_name: item.itemId, quantity: parseInt(item.quantity) });
                }
              }

              // Update existing items
              for (const item of itemsToUpdate) {
                console.log(`[SAVE ITEMS] Updating: ${item.item_name}`, item);
                await apiClient.put(`/job-order-items/${item.id}`, { quantity: item.quantity });
              }

              // Create new items in batch
              if (itemsToCreate.length > 0) {
                console.log('[SAVE ITEMS] Batch creating:', itemsToCreate);
                await apiClient.post('/job-order-items', { items: itemsToCreate });
              }

              // Delete removed items
              for (const existingItem of existingItems) {
                if (!processedItemNames.has(existingItem.item_name)) {
                  console.log(`[SAVE ITEMS] Deleting removed item: ${existingItem.item_name}`);
                  await apiClient.delete(`/job-order-items/${existingItem.id}`);
                }
              }
            } else {
              // Fallback: Create all as new if GET failed or returned no success
              const itemsToCreate = validItems.map(item => ({
                job_order_id: numericJobOrderId,
                item_name: item.itemId,
                quantity: parseInt(item.quantity)
              }));
              console.log('[SAVE ITEMS] Fallback batch creation:', itemsToCreate);
              await apiClient.post('/job-order-items', { items: itemsToCreate });
            }
            console.log('[SAVE ITEMS] Items processing completed successfully');
          } catch (itemsError: any) {
            console.error('[SAVE ITEMS] ERROR:', itemsError);
            saveMessages.push({
              type: 'warning',
              text: `Items saving warning: ${itemsError.message || 'Check connection'}`
            });
          }
        }
      }

      clearInterval(progressInterval);
      setLoadingPercentage(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('[SAVE COMPLETE] ========================================');
      console.log('[SAVE COMPLETE] All operations completed successfully');
      console.log('[SAVE COMPLETE] Final save messages:', saveMessages);
      console.log('[SAVE COMPLETE] ========================================');

      setErrors({});
      setLoading(false);
      setShowLoadingModal(false);
      setLoadingPercentage(0);
      onSave(updatedFormData);
      onClose();
    } catch (error: any) {
      clearInterval(progressInterval);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';

      console.error('[SAVE ERROR] ========================================');
      console.error('[SAVE ERROR] Save operation failed');
      console.error('[SAVE ERROR] Error:', error);
      console.error('[SAVE ERROR] Error message:', errorMessage);
      console.error('[SAVE ERROR] Error response:', error.response);
      console.error('[SAVE ERROR] ========================================');

      setLoading(false);
      setShowLoadingModal(false);
      setLoadingPercentage(0);
      showMessageModal('Error', [
        { type: 'error', text: `Failed to update records: ${errorMessage}` }
      ]);
    }
  };

  if (!isOpen) return null;

  const fullName = `${jobOrderData?.First_Name || jobOrderData?.first_name || ''} ${jobOrderData?.Middle_Initial || jobOrderData?.middle_initial || ''} ${jobOrderData?.Last_Name || jobOrderData?.last_name || ''}`.trim();



  return (
    <>
      {showLoadingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[10000] flex items-center justify-center">
          <div className={`rounded-lg p-8 flex flex-col items-center space-y-6 min-w-[320px] ${isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
            <Loader2
              className="w-20 h-20 animate-spin"
              style={{ color: colorPalette?.primary || '#ea580c' }}
            />
            <div className="text-center">
              <p className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{loadingPercentage}%</p>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]">
          <div className={`rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col ${isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{modalContent.title}</h3>
              <button
                onClick={() => setShowModal(false)}
                className={`transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="space-y-3">
                {modalContent.messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${message.type === 'success'
                      ? (isDarkMode ? 'bg-green-900/30 border-green-700' : 'bg-green-100 border-green-300')
                      : message.type === 'warning'
                        ? (isDarkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-100 border-yellow-300')
                        : (isDarkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-100 border-red-300')
                      }`}
                  >
                    {message.type === 'success' && (
                      <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                    )}
                    {message.type === 'warning' && (
                      <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
                    )}
                    {message.type === 'error' && (
                      <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                    )}
                    <p
                      className={`text-sm ${message.type === 'success'
                        ? (isDarkMode ? 'text-green-200' : 'text-green-800')
                        : message.type === 'warning'
                          ? (isDarkMode ? 'text-yellow-200' : 'text-yellow-800')
                          : (isDarkMode ? 'text-red-200' : 'text-red-800')
                        }`}
                    >
                      {message.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-white rounded transition-colors"
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50">
        <div className={`h-full w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
          }`}>
          <div className={`px-6 py-4 flex items-center justify-between border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
            }`}>
            <div className="flex items-center space-x-3">

              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{fullName}</h2>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded text-sm transition-colors"
                style={{
                  borderColor: colorPalette?.primary || '#ea580c',
                  color: colorPalette?.primary || '#ea580c'
                }}
                onMouseEnter={(e) => {
                  if (colorPalette?.primary) {
                    e.currentTarget.style.backgroundColor = colorPalette.primary;
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  if (colorPalette?.primary) {
                    e.currentTarget.style.color = colorPalette.primary;
                  }
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 disabled:opacity-50 text-white rounded text-sm transition-colors"
                style={{
                  backgroundColor: loading ? (isDarkMode ? '#6b7280' : '#9ca3af') : (colorPalette?.primary || '#ea580c')
                }}
                onMouseEnter={(e) => {
                  if (!loading && colorPalette?.accent) {
                    e.currentTarget.style.backgroundColor = colorPalette.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && colorPalette?.primary) {
                    e.currentTarget.style.backgroundColor = colorPalette.primary;
                  }
                }}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Choose Plan<span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={formData.choosePlan} onChange={(e) => handleInputChange('choosePlan', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                  } ${errors.choosePlan ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}>
                  <option value="">Select Plan</option>
                  {formData.choosePlan && !plans.some(plan => {
                    const planWithPrice = plan.price ? `${plan.name} - P${plan.price}` : plan.name;
                    return planWithPrice === formData.choosePlan || plan.name === formData.choosePlan;
                  }) && (
                      <option value={formData.choosePlan}>{formData.choosePlan}</option>
                    )}
                  {plans.map((plan) => {
                    const planWithPrice = plan.price ? `${plan.name} - P${plan.price}` : plan.name;
                    return (
                      <option key={plan.id} value={planWithPrice}>
                        {planWithPrice}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`} size={20} />
              </div>
              {errors.choosePlan && (
                <div className="flex items-center mt-1">
                  <div
                    className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                    style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                  >!</div>
                  <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors.choosePlan}</p>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Onsite Status<span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={formData.onsiteStatus} onChange={(e) => handleInputChange('onsiteStatus', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                  } ${errors.onsiteStatus ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                  <option value="Failed">Failed</option>
                  <option value="Reschedule">Reschedule</option>
                </select>
                <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`} size={20} />
              </div>
              {errors.onsiteStatus && (
                <div className="flex items-center mt-1">
                  <div
                    className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                    style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                  >!</div>
                  <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors.onsiteStatus}</p>
                </div>
              )}
            </div>



            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Region</label>
              <input
                type="text"
                value={formData.region}
                readOnly
                className={`w-full px-3 py-2 border rounded focus:outline-none cursor-not-allowed opacity-75 ${isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-300'
                  : 'bg-gray-100 border-gray-300 text-gray-600'
                  }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>City</label>
              <input
                type="text"
                value={formData.city}
                readOnly
                className={`w-full px-3 py-2 border rounded focus:outline-none cursor-not-allowed opacity-75 ${isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-300'
                  : 'bg-gray-100 border-gray-300 text-gray-600'
                  }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Barangay</label>
              <input
                type="text"
                value={formData.barangay}
                readOnly
                className={`w-full px-3 py-2 border rounded focus:outline-none cursor-not-allowed opacity-75 ${isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-300'
                  : 'bg-gray-100 border-gray-300 text-gray-600'
                  }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Location</label>
              <input
                type="text"
                value={formData.location}
                readOnly
                className={`w-full px-3 py-2 border rounded focus:outline-none cursor-not-allowed opacity-75 ${isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-300'
                  : 'bg-gray-100 border-gray-300 text-gray-600'
                  }`}
              />
            </div>

            {formData.onsiteStatus === 'Done' && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Date Installed<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type="date" value={formData.dateInstalled} onChange={(e) => handleInputChange('dateInstalled', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      } ${errors.dateInstalled ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`} />
                    <Calendar className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`} size={20} />
                  </div>
                  {errors.dateInstalled && (
                    <div className="flex items-center mt-1">
                      <div
                        className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >!</div>
                      <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Usage Type<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={formData.usageType} onChange={(e) => handleInputChange('usageType', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      } ${errors.usageType ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}>
                      <option value=""></option>
                      {formData.usageType && !usageTypes.some(ut => ut.usage_name === formData.usageType) && (
                        <option value={formData.usageType}>{formData.usageType}</option>
                      )}
                      {usageTypes.map((usageType) => (
                        <option key={usageType.id} value={usageType.usage_name}>
                          {usageType.usage_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`} size={20} />
                  </div>
                  {errors.usageType && (
                    <div className="flex items-center mt-1">
                      <div
                        className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >!</div>
                      <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Connection Type<span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleInputChange('connectionType', 'Antenna')}
                      className={`py-2 px-4 rounded border transition-colors duration-200 ${formData.connectionType === 'Antenna'
                        ? 'text-white'
                        : (isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-700')
                        }`}
                      style={formData.connectionType === 'Antenna' ? {
                        backgroundColor: colorPalette?.primary || '#ea580c',
                        borderColor: colorPalette?.accent || '#dc2626'
                      } : {}}
                    >Antenna</button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('connectionType', 'Fiber')}
                      className={`py-2 px-4 rounded border transition-colors duration-200 ${formData.connectionType === 'Fiber'
                        ? 'text-white'
                        : (isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-700')
                        }`}
                      style={formData.connectionType === 'Fiber' ? {
                        backgroundColor: colorPalette?.primary || '#ea580c',
                        borderColor: colorPalette?.accent || '#dc2626'
                      } : {}}
                    >Fiber</button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('connectionType', 'Local')}
                      className={`py-2 px-4 rounded border transition-colors duration-200 ${formData.connectionType === 'Local'
                        ? 'text-white'
                        : (isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-700')
                        }`}
                      style={formData.connectionType === 'Local' ? {
                        backgroundColor: colorPalette?.primary || '#ea580c',
                        borderColor: colorPalette?.accent || '#dc2626'
                      } : {}}
                    >Local</button>
                  </div>
                  {errors.connectionType && (
                    <div className="flex items-center mt-1">
                      <div
                        className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >!</div>
                      <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Router Model<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={formData.routerModel} onChange={(e) => handleInputChange('routerModel', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      } ${errors.routerModel ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}>
                      <option value=""></option>
                      {formData.routerModel && !routerModels.some(rm => rm.model === formData.routerModel) && (
                        <option value={formData.routerModel}>{formData.routerModel}</option>
                      )}
                      {routerModels.map((routerModel, index) => (
                        <option key={index} value={routerModel.model}>{routerModel.model}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`} size={20} />
                  </div>
                  {errors.routerModel && (
                    <div className="flex items-center mt-1">
                      <div
                        className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >!</div>
                      <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Modem SN<span className="text-red-500">*</span></label>
                  <input type="text" value={formData.modemSN} onChange={(e) => handleInputChange('modemSN', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                    } ${errors.modemSN ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`} />
                  {errors.modemSN && (
                    <div className="flex items-center mt-1">
                      <div
                        className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >!</div>
                      <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                    </div>
                  )}
                </div>

                {usernamePattern && usernamePattern.sequence.some(item => item.type === 'tech_input') && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>PPPoE Username<span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={techInputValue}
                      onChange={(e) => {
                        setTechInputValue(e.target.value);
                        if (errors.techInput) {
                          setErrors(prev => ({ ...prev, techInput: '' }));
                        }
                      }}
                      placeholder="Enter PPPoE username"
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                        } ${errors.techInput ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}
                    />
                    {errors.techInput && (
                      <div className="flex items-center mt-1">
                        <div
                          className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                          style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                        >!</div>
                        <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors.techInput}</p>
                      </div>
                    )}
                    {!techInputValue.trim() && !errors.techInput && (
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>This will be used as the PPPoE username</p>
                    )}
                  </div>
                )}

                {formData.connectionType === 'Antenna' && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>IP<span className="text-red-500">*</span></label>
                    <input type="text" value={formData.ip} onChange={(e) => handleInputChange('ip', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      } ${errors.ip ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`} />
                    {errors.ip && (
                      <div className="flex items-center mt-1">
                        <div
                          className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                          style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                        >!</div>
                        <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                      </div>
                    )}
                  </div>
                )}

                {formData.connectionType === 'Fiber' && (
                  <>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        LCP-NAP<span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        {/* Display Field (The "Closed" state) */}
                        <div
                          className={`flex items-center justify-between px-3 py-2 border rounded cursor-pointer transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                            } ${errors.lcpnap ? 'border-red-500' : 'focus-within:border-orange-500'}`}
                          onClick={() => setIsLcpnapOpen(!isLcpnapOpen)}
                        >
                          <span className={`text-sm ${!formData.lcpnap ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : ''}`}>
                            {formData.lcpnap || 'Select LCP-NAP'}
                          </span>
                          <ChevronDown
                            size={18}
                            className={`transition-transform duration-200 ${isLcpnapOpen ? 'rotate-180' : ''} ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}
                          />
                        </div>

                        {/* Dropdown Menu */}
                        {isLcpnapOpen && (
                          <div
                            className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-md shadow-2xl border overflow-hidden flex flex-col ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                              }`}
                            style={{ minWidth: '100%' }}
                          >
                            {/* Search Box at Top of Dropdown */}
                            <div className={`p-2 border-b ${isDarkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
                              <div className={`flex items-center px-2 py-1.5 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 focus-within:border-orange-500' : 'bg-white border-gray-300 focus-within:border-orange-500'
                                }`}>
                                <Search size={14} className="mr-2 text-gray-400" />
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Search LCP-NAP..."
                                  value={lcpnapSearch}
                                  onChange={(e) => setLcpnapSearch(e.target.value)}
                                  className={`w-full bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>

                            {/* Options List */}
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                              {lcpnaps
                                .filter(ln => ln.lcpnap_name.toLowerCase().includes(lcpnapSearch.toLowerCase()))
                                .map((lcpnap) => (
                                  <div
                                    key={lcpnap.id}
                                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${isDarkMode
                                      ? 'hover:bg-gray-700 text-gray-200'
                                      : 'hover:bg-gray-100 text-gray-700'
                                      } ${formData.lcpnap === lcpnap.lcpnap_name ? (isDarkMode ? 'bg-orange-600/20 text-orange-400' : 'bg-orange-50 text-orange-600') : ''}`}
                                    onClick={() => {
                                      handleInputChange('lcpnap', lcpnap.lcpnap_name);
                                      setLcpnapSearch('');
                                      setIsLcpnapOpen(false);
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>{lcpnap.lcpnap_name}</span>
                                      {formData.lcpnap === lcpnap.lcpnap_name && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              {lcpnaps.filter(ln => ln.lcpnap_name.toLowerCase().includes(lcpnapSearch.toLowerCase())).length === 0 && (
                                <div className={`px-4 py-8 text-center text-sm italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                  No results found for "{lcpnapSearch}"
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Click outside to close */}
                        {isLcpnapOpen && (
                          <div
                            className="fixed inset-0 z-40 bg-transparent"
                            onClick={() => {
                              setIsLcpnapOpen(false);
                              setLcpnapSearch('');
                            }}
                          />
                        )}
                      </div>
                      {errors.lcpnap && (
                        <div className="flex items-center mt-1">
                          <div
                            className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >!</div>
                          <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>PORT<span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select value={formData.port} onChange={(e) => handleInputChange('port', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                          } ${errors.port ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}>
                          <option value="">Select PORT</option>
                          <option value="PORT 001">PORT 001</option>
                          <option value="PORT 002">PORT 002</option>
                          <option value="PORT 003">PORT 003</option>
                          <option value="PORT 004">PORT 004</option>
                          <option value="PORT 005">PORT 005</option>
                          <option value="PORT 006">PORT 006</option>
                          <option value="PORT 007">PORT 007</option>
                          <option value="PORT 008">PORT 008</option>
                          <option value="PORT 009">PORT 009</option>
                          <option value="PORT 010">PORT 010</option>
                          <option value="PORT 011">PORT 011</option>
                          <option value="PORT 012">PORT 012</option>
                          <option value="PORT 013">PORT 013</option>
                          <option value="PORT 014">PORT 014</option>
                          <option value="PORT 015">PORT 015</option>
                          <option value="PORT 016">PORT 016</option>
                          <option value="PORT 017">PORT 017</option>
                          <option value="PORT 018">PORT 018</option>
                          <option value="PORT 019">PORT 019</option>
                          <option value="PORT 020">PORT 020</option>
                          <option value="PORT 021">PORT 021</option>
                          <option value="PORT 022">PORT 022</option>
                          <option value="PORT 023">PORT 023</option>
                          <option value="PORT 024">PORT 024</option>
                          <option value="PORT 025">PORT 025</option>
                          <option value="PORT 026">PORT 026</option>
                          <option value="PORT 027">PORT 027</option>
                          <option value="PORT 028">PORT 028</option>
                          <option value="PORT 029">PORT 029</option>
                          <option value="PORT 030">PORT 030</option>
                          <option value="PORT 032">PORT 032</option>
                          <option value="PORT 032">PORT 032</option>
                        </select>
                        <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`} size={20} />
                      </div>
                      {errors.port && (
                        <div className="flex items-center mt-1">
                          <div
                            className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >!</div>
                          <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>VLAN<span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select value={formData.vlan} onChange={(e) => handleInputChange('vlan', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                          } ${errors.vlan ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}>
                          <option value="">Select VLAN</option>
                          {formData.vlan && !vlans.some(v => v.value.toString() === formData.vlan) && (
                            <option value={formData.vlan}>{formData.vlan}</option>
                          )}
                          {vlans.map((vlan) => (
                            <option key={vlan.vlan_id} value={vlan.value}>
                              {vlan.value}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`} size={20} />
                      </div>
                      {errors.vlan && (
                        <div className="flex items-center mt-1">
                          <div
                            className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                            style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                          >!</div>
                          <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Visit By<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={formData.visit_by} onChange={(e) => handleInputChange('visit_by', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      } ${errors.visit_by ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}>
                      <option value=""></option>
                      {formData.visit_by && !technicians.some(t => t.name === formData.visit_by) && (
                        <option value={formData.visit_by}>{formData.visit_by}</option>
                      )}
                      {technicians.filter(t => t.name !== formData.visit_with && t.name !== formData.visit_with_other).map((technician, index) => (
                        <option key={index} value={technician.name}>{technician.name}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`} size={20} />
                  </div>
                  {errors.visit_by && (
                    <div className="flex items-center mt-1">
                      <div
                        className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >!</div>
                      <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Visit With<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={formData.visit_with} onChange={(e) => handleInputChange('visit_with', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      } ${errors.visit_with ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}>
                      <option value="">Select Visit With</option>
                      <option value="None">None</option>
                      {formData.visit_with && formData.visit_with !== 'None' && formData.visit_with !== '' && !technicians.some(t => t.name === formData.visit_with) && (
                        <option value={formData.visit_with}>{formData.visit_with}</option>
                      )}
                      {technicians.filter(t => t.name !== formData.visit_by && t.name !== formData.visit_with_other).map((technician, index) => (
                        <option key={index} value={technician.name}>{technician.name}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`} size={20} />
                  </div>
                  {errors.visit_with && (
                    <div className="flex items-center mt-1">
                      <div
                        className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >!</div>
                      <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Visit With(Other)<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={formData.visit_with_other} onChange={(e) => handleInputChange('visit_with_other', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      } ${errors.visit_with_other ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}>
                      <option value="">Visit With(Other)</option>
                      <option value="None">None</option>
                      {formData.visit_with_other && formData.visit_with_other !== 'None' && formData.visit_with_other !== '' && !technicians.some(t => t.name === formData.visit_with_other) && (
                        <option value={formData.visit_with_other}>{formData.visit_with_other}</option>
                      )}
                      {technicians.filter(t => t.name !== formData.visit_by && t.name !== formData.visit_with).map((technician, index) => (
                        <option key={index} value={technician.name}>{technician.name}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`} size={20} />
                  </div>
                  {errors.visit_with_other && (
                    <div className="flex items-center mt-1">
                      <div
                        className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >!</div>
                      <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Onsite Remarks<span className="text-red-500">*</span></label>
                  <textarea value={formData.onsiteRemarks} onChange={(e) => handleInputChange('onsiteRemarks', e.target.value)} rows={3} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 resize-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                    } ${errors.onsiteRemarks ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`} />
                  {errors.onsiteRemarks && (
                    <div className="flex items-center mt-1">
                      <div
                        className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >!</div>
                      <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                    </div>
                  )}
                </div>

                <ImagePreview
                  imageUrl={imagePreviews.boxReadingImage}
                  label="Box Reading Image"
                  onUpload={(file) => handleImageUpload('boxReadingImage', file)}
                  error={errors.boxReadingImage}
                />

                <ImagePreview
                  imageUrl={imagePreviews.routerReadingImage}
                  label="Router Reading Image"
                  onUpload={(file) => handleImageUpload('routerReadingImage', file)}
                  error={errors.routerReadingImage}
                />

                {(formData.connectionType === 'Antenna' || formData.connectionType === 'Local') && (
                  <ImagePreview
                    imageUrl={imagePreviews.portLabelImage}
                    label="Port Label Image"
                    onUpload={(file) => handleImageUpload('portLabelImage', file)}
                    error={errors.portLabelImage}
                  />
                )}

                <ImagePreview
                  imageUrl={imagePreviews.setupImage}
                  label="Setup Image"
                  onUpload={(file) => handleImageUpload('setupImage', file)}
                  error={errors.setupImage}
                />

                <ImagePreview
                  imageUrl={imagePreviews.signedContractImage}
                  label="Signed Contract Image"
                  onUpload={(file) => handleImageUpload('signedContractImage', file)}
                  error={errors.signedContractImage}
                />

                <ImagePreview
                  imageUrl={imagePreviews.clientSignatureImage}
                  label="Client Signature Image"
                  onUpload={(file) => handleImageUpload('clientSignatureImage', file)}
                  error={errors.clientSignatureImage}
                />

                <ImagePreview
                  imageUrl={imagePreviews.speedTestImage}
                  label="Speed Test Image"
                  onUpload={(file) => handleImageUpload('speedTestImage', file)}
                  error={errors.speedTestImage}
                />

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Items<span className="text-red-500">*</span></label>
                  {orderItems.map((item, index) => (
                    <div key={index} className="mb-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <div className="relative">
                            <select
                              value={item.itemId}
                              onChange={(e) => handleItemChange(index, 'itemId', e.target.value)}
                              className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
                                }`}
                            >
                              <option value="">Select Item {index + 1}</option>
                              {inventoryItems.map((invItem) => (
                                <option key={invItem.id} value={invItem.item_name}>
                                  {invItem.item_name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`} size={20} />
                          </div>
                          {errors[`item_${index}`] && (
                            <p className="text-xs mt-1" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors[`item_${index}`]}</p>
                          )}
                        </div>

                        {item.itemId && (
                          <div className="w-32">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              placeholder="Qty"
                              min="1"
                              className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
                                }`}
                            />
                            {errors[`quantity_${index}`] && (
                              <p className="text-xs mt-1" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors[`quantity_${index}`]}</p>
                            )}
                          </div>
                        )}

                        {orderItems.length > 1 && item.itemId && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-2 text-red-500 hover:text-red-400"
                          >
                            <X size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {errors.items && (
                    <div className="flex items-center mt-1">
                      <div
                        className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >!</div>
                      <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>{errors.items}</p>
                    </div>
                  )}
                </div>

                <LocationPicker
                  value={formData.addressCoordinates}
                  onChange={(coordinates) => handleInputChange('addressCoordinates', coordinates)}
                  isDarkMode={isDarkMode}
                  label="Address Coordinates"
                  required={true}
                  error={errors.addressCoordinates}
                />
              </>
            )}

            {(formData.onsiteStatus === 'Failed' || formData.onsiteStatus === 'Reschedule') && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Visit By<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={formData.visit_by} onChange={(e) => handleInputChange('visit_by', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      } ${errors.visit_by ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}>
                      <option value=""></option>
                      {formData.visit_by && !technicians.some(t => t.name === formData.visit_by) && (
                        <option value={formData.visit_by}>{formData.visit_by}</option>
                      )}
                      {technicians.map((technician, index) => (
                        <option key={index} value={technician.name}>{technician.name}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`} size={20} />
                  </div>
                  {errors.visit_by && (
                    <div className="flex items-center mt-1">
                      <div
                        className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >!</div>
                      <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Visit With<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={formData.visit_with} onChange={(e) => handleInputChange('visit_with', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      } ${errors.visit_with ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}>
                      <option value="">Visit With</option>
                      <option value="None">None</option>
                      {formData.visit_with && formData.visit_with !== 'None' && formData.visit_with !== '' && !technicians.some(t => t.name === formData.visit_with) && (
                        <option value={formData.visit_with}>{formData.visit_with}</option>
                      )}
                      {technicians.filter(t => t.name !== formData.visit_by).map((technician, index) => (
                        <option key={index} value={technician.name}>{technician.name}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`} size={20} />
                  </div>
                  {errors.visit_with && (
                    <div className="flex items-center mt-1">
                      <div
                        className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >!</div>
                      <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Visit With(Other)<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={formData.visit_with_other} onChange={(e) => handleInputChange('visit_with_other', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      } ${errors.visit_with_other ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}>
                      <option value="">Visit With(Other)</option>
                      <option value="None">None</option>
                      {formData.visit_with_other && formData.visit_with_other !== 'None' && formData.visit_with_other !== '' && !technicians.some(t => t.name === formData.visit_with_other) && (
                        <option value={formData.visit_with_other}>{formData.visit_with_other}</option>
                      )}
                      {technicians.filter(t => t.name !== formData.visit_by).map((technician, index) => (
                        <option key={index} value={technician.name}>{technician.name}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`} size={20} />
                  </div>
                  {errors.visit_with_other && (
                    <div className="flex items-center mt-1">
                      <div
                        className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >!</div>
                      <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Onsite Remarks<span className="text-red-500">*</span></label>
                  <textarea value={formData.onsiteRemarks} onChange={(e) => handleInputChange('onsiteRemarks', e.target.value)} rows={3} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 resize-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                    } ${errors.onsiteRemarks ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`} />
                  {errors.onsiteRemarks && (
                    <div className="flex items-center mt-1">
                      <div
                        className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >!</div>
                      <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Status Remarks<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={formData.statusRemarks} onChange={(e) => handleInputChange('statusRemarks', e.target.value)} className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-orange-500 appearance-none ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                      } ${errors.statusRemarks ? 'border-red-500' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}>
                      <option value=""></option>
                      <option value="Customer Request">Customer Request</option>
                      <option value="Bad Weather">Bad Weather</option>
                      <option value="Technician Unavailable">Technician Unavailable</option>
                      <option value="Equipment Issue">Equipment Issue</option>
                    </select>
                    <ChevronDown className={`absolute right-3 top-2.5 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`} size={20} />
                  </div>
                  {errors.statusRemarks && (
                    <div className="flex items-center mt-1">
                      <div
                        className="flex items-center justify-center w-4 h-4 rounded-full text-white text-xs mr-2"
                        style={{ backgroundColor: colorPalette?.primary || '#ea580c' }}
                      >!</div>
                      <p className="text-xs" style={{ color: colorPalette?.primary || '#ea580c' }}>This entry is required</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default JobOrderDoneFormTechModal;
