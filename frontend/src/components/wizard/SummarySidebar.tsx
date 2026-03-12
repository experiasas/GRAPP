import { WizardEstado, Anexo, TipoAnexo } from '@/api/wizardApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Circle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

interface SummarySidebarProps {
    estado?: WizardEstado | null;
    anexos: Anexo[];
    tiposAnexo: TipoAnexo[];
    onSubmit: () => Promise<void>;
    canSubmit: boolean;
    isSaving: boolean;
}

export const SummarySidebar = ({
    estado,
    anexos,
    tiposAnexo,
    onSubmit,
    canSubmit,
    isSaving,
}: SummarySidebarProps) => {
    if (!estado) {
        return (
            <div className="sticky top-24 space-y-4">
                <div className="summary-card animate-pulse">
                    <div className="p-6 space-y-4">
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                        <div className="h-8 bg-muted rounded w-2/3"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                </div>
            </div>
        );
    }

    const obligatorios = tiposAnexo.filter(t => t.obligatorio);
    const missingObligatorios = obligatorios.filter(t => !anexos.some(a => a.tipo.id === t.id));
    const isReadOnly = estado.estado !== 'BORRADOR';

    const getEstadoDisplay = (estado: string) => {
        if (estado === 'EN_REVISION') return 'En validación';
        if (estado === 'BORRADOR') return 'Borrador';
        // Capitalize first letter, lowercase rest
        return estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();
    };

    return (
        <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
                <div className="p-5 flex flex-col gap-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Estado</p>

                    <p className="text-xl font-bold text-foreground">
                        {getEstadoDisplay(estado.estado)}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        {estado.tipo_documento && (
                            <div className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-semibold rounded-md border border-border">
                                {estado.tipo_documento === 'FACTURA'
                                    ? 'Factura'
                                    : 'Cuenta de Cobro'}
                            </div>
                        )}

                        <div
                            className={cn(
                                "px-3 py-1 text-xs font-semibold rounded-md",
                                isReadOnly
                                    ? "bg-success/10 text-success"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            {isReadOnly ? 'Solo lectura' : 'En edición'}
                        </div>
                    </div>
                </div>

                {/* Total Value */}
                <div className="p-5 border-t border-border">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Valor Total</p>
                    <p className="text-3xl font-extrabold text-foreground tabular-nums tracking-tight">
                        {formatCurrency(estado.datos_financieros.valor_total)}
                    </p>
                </div>

                {/* Contract Info */}
                {estado.contrato_detalle && (
                    <div className="p-5 border-t border-border">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Contrato</p>
                        <p className="text-base font-bold text-foreground">{estado.contrato_detalle.numero}</p>
                        {estado.contrato_detalle.objeto && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                                {estado.contrato_detalle.objeto}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Financial Breakdown */}
            <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
                <div className="p-5">
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4">
                        Desglose Financiero
                    </h3>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Base</span>
                            <span className="font-semibold text-foreground tabular-nums">{formatCurrency(estado.datos_financieros.valor_base)}</span>
                        </div>
                        {estado.tipo_documento === 'FACTURA' && (
                            <>
                                {Number(estado.datos_financieros.iva_porcentaje) > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">
                                            IVA ({Number(estado.datos_financieros.iva_porcentaje)}%)
                                        </span>
                                        <span className="font-semibold text-foreground tabular-nums">
                                            {formatCurrency(Number(estado.datos_financieros.iva_valor))}
                                        </span>
                                    </div>
                                )}
                                {(Number(estado.datos_financieros.admon) > 0 ||
                                  Number(estado.datos_financieros.imprevistos) > 0 ||
                                  Number(estado.datos_financieros.utilidad) > 0) && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">A.I.U</span>
                                        <span className="font-semibold text-foreground tabular-nums">
                                            {formatCurrency(
                                                Number(estado.datos_financieros.admon || 0) +
                                                Number(estado.datos_financieros.imprevistos || 0) +
                                                Number(estado.datos_financieros.utilidad || 0)
                                            )}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                        <div className="flex justify-between items-center border-t border-border mt-4 pt-4">
                            <span className="text-foreground font-bold">Total</span>
                            <span className="font-extrabold text-foreground tabular-nums text-lg">{formatCurrency(estado.datos_financieros.valor_total)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Requirements Progress */}
            <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
                <div className="p-5">
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4">
                        Progreso
                    </h3>

                    <div className="grid grid-cols-3 gap-2">
                        <RequirementBox
                            label="Datos"
                            isComplete={estado.step1_ok}
                        />
                        <RequirementBox
                            label="Valores"
                            isComplete={estado.step2_ok}
                        />
                        <RequirementBox
                            label="Anexos"
                            isComplete={estado.anexos_ok}
                            count={`${anexos.length}/${obligatorios.length}`}
                        />
                    </div>

                    {/* Missing Anexos */}
                    {missingObligatorios.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Pendientes:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {missingObligatorios.map(t => (
                                    <Badge
                                        key={t.id}
                                        variant="outline"
                                        className="text-xs text-destructive border-destructive/30 bg-destructive/5"
                                    >
                                        {t.nombre}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
                <Button
                    className={cn(
                        "w-full h-12 text-sm font-semibold transition-all duration-200",
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                        (!canSubmit || isSaving || isReadOnly) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={onSubmit}
                    disabled={!canSubmit || isSaving || isReadOnly}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Radicando...
                        </>
                    ) : (
                        `Radicar ${estado?.tipo_documento === 'FACTURA' ? 'Factura' : 'Cuenta'}`
                    )}
                </Button>
                {!canSubmit && !isReadOnly && (
                    <p className="text-center text-xs text-muted-foreground mt-3">
                        Complete todos los pasos para radicar
                    </p>
                )}
            </div>
        </div>
    );
};

// Requirement Box Component
const RequirementBox = ({
    label,
    isComplete,
    count
}: {
    label: string;
    isComplete: boolean;
    count?: string;
}) => (
    <div className="flex flex-col items-center justify-center p-3 bg-secondary/50 rounded-lg border border-border text-center">
        <div className="mb-2">
            {isComplete ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
            ) : (
                <Circle className="w-5 h-5 text-muted-foreground/40" />
            )}
        </div>
        <p className="text-xs text-foreground font-semibold">{label}</p>
        {count && (
            <p className={cn(
                "text-[10px] font-bold mt-0.5",
                isComplete ? "text-success" : "text-muted-foreground"
            )}>
                {count}
            </p>
        )}
    </div>
);
