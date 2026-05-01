import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface PreloaderProps {
  onComplete: () => void;
}

export function Preloader({ onComplete }: PreloaderProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const duration = 1500; // 1.5 seconds loading time
    const steps = 100;
    const intervalTime = duration / steps;

    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setIsVisible(false), 500); // Wait a bit before exiting
          return 100;
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  return (
    <AnimatePresence mode="wait" onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          initial={{ y: 0 }}
          animate={{ y: 0 }}
          exit={{ 
            y: '-100%',
            transition: { 
              duration: 0.8, 
              ease: [0.76, 0, 0.24, 1] // Custom ease for "curtain" effect
            } 
          }}
        >
          {/* Background Grid of SheetCutters logos */}
          <div className="absolute inset-0 overflow-hidden opacity-[0.05]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6 p-4 sm:p-6" style={{ fontFamily: '"Brush Script MT", cursive' }}>
              {Array.from({ length: 100 }).map((_, i) => (
                <div key={i} className="text-white text-4xl sm:text-4xl md:text-4xl lg:text-5xl whitespace-nowrap">
                  SheetCutters
                </div>
              ))}
            </div>
          </div>

          <div className="relative w-full max-w-md px-10">
            {/* Percentage Counter */}
            <div className="mb-4 flex justify-between items-end">
              <motion.h1 
                className="text-6xl font-bold text-white tracking-tighter"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {count}%
              </motion.h1>
              <motion.div 
                className="text-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="block text-4xl text-white" style={{ fontFamily: '"Brush Script MT", cursive' }}>SheetCutters</span>
                <span className="block text-xs text-[#dc0000] uppercase tracking-widest">Loading Experience</span>
              </motion.div>
            </div>

            {/* Progress Bar / Laser Line */}
            <div className="h-[2px] w-full bg-gray-800 overflow-hidden relative">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-[#dc0000]"
                style={{ width: `${count}%` }}
              />
              {/* Laser head effect */}
              <motion.div 
                className="absolute top-1/2 -translate-y-1/2 h-2 w-2 bg-white rounded-full shadow-[0_0_10px_2px_rgba(220,0,0,0.8)]"
                style={{ left: `${count}%` }}
              />
            </div>
            
            {/* Decorative text */}
            <motion.div 
              className="absolute -bottom-12 left-10 text-gray-600 text-xs font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: count > 50 ? 1 : 0 }}
            >
              INITIALIZING SYSTEM...
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}