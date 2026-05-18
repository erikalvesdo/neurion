import React, { useState, useEffect } from 'react';
import { OpenAICompatClient as GoogleGenAI } from '../utils/openai';
import { getModel } from '../utils/modelConfig';
import {
  Video, Loader2, Copy, Download, ChevronDown, ChevronUp,
  Sparkles, Mic, Clock, Target, Zap, RefreshCw, CheckCircle2,
  Play, Pause, SkipForward, AlertCircle, BookOpen, Heart, DollarSign
} from 'lucide-react';

interface VSLSection {
  title: string;
  icon: React.ReactNode;
  color: string;
  content: string;
  duration: string;
  tip: string;
}

interface VSLScript {
  totalDuration: string;
  targetAudience: string;
  sections: {
    hook: string;
    story: string;
    problem: string;
    mechanism: string;
    proof: string;
    offer: string;
    guarantee: string;
    cta: string;
    objections: string;
    urgency: string;
  };
  voiceDirections: string;
  bRollSuggestions: string[];
}

interface VSLStudioProps {
  userEmail: string;
  voiceTrigger?: any;
  onVoiceTriggerHandled?: () => void;
  onStatusChange?: (isGenerating: boolean) => void;
}

const VSL_STYLES = [
  { id: 'direct', label: 'Direto ao Ponto', desc: 'Curto, agressivo, alta conversão', duration: '10-15min', color: '#f43f5e' },
  { id: 'story', label: 'Jornada do Herói', desc: 'História emocional + transformação', duration: '20-30min', color: '#818cf8' },
  { id: 'webinar', label: 'Estilo Webinar', desc: 'Educativo, longo, autoridade', duration: '45-60min', color: '#22d3ee' },
  { id: 'finch', label: 'Dark Luxury', desc: 'Misterioso, aspiracional, high-ticket', duration: '15-25min', color: '#fbbf24' },
];

export const VSLStudio: React.FC<VSLStudioProps> = ({ userEmail, voiceTrigger, onVoiceTriggerHandled, onStatusChange }) => {
  const [product, setProduct] = useState('');
  const [niche, setNiche] = useState('');
  const [audience, setAudience] = useState('');
  const [pain, setPain] = useState('');
  const [mechanism, setMechanism] = useState('');
  const [price, setPrice] = useState('');
  const [style, setStyle] = useState('direct');
  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript] = useState<VSLScript | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('hook');
  const [copied, setCopied] = useState<string | null>(null);
  const [step, setStep] = useState('');

  const apiKey = () => (window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '';

  const generate = async () => {
    if (!product || !niche || !pain) {
      alert('Preencha pelo menos: Produto, Nicho e Dor principal.');
      return;
    }
    if (!apiKey()) { alert('Configure sua chave OpenAI.'); return; }

    setIsGenerating(true);
    onStatusChange?.(true);
    setScript(null);

    const styleData = VSL_STYLES.find(s => s.id === style)!;

    const prompt = `Você é o maior especialista em VSL (Video Sales Letter) do Brasil, com experiência em mais de R$100M em vendas via vídeo.

Crie um roteiro VSL COMPLETO e DETALHADO para:

PRODUTO: ${product}
NICHO: ${niche}
PÚBLICO: ${audience || 'Definir baseado no nicho'}
DOR PRINCIPAL: ${pain}
MECANISMO/SOLUÇÃO: ${mechanism || 'Baseado no produto'}
PREÇO: ${price || 'A definir'}
ESTILO: ${styleData.label} — ${styleData.desc}
DURAÇÃO ALVO: ${styleData.duration}

Retorne APENAS JSON com esta estrutura exata:
{
  "totalDuration": "estimativa em minutos",
  "targetAudience": "descrição detalhada do público",
  "sections": {
    "hook": "GANCHO completo (primeiros 30-60 segundos). Deve parar o scroll imediatamente. Inclua a frase exata de abertura.",
    "story": "HISTÓRIA de identificação completa (2-4 parágrafos). Para estilo Direto, pode ser curta. Para Jornada do Herói, detalhada com personagem identificável.",
    "problem": "AGITAÇÃO DO PROBLEMA completa (2-3 parágrafos). Aprofunde a dor, o custo de não resolver, a frustração.",
    "mechanism": "MECANISMO ÚNICO completo (2-3 parágrafos). Explique POR QUE as outras soluções falham e como sua solução é diferente.",
    "proof": "PROVA SOCIAL completa (2-3 parágrafos). Inclua modelos de depoimentos específicos, resultados, casos de uso.",
    "offer": "APRESENTAÇÃO DA OFERTA completa (2-3 parágrafos). Revele o produto, módulos, bônus, valor percebido.",
    "guarantee": "GARANTIA completa (1-2 parágrafos). Inverta o risco totalmente. Seja específico.",
    "cta": "CHAMADA PARA AÇÃO completa (1-2 parágrafos). Urgente, específico, com instruções claras.",
    "objections": "QUEBRA DE OBJEÇÕES (2-3 parágrafos). As 3 principais objeções e como quebrá-las naturalmente.",
    "urgency": "URGÊNCIA E ESCASSEZ (1-2 parágrafos). Razão legítima para agir agora."
  },
  "voiceDirections": "Instruções de tom, ritmo, pausas e ênfase para a gravação",
  "bRollSuggestions": ["sugestão 1", "sugestão 2", "sugestão 3", "sugestão 4", "sugestão 5"]
}`;

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey() });
      setStep('Analisando público e produto...');
      await new Promise(r => setTimeout(r, 800));
      setStep('Construindo estrutura narrativa...');

      const res = await ai.models.generateContent({
        model: getModel(),
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const text = res.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const data = JSON.parse(clean) as VSLScript;
      setScript(data);
      setExpandedSection('hook');
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar roteiro. Tente novamente.');
    } finally {
      setIsGenerating(false);
      onStatusChange?.(false);
      setStep('');
    }
  };

  const copySection = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAll = () => {
    if (!script) return;
    const full = Object.entries(script.sections)
      .map(([k, v]) => `=== ${k.toUpperCase()} ===\n${v}`)
      .join('\n\n');
    navigator.clipboard.writeText(full);
    setCopied('all');
    setTimeout(() => setCopied(null), 2000);
  };

  const SECTIONS_META: Record<string, { label: string; icon: React.ReactNode; color: string; tip: string; duration: string }> = {
    hook:       { label: 'Gancho de Abertura', icon: <Zap size={14}/>, color: '#f43f5e', tip: 'Primeiros 30-60s. Decide se o espectador continua.', duration: '0:30-1:00' },
    story:      { label: 'História de Identificação', icon: <Heart size={14}/>, color: '#818cf8', tip: 'Crie conexão emocional. O espectador deve se ver.', duration: '2-5 min' },
    problem:    { label: 'Agitação do Problema', icon: <AlertCircle size={14}/>, color: '#f59e0b', tip: 'Aprofunde a dor. Quanto mais específico, melhor.', duration: '2-4 min' },
    mechanism:  { label: 'Mecanismo Único', icon: <Sparkles size={14}/>, color: '#22d3ee', tip: 'Por que SUA solução funciona quando as outras falham.', duration: '3-5 min' },
    proof:      { label: 'Prova Social e Resultados', icon: <CheckCircle2 size={14}/>, color: '#10b981', tip: 'Depoimentos específicos valem ouro.', duration: '3-6 min' },
    offer:      { label: 'Apresentação da Oferta', icon: <DollarSign size={14}/>, color: '#fbbf24', tip: 'Revele com impacto. Empilhe valor antes do preço.', duration: '3-5 min' },
    guarantee:  { label: 'Garantia', icon: <CheckCircle2 size={14}/>, color: '#10b981', tip: 'Inverta o risco totalmente. Seja específico.', duration: '1-2 min' },
    objections: { label: 'Quebra de Objeções', icon: <Target size={14}/>, color: '#818cf8', tip: 'Responda antes de perguntarem.', duration: '2-4 min' },
    urgency:    { label: 'Urgência e Escassez', icon: <Clock size={14}/>, color: '#f43f5e', tip: 'Razão legítima para agir AGORA.', duration: '1-2 min' },
    cta:        { label: 'Chamada Para Ação', icon: <Play size={14}/>, color: '#22d3ee', tip: 'Específico, simples, urgente.', duration: '1-2 min' },
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px', color: '#f1f5f9',
    fontSize: '13px', outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.18s',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', height: '100%' }}>

      {/* LEFT - CONFIG */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Header card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(244,63,94,0.12), rgba(129,140,248,0.08))',
          border: '1px solid rgba(244,63,94,0.2)',
          borderRadius: '16px', padding: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Video size={18} color="#f43f5e" /></div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#f1f5f9' }}>VSL Studio</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Roteiro de vídeo de vendas completo</div>
            </div>
          </div>
        </div>

        {/* Style selector */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>Estilo do VSL</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {VSL_STYLES.map(s => (
              <button key={s.id} onClick={() => setStyle(s.id)} style={{
                padding: '10px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                background: style === s.id ? `rgba(${s.color === '#f43f5e' ? '244,63,94' : s.color === '#818cf8' ? '129,140,248' : s.color === '#22d3ee' ? '34,211,238' : '251,191,36'},0.12)` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${style === s.id ? s.color + '50' : 'rgba(255,255,255,0.07)'}`,
                transition: 'all 0.18s',
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: style === s.id ? s.color : '#f1f5f9', marginBottom: '2px' }}>{s.label}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{s.desc}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>{s.duration}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>Informações do Produto</div>
          
          {[
            { label: 'Nome do Produto *', val: product, set: setProduct, ph: 'Ex: Método Renda Diária' },
            { label: 'Nicho de Mercado *', val: niche, set: setNiche, ph: 'Ex: Finanças pessoais, emagrecimento' },
            { label: 'Público-alvo', val: audience, set: setAudience, ph: 'Ex: Mulheres 30-50 com dívidas' },
            { label: 'Dor Principal *', val: pain, set: setPain, ph: 'Ex: Não consegue guardar dinheiro' },
            { label: 'Mecanismo / Solução', val: mechanism, set: setMechanism, ph: 'Ex: Método das 3 contas automáticas' },
            { label: 'Preço', val: price, set: setPrice, ph: 'Ex: R$297' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>{f.label}</label>
              <input
                value={f.val} onChange={e => f.set(e.target.value)}
                placeholder={f.ph} style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(244,63,94,0.4)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>
          ))}
        </div>

        <button
          onClick={generate} disabled={isGenerating}
          style={{
            padding: '14px', borderRadius: '12px', border: 'none', cursor: isGenerating ? 'default' : 'pointer',
            background: isGenerating ? 'rgba(244,63,94,0.4)' : 'linear-gradient(135deg, #f43f5e, #e11d48)',
            color: '#fff', fontWeight: '800', fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 4px 20px rgba(244,63,94,0.3)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}
        >
          {isGenerating ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> {step || 'Gerando...'}</> : <><Video size={16} /> Gerar Roteiro VSL</>}
        </button>
      </div>

      {/* RIGHT - SCRIPT OUTPUT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>

        {!script && !isGenerating && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: '60px', textAlign: 'center', gap: '16px',
          }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Video size={28} color="rgba(244,63,94,0.5)" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#f1f5f9', marginBottom: '8px' }}>Roteiro VSL Profissional</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, maxWidth: '400px' }}>
                Preencha as informações do produto, escolha o estilo e gere um roteiro completo com hook, história, mecanismo, prova, oferta e CTA.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Hook de impacto', 'Jornada emocional', 'Quebra de objeções', 'CTA irresistível'].map(tag => (
                <span key={tag} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', background: 'rgba(244,63,94,0.08)', color: 'rgba(244,63,94,0.7)', border: '1px solid rgba(244,63,94,0.15)' }}>{tag}</span>
              ))}
            </div>
          </div>
        )}

        {isGenerating && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '3px solid rgba(244,63,94,0.2)', borderTop: '3px solid #f43f5e', animation: 'spin 1s linear infinite' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9', marginBottom: '6px' }}>{step}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>O VSL Studio está construindo seu roteiro...</div>
            </div>
          </div>
        )}

        {script && (
          <>
            {/* Meta info */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { label: 'Duração Estimada', val: script.totalDuration, icon: <Clock size={14}/>, color: '#22d3ee' },
                { label: 'Seções', val: '10 partes', icon: <BookOpen size={14}/>, color: '#818cf8' },
              ].map(m => (
                <div key={m.label} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: m.color }}>{m.icon}</span>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: '2px' }}>{m.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9' }}>{m.val}</div>
                  </div>
                </div>
              ))}
              <button onClick={copyAll} style={{
                padding: '14px 20px', borderRadius: '12px', cursor: 'pointer', border: 'none',
                background: copied === 'all' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                color: copied === 'all' ? '#34d399' : '#f1f5f9', fontSize: '12px', fontWeight: '700',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.18s',
              }}>
                {copied === 'all' ? <CheckCircle2 size={14}/> : <Copy size={14}/>}
                {copied === 'all' ? 'Copiado!' : 'Copiar Tudo'}
              </button>
            </div>

            {/* Público */}
            <div style={{ background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.15)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#818cf8', marginBottom: '6px' }}>PÚBLICO DEFINIDO</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{script.targetAudience}</div>
            </div>

            {/* Sections */}
            {Object.entries(script.sections).map(([key, content]) => {
              const meta = SECTIONS_META[key];
              if (!meta) return null;
              const isOpen = expandedSection === key;
              return (
                <div key={key} style={{
                  background: 'rgba(255,255,255,0.02)', border: `1px solid ${isOpen ? meta.color + '30' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '14px', overflow: 'hidden', transition: 'border-color 0.2s',
                }}>
                  <button
                    onClick={() => setExpandedSection(isOpen ? null : key)}
                    style={{
                      width: '100%', padding: '14px 16px', background: 'transparent', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                    }}
                  >
                    <span style={{ color: meta.color }}>{meta.icon}</span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9' }}>{meta.label}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{meta.duration} · {meta.tip}</div>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>{isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 16px 16px' }}>
                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '14px' }}/>
                      <div style={{
                        fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.8,
                        whiteSpace: 'pre-wrap', fontFamily: 'inherit',
                      }}>{content}</div>
                      <button
                        onClick={() => copySection(key, content)}
                        style={{
                          marginTop: '12px', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', border: 'none',
                          background: copied === key ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                          color: copied === key ? '#34d399' : 'rgba(255,255,255,0.5)',
                          fontSize: '11px', fontWeight: '700',
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}
                      >
                        {copied === key ? <CheckCircle2 size={12}/> : <Copy size={12}/>}
                        {copied === key ? 'Copiado!' : 'Copiar seção'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Direções de voz */}
            <div style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Mic size={14} color="#22d3ee" />
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#22d3ee', letterSpacing: '0.1em' }}>INSTRUÇÕES DE GRAVAÇÃO</div>
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>{script.voiceDirections}</div>
            </div>

            {/* B-Roll */}
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#fbbf24', marginBottom: '10px', letterSpacing: '0.1em' }}>SUGESTÕES DE B-ROLL</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {script.bRollSuggestions.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#fbbf24', minWidth: '20px', marginTop: '1px' }}>{i+1}.</span>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};



