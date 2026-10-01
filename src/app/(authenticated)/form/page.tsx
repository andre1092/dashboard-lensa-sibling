'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FormField, FormSchema, RefPegawai, RefFaskes } from '@/lib/types';
import {
  Loader2, CheckCircle2, Star, Upload, X, ChevronDown
} from 'lucide-react';
import clsx from 'clsx';
import SignaturePad from '@/components/SignaturePad';
import { isFieldVisible, isFieldDynamicallyRequired } from '@/lib/conditional-logic';
import { updateCalculatedValues, evaluateFormula } from '@/lib/calculated-fields';

export default function FormPage() {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [refPegawai, setRefPegawai] = useState<RefPegawai[]>([]);
  const [refFaskes, setRefFaskes] = useState<RefFaskes[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch published form schema
    const { data: schemas } = await supabase
      .from('form_schemas')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: true })
      .limit(1);

    if (schemas && schemas.length > 0) {
      setSchema(schemas[0] as FormSchema);
    }

    // Fetch reference data
    const [{ data: pegawai }, { data: faskes }] = await Promise.all([
      supabase.from('ref_pegawai').select('*').eq('is_active', true).order('nama_pegawai'),
      supabase.from('ref_faskes').select('*').eq('is_active', true).order('nama_faskes'),
    ]);
    setRefPegawai(pegawai || []);
    setRefFaskes(faskes || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setValue = (fieldId: string, value: unknown) => {
    setValues((prev) => {
      const next = { ...prev, [fieldId]: value };
      return schema ? updateCalculatedValues(schema.fields, next) : next;
    });
    if (errors[fieldId]) setErrors((prev) => { const e = { ...prev }; delete e[fieldId]; return e; });
  };

  const validate = (): boolean => {
    if (!schema) return false;
    const newErrors: Record<string, string> = {};
    for (const field of schema.fields) {
      if (!isFieldVisible(field, schema.fields, values)) continue;
      if (isFieldDynamicallyRequired(field, values)) {
        const val = values[field.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[field.id] = 'Field ini wajib diisi';
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !schema) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('form_responses').insert({
      form_schema_id: schema.id,
      response_data: values,
      submitted_by: user?.id,
    });

    setSubmitting(false);
    setSubmitted(true);
  };

  const handleReset = () => {
    setValues({});
    setErrors({});
    setSubmitted(false);
  };

  const getRefOptions = (refTable: string) => {
    if (refTable === 'ref_pegawai') return refPegawai.map((p) => ({ label: p.nama_pegawai, value: p.id }));
    if (refTable === 'ref_faskes') return refFaskes.map((f) => ({ label: f.nama_faskes, value: f.id }));
    return [];
  };

  // ─── Render Field ───────────────────────────────────────
  const renderField = (field: FormField) => {
    const value = values[field.id];
    const error = errors[field.id];
    const options = field.config.refTable
      ? getRefOptions(field.config.refTable)
      : (field.config.options || []);

    switch (field.type) {
      case 'short_answer':
      case 'email':
      case 'phone':
      case 'link':
        return (
          <input
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'link' ? 'url' : 'text'}
            className={clsx('input-base', error && 'border-accent-rose')}
            value={(value as string) || ''}
            onChange={(e) => setValue(field.id, e.target.value)}
            placeholder={field.config.placeholder}
          />
        );

      case 'long_answer':
        return (
          <textarea
            className={clsx('input-base min-h-[100px] resize-y', error && 'border-accent-rose')}
            value={(value as string) || ''}
            onChange={(e) => setValue(field.id, e.target.value)}
            placeholder={field.config.placeholder}
            rows={4}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className={clsx('input-base', error && 'border-accent-rose')}
            value={(value as number) ?? ''}
            onChange={(e) => setValue(field.id, e.target.value ? Number(e.target.value) : '')}
            placeholder={field.config.placeholder}
            min={field.config.min}
            max={field.config.max}
            step={field.config.step}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            className={clsx('input-base', error && 'border-accent-rose')}
            value={(value as string) || ''}
            onChange={(e) => setValue(field.id, e.target.value)}
          />
        );

      case 'time':
        return (
          <input
            type="time"
            className={clsx('input-base', error && 'border-accent-rose')}
            value={(value as string) || ''}
            onChange={(e) => setValue(field.id, e.target.value)}
          />
        );

      case 'dropdown':
        return (
          <div className="relative">
            <select
              className={clsx('input-base appearance-none pr-10', error && 'border-accent-rose')}
              value={(value as string) || ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            >
              <option value="">{field.config.placeholder || 'Pilih...'}</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        );

      case 'multi_select':
        const selectedValues = (value as string[]) || [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 min-h-[40px] input-base">
              {selectedValues.length === 0 && <span className="text-text-muted text-sm">{field.config.placeholder || 'Pilih beberapa...'}</span>}
              {selectedValues.map((v) => {
                const opt = options.find((o) => o.value === v);
                return (
                  <span key={v} className="badge badge-blue flex items-center gap-1">
                    {opt?.label || v}
                    <button onClick={() => setValue(field.id, selectedValues.filter((sv) => sv !== v))}><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
            </div>
            <div className="max-h-[150px] overflow-y-auto space-y-1">
              {options.filter((o) => !selectedValues.includes(o.value)).map((opt) => (
                <button
                  key={opt.value}
                  className="block w-full text-left px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                  onClick={() => setValue(field.id, [...selectedValues, opt.value])}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-glass-bg-hover)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {options.map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                style={{ background: value === opt.value ? 'var(--color-accent-blue-muted)' : 'var(--color-bg-tertiary)', border: `1px solid ${value === opt.value ? 'var(--color-accent-blue)' : 'var(--color-glass-border)'}` }}>
                <input type="radio" name={field.id} value={opt.value} checked={value === opt.value}
                  onChange={() => setValue(field.id, opt.value)} className="accent-accent-blue" />
                <span className="text-sm text-text-primary">{opt.label}</span>
              </label>
            ))}
          </div>
        );

      case 'checkboxes':
        const checkedValues = (value as string[]) || [];
        return (
          <div className="space-y-2">
            {options.map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                style={{ background: checkedValues.includes(opt.value) ? 'var(--color-accent-blue-muted)' : 'var(--color-bg-tertiary)', border: `1px solid ${checkedValues.includes(opt.value) ? 'var(--color-accent-blue)' : 'var(--color-glass-border)'}` }}>
                <input type="checkbox" value={opt.value} checked={checkedValues.includes(opt.value)}
                  onChange={(e) => {
                    if (e.target.checked) setValue(field.id, [...checkedValues, opt.value]);
                    else setValue(field.id, checkedValues.filter((v) => v !== opt.value));
                  }} className="accent-accent-blue" />
                <span className="text-sm text-text-primary">{opt.label}</span>
              </label>
            ))}
          </div>
        );

      case 'rating':
        const maxStars = field.config.maxStars || 5;
        const currentRating = (value as number) || 0;
        return (
          <div className="flex items-center gap-1">
            {Array.from({ length: maxStars }, (_, i) => (
              <button
                key={i}
                onClick={() => setValue(field.id, i + 1)}
                className="transition-transform hover:scale-110"
              >
                <Star className={clsx('w-8 h-8', i < currentRating ? 'fill-accent-amber text-accent-amber' : 'text-text-muted')} />
              </button>
            ))}
            {currentRating > 0 && <span className="ml-2 text-sm text-text-secondary">{currentRating}/{maxStars}</span>}
          </div>
        );

      case 'linear_scale':
        const min = field.config.min ?? 1;
        const max = field.config.max ?? 10;
        return (
          <div>
            <div className="flex items-center gap-2 justify-between mb-1">
              <span className="text-xs text-text-muted">{field.config.scaleLabels?.start}</span>
              <span className="text-xs text-text-muted">{field.config.scaleLabels?.end}</span>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: max - min + 1 }, (_, i) => {
                const v = min + i;
                return (
                  <button
                    key={v}
                    onClick={() => setValue(field.id, v)}
                    className={clsx(
                      'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                      value === v
                        ? 'gradient-blue text-white'
                        : 'text-text-secondary'
                    )}
                    style={{ background: value !== v ? 'var(--color-bg-tertiary)' : undefined, border: `1px solid ${value === v ? 'transparent' : 'var(--color-glass-border)'}` }}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'file_upload':
        return (
          <div className="border-2 border-dashed rounded-xl p-6 text-center transition-colors"
            style={{ borderColor: error ? 'var(--color-accent-rose)' : 'var(--color-glass-border)' }}>
            <Upload className="w-8 h-8 mx-auto mb-2 text-text-muted" />
            <p className="text-sm text-text-secondary mb-2">Drag & drop file atau klik untuk memilih</p>
            <input
              type="file"
              className="hidden"
              id={`file-${field.id}`}
              accept={field.config.allowedFileTypes?.join(',')}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);
                try {
                  const res = await fetch('/api/upload', { method: 'POST', body: formData });
                  const data = await res.json();
                  if (data.success) setValue(field.id, data.file);
                } catch (err) {
                  console.error('Upload failed:', err);
                }
              }}
            />
            <label htmlFor={`file-${field.id}`} className="btn-secondary text-xs cursor-pointer inline-flex">
              Pilih File
            </label>
            {value && typeof value === 'object' && 'name' in (value as Record<string, unknown>) ? (
              <p className="mt-2 text-xs text-accent-green">✓ {(value as { name: string }).name}</p>
            ) : null}
          </div>
        );

      case 'heading': {
        const level = field.config.headingLevel || 2;
        const headingSizes: Record<number, string> = { 1: 'text-2xl', 2: 'text-xl', 3: 'text-lg' };
        const className = `${headingSizes[level]} font-bold text-text-primary`;
        if (level === 1) return <h1 className={className}>{field.label}</h1>;
        if (level === 3) return <h3 className={className}>{field.label}</h3>;
        return <h2 className={className}>{field.label}</h2>;
      }

      case 'text_block':
        return <p className="text-sm text-text-secondary leading-relaxed">{field.config.textContent}</p>;

      case 'divider':
        return <hr style={{ borderColor: 'var(--color-glass-border)' }} />;

      case 'matrix':
        const matrixValues = (value as Record<string, string>) || {};
        return (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th></th>
                  {(field.config.columns || []).map((col) => (
                    <th key={col} className="text-center">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(field.config.rows || []).map((row) => (
                  <tr key={row}>
                    <td className="font-medium text-sm">{row}</td>
                    {(field.config.columns || []).map((col) => (
                      <td key={col} className="text-center">
                        <input
                          type="radio"
                          name={`${field.id}_${row}`}
                          checked={matrixValues[row] === col}
                          onChange={() => setValue(field.id, { ...matrixValues, [row]: col })}
                          className="accent-accent-blue"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'image':
        return field.config.mediaUrl ? (
          <img src={field.config.mediaUrl} alt={field.label} className="rounded-xl max-w-full" />
        ) : <p className="text-sm text-text-muted italic">URL gambar belum diatur</p>;

      case 'video':
        return field.config.mediaUrl ? (
          <video src={field.config.mediaUrl} controls className="rounded-xl max-w-full" />
        ) : <p className="text-sm text-text-muted italic">URL video belum diatur</p>;

      case 'embed':
        return field.config.embedUrl ? (
          <iframe src={field.config.embedUrl} className="w-full h-[300px] rounded-xl border-0" allowFullScreen />
        ) : <p className="text-sm text-text-muted italic">Embed URL belum diatur</p>;

      case 'signature':
        return (
          <SignaturePad
            value={(value as string) || ''}
            onChange={(val) => setValue(field.id, val)}
          />
        );

      case 'audio':
        return field.config.mediaUrl ? (
          <audio src={field.config.mediaUrl} controls className="w-full mt-2" />
        ) : <p className="text-sm text-text-muted italic">URL audio belum diatur</p>;

      case 'calculated_field': {
        const formula = field.config.formula || '';
        const calculatedVal = evaluateFormula(formula, values);
        return (
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-sm font-semibold text-accent-blue">{calculatedVal}</span>
            {formula && <span className="text-xs text-text-muted">Formula: {formula}</span>}
          </div>
        );
      }

      default:
        return <p className="text-sm text-text-muted">Tipe field &quot;{field.type}&quot; belum didukung</p>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-8 h-8 animate-spin text-accent-blue" />
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="text-center py-40">
        <p className="text-text-secondary">Belum ada form yang dipublish.</p>
        <p className="text-text-muted text-sm mt-1">Buka Form Builder untuk membuat form baru.</p>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 animate-scaleIn">
        <div className="w-20 h-20 rounded-full gradient-green flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Berhasil!</h2>
        <p className="text-text-secondary mb-6">
          {schema.settings?.successMessage || 'Data berhasil disimpan.'}
        </p>
        <button className="btn-primary" onClick={handleReset}>
          Isi Form Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      {/* Form Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{schema.title}</h1>
        {schema.description && (
          <p className="text-sm text-text-secondary mt-2">{schema.description}</p>
        )}
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {schema.fields
          .sort((a, b) => a.order - b.order)
          .filter((field) => isFieldVisible(field, schema.fields, values))
          .map((field) => {
            const isLayout = ['heading', 'text_block', 'divider'].includes(field.type);
            const isEmbed = ['image', 'video', 'audio', 'embed'].includes(field.type);

            if (isLayout || isEmbed) {
              return (
                <div key={field.id} className="animate-fadeIn">
                  {renderField(field)}
                </div>
              );
            }

            const required = isFieldDynamicallyRequired(field, values);

            return (
              <div key={field.id} className="glass-card-static p-5 animate-fadeIn">
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {field.label}
                  {required && <span className="text-accent-rose ml-1">*</span>}
                </label>
                {field.description && (
                  <p className="text-xs text-text-muted mb-3">{field.description}</p>
                )}
                {renderField(field)}
                {errors[field.id] && (
                  <p className="text-xs text-accent-rose mt-2">{errors[field.id]}</p>
                )}
              </div>
            );
          })}
      </div>

      {/* Submit */}
      <div className="mt-8 flex justify-end">
        <button
          className="btn-primary py-3 px-8 text-base"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Menyimpan...
            </>
          ) : (
            schema.settings?.submitButtonText || 'Submit'
          )}
        </button>
      </div>
    </div>
  );
}
