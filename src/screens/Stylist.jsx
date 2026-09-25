import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Camera, Check, CloudSun, RefreshCw, Send, ShoppingBag, Sparkles, UploadCloud, X } from 'lucide-react';
import { ItemVisual, LoadingLine, Modal, OutfitPreview } from '../components';
import { api } from '../api';
import { promptChips } from '../data';

export function StylistScreen({ wardrobe, profile, saved, onSave, onUpload, initialPrompt, onConsumePrompt }) {
  const [stage, setStage] = useState('empty');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [constraints, setConstraints] = useState([]);
  const [location, setLocation] = useState(profile.city || '');
  const [weatherSummary, setWeatherSummary] = useState('Live weather will be checked when you ask.');
  const [coordinates, setCoordinates] = useState(null);
  const [outfits, setOutfits] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [tryOnOutfit, setTryOnOutfit] = useState(null);
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
          {stage === 'empty' && (wardrobe.length ? <div className="stylist-empty"><span><Sparkles size={24} /></span><h2>What are we dressing for?</h2><p>Tell me the occasion, mood, or non-negotiables. I’ll work with what you already own.</p><div className="prompt-chip-grid">{promptChips.map((chip) => <button key={chip} onClick={() => ask(chip)}>{chip}</button>)}</div></div> : <div className="stylist-empty"><span><Sparkles size={24} /></span><h2>Your stylist needs a wardrobe</h2><p>Add a few pieces first, then I can build complete outfits around what you actually own.</p><button className="button button-dark" onClick={onUpload}>Upload wardrobe photos</button></div>)}
          {messages.map((message) => <div className={`message-row ${message.role}`} key={message.id}><div className="message-bubble">{message.text}</div></div>)}
          {stage === 'loading' && <div className="stylist-loading"><LoadingLine>Reading your wardrobe, live weather, inspiration, and saved style…</LoadingLine><div className="loading-rule"><span /></div></div>}
          {stage === 'results' && <div className="results-wrap"><div className="results-heading"><div><div className="eyebrow">Your edit</div><h2>Three looks, ranked for you</h2></div><button className="text-link" onClick={regenerate}><RefreshCw size={14} /> Regenerate all</button></div><div className="outfit-grid">{outfits.map((outfit) => <article className="outfit-card" key={outfit.id}><div className="rank-label">Option {outfit.rank}</div><OutfitPreview items={outfit.items} /><h3>{outfit.title}</h3><p>{outfit.blurb}</p><div className="outfit-actions"><button className="button button-outline" onClick={() => { setDetailId(outfit.id); setDismissedSuggestion(false); }}>View details</button><button className={`button ${savedIds.has(outfit.id) ? 'button-saved' : 'button-dark'}`} onClick={() => onSave(outfit)}>{savedIds.has(outfit.id) ? <><Check size={14} /> Saved</> : 'Approve'}</button></div></article>)}</div></div>}
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
      {detail && <Modal onClose={() => setDetailId(null)} size="large" label={detail.title}><div className="outfit-detail"><section><div className="eyebrow">Option {detail.rank}</div><h2>{detail.title}</h2><div className="detail-items">{detail.items.map((item, index) => <article key={`${item.id}-${index}`}><ItemVisual item={item} /><div><strong>{item.name}</strong><button onClick={() => replaceItem(detail, index)}>Replace</button></div></article>)}</div>{detail.compromiseNote && <div className="compromise"><strong>Closest owned alternative</strong>{detail.compromiseNote}</div>}{detail.shoppingSuggestion && !dismissedSuggestion && <div className="shopping-suggestion"><button onClick={() => setDismissedSuggestion(true)}><X size={15} /></button><ShoppingBag size={18} /><div><small>Not in your wardrobe · suggestion</small><p>{detail.shoppingSuggestion}</p></div></div>}</section><aside className="outfit-rationale"><Rationale label="Why it works" text={detail.why} /><Rationale label="Occasion fit" text={detail.occasionFit} /><Rationale label="Weather fit" text={detail.weatherFit} /><Rationale label="Styling notes" text={detail.stylingNotes} />{detail.inspirationNote && <Rationale label="From your inspiration" text={detail.inspirationNote} />}<div className="quick-refine"><button onClick={() => refine('More casual')}>More casual</button><button onClick={() => refine('More formal')}>More formal</button><button onClick={() => refine('Warmer')}>Warmer</button><button onClick={() => refine('Another color direction')}>Try another color</button></div><button className="button button-outline button-full" onClick={() => setTryOnOutfit(detail)}><Camera size={14} /> Preview on me</button><button className="button button-outline button-full" onClick={regenerate}><RefreshCw size={14} /> Regenerate this outfit</button><button className="button button-dark button-full" onClick={() => onSave(detail)}>{savedIds.has(detail.id) ? 'Saved ✓' : 'Approve & save'}</button></aside></div></Modal>}
      {tryOnOutfit && <TryOnModal outfit={tryOnOutfit} onClose={() => setTryOnOutfit(null)} />}
    </div>
  );
}

function TryOnModal({ outfit, onClose }) {
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const selectPhoto = (file) => {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file || null); setPreview(file ? URL.createObjectURL(file) : ''); setResult(''); setError('');
  };
  const submit = async () => {
    if (!photo || !consent) return;
    setBusy(true); setError('');
    const formData = new FormData();
    formData.append('photo', photo);
    formData.append('itemIds', JSON.stringify(outfit.items.map((item) => item.id)));
    try {
      const data = await api('/api/try-on', { method: 'POST', body: formData });
      setResult(data.image);
    } catch (nextError) { setError(nextError.message); }
    finally { setBusy(false); }
  };

  return <Modal onClose={onClose} size="medium" label="Virtual try-on"><div className="tryon-modal"><div className="eyebrow">AI preview</div><h2>See this outfit on you</h2><p>Upload a clear, full-body photo. It is sent to OpenAI for this preview and is never stored by Closet AI.</p>{result ? <><img className="tryon-result" src={result} alt={`Virtual try-on of ${outfit.title}`} /><button className="button button-outline button-full" onClick={() => { setResult(''); setPhoto(null); setPreview(''); }}>Try another photo</button></> : <><label className="tryon-upload">{preview ? <img src={preview} alt="Your selected full-body preview" /> : <span><UploadCloud size={25} /><strong>Choose a full-body photo</strong><small>JPG, PNG, or WEBP · up to 20MB</small></span>}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectPhoto(event.target.files?.[0])} /></label><label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I have permission to use this photo and consent to AI processing for this preview.</span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark button-full" disabled={!photo || !consent || busy} onClick={submit}>{busy ? <LoadingLine>Creating your preview…</LoadingLine> : 'Generate virtual try-on'}</button></>}</div></Modal>;
}

function Rationale({ label, text }) { return <div className="rationale-block"><small>{label}</small><p>{text}</p></div>; }
