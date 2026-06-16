import React, { useRef, useEffect, useCallback } from 'react'

/**
 * useDisplacementMap - 核心位移贴图生成 Hook
 *
 * 参数映射:
 *   Size       → lensRadius (px)
 *   Strength   → feDisplacementMap.scale (×1000)
 *   Curvature  → 折射衰减指数 (0=线性 1=强球面)
 *   Chroma     → 色散强度 (×20)
 *   Depth      → 折射深度 (×1.6)
 *   Splay      → 边缘扩展因子
 */
export function useDisplacementMap({
  width,
  height,
  mouseX,
  mouseY,
  size = 210,
  strength = 0.060,
  curvature = 0.41,
  chroma = 0.50,
  depth = 26,
  splay = 1.00,
}) {
  const canvasRef = useRef(null)
  const feImageRef = useRef(null)
  const rafRef = useRef(0)

  const generateMap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0 || height === 0) return

    const dpr = width > 1000 ? 0.4 : width > 600 ? 0.6 : 1
    const w = Math.floor(width * dpr)
    const h = Math.floor(height * dpr)
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const imageData = ctx.createImageData(w, h)
    const data = imageData.data

    const cx = mouseX * dpr
    const cy = mouseY * dpr
    const r = size * dpr
    const ew = size * 0.12 * splay * dpr  // 边缘宽度由 Size 和 Splay 决定
    const cap = depth * 1.6                 // 折射深度映射
    const chr = chroma * 20                 // 色散映射
    const curvExp = 1 + curvature * 3       // 曲率指数: 1(线性) → 4(强球面)

    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128; data[i + 1] = 128; data[i + 2] = 128; data[i + 3] = 255
    }

    const minX = Math.max(0, Math.floor(cx - r - ew))
    const maxX = Math.min(w - 1, Math.ceil(cx + r + ew))
    const minY = Math.max(0, Math.floor(cy - r - ew))
    const maxY = Math.min(h - 1, Math.ceil(cy + r + ew))

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const idx = (py * w + px) * 4
        const dx = px - cx
        const dy = py - cy
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < r) {
          const t = dist / r
          const smoothT = t * t * (3 - 2 * t) // smoothstep
          const refractionStrength = Math.pow(1 - smoothT, curvExp) // 曲率控制衰减

          const invDist = dist > 0.5 ? 1 / dist : 0
          const nx = dx * invDist
          const ny = dy * invDist

          // 向中心的折射偏移
          const dispX = -nx * refractionStrength * cap
          const dispY = -ny * refractionStrength * cap

          data[idx]     = Math.round(Math.max(0, Math.min(255, 128 + dispX)))
          data[idx + 1] = Math.round(Math.max(0, Math.min(255, 128 + dispY)))
        } else if (dist < r + ew && chr > 0) {
          // 边缘色散: splay 控制向外扩展的偏转
          const edgeT = (dist - r) / ew
          const fade = (1 - edgeT) * (1 - edgeT)
          const invDist = dist > 0.5 ? 1 / dist : 0
          const nx = dx * invDist
          const ny = dy * invDist

          // splay=1 时向外扩散, splay=0 时无色散
          const outward = splay * 1.5
          const chromatic = fade * chr
          data[idx]     = Math.round(128 + nx * chromatic * outward)
          data[idx + 1] = Math.round(128 + ny * chromatic * outward)
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)

    const feImg = feImageRef.current
    if (feImg) {
      const dataUrl = canvas.toDataURL('image/png')
      feImg.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataUrl)
      feImg.setAttribute('href', dataUrl)
    }
  }, [mouseX, mouseY, size, strength, curvature, chroma, depth, splay, width, height])

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(generateMap)
    return () => cancelAnimationFrame(rafRef.current)
  }, [generateMap])

  // 同步更新 feDisplacementMap scale
  useEffect(() => {
    const fe = feImageRef.current?.parentElement?.querySelector('feDisplacementMap')
    if (fe) fe.setAttribute('scale', strength * 1000)
  }, [strength])

  return { canvasRef, feImageRef }
}

/**
 * LiquidGlassSVGFilter - SVG 滤镜
 */
export function LiquidGlassSVGFilter({
  feImageRef,
  filterId = 'liquid-glass',
  strength = 0.060,
}) {
  return (
    <svg
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      aria-hidden="true"
    >
      <defs>
        <filter
          id={filterId}
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            ref={feImageRef}
            result="displacementMap"
            preserveAspectRatio="none"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="displacementMap"
            scale={strength * 1000}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}

/**
 * LiquidGlassLens - 液态玻璃镜头视觉层
 *
 * 参数:
 *   size           → 镜头半径
 *   blur           → 背景模糊
 *   edgeHighlight  → 边缘高光亮度
 *   glow           → 外发光强度
 *   specularAngle  → 高光方向 (角度)
 *   chroma         → 色散强度 (影响彩虹环)
 */
export function LiquidGlassLens({
  mouseX = 0,
  mouseY = 0,
  size = 210,
  blur = 0.0,
  edgeHighlight = 0.80,
  glow = 0.80,
  specularAngle = 130,
  chroma = 0.50,
}) {
  // 高光位置: 光从 specularAngle 方向来 → 高光在对侧
  const angleRad = ((specularAngle + 180) * Math.PI) / 180
  const hlX = 50 + 30 * Math.sin(angleRad) // %
  const hlY = 50 - 30 * Math.cos(angleRad) // %

  const borderAlpha = 0.2 + edgeHighlight * 0.35
  const insetAlpha = edgeHighlight * 0.5
  const glowSpread = 4 + glow * 12
  const glowAlpha = glow * 0.5
  const chromaAlpha = chroma * 0.08

  return (
    <div
      className="liquid-glass-lens"
      style={{
        position: 'absolute',
        left: mouseX - size,
        top: mouseY - size,
        width: size * 2,
        height: size * 2,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 100,
        background: `
          radial-gradient(
            ellipse at ${hlX}% ${hlY}%,
            rgba(255, 255, 255, ${0.15 + edgeHighlight * 0.2}) 0%,
            rgba(255, 255, 255, ${0.04 + edgeHighlight * 0.08}) 25%,
            rgba(255, 255, 255, 0.02) 50%,
            rgba(0, 0, 0, 0.03) 75%,
            rgba(0, 0, 0, 0.08) 100%
          )
        `,
        border: `1.5px solid rgba(255, 255, 255, ${borderAlpha})`,
        boxShadow: `
          0 0 0 0.5px rgba(255, 255, 255, 0.1),
          0 ${glowSpread}px ${glowSpread * 4}px rgba(0, 0, 0, ${glowAlpha}),
          0 4px ${glowSpread}px rgba(0, 0, 0, ${glowAlpha * 0.6}),
          inset 0 1.5px 0 rgba(255, 255, 255, ${insetAlpha}),
          inset 0 -1px 0 rgba(255, 255, 255, ${insetAlpha * 0.12}),
          inset 1px 0 0 rgba(255, 255, 255, ${insetAlpha * 0.16}),
          inset -1px 0 0 rgba(255, 255, 255, ${insetAlpha * 0.16})
        `,
        backdropFilter: blur > 0
          ? `blur(${blur}px) saturate(${1.3 + blur * 0.05}) brightness(${1.03 + blur * 0.01})`
          : 'saturate(1.3) brightness(1.03)',
        WebkitBackdropFilter: blur > 0
          ? `blur(${blur}px) saturate(${1.3 + blur * 0.05}) brightness(${1.03 + blur * 0.01})`
          : 'saturate(1.3) brightness(1.03)',
      }}
    >
      {/* 主高光 */}
      <div style={{
        position: 'absolute',
        left: `${hlX - 25}%`, top: `${hlY - 15}%`,
        width: '50%', height: '30%',
        borderRadius: '50%',
        background: `radial-gradient(
          ellipse at 50% 60%,
          rgba(255,255,255,${edgeHighlight * 0.5}) 0%,
          rgba(255,255,255,${edgeHighlight * 0.15}) 45%,
          transparent 100%
        )`,
        pointerEvents: 'none',
      }} />
      {/* 二次反射 */}
      <div style={{
        position: 'absolute',
        left: `${100 - hlX - 15}%`, top: `${100 - hlY - 8}%`,
        width: '35%', height: '16%',
        borderRadius: '50%',
        background: `radial-gradient(
          ellipse at 50% 40%,
          rgba(255,255,255,${glow * 0.1}) 0%,
          transparent 100%
        )`,
        pointerEvents: 'none',
      }} />
      {/* 外光环 */}
      <div style={{
        position: 'absolute', inset: -4, borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.04)', pointerEvents: 'none',
      }} />
      {/* 边缘色散彩虹 */}
      <div style={{
        position: 'absolute', inset: -1, borderRadius: '50%',
        background: `conic-gradient(
          from ${specularAngle - 70}deg,
          transparent 0deg,
          rgba(255,100,100,${chromaAlpha}) 60deg,
          rgba(100,255,100,${chromaAlpha * 0.75}) 120deg,
          rgba(100,100,255,${chromaAlpha}) 180deg,
          rgba(255,200,100,${chromaAlpha * 0.75}) 240deg,
          transparent 360deg
        )`,
        pointerEvents: 'none',
      }} />
    </div>
  )
}
