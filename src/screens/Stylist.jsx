import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, CloudSun, Heart, RefreshCw, Send, Shirt, ShoppingBag, Sparkles, X } from 'lucide-react';
import { ItemVisual, LoadingLine, Modal, OutfitFlatLay } from '../components';
import { sortHeadToToe } from '../shared/flatlay';
import { api } from '../api';
import { promptChips } from '../data';

export function StylistScreen({ wardrobe, profile, saved, onSave, onUpload, initialPrompt, onConsumePrompt, onTryOn }) {
  const [stage, setStage] = useState('empty');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [constraints, setConstraints] = useState([]);
  const [location, setLocation] = useState(profile.city || '');
  const [weatherSummary, setWeatherSummary] = useState('Live weather will be checked when you ask.');
  const [coordinates, setCoordinates] = useState(null);
  const [outfits, setOutfits] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false);
  const [lastPrompt, setLastPrompt] = useState('');
  const chatEnd = useRef(null);
  const detail = outfits.find((outfit) => outfit.id === detailId);
  const savedIds = useMemo(() => new Set(saved.map((outfit) => outfit.id)), [saved]);

  const generate = async (occasion, city, refinement = '') => {
    setStage('loading');
    setLastPrompt(occasion);
    try {
      const data = await api('/api/outfits/generate', { method: 'POST', body: JSON.stringify({ prompt: occasion, city, refinement, latitude: coordinates?.latitude, longitude: coordinates?.longitude }) });
      setOutfits(data.outfits);
      setConstraints(data.constraints);
      setWeatherSummary(data.weatherSummary);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: data.assistantMessage }]);
      setStage('results');
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: error.message }]);
      setStage('chat');
    }
  };

  const ask = (text) => {
    if (!text.trim()) return;
    const request = text.trim();
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: request }]);
    setInput('');
    setLastPrompt(request);
    if (!location) {
      setStage('followup');
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: 'Which city will you be in so I can account for the live weather?' }]);
    } else generate(request, location);
  };

  useEffect(() => {
    if (initialPrompt) {
      ask(initialPrompt);
      onConsumePrompt();
    }
    // Initial prompts are consumed only when navigating in from another screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);
  useEffect(() => {
    if (!profile.preciseLocation || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setCoordinates(null),
      { maximumAge: 15 * 60 * 1000, timeout: 6000 },
    );
  }, [profile.preciseLocation]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, stage]);

  const submit = (event) => { event.preventDefault(); ask(input); };
  const submitLocation = (event) => {
    event.preventDefault();
    if (!input.trim()) return;
    const city = input.trim();
    setLocation(city);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: city }]);
    setInput('');
    generate(lastPrompt || 'Create a versatile outfit', city);
  };
  const refine = (label) => {
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: label }]);
    setDetailId(null);
    generate(lastPrompt || 'Create a complete outfit', location, label);
  };
  const regenerate = () => {
    setDetailId(null);
    generate(lastPrompt || 'Create three fresh complete outfit options', location, 'Give me three different options from the previous set.');
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
          {stage === 'empty' && (wardrobe.length ? <div className="stylist-empty"><span><Sparkles size={24} /></span><h2>What are we dressing for?</h2><p>Tell me the occasion, mood, or non-negotiables. I’ll work with what you already own.</p><div className="prompt-chip-grid">{promptChips.map((chip) => <button key={chip} onClick={() => ask(chip)}>{chip}</button>)}</div></div> : <div className="stylist-empty"><span><Sparkles size={24} /></span><h2>Your stylist needs a wardrobe</h2><p>Add a few pieces first, then I can build complete outfits around what you actually own.</p><button className="button button-primary" onClick={onUpload}>Upload wardrobe photos</button></div>)}
          {messages.map((message) => <div className={`message-row ${message.role}`} key={message.id}><div className="message-bubble">{message.text}</div></div>)}
          {stage === 'loading' && <div className="stylist-loading"><LoadingLine>Reading your wardrobe, live weather, inspiration, and saved style…</LoadingLine><div className="loading-rule"><span /></div></div>}
          {stage === 'results' && <div className="results-wrap"><div className="results-heading"><div><div className="eyebrow">Your edit</div><h2>Three looks, ranked for you</h2></div><button className="text-link" onClick={regenerate}><RefreshCw size={14} /> Regenerate all</button></div><div className="outfit-grid">{outfits.map((outfit) => <article className="outfit-card" key={outfit.id}><button className="outfit-card-visual" onClick={() => { setDetailId(outfit.id); setDismissedSuggestion(false); }} aria-label={`Open ${outfit.title}`}><span className="rank-label">Option {outfit.rank}</span><OutfitFlatLay items={outfit.items} label={`${outfit.title}: ${outfit.items.map((item) => item.name).join(', ')}`} /></button><h3>{outfit.title}</h3><p>{outfit.blurb}</p><div className="outfit-actions"><button className="button button-primary" onClick={() => onTryOn(outfit)}><Shirt size={14} /> Try on</button><button className="button button-ghost" onClick={() => { setDetailId(outfit.id); setDismissedSuggestion(false); }}>Details</button><button className={`icon-toggle ${savedIds.has(outfit.id) ? 'on' : ''}`} onClick={() => onSave(outfit)} aria-label={savedIds.has(outfit.id) ? 'Saved' : 'Save outfit'} aria-pressed={savedIds.has(outfit.id)}><Heart size={16} fill={savedIds.has(outfit.id) ? 'currentColor' : 'none'} /></button></div></article>)}</div></div>}
          <div ref={chatEnd} />
        </div>
        <form className="chat-composer" onSubmit={stage === 'followup' ? submitLocation : submit}>
          <input disabled={!wardrobe.length || stage === 'loading'} value={input} onChange={(event) => setInput(event.target.value)} placeholder={stage === 'followup' ? 'Enter a city, e.g. Singapore' : stage === 'results' ? 'Ask for a change—swap the coat, make it more casual…' : 'Describe the occasion, mood, or constraints…'} aria-label="Message your stylist" />
          <button disabled={!wardrobe.length || !input.trim() || stage === 'loading'} aria-label="Send"><Send size={16} /></button>
        </form>
      </section>
      <aside className="context-pane">
        <div className="eyebrow">Context</div>
        <div className="context-block"><div className="context-icon"><CloudSun size={20} /></div><small>Location & weather</small>{location ? <><strong>{location}</strong><span>{weatherSummary}</span></> : <span>Awaiting location—weather not yet considered.</span>}</div>
        <div className="context-block"><small>Constraints understood</small><div className="constraint-list">{constraints.length ? constraints.map((constraint) => <span key={constraint}>{constraint}</span>) : <p>None yet—tell the stylist what matters.</p>}</div></div>
        <div className="context-block suggested"><small>Suggested prompts</small>{promptChips.slice(0, 6).map((chip) => <button key={chip} onClick={() => ask(chip)}><ArrowRight size={12} /> {chip}</button>)}</div>
      </aside>
      {detail && <Modal onClose={() => setDetailId(null)} size="large" label={detail.title}><div className="outfit-detail"><section><div className="eyebrow">Option {detail.rank}</div><h2>{detail.title}</h2><div className="detail-hero"><OutfitFlatLay items={detail.items} size="large" /><div className="detail-items">{sortHeadToToe(detail.items).map((item) => { const index = detail.items.indexOf(item); return <article key={`${item.id}-${index}`}><ItemVisual item={item} compact /><div><strong>{item.name}</strong><small>{item.category}</small></div><button onClick={() => replaceItem(detail, index)}>Swap</button></article>; })}</div></div>{detail.compromiseNote && <div className="compromise"><strong>Closest owned alternative</strong>{detail.compromiseNote}</div>}{detail.shoppingSuggestion && !dismissedSuggestion && <div className="shopping-suggestion"><button onClick={() => setDismissedSuggestion(true)}><X size={15} /></button><ShoppingBag size={18} /><div><small>Not in your wardrobe · suggestion</small><p>{detail.shoppingSuggestion}</p></div></div>}</section><aside className="outfit-rationale"><Rationale label="Why it works" text={detail.why} /><Rationale label="Occasion fit" text={detail.occasionFit} /><Rationale label="Weather fit" text={detail.weatherFit} /><Rationale label="Styling notes" text={detail.stylingNotes} />{detail.inspirationNote && <Rationale label="From your inspiration" text={detail.inspirationNote} />}<div className="quick-refine"><button onClick={() => refine('More casual')}>More casual</button><button onClick={() => refine('More formal')}>More formal</button><button onClick={() => refine('Warmer')}>Warmer</button><button onClick={() => refine('Another color direction')}>Try another color</button></div><button className="button button-primary button-full" onClick={() => onTryOn(detail)}><Shirt size={15} /> Try it on me</button><button className="button button-secondary button-full" onClick={() => onSave(detail)}>{savedIds.has(detail.id) ? <><Check size={15} /> Saved</> : <><Heart size={15} /> Approve & save</>}</button><button className="button button-ghost button-full" onClick={regenerate}><RefreshCw size={14} /> Regenerate</button></aside></div></Modal>}
    </div>
  );
}

function Rationale({ label, text }) { return <div className="rationale-block"><small>{label}</small><p>{text}</p></div>; }
