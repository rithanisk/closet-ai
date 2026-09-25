import React from 'react';
import { Check, Heart, Shirt } from 'lucide-react';
import { EmptyState, OutfitFlatLay, PageHeader } from '../components';

export function SavedScreen({ outfits, onMarkWorn, onRemove, onStylist, onTryOn }) {
  return (
    <div className="page saved-page">
      <PageHeader eyebrow="Your style history" title="Saved outfits" description="The looks you approve help your stylist understand what feels like you." />
      {!outfits.length ? <EmptyState icon={Heart} title="No saved outfits yet" body="Approve an outfit from the Stylist and it will show up here." action={<button className="button button-primary" onClick={onStylist}>Ask the stylist</button>} /> : (
        <div className="saved-grid">
          {outfits.map((outfit) => (
            <article className="saved-card" key={outfit.savedId}>
              <OutfitFlatLay items={outfit.items} label={outfit.title} />
              <div className="saved-card-body">
                <div className="eyebrow">{outfit.worn ? 'Worn' : 'Saved look'}</div>
                <h2>{outfit.title}</h2>
                <p>{outfit.blurb}</p>
                <div className="saved-actions">
                  <button className="button button-primary" onClick={() => onTryOn(outfit)} disabled={!outfit.items.length}><Shirt size={14} /> Try on</button>
                  <button className="button button-ghost" disabled={outfit.worn} onClick={() => onMarkWorn(outfit.savedId)}>{outfit.worn ? <><Check size={14} /> Worn</> : 'Mark as worn'}</button>
                  <button className="text-link danger-text" onClick={() => onRemove(outfit.savedId)}>Remove</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
