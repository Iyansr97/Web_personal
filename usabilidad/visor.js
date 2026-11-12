/* visor.js — Dibuja mapas de calor y recorridos oculares a partir de los JSON
   generados por js/usabilidad.js. Sin librerías. */

'use strict';

(() => {
  const $ = (s) => document.querySelector(s);
  const sesiones = [];

  const el = {
    ficheros: $('[data-ficheros]'), soltar: $('[data-soltar]'), resumen: $('[data-resumen]'),
    selSesion: $('[data-sel-sesion]'), selPagina: $('[data-sel-pagina]'), selCapa: $('[data-sel-capa]'),
    selEscala: $('[data-sel-escala]'), opacidad: $('[data-opacidad]'), info: $('[data-info]'),
    externo: $('[data-externo]'), escenario: $('[data-escenario]'), marco: $('[data-marco]'),
    lienzo: $('[data-lienzo]')
  };

  /* ---------- Carga de ficheros ---------- */
  const cargar = async (ficheros) => {
    for (const f of ficheros) {
      try {
        const datos = JSON.parse(await f.text());
        if (!datos || !Array.isArray(datos.paginas)) throw new Error('formato no reconocido');
        const i = sesiones.findIndex((s) => s.usuario === datos.usuario && s.creada === datos.creada);
        if (i >= 0) sesiones[i] = datos; else sesiones.push(datos);
      } catch (error) {
        alert(`No se pudo leer ${f.name}: ${error.message}`);
      }
    }
    sesiones.sort((a, b) => String(a.usuario).localeCompare(String(b.usuario)));
    pintarResumen();
    rellenarSesiones();
  };

  el.ficheros.addEventListener('change', () => cargar(el.ficheros.files));
  el.soltar.addEventListener('dragover', (e) => { e.preventDefault(); el.soltar.classList.add('activo'); });
  el.soltar.addEventListener('dragleave', () => el.soltar.classList.remove('activo'));
  el.soltar.addEventListener('drop', (e) => {
    e.preventDefault();
    el.soltar.classList.remove('activo');
    cargar(e.dataTransfer.files);
  });

  /* ---------- Resumen ---------- */
  const celda = (texto, clase) => {
    const td = document.createElement('td');
    td.textContent = texto;
    if (clase) td.className = clase;
    return td;
  };

  const pintarResumen = () => {
    el.resumen.replaceChildren();
    for (const s of sesiones) {
      const tr = document.createElement('tr');
      const clics = s.paginas.reduce((n, p) => n + p.clics.length, 0);
      const mirada = s.paginas.reduce((n, p) => n + p.mirada.length, 0);
      tr.append(
        celda(s.usuario), celda(s.dispositivo), celda(s.estado, `estado-${s.estado}`),
        celda(s.duracionSegundos ?? '—', 'num'), celda(s.respuesta || '—'),
        celda(s.paginas.map((p) => p.url.replace('.html', '')).join(' → ')),
        celda(clics, 'num'), celda(mirada, 'num'), celda(s.seguimientoOcular ? 'Sí' : 'No')
      );
      el.resumen.append(tr);
    }
  };

  /* ---------- Selectores ---------- */
  const opcion = (valor, texto) => { const o = document.createElement('option'); o.value = valor; o.textContent = texto; return o; };

  const rellenarSesiones = () => {
    el.selSesion.replaceChildren(...sesiones.map((s, i) => opcion(i, `${s.usuario} (${s.dispositivo})`)));
    rellenarPaginas();
  };

  /* Agrupa las visitas a una misma página dentro de la sesión */
  const paginasDe = (s) => {
    const mapa = new Map();
    for (const p of s.paginas) {
      const g = mapa.get(p.url) || { url: p.url, ventana: p.ventana, docAncho: 0, docAlto: 0, clics: [], mirada: [], visitas: 0 };
      g.docAncho = Math.max(g.docAncho, p.docAncho || 0, p.ventana.ancho);
      g.docAlto = Math.max(g.docAlto, p.docAlto || 0, p.ventana.alto);
      g.clics.push(...p.clics);
      g.mirada.push(...p.mirada);
      g.visitas += 1;
      mapa.set(p.url, g);
    }
    for (const g of mapa.values()) { g.clics.sort((a, b) => a[2] - b[2]); g.mirada.sort((a, b) => a[2] - b[2]); }
    return [...mapa.values()];
  };

  const rellenarPaginas = () => {
    const s = sesiones[el.selSesion.value];
    el.selPagina.replaceChildren(...(s ? paginasDe(s).map((g, i) => opcion(i, `${g.url} (${g.visitas} visita/s)`)) : []));
    dibujar();
  };

  el.selSesion.addEventListener('change', rellenarPaginas);
  [el.selPagina, el.selCapa, el.opacidad].forEach((c) => c.addEventListener('input', dibujar));
  el.selEscala.addEventListener('change', ajustarEscala);
  addEventListener('resize', ajustarEscala);

  /* ---------- Escenario ---------- */
  let actual = null;

  function ajustarEscala() {
    if (!actual) return;
    const disponible = el.externo.clientWidth;
    const escala = el.selEscala.value === 'ajustar' ? Math.min(1, disponible / actual.docAncho) : 1;
    el.escenario.style.transform = `scale(${escala})`;
    el.externo.style.height = `${Math.ceil(actual.docAlto * escala)}px`;
    el.externo.style.overflowX = escala < 1 ? 'hidden' : 'auto';
  }

  function dibujar() {
    const s = sesiones[el.selSesion.value];
    const g = s && paginasDe(s)[el.selPagina.value];
    if (!g) { actual = null; return; }
    actual = g;

    const ancho = g.ventana.ancho;
    const alto = g.docAlto;
    if (el.marco.dataset.url !== g.url || el.marco.width !== String(ancho)) {
      el.marco.dataset.url = g.url;
      el.marco.src = `../${g.url}`;
    }
    el.marco.width = ancho;
    el.marco.height = alto;
    el.lienzo.width = ancho;
    el.lienzo.height = alto;
    el.escenario.style.width = `${ancho}px`;
    el.escenario.style.height = `${alto}px`;
    ajustarEscala();

    const ctx = el.lienzo.getContext('2d');
    ctx.clearRect(0, 0, ancho, alto);
    ctx.globalAlpha = el.opacidad.value / 100;

    const capa = el.selCapa.value;
    const fij = fijaciones(g.mirada);
    if (capa === 'mirada' || capa === 'todo') mapaCalor(ctx, ancho, alto, g.mirada, 55, 0.08);
    if (capa === 'clics') mapaCalor(ctx, ancho, alto, g.clics, 35, 0.35);
    ctx.globalAlpha = 1;
    if (capa === 'recorrido' || capa === 'todo') recorrido(ctx, fij);
    if (capa === 'clics' || capa === 'todo') marcarClics(ctx, g.clics);

    const durTotal = fij.reduce((n, f) => n + f.dur, 0);
    el.info.textContent = `${s.usuario} · ${s.dispositivo} · ${g.url} · ventana ${g.ventana.ancho}×${g.ventana.alto} px · ` +
      `${g.mirada.length} muestras de mirada · ${fij.length} fijaciones (${(durTotal / 1000).toFixed(1)} s) · ` +
      `${g.clics.length} clics` + (s.seguimientoOcular ? '' : ' · sin seguimiento ocular en esta sesión');
  }

  /* ---------- Mapa de calor ---------- */
  const paleta = (v) => {
    const paradas = [[0, [0, 0, 255]], [0.25, [0, 255, 255]], [0.5, [0, 255, 0]], [0.75, [255, 255, 0]], [1, [255, 0, 0]]];
    for (let i = 1; i < paradas.length; i++) {
      const [p1, c1] = paradas[i];
      const [p0, c0] = paradas[i - 1];
      if (v <= p1) {
        const k = (v - p0) / (p1 - p0);
        return c0.map((c, j) => Math.round(c + (c1[j] - c) * k));
      }
    }
    return paradas[paradas.length - 1][1];
  };

  function mapaCalor(ctx, w, h, puntos, radio, intensidad) {
    if (!puntos.length) return;
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const o = off.getContext('2d');
    for (const [x, y] of puntos) {
      if (x < -radio || y < -radio || x > w + radio || y > h + radio) continue;
      const gr = o.createRadialGradient(x, y, 0, x, y, radio);
      gr.addColorStop(0, `rgba(0,0,0,${intensidad})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = gr;
      o.fillRect(x - radio, y - radio, radio * 2, radio * 2);
    }
    const img = o.getImageData(0, 0, w, h);
    const d = img.data;
    let max = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > max) max = d[i];
    if (!max) return;
    for (let i = 3; i < d.length; i += 4) {
      const a = d[i];
      if (!a) continue;
      const v = a / max;
      const [r, g, b] = paleta(v);
      d[i - 3] = r; d[i - 2] = g; d[i - 1] = b;
      d[i] = Math.round(Math.min(1, 0.25 + v) * 210);
    }
    o.putImageData(img, 0, 0);
    ctx.drawImage(off, 0, 0);
  }

  /* ---------- Fijaciones (algoritmo I-DT por dispersión) ---------- */
  function fijaciones(muestras, dispersionMax = 90, duracionMin = 200) {
    const res = [];
    let i = 0;
    while (i < muestras.length) {
      let j = i;
      let minX = muestras[i][0], maxX = minX, minY = muestras[i][1], maxY = minY;
      while (j + 1 < muestras.length) {
        const [x, y] = muestras[j + 1];
        const nMinX = Math.min(minX, x), nMaxX = Math.max(maxX, x);
        const nMinY = Math.min(minY, y), nMaxY = Math.max(maxY, y);
        if ((nMaxX - nMinX) + (nMaxY - nMinY) > dispersionMax) break;
        minX = nMinX; maxX = nMaxX; minY = nMinY; maxY = nMaxY;
        j += 1;
      }
      const dur = muestras[j][2] - muestras[i][2];
      if (dur >= duracionMin) {
        const tramo = muestras.slice(i, j + 1);
        res.push({
          x: tramo.reduce((n, m) => n + m[0], 0) / tramo.length,
          y: tramo.reduce((n, m) => n + m[1], 0) / tramo.length,
          dur, t: muestras[i][2]
        });
        i = j + 1;
      } else {
        i += 1;
      }
    }
    return res;
  }

  function recorrido(ctx, fij) {
    if (!fij.length) return;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(26, 79, 168, .85)';
    ctx.beginPath();
    fij.forEach((f, i) => (i ? ctx.lineTo(f.x, f.y) : ctx.moveTo(f.x, f.y)));
    ctx.stroke();
    fij.forEach((f, i) => {
      const r = Math.min(40, 9 + f.dur / 60);
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 140, 0, .55)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 50, 0, .9)';
      ctx.stroke();
      ctx.fillStyle = '#1d1d1d';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), f.x, f.y);
    });
  }

  function marcarClics(ctx, clics) {
    clics.forEach(([x, y], i) => {
      ctx.strokeStyle = '#b3261e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y + 8);
      ctx.moveTo(x + 8, y - 8); ctx.lineTo(x - 8, y + 8);
      ctx.stroke();
      ctx.fillStyle = '#b3261e';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(i + 1), x + 10, y - 6);
    });
  }
})();
