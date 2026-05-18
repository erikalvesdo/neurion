import React, { useState } from 'react';
import { BrainCircuit, Loader2, UserPlus, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  onRegister: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  onForgotPassword?: (email: string) => Promise<{ success: boolean; message: string }>;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onRegister, onForgotPassword }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await new Promise(r => setTimeout(r, 600));
      if (isRegistering) {
        if (password !== confirmPassword) { setError('As senhas não coincidem.'); setIsLoading(false); return; }
        if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); setIsLoading(false); return; }
        const result = await onRegister(email, password);
        if (result.success) setSuccessMsg(result.message);
        else setError(result.message);
      } else {
        const result = await onLogin(email, password);
        if (!result.success) setError(result.message);
      }
    } catch { setError('Erro inesperado. Tente novamente.'); }
    finally { setIsLoading(false); }
  };

  const toggleMode = () => { setIsRegistering(!isRegistering); setError(''); setSuccessMsg(''); setPassword(''); setConfirmPassword(''); };

  const handleForgotPassword = async () => {
    if (!onForgotPassword) return;
    if (!email.trim()) {
      setError('Informe seu email para recuperar a senha.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const result = await onForgotPassword(email);
      if (result.success) setSuccessMsg(result.message);
      else setError(result.message);
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '9px', color: '#f1f5f9',
    fontSize: '14px', outline: 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base, #05070f)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', fontFamily: 'Inter, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      {/* Glow orb */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '500px', height: '500px', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(59,130,246,0.15))',
            border: '1px solid rgba(99,102,241,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(99,102,241,0.2)',
          }}>
            <BrainCircuit size={24} color="#818cf8" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#f1f5f9', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            NEURION <span style={{ color: '#818cf8' }}>OS</span>
          </h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {isRegistering ? 'Criar conta' : 'Acesso ao sistema'}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '18px', padding: '28px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '7px' }}>Email</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '7px' }}>Senha</label>
              <input
                type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            {isRegistering && (
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '7px' }}>Confirmar Senha</label>
                <input
                  type="password" required value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            )}

            {!isRegistering && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isLoading}
                style={{
                  alignSelf: 'flex-end',
                  background: 'none',
                  border: 'none',
                  cursor: isLoading ? 'default' : 'pointer',
                  color: 'rgba(129,140,248,0.9)',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: 0,
                }}
              >
                Esqueci minha senha
              </button>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '8px' }}>
                <AlertCircle size={13} color="#f87171" />
                <span style={{ color: '#f87171', fontSize: '12px' }}>{error}</span>
              </div>
            )}

            {successMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}>
                <CheckCircle2 size={13} color="#34d399" />
                <span style={{ color: '#34d399', fontSize: '12px' }}>{successMsg}</span>
              </div>
            )}

            <button
              type="submit" disabled={isLoading}
              style={{
                width: '100%', padding: '13px',
                background: isLoading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none', borderRadius: '10px',
                color: '#fff', fontWeight: '800', fontSize: '13px',
                cursor: isLoading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                letterSpacing: '0.05em', textTransform: 'uppercase',
                boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
                transition: 'all 0.18s', marginTop: '4px',
              }}
            >
              {isLoading
                 ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Processando...</>
                : isRegistering
                   ? <><UserPlus size={15} /> Criar Conta</>
                  : <><LogIn size={15} /> Acessar Sistema</>
              }
            </button>
          </form>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <button onClick={toggleMode} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'rgba(255,255,255,0.3)', transition: 'color 0.18s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
              {isRegistering
                 ? <>Já tem conta <span style={{ color: '#818cf8', fontWeight: '700' }}>Fazer Login</span></>
                : <>Não tem conta <span style={{ color: '#818cf8', fontWeight: '700' }}>Criar Conta</span></>
              }
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '10px', color: 'rgba(255,255,255,0.15)' }}>
          NEURION OS v21.0 · por GOAT
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
