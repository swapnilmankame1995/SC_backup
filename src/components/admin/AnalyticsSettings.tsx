import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { apiCall } from '../../utils/api';
import { AlertCircle, CheckCircle2, Activity } from 'lucide-react';

interface AnalyticsConfig {
  facebookPixel: {
    pixelId: string;
    enabled: boolean;
  };
  googleAnalytics: {
    measurementId: string;
    enabled: boolean;
  };
}

export function AnalyticsSettings() {
  const [settings, setSettings] = useState<AnalyticsConfig>({
    facebookPixel: {
      pixelId: '',
      enabled: false
    },
    googleAnalytics: {
      measurementId: '',
      enabled: false
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const result = await apiCall('/admin/analytics-settings', { method: 'GET' });
      if (result.success && result.settings) {
        setSettings(result.settings);
      }
    } catch (error) {
      console.error('Failed to fetch analytics settings:', error);
      setMessage({ type: 'error', text: 'Failed to load analytics settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setMessage(null);

      const result = await apiCall('/admin/analytics-settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });

      if (result.success) {
        setMessage({ type: 'success', text: 'Analytics settings saved successfully!' });
        // Reload the page after a short delay to reinitialize analytics
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Failed to save analytics settings:', error);
      setMessage({ type: 'error', text: 'Failed to save analytics settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (platform: 'facebookPixel' | 'googleAnalytics') => {
    setSettings(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        enabled: !prev[platform].enabled
      }
    }));
  };

  const handleIdChange = (platform: 'facebookPixel' | 'googleAnalytics', value: string) => {
    setSettings(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [platform === 'facebookPixel' ? 'pixelId' : 'measurementId']: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading analytics settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white mb-2">Analytics & Tracking</h2>
        <p className="text-gray-400">Configure Facebook Pixel and Google Analytics for your website</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Facebook Pixel */}
      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white mb-1">Facebook Pixel</h3>
                <p className="text-sm text-gray-400">Track conversions and optimize Facebook ads</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.facebookPixel.enabled}
                  onChange={() => handleToggle('facebookPixel')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-gray-400">Pixel ID</label>
              <input
                type="text"
                value={settings.facebookPixel.pixelId}
                onChange={(e) => handleIdChange('facebookPixel', e.target.value)}
                placeholder="123456789012345"
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500">
                Find your Pixel ID in Meta Events Manager → Data Sources
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Google Analytics */}
      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-500/10 rounded-lg">
            <Activity className="w-6 h-6 text-orange-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white mb-1">Google Analytics 4</h3>
                <p className="text-sm text-gray-400">Track user behavior and website analytics</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.googleAnalytics.enabled}
                  onChange={() => handleToggle('googleAnalytics')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-gray-400">Measurement ID</label>
              <input
                type="text"
                value={settings.googleAnalytics.measurementId}
                onChange={(e) => handleIdChange('googleAnalytics', e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
              <p className="text-xs text-gray-500">
                Find your Measurement ID in Google Analytics → Admin → Data Streams
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Events Tracked */}
      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <h3 className="text-white mb-4">Events Automatically Tracked</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm text-gray-400 mb-2">Facebook Pixel Events:</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• PageView</li>
              <li>• AddToCart</li>
              <li>• InitiateCheckout</li>
              <li>• Purchase (with revenue)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm text-gray-400 mb-2">Google Analytics Events:</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• page_view</li>
              <li>• add_to_cart</li>
              <li>• begin_checkout</li>
              <li>• purchase (with revenue)</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
