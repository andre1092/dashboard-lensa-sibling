-- ============================================================
-- LENSA-SIBLING — Update User Profiles (Username & Password)
-- Jalankan skrip ini di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom username dan password ke user_profiles jika belum ada
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT;

-- 2. Pastikan foreign key ke auth.users bersifat opsional atau nullable jika id bukan auth user
ALTER TABLE public.user_profiles 
  ALTER COLUMN id DROP DEFAULT;

-- 3. Sinkronisasi pengguna yang sudah ada di auth.users ke user_profiles
INSERT INTO public.user_profiles (id, email, username, password, role)
SELECT 
  u.id, 
  u.email, 
  COALESCE(SPLIT_PART(u.email, '@', 1), 'admin') AS username,
  'Admin@123' AS password,
  'admin' AS role
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  username = COALESCE(user_profiles.username, EXCLUDED.username),
  password = COALESCE(user_profiles.password, EXCLUDED.password);

-- 4. Masukkan data pengguna default pegawai BPJS jika belum ada
INSERT INTO public.user_profiles (id, username, email, password, role) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'andreas', 'andreas@bpjs-kesehatan.go.id', 'Andreas123!', 'admin'),
  ('a2222222-2222-2222-2222-222222222222', 'khoiron', 'khoiron@bpjs-kesehatan.go.id', 'Khoiron123!', 'editor'),
  ('a3333333-3333-3333-3333-333333333333', 'wahyuadi', 'wahyuadi@bpjs-kesehatan.go.id', 'Wahyuadi123!', 'viewer')
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  role = EXCLUDED.role;

-- 5. Perbarui fungsi trigger on_auth_user_created agar juga mencatat username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, username, password, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'password', '••••••••'),
    'viewer'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(user_profiles.username, EXCLUDED.username),
    password = COALESCE(user_profiles.password, EXCLUDED.password);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
