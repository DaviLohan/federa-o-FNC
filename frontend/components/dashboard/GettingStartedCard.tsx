'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';

interface Step {
  title: string;
  description: string;
  completed: boolean;
  href?: string;
}

interface GettingStartedCardProps {
  steps: Step[];
}

export function GettingStartedCard({ steps }: GettingStartedCardProps) {
  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface1 p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="mb-2 text-xl font-bold text-text">
          Primeiros Passos
        </h3>
        <p className="text-sm text-muted">
          Complete estas etapas para aproveitar ao máximo a plataforma
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-muted">Progresso</span>
          <span className="font-mono font-bold text-gold">
            {completedCount}/{steps.length}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
          <div
            className="h-full bg-gradient-to-r from-gold via-gold to-gold2 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const StepContent = (
            <div
              className={`
                flex items-start gap-3 rounded-lg border border-border bg-surface2 p-4
                transition-all
                ${step.href && !step.completed ? 'cursor-pointer hover:border-gold/30' : ''}
              `}
            >
              <div className="flex-shrink-0">
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green" />
                ) : (
                  <Circle className="h-5 w-5 text-muted" />
                )}
              </div>
              <div className="flex-1">
                <h4
                  className={`mb-1 font-medium ${
                    step.completed ? 'text-muted line-through' : 'text-text'
                  }`}
                >
                  {step.title}
                </h4>
                <p className="text-xs text-muted">{step.description}</p>
              </div>
              {step.href && !step.completed && (
                <div className="flex-shrink-0 text-sm text-gold">→</div>
              )}
            </div>
          );

          if (step.href && !step.completed) {
            return (
              <Link key={index} href={step.href}>
                {StepContent}
              </Link>
            );
          }

          return <div key={index}>{StepContent}</div>;
        })}
      </div>
    </div>
  );
}
