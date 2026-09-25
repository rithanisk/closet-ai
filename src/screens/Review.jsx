import React, { useState } from 'react';
import { Check, ChevronDown, LoaderCircle, Scissors, TriangleAlert, X } from 'lucide-react';
import { ItemVisual, ListInput, PageHeader } from '../components';
import { categories } from '../data';
import { FORMALITY, WARMTH } from '../shared/wardrobe';

export function ReviewScreen({ items, onChange, onRemove, onConfirmAll, onAdd, onRetryCutout }) {
  const selected = items.filter((item) => item.selected).length;
  const needsAttention = items.filter((item) => item.confidence === 'low' || item.duplicate).length;
  const withoutCutout = items.filter((item) => !item.cutout).length;
  return (
    <div className="page review-page">
      <PageHeader eyebrow="AI extraction" title="Review detected items" description="Each piece is cut out on a transparent background with a detailed description. Confirm what is correct and fix what isn't. Nothing joins your wardrobe until you approve it." action={<button className="button button-secondary" onClick={onConfirmAll}><Check size={15} /> Confirm high-confidence</button>} />
      {needsAttention > 0 && <div className="review-banner"><TriangleAlert size={17} /><div><strong>{needsAttention} {needsAttention === 1 ? 'item needs' : 'items need'} attention.</strong><span>Check low-confidence labels and possible duplicates before adding them.</span></div></div>}
      {withoutCutout > 0 && <div className="review-banner"><Scissors size={17} /><div><strong>{withoutCutout} {withoutCutout === 1 ? 'piece is' : 'pieces are'} still a photo crop.</strong><span>The transparent cutout could not be finished. Retry it on the card, or add the crop and upgrade it later from your wardrobe.</span></div></div>}
      <div className="detection-grid">
        {items.map((item) => <DetectionCard key={item.id} item={item} onChange={(changes) => onChange(item.id, changes)} onRemove={() => onRemove(item.id)} onRetryCutout={() => onRetryCutout(item)} />)}
      </div>
      <div className="sticky-review-footer"><span><strong>{selected}</strong> of {items.length} selected</span><button className="button button-primary" disabled={!selected || items.some((item) => item.cutoutBusy)} onClick={onAdd}>Add confirmed items to wardrobe →</button></div>
    </div>
  );
}

function DetectionCard({ item, onChange, onRemove, onRetryCutout }) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`detection-card ${item.duplicate ? 'possible-duplicate' : ''}`}>
      <div className="detection-topline">
        <label className="check-label"><input type="checkbox" checked={item.selected} onChange={(event) => onChange({ selected: event.target.checked })} /><span><Check size={12} /></span> Include</label>
        <button className="icon-button" onClick={onRemove} aria-label={`Remove ${item.name}`}><X size={16} /></button>
      </div>
      <ItemVisual item={item} checker />
      <div className="cutout-status">
        {item.cutoutBusy ? <span><LoaderCircle className="spin" size={12} /> Cutting out on a transparent background…</span>
          : item.cutout ? <span className="ok"><Scissors size={12} /> Transparent cutout</span>
            : <><span className="warn"><TriangleAlert size={12} /> Photo crop only</span><button className="text-link" onClick={onRetryCutout}>Retry cutout</button></>}
      </div>
      {(item.confidence === 'low' || item.duplicate) && <div className="item-warning"><TriangleAlert size={14} />{item.duplicate ? 'Possible duplicate, already in wardrobe' : 'Check category'}</div>}
      <div className="detection-fields">
        <label><span>Name</span><input value={item.name} onChange={(event) => onChange({ name: event.target.value })} /></label>
        <div className="inline-fields">
          <label><span>Category</span><select value={item.category} onChange={(event) => onChange({ category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label><span>Color</span><input value={item.color} onChange={(event) => onChange({ color: event.target.value })} /></label>
        </div>
        <label><span>Description</span><textarea rows="4" value={item.description || ''} onChange={(event) => onChange({ description: event.target.value })} /></label>
      </div>
      <button className="details-toggle" onClick={() => setOpen(!open)} aria-expanded={open}><ChevronDown size={13} className={open ? 'rotated' : ''} /> {open ? 'Hide details' : 'More details'}</button>
      {open && (
        <div className="detection-fields detail-extra">
          <div className="inline-fields">
            <label><span>Type</span><input value={item.subcategory || ''} onChange={(event) => onChange({ subcategory: event.target.value })} /></label>
            <label><span>Second color</span><input value={item.secondaryColor || ''} onChange={(event) => onChange({ secondaryColor: event.target.value })} /></label>
          </div>
          <div className="inline-fields">
            <label><span>Pattern</span><input value={item.pattern || ''} onChange={(event) => onChange({ pattern: event.target.value })} /></label>
            <label><span>Material</span><input value={item.material || ''} onChange={(event) => onChange({ material: event.target.value })} /></label>
          </div>
          <div className="inline-fields">
            <label><span>Formality</span><select value={item.formality} onChange={(event) => onChange({ formality: event.target.value })}>{FORMALITY.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><span>Warmth</span><select value={item.warmth || ''} onChange={(event) => onChange({ warmth: event.target.value })}><option value="">Not set</option>{WARMTH.map((value) => <option key={value}>{value}</option>)}</select></label>
          </div>
          <div className="inline-fields">
            <label><span>Season</span><input value={item.season || ''} onChange={(event) => onChange({ season: event.target.value })} /></label>
            <label><span>Fit</span><input value={item.fit || ''} onChange={(event) => onChange({ fit: event.target.value })} /></label>
          </div>
          <label><span>Details</span><ListInput value={item.details} onChange={(details) => onChange({ details })} placeholder="Comma separated" /></label>
          <label><span>Style tags</span><ListInput value={item.styleTags} onChange={(styleTags) => onChange({ styleTags })} placeholder="Comma separated" /></label>
          <label><span>Brand</span><input value={item.brand || ''} onChange={(event) => onChange({ brand: event.target.value })} placeholder="Only if visible" /></label>
        </div>
      )}
    </article>
  );
}
