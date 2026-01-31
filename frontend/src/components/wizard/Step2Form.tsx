import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Helper for currency display
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

const formSchema = z.object({
    valor_base: z.coerce.number().min(0, 'Debe ser mayor o igual a 0'),
    iva_valor: z.coerce.number().min(0, 'Debe ser mayor o igual a 0'),
    admon: z.coerce.number().min(0, 'Debe ser mayor o igual a 0'),
    imprevistos: z.coerce.number().min(0, 'Debe ser mayor o igual a 0'),
    utilidad: z.coerce.number().min(0, 'Debe ser mayor o igual a 0'),
});

type FormValues = z.infer<typeof formSchema>;

interface Step2FormProps {
    initialData?: {
        valor_base: number;
        iva_valor: number;
        admon: number;
        imprevistos: number;
        utilidad: number;
        valor_total: number;
    };
    onSave: (data: FormValues) => Promise<void>;
    readOnly?: boolean;
    isSaving?: boolean;
}

export const Step2Form = ({ initialData, onSave, readOnly, isSaving }: Step2FormProps) => {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            valor_base: 0,
            iva_valor: 0,
            admon: 0,
            imprevistos: 0,
            utilidad: 0,
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                valor_base: initialData.valor_base,
                iva_valor: initialData.iva_valor,
                admon: initialData.admon,
                imprevistos: initialData.imprevistos,
                utilidad: initialData.utilidad,
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
            <div>
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-6">Detalle Financiero</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Inputs Column */}
                <div className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="valor_base" className="text-sm font-medium">Valor Base</Label>
                        <Input
                            id="valor_base"
                            type="number"
                            min="0"
                            step="any"
                            {...form.register('valor_base')}
                            disabled={readOnly}
                            className="h-11 font-semibold text-base"
                        />
                        {form.formState.errors.valor_base && (
                            <p className="text-sm text-destructive">{form.formState.errors.valor_base.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="iva_valor" className="text-sm font-medium">IVA</Label>
                        <Input
                            id="iva_valor"
                            type="number"
                            min="0"
                            step="any"
                            {...form.register('iva_valor')}
                            disabled={readOnly}
                            className="h-11 font-semibold text-base"
                        />
                        {form.formState.errors.iva_valor && (
                            <p className="text-sm text-destructive">{form.formState.errors.iva_valor.message}</p>
                        )}
                    </div>

                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">A.I.U (Opcional)</p>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="admon" className="text-xs">Admon</Label>
                                <Input
                                    id="admon"
                                    type="number"
                                    min="0"
                                    step="any"
                                    {...form.register('admon')}
                                    disabled={readOnly}
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="imprevistos" className="text-xs">Impr.</Label>
                                <Input
                                    id="imprevistos"
                                    type="number"
                                    min="0"
                                    step="any"
                                    {...form.register('imprevistos')}
                                    disabled={readOnly}
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="utilidad" className="text-xs">Util.</Label>
                                <Input
                                    id="utilidad"
                                    type="number"
                                    min="0"
                                    step="any"
                                    {...form.register('utilidad')}
                                    disabled={readOnly}
                                    className="h-10"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Total Display - Enterprise styling */}
                <Card className="bg-muted/30 flex flex-col justify-center items-center text-center">
                    <CardContent className="pt-6">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Total Calculado
                        </p>
                        <div className="text-3xl font-semibold tracking-tight tabular-nums">
                            {initialData ? formatCurrency(initialData.valor_total) : '$ 0'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                            Guarde los cambios para recalcular el total oficial.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {!readOnly && (
                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button type="submit" disabled={isSaving} className="min-w-[140px]">
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Recalculando...
                            </>
                        ) : (
                            'Guardar y Calcular'
                        )}
                    </Button>
                </div>
            )}
        </form>
    );
};
