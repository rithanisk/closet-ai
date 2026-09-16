'use client';

import React, { useEffect, useState } from 'react';
import { ConfirmModal, Sidebar, Toast } from './components';
import { Auth } from './screens/Auth';
import { HomeScreen } from './screens/Home';
import { ReviewScreen } from './screens/Review';
import { SavedScreen } from './screens/Saved';
import { SettingsScreen } from './screens/Settings';
import { StylistScreen } from './screens/Stylist';
import { UploadScreen } from './screens/Upload';
import { WardrobeScreen } from './screens/Wardrobe';
import { COLORS, detectionSeed, seedWardrobe } from './data';
import { useLocalStorage } from './hooks';

const defaultProfile = {
  name: 'Jordan Lee',
  email: 'jordan@school.edu',
  city: 'Singapore',
  styles: ['Minimal', 'Feminine', 'Classic', 'Preppy'],
  preciseLocation: true,
};

export default function App() {
  const [signedIn, setSignedIn] = useLocalStorage('closet-ai:signed-in', false);
  const [profile, setProfile] = useLocalStorage('closet-ai:profile', defaultProfile);
  const [wardrobe, setWardrobe] = useLocalStorage('closet-ai:wardrobe', seedWardrobe);
  const [savedOutfits, setSavedOutfits] = useLocalStorage('closet-ai:saved', []);
  const [screen, setScreen] = useState('home');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [detections, setDetections] = useState([]);
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [stylistPrompt, setStylistPrompt] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const navigate = (target) => setScreen(target);
  const completeAuth = (nextProfile) => {
    const { isNew, ...profileFields } = nextProfile;
    setProfile((current) => ({ ...current, ...profileFields, preciseLocation: current.preciseLocation ?? true }));
    if (isNew) {
      setWardrobe([]);
      setSavedOutfits([]);
    }
    setSignedIn(true);
    setScreen('home');
  };

  const readPreview = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

  const addFiles = async (files) => {
    const valid = files.filter((file) => file.type.startsWith('image/') && file.size <= 20 * 1024 * 1024);
    const prepared = await Promise.all(valid.map(async (file, index) => ({
      id: crypto.randomUUID(), name: file.name, status: 'waiting', progress: 0,
      preview: await readPreview(file), accent: Object.values(COLORS)[index % Object.values(COLORS).length],
    })));
    setUploadFiles((current) => [...current, ...prepared]);
    prepared.forEach((file, index) => runUploadPipeline(file.id, index * 180));
  };

  const runUploadPipeline = (id, delay = 0) => {
    const setFile = (changes) => setUploadFiles((current) => current.map((file) => file.id === id ? { ...file, ...changes } : file));
    window.setTimeout(() => setFile({ status: 'uploading', progress: 34 }), delay + 80);
    window.setTimeout(() => setFile({ status: 'detecting', progress: 69 }), delay + 520);
    window.setTimeout(() => setFile({ status: 'preparing', progress: 88 }), delay + 980);
    window.setTimeout(() => setFile({ status: 'ready', progress: 100 }), delay + 1420);
  };

  const openReview = () => {
    const ready = uploadFiles.filter((file) => file.status === 'ready');
    const uploadedDetections = ready.map((file, index) => ({
      id: `upload-${file.id}`,
      name: `Detected ${index % 2 ? 'Accessory' : 'Garment'}`,
      category: index % 2 ? 'Accessories' : 'Tops',
      color: 'Unconfirmed',
      accent: file.accent,
      image: file.preview,
      confidence: index === ready.length - 1 && ready.length > 1 ? 'low' : 'high',
      duplicate: false,
      selected: true,
    }));
    setDetections(uploadedDetections.length ? uploadedDetections : detectionSeed.map((item) => ({ ...item })));
    setScreen('review');
  };

  const addConfirmedItems = () => {
    const approved = detections.filter((item) => item.selected).map((item, index) => ({
      ...item,
      id: crypto.randomUUID(),
      favorite: false,
      available: true,
      formality: 'Casual',
      season: 'All seasons',
      notes: '',
      worn: 0,
      addedAt: Date.now() + index,
      confidence: undefined,
      duplicate: undefined,
      selected: undefined,
    }));
    setWardrobe((current) => [...approved, ...current]);
    setDetections([]);
    setUploadFiles([]);
    setScreen('wardrobe');
    setToast(`${approved.length} ${approved.length === 1 ? 'item' : 'items'} added to your wardrobe`);
  };

  const updateItem = (id, changes) => {
    setWardrobe((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
    setToast('Item updated');
  };
  const requestDeleteItem = (id, after) => setConfirm({
    title: 'Delete this item?',
    body: 'The cutout and all its metadata will be permanently removed from your wardrobe.',
    actionLabel: 'Delete item',
    onConfirm: () => { setWardrobe((current) => current.filter((item) => item.id !== id)); setConfirm(null); after?.(); setToast('Item deleted'); },
  });
  const archiveItem = (id) => { setWardrobe((current) => current.filter((item) => item.id !== id)); setToast('Item archived'); };
  const useInOutfit = (item) => { setStylistPrompt(`Build an outfit around my ${item.name}.`); setScreen('stylist'); };
  const startStylist = (prompt) => { setStylistPrompt(prompt); setScreen('stylist'); };
  const saveOutfit = (outfit) => {
    if (savedOutfits.some((saved) => saved.id === outfit.id)) return;
    setSavedOutfits((current) => [{ ...outfit, savedId: crypto.randomUUID(), savedAt: new Date().toISOString(), worn: false }, ...current]);
    setToast('Saved to your outfit library');
  };
  const deleteAccount = () => setConfirm({
    title: 'Delete your account?',
    body: 'Your wardrobe, saved outfits, and preferences will be permanently erased.',
    actionLabel: 'Delete account',
    onConfirm: () => {
      setWardrobe([]); setSavedOutfits([]); setProfile(defaultProfile); setSignedIn(false); setConfirm(null); setScreen('home');
    },
  });

  if (!signedIn) return <Auth onComplete={completeAuth} />;

  return (
    <div className="app-shell">
      <Sidebar screen={screen} onNavigate={navigate} onUpload={() => setScreen('upload')} onSignOut={() => setSignedIn(false)} name={profile.name} />
      <main className="app-main">
        {screen === 'home' && <HomeScreen profile={profile} wardrobe={wardrobe} saved={savedOutfits} onNavigate={navigate} onStartStylist={startStylist} />}
        {screen === 'upload' && <UploadScreen files={uploadFiles} onAddFiles={addFiles} onCancel={(id) => setUploadFiles((current) => current.filter((file) => file.id !== id))} onRetry={(id) => runUploadPipeline(id, 0)} onReview={openReview} />}
        {screen === 'review' && <ReviewScreen items={detections} onChange={(id, changes) => setDetections((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item))} onRemove={(id) => setDetections((current) => current.filter((item) => item.id !== id))} onConfirmAll={() => { setDetections((current) => current.map((item) => item.confidence === 'high' && !item.duplicate ? { ...item, selected: true } : item)); setToast('High-confidence items confirmed'); }} onAdd={addConfirmedItems} />}
        {screen === 'wardrobe' && <WardrobeScreen wardrobe={wardrobe} onUpload={() => setScreen('upload')} onUpdate={updateItem} onDelete={requestDeleteItem} onArchive={archiveItem} onUseInOutfit={useInOutfit} />}
        {screen === 'stylist' && <StylistScreen wardrobe={wardrobe} profile={profile} saved={savedOutfits} onSave={saveOutfit} onUpload={() => setScreen('upload')} initialPrompt={stylistPrompt} onConsumePrompt={() => setStylistPrompt('')} />}
        {screen === 'saved' && <SavedScreen outfits={savedOutfits} onMarkWorn={(id) => { setSavedOutfits((current) => current.map((item) => item.savedId === id ? { ...item, worn: true } : item)); setToast('Outfit marked as worn'); }} onRemove={(id) => setSavedOutfits((current) => current.filter((item) => item.savedId !== id))} onStylist={() => setScreen('stylist')} />}
        {screen === 'settings' && <SettingsScreen profile={profile} onSave={(changes) => { setProfile(changes); setToast('Settings saved'); }} onDeleteAccount={deleteAccount} />}
      </main>
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
      <Toast message={toast} />
    </div>
  );
}
