import React, { useState } from 'react';
import { OpenAICompatClient as GoogleGenAI } from '../utils/openai';
import { getModel } from '../utils/modelConfig';
import {
  PenLine, Loader2, Copy, CheckCircle2, Sparkles,
  Mail, MessageCircle, Instagram, Play, Target,
  RefreshCw, ChevronDown, ChevronUp, Zap, Hash
} from 'lucide-react';

type Channel = 'email_sequence' | 'whatsapp' | 'instagram' | 'tiktok_hooks' | 'headline_variants' | 'ad_copy';

interface ChannelConfig {
  id: Channel;
  label: string;
  icon: React.ReactNode;
  color: string;
  desc: string;
  outputCount: string;
}

const CHANNELS: ChannelConfig[] = [
  { id: 'email_sequence', label: 'Sequência de E-mail', icon: <Mail size={16}/>, color: '#818cf8', desc: '5 e-mails de follow-up prontos', outputCount: '5 e-mails' },
  { id: 'whatsapp', label: 'Scripts WhatsApp', icon: <MessageCircle size={16}/>, color: '#22c55e', desc: 'Mensagens de recuperação e follow-up', outputCount: '6 mensagens' },
  { id: 'instagram', label: 'Captions Instagram', icon: <Instagram size={16}/>, color: '#e1306c', desc: 'Posts, Stories e Reels com CTA', outputCount: '4 formatos' },
  { id: 'tiktok_hooks', label: 'Hooks para TikTok/Reels', icon: <Play size={16}/>, color: '#ff0050', desc: 'Primeiros 3 segundos que prendem', outputCount: '10 hooks' },
  { id: 'headline_variants', label: 'Variações de Headline', icon: <Hash size={16}/>, color: '#f59e0b', desc: 'A/B test de headlines para anúncios', outputCount: '15 headlines' },
  { id: 'ad_copy', label: 'Copy para Anúncios', icon: <Target size={16}/>, color: '#22d3ee', desc: 'Texto completo para Facebook/Instagram Ads', outputCount: '4 variações' },
];

interface CopyOutput {
  channel: Channel;
  items: { label: string; content: string }[];
}

export const CopyLab: React.FC<{ userEmail: string; onStatusChange?: (isGenerating: boolean) => void }> = ({ userEmail, onStatusChange }) => {
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [pain, setPain] = useState('');
  const [cta, setCta] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(['email_sequence']);
  const [tone, setTone] = useState<'professional' | 'friendly' | 'aggressive' | 'emotional'>('friendly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputs, setOutputs] = useState<CopyOutput[]>([]);
  const [expandedOutput, setExpandedOutput] = useState<number | null>(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [step, setStep] = useState('');

  const apiKey = () => (window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '';

  const toggleChannel = (id: Channel) => {
    setSelectedChannels(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const TONE_LABELS = {
    professional: 'Profissional', friendly: 'Amigável',
    aggressive: 'Agressivo', emotional: 'Emocional'
  };

  const generate = async () => {
    if (!product || !pain) { alert('Preencha Produto e Dor Principal.'); return; }
    if (selectedChannels.length === 0) { alert('Selecione pelo menos um canal.'); return; }
    if (!apiKey()) { alert('Configure sua chave OpenAI.'); return; }

    setIsGenerating(true);
    onStatusChange?.(true);
    setOutputs([]);
    const results: CopyOutput[] = [];

    for (const ch of selectedChannels) {
      const config = CHANNELS.find(c => c.id === ch)!;
      setStep(`Criando ${config.label}...`);

      const prompts: Record<Channel, string> = {
        email_sequence: `Crie uma sequência de 5 e-mails de follow-up para leads que não compraram ainda.
Produto: ${product} | Público: ${audience || 'Definir'} | Dor: ${pain} | CTA: ${cta || 'Comprar agora'} | Tom: ${TONE_LABELS[tone]}

Retorne JSON: { "items": [{"label": "E-mail 1 - [nome]", "content": "Assunto: ...\n\nCorpo completo do e-mail..."}, ...] }
5 e-mails diferentes: boas-vindas, valor, história, urgência, última chance.`,

        whatsapp: `Crie 6 mensagens de WhatsApp para follow-up de leads.
Produto: ${product} | Público: ${audience || 'Definir'} | Dor: ${pain} | Tom: ${TONE_LABELS[tone]}

Retorne JSON: { "items": [{"label": "Mensagem 1 - [tipo]", "content": "texto completo da mensagem com emojis"}, ...] }
Tipos: primeiro contato, segundo follow-up, agitação de dor, prova social, última oferta, reativação (7 dias depois).`,

        instagram: `Crie 4 formatos de caption para Instagram.
Produto: ${product} | Público: ${audience || 'Definir'} | Dor: ${pain} | Tom: ${TONE_LABELS[tone]}

Retorne JSON: { "items": [{"label": "Feed - Educativo", "content": "caption completa com hashtags"}, ...] }
4 formatos: post educativo no feed, story com pergunta, reels com hook, carrossel.`,

        tiktok_hooks: `Crie 10 hooks poderosos para os primeiros 3 segundos de vídeos TikTok/Reels.
Produto: ${product} | Público: ${audience || 'Definir'} | Dor: ${pain}

Retorne JSON: { "items": [{"label": "Hook 1 - [tipo]", "content": "Texto exato do hook + contexto visual sugerido"}, ...] }
Tipos: pergunta, afirmação polêmica, revelação, erro comum, resultado.`,

        headline_variants: `Crie 15 variações de headline para anúncios, para teste A/B.
Produto: ${product} | Público: ${audience || 'Definir'} | Dor: ${pain} | Tom: ${TONE_LABELS[tone]}

Retorne JSON: { "items": [{"label": "Headline 1 - [abordagem]", "content": "A headline + possível subheadline"}, ...] }
Abordagens: dor direta, resultado, curiosidade, negação, número, pergunta, história, polêmica.`,

        ad_copy: `Crie 4 variações de copy completo para anúncios Facebook/Instagram Ads.
Produto: ${product} | Público: ${audience || 'Definir'} | Dor: ${pain} | CTA: ${cta || 'Saiba mais'} | Tom: ${TONE_LABELS[tone]}

Retorne JSON: { "items": [{"label": "Variação 1 - [formato]", "content": "copy completo pronto para colar no ads manager"}, ...] }
Formatos: curto impactante, história identificação, benefícios diretos, prova social.`,
      };

      try {
        const ai = new GoogleGenAI({ apiKey: apiKey() });
        const res = await ai.models.generateContent({
          model: getModel(),
          contents: prompts[ch],
          config: { responseMimeType: 'application/json' }
        });
        const text = res.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const data = JSON.parse(text.replace(/```json|```/g, '').trim());
        results.push({ channel: ch, items: data.items || [] });
      } catch (e) {
        results.push({ channel: ch, items: [{ label: 'Erro', content: 'Não foi possível gerar este canal. Tente novamente.' }] });
      }
    }

    setOutputs(results);
    setExpandedOutput(0);
    setIsGenerating(false);
    onStatusChange?.(false);
    setStep('');
  };

  const copyItem = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px', color: '#f1f5f9', fontSize: '13px', outline: 'none',
    fontFamily: 'Inter, sans-serif', transition: 'border-color 0.18s', boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px' }}>

      {/* LEFT - CONFIG */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div style={{
          background: 'linear-gradient(135deg, rgba(129,140,248,0.12), rgba(34,211,238,0.06))',
          border: '1px solid rgba(129,140,248,0.2)', borderRadius: '16px', padding: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PenLine size={18} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#f1f5f9' }}>Copy Lab</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Copy multi-canal em segundos</div>
            </div>
          </div>
        </div>

        {/* Canais */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>Canais de Distribuição</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {CHANNELS.map(ch => {
              const active = selectedChannels.includes(ch.id);
              return (
                <button key={ch.id} onClick={() => toggleChannel(ch.id)} style={{
                  padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${active ? ch.color + '40' : 'rgba(255,255,255,0.07)'}`,
                  background: active ? `${ch.color}12` : 'rgba(255,255,255,0.02)',
                  display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.18s',
                }}>
                  <span style={{ color: active ? ch.color : 'rgba(255,255,255,0.3)' }}>{ch.icon}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: active ? ch.color : '#f1f5f9' }}>{ch.label}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{ch.outputCount} · {ch.desc}</div>
                  </div>
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${active ? ch.color : 'rgba(255,255,255,0.2)'}`, background: active ? ch.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {active && <CheckCircle2 size={10} color="#fff" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tom */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>Tom de Voz</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {Object.entries(TONE_LABELS).map(([k, v]) => (
              <button key={k} onClick={() => setTone(k as any)} style={{
                padding: '8px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${tone === k ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.07)'}`,
                background: tone === k ? 'rgba(129,140,248,0.12)' : 'transparent',
                color: tone === k ? '#818cf8' : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '700',
              }}>{v}</button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { label: 'Produto *', val: product, set: setProduct, ph: 'Nome do produto ou serviço' },
            { label: 'Público-alvo', val: audience, set: setAudience, ph: 'Ex: Mães de 25-40 anos' },
            { label: 'Dor Principal *', val: pain, set: setPain, ph: 'Ex: Não tem tempo para academia' },
            { label: 'CTA / Oferta', val: cta, set: setCta, ph: 'Ex: Garanta sua vaga por R$197' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>{f.label}</label>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(129,140,248,0.4)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>
          ))}
        </div>

        <button onClick={generate} disabled={isGenerating} style={{
          padding: '14px', borderRadius: '12px', border: 'none', cursor: isGenerating ? 'default' : 'pointer',
          background: isGenerating ? 'rgba(129,140,248,0.4)' : 'linear-gradient(135deg, #818cf8, #6366f1)',
          color: '#fff', fontWeight: '800', fontSize: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          boxShadow: '0 4px 20px rgba(129,140,248,0.3)', letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          {isGenerating ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />{step}</> : <><PenLine size={15} />Gerar Copy {selectedChannels.length > 0 && `(${selectedChannels.length} canal${selectedChannels.length > 1 ? 'is' : ''})`}</>}
        </button>
      </div>

      {/* RIGHT - OUTPUT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>

        {outputs.length === 0 && !isGenerating && (
          <div style={{
            flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: '60px', textAlign: 'center', gap: '16px',
          }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PenLine size={28} color="rgba(129,140,248,0.5)" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#f1f5f9', marginBottom: '8px' }}>Copy para Todos os Canais</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, maxWidth: '400px' }}>
                Selecione os canais, preencha as informações e gere copy profissional para e-mail, WhatsApp, Instagram, TikTok e anúncios de uma vez.
              </div>
            </div>
          </div>
        )}

        {isGenerating && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '3px solid rgba(129,140,248,0.2)', borderTop: '3px solid #818cf8', animation: 'spin 1s linear infinite' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>{step}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{outputs.length}/{selectedChannels.length} canais prontos</div>
            </div>
            {outputs.length > 0 && (
              <div style={{ display: 'flex', gap: '6px' }}>
                {outputs.map((o, i) => {
                  const cfg = CHANNELS.find(c => c.id === o.channel)!;
                  return <span key={i} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>{cfg.label} ✓</span>;
                })}
              </div>
            )}
          </div>
        )}

        {outputs.map((output, oi) => {
          const cfg = CHANNELS.find(c => c.id === output.channel)!;
          const isOpen = expandedOutput === oi;
          return (
            <div key={oi} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${isOpen ? cfg.color + '30' : 'rgba(255,255,255,0.07)'}`, borderRadius: '14px', overflow: 'hidden' }}>
              <button onClick={() => setExpandedOutput(isOpen ? null : oi)} style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9' }}>{cfg.label}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{output.items.length} itens gerados</div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>{isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</span>
              </button>

              {isOpen && (
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '2px' }} />
                  {output.items.map((item, ii) => (
                    <div key={ii} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: cfg.color, letterSpacing: '0.05em' }}>{item.label}</div>
                        <button onClick={() => copyItem(`${oi}-${ii}`, item.content)} style={{
                          padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', border: 'none',
                          background: copied === `${oi}-${ii}` ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                          color: copied === `${oi}-${ii}` ? '#34d399' : 'rgba(255,255,255,0.5)',
                          fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                          {copied === `${oi}-${ii}` ? <CheckCircle2 size={11}/> : <Copy size={11}/>}
                          {copied === `${oi}-${ii}` ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{item.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};



