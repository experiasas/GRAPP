import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, ChevronRight, AlertTriangle, BadgeInfo } from 'lucide-react';
import type { ReglasSegSocial } from '@/api/wizardApi';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

const baseSchema = z.object({
    valor_base: z.coerce.number().min(0, 'Debe ser mayor o igual a 0'),
    iva_porcentaje: z.coerce.number().min(0).max(100).optional(),
    iva_valor: z.coerce.number().min(0).optional(),
    admon: z.coerce.number().min(0).optional(),
    imprevistos: z.coerce.number().min(0).optional(),
    utilidad: z.coerce.number().min(0).optional(),
    ibc_valor: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof baseSchema>;

interface Step2FormProps {
    initialData?: {
        valor_base: number;
        iva_porcentaje: number;
        iva_valor: number;
        admon: number;
        imprevistos: number;
        utilidad: number;
        valor_total: number;
        ibc_valor: number;
    };
    tipoDocumento?: 'CUENTA_COBRO' | 'FACTURA';
    reglasSegSocial?: ReglasSegSocial | null;
    /** null = no declarado aún, true/false = declarado en vinculación */
    responsableIva?: boolean | null;
    onSave: (data: FormValues) => Promise<void>;
    readOnly?: boolean;
    isSaving?: boolean;
}

export const Step2Form = ({
    initialData,
    tipoDocumento = 'CUENTA_COBRO',
    reglasSegSocial,
    responsableIva,
    onSave,
    readOnly,
    isSaving
}: Step2FormProps) => {
    const esFactura = tipoDocumento === 'FACTURA';
    const esCuentaCobro = !esFactura;
    const requiereSS = reglasSegSocial?.requiere_ss || false;

    // Si es factura y el proveedor declaró NO ser responsable de IVA → ocultar IVA
    const mostrarIva = esFactura && responsableIva !== false;
    // Si aún no ha declarado (null/undefined) mostramos igual para no bloquear

    const form = useForm<FormValues>({
        resolver: zodResolver(baseSchema),
        defaultValues: {
            valor_base: 0,
            iva_porcentaje: esFactura ? 19 : 0,
            iva_valor: 0,
            admon: 0,
            imprevistos: 0,
            utilidad: 0,
            ibc_valor: 0,
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                valor_base: initialData.valor_base,
                iva_porcentaje: esFactura ? initialData.iva_porcentaje : 0,
                iva_valor: esFactura ? initialData.iva_valor : 0,
                admon: esFactura ? initialData.admon : 0,
                imprevistos: esFactura ? initialData.imprevistos : 0,
                utilidad: esFactura ? initialData.utilidad : 0,
                ibc_valor: esCuentaCobro ? (initialData.ibc_valor || 0) : 0,
            });
        }
    }, [initialData, form, esFactura, esCuentaCobro]);

    // Para factura: recalcular IVA cuando cambia el porcentaje o el valor base
    const valorBase = form.watch('valor_base');
    const ivaPorcentaje = form.watch('iva_porcentaje');

    useEffect(() => {
        if (esFactura && valorBase >= 0 && ivaPorcentaje !== undefined && ivaPorcentaje >= 0) {
            const iva = valorBase * (ivaPorcentaje / 100);
            form.setValue('iva_valor', Math.round(iva * 100) / 100);
        }
    }, [valorBase, ivaPorcentaje, esFactura, form]);

    // Forzar IVA = 0 en cuenta de cobro o cuando proveedor no es responsable de IVA
    useEffect(() => {
        if (esCuentaCobro) {
            form.setValue('iva_porcentaje', 0);
            form.setValue('iva_valor', 0);
            form.setValue('admon', 0);
            form.setValue('imprevistos', 0);
            form.setValue('utilidad', 0);
        } else if (responsableIva === false) {
            form.setValue('iva_porcentaje', 0);
            form.setValue('iva_valor', 0);
        }
    }, [esCuentaCobro, responsableIva, form]);

    const onSubmit = async (data: FormValues) => {
        // Limpiar campos que no aplican antes de enviar
        if (esCuentaCobro) {
            data.iva_porcentaje = 0;
            data.iva_valor = 0;
            data.admon = 0;
            data.imprevistos = 0;
            data.utilidad = 0;
        }
        if (esFactura) {
            data.ibc_valor = 0;
            if (responsableIva === false) {
                data.iva_porcentaje = 0;
                data.iva_valor = 0;
            }
        }

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
            <div className="grid md:grid-cols-2 gap-8">
                {/* Columna izquierda: campos de entrada */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-1 h-5 bg-primary rounded-full" />
                        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                            {esFactura ? 'Valores de la Factura' : 'Valores de la Cuenta de Cobro'}
                        </h3>
                    </div>

                    {/* Valor Base - Siempre visible */}
                    <div className="form-group">
                        <Label htmlFor="valor_base" className="form-label">
                            Valor Base
                        </Label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                                id="valor_base"
                                type="number"
                                min="0"
                                step="any"
                                {...form.register('valor_base')}
                                disabled={readOnly}
                                className="form-input pl-8 font-semibold text-lg"
                            />
                        </div>
                        {form.formState.errors.valor_base && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.valor_base.message}</p>
                        )}
                    </div>

                    {/* ============================================ */}
                    {/* FACTURA (Persona Juridica): IVA + AIU        */}
                    {/* ============================================ */}
                    {esFactura && (
                        <>
                            {/* Badge: No responsable de IVA */}
                            {responsableIva === false && (
                                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <BadgeInfo className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-blue-800">
                                            Proveedor no responsable de IVA
                                        </p>
                                        <p className="text-xs text-blue-700 mt-1">
                                            Según la información tributaria declarada en vinculación, este proveedor
                                            no cobra IVA. El total corresponde únicamente al valor base.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* IVA: solo si es responsable (o no declarado aún) */}
                            {mostrarIva && (
                                <div className="space-y-4">
                                    <div className="form-group">
                                        <Label htmlFor="iva_porcentaje" className="form-label flex justify-between">
                                            Tarifa de IVA
                                            <span className="text-xs text-muted-foreground font-normal">Según condición tributaria</span>
                                        </Label>
                                        <Select
                                            value={String(form.watch('iva_porcentaje') ?? 19)}
                                            onValueChange={(val) => form.setValue('iva_porcentaje', Number(val), { shouldDirty: true })}
                                            disabled={readOnly}
                                        >
                                            <SelectTrigger className="form-input h-10 text-sm">
                                                <SelectValue placeholder="Seleccione tarifa" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">0% — Excluido / Exento</SelectItem>
                                                <SelectItem value="5">5% — Tarifa diferencial</SelectItem>
                                                <SelectItem value="19">19% — Tarifa general</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {form.formState.errors.iva_porcentaje && (
                                            <p className="text-sm text-destructive mt-1">{form.formState.errors.iva_porcentaje.message}</p>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <Label htmlFor="iva_valor" className="form-label flex justify-between">
                                            Valor IVA
                                            <span className="text-xs text-muted-foreground font-normal">Calculado autom.</span>
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                            <Input
                                                id="iva_valor"
                                                type="number"
                                                {...form.register('iva_valor')}
                                                readOnly
                                                disabled
                                                className="form-input pl-8 font-semibold text-lg bg-muted/50 opacity-80 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AIU (Opcional) */}
                            <div className="pt-4 border-t border-border">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-5 bg-muted-foreground/30 rounded-full" />
                                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                        A.I.U (Opcional)
                                    </h3>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="form-group">
                                        <Label htmlFor="admon" className="text-xs text-muted-foreground">
                                            Administracion
                                        </Label>
                                        <Input
                                            id="admon"
                                            type="number"
                                            min="0"
                                            step="any"
                                            {...form.register('admon')}
                                            disabled={readOnly}
                                            className="form-input h-10 text-sm"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <Label htmlFor="imprevistos" className="text-xs text-muted-foreground">
                                            Imprevistos
                                        </Label>
                                        <Input
                                            id="imprevistos"
                                            type="number"
                                            min="0"
                                            step="any"
                                            {...form.register('imprevistos')}
                                            disabled={readOnly}
                                            className="form-input h-10 text-sm"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <Label htmlFor="utilidad" className="text-xs text-muted-foreground">
                                            Utilidad
                                        </Label>
                                        <Input
                                            id="utilidad"
                                            type="number"
                                            min="0"
                                            step="any"
                                            {...form.register('utilidad')}
                                            disabled={readOnly}
                                            className="form-input h-10 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ============================================ */}
                    {/* CUENTA DE COBRO (Persona Natural): SS + IBC  */}
                    {/* ============================================ */}
                    {esCuentaCobro && reglasSegSocial?.aplica && (
                        <div className="space-y-4">
                            {/* Alerta: Seguridad Social Obligatoria */}
                            {requiereSS && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-amber-800">
                                                Seguridad Social Obligatoria
                                            </p>
                                            <p className="text-xs text-amber-700 mt-1">
                                                Su acumulado mensual ({formatCurrency(reglasSegSocial.acumulado_mensual || 0)})
                                                sumado al valor actual supera el umbral de {formatCurrency(reglasSegSocial.umbral || 0)}.
                                                Debe reportar el IBC y adjuntar la planilla de seguridad social.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Alerta: Seguridad Social No Requerida */}
                            {!requiereSS && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-green-800">
                                                Seguridad Social No Requerida
                                            </p>
                                            <p className="text-xs text-green-700 mt-1">
                                                Su acumulado mensual ({formatCurrency(reglasSegSocial.acumulado_mensual || 0)})
                                                no supera el umbral de {formatCurrency(reglasSegSocial.umbral || 0)}.
                                                No es necesario adjuntar planilla de seguridad social.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Campo IBC: solo si requiere SS */}
                            {requiereSS && (
                                <div className="form-group">
                                    <Label htmlFor="ibc_valor" className="form-label">
                                        Ingreso Base de Cotizacion (IBC)
                                        <span className="text-xs text-muted-foreground font-normal ml-1">
                                            (min. {reglasSegSocial.porcentaje_minimo_ibc}% del valor base)
                                        </span>
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            id="ibc_valor"
                                            type="number"
                                            min="0"
                                            step="any"
                                            {...form.register('ibc_valor')}
                                            disabled={readOnly}
                                            className="form-input pl-8 font-semibold text-lg"
                                        />
                                    </div>
                                    {form.formState.errors.ibc_valor && (
                                        <p className="text-sm text-destructive mt-1">{form.formState.errors.ibc_valor.message}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Monto sobre el cual pago seguridad social este periodo
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Columna derecha: Total + Acumulado */}
                <div className="flex flex-col justify-center gap-6">
                    {/* Total Calculado */}
                    <div className="bg-gradient-to-br from-primary/5 to-accent/50 rounded-2xl border border-primary/10 p-8 text-center">
                        {/* <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <TrendingUp className="w-7 h-7 text-primary" />
                        </div> */}
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Total Calculado
                        </p>
                        <div className="text-4xl font-bold text-foreground tracking-tight tabular-nums mb-4">
                            {initialData ? formatCurrency(initialData.valor_total) : '$ 0'}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Guarde los cambios para recalcular el total oficial del documento.
                        </p>
                    </div>

                    {/* Indicador de acumulado mensual: solo persona natural */}
                    {esCuentaCobro && reglasSegSocial?.aplica && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                Acumulado del Mes
                            </p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Radicaciones previas</span>
                                    <span className="font-semibold">{formatCurrency(reglasSegSocial.acumulado_mensual || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Valor actual</span>
                                    <span className="font-semibold">{formatCurrency(reglasSegSocial.valor_actual || 0)}</span>
                                </div>
                                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold">
                                    <span>Total proyectado</span>
                                    <span>{formatCurrency(reglasSegSocial.total_proyectado || 0)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Umbral SS</span>
                                    <span>{formatCurrency(reglasSegSocial.umbral || 0)}</span>
                                </div>
                                {/* Barra de progreso */}
                                <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                                    <div
                                        className={`h-2 rounded-full transition-all ${requiereSS ? 'bg-amber-500' : 'bg-green-500'}`}
                                        style={{
                                            width: `${Math.min(((reglasSegSocial.total_proyectado || 0) / (reglasSegSocial.umbral || 1)) * 100, 100)}%`
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Boton de accion */}
            {!readOnly && (
                <div className="flex justify-end pt-6 border-t border-border">
                    <Button
                        type="submit"
                        disabled={isSaving}
                        className="btn-primary min-w-[180px] h-11"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Calculando...
                            </>
                        ) : (
                            <>
                                Guardar y Calcular
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </>
                        )}
                    </Button>
                </div>
            )}
        </form>
    );
};
