import React from 'react';
import { Heart } from 'lucide-react';
import { EmptyState, OutfitPreview, PageHeader } from '../components';

export function SavedScreen({ outfits, onMarkWorn, onRemove, onStylist }) {
  return (
    <div className="page saved-page">
      <PageHeader eyebrow="Your style history" title="Saved outfits" description="The looks you approve help your stylist understand what feels like you." />
      {!outfits.length ? <EmptyState icon={Heart} title="No saved outfits yet" body="Approve an outfit from the Stylist and it will show up here." action={<button className="button button-dark" onClick={onStylist}>Ask the stylist</button>} /> : <div className="saved-grid">{outfits.map((outfit) => <article className="saved-card" key={outfit.savedId}><OutfitPreview items={outfit.items} large /><div className="saved-card-heading"><div><div className="eyebrow">{outfit.worn ? 'Worn recently' : 'Saved look'}</div><h2>{outfit.title}</h2></div><Heart size={18} fill="currentColor" /></div><p>{outfit.blurb}</p><div className="saved-actions"><button className="button button-outline" disabled={outfit.worn} onClick={() => onMarkWorn(outfit.savedId)}>{outfit.worn ? 'Marked as worn ✓' : 'Mark as worn'}</button><button className="text-link danger-text" onClick={() => onRemove(outfit.savedId)}>Remove</button></div></article>)}</div>}
    </div>
  );
}
