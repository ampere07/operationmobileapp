import React, { useState, useEffect } from 'react';
import { Download, FileText, CreditCard, Clock, Activity, CheckCircle, AlertCircle, File } from 'lucide-react';
import { soaService } from '../services/soaService';
import { invoiceService } from '../services/invoiceService';
import { paymentPortalLogsService } from '../services/paymentPortalLogsService';
import { transactionService } from '../services/transactionService';
import { getCustomerDetail } from '../services/customerDetailService';
import { paymentService, PendingPayment } from '../services/paymentService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';

// Interfaces
interface SOARecord {
    id: number;
    statement_date?: string;
    statement_no?: string; // Derived or mapped
    print_link?: string;
    total_amount_due?: number;
}

interface InvoiceRecord {
    id: number;
    invoice_date?: string;
    invoice_balance?: number;
    print_link?: string; // Might not exist yet
}

interface PaymentRecord {
    id: string;
    date: string;
    reference: string;
    amount: number;
    source: 'Online' | 'Manual';
    status?: string;
}

interface BillsProps {
    initialTab?: 'soa' | 'invoices' | 'payments';
}

const Bills: React.FC<BillsProps> = ({ initialTab = 'soa' }) => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'soa' | 'invoices' | 'payments'>(initialTab);
    const [soaRecords, setSoaRecords] = useState<SOARecord[]>([]);
    const [invoiceRecords, setInvoiceRecords] = useState<InvoiceRecord[]>([]);
    const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
    const [balance, setBalance] = useState(0);
    const [accountNo, setAccountNo] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

    // Payment State (Mirrored from Dashboard)
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [showPaymentVerifyModal, setShowPaymentVerifyModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
    const [paymentLinkData, setPaymentLinkData] = useState<{ referenceNo: string; amount: number; paymentUrl: string } | null>(null);
    const [showPendingPaymentModal, setShowPendingPaymentModal] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const storedUser = localStorage.getItem('authData');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    setDisplayName(parsedUser.full_name || 'Customer');

                    // 1. Get Detailed Customer Info (to get IDs and Real Balance)
                    if (parsedUser.username) { // Username is AccountNo
                        const detail = await getCustomerDetail(parsedUser.username);

                        if (detail && detail.billingAccount) {
                            setAccountNo(detail.billingAccount.accountNo);
                            setBalance(detail.billingAccount.accountBalance);

                            const billingId = detail.billingAccount.id;
                            const accNo = detail.billingAccount.accountNo;

                            // 2. Fetch Data in Parallel
                            const [soaRes, invoiceRes, logsRes, txRes] = await Promise.all([
                                soaService.getStatementsByAccount(billingId).catch(e => []),
                                invoiceService.getInvoicesByAccount(billingId).catch(e => []),
                                paymentPortalLogsService.getLogsByAccountNo(accNo).catch(e => []),
                                transactionService.getAllTransactions().catch(e => ({ success: false, data: [] }))
                            ]);

                            // Process SOA
                            setSoaRecords(soaRes || []);

                            // Process Invoices
                            setInvoiceRecords(invoiceRes || []);

                            // Process Payments (Merge & Sort)
                            const formattedLogs: PaymentRecord[] = Array.isArray(logsRes) ? logsRes.map((l: any) => ({
                                id: `log-${l.id}`,
                                date: l.date_time,
                                reference: l.reference_no,
                                amount: parseFloat(l.total_amount),
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
                                        status: 'Computed'
                                    }));
                            }

                            const allPayments = [...formattedLogs, ...formattedTxs].sort((a, b) =>
                                new Date(b.date).getTime() - new Date(a.date).getTime()
                            );
                            setPaymentRecords(allPayments);
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching bills data:", err);
            } finally {
                setLoading(false);
            }
        };

        const fetchColorPalette = async () => {
            try {
                const activePalette = await settingsColorPaletteService.getActive();
                setColorPalette(activePalette);
            } catch (err) {
                console.error('Failed to fetch color palette:', err);
            }
        };

        fetchData();
        fetchColorPalette();
    }, []);

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    // --- Payment Handlers (Identical to DashboardCustomer) ---
    const handlePayNow = async () => {
        setErrorMessage('');
        setIsPaymentProcessing(true);
        try {
            const pending = await paymentService.checkPendingPayment(accountNo);
            if (pending && pending.payment_url) {
                setPendingPayment(pending);
                setShowPendingPaymentModal(true);
            } else {
                setPaymentAmount(balance > 0 ? balance : 100);
                setShowPaymentVerifyModal(true);
            }
        } catch (error: any) {
            console.error('Error checking pending payment:', error);
            setPaymentAmount(balance > 0 ? balance : 100);
            setShowPaymentVerifyModal(true);
        } finally {
            setIsPaymentProcessing(false);
        }
    };

    const handleCloseVerifyModal = () => {
        setShowPaymentVerifyModal(false);
        setPaymentAmount(balance);
    };

    const handleProceedToCheckout = async () => {
        if (paymentAmount < 1) {
            setErrorMessage('Payment amount must be at least ₱1.00');
            return;
        }
        if (isPaymentProcessing) return;
        setIsPaymentProcessing(true);
        setErrorMessage('');
        try {
            const response = await paymentService.createPayment(accountNo, paymentAmount);
            if (response.status === 'success' && response.payment_url) {
                setShowPaymentVerifyModal(false);
                setPaymentLinkData({
                    referenceNo: response.reference_no || '',
                    amount: response.amount || paymentAmount,
                    paymentUrl: response.payment_url
                });
                setShowPaymentLinkModal(true);
            } else {
                throw new Error(response.message || 'Failed to create payment link');
            }
        } catch (error: any) {
            setErrorMessage(error.message || 'Failed to create payment.');
        } finally {
            setIsPaymentProcessing(false);
        }
    };

    const handleOpenPaymentLink = () => {
        if (paymentLinkData?.paymentUrl) {
            window.open(paymentLinkData.paymentUrl, '_blank');
            setShowPaymentLinkModal(false);
            setPaymentLinkData(null);
        }
    };
    const handleCancelPaymentLink = () => { setShowPaymentLinkModal(false); setPaymentLinkData(null); };
    const handleResumePendingPayment = () => {
        if (pendingPayment?.payment_url) {
            window.open(pendingPayment.payment_url, '_blank');
            setShowPendingPaymentModal(false);
            setPendingPayment(null);
        }
    };
    const handleCancelPendingPayment = () => { setShowPendingPaymentModal(false); setPendingPayment(null); };

    const handleDownloadPDF = (url?: string) => {
        if (url) window.open(url, '_blank');
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatCurrency = (amount?: number) => {
        return `₱ ${(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    };

    if (loading) return <div className="p-8 flex justify-center bg-gray-50 min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;

    return (
        <div className="p-6 md:p-12 min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Billing History</h1>
                    <p className="text-gray-500 mt-1">View your statements and payment records.</p>
                </div>
                <button
                    onClick={handlePayNow}
                    disabled={isPaymentProcessing}
                    className="flex items-center space-x-2 text-white px-6 py-3 rounded-full font-bold transition disabled:opacity-50"
                    style={{ backgroundColor: colorPalette?.primary || '#0f172a' }}
                >
                    <CreditCard className="w-5 h-5" />
                    <span>PAY NOW</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-t-2xl border-b border-gray-200 px-6 pt-2">
                <div className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab('soa')}
                        className={`pb-4 px-2 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${activeTab === 'soa' ? 'text-slate-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        style={{ borderBottomColor: activeTab === 'soa' ? (colorPalette?.primary || '#0f172a') : 'transparent' }}
                    >
                        <FileText className="w-4 h-4" />
                        <span>Statement of Account</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('invoices')}
                        className={`pb-4 px-2 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${activeTab === 'invoices' ? 'text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        style={{ borderBottomColor: activeTab === 'invoices' ? (colorPalette?.primary || '#2563eb') : 'transparent' }}
                    >
                        <File className="w-4 h-4" />
                        <span>Invoices</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`pb-4 px-2 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${activeTab === 'payments' ? 'text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        style={{ borderBottomColor: activeTab === 'payments' ? (colorPalette?.primary || '#2563eb') : 'transparent' }}
                    >
                        <Clock className="w-4 h-4" />
                        <span>Payment History</span>
                    </button>
                </div>
            </div>

            {/* Content Content */}
            <div className="bg-white rounded-b-2xl shadow-sm border border-gray-100 border-t-0 overflow-hidden min-h-[400px]">
                {activeTab === 'soa' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase">Statement Date</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase">Statement No</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase">Amount Due</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {soaRecords.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">No statements found.</td></tr>
                                ) : (
                                    soaRecords.map((record) => (
                                        <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                            <td className="p-6 text-sm text-gray-600">{formatDate(record.statement_date)}</td>
                                            <td className="p-6 text-sm font-bold text-gray-900">{record.id}</td>
                                            <td className="p-6 text-sm font-bold text-gray-900">{formatCurrency(record.total_amount_due)}</td>
                                            <td className="p-6 text-right">
                                                <button
                                                    onClick={() => handleDownloadPDF(record.print_link)}
                                                    disabled={!record.print_link}
                                                    className="inline-flex items-center space-x-2 px-4 py-2 border border-red-500 text-red-500 rounded-full text-xs font-bold hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    <span>Download PDF</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'invoices' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase">Invoice Date</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase">Invoice Ref</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase">Amount</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoiceRecords.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">No invoices found.</td></tr>
                                ) : (
                                    invoiceRecords.map((record) => (
                                        <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                            <td className="p-6 text-sm text-gray-600">{formatDate(record.invoice_date)}</td>
                                            <td className="p-6 text-sm font-bold text-gray-900">{record.id}</td>
                                            <td className="p-6 text-sm font-bold text-gray-900">{formatCurrency(record.invoice_balance)}</td>
                                            <td className="p-6 text-right">
                                                <button
                                                    onClick={() => handleDownloadPDF(record.print_link)}
                                                    disabled={!record.print_link}
                                                    className="inline-flex items-center space-x-2 px-4 py-2 border border-red-500 text-red-500 rounded-full text-xs font-bold hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    <span>Download PDF</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase">Date</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase">Reference</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase">Source</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="p-6 text-xs font-bold text-gray-500 uppercase text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentRecords.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">No payment history found.</td></tr>
                                ) : (
                                    paymentRecords.map((record) => (
                                        <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                            <td className="p-6 text-sm text-gray-600">{formatDate(record.date)}</td>
                                            <td className="p-6 text-sm font-mono text-gray-500">{record.reference}</td>
                                            <td className="p-6 text-sm text-gray-600">{record.source}</td>
                                            <td className="p-6 text-sm">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${record.status === 'Completed' || record.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {record.status || 'Posted'}
                                                </span>
                                            </td>
                                            <td className="p-6 text-sm font-bold text-green-600 text-right">+{formatCurrency(record.amount)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* PAYMENT VERIFY MODAL */}
            {showPaymentVerifyModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900 text-center">Confirm Payment</h3>
                        </div>
                        <div className="p-6">
                            <div className="bg-gray-100 p-4 rounded mb-4">
                                <div className="flex justify-between mb-2 text-gray-700">
                                    <span>Account:</span>
                                    <span className="font-bold">{displayName}</span>
                                </div>
                                <div className="flex justify-between text-gray-700">
                                    <span>Currency Balance:</span>
                                    <span className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {formatCurrency(balance)}
                                    </span>
                                </div>
                            </div>

                            {errorMessage && (
                                <div className="bg-red-50 p-3 rounded mb-4 border border-red-200">
                                    <p className="text-red-500 text-sm text-center">{errorMessage}</p>
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block font-bold mb-2 text-gray-700">Payment Amount</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={paymentAmount || ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                            setPaymentAmount(value === '' ? 0 : parseFloat(value) || 0);
                                        }
                                    }}
                                    placeholder="0.00"
                                    className="w-full px-4 py-3 rounded text-lg font-bold border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                                <div className="text-sm text-right mt-1 text-gray-500">
                                    {balance > 0 ? (
                                        <span>Outstanding: {formatCurrency(balance)}</span>
                                    ) : (
                                        <span>Minimum: ₱1.00</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleCloseVerifyModal}
                                    disabled={isPaymentProcessing}
                                    className="flex-1 px-4 py-3 rounded font-bold bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleProceedToCheckout}
                                    disabled={isPaymentProcessing || paymentAmount < 1}
                                    className="flex-1 px-4 py-3 rounded font-bold text-white transition-colors disabled:opacity-50"
                                    style={{ backgroundColor: colorPalette?.primary || '#0f172a' }}
                                >
                                    {isPaymentProcessing ? 'Processing...' : 'Proceed to Pay'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PAYMENT LINK MODAL */}
            {showPaymentLinkModal && paymentLinkData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full text-center">
                        <div className="p-6 border-b border-gray-200">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Payment Link Created!</h3>
                            <p className="text-gray-500 mt-2">Reference: {paymentLinkData.referenceNo}</p>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 mb-6">
                                Please click the button below to complete your payment of
                                <span className="font-bold text-gray-900"> {formatCurrency(paymentLinkData.amount)}</span>
                            </p>
                            <button
                                onClick={handleOpenPaymentLink}
                                className="w-full px-4 py-3 rounded font-bold bg-green-600 text-white hover:bg-green-700 transition-colors mb-3"
                            >
                                Open Payment Portal
                            </button>
                            <button
                                onClick={handleCancelPaymentLink}
                                className="text-gray-500 underline text-sm hover:text-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PENDING PAYMENT MODAL */}
            {showPendingPaymentModal && pendingPayment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full text-center">
                        <div className="p-6 border-b border-gray-200">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                                <Activity className="h-6 w-6 text-yellow-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Pending Payment Found</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 mb-6">
                                You have a pending payment of
                                <span className="font-bold text-gray-900"> {formatCurrency(pendingPayment.amount)}</span>.
                                Would you like to complete it?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCancelPendingPayment}
                                    className="flex-1 px-4 py-3 rounded font-bold bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleResumePendingPayment}
                                    className="flex-1 px-4 py-3 rounded font-bold text-white transition-colors"
                                    style={{ backgroundColor: colorPalette?.primary || '#0f172a' }}
                                >
                                    Resume Payment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Bills;
