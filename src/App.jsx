import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  useDisplacementMap,
  LiquidGlassSVGFilter,
  LiquidGlassLens,
} from './hooks/useDisplacementMap.jsx'
import ControlPanel from './components/ControlPanel.jsx'

/* ─── 默认参数 ─── */
const DEFAULTS = {
  size: 210,
  chroma: 0.50,
  depth: 26,
  blur: 0.0,
  edgeHighlight: 0.80,
  strength: 0.060,
  curvature: 0.41,
  splay: 1.00,
  glow: 0.80,
  specularAngle: 130,
}
const FILTER_ID = 'liquid-glass'

export default function App() {
  const mediaContainerRef = useRef(null)
  const videoRef = useRef(null)

  /* ─── 参数状态 ─── */
  const [size, setSize]                       = useState(DEFAULTS.size)
  const [chroma, setChroma]                   = useState(DEFAULTS.chroma)
  const [depth, setDepth]                     = useState(DEFAULTS.depth)
  const [blur, setBlur]                       = useState(DEFAULTS.blur)
  const [edgeHighlight, setEdgeHighlight]     = useState(DEFAULTS.edgeHighlight)
  const [strength, setStrength]               = useState(DEFAULTS.strength)
  const [curvature, setCurvature]             = useState(DEFAULTS.curvature)
  const [splay, setSplay]                     = useState(DEFAULTS.splay)
  const [glow, setGlow]                       = useState(DEFAULTS.glow)
  const [specularAngle, setSpecularAngle]     = useState(DEFAULTS.specularAngle)

  /* ─── 移动模式 ─── */
  const [moveMode, setMoveMode] = useState('mouse') // 'mouse' | 'auto'

  /* ─── 媒体状态 ─── */
  const [mediaSrc, setMediaSrc]       = useState('/swan.jpg')
  const [mediaType, setMediaType]     = useState('image')
  const [isLoaded, setIsLoaded]       = useState(false)
  const [mediaAspect, setMediaAspect] = useState(10 / 16)

  /* ─── 鼠标/镜头状态 ─── */
  const [mousePos, setMousePos]       = useState({ x: -500, y: -500 })
  const [smoothPos, setSmoothPos]     = useState({ x: -500, y: -500 })
  const [dimensions, setDimensions]   = useState({ width: 0, height: 0 })
  const [isActive, setIsActive]       = useState(false)

  /* ─── 上传 ─── */
  const handleUpload = useCallback((file) => {
    if (!file) return
    const isVideo = file.type.startsWith('video/')
    const url = URL.createObjectURL(file)
    setMediaSrc(url)
    setMediaType(isVideo ? 'video' : 'image')
    setIsLoaded(false)
  }, [])

  /* ─── 重置 ─── */
  const handleReset = useCallback(() => {
    setSize(DEFAULTS.size)
    setChroma(DEFAULTS.chroma)
    setDepth(DEFAULTS.depth)
    setBlur(DEFAULTS.blur)
    setEdgeHighlight(DEFAULTS.edgeHighlight)
    setStrength(DEFAULTS.strength)
    setCurvature(DEFAULTS.curvature)
    setSplay(DEFAULTS.splay)
    setGlow(DEFAULTS.glow)
    setSpecularAngle(DEFAULTS.specularAngle)
  }, [])

  /* ─── 容器尺寸 ─── */
  useEffect(() => {
    const updateSize = () => {
      if (mediaContainerRef.current) {
        const rect = mediaContainerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [isLoaded, mediaAspect])

  /* ─── 媒体加载 ─── */
  const handleImageLoad = useCallback((e) => {
    const img = e.target
    setMediaAspect(img.naturalHeight / img.naturalWidth)
    setIsLoaded(true)
    setTimeout(() => {
      if (mediaContainerRef.current) {
        const rect = mediaContainerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }, 50)
  }, [])

  const handleVideoLoad = useCallback(() => {
    const v = videoRef.current
    if (v) {
      setMediaAspect(v.videoHeight / v.videoWidth)
      setIsLoaded(true)
    }
  }, [])

  /* ─── 自动移动 (Lissajous 曲线) ─── */
  useEffect(() => {
    if (moveMode !== 'auto' || dimensions.width === 0) return
    const startTime = performance.now()
    let rafId
    const animate = (now) => {
      const t = (now - startTime) / 1000
      const cx = dimensions.width * 0.5
      const cy = dimensions.height * 0.5
      const rx = dimensions.width * 0.3
      const ry = dimensions.height * 0.3
      setMousePos({
        x: cx + rx * Math.sin(t * 0.7),
        y: cy + ry * Math.sin(t * 0.5 + 1.2),
      })
      setIsActive(true)
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [moveMode, dimensions.width, dimensions.height])

  /* ─── 平滑跟随 (lerp) ─── */
  useEffect(() => {
    let rafId
    const lerp = (a, b, t) => a + (b - a) * t
    const animate = () => {
      setSmoothPos(prev => ({
        x: lerp(prev.x, mousePos.x, 0.05),
        y: lerp(prev.y, mousePos.y, 0.05),
      }))
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [mousePos])

  /* ─── 鼠标事件 ─── */
  const handleMouseMove = useCallback((e) => {
    if (moveMode !== 'mouse') return
    if (!mediaContainerRef.current) return
    const rect = mediaContainerRef.current.getBoundingClientRect()
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [moveMode])

  const handleMouseEnter = useCallback(() => {
    if (moveMode === 'mouse') setIsActive(true)
  }, [moveMode])

  const handleMouseLeave = useCallback(() => {
    if (moveMode === 'mouse') {
      setIsActive(false)
      setMousePos({ x: -500, y: -500 })
    }
  }, [moveMode])

  const handleTouchMove = useCallback((e) => {
    e.preventDefault()
    const touch = e.touches[0]
    if (!mediaContainerRef.current || !touch) return
    const rect = mediaContainerRef.current.getBoundingClientRect()
    setMousePos({ x: touch.clientX - rect.left, y: touch.clientY - rect.top })
    setIsActive(true)
  }, [])

  /* ─── 位移贴图 ─── */
  const { canvasRef, feImageRef } = useDisplacementMap({
    width: dimensions.width,
    height: dimensions.height,
    mouseX: smoothPos.x,
    mouseY: smoothPos.y,
    size,
    strength,
    curvature,
    chroma,
    depth,
    splay,
  })

  return (
    <div style={{
      width: '100vw', minHeight: '100vh',
      background: 'linear-gradient(145deg, #0a0a0f 0%, #111118 50%, #0d0d14 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      padding: 20,
      gap: 16,
    }}>
      {/* ── 媒体容器 (居中, max-width 700px) ── */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 700,
        aspectRatio: `${1 / mediaAspect}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: isLoaded
          ? '0 20px 80px rgba(0,0,0,0.6), 0 4px 20px rgba(0,0,0,0.3)'
          : 'none',
        transition: 'box-shadow 0.5s ease',
      }}>
        <div
          ref={mediaContainerRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchMove}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            cursor: moveMode === 'mouse' && isActive ? 'none' : moveMode === 'auto' ? 'default' : 'crosshair',
          }}
        >
          <canvas ref={canvasRef} style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />

          <LiquidGlassSVGFilter feImageRef={feImageRef} filterId={FILTER_ID} strength={strength} />

          {/* 应用位移滤镜的媒体层 */}
          <div style={{ position: 'absolute', inset: 0, filter: `url(#${FILTER_ID})`, WebkitFilter: `url(#${FILTER_ID})` }}>
            {mediaType === 'video' ? (
              <video
                ref={videoRef}
                src={mediaSrc}
                onLoadedMetadata={handleVideoLoad}
                autoPlay loop muted playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: isLoaded ? 1 : 0, transition: 'opacity 0.5s ease' }}
              />
            ) : (
              <img
                src={mediaSrc}
                alt="Media"
                onLoad={handleImageLoad}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: isLoaded ? 1 : 0, transition: 'opacity 0.5s ease' }}
                draggable={false}
              />
            )}
          </div>

          {/* 液态玻璃镜头视觉层 */}
          {isActive && (
            <LiquidGlassLens
              mouseX={smoothPos.x}
              mouseY={smoothPos.y}
              size={size}
              blur={blur}
              edgeHighlight={edgeHighlight}
              glow={glow}
              specularAngle={specularAngle}
              chroma={chroma}
            />
          )}
        </div>
      </div>

      {/* ── 控制面板 (媒体下方) ── */}
      <ControlPanel
        size={size} setSize={setSize}
        chroma={chroma} setChroma={setChroma}
        depth={depth} setDepth={setDepth}
        blur={blur} setBlur={setBlur}
        edgeHighlight={edgeHighlight} setEdgeHighlight={setEdgeHighlight}
        strength={strength} setStrength={setStrength}
        curvature={curvature} setCurvature={setCurvature}
        splay={splay} setSplay={setSplay}
        glow={glow} setGlow={setGlow}
        specularAngle={specularAngle} setSpecularAngle={setSpecularAngle}
        onUpload={handleUpload}
        onReset={handleReset}
        mediaType={mediaType}
        moveMode={moveMode}
        setMoveMode={setMoveMode}
      />
    </div>
  )
}
