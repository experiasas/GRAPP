import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Loader2, Edit2, Plus, Trash2, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    adminEmpresasAPI,
    type EmpresaDetalle,
    type ContactoEmpresaDetalle,
    type TipoContacto,
} from "@/lib/adminEmpresasApi";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const TIPOS_CONTACTO: { value: TipoContacto; label: string }[] = [
    { value: "RL",  label: "Representante Legal" },
    { value: "GER", label: "Gerente" },
    { value: "TES", label: "Tesorería" },
    { value: "CON", label: "Contabilidad" },
    { value: "COM", label: "Comercial" },
    { value: "OTR", label: "Otro" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Schema del formulario de contacto
// ─────────────────────────────────────────────────────────────────────────────

const contactoSchema = z.object({
    nombre:    z.string().min(1, "El nombre es requerido"),
    tipo:      z.string().min(1, "Seleccione el tipo"),
    cargo:     z.string().optional(),
    email:     z.string().email("Email inválido").or(z.literal("")).optional(),
    telefono:  z.string().optional(),
    principal: z.boolean(),
});

type ContactoFormValues = z.infer<typeof contactoSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(nombre: string): string {
    const words = nombre.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("es-CO", {
        day: "2-digit", month: "long", year: "numeric",
    });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 mb-2">
            {children}
        </p>
    );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
    return (
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="text-[20px] font-bold text-foreground leading-none mt-0.5">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DetailSkeleton() {
    return (
        <div className="p-5 space-y-6">
            <div className="flex items-start gap-3">
                <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-5 w-16 rounded" />
                </div>
            </div>
            <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
            <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Formulario inline de contacto
// ─────────────────────────────────────────────────────────────────────────────

interface ContactoFormProps {
    empresaId:  number;
    contacto:   ContactoEmpresaDetalle | null;  // null = crear
    onSuccess:  (c: ContactoEmpresaDetalle) => void;
    onCancel:   () => void;
}

function ContactoForm({ empresaId, contacto, onSuccess, onCancel }: ContactoFormProps) {
    const form = useForm<ContactoFormValues>({
        resolver: zodResolver(contactoSchema),
        defaultValues: {
            nombre:    contacto?.nombre    ?? "",
            tipo:      contacto?.tipo      ?? "",
            cargo:     contacto?.cargo     ?? "",
            email:     contacto?.email     ?? "",
            telefono:  contacto?.telefono  ?? "",
            principal: contacto?.principal ?? false,
        },
    });

    const { isSubmitting } = form.formState;

    async function onSubmit(values: ContactoFormValues) {
        try {
            const payload = {
                nombre:    values.nombre,
                tipo:      values.tipo as TipoContacto,
                cargo:     values.cargo     || undefined,
                email:     values.email     || undefined,
                telefono:  values.telefono  || undefined,
                principal: values.principal,
            };

            let result: ContactoEmpresaDetalle;
            if (contacto) {
                result = await adminEmpresasAPI.editarContacto(empresaId, contacto.id, payload);
            } else {
                result = await adminEmpresasAPI.crearContacto(empresaId, payload);
            }
            onSuccess(result);
        } catch (err: unknown) {
            if (err && typeof err === "object" && !(err instanceof Error)) {
                const fieldErrors = err as Record<string, string[]>;
                Object.entries(fieldErrors).forEach(([field, msgs]) => {
                    const msg = Array.isArray(msgs) ? msgs[0] : String(msgs);
                    if (field in form.getValues()) {
                        form.setError(field as keyof ContactoFormValues, { message: msg });
                    } else {
                        form.setError("root", { message: msg });
                    }
                });
            } else {
                form.setError("root", { message: (err as Error).message ?? "Error al guardar." });
            }
        }
    }

    return (
        <div className="border border-border rounded-lg p-4 bg-muted/10">
            <p className="text-[12px] font-semibold text-foreground mb-3">
                {contacto ? "Editar contacto" : "Nuevo contacto"}
            </p>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">

                    {/* Nombre */}
                    <FormField control={form.control} name="nombre" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[12px]">
                                Nombre <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                                <Input placeholder="Carlos Viveros" className="h-8 text-[13px]" {...field} />
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                        </FormItem>
                    )} />

                    {/* Tipo + Cargo en fila */}
                    <div className="grid grid-cols-2 gap-2">
                        <FormField control={form.control} name="tipo" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[12px]">
                                    Tipo <span className="text-destructive">*</span>
                                </FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                        <SelectTrigger className="h-8 text-[13px]">
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {TIPOS_CONTACTO.map(t => (
                                            <SelectItem key={t.value} value={t.value}>
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage className="text-[11px]" />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="cargo" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[12px]">Cargo</FormLabel>
                                <FormControl>
                                    <Input placeholder="Gerente" className="h-8 text-[13px]" {...field} />
                                </FormControl>
                                <FormMessage className="text-[11px]" />
                            </FormItem>
                        )} />
                    </div>

                    {/* Email */}
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[12px]">Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="carlos@empresa.com" className="h-8 text-[13px]" {...field} />
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                        </FormItem>
                    )} />

                    {/* Teléfono */}
                    <FormField control={form.control} name="telefono" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[12px]">Teléfono</FormLabel>
                            <FormControl>
                                <Input placeholder="300 123 4567" className="h-8 text-[13px]" {...field} />
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                        </FormItem>
                    )} />

                    {/* Principal toggle */}
                    <FormField control={form.control} name="principal" render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center justify-between py-1">
                                <FormLabel className="text-[12px] font-medium cursor-pointer">
                                    Contacto principal
                                </FormLabel>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={field.value}
                                    onClick={() => field.onChange(!field.value)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                        field.value ? "bg-primary" : "bg-muted-foreground/30"
                                    }`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                        field.value ? "translate-x-4" : "translate-x-0.5"
                                    }`} />
                                </button>
                            </div>
                        </FormItem>
                    )} />

                    {/* Error global */}
                    {form.formState.errors.root && (
                        <p className="text-[11px] text-destructive bg-destructive/5 border border-destructive/20 rounded px-2.5 py-1.5">
                            {form.formState.errors.root.message}
                        </p>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-2 pt-1">
                        <Button type="button" variant="outline" size="sm" className="flex-1 h-8 text-[12px]" onClick={onCancel} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" size="sm" className="flex-1 h-8 text-[12px]" disabled={isSubmitting}>
                            {isSubmitting
                                ? <Loader2 size={12} className="animate-spin mr-1" />
                                : <Check size={12} className="mr-1" />
                            }
                            {contacto ? "Guardar" : "Agregar"}
                        </Button>
                    </div>

                </form>
            </Form>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    empresaId:     number | null;
    onClose:       () => void;
    onEditRequest: (id: number) => void;
    onUpdated:     () => void;
}

export function EmpresaDetailPanel({ empresaId, onClose, onEditRequest, onUpdated }: Props) {
    const [detalle, setDetalle]       = useState<EmpresaDetalle | null>(null);
    const [loading, setLoading]       = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Estado del formulario de contacto
    const [contactoForm, setContactoForm] = useState<
        null | { mode: "create" } | { mode: "edit"; contacto: ContactoEmpresaDetalle }
    >(null);

    // Confirmación de eliminación
    const [deletingId, setDeletingId]   = useState<number | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const loadDetalle = (id: number) => {
        setLoading(true);
        setFetchError(null);
        adminEmpresasAPI.getDetalle(id)
            .then(setDetalle)
            .catch(() => setFetchError("No se pudo cargar el detalle de la empresa."))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!empresaId) { setDetalle(null); setContactoForm(null); setDeletingId(null); return; }
        loadDetalle(empresaId);
    }, [empresaId]);

    // ── Contacto guardado ────────────────────────────────────────────────────
    function handleContactoSuccess(saved: ContactoEmpresaDetalle) {
        setContactoForm(null);
        if (!detalle) return;
        const sinEl = detalle.contactos.filter(c => c.id !== saved.id);
        setDetalle({ ...detalle, contactos: [...sinEl, saved].sort((a, b) => a.id - b.id) });
        onUpdated();
    }

    // ── Eliminar contacto ────────────────────────────────────────────────────
    async function handleDelete(contactoId: number) {
        if (!empresaId) return;
        setDeleteLoading(true);
        try {
            await adminEmpresasAPI.eliminarContacto(empresaId, contactoId);
            setDeletingId(null);
            if (detalle) {
                setDetalle({ ...detalle, contactos: detalle.contactos.filter(c => c.id !== contactoId) });
            }
            onUpdated();
        } catch {
            /* silencioso — reintentar */
        } finally {
            setDeleteLoading(false);
        }
    }

    const isOpen = empresaId !== null;
    const contactosActivos = detalle?.contactos.filter(c => c.activo) ?? [];

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
            )}

            <div className={`
                fixed inset-y-0 right-0 z-40
                w-full max-w-[480px]
                bg-background border-l border-border shadow-2xl
                flex flex-col
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? "translate-x-0" : "translate-x-full"}
            `}>
                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                    <p className="text-[14px] font-semibold text-foreground">Detalle de empresa</p>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Cuerpo ──────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <DetailSkeleton />
                    ) : fetchError ? (
                        <div className="p-5 text-center">
                            <p className="text-[13px] text-destructive">{fetchError}</p>
                            <button
                                onClick={() => empresaId && loadDetalle(empresaId)}
                                className="mt-2 text-[13px] text-primary hover:underline"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : detalle ? (
                        <div className="divide-y divide-border">

                            {/* ── Identidad ────────────────────────────── */}
                            <div className="p-5">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[15px] font-bold flex-shrink-0">
                                        {getInitials(detalle.nombre)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[16px] font-semibold text-foreground leading-snug">
                                            {detalle.nombre}
                                        </p>
                                        <p className="text-[12px] text-muted-foreground font-mono mt-0.5">
                                            NIT: {detalle.nit}
                                        </p>
                                        <div className="mt-2">
                                            <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
                                                detalle.activa ? "text-success" : "text-muted-foreground"
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    detalle.activa ? "bg-success" : "bg-muted-foreground"
                                                }`} />
                                                {detalle.activa ? "Activa" : "Inactiva"}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-1.5">
                                            Creada el {formatDate(detalle.fecha_creacion)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ── Personas de contacto ─────────────────── */}
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <SectionTitle>
                                        Personas de contacto ({contactosActivos.length})
                                    </SectionTitle>
                                    {contactoForm === null && (
                                        <button
                                            onClick={() => setContactoForm({ mode: "create" })}
                                            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                                        >
                                            <Plus size={12} />
                                            Agregar
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {/* Formulario de creación */}
                                    {contactoForm?.mode === "create" && (
                                        <ContactoForm
                                            empresaId={detalle.id}
                                            contacto={null}
                                            onSuccess={handleContactoSuccess}
                                            onCancel={() => setContactoForm(null)}
                                        />
                                    )}

                                    {/* Tarjetas de contactos existentes */}
                                    {contactosActivos.length === 0 && contactoForm === null && (
                                        <p className="text-[12px] text-muted-foreground">
                                            No hay contactos registrados.
                                        </p>
                                    )}

                                    {contactosActivos.map(c => (
                                        <div key={c.id}>
                                            {contactoForm?.mode === "edit" && contactoForm.contacto.id === c.id ? (
                                                <ContactoForm
                                                    empresaId={detalle.id}
                                                    contacto={c}
                                                    onSuccess={handleContactoSuccess}
                                                    onCancel={() => setContactoForm(null)}
                                                />
                                            ) : (
                                                <div className="p-3 rounded-lg border border-border bg-muted/20">
                                                    {/* Cabecera del contacto */}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="text-[13px] font-medium text-foreground">
                                                                    {c.nombre}
                                                                </p>
                                                                {c.principal && (
                                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                                                        Principal
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {c.cargo && (
                                                                <p className="text-[12px] text-muted-foreground mt-0.5">
                                                                    {c.cargo}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                                {c.tipo_display}
                                                            </span>
                                                            <button
                                                                onClick={() => setContactoForm({ mode: "edit", contacto: c })}
                                                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                                title="Editar contacto"
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                            {deletingId === c.id ? (
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => handleDelete(c.id)}
                                                                        disabled={deleteLoading}
                                                                        className="text-[10px] text-destructive hover:underline px-1"
                                                                    >
                                                                        {deleteLoading ? <Loader2 size={10} className="animate-spin" /> : "Confirmar"}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDeletingId(null)}
                                                                        className="text-[10px] text-muted-foreground hover:underline px-1"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setDeletingId(c.id)}
                                                                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                                                    title="Eliminar contacto"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Datos de contacto */}
                                                    <div className="mt-2 space-y-0.5">
                                                        {c.email && (
                                                            <p className="text-[12px] text-foreground">{c.email}</p>
                                                        )}
                                                        {c.telefono && (
                                                            <p className="text-[12px] text-muted-foreground">{c.telefono}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Resumen ──────────────────────────────── */}
                            <div className="p-5">
                                <SectionTitle>Resumen</SectionTitle>
                                <div className="grid grid-cols-2 gap-3">
                                    <StatCard
                                        label="Terceros"
                                        value={detalle.stats.total_terceros}
                                        sub={`${detalle.stats.terceros_aprobados} aprob · ${detalle.stats.terceros_pendientes} pend`}
                                    />
                                    <StatCard
                                        label="Contratos"
                                        value={detalle.stats.total_contratos}
                                        sub={`${detalle.stats.contratos_vigentes} vigentes`}
                                    />
                                </div>
                            </div>

                        </div>
                    ) : null}
                </div>

                {/* ── Footer ──────────────────────────────────────────────── */}
                {detalle && !loading && (
                    <div className="border-t border-border p-4 flex-shrink-0 bg-background">
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full flex items-center gap-2"
                            onClick={() => onEditRequest(detalle.id)}
                        >
                            <Edit2 size={14} />
                            Editar empresa
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}
