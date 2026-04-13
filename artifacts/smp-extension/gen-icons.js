/**
 * Gerador de ícones PNG para a extensão SignalMaster Pro.
 * Usa apenas Node.js built-in (zlib, fs, Buffer) — sem dependências externas.
 * Execute: node gen-icons.js
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// Cria um PNG sólido com bordas arredondadas (simuladas por pixel art)
function createPNG(size) {
  const r = 0, g = 255, b = 136; // #00ff88 (verde SMP)
  const bg_r = 7, bg_g = 7, bg_b = 13; // #07070d (fundo escuro)

  // Cada pixel: filtro (1 byte) + RGB por linha
  const rowBytes = size * 3;
  const rawData  = Buffer.alloc(size * (rowBytes + 1), 0);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 0.5;
  const innerR = size / 2 - size * 0.15;

  for (let y = 0; y < size; y++) {
    rawData[y * (rowBytes + 1)] = 0; // filter type none

    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const d  = Math.sqrt(dx * dx + dy * dy);

      const offset = y * (rowBytes + 1) + 1 + x * 3;

      if (d <= outerR) {
        // Dentro do círculo
        // Desenha um "S" simplificado ou relâmpago ⚡ no centro
        const lx = (x / size - 0.5) * 2; // -1 to 1
        const ly = (y / size - 0.5) * 2;

        // Relâmpago simples: linha diagonal + zig
        const isLightning = drawLightning(x, y, size);

        if (isLightning) {
          rawData[offset]   = 255;
          rawData[offset+1] = 255;
          rawData[offset+2] = 255;
        } else {
          // Gradiente escuro no círculo
          const factor = 1 - (d / outerR) * 0.3;
          rawData[offset]   = Math.round(bg_r * factor + r * 0.15);
          rawData[offset+1] = Math.round(bg_g * factor + g * 0.15);
          rawData[offset+2] = Math.round(bg_b * factor + b * 0.15);
        }
      } else {
        // Fora do círculo — transparente (usa bg)
        rawData[offset]   = bg_r;
        rawData[offset+1] = bg_g;
        rawData[offset+2] = bg_b;
      }
    }
  }

  // Borda verde suave
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const d  = Math.sqrt(dx * dx + dy * dy);
      const offset = y * (rowBytes + 1) + 1 + x * 3;

      if (d > outerR - 2 && d <= outerR) {
        rawData[offset]   = r;
        rawData[offset+1] = g;
        rawData[offset+2] = b;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });

  return buildPNG(size, compressed);
}

function drawLightning(x, y, size) {
  const s = size;
  const cx = s * 0.5;
  const cy = s * 0.5;
  const thick = Math.max(1, s / 16);

  // Relâmpago ⚡: dois segmentos
  // Segmento superior: de (cx+s*0.15, cy-s*0.3) até (cx-s*0.05, cy)
  // Segmento inferior: de (cx-s*0.05, cy) até (cx-s*0.15, cy+s*0.3)

  const segments = [
    { x1: cx + s*0.12, y1: cy - s*0.32, x2: cx - s*0.04, y2: cy + s*0.02 },
    { x1: cx - s*0.04, y1: cy + s*0.02, x2: cx - s*0.14, y2: cy + s*0.32 },
  ];

  for (const seg of segments) {
    const { x1, y1, x2, y2 } = seg;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    const nx = -dy / len; // normal
    const ny =  dx / len;

    // Distância do ponto à linha
    const t  = ((x - x1) * dx + (y - y1) * dy) / (len * len);
    if (t < 0 || t > 1) continue;
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    const dist = Math.sqrt((x - px)**2 + (y - py)**2);
    if (dist <= thick) return true;
  }
  return false;
}

function buildPNG(size, idat) {
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB  = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.concat([typeB, data]);
    const crc    = crc32(crcBuf);
    const crcOut = Buffer.alloc(4);
    crcOut.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, typeB, data, crcOut]);
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = chunk('IHDR', ihdrData);
  const idat_ch = chunk('IDAT', idat);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat_ch, iend]);
}

// CRC32 table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Gera ícones
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

for (const size of [16, 48, 128]) {
  const png = createPNG(size);
  const out = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(out, png);
  console.log(`✓ icons/icon${size}.png (${png.length} bytes)`);
}

console.log('Ícones gerados com sucesso!');
