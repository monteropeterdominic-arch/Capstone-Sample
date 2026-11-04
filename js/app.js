/* Jackfruit Tree Health Map – pixel style, 3D terrain (Mapbox GL JS or MapLibre) */
(() => {
  'use strict';
  const MB = window.USE_MAPBOX;
  const gl = MB ? window.mapboxgl : window.maplibregl;
  if (MB) gl.accessToken = window.MAPBOX_TOKEN;
  const R = window.MODEL_RESULTS;
  const HOME = { center: [124.86, 7.15], zoom: 9.0, pitch: 58, bearing: -15 };
  const state = { model: 'model1', year: 'all', spin: false, is3d: true, farms: null };

  // ---------- pixel art ----------
  const PAL = {
    G: '#3fae3f', g: '#2c8a2f', L: '#69d24f', J: '#b8d84a', Y: '#d8c93a', y: '#b3a52c', O: '#e0892b', o: '#a85a1c',
    B: '#7a4a1e', T: '#8a5a2b', t: '#6b421d', d: '#5a3d1e', s: '#4caf50'
  };
  const TREES = {
    healthy: [
      '....LLLL....', '..LLGGGGLL..', '.LGGGGGGGGL.', 'LGGJGGGGGgGL', 'LGGGGGgGJGGL', 'GGgGJGGGGGGG',
      '.GGGGGGJGGg.', '..gGGGGGGg..', '....gTTg....', '.....TT.....', '.....Tt.....', '.....Tt.....', '....TTTT....', '..ssssssss..'],
    little: [
      '....LYLL....', '..LLGGYGLL..', '.LGYGGGGGGL.', 'LGGJGGYGGgGL', 'LGGGGGgGJGYL', 'GYgGJGGGYGGG',
      '.GGGGYGJGGg.', '..gGGGGGYg..', '....gTTg....', '.....TT.....', '.....Tt.....', '.....Tt.....', '....TTTT....', '..ssssssss..'],
    sick: [
      '....O..Y....', '..YO.OOY.O..', '.OOYO..OOYO.', 'O.OOyO.OO.yO', '.OyO..OyO.O.', 'Oo.O.OO..OyO',
      '..O.yO.O.O..', '...o.OO.o...', '....oTTo....', '.....TT.....', '.....Tt.....', '.....Tt.....', '....TTTT....', '..dddddddd..'],
    vsick: [
      '..T......T..', '...T..T.T...', '.T..T.T..T..', '..T.TTTT.T..', '...TT..TT...', '.B..TTTT..B.',
      '.....TT.....', '..B..TT.....', '.....TT..B..', '.....TT.....', '.....Tt.....', '.....Tt.....', '....TTTT....', '..dddddddd..']
  };
  const HEART = ['.XX.XX.', 'XRRXRRX', 'XRWRRRX', 'XRRRRRX', '.XRRRX.', '..XRX..', '...X...'];

  function drawPixels(rows, colorOf, scale, outline = '#101418') {
    const h = rows.length, w = rows[0].length, c = document.createElement('canvas');
    c.width = (w + 2) * scale; c.height = (h + 2) * scale;
    const x = c.getContext('2d');
    const filled = (i, j) => rows[j] && rows[j][i] && rows[j][i] !== '.';
    if (outline) {
      x.fillStyle = outline;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (filled(i, j))
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!filled(i + a, j + b)) x.fillRect((i + 1 + a) * scale, (j + 1 + b) * scale, scale, scale);
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = rows[j][i]; if (ch === '.') continue;
      x.fillStyle = colorOf(ch, i); x.fillRect((i + 1) * scale, (j + 1) * scale, scale, scale);
    }
    return c;
  }
  const treeCanvas = k => drawPixels(TREES[k], ch => PAL[ch] || '#000', 4);
  const treeURL = {}; Object.keys(TREES).forEach(k => treeURL[k] = treeCanvas(k).toDataURL());
  function heart(fill) { // 1 full, 0.5 half, 0 empty
    return drawPixels(HEART, (ch, i) => ch === 'X' ? '#101418' : ch === 'W' ? (fill > 0 ? '#ffd0d0' : '#8a8a96')
      : (fill >= 1 || (fill > 0 && i <= 3)) ? '#e83a3a' : '#4a4a58', 3, null);
  }
  function heartsHTML(value, max) {
    const wrap = document.createElement('div');
    for (let k = 0; k < max; k++) wrap.appendChild(heart(Math.max(0, Math.min(1, value - k))));
    return wrap;
  }
  const treeKind = s => s <= 0 ? 'healthy' : s < 15 ? 'little' : s < 28 ? 'sick' : 'vsick';
  const LABEL = { healthy: 'Healthy', little: 'A little sick', sick: 'Sick', vsick: 'Very sick' };
  const farmHearts = s => Math.max(0.5, Math.round(5 * (1 - s / 40) * 2) / 2);
  document.querySelectorAll('img[data-tree]').forEach(im => im.src = treeURL[im.dataset.tree]);
  const legendHTML = Object.keys(TREES).map(k => `<div><img class="ico" src="${treeURL[k]}" alt="">${LABEL[k]}</div>`).join('');
  document.getElementById('legend').innerHTML = legendHTML;
  document.getElementById('welcomeTrees').innerHTML = legendHTML;

  // ---------- map ----------
  const ESRI = 'Imagery © Esri, Maxar, Earthstar Geographics';
  const freeStyle = (tiles, attribution) => ({
    version: 8, glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: { base: { type: 'raster', tiles: [tiles], tileSize: 256, maxzoom: 19, attribution } },
    layers: [{ id: 'base', type: 'raster', source: 'base' }]
  });
  const DEM = MB
    ? { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 }
    : { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 14, attribution: 'Terrain: Mapzen/AWS Terrain Tiles' };
  const FONT = MB ? ['DIN Pro Bold', 'Arial Unicode MS Bold'] : ['Open Sans Semibold'];

  const map = new gl.Map({
    container: 'map',
    style: MB ? 'mapbox://styles/mapbox/satellite-v9'
              : freeStyle('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', ESRI),
    ...HOME, maxPitch: 80
  });
  const corners = b => [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
  const yearFilter = () => state.year === 'all' ? ['has', 'year'] : ['==', ['get', 'year'], state.year];
  const sizeExpr = () => {
    const f = state.model === 'model2'
      ? ['interpolate', ['linear'], ['get', 'frequency'], 0, 0.75, 1, 0.95, 5, 1.7] : 1;
    return ['interpolate', ['linear'], ['zoom'], 8, ['*', 0.85, f], 12, ['*', 1.6, f]];
  };

  map.on('load', async () => {
    map.addSource('dem', DEM);
    map.setTerrain({ source: 'dem', exaggeration: 1.7 });
    if (MB) map.setFog({ range: [1, 10], color: '#bfe3ff', 'high-color': '#6fb7ff', 'horizon-blend': 0.12, 'space-color': '#6fb7ff', 'star-intensity': 0 });
    else if (map.setSky) map.setSky({ 'sky-color': '#5aaaf5', 'horizon-color': '#bfe3ff', 'fog-color': '#bfe3ff', 'sky-horizon-blend': 0.5, 'horizon-fog-blend': 0.5, 'fog-ground-blend': 0.15 });

    Object.keys(TREES).forEach(k => {
      const c = treeCanvas(k);
      map.addImage('tree-' + k, { width: c.width, height: c.height, data: c.getContext('2d').getImageData(0, 0, c.width, c.height).data }, { pixelRatio: 2 });
    });

    const [munis, prov, rivers, irr, roads, farms] = await Promise.all(
      ['municipalities', 'province', 'rivers', 'irrigation', 'roads', 'farms'].map(n => fetch(`data/${n}.geojson`).then(r => r.json())));
    state.farms = farms;

    const world = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
    const holes = prov.features.flatMap(f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map(p => p[0]));
    map.addSource('mask', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [world, ...holes] } } });
    map.addSource('elevation', { type: 'image', url: 'data/elevation.png', coordinates: corners(window.OVERLAYS.elevation) });
    map.addSource('hotspot', { type: 'image', url: 'data/hotspot.png', coordinates: corners(window.OVERLAYS.hotspot) });
    map.addSource('munis', { type: 'geojson', data: munis });
    map.addSource('prov', { type: 'geojson', data: prov });
    map.addSource('rivers', { type: 'geojson', data: rivers });
    map.addSource('irrigation', { type: 'geojson', data: irr });
    map.addSource('roads', { type: 'geojson', data: roads });
    map.addSource('farms', { type: 'geojson', data: farms });

    // one label point per town (largest part)
    const ringArea = r => r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
    const ringCentroid = r => { let x = 0, y = 0, A = 0; for (let i = 0; i < r.length - 1; i++) { const [x0, y0] = r[i], [x1, y1] = r[i + 1], c = x0 * y1 - x1 * y0; A += c; x += (x0 + x1) * c; y += (y0 + y1) * c; } return [x / (3 * A), y / (3 * A)]; };
    map.addSource('munis-pt', { type: 'geojson', data: { type: 'FeatureCollection', features: munis.features.map(f => {
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      const outer = polys.map(p => p[0]).sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)))[0];
      return { type: 'Feature', properties: f.properties, geometry: { type: 'Point', coordinates: ringCentroid(outer) } };
    }) } });

    map.addLayer({ id: 'mask', type: 'fill', source: 'mask', paint: { 'fill-color': '#1d2a5c', 'fill-opacity': 0.45 } });
    map.addLayer({ id: 'elevation', type: 'raster', source: 'elevation', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.7, 'raster-fade-duration': 0, 'raster-resampling': 'nearest' } });
    map.addLayer({ id: 'hotspot', type: 'raster', source: 'hotspot', paint: { 'raster-opacity': 0.75, 'raster-fade-duration': 0, 'raster-resampling': 'nearest' } });
    map.addLayer({ id: 'irrigation', type: 'line', source: 'irrigation', paint: { 'line-color': '#8ff5e3', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 13, 3], 'line-dasharray': [2, 1.5] } });
    map.addLayer({ id: 'rivers-edge', type: 'line', source: 'rivers', paint: { 'line-color': '#0d2f6b', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3.5, 13, 8] } });
    map.addLayer({ id: 'rivers', type: 'line', source: 'rivers', paint: { 'line-color': '#4fb3ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2, 13, 5] } });
    map.addLayer({ id: 'roads-edge', type: 'line', source: 'roads', filter: ['in', ['get', 'class'], ['literal', ['trunk', 'primary', 'secondary']]], paint: { 'line-color': '#3b2a12', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3, 13, 8] } });
    map.addLayer({ id: 'roads', type: 'line', source: 'roads', paint: {
      'line-color': ['match', ['get', 'class'], 'trunk', '#e8c27a', 'primary', '#e8c27a', 'secondary', '#d9b98a', '#c9b49a'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, ['match', ['get', 'class'], 'trunk', 1.8, 'primary', 1.5, 'secondary', 1, 0.5], 13, ['match', ['get', 'class'], 'trunk', 5, 'primary', 4, 'secondary', 3, 1.5]] } });
    map.addLayer({ id: 'munis-line', type: 'line', source: 'munis', paint: { 'line-color': '#ffffff', 'line-width': 1.2, 'line-opacity': 0.6, 'line-dasharray': [2, 2] } });
    map.addLayer({ id: 'prov-edge', type: 'line', source: 'prov', paint: { 'line-color': '#101418', 'line-width': 6 } });
    map.addLayer({ id: 'prov-line', type: 'line', source: 'prov', paint: { 'line-color': '#ffd54a', 'line-width': 3 } });
    map.addLayer({ id: 'munis-label', type: 'symbol', source: 'munis-pt', layout: {
      'text-field': ['get', 'adm3_en'], 'text-font': FONT, 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 12, 12, 17] },
      paint: { 'text-color': '#ffffff', 'text-halo-color': '#101418', 'text-halo-width': 2 } });
    map.addLayer({ id: 'trees', type: 'symbol', source: 'farms', filter: yearFilter(), layout: {
      'icon-image': ['case', ['<=', ['get', 'severity_pct'], 0], 'tree-healthy', ['<', ['get', 'severity_pct'], 15], 'tree-little', ['<', ['get', 'severity_pct'], 28], 'tree-sick', 'tree-vsick'],
      'icon-size': sizeExpr(), 'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      'symbol-sort-key': ['get', 'severity_pct'],
      'text-field': '', 'text-font': FONT, 'text-size': 14, 'text-anchor': 'top', 'text-offset': [0, 0.2], 'text-allow-overlap': true },
      paint: { 'text-color': '#ffd54a', 'text-halo-color': '#101418', 'text-halo-width': 2 } });

    wire();
    renderPanel();
    updateStats();
    initMinimap(prov);
  });

  // ---------- layer slots ----------
  const LAYERS = {
    trees: ['trees'], hotspot: ['hotspot'], rivers: ['rivers', 'rivers-edge'], irrigation: ['irrigation'],
    roads: ['roads', 'roads-edge'], elevation: ['elevation'], munis: ['munis-line', 'munis-label']
  };
  document.querySelectorAll('.hotbar .slot').forEach(btn => btn.addEventListener('click', () => {
    btn.classList.toggle('on');
    const v = btn.classList.contains('on') ? 'visible' : 'none';
    LAYERS[btn.dataset.layer].forEach(id => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', v));
  }));
  document.addEventListener('keydown', e => {
    const n = +e.key; const slots = document.querySelectorAll('.hotbar .slot');
    if (n >= 1 && n <= slots.length && !e.target.closest('input')) slots[n - 1].click();
  });

  // ---------- modes ----------
  document.querySelectorAll('.mode').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.mode').forEach(b => b.classList.toggle('active', b === btn));
    state.model = btn.dataset.model;
    if (map.getLayer('trees')) {
      map.setLayoutProperty('trees', 'icon-size', sizeExpr());
      map.setLayoutProperty('trees', 'text-field', state.model === 'model2'
        ? ['case', ['>', ['get', 'frequency'], 0], ['concat', '×', ['to-string', ['get', 'frequency']]], ''] : '');
    }
    renderPanel();
  }));

  const KID = {
    Temperature: { i: '🌡️', w: 'Hot days' }, Humidity: { i: '💦', w: 'Wet air' }, Wind: { i: '🌬️', w: 'Wind' },
    Rainfall: { i: '🌧️', w: 'Rain' }, Road: { i: '🛣️', w: 'Roads' }, River: { i: '💧', w: 'Rivers' },
    Irrigation: { i: '🚿', w: 'Canals' }, Elevation: { i: '⛰️', w: 'Mountains' }
  };
  function kidSentence(v, c) {
    const what = state.model === 'model1' ? 'got sicker' : 'got sick more often';
    if (v === 'Road') return c > 0 ? `Trees <b>far from roads</b> ${what}` : `Trees <b>near roads</b> ${what}`;
    if (v === 'River') return c < 0 ? `Trees <b>near rivers</b> ${what}` : `Trees <b>far from rivers</b> ${what}`;
    if (v === 'Irrigation') return c < 0 ? `Trees <b>near farm canals</b> ${what}` : `Trees <b>far from canals</b> ${what}`;
    if (v === 'Elevation') return c < 0 ? `Trees <b>low down</b> ${what}` : `Trees <b>up high</b> ${what}`;
    return `<b>${KID[v].w}</b> changes how ${state.model === 'model1' ? 'sick trees get' : 'often trees get sick'}`;
  }
  const fmt = (n, d = 3) => Number(n).toFixed(d);
  const pStr = p => (p < 0.001 ? '<0.001' : fmt(p, 3));
  function renderPanel() {
    const m = R[state.model];
    document.getElementById('mTitle').textContent = state.model === 'model1' ? '🤒 How sick are the trees?' : '🔁 How often do trees get sick?';
    document.getElementById('mSub').innerHTML = state.model === 'model1'
      ? 'Each tree on the map is a farm. Its look shows how sick it is.'
      : 'Bigger tree with <b>×3</b> = that farm got sick 3 times.';
    const sig = [], ns = [];
    R.variables.forEach((v, i) => (m.p[i] < 0.05 ? sig : ns).push([v, m.coef[i]]));
    document.getElementById('findings').innerHTML = sig.map(([v, c]) => `<div class="find"><span>${KID[v].i}</span><p>${kidSentence(v, c)}</p></div>`).join('') || '<p>Nothing clearly mattered.</p>';
    document.getElementById('notMatter').innerHTML = ns.map(([v]) => `<span class="chip">${KID[v].i} ${KID[v].w}</span>`).join('');
    const maxAbs = Math.max(...m.coef.map(Math.abs));
    document.getElementById('bars').innerHTML = R.variables.map((v, i) => {
      const c = m.coef[i], p = m.p[i], w = Math.abs(c) / maxAbs * 50;
      const style = c >= 0 ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`;
      return `<div class="bar ${p < 0.05 ? 'sig' : ''} ${c < 0 ? 'neg' : ''}" title="coef ${fmt(c, 4)} · VIF ${fmt(R.vif[i], 2)}"><span>${v}</span><span class="track"><span class="fill" style="${style}"></span></span><span class="pv">p ${pStr(p)}</span></div>`;
    }).join('');
    const d = R.diagnostics;
    document.getElementById('dR2').textContent = fmt(d.r2);
    document.getElementById('dAR2').textContent = fmt(d.adjR2);
    document.getElementById('dF').textContent = `${fmt(d.jointF, 2)} (${pStr(d.jointFp)})`;
    document.getElementById('dK').textContent = `${fmt(d.koenker, 2)} (${pStr(d.koenkerP)})`;
    document.getElementById('dV').textContent = fmt(d.vifMax, 2);
    document.getElementById('src').textContent = R.source;
  }

  // ---------- year + stats ----------
  const slider = document.getElementById('year');
  slider.addEventListener('input', () => {
    const y = +slider.value; state.year = y === 2018 ? 'all' : y;
    document.getElementById('tlLabel').textContent = state.year === 'all' ? 'All years' : `Year ${y}`;
    if (map.getLayer('trees')) map.setFilter('trees', yearFilter());
    updateStats();
  });
  function updateStats() {
    if (!state.farms) return;
    const f = state.farms.features.map(x => x.properties).filter(p => state.year === 'all' || p.year === state.year);
    const sick = f.filter(p => p.severity_pct > 0);
    document.getElementById('cHealthy').textContent = f.length - sick.length;
    document.getElementById('cSick').textContent = sick.length;
    document.getElementById('cTowns').textContent = new Set(sick.map(p => p.municipality)).size;
    const health = f.length ? f.reduce((s, p) => s + (1 - Math.min(p.severity_pct, 40) / 40), 0) / f.length : 1;
    const v = Math.round(health * 10 * 2) / 2;
    const h = document.getElementById('hearts'); h.innerHTML = ''; [...heartsHTML(v, 10).children].forEach(c => h.appendChild(c));
    document.getElementById('lifeTxt').textContent = health > 0.8 ? 'Good 🙂' : health > 0.6 ? 'Okay 😐' : 'Not good 😷';
  }

  // ---------- tooltip ----------
  function wire() {
    map.on('click', 'trees', e => {
      const p = e.features[0].properties, s = +p.severity_pct, k = treeKind(s);
      const km = m => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
      const el = document.createElement('div');
      el.innerHTML = `<div class="tip-h"><img class="ico" src="${treeURL[k]}" alt=""><div><b>${LABEL[k]} farm</b><small>${p.municipality} · ${p.year}</small></div></div>
        <div class="tip-hearts"></div>
        <div class="tip-row"><span>Sick trees</span><b>${s > 0 ? s + '%' : 'None! 🎉'}</b></div>
        <div class="tip-row"><span>Times it got sick</span><b>${p.frequency}</b></div>
        <div class="tip-row"><span>💧 River</span><b>${km(+p.dist_river_m)} away</b></div>
        <div class="tip-row"><span>🚿 Canal</span><b>${km(+p.dist_irrig_m)} away</b></div>
        <div class="tip-row"><span>🛣️ Road</span><b>${km(+p.dist_road_m)} away</b></div>
        <div class="tip-row"><span>⛰️ Height</span><b>${p.elev_m} m</b></div>
        <div class="tip-row"><span>🌧️ Rain a year</span><b>${p.rain_mm} mm</b></div>
        <div class="tip-note">Practice data · not a real farm (${p.id})</div>`;
      [...heartsHTML(s > 0 ? farmHearts(s) : 5, 5).children].forEach(c => el.querySelector('.tip-hearts').appendChild(c));
      new gl.Popup({ offset: [0, -30], maxWidth: '270px' }).setLngLat(e.features[0].geometry.coordinates).setDOMContent(el).addTo(map);
    });
    map.on('mouseenter', 'trees', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'trees', () => map.getCanvas().style.cursor = '');
  }

  // ---------- camera ----------
  const b3d = document.getElementById('btn3d'), bSpin = document.getElementById('btnSpin');
  b3d.addEventListener('click', () => {
    state.is3d = !state.is3d; b3d.classList.toggle('on', state.is3d);
    map.setTerrain(state.is3d ? { source: 'dem', exaggeration: 1.7 } : null);
    map.easeTo({ pitch: state.is3d ? HOME.pitch : 0, duration: 800 });
  });
  bSpin.addEventListener('click', () => { state.spin = !state.spin; bSpin.classList.toggle('on', state.spin); if (state.spin) orbit(); });
  function orbit() { if (!state.spin) return; map.easeTo({ bearing: map.getBearing() + 12, duration: 1000, easing: t => t }); setTimeout(orbit, 1000); }
  map.on('mousedown', () => { if (state.spin) { state.spin = false; bSpin.classList.remove('on'); } });
  document.getElementById('btnHome').addEventListener('click', () => map.flyTo({ ...HOME, pitch: state.is3d ? HOME.pitch : 0, duration: 1500 }));

  // ---------- panel / modals ----------
  const panel = document.getElementById('panel');
  if (window.innerWidth < 860) panel.classList.add('collapsed');
  document.getElementById('panelToggle').addEventListener('click', () => panel.classList.add('collapsed'));
  const welcome = document.getElementById('welcome');
  try { if (localStorage.getItem('seenWelcome2')) welcome.hidden = true; } catch (e) {}
  document.getElementById('closeWelcome').addEventListener('click', () => { welcome.hidden = true; try { localStorage.setItem('seenWelcome2', '1'); } catch (e) {} });
  document.getElementById('btnHelp').addEventListener('click', () => { panel.classList.remove('collapsed'); welcome.hidden = false; });
  const methods = document.getElementById('methods');
  document.getElementById('openMethods').addEventListener('click', () => methods.hidden = false);
  document.getElementById('closeMethods').addEventListener('click', () => methods.hidden = true);
  [welcome, methods].forEach(m => m.addEventListener('click', e => { if (e.target === m) m.hidden = true; }));

  // ---------- minimap ----------
  function initMinimap(prov) {
    if (window.innerWidth < 860) return;
    const mini = new gl.Map({ container: 'minimap',
      style: MB ? 'mapbox://styles/mapbox/outdoors-v12' : freeStyle('https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', '© CARTO © OpenStreetMap'),
      center: HOME.center, zoom: 6.8, interactive: false, attributionControl: false });
    mini.on('load', () => {
      mini.addSource('prov', { type: 'geojson', data: prov });
      mini.addLayer({ id: 'p', type: 'fill', source: 'prov', paint: { 'fill-color': '#5cc94a', 'fill-opacity': 0.35 } });
      mini.addLayer({ id: 'pl', type: 'line', source: 'prov', paint: { 'line-color': '#101418', 'line-width': 2 } });
      mini.addSource('view', { type: 'geojson', data: viewPoly() });
      mini.addLayer({ id: 'v', type: 'line', source: 'view', paint: { 'line-color': '#e83a3a', 'line-width': 2 } });
      const sync = () => { mini.getSource('view').setData(viewPoly()); mini.jumpTo({ center: map.getCenter() }); };
      map.on('move', sync); sync();
    });
  }
  function viewPoly() {
    const c = map.getCanvas(), w = c.clientWidth, h = c.clientHeight;
    const pts = [[0, h * 0.3], [w, h * 0.3], [w, h], [0, h]].map(p => map.unproject(p).toArray());
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...pts, pts[0]]] } };
  }
})();
