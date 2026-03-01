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

/* ------------------------------------------------------------------ */
/*  Status config                                                      */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  OPEN: { label: 'OPEN', bg: '#faf5ff', text: '#7e22ce', border: '#c084fc' },
  IN_PROGRESS: { label: 'IN PROGRESS', bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
  CONNECTED: { label: 'CONNECTED', bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
};

const DEFAULT_BADGE = { label: 'UNKNOWN', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

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
      display: 'inline-block', padding: '4px 10px', borderRadius: 6,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
      background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  );
}

function StatusDropdown({ currentStatus, onUpdate, onClose }: {
  currentStatus: string; onUpdate: (s: string) => void; onClose: () => void;
}) {
  return (
    <div style={{
      position: 'absolute', right: 0, top: '100%', marginTop: 4,
      background: '#fff', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
      border: '1px solid #e2e8f0', zIndex: 50, minWidth: 200, padding: '6px 0',
    }}>
      {Object.keys(STATUS_OPTIONS).map((s) => (
        <button key={s} onClick={() => { onUpdate(s); onClose(); }} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '8px 14px', border: 'none',
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
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)', flex: 1, minWidth: 220,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: accentColor, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
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

function RevenueCell({ lead, onSave }: { lead: Lead; onSave: (id: string, rev: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(lead.revenue ?? 500));

  if (lead.status !== 'CONNECTED') {
    return <span style={{ color: '#cbd5e1', fontWeight: 700 }}>—</span>;
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setValue(String(lead.revenue ?? 500)); setEditing(true); }}
        title="Click to edit revenue"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700,
          color: '#0f172a', fontSize: 14, padding: 0,
          borderBottom: '1px dashed #94a3b8',
        }}
      >
        {fmt(lead.revenue ?? 500)}
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

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const [zipToast, setZipToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [delZipToast, setDelZipToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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

  /* ---- KPIs ---- */
  const moneySpent = leads.length * pricePerLead;
  const connectedLeads = leads.filter((l) => l.status === 'CONNECTED');
  const totalRevenue = connectedLeads.reduce((s, l) => s + (l.revenue ?? 0), 0);
  const roi = moneySpent > 0 ? (totalRevenue / moneySpent).toFixed(1) : '0.0';

  const handleFilter = () => { setActiveFrom(fromDate); setActiveTo(toDate); };
  const handleReset = () => { const d = defaultRange(); setFromDate(d.from); setToDate(d.to); setActiveFrom(d.from); setActiveTo(d.to); };

  const updateStatus = useCallback(async (leadId: string, newStatus: string) => {
    setLeads((p) => p.map((l) => l.id === leadId ? { ...l, status: newStatus, revenue: newStatus === 'CONNECTED' ? (l.revenue ?? 500) : null } : l));
    try {
      await fetch('/api/user/leads/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contactId: leadId, status: newStatus }) });
    } catch (e) { console.error(e); }
  }, []);

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

        {/* ======== KPI CARDS ======== */}
        <div style={{ display: 'flex', gap: 20, marginTop: -20, marginBottom: 24, flexWrap: 'wrap' }}>
          <KpiCard label="Money Spent" value={fmt(moneySpent)} subtitle={`${leads.length} leads × ${fmt(pricePerLead)}/lead`} accentColor="#ef4444" />
          <KpiCard label="Total Revenue" value={fmt(totalRevenue)} subtitle={`${connectedLeads.length} connected jobs. (Edit Revenue to Update)`} accentColor="#22c55e" />
          <KpiCard label="Return on Investment" value={`${roi}x`} subtitle="Revenue ÷ Spend" accentColor="#3b82f6" />
        </div>

        {/* ======== DATE FILTER ======== */}
        <div style={{ ...cardStyle, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '20px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>From:</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ ...inputSt, width: 'auto' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>To:</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ ...inputSt, width: 'auto' }} />
          </div>
          <button onClick={handleFilter} style={{ ...primaryBtn, marginTop: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#3730a3')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#4338ca')}>Filter</button>
          <button onClick={handleReset} style={{ ...secondaryBtn, marginTop: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#475569')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#64748b')}>Reset</button>
        </div>

        {/* ======== LEADS TABLE ======== */}
        <div style={{ ...cardStyle, overflow: 'hidden', marginBottom: 32, padding: 0 }}>
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
                    {['Date', 'Name', 'Phone', 'Email', 'Address', 'Status', 'Revenue', 'Actions'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fafbfd')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: 16, color: '#334155', whiteSpace: 'nowrap' }}>{lead.createdAt ? new Date(lead.createdAt).toISOString().split('T')[0] : '—'}</td>
                      <td style={{ padding: 16, color: '#0f172a', fontWeight: 600 }}>{lead.firstName} {lead.lastName}</td>
                      <td style={{ padding: 16, color: '#334155', whiteSpace: 'nowrap' }}>{lead.phone}</td>
                      <td style={{ padding: 16, color: '#334155' }}>{lead.email}</td>
                      <td style={{ padding: 16, color: '#334155' }}>{[lead.streetAddress, lead.city, lead.zipCode].filter(Boolean).join(', ')}</td>
                      <td style={{ padding: 16 }}><StatusBadge status={lead.status} /></td>
                      <td style={{ padding: 16 }}>
                        <RevenueCell lead={lead} onSave={updateRevenue} />
                      </td>
                      <td style={{ padding: 16, position: 'relative' }}>
                        <button onClick={() => setOpenDropdown(openDropdown === lead.id ? null : lead.id)}
                          style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Update Status
                        </button>
                        {openDropdown === lead.id && (
                          <StatusDropdown currentStatus={lead.status} onUpdate={(s) => updateStatus(lead.id, s)} onClose={() => setOpenDropdown(null)} />
                        )}
                      </td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 15 }}>No leads found for the selected date range.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {openDropdown && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpenDropdown(null)} />}

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