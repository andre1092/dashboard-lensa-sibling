'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shield, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Email atau password salah. Silakan coba lagi.'
        : authError.message
      );
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-[-50%] left-[-20%] w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, hsl(210 100% 56%), transparent 70%)' }} />
        <div className="absolute bottom-[-30%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, hsl(262 83% 58%), transparent 70%)' }} />
        <div className="absolute top-[20%] right-[30%] w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, hsl(152 69% 53%), transparent 70%)' }} />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-scaleIn">
        <div className="glass-card-static p-8 md:p-10">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-blue mb-4 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-1">LENSA-SIBLING</h1>
            <p className="text-sm text-text-secondary">
              Dashboard Supervisi, Bimbingan &amp; Pemantauan Faskes
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 rounded-xl text-sm font-medium animate-fadeIn"
              style={{ background: 'var(--color-accent-rose-muted)', color: 'var(--color-accent-rose)' }}>
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="nama@bpjs-kesehatan.go.id"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Masuk...
                </>
              ) : (
                'Masuk ke Dashboard'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-text-muted mt-6">
            BPJS Kesehatan &copy; {new Date().getFullYear()} — Internal Dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
