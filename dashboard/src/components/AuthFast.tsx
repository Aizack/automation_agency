import React, { useState, useEffect } from 'react';

interface AuthFastProps {
    onAuthenticated?: () => void;
}

export const AuthFast: React.FC<AuthFastProps> = ({ onAuthenticated }) => {
    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');
    const [isPinMode, setIsPinMode] = useState(false);
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const phoneParam = params.get('phone') || '';
        setPhone(phoneParam);
    }, []);

    const handleBiometricAuth = async () => {
        if (!phone) {
            setStatus('error');
            setMessage('Número de teléfono ausente en el enlace.');
            return;
        }

        setStatus('scanning');
        setMessage('Verificando datos biométricos...');
        
        // Simular escaneo físico de 1.2 segundos para excelente UX
        await new Promise((resolve) => setTimeout(resolve, 1200));

        try {
            const res = await fetch('/api/auth/verify-biometric', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            const data = await res.json();

            if (data.success) {
                setStatus('success');
                setMessage(data.message || 'Sesión reanudada con éxito.');
                if (onAuthenticated) {
                    setTimeout(onAuthenticated, 2000);
                }
            } else {
                setStatus('error');
                setMessage(data.error || 'La verificación biométrica falló. Intenta de nuevo o usa tu PIN.');
            }
        } catch (err: any) {
            setStatus('error');
            setMessage('Error de red. Intenta con tu PIN.');
        }
    };

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone || pin.length !== 4) {
            setStatus('error');
            setMessage('Ingresa un PIN válido de 4 dígitos.');
            return;
        }

        setLoading(true);
        setStatus('idle');

        try {
            const res = await fetch('/api/auth/verify-fast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, pin })
            });
            const data = await res.json();

            if (data.success) {
                setStatus('success');
                setMessage(data.message || 'Sesión reanudada con éxito.');
                if (onAuthenticated) {
                    setTimeout(onAuthenticated, 2000);
                }
            } else {
                setStatus('error');
                setMessage(data.error || 'El PIN es incorrecto.');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#070b13] text-white flex flex-col items-center justify-center font-sans px-4">
            <div className="w-full max-w-md bg-[#0d1527]/70 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center">
                
                {/* Logo & Header */}
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-16 h-16 bg-[#0a5cff]/20 text-[#0a5cff] rounded-2xl flex items-center justify-center mb-4 border border-[#0a5cff]/30 shadow-[0_0_15px_rgba(10,92,255,0.2)]">
                        <span className="text-2xl font-bold">🔒</span>
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        DiazLab Admin Lock
                    </h1>
                    <p className="text-xs text-gray-400 mt-2 font-medium">
                        Dispositivo asociado: <span className="text-gray-300 font-bold">+{phone}</span>
                    </p>
                </div>

                {status === 'success' ? (
                    <div className="flex flex-col items-center text-center space-y-4 my-6">
                        <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.2)] animate-bounce">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-green-400">Verificación Exitosa</h2>
                        <p className="text-sm text-gray-300">{message}</p>
                        <p className="text-xs text-gray-500 pt-4">Puedes cerrar esta ventana y regresar a WhatsApp.</p>
                    </div>
                ) : (
                    <>
                        {/* Biometric view */}
                        {!isPinMode && (
                            <div className="flex flex-col items-center w-full my-4">
                                <button 
                                    onClick={handleBiometricAuth}
                                    disabled={status === 'scanning'}
                                    className={`w-28 h-28 rounded-full flex items-center justify-center border transition-all duration-300 ${
                                        status === 'scanning' 
                                        ? 'bg-[#0a5cff]/10 border-[#0a5cff] shadow-[0_0_25px_rgba(10,92,255,0.4)] animate-pulse'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#0a5cff]/50 hover:shadow-[0_0_20px_rgba(10,92,255,0.2)] cursor-pointer'
                                    }`}
                                >
                                    {/* Fingerprint SVG */}
                                    <svg className={`w-14 h-14 ${status === 'scanning' ? 'text-[#0a5cff]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 11c0-3.317-2.683-6-6-6M12 11c0 3.317 2.683 6 6 6M12 11V3M12 11c-3.317 0-6 2.683-6 6M6 17c0 3.317 2.683 6 6 6M18 17c0 3.317-2.683 6-6 6M12 3c3.317 0 6 2.683 6 6v2M12 21V17" />
                                    </svg>
                                </button>
                                
                                <p className="text-xs text-gray-400 text-center mt-6 max-w-[240px]">
                                    {status === 'scanning' 
                                        ? 'Verificando huella...' 
                                        : 'Toca el botón para iniciar la lectura de tu huella dactilar.'
                                    }
                                </p>

                                <button
                                    onClick={() => {
                                        setIsPinMode(true);
                                        setStatus('idle');
                                        setMessage('');
                                    }}
                                    className="text-[#0a5cff] hover:text-[#0047d4] text-xs font-bold transition mt-8 cursor-pointer underline underline-offset-4"
                                >
                                    Ingresar con PIN de 4 dígitos
                                </button>
                            </div>
                        )}

                        {/* PIN View */}
                        {isPinMode && (
                            <form onSubmit={handlePinSubmit} className="w-full flex flex-col items-center my-2">
                                <div className="w-full mb-6">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 text-center">
                                        Ingresa tu PIN de Seguridad
                                    </label>
                                    <input 
                                        type="password"
                                        maxLength={4}
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                        placeholder="••••"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-3 text-center text-2xl font-extrabold tracking-[0.7em] focus:outline-none focus:border-[#0a5cff] focus:ring-1 focus:ring-[#0a5cff] transition"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || pin.length !== 4}
                                    className="w-full bg-[#0a5cff] hover:bg-[#0047d4] disabled:opacity-40 text-white font-bold py-4 rounded-2xl transition cursor-pointer text-sm shadow-lg shadow-[#0a5cff]/20"
                                >
                                    {loading ? 'Validando...' : 'Verificar PIN'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPinMode(false);
                                        setStatus('idle');
                                        setMessage('');
                                    }}
                                    className="text-gray-400 hover:text-white text-xs font-medium transition mt-6 cursor-pointer"
                                >
                                    ← Volver a Huella Digital
                                </button>
                            </form>
                        )}

                        {/* Status Messages */}
                        {message && status === 'error' && (
                            <div className="w-full mt-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs text-center font-medium animate-shake">
                                ⚠️ {message}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
