import React, { useEffect, useState, useRef } from 'react';
import { BrainCircuit, Zap, Shield, Cpu, Target, Sparkles } from 'lucide-react';

interface IntroAnimationProps {
  onComplete: () => void;
  userPlan?: string;
}

const FASES = [
  { texto: 'Inicializando núcleo neural...', icone: Cpu },
  { texto: 'Carregando módulos de IA...', icone: BrainCircuit },
  { texto: 'Sincronizando estratégias...', icone: Target },
  { texto: 'Calibrando inteligência...', icone: Zap },
  { texto: 'Sistema pronto.', icone: Sparkles },
];

const PLAN_LABEL: Record<string, string> = {
  FREE: 'Acesso Gratuito',
  STARTER: 'Acesso Starter',
  TRIAL: 'Trial Limitado',
  PRO: 'Acesso PRO',
  AGENCY: 'Acesso Agency',
  LIFETIME: 'Acesso Vitalício',
  MODERATOR: 'Acesso Moderador',
};

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete, userPlan }) => {
  const [fase, setFase] = useState(0);
  const [progresso, setProgresso] = useState(0);
  const [etapa, setEtapa] = useState<'carregando' | 'acesso' | 'saindo'>('carregando');
  const [particulas, setParticulas] = useState<{ x: number; y: number; size: number; delay: number; dur: number }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Gera partículas aleatórias
    setParticulas(Array.from({ length: 28 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2.5,
      delay: Math.random() * 4,
      dur: 3 + Math.random() * 5,
    })));

    const executar = async () => {
      // Inicia progresso
      intervalRef.current = setInterval(() => {
        setProgresso(p => {
          if (p >= 100) { clearInterval(intervalRef.current!); return 100; }
          return Math.min(100, p + Math.floor(Math.random() * 12 + 4));
        });
      }, 120);

      // Alterna fases
      for (let i = 1; i < FASES.length; i++) {
        await new Promise(r => setTimeout(r, 650));
        setFase(i);
      }

      // Aguarda progresso completar
      await new Promise(r => setTimeout(r, 600));
      clearInterval(intervalRef.current!);
      setProgresso(100);

      // Etapa de acesso concedido
      await new Promise(r => setTimeout(r, 400));
      setEtapa('acesso');

      // Sai
      await new Promise(r => setTimeout(r, 1800));
      setEtapa('saindo');
      await new Promise(r => setTimeout(r, 700));
      onComplete();
    };

    executar();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const FaseIcone = FASES[fase]?.icone ?? Cpu;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        background: '#04090f',
        opacity: etapa === 'saindo' ? 0 : 1,
        transition: 'opacity 0.65s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* ── FUNDO AURORA ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 70% 50% at 20% 10%, rgba(29,78,216,0.18) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 90%, rgba(6,182,212,0.12) 0%, transparent 55%),
          radial-gradient(ellipse 50% 60% at 50% 50%, rgba(37,99,235,0.06) 0%, transparent 80%)
        `,
        animation: 'introAurora 6s ease-in-out infinite alternate',
      }} />

      {/* ── GRID ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
        animation: 'introGrid 4s ease-in-out infinite',
      }} />

      {/* ── PARTÍCULAS ── */}
      {particulas.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${p.x}%`, top: `${p.y}%`,
          width: `${p.size}px`, height: `${p.size}px`,
          borderRadius: '50%',
          background: i % 3 === 0
             ? 'rgba(34,211,238,0.7)'
            : i % 3 === 1
               ? 'rgba(59,130,246,0.6)'
              : 'rgba(147,197,253,0.5)',
          boxShadow: `0 0 ${p.size * 3}px currentColor`,
          animation: `introParticula ${p.dur}s ${p.delay}s ease-in-out infinite alternate`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* ── ORB DE LUZ CENTRAL ── */}
      <div style={{
        position: 'absolute',
        width: '500px', height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
        animation: 'introOrbPulse 3s ease-in-out infinite',
      }} />

      {/* ── CONTEÚDO CENTRAL ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>

        {/* Logo */}
        <div style={{
          position: 'relative',
          marginBottom: '36px',
          animation: 'introLogoEntrada 0.8s cubic-bezier(0.16,1,0.3,1) both',
        }}>
          {/* Anéis orbitais */}
          <div style={{
            position: 'absolute', inset: '-20px',
            borderRadius: '50%', border: '1px solid rgba(59,130,246,0.2)',
            animation: 'introRingRotate 8s linear infinite',
          }}>
            <div style={{
              position: 'absolute', top: '-3px', left: '50%', transform: 'translateX(-50%)',
              width: '6px', height: '6px', borderRadius: '50%',
              background: '#60a5fa', boxShadow: '0 0 10px #3b82f6',
            }} />
          </div>
          <div style={{
            position: 'absolute', inset: '-36px',
            borderRadius: '50%', border: '1px solid rgba(34,211,238,0.12)',
            animation: 'introRingRotate 14s linear infinite reverse',
          }}>
            <div style={{
              position: 'absolute', bottom: '-3px', left: '50%', transform: 'translateX(-50%)',
              width: '4px', height: '4px', borderRadius: '50%',
              background: '#22d3ee', boxShadow: '0 0 8px #22d3ee',
            }} />
          </div>

          {/* Glow blob */}
          <div style={{
            position: 'absolute', inset: '-30px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 70%)',
            filter: 'blur(20px)',
            animation: 'introOrbPulse 2.5s ease-in-out infinite',
          }} />

          {/* Círculo principal */}
          <div style={{
            width: '100px', height: '100px',
            background: 'linear-gradient(135deg, rgba(29,78,216,0.6), rgba(6,182,212,0.25))',
            border: '1px solid rgba(59,130,246,0.55)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(37,99,235,0.5), 0 0 80px rgba(37,99,235,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
            position: 'relative', overflow: 'hidden',
          }}>
            <BrainCircuit size={44} color="#93c5fd" strokeWidth={1.5} />
            {/* Scan interno */}
            <div style={{
              position: 'absolute', left: 0, right: 0, height: '2px',
              background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.6), transparent)',
              animation: 'introScanInterno 2s linear infinite',
            }} />
          </div>
        </div>

        {/* Título */}
        <div style={{
          textAlign: 'center', marginBottom: '40px',
          animation: 'introFadeUp 0.8s 0.3s cubic-bezier(0.16,1,0.3,1) both',
        }}>
          <h1 style={{
            fontSize: '42px', fontWeight: '900', letterSpacing: '-0.01em',
            lineHeight: 1,
            fontFamily: '"Oxanium", sans-serif',
            background: 'linear-gradient(135deg, #e2efff 0%, #93c5fd 40%, #60a5fa 70%, #22d3ee 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'introShimmer 3s linear infinite',
            marginBottom: '6px',
          }}>
            NEURION OS
          </h1>
          <p style={{
            fontSize: '10px', fontWeight: '600', letterSpacing: '0.35em',
            color: 'rgba(59,130,246,0.5)', textTransform: 'uppercase',
            fontFamily: '"Oxanium", sans-serif',
          }}>
            PLATAFORMA DE MARKETING COM INTELIGÊNCIA ARTIFICIAL
          </p>
        </div>

        {/* Bloco de carregamento / acesso */}
        {etapa === 'carregando' && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
            animation: 'introFadeUp 0.5s both',
            width: '320px',
          }}>
            {/* Fase atual */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaseIcone size={14} color="#60a5fa" style={{ animation: 'introPulseIcon 1s ease-in-out infinite' }} />
              <span style={{
                fontSize: '11px', fontWeight: '600', letterSpacing: '0.12em',
                color: 'rgba(147,197,253,0.85)', textTransform: 'uppercase',
                fontFamily: '"Oxanium", sans-serif',
                transition: 'all 0.4s',
              }}>
                {FASES[fase]?.texto}
              </span>
            </div>

            {/* Barra de progresso */}
            <div style={{
              width: '100%', height: '2px',
              background: 'rgba(59,130,246,0.1)',
              borderRadius: '2px', overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                height: '100%',
                width: `${progresso}%`,
                background: 'linear-gradient(90deg, #1d4ed8, #3b82f6, #22d3ee)',
                borderRadius: '2px',
                transition: 'width 0.15s ease-out',
                boxShadow: '0 0 10px rgba(59,130,246,0.7)',
              }} />
              {/* Brilho deslizante */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0, width: '40px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                animation: 'introProgressShine 1.5s linear infinite',
                left: `calc(${progresso}% - 40px)`,
              }} />
            </div>

            {/* Percentual */}
            <span style={{
              fontSize: '10px', color: 'rgba(59,130,246,0.4)',
              fontFamily: '"Space Mono", monospace',
              letterSpacing: '0.1em',
            }}>
              {Math.min(100, progresso)}% · SISTEMA.INICIALIZAR
            </span>
          </div>
        )}

        {/* Acesso concedido */}
        {etapa === 'acesso' && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
            animation: 'introAcessoEntrada 0.6s cubic-bezier(0.16,1,0.3,1) both',
          }}>
            {/* Badge de acesso */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 24px',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(34,211,238,0.1))',
              border: '1px solid rgba(59,130,246,0.4)',
              borderRadius: '40px',
              boxShadow: '0 0 30px rgba(37,99,235,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}>
              <Shield size={14} color="#60a5fa" />
              <span style={{
                fontSize: '12px', fontWeight: '700', letterSpacing: '0.12em',
                color: '#93c5fd', textTransform: 'uppercase',
                fontFamily: '"Oxanium", sans-serif',
              }}>
                ACESSO LIBERADO
              </span>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#22d3ee', boxShadow: '0 0 8px #22d3ee',
                animation: 'introPulseDot 1s ease-in-out infinite',
              }} />
            </div>

            {/* Plano do usuário */}
            {userPlan && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '5px 16px',
                background: 'rgba(37,99,235,0.1)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '20px',
              }}>
                <Sparkles size={11} color="rgba(59,130,246,0.7)" />
                <span style={{
                  fontSize: '10px', fontWeight: '700', letterSpacing: '0.18em',
                  color: 'rgba(59,130,246,0.7)', textTransform: 'uppercase',
                  fontFamily: '"Oxanium", sans-serif',
                }}>
                  {PLAN_LABEL[userPlan] ?? userPlan}
                </span>
              </div>
            )}

            {/* Mensagem exclusiva */}
            <p style={{
              fontSize: '11px', color: 'rgba(147,197,253,0.5)',
              fontStyle: 'italic', letterSpacing: '0.04em',
              marginTop: '4px', textAlign: 'center',
              maxWidth: '280px', lineHeight: 1.6,
            }}>
              Bem-vindo à plataforma que vai transformar o seu marketing.
            </p>
          </div>
        )}
      </div>

      {/* ── RODAPÉ ── */}
      <div style={{
        position: 'absolute', bottom: '28px', left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        animation: 'introFadeUp 1s 0.5s both',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '20px',
          fontSize: '8.5px', color: 'rgba(37,99,235,0.4)',
          fontFamily: '"Oxanium", sans-serif',
          letterSpacing: '0.2em', textTransform: 'uppercase',
        }}>
          <span>Motor Neural · Ativo</span>
          <span style={{ color: 'rgba(59,130,246,0.3)' }}>◆</span>
          <span>Marketing · Resolvido</span>
          <span style={{ color: 'rgba(59,130,246,0.3)' }}>◆</span>
          <span>por GOAT · 2026</span>
        </div>
      </div>

      {/* ── LINHAS DECORATIVAS NOS CANTOS ── */}
      {[
        { top: '24px', left: '24px', borderTop: '1px solid rgba(59,130,246,0.2)', borderLeft: '1px solid rgba(59,130,246,0.2)', width: '40px', height: '40px' },
        { top: '24px', right: '24px', borderTop: '1px solid rgba(59,130,246,0.2)', borderRight: '1px solid rgba(59,130,246,0.2)', width: '40px', height: '40px' },
        { bottom: '24px', left: '24px', borderBottom: '1px solid rgba(59,130,246,0.2)', borderLeft: '1px solid rgba(59,130,246,0.2)', width: '40px', height: '40px' },
        { bottom: '24px', right: '24px', borderBottom: '1px solid rgba(59,130,246,0.2)', borderRight: '1px solid rgba(59,130,246,0.2)', width: '40px', height: '40px' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'absolute', ...s, borderRadius: '2px', pointerEvents: 'none' }} />
      ))}

      {/* ── CSS INTERNO ── */}
      <style>{`
        @keyframes introAurora {
          0%   { opacity: 0.7; }
          100% { opacity: 1; }
        }
        @keyframes introGrid {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes introParticula {
          0%   { opacity: 0.2; transform: scale(0.8) translateY(0px); }
          100% { opacity: 0.9; transform: scale(1.2) translateY(-12px); }
        }
        @keyframes introOrbPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50%       { transform: scale(1.15); opacity: 1; }
        }
        @keyframes introRingRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes introLogoEntrada {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes introFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes introShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes introScanInterno {
          0%   { top: 0%; }
          100% { top: 100%; }
        }
        @keyframes introPulseIcon {
          0%, 100% { opacity: 0.6; transform: scale(0.95); }
          50%       { opacity: 1; transform: scale(1.1); }
        }
        @keyframes introProgressShine {
          0%   { left: -40px; opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes introAcessoEntrada {
          from { opacity: 0; transform: scale(0.88) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes introPulseDot {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #22d3ee; }
          50%       { opacity: 0.4; box-shadow: 0 0 4px #22d3ee; }
        }
      `}</style>
    </div>
  );
};
