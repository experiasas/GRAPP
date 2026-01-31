import { WizardEstado, Anexo, TipoAnexo } from '@/api/wizardApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Loader2, Send } from 'lucide-react';
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
    if (!estado) return <div className="animate-pulse h-96 bg-slate-100 rounded-xl" />;

    const obligatorios = tiposAnexo.filter(t => t.obligatorio);
    const missingObligatorios = obligatorios.filter(t => !anexos.some(a => a.tipo.id === t.id));

    return (
        <div className="sticky top-24 space-y-6">
            {/* Primary Metrics Card - Dashboard Style */}
            <Card className="shadow-sm">
                <CardContent className="pt-6 pb-6">
                    {/* Estado Metric */}
                    <div className="text-center pb-6 border-b">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Estado</p>
                        <p className="text-3xl font-bold mb-2">{estado.estado === 'RADICADA' ? 'Radicada' : 'Borrador'}</p>
                        <Badge
                            variant={estado.estado === 'RADICADA' ? 'default' : 'outline'}
                            className="font-medium text-xs"
                        >
                            {estado.estado === 'RADICADA' ? 'Validación en curso' : 'En edición'}
                        </Badge>
                    </div>

                    {/* Contract Info - Compact Metric */}
                    {estado.contrato_detalle && (
                        <div className="pt-6 pb-6 border-b">
                            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Contrato</p>
                            <p className="text-2xl font-bold mb-1">{estado.contrato_detalle.numero}</p>
                            {estado.contrato_detalle.objeto && (
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{estado.contrato_detalle.objeto}</p>
                            )}
                        </div>
                    )}

                    {/* Total Value - Hero Metric */}
                    <div className="pt-6 text-center">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Valor Total</p>
                        <p className="text-4xl font-bold tabular-nums">
                            {formatCurrency(estado.datos_financieros.valor_total)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Financial Summary - Clean Breakdown */}
            <Card className="shadow-sm bg-muted/20">
                <CardContent className="pt-5 pb-5">
                    <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-4">Desglose</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Base</span>
                            <span className="font-semibold tabular-nums">{formatCurrency(estado.datos_financieros.valor_base)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">IVA</span>
                            <span className="font-semibold tabular-nums">{formatCurrency(estado.datos_financieros.iva_valor)}</span>
                        </div>
                        {(estado.datos_financieros.admon > 0 || estado.datos_financieros.imprevistos > 0 || estado.datos_financieros.utilidad > 0) && (
                            <div className="flex justify-between items-center pt-2 border-t">
                                <span className="text-muted-foreground text-xs">AIU</span>
                                <span className="font-medium tabular-nums text-xs">{formatCurrency(estado.datos_financieros.admon + estado.datos_financieros.imprevistos + estado.datos_financieros.utilidad)}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Requirements Progress */}
            <Card className="shadow-sm">
                <CardContent className="pt-5 pb-5">
                    <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-4">Requisitos</h3>

                    {/* Progress Metrics Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <MetricBox
                            label="Paso 1"
                            isComplete={estado.step1_ok}
                        />
                        <MetricBox
                            label="Paso 2"
                            isComplete={estado.step2_ok}
                        />
                        <MetricBox
                            label="Anexos"
                            value={`${anexos.length}/${obligatorios.length}`}
                            isComplete={estado.anexos_ok}
                        />
                    </div>

                    {/* Missing Anexos - Compact */}
                    {missingObligatorios.length > 0 && (
                        <div className="pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Pendientes</p>
                            <div className="flex flex-wrap gap-1.5">
                                {missingObligatorios.map(t => (
                                    <Badge key={t.id} variant="outline" className="text-xs text-destructive border-destructive/30">
                                        {t.nombre}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Action Button */}
            <Button
                className="w-full h-12 text-base font-semibold shadow-sm"
                onClick={onSubmit}
                disabled={!canSubmit || isSaving || estado.estado !== 'BORRADOR'}
                variant={canSubmit ? "default" : "secondary"}
                size="lg"
            >
                {isSaving ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Radicando...
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4 mr-2" />
                        Radicar Cuenta
                    </>
                )}
            </Button>
            {!canSubmit && estado.estado === 'BORRADOR' && (
                <p className="text-center text-xs text-muted-foreground -mt-3">
                    Complete todos los requisitos
                </p>
            )}
        </div>
    );
};

// Metric Box Component for Progress Grid
const MetricBox = ({ label, value, isComplete }: { label: string; value?: string; isComplete: boolean }) => (
    <div className={cn(
        "text-center p-3 rounded-lg border transition-colors",
        isComplete
            ? "bg-primary/5 border-primary/20"
            : "bg-muted/30 border-border"
    )}>
        <p className="text-xs text-muted-foreground mb-1 font-medium">{label}</p>
        {value ? (
            <p className="text-lg font-bold tabular-nums">{value}</p>
        ) : (
            <div className={cn(
                "w-6 h-6 mx-auto rounded-full flex items-center justify-center",
                isComplete ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/30"
            )}>
                {isComplete && <span className="text-xs">✓</span>}
            </div>
        )}
    </div>
);

// Chip-style status indicator component (keep for compatibility)
const StatusChip = ({ label, isComplete }: { label: string; isComplete: boolean }) => (
    <Badge
        variant={isComplete ? "secondary" : "outline"}
        className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
            isComplete
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted text-muted-foreground border-border"
        )}
    >
        {label}
    </Badge>
);
