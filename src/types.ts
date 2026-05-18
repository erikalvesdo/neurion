
export interface CampaignState {
  productName: string;
  isProducer: boolean;
  commissionRate: number; // Percentage (0-100)
  ticketPrice: number;
  adSets: number;
  budgetMode: 'ABO' | 'CBO'; // New: Optimization mode
  budgetPerSet: number; // Used if ABO
  campaignBudget: number; // Used if CBO
  daysRunning: number;
  funnelType: 'direct' | 'quiz' | 'automation';
  estimatedSales: number;
}

export interface SimulationResults {
  totalDailyBudget: number;
  totalInvested: number;
  totalRevenue: number;
  grossProfit: number; // Revenue * Commission (or 100% if producer)
  netProfit: number; // Gross Profit - Invested
  roi: number; // Return on Investment %
  cpa: number; // Cost Per Acquisition
}

export type VisualStyle = 'cinematic' | 'wikihow' | '3d_render' | 'anime';

export interface CreativeInput {
  productName: string;
  niche: string;
  targetAudience: string;
  painPoint: string;
  offerDetails: string; 
  contentReferences?: string; // NEW: User references for style/tone
  referenceImage?: string; // NEW: Base64 image for visual analysis
  expertMode: boolean; 
  textOnlyMode: boolean; // NEW: Generate only copy, skip images
  desire: string;
  mechanism: string;
  angleCount: number; // New: How many angles to generate
  visualStyle: VisualStyle; // New: WikiHow vs Realism
}

export interface CreativeVariation {
  id: string;
  hookType: string; // ex: "Lógica", "Emoção"
  headline: string;
  subheadline: string;
  primaryText: string;
  imagePrompt: string;
  base64Image?: string;
}

export interface AngleResult {
  angleName: string;
  angleExplanation: string; // Why this angle works
  creatives: CreativeVariation[]; // Should contain 2 variations per angle
}

// Wrapper for the final output
export interface FactoryResult {
  angles: AngleResult[];
}

// --- CAMPAIGN MASTER TYPES (OUTLIER 3.0) ---
export type MentorType = 'brasao' | 'erico' | 'finch' | 'conrado' | 'neurion_default';

export interface CampaignBible {
  mentorUsed: MentorType; // Metadata
  diagnosis: {
    exposedWound: string;
    invisibleEnemy: string;
    desiredIdentity: string;
  };
  angles: {
    angleName: string;
    funnelStructure: {
        hook: { title: string; text: string; cta: string };
        quiz: { 
            title: string; 
            intro: string; 
            questions: { text: string; options: { text: string; points: number }[] }[]; 
        };
        quizResults: {
            lowRisk: { title: string; text: string };
            mediumRisk: { title: string; text: string };
            highRisk: { title: string; text: string };
        };
        salesPage: { 
            headline: string; 
            subheadline: string; 
            problem: string; 
            mechanism: string; 
            offer: string; 
            guarantee: string; 
        };
        upsell: {
            title: string;
            subtitle: string;
            hook: string;
            solution: string;
            offer: string;
        }
    };
    recoveryScripts: { boleto: string; pix: string; objection: string; abandoned: string };
  }[];
  visuals: {
    feedPrompt: string;
    storyPrompt: string;
    thumbPrompt: string;
  };
  guidelines: {
    toneOfVoice: string;
    bannedWords: string[];
  };
}

// --- VIDEO / STORYBOARD FACTORY TYPES ---
export interface StoryboardScene {
  sceneId: number;
  narration: string;
  visualDescription: string;
  imagePrompt: string;
  base64Image?: string; // Generated image for the scene
}

export interface VideoQueueItem {
  id: string;
  productName: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scenes?: StoryboardScene[]; // Array of scenes for the storyboard
  createdAt: number;
  progress?: number; // Simulated progress 0-100
  errorMessage?: string;
}

// --- FUNNEL BUILDER TYPES ---

export type NodeType = 'capture' | 'vsl' | 'checkout' | 'upsell' | 'downsell' | 'thankyou';

export interface FunnelNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  prompt?: string;
  generatedHtml?: string; // Stored HTML content
}

export interface FunnelConnection {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
}

export interface FunnelProject {
  id: string;
  name: string;
  createdAt: number;
  nodes: FunnelNode[];
  connections: FunnelConnection[];
}

// --- BUSINESS CONSULTANT TYPES (V14.0 MODULE 6) ---
export interface BusinessPlan {
  viabilityScore: number; // 0-10
  viabilityReason: string;
  revenueModel: string;
  pricingStrategy: {
      low: string;
      medium: string;
      high: string;
      recommended: string;
  };
  roadmap: {
      phase1: string;
      phase2: string;
      phase3: string;
  };
  riskAnalysis: string;
}

// --- AUTH TYPES ---
export type PlanType = 'FREE' | 'STARTER' | 'TRIAL' | 'PRO' | 'AGENCY' | 'LIFETIME' | 'MODERATOR';

export interface UserSession {
  email: string;
  plan: PlanType;
  proExpiry?: number; // Timestamp
  trialStartedAt?: number | null;
  trialEndsAt?: number | null;
  isAdmin?: boolean;
  usedCodes?: string[]; // Array of redeemed license codes
  isBanned?: boolean; // New: Ban status
  createdAt?: number; // New: Account creation date
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  businessType: 'ecommerce' | 'infoproduto' | 'serviços' | 'físico';
  monthlyBudget: number;
  preferredMentor: 'finch' | 'marcal' | 'hibrido';
  pastCampaigns: any[]; // Simplified for now
  savedFunnels: any[];
  voicePreferences: {
    speed: number;
    tone: 'profissional' | 'agressivo' | 'calmo';
  };
  createdAt: number;
  lastActive: number;
}

export interface ConversationMemory {
  id: string;
  timestamp: number;
  summary: string;
  embedding: number[]; // 768 dimensions
  keyPoints: string[];
}

export interface Feedback {
  interactionId: string;
  userMessage: string;
  aiResponse: string;
  rating: 1 | 2 | 3 | 4 | 5;
  correctedResponse?: string;
  timestamp: number;
}

// --- VOICE COMMAND TYPES ---
export type VoiceActionType = 
  | 'CREATE_CREATIVES' 
  | 'UPDATE_SIMULATOR' 
  | 'GENERATE_VIDEO' 
  | 'RESEARCH_AUDIENCE' 
  | 'NAVIGATE' 
  | 'MODIFY_FUNNEL_STRUCTURE' // Add Node, Connect Nodes, Create Project
  | 'AUTONOMOUS_FLOW' // Chained multi-step agent execution
  | 'GENERATE_FUNNEL_CONTENT' // Generate HTML for a node
  | 'EVALUATE_PRODUCT' // NEW: Evaluate Product Checklist
  | 'ADMIN_ACTION' // Ban, Unban, Change Plan
  | 'EXPORT_CAMPAIGN' // NEW: Global CSV Export
  | 'GENERATE_FULL_CAMPAIGN' // NEW: Campaign Master
  | 'CONSULT_BUSINESS' // NEW: Business Consultant (Module 6)
  | 'DRAW_ON_CANVAS' // NEW: Visual Funnel Drawing
  | 'GENERATE_MEDIA' // NEW: Multimodal Studio (Images/Video)
  | 'EXPLAIN_FEATURE' // NEW: Feature Tour
  | 'UNKNOWN';

export interface DrawCommandPayload {
  prompt?: string; // Raw text from user
  actionType?: 'draw' | 'modify' | 'erase' | 'connect' | 'suggest';
  target?: string;
  location?: { x: number, y: number };
}

export interface VoiceCommand {
  action: VoiceActionType;
  payload?: {
    steps?: VoiceCommand[]; // For AUTONOMOUS_FLOW chaining
    // Shared
    productName?: string;
    description?: string; // Prompt context
    price?: string;
    targetAudience?: string;
    mentor?: MentorType;
    autoStart?: boolean;
    
    // Creative Factory
    angleCount?: number;
    painPoint?: string; 
    visualStyle?: VisualStyle; // Explicit style
    expertMode?: boolean; // Explicit toggle
    
    // Simulator
    ticketPrice?: number;
    budget?: number;
    budgetMode?: 'ABO' | 'CBO'; // NEW: Voice control for Budget Mode
    adSets?: number;
    daysRunning?: number;
    estimatedSales?: number;
    isProducer?: boolean;
    funnelType?: 'direct' | 'quiz' | 'automation';
    commissionRate?: number; // NEW
    isTestMode?: boolean; // NEW
    
    // Video
    videoStyle?: 'cinematic' | 'advertising';
    
    // Audience Hunter
    niche?: string;
    
    // Funnel Structure
    nodeType?: NodeType;
    nodeLabel?: string; 
    connectionSource?: string; 
    connectionTarget?: string;
    projectName?: string; // For creating projects via voice
    contentContext?: string; // NEW: Context for immediate generation (e.g., "Dark theme VSL")
    
    // Evaluator
    checklistAction?: {
        items?: string[]; // Keywords to check
        toggleAll?: boolean;
    };

    // Admin
    targetEmail?: string;
    adminActionType?: 'ban' | 'unban' | 'delete' | 'promote';
    
    // Consultant (Module 6)
    businessIdea?: string;
    
    // Visual Funnel
    drawCommand?: DrawCommandPayload;

    // Feature Tour
    featureName?: string;
    title?: string;
    stepNumber?: number;
    totalSteps?: number;

    // Navigation
    targetTab?: string;
  };
}

// --- FUNNEL VISUAL COGNITIVE TYPES ---
export interface CanvasObject {
  id: string;
  type: 'rect' | 'circle' | 'text' | 'line' | 'image';
  left: number;
  top: number;
  width?: number;
  height?: number;
  fill?: string;
  text?: string;
  label?: string; // AI interpretation
}

export interface VisualFunnelState {
  objects: CanvasObject[];
  selectedId: string | null;
  zoom: number;
}

export type MentorStyle = 'finch' | 'marcal' | 'hibrido';

export interface MemoryEntry {
  id?: number;
  userId: string;
  content: string;
  embedding: number[];
  timestamp: number;
  type: 'interaction' | 'feedback' | 'context' | 'profile' | 'result';
  metadata?: any;
  score?: number;
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: 'optimization' | 'missing_element' | 'copy_improvement';
  actionData?: any; // Data to execute if accepted
  confidence: number;
}

// --- MULTIMODAL CREATION TYPES ---
export interface MediaAsset {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string; // Base64 or Blob URL
  prompt: string;
  createdAt: number;
  metadata?: {
    style?: string;
    duration?: number;
  };
}

export interface MultimodalProject {
  id: string;
  name: string;
  productDescription: string;
  visualStyle: string;
  assets: MediaAsset[];
}
