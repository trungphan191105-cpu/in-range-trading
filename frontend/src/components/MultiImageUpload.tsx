import { useEffect, useRef, useState } from 'react';
import { Upload, X, ZoomIn } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

interface Props {
  images: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  active?: boolean; // modal is open (enable paste)
}

export default function MultiImageUpload({ images, onChange, maxImages = 10, active = false }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const upload = async (files: File[]) => {
    if (images.length + files.length > maxImages) {
      toast.error(`Tối đa ${maxImages} ảnh`);
      return;
    }
    setUploading(true);
    try {
      const results = await Promise.all(files.map(f => api.uploadScreenshot(f)));
      onChange([...images, ...results.map((r: any) => r.url)]);
      toast.success(`Đã upload ${files.length} ảnh`);
    } catch { toast.error('Upload thất bại'); }
    finally { setUploading(false); }
  };

  const remove = (idx: number) => onChange(images.filter((_, i) => i !== idx));

  // Paste listener
  useEffect(() => {
    if (!active) return;
    const handler = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageFiles = items.filter(i => i.type.startsWith('image/')).map(i => i.getAsFile()).filter(Boolean) as File[];
      if (!imageFiles.length) return;
      e.preventDefault();
      await upload(imageFiles);
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [active, images]);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Thumbnails grid */}
        {images.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {images.map((url, i) => (
              <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                <img
                  src={url} alt={`screenshot-${i+1}`}
                  style={{ width: 90, height: 66, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                  onClick={() => setLightbox(url)}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.5)'; (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)'; (e.currentTarget as HTMLElement).style.opacity = '0'; }}>
                  <button type="button" onClick={() => setLightbox(url)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: 4 }}>
                    <ZoomIn size={14} />
                  </button>
                  <button type="button" onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f0506e', padding: 4 }}>
                    <X size={14} />
                  </button>
                </div>
                <div style={{ position: 'absolute', bottom: 3, right: 5, fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{i+1}</div>
              </div>
            ))}
          </div>
        )}

        {/* Upload zone */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => { const files = Array.from(e.target.files || []); if (files.length) upload(files); e.target.value = ''; }}
          />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || images.length >= maxImages}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px dashed var(--border)', background: 'var(--surface2)', color: uploading ? 'var(--text-muted)' : 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'border-color 0.2s, color 0.2s' }}
            onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}>
            <Upload size={13} />
            {uploading ? 'Đang upload...' : 'Thêm ảnh'}
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Ctrl+V để dán ảnh · {images.length}/{maxImages} ảnh
          </span>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
          {images.length > 1 && (
            <div style={{ position: 'absolute', bottom: 24, display: 'flex', gap: 8 }}>
              {images.map((url, i) => (
                <img key={i} src={url} alt="" onClick={e => { e.stopPropagation(); setLightbox(url); }}
                  style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: url === lightbox ? '2px solid var(--accent)' : '2px solid transparent', opacity: url === lightbox ? 1 : 0.5 }} />
              ))}
            </div>
          )}
          <img src={lightbox} alt="preview" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 8, objectFit: 'contain' }} />
        </div>
      )}
    </>
  );
}
