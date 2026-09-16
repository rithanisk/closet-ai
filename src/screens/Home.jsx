import React, { useMemo, useState } from 'react';
import { ArrowRight, CloudSun, Plus, Sparkles } from 'lucide-react';
import { EmptyState, ItemCard, OutfitPreview, PageHeader } from '../components';

export function HomeScreen({ profile, wardrobe, saved, onNavigate, onStartStylist }) {
  const [prompt, setPrompt] = useState('');
  const firstName = profile.name?.split(' ')[0] || 'there';
  const categoryCounts = useMemo(() => Object.entries(wardrobe.reduce((result, item) => {
    result[item.category] = (result[item.category] || 0) + 1;
    return result;
  }, {})), [wardrobe]);

  const submit = (event) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    onStartStylist(prompt.trim());
    setPrompt('');
  };

  return (
    <div className="page home-page">
      <PageHeader eyebrow="Your daily edit" title={`Good afternoon, ${firstName}.`} description={wardrobe.length ? "Here's what's happening with your wardrobe today." : "Let's get your wardrobe started."} />
      {!wardrobe.length ? (
        <EmptyState icon={Sparkles} title="Your wardrobe is empty" body="Upload a few photos—a flat lay, your closet, or even a mirror selfie. We'll detect each item and let you confirm it before anything is saved." action={<button className="button button-dark" onClick={() => onNavigate('upload')}>Upload your first photos</button>} />
      ) : (
        <>
          <section className="home-hero-grid">
            <form className="stylist-cta-card" onSubmit={submit}>
              <div className="eyebrow inverse">What are you dressing for?</div>
              <h2>Your closet already<br />has the answer.</h2>
              <div className="dark-input-row">
                <input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Coffee with a friend, casual but put together" aria-label="Describe what you are dressing for" />
                <button aria-label="Ask the stylist"><ArrowRight size={18} /></button>
              </div>
            </form>
            <article className="weather-card">
              <CloudSun size={31} strokeWidth={1.4} />
              <div className="eyebrow">Location & weather</div>
              <h2>{profile.city || 'Singapore'}</h2>
              <p>29°C · Partly cloudy · Humid</p>
              <span>Light layers recommended</span>
            </article>
          </section>

          <section className="summary-grid">
            <article className="panel wardrobe-summary">
              <div className="section-heading"><h2>Wardrobe · {wardrobe.length} items</h2><button className="text-link" onClick={() => onNavigate('wardrobe')}>View all →</button></div>
              <div className="category-list">{categoryCounts.slice(0, 6).map(([name, count]) => <span key={name}>{name} <small>{count}</small></span>)}</div>
            </article>
            <article className="panel add-more-card">
              <div><div className="eyebrow">Improve your edit</div><h3>Add more for stronger picks</h3><p>More pieces give your stylist better combinations.</p></div>
              <button className="button button-outline" onClick={() => onNavigate('upload')}><Plus size={15} /> Add photos</button>
            </article>
          </section>

          <section className="content-section">
            <div className="section-heading"><h2>Recently added</h2><button className="text-link" onClick={() => onNavigate('wardrobe')}>See wardrobe →</button></div>
            <div className="item-grid item-grid-four">{wardrobe.slice(0, 4).map((item) => <ItemCard key={item.id} item={item} onClick={() => onNavigate('wardrobe', item.id)} />)}</div>
          </section>

          <section className="content-section">
            <div className="section-heading"><h2>Recently saved outfits</h2><button className="text-link" onClick={() => onNavigate('saved')}>View library →</button></div>
            {saved.length ? <div className="saved-row">{saved.slice(0, 3).map((outfit) => <article className="mini-outfit" key={outfit.savedId}><OutfitPreview items={outfit.items} /><h3>{outfit.title}</h3><p>{outfit.items.length} items · {outfit.occasion || 'Styled for you'}</p></article>)}</div> : <div className="dashed-note">Nothing saved yet—approve an outfit from the Stylist to build your library.</div>}
          </section>
        </>
      )}
    </div>
  );
}
