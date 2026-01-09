import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2, User, FileText, MapPin, Phone, Mail, ChevronRight, Loader2 } from 'lucide-react';
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
import { vinculacionAPI } from '@/lib/api';

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
    onTerceroCreated: (terceroId: number) => void;
}

export default function DatosBasicosTab({ token, onTerceroCreated }: DatosBasicosTabProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string>('');

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            tipo_persona: 'NATURAL',
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
        },
    });

    const tipoPersona = form.watch('tipo_persona');

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        setError('');

        try {
            const response = await vinculacionAPI.submitTercero(token, data);
            onTerceroCreated(response.tercero_id);
        } catch (err: any) {
            setError(err.message || 'Error al guardar los datos');
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
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                    >
                                        <Label
                                            htmlFor="natural"
                                            className={`flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${field.value === 'NATURAL'
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                                                }`}
                                        >
                                            <RadioGroupItem value="NATURAL" id="natural" className="sr-only" />
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
                                            className={`flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${field.value === 'JURIDICA'
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                                                }`}
                                        >
                                            <RadioGroupItem value="JURIDICA" id="juridica" className="sr-only" />
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
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-12">
                                                <SelectValue placeholder="Seleccione tipo de documento" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {tiposDocumento
                                                .filter(tipo => {
                                                    if (tipoPersona === 'JURIDICA') return tipo.value === 'NIT';
                                                    return tipo.value !== 'NIT';
                                                })
                                                .map(tipo => (
                                                    <SelectItem key={tipo.value} value={tipo.value}>
                                                        {tipo.label}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
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
                                        <Input {...field} placeholder="Ej: 1234567890" className="h-12" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {tipoPersona === 'JURIDICA' ? (
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
                                        <Input {...field} placeholder="+57 300 123 4567" className="h-12" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

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
