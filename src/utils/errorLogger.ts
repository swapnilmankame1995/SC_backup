/**
 * Error Logger Utility
 * Logs errors for monitoring and debugging
 */

interface ErrorLog {
  timestamp: string;
  error: string;
  stack?: string;
  context?: string;
  userId?: string;
}

export function logError(
  error: Error | string, 
  context?: string,
  userId?: string
): void {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    context,
    userId,
  };

  // Log to console with formatting
  console.error('🔴 ERROR:', {
    ...errorLog,
    environment: window.location.hostname,
  });

  // In production, you would send this to a monitoring service like Sentry
  // Example: Sentry.captureException(error, { contexts: { custom: errorLog } });
}

export function logWarning(message: string, data?: any): void {
  console.warn('⚠️ WARNING:', {
    timestamp: new Date().toISOString(),
    message,
    data,
    environment: window.location.hostname,
  });
}

export function logInfo(message: string, data?: any): void {
  console.log('ℹ️ INFO:', {
    timestamp: new Date().toISOString(),
    message,
    data,
  });
}
