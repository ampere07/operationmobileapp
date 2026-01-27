import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  useEffect(() => {
    const checkDarkMode = async () => {
      const theme = await AsyncStorage.getItem('theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkDarkMode();
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        try {
          const user = JSON.parse(authData);
          setUserData(user);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    };

    loadUserData();
  }, []);

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
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    closeMobileMenu();
  };

  return (
    <View style={[styles.container, isDarkMode ? styles.bgDark : styles.bgLight]}>
      <View style={styles.flexShrink}>
        <Header onSearch={handleSearch} onToggleSidebar={toggleSidebar} />
      </View>
      
      <View style={styles.mainContent}>
        {isMobileMenuOpen && (
          <Pressable 
            style={styles.overlay}
            onPress={closeMobileMenu}
          />
        )}
        
        <View style={[styles.sidebarContainer, isMobileMenuOpen ? styles.sidebarVisible : styles.sidebarHidden]}>
          <View style={styles.fullHeight}>
            <Sidebar 
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
              onLogout={onLogout}
              isCollapsed={sidebarCollapsed}
              userRole={userData?.role || ''}
              userEmail={userData?.email || ''}
            />
          </View>
        </View>
        
        <View style={[styles.contentArea, isDarkMode ? styles.bgDark : styles.bgLight]}>
          <ScrollView style={styles.fullHeight}>
            {renderContent()}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  bgDark: {
    backgroundColor: '#030712',
  },
  bgLight: {
    backgroundColor: '#f9fafb',
  },
  flexShrink: {
    flexShrink: 0,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 40,
  },
  sidebarContainer: {
    flexShrink: 0,
    position: 'absolute',
    zIndex: 50,
    top: 0,
    left: 0,
    height: '100%',
  },
  sidebarVisible: {
    transform: [{ translateX: 0 }],
  },
  sidebarHidden: {
    transform: [{ translateX: -300 }],
  },
  fullHeight: {
    height: '100%',
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default Dashboard;
