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
import { adminEmpresasAPI } from "@/lib/adminEmpresasApi";

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const formSchema = z.object({
    nombre: z.string().min(1, "El nombre es requerido"),
    nit:    z.string().min(1, "El NIT es requerido"),
    activa: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    open:       boolean;
    /** null = modo creación, number = modo edición */
    empresaId:  number | null;
    onClose:    () => void;
    onSuccess:  () => void;
}

export function EmpresaFormModal({ open, empresaId, onClose, onSuccess }: Props) {
    const isEditMode = empresaId !== null;

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { nombre: "", nit: "", activa: true },
    });

    const { isSubmitting } = form.formState;

    // Cargar datos en modo edición
    useEffect(() => {
        if (!open) return;
        if (!isEditMode) {
            form.reset({ nombre: "", nit: "", activa: true });
            return;
        }
        adminEmpresasAPI.getDetalle(empresaId)
            .then(d => form.reset({ nombre: d.nombre, nit: d.nit, activa: d.activa }))
            .catch(() => { /* si falla, el usuario reintenta abriendo de nuevo */ });
    }, [open, empresaId, isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

    function handleClose() {
        form.reset();
        onClose();
    }

    async function onSubmit(values: FormValues) {
        try {
            if (isEditMode) {
                await adminEmpresasAPI.editar(empresaId, values);
            } else {
                await adminEmpresasAPI.crear(values);
            }
            form.reset();
            onSuccess();
        } catch (err: unknown) {
            if (err && typeof err === "object" && !(err instanceof Error)) {
                const fieldErrors = err as Record<string, string[]>;
                Object.entries(fieldErrors).forEach(([field, msgs]) => {
                    const msg = Array.isArray(msgs) ? msgs[0] : String(msgs);
                    if (field === "nombre" || field === "nit") {
                        form.setError(field, { message: msg });
                    } else {
                        form.setError("root", { message: msg });
                    }
                });
            } else {
                form.setError("root", {
                    message: (err as Error).message ?? "Error al guardar la empresa.",
                });
            }
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div>
                        <p className="text-[15px] font-semibold text-foreground">
                            {isEditMode ? "Editar empresa" : "Nueva empresa"}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                            {isEditMode
                                ? "Modifica los datos de la empresa"
                                : "Registra una nueva empresa en el sistema"}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Formulario ──────────────────────────────────────────── */}
                <div className="px-6 py-5">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

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
                                            <Input placeholder="Experias S.A.S." {...field} />
                                        </FormControl>
                                        <FormMessage className="text-[11px]" />
                                    </FormItem>
                                )}
                            />

                            {/* NIT */}
                            <FormField
                                control={form.control}
                                name="nit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[13px]">
                                            NIT <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="901908238-4"
                                                className="font-mono"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[11px]" />
                                    </FormItem>
                                )}
                            />

                            {/* Activa */}
                            <FormField
                                control={form.control}
                                name="activa"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                                            <div>
                                                <p className="text-[13px] font-medium text-foreground">Empresa activa</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    Las empresas inactivas no aparecen en los selectores
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
                                        : isEditMode ? "Guardar cambios" : "Crear empresa"
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
