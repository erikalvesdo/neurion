import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X, Zap, ArrowRight } from 'lucide-react';

export const UpdateNotification: React.FC = () => {
  const [state, setState] = useState<'idle' | 'available' | 'downloading' | 'ready'>('idle');
  const [version, setVersion] = useState('');
  const [percent, setPercent] = useState(0);
  const [speed, setSpeed] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    api.onUpdateAvailable?.((data: any) => {
      setVersion(data.version);
      setState('available');
      setDismissed(false);
    });

    api.onUpdateProgress?.((data: any) => {
      setPercent(Math.round(data.percent || 0));
      if (data.bytesPerSecond) {
        const kb = Math.round(data.bytesPerSecond / 1024);
        setSpeed(kb > 1024 ? `${(kb/1024).toFixed(1)} MB/s` : `${kb} KB/s`);
      }
      setState('downloading');
    });

    api.onUpdateDownloaded?.((data: any) => {
      setVersion(data.version);
      setState('ready');
      setPercent(100);
    });
  }, []);

  if (dismissed || state === 'idle') return null;

  const handleInstall = async () => {
    setInstalling(true);
    (window as any).electronAPI?.installUpdate();
  };

  return (
    <div style={{
      position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999,
      width: '340px',
      background: '#080c1a',
      border: `1px solid ${state === 'ready' ? 'rgba(99,102,241,0.4)' : state === 'downloading' ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: '18px', padding: '20px',
      boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)',
      backdropFilter: 'blur(24px)',
      animation: 'slideUpNotif 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
    }}>
      {/* Close — só antes de baixar */}
      {state === 'available' && (
        <button onClick={() => setDismissed(true)} style={{
          position: 'absolute', top: '14px', right: '14px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.25)', padding: '4px', borderRadius: '6px',
          transition: 'color 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
        >
          <X size={14} />
        </button>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
          background: state === 'ready'
             ? 'rgba(99,102,241,0.15)'
            : state === 'downloading'
             ? 'rgba(34,211,238,0.1)'
            : 'rgba(245,158,11,0.1)',
          border: `1px solid ${state === 'ready' ? 'rgba(99,102,241,0.3)' : state === 'downloading' ? 'rgba(34,211,238,0.2)' : 'rgba(245,158,11,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {state === 'ready'
             ? <RefreshCw size={16} color="#818cf8" />
            : state === 'downloading'
             ? <Download size={16} color="#22d3ee" style={{ animation: 'bounce 1s infinite' }} />
            : <Zap size={16} color="#fbbf24" />
          }
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#f1f5f9', marginBottom: '2px' }}>
            {state === 'available' && 'Atualização disponível'}
            {state === 'downloading' && 'Baixando atualização...'}
            {state === 'ready' && 'Pronto para atualizar!'}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
            NEURION OS {version && `v${version}`}
          </div>
        </div>
      </div>

      {/* Available state */}
      {state === 'available' && (
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: '4px' }}>
          Uma nova versão está sendo baixada em segundo plano. Você será notificado quando estiver pronta.
        </div>
      )}

      {/* Downloading state */}
      {state === 'downloading' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#22d3ee', fontWeight: '700' }}>{percent}%</span>
            {speed && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{speed}</span>}
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '4px',
              width: `${percent}%`,
              background: 'linear-gradient(90deg, #22d3ee, #818cf8)',
              transition: 'width 0.5s ease',
              boxShadow: '0 0 12px rgba(34,211,238,0.5)',
            }} />
          </div>
        </div>
      )}

      {/* Ready state */}
      {state === 'ready' && (
        <>
          <div style={{ height: '4px', background: 'rgba(99,102,241,0.15)', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: '4px' }} />
          </div>
          <button onClick={handleInstall} disabled={installing} style={{
            width: '100%', padding: '12px', borderRadius: '11px', border: 'none',
            background: installing ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff', fontWeight: '800', fontSize: '13px', cursor: installing ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            transition: 'all 0.18s',
          }}>
            {installing
               ? <><RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Instalando...</>
              : <><RefreshCw size={14} /> Reiniciar e Atualizar</>
            }
          </button>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '8px', marginBottom: 0 }}>
            O app será reiniciado automaticamente
          </p>
        </>
      )}

      <style>{`
        @keyframes slideUpNotif {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
};
