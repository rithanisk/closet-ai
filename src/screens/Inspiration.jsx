import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, ImagePlus, Pencil, Pin, RefreshCw, ShieldCheck, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { Chips, EmptyState, ListInput, LoadingLine, PageHeader } from '../components';
import { api } from '../api';

const GROUPS = [
  ['aesthetics', 'Aesthetics'],
  ['palette', 'Palette'],
  ['silhouettes', 'Silhouettes'],
  ['patterns', 'Patterns'],
  ['materials', 'Materials'],
  ['accessories', 'Accessories'],
  ['signatureDetails', 'Signature details'],
];
const TEXT_FIELDS = [['layering', 'Layering'], ['proportions', 'Proportions']];
const PROFILE_KEYS = ['summary', ...GROUPS.map(([key]) => key), ...TEXT_FIELDS.map(([key]) => key)];

const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');

export function InspirationScreen({ profile: account, onProfile, onToast, confirm }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState('');
  const [boardUrl, setBoardUrl] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const fileRef = useRef(null);

  const apply = (data) => {
    setState(data);
    onProfile(data.profile, data.profileUpdatedAt);
  };

  useEffect(() => {
    let active = true;
    api('/api/inspiration').then((data) => { if (active) setState(data); }).catch((error) => { if (active) setState({ sources: [], pins: [], profile: null, profileUpdatedAt: null }); onToast(error.message); });
    return () => { active = false; };
  }, [onToast]);

  const run = async (label, request, success) => {
    setBusy(label);
    try { apply(await request()); if (success) onToast(success); return true; }
    catch (error) { onToast(error.message); return false; }
    finally { setBusy(''); }
  };

  const uploadFiles = (files) => {
    const valid = files.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 20 * 1024 * 1024).slice(0, 12);
    if (!valid.length) { onToast('Choose JPG, PNG, or WEBP images up to 20MB.'); return; }
    if (valid.length !== files.length) onToast('Some files were skipped. Up to 12 JPG, PNG, or WEBP images at a time.');
    const formData = new FormData();
    valid.forEach((file) => formData.append('files', file));
    run(`Reading ${valid.length} ${valid.length === 1 ? 'image' : 'images'} for recurring style signals…`, () => api('/api/inspiration/uploads', { method: 'POST', body: formData }), 'Inspiration added and profile updated');
  };

  const connectBoard = async (event) => {
    event.preventDefault();
    if (!boardUrl.trim()) return;
    const ok = await run('Importing the board and reading its pins…', () => api('/api/inspiration/pinterest', { method: 'POST', body: JSON.stringify({ url: boardUrl.trim() }) }), 'Board connected and profile updated');
    if (ok) setBoardUrl('');
  };

  const refreshSource = (source) => run(`Refreshing ${source.label}…`, () => api(`/api/inspiration/sources/${source.id}`, { method: 'POST' }), 'Board refreshed');
  const toggleSource = (source) => run(source.enabled ? 'Pausing source and updating profile…' : 'Resuming source and updating profile…', () => api(`/api/inspiration/sources/${source.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !source.enabled }) }));
  const removeSource = (source) => confirm({
    title: 'Remove this source?',
    body: `${source.label} and the style signals taken from it will be deleted, and your profile will be rebuilt without it.`,
    actionLabel: 'Remove source',
    onConfirm: async () => { confirm(null); await run('Removing source and rebuilding profile…', () => api(`/api/inspiration/sources/${source.id}`, { method: 'DELETE' }), 'Source removed'); },
  });
  const removePin = (pin) => run('Removing image and rebuilding profile…', () => api(`/api/inspiration/pins/${pin.id}`, { method: 'DELETE' }), 'Image removed');
  const rebuild = (reset = false) => run(reset ? 'Rebuilding from your images without manual edits…' : 'Rebuilding your profile…', () => api('/api/inspiration/profile', { method: 'POST', body: JSON.stringify({ reset }) }), 'Profile rebuilt');
  const deleteAll = () => confirm({
    title: 'Delete all inspiration data?',
    body: 'Every connected board, uploaded image, extracted style signal, and your inspiration profile will be permanently deleted.',
    actionLabel: 'Delete inspiration data',
    onConfirm: async () => { confirm(null); await run('Deleting inspiration data…', () => api('/api/inspiration/profile', { method: 'DELETE' }), 'Inspiration data deleted'); },
  });

  const startEdit = () => { setDraft(Object.fromEntries(PROFILE_KEYS.map((key) => [key, state.profile[key] ?? (key === 'summary' || TEXT_FIELDS.some(([field]) => field === key) ? '' : [])]))); setEditing(true); };
  const saveEdit = async () => {
    const ok = await run('Saving your corrections…', () => api('/api/inspiration/profile', { method: 'PUT', body: JSON.stringify({ profile: draft }) }), 'Profile updated');
    if (ok) setEditing(false);
  };

  if (!state) return <div className="page"><LoadingLine>Opening your inspiration…</LoadingLine></div>;
  const { sources, pins, profile } = state;
  const pinsBySource = new Map(sources.map((source) => [source.id, pins.filter((pin) => pin.sourceId === source.id)]));

  return (
    <div className="page inspiration-page">
      <PageHeader eyebrow="Your taste, in pictures" title="Inspiration" description="Teach your stylist your aesthetic with images you love. Closet AI looks for recurring silhouettes, colors, and layering, then uses them as a gentle nudge when styling clothes you already own." />

      {busy && <div className="busy-banner" role="status"><LoadingLine>{busy}</LoadingLine><div className="loading-rule"><span /></div></div>}

      <section className="inspiration-add-grid">
        <article className="panel inspiration-add">
          <input ref={fileRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => { uploadFiles([...event.target.files]); event.target.value = ''; }} />
          <button className="inspiration-drop" disabled={Boolean(busy)} onClick={() => fileRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!busy) uploadFiles([...event.dataTransfer.files]); }}>
            <span className="drop-icon"><ImagePlus size={23} /></span>
            <strong>Upload inspiration images</strong>
            <small>Screenshots, saved looks, editorials · up to 12 at a time</small>
          </button>
        </article>
        <form className="panel inspiration-add pinterest-card" onSubmit={connectBoard}>
          <div className="eyebrow"><Pin size={12} /> Pinterest</div>
          <h2>Connect a board</h2>
          <p>Paste a public board link. We read its public feed and pull in up to 30 recent pins.</p>
          <div className="board-input"><input value={boardUrl} onChange={(event) => setBoardUrl(event.target.value)} placeholder="https://www.pinterest.com/you/autumn-edit/" aria-label="Pinterest board link" disabled={Boolean(busy)} /><button className="button button-primary" disabled={Boolean(busy) || !boardUrl.trim()}>Connect</button></div>
        </form>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <h2>Your style profile</h2>
          {profile && !editing && <div className="header-actions"><button className="text-link" onClick={startEdit} disabled={Boolean(busy)}><Pencil size={13} /> Edit</button><button className="text-link" onClick={() => rebuild(false)} disabled={Boolean(busy)}><RefreshCw size={13} /> Rebuild</button>{profile.edited && <button className="text-link" onClick={() => rebuild(true)} disabled={Boolean(busy)}>Discard my edits</button>}</div>}
        </div>
        {!profile ? (
          <EmptyState icon={Sparkles} title="No profile yet" body="Add a few inspiration images or a Pinterest board. Your profile appears here for you to review and correct before it shapes any outfit." />
        ) : editing ? (
          <article className="panel profile-card editing">
            <label className="field"><span className="field-label">Summary</span><textarea rows="3" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
            <div className="profile-edit-grid">
              {GROUPS.map(([key, label]) => <label className="field" key={key}><span className="field-label">{label}</span><ListInput value={draft[key]} onChange={(value) => setDraft({ ...draft, [key]: value })} placeholder="Comma separated" /></label>)}
              {TEXT_FIELDS.map(([key, label]) => <label className="field" key={key}><span className="field-label">{label}</span><input value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>)}
            </div>
            <div className="modal-actions"><button className="button button-secondary" onClick={() => setEditing(false)}>Cancel</button><button className="button button-primary" onClick={saveEdit} disabled={Boolean(busy)}>Save profile</button></div>
          </article>
        ) : (
          <article className="panel profile-card">
            <div className="profile-summary">
              <p>{profile.summary}</p>
              <small>Based on {profile.imageCount || pins.length} images from {profile.sourceCount || sources.length} {(profile.sourceCount || sources.length) === 1 ? 'source' : 'sources'}{profile.edited ? ' · includes your edits' : ''} · updated {formatDate(state.profileUpdatedAt)}</small>
            </div>
            <div className="profile-groups">
              {GROUPS.map(([key, label]) => <div key={key}><small>{label}</small><Chips values={profile[key]} empty="Nothing recurring" /></div>)}
              {TEXT_FIELDS.map(([key, label]) => profile[key] ? <div key={key}><small>{label}</small><p>{profile[key]}</p></div> : null)}
            </div>
            <div className="profile-note"><ShieldCheck size={14} /> Used as a soft preference, after your constraints, the weather, and the occasion. Your stylist never copies a pinned look or assumes you own what is pictured.</div>
          </article>
        )}
      </section>

      {sources.length > 0 && (
        <section className="content-section">
          <div className="section-heading"><h2>Sources</h2><span className="muted-count">{pins.length} images</span></div>
          <div className="source-list">
            {sources.map((source) => (
              <article className={`source-card ${source.enabled ? '' : 'paused'}`} key={source.id}>
                <header>
                  <span className="source-icon">{source.kind === 'pinterest' ? <Pin size={15} /> : <Upload size={15} />}</span>
                  <div className="source-copy"><strong>{source.label}</strong><small>{source.pinCount} images · {source.kind === 'pinterest' ? `synced ${formatDate(source.syncedAt)}` : `added ${formatDate(source.createdAt)}`}{source.enabled ? '' : ' · paused'}</small></div>
                  <div className="source-actions">
                    {source.kind === 'pinterest' && <a className="icon-button" href={source.url} target="_blank" rel="noreferrer" aria-label="Open board on Pinterest"><ExternalLink size={15} /></a>}
                    {source.kind === 'pinterest' && <button className="icon-button" onClick={() => refreshSource(source)} disabled={Boolean(busy)} aria-label={`Refresh ${source.label}`}><RefreshCw size={15} /></button>}
                    <label className="toggle-row compact-toggle"><input type="checkbox" checked={source.enabled} disabled={Boolean(busy)} onChange={() => toggleSource(source)} /><span /><div><small>{source.enabled ? 'Influencing' : 'Paused'}</small></div></label>
                    <button className="icon-button danger-text" onClick={() => removeSource(source)} disabled={Boolean(busy)} aria-label={`Remove ${source.label}`}><Trash2 size={15} /></button>
                  </div>
                </header>
                <div className="pin-grid">
                  {(pinsBySource.get(source.id) || []).map((pin) => (
                    <figure className={`pin ${pin.signals?.relevant === false ? 'ignored' : ''}`} key={pin.id} title={pin.signals?.summary || pin.title}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pin.image} alt={pin.signals?.summary || pin.title || 'Inspiration image'} loading="lazy" referrerPolicy="no-referrer" />
                      {pin.signals?.relevant === false && <figcaption>No styling signal</figcaption>}
                      <button onClick={() => removePin(pin)} disabled={Boolean(busy)} aria-label="Remove this image"><X size={12} /></button>
                    </figure>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {(sources.length > 0 || profile) && (
        <section className="danger-zone"><div><div className="eyebrow">Your data</div><h2>Delete inspiration data</h2><p>Removes every board, uploaded image, extracted signal, and your inspiration profile.{account?.styles?.length ? ' Your selected aesthetics in Settings are kept.' : ''}</p></div><button className="button button-danger-soft" onClick={deleteAll} disabled={Boolean(busy)}><Trash2 size={15} /> Delete all</button></section>
      )}
    </div>
  );
}
