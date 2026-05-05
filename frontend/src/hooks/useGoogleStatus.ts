import { useState, useEffect, useRef, useCallback } from 'react';
import { checkGoogleDetailedServicesStatus, checkGoogleServicesStatus } from '../services/auth.service';
import type { GoogleAuthStatus, GoogleServicesStatus } from '../services/auth.service';
import api from '../services/api';

const GENERAL_SETTINGS_EVENT = 'g1-general-settings-updated';
const AUTO_REFRESH_SETTING_KEY = 'g1_auto_refresh_google_data';
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function normalizeAutoRefresh(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        if (value === 'true') return true;
        if (value === 'false') return false;
    }
    return null;
}

function isDetailedGoogleStatus(status: GoogleAuthStatus | GoogleServicesStatus): status is GoogleServicesStatus {
    return (
        'service_status' in status
        && typeof status.service_status === 'object'
        && status.service_status !== null
        && Array.isArray(status.connected_services)
    );
}

/**
 * Hook to check if Google services are connected for the current user.
 * Returns real-time status, not JWT auth status.
 */
export function useGoogleStatus() {
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [googleServiceStatus, setGoogleServiceStatus] = useState<Record<string, boolean>>({});
    const [connectedServices, setConnectedServices] = useState<string[]>([]);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        const stored = normalizeAutoRefresh(localStorage.getItem(AUTO_REFRESH_SETTING_KEY));
        return stored ?? true;
    });
    const inFlightRef = useRef(false);
    const pendingDetailedRefreshRef = useRef(false);

    const checkStatus = useCallback(async (includeServices = false) => {
        const token = localStorage.getItem('g-one_token');
        if (!token) {
            setIsGoogleConnected(false);
            setGoogleServiceStatus({});
            setConnectedServices([]);
            setIsChecking(false);
            return;
        }

        if (document.visibilityState === 'hidden') {
            return;
        }

        if (inFlightRef.current) {
            // If a lightweight check is already running, ensure we run a detailed one right after.
            if (includeServices) {
                pendingDetailedRefreshRef.current = true;
            }
            return;
        }

        inFlightRef.current = true;
        setIsChecking(true);
        try {
            const status = includeServices
                ? await checkGoogleDetailedServicesStatus()
                : await checkGoogleServicesStatus();

            // Keep prior state when backend explicitly reports temporary unavailability.
            if (status.service_unavailable) {
                return;
            }

            setIsGoogleConnected(status.authenticated);
            if (isDetailedGoogleStatus(status)) {
                setGoogleServiceStatus(status.service_status);
                setConnectedServices(status.connected_services);
            } else if (!status.authenticated) {
                setGoogleServiceStatus({});
                setConnectedServices([]);
            }
        } catch {
            // Preserve last known state on transient/network errors.
        } finally {
            setIsChecking(false);
            inFlightRef.current = false;

            if (pendingDetailedRefreshRef.current && !document.hidden) {
                pendingDetailedRefreshRef.current = false;
                window.setTimeout(() => {
                    void checkStatus(true);
                }, 0);
            }
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        api.get('/api/settings')
            .then(({ data }) => {
                const nextValue = normalizeAutoRefresh(data?.preferences?.general?.auto_refresh);
                if (nextValue === null || cancelled) return;
                setAutoRefreshEnabled(nextValue);
                localStorage.setItem(AUTO_REFRESH_SETTING_KEY, String(nextValue));
            })
            .catch(() => {});

        const onGeneralSettingsUpdated = (event: Event) => {
            const detail = (event as CustomEvent<{ auto_refresh?: boolean | string }>).detail;
            const nextValue = normalizeAutoRefresh(detail?.auto_refresh);
            if (nextValue !== null) {
                setAutoRefreshEnabled(nextValue);
            }
        };

        window.addEventListener(GENERAL_SETTINGS_EVENT, onGeneralSettingsUpdated as EventListener);
        return () => {
            cancelled = true;
            window.removeEventListener(GENERAL_SETTINGS_EVENT, onGeneralSettingsUpdated as EventListener);
        };
    }, []);

    useEffect(() => {
        checkStatus(false);
        if (!autoRefreshEnabled) {
            return;
        }

        // Recheck in the background based on user preference.
        const interval = setInterval(() => checkStatus(false), AUTO_REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [checkStatus, autoRefreshEnabled]);

    return {
        isGoogleConnected,
        isChecking,
        googleServiceStatus,
        connectedServices,
        refresh: checkStatus,
    };
}
