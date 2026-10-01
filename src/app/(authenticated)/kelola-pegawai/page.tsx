'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RefPegawai } from '@/lib/types';
import { Plus, Pencil, Trash2, Search, Loader2, UserCheck, UserX } from 'lucide-react';

export default function KelolaPegawaiPage() {
  const [data, setData] = useState<RefPegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<RefPegawai | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nama_pegawai: '',
    nip: '',
    jabatan: '',
    unit_kerja: '',
    is_active: true,
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from('ref_pegawai')
      .select('*')
      .order('nama_pegawai');
    setData(rows || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = data.filter((item) =>
    item.nama_pegawai.toLowerCase().includes(search.toLowerCase()) ||
    item.nip.toLowerCase().includes(search.toLowerCase()) ||
    item.jabatan.toLowerCase().includes(search.toLowerCase()) ||
    item.unit_kerja.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditItem(null);
    setForm({ nama_pegawai: '', nip: '', jabatan: '', unit_kerja: '', is_active: true });
    setModalOpen(true);
  };

  const openEdit = (item: RefPegawai) => {
    setEditItem(item);
    setForm({
      nama_pegawai: item.nama_pegawai,
      nip: item.nip,
      jabatan: item.jabatan,
      unit_kerja: item.unit_kerja,
      is_active: item.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editItem) {
      await supabase.from('ref_pegawai').update(form).eq('id', editItem.id);
    } else {
      await supabase.from('ref_pegawai').insert(form);
    }
    setSaving(false);
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data pegawai ini?')) return;
    await supabase.from('ref_pegawai').delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Kelola Pegawai</h1>
          <p className="text-sm text-text-secondary mt-1">
            Data referensi pegawai BPJS Kesehatan untuk dropdown Form
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Tambah Pegawai
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
            placeholder="Cari pegawai berdasarkan nama, NIP, jabatan..."
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
            {search ? 'Tidak ada data yang cocok dengan pencarian.' : 'Belum ada data pegawai. Klik "Tambah Pegawai" untuk memulai.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama Pegawai</th>
                  <th>NIP</th>
                  <th>Jabatan</th>
                  <th>Unit Kerja</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium">{item.nama_pegawai}</td>
                    <td className="text-text-secondary font-mono text-xs">{item.nip || '-'}</td>
                    <td className="text-text-secondary">{item.jabatan || '-'}</td>
                    <td className="text-text-secondary">{item.unit_kerja || '-'}</td>
                    <td>
                      {item.is_active ? (
                        <span className="badge badge-green"><UserCheck className="w-3 h-3 mr-1" />Aktif</span>
                      ) : (
                        <span className="badge badge-rose"><UserX className="w-3 h-3 mr-1" />Nonaktif</span>
                      )}
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-text-primary mb-5">
              {editItem ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Nama Pegawai *</label>
                <input
                  className="input-base"
                  value={form.nama_pegawai}
                  onChange={(e) => setForm({ ...form, nama_pegawai: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">NIP</label>
                <input
                  className="input-base"
                  value={form.nip}
                  onChange={(e) => setForm({ ...form, nip: e.target.value })}
                  placeholder="Nomor Induk Pegawai"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Jabatan</label>
                <input
                  className="input-base"
                  value={form.jabatan}
                  onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                  placeholder="Jabatan pegawai"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Unit Kerja</label>
                <input
                  className="input-base"
                  value={form.unit_kerja}
                  onChange={(e) => setForm({ ...form, unit_kerja: e.target.value })}
                  placeholder="Unit kerja / cabang"
                />
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
                disabled={saving || !form.nama_pegawai.trim()}
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
