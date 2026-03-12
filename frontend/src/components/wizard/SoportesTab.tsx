import { useState, useEffect } from 'react';
import { Paperclip, Upload, Loader2, Lightbulb, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentosRequeridos, DocumentoRequerido } from '@/components/forms/DocumentosRequeridos';
import { AppAlert } from '@/components/ui/app-alert';
import { terceroAPI } from '@/lib/api';

interface SoportesTabProps {
    terceroId: number;
    token: string;
    onComplete?: () => void;
}

export default function SoportesTab({ terceroId, onComplete }: SoportesTabProps) {
    const [soportesDisponibles, setSoportesDisponibles] = useState<DocumentoRequerido[]>([]);
    const [documentFiles, setDocumentFiles] = useState<Record<string, File>>({});
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, 'uploading' | 'success' | 'error'>>({});
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState(false);
    const [resetCounter, setResetCounter] = useState(0);
    const [loadingInitial, setLoadingInitial] = useState(true);

    // Cargar estado inicial
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // 1. Obtener todos los ítems de perfil + seguridad social
                const [estudios, cursos, certificaciones, experiencias, seguridadSocial] = await Promise.all([
                    terceroAPI.estudios.list(terceroId),
                    terceroAPI.cursos.list(terceroId),
                    terceroAPI.certificaciones.list(terceroId),
                    terceroAPI.experiencias.list(terceroId),
                    terceroAPI.seguridadSocial.get(terceroId).catch(() => null),
                ]);

                // 2. Construir lista de soportes requeridos
                const dynamicSoportes: DocumentoRequerido[] = [];
                const initialProgress: Record<string, 'uploading' | 'success' | 'error'> = {};

                // Seguridad Social — siempre se solicita (obligatorio)
                const codeSS = 'seguridad_social';
                dynamicSoportes.push({
                    documento_tipo_code: codeSS,
                    documento_tipo_nombre: 'Soporte de seguridad social vigente',
                    obligatorio: true,
                    aplica_a_persona: 'NATURAL',
                });
                if (seguridadSocial?.soporte) initialProgress[codeSS] = 'success';

                // Estudios
                estudios.forEach((e: any) => {
                    const code = `estudios_${e.id}`;
                    dynamicSoportes.push({
                        documento_tipo_code: code,
                        documento_tipo_nombre: `Estudio: ${e.nivel_display ?? e.nivel} — ${e.institucion}`,
                        obligatorio: false,
                        aplica_a_persona: 'NATURAL',
                    });
                    if (e.soporte) initialProgress[code] = 'success';
                });

                // Cursos
                cursos.forEach((c: any) => {
                    const code = `cursos_${c.id}`;
                    dynamicSoportes.push({
                        documento_tipo_code: code,
                        documento_tipo_nombre: `Curso: ${c.nombre} — ${c.entidad}`,
                        obligatorio: false,
                        aplica_a_persona: 'NATURAL',
                    });
                    if (c.soporte) initialProgress[code] = 'success';
                });

                // Certificaciones
                certificaciones.forEach((c: any) => {
                    const code = `certificaciones_${c.id}`;
                    dynamicSoportes.push({
                        documento_tipo_code: code,
                        documento_tipo_nombre: `Certificación: ${c.nombre} — ${c.fabricante}`,
                        obligatorio: false,
                        aplica_a_persona: 'NATURAL',
                    });
                    if (c.soporte) initialProgress[code] = 'success';
                });

                // Experiencias
                experiencias.forEach((e: any) => {
                    const code = `experiencias_${e.id}`;
                    dynamicSoportes.push({
                        documento_tipo_code: code,
                        documento_tipo_nombre: `Experiencia: ${e.cargo} — ${e.empresa}`,
                        obligatorio: false,
                        aplica_a_persona: 'NATURAL',
                    });
                    if (e.soporte) initialProgress[code] = 'success';
                });

                setSoportesDisponibles(dynamicSoportes);
                setUploadProgress(initialProgress);
            } catch (err) {
                console.error('Error al cargar datos de soportes:', err);
                setError('Error al cargar la información de su perfil.');
            } finally {
                setLoadingInitial(false);
            }
        };

        if (terceroId) {
            loadInitialData();
        }
    }, [terceroId]);


    const handleUpload = async () => {
        if (Object.keys(documentFiles).length === 0) {
            setError('Debe seleccionar al menos un soporte para cargar');
            return;
        }

        setUploading(true);
        setError('');
        setSuccess(false);

        try {
            // Process uploads concurrently
            await Promise.all(
                Object.entries(documentFiles).map(async ([code, file]) => {
                    // Extract model and id from the dynamic code, ex: "estudios_5"
                    const [model, idStr] = code.split('_');
                    const itemId = parseInt(idStr, 10);

                    try {
                        setUploadProgress(prev => ({ ...prev, [code]: 'uploading' }));
                        // Llamamos al nuevo endpoint PUT/PATCH a través de uploadSoporte
                        await terceroAPI.uploadSoporte(terceroId, model, itemId, file);
                        setUploadProgress(prev => ({ ...prev, [code]: 'success' }));
                    } catch (error) {
                        setUploadProgress(prev => ({ ...prev, [code]: 'error' }));
                        throw error;
                    }
                })
            );

            setSuccess(true);
            setDocumentFiles({});
            setResetCounter(prev => prev + 1); // Trigger reset en el hijo
            onComplete?.();
        } catch (err: any) {
            setError('Error al cargar algunos soportes. Por favor intente nuevamente.');
        } finally {
            setUploading(false);
        }
    };


    const documentosYaCargados = Object.keys(uploadProgress).filter(code => uploadProgress[code] === 'success');

    if (loadingInitial) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Analizando información adicional...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
                    <Paperclip className="w-5 h-5" />
                    Administración de Soportes
                </h2>
                <p className="text-sm text-muted-foreground">
                    Adjunte información referente a la información adicional que llenó en el paso anterior (certificados de estudios, cursos, cartas laborales, etc).
                </p>
            </div>

            {/* Componente de selección de documentos */}
            {soportesDisponibles.length > 0 ? (
                <DocumentosRequeridos
                    documentos={soportesDisponibles}
                    onChange={setDocumentFiles}
                    uploadStatus={Object.fromEntries(
                        Object.entries(uploadProgress).map(([code, status]) => [
                            code,
                            { status: status === 'uploading' ? 'uploading' : status === 'success' ? 'success' : 'error' }
                        ])
                    )}
                    resetTrigger={resetCounter}
                />
            ) : (
                <div className="text-center py-8 border rounded-lg bg-card">
                    <p className="text-muted-foreground">
                        No hay elementos registrados.<br />
                        Vuelva al paso 3 para añadir estudios, cursos o experiencia y luego regrese aquí para adjuntar sus soportes.
                    </p>
                </div>
            )}

            {/* Mensajes de estado */}
            {error && (
                <AppAlert type="error" description={error} className="mt-4" />
            )}

            {success && (
                <AppAlert type="success" title="Soportes Cargados" description="Sus archivos de soporte se han adjuntado exitosamente." className="mt-4" />
            )}

            {/* Resumen */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                        Soportes seleccionados para subir: <strong>{Object.keys(documentFiles).length}</strong>
                    </span>
                </div>
                {documentosYaCargados.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 dark:text-green-400">
                            {documentosYaCargados.length} soporte(s) ya adjuntado(s)
                        </span>
                    </div>
                )}
            </div>

            {/* Botón de carga */}
            <div className="mt-6 flex justify-end gap-3">
                {Object.keys(documentFiles).length > 0 && !uploading && (
                    <Button
                        variant="outline"
                        onClick={() => {
                            setDocumentFiles({});
                            setUploadProgress({});
                            setResetCounter(prev => prev + 1);
                        }}
                    >
                        Limpiar Selección
                    </Button>
                )}

                <Button
                    size="lg"
                    onClick={handleUpload}
                    disabled={uploading || Object.keys(documentFiles).length === 0}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Subiendo {Object.keys(uploadProgress).filter(k => uploadProgress[k] === 'success').length} de {Object.keys(documentFiles).length}...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4 mr-2" />
                            Adjuntar Soportes ({Object.keys(documentFiles).length})
                        </>
                    )}
                </Button>
            </div>

            {/* Información adicional */}
            <div className="mt-6 pt-6 border-t">
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <p>
                        <strong className="text-foreground">Sugerencia:</strong> Puede adjuntar sus soportes (documentos PDF, fotos, certificaciones) individualmente o seleccionarlos todos a la vez antes de presionar Adjuntar. No olvide que cada elemento de su perfil requiere un soporte verificable.
                    </p>
                </div>
            </div>
        </div>
    );
}
