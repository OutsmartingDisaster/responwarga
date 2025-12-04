'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp, Image, Video, AlertCircle, MapPin, Link } from 'lucide-react';

export interface FormField {
  id?: string;
  field_name: string;
  field_label: string;
  field_type: string;
  placeholder?: string;
  helper_text?: string;
  options?: { value: string; label: string }[];
  is_required: boolean;
  min_length?: number;
  max_length?: number;
  max_file_size_mb?: number; // for media uploads
  allowed_formats?: string[]; // e.g., ['jpg', 'png', 'mp4']
  display_order: number;
}

interface FormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  onSave?: (field: FormField) => Promise<void>;
  onDelete?: (fieldId: string) => Promise<void>;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Teks Pendek', icon: null },
  { value: 'textarea', label: 'Teks Panjang', icon: null },
  { value: 'number', label: 'Angka', icon: null },
  { value: 'select', label: 'Dropdown', icon: null },
  { value: 'checkbox', label: 'Checkbox', icon: null },
  { value: 'radio', label: 'Radio Button', icon: null },
  { value: 'date', label: 'Tanggal', icon: null },
  { value: 'time', label: 'Waktu', icon: null },
  { value: 'email', label: 'Email', icon: null },
  { value: 'phone', label: 'Telepon', icon: null },
  { value: 'url', label: '🔗 Link/URL', icon: Link },
  { value: 'address', label: '📍 Alamat + Peta', icon: MapPin },
  { value: 'photo', label: '📷 Upload Foto', icon: Image },
  { value: 'video', label: '🎬 Upload Video', icon: Video },
  { value: 'media', label: '📎 Upload Media (Foto/Video)', icon: null },
];

const PHOTO_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'];
const VIDEO_FORMATS = ['mp4', 'mov', 'avi', 'webm', 'mkv'];

export default function FormBuilder({ fields, onChange, onSave, onDelete }: FormBuilderProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormField | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newField, setNewField] = useState<FormField>({
    field_name: '', field_label: '', field_type: 'text',
    placeholder: '', helper_text: '', options: [], is_required: false, 
    max_file_size_mb: 10, allowed_formats: [], display_order: 0
  });

  const handleAdd = async () => {
    const field = { ...newField, field_name: newField.field_label.toLowerCase().replace(/\s+/g, '_'), display_order: fields.length };
    if (onSave) await onSave(field);
    else onChange([...fields, { ...field, id: `temp-${Date.now()}` }]);
    setNewField({ field_name: '', field_label: '', field_type: 'text', placeholder: '', helper_text: '', options: [], is_required: false, display_order: 0 });
    setShowAddForm(false);
  };

  const handleEdit = (field: FormField) => {
    setEditingId(field.id || null);
    setEditForm({ ...field });
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;
    if (onSave) await onSave(editForm);
    else onChange(fields.map(f => f.id === editForm.id ? editForm : f));
    setEditingId(null);
    setEditForm(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus field ini?')) return;
    if (onDelete) await onDelete(id);
    else onChange(fields.filter(f => f.id !== id));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    newFields.forEach((f, i) => f.display_order = i);
    onChange(newFields);
  };

  const renderFieldForm = (field: FormField, setField: (f: FormField) => void, isNew = false) => (
    <div className="space-y-3 p-4 bg-slate-800/30 rounded-xl border border-white/5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Label Field *</label>
          <input type="text" value={field.field_label} onChange={e => setField({ ...field, field_label: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm" placeholder="Nama Korban" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Tipe Field</label>
          <select value={field.field_type} onChange={e => setField({ ...field, field_type: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm">
            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Placeholder</label>
        <input type="text" value={field.placeholder || ''} onChange={e => setField({ ...field, placeholder: e.target.value })}
          className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm" placeholder="Masukkan nama..." />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Teks Bantuan</label>
        <input type="text" value={field.helper_text || ''} onChange={e => setField({ ...field, helper_text: e.target.value })}
          className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm" placeholder="Penjelasan untuk field ini" />
      </div>
      {['select', 'radio', 'checkbox'].includes(field.field_type) && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Opsi (pisahkan dengan koma)</label>
          <input type="text" value={field.options?.map(o => o.label).join(', ') || ''}
            onChange={e => setField({ ...field, options: e.target.value.split(',').map(s => ({ value: s.trim().toLowerCase().replace(/\s+/g, '_'), label: s.trim() })) })}
            className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm" placeholder="Opsi 1, Opsi 2, Opsi 3" />
        </div>
      )}
      
      {/* URL Field Settings */}
      {field.field_type === 'url' && (
        <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
          <div className="flex items-center gap-2 text-xs text-blue-400">
            <Link size={14} />
            <span>User dapat memasukkan link YouTube, Google Drive, atau URL lainnya</span>
          </div>
        </div>
      )}
      
      {/* Address Field Settings */}
      {field.field_type === 'address' && (
        <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
          <div className="flex items-center gap-2 text-xs text-green-400">
            <MapPin size={14} />
            <span>Field ini akan menampilkan minimap untuk memilih lokasi + input alamat</span>
          </div>
        </div>
      )}
      
      {/* Media Upload Settings */}
      {['photo', 'video', 'media'].includes(field.field_type) && (
        <div className="space-y-3 p-3 bg-slate-900/50 rounded-lg border border-white/5">
          <div className="flex items-center gap-2 text-xs text-orange-400">
            <AlertCircle size={14} />
            <span>Video akan bypass limit upload jika lebih dari {field.max_file_size_mb || 10}MB (upload via link)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max File Size (MB)</label>
              <input type="number" value={field.max_file_size_mb ?? 10}
                onChange={e => setField({ ...field, max_file_size_mb: parseInt(e.target.value) || 10 })}
                min="1" max="100"
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Format yang diizinkan</label>
              <div className="flex flex-wrap gap-1">
                {(field.field_type === 'photo' ? PHOTO_FORMATS : 
                  field.field_type === 'video' ? VIDEO_FORMATS : 
                  [...PHOTO_FORMATS, ...VIDEO_FORMATS]).map(fmt => (
                  <label key={fmt} className="flex items-center gap-1 text-xs bg-slate-800 px-2 py-1 rounded">
                    <input type="checkbox" 
                      checked={field.allowed_formats?.includes(fmt) || false}
                      onChange={e => {
                        const formats = field.allowed_formats || [];
                        setField({ ...field, allowed_formats: e.target.checked 
                          ? [...formats, fmt] 
                          : formats.filter(f => f !== fmt) });
                      }} />
                    {fmt}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={field.is_required} onChange={e => setField({ ...field, is_required: e.target.checked })} />
        Wajib diisi
      </label>
      <div className="flex gap-2 pt-2">
        {isNew ? (
          <>
            <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 bg-slate-700 rounded-lg text-sm">Batal</button>
            <button type="button" onClick={handleAdd} disabled={!field.field_label}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm disabled:opacity-50">Tambah Field</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => { setEditingId(null); setEditForm(null); }} className="px-3 py-1.5 bg-slate-700 rounded-lg text-sm">Batal</button>
            <button type="button" onClick={handleSaveEdit} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-sm">Simpan</button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Form Fields</h3>
        {!showAddForm && (
          <button type="button" onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm">
            <Plus size={14} /> Tambah Field
          </button>
        )}
      </div>

      {showAddForm && renderFieldForm(newField, setNewField, true)}

      {fields.length === 0 && !showAddForm ? (
        <p className="text-sm text-slate-400 py-4 text-center">Belum ada custom field. Klik "Tambah Field" untuk menambahkan.</p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="bg-slate-800/40 border border-white/5 rounded-xl p-3">
              {editingId === field.id && editForm ? (
                renderFieldForm(editForm, setEditForm)
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => moveField(index, 'up')} disabled={index === 0}
                      className="p-1 hover:bg-white/10 rounded disabled:opacity-30"><ChevronUp size={14} /></button>
                    <button type="button" onClick={() => moveField(index, 'down')} disabled={index === fields.length - 1}
                      className="p-1 hover:bg-white/10 rounded disabled:opacity-30"><ChevronDown size={14} /></button>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{field.field_label} {field.is_required && <span className="text-red-400">*</span>}</p>
                    <p className="text-xs text-slate-400">{FIELD_TYPES.find(t => t.value === field.field_type)?.label || field.field_type}</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => handleEdit(field)} className="p-2 hover:bg-white/10 rounded text-slate-400"><Edit2 size={14} /></button>
                    <button type="button" onClick={() => handleDelete(field.id!)} className="p-2 hover:bg-red-500/20 rounded text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
