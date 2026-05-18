import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Check,
  Crown,
  Loader2,
  RefreshCcw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  Users,
  Zap,
} from 'lucide-react';
import { banUser, changeUserPlan, deleteUser, FirestoreUser, getAllUsers, unbanUser } from '../utils/firebase';
import { PlanType } from '../types';
import { getPlanConfig, PLAN_CONFIGS } from '../utils/plans';
import { getUsageStatus } from '../utils/usage';

interface AdminPanelProps {
  currentUserEmail: string;
}

const MANAGED_PLANS: PlanType[] = ['FREE', 'STARTER', 'TRIAL', 'PRO', 'AGENCY', 'LIFETIME', 'MODERATOR'];

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUserEmail }) => {
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ type: 'ban' | 'delete' | ''; user: FirestoreUser | null }>({ type: '', user: null });
  const [banReason, setBanReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const allUsers = await getAllUsers();
    setUsers(allUsers.sort((a, b) => (b.totalLogins || 0) - (a.totalLogins || 0)));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = users.filter((user) => user.email.toLowerCase().includes(search.toLowerCase()));
  const paidPlans = new Set<PlanType>(['STARTER', 'TRIAL', 'PRO', 'AGENCY', 'LIFETIME', 'MODERATOR']);

  const stats = {
    total: users.length,
    paid: users.filter((user) => paidPlans.has(user.plan)).length,
    trial: users.filter((user) => user.plan === 'TRIAL').length,
    banned: users.filter((user) => user.isBanned).length,
  };

  const handleBan = async () => {
    if (!modal.user) return;
    setActionLoading(true);
    const ok = await banUser(modal.user.email, banReason);
    if (ok) {
      showToast(`${modal.user.email} desativado.`);
      await loadUsers();
    }
    setModal({ type: '', user: null });
    setBanReason('');
    setActionLoading(false);
  };

  const handleUnban = async (user: FirestoreUser) => {
    setActionLoading(true);
    const ok = await unbanUser(user.email);
    if (ok) {
      showToast(`${user.email} ativado.`);
      await loadUsers();
    }
    setActionLoading(false);
  };

  const handlePlan = async (user: FirestoreUser, plan: PlanType) => {
    setActionLoading(true);
    const expiry = plan === 'PRO' ? Date.now() + 30 * 86400000 : null;
    const ok = await changeUserPlan(user.email, plan, expiry);
    if (ok) {
      showToast(`Plano de ${user.email} alterado para ${plan}.`);
      await loadUsers();
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!modal.user) return;
    setActionLoading(true);
    const ok = await deleteUser(modal.user.email);
    if (ok) {
      showToast(`${modal.user.email} removido.`);
      await loadUsers();
    }
    setModal({ type: '', user: null });
    setActionLoading(false);
  };

  const formatDate = (value: any) => {
    if (!value) return '-';
    const date = value.toDate ? value.toDate() : new Date(value);
    return date.toLocaleDateString('pt-BR');
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px',
    padding: '16px',
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#f1f5f9' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: '10px',
          padding: '12px 18px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#34d399',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <Check size={14} style={{ display: 'inline', marginRight: 6 }} />
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(244,63,94,0.12)',
            border: '1px solid rgba(244,63,94,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Shield size={18} color="#fb7185" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Painel Admin</h2>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.36)', margin: 0 }}>
              Controle de usuários, planos, trial e uso percentual
            </p>
          </div>
        </div>
        <button onClick={loadUsers} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          color: 'rgba(255,255,255,0.66)',
          cursor: 'pointer',
          fontSize: '12px',
        }}>
          <RefreshCcw size={13} /> Atualizar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Usuários', value: stats.total, icon: <Users size={16} />, color: '#818cf8' },
          { label: 'Pagos/Trial', value: stats.paid, icon: <Crown size={16} />, color: '#fbbf24' },
          { label: 'Trial limitado', value: stats.trial, icon: <Zap size={16} />, color: PLAN_CONFIGS.TRIAL.color },
          { label: 'Desativados', value: stats.banned, icon: <Ban size={16} />, color: '#f43f5e' },
        ].map((stat) => (
          <div key={stat.label} style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ color: stat.color, marginBottom: '6px' }}>{stat.icon}</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.42)', marginTop: '2px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '10px' }}>
          {(['FREE', 'STARTER', 'PRO', 'AGENCY', 'TRIAL'] as PlanType[]).map((plan) => {
            const config = PLAN_CONFIGS[plan];
            return (
              <div key={plan} style={{
                border: `1px solid ${config.color}55`,
                background: `${config.color}14`,
                borderRadius: '10px',
                padding: '10px',
              }}>
                <div style={{ fontSize: '11px', color: config.color, fontWeight: 800 }}>{config.name}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.42)', marginTop: '4px' }}>
                  {config.accessPct}% | {config.textLimit} textos | {config.imageLimit} imagens | {config.voiceLimit}min voz
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por email..."
          style={{
            width: '100%',
            padding: '10px 12px 10px 36px',
            boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '9px',
            color: '#f1f5f9',
            fontSize: '13px',
            outline: 'none',
          }}
        />
      </div>

      <div style={cardStyle}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
            <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', marginBottom: 8 }} /><br />
            Carregando usuários...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
            Nenhum usuário encontrado.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Email', 'Plano', 'Uso', 'Status', 'Trial', 'Cadastro', 'Último login', 'Logins', 'Ações'].map((heading) => (
                    <th key={heading} style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.35)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const config = getPlanConfig(user.plan);
                  const usagePct = user.usagePct ?? getUsageStatus(user.email, user.plan).maxPct;
                  return (
                    <tr key={user.email} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: user.isBanned ? 0.5 : 1 }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: '12px' }}>
                        {user.email}
                        {user.email === currentUserEmail && <span style={{ marginLeft: 6, fontSize: '9px', color: '#818cf8', fontWeight: 800 }}>VOCÊ</span>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '5px',
                          fontSize: '10px',
                          fontWeight: 800,
                          background: `${config.color}22`,
                          border: `1px solid ${config.color}55`,
                          color: config.color,
                        }}>
                          {config.name}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', minWidth: '110px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, usagePct)}%`, height: '100%', background: config.color }} />
                          </div>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', width: '32px' }}>{usagePct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '11px', color: user.isBanned ? '#f43f5e' : '#34d399', fontWeight: 700 }}>
                          {user.isBanned ? 'Inativo' : 'Ativo'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
                        {user.trialEndsAt ? formatDate(user.trialEndsAt) : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{formatDate(user.createdAt)}</td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{formatDate(user.lastLogin)}</td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{user.totalLogins || 0}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {user.isBanned ? (
                            <button onClick={() => handleUnban(user)} title="Ativar" style={{ padding: '4px 8px', borderRadius: '5px', border: 'none', cursor: 'pointer', background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                              <UserCheck size={11} />
                            </button>
                          ) : (
                            <button onClick={() => { setModal({ type: 'ban', user }); setBanReason(''); }} title="Desativar" style={{ padding: '4px 8px', borderRadius: '5px', border: 'none', cursor: 'pointer', background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>
                              <UserX size={11} />
                            </button>
                          )}
                          {MANAGED_PLANS.filter((plan) => plan !== user.plan).slice(0, 5).map((plan) => (
                            <button key={plan} onClick={() => handlePlan(user, plan)} style={{
                              padding: '4px 8px',
                              fontSize: '9px',
                              fontWeight: 800,
                              borderRadius: '5px',
                              border: 'none',
                              cursor: 'pointer',
                              background: `${getPlanConfig(plan).color}22`,
                              color: getPlanConfig(plan).color,
                            }}>
                              {plan === 'LIFETIME' ? 'VIP' : plan}
                            </button>
                          ))}
                          <button onClick={() => setModal({ type: 'delete', user })} title="Excluir" style={{ padding: '4px 8px', borderRadius: '5px', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.type === 'ban' && modal.user && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#0c0f1d', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Ban size={20} color="#f43f5e" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Desativar usuário</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>{modal.user.email}</p>
            <input
              value={banReason}
              onChange={(event) => setBanReason(event.target.value)}
              placeholder="Motivo (opcional)"
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9', fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setModal({ type: '', user: null })} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
              <button onClick={handleBan} disabled={actionLoading} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#f43f5e', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '13px' }}>
                {actionLoading ? 'Salvando...' : 'Desativar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.type === 'delete' && modal.user && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#0c0f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '360px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <AlertTriangle size={20} color="#fbbf24" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Excluir usuário?</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>
              Esta ação não pode ser desfeita. O email <strong style={{ color: '#f1f5f9' }}>{modal.user.email}</strong> será removido do Firebase.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setModal({ type: '', user: null })} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
              <button onClick={handleDelete} disabled={actionLoading} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(244,63,94,0.8)', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '13px' }}>
                {actionLoading ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
