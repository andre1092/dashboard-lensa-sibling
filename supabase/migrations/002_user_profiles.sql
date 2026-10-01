-- ============================================================
-- LENSA-SIBLING — User Profiles Table
-- Run this SQL in Supabase SQL Editor AFTER 001_initial_schema.sql
-- ============================================================

-- ─── User Profiles table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── RLS Policies ───────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all profiles
CREATE POLICY "user_profiles_select" ON user_profiles
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert profiles
CREATE POLICY "user_profiles_insert" ON user_profiles
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update their own profile
CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Allow authenticated users to delete profiles
CREATE POLICY "user_profiles_delete" ON user_profiles
  FOR DELETE TO authenticated USING (true);

-- Allow anonymous access for read (if needed)
CREATE POLICY "user_profiles_anon_select" ON user_profiles
  FOR SELECT TO anon USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;

-- ─── Auto-create profile on signup (trigger) ────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'viewer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
