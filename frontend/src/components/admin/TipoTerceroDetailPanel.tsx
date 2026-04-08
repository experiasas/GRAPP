import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Loader2, Users, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
    adminTiposTerceroAPI,
    type TipoTercero,
} from "@/lib/adminTiposTerceroApi";

// ─────────────────────────────────────────────────────────────────────────────
// Schema edición (code es read-only)
// ─────────────────────────────────────────────────────────────────────────────

const editSchema = z.object({
    nombre:      z.string().min(1, "El nombre es requerido").max(60, "Máximo 60 caracteres"),
    descripcion: z.string().max(300, "Máximo 300 caracteres").optional().default(""),
    activo:      z.boolean(),
});

type EditValues = z.infer<typeof editSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
    return (
        <div className="p-3 rounded-lg bg-muted/30 border border-border flex items-start gap-3">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary mt-0.5">
                <Icon size={14} />
            </div>
            <div>
                <p className="text-[20px] font-bold text-foreground leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
            </div>
        </div>
    );
}

function PanelSkeleton() {
    return (
        <div className="p-5 space-y-5">
            <div className="space-y-2">
                <Skeleton className="h-6 w-32 rounded" />
                <Skeleton className="h-4 w-48" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
            </div>
            <div className="space-y-3">
                <Skeleton className="h-9 rounded-lg" />
                <Skeleton className="h-9 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel principal
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    open:      boolean;
    tipoId:    number | null;
    onClose:   () => void;
    onUpdated: (updated: TipoTercero) => void;
}

export function TipoTerceroDetailPanel({ open, tipoId, onClose, onUpdated }: Props) {
    const [tipo,    setTipo]    = useState<TipoTercero | null>(null);
    const [loading, setLoading] = useState(false);
    const [saveOk,  setSaveOk]  = useState(false);

    const form = useForm<EditValues>({
        resolver: zodResolver(editSchema),
        defaultValues: { nombre: "", descripcion: "", activo: true },
    });

    const { isSubmitting } = form.formState;

    // Cargar datos cuando se abre el panel
    useEffect(() => {
        if (!open || tipoId === null) return;
        setLoading(true);
        setSaveOk(false);
        adminTiposTerceroAPI.getDetalle(tipoId)
            .then(d => {
                setTipo(d);
                form.reset({
                    nombre:      d.nombre,
                    descripcion: d.descripcion ?? "",
                    activo:      d.activo,
                });
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [open, tipoId]); // eslint-disable-line react-hooks/exhaustive-deps

    function handleClose() {
        setTipo(null);
        form.reset();
        onClose();
    }

    async function onSubmit(values: EditValues) {
        if (!tipoId) return;
        try {
            const saved = await adminTiposTerceroAPI.editar(tipoId, {
                nombre:      values.nombre,
                descripcion: values.descripcion ?? "",
                activo:      values.activo,
            });
            setTipo(prev => prev ? { ...prev, ...saved } : saved);
            setSaveOk(true);
            setTimeout(() => setSaveOk(false), 2500);
            onUpdated(saved);
        } catch (err: unknown) {
            if (err && typeof err === "object" && !(err instanceof Error)) {
                const fieldErrors = err as Record<string, string[]>;
                Object.entries(fieldErrors).forEach(([field, msgs]) => {
                    const msg = Array.isArray(msgs) ? msgs[0] : String(msgs);
                    if (field === "nombre" || field === "descripcion") {
                        form.setError(field, { message: msg });
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
        <>
            {/* Overlay */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/20"
                    onClick={handleClose}
                />
            )}

            {/* Panel */}
            <div className={`
                fixed top-0 right-0 z-50 h-full w-[400px] bg-background border-l border-border
                shadow-2xl flex flex-col overflow-hidden
                transition-transform duration-300 ease-in-out
                ${open ? "translate-x-0" : "translate-x-full"}
            `}>

                {/* Header */}
                <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
                    {loading || !tipo ? (
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-24 rounded" />
                            <Skeleton className="h-5 w-40" />
                        </div>
                    ) : (
                        <div className="flex-1 min-w-0 pr-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-semibold font-mono tracking-wide">
                                    {tipo.code}
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                    tipo.activo
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-muted text-muted-foreground"
                                }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${tipo.activo ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                                    {tipo.activo ? "Activo" : "Inactivo"}
                                </span>
                            </div>
                            <p className="text-[15px] font-semibold text-foreground mt-1 truncate">
                                {tipo.nombre}
                            </p>
                        </div>
                    )}
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Contenido scrollable */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <PanelSkeleton />
                    ) : tipo ? (
                        <div className="p-5 space-y-5">

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <StatCard
                                    label="Terceros vinculados"
                                    value={tipo.total_terceros}
                                    icon={Users}
                                />
                                <StatCard
                                    label="Invitaciones enviadas"
                                    value={tipo.total_invitaciones}
                                    icon={Mail}
                                />
                            </div>

                            {/* Formulario inline */}
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 mb-3">
                                    Configuración
                                </p>

                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                                        {/* Código (solo lectura) */}
                                        <div>
                                            <p className="text-[12px] font-medium text-muted-foreground mb-1.5">Código</p>
                                            <div className="flex items-center px-3 py-2 rounded-lg border border-input bg-muted/30">
                                                <span className="text-[13px] font-mono text-foreground">{tipo.code}</span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-1">
                                                El código no se puede modificar
                                            </p>
                                        </div>

                                        {/* Nombre */}
                                        <FormField
                                            control={form.control}
                                            name="nombre"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[12px]">
                                                        Nombre <span className="text-destructive">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input {...field} maxLength={60} />
                                                    </FormControl>
                                                    <FormMessage className="text-[11px]" />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Descripción */}
                                        <FormField
                                            control={form.control}
                                            name="descripcion"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[12px]">Descripción</FormLabel>
                                                    <FormControl>
                                                        <textarea
                                                            {...field}
                                                            placeholder="Descripción opcional..."
                                                            maxLength={300}
                                                            rows={3}
                                                            className="w-full text-[13px] px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring transition-colors resize-none"
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-[11px]" />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Activo */}
                                        <FormField
                                            control={form.control}
                                            name="activo"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                                                        <div>
                                                            <p className="text-[13px] font-medium text-foreground">Tipo activo</p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                Visible en selectores de invitación
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={field.value}
                                                            onClick={() => field.onChange(!field.value)}
                                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                                                field.value ? "bg-primary" : "bg-muted-foreground/30"
                                                            }`}
                                                        >
                                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                                                field.value ? "translate-x-4" : "translate-x-0.5"
                                                            }`} />
                                                        </button>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />

                                        {/* Error global */}
                                        {form.formState.errors.root && (
                                            <p className="text-[12px] text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                                                {form.formState.errors.root.message}
                                            </p>
                                        )}

                                        {/* Feedback éxito */}
                                        {saveOk && (
                                            <p className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                                Cambios guardados correctamente.
                                            </p>
                                        )}

                                        <Button
                                            type="submit"
                                            size="sm"
                                            className="w-full"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting
                                                ? <><Loader2 size={13} className="animate-spin mr-1.5" /> Guardando...</>
                                                : "Guardar cambios"
                                            }
                                        </Button>

                                    </form>
                                </Form>
                            </div>

                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-border px-5 py-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleClose}
                    >
                        Cerrar
                    </Button>
                </div>

            </div>
        </>
    );
}
