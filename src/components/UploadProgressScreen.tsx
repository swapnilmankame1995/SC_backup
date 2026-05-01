import { motion } from 'motion/react';
import { Upload, FileCheck, CheckCircle2, Loader2 } from 'lucide-react';

interface UploadProgressScreenProps {
  filesCount: number;
  currentFileIndex: number;
  currentFileName?: string;
  isComplete?: boolean;
}

export function UploadProgressScreen({ 
  filesCount, 
  currentFileIndex, 
  currentFileName,
  isComplete = false 
}: UploadProgressScreenProps) {
  const progress = filesCount > 0 ? (currentFileIndex / filesCount) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="max-w-md w-full px-6">
        {/* Animated Icon */}
        <div className="flex justify-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="relative"
          >
            {isComplete ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <CheckCircle2 className="w-24 h-24 text-green-500" />
              </motion.div>
            ) : (
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Upload className="w-24 h-24 text-blue-500" />
                </motion.div>
                <motion.div
                  className="absolute -bottom-2 -right-2"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-2"
        >
          {isComplete ? 'Upload Complete!' : 'Uploading Your Files'}
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center text-gray-600 mb-8"
        >
          {isComplete 
            ? 'Creating your order now...'
            : 'Please wait while we securely upload your files to our server'
          }
        </motion.p>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              {isComplete 
                ? `All ${filesCount} file${filesCount !== 1 ? 's' : ''} uploaded`
                : `Uploading file ${currentFileIndex} of ${filesCount}`
              }
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Current File Name */}
        {currentFileName && !isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-50 rounded-lg p-4 flex items-center gap-3"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <FileCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 mb-1">Currently uploading:</p>
              <p className="text-sm truncate">{currentFileName}</p>
            </div>
          </motion.div>
        )}

        {/* Uploaded Files List (for multiple files) */}
        {filesCount > 1 && !isComplete && currentFileIndex > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6"
          >
            <p className="text-sm text-gray-500 mb-3">Previously uploaded:</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {Array.from({ length: currentFileIndex - 1 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>File {i + 1} uploaded</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Note */}
        {!isComplete && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-sm text-gray-500 mt-8"
          >
            Please don't close this window
          </motion.p>
        )}
      </div>
    </div>
  );
}
