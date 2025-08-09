import React, { useEffect, useMemo, useRef, useState, memo } from 'react'
import { supabase } from './supabase'

// --- Constantes/UI ---
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const FULL_MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// Paleta de colores predefinidos con nombres
const PALETTE = [
  { color: '#ef4444', name: 'Rojo' },
  { color: '#f97316', name: 'Naranja' },
  { color: '#eab308', name: 'Amarillo' },
  { color: '#22c55e', name: 'Verde' },
  { color: '#06b6d4', name: 'Cian' },
  { color: '#3b82f6', name: 'Azul' },
  { color: '#8b5cf6', name: 'Violeta' },
  { color: '#ec4899', name: 'Rosa' },
  { color: '#f43f5e', name: 'Rosa Oscuro' },
  { color: '#84cc16', name: 'Lima' },
  { color: '#14b8a6', name: 'Turquesa' },
  { color: '#6366f1', name: 'Índigo' }
]

function pad2(n){ return String(n).padStart(2,"0") }
function daysInMonth(y,m){ return new Date(y, m+1, 0).getDate() }
function keyFor(y,m,d){ return `${y}-${pad2(m+1)}-${pad2(d)}` }

// --- Utils thumbs ---
async function makeThumbFromCanvas(canvas, size = 96) {
  const s = document.createElement('canvas'); s.width = size; s.height = size;
  const c = s.getContext('2d');
  c.fillStyle = '#0f172a'; c.fillRect(0, 0, size, size);
  // Scale the entire canvas to fit the thumbnail exactly
  c.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, size, size);
  return s.toDataURL('image/webp', 0.85);
}

async function makeThumbFromDataURL(dataURL, size = 96) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const s = document.createElement('canvas'); s.width = size; s.height = size;
      const c = s.getContext('2d');
      c.fillStyle = '#0f172a'; c.fillRect(0, 0, size, size);
      // Scale the entire image to fit the thumbnail exactly
      c.drawImage(img, 0, 0, img.width, img.height, 0, 0, size, size);
      resolve(s.toDataURL('image/webp', 0.85));
    };
    img.src = dataURL;
  });
}

// --- Componente principal ---
export default function MoodTrackerGrid({ user, onLogout }){
  const now = new Date();
  const [year,setYear] = useState(now.getFullYear());
  const [moods,setMoods] = useState({});
  const [open,setOpen] = useState(false);
  const [target,setTarget] = useState({ y:now.getFullYear(), m:now.getMonth(), d:now.getDate() });
  const [cell,setCell] = useState(32);

  const monthDays = useMemo(() => Array.from({length:12},(_,m) => daysInMonth(year,m)),[year]);

  // carga moods del año desde Supabase
  useEffect(() => { 
    let cancelled = false;
    (async() => { 
      const entries = {}; 
      try {
        const { data, error } = await supabase
          .from('mood_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', `${year}-01-01`)
          .lte('date', `${year}-12-31`)

        if (!error && data) {
          data.forEach(entry => {
            const dateKey = keyFor(year, new Date(entry.date).getMonth(), new Date(entry.date).getDate())
            entries[dateKey] = entry.color
          })
        }
      } catch (err) {
        console.error('Error loading moods:', err)
      }
      
      if (!cancelled) setMoods(entries);
    })(); 
    return () => { cancelled = true }; 
  },[year, user.id]);

  const openCell = (m,d) => { setTarget({y:year,m,d}); setOpen(true); };
  
  const handleSaved = async (k, dataURL) => { 
    try {
      const [y, m, d] = k.split('-')
      const date = `${y}-${m}-${d}`
      
      // Generate thumbnail
      const thumb = await makeThumbFromDataURL(dataURL, 96)
      
      // Try upsert first (more efficient)
      let result = await supabase
        .from('mood_entries')
        .upsert({
          user_id: user.id,
          date: date,
          color: dataURL,
          thumbnail: thumb
        }, {
          onConflict: 'user_id,date'
        })

      // If upsert fails, try manual update/insert
      if (result.error && result.error.code === '23505') {
        console.log('Upsert failed, trying manual approach...')
        
        // Check if entry exists
        const { data: existingEntry } = await supabase
          .from('mood_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', date)
          .single()

        if (existingEntry) {
          // Update existing entry
          result = await supabase
            .from('mood_entries')
            .update({
              color: dataURL,
              thumbnail: thumb
            })
            .eq('id', existingEntry.id)
        } else {
          // Insert new entry
          result = await supabase
            .from('mood_entries')
            .insert({
              user_id: user.id,
              date: date,
              color: dataURL,
              thumbnail: thumb
            })
        }
      }

      if (result.error) throw result.error
      
      setMoods(prev => ({...prev, [k]: dataURL}))
      setOpen(false)
    } catch (err) {
      console.error('Error saving mood:', err)
      if (err.code === '23505') {
        alert('Ya existe una entrada para este día. Intenta de nuevo.')
      } else {
        alert('Error al guardar el estado de ánimo: ' + err.message)
      }
    }
  };
  
  const clearCell = async (m,d) => { 
    try {
      const k = keyFor(year,m,d)
      const [y, mStr, dStr] = k.split('-')
      const date = `${y}-${mStr}-${dStr}`
      
      // Delete from Supabase
      const { error } = await supabase
        .from('mood_entries')
        .delete()
        .eq('user_id', user.id)
        .eq('date', date)

      if (error) throw error
      
      setMoods(p => {const c={...p}; delete c[k]; return c;})
    } catch (err) {
      console.error('Error clearing mood:', err)
      alert('Error al limpiar el día')
    }
  };

  const exportJson = async () => { 
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)

      if (error) throw error

      const result = { year, user: user.username, moods: data }
      const payload = JSON.stringify(result, null, 2)
      
      try{ 
        await navigator.clipboard.writeText(payload); 
        alert("Exportado al portapapeles ✅"); 
      } catch{ 
        const blob = new Blob([payload],{type:"application/json"}); 
        const url = URL.createObjectURL(blob); 
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `mood-grid-${user.username}-${year}.json`; 
        a.click(); 
        URL.revokeObjectURL(url); 
      }
    } catch (err) {
      console.error('Error exporting:', err)
      alert('Error al exportar')
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Top bar */}
      <div className="sticky top-0 z-10 backdrop-blur bg-slate-900/80 border-b border-slate-800">
        <div className="max-w-5xl mx-auto flex items-center gap-2 p-3">
          <button className="px-3 py-2 rounded-xl bg-slate-800 active:scale-95" onClick={()=>setYear(y=>y-1)} aria-label="Año anterior">«</button>
          <div className="flex-1 text-center text-lg font-bold">Mood Tracker {year} - {user.username}</div>
          <button className="px-3 py-2 rounded-xl bg-slate-800 active:scale-95" onClick={()=>setYear(y=>y+1)} aria-label="Año siguiente">»</button>
        </div>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 px-3 pb-2 text-xs">
          <button onClick={exportJson} className="px-3 py-2 rounded-lg bg-slate-800">Exportar</button>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Tamaño celda</span>
            <input type="range" min="24" max="56" value={cell} onChange={e=>setCell(Number(e.target.value))}/>
          </div>
          <button onClick={onLogout} className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700">Cerrar Sesión</button>
        </div>
      </div>

      {/* Grid anual */}
      <div className="max-w-5xl mx-auto p-3">
        {/* Header de meses */}
        <div className="grid overflow-x-auto bg-slate-800/30 rounded-t-lg" style={{gridTemplateColumns: `56px repeat(12, ${cell}px)`}}>
          <div></div>
          {MONTHS_ES.map((m,i)=>(
            <div key={i} className="text-center text-[11px] text-slate-300 py-1" style={{width:`${cell}px`}}>{m}</div>
          ))}
        </div>

        {/* Tabla */}
        <div className="grid overflow-x-auto bg-slate-800/20 rounded-b-lg" style={{gridTemplateColumns: `56px repeat(12, ${cell}px)`}}>
          {Array.from({length:31}).map((_,row)=>(
            <React.Fragment key={row}>
              <div className="flex items-center justify-end pr-2 text-[11px] text-slate-400 border-b border-slate-700/50 bg-slate-800/30" style={{height:`${cell}px`}}>{row+1}</div>
              {Array.from({length:12}).map((_,col)=>{
                const valid = row < monthDays[col];
                const k = keyFor(year,col,row+1);
                const moodColor = moods[k];
                return (
                  <GridCell
                    key={`${col}-${row}`}
                    title={valid? `${FULL_MONTHS_ES[col]} ${row+1}` : ''}
                    valid={valid}
                    moodColor={moodColor}
                    cell={cell}
                    onOpen={()=>{ if(!valid) return; setTarget({y:year,m:col,d:row+1}); setOpen(true); }}
                    onClear={(e)=>{ e.preventDefault(); valid && clearCell(col,row+1); }}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>

        <div className="text-[11px] text-slate-500 mt-3">Tip: Tap para editar. Mantén presionado y suelta (o click derecho) para limpiar un día.</div>
      </div>

      {/* Modal de selección de color */}
      {open && (
        <EditorModal
          key={`${target.y}-${target.m}-${target.d}`}
          title={`${FULL_MONTHS_ES[target.m]} ${target.d}, ${target.y}`}
          dayKey={keyFor(target.y,target.m,target.d)}
          currentImage={moods[keyFor(target.y,target.m,target.d)]}
          onClose={()=>setOpen(false)}
          onSaved={handleSaved}
        />
      )}

      <div className="h-8"/>
    </div>
  );
}

const GridCell = memo(function GridCell({ valid, moodColor, onOpen, onClear, title, cell }){
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <div
      className={`relative border-b border-slate-700/50 border-l border-slate-700/50 ${valid? 'cursor-pointer hover:bg-slate-700/30 transition-colors' : 'opacity-30'}`}
      onClick={onOpen}
      onContextMenu={onClear}
      title={title}
      style={{ width: `${cell}px`, height: `${cell}px` }}
    >
      {moodColor ? (
        <>
          {/* Loading skeleton */}
          {imageLoading && (
            <div className="w-full h-full bg-slate-700 animate-pulse flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {/* Image */}
          <img 
            src={moodColor} 
            alt="mood" 
            className={`w-full h-full object-contain transition-opacity duration-200 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            style={{ objectFit: 'contain' }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          
          {/* Error fallback */}
          {imageError && !imageLoading && (
            <div className="w-full h-full bg-slate-700 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-transparent"></div>
      )}
    </div>
  );
});

function EditorModal({ title, dayKey, currentImage, onClose, onSaved }){
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#22c55e');
  const [brushSize, setBrushSize] = useState(8);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = 300;
    canvas.height = 300;
    

    
    // Load existing image if any
    if (currentImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 300, 300);
      };
      img.src = currentImage;
    }
  }, [currentImage]);

  const getXY = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const { x, y } = getXY(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getXY(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 300, 300);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const canvas = canvasRef.current;
      const dataURL = canvas.toDataURL('image/webp', 0.85);
      await onSaved(dayKey, dataURL);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      await onSaved(dayKey, null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}/>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900 rounded-2xl border border-slate-700 p-6 max-w-md w-full mx-4">
        <div className="text-center font-semibold mb-4">{title}</div>
        <div className="text-center text-sm text-slate-400 mb-4">Dibuja cómo te sientes hoy</div>
        
        {/* Canvas */}
        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            className="border border-slate-600 rounded-lg cursor-crosshair touch-none select-none"
            style={{ touchAction: 'none' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const touch = e.touches[0];
              const rect = canvasRef.current.getBoundingClientRect();
              const x = touch.clientX - rect.left;
              const y = touch.clientY - rect.top;
              
              const ctx = canvasRef.current.getContext('2d');
              setIsDrawing(true);
              ctx.beginPath();
              ctx.moveTo(x, y);
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isDrawing) return;
              
              const touch = e.touches[0];
              const rect = canvasRef.current.getBoundingClientRect();
              const x = touch.clientX - rect.left;
              const y = touch.clientY - rect.top;
              
              const ctx = canvasRef.current.getContext('2d');
              ctx.lineTo(x, y);
              ctx.strokeStyle = color;
              ctx.lineWidth = brushSize;
              ctx.lineCap = 'round';
              ctx.stroke();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDrawing(false);
            }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">Color:</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded border border-slate-600 cursor-pointer"
              />
              <div className="flex flex-col">
                <div className="w-6 h-6 rounded border border-slate-600" style={{ backgroundColor: color }}></div>
                <span className="text-xs text-slate-400 mt-1">
                  {PALETTE.find(c => c.color === color)?.name || 'Personalizado'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">Tamaño:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-20"
            />
            <span className="text-xs text-slate-400 w-6 text-center">{brushSize}</span>
          </div>
        </div>

        {/* Quick Colors */}
        <div className="grid grid-cols-6 gap-2 mb-4">
          {PALETTE.map(c => (
            <button
              key={c.color}
              onClick={() => setColor(c.color)}
              className={`h-8 w-8 rounded border-2 transition-all flex flex-col items-center justify-center ${
                color === c.color ? 'border-white scale-110' : 'border-slate-600'
              }`}
            >
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }}></div>
              <span className="text-xs text-slate-300">{c.name}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button 
            onClick={clearCanvas} 
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 active:scale-95"
          >
            Limpiar
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="flex-1 py-2 rounded-lg bg-emerald-600 font-semibold disabled:bg-slate-600 active:scale-95 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </button>
          {currentImage && (
            <button 
              onClick={handleClear} 
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-slate-600 active:scale-95 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Borrando...
                </>
              ) : (
                'Borrar'
              )}
            </button>
          )}
          <button 
            onClick={onClose} 
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 active:scale-95"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
