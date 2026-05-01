import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2, Search, Copy, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { apiCall } from '../../utils/api';
import { toast } from 'sonner@2.0.3';

export function GooglePlaceIDFinder() {
  const [isSearching, setIsSearching] = useState(false);
  const [placeData, setPlaceData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFindPlaceId = async () => {
    try {
      setIsSearching(true);
      setError(null);
      setPlaceData(null);
      
      toast.info('Searching for your Place ID...');
      
      const result = await apiCall('/admin/find-place-id', { 
        method: 'GET'
      });
      
      if (result.success) {
        setPlaceData(result);
        toast.success('Place ID found!');
      } else {
        setError(result.error || 'Failed to find Place ID');
        toast.error('Could not find Place ID automatically');
      }
    } catch (error: any) {
      console.error('Find Place ID error:', error);
      setError(error.message);
      toast.error('Failed to search for Place ID');
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <Card className="p-6 bg-[#1a1a1a] border-gray-800">
      <div className="space-y-4">
        <div>
          <h3 className="text-white mb-2">Google Place ID Finder</h3>
          <p className="text-sm text-gray-400">
            Find your Google Place ID for the Reviews integration
          </p>
        </div>

        <div className="flex items-start gap-4">
          <Button
            onClick={handleFindPlaceId}
            disabled={isSearching}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Find Place ID
              </>
            )}
          </Button>

          <a
            href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Use Google's Finder Tool
          </a>
        </div>

        {/* Success Result */}
        {placeData && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <p className="text-green-400 font-medium">{placeData.message}</p>
                
                {/* Place ID */}
                <div className="bg-black/20 p-3 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Place ID:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(placeData.placeId)}
                      className="h-6 px-2 text-blue-400 hover:text-blue-300"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <code className="text-white break-all">{placeData.placeId}</code>
                </div>

                {/* Business Info */}
                {placeData.name && (
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-500">Business:</span> {placeData.name}
                  </div>
                )}
                {placeData.address && (
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-500">Address:</span> {placeData.address}
                  </div>
                )}

                {/* Instructions */}
                <div className="pt-3 border-t border-green-500/20">
                  <p className="text-sm text-green-300 font-medium mb-2">
                    Next Steps:
                  </p>
                  <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                    <li>Copy the Place ID above</li>
                    <li>Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets</li>
                    <li>Add new secret: Name = <code className="text-blue-400">GOOGLE_PLACE_ID</code></li>
                    <li>Paste the Place ID as the value</li>
                    <li>Save and your Google Reviews will start working!</li>
                  </ol>
                </div>

                {placeData.note && (
                  <div className="text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded">
                    ⚠️ {placeData.note}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Result */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 mb-3">{error}</p>
                
                <div className="text-sm text-gray-300 space-y-2">
                  <p className="font-medium text-white">Alternative Methods:</p>
                  
                  <div className="bg-black/20 p-3 rounded space-y-2">
                    <p className="text-gray-400">Method 1: Google's Place ID Finder</p>
                    <a
                      href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Place ID Finder Tool
                    </a>
                    <p className="text-xs text-gray-500">Search for "SheetCutters" or coordinates: 15.4331279, 75.0154437</p>
                  </div>

                  <div className="bg-black/20 p-3 rounded space-y-2">
                    <p className="text-gray-400">Method 2: Your Google Maps URL</p>
                    <p className="text-xs text-gray-500">
                      Your business is at: 15.4331279°N, 75.0154437°E (Hubli, Karnataka)
                    </p>
                    <a
                      href="https://www.google.com/maps/place/SheetCutters/@15.4331279,75.0154437,17z"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in Google Maps
                    </a>
                  </div>

                  <div className="bg-black/20 p-3 rounded">
                    <p className="text-gray-400 mb-2">Method 3: Manual Lookup</p>
                    <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                      <li>Visit Google My Business (business.google.com)</li>
                      <li>Verify you own the SheetCutters listing</li>
                      <li>Get the Place ID from your business profile</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="text-xs text-gray-500 bg-[#0a0a0a] p-3 rounded border border-gray-800">
          <p className="mb-1">
            <span className="text-gray-400 font-medium">Your Business Location:</span>
          </p>
          <p>📍 SheetCutters</p>
          <p>📍 Coordinates: 15.4331279°N, 75.0154437°E</p>
          <p>📍 Location: Hubli (Hubballi), Karnataka</p>
        </div>
      </div>
    </Card>
  );
}
