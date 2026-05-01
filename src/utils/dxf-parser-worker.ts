/**
 * DXF Parser Worker Utility
 * Provides a Promise-based interface to the Web Worker
 */

import { DXFData } from './dxf-parser';

interface WorkerMessage {
  type: 'parse' | 'progress' | 'complete' | 'error';
  id?: string;
  content?: string;
  progress?: number;
  result?: DXFData;
  error?: string;
}

let workerInstance: Worker | null = null;
let requestId = 0;

/**
 * Parse DXF file content using Web Worker
 */
export function parseDXFAsync(
  content: string,
  onProgress?: (progress: number) => void
): Promise<DXFData> {
  return new Promise((resolve, reject) => {
    // Create worker if not exists
    if (!workerInstance) {
      try {
        workerInstance = new Worker('/dxf-parser.worker.js');
      } catch (error) {
        console.error('Failed to create DXF parser worker:', error);
        reject(new Error('Web Worker not supported'));
        return;
      }
    }

    const id = `parse-${++requestId}`;

    const messageHandler = (e: MessageEvent<WorkerMessage>) => {
      const { type, id: messageId, progress, result, error } = e.data;

      // Only handle messages for this request
      if (messageId && messageId !== id) return;

      if (type === 'progress' && progress !== undefined) {
        if (onProgress) {
          onProgress(progress);
        }
      } else if (type === 'complete' && result) {
        workerInstance?.removeEventListener('message', messageHandler);
        resolve(result);
      } else if (type === 'error' && error) {
        workerInstance?.removeEventListener('message', messageHandler);
        reject(new Error(error));
      }
    };

    const errorHandler = (error: ErrorEvent) => {
      workerInstance?.removeEventListener('message', messageHandler);
      workerInstance?.removeEventListener('error', errorHandler);
      reject(new Error('Worker error: ' + error.message));
    };

    workerInstance.addEventListener('message', messageHandler);
    workerInstance.addEventListener('error', errorHandler);

    // Send parse request
    workerInstance.postMessage({
      type: 'parse',
      id,
      content,
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      workerInstance?.removeEventListener('message', messageHandler);
      workerInstance?.removeEventListener('error', errorHandler);
      reject(new Error('DXF parsing timeout'));
    }, 30000);
  });
}

/**
 * Terminate the worker instance
 */
export function terminateWorker() {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
}

/**
 * Check if Web Workers are supported
 */
export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined';
}
