'use client';

import { useRouter } from 'next/router';
import { useEffect, useState, useMemo, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserData {
  company: string;
  createdAt: string;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  phone: string;
  sessionExpiry: string;
  stripeId: string;
  updatedAt: string;
  zipCodes: string[];
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  streetAddress: string;
  city: string;
  zipCode: string;
  createdAt: string;
  status: string;
  revenue: number | null;
}

interface LeadsApiResponse {
  contractorName: string;
  pricePerLead: number;
  totalLeads: number;
  moneySpent: number;
  connectedJobs: number;
  totalRevenue: number;
  leads: Lead[];
}

type StatusOverrides = Record<string, string>;

/* ------------------------------------------------------------------ */
/*  Status config                                                      */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  NEW_LEAD:       { label: 'NEW LEAD',       color: '#4338ca', bg: '#eef2ff', border: '#a5b4fc' },
  APPT_SCHEDULED: { label: 'APPT SCHEDULED', color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
  APPT_COMPLETED: { label: 'APPT COMPLETED', color: '#7e22ce', bg: '#faf5ff', border: '#c4b5fd' },
  NOT_SOLD:       { label: 'NOT SOLD',       color: '#c2410c', bg: '#fff7ed', border: '#fdba74' },
  SOLD:           { label: 'SOLD',           color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
  DEAD:           { label: 'DEAD',           color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
};

const STATUS_KEYS = Object.keys(STATUS_OPTIONS);
const DEFAULT_BADGE = { label: 'UNKNOWN', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

/* ------------------------------------------------------------------ */
/*  Date-range presets                                                 */
/* ------------------------------------------------------------------ */

type PresetKey = 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'ytd' | 'all';

function computePreset(key: PresetKey): { from: string; to: string } {
  const now = new Date();
  const to = toDateInputValue(now);
  switch (key) {
    case 'today':
      return { from: to, to };
    case '7d': {
      const d = new Date(); d.setDate(d.getDate() - 7);
      return { from: toDateInputValue(d), to };
    }
    case '30d': {
      const d = new Date(); d.setDate(d.getDate() - 30);
      return { from: toDateInputValue(d), to };
    }
    case 'this_month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toDateInputValue(d), to };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toDateInputValue(start), to: toDateInputValue(end) };
    }
    case 'ytd': {
      const d = new Date(now.getFullYear(), 0, 1);
      return { from: toDateInputValue(d), to };
    }
    case 'all':
      return { from: '2020-01-01', to };
    default:
      return defaultRange();
  }
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'ytd', label: 'Year to Date' },
  { key: 'all', label: 'All Time' },
];

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: '28px 32px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 20px 0',
};

const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#475569',
  marginBottom: 6, marginTop: 16,
};

const inputSt: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid #e2e8f0', fontSize: 14, color: '#334155',
  outline: 'none', transition: 'border-color 0.15s', background: '#fff',
};

const primaryBtn: React.CSSProperties = {
  padding: '10px 24px', borderRadius: 8, border: 'none',
  background: '#4338ca', color: '#fff', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', transition: 'background 0.15s', marginTop: 20,
};

const dangerBtn: React.CSSProperties = { ...primaryBtn, background: '#dc2626' };

const secondaryBtn: React.CSSProperties = { ...primaryBtn, background: '#64748b' };

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_OPTIONS[status] || DEFAULT_BADGE;
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: 6,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  );
}

function RevenuePromptModal({ leadId, defaultRevenue, onConfirm, onCancel }: {
  leadId: string; defaultRevenue: number;
  onConfirm: (leadId: string, revenue: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(String(defaultRevenue));
  const handleSubmit = () => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) onConfirm(leadId, num);
  };
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.4)', display: 'flex',
      justifyContent: 'center', alignItems: 'center',
    }} onClick={onCancel}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: '28px 32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', minWidth: 340,
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Mark as Sold</h3>
        <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px 0' }}>Enter the revenue for this job before confirming.</p>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Revenue ($)</label>
        <input
          autoFocus type="number" min="0" step="1" value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel(); }}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8,
            border: '1px solid #e2e8f0', fontSize: 16, fontWeight: 700,
            color: '#0f172a', outline: 'none',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#15803d')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={handleSubmit} style={{
            ...primaryBtn, marginTop: 0, background: '#15803d', flex: 1,
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#166534')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#15803d')}>Confirm Sold</button>
          <button onClick={onCancel} style={{ ...secondaryBtn, marginTop: 0, flex: 1 }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function StatusDropdown({ currentStatus, onUpdate, onClose, anchorRect }: {
  currentStatus: string; onUpdate: (s: string) => void; onClose: () => void;
  anchorRect: DOMRect;
}) {
  const dropdownHeight = STATUS_KEYS.length * 42 + 12;
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const openUp = spaceBelow < dropdownHeight && anchorRect.top > dropdownHeight;

  const posStyle: React.CSSProperties = {
    position: 'fixed',
    left: anchorRect.left,
    ...(openUp
      ? { bottom: window.innerHeight - anchorRect.top + 4 }
      : { top: anchorRect.bottom + 4 }),
    zIndex: 9999,
  };

  return (
    <div style={{
      ...posStyle,
      background: '#fff', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
      border: '1px solid #e2e8f0', minWidth: 200, padding: '6px 0',
    }}>
      {STATUS_KEYS.map((s) => (
        <button key={s} onClick={() => { onUpdate(s); onClose(); }} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '10px 14px', border: 'none',
          background: s === currentStatus ? '#f1f5f9' : 'transparent',
          cursor: 'pointer', fontSize: 13, textAlign: 'left',
        }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
          onMouseLeave={(e) => (e.currentTarget.style.background = s === currentStatus ? '#f1f5f9' : 'transparent')}>
          <StatusBadge status={s} />
        </button>
      ))}
    </div>
  );
}

function KpiCard({ label, value, subtitle, accentColor }: {
  label: string; value: string; subtitle: string; accentColor: string;
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '24px 28px',
      borderLeft: `4px solid ${accentColor}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)', flex: 1, minWidth: 180,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: accentColor, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>{subtitle}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, color: '#0f172a', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function RevenueCell({ lead, onSave, defaultRevenue }: { lead: Lead; onSave: (id: string, rev: number) => void; defaultRevenue: number }) {
  const rev = lead.revenue ?? defaultRevenue;
  const isSold = lead.status === 'SOLD';
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(rev));

  if (!editing) {
    return (
      <button
        onClick={() => { if (isSold) { setValue(String(rev)); setEditing(true); } }}
        title={isSold ? 'Click to edit revenue' : 'Mark as Sold to set revenue'}
        style={{
          background: 'none', border: 'none', fontWeight: 700,
          color: isSold ? '#0f172a' : '#94a3b8', fontSize: 14, padding: 0,
          cursor: isSold ? 'pointer' : 'default',
          borderBottom: isSold ? '1px dashed #94a3b8' : 'none',
        }}
      >
        {fmt(rev)}
      </button>
    );
  }

  const save = () => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) { onSave(lead.id, num); }
    setEditing(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>$</span>
      <input
        autoFocus
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        onBlur={save}
        style={{
          width: 80, padding: '4px 8px', borderRadius: 6,
          border: '1px solid #4338ca', fontSize: 14, fontWeight: 700,
          color: '#0f172a', outline: 'none', background: '#fff',
        }}
      />
    </div>
  );
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  if (!message) return null;
  const isSuccess = type === 'success';
  return (
    <div style={{
      padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginTop: 12,
      background: isSuccess ? '#f0fdf4' : '#fef2f2',
      border: `1px solid ${isSuccess ? '#86efac' : '#fca5a5'}`,
      color: isSuccess ? '#166534' : '#991b1b',
    }}>{message}</div>
  );
}

function ConfirmPrompt({ prompt, onConfirm, onCancel, danger = false }: {
  prompt: string; onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  return (
    <div style={{ padding: '16px 0' }}>
      <p style={{ fontSize: 14, color: '#475569', marginBottom: 12, marginTop: 0 }}>{prompt}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onConfirm} style={{ ...(danger ? dangerBtn : primaryBtn), marginTop: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>Yes</button>
        <button onClick={onCancel} style={{ ...secondaryBtn, marginTop: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>No</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sales Pipeline                                                     */
/* ------------------------------------------------------------------ */

function SalesPipeline({ leads }: { leads: Lead[] }) {
  const total = leads.length || 1;
  const counts: Record<string, number> = {};
  for (const k of STATUS_KEYS) counts[k] = 0;
  for (const l of leads) {
    if (counts[l.status] !== undefined) counts[l.status]++;
    else counts[l.status] = (counts[l.status] || 0) + 1;
  }

  return (
    <div style={{ ...cardStyle, marginBottom: 24 }}>
      <h2 style={{ ...sectionTitle, marginBottom: 16 }}>Sales Pipeline</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {STATUS_KEYS.map((key) => {
          const cfg = STATUS_OPTIONS[key];
          const count = counts[key] || 0;
          const pct = (count / total) * 100;
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 130, fontSize: 12, fontWeight: 700, color: cfg.color, letterSpacing: '0.03em', flexShrink: 0 }}>
                {cfg.label}
              </div>
              <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, height: 24, position: 'relative', overflow: 'hidden' }}>
                {count > 0 && (
                  <div style={{
                    height: '100%', borderRadius: 6,
                    background: cfg.color, opacity: 0.7,
                    width: `${Math.max(pct, 2)}%`,
                    display: 'flex', alignItems: 'center', paddingLeft: 8,
                    transition: 'width 0.3s ease',
                  }}>
                    {pct >= 8 && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{Math.round(pct)}%</span>
                    )}
                  </div>
                )}
              </div>
              <div style={{ width: 28, textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#334155', flexShrink: 0 }}>
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline BillingManagement                                           */
/* ------------------------------------------------------------------ */

function BillingManagement({ email }: { email: string }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [customerID, setCustomerId] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  async function handleUpdateBilling() {
    const req = await fetch(`/api/user/email/${email}`, { method: 'GET' });
    if (!req.ok) return;
    const res = await req.json();
    const customerId = res.stripeId;
    setCustomerId(customerId as string);
    await fetch('/api/stripe/detach-payment-method', { method: 'POST', body: JSON.stringify({ customerId }) });
    const req3 = await fetch('/api/stripe/create-update-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId }),
    });
    if (req3.status === 200) {
      const data = await req3.json();
      window.location.href = data.url as string;
    }
    setIsUpdating(false);
  }

  async function handleCancelBilling() {
    await fetch('/api/stripe/delete-user', { method: 'DELETE', body: JSON.stringify({ customerId: customerID }) });
    const del = await fetch(`/api/user/email/${email}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (del.ok) {
      setTimeout(() => { window.location.href = `${process.env.NEXT_PUBLIC_SERVER_URL}/`; }, 2000);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {!isUpdating && !isCancelling && (
        <>
          <button onClick={() => setIsUpdating(true)} style={primaryBtn}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#3730a3')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#4338ca')}>Update Billing</button>
          <button onClick={() => setIsCancelling(true)} style={dangerBtn}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}>Delete Account</button>
        </>
      )}
      {isUpdating && (
        <ConfirmPrompt prompt="Are you sure you want to update your billing?" onConfirm={handleUpdateBilling} onCancel={() => setIsUpdating(false)} danger />
      )}
      {isCancelling && (
        <ConfirmPrompt prompt="Are you sure you want to delete your account? This cannot be undone." onConfirm={handleCancelBilling} onCancel={() => setIsCancelling(false)} danger />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline HowToKey                                                    */
/* ------------------------------------------------------------------ */

function HowToKey() {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, maxWidth: 480, margin: '0 0 16px 0' }}>
        Watch this short tutorial on how to get your HubSpot API key. After
        creating your app, click <strong style={{ color: '#334155' }}>show token</strong>, then copy
        and paste the full value into the field below.
      </p>
      <video src="/howto.mp4" controls style={{ borderRadius: 8, maxWidth: 360, border: '1px solid #e2e8f0' }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard                                                     */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<UserData>({} as UserData);
  const [showAllZips, setShowAllZips] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [pricePerLead, setPricePerLead] = useState(0);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const { from: defaultFrom, to: defaultTo } = useMemo(defaultRange, []);
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [activeFrom, setActiveFrom] = useState(defaultFrom);
  const [activeTo, setActiveTo] = useState(defaultTo);
  const [activePreset, setActivePreset] = useState<PresetKey>('30d');

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const [zipToast, setZipToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [delZipToast, setDelZipToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [revenuePromptLeadId, setRevenuePromptLeadId] = useState<string | null>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /* ---- Ephemeral status overrides ---- */
  const [statusOverrides, setStatusOverrides] = useState<StatusOverrides>({});

  /* ---- Fetch status overrides from DB ---- */
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const r = await fetch(`/api/user/leads/status-override?contractorId=${user.id}`);
        const data = await r.json();
        console.log('Loaded overrides:', data);
        if (r.ok) setStatusOverrides(data);
      } catch (e) { console.error(e); }
    })();
  }, [user?.id]);

  /** Merge API leads with localStorage status overrides */
  const mergedLeads = useMemo(() => {
    return leads.map((l) => {
      const override = statusOverrides[l.id];
      if (override) {
        return { ...l, status: override };
      }
      // Default to NEW_LEAD if the HubSpot status doesn't match our enum
      if (!STATUS_OPTIONS[l.status]) {
        return { ...l, status: 'NEW_LEAD' };
      }
      return l;
    });
  }, [leads, statusOverrides]);

  const filteredLeads = useMemo(() => {
    if (!statusFilter) return mergedLeads;
    return mergedLeads.filter((l) => l.status === statusFilter);
  }, [mergedLeads, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / rowsPerPage));
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredLeads.slice(start, start + rowsPerPage);
  }, [filteredLeads, currentPage, rowsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [statusFilter, activeFrom, activeTo, rowsPerPage]);

  /* ---- Auth ---- */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/user/whoami/whoami');
        if (!r.ok) { router.push('/'); return; }
        setUser(await r.json());
      } catch { router.push('/'); }
      finally { setLoaded(true); }
    })();
  }, []);

  /* ---- Fetch leads ---- */
  const fetchLeads = useCallback(async (start: string, end: string) => {
    if (!user?.id) return;
    setLeadsLoading(true); setLeadsError(null);
    try {
      const p = new URLSearchParams();
      if (start) p.set('startDate', start);
      if (end) p.set('endDate', end);
      const r = await fetch(`/api/user/leads/${user.id}?${p.toString()}`);
      if (!r.ok) throw new Error(`${r.status}`);
      const d: LeadsApiResponse = await r.json();
      setLeads(d.leads); setPricePerLead(d.pricePerLead);
    } catch (e) { console.error(e); setLeadsError('Failed to load leads.'); }
    finally { setLeadsLoading(false); }
  }, [user?.id]);

  useEffect(() => { if (user?.id) fetchLeads(activeFrom, activeTo); }, [user?.id, activeFrom, activeTo, fetchLeads]);

  /* ---- KPIs (computed from merged leads) ---- */
  const defaultRevenue = 0;
  const adSpend = mergedLeads.length * pricePerLead;
  const soldLeads = mergedLeads.filter((l) => l.status === 'SOLD');
  const totalRevenue = soldLeads.reduce((s, l) => s + (l.revenue ?? defaultRevenue), 0);
  const roi = adSpend > 0 ? (totalRevenue / adSpend).toFixed(1) : '0.0';

  /* ---- Preset handler ---- */
  const handlePreset = (key: PresetKey) => {
    setActivePreset(key);
    const { from, to } = computePreset(key);
    setFromDate(from); setToDate(to);
    setActiveFrom(from); setActiveTo(to);
  };

  const handleFilter = () => { setActivePreset(null as any); setActiveFrom(fromDate); setActiveTo(toDate); };

  /* ---- Status update (persisted via DB) ---- */
  const updateStatus = useCallback(async (leadId: string, newStatus: string) => {
    if (newStatus === 'SOLD') {
      setRevenuePromptLeadId(leadId);
      return;
    }
    setStatusOverrides((prev) => ({ ...prev, [leadId]: newStatus }));
    try {
      const r = await fetch('/api/user/leads/status-override', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: leadId,
          contractorId: user.id,
          status: newStatus,
        }),
      });
      console.log('PUT status:', r.status, await r.json());
    } catch (e) { console.error('PUT failed:', e); }
  }, [user?.id]);

  const confirmSoldWithRevenue = useCallback(async (leadId: string, revenue: number) => {
    setStatusOverrides((prev) => ({ ...prev, [leadId]: 'SOLD' }));
    setLeads((p) => p.map((l) => l.id === leadId ? { ...l, revenue } : l));
    setRevenuePromptLeadId(null);
    try {
      await Promise.all([
        fetch('/api/user/leads/status-override', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactId: leadId, contractorId: user.id, status: 'SOLD' }),
        }),
        fetch('/api/user/leads/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactId: leadId, revenue }),
        }),
      ]);
    } catch (e) { console.error(e); }
  }, [user?.id]);

  /* ---- Revenue update (still persisted via API) ---- */
  const updateRevenue = useCallback(async (leadId: string, newRevenue: number) => {
    setLeads((p) => p.map((l) => l.id === leadId ? { ...l, revenue: newRevenue } : l));
    try {
      await fetch('/api/user/leads/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contactId: leadId, revenue: newRevenue }) });
    } catch (e) { console.error(e); }
  }, []);

  /* ---- Toast helper ---- */
  const toast = (setter: (v: any) => void, msg: string, type: 'success' | 'error') => {
    setter({ msg, type }); setTimeout(() => setter(null), 4000);
  };

  /* ---- Account handlers ---- */
  const updateInfomation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget); e.currentTarget.reset();
    const d = Object.fromEntries(fd.entries());
    try {
      const r = await fetch(`/api/user/email/${user.email}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: d.first, lastName: d.last, email: d.email, password: d.password }) });
      if (!r.ok) { router.push('/'); return; }
      setUser(await r.json());
    } catch (err) { console.error(err); }
  };

  const submitHubspotKey = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget); e.currentTarget.reset();
    const d = Object.fromEntries(fd.entries());
    try {
      const r = await fetch(`/api/user/email/${user.email}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hubspotKey: d.hubspotKey, password: d.password }) });
      if (!r.ok) router.push('/');
    } catch (err) { console.error(err); }
  };

  const updateZipCodes = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget); e.currentTarget.reset();
    const d = Object.fromEntries(fd.entries());
    const zips: string[] = [];
    try {
      const r = await fetch(`/api/user/email/${user.email}`, { method: 'GET' });
      if (!r.ok) return;
      zips.push(...(await r.json()).zipCodes);
    } catch { return; }

    const newZips = (d.zipCodes as string).split(',').map((z) => z.trim());
    const pat = /^\d{5}(-\d{4})?$/;
    let bad = false;
    for (const z of newZips) {
      if (zips.includes(z)) { toast(setZipToast, 'Duplicate zip code.', 'error'); bad = true; break; }
      if (!pat.test(z)) { toast(setZipToast, 'Invalid zip code format.', 'error'); bad = true; break; }
      zips.push(z);
    }
    if (!bad) {
      try {
        const r = await fetch(`/api/user/email/${user.email}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zipCodes: zips, password: d.password }) });
        if (r.ok) { toast(setZipToast, 'Zip codes updated!', 'success'); setUser(await r.json()); }
      } catch (err) { console.error(err); }
    }
  };

  const deleteZipCodes = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget); e.currentTarget.reset();
    const d = Object.fromEntries(fd.entries());
    const toDel = (d.zipCodes as string).split(',').map((z) => z.trim());
    const filtered = user.zipCodes.filter((z) => !toDel.includes(z));
    const r = await fetch(`/api/user/email/${user.email}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zipCodes: filtered, password: d.password }) });
    if (r.status === 200) { toast(setDelZipToast, 'Zip codes deleted!', 'success'); setUser({ ...user, zipCodes: filtered }); }
    else { toast(setDelZipToast, 'Error deleting zip codes.', 'error'); }
  };

  /* ---- Loading gate ---- */
  if (!loaded) return (
    <div style={{ minHeight: '100vh', background: '#f4f6fa', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#4338ca', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  const presetBtnBase: React.CSSProperties = {
    padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s', border: '1px solid #e2e8f0',
    background: '#fff', color: '#475569',
  };
  const presetBtnActive: React.CSSProperties = {
    ...presetBtnBase, background: '#4338ca', color: '#fff', borderColor: '#4338ca',
  };

  const statusPillBase: React.CSSProperties = {
    padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s', border: '1px solid #e2e8f0',
    background: '#fff', color: '#64748b',
  };

  return (
    <div className='mt-[90px]' style={{ minHeight: '100vh', background: '#f4f6fa' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
        input[type="date"]::-webkit-calendar-picker-indicator:hover { opacity: 1; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 1800, margin: '0 auto', padding: '0 32px' }}>
        <div className='py-12 text-blk'>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px 0' }}>Welcome, {user.firstName} {user.lastName}</h1>
        </div>

        {/* ======== DATE FILTER — Preset buttons + From/To ======== */}
        <div style={{ ...cardStyle, marginBottom: 24, padding: '20px 28px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => handlePreset(p.key)}
                style={activePreset === p.key ? presetBtnActive : presetBtnBase}
                onMouseEnter={(e) => { if (activePreset !== p.key) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={(e) => { if (activePreset !== p.key) e.currentTarget.style.background = '#fff'; }}
              >{p.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>From:</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ ...inputSt, width: 'auto' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>To:</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ ...inputSt, width: 'auto' }} />
            </div>
            <button onClick={handleFilter} style={{ ...primaryBtn, marginTop: 0, padding: '8px 20px' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#3730a3')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#4338ca')}>Filter</button>
          </div>
        </div>

        {/* ======== KPI CARDS ======== */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
          <KpiCard label="Total Leads" value={String(mergedLeads.length)} subtitle={`${fmt(pricePerLead)}/lead`} accentColor="#4338ca" />
          <KpiCard label="Ad Spend" value={fmt(adSpend)} subtitle={`${mergedLeads.length} leads`} accentColor="#ef4444" />
          <KpiCard label="Revenue" value={fmt(totalRevenue)} subtitle={`${soldLeads.length} sold lead${soldLeads.length !== 1 ? 's' : ''}`} accentColor="#22c55e" />
          <KpiCard label="ROI" value={`${roi}x`} subtitle="Revenue ÷ Spend" accentColor="#3b82f6" />
        </div>

        {/* ======== SALES PIPELINE ======== */}
        <SalesPipeline leads={mergedLeads} />

        {/* ======== STATUS FILTER PILLS ======== */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginRight: 4 }}>Status:</span>
          <button
            onClick={() => setStatusFilter(null)}
            style={statusFilter === null ? { ...statusPillBase, background: '#4338ca', color: '#fff', borderColor: '#4338ca' } : statusPillBase}
          >All</button>
          {STATUS_KEYS.map((key) => {
            const cfg = STATUS_OPTIONS[key];
            const isActive = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(isActive ? null : key)}
                style={isActive ? { ...statusPillBase, background: cfg.bg, color: cfg.color, borderColor: cfg.border } : statusPillBase}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = '#fff'; }}
              >{cfg.label}</button>
            );
          })}
        </div>

        {/* ======== LEADS TABLE ======== */}
        <div style={{ ...cardStyle, marginBottom: 32, padding: 0 }}>
          <div style={{ padding: '24px 28px 16px' }}>
            <h2 style={{ ...sectionTitle, marginBottom: 0 }}>Leads</h2>
          </div>
          {leadsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTopColor: '#4338ca', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : leadsError ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#ef4444' }}>{leadsError}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    {['Date', 'Name', 'Phone', 'Email', 'Address', 'Status', 'Revenue'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeads.map((lead) => (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fafbfd')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: 16, color: '#334155', whiteSpace: 'nowrap' }}>{lead.createdAt ? new Date(lead.createdAt).toISOString().split('T')[0] : '—'}</td>
                      <td style={{ padding: 16, color: '#0f172a', fontWeight: 600 }}>{lead.firstName} {lead.lastName}</td>
                      <td style={{ padding: 16, color: '#334155', whiteSpace: 'nowrap' }}>{lead.phone}</td>
                      <td style={{ padding: 16, color: '#334155' }}>{lead.email}</td>
                      <td style={{ padding: 16, color: '#334155' }}>{[lead.streetAddress, lead.city, lead.zipCode].filter(Boolean).join(', ')}</td>
                      <td style={{ padding: 16 }}>
                        <button
                          onClick={(e) => {
                            if (openDropdown === lead.id) {
                              setOpenDropdown(null);
                              setDropdownRect(null);
                            } else {
                              setDropdownRect(e.currentTarget.getBoundingClientRect());
                              setOpenDropdown(lead.id);
                            }
                          }}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                          <StatusBadge status={lead.status} />
                        </button>
                        {openDropdown === lead.id && dropdownRect && (
                          <StatusDropdown currentStatus={lead.status} onUpdate={(s) => updateStatus(lead.id, s)} onClose={() => { setOpenDropdown(null); setDropdownRect(null); }} anchorRect={dropdownRect} />
                        )}
                      </td>
                      <td style={{ padding: 16 }}>
                        <RevenueCell lead={lead} onSave={updateRevenue} defaultRevenue={defaultRevenue} />
                      </td>
                    </tr>
                  ))}
                  {paginatedLeads.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 15 }}>No leads found for the selected filters.</td></tr>
                  )}
                </tbody>
              </table>
              {/* Pagination Controls */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 12, zIndex: 40,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
                  <span>Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    style={{
                      padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0',
                      fontSize: 13, color: '#334155', background: '#fff', cursor: 'pointer',
                    }}
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <span style={{ marginLeft: 8 }}>
                    {Math.min((currentPage - 1) * rowsPerPage + 1, filteredLeads.length)}–{Math.min(currentPage * rowsPerPage, filteredLeads.length)} of {filteredLeads.length}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0',
                      background: '#fff', cursor: currentPage === 1 ? 'default' : 'pointer',
                      color: currentPage === 1 ? '#cbd5e1' : '#334155', fontSize: 13, fontWeight: 600,
                    }}
                  >«</button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
                      background: '#fff', cursor: currentPage === 1 ? 'default' : 'pointer',
                      color: currentPage === 1 ? '#cbd5e1' : '#334155', fontSize: 13, fontWeight: 600,
                    }}
                  >{`<`}</button>
                  <span style={{ padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#334155' }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
                      background: '#fff', cursor: currentPage === totalPages ? 'default' : 'pointer',
                      color: currentPage === totalPages ? '#cbd5e1' : '#334155', fontSize: 13, fontWeight: 600,
                    }}
                  >{`>`}</button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0',
                      background: '#fff', cursor: currentPage === totalPages ? 'default' : 'pointer',
                      color: currentPage === totalPages ? '#cbd5e1' : '#334155', fontSize: 13, fontWeight: 600,
                    }}
                  >»</button>
                </div>
              </div>
            </div>
          )}
        </div>
        {openDropdown && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpenDropdown(null)} />}

        {revenuePromptLeadId && (
          <RevenuePromptModal
            leadId={revenuePromptLeadId}
            defaultRevenue={defaultRevenue}
            onConfirm={confirmSoldWithRevenue}
            onCancel={() => setRevenuePromptLeadId(null)}
          />
        )}

        {/* ======== ACCOUNT & SETTINGS ======== */}
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 20px 0' }}>Account &amp; Settings</h2>

        {/* Row 1: User Details + Account Info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
          <div style={cardStyle}>
            <h3 style={sectionTitle}>User Details</h3>
            <InfoRow label="Company" value={user.company || '—'} />
            <InfoRow label="Email" value={user.email || '—'} />
            <InfoRow label="Phone" value={user.phone || '—'} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Zip Codes</div>
              <div style={{ fontSize: 15, color: '#0f172a', fontWeight: 500, marginBottom: 8 }}>
                {showAllZips ? user.zipCodes?.join(', ') : (<>{user.zipCodes?.slice(0, 10).join(', ')}{user.zipCodes?.length > 10 && `, +${user.zipCodes.length - 10} more`}</>)}
              </div>
              <button onClick={() => setShowAllZips(!showAllZips)}
                style={{ ...primaryBtn, marginTop: 0, padding: '6px 16px', fontSize: 13 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#3730a3')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#4338ca')}>
                {showAllZips ? 'Show Less' : 'Show All'}
              </button>
            </div>
          </div>
          <div style={cardStyle}>
            <h3 style={sectionTitle}>Account Information</h3>
            <InfoRow label="Created" value={user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'} />
            <InfoRow label="Updated" value={user.updatedAt ? new Date(user.updatedAt).toLocaleString() : '—'} />
            <InfoRow label="Session Expiry" value={user.sessionExpiry ? new Date(user.sessionExpiry).toLocaleString() : '—'} />
          </div>
        </div>

        {/* Row 2: Add Zips + Delete Zips */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
          <div style={cardStyle}>
            <h3 style={sectionTitle}>Add Zip Codes</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>Submit zip codes as a comma-separated list.</p>
            <form onSubmit={updateZipCodes}>
              <label style={{ ...labelSt, marginTop: 0 }}>Zip Codes</label>
              <input type="text" name="zipCodes" placeholder="12345, 12346, 12347..." style={inputSt}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#4338ca')} onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')} />
              <label style={labelSt}>Password</label>
              <input type="password" name="password" required style={inputSt}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#4338ca')} onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')} />
              <button type="submit" style={primaryBtn}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#3730a3')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#4338ca')}>Add Zip Codes</button>
              {zipToast && <Toast message={zipToast.msg} type={zipToast.type} />}
            </form>
          </div>
          <div style={cardStyle}>
            <h3 style={sectionTitle}>Delete Zip Codes</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>Submit zip codes to remove as a comma-separated list.</p>
            <form onSubmit={deleteZipCodes}>
              <label style={{ ...labelSt, marginTop: 0 }}>Zip Codes</label>
              <input type="text" name="zipCodes" placeholder="12345, 12346, 12347..." style={inputSt}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#dc2626')} onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')} />
              <label style={labelSt}>Password</label>
              <input type="password" name="password" required style={inputSt}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#dc2626')} onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')} />
              <button type="submit" style={dangerBtn}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}>Delete Zip Codes</button>
              {delZipToast && <Toast message={delZipToast.msg} type={delZipToast.type} />}
            </form>
          </div>
        </div>

        {/* Row 3: Update Info + HubSpot Key */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
          <div style={cardStyle}>
            <h3 style={sectionTitle}>Update Information</h3>
            <form onSubmit={updateInfomation}>
              <label style={{ ...labelSt, marginTop: 0 }}>First Name</label>
              <input type="text" name="first" placeholder={user.firstName} style={inputSt}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#4338ca')} onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')} />
              <label style={labelSt}>Last Name</label>
              <input type="text" name="last" placeholder={user.lastName} style={inputSt}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#4338ca')} onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')} />
              <label style={labelSt}>Email</label>
              <input type="email" name="email" placeholder={user.email} style={inputSt}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#4338ca')} onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')} />
              <label style={labelSt}>Password</label>
              <input type="password" name="password" required style={inputSt}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#4338ca')} onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')} />
              <button type="submit" style={primaryBtn}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#3730a3')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#4338ca')}>Update Information</button>
            </form>
          </div>
          <div style={cardStyle}>
            <h3 style={sectionTitle}>HubSpot API Key</h3>
            <HowToKey />
            <form onSubmit={submitHubspotKey}>
              <label style={{ ...labelSt, marginTop: 4 }}>HubSpot Key</label>
              <input type="text" name="hubspotKey" style={inputSt}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#4338ca')} onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')} />
              <label style={labelSt}>Password</label>
              <input type="password" name="password" required style={inputSt}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#4338ca')} onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')} />
              <button type="submit" style={primaryBtn}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#3730a3')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#4338ca')}>Update HubSpot Key</button>
            </form>
          </div>
        </div>

        {/* Billing */}
        <div style={{ ...cardStyle, marginBottom: 48 }}>
          <h3 style={sectionTitle}>Billing &amp; Account</h3>
          <BillingManagement email={user.email} />
        </div>
      </div>
    </div>
  );
}