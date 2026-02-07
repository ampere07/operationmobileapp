import React, { useState, useEffect } from 'react';
import { View, Dimensions, useWindowDimensions, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { InvoiceProvider } from '../contexts/InvoiceContext';
// import { OverdueProvider } from '../contexts/OverdueContext';
// import { DCNoticeProvider } from '../contexts/DCNoticeContext';
// import { StaggeredPaymentProvider } from '../contexts/StaggeredPaymentContext';
// import { DiscountProvider } from '../contexts/DiscountContext';
import { ApplicationProvider } from '../contexts/ApplicationContext';
// import { ApplicationVisitProvider } from '../contexts/ApplicationVisitContext';
import { JobOrderProvider } from '../contexts/JobOrderContext';
import { ServiceOrderProvider } from '../contexts/ServiceOrderContext';
// import DCNotice from './DCNotice';
// import Discounts from './Discounts';
// import Overdue from './Overdue';
// import StaggeredPayment from './StaggeredPayment';
// import MassRebate from './Rebate';
// import SMSBlast from './SMSBlast';
// import SMSBlastLogs from './SMSBlastLogs';
// import DisconnectionLogs from './DisconnectionLogs';
// import ReconnectionLogs from './ReconnectionLogs';
import Sidebar from './Sidebar';
import Header from './Header';
import DashboardContent from '../components/DashboardContent';
// import UserManagement from './UserManagement';
// import OrganizationManagement from './OrganizationManagement';
// import { BillingProvider } from '../contexts/BillingContext';
// import { TransactionProvider } from '../contexts/TransactionContext';
// import { PaymentPortalProvider } from '../contexts/PaymentPortalContext';
// import { SOAProvider } from '../contexts/SOAContext';
// import GroupManagement from './GroupManagement';
import ApplicationManagement from './ApplicationManagement';
// import Customer from './Customer';
// import BillingListView from './BillingListView';
// import TransactionList from './TransactionList';
// import PaymentPortal from './PaymentPortal';
import JobOrder from './JobOrder';
import ServiceOrder from './ServiceOrder';
// import ApplicationVisit from './ApplicationVisit';
// import LocationList from './LocationList';
// import PlanList from './PlanList';
// import PromoList from './PromoList';
// import RouterModelList from './RouterModelList';
// import LcpList from './LcpList';
// import NapList from './NapList';
// import Inventory from './Inventory';
// import ExpensesLog from './ExpensesLog';
// import Logs from './Logs';
// import SOA from './SOA';
// import Invoice from './Invoice';
// import InventoryCategoryList from './InventoryCategoryList';
// import SOAGeneration from './SOAGeneration';
// import UsageTypeList from './UsageTypeList';
// import Ports from './Ports';
// import StatusRemarksList from './StatusRemarksList';
// import Settings from './Settings';
import LcpNapLocation from './LcpNapLocation';
// import BillingConfig from './BillingConfig';
// import RadiusConfig from './RadiusConfig';
// import SmsConfig from './SmsConfig';
// import SMSTemplate from './SMSTemplate';
// import EmailTemplates from './EmailTemplates';
// import PPPoESetup from './PPPoESetup';
import Support from './Support';
// import LiveMonitor from './LiveMonitor';
// import ConcernConfig from './ConcernConfig';
import DashboardCustomer from './DashboardCustomer';
import Bills from './Bills';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

interface DashboardProps {
    onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
    const [userData, setUserData] = useState<any>(null);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { width } = useWindowDimensions();
    const [searchQuery, setSearchQuery] = useState('');
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
    const [billsInitialTab, setBillsInitialTab] = useState<'soa' | 'invoices' | 'payments'>('soa');
    // const [customerInitialSearch, setCustomerInitialSearch] = useState('');
    // const [customerAutoOpenAccountNo, setCustomerAutoOpenAccountNo] = useState('');
    const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

    useEffect(() => {
        const initializeUserData = async () => {
            try {
                const authData = await AsyncStorage.getItem('authData');
                if (authData) {
                    const user = JSON.parse(authData);
                    setUserData(user);

                    // Use the initialized user data if available
                    if (user.role === 'customer') {
                        setActiveSection('customer-dashboard');
                    }

                    if (user.role === 'customer' || String(user.role_id) === '3') {
                        setIsDarkMode(false);
                    } else {
                        const theme = await AsyncStorage.getItem('theme');
                        setIsDarkMode(theme === 'dark' || theme === null);
                    }
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeUserData();
    }, []);

    // Track dark mode changes
    useEffect(() => {
        const checkDarkMode = async () => {
            const theme = await AsyncStorage.getItem('theme');
            setIsDarkMode(theme === 'dark' || theme === null);
        };

        checkDarkMode();
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

    // Add effect to log the active section when it changes
    useEffect(() => {
        console.log('Active section changed to:', activeSection);
    }, [activeSection]);

    const renderContent = () => {
        switch (activeSection) {
            // Customer Routes
            case 'customer-dashboard':
                return <DashboardCustomer onNavigate={(section, tab) => handleSectionChange(section, tab)} />;
            case 'customer-bills':
                return <Bills initialTab={billsInitialTab} />;
            case 'customer-support':
                return <Support forceLightMode={true} />;

            // case 'live-monitor':
            //     return <LiveMonitor />;
            case 'support':
                return <Support />;
            // case 'soa':
            //     return <SOA />;
            // case 'invoice':
            //     return <Invoice />;
            // case 'overdue':
            //     return <Overdue />;
            // case 'dc-notice':
            //     return <DCNotice />;
            // case 'discounts':
            //     return <Discounts />;
            // case 'billing-config':
            //     return <BillingConfig />;
            // case 'radius-config':
            //     return <RadiusConfig />;
            // case 'sms-config':
            //     return <SmsConfig />;
            // case 'sms-template':
            //     return <SMSTemplate />;
            // case 'email-templates':
            //     return <EmailTemplates />;
            // case 'pppoe-setup':
            //     return <PPPoESetup />;
            // case 'concern-config':
            //     return <ConcernConfig />;


            // case 'staggered-payment':
            //     return <StaggeredPayment />;
            // case 'mass-rebate':
            //     return <MassRebate />;
            // case 'sms-blast':
            //     return <SMSBlast />;
            // case 'sms-blast-logs':
            //     return <SMSBlastLogs />;
            // case 'disconnected-logs':
            //     return <DisconnectionLogs />;
            // case 'reconnection-logs':
            //     return <ReconnectionLogs />;
            // case 'user-management':
            //     return <UserManagement />;
            // case 'organization-management':
            //     return <OrganizationManagement />;
            // case 'group-management':
            //     return <GroupManagement />;
            case 'application-management':
                return <ApplicationManagement />;
            // case 'customer':
            //     return <Customer initialSearchQuery={customerInitialSearch} autoOpenAccountNo={customerAutoOpenAccountNo} />;
            // case 'transaction-list':
            //     return (
            //         <TransactionList onNavigate={(section, search) => handleSectionChange(section, search)} />
            //     );
            // case 'payment-portal':
            //     return <PaymentPortal />;
            case 'job-order':
                return <JobOrder />;
            case 'service-order':
                return <ServiceOrder />;
            // case 'application-visit':
            //     return <ApplicationVisit />;
            // case 'location-list':
            //     return <LocationList />;
            // case 'plan-list':
            //     return <PlanList />;
            // case 'promo-list':
            //     return <PromoList />;
            // case 'router-models':
            //     return <RouterModelList />;
            // case 'lcp':
            //     return <LcpList />;
            // case 'nap':
            //     return <NapList />;
            case 'lcp-nap-location':
                return <LcpNapLocation />;
            // case 'usage-type':
            //     return <UsageTypeList />;
            // case 'ports':
            //     return <Ports />;
            // case 'status-remarks-list':
            //     return <StatusRemarksList />;
            // case 'inventory':
            //     return <Inventory />;
            // case 'inventory-category-list':
            //     return <InventoryCategoryList />;
            // case 'expenses-log':
            //     return <ExpensesLog />;
            // case 'logs':
            //     return <Logs />;
            // case 'soa-generation':
            //     return <SOAGeneration />;
            // case 'settings':
            //     return <Settings />;
            case 'dashboard':
            default:
                if (userData && String(userData.role_id) === '3') {
                    return <DashboardCustomer onNavigate={(section, tab) => handleSectionChange(section, tab)} />;
                }
                return <DashboardContent />;
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const toggleSidebar = () => {
        const isMobile = width < 768;
        if (isMobile) {
            setIsMobileMenuOpen(!isMobileMenuOpen);
        } else {
            setSidebarCollapsed(!sidebarCollapsed);
        }
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    const handleSectionChange = (section: string, extra?: string) => {
        setActiveSection(section);
        if (section === 'customer-bills') {
            setBillsInitialTab((extra as any) || 'soa');
        } else if (section === 'customer') {
            // setCustomerInitialSearch(extra || '');
            // setCustomerAutoOpenAccountNo(extra || '');
        }

        if (width < 768) {
            closeMobileMenu();
        }
    };

    // Helper to determine if we should show sidebar
    const showSidebar = userData && String(userData.role_id) !== '3';

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#030712' : '#f9fafb' }}>
                <ActivityIndicator size="large" color="#ea580c" />
            </View>
        );
    }

    return (
        // <BillingProvider>
        //     <TransactionProvider>
        //         <PaymentPortalProvider>
        //             <SOAProvider>
        //                 <InvoiceProvider>
        //                     <OverdueProvider>
        //                         <DCNoticeProvider>
        //                             <StaggeredPaymentProvider>
        //                                 <DiscountProvider>
        <ApplicationProvider>
            {/* <ApplicationVisitProvider> */}
            <JobOrderProvider>
                <ServiceOrderProvider>
                    <View style={{
                        height: '100%',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
                    }}>
                        {/* Fixed Header */}
                        <View style={{ flexShrink: 0 }}>
                            <Header
                                onSearch={handleSearch}
                                onToggleSidebar={() => { }} // No longer needed
                                onNavigate={handleSectionChange}
                                onLogout={onLogout}
                                activeSection={activeSection}
                            />
                        </View>

                        {/* Main Content Area */}
                        <View style={{
                            flex: 1,
                            overflow: 'hidden',
                            backgroundColor: isDarkMode ? '#030712' : '#f9fafb'
                        }}>
                            <View style={{ height: '100%', overflow: 'scroll' }}>
                                {renderContent()}
                            </View>
                        </View>

                        {/* Bottom Navigation Bar */}
                        {showSidebar && (
                            <View style={{ flexShrink: 0 }}>
                                <Sidebar
                                    activeSection={activeSection}
                                    onSectionChange={handleSectionChange}
                                    onLogout={onLogout}
                                    userRole={userData?.role || ''}
                                    userEmail={userData?.email || ''}
                                />
                            </View>
                        )}
                    </View>
                </ServiceOrderProvider>
            </JobOrderProvider>
            {/* </ApplicationVisitProvider> */}
        </ApplicationProvider>
        //                                 </DiscountProvider>
        //                             </StaggeredPaymentProvider>
        //                         </DCNoticeProvider>
        //                     </OverdueProvider>
        //                 </InvoiceProvider>
        //             </SOAProvider>
        //         </PaymentPortalProvider>
        //     </TransactionProvider>
        // </BillingProvider>
    );
};

export default Dashboard;
