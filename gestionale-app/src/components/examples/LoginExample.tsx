/**
 * Esempio di utilizzo del Design System
 * 
 * Questo componente mostra come utilizzare i nuovi componenti UI
 * al posto del componente Login esistente.
 */

import React, { useState } from 'react';
import { Mail, Lock, LogIn } from 'lucide-react';
import { Form, FormField, Input, Button, Card, CardHeader, CardTitle, CardContent } from '../ui';
import { useToast } from '../../hooks/useToast';
import { authAPI } from '../../services/api';

interface LoginExampleProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginExample: React.FC<LoginExampleProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { success, error: showError } = useToast();

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'Email è obbligatoria';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Formato email non valido';
    }
    
    if (!password) {
      newErrors.password = 'Password è obbligatoria';
    } else if (password.length < 6) {
      newErrors.password = 'Password deve essere almeno 6 caratteri';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.login(email, password);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      success('Login effettuato con successo!');
      onLoginSuccess(response.user, response.token);
    } catch (err: any) {
      showError(err.message || 'Errore durante il login');
      setErrors({ email: err.message || 'Credenziali non valide' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-secondary-500 to-primary-600 p-4">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-3xl">Gestionale</CardTitle>
        </CardHeader>
        
        <CardContent>
          <Form onSubmit={handleSubmit}>
            <FormField label="Email" required error={errors.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                placeholder="mario.rossi@example.com"
                leftIcon={<Mail className="w-5 h-5" />}
                aria-label="Indirizzo email"
              />
            </FormField>

            <FormField label="Password" required error={errors.password}>
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                placeholder="••••••••"
                leftIcon={<Lock className="w-5 h-5" />}
                aria-label="Password"
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              leftIcon={<LogIn className="w-5 h-5" />}
            >
              Accedi
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

