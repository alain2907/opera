import { useState, useEffect } from 'react';

interface BackendStatus {
  isConnected: boolean;
  isChecking: boolean;
  error: string | null;
  connectedClients: number;
}

export function useBackendConnection(checkInterval = 10000): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>({
    isConnected: false,
    isChecking: true,
    error: null,
    connectedClients: 0,
  });

  const checkConnection = async () => {
    try {
      const cloudApiUrl = process.env.NEXT_PUBLIC_CLOUD_API_URL || 'https://violent-karon-gestion3008-free-e7089456.koyeb.app/api';
      const response = await fetch(`${cloudApiUrl}/proxy/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const connectedClients = data.connectedClients || 0;
        setStatus({
          isConnected: connectedClients > 0,
          isChecking: false,
          error: null,
          connectedClients,
        });
      } else {
        setStatus({
          isConnected: false,
          isChecking: false,
          error: `Erreur HTTP ${response.status}`,
          connectedClients: 0,
        });
      }
    } catch (error) {
      setStatus({
        isConnected: false,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        connectedClients: 0,
      });
    }
  };

  useEffect(() => {
    // Check immediately on mount
    checkConnection();

    // Then check periodically
    const interval = setInterval(checkConnection, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval]);

  return status;
}
