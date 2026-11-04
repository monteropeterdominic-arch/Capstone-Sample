/* Nangka Guard – sample 3D web map (Mapbox GL JS v3) */
(() => {
  'use strict';
  const MB = window.USE_MAPBOX;
  const gl = MB ? window.mapboxgl : window.maplibregl;
  if (MB) gl.accessToken = window.MAPBOX_TOKEN;
  const FONT = MB ? ['DIN Pro Bold', 'Arial Unicode MS Bold'] : ['Open Sans Semibold'];
  const ESRI = 'Imagery © Esri, Maxar, Earthstar Geographics';
  const freeStyle = (tiles, attribution) => ({
    version: 8, glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: { base: { type: 'raster', tiles: [tiles], tileSize: 256, maxzoom: 19, attribution } },
    layers: [{ id: 'base', type: 'raster', source: 'base' }]
  });
  const DEM = MB
    ? { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 }
    : { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 14, attribution: 'Terrain: Mapzen/AWS Terrain Tiles' };
  const R = window.MODEL_RESULTS;
  const HOME = { center: [124.86, 7.17], zoom: 8.9, pitch: 62, bearing: -18 };
  const state = { model: 'model1', year: 'all', spin: false, is3d: true, points: null };

  const map = new gl.Map({
    container: 'map',
    style: MB ? 'mapbox://styles/mapbox/satellite-v9'
              : freeStyle('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', ESRI),
    ...HOME,
    maxPitch: 80,
    antialias: true,
    attributionControl: true
  });

  // ---------- helpers ----------
  const corners = b => [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
  function hexagon([lon, lat], rMeters) {
    const ring = [];
    const dLat = rMeters / 111320, dLon = rMeters / (111320 * Math.cos(lat * Math.PI / 180));
    for (let i = 0; i <= 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      ring.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]);
    }
    return [ring];
  }
  const fmt = (n, d = 3) => Number(n).toFixed(d);
  const pStr = p => (p < 0.001 ? '<0.001' : fmt(p, 3));

  // tower height / colour expressions per model
  const heightExpr = m => m === 'model1'
    ? ['*', ['get', 'severity_pct'], 95]
    : ['*', ['get', 'frequency'], 720];
  const colorExpr = m => m === 'model1'
    ? ['interpolate', ['linear'], ['get', 'severity_pct'], 5, '#3ee0c4', 18, '#f3d27a', 28, '#ff8a3d', 38, '#ff2d4b']
    : ['interpolate', ['linear'], ['get', 'frequency'], 1, '#3ee0c4', 2, '#f3d27a', 3, '#ff8a3d', 5, '#ff2d4b'];
  const yearFilter = () => state.year === 'all' ? ['has', 'year'] : ['==', ['get', 'year'], state.year];

  // ---------- map layers ----------
  map.on('load', async () => {
    map.addSource('dem', DEM);
    map.setTerrain({ source: 'dem', exaggeration: 1.8 });
    if (MB) map.setFog({
      range: [0.8, 9], color: '#1a2f4a', 'high-color': '#0b1830', 'horizon-blend': 0.18,
      'space-color': '#050b16', 'star-intensity': 0.35
    });
    else if (map.setSky) map.setSky({ 'sky-color': '#0b1830', 'horizon-color': '#1a2f4a', 'fog-color': '#1a2f4a', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.2 });

    const [munis, prov, rivers, irr, roads, pts] = await Promise.all(
      ['municipalities', 'province', 'rivers', 'irrigation', 'roads', 'disease_points']
        .map(n => fetch(`data/${n}.geojson`).then(r => r.json())));
    state.points = pts;

    const towers = {
      type: 'FeatureCollection',
      features: pts.features.map(f => ({ type: 'Feature', properties: f.properties,
        geometry: { type: 'Polygon', coordinates: hexagon(f.geometry.coordinates, 650) } }))
    };

    map.addSource('elevation', { type: 'image', url: 'data/elevation.png', coordinates: corners(window.OVERLAYS.elevation) });
    map.addSource('hotspot', { type: 'image', url: 'data/hotspot.png', coordinates: corners(window.OVERLAYS.hotspot) });
    map.addSource('munis', { type: 'geojson', data: munis, generateId: true });
    map.addSource('prov', { type: 'geojson', data: prov });
    map.addSource('rivers', { type: 'geojson', data: rivers });
    map.addSource('irrigation', { type: 'geojson', data: irr });
    map.addSource('roads', { type: 'geojson', data: roads });
    map.addSource('pts', { type: 'geojson', data: pts });
    map.addSource('towers', { type: 'geojson', data: towers });

    // dim outside province a bit with a dark mask over everything except inside
    const world = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
    const holes = prov.features.flatMap(f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map(p => p[0]));
    map.addSource('mask', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [world, ...holes] } } });
    map.addLayer({ id: 'mask', type: 'fill', source: 'mask', paint: { 'fill-color': '#040a14', 'fill-opacity': 0.55 } });

    map.addLayer({ id: 'elevation', type: 'raster', source: 'elevation', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.7, 'raster-fade-duration': 0 } });
    map.addLayer({ id: 'hotspot', type: 'raster', source: 'hotspot', paint: { 'raster-opacity': 0.82, 'raster-fade-duration': 0 } });

    map.addLayer({ id: 'munis-fill', type: 'fill', source: 'munis', paint: { 'fill-color': '#0b2a3f', 'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.35, 0.08] } });
    map.addLayer({ id: 'irrigation', type: 'line', source: 'irrigation', paint: { 'line-color': '#8ff5e3', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 13, 2], 'line-dasharray': [2, 1.5], 'line-opacity': 0.85 } });
    map.addLayer({ id: 'rivers-glow', type: 'line', source: 'rivers', paint: { 'line-color': '#4aa8ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3, 13, 8], 'line-blur': 4, 'line-opacity': 0.5 } });
    map.addLayer({ id: 'rivers', type: 'line', source: 'rivers', paint: { 'line-color': '#9fd4ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 13, 3] } });
    map.addLayer({ id: 'roads', type: 'line', source: 'roads', paint: {
      'line-color': ['match', ['get', 'class'], 'trunk', '#ffcf6b', 'primary', '#ffcf6b', 'secondary', '#e9d9a8', '#c9bfa3'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, ['match', ['get', 'class'], 'trunk', 2, 'primary', 1.6, 0.6], 13, ['match', ['get', 'class'], 'trunk', 5, 'primary', 4, 2]],
      'line-opacity': 0.9 } });
    map.addLayer({ id: 'munis-line', type: 'line', source: 'munis', paint: { 'line-color': '#f3d27a', 'line-width': 0.8, 'line-opacity': 0.55, 'line-dasharray': [3, 2] } });
    map.addLayer({ id: 'prov-glow', type: 'line', source: 'prov', paint: { 'line-color': '#f3d27a', 'line-width': 10, 'line-blur': 8, 'line-opacity': 0.55 } });
    map.addLayer({ id: 'prov-line', type: 'line', source: 'prov', paint: { 'line-color': '#ffe7a3', 'line-width': 2.2 } });
    // one label per town: centroid of its largest polygon part
    const ringArea = r => r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
    const ringCentroid = r => { let x = 0, y = 0, A = 0; for (let i = 0; i < r.length - 1; i++) { const [x0, y0] = r[i], [x1, y1] = r[i + 1], c = x0 * y1 - x1 * y0; A += c; x += (x0 + x1) * c; y += (y0 + y1) * c; } return [x / (3 * A), y / (3 * A)]; };
    map.addSource('munis-pt', { type: 'geojson', data: { type: 'FeatureCollection', features: munis.features.map(f => {
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      const outer = polys.map(p => p[0]).sort((r1, r2) => Math.abs(ringArea(r2)) - Math.abs(ringArea(r1)))[0];
      return { type: 'Feature', properties: f.properties, geometry: { type: 'Point', coordinates: ringCentroid(outer) } };
    }) } });
    map.addLayer({ id: 'munis-label', type: 'symbol', source: 'munis-pt', layout: {
      'text-field': ['upcase', ['get', 'adm3_en']], 'text-font': FONT,
      'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 15], 'text-letter-spacing': 0.12, 'text-allow-overlap': false },
      paint: { 'text-color': '#fff2c9', 'text-halo-color': '#06101d', 'text-halo-width': 1.6 } });

    map.addLayer({ id: 'pts-base', type: 'circle', source: 'pts', filter: yearFilter(), paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 13, 9], 'circle-color': colorExpr(state.model),
      'circle-stroke-color': '#fff', 'circle-stroke-width': 1, 'circle-pitch-alignment': 'map' } });
    map.addLayer({ id: 'towers', type: 'fill-extrusion', source: 'towers', filter: yearFilter(), paint: {
      'fill-extrusion-color': colorExpr(state.model), 'fill-extrusion-height': heightExpr(state.model),
      'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.88,
      'fill-extrusion-vertical-gradient': true, ...(MB ? { 'fill-extrusion-emissive-strength': 0.9 } : {}) } });

    wireInteractions();
    renderPanel();
    updateStats();
    initMinimap(prov);
  });

  // ---------- layer toggles ----------
  const LAYERS = {
    hotspot: ['hotspot'], towers: ['towers', 'pts-base'], rivers: ['rivers', 'rivers-glow'],
    irrigation: ['irrigation'], roads: ['roads'], elevation: ['elevation'], munis: ['munis-line', 'munis-label', 'munis-fill']
  };
  document.querySelectorAll('.skill').forEach(btn => btn.addEventListener('click', () => {
    btn.classList.toggle('on');
    const v = btn.classList.contains('on') ? 'visible' : 'none';
    LAYERS[btn.dataset.layer].forEach(id => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', v));
  }));

  // ---------- model switch ----------
  document.querySelectorAll('.mode').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.mode').forEach(b => b.classList.toggle('active', b === btn));
    state.model = btn.dataset.model;
    if (map.getLayer('towers')) {
      map.setPaintProperty('towers', 'fill-extrusion-height', heightExpr(state.model));
      map.setPaintProperty('towers', 'fill-extrusion-color', colorExpr(state.model));
      map.setPaintProperty('pts-base', 'circle-color', colorExpr(state.model));
    }
    renderPanel();
  }));

  const KID = {
    Temperature: { i: '🌡️', w: 'Hot days' }, Humidity: { i: '💦', w: 'Wet air' }, Wind: { i: '🌬️', w: 'Wind' },
    Rainfall: { i: '🌧️', w: 'Rain' }, Road: { i: '🛣️', w: 'Roads' }, River: { i: '💧', w: 'Rivers' },
    Irrigation: { i: '🚿', w: 'Farm canals' }, Elevation: { i: '⛰️', w: 'Mountains' }
  };
  function kidSentence(v, c) {
    const what = state.model === 'model1' ? 'got sicker' : 'got sick more often';
    if (v === 'Road') return c > 0 ? `Farms <b>far from roads</b> ${what}` : `Farms <b>near roads</b> ${what}`;
    if (v === 'River') return c < 0 ? `Farms <b>near rivers</b> ${what}` : `Farms <b>far from rivers</b> ${what}`;
    if (v === 'Irrigation') return c < 0 ? `Farms <b>near farm canals</b> ${what}` : `Farms <b>far from farm canals</b> ${what}`;
    if (v === 'Elevation') return c < 0 ? `Farms <b>low down</b> ${what}` : `Farms <b>up high</b> ${what}`;
    return `<b>${KID[v].w}</b> changes how ${state.model === 'model1' ? 'sick trees get' : 'often trees get sick'}`;
  }
  function renderPanel() {
    const m = R[state.model];
    document.getElementById('mTitle').textContent = state.model === 'model1' ? '🤒 How bad is it?' : '🔁 How often does it happen?';
    document.getElementById('mSub').innerHTML = state.model === 'model1'
      ? 'Tall towers = farms where <b>lots of trees</b> are sick.' : 'Tall towers = farms that got sick <b>many times</b>.';
    const sig = [], ns = [];
    R.variables.forEach((v, i) => (m.p[i] < 0.05 ? sig : ns).push([v, m.coef[i]]));
    document.getElementById('findings').innerHTML = sig.length
      ? sig.map(([v, c]) => `<div class="find"><span>${KID[v].i}</span><p>${kidSentence(v, c)}</p></div>`).join('')
      : '<p class="notmatter">Nothing clearly mattered.</p>';
    document.getElementById('notMatter').innerHTML = ns.map(([v]) => `<span class="chip">${KID[v].i} ${KID[v].w}</span>`).join('');

    const maxAbs = Math.max(...m.coef.map(Math.abs));
    document.getElementById('bars').innerHTML = R.variables.map((v, i) => {
      const c = m.coef[i], p = m.p[i], w = Math.abs(c) / maxAbs * 50;
      const style = c >= 0 ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`;
      return `<div class="bar ${p < 0.05 ? 'sig' : ''} ${c < 0 ? 'neg' : ''}" title="coef ${fmt(c, 4)} · VIF ${fmt(R.vif[i], 2)}">
        <span class="nm">${v}</span><span class="track"><span class="fill" style="${style}"></span></span>
        <span class="pv">p ${pStr(p)}</span></div>`;
    }).join('');
    const d = R.diagnostics;
    document.getElementById('dR2').textContent = fmt(d.r2);
    document.getElementById('dAR2').textContent = fmt(d.adjR2);
    document.getElementById('dF').textContent = `${fmt(d.jointF, 2)} (${pStr(d.jointFp)})`;
    document.getElementById('dK').textContent = `${fmt(d.koenker, 2)} (${pStr(d.koenkerP)})`;
    document.getElementById('dV').textContent = fmt(d.vifMax, 2);
    document.getElementById('src').textContent = R.source;
  }

  // ---------- timeline ----------
  const slider = document.getElementById('year');
  slider.addEventListener('input', () => {
    const y = +slider.value;
    state.year = y === 2018 ? 'all' : y;
    document.getElementById('tlLabel').textContent = state.year === 'all' ? 'ALL YEARS' : `YEAR ${y}`;
    ['towers', 'pts-base'].forEach(id => map.getLayer(id) && map.setFilter(id, yearFilter()));
    updateStats();
  });

  function updateStats() {
    if (!state.points) return;
    const f = state.points.features.filter(x => state.year === 'all' || x.properties.year === state.year).map(x => x.properties);
    const avg = f.length ? f.reduce((s, p) => s + p.severity_pct, 0) / f.length : 0;
    count('sCases', f.length); count('sMun', new Set(f.map(p => p.municipality)).size);
    document.getElementById('sSev').textContent = `${avg.toFixed(1)}%`;
  }
  function count(id, to) {
    const el = document.getElementById(id), from = +el.textContent || 0, t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / 500); el.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // ---------- popups & hover ----------
  function wireInteractions() {
    const show = e => {
      const p = e.features[0].properties;
      const hp = Math.min(100, p.severity_pct / 60 * 100);
      const km = m => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
      const face = p.severity_pct >= 28 ? '😷' : p.severity_pct >= 15 ? '🤒' : '🙂';
      new gl.Popup({ offset: 12, maxWidth: '280px' }).setLngLat(e.lngLat).setHTML(`
        <div class="card-h"><b>${face} Farm in ${p.municipality}</b><small>Year ${p.year} · ${p.id}</small></div>
        <div class="card-b">
          <div class="kid" style="grid-column:1/-1"><span>How many trees are sick?</span><b>${p.severity_pct}% of the farm</b></div>
          <div class="card-hp"><i style="width:${hp}%"></i></div>
          <div class="kid" style="grid-column:1/-1"><span>How many times did it get sick?</span><b>${p.frequency} ${p.frequency == 1 ? 'time' : 'times'}</b></div>
          <div class="kid"><span>💧 River</span><b>${km(+p.dist_river_m)} away</b></div>
          <div class="kid"><span>🚿 Farm canal</span><b>${km(+p.dist_irrig_m)} away</b></div>
          <div class="kid"><span>🛣️ Road</span><b>${km(+p.dist_road_m)} away</b></div>
          <div class="kid"><span>⛰️ Height</span><b>${p.elev_m} m up</b></div>
          <div class="kid"><span>🌧️ Rain / year</span><b>${p.rain_mm} mm</b></div>
          <div class="kid"><span>🌡️ Hottest</span><b>${p.tmax_c} °C</b></div>
          <div class="card-note">Practice data · not a real farm</div>
        </div>`).addTo(map);
    };
    ['towers', 'pts-base'].forEach(id => {
      map.on('click', id, show);
      map.on('mouseenter', id, () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', id, () => map.getCanvas().style.cursor = '');
    });
    let hovered = null;
    map.on('mousemove', 'munis-fill', e => {
      const id = e.features[0].id ?? null;
      if (hovered !== null) map.setFeatureState({ source: 'munis', id: hovered }, { hover: false });
      hovered = id; if (id !== null) map.setFeatureState({ source: 'munis', id }, { hover: true });
    });
    map.on('mouseleave', 'munis-fill', () => { if (hovered !== null) map.setFeatureState({ source: 'munis', id: hovered }, { hover: false }); hovered = null; });
  }

  // ---------- camera ----------
  const b3d = document.getElementById('btn3d'), bSpin = document.getElementById('btnSpin');
  b3d.addEventListener('click', () => {
    state.is3d = !state.is3d; b3d.classList.toggle('on', state.is3d);
    map.setTerrain(state.is3d ? { source: 'dem', exaggeration: 1.8 } : null);
    map.easeTo({ pitch: state.is3d ? 62 : 0, duration: 900 });
  });
  bSpin.addEventListener('click', () => { state.spin = !state.spin; bSpin.classList.toggle('on', state.spin); if (state.spin) orbit(); });
  function orbit() { if (!state.spin) return; map.easeTo({ bearing: map.getBearing() + 12, duration: 1000, easing: t => t }); setTimeout(orbit, 1000); }
  map.on('mousedown', () => { if (state.spin) { state.spin = false; bSpin.classList.remove('on'); } });
  const welcome = document.getElementById('welcome');
  try { if (localStorage.getItem('seenWelcome')) welcome.hidden = true; } catch (e) {}
  document.getElementById('closeWelcome').addEventListener('click', () => { welcome.hidden = true; try { localStorage.setItem('seenWelcome', '1'); } catch (e) {} });
  document.getElementById('btnHelp').addEventListener('click', () => welcome.hidden = false);
  document.getElementById('btnHome').addEventListener('click', () => map.flyTo({ ...HOME, pitch: state.is3d ? HOME.pitch : 0, duration: 1600 }));

  // ---------- panel / modal ----------
  const panel = document.getElementById('panel');
  if (window.innerWidth < 820) panel.classList.add('collapsed');
  document.getElementById('panelToggle').addEventListener('click', () => panel.classList.toggle('collapsed'));
  const modal = document.getElementById('methods');
  document.getElementById('openMethods').addEventListener('click', () => modal.hidden = false);
  document.getElementById('closeMethods').addEventListener('click', () => modal.hidden = true);
  modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });

  // ---------- minimap ----------
  function initMinimap(prov) {
    if (window.innerWidth < 820) return;
    const mini = new gl.Map({ container: 'minimap', style: MB ? 'mapbox://styles/mapbox/dark-v11' : freeStyle('https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', '© CARTO © OpenStreetMap'), center: HOME.center, zoom: 6.6, interactive: false, attributionControl: false });
    mini.on('load', () => {
      mini.addSource('prov', { type: 'geojson', data: prov });
      mini.addLayer({ id: 'p', type: 'fill', source: 'prov', paint: { 'fill-color': '#3ee0c4', 'fill-opacity': 0.25 } });
      mini.addLayer({ id: 'pl', type: 'line', source: 'prov', paint: { 'line-color': '#f3d27a', 'line-width': 1.2 } });
      mini.addSource('view', { type: 'geojson', data: viewPoly() });
      mini.addLayer({ id: 'v', type: 'line', source: 'view', paint: { 'line-color': '#ffffff', 'line-width': 1.5 } });
      mini.addLayer({ id: 'vf', type: 'fill', source: 'view', paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.08 } });
      const sync = () => { mini.getSource('view').setData(viewPoly()); mini.jumpTo({ center: map.getCenter() }); };
      map.on('move', sync); sync();
    });
  }
  function viewPoly() {
    const c = map.getCanvas(), w = c.clientWidth, h = c.clientHeight;
    const pts = [[0, h * 0.25], [w, h * 0.25], [w, h], [0, h]].map(p => map.unproject(p).toArray());
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...pts, pts[0]]] } };
  }
})();
