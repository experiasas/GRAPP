import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
    numero: z.string().optional(),
    periodo: z.string().min(1, 'El periodo es obligatorio'),
    concepto: z.string().min(1, 'El concepto es obligatorio'),
    observaciones: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Step1FormProps {
    initialData?: {
        numero?: string;
        periodo?: string;
        concepto?: string;
        observaciones?: string;
    };
    contratoDetalle?: {
        id: number;
        numero: string;
        objeto?: string;
        fecha_inicio?: string;
        fecha_fin?: string;
    } | null;
    tipoDocumento?: 'CUENTA_COBRO' | 'FACTURA';
    onSave: (data: FormValues) => Promise<void>;
    readOnly?: boolean;
    isSaving?: boolean;
}

export const Step1Form = ({ initialData, contratoDetalle, tipoDocumento = 'CUENTA_COBRO', onSave, readOnly, isSaving }: Step1FormProps) => {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            numero: '',
            periodo: '',
            concepto: '',
            observaciones: '',
        },
    });

    const esFactura = tipoDocumento === 'FACTURA';

    useEffect(() => {
        if (initialData) {
            form.reset({
                numero: initialData.numero || '',
                periodo: initialData.periodo || '',
                concepto: initialData.concepto || '',
                observaciones: initialData.observaciones || '',
            });
        }
    }, [initialData, form]);

    const onSubmit = async (data: FormValues) => {
        try {
            await onSave(data);
        } catch (error: any) {
            if (error && typeof error === 'object') {
                Object.keys(error).forEach((key) => {
                    if (key in data) {
                        form.setError(key as keyof FormValues, {
                            type: 'manual',
                            message: Array.isArray(error[key]) ? error[key][0] : error[key],
                        });
                    }
                });
            }
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Contract Card - Modern Dashboard Style */}
            {contratoDetalle && (
                <div className="bg-accent/30 rounded-xl border border-accent p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Lock className="h-4 w-4 text-primary" />
                            </div>
                            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                Contrato Asignado
                            </p>
                        </div>
                        <Badge className="bg-primary/10 text-primary border-0 font-medium">
                            Asignado
                        </Badge>
                    </div>
                    <p className="text-2xl font-bold text-foreground mb-2">{contratoDetalle.numero}</p>
                    {contratoDetalle.objeto && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                            {contratoDetalle.objeto}
                        </p>
                    )}
                    {(contratoDetalle.fecha_inicio || contratoDetalle.fecha_fin) && (
                        <div className="flex items-center gap-2 pt-4 border-t border-border/50">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground tabular-nums">
                                {contratoDetalle.fecha_inicio || '—'} → {contratoDetalle.fecha_fin || '—'}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Form Fields */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-5 bg-primary rounded-full" />
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Información del Documento
                    </h3>
                </div>

                {/* Grid: Number & Period */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="form-group">
                        <Label htmlFor="numero" className="form-label">
                            {esFactura ? 'Número de Factura' : 'Número de Cuenta de Cobro'}
                        </Label>
                        <Input
                            id="numero"
                            {...form.register('numero')}
                            readOnly={true}
                            disabled={true}
                            placeholder="Se generará automáticamente al radicar"
                            className={cn(
                                "form-input",
                                "bg-muted cursor-not-allowed opacity-70"
                            )}
                        />
                        {form.formState.errors.numero && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.numero.message}</p>
                        )}
                    </div>

                    <div className="form-group">
                        <Label htmlFor="periodo" className="form-label">
                            Periodo del servicio
                        </Label>
                        <Input
                            id="periodo"
                            type="month"
                            {...form.register('periodo')}
                            readOnly={readOnly}
                            disabled={readOnly}
                            className={cn(
                                "form-input",
                                readOnly && "bg-muted cursor-not-allowed opacity-70"
                            )}
                        />
                        {form.formState.errors.periodo && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.periodo.message}</p>
                        )}
                    </div>
                </div>

                {/* Concepto */}
                <div className="form-group">
                    <Label htmlFor="concepto" className="form-label">
                        Concepto
                    </Label>
                    <Input
                        id="concepto"
                        {...form.register('concepto')}
                        readOnly={readOnly}
                        disabled={readOnly}
                        placeholder="Describa brevemente el servicio prestado"
                        className={cn(
                            "form-input",
                            readOnly && "bg-muted cursor-not-allowed opacity-70"
                        )}
                    />
                    {form.formState.errors.concepto && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.concepto.message}</p>
                    )}
                </div>

                {/* Observaciones */}
                <div className="form-group">
                    <Label htmlFor="observaciones" className="form-label">
                        Observaciones
                        <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                    </Label>
                    <Textarea
                        id="observaciones"
                        {...form.register('observaciones')}
                        readOnly={readOnly}
                        disabled={readOnly}
                        placeholder="Información adicional para la radicación"
                        rows={4}
                        className={cn(
                            "resize-none rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary/20",
                            readOnly && "bg-muted cursor-not-allowed opacity-70"
                        )}
                    />
                    {form.formState.errors.observaciones && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.observaciones.message}</p>
                    )}
                </div>
            </div>

            {/* Action Button */}
            {!readOnly && (
                <div className="flex justify-end pt-6 border-t border-border">
                    <Button
                        type="submit"
                        disabled={isSaving}
                        className="btn-primary min-w-[160px] h-11"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                Continuar
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </>
                        )}
                    </Button>
                </div>
            )}
        </form>
    );
};
