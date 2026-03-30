import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Copy, Check, Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    adminTercerosAPI,
    type EmpresaOption,
    type InvitacionResponse,
} from "@/lib/adminTercerosApi";

// ─────────────────────────────────────────────────────────────────────────────
// Schema zod
// ─────────────────────────────────────────────────────────────────────────────

const formSchema = z.object({
    email:        z.string().email("Ingrese un email válido"),
    tipo_tercero: z.string().min(1, "Seleccione el tipo de tercero"),
    empresa_id:   z.string().min(1, "Seleccione una empresa"),
});

type FormValues = z.infer<typeof formSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onClose: () => void;
}

export function InvitarTerceroModal({ open, onClose }: Props) {
    const [empresas, setEmpresas]         = useState<EmpresaOption[]>([]);
    const [empresasLoading, setEmpresasLoading] = useState(false);
    const [submitError, setSubmitError]   = useState<string | null>(null);
    const [resultado, setResultado]       = useState<InvitacionResponse | null>(null);
    const [copied, setCopied]             = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "", tipo_tercero: "", empresa_id: "" },
    });

    const { isSubmitting } = form.formState;

    // Cargar empresas al abrir
    useEffect(() => {
        if (!open) return;
        setEmpresasLoading(true);
        adminTercerosAPI.getEmpresas()
            .then(setEmpresas)
            .catch(() => { /* no bloquear el modal */ })
            .finally(() => setEmpresasLoading(false));
    }, [open]);

    // Limpiar al cerrar
    function handleClose() {
        form.reset();
        setSubmitError(null);
        setResultado(null);
        setCopied(false);
        onClose();
    }

    // Submit
    async function onSubmit(values: FormValues) {
        setSubmitError(null);
        try {
            const res = await adminTercerosAPI.crearInvitacion({
                email:        values.email,
                tipo_tercero: values.tipo_tercero,
                empresa_id:   parseInt(values.empresa_id, 10),
            });
            setResultado(res);
        } catch (err: unknown) {
            // El interceptor puede lanzar un objeto con errores de campo o un Error
            if (err && typeof err === "object" && !("message" in err)) {
                // Errores de validación por campo desde DRF
                const fieldErrors = err as Record<string, string[]>;
                Object.entries(fieldErrors).forEach(([field, msgs]) => {
                    if (field in form.getValues()) {
                        form.setError(field as keyof FormValues, {
                            message: Array.isArray(msgs) ? msgs[0] : String(msgs),
                        });
                    } else {
                        setSubmitError(Array.isArray(msgs) ? msgs[0] : String(msgs));
                    }
                });
            } else {
                setSubmitError((err as Error).message ?? "Error al crear la invitación.");
            }
        }
    }

    // Copiar link
    async function handleCopy() {
        if (!resultado) return;
        const fullLink = `${window.location.origin}${resultado.link}`;
        try {
            await navigator.clipboard.writeText(fullLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            /* fallback silencioso */
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

                {/* ── Header ────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div>
                        <p className="text-[15px] font-semibold text-foreground">Invitar tercero</p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                            Se enviará un link de registro al email indicado
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Cuerpo ────────────────────────────────────────────── */}
                <div className="px-6 py-5">
                    {resultado ? (
                        /* ── Estado de éxito ─────────────────────────────── */
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-success/5 border border-success/20">
                                <Check size={18} className="text-success flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[13px] font-medium text-foreground">
                                        Invitación creada
                                    </p>
                                    <p className="text-[12px] text-muted-foreground truncate">
                                        Enviada a {resultado.email}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-[12px] font-medium text-foreground mb-1.5">
                                    Link de registro
                                </p>
                                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border">
                                    <Link2 size={13} className="text-muted-foreground flex-shrink-0" />
                                    <p className="text-[12px] text-foreground truncate flex-1 font-mono">
                                        {window.location.origin}{resultado.link}
                                    </p>
                                    <button
                                        onClick={handleCopy}
                                        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors flex-shrink-0 ${
                                            copied
                                                ? "text-success bg-success/10"
                                                : "text-primary hover:bg-primary/10"
                                        }`}
                                    >
                                        {copied
                                            ? <><Check size={12} /> Copiado</>
                                            : <><Copy size={12} /> Copiar</>
                                        }
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-[12px]">
                                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                    <p className="text-muted-foreground">Tipo</p>
                                    <p className="font-medium text-foreground mt-0.5">{resultado.tipo_tercero}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                    <p className="text-muted-foreground">Empresa</p>
                                    <p className="font-medium text-foreground mt-0.5 truncate">{resultado.empresa}</p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => {
                                        setResultado(null);
                                        form.reset();
                                    }}
                                >
                                    Crear otra
                                </Button>
                                <Button size="sm" className="flex-1" onClick={handleClose}>
                                    Cerrar
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* ── Formulario ──────────────────────────────────── */
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                                {/* Email */}
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[13px]">
                                                Email <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    placeholder="tercero@ejemplo.com"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )}
                                />

                                {/* Tipo de tercero */}
                                <FormField
                                    control={form.control}
                                    name="tipo_tercero"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[13px]">
                                                Tipo de tercero <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccionar tipo..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="CONTRATISTA">Contratista</SelectItem>
                                                    <SelectItem value="PROVEEDOR">Proveedor</SelectItem>
                                                    <SelectItem value="EMPLEADO">Empleado</SelectItem>
                                                    <SelectItem value="CLIENTE">Cliente</SelectItem>
                                                    <SelectItem value="ASPIRANTE">Aspirante</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )}
                                />

                                {/* Empresa */}
                                <FormField
                                    control={form.control}
                                    name="empresa_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[13px]">
                                                Empresa <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                disabled={empresasLoading}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue
                                                            placeholder={
                                                                empresasLoading
                                                                    ? "Cargando empresas..."
                                                                    : "Seleccionar empresa..."
                                                            }
                                                        />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {empresas.map(e => (
                                                        <SelectItem key={e.id} value={String(e.id)}>
                                                            {e.nombre}
                                                            <span className="ml-1.5 text-muted-foreground text-[11px]">
                                                                {e.nit}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                    {!empresasLoading && empresas.length === 0 && (
                                                        <div className="px-2 py-2 text-[12px] text-muted-foreground">
                                                            No hay empresas disponibles
                                                        </div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )}
                                />

                                {/* Error general de API */}
                                {submitError && (
                                    <p className="text-[12px] text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                                        {submitError}
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
                                            ? <><Loader2 size={13} className="animate-spin mr-1.5" /> Creando...</>
                                            : "Crear invitación"
                                        }
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </div>
            </div>
        </div>
    );
}
