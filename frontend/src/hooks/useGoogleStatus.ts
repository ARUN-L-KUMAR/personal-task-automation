import { useState, useEffect, useRef } from 'react';
import { checkGoogleServicesStatus } from '../services/auth.service';

/**
 * Hook to check if Google services are connected for the current user.
 * Returns real-time status, not JWT auth status.
 */
export function useGoogleStatus() {
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const inFlightRef = useRef(false);

    const checkStatus = async () => {
        const token = localStorage.getItem('g-one_token');
        if (!token) {
            setIsGoogleConnected(false);
            setIsChecking(false);
            return;
        }

        if (document.visibilityState === 'hidden' || inFlightRef.current) {
            return;
        }

        inFlightRef.current = true;
        setIsChecking(true);
        try {
            const status = await checkGoogleServicesStatus();
            setIsGoogleConnected(status.authenticated);
        } catch (error) {
            setIsGoogleConnected(false);
        } finally {
            setIsChecking(false);
            inFlightRef.current = false;
        }
    };

    useEffect(() => {
        checkStatus();
        // Recheck every 30 seconds
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    return { isGoogleConnected, isChecking, refresh: checkStatus };
}
