import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Lock } from 'lucide-react';

const formSchema = z.object({
    numero: z.string().min(1, 'El número es obligatorio'),
    periodo: z.string().min(1, 'El periodo es obligatorio'),
    concepto: z.string().min(1, 'El concepto es obligatorio'),
    observaciones: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Step1FormProps {
    initialData?: {
        numero: string;
        periodo: string;
        concepto: string;
        observaciones?: string;
    };
    contratoDetalle?: {
        id: number;
        numero: string;
        objeto?: string;
        fecha_inicio?: string;
        fecha_fin?: string;
    } | null;
    onSave: (data: FormValues) => Promise<void>;
    readOnly?: boolean;
    isSaving?: boolean;
}

export const Step1Form = ({ initialData, contratoDetalle, onSave, readOnly, isSaving }: Step1FormProps) => {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            numero: '',
            periodo: '',
            concepto: '',
            observaciones: '',
        },
    });

    // Update form when initialData loads or changes
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
            // DRF Error Handling: { field: ["Error msg"] }
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
            {/* Contract Field - Read-only if pre-assigned */}
            {contratoDetalle && (
                <Card className="border-muted bg-muted/20">
                    <CardContent className="pt-5 pb-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Contrato Asignado</p>
                            </div>
                            <Badge variant="outline" className="text-xs">Asignado</Badge>
                        </div>
                        <p className="text-xl font-bold mb-2">{contratoDetalle.numero}</p>
                        {contratoDetalle.objeto && (
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{contratoDetalle.objeto}</p>
                        )}
                        {(contratoDetalle.fecha_inicio || contratoDetalle.fecha_fin) && (
                            <div className="mt-3 pt-3 border-t">
                                <p className="text-xs text-muted-foreground mb-1">Vigencia</p>
                                <p className="text-sm font-medium tabular-nums">
                                    {contratoDetalle.fecha_inicio || '—'} a {contratoDetalle.fecha_fin || '—'}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Datos Generales Section */}
            <div className="space-y-6">
                <div>
                    <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-4">Información del Documento</h3>
                </div>

                {/* Número y Periodo - Grid 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="numero" className="text-sm font-medium">Número de Cuenta/Factura</Label>
                        <Input
                            id="numero"
                            {...form.register('numero')}
                            disabled={readOnly}
                            placeholder="Ej: 001-2024"
                            className="h-11"
                        />
                        {form.formState.errors.numero && (
                            <p className="text-sm text-destructive">{form.formState.errors.numero.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="periodo" className="text-sm font-medium">Período</Label>
                        <Input
                            id="periodo"
                            {...form.register('periodo')}
                            disabled={readOnly}
                            placeholder="Ej: Enero 2024"
                            className="h-11"
                        />
                        {form.formState.errors.periodo && (
                            <p className="text-sm text-destructive">{form.formState.errors.periodo.message}</p>
                        )}
                    </div>
                </div>

                {/* Concepto */}
                <div className="space-y-2">
                    <Label htmlFor="concepto" className="text-sm font-medium">Concepto</Label>
                    <Input
                        id="concepto"
                        {...form.register('concepto')}
                        disabled={readOnly}
                        placeholder="Descripción breve del concepto"
                        className="h-11"
                    />
                    {form.formState.errors.concepto && (
                        <p className="text-sm text-destructive">{form.formState.errors.concepto.message}</p>
                    )}
                </div>

                {/* Observaciones */}
                <div className="space-y-2">
                    <Label htmlFor="observaciones" className="text-sm font-medium">Observaciones</Label>
                    <Textarea
                        id="observaciones"
                        {...form.register('observaciones')}
                        disabled={readOnly}
                        placeholder="Notas adicionales (opcional)"
                        rows={4}
                        className="resize-none"
                    />
                    {form.formState.errors.observaciones && (
                        <p className="text-sm text-destructive">{form.formState.errors.observaciones.message}</p>
                    )}
                </div>
            </div>

            {!readOnly && (
                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSaving} className="min-w-[140px]">
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            'Guardar Cambios'
                        )}
                    </Button>
                </div>
            )}
        </form>
    );
};
