import { PlanType } from '../types';

export type ResourceKind = 'text' | 'image' | 'voice';

export interface PlanConfig {
  id: PlanType;
  name: string;
  accessPct: number;
  color: string;
  logoColor: string;
  logoGlow: string;
  priceLabel: string;
  textLimit: number;
  imageLimit: number;
  voiceLimit: number;
  voiceEnabled: boolean;
  isAdmin?: boolean;
}

export type UpgradePlanType = Extract<PlanType, 'STARTER' | 'PRO' | 'AGENCY'>;

export interface UpgradePlan {
  id: UpgradePlanType;
  name: string;
  priceLabel: string;
  tagline: string;
  description: string;
  features: string[];
  checkoutUrl: string;
  color: string;
  logoColor: string;
}

export const BASE_LIMITS: Record<ResourceKind, number> = {
  text: 1000,
  image: 100,
  voice: 300,
};

const pctLimit = (resource: ResourceKind, pct: number) => Math.round(BASE_LIMITS[resource] * pct / 100);

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  FREE: {
    id: 'FREE',
    name: 'FREE',
    accessPct: 10,
    color: '#4F46E5',
    logoColor: '#60A5FA',
    logoGlow: 'rgba(96,165,250,0.45)',
    priceLabel: 'Grátis',
    textLimit: pctLimit('text', 10),
    imageLimit: pctLimit('image', 8),
    voiceLimit: 0,
    voiceEnabled: false,
  },
  STARTER: {
    id: 'STARTER',
    name: 'STARTER',
    accessPct: 40,
    color: '#7CFF2B',
    logoColor: '#7CFF2B',
    logoGlow: 'rgba(124,255,43,0.44)',
    priceLabel: 'R$49,90/mês',
    textLimit: pctLimit('text', 40),
    imageLimit: pctLimit('image', 40),
    voiceLimit: pctLimit('voice', 40),
    voiceEnabled: true,
  },
  TRIAL: {
    id: 'TRIAL',
    name: 'TRIAL',
    accessPct: 15,
    color: '#38BDF8',
    logoColor: '#60A5FA',
    logoGlow: 'rgba(96,165,250,0.42)',
    priceLabel: '7 dias limitados',
    textLimit: 40,
    imageLimit: 6,
    voiceLimit: 8,
    voiceEnabled: false,
  },
  PRO: {
    id: 'PRO',
    name: 'PRO',
    accessPct: 70,
    color: '#FF2D55',
    logoColor: '#FF2D55',
    logoGlow: 'rgba(255,45,85,0.5)',
    priceLabel: 'R$129,90/mês',
    textLimit: pctLimit('text', 70),
    imageLimit: pctLimit('image', 70),
    voiceLimit: pctLimit('voice', 70),
    voiceEnabled: true,
  },
  AGENCY: {
    id: 'AGENCY',
    name: 'AGENCY',
    accessPct: 100,
    color: '#F8C24C',
    logoColor: '#F8C24C',
    logoGlow: 'rgba(248,194,76,0.52)',
    priceLabel: 'R$399,90/mês',
    textLimit: pctLimit('text', 100),
    imageLimit: pctLimit('image', 100),
    voiceLimit: pctLimit('voice', 100),
    voiceEnabled: true,
  },
  LIFETIME: {
    id: 'LIFETIME',
    name: 'LIFETIME',
    accessPct: 100,
    color: '#F8C24C',
    logoColor: '#F8C24C',
    logoGlow: 'rgba(248,194,76,0.52)',
    priceLabel: 'Acesso vitalício',
    textLimit: pctLimit('text', 100),
    imageLimit: pctLimit('image', 100),
    voiceLimit: pctLimit('voice', 100),
    voiceEnabled: true,
    isAdmin: true,
  },
  MODERATOR: {
    id: 'MODERATOR',
    name: 'ADMIN',
    accessPct: 100,
    color: '#F8C24C',
    logoColor: '#F8C24C',
    logoGlow: 'rgba(248,194,76,0.52)',
    priceLabel: 'Admin',
    textLimit: pctLimit('text', 100),
    imageLimit: pctLimit('image', 100),
    voiceLimit: pctLimit('voice', 100),
    voiceEnabled: true,
    isAdmin: true,
  },
};

export const CHECKOUT_URLS = {
  STARTER: 'https://pay.cakto.com.br/wn8zsfu_885861',
  PRO: 'https://pay.cakto.com.br/339fqpx_885875',
  AGENCY: 'https://pay.cakto.com.br/hzzacg8_885881',
} as const;

export const UPGRADE_PLANS: UpgradePlan[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    priceLabel: PLAN_CONFIGS.STARTER.priceLabel,
    tagline: 'Simples, potente, feito para começar.',
    description: 'Para quem quer validar e produzir com IA sem sobrecarregar a operação.',
    features: ['Acesso imediato', 'Desempenho rápido', 'Ambiente seguro', 'Suporte dedicado'],
    checkoutUrl: CHECKOUT_URLS.STARTER,
    color: PLAN_CONFIGS.STARTER.color,
    logoColor: PLAN_CONFIGS.STARTER.logoColor,
  },
  {
    id: 'PRO',
    name: 'Pro',
    priceLabel: PLAN_CONFIGS.PRO.priceLabel,
    tagline: 'Mais recursos, mais performance, mais resultados.',
    description: 'Para usuários ativos que precisam de mais limite, velocidade e prioridade.',
    features: ['Acesso prioritário', 'Desempenho máximo', 'Ambiente seguro', 'Suporte prioritário'],
    checkoutUrl: CHECKOUT_URLS.PRO,
    color: PLAN_CONFIGS.PRO.color,
    logoColor: PLAN_CONFIGS.PRO.logoColor,
  },
  {
    id: 'AGENCY',
    name: 'Agency',
    priceLabel: PLAN_CONFIGS.AGENCY.priceLabel,
    tagline: 'Para agências que querem liderar o mercado.',
    description: 'Para times e operações com alto volume de criação, estratégia e execução.',
    features: ['Gestão estratégica', 'Escalabilidade ilimitada', 'Suporte dedicado', 'Prioridade máxima'],
    checkoutUrl: CHECKOUT_URLS.AGENCY,
    color: PLAN_CONFIGS.AGENCY.color,
    logoColor: PLAN_CONFIGS.AGENCY.logoColor,
  },
];

export function normalizePlan(plan?: string | null): PlanType {
  const value = String(plan || 'FREE').toUpperCase();
  if (value === 'STARTER' || value === 'TRIAL' || value === 'PRO' || value === 'AGENCY' || value === 'LIFETIME' || value === 'MODERATOR') {
    return value;
  }
  return 'FREE';
}

export function getPlanConfig(plan?: string | null): PlanConfig {
  return PLAN_CONFIGS[normalizePlan(plan)];
}

export function getPlanColor(plan?: string | null): string {
  return getPlanConfig(plan).color;
}

export function getPlanLogoColor(plan?: string | null): string {
  return getPlanConfig(plan).logoColor;
}

export function canUseVoice(plan?: string | null): boolean {
  return getPlanConfig(plan).voiceEnabled;
}

export function canUsePaidTools(plan?: string | null): boolean {
  return normalizePlan(plan) !== 'FREE';
}

export function isAdminPlan(plan?: string | null): boolean {
  return !!getPlanConfig(plan).isAdmin;
}
