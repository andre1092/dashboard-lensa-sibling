'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RefFaskes } from '@/lib/types';
import { Plus, Pencil, Trash2, Search, Loader2, Building, Building2 } from 'lucide-react';

const TIPE_FASKES_OPTIONS = ['Puskesmas', 'Rumah Sakit', 'Klinik', 'Apotek', 'Laboratorium', 'Optik', 'Lainnya'];
const PROVINSI_OPTIONS = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Jambi', 'Sumatera Selatan',
  'Bengkulu', 'Lampung', 'Kep. Bangka Belitung', 'Kep. Riau', 'DKI Jakarta',
  'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur', 'Banten',
  'Bali', 'NTB', 'NTT', 'Kalimantan Barat', 'Kalimantan Tengah',
  'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan', 'Sulawesi Tenggara',
  'Gorontalo', 'Sulawesi Barat', 'Maluku', 'Maluku Utara', 'Papua',
  'Papua Barat', 'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan', 'Papua Barat Daya',
];

export default function KelolaFaskesPage() {
  const [data, setData] = useState<RefFaskes[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<RefFaskes | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nama_faskes: '',
    kode_faskes: '',
    tipe_faskes: '',
    alamat: '',
    kota_kabupaten: '',
    provinsi: '',
    is_active: true,
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from('ref_faskes')
      .select('*')
      .order('nama_faskes');
    setData(rows || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = data.filter((item) =>
    item.nama_faskes.toLowerCase().includes(search.toLowerCase()) ||
    item.kode_faskes.toLowerCase().includes(search.toLowerCase()) ||
    item.tipe_faskes.toLowerCase().includes(search.toLowerCase()) ||
    item.kota_kabupaten.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditItem(null);
    setForm({ nama_faskes: '', kode_faskes: '', tipe_faskes: '', alamat: '', kota_kabupaten: '', provinsi: '', is_active: true });
    setModalOpen(true);
  };

  const openEdit = (item: RefFaskes) => {
    setEditItem(item);
    setForm({
      nama_faskes: item.nama_faskes,
      kode_faskes: item.kode_faskes,
      tipe_faskes: item.tipe_faskes,
      alamat: item.alamat,
      kota_kabupaten: item.kota_kabupaten,
      provinsi: item.provinsi,
      is_active: item.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editItem) {
      await supabase.from('ref_faskes').update(form).eq('id', editItem.id);
    } else {
      await supabase.from('ref_faskes').insert(form);
    }
    setSaving(false);
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data faskes ini?')) return;
    await supabase.from('ref_faskes').delete().eq('id', id);
    fetchData();
  };

  const getTipeBadgeClass = (tipe: string) => {
    switch (tipe) {
      case 'Puskesmas': return 'badge-green';
      case 'Rumah Sakit': return 'badge-blue';
      case 'Klinik': return 'badge-amber';
      default: return 'badge-rose';
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Kelola Faskes</h1>
          <p className="text-sm text-text-secondary mt-1">
            Data referensi Fasilitas Kesehatan untuk dropdown Form
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Tambah Faskes
        </button>
      </div>

      {/* Search */}
      <div className="glass-card-static p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari faskes berdasarkan nama, kode, tipe, kota..."
            className="input-base pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card-static overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-accent-blue" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-text-secondary">
            {search ? 'Tidak ada data yang cocok.' : 'Belum ada data faskes. Klik "Tambah Faskes" untuk memulai.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama Faskes</th>
                  <th>Kode</th>
                  <th>Tipe</th>
                  <th>Kota / Kab</th>
                  <th>Provinsi</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium">
                      <div className="flex items-center gap-2">
                        {item.tipe_faskes === 'Rumah Sakit' ? <Building2 className="w-4 h-4 text-accent-blue shrink-0" /> : <Building className="w-4 h-4 text-accent-green shrink-0" />}
                        {item.nama_faskes}
                      </div>
                    </td>
                    <td className="text-text-secondary font-mono text-xs">{item.kode_faskes || '-'}</td>
                    <td><span className={`badge ${getTipeBadgeClass(item.tipe_faskes)}`}>{item.tipe_faskes || '-'}</span></td>
                    <td className="text-text-secondary">{item.kota_kabupaten || '-'}</td>
                    <td className="text-text-secondary">{item.provinsi || '-'}</td>
                    <td>
                      <span className={`badge ${item.is_active ? 'badge-green' : 'badge-rose'}`}>
                        {item.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button className="btn-icon" onClick={() => openEdit(item)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="btn-icon" onClick={() => handleDelete(item.id)} title="Hapus"
                          style={{ color: 'var(--color-accent-rose)' }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <h2 className="text-lg font-bold text-text-primary mb-5">
              {editItem ? 'Edit Faskes' : 'Tambah Faskes Baru'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Nama Faskes *</label>
                <input
                  className="input-base"
                  value={form.nama_faskes}
                  onChange={(e) => setForm({ ...form, nama_faskes: e.target.value })}
                  placeholder="Nama lengkap fasilitas kesehatan"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Kode Faskes</label>
                  <input
                    className="input-base"
                    value={form.kode_faskes}
                    onChange={(e) => setForm({ ...form, kode_faskes: e.target.value })}
                    placeholder="PKM-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Tipe Faskes</label>
                  <select
                    className="input-base"
                    value={form.tipe_faskes}
                    onChange={(e) => setForm({ ...form, tipe_faskes: e.target.value })}
                  >
                    <option value="">Pilih tipe...</option>
                    {TIPE_FASKES_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Alamat</label>
                <input
                  className="input-base"
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  placeholder="Alamat lengkap"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Kota / Kabupaten</label>
                  <input
                    className="input-base"
                    value={form.kota_kabupaten}
                    onChange={(e) => setForm({ ...form, kota_kabupaten: e.target.value })}
                    placeholder="Jakarta Pusat"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Provinsi</label>
                  <select
                    className="input-base"
                    value={form.provinsi}
                    onChange={(e) => setForm({ ...form, provinsi: e.target.value })}
                  >
                    <option value="">Pilih provinsi...</option>
                    {PROVINSI_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded accent-accent-blue"
                />
                <label htmlFor="is_active" className="text-sm text-text-secondary">Status Aktif</label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !form.nama_faskes.trim()}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editItem ? 'Simpan Perubahan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
