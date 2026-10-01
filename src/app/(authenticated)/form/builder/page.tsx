'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FormField, FormSchema, FieldType, FieldConfig } from '@/lib/types';
import { FIELD_TYPE_DEFINITIONS, FIELD_CATEGORIES, DEFAULT_FIELD_CONFIG } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Plus, Trash2, Settings, Eye, Save, Loader2,
  ChevronDown, CheckSquare, CircleDot, Type, AlignLeft, Hash,
  Calendar, Clock, Upload, Star, Mail, Phone, Link, PenTool,
  Grid3x3, Image, Video, Volume2, Code, Heading, FileText,
  Minus, SlidersHorizontal, ListChecks, Check, X, Calculator, GitFork
} from 'lucide-react';
import clsx from 'clsx';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Type, AlignLeft, CircleDot, CheckSquare, ChevronDown, ListChecks,
  Hash, Calendar, Clock, Upload, SlidersHorizontal, Star, Mail,
  Phone, Link, PenTool, Grid3x3, Heading, FileText, Minus,
  Image, Video, Volume2, Code, Calculator,
};

// ─── Sortable Field Item ────────────────────────────────────
function SortableField({
  field, isSelected, onSelect, onDelete,
}: {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldDef = FIELD_TYPE_DEFINITIONS.find((d) => d.type === field.type);
  const IconComponent = fieldDef ? ICON_MAP[fieldDef.icon] : Type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer',
        isSelected
          ? 'border-accent-blue bg-accent-blue-muted/30'
          : 'border-transparent hover:border-glass-border-hover'
      )}
      onClick={onSelect}
    >
      <button
        className="drag-handle mt-1 shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {IconComponent && <IconComponent className="w-4 h-4 text-accent-blue shrink-0" />}
          <span className="text-sm font-medium text-text-primary truncate">
            {field.label}
          </span>
          {field.required && <span className="text-accent-rose text-xs">*</span>}
          {field.config.refTable && (
            <span className="badge badge-blue text-[10px]">
              ref:{field.config.refTable === 'ref_pegawai' ? 'Pegawai' : 'Faskes'}
            </span>
          )}
          {field.config.formula && (
            <span className="badge badge-purple text-[10px]">
              formula
            </span>
          )}
          {field.config.conditions && field.config.conditions.length > 0 && (
            <span className="badge badge-amber text-[10px]">
              {field.config.conditions.length} kondisi
            </span>
          )}
        </div>
        {field.description && (
          <p className="text-xs text-text-muted truncate">{field.description}</p>
        )}
        <p className="text-[11px] text-text-muted mt-1">{fieldDef?.label}</p>
      </div>

      <button
        className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        style={{ color: 'var(--color-accent-rose)' }}
        title="Hapus field"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Property Editor ────────────────────────────────────────
function PropertyEditor({
  field, allFields = [], onChange,
}: {
  field: FormField;
  allFields?: FormField[];
  onChange: (updated: FormField) => void;
}) {
  const updateConfig = (partial: Partial<FieldConfig>) => {
    onChange({ ...field, config: { ...field.config, ...partial } });
  };

  const hasOptions = ['multiple_choice', 'checkboxes', 'dropdown', 'multi_select'].includes(field.type);

  return (
    <div className="space-y-4 animate-slideInRight">
      <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
        <Settings className="w-4 h-4 text-accent-blue" />
        Properties
      </h3>

      {/* Label */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Label</label>
        <input
          className="input-base text-sm"
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
        <input
          className="input-base text-sm"
          value={field.description || ''}
          onChange={(e) => onChange({ ...field, description: e.target.value })}
          placeholder="Helper text (opsional)"
        />
      </div>

      {/* Required */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`req-${field.id}`}
          checked={field.required}
          onChange={(e) => onChange({ ...field, required: e.target.checked })}
          className="w-4 h-4 rounded accent-accent-blue"
        />
        <label htmlFor={`req-${field.id}`} className="text-sm text-text-secondary">Wajib diisi (required)</label>
      </div>

      {/* Placeholder */}
      {['short_answer', 'long_answer', 'number', 'email', 'phone', 'link'].includes(field.type) && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Placeholder</label>
          <input
            className="input-base text-sm"
            value={field.config.placeholder || ''}
            onChange={(e) => updateConfig({ placeholder: e.target.value })}
          />
        </div>
      )}

      {/* Options for MC / Checkboxes / Dropdown / Multi-select */}
      {hasOptions && !field.config.refTable && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">Options</label>
          <div className="space-y-2">
            {(field.config.options || []).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  className="input-base text-sm flex-1"
                  value={opt.label}
                  onChange={(e) => {
                    const newOpts = [...(field.config.options || [])];
                    newOpts[idx] = { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') };
                    updateConfig({ options: newOpts });
                  }}
                />
                <button
                  className="btn-icon shrink-0"
                  onClick={() => {
                    const newOpts = (field.config.options || []).filter((_, i) => i !== idx);
                    updateConfig({ options: newOpts });
                  }}
                  style={{ color: 'var(--color-accent-rose)' }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              className="btn-secondary text-xs py-1.5 w-full"
              onClick={() => {
                const newOpts = [...(field.config.options || []), { label: `Opsi ${(field.config.options?.length || 0) + 1}`, value: `opsi_${(field.config.options?.length || 0) + 1}` }];
                updateConfig({ options: newOpts });
              }}
            >
              <Plus className="w-3 h-3" /> Tambah Opsi
            </button>
          </div>
        </div>
      )}

      {/* Ref Table for Dropdown */}
      {(field.type === 'dropdown' || field.type === 'multi_select') && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Data Source (Ref Table)</label>
          <select
            className="input-base text-sm"
            value={field.config.refTable || ''}
            onChange={(e) => updateConfig({
              refTable: e.target.value as 'ref_pegawai' | 'ref_faskes' | undefined || undefined,
              options: e.target.value ? undefined : field.config.options,
            })}
          >
            <option value="">Manual Options</option>
            <option value="ref_pegawai">Ref Pegawai (Nama Pegawai)</option>
            <option value="ref_faskes">Ref Faskes (Nama Faskes)</option>
          </select>
          {field.config.refTable && (
            <p className="text-[11px] text-accent-blue mt-1">
              ✓ Dropdown akan terisi otomatis dari data {field.config.refTable === 'ref_pegawai' ? 'Pegawai' : 'Faskes'}
            </p>
          )}
        </div>
      )}

      {/* Number config */}
      {field.type === 'number' && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Min</label>
            <input type="number" className="input-base text-sm" value={field.config.min ?? ''} onChange={(e) => updateConfig({ min: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Max</label>
            <input type="number" className="input-base text-sm" value={field.config.max ?? ''} onChange={(e) => updateConfig({ max: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Step</label>
            <input type="number" className="input-base text-sm" value={field.config.step ?? 1} onChange={(e) => updateConfig({ step: Number(e.target.value) })} />
          </div>
        </div>
      )}

      {/* Rating config */}
      {field.type === 'rating' && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Max Stars</label>
          <input type="number" className="input-base text-sm w-24" value={field.config.maxStars ?? 5} onChange={(e) => updateConfig({ maxStars: Number(e.target.value) })} min={1} max={10} />
        </div>
      )}

      {/* Linear Scale config */}
      {field.type === 'linear_scale' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Min</label>
              <input type="number" className="input-base text-sm" value={field.config.min ?? 1} onChange={(e) => updateConfig({ min: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Max</label>
              <input type="number" className="input-base text-sm" value={field.config.max ?? 10} onChange={(e) => updateConfig({ max: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Label Awal</label>
              <input className="input-base text-sm" value={field.config.scaleLabels?.start ?? ''} onChange={(e) => updateConfig({ scaleLabels: { start: e.target.value, end: field.config.scaleLabels?.end || '' } })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Label Akhir</label>
              <input className="input-base text-sm" value={field.config.scaleLabels?.end ?? ''} onChange={(e) => updateConfig({ scaleLabels: { start: field.config.scaleLabels?.start || '', end: e.target.value } })} />
            </div>
          </div>
        </>
      )}

      {/* Heading config */}
      {field.type === 'heading' && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Heading Level</label>
          <select className="input-base text-sm" value={field.config.headingLevel ?? 2} onChange={(e) => updateConfig({ headingLevel: Number(e.target.value) as 1 | 2 | 3 })}>
            <option value={1}>H1 - Besar</option>
            <option value={2}>H2 - Sedang</option>
            <option value={3}>H3 - Kecil</option>
          </select>
        </div>
      )}

      {/* Text block config */}
      {field.type === 'text_block' && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Text Content</label>
          <textarea className="input-base text-sm" rows={3} value={field.config.textContent ?? ''} onChange={(e) => updateConfig({ textContent: e.target.value })} />
        </div>
      )}

      {/* Embed/Media URL */}
      {['image', 'video', 'audio'].includes(field.type) && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">URL Media</label>
          <input className="input-base text-sm" value={field.config.mediaUrl ?? ''} onChange={(e) => updateConfig({ mediaUrl: e.target.value })} placeholder="https://..." />
        </div>
      )}
      {field.type === 'embed' && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Embed URL</label>
          <input className="input-base text-sm" value={field.config.embedUrl ?? ''} onChange={(e) => updateConfig({ embedUrl: e.target.value })} placeholder="https://..." />
        </div>
      )}

      {/* Matrix config */}
      {field.type === 'matrix' && (
        <>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Rows (Baris)</label>
            {(field.config.rows || []).map((row, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-1">
                <input className="input-base text-sm flex-1" value={row} onChange={(e) => {
                  const newRows = [...(field.config.rows || [])];
                  newRows[idx] = e.target.value;
                  updateConfig({ rows: newRows });
                }} />
                <button className="btn-icon shrink-0" onClick={() => updateConfig({ rows: (field.config.rows || []).filter((_, i) => i !== idx) })} style={{ color: 'var(--color-accent-rose)' }}><X className="w-3 h-3" /></button>
              </div>
            ))}
            <button className="btn-secondary text-xs py-1 w-full mt-1" onClick={() => updateConfig({ rows: [...(field.config.rows || []), `Baris ${(field.config.rows?.length || 0) + 1}`] })}><Plus className="w-3 h-3" /> Tambah Baris</button>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Columns (Kolom)</label>
            {(field.config.columns || []).map((col, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-1">
                <input className="input-base text-sm flex-1" value={col} onChange={(e) => {
                  const newCols = [...(field.config.columns || [])];
                  newCols[idx] = e.target.value;
                  updateConfig({ columns: newCols });
                }} />
                <button className="btn-icon shrink-0" onClick={() => updateConfig({ columns: (field.config.columns || []).filter((_, i) => i !== idx) })} style={{ color: 'var(--color-accent-rose)' }}><X className="w-3 h-3" /></button>
              </div>
            ))}
            <button className="btn-secondary text-xs py-1 w-full mt-1" onClick={() => updateConfig({ columns: [...(field.config.columns || []), `Kolom ${(field.config.columns?.length || 0) + 1}`] })}><Plus className="w-3 h-3" /> Tambah Kolom</button>
          </div>
        </>
      )}

      {/* Formula Config */}
      {(field.type === 'calculated_field' || field.type === 'number') && (
        <div className="pt-2 border-t border-white/5">
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Formula / Rumus Kalkulasi
          </label>
          <input
            className="input-base text-sm"
            value={field.config.formula || ''}
            onChange={(e) => updateConfig({ formula: e.target.value })}
            placeholder="Contoh: {field_1} * 2 + {field_2}"
          />
          <p className="text-[11px] text-text-muted mt-1">
            Gunakan kurung kurawal nama ID field, cth: &#123;id&#125;
          </p>
        </div>
      )}

      {/* Conditional Logic */}
      <div className="pt-3 border-t border-white/5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <GitFork className="w-3.5 h-3.5 text-accent-amber" />
            Conditional Logic (Visibilitas)
          </label>
          <button
            type="button"
            className="text-[11px] text-accent-blue hover:underline"
            onClick={() => {
              const currentConditions = field.config.conditions || [];
              const availableOtherFields = allFields.filter((f) => f.id !== field.id);
              const defaultTriggerId = availableOtherFields[0]?.id || '';
              updateConfig({
                conditions: [
                  ...currentConditions,
                  {
                    fieldId: defaultTriggerId,
                    operator: 'equals',
                    value: '',
                    action: 'show',
                    targetFieldId: field.id,
                  },
                ],
              });
            }}
          >
            + Tambah Kondisi
          </button>
        </div>

        {(field.config.conditions || []).length === 0 ? (
          <p className="text-[11px] text-text-muted italic">
            Belum ada aturan visibilitas (selalu tampil)
          </p>
        ) : (
          <div className="space-y-2">
            {(field.config.conditions || []).map((cond, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-text-secondary">
                    Aturan #{idx + 1}
                  </span>
                  <button
                    type="button"
                    className="text-accent-rose hover:opacity-80 p-0.5"
                    onClick={() => {
                      const updated = (field.config.conditions || []).filter((_, i) => i !== idx);
                      updateConfig({ conditions: updated });
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[10px] text-text-muted mb-0.5">Aksi</label>
                    <select
                      className="input-base text-xs py-1"
                      value={cond.action}
                      onChange={(e) => {
                        const updated = [...(field.config.conditions || [])];
                        updated[idx] = { ...updated[idx], action: e.target.value as 'show' | 'hide' | 'require' };
                        updateConfig({ conditions: updated });
                      }}
                    >
                      <option value="show">Tampilkan jika</option>
                      <option value="hide">Sembunyikan jika</option>
                      <option value="require">Wajibkan jika</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-text-muted mb-0.5">Field Pemicu</label>
                    <select
                      className="input-base text-xs py-1"
                      value={cond.fieldId}
                      onChange={(e) => {
                        const updated = [...(field.config.conditions || [])];
                        updated[idx] = { ...updated[idx], fieldId: e.target.value };
                        updateConfig({ conditions: updated });
                      }}
                    >
                      {allFields
                        .filter((f) => f.id !== field.id)
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label || f.type}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[10px] text-text-muted mb-0.5">Operator</label>
                    <select
                      className="input-base text-xs py-1"
                      value={cond.operator}
                      onChange={(e) => {
                        const updated = [...(field.config.conditions || [])];
                        updated[idx] = {
                          ...updated[idx],
                          operator: e.target.value as typeof cond.operator,
                        };
                        updateConfig({ conditions: updated });
                      }}
                    >
                      <option value="equals">Sama dengan (=)</option>
                      <option value="not_equals">Tidak sama dengan (!=)</option>
                      <option value="contains">Mengandung teks</option>
                      <option value="greater_than">Lebih besar dari (&gt;)</option>
                      <option value="less_than">Lebih kecil dari (&lt;)</option>
                      <option value="is_not_empty">Tidak kosong</option>
                      <option value="is_empty">Kosong</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-text-muted mb-0.5">Nilai Target</label>
                    <input
                      className="input-base text-xs py-1"
                      value={cond.value}
                      disabled={cond.operator === 'is_empty' || cond.operator === 'is_not_empty'}
                      placeholder="Nilai..."
                      onChange={(e) => {
                        const updated = [...(field.config.conditions || [])];
                        updated[idx] = { ...updated[idx], value: e.target.value };
                        updateConfig({ conditions: updated });
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Form Builder Page ─────────────────────────────────
export default function FormBuilderPage() {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('Form LENSA-SIBLING Faskes');
  const [description, setDescription] = useState('');

  const supabase = createClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchSchema = useCallback(async () => {
    setLoading(true);
    const { data: schemas } = await supabase
      .from('form_schemas')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1);

    if (schemas && schemas.length > 0) {
      const s = schemas[0] as FormSchema;
      setSchema(s);
      setFields(s.fields || []);
      setTitle(s.title);
      setDescription(s.description);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchSchema(); }, [fetchSchema]);

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const addField = (type: FieldType) => {
    const def = FIELD_TYPE_DEFINITIONS.find((d) => d.type === type);
    const newField: FormField = {
      id: uuidv4(),
      type,
      label: def?.label || 'New Field',
      description: '',
      required: false,
      order: fields.length + 1,
      config: { ...(DEFAULT_FIELD_CONFIG[type] || {}) },
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const updateField = (updated: FormField) => {
    setFields(fields.map((f) => f.id === updated.id ? updated : f));
  };

  const deleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      const newFields = arrayMove(fields, oldIndex, newIndex).map((f, i) => ({ ...f, order: i + 1 }));
      setFields(newFields);
    }
  };

  const handleSave = async (publish: boolean = false) => {
    setSaving(true);
    const payload = {
      title,
      description,
      fields,
      is_published: publish || schema?.is_published || false,
    };

    if (schema) {
      await supabase.from('form_schemas').update(payload).eq('id', schema.id);
    } else {
      const { data } = await supabase.from('form_schemas').insert(payload).select().single();
      if (data) setSchema(data as FormSchema);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-8 h-8 animate-spin text-accent-blue" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Form Builder</h1>
          <p className="text-sm text-text-secondary mt-1">Drag & drop untuk membangun form kunjungan</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/form"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            <Eye className="w-4 h-4" />
            Lihat Form
          </a>
          <button className="btn-secondary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Draft
          </button>
          <button className="btn-primary" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Publish
          </button>
        </div>
      </div>

      {/* Form Title & Description */}
      <div className="glass-card-static p-5 mb-6">
        <input
          className="input-base text-lg font-bold mb-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Judul Form"
        />
        <input
          className="input-base text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi form (opsional)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Field Palette (left) */}
        <div className="lg:col-span-3">
          <div className="glass-card-static p-4 sticky top-4">
            <h3 className="text-sm font-bold text-text-primary mb-3">Tambah Field</h3>
            {FIELD_CATEGORIES.map((cat) => (
              <div key={cat.id} className="mb-4">
                <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                  {cat.label}
                </h4>
                <div className="space-y-1">
                  {FIELD_TYPE_DEFINITIONS.filter((f) => f.category === cat.id).map((fieldDef) => {
                    const Icon = ICON_MAP[fieldDef.icon] || Type;
                    return (
                      <button
                        key={fieldDef.type}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors text-left"
                        onClick={() => addField(fieldDef.type)}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'var(--color-sidebar-hover)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = '';
                        }}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{fieldDef.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Canvas (center) */}
        <div className="lg:col-span-5">
          <div className="glass-card-static p-4 min-h-[400px]">
            {fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl gradient-blue flex items-center justify-center mb-4 opacity-50">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <p className="text-text-secondary text-sm mb-1">Form masih kosong</p>
                <p className="text-text-muted text-xs">Klik field di panel kiri untuk menambahkan</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {fields.map((field) => (
                      <SortableField
                        key={field.id}
                        field={field}
                        isSelected={selectedFieldId === field.id}
                        onSelect={() => setSelectedFieldId(field.id)}
                        onDelete={() => deleteField(field.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        {/* Property Editor (right) */}
        <div className="lg:col-span-4">
          <div className="glass-card-static p-4 sticky top-4">
            {selectedField ? (
              <PropertyEditor field={selectedField} allFields={fields} onChange={updateField} />
            ) : (
              <div className="text-center py-10 text-text-muted text-sm">
                <Settings className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>Pilih field untuk mengedit properties</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
