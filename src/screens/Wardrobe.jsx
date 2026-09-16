import React, { useMemo, useState } from 'react';
import { Archive, Heart, Search, Trash2, WandSparkles, X } from 'lucide-react';
import { EmptyState, Field, ItemCard, ItemVisual, PageHeader } from '../components';

export function WardrobeScreen({ wardrobe, onUpload, onUpdate, onDelete, onArchive, onUseInOutfit }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All categories');
  const [color, setColor] = useState('All colors');
  const [availability, setAvailability] = useState('All availability');
  const [sort, setSort] = useState('Recently added');
  const [selectedId, setSelectedId] = useState(null);
  const selected = wardrobe.find((item) => item.id === selectedId);
  const categories = [...new Set(wardrobe.map((item) => item.category))].sort();
  const colors = [...new Set(wardrobe.map((item) => item.color))].sort();
  const filtered = useMemo(() => {
    const result = wardrobe.filter((item) => {
      if (search && !`${item.name} ${item.category} ${item.color}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== 'All categories' && item.category !== category) return false;
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
  const filtersActive = search || category !== 'All categories' || color !== 'All colors' || availability !== 'All availability';
  const clear = () => { setSearch(''); setCategory('All categories'); setColor('All colors'); setAvailability('All availability'); };

  return (
    <div className="page wardrobe-page">
      <PageHeader eyebrow="Your collection" title="Wardrobe" description={`${wardrobe.length} pieces, ready to style.`} action={<button className="button button-dark" onClick={onUpload}>+ Upload photos</button>} />
      <div className="filter-bar">
        <label className="search-field"><Search size={16} /><input aria-label="Search your wardrobe" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your wardrobe" /></label>
        <select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
        <select value={color} onChange={(event) => setColor(event.target.value)}><option>All colors</option>{colors.map((value) => <option key={value}>{value}</option>)}</select>
        <select value={availability} onChange={(event) => setAvailability(event.target.value)}><option>All availability</option><option>Available</option><option>Unavailable</option></select>
        <select value={sort} onChange={(event) => setSort(event.target.value)}><option>Recently added</option><option>Most worn</option><option>Least worn</option><option>Name</option></select>
        {filtersActive && <button className="text-link" onClick={clear}>Clear</button>}
      </div>
      {!wardrobe.length ? <EmptyState title="Your wardrobe is empty" body="Upload photos to create your first digital closet." action={<button className="button button-dark" onClick={onUpload}>Upload photos</button>} /> : !filtered.length ? <EmptyState icon={Search} title="Nothing matches" body="Try another word or clear your filters." action={<button className="button button-outline" onClick={clear}>Clear filters</button>} /> : <div className="item-grid item-grid-four">{filtered.map((item) => <ItemCard key={item.id} item={item} onClick={() => setSelectedId(item.id)} />)}</div>}
      {selected && <ItemDrawer item={selected} onClose={() => setSelectedId(null)} onSave={(changes) => { onUpdate(selected.id, changes); setSelectedId(null); }} onDelete={() => onDelete(selected.id, () => setSelectedId(null))} onArchive={() => { onArchive(selected.id); setSelectedId(null); }} onUse={() => onUseInOutfit(selected)} />}
    </div>
  );
}

function ItemDrawer({ item, onClose, onSave, onDelete, onArchive, onUse }) {
  const [form, setForm] = useState({ ...item });
  return (
    <><button className="drawer-scrim" onClick={onClose} aria-label="Close item details" /><aside className="item-drawer" aria-label={`${item.name} details`}>
      <div className="drawer-heading"><div><div className="eyebrow">Wardrobe item</div><h2>Edit piece</h2></div><button className="icon-button" onClick={onClose}><X size={20} /></button></div>
      <div className="drawer-visual-wrap"><ItemVisual item={item} /><button className={`favorite-toggle ${form.favorite ? 'active' : ''}`} onClick={() => setForm({ ...form, favorite: !form.favorite })}><Heart size={16} fill={form.favorite ? 'currentColor' : 'none'} /> {form.favorite ? 'Favorite' : 'Add to favorites'}</button></div>
      <div className="drawer-form">
        <Field label="Name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <div className="form-grid"><Field label="Color"><input value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></Field><Field label="Formality"><select value={form.formality} onChange={(event) => setForm({ ...form, formality: event.target.value })}><option>Casual</option><option>Smart casual</option><option>Dressy</option></select></Field></div>
        <div className="read-only-row"><span><small>Category</small>{item.category}</span><span><small>Season</small>{item.season}</span></div>
        <Field label="Notes"><textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Runs small, needs tailoring…" /></Field>
        <label className="toggle-row"><input type="checkbox" checked={form.available} onChange={(event) => setForm({ ...form, available: event.target.checked })} /><span /><div><strong>Available to wear</strong><small>Unavailable items are excluded from outfits.</small></div></label>
      </div>
      <div className="drawer-actions"><button className="button button-dark button-full" onClick={() => onSave(form)}>Save changes</button><button className="button button-outline button-full" onClick={onUse}><WandSparkles size={15} /> Use in an outfit</button><div className="split-actions"><button onClick={onArchive}><Archive size={14} /> Archive</button><button className="danger-text" onClick={onDelete}><Trash2 size={14} /> Delete</button></div></div>
    </aside></>
  );
}
