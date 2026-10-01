import type { FieldType } from './types';

export interface FieldTypeDefinition {
  type: FieldType;
  label: string;
  icon: string;
  category: 'input' | 'layout' | 'embed' | 'advanced';
  description: string;
}

export const FIELD_TYPE_DEFINITIONS: FieldTypeDefinition[] = [
  // Input fields
  { type: 'short_answer', label: 'Short Answer', icon: 'Type', category: 'input', description: 'Teks pendek satu baris' },
  { type: 'long_answer', label: 'Long Answer', icon: 'AlignLeft', category: 'input', description: 'Teks panjang multi-baris' },
  { type: 'multiple_choice', label: 'Multiple Choice', icon: 'CircleDot', category: 'input', description: 'Pilih satu dari beberapa opsi' },
  { type: 'checkboxes', label: 'Checkboxes', icon: 'CheckSquare', category: 'input', description: 'Pilih satu atau lebih opsi' },
  { type: 'dropdown', label: 'Dropdown', icon: 'ChevronDown', category: 'input', description: 'Pilih dari dropdown list' },
  { type: 'multi_select', label: 'Multi-select', icon: 'ListChecks', category: 'input', description: 'Pilih beberapa dari dropdown' },
  { type: 'number', label: 'Number', icon: 'Hash', category: 'input', description: 'Input angka' },
  { type: 'date', label: 'Date', icon: 'Calendar', category: 'input', description: 'Pilih tanggal' },
  { type: 'time', label: 'Time', icon: 'Clock', category: 'input', description: 'Pilih waktu' },
  { type: 'file_upload', label: 'File Upload', icon: 'Upload', category: 'input', description: 'Unggah file/foto' },
  { type: 'linear_scale', label: 'Linear Scale', icon: 'SlidersHorizontal', category: 'input', description: 'Skala 1-10' },
  { type: 'rating', label: 'Rating', icon: 'Star', category: 'input', description: 'Rating bintang' },
  { type: 'email', label: 'Email', icon: 'Mail', category: 'input', description: 'Input alamat email' },
  { type: 'phone', label: 'Phone Number', icon: 'Phone', category: 'input', description: 'Input nomor telepon' },
  { type: 'link', label: 'Link', icon: 'Link', category: 'input', description: 'Input URL/link' },
  { type: 'signature', label: 'Signature', icon: 'PenTool', category: 'input', description: 'Tanda tangan digital' },
  { type: 'matrix', label: 'Matrix', icon: 'Grid3x3', category: 'input', description: 'Tabel matrix pilihan' },

  // Layout fields
  { type: 'heading', label: 'Heading', icon: 'Heading', category: 'layout', description: 'Judul bagian' },
  { type: 'text_block', label: 'Text', icon: 'FileText', category: 'layout', description: 'Teks deskriptif' },
  { type: 'divider', label: 'Divider', icon: 'Minus', category: 'layout', description: 'Garis pemisah' },

  // Embed fields
  { type: 'image', label: 'Image', icon: 'Image', category: 'embed', description: 'Sisipkan gambar' },
  { type: 'video', label: 'Video', icon: 'Video', category: 'embed', description: 'Sisipkan video' },
  { type: 'audio', label: 'Audio', icon: 'Volume2', category: 'embed', description: 'Sisipkan audio' },
  { type: 'embed', label: 'Embed', icon: 'Code', category: 'embed', description: 'Embed konten eksternal' },
  { type: 'calculated_field', label: 'Calculated Field', icon: 'Calculator', category: 'input', description: 'Kalkulasi otomatis dari formula' },
];

export const FIELD_CATEGORIES = [
  { id: 'input', label: 'Input Blocks', icon: 'FormInput' },
  { id: 'layout', label: 'Layout Blocks', icon: 'Layout' },
  { id: 'embed', label: 'Embed Blocks', icon: 'Code' },
] as const;

export const DEFAULT_FIELD_CONFIG: Record<string, Partial<import('./types').FieldConfig>> = {
  short_answer: { placeholder: 'Ketik jawaban...' },
  long_answer: { placeholder: 'Ketik jawaban panjang...' },
  multiple_choice: { options: [{ label: 'Opsi 1', value: 'opsi_1' }, { label: 'Opsi 2', value: 'opsi_2' }] },
  checkboxes: { options: [{ label: 'Opsi 1', value: 'opsi_1' }, { label: 'Opsi 2', value: 'opsi_2' }] },
  dropdown: { options: [], placeholder: 'Pilih...' },
  multi_select: { options: [], placeholder: 'Pilih beberapa...' },
  number: { min: 0, max: 100, step: 1, placeholder: '0' },
  date: {},
  time: {},
  file_upload: { allowedFileTypes: ['image/*', 'application/pdf'], maxFileSize: 10 },
  linear_scale: { min: 1, max: 10, scaleLabels: { start: 'Sangat Buruk', end: 'Sangat Baik' } },
  rating: { maxStars: 5 },
  email: { placeholder: 'nama@email.com' },
  phone: { placeholder: '08xxxxxxxxxx' },
  link: { placeholder: 'https://...' },
  signature: {},
  matrix: { rows: ['Baris 1', 'Baris 2'], columns: ['Kolom 1', 'Kolom 2', 'Kolom 3'] },
  heading: { headingLevel: 2, textContent: 'Heading Baru' },
  text_block: { textContent: 'Teks deskriptif di sini...' },
  divider: {},
  image: { mediaUrl: '' },
  video: { mediaUrl: '' },
  audio: { mediaUrl: '' },
  embed: { embedUrl: '' },
  calculated_field: { formula: '' },
};

export const CHART_COLORS = [
  'hsl(210, 100%, 56%)',  // Blue
  'hsl(152, 69%, 53%)',   // Green
  'hsl(38, 92%, 50%)',    // Amber
  'hsl(346, 77%, 59%)',   // Rose
  'hsl(262, 83%, 58%)',   // Purple
  'hsl(190, 90%, 50%)',   // Cyan
  'hsl(15, 85%, 57%)',    // Orange
  'hsl(320, 70%, 55%)',   // Pink
];
