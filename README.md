# Liquid Glass Web React

A floating glass lens that refracts whatever is beneath it in real time. Move your cursor across an image or video and the content warps as if viewed through a physical glass sphere — magnifying, bending, and dispersing light at the edges with chromatic aberration. Upload your own images or videos to see them refracted instantly. Adjust the lens size, refraction depth, curvature, glow, specular angle, and more through the control panel. Supports both mouse-follow and automatic wandering modes.

The effect runs entirely in the browser with no server dependencies, no WebGL, and no experimental flags.

## Live Demo

**https://manji1233.github.io/Uploadable-Liquid-Glass-Web-React/**

Move your cursor over the image to see real-time refraction through the glass lens. Supports both mouse-follow and automatic wandering modes.

```
Cursor movement → Smooth follow → Canvas displacement map → SVG feImage → feDisplacementMap → Refracted output
```

## Features

- **Real-time DOM refraction** — `feDisplacementMap` operates on rendered DOM content, not screenshots or offscreen buffers
- **Pixel-level displacement** — Per-pixel spherical refraction with smoothstep interpolation and configurable curvature falloff
- **Chromatic dispersion** — Edge prism effect with adjustable spread direction via the Splay parameter
- **Cross-browser** — Based on SVG 1.1 `feDisplacementMap` specification (2003). No feature flags required
- **Image and video** — Refracts static images and playing video equally, since the filter operates on the DOM layer
- **15 adjustable parameters** — 10 lens/material parameters plus 5 background adjustment controls
- **Dual movement modes** — Mouse-follow with smooth interpolation, or automatic Lissajous curve wandering

## Architecture

```
Canvas (hidden)
  Generate displacement map pixel by pixel
  R channel = X offset (128 = no displacement, 0 = max negative, 255 = max positive)
  G channel = Y offset
  toDataURL() → base64 PNG
        |
        v
SVG Filter
  <feImage> loads the displacement map
  <feDisplacementMap> distorts SourceGraphic
  scale = Strength × 1000
        |
        v
CSS Glass Lens Overlay
  Specular Angle drives highlight position via trigonometry
  Glow controls outer shadow spread
  Edge Highlight controls border and inset brightness
  Chroma controls rainbow ring intensity
```

## Getting Started

```bash
git clone https://github.com/Manji1233/Uploadable-Liquid-Glass-Web-React.git
cd Uploadable-Liquid-Glass-Web-React
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Project Structure

```
src/
  App.jsx                         Main application: layout, state management, media handling
  main.jsx                        Entry point
  hooks/
    useDisplacementMap.jsx        Core: displacement map generation, SVG filter, lens overlay
  components/
    ControlPanel.jsx              Right-side floating control panel
public/
  swan.jpg                        Default background image
showcase.html                     Standalone demo page (no build step required)
```

## Parameters

### Lens

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Size | 100 | 0 – 260 | Lens radius in pixels |
| Chroma | 0.50 | 0.00 – 1.00 | Edge chromatic dispersion strength |
| Depth | 26 | 0 – 60 | Refraction depth (mapped ×1.6 to displacement magnitude) |
| Blur | 0.0 | 0.0 – 3.0 | Backdrop blur on the lens overlay |
| Edge Highlight | 0.80 | 0.00 – 1.00 | Border and specular highlight brightness |

### Material

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Strength | 0.08 | 0.000 – 1.000 | Displacement strength (×1000 = feDisplacementMap scale) |
| Curvature | 0.41 | 0.00 – 1.00 | Refraction falloff curve (0 = linear, 1 = strong spherical) |
| Splay | 1.00 | 0.00 – 1.00 | Edge chromatic outward spread factor |
| Glow | 0.80 | 0.00 – 1.00 | Outer glow shadow intensity and spread |
| Specular Angle | 130 | 0 – 180 | Highlight direction in degrees (trigonometric positioning) |

### Background

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Brightness | 100% | 20 – 200 | CSS brightness filter |
| Contrast | 100% | 20 – 200 | CSS contrast filter |
| Saturate | 100% | 0 – 300 | CSS saturate filter |
| Scale | 100% | 50 – 200 | CSS transform scale |
| Radius | 16px | 0 – 50 | Border radius of the media container |

## Core Implementation

### Displacement Map Generation

```js
// Per-pixel displacement map on Canvas
const curvExp = 1 + curvature * 3  // Curvature exponent: 1 (linear) → 4 (strong spherical)
const refractionStrength = Math.pow(1 - smoothT, curvExp)

// R channel → X displacement, G channel → Y displacement (128 = neutral)
data[idx]     = 128 + (-nx * refractionStrength * depth * 1.6)
data[idx + 1] = 128 + (-ny * refractionStrength * depth * 1.6)
```

### SVG Filter Pipeline

```jsx
<filter id="liquid-glass" colorInterpolationFilters="sRGB">
  <feImage href="{canvas.toDataURL()}" result="displacementMap" />
  <feDisplacementMap
    in="SourceGraphic"
    in2="displacementMap"
    scale={strength * 1000}
    xChannelSelector="R"
    yChannelSelector="G"
  />
</filter>
```

### Application to DOM Elements

```jsx
<div style={{ filter: 'url(#liquid-glass)' }}>
  {children}
</div>
```

## Technical Details

### Why feDisplacementMap over WebGL

| | SVG Filter | WebGL |
|---|---|---|
| Compatibility | All browsers, native since 2003 | Requires WebGL support |
| Experimental flags | Not required | Some effects require flags |
| DOM refraction | Operates directly on rendered DOM | Requires screenshot → texture upload |
| Video support | Native (filter applies to DOM layer) | Requires per-frame texture upload |
| Implementation complexity | Low | High |

### How feDisplacementMap Works

The filter reads pixel values from a displacement map to offset source pixels:

```
P'(x,y).x = x + scale × (channelR(x,y) - 128) / 128
P'(x,y).y = y + scale × (channelG(x,y) - 128) / 128
```

- R = 128, G = 128 → no offset
- R < 128 → leftward offset, R > 128 → rightward offset
- G < 128 → upward offset, G > 128 → downward offset

### Performance Strategy

- **Downsampling**: Large screens at 0.4x, medium at 0.6x, small at 1x — maintains 60fps
- **Region clipping**: Only iterate pixels within the lens influence area
- **requestAnimationFrame**: Synced to screen refresh rate
- **Canvas willReadFrequently**: Hints the browser to optimize readback paths

## Browser Support

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | Supported | Supported |
| Safari | Supported | Supported |
| Firefox | Supported | Supported |

Based on the SVG 1.1 `feDisplacementMap` specification (W3C Recommendation, 2003). All modern browsers implement this without flags.

## License

MIT
