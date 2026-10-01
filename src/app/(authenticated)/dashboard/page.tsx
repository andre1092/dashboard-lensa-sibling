'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  Loader2, Send, CheckCircle2, Calendar, ClipboardList,
  Download, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import clsx from 'clsx';

// ─── Constants ──────────────────────────────────────────────
const PEGAWAI_OPTIONS = ['Andreas', 'Khoiron', 'Wahyuadi'];
const FASKES_OPTIONS = ['RS Soebandi', 'RSD Balung', 'RS Paru Jember'];

const PERTANYAAN_ALUR =
  'Apakah Alur Pelayanan Peserta JKN sudah sesuai dengan ketentuan pada gambar? ' +
  '(Pasien baru pengambilan antrean Onsite/RS - diarahkan ke loket pendaftaran/Admisi sesuai nomor antrean. ' +
  'Pasien lama/ Pasien MJKN - diarahkan langsung ke antrean Poli sesuai dengan nomor antrean. ' +
  'Dipastikan tidak menggunakan mekanisme menumpuk berkas).';

// ─── Types ──────────────────────────────────────────────────
interface FormData {
  pegawai: string;
  faskes: string;
  tanggalKunjungan: string;
  jawabanAlur: '' | 'sudah' | 'belum';
  catatanKhusus: string;
  tanggalKomitmen: string;
}

interface ResponseRow {
  id: string;
  response_data: Record<string, unknown>;
  submitted_at: string;
  submitted_by: string;
  status: string;
}

const INITIAL_FORM: FormData = {
  pegawai: '',
  faskes: '',
  tanggalKunjungan: '',
  jawabanAlur: '',
  catatanKhusus: '',
  tanggalKomitmen: '',
};

// ─── Main Page ──────────────────────────────────────────────
export default function DashboardPage() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const supabase = createClient();

  // ─── Fetch existing responses ─────────────────────────
  const fetchResponses = useCallback(async () => {
    setLoadingData(true);
    const { data } = await supabase
      .from('form_responses')
      .select('*')
      .order('submitted_at', { ascending: false });
    setResponses((data as ResponseRow[]) || []);
    setLoadingData(false);
  }, [supabase]);

  useEffect(() => {
    fetchResponses();

    const channel = supabase
      .channel('dashboard_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'form_responses' },
        () => fetchResponses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchResponses, supabase]);

  // ─── Validation ───────────────────────────────────────
  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.pegawai) e.pegawai = 'Pilih nama pegawai';
    if (!form.faskes) e.faskes = 'Pilih nama faskes';
    if (!form.tanggalKunjungan) e.tanggalKunjungan = 'Pilih tanggal kunjungan';
    if (!form.jawabanAlur) e.jawabanAlur = 'Pilih jawaban';
    if (!form.catatanKhusus.trim()) e.catatanKhusus = 'Isi catatan khusus';
    if (form.jawabanAlur === 'belum' && !form.tanggalKomitmen)
      e.tanggalKomitmen = 'Pilih tanggal komitmen';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Submit ───────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    const responseData: Record<string, unknown> = {
      pegawai: form.pegawai,
      faskes: form.faskes,
      tanggal_kunjungan: form.tanggalKunjungan,
      jawaban_alur: form.jawabanAlur,
      catatan_khusus: form.catatanKhusus,
    };
    if (form.jawabanAlur === 'belum') {
      responseData.tanggal_komitmen = form.tanggalKomitmen;
    }

    const { error } = await supabase.from('form_responses').insert({
      form_schema_id: '00000000-0000-0000-0000-000000000001',
      response_data: responseData,
      submitted_by: user?.id || 'anonymous',
      status: 'submitted',
    });

    setSubmitting(false);
    if (!error) {
      setSubmitted(true);
      setForm(INITIAL_FORM);
      setErrors({});
      setTimeout(() => setSubmitted(false), 4000);
    }
  };

  // ─── CSV Export ───────────────────────────────────────
  const handleExportCSV = () => {
    if (responses.length === 0) return;
    const headers = ['No', 'Pegawai', 'Faskes', 'Tanggal Kunjungan', 'Jawaban Alur', 'Catatan', 'Tgl Komitmen', 'Submitted At'];
    const rows = responses.map((r, idx) => {
      const d = r.response_data as Record<string, string>;
      return [
        idx + 1,
        `"${d.pegawai || ''}"`,
        `"${d.faskes || ''}"`,
        `"${d.tanggal_kunjungan || ''}"`,
        `"${d.jawaban_alur || ''}"`,
        `"${(d.catatan_khusus || '').replace(/"/g, '""')}"`,
        `"${d.tanggal_komitmen || '-'}"`,
        `"${format(parseISO(r.submitted_at), 'yyyy-MM-dd HH:mm:ss')}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lensa-sibling-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ─── Helper to update form ────────────────────────────
  const update = (key: keyof FormData, val: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      // Reset dependent fields when answer changes
      if (key === 'jawabanAlur') {
        next.catatanKhusus = '';
        next.tanggalKomitmen = '';
      }
      return next;
    });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="animate-fadeIn max-w-4xl mx-auto">
      {/* ========== HEADER ========== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">Dashboard LENSA-SiBLing</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">Form Kunjungan &amp; Riwayat Data</p>
        </div>
      </div>

      {/* ========== SUCCESS TOAST ========== */}
      {submitted && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300 font-medium">
            Data berhasil disimpan! Form sudah direset.
          </p>
        </div>
      )}

      {/* ========== FORM SECTION ========== */}
      <div className="glass-card-static p-6 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <ClipboardList className="w-5 h-5 text-accent-blue" />
          <h2 className="text-lg font-bold text-text-primary">Form Kunjungan</h2>
        </div>

        <div className="space-y-6">
          {/* 1. Nama Pegawai */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Nama Pegawai BPJS Kesehatan <span className="text-accent-rose">*</span>
            </label>
            <select
              className={clsx('input-base w-full', errors.pegawai && 'border-accent-rose')}
              value={form.pegawai}
              onChange={(e) => update('pegawai', e.target.value)}
            >
              <option value="">— Pilih Pegawai —</option>
              {PEGAWAI_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.pegawai && <p className="text-xs text-accent-rose mt-1">{errors.pegawai}</p>}
          </div>

          {/* 2. Nama Faskes */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Nama Faskes yang dilakukan LENSA-SiBLing <span className="text-accent-rose">*</span>
            </label>
            <select
              className={clsx('input-base w-full', errors.faskes && 'border-accent-rose')}
              value={form.faskes}
              onChange={(e) => update('faskes', e.target.value)}
            >
              <option value="">— Pilih Faskes —</option>
              {FASKES_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            {errors.faskes && <p className="text-xs text-accent-rose mt-1">{errors.faskes}</p>}
          </div>

          {/* 3. Tanggal Kunjungan */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Tanggal Kunjungan <span className="text-accent-rose">*</span>
            </label>
            <input
              type="date"
              className={clsx('input-base w-full', errors.tanggalKunjungan && 'border-accent-rose')}
              value={form.tanggalKunjungan}
              onChange={(e) => update('tanggalKunjungan', e.target.value)}
            />
            {errors.tanggalKunjungan && <p className="text-xs text-accent-rose mt-1">{errors.tanggalKunjungan}</p>}
          </div>

          {/* 4. Pertanyaan Alur + Gambar */}
          <div className="border rounded-xl p-5" style={{ borderColor: 'var(--color-glass-border)', background: 'var(--color-bg-secondary)' }}>
            <label className="block text-sm font-medium text-text-primary mb-4 leading-relaxed">
              Apakah <strong>Alur Pelayanan Peserta JKN</strong> sudah sesuai dengan ketentuan pada gambar?{' '}
              <span className="text-text-secondary text-xs">
                (Pasien baru pengambilan antrean Onsite/RS - diarahkan ke loket pendaftaran/Admisi sesuai nomor antrean.
                Pasien lama/Pasien MJKN - diarahkan langsung ke antrean Poli sesuai dengan nomor antrean.
                Dipastikan tidak menggunakan mekanisme menumpuk berkas).
              </span>
              <span className="text-accent-rose"> *</span>
            </label>

            {/* Gambar Alur */}
            <div className="mb-5 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-glass-border)' }}>
              <Image
                src="/images/gabungan-Pasien-Baru-dan-Lama.png"
                alt="Alur Pelayanan Peserta JKN - Pasien Baru dan Pasien Lama"
                width={900}
                height={500}
                className="w-full h-auto"
                priority
              />
            </div>

            {/* Radio: Sudah / Belum */}
            <div className="flex gap-4">
              <label
                className={clsx(
                  'flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200',
                  form.jawabanAlur === 'sudah'
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-transparent hover:border-emerald-500/30'
                )}
                style={{ borderColor: form.jawabanAlur === 'sudah' ? undefined : 'var(--color-glass-border)' }}
              >
                <input
                  type="radio"
                  name="jawabanAlur"
                  value="sudah"
                  checked={form.jawabanAlur === 'sudah'}
                  onChange={(e) => update('jawabanAlur', e.target.value)}
                  className="accent-emerald-500 w-4 h-4"
                />
                <span className="text-sm font-medium text-text-primary">Sudah</span>
              </label>

              <label
                className={clsx(
                  'flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200',
                  form.jawabanAlur === 'belum'
                    ? 'border-amber-500/60 bg-amber-500/10'
                    : 'border-transparent hover:border-amber-500/30'
                )}
                style={{ borderColor: form.jawabanAlur === 'belum' ? undefined : 'var(--color-glass-border)' }}
              >
                <input
                  type="radio"
                  name="jawabanAlur"
                  value="belum"
                  checked={form.jawabanAlur === 'belum'}
                  onChange={(e) => update('jawabanAlur', e.target.value)}
                  className="accent-amber-500 w-4 h-4"
                />
                <span className="text-sm font-medium text-text-primary">Belum</span>
              </label>
            </div>
            {errors.jawabanAlur && <p className="text-xs text-accent-rose mt-2">{errors.jawabanAlur}</p>}

            {/* ─── Conditional: "Belum" → Tanggal Komitmen ───── */}
            {form.jawabanAlur === 'belum' && (
              <div className="mt-5 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 animate-fadeIn">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Tanggal Komitmen Faskes untuk Pemenuhan <span className="text-accent-rose">*</span>
                </label>
                <input
                  type="date"
                  className={clsx('input-base w-full', errors.tanggalKomitmen && 'border-accent-rose')}
                  value={form.tanggalKomitmen}
                  onChange={(e) => update('tanggalKomitmen', e.target.value)}
                />
                {errors.tanggalKomitmen && <p className="text-xs text-accent-rose mt-1">{errors.tanggalKomitmen}</p>}
              </div>
            )}

            {/* ─── Conditional: Both → Catatan Khusus ───── */}
            {form.jawabanAlur && (
              <div className="mt-5 animate-fadeIn">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Berikan Catatan Khusus — Jelaskan Alur Antrean Pasien Saat Ini <span className="text-accent-rose">*</span>
                </label>
                <textarea
                  className={clsx('input-base w-full min-h-[120px] resize-y', errors.catatanKhusus && 'border-accent-rose')}
                  placeholder="Tuliskan catatan khusus mengenai alur antrean pasien saat ini..."
                  value={form.catatanKhusus}
                  onChange={(e) => update('catatanKhusus', e.target.value)}
                  rows={5}
                />
                {errors.catatanKhusus && <p className="text-xs text-accent-rose mt-1">{errors.catatanKhusus}</p>}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary flex items-center gap-2 px-8 py-3 text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Kunjungan
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========== HISTORY SECTION ========== */}
      <div className="glass-card-static overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full p-5 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-accent-cyan" />
            <h2 className="text-lg font-bold text-text-primary">Riwayat Kunjungan</h2>
            <span className="text-xs text-text-muted bg-white/5 px-2.5 py-0.5 rounded-full">
              {responses.length} data
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showHistory && responses.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleExportCSV(); }}
                className="btn-secondary flex items-center gap-2 text-xs px-3 py-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
            {showHistory ? (
              <ChevronUp className="w-5 h-5 text-text-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-text-muted" />
            )}
          </div>
        </button>

        {showHistory && (
          <div className="border-t animate-fadeIn" style={{ borderColor: 'var(--color-glass-border)' }}>
            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-accent-blue" />
              </div>
            ) : responses.length === 0 ? (
              <div className="text-center py-12 text-text-muted text-sm">Belum ada data kunjungan</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Pegawai</th>
                      <th>Faskes</th>
                      <th>Tgl Kunjungan</th>
                      <th>Alur Sesuai</th>
                      <th>Catatan</th>
                      <th>Tgl Komitmen</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.slice(0, 50).map((r, idx) => {
                      const d = r.response_data as Record<string, string>;
                      return (
                        <tr key={r.id}>
                          <td className="text-text-muted text-xs">{idx + 1}</td>
                          <td className="font-medium">{d.pegawai || '-'}</td>
                          <td>{d.faskes || '-'}</td>
                          <td className="text-text-secondary">{d.tanggal_kunjungan || '-'}</td>
                          <td>
                            <span className={clsx(
                              'badge',
                              d.jawaban_alur === 'sudah' && 'badge-green',
                              d.jawaban_alur === 'belum' && 'badge-amber',
                            )}>
                              {d.jawaban_alur === 'sudah' ? 'Sudah' : d.jawaban_alur === 'belum' ? 'Belum' : '-'}
                            </span>
                          </td>
                          <td className="text-text-secondary text-xs max-w-[200px] truncate" title={d.catatan_khusus || ''}>
                            {d.catatan_khusus || '-'}
                          </td>
                          <td className="text-text-secondary">{d.tanggal_komitmen || '-'}</td>
                          <td className="text-text-muted text-xs whitespace-nowrap">
                            {format(parseISO(r.submitted_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
