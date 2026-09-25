'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ConfirmModal, LoadingLine, Sidebar, Toast } from './components';
import { Auth } from './screens/Auth';
import { ClosetScreen } from './screens/Closet';
import { FittingRoomScreen } from './screens/FittingRoom';
import { HomeScreen } from './screens/Home';
import { ReviewScreen } from './screens/Review';
import { GapsScreen } from './screens/Gaps';
import { InspirationScreen } from './screens/Inspiration';
import { SavedScreen } from './screens/Saved';
import { SettingsScreen } from './screens/Settings';
import { StylistScreen } from './screens/Stylist';
import { UploadScreen } from './screens/Upload';
import { WardrobeScreen } from './screens/Wardrobe';
import { api } from './api';
import { COLORS } from './data';

export default function App() {
  const [sessionState, setSessionState] = useState('loading');
  const [profile, setProfile] = useState(null);
  const [wardrobe, setWardrobe] = useState([]);
  const [savedOutfits, setSavedOutfits] = useState([]);
  const [screen, setScreen] = useState('home');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [detections, setDetections] = useState([]);
  const [discardedImageIds, setDiscardedImageIds] = useState([]);
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [stylistPrompt, setStylistPrompt] = useState('');
  const [fitting, setFitting] = useState(null);
  const [wardrobeFocus, setWardrobeFocus] = useState(null);
  const consumeFitting = useCallback(() => setFitting(null), []);
  const consumeFocus = useCallback(() => setWardrobeFocus(null), []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await api('/api/auth/session');
        const [wardrobeData, outfitData] = await Promise.all([api('/api/wardrobe'), api('/api/outfits')]);
        if (!active) return;
        setProfile(session.user);
        setWardrobe(wardrobeData.items);
        setSavedOutfits(outfitData.outfits);
        setSessionState('signed-in');
      } catch {
        if (active) setSessionState('signed-out');
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const completeAuth = async (credentials) => {
    const endpoint = credentials.mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
    const data = await api(endpoint, { method: 'POST', body: JSON.stringify(credentials) });
    setProfile(data.user);
    const [wardrobeData, outfitData] = await Promise.all([api('/api/wardrobe'), api('/api/outfits')]);
    setWardrobe(wardrobeData.items);
    setSavedOutfits(outfitData.outfits);
    setSessionState('signed-in');
    setScreen('home');
  };

  const updateUploadFile = (id, changes) => setUploadFiles((current) => current.map((file) => file.id === id ? { ...file, ...changes } : file));

  const processUpload = async (upload) => {
    updateUploadFile(upload.id, { status: 'uploading', progress: 24, error: '' });
    const formData = new FormData();
    formData.append('file', upload.file);
    try {
      updateUploadFile(upload.id, { status: 'detecting', progress: 52 });
      const data = await api('/api/upload/extract', { method: 'POST', body: formData });
      updateUploadFile(upload.id, { status: 'preparing', progress: 88 });
      window.setTimeout(() => updateUploadFile(upload.id, { status: 'ready', progress: 100, detections: data.items }), 220);
    } catch (error) {
      updateUploadFile(upload.id, { status: error.status === 422 ? 'empty' : 'failed', progress: 100, error: error.message });
      setToast(error.message);
    }
  };

  const addFiles = (files) => {
    const valid = files.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 20 * 1024 * 1024);
    if (valid.length !== files.length) setToast('Some files were skipped. Use JPG, PNG, or WEBP images up to 20MB.');
    const prepared = valid.map((file, index) => ({
      id: crypto.randomUUID(), name: file.name, file, status: 'waiting', progress: 0,
      preview: URL.createObjectURL(file), accent: Object.values(COLORS)[index % Object.values(COLORS).length], detections: [],
    }));
    setUploadFiles((current) => [...current, ...prepared]);
    prepared.forEach(processUpload);
  };

  const openReview = () => {
    setDetections(uploadFiles.filter((file) => file.status === 'ready').flatMap((file) => file.detections || []));
    setScreen('review');
  };

  const removeDetection = (id) => {
    const removed = detections.find((item) => item.id === id);
    if (removed?.imageId) setDiscardedImageIds((ids) => [...ids, removed.imageId]);
    setDetections((current) => current.filter((item) => item.id !== id));
  };

  const addConfirmedItems = async () => {
    const approved = detections.filter((item) => item.selected);
    try {
      const data = await api('/api/wardrobe', {
        method: 'POST',
        body: JSON.stringify({
          items: approved.map(({ imageId, cutout, name, category, subcategory, color, secondaryColor, pattern, material, formality, season, warmth, fit, brand, description, styleTags, details }) => ({
            imageId, cutout: Boolean(cutout), name, category, subcategory, color, secondaryColor, pattern, material, formality, season, warmth, fit, brand, description, styleTags, details,
          })),
          discardedImageIds: [...discardedImageIds, ...detections.filter((item) => !item.selected).map((item) => item.imageId)],
        }),
      });
      uploadFiles.forEach((file) => file.preview && URL.revokeObjectURL(file.preview));
      setWardrobe(data.items); setDetections([]); setDiscardedImageIds([]); setUploadFiles([]); setScreen('wardrobe');
      setToast(`${approved.length} ${approved.length === 1 ? 'item' : 'items'} added to your wardrobe`);
    } catch (error) { setToast(error.message); }
  };

  const updateDetection = (id, changes) => setDetections((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));

  const retryCutout = async (item) => {
    updateDetection(item.id, { cutoutBusy: true });
    try {
      const data = await api('/api/upload/cutout', { method: 'POST', body: JSON.stringify({ imageId: item.imageId, name: item.name, category: item.category, subcategory: item.subcategory || '', description: item.description || '', details: item.details || [] }) });
      updateDetection(item.id, { imageId: data.imageId, image: data.image, cutout: true, cutoutBusy: false });
      setToast('Transparent cutout ready');
    } catch (error) { updateDetection(item.id, { cutoutBusy: false }); setToast(error.message); }
  };

  const upgradeCutout = async (item) => {
    try {
      await api('/api/upload/cutout', { method: 'POST', body: JSON.stringify({ imageId: item.imageId, wardrobeItemId: item.id, name: item.name, category: item.category, subcategory: item.subcategory || '', description: item.description || '', details: item.details || [] }) });
      const data = await api('/api/wardrobe');
      setWardrobe(data.items); setToast('Transparent cutout saved');
    } catch (error) { setToast(error.message); }
  };

  const updateItem = async (id, changes) => {
    try {
      const data = await api(`/api/wardrobe/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
      setWardrobe(data.items); setToast('Item updated');
    } catch (error) { setToast(error.message); }
  };

  const deleteItem = async (id, after) => {
    try {
      const data = await api(`/api/wardrobe/${id}`, { method: 'DELETE' });
      setWardrobe(data.items); after?.(); setToast('Item deleted');
    } catch (error) { setToast(error.message); }
  };

  const requestDeleteItem = (id, after) => setConfirm({
    title: 'Delete this item?',
    body: 'The extracted image and all its metadata will be permanently removed from your wardrobe.',
    actionLabel: 'Delete item',
    onConfirm: async () => { setConfirm(null); await deleteItem(id, after); },
  });

  const tryOn = (items) => {
    const list = Array.isArray(items) ? items : [items];
    setFitting({ itemIds: list.map((item) => item.id), requestedAt: Date.now() });
    setScreen('fitting');
  };

  const openInWardrobe = (item) => { setWardrobeFocus(item.id); setScreen('wardrobe'); };

  const runBulk = async (action, ids) => {
    const perform = async () => {
      try {
        const data = await api('/api/wardrobe/bulk', { method: 'POST', body: JSON.stringify({ action, ids }) });
        setWardrobe(data.items);
        const noun = `${data.affected} ${data.affected === 1 ? 'item' : 'items'}`;
        setToast({ delete: `${noun} deleted`, available: `${noun} marked available`, unavailable: `${noun} marked unavailable` }[action] || 'Updated');
        return true;
      } catch (error) { setToast(error.message); return false; }
    };
    if (action !== 'delete') return perform();
    return new Promise((resolve) => setConfirm({
      title: `Delete ${ids.length} ${ids.length === 1 ? 'item' : 'items'}?`,
      body: 'Their cutouts and details will be permanently removed from your wardrobe.',
      actionLabel: `Delete ${ids.length}`,
      onConfirm: async () => { setConfirm(null); resolve(await perform()); },
      onCancel: () => resolve(false),
    }));
  };

  const useInOutfit = (item) => { setStylistPrompt(`Build an outfit around my ${item.name}.`); setScreen('stylist'); };
  const startStylist = (prompt) => { setStylistPrompt(prompt); setScreen('stylist'); };

  const saveOutfit = async (outfit) => {
    if (savedOutfits.some((saved) => saved.id === outfit.id)) return;
    try {
      const data = await api('/api/outfits', { method: 'POST', body: JSON.stringify(outfit) });
      setSavedOutfits(data.outfits); setToast('Saved to your outfit library');
    } catch (error) { setToast(error.message); }
  };

  const updateSaved = async (id, worn) => {
    try {
      const data = await api(`/api/outfits/${id}`, { method: 'PATCH', body: JSON.stringify({ worn }) });
      setSavedOutfits(data.outfits); setToast('Outfit marked as worn');
    } catch (error) { setToast(error.message); }
  };

  const removeSaved = async (id) => {
    try {
      const data = await api(`/api/outfits/${id}`, { method: 'DELETE' });
      setSavedOutfits(data.outfits); setToast('Saved outfit removed');
    } catch (error) { setToast(error.message); }
  };

  const saveProfile = async (changes) => {
    try {
      const data = await api('/api/profile', { method: 'PATCH', body: JSON.stringify(changes) });
      setProfile(data.user); setToast('Settings saved');
    } catch (error) { setToast(error.message); throw error; }
  };

  const signOut = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setProfile(null); setWardrobe([]); setSavedOutfits([]); setSessionState('signed-out'); setScreen('home');
  };

  const deleteAccount = () => setConfirm({
    title: 'Delete your account?',
    body: 'Your private images, wardrobe, saved outfits, and preferences will be permanently erased.',
    actionLabel: 'Delete account',
    onConfirm: async () => {
      try {
        await api('/api/account', { method: 'DELETE' });
        setConfirm(null); setProfile(null); setWardrobe([]); setSavedOutfits([]); setSessionState('signed-out'); setScreen('home');
      } catch (error) { setConfirm(null); setToast(error.message); }
    },
  });

  if (sessionState === 'loading') return <main className="bootstrap-screen"><LoadingLine>Opening your private wardrobe…</LoadingLine></main>;
  if (sessionState === 'signed-out') return <Auth onComplete={completeAuth} />;

  return (
    <div className="app-shell">
      <Sidebar screen={screen} onNavigate={setScreen} onUpload={() => setScreen('upload')} onSignOut={signOut} name={profile.name} />
      <main className={`app-main screen-${screen}`}>
        <div key={screen} className="screen-enter">
        {screen === 'closet' && <ClosetScreen wardrobe={wardrobe} onOpenItem={openInWardrobe} onTryOn={tryOn} onStyle={useInOutfit} onUpload={() => setScreen('upload')} onListView={() => setScreen('wardrobe')} />}
        {screen === 'fitting' && <FittingRoomScreen wardrobe={wardrobe} pending={fitting} onConsumePending={consumeFitting} onToast={setToast} confirm={setConfirm} onUpload={() => setScreen('upload')} />}
        {screen === 'home' && <HomeScreen profile={profile} wardrobe={wardrobe} saved={savedOutfits} onNavigate={setScreen} onStartStylist={startStylist} />}
        {screen === 'upload' && <UploadScreen files={uploadFiles} onAddFiles={addFiles} onCancel={(id) => setUploadFiles((current) => current.filter((file) => file.id !== id))} onRetry={(id) => { const file = uploadFiles.find((entry) => entry.id === id); if (file) processUpload(file); }} onReview={openReview} />}
        {screen === 'review' && <ReviewScreen items={detections} onChange={updateDetection} onRetryCutout={retryCutout} onRemove={removeDetection} onConfirmAll={() => { setDetections((current) => current.map((item) => item.confidence === 'high' && !item.duplicate ? { ...item, selected: true } : item)); setToast('High-confidence items confirmed'); }} onAdd={addConfirmedItems} />}
        {screen === 'wardrobe' && <WardrobeScreen wardrobe={wardrobe} onUpload={() => setScreen('upload')} onUpdate={updateItem} onDelete={requestDeleteItem} onArchive={(id) => deleteItem(id)} onUseInOutfit={useInOutfit} onUpgradeCutout={upgradeCutout} onGaps={() => setScreen('gaps')} onBulk={runBulk} onTryOn={tryOn} focusId={wardrobeFocus} onConsumeFocus={consumeFocus} />}
        {screen === 'stylist' && <StylistScreen wardrobe={wardrobe} profile={profile} saved={savedOutfits} onSave={saveOutfit} onUpload={() => setScreen('upload')} initialPrompt={stylistPrompt} onConsumePrompt={() => setStylistPrompt('')} onTryOn={(outfit) => tryOn(outfit.items)} />}
        {screen === 'saved' && <SavedScreen outfits={savedOutfits} onMarkWorn={(id) => updateSaved(id, true)} onRemove={removeSaved} onStylist={() => setScreen('stylist')} onTryOn={(outfit) => tryOn(outfit.items)} />}
        {screen === 'inspiration' && <InspirationScreen profile={profile} onProfile={(styleProfile, styleProfileUpdatedAt) => setProfile((current) => ({ ...current, styleProfile, styleProfileUpdatedAt }))} onToast={setToast} confirm={setConfirm} />}
        {screen === 'gaps' && <GapsScreen wardrobe={wardrobe} onToast={setToast} onUpload={() => setScreen('upload')} onInspiration={() => setScreen('inspiration')} />}
        {screen === 'settings' && <SettingsScreen profile={profile} onSave={saveProfile} onDeleteAccount={deleteAccount} />}
        </div>
      </main>
      <ConfirmModal config={confirm} onClose={() => { confirm?.onCancel?.(); setConfirm(null); }} />
      <Toast message={toast} />
    </div>
  );
}
