import React, { useRef } from 'react';
import { CheckCircle2, ImagePlus, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { LoadingLine, PageHeader } from '../components';

const labels = {
  waiting: 'Waiting…', uploading: 'Uploading…', detecting: 'Detecting items and cutting them out…',
  preparing: 'Cutting out each piece…', ready: 'Ready for review', failed: 'Processing failed', empty: 'No garments detected',
};

export function UploadScreen({ files, onAddFiles, onCancel, onRetry, onReview }) {
  const inputRef = useRef(null);
  const ready = files.some((file) => file.status === 'ready');
  const handleInput = (event) => {
    onAddFiles([...event.target.files]);
    event.target.value = '';
  };
  const onDrop = (event) => {
    event.preventDefault();
    onAddFiles([...event.dataTransfer.files].filter((file) => file.type.startsWith('image/')));
  };

  return (
    <div className="page upload-page">
      <PageHeader eyebrow="Build your wardrobe" title="Upload photos" description="Drop in flat lays, closet shots, or mirror selfies. We'll detect every visible garment and accessory, then let you confirm before anything joins your wardrobe." />
      <input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleInput} />
      {!files.length ? (
        <button className="drop-zone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
          <span className="drop-icon"><ImagePlus size={27} /></span>
          <h2>Drop your wardrobe photos here</h2>
          <p>or click to browse your computer</p>
          <small>JPG, PNG, or WEBP · up to 20MB each · multiple files supported</small>
        </button>
      ) : (
        <div className="upload-list">
          {files.map((file) => (
            <article className="upload-row" key={file.id}>
              <div className="upload-thumb" style={{ backgroundImage: file.preview ? `url(${file.preview})` : undefined }} />
              <div className="upload-meta">
                <div className="upload-title"><strong>{file.name}</strong><span className={`status status-${file.status}`} title={file.error || ''}>{file.error || labels[file.status]}</span></div>
                <div className="progress-track"><span style={{ width: `${file.progress}%` }} /></div>
              </div>
              {file.status === 'failed' ? <button className="icon-text-button" onClick={() => onRetry(file.id)}><RotateCcw size={14} /> Retry</button> : file.status === 'ready' ? <CheckCircle2 className="ready-icon" size={21} /> : <button className="icon-button" onClick={() => onCancel(file.id)} aria-label={`Cancel ${file.name}`}><X size={18} /></button>}
            </article>
          ))}
        </div>
      )}
      <div className="upload-footer">
        <div className="upload-helper"><ShieldCheck size={16} /><span>Original photos are processed securely and not retained. Only approved transparent cutouts stay in your private wardrobe.</span></div>
        <div className="upload-actions">
          {files.length > 0 && <button className="button button-outline" onClick={() => inputRef.current?.click()}>+ Add more photos</button>}
          <button className="button button-dark" disabled={!ready} onClick={onReview}>{ready ? 'Continue to review →' : <LoadingLine>Waiting for an item</LoadingLine>}</button>
        </div>
      </div>
    </div>
  );
}
