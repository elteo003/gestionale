import React, { useState } from 'react';
import { authAPI } from '../services/api.ts';
import { LogIn, UserPlus, Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Form, FormField } from './ui/Form';

interface LoginProps {
    onLoginSuccess: (user: any, token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [area, setArea] = useState('Marketing');
    const [role, setRole] = useState('Socio');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // Login
                const response = await authAPI.login(email, password);
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                onLoginSuccess(response.user, response.token);
            } else {
                // Registrazione
                if (!name) {
                    setError('Il nome è obbligatorio');
                    setLoading(false);
                    return;
                }
                const response = await authAPI.register({
                    name,
                    email,
                    password,
                    area,
                    role,
                });
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                onLoginSuccess(response.user, response.token);
            }
        } catch (err: any) {
            setError(err.message || 'Errore durante l\'operazione');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900 p-4 transition-colors duration-300">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl dark:shadow-2xl p-8 w-full max-w-md border border-neutral-200 dark:border-neutral-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Gestionale</h1>
                    <p className="text-neutral-600 dark:text-neutral-400">
                        {isLogin ? 'Accedi al tuo account' : 'Crea un nuovo account'}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-800 text-error-700 dark:text-error-300 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                )}

                <Form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <FormField label="Nome Completo" required>
                            <Input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Mario Rossi"
                                required
                            />
                        </FormField>
                    )}

                    <FormField label="Email" required>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="mario.rossi@example.com"
                            leftIcon={<Mail className="w-5 h-5" />}
                            required
                        />
                    </FormField>

                    <FormField label="Password" required>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            leftIcon={<Lock className="w-5 h-5" />}
                            required
                            minLength={6}
                        />
                    </FormField>

                    {!isLogin && (
                        <>
                            <FormField label="Ruolo" required>
                                <Select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    options={[
                                        { value: 'Socio', label: 'Socio' },
                                        { value: 'Presidente', label: 'Presidente' },
                                        { value: 'CDA', label: 'CDA' },
                                        { value: 'Tesoreria', label: 'Tesoreria' },
                                        { value: 'Marketing', label: 'Marketing' },
                                        { value: 'Commerciale', label: 'Commerciale' },
                                        { value: 'IT', label: 'IT' },
                                        { value: 'Audit', label: 'Audit' },
                                        { value: 'Responsabile', label: 'Responsabile' },
                                        { value: 'Admin', label: 'Admin' },
                                    ]}
                                />
                            </FormField>
                            <FormField label="Area di Competenza" required>
                                <Select
                                    value={area}
                                    onChange={(e) => setArea(e.target.value)}
                                    options={[
                                        { value: 'CDA', label: 'CDA' },
                                        { value: 'Marketing', label: 'Marketing' },
                                        { value: 'IT', label: 'IT' },
                                        { value: 'Commerciale', label: 'Commerciale' },
                                    ]}
                                />
                            </FormField>
                        </>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        isLoading={loading}
                        className="w-full"
                    >
                        {loading ? (
                            'Caricamento...'
                        ) : isLogin ? (
                            <>
                                <LogIn className="w-5 h-5 mr-2" />
                                Accedi
                            </>
                        ) : (
                            <>
                                <UserPlus className="w-5 h-5 mr-2" />
                                Registrati
                            </>
                        )}
                    </Button>
                </Form>

                <div className="mt-6 text-center">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                        {isLogin
                            ? 'Non hai un account? Registrati'
                            : 'Hai già un account? Accedi'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

