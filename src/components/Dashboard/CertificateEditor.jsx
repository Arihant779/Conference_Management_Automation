import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, Upload, Type, PenTool, ZoomIn, ZoomOut,
  MousePointer, Check, Trash2, RotateCcw, Eye, Download,
  Plus, Edit3, AlignCenter
} from 'lucide-react';

/* ─── constants ─────────────────────────────────────────── */
const FONTS = [
  { key: 'Inter', label: 'Inter', css: "'Inter', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap' },
  { key: 'Playfair Display', label: 'Playfair Display', css: "'Playfair Display', serif", url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap' },
  { key: 'Dancing Script', label: 'Dancing Script', css: "'Dancing Script', cursive", url: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600;700&display=swap' },
  { key: 'Roboto Serif', label: 'Roboto Serif', css: "'Roboto Serif', serif", url: 'https://fonts.googleapis.com/css2?family=Roboto+Serif:wght@400;600;700&display=swap' },
  { key: 'Georgia', label: 'Georgia', css: "Georgia, 'Times New Roman', serif", url: null },
  { key: 'Great Vibes', label: 'Great Vibes', css: "'Great Vibes', cursive", url: 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap' },
];

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;

const cls = (...c) => c.filter(Boolean).join(' ');

/* ═══════════════════════════════════════════════════════════
   SIGNATURE PAD SUB-COMPONENT
   A small canvas where the user draws their signature.
═══════════════════════════════════════════════════════════ */
const SignaturePad = ({ onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (clientY - rect.top) * (canvasRef.current.height / rect.height),
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasContent(true);
  };

  const endDraw = () => setDrawing(false);

  const clearPad = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasContent(false);
  };

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, []);

  const handleSave = () => {
    if (!hasContent) return;
    const dataURL = canvasRef.current.toDataURL('image/png');
    onSave(dataURL);
  };

  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <PenTool size={14} className="text-indigo-400" />
          Draw Your Signature
        </h4>
        <button onClick={onCancel} className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all">
          <X size={14} />
        </button>
      </div>

      <div className="relative border-2 border-dashed border-white/15 rounded-xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={500}
          height={180}
          className="w-full cursor-crosshair touch-none"
          style={{ display: 'block' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-slate-400 text-sm font-medium">Draw your signature here</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={clearPad}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-white/10 text-slate-500 hover:text-white hover:border-white/20 transition-all"
        >
          <RotateCcw size={11} /> Clear
        </button>
        <div className="flex-1" />
        <button
          onClick={onCancel}
          className="px-3 py-2 rounded-lg text-xs font-bold border border-white/10 text-slate-500 hover:text-white hover:border-white/20 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!hasContent}
          className={cls(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all',
            hasContent
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-white/5 text-slate-600 cursor-not-allowed',
          )}
        >
          <Check size={11} /> Use Signature
        </button>
      </div>
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════
   MAIN CERTIFICATE EDITOR
   Full-screen popup triggered from EmailComposer.
═══════════════════════════════════════════════════════════ */
const CertificateEditor = ({ onSave, onClose }) => {
  /* ── state ── */
  const [templateImg, setTemplateImg] = useState(null);       // HTMLImageElement
  const [templateDataURL, setTemplateDataURL] = useState(''); // base64 of the uploaded image
  const [font, setFont] = useState('Playfair Display');
  const [fontSize, setFontSize] = useState(36);
  const [namePos, setNamePos] = useState(null);       // {x, y} in original image coords
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState('idle');            // 'idle' | 'locate' | 'placeSig' | 'placeText'
  const [signatureDataURL, setSignatureDataURL] = useState(null);
  const [signaturePos, setSignaturePos] = useState(null);  // {x, y} in original image coords
  const [signatureSize, setSignatureSize] = useState({ w: 160, h: 60 });
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [dragState, setDragState] = useState(null);    // for dragging signature / text

  /* ── custom text items ── */
  // Each item: { id, text, font, fontSize, color, pos: {x,y} | null }
  const [textItems, setTextItems] = useState([]);
  const [pendingTextId, setPendingTextId] = useState(null); // which text item is being placed
  const [editingTextId, setEditingTextId] = useState(null); // which text item's content is being edited

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  /* ── load Google fonts ── */
  useEffect(() => {
    FONTS.forEach(f => {
      if (f.url && !document.querySelector(`link[href="${f.url}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = f.url;
        document.head.appendChild(link);
      }
    });
  }, []);

  /* ── handle template upload ── */
  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setTemplateImg(img);
        setTemplateDataURL(reader.result);
        setNamePos(null);
        setSignaturePos(null);
        // Fit into the container
        if (containerRef.current) {
          const containerW = containerRef.current.clientWidth - 40;
          const ratio = containerW / img.width;
          setZoom(Math.min(ratio, 1));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  /* ── text item helpers ── */
  const addTextItem = () => {
    const newItem = {
      id: Date.now().toString(),
      text: 'Custom Text',
      font: 'Playfair Display',
      fontSize: 24,
      color: '#1a1a2e',
      pos: null,
    };
    setTextItems(prev => [...prev, newItem]);
    setEditingTextId(newItem.id);
  };

  const updateTextItem = (id, updates) => {
    setTextItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeTextItem = (id) => {
    setTextItems(prev => prev.filter(item => item.id !== id));
    if (pendingTextId === id) {
      setPendingTextId(null);
      setMode('idle');
    }
    if (editingTextId === id) setEditingTextId(null);
  };

  const startPlaceText = (id) => {
    setPendingTextId(id);
    setMode('placeText');
  };

  /* ── redraw canvas ── */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = templateImg;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw template
    ctx.drawImage(img, 0, 0);

    // Draw name marker if position set
    if (namePos) {
      const selectedFont = FONTS.find(f => f.key === font) || FONTS[0];
      ctx.font = `${fontSize}px ${selectedFont.css}`;
      ctx.fillStyle = '#1a1a2e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('[[Participant Name]]', namePos.x, namePos.y);

      // Draw crosshair
      ctx.strokeStyle = 'rgba(99,102,241,0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(namePos.x - 100, namePos.y);
      ctx.lineTo(namePos.x + 100, namePos.y);
      ctx.moveTo(namePos.x, namePos.y - 30);
      ctx.lineTo(namePos.x, namePos.y + 30);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw custom text items
    textItems.forEach(item => {
      if (!item.pos) return;
      const itemFont = FONTS.find(f => f.key === item.font) || FONTS[0];
      ctx.font = `${item.fontSize}px ${itemFont.css}`;
      ctx.fillStyle = item.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.text, item.pos.x, item.pos.y);

      // Draw subtle indicator border
      const metrics = ctx.measureText(item.text);
      const padding = 8;
      ctx.strokeStyle = 'rgba(168,85,247,0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(
        item.pos.x - metrics.width / 2 - padding,
        item.pos.y - item.fontSize / 2 - padding / 2,
        metrics.width + padding * 2,
        item.fontSize + padding,
      );
      ctx.setLineDash([]);
    });

    // Draw signature if placed
    if (signatureDataURL && signaturePos) {
      const sigImg = new Image();
      sigImg.onload = () => {
        ctx.drawImage(sigImg, signaturePos.x - signatureSize.w / 2, signaturePos.y - signatureSize.h / 2, signatureSize.w, signatureSize.h);
        // Draw border around signature area
        ctx.strokeStyle = 'rgba(99,102,241,0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(signaturePos.x - signatureSize.w / 2, signaturePos.y - signatureSize.h / 2, signatureSize.w, signatureSize.h);
        ctx.setLineDash([]);
      };
      sigImg.src = signatureDataURL;
    }
  }, [templateImg, namePos, font, fontSize, textItems, signatureDataURL, signaturePos, signatureSize]);

  useEffect(() => { redraw(); }, [redraw]);

  /* ── JS Pixel Scanning: find blank center on click row ── */
  const findBlankCenter = useCallback((imgX, imgY) => {
    if (!templateImg) return imgX;

    // Draw a fresh copy of the template to scan pixels
    const offscreen = document.createElement('canvas');
    offscreen.width = templateImg.width;
    offscreen.height = templateImg.height;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(templateImg, 0, 0);

    const row = Math.round(imgY);
    if (row < 0 || row >= templateImg.height) return imgX;

    const imageData = ctx.getImageData(0, row, templateImg.width, 1).data;

    // Threshold: consider pixel "blank" if it's close to white (R,G,B > 220)
    const isBlank = (i) => {
      const r = imageData[i * 4];
      const g = imageData[i * 4 + 1];
      const b = imageData[i * 4 + 2];
      return r > 220 && g > 220 && b > 220;
    };

    const x = Math.round(imgX);

    // Scan left from click
    let xStart = x;
    while (xStart > 0 && isBlank(xStart - 1)) xStart--;

    // Scan right from click
    let xEnd = x;
    while (xEnd < templateImg.width - 1 && isBlank(xEnd + 1)) xEnd++;

    // Only center if we found a reasonable blank region (at least 100px wide)
    if (xEnd - xStart > 100) {
      return Math.round((xStart + xEnd) / 2);
    }

    // Fallback: center of the image
    return imgX;
  }, [templateImg]);

  /* ── canvas click handler ── */
  const handleCanvasClick = (e) => {
    if (!templateImg || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = templateImg.width / rect.width;
    const scaleY = templateImg.height / rect.height;
    const imgX = (e.clientX - rect.left) * scaleX;
    const imgY = (e.clientY - rect.top) * scaleY;

    if (mode === 'locate') {
      const centeredX = findBlankCenter(imgX, imgY);
      setNamePos({ x: centeredX, y: imgY });
      setMode('idle');
    } else if (mode === 'placeSig' && signatureDataURL) {
      setSignaturePos({ x: imgX, y: imgY });
      setMode('idle');
    } else if (mode === 'placeText' && pendingTextId) {
      updateTextItem(pendingTextId, { pos: { x: imgX, y: imgY } });
      setPendingTextId(null);
      setMode('idle');
    }
  };

  /* ── signature & text drag handling ── */
  const handleCanvasMouseDown = (e) => {
    if (mode !== 'idle' || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = templateImg.width / rect.width;
    const scaleY = templateImg.height / rect.height;
    const imgX = (e.clientX - rect.left) * scaleX;
    const imgY = (e.clientY - rect.top) * scaleY;

    // Check custom text items first (reverse order so top-most wins)
    for (let i = textItems.length - 1; i >= 0; i--) {
      const item = textItems[i];
      if (!item.pos) continue;
      // Approximate hit-test based on font size and text width
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const itemFont = FONTS.find(f => f.key === item.font) || FONTS[0];
      ctx.font = `${item.fontSize}px ${itemFont.css}`;
      const metrics = ctx.measureText(item.text);
      const halfW = metrics.width / 2 + 8;
      const halfH = item.fontSize / 2 + 4;
      if (
        imgX >= item.pos.x - halfW && imgX <= item.pos.x + halfW &&
        imgY >= item.pos.y - halfH && imgY <= item.pos.y + halfH
      ) {
        setDragState({
          type: 'text',
          textId: item.id,
          offsetX: imgX - item.pos.x,
          offsetY: imgY - item.pos.y,
        });
        e.preventDefault();
        return;
      }
    }

    // Check if click is within signature bounds
    if (signaturePos) {
      const halfW = signatureSize.w / 2;
      const halfH = signatureSize.h / 2;
      if (
        imgX >= signaturePos.x - halfW && imgX <= signaturePos.x + halfW &&
        imgY >= signaturePos.y - halfH && imgY <= signaturePos.y + halfH
      ) {
        setDragState({
          type: 'signature',
          offsetX: imgX - signaturePos.x,
          offsetY: imgY - signaturePos.y,
        });
        e.preventDefault();
      }
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!dragState || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = templateImg.width / rect.width;
    const scaleY = templateImg.height / rect.height;
    const imgX = (e.clientX - rect.left) * scaleX;
    const imgY = (e.clientY - rect.top) * scaleY;

    if (dragState.type === 'text') {
      updateTextItem(dragState.textId, {
        pos: {
          x: imgX - dragState.offsetX,
          y: imgY - dragState.offsetY,
        },
      });
    } else {
      setSignaturePos({
        x: imgX - dragState.offsetX,
        y: imgY - dragState.offsetY,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    if (dragState) setDragState(null);
  };

  /* ── zoom ── */
  const zoomIn = () => setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  const zoomOut = () => setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM));

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => {
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta));
      });
    }
  };

  /* ── discard ── */
  const handleDiscard = () => {
    setTemplateImg(null);
    setTemplateDataURL('');
    setNamePos(null);
    setSignatureDataURL(null);
    setSignaturePos(null);
    setTextItems([]);
    setPendingTextId(null);
    setEditingTextId(null);
    setMode('idle');
    setZoom(1);
  };

  /* ── save config to parent ── */
  const handleAttach = () => {
    if (!templateImg || !namePos) return;
    onSave({
      templateDataURL,
      templateWidth: templateImg.width,
      templateHeight: templateImg.height,
      namePos,
      font,
      fontSize,
      signatureDataURL,
      signaturePos,
      signatureSize: signaturePos ? signatureSize : null,
      textItems: textItems.filter(t => t.pos && t.text.trim()),
    });
  };

  const canAttach = templateImg && namePos;
  const selectedFont = FONTS.find(f => f.key === font) || FONTS[0];
  const cursorStyle = mode === 'locate' ? 'crosshair' : mode === 'placeSig' ? 'copy' : mode === 'placeText' ? 'text' : (dragState ? 'grabbing' : 'default');

  /* ══════════════ RENDER ══════════════ */
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex flex-col"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-[#0d1117]/95 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Type size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Certificate Editor</h2>
            <p className="text-[10px] text-slate-500">Upload template · Place name · Add text · Add signature</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Discard — clears everything & closes */}
          <button
            onClick={() => { handleDiscard(); onClose(); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all active:scale-95"
          >
            <Trash2 size={14} /> Discard
          </button>

          {/* Done — saves certificate config & closes */}
          <button
            onClick={handleAttach}
            disabled={!canAttach}
            className={cls(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95',
              canAttach
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25'
                : 'bg-white/5 text-slate-600 cursor-not-allowed shadow-none',
            )}
            title={!canAttach ? 'Upload a template and position the name first' : 'Save certificate and return to email'}
          >
            <Check size={14} /> Done
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left toolbar ── */}
        <aside className="w-72 shrink-0 bg-[#0d1117] border-r border-white/8 p-4 overflow-y-auto space-y-5">

          {/* Upload */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Template</p>
            <label className={cls(
              'flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed rounded-xl cursor-pointer transition-all',
              templateImg ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/15 hover:border-indigo-500/40 hover:bg-indigo-500/5',
            )}>
              <Upload size={20} className={templateImg ? 'text-emerald-400' : 'text-slate-500'} />
              <span className="text-xs text-slate-400 font-medium">
                {templateImg ? 'Change template' : 'Upload certificate image'}
              </span>
              <span className="text-[10px] text-slate-600">JPG, PNG</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
          </div>

          {/* Font */}
          {templateImg && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Font Family</p>
              <div className="space-y-1.5">
                {FONTS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFont(f.key)}
                    className={cls(
                      'w-full text-left px-3 py-2 rounded-lg text-sm border transition-all',
                      font === f.key
                        ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                        : 'border-white/8 text-slate-400 hover:border-white/20 hover:text-white',
                    )}
                    style={{ fontFamily: f.css }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Font Size */}
          {templateImg && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Font Size: <span className="text-indigo-400">{fontSize}px</span>
              </p>
              <input
                type="range"
                min={12}
                max={72}
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                <span>12px</span><span>72px</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {templateImg && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Actions</p>

              {/* Locate name */}
              <button
                onClick={() => setMode(mode === 'locate' ? 'idle' : 'locate')}
                className={cls(
                  'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all',
                  mode === 'locate'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse'
                    : namePos
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'border-white/10 text-slate-400 hover:border-indigo-500/30 hover:text-indigo-300',
                )}
              >
                <MousePointer size={13} />
                {mode === 'locate' ? 'Click on certificate…' : namePos ? '✓ Name positioned' : 'Locate Name Position'}
              </button>

              {/* Signature */}
              <button
                onClick={() => {
                  if (signatureDataURL && !showSignaturePad) {
                    setMode(mode === 'placeSig' ? 'idle' : 'placeSig');
                  } else {
                    setShowSignaturePad(true);
                  }
                }}
                className={cls(
                  'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all',
                  mode === 'placeSig'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse'
                    : signaturePos
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'border-white/10 text-slate-400 hover:border-indigo-500/30 hover:text-indigo-300',
                )}
              >
                <PenTool size={13} />
                {mode === 'placeSig' ? 'Click to place…' : signaturePos ? '✓ Signature placed' : 'Add Signature'}
              </button>

              {signatureDataURL && !signaturePos && mode !== 'placeSig' && (
                <p className="text-[10px] text-amber-400 ml-1">
                  Signature drawn — click the button above to place it on the certificate
                </p>
              )}

              {signaturePos && (
                <div className="space-y-2 mt-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Signature Size</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-6">W</span>
                    <input
                      type="range" min={60} max={300}
                      value={signatureSize.w}
                      onChange={e => setSignatureSize(s => ({ ...s, w: Number(e.target.value) }))}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400 w-8">{signatureSize.w}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-6">H</span>
                    <input
                      type="range" min={20} max={150}
                      value={signatureSize.h}
                      onChange={e => setSignatureSize(s => ({ ...s, h: Number(e.target.value) }))}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400 w-8">{signatureSize.h}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 italic">Drag the signature on the canvas to reposition</p>
                </div>
              )}
            </div>
          )}

          {/* ── Custom Text Items ── */}
          {templateImg && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custom Text</p>
                <button
                  onClick={addTextItem}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border border-white/10 text-slate-400 hover:text-purple-300 hover:border-purple-500/30 transition-all"
                >
                  <Plus size={10} /> Add Text
                </button>
              </div>

              {textItems.length === 0 && (
                <p className="text-[10px] text-slate-600 italic">No custom text added yet</p>
              )}

              {textItems.map(item => (
                <div
                  key={item.id}
                  className={cls(
                    'border rounded-xl p-3 space-y-2.5 transition-all',
                    editingTextId === item.id
                      ? 'bg-purple-500/5 border-purple-500/25'
                      : 'bg-white/2 border-white/8 hover:border-white/15',
                  )}
                >
                  {/* Text content input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.text}
                      onChange={e => updateTextItem(item.id, { text: e.target.value })}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-purple-500/40 transition-colors"
                      placeholder="Enter text…"
                    />
                    <button
                      onClick={() => setEditingTextId(editingTextId === item.id ? null : item.id)}
                      className={cls(
                        'p-1.5 rounded-lg border transition-all',
                        editingTextId === item.id
                          ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                          : 'border-white/10 text-slate-500 hover:text-white hover:border-white/20',
                      )}
                    >
                      <Edit3 size={10} />
                    </button>
                    <button
                      onClick={() => removeTextItem(item.id)}
                      className="p-1.5 rounded-lg border border-white/10 text-slate-600 hover:text-red-400 hover:border-red-500/25 transition-all"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>

                  {/* Place button */}
                  <button
                    onClick={() => {
                      if (mode === 'placeText' && pendingTextId === item.id) {
                        setPendingTextId(null);
                        setMode('idle');
                      } else {
                        startPlaceText(item.id);
                      }
                    }}
                    className={cls(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold border transition-all',
                      mode === 'placeText' && pendingTextId === item.id
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse'
                        : item.pos
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'border-white/10 text-slate-400 hover:border-purple-500/30 hover:text-purple-300',
                    )}
                  >
                    <AlignCenter size={11} />
                    {mode === 'placeText' && pendingTextId === item.id
                      ? 'Click to place…'
                      : item.pos
                        ? '✓ Placed — drag to reposition'
                        : 'Place on certificate'}
                  </button>

                  {/* Expanded settings */}
                  {editingTextId === item.id && (
                    <div className="space-y-2.5 pt-1">
                      {/* Font family */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Font</p>
                        <div className="space-y-1">
                          {FONTS.map(f => (
                            <button
                              key={f.key}
                              onClick={() => updateTextItem(item.id, { font: f.key })}
                              className={cls(
                                'w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] border transition-all',
                                item.font === f.key
                                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                                  : 'border-white/6 text-slate-500 hover:border-white/15 hover:text-white',
                              )}
                              style={{ fontFamily: f.css }}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Font size */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">
                          Size: <span className="text-purple-400">{item.fontSize}px</span>
                        </p>
                        <input
                          type="range"
                          min={10}
                          max={72}
                          value={item.fontSize}
                          onChange={e => updateTextItem(item.id, { fontSize: Number(e.target.value) })}
                          className="w-full accent-purple-500"
                        />
                        <div className="flex justify-between text-[8px] text-slate-600 mt-0.5">
                          <span>10px</span><span>72px</span>
                        </div>
                      </div>

                      {/* Color */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Color</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={item.color}
                            onChange={e => updateTextItem(item.id, { color: e.target.value })}
                            className="w-7 h-7 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={item.color}
                            onChange={e => updateTextItem(item.id, { color: e.target.value })}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-slate-300 font-mono outline-none focus:border-purple-500/40 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Zoom controls */}
          {templateImg && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Zoom: <span className="text-indigo-400">{Math.round(zoom * 100)}%</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={zoomOut}
                  className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
                >
                  <ZoomOut size={14} />
                </button>
                <input
                  type="range"
                  min={MIN_ZOOM * 100} max={MAX_ZOOM * 100}
                  value={zoom * 100}
                  onChange={e => setZoom(Number(e.target.value) / 100)}
                  className="flex-1 accent-indigo-500"
                />
                <button
                  onClick={zoomIn}
                  className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
                >
                  <ZoomIn size={14} />
                </button>
              </div>
              <p className="text-[9px] text-slate-600 mt-1 text-center">Ctrl+Scroll to zoom on canvas</p>
            </div>
          )}

          {/* Preview info */}
          {templateImg && namePos && (
            <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3 space-y-1.5">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Certificate Config</p>
              <div className="text-[10px] text-slate-400 space-y-0.5">
                <p>Font: <span className="text-white">{font}</span></p>
                <p>Size: <span className="text-white">{fontSize}px</span></p>
                <p>Name position: <span className="text-white">({Math.round(namePos.x)}, {Math.round(namePos.y)})</span></p>
                {signaturePos && <p>Signature: <span className="text-emerald-400">✓ Placed</span></p>}
                {textItems.filter(t => t.pos).length > 0 && (
                  <p>Custom texts: <span className="text-purple-400">✓ {textItems.filter(t => t.pos).length} placed</span></p>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* ── Main canvas area ── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-[#0a0d14] p-5 flex items-start justify-center"
          onWheel={handleWheel}
        >
          {!templateImg ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Upload size={30} className="text-slate-600" />
              </div>
              <p className="text-slate-500 text-sm font-medium">Upload a certificate template to start</p>
              <p className="text-slate-600 text-xs">Supports JPG and PNG images</p>
              <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold cursor-pointer transition-all">
                <Upload size={14} /> Upload Template
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </label>
            </div>
          ) : (
            <div className="relative" style={{ width: templateImg.width * zoom, height: templateImg.height * zoom }}>
              {/* Mode indicator banner */}
              {mode !== 'idle' && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10 bg-amber-500/20 border border-amber-500/40 rounded-lg px-4 py-1.5 text-xs font-bold text-amber-300 whitespace-nowrap">
                  {mode === 'locate' ? '🎯 Click where you want participant names placed' : mode === 'placeText' ? '📝 Click where you want the text placed' : '✍️ Click where you want the signature placed'}
                </div>
              )}

              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                style={{
                  width: templateImg.width * zoom,
                  height: templateImg.height * zoom,
                  cursor: cursorStyle,
                  borderRadius: 12,
                  boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                }}
              />
            </div>
          )}
        </div>

        {/* ── Signature pad overlay ── */}
        {showSignaturePad && (
          <div className="absolute bottom-6 right-6 w-[400px] z-20 shadow-2xl">
            <SignaturePad
              onSave={(dataURL) => {
                setSignatureDataURL(dataURL);
                setShowSignaturePad(false);
                setMode('placeSig');
              }}
              onCancel={() => setShowSignaturePad(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificateEditor;
