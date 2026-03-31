import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: { label: string; description: string }[];
}

export function StepIndicator({ currentStep, totalSteps, steps }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-6">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`h-2 flex-1 rounded-full transition-all duration-500 ${
              index + 1 <= currentStep
                ? 'bg-gradient-to-r from-gold via-gold to-gold2'
                : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* Step info */}
      <div className="text-center animate-reveal">
        <div className="text-sm text-muted mb-1">
          Etapa {currentStep} de {totalSteps}
        </div>
        <h2 className="text-2xl font-bold text-text mb-2">
          {steps[currentStep - 1].label}
        </h2>
        <p className="text-sm text-muted">
          {steps[currentStep - 1].description}
        </p>
      </div>
    </div>
  );
}
