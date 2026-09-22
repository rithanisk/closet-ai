import React from 'react';
import { Check, TriangleAlert, X } from 'lucide-react';
import { ItemVisual, PageHeader } from '../components';
import { categories } from '../data';

export function ReviewScreen({ items, onChange, onRemove, onConfirmAll, onAdd }) {
  const selected = items.filter((item) => item.selected).length;
  const needsAttention = items.filter((item) => item.confidence === 'low' || item.duplicate).length;
  return (
    <div className="page review-page">
      <PageHeader eyebrow="AI extraction" title="Review detected items" description="Confirm what is correct and fix what isn't. Nothing joins your wardrobe until you approve it." action={<button className="button button-outline" onClick={onConfirmAll}><Check size={15} /> Confirm high-confidence</button>} />
      {needsAttention > 0 && <div className="review-banner"><TriangleAlert size={17} /><div><strong>{needsAttention} {needsAttention === 1 ? 'item needs' : 'items need'} attention.</strong><span>Check low-confidence labels and possible duplicates before adding them.</span></div></div>}
      <div className="detection-grid">
        {items.map((item) => (
          <article className={`detection-card ${item.duplicate ? 'possible-duplicate' : ''}`} key={item.id}>
            <div className="detection-topline">
              <label className="check-label"><input type="checkbox" checked={item.selected} onChange={(event) => onChange(item.id, { selected: event.target.checked })} /><span><Check size={12} /></span> Include</label>
              <button className="icon-button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}><X size={16} /></button>
            </div>
            <ItemVisual item={item} />
            {(item.confidence === 'low' || item.duplicate) && <div className="item-warning"><TriangleAlert size={14} />{item.duplicate ? 'Possible duplicate—already in wardrobe' : 'Check category'}</div>}
            <div className="detection-fields">
              <label><span>Name</span><input value={item.name} onChange={(event) => onChange(item.id, { name: event.target.value })} /></label>
              <div className="inline-fields">
                <label><span>Category</span><select value={item.category} onChange={(event) => onChange(item.id, { category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label><span>Color</span><input value={item.color} onChange={(event) => onChange(item.id, { color: event.target.value })} /></label>
              </div>
            </div>
            <div className="crop-link">AI crop prepared from the detected boundary</div>
          </article>
        ))}
      </div>
      <div className="sticky-review-footer"><span><strong>{selected}</strong> of {items.length} selected</span><button className="button button-dark" disabled={!selected} onClick={onAdd}>Add confirmed items to wardrobe →</button></div>
    </div>
  );
}
