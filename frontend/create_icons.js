const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = '/app/frontend/assets/images';

// Colores de la app
const BG_COLOR = '#FF6B6B';
const WHITE = '#FFFFFF';

// Crear ícono principal (1024x1024)
async function createIcon() {
  const size = 1024;
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FF6B6B"/>
          <stop offset="100%" style="stop-color:#FF4757"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#bg)" rx="200"/>
      
      <!-- Plato -->
      <circle cx="512" cy="520" r="280" fill="white" opacity="0.95"/>
      <circle cx="512" cy="520" r="240" fill="none" stroke="#FFE0E0" stroke-width="8"/>
      
      <!-- Tenedor (izquierda) -->
      <g transform="translate(280, 300)">
        <rect x="40" y="0" width="16" height="180" rx="8" fill="#555"/>
        <rect x="20" y="0" width="12" height="80" rx="6" fill="#555"/>
        <rect x="48" y="0" width="12" height="80" rx="6" fill="#555"/>
        <rect x="76" y="0" width="12" height="80" rx="6" fill="#555"/>
      </g>
      
      <!-- Cuchillo (derecha) -->
      <g transform="translate(620, 300)">
        <rect x="20" y="0" width="18" height="180" rx="9" fill="#555"/>
        <path d="M 38 0 Q 70 40 70 90 Q 70 130 38 140 L 38 0 Z" fill="#555"/>
      </g>
      
      <!-- Comida en el plato -->
      <circle cx="440" cy="480" r="50" fill="#4CD137"/>
      <circle cx="540" cy="450" r="40" fill="#FFA502"/>
      <circle cx="580" cy="540" r="45" fill="#E84118"/>
      <circle cx="470" cy="570" r="35" fill="#9C88FF"/>
      
      <!-- Texto FS -->
      <text x="512" y="750" font-family="Arial Black, sans-serif" font-size="120" font-weight="bold" fill="white" text-anchor="middle" opacity="0.9">FS</text>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'icon.png'));
  
  console.log('✅ icon.png created');
}

// Crear ícono adaptativo para Android (1024x1024, sin bordes redondeados)
async function createAdaptiveIcon() {
  const size = 1024;
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FF6B6B"/>
          <stop offset="100%" style="stop-color:#FF4757"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#bg)"/>
      
      <!-- Plato centrado más pequeño para adaptive icon safe zone -->
      <circle cx="512" cy="480" r="200" fill="white" opacity="0.95"/>
      <circle cx="512" cy="480" r="170" fill="none" stroke="#FFE0E0" stroke-width="6"/>
      
      <!-- Comida en el plato -->
      <circle cx="460" cy="450" r="35" fill="#4CD137"/>
      <circle cx="540" cy="430" r="30" fill="#FFA502"/>
      <circle cx="570" cy="500" r="32" fill="#E84118"/>
      <circle cx="480" cy="520" r="28" fill="#9C88FF"/>
      
      <!-- Tenedor pequeño -->
      <g transform="translate(320, 320) scale(0.7)">
        <rect x="40" y="0" width="14" height="160" rx="7" fill="#555"/>
        <rect x="22" y="0" width="10" height="70" rx="5" fill="#555"/>
        <rect x="48" y="0" width="10" height="70" rx="5" fill="#555"/>
        <rect x="74" y="0" width="10" height="70" rx="5" fill="#555"/>
      </g>
      
      <!-- Cuchillo pequeño -->
      <g transform="translate(580, 320) scale(0.7)">
        <rect x="20" y="0" width="14" height="160" rx="7" fill="#555"/>
        <path d="M 34 0 Q 60 35 60 80 Q 60 115 34 125 L 34 0 Z" fill="#555"/>
      </g>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'adaptive-icon.png'));
  
  console.log('✅ adaptive-icon.png created');
}

// Crear splash icon (más simple, solo el plato)
async function createSplashIcon() {
  const size = 512;
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Plato -->
      <circle cx="256" cy="256" r="200" fill="white" opacity="0.95"/>
      <circle cx="256" cy="256" r="170" fill="none" stroke="#FFE0E0" stroke-width="5"/>
      
      <!-- Comida -->
      <circle cx="210" cy="230" r="40" fill="#4CD137"/>
      <circle cx="290" cy="210" r="32" fill="#FFA502"/>
      <circle cx="310" cy="280" r="36" fill="#E84118"/>
      <circle cx="230" cy="300" r="30" fill="#9C88FF"/>
      
      <!-- Tenedor -->
      <g transform="translate(80, 100) scale(0.6)">
        <rect x="40" y="0" width="14" height="160" rx="7" fill="#FF6B6B"/>
        <rect x="22" y="0" width="10" height="70" rx="5" fill="#FF6B6B"/>
        <rect x="48" y="0" width="10" height="70" rx="5" fill="#FF6B6B"/>
        <rect x="74" y="0" width="10" height="70" rx="5" fill="#FF6B6B"/>
      </g>
      
      <!-- Cuchillo -->
      <g transform="translate(340, 100) scale(0.6)">
        <rect x="20" y="0" width="14" height="160" rx="7" fill="#FF6B6B"/>
        <path d="M 34 0 Q 60 35 60 80 Q 60 115 34 125 L 34 0 Z" fill="#FF6B6B"/>
      </g>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .resize(512, 512)
    .png()
    .toFile(path.join(ASSETS_DIR, 'splash-icon.png'));
  
  console.log('✅ splash-icon.png created');
}

// Crear favicon
async function createFavicon() {
  const size = 64;
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#FF6B6B" rx="12"/>
      <circle cx="32" cy="32" r="20" fill="white"/>
      <circle cx="28" cy="28" r="5" fill="#4CD137"/>
      <circle cx="38" cy="26" r="4" fill="#FFA502"/>
      <circle cx="40" cy="36" r="4" fill="#E84118"/>
      <circle cx="30" cy="38" r="3" fill="#9C88FF"/>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .resize(64, 64)
    .png()
    .toFile(path.join(ASSETS_DIR, 'favicon.png'));
  
  console.log('✅ favicon.png created');
}

async function main() {
  // Asegurar que el directorio existe
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }
  
  await createIcon();
  await createAdaptiveIcon();
  await createSplashIcon();
  await createFavicon();
  
  console.log('\n🎉 All icons created successfully!');
}

main().catch(console.error);
