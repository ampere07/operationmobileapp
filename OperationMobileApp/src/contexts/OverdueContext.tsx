import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { overdueService, Overdue } from '../services/overdueService';

interface OverdueContextType {
    overdueRecords: Overdue[];
    isLoading: boolean;
    error: string | null;
    refreshOverdueRecords: () => Promise<void>;
    silentRefresh: () => Promise<void>;
    lastUpdated: Date | null;
}

const OverdueContext = createContext<OverdueContextType | undefined>(undefined);

export const useOverdueContext = () => {
    const context = useContext(OverdueContext);
    if (!context) {
        throw new Error('useOverdueContext must be used within an OverdueProvider');
    }
    return context;
};

interface OverdueProviderProps {
    children: ReactNode;
}

export const OverdueProvider: React.FC<OverdueProviderProps> = ({ children }) => {
    const [overdueRecords, setOverdueRecords] = useState<Overdue[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchOverdueRecords = useCallback(async (isSilent: boolean = false) => {
        if (!isSilent) setIsLoading(true);
        setError(null);

        try {
            // PHASE 1: Fast load - Get basic data INSTANTLY (50 records, no customer details)
            const fastResponse = await overdueService.getAll(true, 1, 50);

            if (fastResponse.success) {
                setOverdueRecords(fastResponse.data || []);
                setIsLoading(false);
                setLastUpdated(new Date());

                // PHASE 2: Load full data in background
                setTimeout(async () => {
                    try {
                        const fullResponse = await overdueService.getAll(false, 1, 50);

                        if (fullResponse.success) {
                            setOverdueRecords(fullResponse.data || []);
                            setLastUpdated(new Date());
                        }
                    } catch (bgError) {
                        console.warn('Background full data load failed:', bgError);
                        // Keep showing fast data even if full load fails
                    }
                }, 100);
            } else {
                if (!isSilent) setError('Failed to load Overdue records');
                console.warn('Fast load failed to load overdue records:', fastResponse.message);
            }
        } catch (err: any) {
            console.error('Error fetching overdue records:', err);
            if (!isSilent) {
                setError(err.message || 'Failed to fetch overdue records');
            }
            setOverdueRecords([]);
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    }, []);

    const refreshOverdueRecords = useCallback(async () => {
        await fetchOverdueRecords(false);
    }, [fetchOverdueRecords]);

    const silentRefresh = useCallback(async () => {
        await fetchOverdueRecords(true);
    }, [fetchOverdueRecords]);

    return (
        <OverdueContext.Provider
            value={{
                overdueRecords,
                isLoading,
                error,
                refreshOverdueRecords,
                silentRefresh,
                lastUpdated
            }}
        >
            {children}
        </OverdueContext.Provider>
    );
};
