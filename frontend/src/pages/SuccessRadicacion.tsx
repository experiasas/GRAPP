import { useLocation, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { SuccessScreen } from '@/components/forms/SuccessScreen';

interface LocationState {
    cuentaData?: {
        numero: string;
        periodo: string;
        valor: string;
        proveedor: string;
    };
}

const SuccessRadicacion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { cuentaData } = (location.state as LocationState) || {};

    // Si no hay datos, redirigir al home
    if (!cuentaData) {
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
                title="¡Cuenta Radicada!"
                subtitle="Su cuenta de cobro ha sido radicada exitosamente"
                details={[
                    { label: 'Proveedor', value: cuentaData.proveedor },
                    { label: 'Número de Cuenta', value: cuentaData.numero },
                    { label: 'Periodo', value: cuentaData.periodo },
                    { label: 'Valor', value: cuentaData.valor },
                    { label: 'Estado', value: 'Radicada' },
                ]}
                onGoHome={() => navigate('/')}
                onNewAction={() => window.location.reload()}
                newActionLabel="Radicar otra cuenta"
            />
        </div>
    );
};

export default SuccessRadicacion;
