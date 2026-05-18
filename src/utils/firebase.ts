/**
 * NEURION OS - Firebase integration.
 *
 * Auth is account-based. Device or hardware fingerprints are not used to
 * authorize login.
 */
import { initializeApp, getApps } from 'firebase/app';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { PlanType } from '../types';
import { normalizePlan } from './plans';

const firebaseConfig = {
  apiKey: "AIzaSyAa0ZqMl9bxNp37U4KhZfGDM24cvQ6JBbY",
  authDomain: "neurion-os.firebaseapp.com",
  projectId: "neurion-os",
  storageBucket: "neurion-os.firebasestorage.app",
  messagingSenderId: "387946055437",
  appId: "1:387946055437:web:b329b8a66088b0b35a9244",
  measurementId: "G-TW9CVMXGSQ"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

export interface FirestoreUser {
  email: string;
  passwordHash: string;
  plan: PlanType;
  isAdmin?: boolean;
  is_admin?: boolean;
  isBanned: boolean;
  banReason?: string;
  createdAt: Timestamp | null;
  lastLogin: Timestamp | null;
  lastLoginAt?: number | null;
  lastLoginIp?: string | null;
  proExpiry?: number | null;
  trialStartedAt?: number | null;
  trialEndsAt?: number | null;
  usedCodes: string[];
  totalLogins: number;
  usagePct?: number;
  machineId?: string | null;
  machineIdLockedAt?: number | null;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'neurion-salt-2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function isAdminAccount(email: string, user: Partial<FirestoreUser>) {
  return user.isAdmin === true || user.is_admin === true || user.plan === 'LIFETIME' || user.plan === 'MODERATOR';
}

function normalizeUser(email: string, user: FirestoreUser): FirestoreUser {
  const plan = normalizePlan(user.plan);
  return {
    ...user,
    email,
    plan,
    isAdmin: isAdminAccount(email, { ...user, plan }),
  };
}

export async function loginUser(email: string, password: string): Promise<{
  success: boolean;
  message: string;
  user?: FirestoreUser;
}> {
  try {
    const emailKey = normalizeEmail(email);
    const docRef = doc(db, 'users', emailKey);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, message: 'Email não cadastrado.' };
    }

    let userData = normalizeUser(emailKey, docSnap.data() as FirestoreUser);

    if (userData.isBanned) {
      return {
        success: false,
        message: `Acesso bloqueado. ${userData.banReason ? `Motivo: ${userData.banReason}` : 'Entre em contato com o suporte.'}`
      };
    }

    const hash = await hashPassword(password);
    if (hash !== userData.passwordHash) {
      return { success: false, message: 'Senha incorreta.' };
    }

    const now = Date.now();
    const updates: Record<string, any> = {
      lastLogin: serverTimestamp(),
      lastLoginAt: now,
      lastLoginIp: null,
      totalLogins: (userData.totalLogins || 0) + 1,
      plan: userData.plan,
      isAdmin: userData.isAdmin || false,
      machineId: null,
      machineIdLockedAt: null,
    };

    if (userData.plan === 'PRO' && userData.proExpiry && userData.proExpiry < now) {
      userData = { ...userData, plan: 'FREE', proExpiry: null };
      updates.plan = 'FREE';
      updates.proExpiry = null;
    }

    if (userData.plan === 'TRIAL' && userData.trialEndsAt && userData.trialEndsAt < now) {
      userData = { ...userData, plan: 'FREE' };
      updates.plan = 'FREE';
    }

    await updateDoc(docRef, updates);

    return { success: true, message: 'Login realizado.', user: userData };
  } catch (err: any) {
    console.error('loginUser error:', err);
    return { success: false, message: 'Erro de conexão. Verifique sua internet.' };
  }
}

export async function registerUser(email: string, password: string): Promise<{
  success: boolean;
  message: string;
  user?: FirestoreUser;
}> {
  try {
    const emailKey = normalizeEmail(email);
    const docRef = doc(db, 'users', emailKey);
    const existing = await getDoc(docRef);

    if (existing.exists()) {
      return { success: false, message: 'Este email já está cadastrado.' };
    }

    const now = Date.now();
    const hash = await hashPassword(password);
    const newUser: FirestoreUser = {
      email: emailKey,
      passwordHash: hash,
      plan: 'FREE',
      isAdmin: false,
      isBanned: false,
      createdAt: null,
      lastLogin: null,
      lastLoginAt: now,
      lastLoginIp: null,
      proExpiry: null,
      trialStartedAt: null,
      trialEndsAt: null,
      usedCodes: [],
      totalLogins: 0,
      machineId: null,
      machineIdLockedAt: null,
    };

    await setDoc(docRef, {
      ...newUser,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });

    return { success: true, message: 'Conta criada com sucesso. Plano FREE ativado.', user: newUser };
  } catch (err: any) {
    console.error('registerUser error:', err);
    return { success: false, message: 'Erro ao criar conta. Verifique sua internet.' };
  }
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const emailKey = normalizeEmail(email);
    if (!emailKey) return { success: false, message: 'Informe o email da conta.' };

    const userSnap = await getDoc(doc(db, 'users', emailKey));
    if (!userSnap.exists()) {
      return { success: false, message: 'Email não cadastrado.' };
    }

    await setDoc(doc(db, 'password_resets', emailKey), {
      email: emailKey,
      requestedAt: serverTimestamp(),
      status: 'OPEN',
    });

    return { success: true, message: 'Solicitação enviada. O suporte poderá redefinir sua senha.' };
  } catch {
    return { success: false, message: 'Não foi possível solicitar redefinição agora.' };
  }
}

export async function getAllUsers(): Promise<FirestoreUser[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => normalizeUser(d.id, d.data() as FirestoreUser));
  } catch (err) {
    console.error('getAllUsers error:', err);
    return [];
  }
}

export async function banUser(email: string, reason?: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'users', normalizeEmail(email)), {
      isBanned: true,
      banReason: reason || 'Acesso revogado pelo administrador.',
    });
    return true;
  } catch { return false; }
}

export async function unbanUser(email: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'users', normalizeEmail(email)), {
      isBanned: false,
      banReason: null,
    });
    return true;
  } catch { return false; }
}

export async function changeUserPlan(
  email: string,
  plan: PlanType,
  proExpiry?: number | null
): Promise<boolean> {
  try {
    const normalizedPlan = normalizePlan(plan);
    const now = Date.now();
    const trialFields = normalizedPlan === 'TRIAL'
       ? { trialStartedAt: now, trialEndsAt: now + 7 * 86400000 }
      : {};

    await updateDoc(doc(db, 'users', normalizeEmail(email)), {
      plan: normalizedPlan,
      proExpiry: proExpiry ?? null,
      machineId: null,
      machineIdLockedAt: null,
      ...trialFields,
    });
    return true;
  } catch { return false; }
}

export async function resetMachineId(email: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'users', normalizeEmail(email)), {
      machineId: null,
      machineIdLockedAt: null,
    });
    return true;
  } catch { return false; }
}

export async function deleteUser(email: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'users', normalizeEmail(email)));
    return true;
  } catch { return false; }
}
