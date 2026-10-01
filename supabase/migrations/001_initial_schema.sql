-- ============================================================
-- LENSA-SIBLING Dashboard — Database Schema
-- Run this SQL in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. Ref Pegawai ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ref_pegawai (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_pegawai TEXT NOT NULL,
  nip TEXT DEFAULT '',
  jabatan TEXT DEFAULT '',
  unit_kerja TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. Ref Faskes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ref_faskes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_faskes TEXT NOT NULL,
  kode_faskes TEXT DEFAULT '',
  tipe_faskes TEXT DEFAULT '',
  alamat TEXT DEFAULT '',
  kota_kabupaten TEXT DEFAULT '',
  provinsi TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. Form Schemas ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_schemas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL DEFAULT 'Form Baru',
  description TEXT DEFAULT '',
  fields JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{
    "showProgressBar": false,
    "submitButtonText": "Submit",
    "successMessage": "Terima kasih! Data berhasil disimpan.",
    "allowMultipleSubmissions": true
  }'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. Form Responses ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_schema_id UUID REFERENCES form_schemas(id) ON DELETE CASCADE,
  response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'archived')),
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 5. File Uploads ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID REFERENCES form_responses(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT '',
  file_size BIGINT DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 6. Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_form_responses_schema ON form_responses(form_schema_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_submitted_at ON form_responses(submitted_at);
CREATE INDEX IF NOT EXISTS idx_form_responses_submitted_by ON form_responses(submitted_by);
CREATE INDEX IF NOT EXISTS idx_file_uploads_response ON file_uploads(response_id);
CREATE INDEX IF NOT EXISTS idx_ref_pegawai_active ON ref_pegawai(is_active);
CREATE INDEX IF NOT EXISTS idx_ref_faskes_active ON ref_faskes(is_active);

-- ─── 7. Row Level Security ─────────────────────────────────
ALTER TABLE ref_pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_faskes ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can do everything (internal dashboard)
CREATE POLICY "Authenticated users full access on ref_pegawai"
  ON ref_pegawai FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users full access on ref_faskes"
  ON ref_faskes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users full access on form_schemas"
  ON form_schemas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users full access on form_responses"
  ON form_responses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users full access on file_uploads"
  ON file_uploads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── Public / Anon Access Policies (Untuk pengisian Form) ──
CREATE POLICY "Allow anon read published schemas"
  ON form_schemas FOR SELECT
  TO anon
  USING (is_published = true);

CREATE POLICY "Allow anon read active pegawai"
  ON ref_pegawai FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Allow anon read active faskes"
  ON ref_faskes FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Allow anon insert form responses"
  ON form_responses FOR INSERT
  TO anon
  WITH CHECK (true);

-- ─── Permissions Grant to anon & authenticated ─────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- ─── 8. Auto-update updated_at trigger ─────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_ref_pegawai_updated
  BEFORE UPDATE ON ref_pegawai
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_ref_faskes_updated
  BEFORE UPDATE ON ref_faskes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_form_schemas_updated
  BEFORE UPDATE ON form_schemas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 9. Seed Data (contoh) ─────────────────────────────────
INSERT INTO ref_pegawai (nama_pegawai, nip, jabatan, unit_kerja) VALUES
  ('Ahmad Fauzi', '199001012020011001', 'Staf Verifikator', 'Cabang Utama'),
  ('Siti Nurhaliza', '199203152021012002', 'Kepala Seksi', 'Cabang Utama'),
  ('Budi Santoso', '198705202019011003', 'Analis', 'Cabang Pembantu');

INSERT INTO ref_faskes (nama_faskes, kode_faskes, tipe_faskes, alamat, kota_kabupaten, provinsi) VALUES
  ('Puskesmas Kecamatan Menteng', 'PKM-001', 'Puskesmas', 'Jl. Menteng Raya No. 1', 'Jakarta Pusat', 'DKI Jakarta'),
  ('RS Umum Daerah Pasar Minggu', 'RSU-002', 'Rumah Sakit', 'Jl. TB Simatupang No. 5', 'Jakarta Selatan', 'DKI Jakarta'),
  ('Klinik Pratama Sehat Sentosa', 'KLN-003', 'Klinik', 'Jl. Sudirman No. 10', 'Jakarta Pusat', 'DKI Jakarta');

-- ─── 10. Default Form Schema for LENSA-SIBLING ─────────────
INSERT INTO form_schemas (title, description, fields, is_published, settings) VALUES (
  'Form LENSA-SIBLING Faskes',
  'Form kunjungan Supervisi, Bimbingan, dan Pemantauan (SiBLing) ke Fasilitas Kesehatan',
  '[
    {
      "id": "field_pegawai",
      "type": "dropdown",
      "label": "Nama Pegawai BPJS Kesehatan",
      "description": "Pilih nama pegawai yang melakukan kunjungan",
      "required": true,
      "order": 1,
      "config": {
        "refTable": "ref_pegawai",
        "refDisplayField": "nama_pegawai",
        "placeholder": "Pilih Pegawai..."
      }
    },
    {
      "id": "field_faskes",
      "type": "dropdown",
      "label": "Nama Faskes yang dilakukan SiBLing",
      "description": "Pilih faskes tujuan kunjungan",
      "required": true,
      "order": 2,
      "config": {
        "refTable": "ref_faskes",
        "refDisplayField": "nama_faskes",
        "placeholder": "Pilih Faskes..."
      }
    },
    {
      "id": "field_tanggal",
      "type": "date",
      "label": "Tanggal Kunjungan",
      "description": "Tanggal pelaksanaan kunjungan SiBLing",
      "required": true,
      "order": 3,
      "config": {}
    }
  ]'::jsonb,
  true,
  '{
    "showProgressBar": false,
    "submitButtonText": "Simpan Data Kunjungan",
    "successMessage": "Data kunjungan SiBLing berhasil disimpan!",
    "allowMultipleSubmissions": true
  }'::jsonb
);
