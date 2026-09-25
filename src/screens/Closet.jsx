import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, LayoutGrid, Minus, Plus, Search, Shirt, Sparkles, WandSparkles, X } from 'lucide-react';
import { ItemVisual } from '../components';
import { CATEGORIES } from '../shared/wardrobe';

const CARD = 150;
const GAP = 26;
const RAIL_GAP = 290;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function ClosetScreen({ wardrobe, onOpenItem, onTryOn, onStyle, onUpload, onListView }) {
  const [phase, setPhase] = useState('orb');
  const reducedMotion = useRef(false);
  useEffect(() => { reducedMotion.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }, []);

  const enter = useCallback(() => {
    if (!wardrobe.length) return;
    setPhase('opening');
    window.setTimeout(() => setPhase('room'), reducedMotion.current ? 0 : 750);
  }, [wardrobe.length]);

  return (
    <div className={`closet-page phase-${phase}`}>
      {phase !== 'room' && <Orb wardrobe={wardrobe} onEnter={enter} onUpload={onUpload} opening={phase === 'opening'} />}
      {phase !== 'orb' && <ClosetRoom wardrobe={wardrobe} onExit={() => setPhase('orb')} onOpenItem={onOpenItem} onTryOn={onTryOn} onStyle={onStyle} onListView={onListView} />}
    </div>
  );
}

function Orb({ wardrobe, onEnter, onUpload, opening }) {
  const floating = wardrobe.filter((item) => item.image).slice(0, 12);
  const categories = new Set(wardrobe.map((item) => item.category)).size;
  return (
    <section className={`orb-scene ${opening ? 'opening' : ''}`} onWheel={(event) => { if (event.deltaY < -4 || event.deltaY > 4) onEnter(); }}>
      <div className="orb-copy">
        <div className="eyebrow">Your closet</div>
        <h1>{wardrobe.length ? `${wardrobe.length} pieces, all in view` : 'Your closet is empty'}</h1>
        <p>{wardrobe.length ? `${categories} ${categories === 1 ? 'category' : 'categories'}, hung on rails you can walk through. Tap the orb or scroll to step inside.` : 'Upload a few photos and your pieces will appear inside the orb.'}</p>
      </div>
      <button className="orb" onClick={wardrobe.length ? onEnter : onUpload} aria-label={wardrobe.length ? 'Step inside your closet' : 'Upload photos'}>
        <span className="orb-glow" aria-hidden="true" />
        <span className="orb-sphere" aria-hidden="true">
          <span className="orb-ring">
            {floating.map((item, index) => (
              <span key={item.id} className="orb-item" style={{ transform: `translateY(${index % 2 ? 26 : -26}px) rotateY(${(360 / floating.length) * index}deg) translateZ(84px) rotateY(${-(360 / floating.length) * index}deg)` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt="" />
              </span>
            ))}
          </span>
          <span className="orb-shine" />
        </span>
        <span className="orb-label">{wardrobe.length ? <><Sparkles size={14} /> Step inside</> : <><Plus size={14} /> Add clothes</>}</span>
      </button>
    </section>
  );
}

function ClosetRoom({ wardrobe, onExit, onOpenItem, onTryOn, onStyle, onListView }) {
  const rails = useMemo(() => CATEGORIES
    .map((category) => ({ category, items: wardrobe.filter((item) => item.category === category) }))
    .filter((rail) => rail.items.length), [wardrobe]);
  const slots = Math.max(14, ...rails.map((rail) => rail.items.length + 2));
  const step = 360 / slots;
  const radius = Math.round(((CARD + GAP) * slots) / (2 * Math.PI));
  const maxOffset = (rails.length - 1) * RAIL_GAP;

  const [camera, setCamera] = useState({ angle: 0, offset: 0, zoom: 0 });
  const [animating, setAnimating] = useState(false);
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(null);
  const [interacted, setInteracted] = useState(false);
  const drag = useRef(null);
  const moved = useRef(false);
  const velocity = useRef(0);
  const frame = useRef(0);
  const viewport = useRef(null);

  const move = useCallback((changes) => setCamera((current) => ({
    angle: changes.angle ?? current.angle,
    offset: clamp(changes.offset ?? current.offset, 0, maxOffset),
    zoom: clamp(changes.zoom ?? current.zoom, -420, radius * 0.55),
  })), [maxOffset, radius]);

  const glide = useCallback(() => {
    cancelAnimationFrame(frame.current);
    const tick = () => {
      velocity.current *= 0.9;
      if (Math.abs(velocity.current) < 0.02) return;
      setCamera((current) => ({ ...current, angle: current.angle + velocity.current }));
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, []);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onPointerDown = (event) => {
    if (event.target.closest('button, input')) return;
    cancelAnimationFrame(frame.current);
    setAnimating(false);
    moved.current = false;
    drag.current = { x: event.clientX, y: event.clientY, angle: camera.angle, offset: camera.offset, last: event.clientX, time: performance.now() };
  };
  const onPointerMove = (event) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (!moved.current && Math.hypot(dx, dy) > 5) {
      // Capture only once it is really a drag, so plain clicks still reach the cards.
      moved.current = true;
      viewport.current?.setPointerCapture(event.pointerId);
    }
    if (!moved.current) return;
    if (!interacted) setInteracted(true);
    const now = performance.now();
    velocity.current = clamp(((event.clientX - drag.current.last) * 0.12) / Math.max(1, (now - drag.current.time) / 16), -2.5, 2.5);
    drag.current.last = event.clientX;
    drag.current.time = now;
    move({ angle: drag.current.angle + dx * 0.22, offset: drag.current.offset - dy * 1.1 });
  };
  const onPointerUp = () => { if (drag.current) { drag.current = null; if (moved.current) glide(); } };
  const onWheel = (event) => {
    setAnimating(false);
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) move({ angle: camera.angle - event.deltaX * 0.15 });
    else if (event.shiftKey) move({ offset: camera.offset + event.deltaY });
    else move({ zoom: camera.zoom - event.deltaY * 0.8 });
  };
  const onKeyDown = (event) => {
    const actions = {
      ArrowLeft: () => move({ angle: camera.angle + step }),
      ArrowRight: () => move({ angle: camera.angle - step }),
      ArrowUp: () => move({ offset: camera.offset - RAIL_GAP }),
      ArrowDown: () => move({ offset: camera.offset + RAIL_GAP }),
      '+': () => move({ zoom: camera.zoom + 90 }),
      '=': () => move({ zoom: camera.zoom + 90 }),
      '-': () => move({ zoom: camera.zoom - 90 }),
    };
    if (actions[event.key]) { event.preventDefault(); setAnimating(true); actions[event.key](); }
  };
  const jumpTo = (index) => { setAnimating(true); move({ offset: index * RAIL_GAP, angle: 0 }); };
  const zoomBy = (amount) => { setAnimating(true); move({ zoom: camera.zoom + amount }); };

  const search = query.trim().toLowerCase();
  const matches = (item) => !search || [item.name, item.color, item.subcategory, item.description, ...(item.styleTags || [])].join(' ').toLowerCase().includes(search);
  const activeRail = Math.round(camera.offset / RAIL_GAP);
  const matchCount = search ? wardrobe.filter(matches).length : null;

  return (
    <section className="closet-room" aria-label="Walk-in closet">
      <header className="closet-toolbar">
        <button className="button button-ghost" onClick={onExit}><ArrowLeft size={15} /> Orb</button>
        <label className="closet-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find something…" aria-label="Search your closet" />{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={13} /></button>}</label>
        {matchCount != null && <span className="closet-count">{matchCount} {matchCount === 1 ? 'match' : 'matches'}</span>}
        <button className="button button-ghost" onClick={onListView}><LayoutGrid size={15} /> List view</button>
      </header>

      <nav className="rail-nav" aria-label="Rails">
        {rails.map((rail, index) => <button key={rail.category} className={activeRail === index ? 'active' : ''} onClick={() => jumpTo(index)}>{rail.category}<small>{rail.items.length}</small></button>)}
      </nav>

      <div
        ref={viewport}
        className="closet-viewport"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        aria-describedby="closet-help"
      >
        <div className="closet-floor" aria-hidden="true" />
        <div className={`closet-world ${animating ? 'animating' : ''}`} style={{ transform: `translateZ(${camera.zoom - radius}px) translateY(${-camera.offset}px) rotateY(${camera.angle}deg)` }}>
          {rails.map((rail, railIndex) => {
            const start = -((rail.items.length - 1) / 2) * step;
            return (
              <div className="closet-rail" key={rail.category} style={{ transform: `translateY(${railIndex * RAIL_GAP}px)` }}>
                <div className="rail-tag" style={{ transform: `rotateY(${-camera.angle}deg) translateZ(${radius}px)` }}>{rail.category}<small>{rail.items.length}</small></div>
                {rail.items.map((item, index) => (
                  <button
                    key={item.id}
                    className={`hanger-card ${matches(item) ? '' : 'dimmed'} ${focus?.id === item.id ? 'focused' : ''}`}
                    style={{ transform: `rotateY(${start + index * step}deg) translateZ(${radius}px)` }}
                    onClick={() => { if (!moved.current) setFocus(item); }}
                    aria-label={item.name}
                  >
                    <span className="hanger-hook" aria-hidden="true" />
                    <ItemVisual item={item} compact />
                    <span className="hanger-name">{item.name}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        <div className="zoom-controls"><button onClick={() => zoomBy(120)} aria-label="Zoom in"><Plus size={15} /></button><button onClick={() => zoomBy(-120)} aria-label="Zoom out"><Minus size={15} /></button></div>
        <p id="closet-help" className={`closet-help ${interacted ? 'hidden' : ''}`}>Drag to turn and move between rails · scroll to zoom · arrow keys work too</p>
      </div>

      {focus && (
        <aside className="closet-focus" aria-label={focus.name}>
          <button className="icon-button focus-close" onClick={() => setFocus(null)} aria-label="Close"><X size={16} /></button>
          <ItemVisual item={focus} />
          <div className="eyebrow">{focus.category}{focus.color ? ` · ${focus.color}` : ''}</div>
          <h2>{focus.name}</h2>
          {focus.description && <p>{focus.description}</p>}
          <div className="focus-actions">
            <button className="button button-primary" onClick={() => onTryOn(focus)}><Shirt size={15} /> Try on</button>
            <button className="button button-secondary" onClick={() => onStyle(focus)}><WandSparkles size={15} /> Style it</button>
            <button className="text-link" onClick={() => onOpenItem(focus)}>Edit details</button>
          </div>
        </aside>
      )}
    </section>
  );
}
