import { Eye, EyeOff, Search, X, Trash2, DollarSign, ListPlus, Download, ListX, ExternalLink, ChevronRight, ToggleLeft, ToggleRight, Plus, Check, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useMemo, useState, useCallback } from 'react';

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
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
}

interface Contractor {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  zipCodes: string[];
  pricePerLead: number;
  leadsSent: number;
  revenueCollected: number;
}

type ModalType = 'price' | 'addZip' | 'deleteZip' | 'delete' | 'leads' | null;
type TimePeriod = '7D' | '30D' | '90D' | 'YTD' | 'Custom';
type ContractorFilter = 'all' | 'active' | 'inactive';

/* ------------------------------------------------------------------ */
/*  Status config (mirrored from dashboard)                            */
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

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getDateRange(period: TimePeriod, customStart?: string, customEnd?: string): { startDate: string; endDate: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];

  switch (period) {
    case '7D': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { startDate: start.toISOString().split('T')[0], endDate: end };
    }
    case '30D': {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { startDate: start.toISOString().split('T')[0], endDate: end };
    }
    case '90D': {
      const start = new Date(now);
      start.setDate(start.getDate() - 90);
      return { startDate: start.toISOString().split('T')[0], endDate: end };
    }
    case 'YTD': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { startDate: start.toISOString().split('T')[0], endDate: end };
    }
    case 'Custom':
      return {
        startDate: customStart || end,
        endDate: customEnd || end,
      };
  }
}

function formatDateLabel(startDate: string, endDate: string): string {
  const fmtDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  return `${fmtDate(startDate)} – ${fmtDate(endDate)}`;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_OPTIONS[status] || DEFAULT_BADGE;
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold tracking-wide whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

function MiniPipeline({ leads }: { leads: Lead[] }) {
  const total = leads.length || 1;
  const counts: Record<string, number> = {};
  for (const k of STATUS_KEYS) counts[k] = 0;
  for (const l of leads) {
    if (counts[l.status] !== undefined) counts[l.status]++;
  }

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sales Pipeline</p>
      <div className="flex flex-col gap-2">
        {STATUS_KEYS.map((key) => {
          const cfg = STATUS_OPTIONS[key];
          const count = counts[key] || 0;
          const pct = (count / total) * 100;
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-[110px] text-[11px] font-bold shrink-0 tracking-wide" style={{ color: cfg.color }}>
                {cfg.label}
              </div>
              <div className="flex-1 bg-gray-100 rounded h-5 relative overflow-hidden">
                {count > 0 && (
                  <div
                    className="h-full rounded flex items-center pl-2 transition-all duration-300"
                    style={{ background: cfg.color, opacity: 0.7, width: `${Math.max(pct, 3)}%` }}
                  >
                    {pct >= 10 && (
                      <span className="text-[10px] font-bold text-white">{Math.round(pct)}%</span>
                    )}
                  </div>
                )}
              </div>
              <div className="w-6 text-right text-sm font-bold text-gray-700 shrink-0">{count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Zip Chip with individual confirm/deny delete                       */
/* ------------------------------------------------------------------ */

function ZipChip({ zip, onDelete }: { zip: string; onDelete: (zip: string) => void }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-red-50 border border-red-300 text-red-700 animate-pulse">
        {zip}
        <button
          onClick={() => onDelete(zip)}
          className="ml-0.5 p-0.5 rounded hover:bg-red-200 transition"
          title="Confirm delete"
        >
          <Check size={12} />
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="p-0.5 rounded hover:bg-red-200 transition"
          title="Cancel"
        >
          <X size={12} />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 border border-gray-200 text-gray-700 hover:border-red-300 hover:bg-red-50 group transition">
      {zip}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setConfirming(true);
        }}
        className="ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-200 transition"
        title="Remove zip"
      >
        <X size={12} />
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [show, setShow] = useState(false);
  const [users, setUsers] = useState<Contractor[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Contractor[]>([]);
  const [currentUser, setCurrentUser] = useState<Contractor | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active / Inactive state + cache
  const [contractorFilter, setContractorFilter] = useState<ContractorFilter>('all');
  const [inactiveIds, setInactiveIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('admin_inactive_contractors');
        return cached ? new Set(JSON.parse(cached)) : new Set();
      } catch { return new Set(); }
    }
    return new Set();
  });

  // Comprehensive detail panel
  const [detailContractor, setDetailContractor] = useState<Contractor | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'zips' | 'leads'>('info');
  const [addZipInput, setAddZipInput] = useState('');
  const [addZipPassword, setAddZipPassword] = useState('');
  const [zipActionLoading, setZipActionLoading] = useState(false);

  // Price editing in detail panel
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState('');

  // Date range state
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30D');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Leads modal state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsContractor, setLeadsContractor] = useState<Contractor | null>(null);
  const [leadsPricePerLead, setLeadsPricePerLead] = useState(0);
  const [leadsStatusOverrides, setLeadsStatusOverrides] = useState<Record<string, string>>({});

  // Delete confirmation in detail panel
  const [confirmDelete, setConfirmDelete] = useState(false);

  const router = useRouter();

  const { startDate, endDate } = getDateRange(timePeriod, customStartDate, customEndDate);

  // Persist inactive IDs to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_inactive_contractors', JSON.stringify([...inactiveIds]));
    }
  }, [inactiveIds]);

  const toggleInactive = useCallback((id: string) => {
    setInactiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Filtering: search + active/inactive
  useEffect(() => {
    let result = users;

    // Active / Inactive filter
    if (contractorFilter === 'active') {
      result = result.filter((u) => !inactiveIds.has(u.id));
    } else if (contractorFilter === 'inactive') {
      result = result.filter((u) => inactiveIds.has(u.id));
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (user) =>
          user.firstName.toLowerCase().includes(term) ||
          user.lastName.toLowerCase().includes(term) ||
          user.company.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.zipCodes.some((zip) => zip.includes(searchTerm))
      );
    }

    setFilteredUsers(result);
  }, [searchTerm, users, contractorFilter, inactiveIds]);

  // Totals row computed from the currently visible (filtered) list
  const totals = useMemo(() => {
    const totalLeads = filteredUsers.reduce((s, u) => s + u.leadsSent, 0);
    const totalRevenue = filteredUsers.reduce((s, u) => s + u.revenueCollected, 0);
    const avgPPL =
      filteredUsers.length > 0
        ? filteredUsers.reduce((s, u) => s + u.pricePerLead, 0) / filteredUsers.length
        : 0;
    return { totalLeads, totalRevenue, avgPPL, count: filteredUsers.length };
  }, [filteredUsers]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loginAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/user/admin/check-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: data.akey, rkey: data.rkey }),
      });

      if (response.ok) {
        setAuthed(true);
        getUsers();
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Admin login error ', error);
    }
  };

  const getUsers = async () => {
    const res = await fetch(`/api/user/admin/get-all?startDate=${startDate}&endDate=${endDate}`);
    const data = await res.json();
    if (res.ok) {
      const contractors = data?.contractors || [];
      setUsers(contractors);
      // If detail panel is open, refresh that contractor's data
      if (detailContractor) {
        const refreshed = contractors.find((c: Contractor) => c.id === detailContractor.id);
        if (refreshed) setDetailContractor(refreshed);
      }
    }
  };

  useEffect(() => {
    if (authed) getUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, authed]);

  const getContractorLeads = async (contractor: Contractor) => {
    setLeadsContractor(contractor);
    setCurrentUser(contractor);
    setModalType('leads');
    setLeadsLoading(true);
    setLeadsStatusOverrides({});

    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const [leadsRes, overridesRes] = await Promise.all([
        fetch(`/api/user/leads/${contractor.id}?${params.toString()}`),
        fetch(`/api/user/leads/status-override?contractorId=${contractor.id}`),
      ]);

      const leadsData = await leadsRes.json();
      if (leadsRes.ok) {
        setLeads(leadsData?.leads || []);
        setLeadsPricePerLead(leadsData?.pricePerLead ?? (contractor.pricePerLead / 100));
      } else {
        showNotification('error', 'Failed to load leads');
      }

      if (overridesRes.ok) {
        const overridesData = await overridesRes.json();
        setLeadsStatusOverrides(overridesData || {});
      }
    } catch {
      showNotification('error', 'An error occurred loading leads');
    } finally {
      setLeadsLoading(false);
    }
  };

  /* ---- Computed KPIs for leads modal ---- */
  const leadsKpis = useMemo(() => {
    const mergedLeads = leads.map((l) => {
      const override = leadsStatusOverrides[l.id];
      if (override) return { ...l, status: override };
      if (!STATUS_OPTIONS[l.status]) return { ...l, status: 'NEW_LEAD' };
      return l;
    });

    const soldLeads = mergedLeads.filter((l) => l.status === 'SOLD');
    const connectedJobs = soldLeads.length;
    const totalRevenue = soldLeads.reduce((sum, l) => sum + (l.revenue ?? 0), 0);
    const adSpend = mergedLeads.length * leadsPricePerLead;
    const roi = adSpend > 0 ? (totalRevenue / adSpend).toFixed(1) : '0.0';
    return { mergedLeads, soldLeads, connectedJobs, totalRevenue, adSpend, roi };
  }, [leads, leadsPricePerLead, leadsStatusOverrides]);

  /* ---- Actions ---- */

  const changePrice = async (contractorId: string, priceInDollars: number) => {
    const priceInCents = Math.round(priceInDollars * 100);
    try {
      const res = await fetch('/api/user/admin/update-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid: contractorId, price: priceInCents }),
      });
      if (res.ok) {
        await getUsers();
        setEditingPrice(false);
        showNotification('success', 'Price updated successfully');
      } else {
        showNotification('error', 'Failed to update price');
      }
    } catch {
      showNotification('error', 'An error occurred');
    }
  };

  const deleteSingleZip = async (contractor: Contractor, zipToDelete: string, password: string) => {
    const filteredZips = contractor.zipCodes.filter((z) => z !== zipToDelete);
    setZipActionLoading(true);
    try {
      const response = await fetch(`/api/user/email/${contractor.email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCodes: filteredZips, password }),
      });
      if (response.ok) {
        await getUsers();
        showNotification('success', `Zip code ${zipToDelete} removed`);
      } else {
        showNotification('error', 'Failed to remove zip code');
      }
    } catch {
      showNotification('error', 'An error occurred');
    } finally {
      setZipActionLoading(false);
    }
  };

  const addZipCodes = async (contractor: Contractor, zipCodesInput: string, password: string) => {
    const newZips = zipCodesInput.split(',').map((zip) => zip.trim()).filter(Boolean);
    const pattern = /^\d{5}(-\d{4})?$/;

    for (const zip of newZips) {
      if (contractor.zipCodes.includes(zip)) {
        showNotification('error', `Duplicate zip code: ${zip}`);
        return;
      }
      if (!pattern.test(zip)) {
        showNotification('error', `Invalid zip code format: ${zip}`);
        return;
      }
    }

    setZipActionLoading(true);
    try {
      const response = await fetch(`/api/user/email/${contractor.email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCodes: [...contractor.zipCodes, ...newZips], password }),
      });
      if (response.ok) {
        await getUsers();
        setAddZipInput('');
        showNotification('success', `${newZips.length} zip code${newZips.length !== 1 ? 's' : ''} added`);
      } else {
        showNotification('error', 'Failed to add zip codes');
      }
    } catch {
      showNotification('error', 'An error occurred');
    } finally {
      setZipActionLoading(false);
    }
  };

  const deleteContractor = async (contractor: Contractor) => {
    try {
      const res = await fetch('/api/user/admin/del-con', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: contractor.id }),
      });
      if (res.ok) {
        await getUsers();
        setDetailContractor(null);
        setConfirmDelete(false);
        showNotification('success', 'Contractor deleted successfully');
      } else {
        showNotification('error', 'Failed to delete contractor');
      }
    } catch {
      showNotification('error', 'An error occurred');
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Company', 'Email', 'Phone', 'Zip Codes', 'Price Per Lead', 'Leads Sent', 'Revenue Collected', 'Status'];
    const rows = users.map((user) => [
      `${user.firstName} ${user.lastName}`,
      user.company,
      user.email,
      user.phone,
      user.zipCodes.join('; '),
      (user.pricePerLead / 100).toFixed(2),
      user.leadsSent.toString(),
      (user.revenueCollected / 100).toFixed(2),
      inactiveIds.has(user.id) ? 'Inactive' : 'Active',
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contractors_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const copyAllZipCodes = async () => {
    const allZipCodes = users.flatMap((user) => user.zipCodes);
    const uniqueZipCodes = [...new Set(allZipCodes)].sort();
    const zipCodesString = uniqueZipCodes.join(', ');

    try {
      await navigator.clipboard.writeText(zipCodesString);
      showNotification('success', `${uniqueZipCodes.length} zip codes copied to clipboard`);
    } catch {
      showNotification('error', 'Failed to copy to clipboard');
    }
  };

  /* ---- Open detail panel (row click) ---- */
  const openDetail = (contractor: Contractor) => {
    setDetailContractor(contractor);
    setDetailTab('info');
    setEditingPrice(false);
    setPriceInput((contractor.pricePerLead / 100).toFixed(2));
    setConfirmDelete(false);
    setAddZipInput('');
    setAddZipPassword('');
  };

  const Modal = ({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl ${wide ? 'max-w-2xl' : 'max-w-md'} w-full max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <h3 className="text-xl font-bold text-gray-900">
            {modalType === 'leads' && `${leadsContractor?.company} — Leads`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );

  // ── Time period tabs ──
  const TimePeriodTabs = () => {
    const periods: TimePeriod[] = ['7D', '30D', '90D', 'YTD', 'Custom'];

    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => {
                setTimePeriod(p);
                if (p === 'Custom') setShowCustomPicker(true);
                else setShowCustomPicker(false);
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                timePeriod === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 border border-blue-300 rounded-lg text-sm text-blue-800 font-medium">
          <span>📅</span>
          <span>{formatDateLabel(startDate, endDate)}</span>
        </div>

        {showCustomPicker && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
            <span className="text-gray-400">–</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </div>
        )}
      </div>
    );
  };

  /* ------------------------------------------------------------------ */
  /*  Comprehensive Detail Panel                                         */
  /* ------------------------------------------------------------------ */

  const DetailPanel = () => {
    if (!detailContractor) return null;
    const c = detailContractor;
    const isInactive = inactiveIds.has(c.id);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-end">
        <div
          className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl animate-slide-in-right"
          style={{ animation: 'slideInRight 0.2s ease-out' }}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b z-10 px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setDetailContractor(null)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition text-sm font-medium"
              >
                <ArrowLeft size={18} />
                Back to list
              </button>
              <div className="flex items-center gap-3">
                {/* Active / Inactive toggle */}
                <button
                  onClick={() => toggleInactive(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                    isInactive
                      ? 'bg-gray-100 text-gray-500 border border-gray-300'
                      : 'bg-green-50 text-green-700 border border-green-300'
                  }`}
                >
                  {isInactive ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                  {isInactive ? 'Inactive' : 'Active'}
                </button>
                <button onClick={() => setDetailContractor(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Contractor name + company */}
            <div className="mt-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {c.firstName} {c.lastName}
              </h2>
              <p className="text-gray-600">{c.company}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 -mb-px">
              {(['info', 'zips', 'leads'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setDetailTab(tab);
                    if (tab === 'leads') getContractorLeads(c);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition ${
                    detailTab === tab
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'info' && 'Overview'}
                  {tab === 'zips' && `Zip Codes (${c.zipCodes.length})`}
                  {tab === 'leads' && 'Leads'}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {/* ─── INFO TAB ─── */}
            {detailTab === 'info' && (
              <div className="space-y-6">
                {/* KPI cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Price / Lead</p>
                    {editingPrice ? (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={priceInput}
                            onChange={(e) => setPriceInput(e.target.value)}
                            className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>
                        <button
                          onClick={() => changePrice(c.id, parseFloat(priceInput))}
                          className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingPrice(false)}
                          className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <p
                        className="text-2xl font-extrabold text-gray-900 mt-1 cursor-pointer hover:text-blue-600 transition"
                        onClick={() => {
                          setPriceInput((c.pricePerLead / 100).toFixed(2));
                          setEditingPrice(true);
                        }}
                        title="Click to edit"
                      >
                        ${(c.pricePerLead / 100).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Leads Sent</p>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1">{c.leadsSent}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Revenue</p>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1">
                      ${(c.revenueCollected / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Contact details */}
                <div className="bg-gray-50 rounded-lg p-5 space-y-3">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Email</p>
                      <p className="text-gray-900 font-medium">{c.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Phone</p>
                      <p className="text-gray-900 font-medium">{c.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Zip preview */}
                <div className="bg-gray-50 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Zip Codes ({c.zipCodes.length})
                    </h3>
                    <button
                      onClick={() => setDetailTab('zips')}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Manage All →
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.zipCodes.slice(0, 20).map((zip) => (
                      <span key={zip} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-700 font-medium">
                        {zip}
                      </span>
                    ))}
                    {c.zipCodes.length > 20 && (
                      <span className="px-2 py-0.5 bg-blue-100 border border-blue-200 rounded text-xs text-blue-700 font-medium">
                        +{c.zipCodes.length - 20} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Danger zone */}
                <div className="border border-red-200 rounded-lg p-5 bg-red-50">
                  <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-2">Danger Zone</h3>
                  {confirmDelete ? (
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={18} className="text-red-600 shrink-0" />
                      <p className="text-sm text-red-700">
                        Permanently delete <strong>{c.firstName} {c.lastName}</strong>?
                      </p>
                      <button
                        onClick={() => deleteContractor(c)}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-1.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition"
                    >
                      <Trash2 size={16} />
                      Delete Contractor
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ─── ZIPS TAB (comprehensive view) ─── */}
            {detailTab === 'zips' && (
              <div className="space-y-5">
                {/* Add new zips */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-green-700 mb-3">Add Zip Codes</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={addZipInput}
                      onChange={(e) => setAddZipInput(e.target.value)}
                      placeholder="12345, 12346, 12347"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="password"
                      value={addZipPassword}
                      onChange={(e) => setAddZipPassword(e.target.value)}
                      placeholder="Contractor password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={() => {
                        if (addZipInput && addZipPassword) {
                          addZipCodes(c, addZipInput, addZipPassword);
                        } else {
                          showNotification('error', 'Enter zip codes and password');
                        }
                      }}
                      disabled={zipActionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      <Plus size={16} />
                      Add Zip Codes
                    </button>
                  </div>
                </div>

                {/* Current zips — full list with individual remove */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Current Zip Codes ({c.zipCodes.length})
                    </h3>
                    <p className="text-xs text-gray-500">Hover a zip code to remove it</p>
                  </div>

                  {c.zipCodes.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">No zip codes assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {c.zipCodes.map((zip) => (
                        <ZipChip
                          key={zip}
                          zip={zip}
                          onDelete={(z) => {
                            if (!addZipPassword) {
                              showNotification('error', 'Enter contractor password above first');
                              return;
                            }
                            deleteSingleZip(c, z, addZipPassword);
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {!addZipPassword && c.zipCodes.length > 0 && (
                    <p className="text-xs text-orange-600 mt-3 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Enter the contractor password above to enable individual zip removal
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ─── LEADS TAB ─── */}
            {detailTab === 'leads' && (
              <div>
                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Total Leads</p>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1">{leadsKpis.mergedLeads.length}</p>
                    <p className="text-xs text-gray-500 mt-1">{fmt(leadsPricePerLead)}/lead</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Ad Spend</p>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1">{fmt(leadsKpis.adSpend)}</p>
                    <p className="text-xs text-gray-500 mt-1">{leadsKpis.mergedLeads.length} leads</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Revenue</p>
                    <p className="text-2xl font-extrabold text-green-700 mt-1">{fmt(leadsKpis.totalRevenue)}</p>
                    <p className="text-xs text-gray-500 mt-1">{leadsKpis.connectedJobs} sold lead{leadsKpis.connectedJobs !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">ROI</p>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1">{leadsKpis.roi}x</p>
                    <p className="text-xs text-gray-500 mt-1">Revenue ÷ Spend</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-4">{formatDateLabel(startDate, endDate)}</p>

                {leadsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading leads...</p>
                  </div>
                ) : leads.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No leads found for this period</p>
                  </div>
                ) : (
                  <>
                    <MiniPipeline leads={leadsKpis.mergedLeads} />

                    <div className="space-y-4">
                      {leadsKpis.mergedLeads.map((lead) => {
                        const status = lead.status;
                        const isSold = status === 'SOLD';
                        return (
                          <div key={lead.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900">
                                  {lead.firstName} {lead.lastName}
                                </h4>
                                <StatusBadge status={status} />
                              </div>
                              <div className="flex items-center gap-3">
                                {lead.revenue != null && lead.revenue > 0 && (
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                                    isSold
                                      ? 'bg-green-100 text-green-700 border-green-300'
                                      : 'bg-gray-100 text-gray-600 border-gray-300'
                                  }`}>
                                    {fmt(lead.revenue)}
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">
                                  {new Date(lead.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                              <div>
                                <p className="text-xs font-semibold text-green-600 uppercase">First Name</p>
                                <p className="text-gray-900">{lead.firstName}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-green-600 uppercase">Last Name</p>
                                <p className="text-gray-900">{lead.lastName}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-green-600 uppercase">Phone</p>
                                <p className="text-gray-900">{lead.phone}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-green-600 uppercase">Email</p>
                                <p className="text-gray-900 break-all">{lead.email}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs font-semibold text-green-600 uppercase">Street Address</p>
                                <p className="text-gray-900">{lead.streetAddress}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-green-600 uppercase">City</p>
                                <p className="text-gray-900">{lead.city}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-green-600 uppercase">Zip Code</p>
                                <p className="text-gray-900">{lead.zipCode}</p>
                              </div>
                              {lead.revenue != null && lead.revenue > 0 && (
                                <div className="col-span-2 mt-1 pt-2 border-t border-gray-100">
                                  <p className="text-xs font-semibold text-green-600 uppercase">Lead Revenue</p>
                                  <p className="text-gray-900 font-bold text-lg">{fmt(lead.revenue)}</p>
                                </div>
                              )}
                              {/* UTM Parameters */}
                              {(lead.utmSource || lead.utmMedium || lead.utmCampaign || lead.utmTerm || lead.utmContent) && (
                                <div className="col-span-2 mt-1 pt-2 border-t border-gray-100">
                                  <p className="text-xs font-semibold text-blue-600 uppercase mb-2">UTM Parameters</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {lead.utmSource && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-blue-50 border border-blue-200 text-blue-800">
                                        <span className="font-semibold">source:</span> {lead.utmSource}
                                      </span>
                                    )}
                                    {lead.utmMedium && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-purple-50 border border-purple-200 text-purple-800">
                                        <span className="font-semibold">medium:</span> {lead.utmMedium}
                                      </span>
                                    )}
                                    {lead.utmCampaign && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-amber-50 border border-amber-200 text-amber-800">
                                        <span className="font-semibold">campaign:</span> {lead.utmCampaign}
                                      </span>
                                    )}
                                    {lead.utmTerm && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-teal-50 border border-teal-200 text-teal-800">
                                        <span className="font-semibold">term:</span> {lead.utmTerm}
                                      </span>
                                    )}
                                    {lead.utmContent && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-rose-50 border border-rose-200 text-rose-800">
                                        <span className="font-semibold">content:</span> {lead.utmContent}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen mt-[90px] bg-gray-50">
      {/* Slide-in animation */}
      <style jsx global>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-[60] px-6 py-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white font-medium animate-slide-in`}
        >
          {notification.message}
        </div>
      )}

      {!authed ? (
        <div className="min-h-screen mt-[-70px] flex items-center justify-center px-4">
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Portal</h1>
              <p className="text-gray-600">Enter your credentials to continue</p>
            </div>

            <form onSubmit={loginAdmin} className="space-y-4">
              <div>
                <label htmlFor="akey" className="block text-sm font-medium text-gray-700 mb-2">
                  Main Key
                </label>
                <input
                  id="akey"
                  name="akey"
                  type="text"
                  placeholder="Enter main key"
                  maxLength={30}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label htmlFor="rkey" className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Key
                </label>
                <div className="relative">
                  <input
                    id="rkey"
                    name="rkey"
                    type={show ? 'text' : 'password'}
                    maxLength={30}
                    placeholder="Enter secondary key"
                    className="w-full px-4 py-3 border text-blk border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {show ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Contractor Management</h1>
                <p className="text-gray-600 mt-1">
                  {users.length} total contractors
                  {inactiveIds.size > 0 && (
                    <span className="text-gray-400 ml-1">
                      ({users.filter((u) => !inactiveIds.has(u.id)).length} active, {users.filter((u) => inactiveIds.has(u.id)).length} inactive)
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={copyAllZipCodes}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                  <ListPlus size={18} />
                  Copy All Zip Codes
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
                >
                  <Download size={18} />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Time Period Tabs */}
            <div className="mt-4">
              <TimePeriodTabs />
            </div>

            {/* Active / Inactive filter + Search */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              {/* Filter tabs */}
              <div className="flex bg-gray-100 rounded-lg p-1 shrink-0">
                {(['all', 'active', 'inactive'] as ContractorFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setContractorFilter(f)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition capitalize ${
                      contractorFilter === f
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {f}
                    {f === 'inactive' && inactiveIds.size > 0 && (
                      <span className="ml-1 text-xs text-gray-400">({users.filter((u) => inactiveIds.has(u.id)).length})</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, company, email, or zip code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-blk pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Company</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Contact</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Zip Codes</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Price/Lead</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Leads Sent</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Revenue Collected</th>
                    <th className="w-10 px-3 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => {
                    const isInactive = inactiveIds.has(user.id);
                    return (
                      <tr
                        key={user.id}
                        onClick={() => openDetail(user)}
                        className={`hover:bg-blue-50 transition cursor-pointer ${isInactive ? 'opacity-50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            {isInactive && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-200 text-gray-500">
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{user.company}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="text-gray-900">{user.email}</div>
                            <div className="text-gray-500">{user.phone}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {user.zipCodes.length} codes
                            </span>
                            <span className="text-sm text-gray-600">
                              {user.zipCodes.slice(0, 3).join(', ')}
                              {user.zipCodes.length > 3 && '...'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-green-600">${(user.pricePerLead / 100).toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                            {user.leadsSent}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span className="font-semibold text-gray-900">
                              ${(user.revenueCollected / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                            <div className="text-xs text-gray-500">
                              Last {timePeriod === 'Custom' ? 'period' : timePeriod === 'YTD' ? 'YTD' : timePeriod.replace('D', ' days')}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-gray-400">
                          <ChevronRight size={18} />
                        </td>
                      </tr>
                    );
                  })}

                  {/* ── Totals Row ── */}
                  {filteredUsers.length > 0 && (
                    <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                      <td className="px-6 py-4 text-gray-700" colSpan={2}>
                        <span className="text-sm uppercase tracking-wider">
                          Totals ({totals.count} contractor{totals.count !== 1 ? 's' : ''})
                        </span>
                      </td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-green-600">${(totals.avgPPL / 100).toFixed(2)}</span>
                          <div className="text-xs text-gray-500 font-normal">avg PPL</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                          {totals.totalLeads}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900">
                          ${(totals.totalRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-3 py-4"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No contractors found</p>
              </div>
            )}
          </div>

          {/* ── Detail Panel (slide-in from right) ── */}
          {detailContractor && <DetailPanel />}
        </div>
      )}
    </div>
  );
}