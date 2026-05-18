
import React, { useState, useEffect } from 'react';
import { getModel, MODEL_IMAGE } from '../utils/modelConfig';
import { Card } from './Card';
import { 
  Briefcase, 
  TrendingUp, 
  DollarSign, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Zap, 
  BarChart,
  Lightbulb
} from 'lucide-react';
import { OpenAICompatClient as GoogleGenAI, Type } from "../utils/openai";
import { VoiceCommand, BusinessPlan } from '../types';
import { KNOWLEDGE_BASE } from '../data/knowledgeBase';

interface BusinessConsultantProps {
  userEmail: string;
  voiceTrigger?: VoiceCommand | null;
  onVoiceTriggerHandled?: () => void;
}

export const BusinessConsultant: React.FC<BusinessConsultantProps> = ({ userEmail, voiceTrigger, onVoiceTriggerHandled }) => {
  const [businessIdea, setBusinessIdea] = useState('');
  const [marketSize, setMarketSize] = useState('');
  const [competition, setCompetition] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [plan, setPlan] = useState<BusinessPlan | null>(null);

  // --- VOICE CONTROL ---
  useEffect(() => {
      if (voiceTrigger && voiceTrigger.action === 'CONSULT_BUSINESS') {
          if (voiceTrigger.payload?.businessIdea) {
              setBusinessIdea(voiceTrigger.payload.businessIdea);
              setTimeout(() => handleAnalyze(true), 500);
          }
          if (onVoiceTriggerHandled) onVoiceTriggerHandled();
      }
  }, [voiceTrigger]);

  const handleAnalyze = async (isVoice = false) => {
      if (!businessIdea) {
          if (!isVoice) alert("Descreva sua ideia de negócio.");
          return;
      }

      let apiKey = ((window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '');
      if (!apiKey) {
      }

      if (!apiKey) {
          alert("API Key necessária.");
          return;
      }

      setIsAnalyzing(true);
      setPlan(null);

      try {
          const ai = new GoogleGenAI({ apiKey });
          
          // Format Knowledge Base for Context
          const kbContext = KNOWLEDGE_BASE.map(item => `Q: ${item.q}\nA: ${item.a}`).join('\n\n');

          const systemInstruction = `
            ATUE COMO UM CONSULTOR DE NEGÓCIOS SÊNIOR (CFO VIRTUAL).
            MÓDULO 6 DO NEURION OS v14.0.
            
            BASE DE CONHECIMENTO (USE ESTES PRINCÍPIOS E TOM DE VOZ):
            ${kbContext}

            OBJETIVO: Analisar a viabilidade de uma ideia, sugerir precificação e criar um roadmap.
            SEJA CRÍTICO E REALISTA. Não seja apenas motivacional. Use o tom direto e baseado em resultados da base de conhecimento.
            
            ESTRUTURA DE RESPOSTA (JSON):
            {
                "viabilityScore": number (0-10),
                "viabilityReason": "string (Justificativa curta e grossa)",
                "revenueModel": "string (Ex: Assinatura, Venda Única, High-Ticket)",
                "pricingStrategy": {
                    "low": "string (Preço de entrada)",
                    "medium": "string (Preço padrão)",
                    "high": "string (Preço premium/ancoragem)",
                    "recommended": "string (Qual escolher e por que)"
                },
                "roadmap": {
                    "phase1": "string (MVP / Primeiros 30 dias)",
                    "phase2": "string (Tração / Meses 2-6)",
                    "phase3": "string (Escala / Ano 1)"
                },
                "riskAnalysis": "string (O que pode dar errado)"
            }
          `;

          const prompt = `
            IDEIA DE NEGÓCIO: ${businessIdea}
            TAMANHO DO MERCADO (Estimado): ${marketSize || "Não informado"}
            CONCORRÊNCIA: ${competition || "Não informado"}
            
            Analise a viabilidade e crie o plano.
          `;

          const response = await ai.models.generateContent({
              model: getModel(),
              contents: prompt,
              config: {
                  systemInstruction: systemInstruction,
                  responseMimeType: "application/json",
                  thinkingConfig: { thinkingBudget: 2048 }
              }
          });

          const result = JSON.parse(response.text || '{}');
          setPlan(result);

      } catch (error) {
          console.error("Consultant Error", error);
          alert("Erro ao analisar negócio. Tente novamente.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      
      {/* INPUTS */}
      <div className="lg:col-span-4 space-y-6">
        <Card title="Consultor de Negócios (Módulo 6)" icon={<Briefcase className="w-5 h-5 text-indigo-400" />}>
            <div className="space-y-4">
                <div className="bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-lg">
                    <h4 className="text-indigo-400 font-bold text-sm mb-1">Validação & Viabilidade</h4>
                    <p className="text-xs text-slate-400">
                        A IA atua como um CFO virtual para validar sua ideia antes de você gastar dinheiro.
                    </p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ideia de Negócio</label>
                    <textarea 
                        value={businessIdea}
                        onChange={(e) => setBusinessIdea(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:border-indigo-500 outline-none text-sm resize-none"
                        rows={4}
                        placeholder="Ex: App de delivery de ração para pets com assinatura mensal."
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mercado / Público (Opcional)</label>
                    <input 
                        value={marketSize}
                        onChange={(e) => setMarketSize(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:border-indigo-500 outline-none text-sm"
                        placeholder="Ex: Donos de pets em SP"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Concorrência (Opcional)</label>
                    <input 
                        value={competition}
                        onChange={(e) => setCompetition(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:border-indigo-500 outline-none text-sm"
                        placeholder="Ex: Petz, Cobasi, Petlove"
                    />
                </div>

                <button 
                    onClick={() => handleAnalyze(false)}
                    disabled={isAnalyzing}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                        isAnalyzing 
                         ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-500/20'
                    }`}
                >
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                    Analisar Viabilidade
                </button>
            </div>
        </Card>
      </div>

      {/* RESULTS */}
      <div className="lg:col-span-8">
          {!plan ? (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-900 border-2 border-slate-800 border-dashed rounded-xl text-slate-500">
                  <BarChart className="w-20 h-20 mb-6 opacity-20" />
                  <h3 className="text-xl font-bold text-slate-300">Sala de Reunião Virtual</h3>
                  <p className="max-w-md text-center mt-2">Apresente sua ideia. O NEURION vai calcular riscos, definir preços e criar um plano de execução.</p>
              </div>
          ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full animate-in slide-in-from-right-4 duration-500">
                  
                  {/* HEADER SCORE */}
                  <div className="bg-slate-950 p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                          <h2 className="text-xl font-bold text-white flex items-center gap-2">
                              <Target className="w-5 h-5 text-indigo-400" /> Relatório de Viabilidade
                          </h2>
                          <p className="text-sm text-slate-400 mt-1">{plan.revenueModel}</p>
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="text-right">
                              <p className="text-xs text-slate-500 uppercase font-bold">Nota de Potencial</p>
                              <p className={`text-3xl font-black ${plan.viabilityScore >= 7 ? 'text-emerald-400' : plan.viabilityScore >= 5 ? 'text-yellow-400' : 'text-rose-400'}`}>
                                  {plan.viabilityScore}/10
                              </p>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 space-y-6 overflow-y-auto flex-1">
                      
                      {/* REASON */}
                      <div className={`p-4 rounded-xl border ${plan.viabilityScore >= 7 ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-yellow-900/10 border-yellow-500/30'}`}>
                          <p className="text-slate-200 text-sm italic">"{plan.viabilityReason}"</p>
                      </div>

                      {/* PRICING */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="bg-slate-800/50 border-slate-700">
                              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Entrada (Low)</p>
                              <p className="text-lg font-bold text-white">{plan.pricingStrategy.low}</p>
                          </Card>
                          <Card className="bg-slate-800 border-indigo-500/50 relative overflow-hidden">
                              <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] px-2 py-0.5 font-bold rounded-bl">RECOMENDADO</div>
                              <p className="text-xs text-indigo-400 uppercase font-bold mb-1">Padrão (Medium)</p>
                              <p className="text-xl font-bold text-white">{plan.pricingStrategy.medium}</p>
                              <p className="text-[10px] text-slate-400 mt-2 leading-tight">{plan.pricingStrategy.recommended}</p>
                          </Card>
                          <Card className="bg-slate-800/50 border-slate-700">
                              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Premium (High)</p>
                              <p className="text-lg font-bold text-white">{plan.pricingStrategy.high}</p>
                          </Card>
                      </div>

                      {/* ROADMAP */}
                      <Card title="Roadmap de Execução" icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}>
                          <div className="space-y-4">
                              <div className="flex gap-4">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-400 text-xs">1</div>
                                  <div>
                                      <h5 className="text-sm font-bold text-white">Fase 1: MVP</h5>
                                      <p className="text-xs text-slate-400 mt-1">{plan.roadmap.phase1}</p>
                                  </div>
                              </div>
                              <div className="flex gap-4">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-400 text-xs">2</div>
                                  <div>
                                      <h5 className="text-sm font-bold text-white">Fase 2: Tração</h5>
                                      <p className="text-xs text-slate-400 mt-1">{plan.roadmap.phase2}</p>
                                  </div>
                              </div>
                              <div className="flex gap-4">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-400 text-xs">3</div>
                                  <div>
                                      <h5 className="text-sm font-bold text-white">Fase 3: Escala</h5>
                                      <p className="text-xs text-slate-400 mt-1">{plan.roadmap.phase3}</p>
                                  </div>
                              </div>
                          </div>
                      </Card>

                      {/* RISKS */}
                      <Card title="Análise de Risco" icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}>
                          <p className="text-rose-300 text-sm bg-rose-900/10 p-3 rounded border border-rose-900/30">
                              {plan.riskAnalysis}
                          </p>
                      </Card>

                  </div>
              </div>
          )}
      </div>
    </div>
  );
};


