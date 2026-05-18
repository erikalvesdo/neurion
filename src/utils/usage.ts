import { PlanType } from '../types';
import { getPlanConfig, normalizePlan, ResourceKind } from './plans';

export interface UsageCounters {
  period: string;
  text: number;
  image: number;
  voice: number;
}

export interface UsageStatus {
  counters: UsageCounters;
  pctByResource: Record<ResourceKind, number>;
  maxPct: number;
  limitingResource: ResourceKind;
  hasReachedLimit: boolean;
}

const emptyCounters = (period: string): UsageCounters => ({
  period,
  text: 0,
  image: 0,
  voice: 0,
});

const TRIAL_USAGE_COST: Record<ResourceKind, number> = {
  text: 2,
  image: 3,
  voice: 2,
};

export function usagePeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function storageKey(email: string) {
  return `neurion_usage_${email.toLowerCase()}`;
}

export function getUsageCounters(email?: string | null): UsageCounters {
  const period = usagePeriod();
  if (!email) return emptyCounters(period);

  const raw = localStorage.getItem(storageKey(email));
  if (!raw) return emptyCounters(period);

  try {
    const parsed = JSON.parse(raw) as UsageCounters;
    if (parsed.period !== period) return emptyCounters(period);
    return {
      period,
      text: Number(parsed.text || 0),
      image: Number(parsed.image || 0),
      voice: Number(parsed.voice || 0),
    };
  } catch {
    return emptyCounters(period);
  }
}

export function setUsageContext(email: string, plan: PlanType) {
  (window as any).__NEURION_USAGE_CONTEXT__ = {
    email,
    plan: normalizePlan(plan),
  };
}

export function clearUsageContext() {
  delete (window as any).__NEURION_USAGE_CONTEXT__;
}

export function recordUsage(resource: ResourceKind, amount = 1, email?: string | null) {
  const context = (window as any).__NEURION_USAGE_CONTEXT__;
  const targetEmail = email || context?.email;
  if (!targetEmail) return;

  const counters = getUsageCounters(targetEmail);
  const plan = normalizePlan(context?.plan);
  const charge = plan === 'TRIAL' ? amount * TRIAL_USAGE_COST[resource] : amount;
  counters[resource] = Number(counters[resource] || 0) + charge;
  localStorage.setItem(storageKey(targetEmail), JSON.stringify(counters));
  window.dispatchEvent(new CustomEvent('neurion-usage-updated', { detail: { email: targetEmail } }));
}

export function getUsageStatus(email: string | null | undefined, plan?: string | null): UsageStatus {
  const counters = getUsageCounters(email);
  const config = getPlanConfig(plan);
  const pctByResource: Record<ResourceKind, number> = {
    text: Math.min(100, Math.round((counters.text / Math.max(1, config.textLimit)) * 100)),
    image: Math.min(100, Math.round((counters.image / Math.max(1, config.imageLimit)) * 100)),
    voice: Math.min(100, Math.round((counters.voice / Math.max(1, config.voiceLimit)) * 100)),
  };

  const entries = Object.entries(pctByResource) as [ResourceKind, number][];
  const [limitingResource, maxPct] = entries.reduce((max, current) => current[1] > max[1] ? current : max, entries[0]);

  return {
    counters,
    pctByResource,
    maxPct,
    limitingResource,
    hasReachedLimit: maxPct >= 100,
  };
}

export function assertWithinUsage(resource: ResourceKind) {
  const context = (window as any).__NEURION_USAGE_CONTEXT__;
  if (!context?.email) return;

  const config = getPlanConfig(context.plan);
  if (config.isAdmin) return;

  const status = getUsageStatus(context.email, context.plan);
  if (status.pctByResource[resource] >= 100) {
    throw new Error(`Limite mensal de ${resource} atingido para o plano ${config.name}.`);
  }
}
