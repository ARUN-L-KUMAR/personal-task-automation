import { useState, useEffect, useRef, useCallback } from 'react';
import { checkGoogleDetailedServicesStatus, checkGoogleServicesStatus } from '../services/auth.service';
import type { GoogleAuthStatus, GoogleServicesStatus } from '../services/auth.service';

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
    const inFlightRef = useRef(false);

    const checkStatus = useCallback(async (includeServices = false) => {
        const token = localStorage.getItem('g-one_token');
        if (!token) {
            setIsGoogleConnected(false);
            setGoogleServiceStatus({});
            setConnectedServices([]);
            setIsChecking(false);
            return;
        }

        if (document.visibilityState === 'hidden' || inFlightRef.current) {
            return;
        }

        inFlightRef.current = true;
        setIsChecking(true);
        try {
            const status = includeServices
                ? await checkGoogleDetailedServicesStatus()
                : await checkGoogleServicesStatus();
            setIsGoogleConnected(status.authenticated);
            if (isDetailedGoogleStatus(status)) {
                setGoogleServiceStatus(status.service_status);
                setConnectedServices(status.connected_services);
            }
        } catch (error) {
            setIsGoogleConnected(false);
            setGoogleServiceStatus({});
            setConnectedServices([]);
        } finally {
            setIsChecking(false);
            inFlightRef.current = false;
        }
    }, []);

    useEffect(() => {
        checkStatus(false);
        // Recheck every 30 seconds
        const interval = setInterval(() => checkStatus(false), 30000);
        return () => clearInterval(interval);
    }, [checkStatus]);

    return {
        isGoogleConnected,
        isChecking,
        googleServiceStatus,
        connectedServices,
        refresh: checkStatus,
    };
}
