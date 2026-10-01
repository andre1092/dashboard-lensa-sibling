-- ============================================================
-- LENSA-SIBLING — 004: Manajemen Pengguna Supabase Auth
-- Jalankan skrip ini di Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Fungsi Mengambil Daftar Pengguna dari auth.users & user_profiles
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  username TEXT,
  password TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    COALESCE(p.username, (u.raw_user_meta_data->>'username')::TEXT, SPLIT_PART(u.email, '@', 1)) AS username,
    COALESCE(p.password, (u.raw_user_meta_data->>'password')::TEXT, '••••••••') AS password,
    COALESCE(p.role, (u.raw_user_meta_data->>'role')::TEXT, 'viewer') AS role,
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN public.user_profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fungsi Menambahkan Pengguna Langsung ke auth.users (Confirmed & Siap Login)
CREATE OR REPLACE FUNCTION public.admin_create_auth_user(
  new_email TEXT,
  new_password TEXT,
  new_username TEXT,
  new_role TEXT
)
RETURNS UUID AS $$
DECLARE
  new_id UUID := gen_random_uuid();
  encrypted_pw TEXT;
BEGIN
  encrypted_pw := crypt(new_password, gen_salt('bf'));

  -- Masukkan ke auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    new_email,
    encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', new_username, 'role', new_role, 'password', new_password),
    now(),
    now()
  );

  -- Masukkan ke auth.identities agar kompatibel dengan otentikasi email/password
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    new_id,
    new_id,
    jsonb_build_object('sub', new_id::TEXT, 'email', new_email),
    'email',
    new_email,
    now(),
    now(),
    now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Sinkronkan ke public.user_profiles
  INSERT INTO public.user_profiles (id, username, email, password, role)
  VALUES (new_id, new_username, new_email, new_password, new_role)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    role = EXCLUDED.role;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fungsi Update Password Langsung di auth.users & user_profiles
CREATE OR REPLACE FUNCTION public.admin_update_auth_user_password(
  target_user_id UUID,
  new_password TEXT
)
RETURNS void AS $$
BEGIN
  -- Update kata sandi di auth.users
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{password}', to_jsonb(new_password)),
    updated_at = now()
  WHERE id = target_user_id;

  -- Update kata sandi di public.user_profiles
  UPDATE public.user_profiles
  SET 
    password = new_password,
    updated_at = now()
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fungsi Hapus Pengguna Langsung dari auth.users & user_profiles
CREATE OR REPLACE FUNCTION public.admin_delete_auth_user(
  target_user_id UUID
)
RETURNS void AS $$
BEGIN
  -- Hapus dari identities
  DELETE FROM auth.identities WHERE user_id = target_user_id;
  
  -- Hapus dari user_profiles
  DELETE FROM public.user_profiles WHERE id = target_user_id;

  -- Hapus dari auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Berikan Hak Eksekusi kepada Authenticated dan Anon
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_auth_user(TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_auth_user_password(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_auth_user(UUID) TO authenticated, anon;
