import React, { useEffect, useMemo, useState } from 'react';
import { Archive, SquareCheck, Eye, EyeOff, Heart, LoaderCircle, Scissors, Search, Shirt, ShoppingBag, Trash2, Upload, WandSparkles, X } from 'lucide-react';
import { EmptyState, Field, ItemCard, ItemVisual, ListInput, PageHeader } from '../components';
import { CATEGORIES, FORMALITY, WARMTH } from '../shared/wardrobe';

export function WardrobeScreen({ wardrobe, focusId, onConsumeFocus, onUpload, onUpdate, onDelete, onArchive, onUseInOutfit, onUpgradeCutout, onGaps, onBulk, onTryOn }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [color, setColor] = useState('All colors');
  const [availability, setAvailability] = useState('All availability');
  const [sort, setSort] = useState('Recently added');
  const [selectedId, setSelectedId] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const selected = wardrobe.find((item) => item.id === selectedId);
  const categories = CATEGORIES.filter((value) => wardrobe.some((item) => item.category === value));
  const colors = [...new Set(wardrobe.map((item) => item.color))].sort();

  useEffect(() => {
    if (!focusId) return;
    setSelectedId(focusId);
    onConsumeFocus?.();
  }, [focusId, onConsumeFocus]);

  // Drop selections for items that no longer exist.
  useEffect(() => {
    setPicked((current) => {
      const ids = new Set(wardrobe.map((item) => item.id));
      const next = new Set([...current].filter((id) => ids.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [wardrobe]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = wardrobe.filter((item) => {
      if (query && ![item.name, item.color, item.subcategory, item.description, item.material, item.pattern, ...(item.styleTags || [])].join(' ').toLowerCase().includes(query)) return false;
      if (category !== 'All' && item.category !== category) return false;
      if (color !== 'All colors' && item.color !== color) return false;
      if (availability === 'Available' && !item.available) return false;
      if (availability === 'Unavailable' && item.available) return false;
      return true;
    });
    return [...result].sort((a, b) => {
      if (sort === 'Most worn') return (b.worn || 0) - (a.worn || 0);
      if (sort === 'Least worn') return (a.worn || 0) - (b.worn || 0);
      if (sort === 'Name') return a.name.localeCompare(b.name);
      return (b.addedAt || 0) - (a.addedAt || 0);
    });
  }, [wardrobe, search, category, color, availability, sort]);
  const filtersActive = search || category !== 'All' || color !== 'All colors' || availability !== 'All availability';
  const clear = () => { setSearch(''); setCategory('All'); setColor('All colors'); setAvailability('All availability'); };

  const toggle = (id) => setPicked((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allVisiblePicked = filtered.length > 0 && filtered.every((item) => picked.has(item.id));
  const pickAll = () => setPicked((current) => {
    const next = new Set(current);
    filtered.forEach((item) => (allVisiblePicked ? next.delete(item.id) : next.add(item.id)));
    return next;
  });
  const exitSelect = () => { setSelecting(false); setPicked(new Set()); };
  const bulk = async (action) => {
    setBulkBusy(true);
    try {
      const done = await onBulk(action, [...picked]);
      if (done && action === 'delete') exitSelect();
    } finally { setBulkBusy(false); }
  };

  return (
    <div className="page wardrobe-page">
      <PageHeader
        eyebrow="Your collection"
        title="Wardrobe"
        description={`${wardrobe.length} ${wardrobe.length === 1 ? 'piece' : 'pieces'}, ready to style.`}
        action={<div className="header-actions">
          {wardrobe.length > 0 && <button className={`button ${selecting ? 'button-secondary' : 'button-ghost'}`} onClick={selecting ? exitSelect : () => setSelecting(true)}><SquareCheck size={15} /> {selecting ? 'Done' : 'Select'}</button>}
          <button className="button button-ghost" onClick={onGaps}><ShoppingBag size={15} /> Wardrobe gaps</button>
          <button className="button button-primary" onClick={onUpload}><Upload size={15} /> Upload photos</button>
        </div>}
      />
      {wardrobe.length > 0 && (
        <>
          <div className="pill-row category-pills" role="tablist" aria-label="Category">
            {['All', ...categories].map((value) => <button key={value} className={category === value ? 'active' : ''} onClick={() => setCategory(value)}>{value}{value !== 'All' && <small>{wardrobe.filter((item) => item.category === value).length}</small>}</button>)}
          </div>
          <div className="filter-bar">
            <label className="search-field"><Search size={16} /><input aria-label="Search your wardrobe" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, color, fabric…" /></label>
            <select value={color} onChange={(event) => setColor(event.target.value)} aria-label="Color"><option>All colors</option>{colors.map((value) => <option key={value}>{value}</option>)}</select>
            <select value={availability} onChange={(event) => setAvailability(event.target.value)} aria-label="Availability"><option>All availability</option><option>Available</option><option>Unavailable</option></select>
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort"><option>Recently added</option><option>Most worn</option><option>Least worn</option><option>Name</option></select>
            {filtersActive && <button className="text-link" onClick={clear}>Clear filters</button>}
          </div>
        </>
      )}
      {!wardrobe.length ? <EmptyState title="Your wardrobe is empty" body="Upload photos to create your first digital closet." action={<button className="button button-primary" onClick={onUpload}>Upload photos</button>} />
        : !filtered.length ? <EmptyState icon={Search} title="Nothing matches" body="Try another word or clear your filters." action={<button className="button button-secondary" onClick={clear}>Clear filters</button>} />
          : <div className={`item-grid item-grid-four ${selecting ? 'is-selecting' : ''}`}>{filtered.map((item) => <ItemCard key={item.id} item={item} selectable={selecting} selected={picked.has(item.id)} onClick={() => (selecting ? toggle(item.id) : setSelectedId(item.id))} />)}</div>}

      {selecting && (
        <div className="bulk-bar" role="toolbar" aria-label="Bulk actions">
          <div className="bulk-count"><strong>{picked.size}</strong> selected<button className="text-link" onClick={pickAll}>{allVisiblePicked ? 'Clear visible' : `Select all ${filtered.length}`}</button></div>
          <div className="bulk-actions">
            <button className="button button-ghost" disabled={!picked.size || bulkBusy} onClick={() => bulk('available')}><Eye size={15} /> Available</button>
            <button className="button button-ghost" disabled={!picked.size || bulkBusy} onClick={() => bulk('unavailable')}><EyeOff size={15} /> Unavailable</button>
            <button className="button button-danger" disabled={!picked.size || bulkBusy} onClick={() => bulk('delete')}>{bulkBusy ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />} Delete {picked.size || ''}</button>
          </div>
        </div>
      )}

      {selected && <ItemDrawer key={selected.id} item={selected} onClose={() => setSelectedId(null)} onSave={(changes) => { onUpdate(selected.id, changes); setSelectedId(null); }} onDelete={() => onDelete(selected.id, () => setSelectedId(null))} onArchive={() => { onArchive(selected.id); setSelectedId(null); }} onUse={() => onUseInOutfit(selected)} onTryOn={() => onTryOn(selected)} onUpgradeCutout={() => onUpgradeCutout(selected)} />}
    </div>
  );
}

function ItemDrawer({ item, onClose, onSave, onDelete, onArchive, onUse, onTryOn, onUpgradeCutout }) {
  const [form, setForm] = useState({ ...item });
  const [cutoutBusy, setCutoutBusy] = useState(false);
  const set = (changes) => setForm((current) => ({ ...current, ...changes }));
  const upgrade = async () => { setCutoutBusy(true); try { await onUpgradeCutout(); } finally { setCutoutBusy(false); } };
  const editable = ['name', 'category', 'subcategory', 'color', 'secondaryColor', 'pattern', 'material', 'formality', 'season', 'warmth', 'fit', 'brand', 'description', 'styleTags', 'details', 'notes', 'favorite', 'available'];
  const save = () => onSave(Object.fromEntries(editable.map((key) => [key, form[key]])));
  return (
    <><button className="drawer-scrim" onClick={onClose} aria-label="Close item details" /><aside className="item-drawer" aria-label={`${item.name} details`}>
      <div className="drawer-heading"><div><div className="eyebrow">Wardrobe item</div><h2>Edit piece</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
      <div className="drawer-visual-wrap"><ItemVisual item={item} /><button className={`favorite-toggle ${form.favorite ? 'active' : ''}`} onClick={() => set({ favorite: !form.favorite })}><Heart size={16} fill={form.favorite ? 'currentColor' : 'none'} /> {form.favorite ? 'Favorite' : 'Add to favorites'}</button></div>
      {item.image && !item.cutout && <button className="cutout-upgrade" onClick={upgrade} disabled={cutoutBusy}>{cutoutBusy ? <><LoaderCircle className="spin" size={13} /> Creating transparent cutout…</> : <><Scissors size={13} /> Create a transparent cutout from this photo</>}</button>}
      <div className="drawer-form">
        <Field label="Name"><input value={form.name} onChange={(event) => set({ name: event.target.value })} /></Field>
        <Field label="Description"><textarea rows="5" value={form.description || ''} onChange={(event) => set({ description: event.target.value })} placeholder="Silhouette, fabric, details…" /></Field>
        <div className="form-grid"><Field label="Category"><select value={form.category} onChange={(event) => set({ category: event.target.value })}>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Type"><input value={form.subcategory || ''} onChange={(event) => set({ subcategory: event.target.value })} placeholder="e.g. cardigan" /></Field></div>
        <div className="form-grid"><Field label="Color"><input value={form.color} onChange={(event) => set({ color: event.target.value })} /></Field><Field label="Second color"><input value={form.secondaryColor || ''} onChange={(event) => set({ secondaryColor: event.target.value })} /></Field></div>
        <div className="form-grid"><Field label="Pattern"><input value={form.pattern || ''} onChange={(event) => set({ pattern: event.target.value })} /></Field><Field label="Material"><input value={form.material || ''} onChange={(event) => set({ material: event.target.value })} /></Field></div>
        <div className="form-grid"><Field label="Formality"><select value={form.formality} onChange={(event) => set({ formality: event.target.value })}>{FORMALITY.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Warmth"><select value={form.warmth || ''} onChange={(event) => set({ warmth: event.target.value })}><option value="">Not set</option>{WARMTH.map((value) => <option key={value}>{value}</option>)}</select></Field></div>
        <div className="form-grid"><Field label="Season"><input value={form.season || ''} onChange={(event) => set({ season: event.target.value })} /></Field><Field label="Fit"><input value={form.fit || ''} onChange={(event) => set({ fit: event.target.value })} /></Field></div>
        <Field label="Details" hint="Comma separated"><ListInput value={form.details} onChange={(details) => set({ details })} /></Field>
        <div className="form-grid"><Field label="Style tags" hint="Comma separated"><ListInput value={form.styleTags} onChange={(styleTags) => set({ styleTags })} /></Field><Field label="Brand"><input value={form.brand || ''} onChange={(event) => set({ brand: event.target.value })} /></Field></div>
        <div className="read-only-row"><span><small>Worn</small>{item.worn || 0} times</span><span><small>Added</small>{item.addedAt ? new Date(item.addedAt).toLocaleDateString() : '—'}</span></div>
        <Field label="Notes"><textarea rows="3" value={form.notes} onChange={(event) => set({ notes: event.target.value })} placeholder="Runs small, needs tailoring…" /></Field>
        <label className="toggle-row"><input type="checkbox" checked={form.available} onChange={(event) => set({ available: event.target.checked })} /><span /><div><strong>Available to wear</strong><small>Unavailable items are excluded from outfits.</small></div></label>
      </div>
      <div className="drawer-actions"><button className="button button-primary button-full" onClick={save}>Save changes</button><div className="split-buttons"><button className="button button-secondary" onClick={onTryOn}><Shirt size={15} /> Try on</button><button className="button button-secondary" onClick={onUse}><WandSparkles size={15} /> Style it</button></div><div className="split-actions"><button onClick={onArchive}><Archive size={14} /> Archive</button><button className="danger-text" onClick={onDelete}><Trash2 size={14} /> Delete</button></div></div>
    </aside></>
  );
}
