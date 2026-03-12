import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

export interface TimelineStep {
    title: string;
    description: string[];
    date?: string;
    status: 'completed' | 'active' | 'pending';
}

interface TimelineProps {
    steps: TimelineStep[];
    className?: string;
}

export function Timeline({ steps, className }: TimelineProps) {
    return (
        <div className={cn('relative', className)}>
            {/* Línea vertical central continua */}
            <div
                className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-emerald-400 via-blue-400 to-slate-300"
                style={{
                    top: '1.5rem',
                    bottom: '1.5rem',
                    zIndex: 0
                }}
            />

            {steps.map((step, index) => {
                const isLeft = index % 2 === 0;

                return (
                    <div
                        key={index}
                        className="relative grid grid-cols-[1fr_auto_1fr] gap-0 mb-12 last:mb-0"
                    >
                        {/* Columna izquierda */}
                        <div className={cn(
                            'flex items-start py-2',
                            isLeft ? 'justify-end pr-8' : 'justify-end pr-8'
                        )}>
                            {isLeft ? (
                                <StepCard step={step} align="right" />
                            ) : (
                                <div className="text-right pt-4">
                                    {step.date && (
                                        <p className="text-sm text-muted-foreground font-semibold tracking-wide">
                                            {step.date}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Columna central - Círculo */}
                        <div className="relative z-10 flex items-start justify-center" style={{ width: '3.5rem' }}>
                            <div
                                className={cn(
                                    'w-14 h-14 rounded-full border-4 border-background',
                                    'flex items-center justify-center',
                                    'transition-all duration-300',
                                    step.status === 'completed' &&
                                    'bg-emerald-500 text-white shadow-md shadow-emerald-500/30',
                                    step.status === 'active' &&
                                    'bg-blue-600 text-white ring-4 ring-blue-200/60 shadow-lg shadow-blue-500/40',
                                    step.status === 'pending' && 'bg-slate-200 text-slate-400 border-slate-300'
                                )}
                            >
                                {step.status === 'completed' && <CheckCircle2 className="w-7 h-7" />}
                                {step.status === 'active' && <Clock className="w-7 h-7 animate-pulse" />}
                                {step.status === 'pending' && <Circle className="w-7 h-7" />}
                            </div>
                        </div>

                        {/* Columna derecha */}
                        <div className={cn(
                            'flex items-start py-2',
                            !isLeft ? 'justify-start pl-8' : 'justify-start pl-8'
                        )}>
                            {!isLeft ? (
                                <StepCard step={step} align="left" />
                            ) : (
                                <div className="text-left pt-4">
                                    {step.date && (
                                        <p className="text-sm text-muted-foreground font-semibold tracking-wide">
                                            {step.date}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

interface StepCardProps {
    step: TimelineStep;
    align: 'left' | 'right';
}

function StepCard({ step, align }: StepCardProps) {
    // Determinar estilos del header según el estado
    const getHeaderStyles = () => {
        if (step.status === 'active') {
            return {
                container: 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/30',
                border: 'border-blue-600'
            };
        }
        if (step.status === 'completed') {
            return {
                container: 'bg-gradient-to-br from-emerald-500/90 to-emerald-600/90 text-white shadow-md shadow-emerald-500/20',
                border: 'border-emerald-500'
            };
        }
        return {
            container: 'bg-slate-100 text-slate-500 shadow-sm',
            border: 'border-slate-200'
        };
    };

    // Determinar estilos del body según el estado
    const getBodyStyles = () => {
        if (step.status === 'active') {
            return 'bg-blue-50/60 border-blue-300 shadow-md shadow-blue-100/50';
        }
        if (step.status === 'completed') {
            return 'bg-white border-emerald-200/60 shadow-sm';
        }
        return 'bg-slate-50/50 border-slate-200 shadow-sm';
    };

    const headerStyles = getHeaderStyles();
    const bodyStyles = getBodyStyles();

    return (
        <div className={cn('relative max-w-md w-full', align === 'left' ? 'text-left' : 'text-right')}>
            {/* Header flotante tipo pestaña */}
            <div
                className={cn(
                    'inline-block px-6 py-3 rounded-t-lg mb-0',
                    'font-bold text-sm uppercase tracking-widest',
                    'transition-all duration-300',
                    headerStyles.container,
                    align === 'right' ? 'ml-auto' : 'mr-auto'
                )}
                style={{
                    letterSpacing: '0.1em',
                    transform: 'translateY(4px)',
                    zIndex: 2,
                    position: 'relative'
                }}
            >
                {step.title}
            </div>

            {/* Body de la card */}
            <div
                className={cn(
                    'border rounded-lg pt-8 pb-6 px-6',
                    'transition-all duration-300',
                    bodyStyles,
                    headerStyles.border,
                    step.status === 'active' && 'hover:shadow-lg hover:shadow-blue-200/60'
                )}
                style={{
                    borderTopLeftRadius: align === 'left' ? '0' : '0.5rem',
                    borderTopRightRadius: align === 'right' ? '0' : '0.5rem'
                }}
            >
                <ul className={cn('space-y-3', align === 'left' ? 'text-left' : 'text-right')}>
                    {step.description.map((item, idx) => (
                        <li
                            key={idx}
                            className={cn(
                                'text-sm flex items-start gap-2.5',
                                step.status === 'active' ? 'text-slate-800' : 'text-slate-600'
                            )}
                        >
                            <span
                                className={cn(
                                    'flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2',
                                    step.status === 'active' && 'bg-blue-500',
                                    step.status === 'completed' && 'bg-emerald-500',
                                    step.status === 'pending' && 'bg-slate-400',
                                    align === 'right' && 'order-2'
                                )}
                            />
                            <span className={cn(
                                'leading-relaxed',
                                align === 'right' ? 'order-1' : '',
                                step.status === 'active' && 'font-medium'
                            )}>
                                {item}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
