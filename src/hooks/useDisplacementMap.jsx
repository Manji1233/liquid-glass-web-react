import React, { useRef, useEffect, useCallback } from 'react'

/**
 * useDisplacementMap - 核心位移贴图生成 Hook
 *
 * 增强: Fresnel 衰减 + 焦散亮点 + 球面折射
 */
export function useDisplacementMap({
  width,
  height,
  mouseX,
  mouseY,
  size = 100,
  strength = 0.08,
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
    const ew = size * 0.12 * splay * dpr
    const cap = depth * 1.6
    const chr = chroma * 20
    const curvExp = 1 + curvature * 3

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
          const smoothT = t * t * (3 - 2 * t)

          // Fresnel 衰减: 边缘折射减弱，反射增强
          // 在 t > 0.7 时快速衰减位移量，模拟真实玻璃的 Fresnel 效应
          let refractionStrength = Math.pow(1 - smoothT, curvExp)
          if (t > 0.7) {
            const fresnelFade = 1 - ((t - 0.7) / 0.3)
            refractionStrength *= fresnelFade * fresnelFade
          }

          const invDist = dist > 0.5 ? 1 / dist : 0
          const nx = dx * invDist
          const ny = dy * invDist

          // 向中心的折射偏移 (放大镜效果)
          const dispX = -nx * refractionStrength * cap
          const dispY = -ny * refractionStrength * cap

          data[idx]     = Math.round(Math.max(0, Math.min(255, 128 + dispX)))
          data[idx + 1] = Math.round(Math.max(0, Math.min(255, 128 + dispY)))

          // B 通道: 焦散亮点编码
          // 在焦点下方 (略偏移) 编码一个亮度峰值
          const focalY = cy + r * 0.15  // 焦点略低于中心
          const focalDist = Math.sqrt(dx * dx + (py - focalY) * (py - focalY))
          const focalRadius = r * 0.35
          if (focalDist < focalRadius) {
            const focalT = focalDist / focalRadius
            const focalBright = (1 - focalT * focalT) * depth * 0.3
            data[idx + 2] = Math.round(Math.min(255, 128 + focalBright))
          }
        } else if (dist < r + ew && chr > 0) {
          const edgeT = (dist - r) / ew
          const fade = (1 - edgeT) * (1 - edgeT)
          const invDist = dist > 0.5 ? 1 / dist : 0
          const nx = dx * invDist
          const ny = dy * invDist
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
 * 增加 feComponentTransfer 用于焦散亮度增强
 */
export function LiquidGlassSVGFilter({
  feImageRef,
  filterId = 'liquid-glass',
  strength = 0.08,
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
 * LiquidGlassLens - 真实 3D 玻璃珠镜头视觉层
 *
 * 物理效果:
 * - Fresnel 反射: 边缘更不透明/反光
 * - 焦散光斑: 球面聚焦的光线
 * - 内反射暗环: 全内反射产生的暗边
 * - 背景色着色: 玻璃吸收/散射底色
 * - 地面阴影: 球体投射的阴影
 */
export function LiquidGlassLens({
  mouseX = 0,
  mouseY = 0,
  size = 100,
  blur = 0.0,
  edgeHighlight = 0.80,
  glow = 0.80,
  specularAngle = 130,
  chroma = 0.50,
  depth = 26,
  bgColor = null,  // {r, g, b} 从底图采样
}) {
  // 高光位置
  const angleRad = ((specularAngle + 180) * Math.PI) / 180
  const hlX = 50 + 30 * Math.sin(angleRad)
  const hlY = 50 - 30 * Math.cos(angleRad)

  // 背景色着色
  const bgR = bgColor ? bgColor.r : 255
  const bgG = bgColor ? bgColor.g : 255
  const bgB = bgColor ? bgColor.b : 255
  const bgTintAlpha = bgColor ? 0.12 : 0  // 着色强度

  const borderAlpha = 0.15 + edgeHighlight * 0.3
  const insetAlpha = edgeHighlight * 0.45
  const glowSpread = 4 + glow * 14
  const glowAlpha = glow * 0.45
  const chromaAlpha = chroma * 0.06
  const shadowOffset = Math.round(size * 0.15 + 6)

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
        // Fresnel 渐变: 中心透明 → 边缘反射增强
        background: `
          radial-gradient(
            circle at 50% 50%,
            rgba(${bgR}, ${bgG}, ${bgB}, ${bgTintAlpha * 0.3}) 0%,
            rgba(255, 255, 255, 0.01) 20%,
            rgba(255, 255, 255, ${0.02 + edgeHighlight * 0.04}) 40%,
            rgba(255, 255, 255, ${0.06 + edgeHighlight * 0.08}) 55%,
            rgba(255, 255, 255, ${0.12 + edgeHighlight * 0.12}) 70%,
            rgba(255, 255, 255, ${0.20 + edgeHighlight * 0.15}) 82%,
            rgba(255, 255, 255, ${0.28 + edgeHighlight * 0.12}) 92%,
            rgba(255, 255, 255, ${0.18 + edgeHighlight * 0.08}) 100%
          )
        `,
        border: `1px solid rgba(255, 255, 255, ${borderAlpha})`,
        boxShadow: `
          0 0 0 0.5px rgba(255, 255, 255, 0.08),
          0 ${shadowOffset}px ${shadowOffset * 3}px rgba(0, 0, 0, ${glowAlpha}),
          0 2px ${glowSpread}px rgba(0, 0, 0, ${glowAlpha * 0.5}),
          inset 0 2px 4px rgba(255, 255, 255, ${insetAlpha * 0.6}),
          inset 0 -1px 0 rgba(255, 255, 255, ${insetAlpha * 0.15}),
          inset 1px 0 0 rgba(255, 255, 255, ${insetAlpha * 0.2}),
          inset -1px 0 0 rgba(255, 255, 255, ${insetAlpha * 0.2})
        `,
        backdropFilter: blur > 0
          ? `blur(${blur}px) saturate(${1.2 + blur * 0.04}) brightness(${1.02 + blur * 0.01})`
          : 'saturate(1.2) brightness(1.02)',
        WebkitBackdropFilter: blur > 0
          ? `blur(${blur}px) saturate(${1.2 + blur * 0.04}) brightness(${1.02 + blur * 0.01})`
          : 'saturate(1.2) brightness(1.02)',
      }}
    >
      {/* ── 主高光 (Specular) ── */}
      <div style={{
        position: 'absolute',
        left: `${hlX - 22}%`, top: `${hlY - 14}%`,
        width: '44%', height: '28%',
        borderRadius: '50%',
        background: `radial-gradient(
          ellipse at 50% 55%,
          rgba(255, 255, 255, ${0.35 + edgeHighlight * 0.35}) 0%,
          rgba(255, 255, 255, ${0.1 + edgeHighlight * 0.12}) 40%,
          transparent 100%
        )`,
        pointerEvents: 'none',
      }} />

      {/* ── 焦散光斑 (Caustic) ── */}
      <div style={{
        position: 'absolute',
        left: '25%', top: '55%',
        width: '50%', height: '35%',
        borderRadius: '50%',
        background: `radial-gradient(
          ellipse at 50% 40%,
          rgba(255, 255, 255, ${0.06 + depth * 0.004}) 0%,
          rgba(${bgR}, ${bgG}, ${bgB}, ${0.04 + depth * 0.002}) 30%,
          transparent 75%
        )`,
        pointerEvents: 'none',
      }} />

      {/* ── 二次反射 (Secondary Reflection) ── */}
      <div style={{
        position: 'absolute',
        left: `${100 - hlX - 12}%`, top: `${100 - hlY - 6}%`,
        width: '28%', height: '14%',
        borderRadius: '50%',
        background: `radial-gradient(
          ellipse at 50% 40%,
          rgba(255, 255, 255, ${glow * 0.08}) 0%,
          transparent 100%
        )`,
        pointerEvents: 'none',
      }} />

      {/* ── 内反射暗环 (Total Internal Reflection Ring) ── */}
      <div style={{
        position: 'absolute',
        inset: '8%',
        borderRadius: '50%',
        boxShadow: `inset 0 0 ${size * 0.15}px ${size * 0.03}px rgba(0, 0, 0, ${0.06 + (1 - edgeHighlight) * 0.04})`,
        pointerEvents: 'none',
      }} />

      {/* ── 背景色散射着色层 ── */}
      {bgColor && (
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          background: `radial-gradient(
            circle at 50% 45%,
            rgba(${bgR}, ${bgG}, ${bgB}, ${bgTintAlpha * 0.5}) 0%,
            rgba(${bgR}, ${bgG}, ${bgB}, ${bgTintAlpha * 0.2}) 40%,
            rgba(${bgR}, ${bgG}, ${bgB}, ${bgTintAlpha}) 70%,
            transparent 100%
          )`,
          pointerEvents: 'none',
        }} />
      )}

      {/* ── 边缘色散彩虹环 ── */}
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

      {/* ── 外光环 ── */}
      <div style={{
        position: 'absolute', inset: -5, borderRadius: '50%',
        border: '1px solid rgba(255, 255, 255, 0.03)', pointerEvents: 'none',
      }} />
    </div>
  )
}

/**
 * useBgColorSampler - 从媒体元素采样镜头下方的背景色
 *
 * 使用临时 Canvas 读取指定区域的平均颜色
 */
export function useBgColorSampler(mediaRef, mediaType, lensX, lensY, lensRadius, isActive) {
  const bgColorRef = useRef({ r: 200, g: 200, b: 200 })
  const lastSampleRef = useRef(0)

  useEffect(() => {
    if (!isActive || !mediaRef.current || lensX < 0) return

    const now = performance.now()
    if (now - lastSampleRef.current < 100) return  // 节流: 100ms
    lastSampleRef.current = now

    const media = mediaRef.current
    const canvas = document.createElement('canvas')
    const sampleSize = 32
    canvas.width = sampleSize
    canvas.height = sampleSize
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    try {
      // 计算采样区域 (镜头中心一小块)
      const mw = media.videoWidth || media.naturalWidth || media.clientWidth
      const mh = media.videoHeight || media.naturalHeight || media.clientHeight
      const cw = media.clientWidth
      const ch = media.clientHeight

      if (mw === 0 || mh === 0) return

      const scaleX = mw / cw
      const scaleY = mh / ch
      const sx = (lensX - lensRadius * 0.3) * scaleX
      const sy = (lensY - lensRadius * 0.3) * scaleY
      const sw = lensRadius * 0.6 * scaleX
      const sh = lensRadius * 0.6 * scaleY

      ctx.drawImage(media, sx, sy, sw, sh, 0, 0, sampleSize, sampleSize)
      const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize)
      const d = imgData.data
      let rSum = 0, gSum = 0, bSum = 0, count = 0

      for (let i = 0; i < d.length; i += 16) {  // 每4个像素采样1个
        rSum += d[i]; gSum += d[i + 1]; bSum += d[i + 2]; count++
      }

      if (count > 0) {
        bgColorRef.current = {
          r: Math.round(rSum / count),
          g: Math.round(gSum / count),
          b: Math.round(bSum / count),
        }
      }
    } catch (e) {
      // 跨域图片可能无法读取，使用默认色
    }
  }, [lensX, lensY, lensRadius, isActive, mediaType])

  return bgColorRef.current
}
