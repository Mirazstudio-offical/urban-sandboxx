// Procedural 2D Canvas Models for Smartphones - Distinctive Physical Hardware & Chassis Designs
import { drawShadow } from './itemGraphicShared';

export interface PhoneVisualTheme {
  series: 'aura' | 'quantum' | 'pixel' | 'cyber' | 'compact';
  bodyColor: string;
  rimColor: string;
  accentColor: string;
  cameraPlateColor?: string;
  variant: string;
}

export function getPhoneTheme(itemId: string): PhoneVisualTheme {
  // 1. Aura Pro 16 Series (Apple-style Pro Titanium & Triangle Triple Camera)
  if (itemId.includes('aura_pro')) {
    if (itemId.includes('gold')) {
      return {
        series: 'aura',
        bodyColor: '#d4b996',
        rimColor: '#d4af37',
        accentColor: '#fef08a',
        cameraPlateColor: '#c9ad88',
        variant: 'Desert Titanium Gold'
      };
    }
    if (itemId.includes('titanium')) {
      return {
        series: 'aura',
        bodyColor: '#9c978f',
        rimColor: '#a1a1aa',
        accentColor: '#cbd5e1',
        cameraPlateColor: '#8e8a82',
        variant: 'Natural Titanium'
      };
    }
    if (itemId.includes('blue')) {
      return {
        series: 'aura',
        bodyColor: '#1e293b',
        rimColor: '#38bdf8',
        accentColor: '#60a5fa',
        cameraPlateColor: '#172033',
        variant: 'Deep Marine Blue'
      };
    }
    return {
      series: 'aura',
      bodyColor: '#1e2022',
      rimColor: '#475569',
      accentColor: '#94a3b8',
      cameraPlateColor: '#17181a',
      variant: 'Space Black'
    };
  }

  // 2. Quantum Ultra S25 Series (Samsung-style Sharp Boxy, Floating Quad-Lens Matrix & S-Pen)
  if (itemId.includes('quantum')) {
    if (itemId.includes('silver')) {
      return {
        series: 'quantum',
        bodyColor: '#cbd5e1',
        rimColor: '#e2e8f0',
        accentColor: '#0284c7',
        variant: 'Titanium Silver'
      };
    }
    if (itemId.includes('emerald')) {
      return {
        series: 'quantum',
        bodyColor: '#064e3b',
        rimColor: '#059669',
        accentColor: '#34d399',
        variant: 'Imperial Emerald'
      };
    }
    if (itemId.includes('violet')) {
      return {
        series: 'quantum',
        bodyColor: '#4c1d95',
        rimColor: '#7c3aed',
        accentColor: '#c084fc',
        variant: 'Amethyst Silk'
      };
    }
    return {
      series: 'quantum',
      bodyColor: '#18181b',
      rimColor: '#52525b',
      accentColor: '#71717a',
      variant: 'Phantom Graphite'
    };
  }

  // 3. Pixel Nova 9 Series (Google-style Full-Width Horizontal Camera Visor Bar)
  if (itemId.includes('pixel')) {
    if (itemId.includes('porcelain')) {
      return {
        series: 'pixel',
        bodyColor: '#f8fafc',
        rimColor: '#cbd5e1',
        accentColor: '#94a3b8',
        cameraPlateColor: '#e2e8f0',
        variant: 'Ceramic Porcelain'
      };
    }
    if (itemId.includes('hazel')) {
      return {
        series: 'pixel',
        bodyColor: '#3f4a3c',
        rimColor: '#84cc16',
        accentColor: '#a3e635',
        cameraPlateColor: '#343e32',
        variant: 'Sage Hazel'
      };
    }
    if (itemId.includes('rose')) {
      return {
        series: 'pixel',
        bodyColor: '#be7b82',
        rimColor: '#f43f5e',
        accentColor: '#fb7185',
        cameraPlateColor: '#ab6c73',
        variant: 'Rose Quartz'
      };
    }
    return {
      series: 'pixel',
      bodyColor: '#27272a',
      rimColor: '#71717a',
      accentColor: '#a1a1aa',
      cameraPlateColor: '#1f1f22',
      variant: 'Obsidian Charcoal'
    };
  }

  // 4. CyberPhone Mech-X Gaming Series (Sci-Fi Transparent Glass, Copper Vapor Chamber, RGB Halo)
  if (itemId.includes('cyber')) {
    if (itemId.includes('white')) {
      return {
        series: 'cyber',
        bodyColor: '#f8fafc',
        rimColor: '#f97316',
        accentColor: '#fb923c',
        variant: 'Mecha White'
      };
    }
    if (itemId.includes('neon')) {
      return {
        series: 'cyber',
        bodyColor: '#172554',
        rimColor: '#eab308',
        accentColor: '#facc15',
        variant: 'Electric Neon'
      };
    }
    return {
      series: 'cyber',
      bodyColor: '#0f172a',
      rimColor: '#06b6d4',
      accentColor: '#22d3ee',
      variant: 'Cyber Dark'
    };
  }

  // 5. Neo Compact 5G Series (Compact Ergonomic, Minimalist Nordic Dual-Pill Module)
  if (itemId.includes('compact')) {
    if (itemId.includes('gray')) {
      return {
        series: 'compact',
        bodyColor: '#4b5563',
        rimColor: '#9ca3af',
        accentColor: '#d1d5db',
        variant: 'Storm Basalt'
      };
    }
    if (itemId.includes('coral')) {
      return {
        series: 'compact',
        bodyColor: '#d97706',
        rimColor: '#f59e0b',
        accentColor: '#fde68a',
        variant: 'Warm Coral'
      };
    }
    return {
      series: 'compact',
      bodyColor: '#1e3a5f',
      rimColor: '#3b82f6',
      accentColor: '#60a5fa',
      variant: 'Nordic Navy'
    };
  }

  // Default smartphone fallback -> Aura Pro Black
  return {
    series: 'aura',
    bodyColor: '#18181b',
    rimColor: '#64748b',
    accentColor: '#38bdf8',
    cameraPlateColor: '#111214',
    variant: 'Obsidian Black'
  };
}

// -------------------------------------------------------------
// 1. Aura Pro 16 Rendering (Iconic Triangle Triple-Lens Plateau)
// -------------------------------------------------------------
function drawAuraProBack(ctx: CanvasRenderingContext2D, theme: PhoneVisualTheme) {
  // Titanium Outer Rail with Chamfered Edges
  ctx.fillStyle = theme.rimColor;
  ctx.beginPath();
  ctx.roundRect(-6.0, -9.0, 12.0, 18.0, 2.8);
  ctx.fill();

  // Side Buttons: Action Button & Volume on Left, Power & Camera Control on Right
  ctx.fillStyle = theme.rimColor;
  ctx.fillRect(-6.5, -5.5, 0.7, 1.4); // Action Button
  ctx.fillRect(-6.5, -3.2, 0.7, 2.5); // Volume Up
  ctx.fillRect(-6.5, -0.2, 0.7, 2.5); // Volume Down
  ctx.fillRect(5.8, -3.5, 0.7, 3.5);  // Power
  ctx.fillStyle = theme.accentColor;
  ctx.fillRect(5.8, 2.5, 0.7, 3.2);   // Capacitive Camera Control Sensor

  // Frosted Matte Glass Backplate
  ctx.fillStyle = theme.bodyColor;
  ctx.beginPath();
  ctx.roundRect(-5.4, -8.4, 10.8, 16.8, 2.3);
  ctx.fill();

  // Center Frosted Mirror Emblem
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.beginPath();
  ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Raised Triple-Camera Pro Plateau (Top-Left Rounded Square Glass Island)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; // Island shadow
  ctx.beginPath();
  ctx.roundRect(-5.1, -8.1, 6.0, 6.0, 1.6);
  ctx.fill();

  ctx.fillStyle = theme.cameraPlateColor || '#17181a';
  ctx.beginPath();
  ctx.roundRect(-5.2, -8.2, 5.8, 5.8, 1.5);
  ctx.fill();
  ctx.strokeStyle = theme.rimColor;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // 3 Massive Sapphire Lenses arranged in Triangle
  const lenses = [
    { x: -3.5, y: -6.7 }, // Top-Left Primary 48MP
    { x: -3.5, y: -3.9 }, // Bottom-Left Ultra-Wide
    { x: -1.2, y: -5.3 }  // Right-Center Telephoto 5x
  ];

  lenses.forEach(l => {
    // Outer Titanium Bezel Ring
    ctx.fillStyle = theme.rimColor;
    ctx.beginPath();
    ctx.arc(l.x, l.y, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Dark Sapphire Glass Cavity
    ctx.fillStyle = '#05070a';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 1.05, 0, Math.PI * 2);
    ctx.fill();

    // Multi-element optical glass reflection (Deep blue/cyan AR dot)
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(l.x - 0.25, l.y - 0.25, 0.35, 0, Math.PI * 2);
    ctx.fill();
  });

  // Dual-Tone True Tone LED Flash
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(-1.2, -7.1, 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 0.3;
  ctx.stroke();

  // LiDAR Depth Scanner (Black circular sensor)
  ctx.fillStyle = '#05070a';
  ctx.beginPath();
  ctx.arc(-1.2, -3.5, 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Microphone Pinhole
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-2.3, -3.5, 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Diagonal Specular Matte Glass Sheen
  const sheenGrad = ctx.createLinearGradient(-5.4, -8.4, 5.4, 8.4);
  sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  sheenGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.05)');
  sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = sheenGrad;
  ctx.beginPath();
  ctx.roundRect(-5.4, -8.4, 10.8, 16.8, 2.3);
  ctx.fill();
}

// -------------------------------------------------------------
// 2. Quantum Ultra S25 Rendering (Sharp Boxy, Floating Quad-Lens, S-Pen)
// -------------------------------------------------------------
function drawQuantumUltraBack(ctx: CanvasRenderingContext2D, theme: PhoneVisualTheme) {
  // Architectural Sharp Boxy Chassis (Minimal Corner Radius)
  ctx.fillStyle = theme.rimColor;
  ctx.beginPath();
  ctx.roundRect(-6.0, -9.0, 12.0, 18.0, 1.0);
  ctx.fill();

  // Side buttons on Right
  ctx.fillStyle = theme.rimColor;
  ctx.fillRect(5.8, -7.0, 0.7, 3.2); // Volume Rocker
  ctx.fillRect(5.8, -3.0, 0.7, 2.8); // Power Key

  // S-Pen Silo Push-Button Cap on Bottom-Left Rail
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.arc(-4.5, 8.8, 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.accentColor;
  ctx.fillRect(-4.8, 8.6, 0.6, 0.4);

  // Luxurious Satin Matte Glass Backplate
  ctx.fillStyle = theme.bodyColor;
  ctx.beginPath();
  ctx.roundRect(-5.4, -8.5, 10.8, 17.0, 0.8);
  ctx.fill();

  // Floating Quad-Lens Matrix (No bulky block, individual floating metallic jewel rings!)
  // Primary Vertical Column (Left)
  const primaryLenses = [
    { x: -3.4, y: -6.6, r: 1.35 }, // 12MP Ultra-Wide
    { x: -3.4, y: -3.6, r: 1.5 },  // 200MP Main Wide (Largest)
    { x: -3.4, y: -0.6, r: 1.35 }  // 50MP 5x Telephoto
  ];

  primaryLenses.forEach(l => {
    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.arc(l.x + 0.3, l.y + 0.3, l.r, 0, Math.PI * 2);
    ctx.fill();

    // Floating Chrome/Accent Jewel Ring
    ctx.fillStyle = theme.rimColor;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();

    // Deep Optics Chamber
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r - 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Sapphire Lens Coating Reflection (Cyan/Emerald)
    ctx.fillStyle = theme.accentColor;
    ctx.beginPath();
    ctx.arc(l.x - 0.25, l.y - 0.25, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Secondary Auxiliary Column (Right)
  // 1. Laser Autofocus Module
  ctx.fillStyle = theme.rimColor;
  ctx.beginPath();
  ctx.arc(-0.6, -6.6, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#05070a';
  ctx.beginPath();
  ctx.arc(-0.6, -6.6, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#dc2626'; // Infrared laser red dot
  ctx.beginPath();
  ctx.arc(-0.6, -6.6, 0.25, 0, Math.PI * 2);
  ctx.fill();

  // 2. High-CRI LED Flash
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-0.6, -4.8, 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(-0.6, -4.8, 0.45, 0, Math.PI * 2);
  ctx.fill();

  // 3. Rectangular Periscope Telephoto Prism Lens (3x)
  ctx.fillStyle = theme.rimColor;
  ctx.beginPath();
  ctx.roundRect(-1.3, -3.2, 1.4, 1.4, 0.3);
  ctx.fill();
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.roundRect(-1.15, -3.05, 1.1, 1.1, 0.2);
  ctx.fill();

  // Minimalist Quantum Wordmark at Bottom Center
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(-2.5, 6.0, 5.0, 0.6);
}

// -------------------------------------------------------------
// 3. Pixel Nova 9 Rendering (Iconic Full-Width Horizontal Camera Visor)
// -------------------------------------------------------------
function drawPixelNovaBack(ctx: CanvasRenderingContext2D, theme: PhoneVisualTheme) {
  // Rounded Pebble Ergonomic Chassis
  ctx.fillStyle = theme.rimColor;
  ctx.beginPath();
  ctx.roundRect(-6.0, -9.0, 12.0, 18.0, 3.2);
  ctx.fill();

  // Side Keys on Right: Power on Top, Volume below
  ctx.fillStyle = theme.rimColor;
  ctx.fillRect(5.8, -6.0, 0.7, 2.2); // Power
  ctx.fillRect(5.8, -2.8, 0.7, 3.8); // Volume

  // Dual-Tone Color Blocking Glass Back
  // 1. Upper Accent Glass Section (Above Visor)
  ctx.fillStyle = theme.cameraPlateColor || theme.accentColor;
  ctx.beginPath();
  ctx.roundRect(-5.4, -8.5, 10.8, 4.0, 2.5);
  ctx.fill();

  // 2. Main Body Lower Glass Section (Below Visor)
  ctx.fillStyle = theme.bodyColor;
  ctx.beginPath();
  ctx.roundRect(-5.4, -2.5, 10.8, 11.0, 2.5);
  ctx.fill();

  // 3. Full-Width Horizontal Metallic Camera Visor Bar
  // Drop shadow under visor
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.roundRect(-6.2, -6.2, 12.4, 4.4, 1.4);
  ctx.fill();

  // Raised Metallic Visor Bar Body
  ctx.fillStyle = theme.rimColor;
  ctx.beginPath();
  ctx.roundRect(-6.2, -6.6, 12.4, 4.2, 1.3);
  ctx.fill();

  // Visor Top Chamfer Highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(-6.0, -6.5, 12.0, 0.5);

  // Dark Sapphire Glass Pill Cutout Inside Visor
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.roundRect(-4.8, -5.5, 6.0, 2.2, 1.1);
  ctx.fill();

  // Dual Camera Lenses inside Pill
  // Lens 1: Wide Camera
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-3.4, -4.4, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.accentColor;
  ctx.beginPath();
  ctx.arc(-3.6, -4.6, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Lens 2: Ultra-Wide Camera
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-0.8, -4.4, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.accentColor;
  ctx.beginPath();
  ctx.arc(-1.0, -4.6, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Telephoto Periscope Oval Pill (to the right)
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.roundRect(1.8, -5.5, 1.8, 2.2, 0.9);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(2.7, -4.4, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Temperature Sensor & LED Flash on far right of visor
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(4.4, -4.4, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(4.4, -4.4, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Centered "G" Monogram Logo on Lower Glass
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(0, 2.5, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.bodyColor;
  ctx.beginPath();
  ctx.arc(0, 2.5, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(0, 2.1, 1.4, 0.8);
}

// -------------------------------------------------------------
// 4. CyberPhone Mech-X Rendering (Transparent Sci-Fi, Vapor Chamber, RGB Halo)
// -------------------------------------------------------------
function drawCyberPhoneBack(ctx: CanvasRenderingContext2D, theme: PhoneVisualTheme) {
  // Aggressive Angular Mecha Chassis with Chamfered Corners
  ctx.fillStyle = theme.rimColor;
  ctx.beginPath();
  ctx.moveTo(-4.5, -9.0);
  ctx.lineTo(4.5, -9.0);
  ctx.lineTo(6.0, -7.5);
  ctx.lineTo(6.0, 7.5);
  ctx.lineTo(4.5, 9.0);
  ctx.lineTo(-4.5, 9.0);
  ctx.lineTo(-6.0, 7.5);
  ctx.lineTo(-6.0, -7.5);
  ctx.closePath();
  ctx.fill();

  // Gaming Shoulder Air-Triggers (Capacitive Grooves on Left & Right)
  ctx.fillStyle = theme.accentColor;
  ctx.fillRect(-6.5, -7.0, 0.8, 2.8);
  ctx.fillRect(5.7, -7.0, 0.8, 2.8);
  ctx.fillRect(-6.5, 4.2, 0.8, 2.8);
  ctx.fillRect(5.7, 4.2, 0.8, 2.8);

  // Dark Transparent Smoked Glass Backplate
  ctx.fillStyle = theme.bodyColor;
  ctx.beginPath();
  ctx.moveTo(-4.0, -8.4);
  ctx.lineTo(4.0, -8.4);
  ctx.lineTo(5.4, -7.0);
  ctx.lineTo(5.4, 7.0);
  ctx.lineTo(4.0, 8.4);
  ctx.lineTo(-4.0, 8.4);
  ctx.lineTo(-5.4, 7.0);
  ctx.lineTo(-5.4, -7.0);
  ctx.closePath();
  ctx.fill();

  // Visible Copper Vapor Chamber Cooling Plate (Exposed Hardware Under Glass)
  const copperGrad = ctx.createLinearGradient(-2, -6, 2, 7);
  copperGrad.addColorStop(0, '#ea580c');
  copperGrad.addColorStop(0.5, '#c2410c');
  copperGrad.addColorStop(1, '#9a3412');
  ctx.fillStyle = copperGrad;
  ctx.beginPath();
  ctx.roundRect(-2.2, -6.5, 4.4, 13.0, 1.2);
  ctx.fill();

  // Printed Circuit Board (PCB) Glowing Sci-Fi Traces
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-4.5, -5.0); ctx.lineTo(-2.2, -3.0);
  ctx.moveTo(-4.5, 0.0);  ctx.lineTo(-2.2, 0.0);
  ctx.moveTo(-4.5, 5.0);  ctx.lineTo(-2.2, 3.5);
  ctx.moveTo(4.5, -5.0);  ctx.lineTo(2.2, -3.0);
  ctx.moveTo(4.5, 0.0);   ctx.lineTo(2.2, 0.0);
  ctx.moveTo(4.5, 5.0);   ctx.lineTo(2.2, 3.5);
  ctx.stroke();

  // Active Aerodynamic Cooling Fan Intake Vent (Hexagon Grille)
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.arc(0, 3.5, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    ctx.moveTo(0, 3.5);
    ctx.lineTo(Math.cos(angle) * 2.0, 3.5 + Math.sin(angle) * 2.0);
  }
  ctx.stroke();

  // Central Primary Gaming Camera Module (Top Half)
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.roundRect(-3.5, -6.8, 7.0, 5.5, 1.5);
  ctx.fill();

  // Glowing RGB Halo Light Ring encircling Primary Lens
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -4.2, 1.8, 0, Math.PI * 2);
  ctx.stroke();

  // Primary High-FPS Lens
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, -4.2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(-0.3, -4.5, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Dual Auxiliary High-Speed Sensor Dots
  ctx.fillStyle = theme.accentColor;
  ctx.beginPath();
  ctx.arc(-2.2, -4.2, 0.4, 0, Math.PI * 2);
  ctx.arc(2.2, -4.2, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Stenciled Mecha Gaming Badges
  ctx.fillStyle = theme.accentColor;
  ctx.font = 'bold 1.6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MECH-X', 0, 7.5);
}

// -------------------------------------------------------------
// 5. Neo Compact 5G Rendering (Ultra-Compact Ergonomic, Nordic Dual-Pill)
// -------------------------------------------------------------
function drawNeoCompactBack(ctx: CanvasRenderingContext2D, theme: PhoneVisualTheme) {
  // Ultra-Compact Pocket Ergonomic Chassis (Visibly smaller height and width)
  ctx.fillStyle = theme.rimColor;
  ctx.beginPath();
  ctx.roundRect(-5.2, -8.0, 10.4, 16.0, 2.6);
  ctx.fill();

  // Side Hardware Keys: Textured Fingerprint Power Button on Right
  ctx.fillStyle = theme.accentColor;
  ctx.fillRect(5.0, -3.0, 0.7, 2.8); // Accent textured power key
  ctx.fillStyle = theme.rimColor;
  ctx.fillRect(-5.7, -3.5, 0.7, 3.5); // Volume rocker on Left

  // Velvety Soft-Touch Matte Polymer Backplate
  ctx.fillStyle = theme.bodyColor;
  ctx.beginPath();
  ctx.roundRect(-4.6, -7.5, 9.2, 15.0, 2.2);
  ctx.fill();

  // Clean Nordic Dual-Camera Capsule Pill Island (Top-Left)
  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.roundRect(-3.9, -6.7, 3.6, 6.4, 1.8);
  ctx.fill();

  // Capsule Island Body
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-4.1, -6.9, 3.6, 6.4, 1.8);
  ctx.fill();
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Dual Compact Cameras inside Capsule
  // 1. Top Main Camera (50MP)
  ctx.fillStyle = theme.rimColor;
  ctx.beginPath();
  ctx.arc(-2.3, -5.2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.arc(-2.3, -5.2, 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(-2.5, -5.4, 0.35, 0, Math.PI * 2);
  ctx.fill();

  // 2. Bottom Ultra-Wide Camera
  ctx.fillStyle = theme.rimColor;
  ctx.beginPath();
  ctx.arc(-2.3, -2.2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.arc(-2.3, -2.2, 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(-2.5, -2.4, 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Companion LED Flash next to pill
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0.2, -5.2, 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(0.2, -5.2, 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Subtle Nordic Logo at Bottom Center
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.roundRect(-1.5, 4.5, 3.0, 1.0, 0.4);
  ctx.fill();
}

// -------------------------------------------------------------
// Central Dispatcher for All Smartphone Item Textures
// -------------------------------------------------------------
export function drawSmartphoneItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  if (!itemId.startsWith('phone_') && itemId !== 'smartphone') {
    return false;
  }

  const theme = getPhoneTheme(itemId);

  // Ambient Drop Shadow
  if (theme.series === 'compact') {
    drawShadow(ctx, 6.0, 2.0, 7.8, 0.25);
  } else {
    drawShadow(ctx, 6.8, 2.4, 8.8, 0.28);
  }

  ctx.save();

  switch (theme.series) {
    case 'quantum':
      drawQuantumUltraBack(ctx, theme);
      break;
    case 'pixel':
      drawPixelNovaBack(ctx, theme);
      break;
    case 'cyber':
      drawCyberPhoneBack(ctx, theme);
      break;
    case 'compact':
      drawNeoCompactBack(ctx, theme);
      break;
    case 'aura':
    default:
      drawAuraProBack(ctx, theme);
      break;
  }

  ctx.restore();
  return true;
}
