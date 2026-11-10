import * as THREE from 'three';
import TWEEN from './vendor/tween.esm.js';
import { CSS3DRenderer, CSS3DObject } from './vendor/CSS3DRenderer.js';
import { TrackballControls } from './vendor/TrackballControls.js';
import { CONFIG } from './config.js';

const $ = (id) => document.getElementById(id);
const isPlaceholder = (v) => !v || /^YOUR_/.test(v);
const configured = !isPlaceholder(CONFIG.GOOGLE_CLIENT_ID) && !isPlaceholder(CONFIG.SHEET_ID);


function parseMoney(v) {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}


function rowsToPeople(rows) {
  const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, '');
  const header = rows[0].map(norm);
  const col = (name) => header.indexOf(name);
  const idx = {
    name: col('name'), photo: col('photo'), age: col('age'),
    country: col('country'), interest: col('interest'), worth: col('networth'),
  };
  for (const [k, v] of Object.entries(idx)) {
    if (v < 0) throw new Error(`Column "${k}" not found in the sheet header.`);
  }
  return rows.slice(1)
    .filter((r) => r && String(r[idx.name] ?? '').trim() !== '')
    .map((r) => ({
      name: String(r[idx.name]).replace(/[ �]/g, ' ').trim(),
      photo: String(r[idx.photo] ?? '').trim(),
      age: r[idx.age] ?? '',
      country: String(r[idx.country] ?? '').trim(),
      interest: String(r[idx.interest] ?? '').trim(),
      worth: parseMoney(r[idx.worth]),
    }));
}

async function fetchSheet(accessToken) {
  const range = encodeURIComponent(CONFIG.SHEET_RANGE);
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${range}` +
            `?valueRenderOption=UNFORMATTED_VALUE`;
  const headers = {};
  if (CONFIG.AUTH_MODE === 'apikey') url += `&key=${encodeURIComponent(CONFIG.API_KEY)}`;
  else headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).error.message; } catch { /* ignore */ }
    if (res.status === 403 || res.status === 404) {
      msg += ' — make sure this Google account has access to the sheet.';
    }
    throw new Error(`Google Sheets error ${res.status}: ${msg}`);
  }
  const json = await res.json();
  return rowsToPeople(json.values || []);
}


function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

async function loadLocalCsv() {
  const res = await fetch('data.csv');
  if (!res.ok) throw new Error('Local data.csv not found.');
  return rowsToPeople(parseCsv(await res.text()));
}


const SCOPES = ['openid', 'email', 'profile'];
if (CONFIG.AUTH_MODE !== 'apikey') SCOPES.push('https://www.googleapis.com/auth/spreadsheets.readonly');

let tokenClient = null;

function whenGisReady() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    (function poll() {
      if (window.google?.accounts?.oauth2) return resolve();
      if (Date.now() - started > 10000) return reject(new Error('Could not load Google Sign-In script.'));
      setTimeout(poll, 100);
    })();
  });
}

async function signIn() {
  $('login-error').textContent = '';
  try {
    await whenGisReady();
    if (!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        scope: SCOPES.join(' '),
        callback: onToken,
        error_callback: (e) => showLoginError(e.message || e.type || 'Sign-in was cancelled.'),
      });
    }
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  } catch (e) { showLoginError(e.message); }
}

async function onToken(resp) {
  if (resp.error) return showLoginError(resp.error_description || resp.error);
  try {
    $('login').hidden = true;
    $('loading').hidden = false;
    const profile = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${resp.access_token}` },
    })).json();
    const people = await fetchSheet(resp.access_token);
    startApp(people, profile, resp.access_token);
  } catch (e) {
    $('loading').hidden = true;
    $('login').hidden = false;
    showLoginError(e.message);
  }
}

function showLoginError(msg) { $('login-error').textContent = msg; }

function signOut(token) {
  if (token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {});
  location.reload();
}


let camera, scene, renderer, controls;
const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };
let started = false;

function tierOf(worth) {
  if (worth < 100000) return 'red';
  if (worth > 200000) return 'green';
  return 'orange';
}

const money = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function makeTile(p) {
  const tile = el('div', `tile tier-${tierOf(p.worth)}`);
  tile.title = `${p.name}\n${p.country} · Age ${p.age} · ${p.interest}\nNet Worth: ${money(p.worth)}`;
  tile.append(el('div', 'country', p.country), el('div', 'age', p.age));

  const img = el('img', 'photo');
  img.alt = p.name;
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  img.src = p.photo;
  img.onerror = () => {
    const initials = p.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    img.replaceWith(el('div', 'photo-fallback', initials));
  };
  tile.append(img, el('div', 'name', p.name), el('div', 'interest', p.interest));
  return tile;
}

function buildLayouts(n) {
  const T_COLS = 20, T_DX = 140, T_DY = 180;
  const T_ROWS = Math.ceil(n / T_COLS);
  for (let i = 0; i < n; i++) {
    const o = new THREE.Object3D();
    o.position.set(
      (i % T_COLS - (T_COLS - 1) / 2) * T_DX,
      -(Math.floor(i / T_COLS) - (T_ROWS - 1) / 2) * T_DY,
      0,
    );
    targets.table.push(o);
  }


  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const phi = Math.acos(-1 + (2 * i) / n);
    const theta = Math.sqrt(n * Math.PI) * phi;
    const o = new THREE.Object3D();
    o.position.setFromSphericalCoords(850, phi, theta);
    v.copy(o.position).multiplyScalar(2);
    o.lookAt(v);
    targets.sphere.push(o);
  }

  const H_R = 950, H_STEP_ANGLE = 0.3, H_STEP_Y = 16;
  const perStrand = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    const strand = i % 2;
    const k = Math.floor(i / 2);
    const theta = k * H_STEP_ANGLE + strand * Math.PI;
    const y = -(k * H_STEP_Y) + (perStrand * H_STEP_Y) / 2;
    const o = new THREE.Object3D();
    o.position.setFromCylindricalCoords(H_R, theta, y);
    v.set(o.position.x * 2, o.position.y, o.position.z * 2);
    o.lookAt(v);
    targets.helix.push(o);
  }

  const G_X = 10, G_Y = 4, G_Z = 5, SX = 200, SY = 240, SZ = 500;
  for (let i = 0; i < n; i++) {
    const gx = i % G_X;
    const gy = Math.floor(i / G_X) % G_Y;
    const gz = Math.floor(i / (G_X * G_Y)) % G_Z;
    const o = new THREE.Object3D();
    o.position.set(
      (gx - (G_X - 1) / 2) * SX,
      -(gy - (G_Y - 1) / 2) * SY,
      (gz - (G_Z - 1) / 2) * SZ * -1,
    );
    targets.grid.push(o);
  }
}


const CAMERA_POS = { table: [0, 0, 3200], sphere: [0, 0, 3200], helix: [0, 0, 3600], grid: [1500, 700, 3000] };

function transform(list, duration = 1600, view = 'table') {
  TWEEN.removeAll();
  camera.up.set(0, 1, 0);
  const [cx, cy, cz] = CAMERA_POS[view];
  new TWEEN.Tween(camera.position).to({ x: cx, y: cy, z: cz }, duration)
    .easing(TWEEN.Easing.Exponential.InOut).start();
  for (let i = 0; i < objects.length; i++) {
    const object = objects[i];
    const target = list[i];
    new TWEEN.Tween(object.position)
      .to({ x: target.position.x, y: target.position.y, z: target.position.z },
          Math.random() * duration + duration)
      .easing(TWEEN.Easing.Exponential.InOut).start();
    new TWEEN.Tween(object.rotation)
      .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z },
          Math.random() * duration + duration)
      .easing(TWEEN.Easing.Exponential.InOut).start();
  }
  new TWEEN.Tween({}).to({}, duration * 2).onUpdate(render).start();
}

function setActive(name) {
  for (const b of document.querySelectorAll('#menu button')) b.classList.toggle('active', b.id === name);
}

function render() { renderer.render(scene, camera); }

function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();
  controls.update();
}

function startApp(people, profile, token) {
  if (started) return;
  started = true;

  $('loading').hidden = true;
  $('login').hidden = true;
  if (profile) {
    $('user-name').textContent = profile.name || profile.email || '';
    if (profile.picture) $('user-avatar').src = profile.picture; else $('user-avatar').hidden = true;
    $('user').hidden = false;
    $('btn-signout').onclick = () => signOut(token);
  }
  $('menu').hidden = false;
  $('legend').hidden = false;

  camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 1, 10000);
  camera.position.z = 3200;
  scene = new THREE.Scene();

  for (const p of people) {
    const obj = new CSS3DObject(makeTile(p));
    obj.position.set(Math.random() * 4000 - 2000, Math.random() * 4000 - 2000, Math.random() * 4000 - 2000);
    scene.add(obj);
    objects.push(obj);
  }
  buildLayouts(people.length);

  renderer = new CSS3DRenderer();
  renderer.setSize(innerWidth, innerHeight);
  $('container').appendChild(renderer.domElement);

  controls = new TrackballControls(camera, renderer.domElement);
  controls.minDistance = 500;
  controls.maxDistance = 7000;
  controls.addEventListener('change', render);

  for (const name of ['table', 'sphere', 'helix', 'grid']) {
    $(name).addEventListener('click', () => { setActive(name); transform(targets[name], 1600, name); });
  }
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    render();
  });

  setActive('table');
  transform(targets.table, 1500);
  animate();
  window.__tiles = { count: people.length };  
}


$('btn-google').addEventListener('click', () => {
  if (!configured) {
    showLoginError('Google Client ID / Sheet ID not set yet. Edit config.js (see README.md).');
    return;
  }
  signIn();
});

if (!configured && CONFIG.ALLOW_LOCAL_DEMO) {
  $('btn-demo').hidden = false;
  $('btn-demo').addEventListener('click', async () => {
    try {
      $('login').hidden = true;
      $('loading').hidden = false;
      const people = await loadLocalCsv();
      $('banner').textContent = 'Preview mode: local sample data (Google not configured)';
      $('banner').hidden = false;
      startApp(people, null, null);
    } catch (e) {
      $('loading').hidden = true; $('login').hidden = false; showLoginError(e.message);
    }
  });
}

// test hook: ?demo=1 skips the login screen when Google isn't configured
if (!configured && CONFIG.ALLOW_LOCAL_DEMO && new URLSearchParams(location.search).has('demo')) {
  $('btn-demo').click();
}
