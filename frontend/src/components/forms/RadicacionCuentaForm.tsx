import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Receipt, Calendar, FileText, DollarSign, Upload, ChevronRight, X, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";

const formSchema = z.object({
    numero: z.string().min(1, "El número de cuenta es requerido").max(50, "Máximo 50 caracteres"),
    periodo: z.string().min(1, "El periodo es requerido").max(50, "Máximo 50 caracteres"),
    concepto: z.string().min(1, "El concepto es requerido").max(500, "Máximo 500 caracteres"),
    valor: z.string().min(1, "El valor es requerido").refine((val) => {
        const num = parseFloat(val.replace(/[^0-9.-]+/g, ""));
        return !isNaN(num) && num > 0;
    }, "Ingrese un valor válido mayor a 0"),
    soporte: z.any().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface RadicacionCuentaFormProps {
    onSuccess: (data: FormData & { fileName?: string }) => void;
    proveedorNombre?: string;
}

export function RadicacionCuentaForm({ onSuccess, proveedorNombre = "Proveedor" }: RadicacionCuentaFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            numero: "",
            periodo: "",
            concepto: "",
            valor: "",
        },
    });

    const formatCurrency = (value: string) => {
        const numbers = value.replace(/[^0-9]/g, "");
        if (!numbers) return "";
        const num = parseInt(numbers, 10);
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
            form.setValue("soporte", e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            form.setValue("soporte", e.target.files[0]);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        form.setValue("soporte", undefined);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsSubmitting(false);
        onSuccess({ ...data, fileName: selectedFile?.name });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 stagger-children">
                {/* Header con info del proveedor */}
                <div className="form-section bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
                            <Receipt className="w-7 h-7 text-primary-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-primary">Radicación de Cuenta de Cobro</p>
                            <h2 className="text-xl font-semibold text-foreground">{proveedorNombre}</h2>
                        </div>
                    </div>
                </div>

                {/* Sección: Información de la Cuenta */}
                <div className="form-section">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Información de la Cuenta</h3>
                            <p className="text-sm text-muted-foreground">Datos básicos de la cuenta de cobro</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="numero"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="form-label">Número de Cuenta</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Ej: CC-2025-001" className="h-12" />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                        Consecutivo o referencia única de la cuenta
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="periodo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="form-label">
                                        <span className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            Periodo
                                        </span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Ej: Diciembre 2025" className="h-12" />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                        Mes o periodo que cubre esta cuenta
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Sección: Concepto y Valor */}
                <div className="form-section">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Detalle del Cobro</h3>
                            <p className="text-sm text-muted-foreground">Concepto y valor a facturar</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <FormField
                            control={form.control}
                            name="concepto"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="form-label">Concepto</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder="Describa detalladamente el servicio o producto prestado..."
                                            className="min-h-[120px] resize-none"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="valor"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="form-label">Valor Total</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <Input
                                                {...field}
                                                placeholder="0"
                                                className="h-14 pl-12 text-xl font-semibold"
                                                onChange={(e) => {
                                                    const formatted = formatCurrency(e.target.value);
                                                    field.onChange(formatted);
                                                }}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Sección: Archivo Soporte */}
                <div className="form-section">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Upload className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Documento Soporte</h3>
                            <p className="text-sm text-muted-foreground">Adjunte el archivo de la cuenta de cobro (PDF)</p>
                        </div>
                    </div>

                    <div
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${dragActive
                            ? "border-primary bg-primary/5"
                            : selectedFile
                                ? "border-success bg-success/5"
                                : "border-border hover:border-primary/50 hover:bg-secondary/30"
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />

                        {selectedFile ? (
                            <div className="flex items-center justify-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                                    <File className="w-6 h-6 text-success" />
                                </div>
                                <div className="text-left">
                                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="ml-4"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        removeFile();
                                    }}
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="w-14 h-14 rounded-full bg-secondary mx-auto flex items-center justify-center">
                                    <Upload className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">
                                        Arrastre y suelte su archivo aquí
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        o haga clic para seleccionar (PDF, DOC, XLS)
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Botón de envío */}
                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-12 px-8 text-base font-medium"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Procesando...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                Radicar Cuenta de Cobro
                                <ChevronRight className="w-5 h-5" />
                            </span>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
