import EstudiosSection from './sections/EstudiosSection';
import CursosSection from './sections/CursosSection';
import CertificacionesSection from './sections/CertificacionesSection';
import ExperienciasSection from './sections/ExperienciasSection';
import IdiomasSection from './sections/IdiomasSection';
import SeguridadSocialSection from './sections/SeguridadSocialSection';

interface PerfilTabProps {
    terceroId: number;
    tipoTercero: string;
    onUpdate?: () => void;
}

export default function PerfilTab({ terceroId, tipoTercero, onUpdate }: PerfilTabProps) {
    const requiresFullProfile = ['CONTRATISTA', 'EMPLEADO', 'ASPIRANTE'].includes(tipoTercero);
    const requiresIdiomas = ['CONTRATISTA', 'EMPLEADO', 'ASPIRANTE', 'SOCIO'].includes(tipoTercero);

    if (!requiresFullProfile && !requiresIdiomas) {
        return (
            <div className="bg-card border rounded-lg p-6">
                <p className="text-muted-foreground text-center py-8">
                    No se requiere información adicional para este tipo de tercero
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {requiresFullProfile && (
                <>
                    <EstudiosSection terceroId={terceroId} onUpdate={onUpdate} />
                    <CursosSection terceroId={terceroId} onUpdate={onUpdate} />
                    <CertificacionesSection terceroId={terceroId} onUpdate={onUpdate} />
                    <ExperienciasSection terceroId={terceroId} onUpdate={onUpdate} />
                    <SeguridadSocialSection terceroId={terceroId} onUpdate={onUpdate} />
                </>
            )}

            {requiresIdiomas && (
                <IdiomasSection terceroId={terceroId} onUpdate={onUpdate} />
            )}
        </div>
    );
}

