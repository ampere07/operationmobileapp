import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { transactionService } from '../services/transactionService';
import { Transaction } from '../types/transaction';

interface TransactionContextType {
    transactions: Transaction[];
    isLoading: boolean;
    error: string | null;
    refreshTransactions: () => Promise<void>;
    silentRefresh: () => Promise<void>;
    lastUpdated: Date | null;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchTransactions = useCallback(async (force = false, silent = false) => {
        if (!force && transactions.length > 0) {
            return;
        }

        if (!silent) {
            setIsLoading(true);
        }

        try {
            const result = await transactionService.getAllTransactions();
            if (result.success && result.data) {
                setTransactions(result.data);
                setLastUpdated(new Date());
                setError(null);
            } else {
                if (!silent) {
                    setError(result.message || 'Failed to fetch transactions');
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch transactions:', err);
            if (!silent) {
                setError('Failed to load transactions. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [transactions.length]);

    const refreshTransactions = useCallback(async () => {
        await fetchTransactions(true, false);
    }, [fetchTransactions]);

    const silentRefresh = useCallback(async () => {
        await fetchTransactions(true, true);
    }, [fetchTransactions]);

    // Initial fetch effect
    useEffect(() => {
        if (transactions.length === 0) {
            fetchTransactions(false, false);
        }
    }, [fetchTransactions, transactions.length]);

    return (
        <TransactionContext.Provider value={{
            transactions,
            isLoading,
            error,
            refreshTransactions,
            silentRefresh,
            lastUpdated
        }}>
            {children}
        </TransactionContext.Provider>
    );
};

export const useTransactionContext = () => {
    const context = useContext(TransactionContext);
    if (context === undefined) {
        throw new Error('useTransactionContext must be used within a TransactionProvider');
    }
    return context;
};
