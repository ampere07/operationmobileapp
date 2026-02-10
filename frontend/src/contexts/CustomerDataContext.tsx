import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCustomerDetail, CustomerDetailData } from '../services/customerDetailService';
import { transactionService } from '../services/transactionService';
import { paymentPortalLogsService } from '../services/paymentPortalLogsService';
import { soaService } from '../services/soaService';
import { invoiceService } from '../services/invoiceService';

interface PaymentRecord {
    id: string;
    date: string;
    reference: string;
    amount: number;
    source: 'Online' | 'Manual';
    status?: string;
}

interface SOARecord {
    id: number;
    statement_date?: string;
    statement_no?: string;
    print_link?: string;
    total_amount_due?: number;
}

interface InvoiceRecord {
    id: number;
    invoice_date?: string;
    invoice_balance?: number;
    print_link?: string;
}

interface CustomerDataContextType {
    customerDetail: CustomerDetailData | null;
    payments: PaymentRecord[];
    soaRecords: SOARecord[];
    invoiceRecords: InvoiceRecord[];
    isLoading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
    silentRefresh: () => Promise<void>;
    lastUpdated: Date | null;
}

const CustomerDataContext = createContext<CustomerDataContextType | undefined>(undefined);

export const useCustomerDataContext = () => {
    const context = useContext(CustomerDataContext);
    if (!context) {
        throw new Error('useCustomerDataContext must be used within a CustomerDataProvider');
    }
    return context;
};

export const CustomerDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [customerDetail, setCustomerDetail] = useState<CustomerDetailData | null>(null);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [soaRecords, setSoaRecords] = useState<SOARecord[]>([]);
    const [invoiceRecords, setInvoiceRecords] = useState<InvoiceRecord[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchData = useCallback(async (force = false, silent = false) => {
        if (!force && customerDetail) return;

        if (!silent) setIsLoading(true);

        try {
            const storedUser = await AsyncStorage.getItem('authData');
            if (!storedUser) return;

            const parsedUser = JSON.parse(storedUser);
            if (!parsedUser.username) return;

            // 1. Fetch Customer Detail
            const detail = await getCustomerDetail(parsedUser.username);
            if (!detail) throw new Error('Could not fetch customer details');

            setCustomerDetail(detail);
            const accNo = detail.billingAccount?.accountNo;
            const billingId = detail.billingAccount?.id;

            if (accNo) {
                // 2. Fetch everything else in parallel
                const [logsRes, txRes, soaRes, invoiceRes] = await Promise.all([
                    paymentPortalLogsService.getLogsByAccountNo(accNo).catch(() => []),
                    transactionService.getAllTransactions().catch(() => ({ success: false, data: [] })),
                    soaService.getStatementsByAccount(accNo).catch(() => []),
                    invoiceService.getInvoicesByAccount(accNo).catch(() => [])
                ]);

                // Process Payments
                const formattedLogs: PaymentRecord[] = Array.isArray(logsRes) ? logsRes.map((l: any) => ({
                    id: `log-${l.id}`,
                    date: l.date_time,
                    reference: l.reference_no,
                    amount: parseFloat(l.total_amount) || 0,
                    source: 'Online',
                    status: l.status
                })) : [];

                let formattedTxs: PaymentRecord[] = [];
                if (txRes && txRes.success && Array.isArray(txRes.data)) {
                    formattedTxs = txRes.data
                        .filter((t: any) => t.account_no === accNo)
                        .map((t: any) => ({
                            id: `tx-${t.id}`,
                            date: t.payment_date || t.created_at,
                            reference: t.or_no || t.reference_no || `TR-${t.id}`,
                            amount: parseFloat(t.received_payment || t.amount || 0),
                            source: 'Manual',
                            status: 'Posted'
                        }));
                }

                const allPayments = [...formattedLogs, ...formattedTxs].sort((a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                setPayments(allPayments);
                setSoaRecords(soaRes || []);
                setInvoiceRecords(invoiceRes || []);
            }

            setLastUpdated(new Date());
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch customer data:', err);
            if (!silent) setError(err.message || 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    }, [customerDetail]);

    useEffect(() => {
        fetchData();
    }, []);

    const refreshData = useCallback(() => fetchData(true, false), [fetchData]);
    const silentRefresh = useCallback(() => fetchData(true, true), [fetchData]);

    return (
        <CustomerDataContext.Provider
            value={{
                customerDetail,
                payments,
                soaRecords,
                invoiceRecords,
                isLoading,
                error,
                refreshData,
                silentRefresh,
                lastUpdated
            }}
        >
            {children}
        </CustomerDataContext.Provider>
    );
};
