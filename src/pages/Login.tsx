import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';



export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Preencha o email e a senha.');
      return;
    }

    try {
      setIsSubmitting(true);

      const success = await login(email.trim(), password);

      if (success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError('Email ou senha incorretos.');
      }
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');

    try {
      setIsSubmitting(true);

      const success = await login(demoEmail, demoPassword);

      if (success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError('A conta de demonstração não está configurada nesta base de dados.');
      }
    } catch (err) {
      console.error('Erro ao fazer login demo:', err);
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isSubmitting || isLoading;

  return (
    <div className="min-h-screen flex">
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex lg:w-1/2 gradient-animated relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-accent/80" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-primary-foreground">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold">Microcrédito</h1>
          </div>

          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Sistema de Gestão
            <br />
            de Microcrédito
          </h2>

          <p className="text-lg opacity-90 max-w-md">
            Plataforma integrada para gestão de empréstimos, análise de crédito e
            acompanhamento de carteira.
          </p>

          <div className="mt-12 flex gap-8 text-sm opacity-80">
            <div>
              <p className="text-2xl font-bold">50+</p>
              <p>Clientes activos</p>
            </div>
            <div>
              <p className="text-2xl font-bold">MZN 2M+</p>
              <p>Carteira activa</p>
            </div>
            <div>
              <p className="text-2xl font-bold">98%</p>
              <p>Taxa recuperação</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex-1 flex items-center justify-center p-8 bg-background"
      >
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Microcrédito</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Bem-vindo de volta</h2>
            <p className="text-muted-foreground">
              Entre com as suas credenciais para aceder ao sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@empresa.co.mz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                />
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          
        </div>
      </motion.div>
    </div>
  );
}