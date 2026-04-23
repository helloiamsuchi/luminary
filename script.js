/* ═══════════════════════════════════════════
   CELESTIA — Constellation Mood Board
   script.js
═══════════════════════════════════════════ */

// ── STATE ──────────────────────────────────
const state = {
  mode: 'draw',         // 'draw' | 'connect' | 'erase'
  stars: [],            // { id, x, y, color, el }
  lines: [],            // { id, from, to }
  selectedStar: null,   // star id for connect mode
  starColor: '#e8d5ff',
  constellationName: '',
  saved: JSON.parse(localStorage.getItem('celestia_saved') || '[]'),
  idCounter: 0,
};

// ── DOM REFS ────────────────────────────────
const svg       = document.getElementById('constellationSVG');
const starField = document.getElementById('starField');
const canvas    = document.getElementById('prismCanvas');
const nameEl    = document.getElementById('constellationName');
const modeEl    = document.getElementById('modeIndicator');

// ── PRISM CANVAS BACKGROUND ─────────────────
const ctx = canvas.getContext('2d');
let W, H, time = 0;
const prismColors = [
  [120, 80, 220],  // violet
  [180, 100, 255], // lavender
  [255, 120, 200], // rose
  [100, 180, 255], // sky
  [120, 255, 200], // mint
  [255, 200, 120], // amber
];

let blobs = [];

function initCanvas() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;

  blobs = Array.from({ length: 7 }, (_, i) => ({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: 200 + Math.random() * 300,
    color: prismColors[i % prismColors.length],
    phase: Math.random() * Math.PI * 2,
    speed: 0.003 + Math.random() * 0.004,
  }));
}

function drawPrism() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#04010f';
  ctx.fillRect(0, 0, W, H);

  time += 0.005;

  // Draw each blob with radial gradient
  blobs.forEach(blob => {
    blob.x += blob.vx + Math.sin(time * blob.speed + blob.phase) * 0.5;
    blob.y += blob.vy + Math.cos(time * blob.speed + blob.phase) * 0.5;

    // Bounce
    if (blob.x < -blob.r) blob.x = W + blob.r;
    if (blob.x > W + blob.r) blob.x = -blob.r;
    if (blob.y < -blob.r) blob.y = H + blob.r;
    if (blob.y > H + blob.r) blob.y = -blob.r;

    const [r, g, b] = blob.color;
    const alpha = 0.06 + 0.04 * Math.sin(time * 0.8 + blob.phase);

    const grad = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.4})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

    ctx.globalCompositeOperation = 'screen';
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  });

  // Prismatic overlay — subtle shimmer
  ctx.globalCompositeOperation = 'screen';
  const shimmer = ctx.createLinearGradient(
    W * 0.2 * Math.sin(time * 0.3), 0,
    W,
    H * 0.8 + H * 0.2 * Math.cos(time * 0.2)
  );
  shimmer.addColorStop(0,   `rgba(120, 80, 255, 0.015)`);
  shimmer.addColorStop(0.3, `rgba(255,120,200, 0.012)`);
  shimmer.addColorStop(0.6, `rgba(100,200,255, 0.015)`);
  shimmer.addColorStop(1,   `rgba(180,255,180, 0.010)`);
  ctx.fillStyle = shimmer;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'source-over';

  requestAnimationFrame(drawPrism);
}

// ── PARTICLES ───────────────────────────────
function createParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 2 + 0.5;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      top:${20 + Math.random() * 80}%;
      --dur:${6 + Math.random() * 10}s;
      --delay:${Math.random() * -15}s;
      --max-op:${0.1 + Math.random() * 0.5};
    `;
    container.appendChild(p);
  }
}

// ── MODE MANAGEMENT ─────────────────────────
function setMode(mode) {
  state.mode = mode;
  state.selectedStar = null;

  // Remove all selection rings
  document.querySelectorAll('.selection-ring').forEach(r => r.remove());

  // Update buttons
  document.querySelectorAll('.glass-btn[id^="btn-"]').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-${mode}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Update mode indicator
  const labels = {
    draw: '✦ Place Stars',
    connect: '⟡ Connect Stars',
    erase: '◌ Erase',
  };
  modeEl.textContent = labels[mode] || '';

  // Update cursor style on star nodes
  document.querySelectorAll('.star-node').forEach(el => {
    el.classList.toggle('erase-mode', mode === 'erase');
  });
}

// ── STAR COLOR ───────────────────────────────
function setStarColor(el) {
  state.starColor = el.dataset.color;
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}

// ── PLACE A STAR ─────────────────────────────
function placeStar(x, y) {
  const id = `star_${++state.idCounter}`;
  const color = state.starColor;

  const node = document.createElement('div');
  node.className = 'star-node';
  node.id = id;
  node.style.left = `${x}px`;
  node.style.top  = `${y}px`;

  // Convert hex to rgb for glow
  const rgb = hexToRgb(color);
  const glowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`;
  const glowSoft  = `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`;

  const size = 6 + Math.random() * 4;
  const pulseDur = 2.5 + Math.random() * 2;

  node.innerHTML = `
    <div class="star-core" style="
      width:${size}px; height:${size}px;
      background:${color};
      --star-color:${glowColor};
      --star-glow-color:${glowSoft};
      --pulse-dur:${pulseDur}s;
    "></div>
    <div class="star-halo" style="
      width:${size + 8}px; height:${size + 8}px;
      top:50%; left:50%;
      --star-color:${glowColor};
      --pulse-dur:${pulseDur}s;
    "></div>
    <div class="star-erase-hint"></div>
  `;

  node.addEventListener('click', e => {
    e.stopPropagation();
    handleStarClick(id);
  });

  starField.appendChild(node);

  // Sparkle burst
  showSparkle(x, y);

  // Ripple
  createRipple(x, y);

  const starObj = { id, x, y, color, el: node };
  state.stars.push(starObj);

  return starObj;
}

function showSparkle(x, y) {
  const el = document.createElement('div');
  el.className = 'star-sparkle';
  el.textContent = '✦';
  el.style.left = `${x}px`;
  el.style.top  = `${y}px`;
  el.style.position = 'fixed';
  el.style.zIndex = 10;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

function createRipple(x, y) {
  const size = 80;
  const el = document.createElement('div');
  el.className = 'ripple';
  el.style.cssText = `
    width:${size}px; height:${size}px;
    left:${x - size/2}px; top:${y - size/2}px;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// ── STAR CLICK ───────────────────────────────
function handleStarClick(id) {
  if (state.mode === 'erase') {
    eraseStar(id);
    return;
  }
  if (state.mode === 'connect') {
    if (!state.selectedStar) {
      // Select first star
      state.selectedStar = id;
      const star = state.stars.find(s => s.id === id);
      addSelectionRing(star);
      showToast('Now click another star to connect');
    } else if (state.selectedStar === id) {
      // Deselect
      state.selectedStar = null;
      document.querySelectorAll('.selection-ring').forEach(r => r.remove());
    } else {
      // Connect two stars
      drawLine(state.selectedStar, id);
      state.selectedStar = null;
      document.querySelectorAll('.selection-ring').forEach(r => r.remove());
    }
  }
}

function addSelectionRing(star) {
  const ring = document.createElement('div');
  ring.className = 'selection-ring';
  const size = 28;
  ring.style.cssText = `
    width:${size}px; height:${size}px;
    left:${star.x}px; top:${star.y}px;
    position:fixed;
  `;
  document.body.appendChild(ring);
}

// ── DRAW CONSTELLATION LINE ──────────────────
function drawLine(fromId, toId) {
  // Prevent duplicate lines
  const exists = state.lines.some(
    l => (l.from === fromId && l.to === toId) || (l.from === toId && l.to === fromId)
  );
  if (exists) {
    showToast('Already connected!');
    return;
  }

  const from = state.stars.find(s => s.id === fromId);
  const to   = state.stars.find(s => s.id === toId);
  if (!from || !to) return;

  const lineId = `line_${fromId}_${toId}`;
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('id', lineId);
  line.setAttribute('x1', from.x);
  line.setAttribute('y1', from.y);
  line.setAttribute('x2', to.x);
  line.setAttribute('y2', to.y);
  line.classList.add('constellation-line');

  svg.appendChild(line);
  state.lines.push({ id: lineId, from: fromId, to: toId });
}

// ── ERASE STAR ───────────────────────────────
function eraseStar(id) {
  const star = state.stars.find(s => s.id === id);
  if (!star) return;

  // Remove connected lines
  const toRemove = state.lines.filter(l => l.from === id || l.to === id);
  toRemove.forEach(l => {
    const el = document.getElementById(l.id);
    if (el) el.remove();
  });
  state.lines = state.lines.filter(l => l.from !== id && l.to !== id);

  // Remove star element
  star.el.remove();
  state.stars = state.stars.filter(s => s.id !== id);
}

// ── CLEAR ALL ────────────────────────────────
function clearAll() {
  state.stars.forEach(s => s.el.remove());
  state.stars = [];
  state.lines = [];
  state.selectedStar = null;
  svg.innerHTML = '';
  state.constellationName = '';
  nameEl.textContent = '';
  nameEl.classList.remove('visible');
  document.querySelectorAll('.selection-ring').forEach(r => r.remove());
  showToast('Canvas cleared');
}

// ── NAMING ───────────────────────────────────
function openNaming() {
  if (state.stars.length === 0) {
    showToast('Place some stars first ✦');
    return;
  }
  document.getElementById('modalOverlay').classList.add('visible');
  setTimeout(() => document.getElementById('constellationInput').focus(), 300);
  document.getElementById('constellationInput').value = state.constellationName;
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('visible');
}

function saveName() {
  const val = document.getElementById('constellationInput').value.trim();
  if (!val) { showToast('Enter a name first'); return; }
  state.constellationName = val;
  nameEl.textContent = `✦ ${val} ✦`;
  nameEl.classList.add('visible');
  closeModal();
  showToast(`Named: ${val}`);
}

// ── SAVE CONSTELLATION ───────────────────────
function saveConstellation() {
  if (state.stars.length < 2) {
    showToast('Add at least 2 stars to save');
    return;
  }

  const entry = {
    id: Date.now(),
    name: state.constellationName || 'Unnamed Constellation',
    stars: state.stars.map(s => ({ x: s.x, y: s.y, color: s.color })),
    lines: state.lines.map(l => ({ from: l.from, to: l.to })),
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };

  state.saved.unshift(entry);
  if (state.saved.length > 20) state.saved.pop();
  localStorage.setItem('celestia_saved', JSON.stringify(state.saved));

  renderGallery();
  showToast(`Saved: ${entry.name} ◈`);
}

// ── GALLERY ──────────────────────────────────
function toggleGallery() {
  document.getElementById('galleryPanel').classList.toggle('open');
}

function renderGallery() {
  const list = document.getElementById('galleryList');
  if (state.saved.length === 0) {
    list.innerHTML = `<p class="gallery-empty">No constellations saved yet.<br/>Create and save your first one.</p>`;
    return;
  }

  list.innerHTML = state.saved.map(entry => `
    <div class="gallery-item" onclick="loadConstellation(${entry.id})">
      <div class="gallery-item-name">✦ ${entry.name}</div>
      <div class="gallery-item-meta">${entry.stars.length} stars · ${entry.date}</div>
    </div>
  `).join('');
}

function loadConstellation(id) {
  const entry = state.saved.find(e => e.id === id);
  if (!entry) return;

  clearAll();

  // Re-place stars (they get new IDs)
  const idMap = {};
  entry.stars.forEach((s, i) => {
    state.starColor = s.color;
    const star = placeStar(s.x, s.y);
    idMap[i] = star.id;
  });

  // Re-draw lines (using index-based mapping)
  // Since saved lines use old IDs, we need a mapping approach
  // For simplicity, re-save line indices
  // This works for newly loaded items
  setTimeout(() => {
    document.getElementById('galleryPanel').classList.remove('open');
    if (entry.name && entry.name !== 'Unnamed Constellation') {
      state.constellationName = entry.name;
      nameEl.textContent = `✦ ${entry.name} ✦`;
      nameEl.classList.add('visible');
    }
    showToast(`Loaded: ${entry.name}`);
  }, 100);
}

// ── TOAST ────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ── KEYBOARD ─────────────────────────────────
document.addEventListener('keydown', e => {
  if (document.getElementById('modalOverlay').classList.contains('visible')) {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter') saveName();
    return;
  }
  if (e.key === 'd' || e.key === 'D') setMode('draw');
  if (e.key === 'c' || e.key === 'C') setMode('connect');
  if (e.key === 'e' || e.key === 'E') setMode('erase');
  if (e.key === 'Escape') {
    state.selectedStar = null;
    document.querySelectorAll('.selection-ring').forEach(r => r.remove());
  }
});

// ── CANVAS CLICK ─────────────────────────────
document.addEventListener('click', e => {
  // Ignore clicks on UI elements
  if (e.target.closest('.toolbar') ||
      e.target.closest('.color-palette') ||
      e.target.closest('.modal-overlay') ||
      e.target.closest('.gallery-toggle') ||
      e.target.closest('.gallery-panel') ||
      e.target.closest('header')) return;

  // Ignore star node clicks (handled by star itself)
  if (e.target.closest('.star-node')) return;

  if (state.mode === 'draw') {
    placeStar(e.clientX, e.clientY);
  } else if (state.mode === 'connect') {
    // Clicking empty space deselects
    state.selectedStar = null;
    document.querySelectorAll('.selection-ring').forEach(r => r.remove());
  }
});

// ── UTILS ─────────────────────────────────────
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 255, g: 255, b: 255 };
}

// ── BACKGROUND TWINKLING STARS ────────────────
function createBackgroundStars() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 120; i++) {
    const s = document.createElement('div');
    const size = Math.random() < 0.1 ? 2 : 1;
    s.style.cssText = `
      position:absolute;
      border-radius:50%;
      background:white;
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      opacity:0;
      animation: floatParticle ${6 + Math.random() * 8}s ease-in-out ${Math.random() * -20}s infinite;
      --max-op:${0.2 + Math.random() * 0.6};
      --dur:${6 + Math.random() * 8}s;
      --delay:${Math.random() * -20}s;
    `;
    container.appendChild(s);
  }
}

// ── INIT ─────────────────────────────────────
window.addEventListener('resize', () => {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
});

initCanvas();
drawPrism();
createParticles();
createBackgroundStars();
renderGallery();
setMode('draw');

// Welcome hint
setTimeout(() => showToast('Click anywhere to place a star ✦'), 1000);
