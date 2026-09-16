import React, { useState } from 'react';
import { Check, MapPin, ShieldCheck, Trash2 } from 'lucide-react';
import { Field, PageHeader } from '../components';
import { styleOptions } from '../data';

export function SettingsScreen({ profile, onSave, onDeleteAccount }) {
  const [form, setForm] = useState({ ...profile });
  const [saved, setSaved] = useState(false);
  const toggleStyle = (style) => setForm((current) => ({ ...current, styles: current.styles.includes(style) ? current.styles.filter((item) => item !== style) : [...current.styles, style] }));
  const submit = (event) => { event.preventDefault(); onSave(form); setSaved(true); window.setTimeout(() => setSaved(false), 1800); };
  return (
    <div className="page settings-page">
      <PageHeader eyebrow="Make it personal" title="Settings" description="Update what your stylist knows about you." />
      <form className="settings-stack" onSubmit={submit}>
        <section className="settings-card"><div className="settings-title"><span>01</span><div><h2>Account</h2><p>Your basic profile information.</p></div></div><div className="settings-fields"><Field label="Name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label="Email"><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field></div></section>
        <section className="settings-card"><div className="settings-title"><span>02</span><div><h2>Style profile</h2><p>Choose the aesthetics you want reflected in recommendations.</p></div></div><div className="settings-fields"><div className="settings-chips">{styleOptions.map((style) => <button type="button" key={style} className={form.styles.includes(style) ? 'selected' : ''} onClick={() => toggleStyle(style)}>{form.styles.includes(style) && <Check size={13} />}{style}</button>)}</div></div></section>
        <section className="settings-card"><div className="settings-title"><span>03</span><div><h2>Location & weather</h2><p>Used only when the forecast changes what works.</p></div></div><div className="settings-fields"><Field label="Default city"><div className="input-with-icon"><MapPin size={16} /><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></div></Field><label className="toggle-row"><input type="checkbox" checked={form.preciseLocation} onChange={(event) => setForm({ ...form, preciseLocation: event.target.checked })} /><span /><div><strong>Use precise location when available</strong><small>We ask only when you request weather-aware styling.</small></div></label></div></section>
        <section className="settings-card"><div className="settings-title"><span><ShieldCheck size={18} /></span><div><h2>Data & privacy</h2><p>Your wardrobe is personal. It stays that way.</p></div></div><div className="settings-fields privacy-copy"><p>Original photos are discarded after extraction. Only approved item cutouts and wardrobe details are retained. Images are never used to train shared models without explicit consent.</p></div></section>
        <div className="settings-save"><button className="button button-dark" type="submit">{saved ? 'Saved ✓' : 'Save settings'}</button></div>
      </form>
      <section className="danger-zone"><div><div className="eyebrow">Danger zone</div><h2>Delete account</h2><p>Permanently delete your account, wardrobe, and saved outfits.</p></div><button className="button button-danger-outline" onClick={onDeleteAccount}><Trash2 size={15} /> Delete account</button></section>
    </div>
  );
}
