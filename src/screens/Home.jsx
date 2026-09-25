import React, { useMemo, useState } from 'react';
import { ArrowRight, CloudSun, Orbit, Palette, PersonStanding, Plus, ShoppingBag, Sparkles } from 'lucide-react';
import { EmptyState, ItemCard, OutfitFlatLay, PageHeader } from '../components';
import { promptChips } from '../data';

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

export function HomeScreen({ profile, wardrobe, saved, onNavigate, onStartStylist }) {
  const [prompt, setPrompt] = useState('');
  const firstName = profile.name?.split(' ')[0] || 'there';
  const categoryCount = useMemo(() => new Set(wardrobe.map((item) => item.category)).size, [wardrobe]);
  const orbItems = wardrobe.filter((item) => item.image).slice(0, 6);

  const submit = (event) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    onStartStylist(prompt.trim());
    setPrompt('');
  };

  return (
    <div className="page home-page">
      <PageHeader eyebrow="Today" title={`${greeting()}, ${firstName}`} description={wardrobe.length ? 'What are we getting dressed for?' : "Let's get your wardrobe started."} />
      {!wardrobe.length ? (
        <EmptyState icon={Sparkles} title="Your wardrobe is empty" body="Upload a few photos, a flat lay, your closet, or a mirror selfie. We'll cut out each piece and let you confirm it before anything is saved." action={<button className="button button-primary button-large" onClick={() => onNavigate('upload')}>Upload your first photos</button>} />
      ) : (
        <>
          <section className="home-hero-grid">
            <form className="stylist-cta-card" onSubmit={submit}>
              <div className="eyebrow">Ask your stylist</div>
              <h2>Your closet already has the answer.</h2>
              <div className="cta-input-row">
                <input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Coffee with a friend, casual but put together" aria-label="Describe what you are dressing for" />
                <button className="button button-primary" aria-label="Ask the stylist"><ArrowRight size={17} /></button>
              </div>
              <div className="pill-row subtle">{promptChips.slice(0, 4).map((chip) => <button type="button" key={chip} onClick={() => onStartStylist(chip)}>{chip}</button>)}</div>
            </form>
            <button className="closet-teaser" onClick={() => onNavigate('closet')}>
              <span className="mini-orb" aria-hidden="true">
                {orbItems.map((item, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={item.id} src={item.image} alt="" style={{ left: `${50 + 30 * Math.cos((2 * Math.PI * index) / orbItems.length - Math.PI / 2)}%`, top: `${50 + 30 * Math.sin((2 * Math.PI * index) / orbItems.length - Math.PI / 2)}%` }} />
                ))}
              </span>
              <span className="teaser-copy"><span className="eyebrow">Your closet</span><strong>{wardrobe.length} pieces · {categoryCount} rails</strong><span className="teaser-link"><Orbit size={14} /> Step inside</span></span>
            </button>
          </section>

          <section className="tools-grid">
            <button className="tool-card" onClick={() => onNavigate('fitting')}>
              <span className="tool-icon"><PersonStanding size={18} /></span>
              <div><h3>Fitting room</h3><p>Dress your twin and see it on you.</p></div>
              <ArrowRight size={16} />
            </button>
            <button className="tool-card" onClick={() => onNavigate('inspiration')}>
              <span className="tool-icon"><Palette size={18} /></span>
              <div><h3>{profile.styleProfile ? 'Style profile on' : 'Inspiration'}</h3><p>{profile.styleProfile?.aesthetics?.length ? profile.styleProfile.aesthetics.slice(0, 3).join(' · ') : 'Teach the stylist your taste.'}</p></div>
              <ArrowRight size={16} />
            </button>
            <button className="tool-card" onClick={() => onNavigate('gaps')}>
              <span className="tool-icon"><ShoppingBag size={18} /></span>
              <div><h3>Wardrobe gaps</h3><p>Pieces that unlock the most looks.</p></div>
              <ArrowRight size={16} />
            </button>
            <div className="tool-card weather-mini">
              <span className="tool-icon"><CloudSun size={18} /></span>
              <div><h3>{profile.city || 'Set your city'}</h3><p>Live weather is checked when you ask.</p></div>
            </div>
          </section>

          <section className="content-section">
            <div className="section-heading"><h2>Recently added</h2><button className="text-link" onClick={() => onNavigate('wardrobe')}>See all <ArrowRight size={13} /></button></div>
            <div className="item-grid item-grid-five">
              {wardrobe.slice(0, 4).map((item) => <ItemCard key={item.id} item={item} onClick={() => onNavigate('wardrobe')} />)}
              <button className="add-tile" onClick={() => onNavigate('upload')}><Plus size={20} /><span>Add more</span></button>
            </div>
          </section>

          <section className="content-section">
            <div className="section-heading"><h2>Saved outfits</h2>{saved.length > 0 && <button className="text-link" onClick={() => onNavigate('saved')}>View library <ArrowRight size={13} /></button>}</div>
            {saved.length ? (
              <div className="saved-row">{saved.slice(0, 3).map((outfit) => <button className="mini-outfit" key={outfit.savedId} onClick={() => onNavigate('saved')}><OutfitFlatLay items={outfit.items} size="small" label={outfit.title} /><h3>{outfit.title}</h3><p>{outfit.items.length} pieces</p></button>)}</div>
            ) : <div className="dashed-note">Nothing saved yet. Approve a look from the stylist to start your library.</div>}
          </section>
        </>
      )}
    </div>
  );
}
