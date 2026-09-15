import React, { useState } from 'react';
import { authAPI } from '../services/api.ts';
import { showNotice } from '../utils/notice';
import { LogIn, UserPlus, Mail, Lock, AlertCircle, User, Sparkles } from 'lucide-react';
interface LoginProps {
    onLoginSuccess: (user: any, token?: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [area, setArea] = useState('Marketing');
    const [managerCode, setManagerCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const response = await authAPI.login(email, password);
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                onLoginSuccess(response.user, response.token);
            } else {
                if (!name) { setError('Il nome è obbligatorio'); setLoading(false); return; }
                const code = managerCode.trim();
                const response = await authAPI.register({
                    name,
                    email,
                    password,
                    area,
                    ...(code ? { managerCode: code } : {}),
                });
                const role = response.user?.role as string | undefined;
                if (code) {
                    if (role && role !== 'Socio') {
                        showNotice(
                            'success',
                            'Codice accettato',
                            `Registrazione completata con accesso ${role} (${area}).`,
                        );
                    } else {
                        showNotice(
                            'warning',
                            'Registrazione completata',
                            'Il codice non ha assegnato un ruolo elevato; account creato come Socio.',
                        );
                    }
                } else {
                    showNotice('success', 'Registrazione completata', 'Il tuo account è pronto.');
                }
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                onLoginSuccess(response.user, response.token);
            }
        } catch (err: any) {
            const msg = err.message || 'Errore durante l\'operazione';
            if (!isLogin && (msg.includes('codice') || msg.includes('Codice'))) {
                if (msg.includes('non disponibile')) {
                    showNotice(
                        'error',
                        'Codice non disponibile',
                        'La registrazione elevata non è attiva sul server.',
                    );
                } else if (msg.includes('non valido')) {
                    showNotice(
                        'error',
                        'Codice errato',
                        'Il codice CDA/Manager non è corretto. Controlla e riprova.',
                    );
                } else {
                    showNotice('error', 'Registrazione con codice', msg);
                }
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-surface text-ink flex items-center justify-center p-4">
            <BackgroundOrnaments />

            <div className="relative w-full max-w-md">
                <div className="card p-8 backdrop-blur-[12px] bg-surface-raised/80">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-grad-brand shadow-glow-brand flex items-center justify-center">
                            <span className="text-white font-bold text-lg">G</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-ink leading-none">Gestionale</h1>
                            <p className="text-[11px] text-ink-subtle mt-0.5">Project & client management</p>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-ink mt-6 mb-1">
                        {isLogin ? 'Bentornato' : 'Crea il tuo account'}
                    </h2>
                    <p className="text-sm text-ink-muted mb-6">
                        {isLogin ? 'Accedi per gestire progetti, clienti e contabilità.' : 'Inizia in pochi secondi.'}
                    </p>

                    {error && (
                        <div className="mb-4 px-3 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl
                                        text-rose-300 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3.5">
                        {!isLogin && (
                            <Field
                                icon={<User className="w-4 h-4" />}
                                type="text"
                                placeholder="Mario Rossi"
                                label="Nome completo"
                                value={name}
                                onChange={setName}
                                required
                            />
                        )}

                        <Field
                            icon={<Mail className="w-4 h-4" />}
                            type="email"
                            placeholder="mario.rossi@example.com"
                            label="Email"
                            value={email}
                            onChange={setEmail}
                            required
                        />

                        <Field
                            icon={<Lock className="w-4 h-4" />}
                            type="password"
                            placeholder="••••••••"
                            label="Password"
                            value={password}
                            onChange={setPassword}
                            required
                            minLength={6}
                        />

                        {!isLogin && (
                            <div>
                                <label className="block text-xs font-medium text-ink-muted mb-1.5">
                                    Area di competenza
                                </label>
                                <select
                                    value={area}
                                    onChange={(e) => setArea(e.target.value)}
                                    className="input"
                                >
                                    <option value="CDA">CDA</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="IT">IT</option>
                                    <option value="Commerciale">Commerciale</option>
                                </select>
                            </div>
                        )}

                        {!isLogin && (
                            <Field
                                icon={<Lock className="w-4 h-4" />}
                                type="password"
                                placeholder="Solo se hai un codice CDA/Manager"
                                label="Codice accesso CDA / Manager (opzionale)"
                                value={managerCode}
                                onChange={setManagerCode}
                            />
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full mt-2 py-3"
                        >
                            {loading ? (
                                <span>Caricamento…</span>
                            ) : isLogin ? (
                                <><LogIn className="w-4 h-4" /> Accedi</>
                            ) : (
                                <><UserPlus className="w-4 h-4" /> Registrati</>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => { setIsLogin(!isLogin); setError(''); setManagerCode(''); }}
                            className="text-sm text-brand-400 hover:text-brand-300 font-medium"
                        >
                            {isLogin
                                ? 'Non hai un account? Registrati'
                                : 'Hai già un account? Accedi'}
                        </button>
                    </div>
                </div>

                <p className="mt-6 text-center text-[11px] text-ink-subtle flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    UI rinnovata · Dark / Light mode
                </p>
            </div>
        </div>
    );
}

function Field({
    icon, type = 'text', placeholder, label, value, onChange, required, minLength,
}: {
    icon: React.ReactNode;
    type?: string;
    placeholder?: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    required?: boolean;
    minLength?: number;
}) {
    return (
        <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">{label}</label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none">{icon}</span>
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    minLength={minLength}
                    className="input pl-10"
                />
            </div>
        </div>
    );
}

function BackgroundOrnaments() {
    return (
        <>
            <div
                aria-hidden
                className="pointer-events-none absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full"
                style={{
                    background: 'radial-gradient(closest-side, rgba(139,92,246,.45), transparent 70%)',
                    filter: 'blur(12px)',
                }}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -bottom-40 -right-32 w-[32rem] h-[32rem] rounded-full"
                style={{
                    background: 'radial-gradient(closest-side, rgba(217,70,239,.4), transparent 70%)',
                    filter: 'blur(12px)',
                }}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute top-1/3 right-1/4 w-72 h-72 rounded-full"
                style={{
                    background: 'radial-gradient(closest-side, rgba(34,211,238,.3), transparent 70%)',
                    filter: 'blur(12px)',
                }}
            />
        </>
    );
}
