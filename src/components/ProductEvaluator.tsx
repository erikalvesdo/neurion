
import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Trophy,
  Activity,
  Award,
  Sparkles
} from 'lucide-react';
import { VoiceCommand } from '../types';

interface CheckItem {
  id: number;
  label: string;
  weight: number;
  isChecked: boolean;
  keywords: string[]; // Added keywords for better voice matching
}

const INITIAL_ITEMS: CheckItem[] = [
  { id: 1, label: "Tem Proposta Única de Vendas (Big Idea)?", weight: 2, isChecked: false, keywords: ["big idea", "proposta", "única"] },
  { id: 2, label: "Tem preço máximo (âncora) e mínimo do produto?", weight: 2, isChecked: false, keywords: ["preço", "âncora", "mínimo"] },
  { id: 3, label: "O produtor faz recuperação de boletos/pix?", weight: 2, isChecked: false, keywords: ["recuperação", "boletos", "pix"] },
  { id: 4, label: "A comissão mínima é de 45%?", weight: 2, isChecked: false, keywords: ["comissão", "45"] },
  { id: 5, label: "Faz parte de um dos 5 nichos poderosos (Black/White)?", weight: 5, isChecked: false, keywords: ["nicho", "poderoso", "black", "white"] },
  { id: 6, label: "Tem as páginas indispensáveis (Termos, Políticas)?", weight: 2, isChecked: false, keywords: ["páginas", "termos", "políticas", "indispensáveis"] },
  { id: 7, label: "As páginas são responsivas e rápidas (Mobile First)?", weight: 5, isChecked: false, keywords: ["responsivas", "rápidas", "mobile"] },
  { id: 8, label: "Tem suporte ativo ou respostas no Reclame Aqui?", weight: 3, isChecked: false, keywords: ["suporte", "reclame aqui", "ativo"] },
  { id: 9, label: "Tem depoimentos reais nas páginas (Prova Social)?", weight: 2, isChecked: false, keywords: ["depoimentos", "prova social", "reais"] },
  { id: 10, label: "Produto tem eficácia comprovada (Mecanismo)?", weight: 2, isChecked: false, keywords: ["eficácia", "comprovada", "mecanismo"] },
  { id: 11, label: "Tem esteira de Upsells imediatos?", weight: 3, isChecked: false, keywords: ["esteira", "upsell", "imediatos"] },
];

interface ProductEvaluatorProps {
    voiceTrigger?: VoiceCommand | null;
    onVoiceTriggerHandled?: () => void;
}

export const ProductEvaluator: React.FC<ProductEvaluatorProps> = ({ voiceTrigger, onVoiceTriggerHandled }) => {
  const [items, setItems] = useState<CheckItem[]>(INITIAL_ITEMS);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'champion' | 'reasonable' | 'bad' | 'empty'>('empty');

  const maxScore = items.reduce((acc, item) => acc + item.weight, 0); // Should be 30 based on weights

  const toggleItem = (id: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, isChecked: !item.isChecked } : item
    ));
  };

  // --- VOICE CONTROL LOGIC ---
  useEffect(() => {
      if (voiceTrigger && voiceTrigger.action === 'EVALUATE_PRODUCT') {
          const { items: keywordsToCheck, toggleAll } = voiceTrigger.payload?.checklistAction || {};

          if (toggleAll) {
              setItems(prev => prev.map(item => ({ ...item, isChecked: true })));
          } else if (keywordsToCheck && keywordsToCheck.length > 0) {
              setItems(prev => prev.map(item => {
                  // Fuzzy Match: Check if any voice keyword matches the item's keywords OR label
                  const isMatch = keywordsToCheck.some(voiceKey => {
                      const cleanVoiceKey = voiceKey.toLowerCase().trim();
                      // Check against keywords list
                      if (item.keywords.some(k => k.toLowerCase().includes(cleanVoiceKey))) return true;
                      // Check against full label
                      if (item.label.toLowerCase().includes(cleanVoiceKey)) return true;
                      return false;
                  });
                  
                  // Only change to true, don't uncheck if already checked (unless user asks to uncheck Current logic is additive)
                  return isMatch ? { ...item, isChecked: true } : item;
              }));
          }

          if (onVoiceTriggerHandled) onVoiceTriggerHandled();
      }
  }, [voiceTrigger]);

  useEffect(() => {
    const newScore = items.reduce((acc, item) => item.isChecked ? acc + item.weight : acc, 0);
    setScore(newScore);

    if (newScore === 0) {
      setStatus('empty');
    } else if (newScore >= 25) {
      setStatus('champion');
    } else if (newScore > 20) {
      setStatus('reasonable');
    } else {
      setStatus('bad');
    }
  }, [items]);

  const getStatusColor = () => {
    switch (status) {
      case 'champion': return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10';
      case 'reasonable': return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
      case 'bad': return 'text-rose-400 border-rose-500/50 bg-rose-500/10';
      default: return 'text-slate-400 border-slate-700 bg-slate-800';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'champion': return 'PRODUTO CAMPEÃO';
      case 'reasonable': return 'PRODUTO RAZOÁVEL';
      case 'bad': return 'PRODUTO RUIM';
      default: return 'AGUARDANDO ANÁLISE';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'champion': return <Trophy className="w-12 h-12 text-emerald-400 mb-2" />;
      case 'reasonable': return <AlertTriangle className="w-12 h-12 text-yellow-400 mb-2" />;
      case 'bad': return <XCircle className="w-12 h-12 text-rose-400 mb-2" />;
      default: return <Activity className="w-12 h-12 text-slate-600 mb-2" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      
      {/* CHECKLIST COLUMN */}
      <div className="lg:col-span-8">
        <Card title="Avaliar Produto" icon={<ClipboardCheck className="w-5 h-5" />}>
          
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-4">
              <div className="col-span-10">Critério</div>
              <div className="col-span-2 text-center">Peso</div>
            </div>
            
            <div className="space-y-2">
              {items.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`group flex items-center p-3 rounded-lg border transition-all cursor-pointer select-none ${
                    item.isChecked 
                       ? 'bg-cyan-900/20 border-cyan-500/30' 
                      : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-10 flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        item.isChecked 
                           ? 'bg-cyan-500 border-cyan-500' 
                          : 'border-slate-500 group-hover:border-cyan-400'
                      }`}>
                        {item.isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className={`text-sm ${item.isChecked ? 'text-slate-200' : 'text-slate-400'}`}>
                        {item.label}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className={`text-sm font-mono font-bold ${item.isChecked ? 'text-cyan-400' : 'text-slate-600'}`}>
                        {item.weight} pts
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* RESULTS COLUMN */}
      <div className="lg:col-span-4 space-y-6">
        <div className={`rounded-xl border-2 p-8 flex flex-col items-center justify-center text-center transition-all shadow-lg ${getStatusColor()}`}>
          {getStatusIcon()}
          <h2 className="text-2xl font-black tracking-tight">{getStatusText()}</h2>
          <div className="mt-4 flex items-baseline justify-center gap-1">
            <span className="text-5xl font-bold">{score}</span>
            <span className="text-sm opacity-70">/ {maxScore}</span>
          </div>
          <p className="text-xs uppercase tracking-widest opacity-60 mt-1">Pontuação Total</p>
        </div>

        <Card>
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-300">Critérios de Aprovação</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-xs text-slate-400">Campeão</span>
                </div>
                <span className="text-xs font-mono text-emerald-400">≥ 25 pts</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span className="text-xs text-slate-400">Razoável</span>
                </div>
                <span className="text-xs font-mono text-yellow-400">21 - 24 pts</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  <span className="text-xs text-slate-400">Ruim</span>
                </div>
                <span className="text-xs font-mono text-rose-400">≤ 20 pts</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700 space-y-3">
              <p className="text-xs text-slate-500 italic">
                "Não adianta ter o melhor criativo do mundo se o produto não converte. Use essa ferramenta antes de investir 1 centavo em tráfego."
              </p>
              
              <div className="flex items-start gap-2 bg-slate-800/80 p-2.5 rounded border border-slate-700/50">
                  <Award className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-400 font-medium">
                    Essa checklist foi fornecida no curso <span className="text-cyan-400">Nômade Milionário</span> do Thiago Finch
                  </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
