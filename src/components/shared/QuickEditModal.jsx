import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATUSES = [
  'por contactar','contactado','follow up 1','follow up 2',
  'follow up 3','follow up 4','follow up 5','connection','archivado','eliminado'
];
const RE_DMS = ['yes','no','unknown'];

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-[#71717a] mb-1 block">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#27272a] border border-[#3f3f46] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors";

export default function QuickEditModal({ producer, producerType, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (producer) setForm({ ...producer });
  }, [producer]);

  if (!producer) return null;

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    const entity = producerType === 'yt'
      ? base44.entities.YouTubeProducer
      : base44.entities.PlacementProducer;
    await entity.update(producer.id, form);
    toast.success('Productor actualizado');
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#18181b] border border-[#27272a] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a] sticky top-0 bg-[#18181b] z-10">
          <div>
            <h2 className="text-base font-semibold text-white">{form.name || 'Edit Producer'}</h2>
            <p className="text-xs text-[#71717a] mt-0.5">{producerType === 'yt' ? 'YouTube' : 'Placement'} Producer</p>
          </div>
          <button onClick={onClose} className="text-[#71717a] hover:text-white transition-colors p-1 rounded-lg hover:bg-[#27272a]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <Field label="Nombre">
            <input className={inputCls} value={form.name || ''} onChange={e => set('name', e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select className={inputCls} value={form.status || ''} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Re-DMs">
              <select className={inputCls} value={form.re_dms || 'unknown'} onChange={e => set('re_dms', e.target.value)}>
                {RE_DMS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Instagram">
              <input className={inputCls} value={form.instagram || ''} onChange={e => set('instagram', e.target.value)} />
            </Field>
            <Field label="Email">
              <input className={inputCls} value={form.email || ''} onChange={e => set('email', e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Priority">
              <input className={inputCls} type="number" value={form.priority || ''} onChange={e => set('priority', Number(e.target.value))} min={1} max={producerType === 'yt' ? 8 : 10} />
            </Field>
            <Field label="Followers IG">
              <input className={inputCls} type="number" value={form.followers_ig || ''} onChange={e => set('followers_ig', Number(e.target.value))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Último contacto">
              <input className={inputCls} type="date" value={form.last_action || ''} onChange={e => set('last_action', e.target.value)} />
            </Field>
            <Field label="Próximo follow up">
              <input className={inputCls} type="date" value={form.next_follow_up || ''} onChange={e => set('next_follow_up', e.target.value)} />
            </Field>
          </div>

          {producerType === 'yt' && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="YouTube Channel">
                <input className={inputCls} value={form.youtube_channel || ''} onChange={e => set('youtube_channel', e.target.value)} />
              </Field>
              <Field label="Subscribers">
                <input className={inputCls} type="number" value={form.youtube_subscribers || ''} onChange={e => set('youtube_subscribers', Number(e.target.value))} />
              </Field>
            </div>
          )}

          {producerType === 'pl' && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Artist">
                <input className={inputCls} value={form.artist || ''} onChange={e => set('artist', e.target.value)} />
              </Field>
              <Field label="Song">
                <input className={inputCls} value={form.song || ''} onChange={e => set('song', e.target.value)} />
              </Field>
            </div>
          )}

          <Field label="Style">
            <input className={inputCls} value={form.style || ''} onChange={e => set('style', e.target.value)} />
          </Field>

          <Field label="Notas">
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </Field>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#27272a] sticky bottom-0 bg-[#18181b] flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="text-[#71717a] hover:text-white">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#2563eb] hover:bg-[#3b82f6] text-white">
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}