import { cn } from '@/lib/utils';
import { CheckCircle2, Circle } from 'lucide-react';

interface StepperProps {
    currentStep: number;
    steps: {
        id: number;
        label: string;
        isCompleted: boolean;
    }[];
    onStepClick: (stepId: number) => void;
}

export const Stepper = ({ currentStep, steps, onStepClick }: StepperProps) => {
    return (
        <div className="flex items-center space-x-4 mb-8">
            {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                    <button
                        onClick={() => onStepClick(step.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                            currentStep === step.id
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {step.isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                            <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs",
                                currentStep === step.id ? "border-primary text-primary" : "border-slate-300"
                            )}>
                                {index + 1}
                            </div>
                        )}
                        <span>{step.label}</span>
                    </button>
                    {index < steps.length - 1 && (
                        <div className="h-px w-8 bg-slate-200 mx-2" />
                    )}
                </div>
            ))}
        </div>
    );
};
