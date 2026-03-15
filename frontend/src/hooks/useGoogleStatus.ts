import { useState, useEffect } from 'react';
import { checkGoogleServicesStatus } from '../services/auth.service';

/**
 * Hook to check if Google services are connected for the current user.
 * Returns real-time status, not JWT auth status.
 */
export function useGoogleStatus() {
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    const checkStatus = async () => {
        setIsChecking(true);
        try {
            const status = await checkGoogleServicesStatus();
            setIsGoogleConnected(status.authenticated);
        } catch (error) {
            setIsGoogleConnected(false);
        } finally {
            setIsChecking(false);
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
