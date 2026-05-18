
import React, { useState, useEffect } from 'react';
import { getModel, MODEL_IMAGE } from '../utils/modelConfig';
import { Card } from './Card';
import { 
  Users, 
  Target, 
  Search, 
  Loader2, 
  Copy, 
  Briefcase, 
  Heart, 
  AlertOctagon, 
  Zap,
  Hash,
  BrainCircuit,
  Lightbulb,
  DollarSign,
  ShoppingCart,
  ArrowRight,
  Gem,
  ShieldCheck,
  PlusCircle,
  Award
} from 'lucide-react';
import { OpenAICompatClient as GoogleGenAI } from "../utils/openai";
import { VoiceCommand } from '../types';

// --- TYPES LOCAIS ---
interface DeepAvatar {
  nicheRefinement: string;
  avatarSummary: string;
  primaryGoal: string;
  painPoints: string[]; // Acute, Chronic, Hidden
  beliefs: string[]; // False Solutions, Mistaken Beliefs
  triggers: string[]; // Anger, Envy, Fear
  objections: string[];
  conversationalInsights: string[]; // "Reworded" real world examples
  targetingInterests: string[];
}

interface OfferStrategy {
  usp: string; // Unique Selling Proposition
  uniqueMechanism: string; // The "Secret Sauce"
  offerName: string;
  price: string;
  guarantee: string;
  modules: string[];
  bonuses: { name: string; value: string; description: string }[];
  testimonials: { name: string; text: string }[];
}

interface ProductStack {
  orderBumps: { name: string; type: string; price: string; description: string }[];
  upsells: { name: string; price: string; description: string; guarantee: string }[];
}

interface AudienceHunterProps {
    voiceTrigger?: VoiceCommand | null;
    onVoiceTriggerHandled?: () => void;
    userEmail: string; // User email passed from parent
    onStatusChange?: (isGenerating: boolean) => void;
}

export const AudienceHunter: React.FC<AudienceHunterProps> = ({ voiceTrigger, onVoiceTriggerHandled, userEmail, onStatusChange }) => {
  // Input
  const [productName, setProductName] = useState('');
  const [niche, setNiche] = useState('');
  
  // State
  const [step, setStep] = useState<'idle' | 'avatar' | 'offer' | 'stack' | 'done'>('idle');
  const [activeTab, setActiveTab] = useState<'avatar' | 'offer' | 'stack'>('avatar');
  
  // Data
  const [avatarData, setAvatarData] = useState<DeepAvatar | null>(null);
  const [offerData, setOfferData] = useState<OfferStrategy | null>(null);
  const [stackData, setStackData] = useState<ProductStack | null>(null);

  // --- VOICE CONTROL ---
  useEffect(() => {
      if (voiceTrigger && voiceTrigger.action === 'RESEARCH_AUDIENCE' && step === 'idle') {
          const p = voiceTrigger.payload;
          
          const voiceOverrides = {
              productName: p?.productName || "Produto Voz",
              niche: p?.niche || "Geral"
          };

          // Update UI
          setProductName(voiceOverrides.productName);
          setNiche(voiceOverrides.niche);
          
          // Trigger generation DIRECTLY with overrides to avoid stale state
          generateFullStrategy(true, voiceOverrides);

          if (onVoiceTriggerHandled) onVoiceTriggerHandled();
      }
  }, [voiceTrigger]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiado para a área de transferência!");
  };

  const cleanAndParse = (text: string | undefined) => {
      if (!text) return {};
      // Remove markdown code blocks if present
      let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
      
      // Attempt to extract JSON if there is extra text
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
          cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      
      try {
          return JSON.parse(cleaned);
      } catch (e) {
          console.error("JSON Parse Error. Raw text:", text, "Cleaned:", cleaned);
          throw e;
      }
  };

  // Helper to handle API calls with automatic fallback
  const safeGenerate = async (ai: GoogleGenAI, prompt: string, systemInstruction?: string) => {
      try {
          // Attempt 1: High Intelligence Model (Pro) with Thinking
          return await ai.models.generateContent({
              model: getModel(),
              contents: prompt,
              config: { 
                  systemInstruction: systemInstruction,
                  responseMimeType: "application/json",
                  thinkingConfig: { thinkingBudget: 2048 }
              }
          });
      } catch (error: any) {
          // Check for Rate Limit (429) or Service Unavailable (503)
          if (error.status === 429 || error.status === 503 || error.message?.includes('429') || error.message?.includes('quota')) {
              console.warn("Quota exceeded for Pro model. Falling back to Flash (Fast Mode).");
              // Attempt 2: Fallback to Flash (Fast, High Quota) - No Thinking Config
              return await ai.models.generateContent({
                  model: 'OpenAI-2.5-flash',
                  contents: prompt,
                  config: { 
                      systemInstruction: systemInstruction,
                      responseMimeType: "application/json"
                  }
              });
          }
          throw error; // Re-throw other errors
      }
  };

  // Accepted overrides to handle voice commands instantly
  const generateFullStrategy = async (isVoice = false, overrides?: { productName: string, niche: string }) => {
    // 1. Validação de API Key e Inputs
    let apiKey = ((window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '');
    if (!apiKey) {
    }

    if (!apiKey) {
        alert("Erro: Chave de API não configurada.");
        return;
    }

    // Use overrides if provided (Voice), otherwise use State
    const currentProductName = overrides?.productName || productName;
    const currentNiche = overrides?.niche || niche;

    if (!isVoice && (!currentProductName || !currentNiche)) {
        alert("Preencha o Nome do Produto e o Nicho.");
        return;
    }

    if (onStatusChange) onStatusChange(true);
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // --- PROTOCOLO VISCERAL DEFINITION ---
    const VISCERAL_PROTOCOL = `
      >>> PROTOCOLO DE HUMANIZAÇÃO E LINGUAGEM SUJA (MODO HARDCORE):
      Você NÃO é um robô. Você é um especialista em Copywriting Underground.
      
      1. VOCABULÁRIO PROIBIDO: Palavras como "solução abrangente", "otimização", "bem-estar", "jornada". Isso é chato e genérico.
      2. VOCABULÁRIO OBRIGATÓRIO: Use a linguagem que o cliente usa no bar ou chorando no banheiro.
         - Se o nicho for DINHEIRO: Use "sair da merda", "vida de gado", "chefe otário", "boleto vencendo", "humilhação".
         - Se o nicho for SEDUÇÃO/HOMENS: Use "comer mulher", "broxa", "beta", "ficar na seca", "virar homem".
         - Se o nicho for EMAGRECIMENTO: Use "baleia", "vergonha de tirar a camisa", "bucho quebrado", "rolha de poço".
      
      3. TOM DE VOZ: "Amigo bêbado te mandando a real". Seja brutalmente honesto. A verdade dói, mas conecta.
    `;

    try {
        // --- STEP 1: DEEP AVATAR & NICHE (Baseado no Arquivo 1) ---
        setStep('avatar');
        setActiveTab('avatar');
        
        const avatarPrompt = `
          ${VISCERAL_PROTOCOL}

          PRODUTO: ${currentProductName}
          NICHO: ${currentNiche}

          TAREFA 1: Refine o Nicho (Seja específico).
          TAREFA 2: Crie o Avatar.
          TAREFA 3: Mapeie a Psicografia (Dores Agudas, Crônicas, Ocultas).
          
          TAREFA 4 (CRUCIAL): "Conversational Insights".
          Escreva 5 frases que o cliente fala para si mesmo.
          EXEMPLO DO TOM ESPERADO:
          - "Puta que pariu, não aguento mais pegar ônibus lotado todo dia."
          - "Me sinto um lixo quando ela olha pro cara do lado."
          - "Essa barriga maldita não some nem com reza braba."
          
          TAREFA 5: Interesses de Targeting (Facebook Ads).

          OUTPUT JSON FORMAT ONLY:
          {
            "nicheRefinement": "string",
            "avatarSummary": "string",
            "primaryGoal": "string",
            "painPoints": ["string (Use linguagem visceral)"],
            "beliefs": ["string"],
            "triggers": ["string"],
            "objections": ["string"],
            "conversationalInsights": ["string (Frases reais e pesadas)"],
            "targetingInterests": ["string"]
          }
          Respond in PORTUGUESE (BRAZIL).
        `;

        const avatarRes = await safeGenerate(ai, avatarPrompt);
        const avatarResult = cleanAndParse(avatarRes.text);
        setAvatarData(avatarResult);

        // --- STEP 2: OFFER, USP & MECHANISM (Baseado no Arquivo 2) ---
        setStep('offer');
        setActiveTab('offer');
        
        const offerPrompt = `
          ${VISCERAL_PROTOCOL}
          CONTEXT: Avatar Data: ${JSON.stringify(avatarResult)}
          PRODUCT: ${currentProductName}

          Act as a Senior Direct Response Copywriter (Underground Style).
          
          TASK 1: USP (Unique Selling Proposition). Promessa forte, sem "bullshit".
          
          TASK 2: UNIQUE MECHANISM. Um nome misterioso para o "segredo".
          Exemplos: "O Protocolo da Testosterona", "A Pílula do Bilionário".
          
          TASK 3: A OFERTA.
          - Nome da Oferta (Killer).
          - Preço.
          - Garantia (Descreva como "Risco Zero ou seu dinheiro de volta sem perguntas idiotas").
          - 3 Módulos (Nomes curiosos).
          - 3 Bônus (Nomes de alto valor percebido).
          - 2 Depoimentos (Falsos para exemplo, mas com linguagem ULTRA REALISTA/GÍRIAS. Ex: "Mano, achei que era golpe, mas...").

          OUTPUT JSON FORMAT ONLY:
          {
            "usp": "string",
            "uniqueMechanism": "string",
            "offerName": "string",
            "price": "string",
            "guarantee": "string",
            "modules": ["string"],
            "bonuses": [{"name": "string", "value": "string", "description": "string"}],
            "testimonials": [{"name": "string", "text": "string"}]
          }
          Respond in PORTUGUESE (BRAZIL).
        `;

        const offerRes = await safeGenerate(ai, offerPrompt);
        const offerResult = cleanAndParse(offerRes.text);
        setOfferData(offerResult);

        // --- STEP 3: PRODUCT STACK (BUMPS & UPSELLS) (Baseado no Arquivo 3) ---
        setStep('stack');
        setActiveTab('stack');

        const stackPrompt = `
          ${VISCERAL_PROTOCOL}
          CONTEXT: Offer Data: ${JSON.stringify(offerResult)}
          
          TAREFA: Criar 3 Order Bumps e 3 Upsells.
          
          Regra dos Upsells: Eles devem resolver o "próximo problema" ou acelerar o resultado.
          Use nomes que gerem desejo imediato (ganância, luxúria, preguiça).

          OUTPUT JSON FORMAT ONLY:
          {
            "orderBumps": [{"name": "string", "type": "string", "price": "string", "description": "string"}],
            "upsells": [{"name": "string", "price": "string", "description": "string", "guarantee": "string"}]
          }
          Respond in PORTUGUESE (BRAZIL).
        `;

        const stackRes = await safeGenerate(ai, stackPrompt);
        setStackData(cleanAndParse(stackRes.text));

        setStep('done');

    } catch (error) {
        console.error("Strategy Gen Error", error);
        alert("Erro ao gerar estratégia ou cota da API excedida. Tente novamente em alguns segundos.");
        setStep('idle');
    } finally {
        if (onStatusChange) onStatusChange(false);
    }
  };

  const renderLoading = (currentStep: string) => (
    <div className="flex flex-col items-center justify-center h-64 text-center animate-in fade-in">
        <Loader2 className="w-12 h-12 text-rose-400 animate-spin mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Construindo sua Máquina de Vendas</h3>
        <p className="text-slate-400 text-sm animate-pulse">{currentStep}</p>
        <p className="text-xs text-slate-500 mt-2">(Usando OpenAI com Fallback Inteligente)</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      
      {/* SIDEBAR: INPUTS */}
      <div className="lg:col-span-4 space-y-6">
         <Card title="Arquiteto de Estratégia" icon={<BrainCircuit className="w-5 h-5 text-rose-400" />}>
            <div className="space-y-4">
                <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-lg">
                    <h4 className="text-rose-400 font-bold text-sm mb-1">Copywriting Direct Response</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Esta IA utiliza modelos avançados de raciocínio para criar avatares e ofertas extremamente persuasivas.
                    </p>
                </div>

                <div className="flex items-start gap-2 bg-slate-800/50 p-3 rounded border border-slate-700/50">
                   <Award className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                   <p className="text-[10px] text-slate-400 leading-tight">
                      A construção dessa ferramenta foi feita com base em prompts do <span className="text-rose-400 font-bold">Thiago Finch</span>.
                   </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Nome do Produto</label>
                    <input 
                        type="text" 
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none"
                        placeholder="Ex: Protocolo Zero Barriga"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Nicho / Descrição Básica</label>
                    <textarea 
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                        placeholder="Ex: Emagrecimento para mulheres acima de 40 anos que não têm tempo para academia."
                    />
                </div>

                <button 
                    onClick={() => generateFullStrategy(false)}
                    disabled={step !== 'idle' && step !== 'done'}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                        step !== 'idle' && step !== 'done'
                         ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-500/20'
                    }`}
                >
                    {step !== 'idle' && step !== 'done' ? (
                        <>
                           <Loader2 className="w-5 h-5 animate-spin" />
                           Processando...
                        </>
                    ) : (
                        <>
                           <Zap className="w-5 h-5" />
                           Gerar Estratégia Completa
                        </>
                    )}
                </button>
            </div>
         </Card>

         {/* Steps Indicator */}
         {step !== 'idle' && (
             <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2">
                 <div className={`flex items-center gap-2 text-sm ${avatarData ? 'text-emerald-400' : 'text-slate-500'}`}>
                     {avatarData ? <Users className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                     1. Avatar & Psicografia
                 </div>
                 <div className={`flex items-center gap-2 text-sm ${offerData ? 'text-emerald-400' : 'text-slate-500'}`}>
                     {offerData ? <Gem className="w-4 h-4" /> : (avatarData && <Loader2 className="w-4 h-4 animate-spin" />)}
                     2. Oferta Irresistível & USP
                 </div>
                 <div className={`flex items-center gap-2 text-sm ${stackData ? 'text-emerald-400' : 'text-slate-500'}`}>
                     {stackData ? <ShoppingCart className="w-4 h-4" /> : (offerData && <Loader2 className="w-4 h-4 animate-spin" />)}
                     3. Esteira de Produtos (Stack)
                 </div>
             </div>
         )}
      </div>

      {/* MAIN CONTENT: TABS */}
      <div className="lg:col-span-8">
         {step === 'idle' ? (
             <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-700 text-slate-500 p-8 text-center">
                 <BrainCircuit className="w-16 h-16 mb-4 opacity-20" />
                 <h3 className="text-xl font-bold mb-2">Laboratório de Estratégia</h3>
                 <p className="max-w-md">Preencha os dados ao lado para gerar uma análise profunda de avatar, criar uma USP única e montar uma esteira de produtos completa.</p>
             </div>
         ) : (
             <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden min-h-[600px] flex flex-col shadow-2xl">
                 
                 {/* TAB HEADER */}
                 <div className="flex border-b border-slate-800 bg-slate-950">
                     <button 
                        onClick={() => setActiveTab('avatar')}
                        disabled={!avatarData}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${
                            activeTab === 'avatar' ? 'border-rose-500 text-white bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                     >
                        <Users className="w-4 h-4" /> Avatar & Nicho
                     </button>
                     <button 
                        onClick={() => setActiveTab('offer')}
                        disabled={!offerData}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${
                            activeTab === 'offer' ? 'border-amber-500 text-white bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                     >
                        <Gem className="w-4 h-4" /> Oferta & USP
                     </button>
                     <button 
                        onClick={() => setActiveTab('stack')}
                        disabled={!stackData}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${
                            activeTab === 'stack' ? 'border-cyan-500 text-white bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                     >
                        <ShoppingCart className="w-4 h-4" /> Esteira (Upsells)
                     </button>
                 </div>

                 {/* TAB CONTENT */}
                 <div className="p-6 flex-1 bg-slate-900 overflow-y-auto">
                     
                     {/* 1. AVATAR TAB */}
                     {activeTab === 'avatar' && (
                         !avatarData ? renderLoading("Analisando psicografia profunda...") : (
                         <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                             <div className="bg-rose-900/10 border border-rose-500/20 p-4 rounded-lg">
                                 <h3 className="text-rose-400 font-bold text-sm uppercase tracking-wide mb-2 flex items-center gap-2">
                                    <Target className="w-4 h-4" /> Refinamento de Nicho
                                 </h3>
                                 <p className="text-xl text-white font-medium">{avatarData.nicheRefinement}</p>
                                 <p className="text-slate-400 mt-2 text-sm italic">"{avatarData.avatarSummary}"</p>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <Card title="Dores & Crenças" icon={<AlertOctagon className="w-4 h-4 text-rose-400" />}>
                                     <ul className="space-y-2 text-sm text-slate-300">
                                         {(avatarData.painPoints || []).slice(0, 4).map((p, i) => <li key={i} className="flex gap-2"><span className="text-rose-500">•</span> {p}</li>)}
                                     </ul>
                                     <div className="mt-4 pt-4 border-t border-slate-700">
                                         <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Crenças Limitantes</h5>
                                         <ul className="space-y-1 text-sm text-slate-400">
                                            {(avatarData.beliefs || []).slice(0, 3).map((b, i) => <li key={i}>- {b}</li>)}
                                         </ul>
                                     </div>
                                 </Card>

                                 <Card title="Linguagem Visceral (Copy)" icon={<Briefcase className="w-4 h-4 text-blue-400" />}>
                                     <div className="space-y-3">
                                         {(avatarData.conversationalInsights || []).map((insight, i) => (
                                             <div key={i} className="bg-slate-800 p-3 rounded border border-slate-700 italic text-slate-300 text-sm border-l-2 border-l-blue-500">
                                                 "{insight}"
                                             </div>
                                         ))}
                                     </div>
                                 </Card>
                             </div>

                             <Card title="Segmentação de Interesses (Ads)" icon={<Hash className="w-4 h-4 text-emerald-400" />}>
                                 <div className="flex flex-wrap gap-2">
                                     {(avatarData.targetingInterests || []).map((interest, i) => (
                                         <button key={i} onClick={() => copyToClipboard(interest)} className="px-3 py-1 bg-slate-800 hover:bg-emerald-900/30 border border-slate-700 hover:border-emerald-500 text-slate-300 rounded-full text-xs transition-colors">
                                             {interest}
                                         </button>
                                     ))}
                                 </div>
                             </Card>
                         </div>
                         )
                     )}

                     {/* 2. OFFER TAB */}
                     {activeTab === 'offer' && (
                         !offerData ? renderLoading("Criando USP e Mecanismo Único...") : (
                         <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                             
                             {/* USP & MECHANISM */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/30 p-5 rounded-xl">
                                     <h3 className="text-amber-400 font-bold text-sm uppercase mb-3 flex items-center gap-2">
                                         <Lightbulb className="w-4 h-4" /> USP (Proposta Única)
                                     </h3>
                                     <p className="text-slate-200 leading-relaxed text-sm">{offerData.usp}</p>
                                 </div>
                                 <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/30 p-5 rounded-xl">
                                     <h3 className="text-purple-400 font-bold text-sm uppercase mb-3 flex items-center gap-2">
                                         <BrainCircuit className="w-4 h-4" /> Mecanismo Único
                                     </h3>
                                     <p className="text-slate-200 leading-relaxed text-sm font-medium">{offerData.uniqueMechanism}</p>
                                 </div>
                             </div>

                             {/* THE OFFER */}
                             <Card title="Estrutura da Oferta Irresistível" icon={<DollarSign className="w-4 h-4 text-emerald-400" />}>
                                 <div className="mb-6 border-b border-slate-700 pb-4">
                                     <div className="flex justify-between items-center mb-2">
                                        <h2 className="text-2xl font-bold text-white">{offerData.offerName}</h2>
                                        <div className="text-right">
                                            <span className="text-3xl font-bold text-emerald-400">{offerData.price}</span>
                                        </div>
                                     </div>
                                     <div className="flex items-center gap-2 text-emerald-400/80 text-sm font-medium bg-emerald-900/10 inline-block px-3 py-1 rounded-full border border-emerald-900/30">
                                         <ShieldCheck className="w-4 h-4" /> Garantia: {offerData.guarantee}
                                     </div>
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                     <div>
                                         <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Entregáveis (Módulos)</h4>
                                         <ul className="space-y-3">
                                             {(offerData.modules || []).map((mod, i) => (
                                                 <li key={i} className="flex items-start gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
                                                     <div className="bg-slate-700 text-slate-300 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i+1}</div>
                                                     <span className="text-slate-300 text-sm">{mod}</span>
                                                 </li>
                                             ))}
                                         </ul>
                                     </div>
                                     <div>
                                         <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Bônus Exclusivos</h4>
                                         <ul className="space-y-3">
                                             {(offerData.bonuses || []).map((bonus, i) => (
                                                 <li key={i} className="bg-slate-800 p-3 rounded-lg border border-slate-700 relative overflow-hidden">
                                                     <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-bl font-bold">VALOR: {bonus.value}</div>
                                                     <p className="font-bold text-emerald-400 text-sm mb-1">{bonus.name}</p>
                                                     <p className="text-slate-400 text-xs">{bonus.description}</p>
                                                 </li>
                                             ))}
                                         </ul>
                                     </div>
                                 </div>
                             </Card>
                         </div>
                         )
                     )}

                     {/* 3. STACK TAB */}
                     {activeTab === 'stack' && (
                         !stackData ? renderLoading("Desenhando esteira de produtos...") : (
                         <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                             
                             {/* ORDER BUMPS */}
                             <div>
                                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                     <PlusCircleIcon className="w-5 h-5 text-emerald-400" /> Order Bumps (No Checkout)
                                 </h3>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     {(stackData.orderBumps || []).map((bump, i) => (
                                         <div key={i} className="bg-slate-800 border-2 border-slate-700 border-dashed hover:border-emerald-500/50 p-4 rounded-xl transition-colors group">
                                             <div className="flex justify-between items-start mb-2">
                                                 <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded uppercase font-bold">{bump.type}</span>
                                                 <span className="text-emerald-400 font-bold">{bump.price}</span>
                                             </div>
                                             <h4 className="font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">{bump.name}</h4>
                                             <p className="text-xs text-slate-400 leading-relaxed">{bump.description}</p>
                                         </div>
                                     ))}
                                 </div>
                             </div>

                             {/* UPSELLS */}
                             <div>
                                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                     <ArrowRight className="w-5 h-5 text-cyan-400" /> Funil de Upsells (Pós-Compra)
                                 </h3>
                                 <div className="space-y-4">
                                     {(stackData.upsells || []).map((upsell, i) => (
                                         <div key={i} className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 p-5 rounded-xl flex flex-col md:flex-row gap-6 items-center">
                                             <div className="flex-shrink-0 w-12 h-12 bg-cyan-900/30 text-cyan-400 rounded-full flex items-center justify-center font-bold text-xl border border-cyan-500/30">
                                                 {i + 1}
                                             </div>
                                             <div className="flex-1">
                                                 <div className="flex items-center gap-3 mb-1">
                                                     <h4 className="text-lg font-bold text-white">{upsell.name}</h4>
                                                     <span className="text-cyan-400 font-bold bg-cyan-900/20 px-2 py-0.5 rounded text-sm">{upsell.price}</span>
                                                 </div>
                                                 <p className="text-slate-400 text-sm mb-2">{upsell.description}</p>
                                                 <p className="text-xs text-slate-500 flex items-center gap-1">
                                                     <ShieldCheck className="w-3 h-3" /> {upsell.guarantee}
                                                 </p>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>

                         </div>
                         )
                     )}

                 </div>
             </div>
         )}
      </div>
    </div>
  );
};

// Helper Icon
const PlusCircleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
);


