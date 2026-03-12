import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    CheckCircle2,
    AlertCircle,
    Info,
    TriangleAlert,
} from 'lucide-react';

// Tipos de alerta soportados
type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AppAlertProps {
    type: AlertType;
    title?: string;
    description: string;
    className?: string;
}

const CONFIG: Record<AlertType, {
    icon: React.ElementType;
    defaultTitle: string;
    className: string;
}> = {
    success: {
        icon: CheckCircle2,
        defaultTitle: 'Operacion exitosa',
        className: 'border-green-500/50 text-green-700 dark:text-green-400 [&>svg]:text-green-600',
    },
    error: {
        icon: AlertCircle,
        defaultTitle: 'Error',
        className: 'border-destructive/50 text-destructive [&>svg]:text-destructive',
    },
    warning: {
        icon: TriangleAlert,
        defaultTitle: 'Advertencia',
        className: 'border-yellow-500/50 text-yellow-700 dark:text-yellow-400 [&>svg]:text-yellow-600',
    },
    info: {
        icon: Info,
        defaultTitle: 'Informacion',
        className: 'border-blue-500/50 text-blue-700 dark:text-blue-400 [&>svg]:text-blue-600',
    },
};

/**
 * Componente de alerta unificado para todo el sistema.
 * Respeta el tema de Shadcn UI y aplica variantes visuales según el tipo.
 *
 * Uso:
 *   <AppAlert type="success" description="Guardado correctamente." />
 *   <AppAlert type="error" title="Error al guardar" description={error} />
 */
export function AppAlert({ type, title, description, className }: AppAlertProps) {
    const { icon: Icon, defaultTitle, className: typeClass } = CONFIG[type];

    return (
        <Alert className={cn(typeClass, className)}>
            <Icon className="h-4 w-4" />
            <AlertTitle>{title ?? defaultTitle}</AlertTitle>
            <AlertDescription>{description}</AlertDescription>
        </Alert>
    );
}
