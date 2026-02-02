import React, { useState, useEffect } from 'react';
import { InvoiceProvider } from '../contexts/InvoiceContext';
import { OverdueProvider } from '../contexts/OverdueContext';
import DCNotice from './DCNotice';
import Discounts from './Discounts';
import Overdue from './Overdue';
import StaggeredPayment from './StaggeredPayment';
import MassRebate from './Rebate';
import SMSBlast from './SMSBlast';
import SMSBlastLogs from './SMSBlastLogs';
import DisconnectionLogs from './DisconnectionLogs';
import ReconnectionLogs from './ReconnectionLogs';
import Sidebar from './Sidebar';
import Header from './Header';
import DashboardContent from '../components/DashboardContent';
import UserManagement from './UserManagement';
import OrganizationManagement from './OrganizationManagement';
import { BillingProvider } from '../contexts/BillingContext';
import { TransactionProvider } from '../contexts/TransactionContext';
import { PaymentPortalProvider } from '../contexts/PaymentPortalContext';
import { SOAProvider } from '../contexts/SOAContext';
import GroupManagement from './GroupManagement';
import ApplicationManagement from './ApplicationManagement';
import Customer from './Customer';
import BillingListView from './BillingListView';
import TransactionList from './TransactionList';
import PaymentPortal from './PaymentPortal';
import JobOrder from './JobOrder';
import ServiceOrder from './ServiceOrder';
import ApplicationVisit from './ApplicationVisit';
import LocationList from './LocationList';
import PlanList from './PlanList';
import PromoList from './PromoList';
import RouterModelList from './RouterModelList';
import LcpList from './LcpList';
import NapList from './NapList';
import Inventory from './Inventory';
import ExpensesLog from './ExpensesLog';
import Logs from './Logs';
import SOA from './SOA';
import Invoice from './Invoice';
import InventoryCategoryList from './InventoryCategoryList';
import SOAGeneration from './SOAGeneration';
import UsageTypeList from './UsageTypeList';
import Ports from './Ports';
import StatusRemarksList from './StatusRemarksList';
import Settings from './Settings';
import LcpNapLocation from './LcpNapLocation';
import BillingConfig from './BillingConfig';
import RadiusConfig from './RadiusConfig';
import SmsConfig from './SmsConfig';
import EmailTemplates from './EmailTemplates';
import PPPoESetup from './PPPoESetup';
import Support from './Support';
import LiveMonitor from './LiveMonitor';
import ConcernConfig from './ConcernConfig';

interface DashboardProps {
    onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
    const [activeSection, setActiveSection] = useState('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [userData, setUserData] = useState<any>(null);
    const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

    // Track dark mode changes
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

    // Load user data from localStorage
    useEffect(() => {
        const authData = localStorage.getItem('authData');
        if (authData) {
            try {
                const user = JSON.parse(authData);
                setUserData(user);
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
    }, []);

    // Add effect to log the active section when it changes
    useEffect(() => {
        console.log('Active section changed to:', activeSection);
    }, [activeSection]);

    const renderContent = () => {
        switch (activeSection) {

            case 'live-monitor':
                return <LiveMonitor />;
            case 'support':
                return <Support />;
            case 'soa':
                return <SOA />;
            case 'invoice':
                return <Invoice />;
            case 'overdue':
                return <Overdue />;
            case 'dc-notice':
                return <DCNotice />;
            case 'discounts':
                return <Discounts />;
            case 'billing-config':
                return <BillingConfig />;
            case 'radius-config':
                return <RadiusConfig />;
            case 'sms-config':
                return <SmsConfig />;
            case 'email-templates':
                return <EmailTemplates />;
            case 'pppoe-setup':
                return <PPPoESetup />;
            case 'concern-config':
                return <ConcernConfig />;


            case 'staggered-payment':
                return <StaggeredPayment />;
            case 'mass-rebate':
                return <MassRebate />;
            case 'sms-blast':
                return <SMSBlast />;
            case 'sms-blast-logs':
                return <SMSBlastLogs />;
            case 'disconnected-logs':
                return <DisconnectionLogs />;
            case 'reconnection-logs':
                return <ReconnectionLogs />;
            case 'user-management':
                return <UserManagement />;
            case 'organization-management':
                return <OrganizationManagement />;
            case 'group-management':
                return <GroupManagement />;
            case 'application-management':
                return <ApplicationManagement />;
            case 'customer':
                return <Customer />;
            case 'transaction-list':
                return <TransactionList />;
            case 'payment-portal':
                return <PaymentPortal />;
            case 'job-order':
                return <JobOrder />;
            case 'service-order':
                return <ServiceOrder />;
            case 'application-visit':
                return <ApplicationVisit />;
            case 'location-list':
                return <LocationList />;
            case 'plan-list':
                return <PlanList />;
            case 'promo-list':
                return <PromoList />;
            case 'router-models':
                return <RouterModelList />;
            case 'lcp':
                return <LcpList />;
            case 'nap':
                return <NapList />;
            case 'lcp-nap-location':
                return <LcpNapLocation />;
            case 'usage-type':
                return <UsageTypeList />;
            case 'ports':
                return <Ports />;
            case 'status-remarks-list':
                return <StatusRemarksList />;
            case 'inventory':
                return <Inventory />;
            case 'inventory-category-list':
                return <InventoryCategoryList />;
            case 'expenses-log':
                return <ExpensesLog />;
            case 'logs':
                return <Logs />;
            case 'soa-generation':
                return <SOAGeneration />;
            case 'settings':
                return <Settings />;
            case 'dashboard':
            default:
                return <DashboardContent />;
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const toggleSidebar = () => {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            setIsMobileMenuOpen(!isMobileMenuOpen);
        } else {
            setSidebarCollapsed(!sidebarCollapsed);
        }
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    const handleSectionChange = (section: string) => {
        setActiveSection(section);
        if (window.innerWidth < 768) {
            closeMobileMenu();
        }
    };



    return (
        <BillingProvider>
            <TransactionProvider>
                <PaymentPortalProvider>
                    <SOAProvider>
                        <InvoiceProvider>
                            <OverdueProvider>
                                <div className={`h-screen flex flex-col overflow-hidden ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
                                    }`}>
                                    {/* Fixed Header */}
                                    <div className="flex-shrink-0">
                                        <Header onSearch={handleSearch} onToggleSidebar={toggleSidebar} />
                                    </div>

                                    {/* Main Content Area with Fixed Sidebar and Scrollable Content */}
                                    <div className="flex-1 flex overflow-hidden">
                                        {/* Mobile Overlay */}
                                        {isMobileMenuOpen && (
                                            <div
                                                className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                                                onClick={closeMobileMenu}
                                            />
                                        )}

                                        {/* Fixed Sidebar */}
                                        <div className={`flex-shrink-0 fixed md:relative z-50 transition-all duration-300 top-0 md:top-auto left-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                                            } md:translate-x-0 h-screen md:h-auto`}>
                                            <div className="h-full md:h-full">
                                                <Sidebar
                                                    activeSection={activeSection}
                                                    onSectionChange={handleSectionChange}
                                                    onLogout={onLogout}
                                                    isCollapsed={sidebarCollapsed}
                                                    userRole={userData?.role || ''}
                                                    userEmail={userData?.email || ''}
                                                />
                                            </div>
                                        </div>

                                        {/* Scrollable Content Area Only */}
                                        <div className={`flex-1 overflow-hidden ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
                                            }`}>
                                            <div className="h-full overflow-y-auto">
                                                {renderContent()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </OverdueProvider>
                        </InvoiceProvider>
                    </SOAProvider>
                </PaymentPortalProvider>
            </TransactionProvider>
        </BillingProvider>
    );
};

export default Dashboard;