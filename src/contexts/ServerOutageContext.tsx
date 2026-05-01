import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface ServerOutageContextType {
  showOutageNotification: boolean;
  isOutage: boolean;
  triggerOutageNotification: () => void;
  dismissOutageNotification: () => void;
  setOutage: (value: boolean) => void;
}

const ServerOutageContext = createContext<ServerOutageContextType | undefined>(undefined);

export function ServerOutageProvider({ children }: { children: ReactNode }) {
  const [showOutageNotification, setShowOutageNotification] = useState(false);
  const [isOutage, setIsOutage] = useState(false);
  const [lastTriggered, setLastTriggered] = useState<number>(0);

  const triggerOutageNotification = useCallback(() => {
    const now = Date.now();
    // Only show notification once every 5 minutes to avoid spam
    if (now - lastTriggered > 5 * 60 * 1000) {
      setShowOutageNotification(true);
      setIsOutage(true);
      setLastTriggered(now);
    }
  }, [lastTriggered]);

  const dismissOutageNotification = useCallback(() => {
    setShowOutageNotification(false);
    setIsOutage(false);
  }, []);

  const setOutage = useCallback((value: boolean) => {
    setIsOutage(value);
    if (value) {
      setShowOutageNotification(true);
    }
  }, []);

  return (
    <ServerOutageContext.Provider
      value={{
        showOutageNotification,
        isOutage,
        triggerOutageNotification,
        dismissOutageNotification,
        setOutage,
      }}
    >
      {children}
    </ServerOutageContext.Provider>
  );
}

export function useServerOutage() {
  const context = useContext(ServerOutageContext);
  if (context === undefined) {
    throw new Error('useServerOutage must be used within a ServerOutageProvider');
  }
  return context;
}