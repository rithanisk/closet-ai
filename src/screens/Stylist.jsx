import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, CloudSun, RefreshCw, Send, ShoppingBag, Sparkles, X } from 'lucide-react';
import { ItemVisual, LoadingLine, Modal, OutfitPreview } from '../components';
import { buildOutfits, promptChips } from '../data';

function extractConstraints(text) {
  const lower = text.toLowerCase();
  const constraints = [];
  if (lower.includes('no heel') || lower.includes('walking')) constraints.push('No heels');
  if (lower.includes('feminin')) constraints.push('Feminine');
  if (lower.includes('polish') || lower.includes('formal')) constraints.push('Polished');
  if (lower.includes('casual')) constraints.push('Casual');
  if (lower.includes('warm')) constraints.push('Warm layer');
  if (lower.includes('rain')) constraints.push('Rain-ready');
  return constraints.length ? constraints : ['Use my wardrobe'];
}

export function StylistScreen({ wardrobe, profile, saved, onSave, onUpload, initialPrompt, onConsumePrompt }) {
  const [stage, setStage] = useState('empty');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [constraints, setConstraints] = useState([]);
  const [location, setLocation] = useState(profile.city || '');
  const [outfits, setOutfits] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false);
  const chatEnd = useRef(null);
  const detail = outfits.find((outfit) => outfit.id === detailId);
  const savedIds = useMemo(() => new Set(saved.map((outfit) => outfit.id)), [saved]);

  const ask = (text) => {
    if (!text.trim()) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text }]);
    setConstraints(extractConstraints(text));
    setInput('');
    if (!location) {
      setStage('followup');
      window.setTimeout(() => setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: 'Which city will you be in so I can account for the weather?' }]), 300);
    } else generate(text, location);
  };

  const generate = (occasion, city) => {
    setStage('loading');
    window.setTimeout(() => {
      setOutfits(buildOutfits(wardrobe, { occasion, location: city, weather: '29°C · Partly cloudy · Humid' }));
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: 'I found three complete looks in your wardrobe. I ranked them for style, comfort, and the weather.' }]);
      setStage('results');
    }, 1100);
  };

  useEffect(() => {
    if (initialPrompt) {
      ask(initialPrompt);
      onConsumePrompt();
    }
    // Initial prompts are intentionally consumed only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, stage]);

  const submit = (event) => { event.preventDefault(); ask(input); };
  const submitLocation = (event) => {
    event.preventDefault();
    if (!input.trim()) return;
    const city = input.trim();
    setLocation(city);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: city }]);
    setInput('');
    generate('your plans', city);
  };
  const refine = (label) => {
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: label }, { id: crypto.randomUUID(), role: 'assistant', text: `Done—I kept the strongest parts of the look and adjusted it to feel ${label.toLowerCase()}.` }]);
  };
  const regenerate = () => {
    setStage('loading');
    window.setTimeout(() => { setOutfits((current) => [...current.slice(1), current[0]].map((outfit, index) => ({ ...outfit, rank: index + 1 }))); setStage('results'); }, 800);
  };
  const replaceItem = (outfit, itemIndex) => {
    const used = new Set(outfit.items.map((item) => item.id));
    const replacement = wardrobe.find((item) => item.available && !used.has(item.id) && item.category === outfit.items[itemIndex].category) || wardrobe.find((item) => item.available && !used.has(item.id));
    if (!replacement) return;
    setOutfits((current) => current.map((entry) => entry.id === outfit.id ? { ...entry, items: entry.items.map((item, index) => index === itemIndex ? replacement : item) } : entry));
  };

  return (
    <div className="stylist-page">
      <section className="chat-pane">
        <div className="stylist-heading"><div className="eyebrow">Personal edit</div><h1>Stylist</h1></div>
        <div className="chat-scroll">
          {stage === 'empty' && (wardrobe.length ? <div className="stylist-empty"><span><Sparkles size={24} /></span><h2>What are we dressing for?</h2><p>Tell me the occasion, mood, or non-negotiables. I’ll work with what you already own.</p><div className="prompt-chip-grid">{promptChips.map((chip) => <button key={chip} onClick={() => ask(chip)}>{chip}</button>)}</div></div> : <div className="stylist-empty"><span><Sparkles size={24} /></span><h2>Your stylist needs a wardrobe</h2><p>Add a few pieces first, then I can build complete outfits around what you actually own.</p><button className="button button-dark" onClick={onUpload}>Upload wardrobe photos</button></div>)}
          {messages.map((message) => <div className={`message-row ${message.role}`} key={message.id}><div className="message-bubble">{message.text}</div></div>)}
          {stage === 'loading' && <div className="stylist-loading"><LoadingLine>Reading your wardrobe, weather, and saved style…</LoadingLine><div className="loading-rule"><span /></div></div>}
          {stage === 'results' && <div className="results-wrap"><div className="results-heading"><div><div className="eyebrow">Your edit</div><h2>Three looks, ranked for you</h2></div><button className="text-link" onClick={regenerate}><RefreshCw size={14} /> Regenerate all</button></div><div className="outfit-grid">{outfits.map((outfit) => <article className="outfit-card" key={outfit.id}><div className="rank-label">Option {outfit.rank}</div><OutfitPreview items={outfit.items} /><h3>{outfit.title}</h3><p>{outfit.blurb}</p><div className="outfit-actions"><button className="button button-outline" onClick={() => { setDetailId(outfit.id); setDismissedSuggestion(false); }}>View details</button><button className={`button ${savedIds.has(outfit.id) ? 'button-saved' : 'button-dark'}`} onClick={() => onSave(outfit)}>{savedIds.has(outfit.id) ? <><Check size={14} /> Saved</> : 'Approve'}</button></div></article>)}</div></div>}
          <div ref={chatEnd} />
        </div>
        <form className="chat-composer" onSubmit={stage === 'followup' ? submitLocation : submit}>
          <input disabled={!wardrobe.length} value={input} onChange={(event) => setInput(event.target.value)} placeholder={stage === 'followup' ? 'Enter a city, e.g. Singapore' : stage === 'results' ? 'Ask for a change—swap the coat, make it more casual…' : 'Describe the occasion, mood, or constraints…'} aria-label="Message your stylist" />
          <button disabled={!wardrobe.length || !input.trim()} aria-label="Send"><Send size={16} /></button>
        </form>
      </section>
      <aside className="context-pane">
        <div className="eyebrow">Context</div>
        <div className="context-block"><div className="context-icon"><CloudSun size={20} /></div><small>Location & weather</small>{location ? <><strong>{location}</strong><span>29°C · Partly cloudy<br />Humid · Light breeze</span></> : <span>Awaiting location—weather not yet considered.</span>}</div>
        <div className="context-block"><small>Constraints understood</small><div className="constraint-list">{constraints.length ? constraints.map((constraint) => <span key={constraint}>{constraint}</span>) : <p>None yet—tell the stylist what matters.</p>}</div></div>
        <div className="context-block suggested"><small>Suggested prompts</small>{promptChips.slice(0, 6).map((chip) => <button key={chip} onClick={() => ask(chip)}><ArrowRight size={12} /> {chip}</button>)}</div>
      </aside>
      {detail && <Modal onClose={() => setDetailId(null)} size="large" label={detail.title}><div className="outfit-detail"><section><div className="eyebrow">Option {detail.rank}</div><h2>{detail.title}</h2><div className="detail-items">{detail.items.map((item, index) => <article key={`${item.id}-${index}`}><ItemVisual item={item} /><div><strong>{item.name}</strong><button onClick={() => replaceItem(detail, index)}>Replace</button></div></article>)}</div>{detail.compromiseNote && <div className="compromise"><strong>Closest owned alternative</strong>{detail.compromiseNote}</div>}{detail.shoppingSuggestion && !dismissedSuggestion && <div className="shopping-suggestion"><button onClick={() => setDismissedSuggestion(true)}><X size={15} /></button><ShoppingBag size={18} /><div><small>Not in your wardrobe · suggestion</small><p>{detail.shoppingSuggestion}</p></div></div>}</section><aside className="outfit-rationale"><Rationale label="Why it works" text={detail.why} /><Rationale label="Occasion fit" text={detail.occasionFit} /><Rationale label="Weather fit" text={detail.weatherFit} /><Rationale label="Styling notes" text={detail.stylingNotes} /><div className="quick-refine"><button onClick={() => refine('More casual')}>More casual</button><button onClick={() => refine('More formal')}>More formal</button><button onClick={() => refine('Warmer')}>Warmer</button><button onClick={() => refine('Another color direction')}>Try another color</button></div><button className="button button-outline button-full" onClick={regenerate}><RefreshCw size={14} /> Regenerate this outfit</button><button className="button button-dark button-full" onClick={() => onSave(detail)}>{savedIds.has(detail.id) ? 'Saved ✓' : 'Approve & save'}</button></aside></div></Modal>}
    </div>
  );
}

function Rationale({ label, text }) { return <div className="rationale-block"><small>{label}</small><p>{text}</p></div>; }
