import React, { createContext, useContext, useState, useEffect, ReactNode, startTransition } from 'react';
import { apiCall } from '../utils/api';

interface SupportSettings {
  whatsappNumber: string;
  supportEmail?: string;
  supportHours?: string;
}

interface SupportContextType {
  settings: SupportSettings;
  updateSettings: (newSettings: Partial<SupportSettings>) => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: SupportSettings = {
  whatsappNumber: '918217553454', // Default with country code
  supportEmail: 'support@sheetcutters.com',
  supportHours: '9 AM - 6 PM IST',
};

const SupportContext = createContext<SupportContextType | undefined>(undefined);

export function SupportProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SupportSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await apiCall('/settings/support', { method: 'GET' }, false);
      
      if (result.success && result.settings) {
        startTransition(() => {
          setSettings({ ...defaultSettings, ...result.settings });
        });
      }
    } catch (error) {
      console.error('Error loading support settings:', error);
      // Use default settings on error
    } finally {
      startTransition(() => {
        setIsLoading(false);
      });
    }
  };

  const updateSettings = async (newSettings: Partial<SupportSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      const result = await apiCall('/settings/support', {
        method: 'POST',
        body: JSON.stringify(newSettings),
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update settings');
      }

      startTransition(() => {
        setSettings(updatedSettings);
      });
    } catch (error) {
      console.error('❌ Error updating support settings:', error);
      throw error;
    }
  };

  return (
    <SupportContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SupportContext.Provider>
  );
}

export function useSupport() {
  const context = useContext(SupportContext);
  if (context === undefined) {
    throw new Error('useSupport must be used within a SupportProvider');
  }
  return context;
}