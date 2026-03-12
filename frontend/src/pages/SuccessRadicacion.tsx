import { useLocation, useNavigate } from 'react-router-dom';
import { SuccessScreen } from '@/components/forms/SuccessScreen';
import { Navbar } from '@/components/Navbar';

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
            <Navbar />

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
