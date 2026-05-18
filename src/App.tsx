
import React, { useState, useEffect } from 'react';
import { UpdateNotification } from './components/UpdateNotification';
import { FunnelVisualCognitive } from './components/FunnelVisualCognitive';
import { MultimodalCreation } from './components/MultimodalCreation';
import { 
  Calculator, 
  BrainCircuit, 
  Zap,
  ClipboardCheck,
  Layout,
  Lock,
  Crown,
  Key,
  LogOut,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ShieldCheck,
  Target,
  FileSpreadsheet,
  Loader2,
  Copy,
  Command,
  Briefcase,
  PenTool,
  Clapperboard,
  Sparkles,
  Settings,
  HeartPulse,
  Video,
  PenLine,
  LayoutDashboard,
  ArrowUpRight,
  X,
  Mic
} from 'lucide-react';
import { Simulator } from './components/Simulator';
import { CreativeFactory } from './components/CreativeFactory';
import { ProductEvaluator } from './components/ProductEvaluator';
import { FunnelBuilder } from './components/FunnelBuilder';
import { AudienceHunter } from './components/AudienceHunter'; 
import { PageCloner } from './components/PageCloner'; 
import { Login } from './components/Login';
import { AdminPanel } from './components/AdminPanel'; 
import { SoundController } from './components/SoundController'; 
import { CampaignMaster } from './components/CampaignMaster';
import { BusinessConsultant } from './components/BusinessConsultant';
import { IntroAnimation } from './components/IntroAnimation';
import { DiagnosticChat } from './components/DiagnosticChat';
import { VSLStudio } from './components/VSLStudio';
import { CopyLab } from './components/CopyLab';
import { UserSession, PlanType, VoiceCommand, CampaignState, FactoryResult } from './types';
import { loginUser, registerUser, requestPasswordReset } from './utils/firebase';
import { canUsePaidTools, canUseVoice, CHECKOUT_URLS, getPlanConfig, UPGRADE_PLANS } from './utils/plans';
import { getUsageStatus, setUsageContext } from './utils/usage';
import JSZip from 'jszip';

// CONFIGURAÇÃO DO ADMIN — sem credenciais hardcoded
// Admin = usuário com plan 'LIFETIME' no Firebase
// Códigos de licença armazenados no Firebase (não no código)
const PRO_DURATION_DAYS = 30;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

// --- COMPONENTE DE BLOQUEIO VISUAL (OVERLAY) ---
const RestrictedArea: React.FC<{ 
  isPro: boolean; 
  children: React.ReactNode; 
  onActivate: () => void;
  title: string;
  description: string;
  isTeamOnly?: boolean;
}> = ({ isPro, children, onActivate, title, description, isTeamOnly }) => {
  if (isPro) return <>{children}</>;
  const lockedTitle = isTeamOnly ? 'Upgrade necessário' : title;
  const lockedDescription = isTeamOnly
     ? 'Escolha Starter, Pro ou Agency para liberar esta ferramenta e continuar usando o NEURION com mais limite.'
    : description;

  return (
    <div className="relative w-full h-full min-h-[80vh] rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
      <div className="filter blur-sm opacity-50 pointer-events-none select-none w-full h-full absolute inset-0 z-0 overflow-hidden grayscale-[0.3]">
         {children}
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-6">
        <div className="bg-slate-900/95 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md text-center transform transition-all hover:scale-105 duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700 shadow-inner group">
                <Lock className="w-10 h-10 text-cyan-500 group-hover:text-cyan-400 transition-colors" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">{lockedTitle}</h3>
            <p className="text-slate-400 mb-8 leading-relaxed text-sm">
              {lockedDescription}
            </p>
            <button
              onClick={onActivate}
              className="neurion-btn-primary"
            >
              <Crown size={15} />
              Ver planos
            </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // LOGIN STATE
  const [user, setUser] = useState<UserSession | null>(null);
  
  // INTRO STATE
  const [showIntro, setShowIntro] = useState(true);

  // Updated Tab List - Reordered as requested
  const [activeTab, setActiveTab] = useState<'simulator' | 'evaluator' | 'master' | 'factory' | 'funnel' | 'multimodal' | 'audience' | 'cloner' | 'consultant' | 'diagnostic' | 'admin' | 'vsl' | 'copylab'>('simulator');
  
  // GLOBAL OVERLAY STATES
  const [isVisualFunnelOpen, setIsVisualFunnelOpen] = useState(false);
  
  // TOUR STATE
  const [tourState, setTourState] = useState<{
    isActive: boolean;
    stepNumber: number;
    totalSteps: number;
    title: string;
    description: string;
    featureName: string;
  } | null>(null);

  // GLOBAL LOADING STATES (For visual feedback across tabs)
  const [isFactoryGenerating, setIsFactoryGenerating] = useState(false);
  const [isMasterGenerating, setIsMasterGenerating] = useState(false);
  const [isAudienceGenerating, setIsAudienceGenerating] = useState(false);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [isFunnelGenerating, setIsFunnelGenerating] = useState(false);
  const [isClonerGenerating, setIsClonerGenerating] = useState(false);
  const [isVslGenerating, setIsVslGenerating] = useState(false);
  const [isCopyLabGenerating, setIsCopyLabGenerating] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  
  // Lifted State for Creatives (to allow global export with images)
  const [creativesResult, setCreativesResult] = useState<FactoryResult | null>(null);

  // Voice Command State
  const [pendingVoiceCommand, setPendingVoiceCommand] = useState<VoiceCommand | null>(null);
  const [agentFlowQueue, setAgentFlowQueue] = useState<VoiceCommand[]>([]);
  const [isAgentFlowRunning, setIsAgentFlowRunning] = useState(false);
  const [isSystemSpeaking, setIsSystemSpeaking] = useState(false);
  const [visualContext, setVisualContext] = useState<string | null>(null); // Base64 image of current screen/canvas

  // License Modal State
  const [showApiKeyReset, setShowApiKeyReset] = useState(false);
  const [showUpgradePanel, setShowUpgradePanel] = useState(false);
  const [usageVersion, setUsageVersion] = useState(0);

  const handleLogin = async (email: string, pass: string) => {
      // Todos os usuários autenticam pelo Firebase (incluindo admin)
      // Admin = usuário com plan LIFETIME ou MODERATOR no Firestore
      const result = await loginUser(email, pass);
      if (result.success && result.user) {
          setUser({
              email: result.user.email,
              plan: result.user.plan,
              createdAt: result.user.createdAt ? (result.user.createdAt as any).toMillis?.() ?? Date.now() : Date.now(),
              isBanned: result.user.isBanned,
              isAdmin: result.user.isAdmin,
              usedCodes: result.user.usedCodes || [],
              proExpiry: result.user.proExpiry ?? undefined,
              trialStartedAt: result.user.trialStartedAt ?? undefined,
              trialEndsAt: result.user.trialEndsAt ?? undefined,
          });
          return { success: true, message: result.message };
      }
      return { success: false, message: result.message };
  };

  const handleRegister = async (email: string, pass: string) => {
      const result = await registerUser(email, pass);
      if (result.success && result.user) {
          setUser({
              email: result.user.email,
              plan: result.user.plan,
              createdAt: Date.now(),
              isBanned: false,
              isAdmin: result.user.isAdmin,
              usedCodes: [],
              trialStartedAt: result.user.trialStartedAt ?? undefined,
              trialEndsAt: result.user.trialEndsAt ?? undefined,
          });
          return { success: true, message: result.message };
      }
      return { success: false, message: result.message };
  };

  const handleForgotPassword = async (email: string) => requestPasswordReset(email);

  useEffect(() => {
    if (user) setUsageContext(user.email, user.plan);
  }, [user?.email, user?.plan]);

  useEffect(() => {
    const handleUsageUpdated = () => setUsageVersion((value) => value + 1);
    window.addEventListener('neurion-usage-updated', handleUsageUpdated);
    return () => window.removeEventListener('neurion-usage-updated', handleUsageUpdated);
  }, []);

  if (!user) {
      return <Login onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={handleForgotPassword} />;
  }

  const handleLogout = () => {
    setUser(null);
  };

  const handleResetApiKey = () => {
    localStorage.removeItem('neurion_openai_api_key');
    (window as any).__NEURION_KEY__ = '';
    window.location.reload();
  };


  const generateGlobalFacebookZIP = async () => {
    let dataToExport = creativesResult;

    // 1. TENTATIVA DE RECUPERAÇÃO DE BACKUP (Caso tenha recarregado a página)
    if (!dataToExport || !dataToExport.angles || dataToExport.angles.length === 0) {
        const savedResult = localStorage.getItem(`neurion_latest_strategy_${user?.email}`);
        if (savedResult && savedResult !== "undefined") {
            try {
                dataToExport = JSON.parse(savedResult);
            } catch (e) { 
                console.error("Falha ao recuperar backup da estratégia", e); 
            }
        }
    }

    if (!dataToExport || !dataToExport.angles || dataToExport.angles.length === 0) {
        alert("Nenhum anúncio encontrado. Gere seus criativos na aba 'Fábrica IA' primeiro.");
        return;
    }

    setIsExporting(true);

    try {
        // 2. IMPORTAR DADOS DO SIMULADOR (Orçamento e Nome)
        const simulatorStateRaw = localStorage.getItem(`neurion_campaign_state_${user?.email}`);
        let simState: CampaignState | null = null;
        if (simulatorStateRaw && simulatorStateRaw !== "undefined") {
            try { simState = JSON.parse(simulatorStateRaw); } catch(e) {}
        }

        const prodName = simState?.productName || "Campanha Neurion";
        const budgetMode = simState?.budgetMode || 'ABO'; 
        // Conversão segura de número para string com ponto decimal
        const rawBudget = budgetMode === 'CBO' ? simState?.campaignBudget : simState?.budgetPerSet;
        // CORREÇÃO: Facebook Ads em PT-BR exige vírgula como separador decimal
        const dailyBudget = rawBudget ? Number(rawBudget).toFixed(2).replace('.', ',') : "20,00";

        const zip = new JSZip();
        const rootFolder = zip.folder("Neurion_Export_Facebook");
        if (!rootFolder) throw new Error("Erro ZIP");

        // 3. ESTRUTURA CSV OFICIAL FACEBOOK ADS (CORRIGIDA)
        // Baseado no feedback de erro e no CSV de exemplo
        const headers = [
            "Campaign Name",
            "Campaign Status", 
            "Campaign Objective", 
            "Buying Type", 
            "Campaign Budget Optimization",
            "Campaign Daily Budget", 
            "Ad Set Name", 
            "Ad Set Status", 
            "Ad Set Daily Budget", 
            "Optimization Goal", 
            "Billing Event",
            "Ad Name", 
            "Ad Status", 
            "Creative Type", // ADICIONADO: Campo obrigatório
            "Title", // Headline
            "Body", // Primary Text
            "Link Description", // Description
            "Website URL",
            "Call To Action",
            "Image File Name" 
        ];
        
        let csvContent = headers.join(",") + "\n";
        const campaignName = prodName;
        // CORREÇÃO: Valor exato esperado pelo Facebook (Case Sensitive e com espaço)
        const campaignObjective = "Outcome Sales"; 
        const buyingType = "AUCTION";
        const campaignStatus = "PAUSED"; 

        // Loop baseado no número de conjuntos definido no Simulador
        const totalAdSets = simState?.adSets || 1;
        
        // 1. PRIMEIRO: Salvar todos os ativos de mídia no ZIP (uma vez por criativo)
        // Isso evita duplicação de arquivos e garante que o CSV referencie corretamente
        dataToExport.angles.forEach((angle, i) => {
            const angleNum = i + 1;
            // Criar pasta organizada para o usuário (opcional, mas bom para UX)
            const folderName = `Materiais_Angle_${angleNum}`;
            const angleFolder = rootFolder.folder(folderName);

            angle.creatives.forEach((creative, j) => {
                const adNum = j + 1;
                const creativeName = `Angle ${angleNum} - Ad ${adNum}`;
                const imageName = `image_angle${angleNum}_ad${adNum}.png`;
                
                if (angleFolder) {
                    const txt = `
HEADLINE: ${creative.headline}
BODY:
${creative.primaryText}
DESC: ${creative.subheadline}
PROMPT: ${creative.imagePrompt}
                    `.trim();
                    angleFolder.file(`${creativeName}.txt`, txt);

                    if (creative.base64Image) {
                         try {
                             const b64 = creative.base64Image.split(',')[1];
                             // Salva na raiz para importação do Facebook
                             rootFolder.file(imageName, b64, {base64: true});
                             // Cópia na pasta organizada
                             angleFolder.file(`${creativeName}.png`, b64, {base64: true});
                         } catch (e) {}
                    }
                }
            });
        });

        // 2. SEGUNDO: Gerar as linhas do CSV (Multiplicando Criativos x Conjuntos)
        for (let i = 0; i < totalAdSets; i++) {
            const adSetNum = i + 1;
            const adSetName = `[Conjunto ${adSetNum}] Aberto (Neurion)`; 
            const adSetStatus = "PAUSED";
            
            // Para CADA conjunto, incluímos TODOS os criativos de TODOS os ângulos
            dataToExport.angles.forEach((angle, angleIndex) => {
                const angleNum = angleIndex + 1;

                angle.creatives.forEach((creative, j) => {
                    const adNum = j + 1;
                    // Nome do Anúncio identifica o Ângulo
                    const creativeName = `[Angle ${angleNum}] Ad ${adNum} - ${creative.hookType}`;
                    // Referência à imagem salva anteriormente
                    const imageName = `image_angle${angleNum}_ad${adNum}.png`;
                    
                    // CONSTRUÇÃO DA LINHA DO CSV
                    const row = [
                        campaignName,                               // Campaign Name
                        campaignStatus,                             // Campaign Status
                        campaignObjective,                          // Campaign Objective (Outcome Sales)
                        buyingType,                                 // Buying Type
                        budgetMode === 'CBO' ? '1' : '0',           // Campaign Budget Optimization
                        budgetMode === 'CBO' ? dailyBudget : "",    // Campaign Daily Budget
                        adSetName,                                  // Ad Set Name
                        adSetStatus,                                // Ad Set Status
                        budgetMode === 'ABO' ? dailyBudget : "",    // Ad Set Daily Budget
                        "OFFSITE_CONVERSIONS",                      // Optimization Goal
                        "IMPRESSIONS",                              // Billing Event
                        creativeName,                               // Ad Name
                        "PAUSED",                                   // Ad Status
                        "Link Page Post Ad",                        // Creative Type
                        creative.headline,                          // Title
                        creative.primaryText,                       // Body
                        creative.subheadline,                       // Link Description
                        "https://google.com",                       // Website URL
                        "LEARN_MORE",                               // Call To Action
                        imageName                                   // Image File Name
                    ];

                    // Escape CSV
                    const escapedRow = row.map(cell => {
                        const val = String(cell || "");
                        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
                            return `"${val.replace(/"/g, '""')}"`;
                        }
                        return val;
                    }).join(",");

                    csvContent += escapedRow + "\n";
                });
            });
        }

        rootFolder.file("facebook_ads_import.csv", csvContent);

        const blob = await zip.generateAsync({type: "blob"});
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `FB_Ads_Export_${prodName.replace(/\s+/g, '_')}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        console.error("Erro Exportação", err);
        alert("Erro ao gerar arquivo de exportação.");
    } finally {
        setIsExporting(false);
    }
  };

  const isPro = canUsePaidTools(user?.plan);
  const canAccessAdmin = !!user?.isAdmin || user?.plan === 'MODERATOR' || user?.plan === 'LIFETIME';
  const planConfig = getPlanConfig(user?.plan);
  const planColor = planConfig.color;
  const planLogoColor = planConfig.logoColor;
  const planLogoGlow = planConfig.logoGlow;
  const voiceEnabled = canUseVoice(user?.plan);
  const usageStatus = getUsageStatus(user?.email, user?.plan);
  const resourceLabels: Record<string, string> = {
    text: 'texto',
    image: 'imagens',
    voice: 'voz',
  };
  const shouldShowUpsell = !planConfig.isAdmin && user?.plan !== 'AGENCY' && usageStatus.maxPct >= 50;
  const openCheckout = (plan: keyof typeof CHECKOUT_URLS = 'PRO') => {
    window.open(CHECKOUT_URLS[plan], '_blank', 'noopener,noreferrer');
    setShowUpgradePanel(false);
  };

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
  };

  const handleVoiceCommand = (command: VoiceCommand) => {
    if (command.action === 'NAVIGATE' && command.payload?.targetTab) {
        const tab = command.payload.targetTab as any;
        if (['master', 'simulator', 'factory', 'evaluator', 'funnel', 'audience', 'cloner', 'consultant', 'diagnostic', 'admin', 'vsl', 'copylab'].includes(tab)) {
            setActiveTab(tab);
        }
    } else if (command.action === 'DRAW_ON_CANVAS') {
        setIsVisualFunnelOpen(true);
    } else if (command.action === 'GENERATE_FULL_CAMPAIGN') {
        setActiveTab('master');
    } else if (command.action === 'CREATE_CREATIVES') {
        setActiveTab('factory');
    } else if (command.action === 'UPDATE_SIMULATOR') {
        setActiveTab('simulator');
    } else if (command.action === 'RESEARCH_AUDIENCE') {
        setActiveTab('audience');
    } else if (command.action === 'GENERATE_FUNNEL_CONTENT') {
        setActiveTab('funnel');
    } else if (command.action === 'EVALUATE_PRODUCT') {
        setActiveTab('evaluator');
    } else if (command.action === 'EXPORT_CAMPAIGN') {
        generateGlobalFacebookZIP();
    } else if (command.action === 'CONSULT_BUSINESS') {
        setActiveTab('consultant');
    } else if (command.action === 'EXPLAIN_FEATURE') {
        const { featureName, title, description, stepNumber, totalSteps } = command.payload || {};
        if (featureName) {
            // Map feature name to tab name if different
            const tabMap: any = {
                'simulator': 'simulator',
                'evaluator': 'evaluator',
                'master': 'master',
                'consultant': 'consultant',
                'audience': 'audience',
                'factory': 'factory',
                'funnel': 'funnel',
                'multimodal': 'multimodal',
                'cloner': 'cloner',
                'admin': 'admin'
            };
            const targetTab = tabMap[featureName];
            if (targetTab) setActiveTab(targetTab);

            setTourState({
                isActive: true,
                stepNumber: stepNumber || 1,
                totalSteps: totalSteps || 9,
                title: title || 'Funcionalidade',
                description: description || '',
                featureName: featureName
            });

            // Auto-dismiss after 8 seconds if no new command comes in
            setTimeout(() => {
                setTourState(prev => {
                    if (prev && prev.stepNumber === stepNumber) {
                        return null; // Close only if still on same step
                    }
                    return prev;
                });
            }, 10000);
        }
    }
    // AUTONOMOUS FLOW: queue multiple commands in sequence
    if (command.action === 'AUTONOMOUS_FLOW' && command.payload?.steps) {
      const steps = command.payload.steps as VoiceCommand[];
      setIsAgentFlowRunning(true);
      let delay = 0;
      steps.forEach((step, i) => {
        setTimeout(() => {
          setPendingVoiceCommand(step);
          if (step.action === 'NAVIGATE') {
            const tab = step.payload?.targetTab;
            if (tab && ['master','simulator','factory','evaluator','funnel','audience','cloner','consultant','diagnostic','admin','multimodal'].includes(tab)) {
              setActiveTab(tab as any);
            }
          }
          if (i === steps.length - 1) setIsAgentFlowRunning(false);
        }, delay);
        delay += 1500;
      });
      return;
    }

    setPendingVoiceCommand(command);
  };

  const getTabClass = (tabName: string) => {
    const isActive = activeTab === tabName;

    let isGenerating = false;
    if (tabName === 'master')    isGenerating = isMasterGenerating;
    if (tabName === 'factory')   isGenerating = isFactoryGenerating;
    if (tabName === 'audience')  isGenerating = isAudienceGenerating;
    if (tabName === 'funnel')    isGenerating = isFunnelGenerating || isVideoGenerating;
    if (tabName === 'cloner')    isGenerating = isClonerGenerating;
    if (tabName === 'vsl')       isGenerating = isVslGenerating;
    if (tabName === 'copylab')   isGenerating = isCopyLabGenerating;

    // Label mapping
    const labels: Record<string, string> = {
      master: 'Orquestrador', factory: 'Fábrica IA', audience: 'Inteligência',
      evaluator: 'Avaliador', cloner: 'Clonar', consultant: 'Negócios',
      multimodal: 'Estúdio', funnel: 'Funil DB', diagnostic: 'Diagnóstico',
      vsl: 'VSL Studio', copylab: 'Copy Lab',
      simulator: 'Simulador', admin: 'Painel',
    };
    const label = labels[tabName] || tabName;

    const colorClass = '';

    const icons: Record<string, React.ReactNode> = {
      master:     <Command size={13} />,
      simulator:  <Calculator size={13} />,
      evaluator:  <ClipboardCheck size={13} />,
      audience:   <Target size={13} />,
      funnel:     <Layout size={13} />,
      multimodal: <Clapperboard size={13} />,
      factory:    <Zap size={13} />,
      cloner:     <Copy size={13} />,
      consultant: <Briefcase size={13} />,
      diagnostic: <HeartPulse size={13} />,
      admin:      <Shield size={13} />,
      vsl:        <Video size={13} />,
      copylab:    <PenLine size={13} />,
    };

    const showLock = !isPro && !['simulator','evaluator','master','admin'].includes(tabName);

    return (
      <button
        key={tabName}
        onClick={() => handleTabChange(tabName as any)}
        className={`neurion-tab ${isActive ? `active ${colorClass}` : ''}`}
      >
        {icons[tabName]}
        <span>{label}</span>
        {showLock && !isActive && <Lock size={10} style={{ opacity: 0.4 }} />}
        {isGenerating && <span className="tab-dot" />}
      </button>
    );
  };

    // --- PERSISTENT RENDER STRATEGY ---
  // To keep background processes alive, we render ALL components and toggle visibility with display: block/none
  
  return (
    <>
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      paddingBottom: '80px',
      position: 'relative',
      zIndex: 1,
      ['--plan-color' as any]: planColor,
      ['--plan-color-soft' as any]: hexToRgba(planColor, 0.16),
      ['--plan-color-border' as any]: hexToRgba(planColor, 0.38),
      ['--plan-logo-color' as any]: planLogoColor,
      ['--plan-logo-glow' as any]: planLogoGlow,
    }}>
      {/* Ambient blue orbs */}
      <div style={{
        position: 'fixed', width: '600px', height: '600px',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        top: '-200px', left: '-200px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)',
        animation: 'orbFloat1 18s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', width: '500px', height: '500px',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        bottom: '-150px', right: '-150px',
        background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
        animation: 'orbFloat2 22s ease-in-out infinite',
      }} />
      <SoundController />
      
      {/* INTRO ANIMATION */}
      {showIntro && (
        <IntroAnimation onComplete={() => setShowIntro(false)} userPlan={user?.plan} />
      )}

      {/* --- HEADER ---------------------------------------------------- */}
      <header style={{
        background: 'linear-gradient(90deg, rgba(4,9,15,0.96), rgba(8,15,28,0.94) 48%, rgba(4,9,15,0.96))',
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        boxShadow: '0 1px 0 rgba(96,165,250,0.12), 0 8px 32px rgba(0,0,0,0.5)',
        overflow: 'visible',
      }}>
        {/* Animated aurora bottom border */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', overflow: 'hidden',
          background: 'rgba(59,130,246,0.08)',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(37,99,235,0.5) 20%, rgba(59,130,246,0.9) 40%, rgba(34,211,238,0.7) 50%, rgba(59,130,246,0.9) 60%, rgba(37,99,235,0.5) 80%, transparent 100%)',
            animation: 'borderFlow 3.5s ease-in-out infinite',
          }} />
        </div>

        {/* Scan line effect */}
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
        }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.18), rgba(34,211,238,0.12), transparent)',
            animation: 'scanSweep 8s linear infinite',
          }} />
        </div>

        <div style={{
          maxWidth: '1920px', margin: '0 auto',
          padding: '0 24px', height: '66px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '16px', position: 'relative', zIndex: 1,
        }}>

          {/* -- LOGO -- */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '13px', flexShrink: 0 }}>
            {/* Logo box with pulse glow */}
            <div
              className="neurion-logo-box"
              style={{
                ['--logo-color' as any]: planLogoColor,
                ['--logo-glow' as any]: planLogoGlow,
              }}
            >
              <BrainCircuit size={20} color={planLogoColor} strokeWidth={1.9} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{
                  fontSize: '16px', fontWeight: '800',
                  letterSpacing: '-0.01em',
                  fontFamily: 'var(--font-display)',
                  background: 'linear-gradient(135deg, #e2efff 0%, #93c5fd 50%, #60a5fa 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'textShimmer 5s linear infinite',
                }}>NEURION OS</span>
                <span className="version-badge">v26.0</span>
              </div>
              <div style={{
                fontSize: '8.5px', color: 'var(--text-secondary)',
                fontWeight: '600', letterSpacing: '0.22em', textTransform: 'uppercase',
                fontFamily: 'var(--font-display)', marginTop: '2px',
              }}>
                <span style={{ color: 'rgba(59,130,246,0.5)', marginRight: '4px' }}>◆</span>
                2026 · GOAT
              </div>
            </div>
          </div>

          {/* -- TABS -- */}
          <nav className="tabs-container">
            {getTabClass('simulator')}
            {getTabClass('evaluator')}
            {getTabClass('consultant')}
            {getTabClass('audience')}
            {getTabClass('factory')}
            {getTabClass('funnel')}
            {getTabClass('multimodal')}
            {getTabClass('cloner')}
            {getTabClass('diagnostic')}
            {getTabClass('vsl')}
            {getTabClass('copylab')}
            {canAccessAdmin && getTabClass('admin')}
          </nav>

          {/* -- ACTIONS -- */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

            {/* Export FB Button */}
            <button
              onClick={generateGlobalFacebookZIP}
              disabled={isExporting}
              className="export-btn"
            >
              {isExporting
                 ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                : <FileSpreadsheet size={13} />}
              Exportar FB
            </button>

            {!planConfig.isAdmin && (
              <button
                onClick={() => setShowUpgradePanel(true)}
                className="upgrade-btn"
                title="Ver planos"
              >
                <Crown size={13} />
                Upgrade
              </button>
            )}

            {/* Divider */}
            <div style={{ width: '1px', height: '28px', background: 'var(--border-subtle)', margin: '0 4px' }} />

            {/* User plan chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px',
              background: 'rgba(15,23,42,0.62)',
              border: `1px solid ${hexToRgba(planLogoColor, isPro ? 0.38 : 0.18)}`,
              borderRadius: '20px',
              boxShadow: isPro ? `0 0 14px ${planLogoGlow}` : 'none',
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: planLogoColor,
                boxShadow: isPro ? `0 0 8px ${planLogoColor}` : 'none',
                animation: isPro ? 'pulseDot 2s infinite' : 'none',
              }} />
              <span style={{
                fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em',
                fontFamily: 'var(--font-display)',
                color: 'var(--text-bright)',
              }}>
                {planConfig.name}
              </span>
            </div>



            <div style={{
              width: '132px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '9px',
                color: '#7dd3fc',
                fontFamily: 'var(--font-display)',
              }}>
                <span>Uso</span>
                <span style={{ color: usageStatus.hasReachedLimit ? '#fda4af' : '#e0f2fe', fontWeight: 800 }}>{usageStatus.maxPct}%</span>
              </div>
              <div style={{
                height: '5px',
                borderRadius: '999px',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{
                  width: `${usageStatus.maxPct}%`,
                  height: '100%',
                  background: usageStatus.hasReachedLimit ? 'linear-gradient(90deg, #fb7185, #f43f5e)' : 'linear-gradient(90deg, #38bdf8, #2563eb)',
                  boxShadow: usageStatus.hasReachedLimit ? '0 0 10px rgba(244,63,94,0.5)' : '0 0 10px rgba(56,189,248,0.45)',
                }} />
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Sair"
              className="icon-btn danger"
              style={{ color: '#7dd3fc' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fda4af'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(244,63,94,0.28)'; (e.currentTarget as HTMLElement).style.background = 'rgba(244,63,94,0.1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(244,63,94,0.18)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7dd3fc'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.05)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT ---------------------------------------------- */}
      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '28px 24px' }}>
        {user && (
          <>
            {shouldShowUpsell && (
              <div className="animate-slide-in" style={{
                marginBottom: '16px',
                padding: '14px 16px',
                borderRadius: '12px',
                border: `1px solid ${usageStatus.hasReachedLimit ? 'rgba(244,63,94,0.36)' : hexToRgba(planColor, 0.34)}`,
                background: usageStatus.hasReachedLimit ? 'rgba(244,63,94,0.12)' : hexToRgba(planColor, 0.11),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                boxShadow: `0 12px 32px ${hexToRgba(planColor, 0.08)}`,
              }}>
                <div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: usageStatus.hasReachedLimit ? '#fda4af' : planColor,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}>
                    {usageStatus.hasReachedLimit ? 'Limite do plano atingido' : '50% do uso alcançado'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {usageStatus.hasReachedLimit
                       ? `Você atingiu o limite de ${resourceLabels[usageStatus.limitingResource]} do plano ${planConfig.name}. Assine um plano maior para continuar.`
                      : `Você já usou ${usageStatus.maxPct}% do plano ${planConfig.name}. Escolha Starter, Pro ou Agency para aumentar seus limites.`}
                  </div>
                </div>
                <button
                  onClick={() => setShowUpgradePanel(true)}
                  className="neurion-btn-primary"
                  style={{ background: usageStatus.hasReachedLimit ? 'linear-gradient(135deg, #f43f5e, #be123c)' : `linear-gradient(135deg, ${planColor}, #2563eb)` }}
                >
                  Ver planos
                </button>
              </div>
            )}

            {/* AGENT FLOW STATUS BAR */}
            {(isFactoryGenerating || isAudienceGenerating || isFunnelGenerating || isClonerGenerating || isVideoGenerating || isVslGenerating || isCopyLabGenerating) && (
              <div className="animate-slide-in agent-status-bar" style={{
                marginBottom: '16px', padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: 'var(--blue-mid)',
                  boxShadow: '0 0 10px var(--blue-core), 0 0 20px rgba(59,130,246,0.4)',
                  animation: 'pulseDot 1.4s infinite',
                }} />
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--blue-soft)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
                  Agente em execução
                </span>
                <div style={{ flex: 1, height: '2px', borderRadius: '2px', background: 'rgba(59,130,246,0.08)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: '40%',
                    background: 'linear-gradient(90deg, var(--blue-vivid), var(--blue-mid), var(--cyan-bright))',
                    animation: 'flowPulse 1.6s ease-in-out infinite',
                    borderRadius: '2px',
                    boxShadow: '0 0 8px rgba(59,130,246,0.5)',
                  }} />
                </div>
                {isFactoryGenerating && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fábrica IA</span>}
                {isAudienceGenerating && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Inteligência</span>}
                {isVslGenerating && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>VSL Studio</span>}
                {isCopyLabGenerating && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Copy Lab</span>}
              </div>
            )}

            {/* TABS CONTENT — display:none strategy preserved for background processes */}
            <div style={{ display: activeTab === 'master' ? 'block' : 'none' }}>
              <RestrictedArea
                isPro={isPro}
                isTeamOnly={user.plan === 'FREE'}
                onActivate={() => setShowUpgradePanel(true)}
                title="Orquestrador Estratégico"
                description="A ferramenta secreta dos Top Players."
              >
                <CampaignMaster
                  key={user.email}
                  userEmail={user.email}
                  voiceTrigger={pendingVoiceCommand}
                  onVoiceTriggerHandled={() => setPendingVoiceCommand(null)}
                  onStatusChange={setIsMasterGenerating}
                />
              </RestrictedArea>
            </div>

            <div style={{ display: activeTab === 'consultant' ? 'block' : 'none' }}>
              <RestrictedArea
                isPro={isPro}
                isTeamOnly={user.plan === 'FREE'}
                onActivate={() => setShowUpgradePanel(true)}
                title="Consultor de Negócios"
                description="Análise de viabilidade e planejamento financeiro com IA."
              >
                <BusinessConsultant
                  key={user.email}
                  userEmail={user.email}
                  voiceTrigger={pendingVoiceCommand}
                  onVoiceTriggerHandled={() => setPendingVoiceCommand(null)}
                />
              </RestrictedArea>
            </div>

            <div style={{ display: activeTab === 'simulator' ? 'block' : 'none' }}>
              <Simulator
                key={user.email}
                userEmail={user.email}
                voiceTrigger={pendingVoiceCommand}
                onVoiceTriggerHandled={() => setPendingVoiceCommand(null)}
              />
            </div>

            <div style={{ display: activeTab === 'evaluator' ? 'block' : 'none' }}>
              <ProductEvaluator
                key={user.email}
                voiceTrigger={pendingVoiceCommand}
                onVoiceTriggerHandled={() => setPendingVoiceCommand(null)}
              />
            </div>

            <div style={{ display: activeTab === 'audience' ? 'block' : 'none' }}>
              <RestrictedArea
                isPro={isPro}
                isTeamOnly={user.plan === 'FREE'}
                onActivate={() => setShowUpgradePanel(true)}
                title="Inteligência de Público"
                description="Descubra exatamente quem é seu cliente ideal."
              >
                <AudienceHunter
                  key={user.email}
                  userEmail={user.email}
                  voiceTrigger={pendingVoiceCommand}
                  onVoiceTriggerHandled={() => setPendingVoiceCommand(null)}
                  onStatusChange={setIsAudienceGenerating}
                />
              </RestrictedArea>
            </div>

            <div style={{ display: activeTab === 'funnel' ? 'block' : 'none' }}>
              <RestrictedArea
                isPro={isPro}
                isTeamOnly={user.plan === 'FREE'}
                onActivate={() => setShowUpgradePanel(true)}
                title="Construtor de Funis"
                description="Crie páginas de alta conversão."
              >
                <FunnelBuilder
                  key={user.email}
                  userEmail={user.email}
                  voiceTrigger={pendingVoiceCommand}
                  onVoiceTriggerHandled={() => setPendingVoiceCommand(null)}
                  onStatusChange={setIsFunnelGenerating}
                />
              </RestrictedArea>
            </div>

            <div style={{ display: activeTab === 'multimodal' ? 'block' : 'none' }}>
              <RestrictedArea
                isPro={isPro}
                isTeamOnly={user.plan === 'FREE'}
                onActivate={() => setShowUpgradePanel(true)}
                title="Estúdio Multimodal"
                description="Crie imagens e vídeos com IA do Google."
              >
                <MultimodalCreation
                  key={user.email}
                  userEmail={user.email}
                  voiceTrigger={pendingVoiceCommand}
                  onVoiceTriggerHandled={() => setPendingVoiceCommand(null)}
                />
              </RestrictedArea>
            </div>

            <div style={{ display: activeTab === 'factory' ? 'block' : 'none' }}>
              <RestrictedArea
                isPro={isPro}
                isTeamOnly={user.plan === 'FREE'}
                onActivate={() => setShowUpgradePanel(true)}
                title="Fábrica de Criativos"
                description="Gere dezenas de anúncios em segundos."
              >
                <CreativeFactory
                  key={user.email}
                  userEmail={user.email}
                  onStatusChange={setIsFactoryGenerating}
                  voiceTrigger={pendingVoiceCommand}
                  onVoiceTriggerHandled={() => setPendingVoiceCommand(null)}
                  onCreativesGenerated={setCreativesResult}
                />
              </RestrictedArea>
            </div>

            <div style={{ display: activeTab === 'cloner' ? 'block' : 'none' }}>
              <RestrictedArea
                isPro={isPro}
                isTeamOnly={user.plan === 'FREE'}
                onActivate={() => setShowUpgradePanel(true)}
                title="Clonador de Páginas"
                description="Clone qualquer página de vendas."
              >
                <PageCloner
                  key={user.email}
                  userEmail={user.email}
                  onStatusChange={setIsClonerGenerating}
                />
              </RestrictedArea>
            </div>

            <div style={{ display: activeTab === 'diagnostic' ? 'block' : 'none' }}>
              <RestrictedArea
                isPro={isPro}
                isTeamOnly={user.plan === 'FREE'}
                onActivate={() => setShowUpgradePanel(true)}
                title="Diagnóstico de Campanha"
                description="Analise e otimize suas campanhas com IA."
              >
                <DiagnosticChat
                  key={user.email}
                  userEmail={user.email}
                />
              </RestrictedArea>
            </div>

            {/* FUNIL VISUAL OVERLAY */}
            {isVisualFunnelOpen && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 50,
                background: 'var(--bg-base)',
                animation: 'slideIn 0.25s ease',
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <PenTool size={18} color="#818cf8" />
                    <span style={{ fontWeight: '700', fontSize: '15px', color: '#f1f5f9' }}>Funil Visual</span>
                    <span style={{
                      fontSize: '9px', fontWeight: '700', padding: '2px 7px',
                      background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                      border: '1px solid rgba(99,102,241,0.25)', borderRadius: '5px',
                    }}>CANVAS</span>
                  </div>
                  <button
                    onClick={() => setIsVisualFunnelOpen(false)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <LogOut size={14} />
                  </button>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <FunnelVisualCognitive
                    key={user.email}
                    userEmail={user.email}
                    voiceTrigger={pendingVoiceCommand}
                    onVoiceTriggerHandled={() => setPendingVoiceCommand(null)}
                    onClose={() => setIsVisualFunnelOpen(false)}
                    onCanvasUpdate={setVisualContext}
                  />
                </div>
              </div>
            )}

            <div style={{ display: activeTab === 'vsl' ? 'block' : 'none' }}>
              <RestrictedArea
                isPro={isPro}
                isTeamOnly={user.plan === 'FREE'}
                onActivate={() => setShowUpgradePanel(true)}
                title="VSL Studio"
                description="Gere roteiros profissionais de vídeo de vendas."
              >
                <VSLStudio key={user.email} userEmail={user.email} onStatusChange={setIsVslGenerating} />
              </RestrictedArea>
            </div>

            <div style={{ display: activeTab === 'copylab' ? 'block' : 'none' }}>
              <RestrictedArea
                isPro={isPro}
                isTeamOnly={user.plan === 'FREE'}
                onActivate={() => setShowUpgradePanel(true)}
                title="Copy Lab"
                description="Copy profissional para todos os canais em segundos."
              >
                <CopyLab key={user.email} userEmail={user.email} onStatusChange={setIsCopyLabGenerating} />
              </RestrictedArea>
            </div>

            {activeTab === 'admin' && canAccessAdmin && (
              <AdminPanel currentUserEmail={user.email} />
            )}

            {/* TOUR OVERLAY */}
            {tourState && tourState.isActive && (
              <div className="animate-slide-in" style={{
                position: 'fixed', bottom: '100px', left: '50%',
                transform: 'translateX(-50%)', zIndex: 50,
              }}>
                <div style={{
                  background: 'rgba(12,15,29,0.95)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '16px', padding: '20px',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
                  maxWidth: '400px', width: '100%',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0,
                    height: '2px', background: 'linear-gradient(90deg, #6366f1, #38bdf8)',
                    width: `${(tourState.stepNumber / tourState.totalSteps) * 100}%`,
                    transition: 'width 0.5s',
                  }} />
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginTop: '8px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0,
                      background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Sparkles size={16} color="#818cf8" />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#818cf8', letterSpacing: '0.1em', marginBottom: '4px' }}>
                        TOUR · {tourState.stepNumber}/{tourState.totalSteps}
                      </div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#f1f5f9', marginBottom: '4px' }}>{tourState.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{tourState.description}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showUpgradePanel && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Planos de upgrade"
          onClick={() => setShowUpgradePanel(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(2,6,23,0.72)',
            backdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(980px, 100%)',
              borderRadius: '18px',
              border: '1px solid rgba(96,165,250,0.18)',
              background: 'linear-gradient(180deg, rgba(8,15,28,0.98), rgba(4,9,15,0.98))',
              boxShadow: '0 32px 90px rgba(0,0,0,0.72)',
              overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '18px 20px',
              borderBottom: '1px solid rgba(96,165,250,0.12)',
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#93c5fd',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-display)',
                  marginBottom: '5px',
                }}>
                  <Crown size={14} />
                  Upgrade NEURION
                </div>
                <div style={{ color: '#f8fafc', fontSize: '20px', fontWeight: 900, letterSpacing: '-0.01em' }}>
                  Escolha o plano ideal para o seu ritmo
                </div>
              </div>
              <button
                onClick={() => setShowUpgradePanel(false)}
                className="icon-btn"
                title="Fechar"
                style={{ color: '#93c5fd' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              padding: '16px',
            }}>
              {UPGRADE_PLANS.map((plan) => {
                const isCurrentPlan = user?.plan === plan.id;
                return (
                  <div
                    key={plan.id}
                    style={{
                      position: 'relative',
                      minHeight: '360px',
                      borderRadius: '14px',
                      border: `1px solid ${hexToRgba(plan.color, isCurrentPlan ? 0.58 : 0.32)}`,
                      background: `linear-gradient(180deg, ${hexToRgba(plan.color, 0.12)}, rgba(15,23,42,0.42) 42%, rgba(2,6,23,0.34))`,
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      boxShadow: isCurrentPlan ? `0 0 28px ${hexToRgba(plan.color, 0.16)}` : 'none',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '-44px',
                      right: '-40px',
                      width: '130px',
                      height: '130px',
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${hexToRgba(plan.logoColor, 0.32)}, transparent 68%)`,
                      pointerEvents: 'none',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '14px', position: 'relative' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${hexToRgba(plan.logoColor, 0.42)}`,
                        background: hexToRgba(plan.logoColor, 0.12),
                        boxShadow: `0 0 18px ${hexToRgba(plan.logoColor, 0.18)}`,
                      }}>
                        <BrainCircuit size={22} color={plan.logoColor} strokeWidth={1.9} />
                      </div>
                      {isCurrentPlan && (
                        <span style={{
                          color: plan.logoColor,
                          border: `1px solid ${hexToRgba(plan.logoColor, 0.32)}`,
                          background: hexToRgba(plan.logoColor, 0.1),
                          borderRadius: '999px',
                          padding: '4px 8px',
                          fontSize: '9px',
                          fontWeight: 900,
                          letterSpacing: '0.08em',
                          fontFamily: 'var(--font-display)',
                        }}>
                          ATUAL
                        </span>
                      )}
                    </div>

                    <div style={{ color: '#ffffff', fontSize: '24px', fontWeight: 900, marginBottom: '2px' }}>{plan.name}</div>
                    <div style={{ color: plan.logoColor, fontSize: '22px', fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: '10px' }}>{plan.priceLabel}</div>
                    <div style={{ color: '#dbeafe', fontSize: '13px', fontWeight: 800, lineHeight: 1.35, marginBottom: '8px' }}>{plan.tagline}</div>
                    <p style={{ color: 'rgba(226,239,255,0.62)', fontSize: '12px', lineHeight: 1.55, margin: '0 0 14px' }}>{plan.description}</p>

                    <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                      {plan.features.map((feature) => (
                        <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(248,250,252,0.82)', fontSize: '12px' }}>
                          <CheckCircle2 size={14} color={plan.logoColor} />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => openCheckout(plan.id)}
                      disabled={isCurrentPlan}
                      style={{
                        marginTop: 'auto',
                        height: '42px',
                        borderRadius: '11px',
                        border: 'none',
                        background: isCurrentPlan ? 'rgba(148,163,184,0.16)' : `linear-gradient(135deg, ${plan.color}, #2563eb)`,
                        color: isCurrentPlan ? 'rgba(226,232,240,0.55)' : '#fff',
                        cursor: isCurrentPlan ? 'default' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: isCurrentPlan ? 'none' : `0 12px 28px ${hexToRgba(plan.color, 0.18)}`,
                      }}
                    >
                      {isCurrentPlan ? 'Plano atual' : 'Ir para checkout'}
                      {!isCurrentPlan && <ArrowUpRight size={14} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS ----------------------------------------------------- */}
      {/* FOOTER */}
      <footer style={{
        maxWidth: '1600px', margin: '0 auto', padding: '24px',
        borderTop: '1px solid rgba(59,130,246,0.08)', marginTop: '40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          "Eu não quero apenas um app, quero uma máquina que irá poupar o meu tempo."
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '9px', color: 'rgba(59,130,246,0.3)', fontFamily: 'var(--font-display)', letterSpacing: '0.15em' }}>NEURION OS v26.0 · GOAT · 2026</span>
          <span style={{ color: 'rgba(59,130,246,0.2)' }}>◆</span>
          <a href="https://www.instagram.com/goatstates/" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--blue-mid)', fontWeight: '700', textDecoration: 'none', fontSize: '11px' }}>
            @goatstates
          </a>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>·</span>
          <a href="https://www.instagram.com/erikalvves/" target="_blank" rel="noopener noreferrer"
            style={{ color: '#22d3ee', fontWeight: '700', textDecoration: 'none', fontSize: '11px' }}>
            @erikalvves
          </a>
        </div>
      </footer>
    </div>
      <UpdateNotification />
    </>
  );
}

export default App;


