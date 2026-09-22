import React, { useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { Field } from '../components';
import { styleOptions } from '../data';

export function Auth({ onComplete }) {
  const [mode, setMode] = useState('signin');
  const [step, setStep] = useState('auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [styles, setStyles] = useState(['Minimal', 'Feminine', 'Classic']);
  const [city, setCity] = useState('Singapore');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (mode === 'signup') setStep('onboarding');
    else {
      setBusy(true); setError('');
      try { await onComplete({ mode: 'login', email, password }); }
      catch (nextError) { setError(nextError.message); setBusy(false); }
    }
  };

  const finishSignup = async () => {
    setBusy(true); setError('');
    try { await onComplete({ mode: 'signup', name, email, password, styles, city }); }
    catch (nextError) { setError(nextError.message); setBusy(false); }
  };

  if (step === 'onboarding') {
    return (
      <main className="onboarding-shell">
        <section className="onboarding-card">
          <div className="eyebrow">One minute setup</div>
          <h1>Make the stylist<br /><em>feel like yours.</em></h1>
          <p className="onboarding-intro">Choose the aesthetics you reach for most. You can change these whenever your style evolves.</p>
          <div className="style-grid">
            {styleOptions.map((style) => {
              const selected = styles.includes(style);
              return (
                <button key={style} className={`style-option ${selected ? 'selected' : ''}`} onClick={() => setStyles((current) => selected ? current.filter((item) => item !== style) : [...current, style])}>
                  <span className={`style-swatch style-${style.toLowerCase().replaceAll(' ', '-')}`} />
                  <strong>{style}</strong>
                  {selected && <Check size={16} />}
                </button>
              );
            })}
          </div>
          <div className="onboarding-footer">
            <Field label="Your default city">
              <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Singapore" />
            </Field>
            <button className="button button-dark" disabled={busy || !city.trim()} onClick={finishSignup}>{busy ? 'Creating your closet…' : 'Build my wardrobe →'}</button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="auth-orb orb-coral" />
        <div className="auth-orb orb-olive" />
        <div className="brand-kicker">Closet AI</div>
        <div className="auth-hero-copy">
          <h1>Everything<br />you own,<br /><em>finally</em> in view.</h1>
          <p>Upload photos of your clothes. We build the wardrobe, you get three outfits worth wearing—for whatever tonight is.</p>
        </div>
        <div className="privacy-line"><ShieldCheck size={16} /> Original photos are deleted once your items are extracted. Only the clean cutouts stay.</div>
      </section>
      <section className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-tabs" role="tablist">
            <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); }}>Sign in</button>
            <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}>Create account</button>
          </div>
          <div>
            <div className="eyebrow">{mode === 'signin' ? 'Welcome back' : 'Start your closet'}</div>
            <h2>{mode === 'signin' ? 'Your wardrobe is waiting.' : 'Get dressed with less guesswork.'}</h2>
          </div>
          {mode === 'signup' && <Field label="Full name"><input value={name} onChange={(event) => setName(event.target.value)} required /></Field>}
          <Field label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
          <Field label="Password" hint={mode === 'signup' ? 'Use at least 8 characters.' : undefined}><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === 'signup' ? 8 : 1} required autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></Field>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-dark button-full" type="submit" disabled={busy}>{busy ? 'Signing in…' : mode === 'signin' ? 'Sign in' : 'Continue'}</button>
          <p className="form-privacy">By continuing, you agree that original photos are processed once and then permanently deleted.</p>
        </form>
      </section>
    </main>
  );
}
