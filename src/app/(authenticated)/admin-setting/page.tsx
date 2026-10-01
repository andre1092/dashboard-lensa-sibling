'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2, Plus, X, Users, Shield, Eye, EyeOff, Trash2, Save,
  RefreshCw, Sparkles, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

// ─── Types ──────────────────────────────────────────────────
interface UserRecord {
  id: string;
  username?: string;
  email: string;
  password?: string;
  created_at: string;
  role: string;
  last_sign_in_at?: string | null;
}

interface NewUserForm {
  username: string;
  email: string;
  password: string;
  role: string;
}

const ROLES = ['admin', 'viewer', 'editor'];

const DEFAULT_USERS: Array<Omit<UserRecord, 'created_at'> & { created_at?: string }> = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    username: 'andreas',
    email: 'andreas@bpjs-kesehatan.go.id',
    password: 'Andreas123!',
    role: 'admin',
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    username: 'khoiron',
    email: 'khoiron@bpjs-kesehatan.go.id',
    password: 'Khoiron123!',
    role: 'editor',
  },
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    username: 'wahyuadi',
    email: 'wahyuadi@bpjs-kesehatan.go.id',
    password: 'Wahyuadi123!',
    role: 'viewer',
  },
];

// ─── Main Page ──────────────────────────────────────────────
export default function AdminSettingPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>({ username: '', email: '', password: '', role: 'viewer' });
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const supabase = createClient();

  // ─── Fetch Users ──────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) {
        console.warn('user_profiles fetch warning:', fetchErr.message);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
    } catch {
      setUsers([]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchUsers();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('user_profiles_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_profiles' },
        () => fetchUsers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUsers, supabase]);

  // ─── Seed Default Users ───────────────────────────────
  const handleSeedDefaults = async () => {
    setSeeding(true);
    setError('');
    try {
      const { error: seedErr } = await supabase
        .from('user_profiles')
        .upsert(
          DEFAULT_USERS.map((u) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            password: u.password,
            role: u.role,
          }))
        );

      if (seedErr) {
        setError('Gagal memuat akun default: ' + seedErr.message);
      } else {
        setSuccess('3 Akun Pegawai BPJS (Andreas, Khoiron, Wahyuadi) berhasil dimuat!');
        await fetchUsers();
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    }
    setSeeding(false);
  };

  // ─── Add User ─────────────────────────────────────────
  const handleAddUser = async () => {
    if (!newUser.username.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      setError('Username, email, dan password wajib diisi');
      return;
    }
    if (newUser.password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // 1. Sign up to Supabase Auth if possible
      let userId = crypto.randomUUID();
      try {
        const { data: authData } = await supabase.auth.signUp({
          email: newUser.email,
          password: newUser.password,
          options: {
            data: {
              username: newUser.username,
              password: newUser.password,
            },
          },
        });
        if (authData?.user?.id) {
          userId = authData.user.id;
        }
      } catch (authErr) {
        console.warn('Supabase auth signup notice:', authErr);
      }

      // 2. Insert into user_profiles table with plain credentials for admin supervision
      const { error: profileError } = await supabase.from('user_profiles').upsert({
        id: userId,
        username: newUser.username.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role,
      });

      if (profileError) {
        setError('Gagal menyimpan profil: ' + profileError.message);
        setSaving(false);
        return;
      }

      setSuccess(`User "${newUser.username}" berhasil ditambahkan!`);
      setShowModal(false);
      setNewUser({ username: '', email: '', password: '', role: 'viewer' });
      await fetchUsers();
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError('Gagal menambahkan user');
    }

    setSaving(false);
  };

  // ─── Delete User ──────────────────────────────────────
  const handleDeleteUser = async (userId: string, username?: string) => {
    if (!confirm(`Yakin ingin menghapus user ${username || ''}?`)) return;

    const { error: delErr } = await supabase.from('user_profiles').delete().eq('id', userId);
    if (!delErr) {
      await fetchUsers();
    }
  };

  // ─── Toggle password visibility ───────────────────────
  const togglePassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Shield className="w-6 h-6 text-accent-blue" />
            Admin Setting
          </h1>
          <p className="text-sm text-text-secondary mt-1">Kelola data login dan hak akses pengguna aplikasi</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => fetchUsers()}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl"
            title="Refresh Data"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
          {users.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border-accent-blue/30 text-accent-blue hover:bg-accent-blue/10"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Muat Akun Pegawai Default
            </button>
          )}
          <button
            onClick={() => { setShowModal(true); setError(''); }}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Tambahkan Hak Akses
          </button>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3 animate-fadeIn">
          <Save className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300 font-medium">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl border border-accent-rose/30 bg-accent-rose/10 flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-accent-rose shrink-0" />
          <p className="text-sm text-accent-rose font-medium">{error}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-card-static overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-glass-border)' }}>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-accent-cyan" />
            <h2 className="text-base font-bold text-text-primary">Daftar Pengguna</h2>
            <span className="text-xs text-text-muted bg-white/5 px-2.5 py-0.5 rounded-full font-medium">
              {users.length} users terdaftar
            </span>
          </div>
          <span className="text-xs text-text-muted hidden sm:inline">
            Klik ikon mata 👁️ untuk melihat kata sandi
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-accent-blue" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
            <p className="text-text-primary font-medium text-base">Belum ada user terdaftar di tabel</p>
            <p className="text-text-muted text-xs mt-1 max-w-md mx-auto">
              Anda bisa klik tombol &ldquo;Muat Akun Pegawai Default&rdquo; di atas untuk mengisi akun pegawai BPJS, atau klik &ldquo;Tambahkan Hak Akses&rdquo; untuk membuat user baru.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={handleSeedDefaults}
                disabled={seeding}
                className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl"
              >
                {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Muat Akun Pegawai Default (Andreas, Khoiron, Wahyuadi)
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Password</th>
                  <th>Role</th>
                  <th>Tanggal Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => {
                  const isVisible = !!showPasswords[user.id];
                  const passwordValue = user.password || '••••••••';
                  const displayUsername = user.username || user.email.split('@')[0];

                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="text-text-muted text-xs font-mono">{idx + 1}</td>
                      <td className="font-semibold text-text-primary flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg gradient-blue flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {displayUsername.charAt(0).toUpperCase()}
                        </span>
                        {displayUsername}
                      </td>
                      <td className="text-text-secondary text-sm font-mono">{user.email}</td>
                      <td>
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border" style={{ borderColor: 'var(--color-glass-border)', background: 'var(--color-bg-secondary)' }}>
                          <span className="font-mono text-xs text-text-primary tracking-wider select-all">
                            {isVisible ? passwordValue : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePassword(user.id)}
                            className="text-text-muted hover:text-accent-blue transition-colors p-0.5"
                            title={isVisible ? 'Sembunyikan password' : 'Tampilkan password'}
                          >
                            {isVisible ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className={clsx(
                          'badge uppercase text-[10px] tracking-wider font-semibold',
                          user.role === 'admin' && 'badge-blue',
                          user.role === 'editor' && 'badge-green',
                          user.role === 'viewer' && 'badge-amber',
                        )}>
                          {user.role}
                        </span>
                      </td>
                      <td className="text-text-secondary text-xs whitespace-nowrap">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '-'}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeleteUser(user.id, displayUsername)}
                          className="text-text-muted hover:text-accent-rose transition-colors p-1.5 rounded-lg hover:bg-accent-rose/10"
                          title="Hapus user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========== ADD USER MODAL ========== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scaleIn"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-glass-border)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Plus className="w-5 h-5 text-accent-blue" />
                Tambahkan Hak Akses
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="btn-icon"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl border border-accent-rose/30 bg-accent-rose/10">
                <p className="text-xs text-accent-rose">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Username <span className="text-accent-rose">*</span>
                </label>
                <input
                  type="text"
                  className="input-base w-full"
                  placeholder="contoh: andreas"
                  value={newUser.username}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Email <span className="text-accent-rose">*</span>
                </label>
                <input
                  type="email"
                  className="input-base w-full"
                  placeholder="user@bpjs-kesehatan.go.id"
                  value={newUser.email}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Password <span className="text-accent-rose">*</span>
                </label>
                <input
                  type="text"
                  className="input-base w-full font-mono"
                  placeholder="Minimal 6 karakter"
                  value={newUser.password}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                />
                <p className="text-[11px] text-text-muted mt-1">Kata sandi akan tersimpan dan dapat dilihat oleh admin</p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Role <span className="text-accent-rose">*</span>
                </label>
                <select
                  className="input-base w-full"
                  value={newUser.role}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1 py-2.5 text-sm rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddUser}
                disabled={saving}
                className="btn-primary flex-1 py-2.5 text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
