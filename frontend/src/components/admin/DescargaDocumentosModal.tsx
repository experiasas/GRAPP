import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminTercerosAPI } from "@/lib/adminTercerosApi";

// ─────────────────────────────────────────────────────────────────────────────
// Validación
// ─────────────────────────────────────────────────────────────────────────────

const schema = z.object({
    motivo: z
        .string()
        .min(10, "El motivo debe tener al menos 10 caracteres.")
        .max(300, "El motivo no puede superar los 300 caracteres."),
});

type FormValues = z.infer<typeof schema>;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface DescargaDocumentosModalProps {
    open: boolean;
    onClose: () => void;
    terceroId: number;
    nombreArchivo: string; // numero_documento del tercero
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

export function DescargaDocumentosModal({
    open,
    onClose,
    terceroId,
    nombreArchivo,
}: DescargaDocumentosModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { motivo: "" },
    });

    // Limpiar el formulario cada vez que se abre el modal
    useEffect(() => {
        if (open) reset({ motivo: "" });
    }, [open, reset]);

    const motivo = watch("motivo");

    async function onSubmit(values: FormValues) {
        try {
            await adminTercerosAPI.descargarDocumentos(terceroId, nombreArchivo, values.motivo);
            reset();
            onClose();
        } catch {
            setError("root", {
                message: "No se pudo descargar el ZIP. Intenta nuevamente.",
            });
        }
    }

    if (!open) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-50 bg-black/40"
                onClick={() => !isSubmitting && onClose()}
            />

            {/* Modal */}
            <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div>
                        <p className="text-[14px] font-semibold text-foreground">
                            Descargar documentos
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                            Indica el motivo o propósito de esta descarga. Quedará registrado en el sistema.
                        </p>
                    </div>
                    <button
                        onClick={() => !isSubmitting && onClose()}
                        className="ml-3 flex-shrink-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        disabled={isSubmitting}
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="px-5 py-4">
                        <label className="text-[12px] font-medium text-foreground mb-1.5 block">
                            Motivo <span className="text-destructive">*</span>
                        </label>
                        <textarea
                            {...register("motivo")}
                            rows={4}
                            placeholder="Ej: Revisión para proceso de contratación, auditoría interna..."
                            className={`w-full text-[13px] px-3 py-2 rounded-lg border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring transition-colors ${
                                errors.motivo ? "border-destructive" : "border-input"
                            }`}
                            disabled={isSubmitting}
                        />
                        <div className="flex items-start justify-between mt-1 gap-3">
                            {errors.motivo ? (
                                <p className="text-[11px] text-destructive">{errors.motivo.message}</p>
                            ) : (
                                <span />
                            )}
                            <p className="text-[11px] text-muted-foreground flex-shrink-0">
                                {motivo.length}/300
                            </p>
                        </div>

                        {errors.root && (
                            <p className="text-[11px] text-destructive mt-2 bg-destructive/5 rounded-lg px-3 py-2">
                                {errors.root.message}
                            </p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-2 border-t border-border px-5 py-4">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => !isSubmitting && onClose()}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            className="flex-1"
                            disabled={isSubmitting || motivo.trim().length < 10}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={13} className="animate-spin mr-1.5" />
                                    Descargando…
                                </>
                            ) : (
                                <>
                                    <Download size={13} className="mr-1.5" />
                                    Descargar
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
