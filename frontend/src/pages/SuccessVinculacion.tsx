import { useLocation, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { SuccessScreen } from '@/components/forms/SuccessScreen';

interface LocationState {
    terceroData?: {
        nombre: string;
        documento: string;
        email: string;
    };
}

const SuccessVinculacion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { terceroData } = (location.state as LocationState) || {};

    // Si no hay datos, redirigir al home
    if (!terceroData) {
        navigate('/');
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-semibold text-foreground">GRAPP</span>
                    </div>
                </div>
            </header>

            <SuccessScreen
                title="¡Vinculación Exitosa!"
                subtitle="El tercero ha sido registrado correctamente en el sistema"
                details={[
                    { label: 'Nombre/Razón Social', value: terceroData.nombre },
                    { label: 'Documento', value: terceroData.documento },
                    { label: 'Email', value: terceroData.email },
                    { label: 'Estado', value: 'Pendiente de aprobación' },
                ]}
                onGoHome={() => navigate('/')}
                onNewAction={() => window.location.reload()}
                newActionLabel="Vincular otro tercero"
            />
        </div>
    );
};

export default SuccessVinculacion;
