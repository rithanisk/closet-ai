import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, RotateCcw, ShieldCheck, Shirt, Sparkles, Trash2, X } from 'lucide-react';
import { ItemVisual, LoadingLine, PageHeader } from '../components';
import { api } from '../api';
import { CATEGORIES } from '../shared/wardrobe';
import { sortHeadToToe, zoneFor } from '../shared/flatlay';

const VIEWS = [['front', 'Front'], ['side', 'Side'], ['back', 'Back']];
// Zones where a new piece replaces the old one instead of layering over it.
const SINGLE_ZONES = new Set(['bottom', 'feet', 'onepiece', 'head', 'bag']);
const keyFor = (ids, view) => `${view}:${[...ids].sort().join(',')}`;

export function FittingRoomScreen({ wardrobe, pending, onConsumePending, onToast, confirm, onUpload }) {
  const [state, setState] = useState(null);
  const [view, setView] = useState('front');
  const [selected, setSelected] = useState([]);
  const [renders, setRenders] = useState({});
  const [rendering, setRendering] = useState(false);
  const [preparingViews, setPreparingViews] = useState(false);
  const [rack, setRack] = useState('All');
  const [retaking, setRetaking] = useState(false);
  const queued = useRef(null);
  const busy = useRef(false);
  const dragStart = useRef(null);

  const byId = useMemo(() => new Map(wardrobe.map((item) => [item.id, item])), [wardrobe]);
  const avatar = state?.avatar;
  const available = wardrobe.filter((item) => item.available && item.image);
  const rackCategories = ['All', ...CATEGORIES.filter((category) => available.some((item) => item.category === category))];
  const rackItems = rack === 'All' ? available : available.filter((item) => item.category === rack);
  const wearing = sortHeadToToe(selected.map((id) => byId.get(id)).filter(Boolean));

  const prepareViews = useCallback(async () => {
    setPreparingViews(true);
    try { setState(await api('/api/avatar/views', { method: 'POST' })); }
    catch (error) { onToast(error.message); }
    finally { setPreparingViews(false); }
  }, [onToast]);

  useEffect(() => {
    let active = true;
    api('/api/avatar').then((data) => {
      if (!active) return;
      setState(data);
      if (data.avatar && (!data.avatar.views.side || !data.avatar.views.back)) prepareViews();
    }).catch((error) => { if (active) { setState({ avatar: null, looks: [] }); onToast(error.message); } });
    return () => { active = false; };
  }, [onToast, prepareViews]);

  /** Render the current selection. While one render runs, only the latest request is queued. */
  const render = useCallback(async (ids, renderView) => {
    if (!ids.length) return;
    const key = keyFor(ids, renderView);
    if (renders[key]) return;
    if (busy.current) { queued.current = { ids, view: renderView }; return; }
    busy.current = true;
    setRendering(true);
    try {
      const data = await api('/api/try-on', { method: 'POST', body: JSON.stringify({ itemIds: ids, view: renderView }) });
      setRenders((current) => ({ ...current, [key]: data.image }));
      setState((current) => (current ? { ...current, looks: data.looks } : current));
    } catch (error) { onToast(error.message); }
    finally {
      busy.current = false;
      setRendering(false);
      const next = queued.current;
      queued.current = null;
      if (next) render(next.ids, next.view);
    }
  }, [renders, onToast]);

  useEffect(() => {
    if (!pending || !avatar) return;
    const ids = pending.itemIds.filter((id) => byId.has(id)).slice(0, 8);
    setSelected(ids);
    setView('front');
    render(ids, 'front');
    onConsumePending();
  }, [pending, avatar, byId, render, onConsumePending]);

  const toggle = (item) => {
    let next;
    if (selected.includes(item.id)) next = selected.filter((id) => id !== item.id);
    else {
      const zone = zoneFor(item.category);
      const clashes = (other) => {
        const otherZone = zoneFor(byId.get(other)?.category);
        if (zone === 'onepiece') return ['top', 'bottom', 'onepiece'].includes(otherZone);
        if (otherZone === 'onepiece') return ['top', 'bottom'].includes(zone);
        return SINGLE_ZONES.has(zone) && otherZone === zone;
      };
      next = [...selected.filter((id) => !clashes(id)), item.id].slice(-8);
    }
    setSelected(next);
    render(next, view);
  };

  const changeView = (nextView) => {
    if (!avatar?.views[nextView]) return;
    setView(nextView);
    if (selected.length) render(selected, nextView);
  };
  const turn = (direction) => {
    const ready = VIEWS.map(([value]) => value).filter((value) => avatar?.views[value]);
    const index = ready.indexOf(view);
    changeView(ready[(index + direction + ready.length) % ready.length]);
  };

  const currentImage = selected.length ? renders[keyFor(selected, view)] : avatar?.views[view];
  const lastGood = useRef('');
  if (currentImage) lastGood.current = currentImage;
  const shown = currentImage || lastGood.current || avatar?.views.front;

  const openLook = (look) => {
    const ids = look.itemIds.filter((id) => byId.has(id));
    setSelected(ids);
    setView(look.view);
    setRenders((current) => ({ ...current, [keyFor(ids, look.view)]: look.image }));
  };

  const removeAvatar = () => confirm({
    title: 'Delete your twin?',
    body: 'Your reference photos, every angle of your twin, and all saved try-on looks will be permanently deleted.',
    actionLabel: 'Delete twin',
    onConfirm: async () => {
      confirm(null);
      try { setState(await api('/api/avatar', { method: 'DELETE' })); setSelected([]); setRenders({}); onToast('Twin deleted'); }
      catch (error) { onToast(error.message); }
    },
  });

  if (!state) return <div className="page"><LoadingLine>Opening your fitting room…</LoadingLine></div>;
  if (!avatar || retaking) return <AvatarSetup onCancel={avatar ? () => setRetaking(false) : null} onCreated={(data) => { setState(data); setRetaking(false); setSelected([]); setRenders({}); prepareViews(); }} onToast={onToast} />;

  return (
    <div className="page fitting-page">
      <PageHeader eyebrow="Fitting room" title="Try it on" description="Tap pieces to dress your twin one at a time, or send a whole outfit here from the stylist." action={<div className="header-actions"><button className="button button-ghost" onClick={() => setRetaking(true)}><Camera size={15} /> Retake twin</button><button className="button button-ghost danger-text" onClick={removeAvatar}><Trash2 size={15} /> Delete</button></div>} />
      <div className="fitting-layout">
        <section className="stage-card">
          <div
            className={`avatar-stage ${rendering ? 'is-rendering' : ''}`}
            onPointerDown={(event) => { dragStart.current = event.clientX; }}
            onPointerUp={(event) => { if (dragStart.current == null) return; const delta = event.clientX - dragStart.current; dragStart.current = null; if (Math.abs(delta) > 40) turn(delta < 0 ? 1 : -1); }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {shown && <img key={shown} className="avatar-image" src={shown} alt={selected.length ? `Your twin wearing ${wearing.map((item) => item.name).join(', ')}` : 'Your twin in base clothing'} draggable="false" />}
            <button className="stage-arrow left" onClick={() => turn(-1)} aria-label="Turn left"><ChevronLeft size={18} /></button>
            <button className="stage-arrow right" onClick={() => turn(1)} aria-label="Turn right"><ChevronRight size={18} /></button>
            {rendering && <div className="stage-status" role="status"><LoaderCircle className="spin" size={14} /> Dressing you in {selected.length} {selected.length === 1 ? 'piece' : 'pieces'}…</div>}
          </div>
          <div className="view-switch" role="tablist" aria-label="Angle">
            {VIEWS.map(([value, label]) => (
              <button key={value} role="tab" aria-selected={view === value} className={view === value ? 'active' : ''} disabled={!avatar.views[value]} onClick={() => changeView(value)}>
                {label}{!avatar.views[value] && preparingViews && <LoaderCircle className="spin" size={11} />}
              </button>
            ))}
          </div>
          {preparingViews && <p className="stage-hint">Preparing side and back views. You can keep trying things on from the front.</p>}
        </section>

        <aside className="rack-panel">
          <div className="wearing-block">
            <div className="section-heading"><h2>Wearing</h2>{selected.length > 0 && <button className="text-link" onClick={() => setSelected([])}><RotateCcw size={13} /> Start over</button>}</div>
            {wearing.length ? (
              <div className="wearing-list">{wearing.map((item) => <span key={item.id} className="wearing-chip"><ItemVisual item={item} compact />{item.name}<button onClick={() => toggle(item)} aria-label={`Take off ${item.name}`}><X size={12} /></button></span>)}</div>
            ) : <p className="muted-copy">Just the basics. Tap anything below to put it on.</p>}
          </div>

          <div className="rack-block">
            <div className="pill-row" role="tablist" aria-label="Filter rack">{rackCategories.map((category) => <button key={category} className={rack === category ? 'active' : ''} onClick={() => setRack(category)}>{category}</button>)}</div>
            {available.length ? (
              <div className="rack-grid">
                {rackItems.map((item) => {
                  const on = selected.includes(item.id);
                  return (
                    <button key={item.id} className={`rack-item ${on ? 'on' : ''}`} onClick={() => toggle(item)} aria-pressed={on} title={on ? `Take off ${item.name}` : `Try on ${item.name}`}>
                      <ItemVisual item={item} compact />
                      {on && <span className="rack-check"><Check size={12} /></span>}
                      <span className="rack-name">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : <div className="soft-empty"><Shirt size={18} /><p>Add clothes to your wardrobe to start trying them on.</p><button className="button button-primary" onClick={onUpload}>Upload photos</button></div>}
          </div>

          {state.looks.length > 0 && (
            <div className="looks-block">
              <div className="section-heading"><h2>Recent looks</h2></div>
              <div className="looks-strip">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {state.looks.map((look) => <button key={look.id} onClick={() => openLook(look)} aria-label="Open this look"><img src={look.image} alt="" loading="lazy" /></button>)}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function AvatarSetup({ onCreated, onToast, onCancel }) {
  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => () => files.forEach((file) => URL.revokeObjectURL(file.preview)), [files]);

  const add = (list) => {
    const valid = list.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 20 * 1024 * 1024);
    if (valid.length !== list.length) onToast('Some files were skipped. Use JPG, PNG, or WEBP up to 20MB.');
    setFiles((current) => [...current, ...valid.map((file) => ({ file, preview: URL.createObjectURL(file), id: crypto.randomUUID() }))].slice(0, 4));
  };

  const create = async () => {
    setBusy(true); setError('');
    const formData = new FormData();
    files.forEach(({ file }) => formData.append('photos', file));
    formData.append('notes', notes);
    formData.append('consent', String(consent));
    try { onCreated(await api('/api/avatar', { method: 'POST', body: formData })); onToast('Your twin is ready'); }
    catch (nextError) { setError(nextError.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="page fitting-page">
      <PageHeader eyebrow="Fitting room" title={onCancel ? 'Retake your twin' : 'Create your twin'} description="A photoreal version of you, used only to preview clothes. Add a few photos and we'll build it in about a minute." action={onCancel && <button className="button button-ghost" onClick={onCancel} disabled={busy}>Cancel</button>} />
      <div className="setup-layout">
        <section className="setup-card">
          <input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => { add([...event.target.files]); event.target.value = ''; }} />
          <div className="setup-photos">
            {files.map((entry) => (
              <figure key={entry.id} className="setup-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.preview} alt="Selected reference" />
                <button onClick={() => setFiles((current) => current.filter((item) => item.id !== entry.id))} aria-label="Remove photo" disabled={busy}><X size={13} /></button>
              </figure>
            ))}
            {files.length < 4 && <button className="setup-add" onClick={() => inputRef.current?.click()} disabled={busy} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); add([...event.dataTransfer.files]); }}><ImagePlus size={22} /><span>{files.length ? 'Add another' : 'Add photos'}</span><small>{4 - files.length} left</small></button>}
          </div>
          <label className="field"><span className="field-label">Anything we should know? (optional)</span><input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={300} placeholder="e.g. 5'4, I usually wear my hair down" disabled={busy} /></label>
          <label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={busy} /><span>These are photos of me, and I consent to them being processed by AI and stored privately to create my twin. I can delete them any time.</span></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-full button-large" disabled={!files.length || !consent || busy} onClick={create}>
            {busy ? <LoadingLine>Creating your twin, this takes about a minute…</LoadingLine> : <><Sparkles size={16} /> Create my twin</>}
          </button>
        </section>
        <aside className="setup-tips">
          <h3>For the most accurate twin</h3>
          <ol>
            <li><strong>One full-body photo, front on.</strong> Fitted clothes, standing straight, head to toe in frame.</li>
            <li><strong>One clear face photo.</strong> Natural light, no sunglasses.</li>
            <li><strong>Optional side or back photo.</strong> Helps when you turn your twin around.</li>
          </ol>
          <div className="privacy-note"><ShieldCheck size={15} /> Your photos stay in private storage, are never used to train models, and are deleted with your twin.</div>
        </aside>
      </div>
    </div>
  );
}
