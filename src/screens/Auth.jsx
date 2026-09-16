import React, { useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { Field } from '../components';
import { styleOptions } from '../data';

export function Auth({ onComplete }) {
  const [mode, setMode] = useState('signin');
  const [step, setStep] = useState('auth');
  const [name, setName] = useState('Jordan Lee');
  const [email, setEmail] = useState('jordan@school.edu');
  const [password, setPassword] = useState('closetai');
  const [styles, setStyles] = useState(['Minimal', 'Feminine', 'Classic']);
  const [city, setCity] = useState('Singapore');

  const submit = (event) => {
    event.preventDefault();
    if (mode === 'signup') setStep('onboarding');
    else onComplete({ name: name || 'Jordan Lee', email, styles, city, isNew: false });
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
            <button className="button button-dark" onClick={() => onComplete({ name, email, styles, city, isNew: true })}>Build my wardrobe →</button>
          </div>
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
            <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>Sign in</button>
            <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create account</button>
          </div>
          <div>
            <div className="eyebrow">{mode === 'signin' ? 'Welcome back' : 'Start your closet'}</div>
            <h2>{mode === 'signin' ? 'Your wardrobe is waiting.' : 'Get dressed with less guesswork.'}</h2>
          </div>
          {mode === 'signup' && <Field label="Full name"><input value={name} onChange={(event) => setName(event.target.value)} required /></Field>}
          <Field label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
          <Field label="Password"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required /></Field>
          {mode === 'signin' && <button type="button" className="text-link auth-forgot">Forgot password?</button>}
          <button className="button button-dark button-full" type="submit">{mode === 'signin' ? 'Sign in' : 'Create account'}</button>
          <p className="form-privacy">By continuing, you agree that original photos are processed once and then permanently deleted.</p>
        </form>
      </section>
    </main>
  );
}
