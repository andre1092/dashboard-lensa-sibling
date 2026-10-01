import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ─── GET: Ambil Daftar Pengguna dari auth.users via RPC ─────
export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Coba panggil fungsi RPC admin_get_users
    const { data: rpcUsers, error: rpcErr } = await supabase.rpc('admin_get_users');
    if (!rpcErr && rpcUsers) {
      return NextResponse.json({ users: rpcUsers });
    }

    // 2. Fallback jika fungsi SQL belum di-run: ambil dari user_profiles
    const { data: profileUsers, error: profErr } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    return NextResponse.json({ users: profileUsers || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: Buat Pengguna Baru di Supabase Authentication ───
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, username, role } = body;

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Email, password, dan username wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Panggil RPC admin_create_auth_user
    const { data: newId, error: rpcErr } = await supabase.rpc('admin_create_auth_user', {
      new_email: email.trim(),
      new_password: password.trim(),
      new_username: username.trim(),
      new_role: role || 'viewer',
    });

    if (!rpcErr && newId) {
      return NextResponse.json({ success: true, id: newId });
    }

    // 2. Fallback: jika RPC belum aktif, gunakan signUp + upsert
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        data: { username: username.trim(), role: role || 'viewer', password: password.trim() },
      },
    });

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    const targetId = authData.user?.id || crypto.randomUUID();
    await supabase.from('user_profiles').upsert({
      id: targetId,
      username: username.trim(),
      email: email.trim(),
      password: password.trim(),
      role: role || 'viewer',
    });

    return NextResponse.json({ success: true, id: targetId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH: Update Password Pengguna di Supabase Auth ──────
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, password } = body;

    if (!id || !password) {
      return NextResponse.json(
        { error: 'ID dan kata sandi baru wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Panggil RPC admin_update_auth_user_password
    const { error: rpcErr } = await supabase.rpc('admin_update_auth_user_password', {
      target_user_id: id,
      new_password: password.trim(),
    });

    if (!rpcErr) {
      return NextResponse.json({ success: true });
    }

    // 2. Fallback: update di user_profiles
    const { error: profErr } = await supabase
      .from('user_profiles')
      .update({ password: password.trim(), updated_at: new Date().toISOString() })
      .eq('id', id);

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE: Hapus Pengguna dari Supabase Authentication ───
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID pengguna wajib disertakan' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Panggil RPC admin_delete_auth_user
    const { error: rpcErr } = await supabase.rpc('admin_delete_auth_user', {
      target_user_id: id,
    });

    if (!rpcErr) {
      return NextResponse.json({ success: true });
    }

    // 2. Fallback: hapus dari user_profiles
    const { error: profErr } = await supabase.from('user_profiles').delete().eq('id', id);
    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
