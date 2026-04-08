import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Loader2 } from "lucide-react";
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
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const formSchema = z.object({
    code: z.string()
        .min(1, "El código es requerido")
        .max(30, "Máximo 30 caracteres")
        .regex(/^[A-Z][A-Z0-9_]*$/, "Solo mayúsculas, números y guiones bajos"),
    nombre: z.string().min(1, "El nombre es requerido").max(60, "Máximo 60 caracteres"),
    descripcion: z.string().max(300, "Máximo 300 caracteres").optional().default(""),
    activo: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    tipoId: number | null;   // null = modo creación
    onClose: () => void;
    onSuccess: (saved: TipoTercero) => void;
}

export function TipoTerceroFormModal({ open, tipoId, onClose, onSuccess }: Props) {
    const isEditMode = tipoId !== null;

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { code: "", nombre: "", descripcion: "", activo: true },
    });

    const { isSubmitting } = form.formState;

    useEffect(() => {
        if (!open) return;
        if (!isEditMode) {
            form.reset({ code: "", nombre: "", descripcion: "", activo: true });
            return;
        }

        form.reset({ code: "", nombre: "", descripcion: "", activo: true });

        let cancelled = false;

        adminTiposTerceroAPI.getDetalle(tipoId)
            .then(d => {
                if (cancelled) return;
                form.reset({
                    code: d.code,
                    nombre: d.nombre,
                    descripcion: d.descripcion ?? "",
                    activo: d.activo,
                });
            })
            .catch(() => { });

        return () => { cancelled = true; };

    }, [open, tipoId]); // eslint-disable-line react-hooks/exhaustive-deps

    function handleClose() {
        form.reset();
        onClose();
    }

    async function onSubmit(values: FormValues) {
        try {
            const payload = {
                code: values.code,
                nombre: values.nombre,
                descripcion: values.descripcion ?? "",
                activo: values.activo,
            };
            const saved = isEditMode
                ? await adminTiposTerceroAPI.editar(tipoId, payload)
                : await adminTiposTerceroAPI.crear(payload);
            form.reset();
            onSuccess(saved);
        } catch (err: unknown) {
            if (err && typeof err === "object" && !(err instanceof Error)) {
                const fieldErrors = err as Record<string, string[]>;
                Object.entries(fieldErrors).forEach(([field, msgs]) => {
                    const msg = Array.isArray(msgs) ? msgs[0] : String(msgs);
                    if (field === "code" || field === "nombre" || field === "descripcion") {
                        form.setError(field, { message: msg });
                    } else {
                        form.setError("root", { message: msg });
                    }
                });
            } else {
                form.setError("root", {
                    message: (err as Error).message ?? "Error al guardar.",
                });
            }
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div>
                        <p className="text-[15px] font-semibold text-foreground">
                            {isEditMode ? "Editar tipo de tercero" : "Nuevo tipo de tercero"}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                            {isEditMode
                                ? "Modifica los datos del tipo"
                                : "Define un nuevo tipo de clasificación"}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Formulario ── */}
                <div className="px-6 py-5">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                            {/* Código */}
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[13px]">
                                            Código <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="Ej: CONTRATISTA"
                                                className="font-mono uppercase"
                                                maxLength={30}
                                                disabled={isEditMode}
                                                onChange={e => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[11px]" />
                                        {!isEditMode && (
                                            <p className="text-[11px] text-muted-foreground -mt-1">
                                                Solo mayúsculas, números y guiones bajos. No se puede cambiar después.
                                            </p>
                                        )}
                                        {isEditMode && (
                                            <p className="text-[11px] text-muted-foreground -mt-1">
                                                El código no se puede modificar.
                                            </p>
                                        )}
                                    </FormItem>
                                )}
                            />

                            {/* Nombre */}
                            <FormField
                                control={form.control}
                                name="nombre"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[13px]">
                                            Nombre <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="Ej: Contratista independiente"
                                                maxLength={60}
                                            />
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
                                        <FormLabel className="text-[13px]">Descripción</FormLabel>
                                        <FormControl>
                                            <textarea
                                                {...field}
                                                placeholder="Descripción opcional del tipo de tercero..."
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
                                                    Los tipos inactivos no aparecen en los selectores de invitación
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={field.value}
                                                onClick={() => field.onChange(!field.value)}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${field.value ? "bg-primary" : "bg-muted-foreground/30"
                                                    }`}
                                            >
                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${field.value ? "translate-x-4" : "translate-x-0.5"
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

                            {/* Acciones */}
                            <div className="flex gap-3 pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={handleClose}
                                    disabled={isSubmitting}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="flex-1"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? <><Loader2 size={13} className="animate-spin mr-1.5" /> Guardando...</>
                                        : isEditMode ? "Guardar cambios" : "Crear tipo"
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
