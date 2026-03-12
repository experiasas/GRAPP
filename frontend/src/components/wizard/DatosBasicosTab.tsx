import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2, User, FileText, MapPin, Phone, Mail, ChevronRight, Loader2, Lock, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { vinculacionAPI, terceroAPI } from '@/lib/api';

const tiposDocumento = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'NIT', label: 'NIT' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
];

const formSchema = z.object({
    tipo_persona: z.enum(['NATURAL', 'JURIDICA']),
    tipo_doc: z.string().min(1, 'Seleccione el tipo de documento'),
    documento: z.string().min(1, 'El documento es requerido').max(40, 'Máximo 40 caracteres'),
    razon_social: z.string().optional(),
    nombre1: z.string().optional(),
    nombre2: z.string().optional(),
    apellido1: z.string().optional(),
    apellido2: z.string().optional(),
    email: z.string().email('Ingrese un email válido'),
    telefono: z.string().min(1, 'El teléfono es requerido').max(30, 'Máximo 30 caracteres'),
    direccion: z.string().min(1, 'La dirección es requerida').max(200, 'Máximo 200 caracteres'),
    ciudad: z.string().min(1, 'La ciudad es requerida').max(80, 'Máximo 80 caracteres'),
    // Información tributaria (solo relevante para JURIDICA)
    responsable_iva: z.enum(['SI', 'NO']).optional(),
    agente_retenedor: z.enum(['SI', 'NO']).optional(),
    regimen_tributario: z.enum(['ORDINARIO', 'SIMPLE', '']).optional(),
}).refine((data) => {
    if (data.tipo_persona === 'JURIDICA') {
        return !!data.razon_social && data.razon_social.length > 0;
    }
    return !!data.nombre1 && !!data.apellido1;
}, {
    message: 'Complete los campos de identificación requeridos',
    path: ['nombre1'],
});

type FormData = z.infer<typeof formSchema>;

interface DatosBasicosTabProps {
    token: string;
    terceroId?: number | null;
    onTerceroCreated: (terceroId: number) => void;
    tipoPersona: "NATURAL" | "JURIDICA";
    setTipoPersona: (tipo: "NATURAL" | "JURIDICA") => void;
    isJuridicaDisabled: boolean;
    isTipoPersonaLocked: boolean;
    savedFormData: any;
    onFormDataChange: (data: any) => void;
}


export default function DatosBasicosTab({
    token,
    terceroId,
    onTerceroCreated,
    tipoPersona,
    setTipoPersona,
    isJuridicaDisabled,
    isTipoPersonaLocked,
    savedFormData,
    onFormDataChange
}: DatosBasicosTabProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string>('');

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: savedFormData || {
            tipo_persona: tipoPersona,
            tipo_doc: '',
            documento: '',
            razon_social: '',
            nombre1: '',
            nombre2: '',
            apellido1: '',
            apellido2: '',
            email: '',
            telefono: '',
            direccion: '',
            ciudad: '',
            responsable_iva: undefined,
            agente_retenedor: undefined,
            regimen_tributario: '',
        },
    });

    // Debounce timer para guardar valores del formulario
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isHydratingRef = useRef(false);

    // Watch para guardar cambios del formulario con debounce
    useEffect(() => {
        const subscription = form.watch((values) => {
            // ✅ NO guardar mientras estamos haciendo reset/hidratando datos
            if (isHydratingRef.current) return;

            // Cancelar timer previo
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }

            // Guardar después de 500ms de inactividad
            saveTimerRef.current = setTimeout(() => {
                onFormDataChange(values);
            }, 500);
        });

        return () => {
            subscription.unsubscribe();
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        };
    }, [form, onFormDataChange]);

    const currentTipoPersona = form.watch("tipo_persona");

    // Forzar tipo_doc = NIT si es jurídica (y limpiar si deja de serlo)
    useEffect(() => {
        // ✅ Evita tocar el form si estás hidratando
        if (isHydratingRef.current) return;

        const doc = form.getValues("tipo_doc");

        if (currentTipoPersona === "JURIDICA" && doc !== "NIT") {
            form.setValue("tipo_doc", "NIT", { shouldDirty: true, shouldValidate: true });
        }

        if (currentTipoPersona !== "JURIDICA" && doc === "NIT") {
            form.setValue("tipo_doc", "", { shouldDirty: true, shouldValidate: true });
        }
    }, [currentTipoPersona, form]);
    // Cargar datos del tercero si ya existe
    // 
    useEffect(() => {
        if (terceroId) {
            terceroAPI.get(terceroId)
                .then(data => {
                    // Sincronizar tipo_persona desde backend (fuente de verdad)
                    setTipoPersona(data.tipo_persona);

                    const formData = {
                        tipo_persona: data.tipo_persona,
                        tipo_doc: data.tipo_doc,
                        documento: data.documento,
                        razon_social: data.razon_social || '',
                        nombre1: data.nombre1 || '',
                        nombre2: data.nombre2 || '',
                        apellido1: data.apellido1 || '',
                        apellido2: data.apellido2 || '',
                        email: data.email || '',
                        telefono: data.telefono || '',
                        direccion: data.direccion || '',
                        ciudad: data.ciudad || '',
                    };
                    form.reset(formData);
                    onFormDataChange(formData);
                })
                .catch(err => console.error('Error cargando datos:', err));
        }
    }, [terceroId, form, onFormDataChange, setTipoPersona]);

    // Sincronizar tipo_persona del formulario con el estado global




    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        setError('');

        // Convertir SI/NO → boolean para el backend
        const payload: any = { ...data };
        if (data.tipo_persona === 'JURIDICA') {
            payload.responsable_iva  = data.responsable_iva === 'SI' ? true
                                     : data.responsable_iva === 'NO' ? false
                                     : null;
            payload.agente_retenedor = data.agente_retenedor === 'SI' ? true
                                     : data.agente_retenedor === 'NO' ? false
                                     : null;
            payload.regimen_tributario = data.regimen_tributario || null;
        } else {
            payload.responsable_iva  = null;
            payload.agente_retenedor = null;
            payload.regimen_tributario = null;
        }

        try {
            const response = await vinculacionAPI.submitTercero(token, payload);
            onTerceroCreated(response.tercero_id);
        } catch (err: any) {
            // Extract error message from backend response
            let errorMsg = 'Error al procesar la solicitud';

            if (err.response?.data?.message) {
                // Backend returned a specific message
                errorMsg = err.response.data.message;
            } else if (err.response?.data?.errors) {
                // Validation errors from serializer
                const errors = err.response.data.errors;
                const errorMessages = Object.entries(errors)
                    .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                    .join('. ');
                errorMsg = errorMessages || 'Error de validación. Por favor revise los campos.';
            } else if (err.message) {
                // Generic error message
                errorMsg = err.message;
            }

            setError(errorMsg);

            // Si es un tercero duplicado con 409, navegar al siguiente tab
            if (err.response?.status === 409 && err.response?.data?.tercero_id) {
                // Usuario intentó duplicar, pero ya tiene un tercero creado
                setTimeout(() => {
                    onTerceroCreated(err.response.data.tercero_id);
                }, 2000); // Mostrar mensaje 2 segundos antes de continuar
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 stagger-children p-6">
                {/* Sección: Tipo de Persona */}
                <div className="form-section">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Tipo de Persona</h3>
                            <p className="text-sm text-muted-foreground">Seleccione el tipo de persona a vincular</p>
                        </div>
                    </div>

                    <FormField
                        control={form.control}
                        name="tipo_persona"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <RadioGroup
                                        value={field.value}
                                        onValueChange={(val) => {
                                            if (isTipoPersonaLocked) return;
                                            if (val === "JURIDICA" && isJuridicaDisabled) return;

                                            field.onChange(val);
                                            setTipoPersona(val as "NATURAL" | "JURIDICA");
                                        }}
                                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                        disabled={isTipoPersonaLocked}
                                    >
                                        <Label
                                            htmlFor="natural"
                                            className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 ${isTipoPersonaLocked
                                                ? 'opacity-70 cursor-not-allowed'
                                                : 'cursor-pointer'
                                                } ${field.value === 'NATURAL'
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                                                }`}
                                            style={isTipoPersonaLocked ? { pointerEvents: 'none' } : undefined}
                                        >
                                            <RadioGroupItem
                                                value="NATURAL"
                                                id="natural"
                                                className="sr-only"
                                                disabled={isTipoPersonaLocked}
                                            />
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${field.value === 'NATURAL' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                                                }`}>
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground">Persona Natural</p>
                                                <p className="text-sm text-muted-foreground">Individuo o ciudadano</p>
                                            </div>
                                        </Label>

                                        <Label
                                            htmlFor="juridica"
                                            className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 ${isTipoPersonaLocked || isJuridicaDisabled
                                                ? 'opacity-70 cursor-not-allowed border-border'
                                                : field.value === 'JURIDICA'
                                                    ? 'border-primary bg-primary/5 cursor-pointer'
                                                    : 'border-border hover:border-primary/50 hover:bg-secondary/50 cursor-pointer'
                                                }`}
                                            style={isTipoPersonaLocked ? { pointerEvents: 'none' } : undefined}
                                        >
                                            <RadioGroupItem
                                                value="JURIDICA"
                                                id="juridica"
                                                className="sr-only"
                                                disabled={isTipoPersonaLocked || isJuridicaDisabled}
                                            />
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${field.value === 'JURIDICA' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                                                }`}>
                                                <Building2 className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground">Persona Jurídica</p>
                                                <p className="text-sm text-muted-foreground">Empresa u organización</p>
                                            </div>
                                        </Label>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />

                                {isTipoPersonaLocked && (
                                    <div className="mt-4 flex gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-sm">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                                            <Lock className="h-4 w-4 text-muted-foreground" />
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-foreground">
                                                Tipo de persona bloqueado
                                            </p>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                El tipo de persona no puede modificarse después de guardar el registro.
                                                Si requiere un cambio, contacte al administrador.
                                            </p>
                                        </div>
                                    </div>
                                )}

                            </FormItem>
                        )}
                    />
                </div>

                {/* Sección: Identificación */}
                <div className="form-section">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Identificación</h3>
                            <p className="text-sm text-muted-foreground">Información de identificación del tercero</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="tipo_doc"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="form-label">Tipo de Documento</FormLabel>
                                    {currentTipoPersona === 'JURIDICA' ? (
                                        <FormControl>
                                            <Input disabled value="NIT" className="h-12 bg-muted font-medium" />
                                        </FormControl>
                                    ) : (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-12">
                                                    <SelectValue placeholder="Seleccione tipo de documento" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {tiposDocumento
                                                    .filter(tipo => tipo.value !== 'NIT')
                                                    .map(tipo => (
                                                        <SelectItem key={tipo.value} value={tipo.value}>
                                                            {tipo.label}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="documento"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="form-label">Número de Documento</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Ej: 1234567890" type="number" className="h-12" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {currentTipoPersona === 'JURIDICA' ? (
                        <div className="mt-6">
                            <FormField
                                control={form.control}
                                name="razon_social"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="form-label">Razón Social</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Nombre de la empresa" className="h-12" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <FormField
                                control={form.control}
                                name="nombre1"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="form-label">Primer Nombre *</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Primer nombre" className="h-12" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="nombre2"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="form-label">Segundo Nombre</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Segundo nombre (opcional)" className="h-12" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="apellido1"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="form-label">Primer Apellido *</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Primer apellido" className="h-12" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="apellido2"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="form-label">Segundo Apellido</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Segundo apellido (opcional)" className="h-12" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}
                </div>

                

                {/* Sección: Contacto */}
                <div className="form-section">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Phone className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Información de Contacto</h3>
                            <p className="text-sm text-muted-foreground">Datos para comunicación y notificaciones</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="form-label">
                                        <span className="flex items-center gap-2">
                                            <Mail className="w-4 h-4" />
                                            Correo Electrónico
                                        </span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input {...field} type="email" placeholder="correo@ejemplo.com" className="h-12" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="telefono"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="form-label">
                                        <span className="flex items-center gap-2">
                                            <Phone className="w-4 h-4" />
                                            Teléfono
                                        </span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="+57 300 123 4567" type="number" className="h-12" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>


                {/* Sección: Información Tributaria (solo persona jurídica) */}
                {currentTipoPersona === 'JURIDICA' && (
                    <div className="form-section">
                        <div className="flex items-center gap-3 mb-6">
                           
                            <div>
                                <h3 className="font-semibold text-foreground">Información Tributaria</h3>
                                <p className="text-sm text-muted-foreground">
                                    Declaración inicial. El administrador verificará con el RUT.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Responsable de IVA */}
                            <FormField
                                control={form.control}
                                name="responsable_iva"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="form-label">Responsable de IVA</FormLabel>
                                        <div className="grid grid-cols-2 gap-3 mt-1">
                                            {(['SI', 'NO'] as const).map((val) => (
                                                <label
                                                    key={val}
                                                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium ${
                                                        field.value === val
                                                            ? 'border-primary bg-primary/5 text-primary'
                                                            : 'border-border hover:border-primary/40'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        className="sr-only"
                                                        value={val}
                                                        checked={field.value === val}
                                                        onChange={() => field.onChange(val)}
                                                    />
                                                    {val === 'SI' ? 'Sí' : 'No'}
                                                </label>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Agente Retenedor */}
                            <FormField
                                control={form.control}
                                name="agente_retenedor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="form-label">Agente Retenedor</FormLabel>
                                        <div className="grid grid-cols-2 gap-3 mt-1">
                                            {(['SI', 'NO'] as const).map((val) => (
                                                <label
                                                    key={val}
                                                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium ${
                                                        field.value === val
                                                            ? 'border-primary bg-primary/5 text-primary'
                                                            : 'border-border hover:border-primary/40'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        className="sr-only"
                                                        value={val}
                                                        checked={field.value === val}
                                                        onChange={() => field.onChange(val)}
                                                    />
                                                    {val === 'SI' ? 'Sí' : 'No'}
                                                </label>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Régimen Tributario */}
                        <div className="mt-6">
                            <FormField
                                control={form.control}
                                name="regimen_tributario"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="form-label">Régimen Tributario</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || ''}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="h-12">
                                                    <SelectValue placeholder="Seleccione el régimen" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="ORDINARIO">Régimen Ordinario</SelectItem>
                                                <SelectItem value="SIMPLE">Régimen Simple de Tributación</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <p className="text-xs text-muted-foreground mt-4 bg-muted/50 rounded-lg p-3">
                            Esta información será revisada por el administrador con base en el RUT
                            cargado. Puede ser corregida durante el proceso de aprobación.
                        </p>
                    </div>
                )}

                {/* Sección: Ubicación */}
                <div className="form-section">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Ubicación</h3>
                            <p className="text-sm text-muted-foreground">Dirección y ciudad del tercero</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <FormField
                            control={form.control}
                            name="direccion"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="form-label">Dirección</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Ej: Calle 123 # 45-67, Oficina 301" className="h-12" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="ciudad"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="form-label">Ciudad</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Ej: Bogotá, Medellín, Cali" className="h-12" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                

                {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive text-sm">
                        {error}
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-12 px-8 text-base font-medium"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                Guardar y Continuar
                                <ChevronRight className="w-5 h-5 ml-2" />
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
