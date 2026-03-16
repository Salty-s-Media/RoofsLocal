import { Eye, EyeOff, Search, X, Trash2, DollarSign, ListPlus, Download, ListX, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useMemo, useState } from 'react';

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

  const router = useRouter();

  const { startDate, endDate } = getDateRange(timePeriod, customStartDate, customEndDate);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(
        (user) =>
          user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.zipCodes.some((zip) => zip.includes(searchTerm))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

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
    if (res.ok) setUsers(data?.contractors || []);
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
      // Use the SAME leads endpoint as the dashboard so we get the full
      // LeadsApiResponse including lead.revenue (from HubSpot lead_revenue).
      // The admin-only endpoint doesn't return revenue data.
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
        // pricePerLead from this endpoint is in dollars (same as dashboard)
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

  /* ---- Computed KPIs for leads modal (mirrors dashboard mergedLeads logic) ---- */
  const leadsKpis = useMemo(() => {
    // Step 1: Apply status overrides from LeadStatusOverride table
    // This is the same merge the dashboard does in its mergedLeads useMemo
    const mergedLeads = leads.map((l) => {
      const override = leadsStatusOverrides[l.id];
      if (override) {
        return { ...l, status: override };
      }
      // Default to NEW_LEAD if the HubSpot status doesn't match our enum
      if (!STATUS_OPTIONS[l.status]) {
        return { ...l, status: 'NEW_LEAD' };
      }
      return l;
    });

    // Step 2: Compute KPIs from merged leads
    const soldLeads = mergedLeads.filter((l) => l.status === 'SOLD');
    const connectedJobs = soldLeads.length;
    // revenue comes from lead.revenue (HubSpot lead_revenue field)
    const totalRevenue = soldLeads.reduce((sum, l) => sum + (l.revenue ?? 0), 0);
    const adSpend = mergedLeads.length * leadsPricePerLead;
    const roi = adSpend > 0 ? (totalRevenue / adSpend).toFixed(1) : '0.0';
    return { mergedLeads, soldLeads, connectedJobs, totalRevenue, adSpend, roi };
  }, [leads, leadsPricePerLead, leadsStatusOverrides]);

  const changePrice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) return;

    const formData = new FormData(event.currentTarget);
    const priceInDollars = parseFloat(formData.get('price') as string);
    const priceInCents = Math.round(priceInDollars * 100);

    try {
      const res = await fetch('/api/user/admin/update-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid: currentUser.id, price: priceInCents }),
      });

      if (res.ok) {
        await getUsers();
        setModalType(null);
        showNotification('success', 'Price updated successfully');
      } else {
        showNotification('error', 'Failed to update price');
      }
    } catch {
      showNotification('error', 'An error occurred');
    }
  };

  const updateZipCodes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) return;

    const formData = new FormData(event.currentTarget);
    const password = formData.get('password') as string;
    const zipCodesInput = formData.get('zipCodes') as string;

    const newZips = zipCodesInput.split(',').map((zip) => zip.trim()).filter(Boolean);
    const pattern = /^\d{5}(-\d{4})?$/;

    for (const zip of newZips) {
      if (currentUser.zipCodes.includes(zip)) {
        showNotification('error', `Duplicate zip code: ${zip}`);
        return;
      }
      if (!pattern.test(zip)) {
        showNotification('error', `Invalid zip code format: ${zip}`);
        return;
      }
    }

    try {
      const response = await fetch(`/api/user/email/${currentUser.email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCodes: [...currentUser.zipCodes, ...newZips], password }),
      });

      if (response.ok) {
        await getUsers();
        setModalType(null);
        showNotification('success', 'Zip codes added successfully');
      } else {
        showNotification('error', 'Failed to add zip codes');
      }
    } catch {
      showNotification('error', 'An error occurred');
    }
  };

  const deleteZipCodes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) return;

    const formData = new FormData(event.currentTarget);
    const password = formData.get('password') as string;
    const zipCodesInput = formData.get('zipCodes') as string;

    const toDelete = zipCodesInput.split(',').map((zip) => zip.trim()).filter(Boolean);
    const filteredZips = currentUser.zipCodes.filter((zip) => !toDelete.includes(zip));

    try {
      const response = await fetch(`/api/user/email/${currentUser.email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCodes: filteredZips, password }),
      });

      if (response.ok) {
        await getUsers();
        setModalType(null);
        showNotification('success', 'Zip codes deleted successfully');
      } else {
        showNotification('error', 'Failed to delete zip codes');
      }
    } catch {
      showNotification('error', 'An error occurred');
    }
  };

  const deleteContractor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) return;

    try {
      const res = await fetch('/api/user/admin/del-con', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentUser.id }),
      });

      if (res.ok) {
        await getUsers();
        setModalType(null);
        setCurrentUser(null);
        showNotification('success', 'Contractor deleted successfully');
      } else {
        showNotification('error', 'Failed to delete contractor');
      }
    } catch {
      showNotification('error', 'An error occurred');
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Company', 'Email', 'Phone', 'Zip Codes', 'Price Per Lead', 'Leads Sent', 'Revenue Collected'];
    const rows = users.map((user) => [
      `${user.firstName} ${user.lastName}`,
      user.company,
      user.email,
      user.phone,
      user.zipCodes.join('; '),
      (user.pricePerLead / 100).toFixed(2),
      user.leadsSent.toString(),
      (user.revenueCollected / 100).toFixed(2),
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

  const Modal = ({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl ${wide ? 'max-w-2xl' : 'max-w-md'} w-full max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <h3 className="text-xl font-bold text-gray-900">
            {modalType === 'price' && 'Update Price'}
            {modalType === 'addZip' && 'Add Zip Codes'}
            {modalType === 'deleteZip' && 'Delete Zip Codes'}
            {modalType === 'delete' && 'Delete Contractor'}
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

        {/* Date range label */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 border border-blue-300 rounded-lg text-sm text-blue-800 font-medium">
          <span>📅</span>
          <span>{formatDateLabel(startDate, endDate)}</span>
        </div>

        {/* Custom date pickers */}
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

  return (
    <div className="min-h-screen mt-[90px] bg-gray-50">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
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
                <p className="text-gray-600 mt-1">{users.length} total contractors</p>
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

            {/* Search Bar */}
            <div className="mt-4 relative">
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
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
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
                      {/* ── Leads Sent (clickable) ── */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => getContractorLeads(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium hover:bg-green-100 transition"
                        >
                          {user.leadsSent}
                          <ExternalLink size={14} />
                        </button>
                      </td>
                      {/* ── Revenue Collected ── */}
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
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setCurrentUser(user);
                              setModalType('price');
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Update Price"
                          >
                            <DollarSign size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setCurrentUser(user);
                              setModalType('addZip');
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Add Zip Codes"
                          >
                            <ListPlus size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setCurrentUser(user);
                              setModalType('deleteZip');
                            }}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                            title="Delete Zip Codes"
                          >
                            <ListX size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setCurrentUser(user);
                              setModalType('delete');
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Contractor"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No contractors found</p>
              </div>
            )}
          </div>

          {/* ── Existing Modals (price, addZip, deleteZip, delete) ── */}
          {modalType && modalType !== 'leads' && currentUser && (
            <Modal onClose={() => setModalType(null)}>
              {modalType === 'price' && (
                <form onSubmit={changePrice} className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Update price per lead for{' '}
                      <span className="font-semibold text-gray-900">
                        {currentUser.firstName} {currentUser.lastName}
                      </span>
                    </p>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Price Per Lead</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={(currentUser.pricePerLead / 100).toFixed(2)}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setModalType(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                    >
                      Update Price
                    </button>
                  </div>
                </form>
              )}

              {modalType === 'addZip' && (
                <form onSubmit={updateZipCodes} className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Current zip codes: <span className="font-semibold text-gray-900">{currentUser.zipCodes.length}</span>
                    </p>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zip Codes (comma-separated)</label>
                    <input
                      name="zipCodes"
                      type="text"
                      placeholder="12345, 12346, 12347"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2">Format: 5-digit codes separated by commas</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contractor Password</label>
                    <input
                      name="password"
                      type="password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setModalType(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
                    >
                      Add Zip Codes
                    </button>
                  </div>
                </form>
              )}

              {modalType === 'deleteZip' && (
                <form onSubmit={deleteZipCodes} className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Current zip codes:{' '}
                      <span className="font-mono text-xs text-gray-900">{currentUser.zipCodes.join(', ')}</span>
                    </p>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zip Codes to Delete (comma-separated)</label>
                    <input
                      name="zipCodes"
                      type="text"
                      placeholder="12345, 12346"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 placeholder-gray-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contractor Password</label>
                    <input
                      name="password"
                      type="password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setModalType(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
                    >
                      Delete Zip Codes
                    </button>
                  </div>
                </form>
              )}

              {modalType === 'delete' && (
                <form onSubmit={deleteContractor} className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Are you sure you want to permanently delete{' '}
                    <span className="font-semibold text-gray-900">
                      {currentUser.firstName} {currentUser.lastName}
                    </span>
                    ? This action cannot be undone.
                  </p>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setModalType(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
                    >
                      Delete Contractor
                    </button>
                  </div>
                </form>
              )}
            </Modal>
          )}

          {/* ── Leads Detail Modal (enhanced with revenue) ── */}
          {modalType === 'leads' && leadsContractor && (
            <Modal onClose={() => setModalType(null)} wide>
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
                  {/* Sales Pipeline */}
                  <MiniPipeline leads={leadsKpis.mergedLeads} />

                  {/* Lead Cards */}
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
                              {/* Revenue badge — show for any lead with revenue */}
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
                            {/* Revenue row — visible for any lead with revenue from HubSpot */}
                            {lead.revenue != null && lead.revenue > 0 && (
                              <div className="col-span-2 mt-1 pt-2 border-t border-gray-100">
                                <p className="text-xs font-semibold text-green-600 uppercase">Lead Revenue</p>
                                <p className="text-gray-900 font-bold text-lg">{fmt(lead.revenue)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}