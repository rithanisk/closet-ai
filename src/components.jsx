import React from 'react';
import {
  Archive, ChevronRight, CircleAlert, CloudSun, Heart, Home, ImagePlus,
  LoaderCircle, LogOut, MessageCircleMore, RotateCcw, Search, Settings,
  Shirt, Sparkles, Trash2, Upload, WandSparkles, X,
} from 'lucide-react';

export const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'wardrobe', label: 'Wardrobe', icon: Shirt },
  { id: 'stylist', label: 'Stylist', icon: MessageCircleMore },
  { id: 'saved', label: 'Saved outfits', icon: Heart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ screen, onNavigate, onUpload, onSignOut, name }) {
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <aside className="sidebar">
      <button className="wordmark" onClick={() => onNavigate('home')} aria-label="Closet AI home">Closet AI</button>
      <nav aria-label="Primary navigation">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-item ${screen === id ? 'active' : ''}`} onClick={() => onNavigate(id)}>
            <Icon size={17} strokeWidth={1.7} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className="button button-dark button-full" onClick={onUpload}><Upload size={15} /> Upload photos</button>
        <button className="profile-row" onClick={() => onNavigate('settings')}>
          <span className="avatar">{initials || 'JL'}</span>
          <span className="profile-copy"><strong>{name}</strong><small>View profile</small></span>
          <ChevronRight size={15} />
        </button>
        <button className="signout-link" onClick={onSignOut}><LogOut size={14} /> Sign out</button>
      </div>
    </aside>
  );
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function ItemVisual({ item, compact = false, className = '' }) {
  const style = item.image
    ? { backgroundImage: `url(${item.image})` }
    : { '--accent': item.accent || '#6B7A4F' };
  return (
    <div className={`item-visual ${item.image ? 'photo' : 'pattern'} ${compact ? 'compact' : ''} ${className}`} style={style}>
      {!item.image && (
        <div className="item-monogram">
          <span>{item.category || 'Piece'}</span>
          <strong>{item.name}</strong>
        </div>
      )}
    </div>
  );
}

export function ItemCard({ item, onClick }) {
  return (
    <button className="item-card" onClick={onClick} aria-label={`Open ${item.name}`}>
      <div className="item-card-visual">
        <ItemVisual item={item} />
        {item.favorite && <span className="favorite-badge" aria-label="Favorite"><Heart size={15} fill="currentColor" /></span>}
        {!item.available && <span className="unavailable-badge">Unavailable</span>}
      </div>
      <div className="item-card-copy">
        <strong>{item.name}</strong>
        <span>{item.category} · {item.color}</span>
      </div>
    </button>
  );
}

export function OutfitPreview({ items, large = false }) {
  return (
    <div className={`outfit-preview ${large ? 'large' : ''}`}>
      {items.slice(0, 4).map((item, index) => <ItemVisual key={`${item.id || item.name}-${index}`} item={item} compact />)}
    </div>
  );
}

export function EmptyState({ icon: Icon = Sparkles, title, body, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={24} strokeWidth={1.5} /></span>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Modal({ children, onClose, size = 'medium', label }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={label}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        {children}
      </section>
    </div>
  );
}

export function ConfirmModal({ config, onClose }) {
  if (!config) return null;
  return (
    <Modal onClose={onClose} size="small" label={config.title}>
      <div className="confirm-modal">
        <span className="danger-icon"><CircleAlert size={22} /></span>
        <h2>{config.title}</h2>
        <p>{config.body} This action cannot be undone.</p>
        <div className="modal-actions">
          <button className="button button-outline" onClick={onClose}>Cancel</button>
          <button className="button button-danger" onClick={config.onConfirm}>{config.actionLabel}</button>
        </div>
      </div>
    </Modal>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return <div className="toast" role="status"><span />{message}</div>;
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function LoadingLine({ children }) {
  return <div className="loading-line"><LoaderCircle className="spin" size={17} />{children}</div>;
}

export const icons = { Archive, CloudSun, Heart, ImagePlus, RotateCcw, Search, Sparkles, Trash2, WandSparkles };
