import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { adminContratosAPI, type EstadoContrato, type PrioridadContrato } from "@/lib/adminContratosApi";
import { adminEmpresasAPI, type EmpresaOption } from "@/lib/adminEmpresasApi";
import { adminTercerosAPI, type TerceroListItem } from "@/lib/adminTercerosApi";

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const formSchema = z.object({
    empresa:                  z.coerce.number().min(1, "La empresa es requerida"),
    contratista:              z.coerce.number().min(1, "El contratista es requerido"),
    tipo_contrato:            z.coerce.number().optional().nullable(),
    numero:                   z.string().min(1, "El número es requerido"),
    objeto:                   z.string().min(1, "El objeto es requerido"),
    estado:                   z.string().min(1),
    prioridad:                z.string().min(1),
    fecha_inicio:             z.string().min(1, "La fecha de inicio es requerida"),
    fecha_fin:                z.string().optional(),
    valor_sin_iva:            z.coerce.number().min(0),
    iva:                      z.coerce.number().min(0),
    valor_total:              z.coerce.number().min(0),
    dependencia_solicitante:  z.string().optional(),
    observaciones:            z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function FieldRow({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

const ESTADOS: { value: EstadoContrato; label: string }[] = [
    { value: "BORRADOR",   label: "Borrador" },
    { value: "FIRMADO",    label: "Firmado" },
    { value: "VIGENTE",    label: "Vigente" },
    { value: "SUSPENDIDO", label: "Suspendido" },
    { value: "LIQUIDADO",  label: "Liquidado" },
    { value: "FINALIZADO", label: "Finalizado" },
    { value: "ANULADO",    label: "Anulado" },
];

const PRIORIDADES: { value: PrioridadContrato; label: string }[] = [
    { value: "ALTA",  label: "Alta" },
    { value: "MEDIA", label: "Media" },
    { value: "BAJA",  label: "Baja" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    open:        boolean;
    contratoId:  number | null;
    onClose:     () => void;
    onSuccess:   () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

export function ContratoFormModal({ open, contratoId, onClose, onSuccess }: Props) {
    const isEditMode = contratoId !== null;

    // ── Catálogos ─────────────────────────────────────────────────────────────
    const [empresas, setEmpresas]       = useState<EmpresaOption[]>([]);
    const [terceros, setTerceros]       = useState<TerceroListItem[]>([]);
    const [tiposContrato, setTiposContrato] = useState<{ id: number; nombre: string }[]>([]);
    const [loadingCatalogs, setLoadingCatalogs] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoadingCatalogs(true);
        Promise.all([
            adminEmpresasAPI.list({ page: 1, page_size: 200 }),
            adminTercerosAPI.list({ estado: "APROBADO", page_size: 200 }),
            adminContratosAPI.tiposContrato(),
        ]).then(([emp, terc, tipos]) => {
            setEmpresas(emp.results as unknown as EmpresaOption[]);
            setTerceros(terc.results);
            setTiposContrato(tipos);
        }).finally(() => setLoadingCatalogs(false));
    }, [open]);

    // ── Formulario ────────────────────────────────────────────────────────────
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            empresa: 0, contratista: 0, tipo_contrato: null,
            numero: "", objeto: "",
            estado: "BORRADOR", prioridad: "MEDIA",
            fecha_inicio: "", fecha_fin: "",
            valor_sin_iva: 0, iva: 0, valor_total: 0,
            dependencia_solicitante: "", observaciones: "",
        },
    });

    const { isSubmitting } = form.formState;

    // ── Auto-calcular valor_total ──────────────────────────────────────────────
    const valorSinIva = useWatch({ control: form.control, name: "valor_sin_iva" });
    const iva         = useWatch({ control: form.control, name: "iva" });
    useEffect(() => {
        const total = (Number(valorSinIva) || 0) + (Number(iva) || 0);
        form.setValue("valor_total", total, { shouldValidate: false });
    }, [valorSinIva, iva]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Cargar datos en modo edición ───────────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        if (!isEditMode) {
            form.reset({
                empresa: 0, contratista: 0, tipo_contrato: null,
                numero: "", objeto: "",
                estado: "BORRADOR", prioridad: "MEDIA",
                fecha_inicio: "", fecha_fin: "",
                valor_sin_iva: 0, iva: 0, valor_total: 0,
                dependencia_solicitante: "", observaciones: "",
            });
            return;
        }
        adminContratosAPI.getDetalle(contratoId).then(d => {
            form.reset({
                empresa:                 d.empresa.id,
                contratista:             d.contratista.id,
                tipo_contrato:           d.tipo_contrato?.id ?? null,
                numero:                  d.numero,
                objeto:                  d.objeto,
                estado:                  d.estado,
                prioridad:               d.prioridad,
                fecha_inicio:            d.fecha_inicio ?? "",
                fecha_fin:               d.fecha_fin ?? "",
                valor_sin_iva:           parseFloat(d.valor_sin_iva) || 0,
                iva:                     parseFloat(d.iva) || 0,
                valor_total:             parseFloat(d.valor_total) || 0,
                dependencia_solicitante: d.dependencia_solicitante ?? "",
                observaciones:           d.observaciones ?? "",
            });
        }).catch(() => {/* formulario queda vacío */});
    }, [open, contratoId, isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

    function handleClose() { form.reset(); onClose(); }

    async function onSubmit(values: FormValues) {
        try {
            const payload = {
                empresa:                 values.empresa,
                contratista:             values.contratista,
                tipo_contrato:           values.tipo_contrato || null,
                numero:                  values.numero,
                objeto:                  values.objeto,
                estado:                  values.estado as EstadoContrato,
                prioridad:               values.prioridad as PrioridadContrato,
                fecha_inicio:            values.fecha_inicio,
                fecha_fin:               values.fecha_fin || null,
                valor_sin_iva:           values.valor_sin_iva,
                iva:                     values.iva,
                valor_total:             values.valor_total,
                dependencia_solicitante: values.dependencia_solicitante || "",
                observaciones:           values.observaciones || "",
            };

            if (isEditMode) {
                await adminContratosAPI.editar(contratoId, payload);
            } else {
                await adminContratosAPI.crear(payload);
            }
            form.reset();
            onSuccess();
        } catch (err: unknown) {
            if (err && typeof err === "object" && !(err instanceof Error)) {
                const fieldErrors = err as Record<string, string | string[]>;
                Object.entries(fieldErrors).forEach(([field, msgs]) => {
                    const msg = Array.isArray(msgs) ? msgs[0] : String(msgs);
                    const knownFields: (keyof FormValues)[] = [
                        "empresa", "contratista", "numero", "objeto",
                        "fecha_inicio", "valor_sin_iva", "iva", "valor_total",
                    ];
                    if (knownFields.includes(field as keyof FormValues)) {
                        form.setError(field as keyof FormValues, { message: msg });
                    } else {
                        form.setError("root", { message: msg });
                    }
                });
            } else {
                form.setError("root", { message: (err as Error).message ?? "Error al guardar el contrato." });
            }
        }
    }

    if (!open) return null;

    const selectClass = "w-full h-9 rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50";

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] bg-black/40 overflow-y-auto">
            <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden mb-8">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div>
                        <p className="text-[15px] font-semibold text-foreground">
                            {isEditMode ? "Editar contrato" : "Nuevo contrato"}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                            {isEditMode
                                ? "Modifica los datos del contrato"
                                : "Registra un nuevo contrato en el sistema"}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Formulario */}
                <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                            {/* ── Sección: Partes ──────────────────────── */}
                            <fieldset className="space-y-3">
                                <legend className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">
                                    Partes del contrato
                                </legend>

                                {/* Empresa */}
                                <FormField control={form.control} name="empresa" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[13px]">
                                            Empresa <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <select
                                                {...field}
                                                disabled={loadingCatalogs}
                                                className={selectClass}
                                                value={field.value || ""}
                                                onChange={e => field.onChange(Number(e.target.value))}
                                            >
                                                <option value="">
                                                    {loadingCatalogs ? "Cargando..." : "Seleccionar empresa..."}
                                                </option>
                                                {empresas.map(e => (
                                                    <option key={e.id} value={e.id}>
                                                        {e.nombre} — {e.nit}
                                                    </option>
                                                ))}
                                            </select>
                                        </FormControl>
                                        <FormMessage className="text-[11px]" />
                                    </FormItem>
                                )} />

                                {/* Contratista */}
                                <FormField control={form.control} name="contratista" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[13px]">
                                            Contratista <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <select
                                                {...field}
                                                disabled={loadingCatalogs}
                                                className={selectClass}
                                                value={field.value || ""}
                                                onChange={e => field.onChange(Number(e.target.value))}
                                            >
                                                <option value="">
                                                    {loadingCatalogs ? "Cargando..." : "Seleccionar contratista..."}
                                                </option>
                                                {terceros.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.nombre_completo} — {t.numero_documento}
                                                    </option>
                                                ))}
                                            </select>
                                        </FormControl>
                                        <FormMessage className="text-[11px]" />
                                    </FormItem>
                                )} />
                            </fieldset>

                            {/* ── Sección: Identificación ──────────────── */}
                            <fieldset className="space-y-3">
                                <legend className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">
                                    Identificación
                                </legend>

                                <FieldRow>
                                    {/* Número */}
                                    <FormField control={form.control} name="numero" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[13px]">
                                                Número <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="CT-2026-001" className="font-mono" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />

                                    {/* Tipo contrato */}
                                    <FormField control={form.control} name="tipo_contrato" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[13px]">Tipo de contrato</FormLabel>
                                            <FormControl>
                                                <select
                                                    disabled={loadingCatalogs}
                                                    className={selectClass}
                                                    value={field.value ?? ""}
                                                    onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                                >
                                                    <option value="">Sin tipo</option>
                                                    {tiposContrato.map(t => (
                                                        <option key={t.id} value={t.id}>{t.nombre}</option>
                                                    ))}
                                                </select>
                                            </FormControl>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                </FieldRow>

                                {/* Objeto */}
                                <FormField control={form.control} name="objeto" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[13px]">
                                            Objeto <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <textarea
                                                rows={3}
                                                placeholder="Descripción del objeto del contrato..."
                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[11px]" />
                                    </FormItem>
                                )} />

                                {/* Dependencia */}
                                <FormField control={form.control} name="dependencia_solicitante" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[13px]">Dependencia solicitante</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej. Gerencia de proyectos" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )} />
                            </fieldset>

                            {/* ── Sección: Estado y prioridad ──────────── */}
                            <fieldset className="space-y-3">
                                <legend className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">
                                    Estado y prioridad
                                </legend>
                                <FieldRow>
                                    <FormField control={form.control} name="estado" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[13px]">Estado</FormLabel>
                                            <FormControl>
                                                <select {...field} className={selectClass}>
                                                    {ESTADOS.map(e => (
                                                        <option key={e.value} value={e.value}>{e.label}</option>
                                                    ))}
                                                </select>
                                            </FormControl>
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="prioridad" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[13px]">Prioridad</FormLabel>
                                            <FormControl>
                                                <select {...field} className={selectClass}>
                                                    {PRIORIDADES.map(p => (
                                                        <option key={p.value} value={p.value}>{p.label}</option>
                                                    ))}
                                                </select>
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </FieldRow>
                            </fieldset>

                            {/* ── Sección: Fechas ───────────────────────── */}
                            <fieldset className="space-y-3">
                                <legend className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">
                                    Fechas
                                </legend>
                                <FieldRow>
                                    <FormField control={form.control} name="fecha_inicio" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[13px]">
                                                Fecha inicio <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="fecha_fin" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[13px]">Fecha fin</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </FieldRow>
                            </fieldset>

                            {/* ── Sección: Valor económico ─────────────── */}
                            <fieldset className="space-y-3">
                                <legend className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">
                                    Valor económico
                                </legend>
                                <FieldRow>
                                    <FormField control={form.control} name="valor_sin_iva" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[13px]">Valor sin IVA</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    placeholder="0"
                                                    className="tabular-nums"
                                                    {...field}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="iva" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[13px]">IVA</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    placeholder="0"
                                                    className="tabular-nums"
                                                    {...field}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </FieldRow>

                                {/* Total */}
                                <FormField control={form.control} name="valor_total" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[13px]">Valor total</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="1"
                                                className="tabular-nums font-semibold"
                                                {...field}
                                            />
                                        </FormControl>
                                        <p className="text-[11px] text-muted-foreground">
                                            Auto-calculado como Valor sin IVA + IVA. Puedes ajustarlo manualmente.
                                        </p>
                                        <FormMessage className="text-[11px]" />
                                    </FormItem>
                                )} />
                            </fieldset>

                            {/* ── Sección: Observaciones ───────────────── */}
                            <FormField control={form.control} name="observaciones" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[13px]">Observaciones</FormLabel>
                                    <FormControl>
                                        <textarea
                                            rows={2}
                                            placeholder="Observaciones adicionales..."
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                </FormItem>
                            )} />

                            {/* Error global */}
                            {form.formState.errors.root && (
                                <p className="text-[12px] text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                                    {form.formState.errors.root.message}
                                </p>
                            )}

                            {/* Acciones */}
                            <div className="flex gap-3 pt-1">
                                <Button type="button" variant="outline" size="sm" className="flex-1"
                                    onClick={handleClose} disabled={isSubmitting}>
                                    Cancelar
                                </Button>
                                <Button type="submit" size="sm" className="flex-1" disabled={isSubmitting || loadingCatalogs}>
                                    {isSubmitting
                                        ? <><Loader2 size={13} className="animate-spin mr-1.5" /> Guardando...</>
                                        : isEditMode ? "Guardar cambios" : "Crear contrato"
                                    }
                                </Button>
                            </div>

                        </form>
                    </Form>
                </div>
            </div>
        </div>
    );
}
