
import { useMemory } from '../hooks/useMemory';
import { getModel, MODEL_IMAGE } from '../utils/modelConfig';
import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { 
  Zap, 
  Target, 
  MessageSquare, 
  Rocket, 
  BrainCircuit, 
  Loader2, 
  Copy, 
  HeartPulse, 
  Ghost, 
  UserCheck, 
  ImageIcon,
  Sparkles,
  Share2,
  Cpu,
  User,
  CreditCard
} from 'lucide-react';
import { OpenAICompatClient as GoogleGenAI } from "../utils/openai";
import { CampaignBible, VoiceCommand, MentorType } from '../types';
import { KNOWLEDGE_BASE } from '../data/knowledgeBase';

interface CampaignMasterProps {
  userEmail: string;
  voiceTrigger?: VoiceCommand | null;
  onVoiceTriggerHandled?: () => void;
  onStatusChange?: (isGenerating: boolean) => void;
}

// --- MENTOR PERSONAS (FINE-TUNING SIMULATION) ---
const MENTOR_PROMPTS: Record<MentorType, string> = {
    neurion_default: `
        ATUE COMO O DIRETOR DE MARKETING INTEGRADO (NEURION CORE).
        ESTILO: Equilibrado, analítico, direto. Focado em estrutura e clareza.
        USE: Termos técnicos padrão de marketing digital.
    `,
    brasao: `
        ATUE COMO FERNANDO BRASÃO (O MONSTRO DO TRÁFEGO).
        ESTILO: Visceral, engraçado, usa gírias ("Pai tá on", "Mermão", "Chinelo Rider").
        FOCO: Oferta agressiva, quebra de padrão, criativos que parecem conteúdo amador mas convertem.
        FILOSOFIA: "Feito é melhor que perfeito", teste rápido, escala horizontal.
        MANDAMENTO: Fale como se estivesse num bar explicando como ficar rico.
    `,
    erico: `
        ATUE COMO ERICO ROCHA (FÓRMULA DE LANÇAMENTO).
        ESTILO: Inspiracional, estruturado, usa gatilhos mentais (História, Prova, Comunidade).
        FOCO: Jornada do Herói, CPLs, Evento de Lançamento, Escassez real.
        FILOSOFIA: "O segredo está na lista", "Roma" (Promessa), 6 em 7.
        MANDAMENTO: Use analogias poderosas e foque na transformação de vida.
    `,
    finch: `
        ATUE COMO THIAGO FINCH (OUTLIER / PLR).
        ESTILO: Misterioso, cinematográfico, high-ticket, lifestyle, poucos amigos.
        FOCO: Funis perpétuos automáticos, VSLs longas e hipnóticas, estética "Dark/Luxury".
        FILOSOFIA: "Venda sem aparecer", "Nômade Milionário", engenharia reversa.
        MANDAMENTO: Seja frio, calculista e focado na liberdade financeira absoluta.
    `,
    conrado: `
        ATUE COMO CONRADO ADOLPHO (MÉTODO 8PS).
        ESTILO: Professor, denso, acadêmico mas prático, autoritário.
        FOCO: Os 8 Ps, micro-momentos, funil em Y, qualificação de leads.
        FILOSOFIA: "Não existe mágica, existe processo", "Empresa rica é empresa que vende".
        MANDAMENTO: Explique o "porquê" de cada estratégia com lógica irrefutável.
    `
};

const BASE_SYSTEM_PROMPT = `
  OBJETIVO: Criar uma estrutura de funil tão completa e detalhada que o usuário possa copiar e colar em outra IA para gerar o site.
  
  ESTRUTURA DE FUNIL OBRIGATÓRIA (JSON):
  Retorne APENAS um objeto JSON com a seguinte estrutura exata:
  {
    "mentorUsed": "string (nome do mentor usado)",
    "diagnosis": { "exposedWound": "string", "invisibleEnemy": "string", "desiredIdentity": "string" },
    "guidelines": { "toneOfVoice": "string", "bannedWords": ["string"] },
    "angles": [
      {
        "angleName": "Nome do Ângulo",
        "funnelStructure": {
            "hook": { "title": "string", "text": "string", "cta": "string" },
            "quiz": { 
                "title": "string", 
                "intro": "string", 
                "questions": [
                    { "text": "Pergunta", "options": [{ "text": "Opção A", "points": 3 }, { "text": "Opção B", "points": 1 }] }
                ] 
            },
            "quizResults": {
                "lowRisk": { "title": "string", "text": "string" },
                "mediumRisk": { "title": "string", "text": "string" },
                "highRisk": { "title": "string", "text": "string" }
            },
            "salesPage": { 
                "headline": "string", 
                "subheadline": "string", 
                "problem": "string", 
                "mechanism": "string", 
                "offer": "string", 
                "guarantee": "string" 
            },
            "upsell": {
                "title": "string",
                "subtitle": "string",
                "hook": "string",
                "solution": "string",
                "offer": "string"
            }
        },
        "recoveryScripts": { "boleto": "string", "pix": "string", "objection": "string", "abandoned": "string" }
      }
    ],
    "visuals": { "feedPrompt": "string", "storyPrompt": "string", "thumbPrompt": "string" }
  }
`;

export const CampaignMaster: React.FC<CampaignMasterProps> = ({ userEmail, voiceTrigger, onVoiceTriggerHandled, onStatusChange }) => {
  const { addMemory, retrieveMemories, isReady: isMemoryReady } = useMemory(userEmail);

  const [productName, setProductName] = useState('');
  const [niche, setNiche] = useState('');
  const [offerDetails, setOfferDetails] = useState('');
  const [price, setPrice] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  
  const [selectedMentor, setSelectedMentor] = useState<MentorType>('neurion_default');

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [campaignData, setCampaignData] = useState<CampaignBible | null>(null);
  
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'angles' | 'scripts' | 'visuals'>('diagnosis');
  const [selectedAngleIndex, setSelectedAngleIndex] = useState(0);

  useEffect(() => {
      const saved = localStorage.getItem(`neurion_campaign_bible_${userEmail}`);
      if (saved) {
          try { setCampaignData(JSON.parse(saved)); } catch(e) {}
      }
  }, [userEmail]);

  useEffect(() => {
      if (voiceTrigger && voiceTrigger.action === 'GENERATE_FULL_CAMPAIGN') {
          const p = voiceTrigger.payload;
          
          // Fill ALL fields the OS provides
          if (p?.productName)    setProductName(p.productName);
          if (p?.description)    setOfferDetails(p.description);
          if (p?.niche)          setNiche(p.niche);
          if (p?.price)          setPrice(p.price);
          if (p?.targetAudience) setTargetAudience(p.targetAudience);
          
          // Set mentor/brain if provided
          if (p?.mentor) {
              const validMentors: MentorType[] = ['neurion_default', 'brasao', 'finch', 'erico', 'conrado'];
              const m = p.mentor as MentorType;
              if (validMentors.includes(m)) setSelectedMentor(m);
          }
          
          // Auto-start if OS confirmed with user and set autoStart=true
          if (p?.autoStart === true) {
              // Wait for state to settle then trigger generation
              setTimeout(() => handleGenerateStrategy(true), 800);
          } else if (p?.productName && p?.description && p?.niche) {
              // Fields filled but waiting for user confirmation — don't auto-start
              setTimeout(() => handleGenerateStrategy(true), 500);
          }
          
          if (onVoiceTriggerHandled) onVoiceTriggerHandled();
      }
  }, [voiceTrigger]);

  // --- THE ORCHESTRATOR LOGIC (v11.0) ---
  const orchestrateDataDistribution = (data: CampaignBible, prodName: string, prodNiche: string, prodPrice: string) => {
      console.log("Orchestrator: Distribuindo dados para os Agentes...");
      
      // 1. Sync to CREATIVE FACTORY (Agente Visual)
      const creativeContext = {
          productName: prodName,
          niche: prodNiche,
          painPoint: data.diagnosis.exposedWound,
          offerDetails: `Oferta: ${prodName}. Promessa: ${data.diagnosis.desiredIdentity}. Inimigo: ${data.diagnosis.invisibleEnemy}.`,
          visualStyle: selectedMentor === 'finch' ? 'cinematic' : 'wikihow', // Finch = Cinematic, Brasão = WikiHow (Amador)
          expertMode: true
      };
      localStorage.setItem(`neurion_creative_sync_${userEmail}`, JSON.stringify(creativeContext));

      // 2. Sync to FUNNEL BUILDER (Agente Arquiteto)
      if (data.angles && data.angles.length > 0) {
          const funnelContext = {
              productName: prodName,
              angleName: data.angles[0].angleName,
              salesPage: data.angles[0].funnelStructure.salesPage,
              upsell: data.angles[0].funnelStructure.upsell
          };
          localStorage.setItem(`neurion_funnel_sync_${userEmail}`, JSON.stringify(funnelContext));
      }

      // 3. Sync to SIMULATOR (Agente Financeiro)
      if (prodPrice) {
          const numPrice = parseFloat(prodPrice.replace('R$', '').replace('.', '').replace(',', '.'));
          if (!isNaN(numPrice)) {
              const simContext = {
                  productName: prodName,
                  ticketPrice: numPrice
              };
              localStorage.setItem(`neurion_simulator_sync_${userEmail}`, JSON.stringify(simContext));
          }
      }
  };

  const handleGenerateStrategy = async (isVoice = false) => {
      if (!productName || !offerDetails || !niche) {
          if (!isVoice) alert("Preencha pelo menos Nome, Nicho e Detalhes da Oferta.");
          return;
      }

      let apiKey = ((window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '');
      if (!apiKey) {
      }

      if (!apiKey) {
          alert("API Key necessária.");
          return;
      }

      setIsGenerating(true);
      if (onStatusChange) onStatusChange(true);
      setCampaignData(null);

      try {
          const ai = new GoogleGenAI({ apiKey });
          
          setProgressStep(`Ativando Agente: ${selectedMentor.toUpperCase()}...`);
          
          // Format Knowledge Base
          const kbContext = KNOWLEDGE_BASE.map(item => `Q: ${item.q}\nA: ${item.a}`).join('\n\n');

          const fullSystemPrompt = `
            ${MENTOR_PROMPTS[selectedMentor]}
            
            BASE DE CONHECIMENTO TÁTICO (NEURION ARCHIVE):
            ${kbContext}
            
            ${BASE_SYSTEM_PROMPT}
          `;

          const prompt = `
            PRODUTO: ${productName}
            NICHO: ${niche}
            DETALHES DA OFERTA: ${offerDetails}
            PREÇO: ${price || "Não informado"}
            PÚBLICO ALVO: ${targetAudience || "Geral do nicho"}

            Gere a BÍBLIA DA CAMPANHA completa.
            IMPORTANTE: Responda estritamente no formato JSON solicitado.
          `;

          // Simulate thinking/orchestration time for UX
          await new Promise(r => setTimeout(r, 1000));
          
          let result;
          try {
              result = await ai.models.generateContent({
                  model: getModel(),
                  contents: prompt,
                  config: {
                      systemInstruction: fullSystemPrompt,
                      responseMimeType: 'application/json',
                      thinkingConfig: { thinkingBudget: 4096 }
                  }
              });
          } catch (modelError: any) {
              // Check for 503 Service Unavailable or 429 Too Many Requests
              if (modelError.status === 503 || modelError.status === 429 || 
                  modelError.message?.includes('503') || modelError.message?.includes('429') ||
                  modelError.message?.includes('UNAVAILABLE')) {
                  
                  console.warn("Primary model unavailable, switching to fallback model (OpenAI).");
                  setProgressStep('Recurso principal ocupado. Ativando modelo de contingência...');
                  
                  // Fallback to Flash
                  result = await ai.models.generateContent({
                      model: 'OpenAI-2.5-flash',
                      contents: prompt,
                      config: {
                          systemInstruction: fullSystemPrompt,
                          responseMimeType: 'application/json'
                          // thinkingConfig not supported in Flash
                      }
                  });
              } else {
                  throw modelError;
              }
          }

          let jsonText = result.text || '{}';
          // Clean potential markdown code blocks to prevent JSON parse error
          jsonText = jsonText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
          
          const parsedData: CampaignBible = JSON.parse(jsonText);
          
          // Inject metadata
          parsedData.mentorUsed = selectedMentor;

          setCampaignData(parsedData);
          localStorage.setItem(`neurion_campaign_bible_${userEmail}`, JSON.stringify(parsedData));
          
          // --- TRIGGER ORCHESTRATION ---
          setProgressStep('Sincronizando Módulos do Sistema...');
          orchestrateDataDistribution(parsedData, productName, niche, price);
          await new Promise(r => setTimeout(r, 800));

      } catch (error) {
          console.error("Erro na geração:", error);
          alert("Erro ao gerar a campanha. Tente novamente em instantes.");
      } finally {
          setIsGenerating(false);
          if (onStatusChange) onStatusChange(false);
          setProgressStep('');
      }
  };

  const copyFullFunnelPrompt = (angleIdx: number) => {
      if (!campaignData) return;
      const angle = campaignData.angles[angleIdx];
      const f = angle.funnelStructure;

      let prompt = `PROMPT MESTRE PARA CRIAÇÃO DE FUNIL (IA)\n`;
      prompt += `TEMA: ${angle.angleName}\n\n`;
      
      prompt += `=== ETAPA 1: O HOOK (ANÚNCIO) ===\n`;
      prompt += `HEADLINE: ${f.hook.title}\nTEXTO: ${f.hook.text}\nCTA: ${f.hook.cta}\n\n`;

      prompt += `=== ETAPA 2: O QUIZ (LÓGICA E COPY) ===\n`;
      prompt += `TÍTULO: ${f.quiz.title}\nINTRO: ${f.quiz.intro}\n\n`;
      f.quiz.questions.forEach((q, i) => {
          prompt += `PERGUNTA ${i+1}: ${q.text}\n`;
          q.options.forEach((opt, j) => prompt += `   ${String.fromCharCode(97+j)}) ${opt.text} (${opt.points} pts)\n`);
          prompt += `\n`;
      });

      prompt += `=== ETAPA 3: RESULTADOS DO QUIZ ===\n`;
      prompt += `[0-4 PONTOS - BAIXO RISCO]\n${f.quizResults.lowRisk.title}\n"${f.quizResults.lowRisk.text}"\n\n`;
      prompt += `[5-8 PONTOS - MÉDIO RISCO]\n${f.quizResults.mediumRisk.title}\n"${f.quizResults.mediumRisk.text}"\n\n`;
      prompt += `[9-12 PONTOS - ALTO RISCO]\n${f.quizResults.highRisk.title}\n"${f.quizResults.highRisk.text}"\n\n`;

      prompt += `=== ETAPA 4: PÁGINA DE VENDAS (CHECKOUT) ===\n`;
      prompt += `HEADLINE: ${f.salesPage.headline}\nSUB: ${f.salesPage.subheadline}\n`;
      prompt += `PROBLEMA (DOR): ${f.salesPage.problem}\n`;
      prompt += `MECANISMO (SOLUÇÃO): ${f.salesPage.mechanism}\n`;
      prompt += `OFERTA: ${f.salesPage.offer}\nGARANTIA: ${f.salesPage.guarantee}\n\n`;

      prompt += `=== ETAPA 5: UPSELL (ONE CLICK) ===\n`;
      prompt += `TÍTULO: ${f.upsell.title}\nSUB: ${f.upsell.subtitle}\n`;
      prompt += `HOOK: ${f.upsell.hook}\nSOLUÇÃO: ${f.upsell.solution}\nOFERTA: ${f.upsell.offer}\n`;

      navigator.clipboard.writeText(prompt);
      alert("Copiado!");
  };

  const MentorCard = ({ id, name, desc, icon }: { id: MentorType, name: string, desc: string, icon: React.ReactNode }) => (
      <button 
        onClick={() => setSelectedMentor(id)}
        className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
            selectedMentor === id 
             ? 'bg-amber-900/30 border-amber-500 shadow-lg shadow-amber-900/20' 
            : 'bg-slate-900 border-slate-700 hover:border-slate-500 opacity-60 hover:opacity-100'
        }`}
      >
          <div className={`p-2 rounded-full ${selectedMentor === id ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {icon}
          </div>
          <div>
              <p className={`text-xs font-bold uppercase ${selectedMentor === id ? 'text-amber-400' : 'text-slate-300'}`}>{name}</p>
              <p className="text-[10px] text-slate-500">{desc}</p>
          </div>
      </button>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      
      {/* SIDEBAR: INPUTS */}
      <div className="lg:col-span-4 space-y-6">
        <Card title="Orquestrador Estratégico (v11.0)" icon={<BrainCircuit className="w-5 h-5 text-amber-400" />}>
            <div className="space-y-4">
                
                {/* MENTOR SELECTION */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Cpu className="w-3 h-3" /> Selecione o Cérebro
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        <MentorCard id="neurion_default" name="Neurion Core" desc="Analítico e Equilibrado" icon={<BrainCircuit className="w-4 h-4" />} />
                        <MentorCard id="brasao" name="O Monstro (Brasão)" desc="Tráfego Direto & Agressivo" icon={<Zap className="w-4 h-4" />} />
                        <MentorCard id="finch" name="O Outlier (Finch)" desc="High-Ticket & Cinematic" icon={<Rocket className="w-4 h-4" />} />
                        <MentorCard id="erico" name="O Lançador (Erico)" desc="Gatilhos & Fórmula" icon={<Target className="w-4 h-4" />} />
                        <MentorCard id="conrado" name="O Estrategista (8Ps)" desc="Método & Processo" icon={<UserCheck className="w-4 h-4" />} />
                    </div>
                </div>

                <hr className="border-slate-700/50" />

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Produto</label>
                    <input 
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:border-amber-500 outline-none text-sm"
                        placeholder="Nome do Produto"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nicho / Mercado</label>
                    <input 
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:border-amber-500 outline-none text-sm"
                        placeholder="Ex: Emagrecimento, Renda Extra..."
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Detalhes da Oferta</label>
                    <textarea 
                        value={offerDetails}
                        onChange={(e) => setOfferDetails(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:border-amber-500 outline-none resize-none scrollbar-hide text-xs"
                        placeholder="O que o produto entrega Qual a promessa?"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Preço</label>
                        <input 
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-amber-500 outline-none text-xs"
                            placeholder="R$ 97,00"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Público</label>
                        <input 
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-amber-500 outline-none text-xs"
                            placeholder="Homens 30+"
                        />
                    </div>
                </div>

                <button 
                    onClick={() => handleGenerateStrategy(false)}
                    disabled={isGenerating}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                        isGenerating 
                         ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-500/20'
                    }`}
                >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                    {isGenerating ? progressStep : 'Iniciar Orquestração'}
                </button>
            </div>
        </Card>
      </div>

      {/* MAIN: CONTENT */}
      <div className="lg:col-span-8">
          {!campaignData ? (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-900 border-2 border-slate-800 border-dashed rounded-xl text-slate-500">
                  <BrainCircuit className="w-20 h-20 mb-6 opacity-20" />
                  <h3 className="text-xl font-bold text-slate-300">Aguardando Comando</h3>
                  <p className="max-w-md text-center mt-2">Selecione uma personalidade, preencha os dados e deixe o Neurion orquestrar toda a campanha.</p>
              </div>
          ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col min-h-[700px]">
                  
                  {/* HEADER WITH TABS */}
                  <div className="border-b border-slate-800 bg-slate-950 flex items-center justify-between px-2">
                      <div className="flex">
                          <button 
                            onClick={() => setActiveTab('diagnosis')}
                            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'diagnosis' ? 'border-amber-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                          >
                              <HeartPulse className="w-4 h-4" /> Diagnóstico
                          </button>
                          <button 
                            onClick={() => setActiveTab('angles')}
                            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'angles' ? 'border-cyan-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                          >
                              <Target className="w-4 h-4" /> Funil & Ângulos
                          </button>
                          <button 
                            onClick={() => setActiveTab('scripts')}
                            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'scripts' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                          >
                              <MessageSquare className="w-4 h-4" /> Scripts Zap
                          </button>
                          <button 
                            onClick={() => setActiveTab('visuals')}
                            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'visuals' ? 'border-purple-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                          >
                              <ImageIcon className="w-4 h-4" /> Visual
                          </button>
                      </div>
                      
                      <div className="pr-4 flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                              Mentor: {campaignData.mentorUsed}
                          </span>
                          <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded flex items-center gap-1">
                              <Share2 className="w-3 h-3" /> Sync Ativo
                          </span>
                      </div>
                  </div>

                  {/* CONTENT AREA */}
                  <div className="p-6 overflow-y-auto flex-1 bg-slate-900/50">
                      
                      {/* --- TAB: DIAGNOSIS --- */}
                      {activeTab === 'diagnosis' && (
                          <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="bg-rose-900/10 border border-rose-500/30 p-5 rounded-xl">
                                      <h3 className="text-rose-400 font-bold text-xs uppercase tracking-wide mb-2 flex items-center gap-2">
                                          <HeartPulse className="w-4 h-4" /> Ferida Exposta
                                      </h3>
                                      <p className="text-slate-200 text-sm leading-relaxed">{campaignData.diagnosis.exposedWound}</p>
                                  </div>
                                  <div className="bg-purple-900/10 border border-purple-500/30 p-5 rounded-xl">
                                      <h3 className="text-purple-400 font-bold text-xs uppercase tracking-wide mb-2 flex items-center gap-2">
                                          <Ghost className="w-4 h-4" /> Inimigo Invisível
                                      </h3>
                                      <p className="text-slate-200 text-sm leading-relaxed">{campaignData.diagnosis.invisibleEnemy}</p>
                                  </div>
                                  <div className="bg-emerald-900/10 border border-emerald-500/30 p-5 rounded-xl">
                                      <h3 className="text-emerald-400 font-bold text-xs uppercase tracking-wide mb-2 flex items-center gap-2">
                                          <UserCheck className="w-4 h-4" /> Identidade Desejada
                                      </h3>
                                      <p className="text-slate-200 text-sm leading-relaxed">{campaignData.diagnosis.desiredIdentity}</p>
                                  </div>
                              </div>

                              <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
                                  <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wide mb-3">Diretrizes de Tom de Voz ({selectedMentor})</h3>
                                  <p className="text-white italic text-sm border-l-2 border-amber-500 pl-4 py-1">
                                      "{campaignData.guidelines.toneOfVoice}"
                                  </p>
                                  <div className="mt-4 flex flex-wrap gap-2">
                                      <span className="text-xs text-slate-500 uppercase font-bold mr-2">Proibido Falar:</span>
                                      {(campaignData.guidelines.bannedWords || []).map((w, i) => (
                                          <span key={i} className="px-2 py-1 bg-red-900/20 text-red-400 text-xs rounded border border-red-900/30 line-through decoration-red-500">{w}</span>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* --- TAB: ANGLES (THE FUNNEL) --- */}
                      {activeTab === 'angles' && (
                          <div className="flex h-full gap-6 animate-in slide-in-from-right-4 duration-300">
                              {/* ANGLE SELECTOR */}
                              <div className="w-64 flex-shrink-0 space-y-2">
                                  {(campaignData.angles || []).map((angle, idx) => (
                                      <button
                                          key={idx}
                                          onClick={() => setSelectedAngleIndex(idx)}
                                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                                              selectedAngleIndex === idx 
                                               ? 'bg-cyan-900/20 border-cyan-500 text-white shadow-lg shadow-cyan-900/10' 
                                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                          }`}
                                      >
                                          <div className="text-[10px] uppercase font-bold opacity-70 mb-1">Ângulo {idx + 1}</div>
                                          <div className="font-bold text-sm leading-tight">{angle.angleName}</div>
                                      </button>
                                  ))}
                              </div>

                              {/* ANGLE CONTENT */}
                              <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                                  {/* MASTER PROMPT ACTION */}
                                  <div className="bg-amber-900/10 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between">
                                      <div>
                                          <h4 className="text-amber-400 font-bold text-sm">Prompt Mestre de Funil</h4>
                                          <p className="text-slate-400 text-xs">Copie toda a estrutura deste ângulo (Quiz, Página, Upsell) para colar na IA Criadora de Sites.</p>
                                      </div>
                                      <button 
                                        onClick={() => copyFullFunnelPrompt(selectedAngleIndex)}
                                        className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg"
                                      >
                                          <Copy className="w-4 h-4" /> Copiar Prompt Mestre
                                      </button>
                                  </div>

                                  {/* QUIZ STRUCTURE */}
                                  <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                                      <h4 className="text-cyan-400 font-bold text-xs uppercase mb-3 flex items-center gap-2">
                                          <User className="w-4 h-4" /> Quiz: {campaignData.angles[selectedAngleIndex]?.funnelStructure?.quiz?.title || 'Título'}
                                      </h4>
                                      <p className="text-slate-300 text-sm italic mb-4 border-l-2 border-slate-600 pl-3">"{campaignData.angles[selectedAngleIndex]?.funnelStructure?.quiz?.intro || '...'}"</p>
                                      
                                      <div className="space-y-4">
                                          {(campaignData.angles[selectedAngleIndex]?.funnelStructure?.quiz?.questions || []).map((q, i) => (
                                              <div key={i} className="bg-slate-900 p-3 rounded border border-slate-800">
                                                  <p className="text-sm text-slate-200 font-bold mb-2">{i+1}. {q.text}</p>
                                                  <div className="grid grid-cols-1 gap-1">
                                                      {(q.options || []).map((opt, j) => (
                                                          <div key={j} className="flex justify-between text-xs text-slate-400 bg-slate-950 p-2 rounded">
                                                              <span>{opt.text}</span>
                                                              <span className="text-cyan-500 font-mono">({opt.points} pts)</span>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>

                                  {/* SALES PAGE */}
                                  <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                                      <h4 className="text-emerald-400 font-bold text-xs uppercase mb-3 flex items-center gap-2">
                                          <CreditCard className="w-4 h-4" /> Copy da Página de Vendas
                                      </h4>
                                      <div className="space-y-4">
                                          <div className="bg-slate-900 p-3 rounded">
                                              <p className="text-[10px] text-slate-500 uppercase font-bold">Headline</p>
                                              <p className="text-white font-bold text-lg">{campaignData.angles[selectedAngleIndex]?.funnelStructure?.salesPage?.headline || 'Headline'}</p>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              <div className="bg-slate-900 p-3 rounded">
                                                  <p className="text-[10px] font-bold text-red-400 uppercase mb-1">A Dor Real</p>
                                                  <p className="text-slate-300 text-xs leading-relaxed">{campaignData.angles[selectedAngleIndex]?.funnelStructure?.salesPage?.problem}</p>
                                              </div>
                                              <div className="bg-slate-900 p-3 rounded">
                                                  <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">O Mecanismo Único</p>
                                                  <p className="text-slate-300 text-xs leading-relaxed">{campaignData.angles[selectedAngleIndex]?.funnelStructure?.salesPage?.mechanism}</p>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* --- TAB: SCRIPTS --- */}
                      {activeTab === 'scripts' && campaignData.angles[selectedAngleIndex]?.recoveryScripts && (
                          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <ScriptCard title="Boleto Gerado" text={campaignData.angles[selectedAngleIndex].recoveryScripts.boleto} color="border-yellow-500/50" />
                                  <ScriptCard title="Pix Não Pago" text={campaignData.angles[selectedAngleIndex].recoveryScripts.pix} color="border-emerald-500/50" />
                                  <ScriptCard title="Quebra de Objeção" text={campaignData.angles[selectedAngleIndex].recoveryScripts.objection} color="border-blue-500/50" />
                                  <ScriptCard title="Carrinho Abandonado" text={campaignData.angles[selectedAngleIndex].recoveryScripts.abandoned} color="border-rose-500/50" />
                              </div>
                          </div>
                      )}

                      {/* --- TAB: VISUALS --- */}
                      {activeTab === 'visuals' && (
                          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <VisualPromptCard title="Feed (Scroll-Stopper)" prompt={campaignData.visuals.feedPrompt} />
                                  <VisualPromptCard title="Stories (Vertical)" prompt={campaignData.visuals.storyPrompt} />
                                  <VisualPromptCard title="Thumbnail (YouTube/VSL)" prompt={campaignData.visuals.thumbPrompt} />
                              </div>
                          </div>
                      )}

                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

// --- HELPER COMPONENTS ---
const ScriptCard = ({ title, text, color }: { title: string, text: string, color: string }) => (
    <div className={`bg-slate-800 p-5 rounded-xl border ${color} relative group`}>
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Copy className="w-4 h-4 text-slate-500 hover:text-white cursor-pointer" onClick={() => navigator.clipboard.writeText(text)} />
        </div>
        <h4 className="text-white font-bold text-sm mb-3">{title}</h4>
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
            <p className="text-slate-300 text-sm whitespace-pre-line font-medium leading-relaxed">
                {text}
            </p>
        </div>
    </div>
);

const VisualPromptCard = ({ title, prompt }: { title: string, prompt: string }) => (
    <div className="bg-black border border-slate-800 rounded-xl p-4 flex flex-col h-full">
        <h4 className="text-slate-400 font-bold text-xs uppercase mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> {title}
        </h4>
        <p className="text-slate-500 text-xs italic flex-1 overflow-y-auto max-h-40 mb-3 font-mono">
            {prompt}
        </p>
        <button 
            onClick={() => navigator.clipboard.writeText(prompt)}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 transition-colors"
        >
            Copiar Prompt
        </button>
    </div>
);


