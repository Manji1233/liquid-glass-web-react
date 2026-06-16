import React, { useState, useRef } from 'react'

/* ─── 滑块控件 ─── */
function Slider({ label, value, min, max, step = 1, unit = '', onChange }) {
  const percent = ((value - min) / (max - min)) * 100
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{label}</span>
        <span style={{
          fontSize: 10, fontFamily: "'SF Mono','Fira Code',monospace",
          color: 'rgba(255,255,255,0.4)', minWidth: 52, textAlign: 'right',
        }}>
          {typeof value === 'number' && step < 1 ? value.toFixed(step < 0.01 ? 3 : step < 0.1 ? 2 : 1) : value}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', left: 0, width: `${percent}%`, height: 3, borderRadius: 2, background: 'linear-gradient(90deg, rgba(110,168,254,0.5), rgba(192,132,252,0.5))' }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'relative', width: '100%', height: 20, margin: 0, padding: 0, WebkitAppearance: 'none', appearance: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}
        />
      </div>
      <style>{`
        input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer}
        input[type="range"]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;border:none;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer}
      `}</style>
    </div>
  )
}

/* ─── 参数组标题 ─── */
function GroupLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: 1.2, color: 'rgba(110,168,254,0.7)',
      marginTop: 14, marginBottom: 6,
    }}>
      {children}
    </div>
  )
}

/* ─── 控制面板 (放在媒体下方) ─── */
export default function ControlPanel({
  // 左侧参数
  size, setSize,
  chroma, setChroma,
  depth, setDepth,
  blur, setBlur,
  edgeHighlight, setEdgeHighlight,
  // 右侧参数
  strength, setStrength,
  curvature, setCurvature,
  splay, setSplay,
  glow, setGlow,
  specularAngle, setSpecularAngle,
  // 其他
  onUpload, onReset,
  mediaType,
  moveMode, setMoveMode,
}) {
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && onUpload) onUpload(file)
    e.target.value = ''
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: 700,
      margin: '0 auto',
      background: 'rgba(28, 28, 30, 0.6)',
      backdropFilter: 'blur(24px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14,
      padding: '16px 20px',
      color: '#fff',
      boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
    }}>
      {/* ── 顶部行: 上传 + 模式切换 + 重置 ── */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap',
      }}>
        {/* 上传按钮 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
        >
          📁 上传{mediaType === 'video' ? '视频' : '图片'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} style={{ display: 'none' }} />

        {/* 拖放区 */}
        <div
          onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files?.[0]; if (f && onUpload) onUpload(f) }}
          style={{
            flex: 1, minWidth: 120, padding: '5px 10px', borderRadius: 8,
            border: '1px dashed rgba(255,255,255,0.1)',
            fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(110,168,254,0.3)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
        >
          拖放图片/视频到此处
        </div>

        {/* 模式切换 */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setMoveMode('mouse')}
            style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 11, cursor: 'pointer',
              border: '1px solid ' + (moveMode === 'mouse' ? 'rgba(110,168,254,0.4)' : 'rgba(255,255,255,0.08)'),
              background: moveMode === 'mouse' ? 'rgba(110,168,254,0.12)' : 'rgba(255,255,255,0.03)',
              color: moveMode === 'mouse' ? 'rgba(110,168,254,0.9)' : 'rgba(255,255,255,0.45)',
              transition: 'all 0.2s',
            }}
          >🖱 鼠标</button>
          <button
            onClick={() => setMoveMode('auto')}
            style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 11, cursor: 'pointer',
              border: '1px solid ' + (moveMode === 'auto' ? 'rgba(192,132,252,0.4)' : 'rgba(255,255,255,0.08)'),
              background: moveMode === 'auto' ? 'rgba(192,132,252,0.12)' : 'rgba(255,255,255,0.03)',
              color: moveMode === 'auto' ? 'rgba(192,132,252,0.9)' : 'rgba(255,255,255,0.45)',
              transition: 'all 0.2s',
            }}
          >✨ 自动</button>
        </div>

        {/* 重置 */}
        <button
          onClick={onReset}
          style={{
            padding: '5px 12px', borderRadius: 7,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
        >↺ 重置</button>
      </div>

      {/* ── 双栏参数 ── */}
      <div style={{ display: 'flex', gap: 24 }}>
        {/* 左列 */}
        <div style={{ flex: 1 }}>
          <GroupLabel>Lens</GroupLabel>
          <Slider label="Size" value={size} min={0} max={500} step={1} unit="px" onChange={setSize} />
          <Slider label="Chroma" value={chroma} min={0} max={1} step={0.01} onChange={setChroma} />
          <Slider label="Depth" value={depth} min={0} max={100} step={1} onChange={setDepth} />
          <Slider label="Blur" value={blur} min={0} max={10} step={0.1} onChange={setBlur} />
          <Slider label="Edge Highlight" value={edgeHighlight} min={0} max={1} step={0.01} onChange={setEdgeHighlight} />
        </div>
        {/* 右列 */}
        <div style={{ flex: 1 }}>
          <GroupLabel>Material</GroupLabel>
          <Slider label="Strength" value={strength} min={0} max={1} step={0.001} onChange={setStrength} />
          <Slider label="Curvature" value={curvature} min={0} max={1} step={0.01} onChange={setCurvature} />
          <Slider label="Splay" value={splay} min={0} max={1} step={0.01} onChange={setSplay} />
          <Slider label="Glow" value={glow} min={0} max={1} step={0.01} onChange={setGlow} />
          <Slider label="Specular Angle" value={specularAngle} min={0} max={360} step={1} unit="°" onChange={setSpecularAngle} />
        </div>
      </div>
    </div>
  )
}
