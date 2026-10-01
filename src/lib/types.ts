/* ============================================================
   LENSA-SIBLING Dashboard — Type Definitions
   ============================================================ */

// ─── Field Types ────────────────────────────────────────────
export type FieldType =
  | 'short_answer'
  | 'long_answer'
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'multi_select'
  | 'number'
  | 'date'
  | 'time'
  | 'file_upload'
  | 'linear_scale'
  | 'rating'
  | 'email'
  | 'phone'
  | 'link'
  | 'signature'
  | 'matrix'
  | 'image'
  | 'video'
  | 'audio'
  | 'embed'
  | 'heading'
  | 'text_block'
  | 'divider'
  | 'calculated_field';

export interface FieldOption {
  label: string;
  value: string;
}

export interface ConditionalRule {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: string | number;
  action: 'show' | 'hide' | 'require';
  targetFieldId: string;
}

export interface FieldConfig {
  placeholder?: string;
  options?: FieldOption[];
  min?: number;
  max?: number;
  step?: number;
  rows?: string[];
  columns?: string[];
  maxStars?: number;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  refTable?: 'ref_pegawai' | 'ref_faskes';
  refDisplayField?: string;
  formula?: string;
  conditions?: ConditionalRule[];
  embedUrl?: string;
  mediaUrl?: string;
  scaleLabels?: { start: string; end: string };
  headingLevel?: 1 | 2 | 3;
  textContent?: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  required: boolean;
  order: number;
  config: FieldConfig;
}

// ─── Database Models ────────────────────────────────────────
export interface RefPegawai {
  id: string;
  nama_pegawai: string;
  nip: string;
  jabatan: string;
  unit_kerja: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RefFaskes {
  id: string;
  nama_faskes: string;
  kode_faskes: string;
  tipe_faskes: string;
  alamat: string;
  kota_kabupaten: string;
  provinsi: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormSchema {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  settings: FormSettings;
  created_by: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormSettings {
  showProgressBar: boolean;
  submitButtonText: string;
  successMessage: string;
  allowMultipleSubmissions: boolean;
}

export interface FormResponse {
  id: string;
  form_schema_id: string;
  response_data: Record<string, unknown>;
  submitted_by: string;
  status: 'submitted' | 'reviewed' | 'archived';
  submitted_at: string;
}

export interface FileUpload {
  id: string;
  response_id: string;
  field_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

// ─── Dashboard Types ────────────────────────────────────────
export interface KpiData {
  totalResponses: number;
  monthlyResponses: number;
  totalFaskesVisited: number;
  activePegawai: number;
}

export interface TrendDataPoint {
  month: string;
  count: number;
}

export interface DistributionDataPoint {
  name: string;
  value: number;
  color: string;
}

// ─── UI State ───────────────────────────────────────────────
export interface TabItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

export type ModalMode = 'create' | 'edit' | 'view';
