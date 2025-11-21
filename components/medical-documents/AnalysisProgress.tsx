'use client';

// ============================================================================
// AnalysisProgress Component
// ============================================================================
// Purpose: Display analysis progress with animated steps
// Features: Step tracking, loading states, success/error indicators
// Used in: Medical documents workflow
// ============================================================================

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Check, Loader2, AlertCircle, FileText, Brain, CheckCircle } from 'lucide-react';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export type AnalysisStep = 'extracting' | 'analyzing' | 'completed' | 'error';

interface AnalysisProgressProps {
  currentStep: AnalysisStep;
  error?: string | null;
}

// ============================================================================
// STEP CONFIGURATION
// ============================================================================

const STEPS = [
  {
    id: 'extracting',
    title: 'Text Extraction',
    description: 'Reading and extracting document content...',
    icon: FileText,
  },
  {
    id: 'analyzing',
    title: 'Medical Analysis',
    description: 'Analyzing results with artificial intelligence...',
    icon: Brain,
  },
  {
    id: 'completed',
    title: 'Analysis Complete',
    description: 'Document analyzed successfully',
    icon: CheckCircle,
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AnalysisProgress({ currentStep, error }: AnalysisProgressProps) {
  // Calculate progress percentage
  const getProgress = (): number => {
    if (currentStep === 'error') return 0;
    if (currentStep === 'extracting') return 33;
    if (currentStep === 'analyzing') return 66;
    if (currentStep === 'completed') return 100;
    return 0;
  };

  const getCurrentStepIndex = (): number => {
    if (currentStep === 'error') return -1;
    return STEPS.findIndex((step) => step.id === currentStep);
  };

  const progress = getProgress();
  const currentStepIndex = getCurrentStepIndex();

  // Render error state
  if (currentStep === 'error') {
    return (
      <Card className="border-2 border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-lg text-red-900">
                Erreur lors de l&apos;analyse
              </h3>
              <p className="text-sm text-red-800">
                {error || 'An error occurred. Please try again.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render normal progress state
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Progression de l&apos;analyse</span>
            <span className="font-semibold text-blue-600">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isPending = index > currentStepIndex;

            return (
              <div
                key={step.id}
                className={`flex items-start space-x-4 p-4 rounded-lg transition-all duration-300 ${
                  isCurrent
                    ? 'bg-blue-50 border border-blue-200'
                    : isCompleted
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 p-2 rounded-lg ${
                    isCompleted
                      ? 'bg-green-100'
                      : isCurrent
                      ? 'bg-blue-100'
                      : 'bg-gray-100'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  ) : (
                    <StepIcon
                      className={`w-5 h-5 ${
                        isPending ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                  <h4
                    className={`font-semibold ${
                      isCompleted
                        ? 'text-green-900'
                        : isCurrent
                        ? 'text-blue-900'
                        : 'text-gray-600'
                    }`}
                  >
                    {step.title}
                  </h4>
                  <p
                    className={`text-sm ${
                      isCompleted
                        ? 'text-green-700'
                        : isCurrent
                        ? 'text-blue-700'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>

                {/* Status Badge */}
                {isCompleted && (
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      In Progress
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Estimated Time */}
        {currentStep !== 'completed' && (
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="flex items-center">
              <span className="mr-2">⏱️</span>
              <span>
                Estimated time:{' '}
                <span className="font-medium">
                  {currentStep === 'extracting' ? '15-30 secondes' : '20-40 secondes'}
                </span>
              </span>
            </p>
          </div>
        )}

        {/* Completion Message */}
        {currentStep === 'completed' && (
          <div className="text-sm text-green-800 bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="flex items-center font-medium">
              <Check className="w-4 h-4 mr-2" />
              L&apos;analyse est terminée ! Consultez les résultats ci-dessous.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
