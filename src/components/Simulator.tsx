
import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Settings, 
  Target, 
  Users, 
  BarChart3,
  CheckCircle2, 
  AlertCircle,
  FlaskConical,
  Megaphone,
  MonitorPlay,
  ShoppingCart,
  ArrowRight,
  FileText,
  Mail,
  HelpCircle,
  Check,
  RefreshCcw,
  Sparkles,
  PieChart,
  LineChart as LineChartIcon,
  Percent,
  Calendar,
  Layers,
  Lightbulb
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { CampaignState, SimulationResults, FunnelProject, VoiceCommand } from '../types';
import { Card } from './Card';

const INITIAL_STATE: CampaignState = {
  productName: 'Campanha Principal',
  isProducer: true,
  commissionRate: 50,
  ticketPrice: 97.00,
  adSets: 3,
  budgetMode: 'ABO',
  budgetPerSet: 20.00,
  campaignBudget: 60.00,
  daysRunning: 7,
  funnelType: 'direct',
  estimatedSales: 5,
};

// --- FUNNEL STEP INTERFACE ---
interface FunnelStepStatus {
  id: string;
  label: string;
  icon: React.ReactNode;
  isComplete: boolean;
  toolReference: string; 
}

interface SimulatorProps {
    voiceTrigger?: VoiceCommand | null;
    onVoiceTriggerHandled?: () => void;
    userEmail: string; 
}

export const Simulator: React.FC<SimulatorProps> = ({ voiceTrigger, onVoiceTriggerHandled, userEmail }) => {
  // Load initial state from local storage using user-specific key
  const [state, setState] = useState<CampaignState>(() => {
      const saved = localStorage.getItem(`neurion_campaign_state_${userEmail}`);
      if (saved) {
          const parsed = JSON.parse(saved);
          return { ...INITIAL_STATE, ...parsed };
      }
      return INITIAL_STATE;
  });
  const [isTestMode, setIsTestMode] = useState(false);
  const [activeView, setActiveView] = useState<'financial' | 'predictive'>('financial');
  
  // Funnel Visualization State
  const [funnelSteps, setFunnelSteps] = useState<FunnelStepStatus[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [results, setResults] = useState<SimulationResults>({
    totalDailyBudget: 0,
    totalInvested: 0,
    totalRevenue: 0,
    grossProfit: 0,
    netProfit: 0,
    roi: 0,
    cpa: 0
  });

  // Re-load state if userEmail changes
  useEffect(() => {
      const saved = localStorage.getItem(`neurion_campaign_state_${userEmail}`);
      if (saved) {
          setState({ ...INITIAL_STATE, ...JSON.parse(saved) });
      } else {
          setState(INITIAL_STATE);
      }
  }, [userEmail]);

  // --- SAVE STATE EFFECT ---
  useEffect(() => {
      localStorage.setItem(`neurion_campaign_state_${userEmail}`, JSON.stringify(state));
  }, [state, userEmail]);

  // --- VOICE CONTROL ---
  useEffect(() => {
      if (voiceTrigger && voiceTrigger.action === 'UPDATE_SIMULATOR') {
          const p = voiceTrigger.payload;
          
          if (p?.isTestMode !== undefined) {
              setIsTestMode(p.isTestMode);
          }

          setState(prev => ({
              ...prev,
              productName: p?.productName || prev.productName,
              budgetMode: p?.budgetMode || prev.budgetMode,
              ticketPrice: p?.ticketPrice !== undefined ? p.ticketPrice : prev.ticketPrice,
              budgetPerSet: p?.budget !== undefined ? p.budget : prev.budgetPerSet,
              campaignBudget: p?.budget !== undefined ? (p.budget * (prev.adSets || 1)) : prev.campaignBudget,
              adSets: p?.adSets !== undefined ? p.adSets : prev.adSets,
              daysRunning: p?.daysRunning !== undefined ? p.daysRunning : prev.daysRunning,
              estimatedSales: p?.estimatedSales !== undefined ? p.estimatedSales : prev.estimatedSales,
              isProducer: p?.isProducer !== undefined ? p.isProducer : prev.isProducer,
              commissionRate: p?.commissionRate !== undefined ? p.commissionRate : prev.commissionRate,
              funnelType: p?.funnelType || prev.funnelType
          }));
          if (onVoiceTriggerHandled) onVoiceTriggerHandled();
      }
  }, [voiceTrigger]);

  // --- CALCULATION EFFECT ---
  useEffect(() => {
    let totalDailyBudget = 0;

    if (state.budgetMode === 'ABO') {
        totalDailyBudget = state.adSets * state.budgetPerSet;
    } else {
        totalDailyBudget = state.campaignBudget;
    }

    const totalInvested = totalDailyBudget * state.daysRunning;
    
    // CORREÇÃO: O usuário insere o TOTAL de vendas no período, não por dia.
    const totalSalesCount = state.estimatedSales; 

    // CORREÇÃO: Se for afiliado, o faturamento é baseado na comissão.
    const revenuePerSale = state.isProducer 
         ? state.ticketPrice 
        : (state.ticketPrice * (state.commissionRate / 100));

    const totalRevenue = totalSalesCount * revenuePerSale;
    
    // Lucro Bruto aqui é igual ao Faturamento (o que entra no bolso antes dos anúncios)
    const grossProfit = totalRevenue; 
    
    const netProfit = grossProfit - totalInvested;
    const roi = totalInvested > 0 ? ((grossProfit - totalInvested) / totalInvested) * 100 : 0;
    
    // CPA: Cost Per Acquisition. Invested / Total Sales
    const cpa = totalSalesCount > 0 ? totalInvested / totalSalesCount : 0;

    setResults({
      totalDailyBudget,
      totalInvested,
      totalRevenue,
      grossProfit,
      netProfit,
      roi,
      cpa
    });
  }, [state]);

  // --- FUNNEL STATUS CHECK EFFECT ---
  useEffect(() => {
    const checkFunnelProgress = () => {
      const hasAds = !!localStorage.getItem(`neurion_generated_creatives_${userEmail}`) || 
                     (JSON.parse(localStorage.getItem(`neurion_video_queue_${userEmail}`) || '[]').length > 0);

      const funnelProjects: FunnelProject[] = JSON.parse(localStorage.getItem(`neurion_funnels_${userEmail}`) || '[]');
      const allNodes = funnelProjects.flatMap(p => p.nodes);
      
      const hasCapture = allNodes.some(n => n.type === 'capture' && n.generatedHtml);
      const hasVSLPage = allNodes.some(n => n.type === 'vsl' && n.generatedHtml);
      const hasCheckout = allNodes.some(n => n.type === 'checkout' && n.generatedHtml);

      let steps: FunnelStepStatus[] = [];

      steps.push({
        id: 'ads',
        label: 'Anúncios',
        icon: <Megaphone className="w-4 h-4" />,
        isComplete: hasAds,
        toolReference: 'Fábrica IA'
      });

      if (state.funnelType === 'quiz') {
         steps.push({
            id: 'quiz',
            label: 'Quiz / Captura',
            icon: <HelpCircle className="w-4 h-4" />,
            isComplete: hasCapture,
            toolReference: 'Funil Builder'
         });
      }

      steps.push({
         id: 'vsl_page',
         label: 'Página Vendas',
         icon: <MonitorPlay className="w-4 h-4" />,
         isComplete: hasVSLPage,
         toolReference: 'Funil Builder'
      });

      steps.push({
         id: 'checkout',
         label: 'Checkout',
         icon: <ShoppingCart className="w-4 h-4" />,
         isComplete: hasCheckout,
         toolReference: 'Funil Builder'
      });

      setFunnelSteps(steps);
    };

    checkFunnelProgress();
  }, [state.funnelType, refreshTrigger, userEmail]);


  const chartData = useMemo(() => [
    { name: 'Investido', value: results.totalInvested, color: '#f43f5e' },
    { name: 'Faturamento', value: results.grossProfit, color: '#38bdf8' },
    { name: 'Lucro Líquido', value: results.netProfit, color: results.netProfit >= 0 ? '#34d399' : '#fb7185' },
  ], [results]);

  // --- PREDICTIVE DATA (SIMULATED) ---
  const predictiveData = useMemo(() => {
      const data = [];
      const baseRoi = results.roi > 0 ? results.roi : 20; // Default hypothetical ROI
      for (let i = 1; i <= 30; i++) {
          const dailySpend = results.totalDailyBudget;
          // Simulate scaling effect (diminishing returns)
          const efficiencyFactor = Math.max(0.5, 1 - (i * 0.01)); 
          const dailyRevenue = dailySpend * (1 + (baseRoi / 100)) * efficiencyFactor;
          data.push({
              day: `Dia ${i}`,
              investido: dailySpend * i,
              retorno: dailyRevenue * i,
              projecao: dailyRevenue * i * 1.1 // Otimista
          });
      }
      return data;
  }, [results]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getSuggestions = () => {
    const suggestions = [];
    const totalSales = state.estimatedSales; // Agora é o total direto
    
    if (isTestMode) {
        // MODO DE VALIDAÇÃO: 1 venda já valida o criativo
        if (totalSales >= 1) {
             suggestions.push({
                type: 'success',
                title: 'Criativo Validado!',
                desc: `Você fez ${totalSales} venda${totalSales > 1 ? 's' : ''}. No modo de validação, qualquer venda confirma que o público comprou a ideia. Agora otimize para escalar com lucro.`,
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            });
        } else {
             suggestions.push({
                type: 'critical',
                title: 'Nenhuma Venda no Teste',
                desc: 'O criativo não gerou nenhuma venda. Pause e teste novos ângulos ou revise a oferta.',
                icon: <AlertCircle className="w-5 h-5 text-rose-500" />
            });
        }
    } else {
        // MODO ESCALA (PADRÃO)
        if (results.roi < 0) {
            suggestions.push({
                type: 'critical',
                title: 'Prejuízo Projetado',
                desc: 'O cenário atual indica perda de capital. Considere aumentar o Ticket ou a Taxa de Conversão.',
                icon: <AlertCircle className="w-5 h-5 text-rose-500" />
            });
        } else if (results.roi < 30) {
            suggestions.push({
                type: 'warning',
                title: 'Margem de Risco',
                desc: 'ROI abaixo de 30% é arriscado para escala. Otimize os criativos para baixar o CPC.',
                icon: <TrendingUp className="w-5 h-5 text-yellow-500" />
            });
        } else {
            suggestions.push({
                type: 'success',
                title: 'Sinal Verde para Escala',
                desc: 'ROI saudável. Você pode aumentar o orçamento em 20% a cada 3 dias.',
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            });
        }
    }

    if (results.cpa > (state.ticketPrice * (state.isProducer ? 0.5 : (state.commissionRate/100) * 0.6))) {
         suggestions.push({
            type: 'warning',
            title: 'CPA Elevado',
            desc: 'Seu Custo por Venda está consumindo muito da sua margem. Melhore a oferta.',
            icon: <DollarSign className="w-5 h-5 text-orange-500" />
        });
    }

    return suggestions;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      
      {/* SIDEBAR CONFIG */}
      <div className="lg:col-span-5 space-y-6">
        <Card title="Simulador Financeiro" icon={<FlaskConical className="w-5 h-5 text-cyan-400" />}>
          <div className="space-y-6">

            {/* TOGGLE MODO DE TESTE */}
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-700">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <FlaskConical className={`w-4 h-4 ${isTestMode ? 'text-yellow-400' : 'text-slate-500'}`} />
                    Modo de Validação
                </span>
                <span className="text-[10px] text-slate-500">Simular cenário de teste (ROI Negativo aceitável)</span>
              </div>
              <button 
                onClick={() => setIsTestMode(!isTestMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isTestMode ? 'bg-yellow-500' : 'bg-slate-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isTestMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* PRODUCT NAME */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">NOME DA CAMPANHA</label>
              <input 
                type="text" 
                value={state.productName}
                onChange={(e) => setState({...state, productName: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>

            {/* PRODUCER TOGGLE */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => setState({...state, isProducer: true})}
                    className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                        state.isProducer 
                         ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400' 
                        : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                    }`}
                >
                    Sou Produtor
                </button>
                <button
                    onClick={() => setState({...state, isProducer: false})}
                    className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                        !state.isProducer 
                         ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400' 
                        : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                    }`}
                >
                    Sou Afiliado
                </button>
            </div>

            {/* PRICE & COMMISSION */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ticket (R$)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        value={state.ticketPrice}
                        onChange={(e) => setState({...state, ticketPrice: Number(e.target.value)})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-cyan-500 outline-none font-bold"
                    />
                </div>
                {!state.isProducer && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Comissão (%)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                min="0" max="100"
                                value={state.commissionRate}
                                onChange={(e) => setState({...state, commissionRate: Number(e.target.value)})}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-cyan-500 outline-none font-bold"
                            />
                            <Percent className="w-3 h-3 text-slate-500 absolute right-3 top-2.5" />
                        </div>
                    </div>
                )}
            </div>

            <hr className="border-slate-700" />

            {/* BUDGET STRATEGY */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Estratégia de Orçamento
                </label>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <button
                        onClick={() => setState({...state, budgetMode: 'ABO'})}
                        className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                            state.budgetMode === 'ABO' 
                             ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' 
                            : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                        }`}
                    >
                        ABO (Por Conjunto)
                    </button>
                    <button
                        onClick={() => setState({...state, budgetMode: 'CBO'})}
                        className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                            state.budgetMode === 'CBO' 
                             ? 'bg-purple-600/20 border-purple-500 text-purple-400' 
                            : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                        }`}
                    >
                        CBO (Campanha)
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                            {state.budgetMode === 'ABO' ? 'Orçamento / Conjunto' : 'Orçamento Total / Dia'}
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-500 text-xs">R$</span>
                            <input
                                type="number"
                                step="0.01"
                                value={state.budgetMode === 'ABO' ? state.budgetPerSet : state.campaignBudget}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (state.budgetMode === 'ABO') setState({...state, budgetPerSet: val});
                                    else setState({...state, campaignBudget: val});
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white font-bold focus:border-cyan-500 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Qtd. Conjuntos</label>
                        <div className="relative">
                            <Layers className="w-3 h-3 text-slate-500 absolute left-3 top-2.5" />
                            <input
                                type="number"
                                min="1"
                                value={state.adSets}
                                onChange={(e) => setState({...state, adSets: Math.max(1, Number(e.target.value))})}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white font-bold focus:border-cyan-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* TIMELINE */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Duração</label>
                    <div className="relative">
                        <Calendar className="w-3 h-3 text-slate-500 absolute left-3 top-2.5" />
                        <input 
                            type="number" 
                            min="1"
                            value={state.daysRunning}
                            onChange={(e) => setState({...state, daysRunning: Number(e.target.value)})}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white font-bold focus:border-cyan-500 outline-none"
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-500">dias</span>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total de Vendas (Período)</label>
                    <div className="relative">
                        <ShoppingCart className="w-3 h-3 text-slate-500 absolute left-3 top-2.5" />
                        <input 
                            type="number" 
                            min="0"
                            value={state.estimatedSales}
                            onChange={(e) => setState({...state, estimatedSales: Number(e.target.value)})}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white font-bold focus:border-cyan-500 outline-none"
                        />
                    </div>
                </div>
            </div>

          </div>
        </Card>
      </div>

      {/* DASHBOARD */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* VIEW TOGGLE */}
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 w-fit">
            <button 
                onClick={() => setActiveView('financial')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${
                    activeView === 'financial' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
            >
                <BarChart3 className="w-4 h-4" /> Financeiro
            </button>
            <button 
                onClick={() => setActiveView('predictive')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${
                    activeView === 'predictive' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
            >
                <LineChartIcon className="w-4 h-4" /> Preditivo (IA)
            </button>
        </div>

        {/* METRICS CARDS ROW 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-rose-500 py-4 px-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Investimento Total</p>
            <p className="text-xl font-bold text-slate-100">{formatCurrency(results.totalInvested)}</p>
          </Card>

          <Card className="border-l-4 border-l-sky-500 py-4 px-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Faturamento Bruto</p>
            <p className="text-xl font-bold text-slate-100">{formatCurrency(results.totalRevenue)}</p>
          </Card>

          <Card className={`border-l-4 py-4 px-5 ${results.netProfit >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Lucro Líquido</p>
            <p className={`text-xl font-bold ${results.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(results.netProfit)}
            </p>
          </Card>
        </div>

        {/* METRICS CARDS ROW 2 (KPIs) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="py-4 px-5 bg-slate-800/50">
            <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider">ROI</p>
                <TrendingUp className={`w-4 h-4 ${results.roi > 0 ? 'text-emerald-500' : 'text-slate-600'}`} />
            </div>
            <p className={`text-xl font-bold ${results.roi > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
              {results.roi.toFixed(1)}%
            </p>
          </Card>

          <Card className="py-4 px-5 bg-slate-800/50">
            <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider">CPA (Custo/Venda)</p>
                <Users className="w-4 h-4 text-cyan-500" />
            </div>
            <p className="text-xl font-bold text-slate-200">
              {formatCurrency(results.cpa)}
            </p>
          </Card>

          <Card className="py-4 px-5 bg-slate-800/50">
            <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider">ROAS</p>
                <DollarSign className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-xl font-bold text-slate-200">
              {(results.totalInvested > 0 ? results.grossProfit / results.totalInvested : 0).toFixed(2)}x
            </p>
          </Card>
        </div>

        {/* CHARTS */}
        <Card title={activeView === 'financial' ? "Análise Financeira" : "Projeção de Escala (30 Dias)"} icon={activeView === 'financial' ? <BarChart3 className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}>
          <div className="h-[300px] w-full min-w-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {activeView === 'financial' ? (
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `R$${value}`} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: '#1e293b'}}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
              ) : (
                  <LineChart data={predictiveData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `R$${value}`} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Line type="monotone" dataKey="investido" stroke="#f43f5e" strokeWidth={2} dot={false} name="Investimento Acumulado" />
                      <Line type="monotone" dataKey="retorno" stroke="#38bdf8" strokeWidth={2} dot={false} name="Retorno Realista" />
                      <Line type="monotone" dataKey="projecao" stroke="#34d399" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Cenário Otimista" />
                  </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>



        {/* SUGGESTIONS */}
        <div className="grid grid-cols-1 gap-4">
            {getSuggestions().map((sugg, i) => (
                <div key={i} className={`p-4 rounded-lg border flex items-start gap-4 ${
                    sugg.type === 'critical' ? 'bg-rose-950/30 border-rose-500/30' :
                    sugg.type === 'warning' ? 'bg-yellow-950/30 border-yellow-500/30' :
                    'bg-emerald-950/30 border-emerald-500/30'
                }`}>
                    <div className={`p-2 rounded-full ${
                        sugg.type === 'critical' ? 'bg-rose-900/50' :
                        sugg.type === 'warning' ? 'bg-yellow-900/50' :
                        'bg-emerald-900/50'
                    }`}>
                        {sugg.icon}
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm mb-1 ${
                             sugg.type === 'critical' ? 'text-rose-400' :
                             sugg.type === 'warning' ? 'text-yellow-400' :
                             'text-emerald-400'
                        }`}>{sugg.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{sugg.desc}</p>
                    </div>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
};
