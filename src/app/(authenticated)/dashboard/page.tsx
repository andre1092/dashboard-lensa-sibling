'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FormResponse, RefPegawai, RefFaskes } from '@/lib/types';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, parseISO, subMonths, isAfter, isBefore } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  FileText, TrendingUp, Building2, Users, Calendar,
  Loader2, Filter, BarChart3, Download
} from 'lucide-react';
import { CHART_COLORS } from '@/lib/constants';
import clsx from 'clsx';

// ─── KPI Card Component ─────────────────────────────────────
function KpiCard({
  title, value, subtitle, icon: Icon, gradientClass, delay,
}: {
  title: string; value: number | string; subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradientClass: string; delay: number;
}) {
  return (
    <div
      className="kpi-card animate-fadeIn"
      style={{ animationDelay: `${delay}ms`, background: 'var(--color-glass-bg)', border: '1px solid var(--color-glass-border)' }}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{title}</span>
          <div className={`w-10 h-10 rounded-xl ${gradientClass} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <p className="text-3xl font-bold text-text-primary">{value}</p>
        {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ─────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs" style={{ background: 'var(--color-bg-secondary)' }}>
      <p className="font-medium text-text-primary mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-text-secondary">
          {p.name}: <span className="font-semibold text-text-primary">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────
export default function DashboardPage() {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [pegawaiList, setPegawaiList] = useState<RefPegawai[]>([]);
  const [faskesList, setFaskesList] = useState<RefFaskes[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => format(subMonths(new Date(), 12), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: resp }, { data: peg }, { data: fas }] = await Promise.all([
      supabase.from('form_responses').select('*').order('submitted_at', { ascending: false }),
      supabase.from('ref_pegawai').select('*').order('nama_pegawai'),
      supabase.from('ref_faskes').select('*').order('nama_faskes'),
    ]);
    setResponses(resp || []);
    setPegawaiList(peg || []);
    setFaskesList(fas || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();

    // Subscribe to realtime insert/update/delete on form_responses
    const channel = supabase
      .channel('form_responses_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'form_responses' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, supabase]);

  // Filtered responses by date range
  const filtered = useMemo(() => {
    return responses.filter((r) => {
      const d = parseISO(r.submitted_at);
      return isAfter(d, parseISO(dateFrom)) && isBefore(d, parseISO(dateTo + 'T23:59:59'));
    });
  }, [responses, dateFrom, dateTo]);

  // ─── KPI calculations ────────────────────────────────
  const totalResponses = filtered.length;
  const currentMonth = format(new Date(), 'yyyy-MM');
  const monthlyResponses = filtered.filter((r) => r.submitted_at.startsWith(currentMonth)).length;

  const uniqueFaskes = new Set(
    filtered.map((r) => (r.response_data as Record<string, string>)?.field_faskes).filter(Boolean)
  ).size;

  const uniquePegawai = new Set(
    filtered.map((r) => (r.response_data as Record<string, string>)?.field_pegawai).filter(Boolean)
  ).size;

  // ─── Trend Data (last 12 months) ─────────────────────
  const trendData = useMemo(() => {
    const months: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const m = format(subMonths(new Date(), i), 'yyyy-MM');
      months[m] = 0;
    }
    filtered.forEach((r) => {
      const m = r.submitted_at.substring(0, 7);
      if (months[m] !== undefined) months[m]++;
    });
    return Object.entries(months).map(([month, count]) => ({
      month: format(parseISO(month + '-01'), 'MMM yy', { locale: localeId }),
      count,
    }));
  }, [filtered]);

  // ─── Distribution by Faskes Type ──────────────────────
  const faskesDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    filtered.forEach((r) => {
      const faskesId = (r.response_data as Record<string, string>)?.field_faskes;
      const faskes = faskesList.find((f) => f.id === faskesId);
      const tipe = faskes?.tipe_faskes || 'Lainnya';
      dist[tipe] = (dist[tipe] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value], i) => ({
      name, value, color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [filtered, faskesList]);

  // ─── Per Pegawai ──────────────────────────────────────
  const perPegawai = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((r) => {
      const pegId = (r.response_data as Record<string, string>)?.field_pegawai;
      if (pegId) counts[pegId] = (counts[pegId] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([id, count]) => ({
        name: pegawaiList.find((p) => p.id === id)?.nama_pegawai || id.substring(0, 8),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filtered, pegawaiList]);

  // ─── Per Wilayah ──────────────────────────────────────
  const perWilayah = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((r) => {
      const faskesId = (r.response_data as Record<string, string>)?.field_faskes;
      const faskes = faskesList.find((f) => f.id === faskesId);
      const kota = faskes?.kota_kabupaten || 'Tidak Diketahui';
      counts[kota] = (counts[kota] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filtered, faskesList]);

  // Helper to get pegawai/faskes name
  const getPegawaiName = (id: string) => pegawaiList.find((p) => p.id === id)?.nama_pegawai || '-';
  const getFaskesName = (id: string) => faskesList.find((f) => f.id === id)?.nama_faskes || '-';

  const handleExportCSV = () => {
    if (filtered.length === 0) return;

    const headers = ['No', 'Pegawai BPJS', 'Faskes Dikunjungi', 'Tanggal Kunjungan', 'Submitted At', 'Status'];
    const rows = filtered.map((r, idx) => {
      const data = r.response_data as Record<string, string>;
      const pegawai = getPegawaiName(data?.field_pegawai || '');
      const faskes = getFaskesName(data?.field_faskes || '');
      const tgl = data?.field_tanggal || '-';
      const submitted = format(parseISO(r.submitted_at), 'yyyy-MM-dd HH:mm:ss');
      const status = r.status || 'submitted';
      return [
        idx + 1,
        `"${pegawai.replace(/"/g, '""')}"`,
        `"${faskes.replace(/"/g, '""')}"`,
        `"${tgl}"`,
        `"${submitted}"`,
        `"${status}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lensa-sibling-export-${dateFrom}-to-${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-8 h-8 animate-spin text-accent-blue" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Realtime
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">Infografis data kunjungan LENSA-SIBLING</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="glass-card-static p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Filter className="w-4 h-4" />
          <span>Filter Periode:</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            className="input-base text-sm w-auto"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span className="text-text-muted text-sm">s/d</span>
          <input
            type="date"
            className="input-base text-sm w-auto"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <span className="text-xs text-text-muted">
          Menampilkan {filtered.length} dari {responses.length} respons
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
        <KpiCard title="Total Respons" value={totalResponses} subtitle="Semua kunjungan" icon={FileText} gradientClass="gradient-blue" delay={0} />
        <KpiCard title="Bulan Ini" value={monthlyResponses} subtitle={format(new Date(), 'MMMM yyyy', { locale: localeId })} icon={TrendingUp} gradientClass="gradient-green" delay={50} />
        <KpiCard title="Faskes Dikunjungi" value={uniqueFaskes} subtitle="Faskes unik" icon={Building2} gradientClass="gradient-amber" delay={100} />
        <KpiCard title="Pegawai Aktif" value={uniquePegawai} subtitle="Pegawai unik" icon={Users} gradientClass="gradient-purple" delay={150} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Trend Chart */}
        <div className="glass-card-static p-5 animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-blue" />
            Tren Kunjungan (12 Bulan Terakhir)
          </h3>
          <div className="h-[260px]">
            {trendData.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(222,20%,60%)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(222,20%,60%)', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" name="Kunjungan" stroke="hsl(210,100%,56%)" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(210,100%,56%)' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">Belum ada data</div>
            )}
          </div>
        </div>

        {/* Distribution Pie */}
        <div className="glass-card-static p-5 animate-fadeIn" style={{ animationDelay: '250ms' }}>
          <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent-amber" />
            Distribusi per Tipe Faskes
          </h3>
          <div className="h-[260px]">
            {faskesDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={faskesDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {faskesDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'hsl(222,20%,60%)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">Belum ada data</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Per Pegawai */}
        <div className="glass-card-static p-5 animate-fadeIn" style={{ animationDelay: '300ms' }}>
          <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-accent-green" />
            Kunjungan per Pegawai (Top 10)
          </h3>
          <div className="h-[260px]">
            {perPegawai.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perPegawai} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" tick={{ fill: 'hsl(222,20%,60%)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'hsl(222,20%,60%)', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Kunjungan" fill="hsl(152,69%,53%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">Belum ada data</div>
            )}
          </div>
        </div>

        {/* Per Wilayah */}
        <div className="glass-card-static p-5 animate-fadeIn" style={{ animationDelay: '350ms' }}>
          <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-accent-rose" />
            Sebaran Kunjungan per Kota/Kab (Top 8)
          </h3>
          <div className="h-[260px]">
            {perWilayah.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perWilayah}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(222,20%,60%)', fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: 'hsl(222,20%,60%)', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Kunjungan" radius={[6, 6, 0, 0]}>
                    {perWilayah.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">Belum ada data</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Responses Table */}
      <div className="glass-card-static overflow-hidden animate-fadeIn" style={{ animationDelay: '400ms' }}>
        <div className="p-5 border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent-cyan" />
            Respons Terbaru
          </h3>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-sm">Belum ada respons dalam periode ini</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pegawai</th>
                  <th>Faskes</th>
                  <th>Tanggal Kunjungan</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 20).map((r, idx) => {
                  const data = r.response_data as Record<string, string>;
                  return (
                    <tr key={r.id}>
                      <td className="text-text-muted text-xs">{idx + 1}</td>
                      <td className="font-medium">{getPegawaiName(data?.field_pegawai || '')}</td>
                      <td>{getFaskesName(data?.field_faskes || '')}</td>
                      <td className="text-text-secondary">{data?.field_tanggal || '-'}</td>
                      <td className="text-text-muted text-xs">
                        {format(parseISO(r.submitted_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                      </td>
                      <td>
                        <span className={clsx(
                          'badge',
                          r.status === 'submitted' && 'badge-blue',
                          r.status === 'reviewed' && 'badge-green',
                          r.status === 'archived' && 'badge-amber',
                        )}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
