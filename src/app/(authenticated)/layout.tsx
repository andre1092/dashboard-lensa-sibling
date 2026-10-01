'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  FileText, BarChart3, Users, Building2, Wrench,
  LogOut, Menu, X, ChevronRight, Shield
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/form', label: 'Form LENSA-SIBLING', icon: FileText, description: 'Isi form kunjungan' },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3, description: 'Lihat analitik data' },
  { href: '/form/builder', label: 'Form Builder', icon: Wrench, description: 'Bangun & edit form' },
  { href: '/kelola-pegawai', label: 'Kelola Pegawai', icon: Users, description: 'Data ref pegawai' },
  { href: '/kelola-faskes', label: 'Kelola Faskes', icon: Building2, description: 'Data ref faskes' },
];

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-50 w-[280px] flex flex-col transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'var(--color-sidebar-bg)', borderRight: '1px solid var(--color-glass-border)' }}
      >
        {/* Logo */}
        <div className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center shadow-md">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary">LENSA-SIBLING</h1>
            <p className="text-[11px] text-text-muted">BPJS Kesehatan</p>
          </div>
          <button
            className="ml-auto lg:hidden btn-icon"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/form' && pathname.startsWith(item.href)) ||
              (item.href === '/form' && pathname === '/form');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? 'text-accent-blue'
                    : 'text-text-secondary hover:text-text-primary'
                )}
                style={{
                  background: isActive ? 'var(--color-sidebar-active)' : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--color-sidebar-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = '';
                  }
                }}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div>{item.label}</div>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--color-glass-border)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-accent-rose transition-colors w-full"
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-accent-rose-muted)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '';
            }}
          >
            <LogOut className="w-[18px] h-[18px]" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top bar (mobile) */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-30"
          style={{
            background: 'var(--color-bg-primary)',
            borderBottom: '1px solid var(--color-glass-border)',
          }}
        >
          <button
            className="btn-icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-bold text-text-primary">LENSA-SIBLING</h1>
        </header>

        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
