import { RefreshCw } from 'lucide-react';

interface ConnectionErrorProps {
  onRetry: () => void;
}

export function ConnectionError({ onRetry }: ConnectionErrorProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-lg p-8 max-w-md text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-4">Connection Issue</h2>
        <p className="text-gray-600 mb-6">
          Unable to connect to the server. This could be due to:
        </p>
        <ul className="text-left text-gray-600 mb-6 space-y-2">
          <li>• The server is starting up (cold start)</li>
          <li>• Temporary network issue</li>
          <li>• Preview environment needs refresh</li>
        </ul>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 mx-auto bg-[#dc0000] hover:bg-[#b80000] text-white px-6 py-3 rounded-lg transition-colors"
        >
          <RefreshCw size={20} />
          Retry Connection
        </button>
        <p className="text-sm text-gray-500 mt-4">
          If this persists, try refreshing your browser
        </p>
      </div>
    </div>
  );
}
