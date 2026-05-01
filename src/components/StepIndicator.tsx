import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="bg-[#1a1a1a] border-b border-gray-800 py-4 sm:py-6">
      <div className="container mx-auto px-2 sm:px-4">
        {/* Mobile View - 2 Rows */}
        <div className="sm:hidden">
          {/* Row 1: Circles and connecting lines */}
          <div className="flex items-center justify-between max-w-4xl mx-auto mb-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      index < currentStep
                        ? 'bg-green-500 border-green-500'
                        : index === currentStep
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-[#2a2a2a] border-gray-700'
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <span
                        className={`${
                          index === currentStep ? 'text-white' : 'text-gray-400'
                        }`}
                      >
                        {index + 1}
                      </span>
                    )}
                  </div>
                </div>
                
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          
          {/* Row 2: Labels */}
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="flex-1 text-center">
                <span
                  className={`text-[10px] ${
                    index <= currentStep ? 'text-gray-200' : 'text-gray-500'
                  }`}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop View - Single Row (Original) */}
        <div className="hidden sm:flex items-center justify-between max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    index < currentStep
                      ? 'bg-green-500 border-green-500'
                      : index === currentStep
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-[#2a2a2a] border-gray-700'
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <span
                      className={`${
                        index === currentStep ? 'text-white' : 'text-gray-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>
                <span
                  className={`mt-2 text-sm ${
                    index <= currentStep ? 'text-gray-200' : 'text-gray-500'
                  }`}
                >
                  {step}
                </span>
              </div>
              
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 ${
                    index < currentStep ? 'bg-green-500' : 'bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}