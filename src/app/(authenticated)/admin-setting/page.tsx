'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2, Plus, X, Users, Shield, Eye, EyeOff, Trash2, Save
} from 'lucide-react';
import clsx from 'clsx';

// ─── Types ──────────────────────────────────────────────────
interface UserRecord {
  id: string;
  email: string;
  created_at: string;
  role: string;
  last_sign_in_at: string | null;
}

interface NewUserForm {
  email: string;
  password: string;
  role: string;
}

const ROLES = ['admin', 'viewer', 'editor'];

// ─── Main Page ──────────────────────────────────────────────
export default function AdminSettingPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>({ email: '', password: '', role: 'viewer' });
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const supabase = createClient();

  // ─── Fetch Users ──────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch from a custom user_profiles table or use auth admin
      // Since Supabase client-side doesn't allow listing users,
      // we'll use a profiles table approach
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet, show empty
        console.warn('user_profiles table not found, showing empty list');
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
  }, [fetchUsers]);

  // ─── Add User ─────────────────────────────────────────
  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password) {
      setError('Email dan password wajib diisi');
      return;
    }
    if (newUser.password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Sign up the new user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });

      if (authError) {
        setError(authError.message);
        setSaving(false);
        return;
      }

      // Insert into user_profiles table
      if (authData.user) {
        await supabase.from('user_profiles').insert({
          id: authData.user.id,
          email: newUser.email,
          role: newUser.role,
        });
      }

      setSuccess('User berhasil ditambahkan!');
      setShowModal(false);
      setNewUser({ email: '', password: '', role: 'viewer' });
      fetchUsers();
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError('Gagal menambahkan user');
    }

    setSaving(false);
  };

  // ─── Delete User ──────────────────────────────────────
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Yakin ingin menghapus user ini?')) return;

    const { error } = await supabase.from('user_profiles').delete().eq('id', userId);
    if (!error) {
      fetchUsers();
    }
  };

  // ─── Toggle password visibility ───────────────────────
  const togglePassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Shield className="w-6 h-6 text-accent-blue" />
            Admin Setting
          </h1>
          <p className="text-sm text-text-secondary mt-1">Kelola hak akses pengguna aplikasi</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(''); }}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Tambahkan Hak Akses
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3 animate-fadeIn">
          <Save className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300 font-medium">{success}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-card-static overflow-hidden">
        <div className="p-5 border-b flex items-center gap-3" style={{ borderColor: 'var(--color-glass-border)' }}>
          <Users className="w-5 h-5 text-accent-cyan" />
          <h2 className="text-sm font-bold text-text-primary">Daftar Pengguna</h2>
          <span className="text-xs text-text-muted bg-white/5 px-2.5 py-0.5 rounded-full">{users.length} users</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-accent-blue" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
            <p className="text-text-muted text-sm">Belum ada user terdaftar</p>
            <p className="text-text-muted text-xs mt-1">Klik &ldquo;Tambahkan Hak Akses&rdquo; untuk menambahkan user baru</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Email / Username</th>
                  <th>Password</th>
                  <th>Role</th>
                  <th>Tanggal Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr key={user.id}>
                    <td className="text-text-muted text-xs">{idx + 1}</td>
                    <td className="font-medium">{user.email}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-text-muted text-sm font-mono">
                          {showPasswords[user.id] ? '(stored securely)' : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePassword(user.id)}
                          className="text-text-muted hover:text-text-primary transition-colors"
                        >
                          {showPasswords[user.id] ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className={clsx(
                        'badge',
                        user.role === 'admin' && 'badge-blue',
                        user.role === 'editor' && 'badge-green',
                        user.role === 'viewer' && 'badge-amber',
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="text-text-secondary text-xs">
                      {new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-text-muted hover:text-accent-rose transition-colors p-1.5 rounded-lg hover:bg-accent-rose/10"
                        title="Hapus user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========== ADD USER MODAL ========== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fadeIn"
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
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Email <span className="text-accent-rose">*</span>
                </label>
                <input
                  type="email"
                  className="input-base w-full"
                  placeholder="user@example.com"
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
                  type="password"
                  className="input-base w-full"
                  placeholder="Minimal 6 karakter"
                  value={newUser.password}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                />
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
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1 py-2.5 text-sm rounded-xl"
              >
                Batal
              </button>
              <button
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
