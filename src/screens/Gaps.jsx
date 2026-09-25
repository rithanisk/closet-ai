import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, Check, CircleCheck, Plus, RefreshCw, ShoppingBag, Sparkles, X } from 'lucide-react';
import { Chips, EmptyState, ItemVisual, LoadingLine, PageHeader } from '../components';
import { api } from '../api';

const DISMISS_REASONS = ['Not my style', 'Too similar to something I own', "Don't need it", 'Too trend-led', 'Wrong color'];
const STATUS_LABEL = { dismissed: 'Dismissed', owned: 'Already owned', purchased: 'Purchased', wishlist: 'Wishlist' };

export function GapsScreen({ wardrobe, onToast, onUpload, onInspiration }) {
  const [suggestions, setSuggestions] = useState(null);
  const [busy, setBusy] = useState(false);
  const owned = useMemo(() => new Map(wardrobe.map((item) => [item.id, item])), [wardrobe]);
  const availableCount = wardrobe.filter((item) => item.available).length;

  useEffect(() => {
    let active = true;
    api('/api/gaps').then((data) => { if (active) setSuggestions(data.suggestions); }).catch((error) => { if (active) setSuggestions([]); onToast(error.message); });
    return () => { active = false; };
  }, [onToast]);

  const analyze = async () => {
    setBusy(true);
    try {
      const data = await api('/api/gaps', { method: 'POST' });
      setSuggestions(data.suggestions);
      onToast(data.found ? `${data.found} ${data.found === 1 ? 'piece' : 'pieces'} worth considering` : 'Your wardrobe already covers the gaps we could find. Nothing to add right now.');
    } catch (error) { onToast(error.message); }
    finally { setBusy(false); }
  };

  const update = async (id, status, feedback) => {
    try {
      const data = await api(`/api/gaps/${id}`, { method: 'PATCH', body: JSON.stringify({ status, ...(feedback !== undefined ? { feedback } : {}) }) });
      setSuggestions(data.suggestions);
      onToast({ wishlist: 'Saved to your wishlist', owned: 'Noted. We will not suggest it again', dismissed: 'Dismissed. Thanks for the feedback', purchased: 'Marked as purchased. Add it to your wardrobe when it arrives' }[status] || 'Updated');
    } catch (error) { onToast(error.message); }
  };

  const remove = async (id) => {
    try { const data = await api(`/api/gaps/${id}`, { method: 'DELETE' }); setSuggestions(data.suggestions); }
    catch (error) { onToast(error.message); }
  };

  if (!suggestions) return <div className="page"><LoadingLine>Loading wardrobe suggestions…</LoadingLine></div>;
  const active = suggestions.filter((entry) => entry.status === 'active');
  const wishlist = suggestions.filter((entry) => entry.status === 'wishlist');
  const history = suggestions.filter((entry) => ['dismissed', 'owned', 'purchased'].includes(entry.status));

  return (
    <div className="page gaps-page">
      <PageHeader
        eyebrow="Smart additions"
        title="Wardrobe gaps"
        description="Pieces worth adding only when they work hard with what you already own. Each one shows the looks it unlocks, and none of them are in your wardrobe."
        action={<button className="button button-primary" onClick={analyze} disabled={busy || availableCount < 6}>{busy ? <LoadingLine>Analyzing…</LoadingLine> : <><RefreshCw size={15} /> {active.length ? 'Re-check gaps' : 'Find wardrobe gaps'}</>}</button>}
      />

      {busy && <div className="busy-banner" role="status"><LoadingLine>Mapping combinations across your {availableCount} available pieces, your saved looks, and your inspiration…</LoadingLine><div className="loading-rule"><span /></div></div>}

      {availableCount < 6 ? (
        <EmptyState icon={ShoppingBag} title="Add a few more pieces first" body="Gap suggestions are grounded in real outfits, so they need at least six available pieces to work with." action={<button className="button button-primary" onClick={onUpload}>Upload photos</button>} />
      ) : !active.length && !busy ? (
        <EmptyState icon={Sparkles} title="No open suggestions" body="Run a gap check when you're thinking about shopping. We'll look for the one or two pieces that unlock the most looks, and skip anything you already have a close version of." action={<div className="header-actions"><button className="button button-primary" onClick={analyze}>Find wardrobe gaps</button><button className="button button-secondary" onClick={onInspiration}>Tune with inspiration</button></div>} />
      ) : (
        <div className="gap-list">{active.map((entry) => <SuggestionCard key={entry.id} entry={entry} owned={owned} onUpdate={update} />)}</div>
      )}

      {wishlist.length > 0 && (
        <section className="content-section">
          <div className="section-heading"><h2>Wishlist</h2><span className="muted-count">{wishlist.length} saved</span></div>
          <div className="wishlist-grid">
            {wishlist.map((entry) => (
              <article className="wishlist-card" key={entry.id}>
                <div className="unowned-label"><Bookmark size={12} /> Not owned yet</div>
                <h3>{entry.name}</h3>
                <p>{entry.description}</p>
                <small>Works with {entry.versatility.pairCount || 0} of your pieces · about {entry.versatility.looks || 0} looks</small>
                <div className="wishlist-actions"><button className="button button-secondary" onClick={() => update(entry.id, 'purchased')}><Check size={13} /> Bought it</button><button className="text-link" onClick={() => remove(entry.id)}>Remove</button></div>
              </article>
            ))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <details className="gap-history">
          <summary>Feedback history · {history.length}</summary>
          <p>This shapes future suggestions. Remove an entry to let it be suggested again.</p>
          <ul>{history.map((entry) => <li key={entry.id}><span><strong>{entry.name}</strong> · {STATUS_LABEL[entry.status]}{entry.feedback ? ` · ${entry.feedback}` : ''}</span><button className="icon-button" onClick={() => remove(entry.id)} aria-label={`Forget feedback on ${entry.name}`}><X size={14} /></button></li>)}</ul>
        </details>
      )}
    </div>
  );
}

function SuggestionCard({ entry, owned, onUpdate }) {
  const [dismissing, setDismissing] = useState(false);
  const { versatility = {} } = entry;
  const examples = entry.examples
    .map((example) => ({ ...example, items: example.itemIds.map((id) => owned.get(id)).filter(Boolean) }))
    .filter((example) => example.items.length >= 2);
  const pairs = (versatility.pairsWith || []).map((id) => owned.get(id)).filter(Boolean);
  return (
    <article className="gap-card">
      <div className="gap-main">
        <div className="unowned-label"><ShoppingBag size={12} /> Not in your wardrobe · suggestion</div>
        <h2>{entry.name}</h2>
        <div className="gap-category">{entry.category}</div>
        <div className="versatility-meter" aria-label={`Versatility score ${entry.score} out of 100`}>
          <div><small>Versatility</small><strong>{entry.score}</strong></div>
          <span><i style={{ width: `${entry.score}%` }} /></span>
        </div>
        <div className="gap-stats">
          <div><strong>{pairs.length}</strong><small>owned pieces it works with</small></div>
          <div><strong>~{versatility.looks || examples.length}</strong><small>complete looks it unlocks</small></div>
          <div><strong>{(versatility.occasions || []).length}</strong><small>occasions covered</small></div>
        </div>
        <p className="gap-gap">{entry.gap}</p>
        <p className="gap-rationale">{entry.rationale}</p>
        <div className="gap-look-for"><small>Look for</small><p>{entry.description}</p></div>
        <div className="gap-chips"><Chips values={[...(versatility.occasions || []), ...(versatility.seasons || []), ...(versatility.layeringRoles || [])]} empty="" /></div>
        {dismissing ? (
          <div className="dismiss-reasons"><small>What's off?</small>{DISMISS_REASONS.map((reason) => <button key={reason} onClick={() => onUpdate(entry.id, 'dismissed', reason)}>{reason}</button>)}<button className="text-link" onClick={() => onUpdate(entry.id, 'dismissed', '')}>Skip</button><button className="icon-button" onClick={() => setDismissing(false)} aria-label="Cancel"><X size={14} /></button></div>
        ) : (
          <div className="gap-actions">
            <button className="button button-primary" onClick={() => onUpdate(entry.id, 'wishlist')}><Bookmark size={14} /> Save to wishlist</button>
            <button className="button button-secondary" onClick={() => onUpdate(entry.id, 'owned')}><CircleCheck size={14} /> I already own this</button>
            <button className="text-link" onClick={() => setDismissing(true)}>Dismiss</button>
          </div>
        )}
      </div>
      <div className="gap-examples">
        <small>Ways to wear it with what you own</small>
        {examples.map((example, index) => (
          <div className="gap-example" key={`${example.title}-${index}`}>
            <div className="gap-example-strip">
              <div className="new-piece-tile" title={`${entry.name} (not owned)`}><Plus size={14} /><span>New</span></div>
              {example.items.slice(0, 5).map((item) => <ItemVisual key={item.id} item={item} compact />)}
            </div>
            <strong>{example.title}</strong>
            <p>{example.note}</p>
            <span className="gap-example-items">{example.items.map((item) => item.name).join(' · ')}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
