import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { openPanel, closePanel, onPanelClose, setPage } from './panel.js';

const R_MAX = 6;        // radius of the largest sphere, scene units
const GAP = 0.8;        // space between neighbouring spheres on a shelf
const PAD = 1.5;        // space at each end of a shelf
const PLANK = 0.5;      // shelf thickness
const ABOVE = 1.2;      // headroom above the tallest sphere on a shelf
const LABEL = 2.6;      // room under a plank for its label strip
const BAY_GAP = 4;      // space between bays
// Specimen tags: a card on a string, leaving each sphere's upper right and angled up to the right. Spheres on a
// shelf run largest to smallest, so a tag only ever passes over smaller neighbours.
const TAG_H = 2.2;                          // card height, scene units
const TAG_ANGLE = 45 * Math.PI / 180;       // card and string angle above horizontal
const STRING = 0.9;                         // string length from sphere to card
const MIN_DX = 1.2 * TAG_H / Math.sin(TAG_ANGLE);   // closest two spheres' centres may sit, so parallel tags clear each other
const TIE = 45 * Math.PI / 180;             // where the string leaves the sphere, measured from straight up
const TAG_PX = 64, TAG_FONT = 47, EYELET = 44, TAG_PAD = 18;   // card texture: height, font size, left/right padding (px)
const TAG_FONT_CSS = `600 ${TAG_FONT}px system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`;

const root = document.getElementById('viz');
const tip = document.getElementById('tip');
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const { meta, industries } = await (await fetch('data/industries.json')).json();
const fmt = (millions) => millions >= 1e6 ? `$${(millions / 1e6).toFixed(2)}tn` : `$${Math.round(millions / 1e3).toLocaleString()}bn`;

// Sphere area ∝ value added (spheres read as discs on screen), so radius ∝ sqrt(VA).
const vaMax = industries[0].value_added;
const nodes = industries.map((d) => ({ ...d, r: R_MAX * Math.sqrt(d.value_added / vaMax) }));

// Card sizes: measure each name once, then the card is as wide as its text (+ eyelet and padding).
const measure = document.createElement('canvas').getContext('2d');
measure.font = TAG_FONT_CSS;
nodes.forEach((n) => {
  n.tagPx = Math.ceil(EYELET + measure.measureText(n.short_name).width + TAG_PAD);
  n.tagW = TAG_H * n.tagPx / TAG_PX;
  const reach = STRING + n.tagW, cos = Math.cos(TAG_ANGLE), sin = Math.sin(TAG_ANGLE);
  n.tieX = n.r * Math.sin(TIE);                            // from the sphere's centre
  n.tieY = n.r * Math.cos(TIE);
  n.tagRight = n.tieX + reach * cos + TAG_H / 2 * sin;     // furthest right the tag reaches, from the centre
  n.tagTop = n.r + n.tieY + reach * sin + TAG_H / 2 * cos; // highest point of the tag, above the plank
});

// The bookcase: one shelf per kind of industry, spheres resting on it largest to smallest, left to right.
// Shelves run in reading order (largest sector first) across BAYS bays; a row is as tall as its tallest shelf.
const shelves = [...new Set(nodes.map((n) => n.sector))].map((sector) => {
  const members = nodes.filter((n) => n.sector === sector);   // already largest first
  let x = PAD;
  members.forEach((n, i) => {
    n.sx = i ? Math.max(x + GAP + n.r, members[i - 1].sx + MIN_DX) : x + n.r;
    x = n.sx + n.r;
  });
  // Room for the tags too: a shelf is as wide and as tall as its furthest-reaching tag.
  const width = Math.max(x, ...members.map((n) => n.sx + n.tagRight)) + PAD;
  const height = Math.max(2 * members[0].r, ...members.map((n) => n.tagTop)) + ABOVE + PLANK + LABEL;
  return { sector, name: members[0].sector_name, members, width, height, va: members.reduce((t, n) => t + n.value_added, 0) };
}).sort((a, b) => b.va - a.va);
// Lay the shelves out in `bays` bays (reading order); a row is as tall as its tallest shelf. Returns the size.
function arrange(bays) {
  const rows = [];
  shelves.forEach((s, i) => { (rows[Math.floor(i / bays)] ||= []).push(s); s.col = i % bays; });
  const colW = [...Array(bays)].map((_, c) => Math.max(...shelves.filter((s) => s.col === c).map((s) => s.width)));
  let top = 0;
  rows.forEach((row) => {
    const h = Math.max(...row.map((s) => s.height));
    row.forEach((s) => {
      s.x0 = colW.slice(0, s.col).reduce((t, w) => t + w + BAY_GAP, 0);
      s.w = colW[s.col];
      s.y = top - h + LABEL + PLANK;          // top surface of the plank
      s.members.forEach((n) => { n.x = s.x0 + n.sx; n.y = s.y + n.r; n.z = 0; });
    });
    top -= h;
  });
  return { W: colW.reduce((t, w) => t + w, 0) + BAY_GAP * (bays - 1), H: -top };
}
// How many bays suit a space of this aspect ratio: the one that lets the bookcase be drawn largest.
const sizes = [1, 2, 3, 4].map((b) => ({ b, ...arrange(b) }));
const bestBays = (aspect) => sizes.reduce((best, z) => (Math.min(aspect / z.W, 1 / z.H) > Math.min(aspect / best.W, 1 / best.H) ? z : best)).b;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
root.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xffffff, 0x444455, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(30, 60, 20);
scene.add(sun);

const geo = new THREE.SphereGeometry(1, 48, 32);
const meshes = nodes.map((n) => {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 }));
  m.scale.setScalar(n.r);
  m.position.set(n.x, n.y, n.z);
  m.userData = n;
  scene.add(m);
  return m;
});

// An emoji on each sphere (pipeline/emoji.csv), facing the camera and sized to the sphere.
const EMOJI_FONT = '100px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
function emojiTexture(e) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.font = EMOJI_FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(e, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const emojis = meshes.map((m) => {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(m.userData.emoji), depthTest: false, depthWrite: false }));
  sp.scale.setScalar(1.2 * m.userData.r);
  sp.renderOrder = 1;   // drawn over its own sphere
  scene.add(sp);
  return { m, sp };
});

// The tags themselves: a cream card with an eyelet and the short name, and a thin string back to the sphere.
function tagTexture(n) {
  const c = document.createElement('canvas');
  c.width = n.tagPx; c.height = TAG_PX;
  const g = c.getContext('2d');
  g.fillStyle = '#f3ecd9'; g.strokeStyle = '#8c7f66'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(2, 2, c.width - 4, c.height - 4, 8); g.fill(); g.stroke();
  g.beginPath(); g.arc(EYELET / 2, TAG_PX / 2, 7, 0, 2 * Math.PI); g.stroke();     // the eyelet the string goes through
  g.fillStyle = '#2b2620'; g.font = TAG_FONT_CSS; g.textBaseline = 'middle';
  g.fillText(n.short_name, EYELET, TAG_PX / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
const stringMat = new THREE.LineBasicMaterial({ color: 0x8c7f66 });
const tags = meshes.map((m) => {
  const n = m.userData;
  const card = new THREE.Mesh(new THREE.PlaneGeometry(n.tagW, TAG_H), new THREE.MeshBasicMaterial({ map: tagTexture(n), transparent: true }));
  card.rotation.z = TAG_ANGLE;
  card.userData = { owner: m };
  const string = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), stringMat);
  scene.add(card, string);
  return { m, n, card, string };
});
const dir = new THREE.Vector3(Math.cos(TAG_ANGLE), Math.sin(TAG_ANGLE), 0);
function placeTags() {
  tags.forEach(({ n, card, string }) => {
    const tie = new THREE.Vector3(n.x + n.tieX, n.y + n.tieY, 0.05);
    const end = tie.clone().addScaledVector(dir, STRING + 0.15);           // string runs into the eyelet
    string.geometry.setFromPoints([tie, end]);
    card.position.copy(tie).addScaledVector(dir, STRING + n.tagW / 2);
  });
}

const plankMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
shelves.forEach((s) => { s.plank = new THREE.Mesh(new THREE.BoxGeometry(1, PLANK, 4), plankMat); s.front = 2; scene.add(s.plank); });

// Put every sphere and plank where arrange(bays) says, then frame the bookcase in the space left of the panel.
let bays = 0, size = null;
function layout(b, aspect) {
  if (b !== bays) {
    bays = b; size = arrange(b);
    meshes.forEach((m) => m.position.set(m.userData.x, m.userData.y, m.userData.z));
    placeTags();
    emojis.forEach(({ m, sp }) => sp.position.copy(m.position));
    shelves.forEach((s) => { s.plank.scale.x = s.w; s.plank.position.set(s.x0 + s.w / 2, s.y - PLANK / 2, 0); });
  }
  const { W, H } = size;
  const d = 1.08 * Math.max(H / 2, W / 2 / aspect) / Math.tan(THREE.MathUtils.degToRad(20));
  camera.position.set(W / 2, H * 0.08, d);   // above the top shelf, so every plank is seen from above
  controls.target.set(W / 2, -H / 2, 0);
  controls.update();
}

// One label strip per shelf, under the front edge of its plank.
const labels = shelves.map((c) => {
  const el = document.createElement('div');
  el.className = 'hud sector-label';
  el.innerHTML = `${c.name} <span>${fmt(c.va)}</span>`;
  root.appendChild(el);
  return { c, el, at: new THREE.Vector3() };
});
// Declutter: shelves are placed largest first; a label that would overlap one already shown is hidden.
function placeLabels() {
  const w = root.clientWidth, h = root.clientHeight, shown = [];
  labels.forEach(({ c, el, at }) => {
    at.set(c.x0 + PAD * 0.5, c.y - PLANK, c.front).project(camera);
    el.style.left = `${(at.x + 1) / 2 * w}px`;
    el.style.top = `${(1 - at.y) / 2 * h}px`;
    const r = el.getBoundingClientRect();
    const clash = shown.some((o) => r.left < o.right + 4 && o.left < r.right + 4 && r.top < o.bottom && o.top < r.bottom);
    el.style.visibility = clash ? 'hidden' : 'visible';
    if (!clash) shown.push(r);
  });
}

function applyTheme() {
  scene.background = new THREE.Color(css('--bg'));
  meshes.forEach((m) => m.material.color.set(m === hovered || m === selected ? css('--sphere-hot') : css('--sphere')));
  plankMat.color.set(css('--shelf'));
}
let hovered = null, selected = null;
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

const ray = new THREE.Raycaster();
const pickable = [...meshes, ...tags.map((t) => t.card)];
const ptr = new THREE.Vector2();
renderer.domElement.addEventListener('pointermove', (e) => {
  const b = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const first = ray.intersectObjects(pickable)[0]?.object ?? null;
  const hit = first?.userData.owner ?? first;   // a tag stands for its sphere
  if (hit !== hovered) { hovered = hit; applyTheme(); }
  if (hit) {
    const n = hit.userData;
    tip.innerHTML = `<b>${n.name}</b><span>${n.sector_name}<br>${fmt(n.value_added)} value added, ${meta.year} · ${(100 * n.value_added / meta.total_value_added).toFixed(1)}% of the total</span>`;
    tip.style.left = `${e.clientX}px`;
    tip.style.top = `${e.clientY}px`;
    tip.hidden = false;
  } else tip.hidden = true;
});

// Click (not drag) a sphere to open its readout; click empty space or press Esc to close.
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
  if (hovered) select(hovered); else closePanel();
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });
onPanelClose(() => { selected = null; applyTheme(); resize(); });

function select(mesh) {
  selected = mesh;
  applyTheme();
  openPanel(mesh.userData, meta);
}

// Fit the bookcase to the space left of the panel: re-shelve into the best number of bays, then frame it.
function resize() {
  const w = root.clientWidth, h = root.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  const panel = document.getElementById('panel');
  const pw = panel.hidden || w < 800 ? 0 : panel.offsetWidth;
  if (pw) camera.setViewOffset(w, h, pw / 2, 0, w, h); else camera.clearViewOffset();
  // The visible width is the full canvas, but the bookcase has to fit in the part left of the panel.
  const avail = (w - pw) / h;
  layout(bestBays(avail), avail);
  document.querySelector('.foot').style.right = `${pw + 16}px`;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
// The panel's width follows its content, so refit the view whenever it changes (page switches included).
new ResizeObserver(() => resize()).observe(document.getElementById('panel'));
resize();
applyTheme();
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); placeLabels(); });

window.__viz = { nodes, shelves, meta, setPage,
  // share of each emoji's texture that is drawn and coloured: a missing glyph renders blank or as a grey box
  emojiInk: () => emojis.map(({ m, sp }) => { const c = sp.material.map.image, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let ink = 0, colour = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { ink++; if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 40) colour++; }
    return { code: m.userData.code, emoji: m.userData.emoji, ink: ink / (c.width * c.height), colour: ink ? colour / ink : 0 }; }),
  tagPx: () => tags.map(({ card }) => { const a = card.localToWorld(new THREE.Vector3(0, -TAG_H / 2, 0)).project(camera), b = card.localToWorld(new THREE.Vector3(0, TAG_H / 2, 0)).project(camera);
    return Math.hypot((a.x - b.x) * root.clientWidth / 2, (a.y - b.y) * root.clientHeight / 2); }),
  tags: () => tags.map(({ n }) => ({ code: n.code, x: n.x, y: n.y, r: n.r, tieX: n.tieX, tieY: n.tieY, w: n.tagW, sx: n.sx, sector: n.sector })), TAG: { H: TAG_H, ANGLE: TAG_ANGLE, STRING },
  screenOf: (code) => { const v = meshes.find((m) => m.userData.code === code).position.clone().project(camera);
    return [(v.x + 1) / 2 * root.clientWidth, (1 - v.y) / 2 * root.clientHeight]; }, select: (code) => select(meshes.find((m) => m.userData.code === code)) };
