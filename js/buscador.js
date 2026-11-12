/* ============================================================================
 *  buscador.js — Buscador del sitio (buscar.html / en/search.html)
 *  Busca en window.INDICE_BUSQUEDA (js/indice-busqueda.js) sin servidor:
 *   - Ignora mayúsculas y tildes.
 *   - Tolera pequeñas erratas (distancia de edición 1 o 2 según la longitud).
 *   - Ordena por relevancia (título > apartado > texto) y resalta coincidencias.
 *   - Si no hay resultados, sugiere la palabra más parecida del sitio.
 * ========================================================================== */

'use strict';

(() => {
  const indiceTotal = window.INDICE_BUSQUEDA;
  const lista = document.getElementById('resultados');
  const resumen = document.getElementById('resumen-busqueda');
  const entrada = document.getElementById('q-pagina');
  if (!indiceTotal || !lista || !resumen || !entrada) return;

  const L = document.documentElement.lang === 'en' ? 'en' : 'es';
  const prefijo = L === 'en' ? '../' : '';
  const indice = indiceTotal[L];

  const TXT = {
    es: {
      vacio: 'Escribe una o varias palabras y pulsa «Buscar».',
      uno: (q) => `1 resultado para «${q}».`,
      varios: (n, q) => `${n} resultados para «${q}».`,
      parcial: (n, q) => `No hay páginas con todas las palabras de «${q}». ${n === 1 ? 'Se muestra 1 resultado' : `Se muestran ${n} resultados`} con alguna de ellas.`,
      ninguno: (q) => `No se ha encontrado nada para «${q}».`,
      quizas: '¿Quizás quisiste decir',
      mapa: 'También puedes consultar el mapa del sitio en la página de ayuda.',
      ayuda: 'ayuda.html#titulo-mapa',
      titulo: (q) => `«${q}» · Buscar · Iyán Solís Rodríguez`,
      vacias: ['de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'del', 'un', 'una', 'que', 'por', 'con', 'mi', 'su', 'al', 'es', 'lo', 'se', 'cual', 'cuál', 'como', 'cómo', 'donde', 'dónde', 'para']
    },
    en: {
      vacio: 'Type one or more words and press “Search”.',
      uno: (q) => `1 result for “${q}”.`,
      varios: (n, q) => `${n} results for “${q}”.`,
      parcial: (n, q) => `No page contains every word of “${q}”. Showing ${n} result${n === 1 ? '' : 's'} with some of them.`,
      ninguno: (q) => `Nothing found for “${q}”.`,
      quizas: 'Did you mean',
      mapa: 'You can also browse the site map on the help page.',
      ayuda: 'help.html#titulo-mapa',
      titulo: (q) => `“${q}” · Search · Iyán Solís Rodríguez`,
      vacias: ['the', 'a', 'an', 'of', 'in', 'on', 'and', 'or', 'to', 'is', 'my', 'his', 'what', 'which', 'where', 'how', 'for', 'with', 'from', 'about']
    }
  }[L];

  /* Normaliza conservando la longitud para poder mapear posiciones al texto original */
  const normalizar = (s) => s.split('').map((c) => c.normalize('NFD')[0].toLowerCase()).join('');
  const palabras = (s) => normalizar(s).split(/[^a-z0-9ñ]+/).filter(Boolean);

  const distancia = (a, b, max) => {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const fila = [i];
      let minimo = i;
      for (let j = 1; j <= b.length; j++) {
        fila[j] = Math.min(previa[j] + 1, fila[j - 1] + 1, previa[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        minimo = Math.min(minimo, fila[j]);
      }
      if (minimo > max) return max + 1;
      previa = fila;
    }
    return previa[b.length];
  };
  const tolerancia = (t) => (t.length >= 8 ? 2 : t.length >= 4 ? 1 : 0);

  /* Prepara cada entrada una sola vez */
  const docs = indice.map((e) => ({
    ...e,
    pPalabras: new Set(palabras(e.pagina)),
    aPalabras: new Set(palabras(e.apartado)),
    tPalabras: new Set(palabras(e.texto))
  }));
  const vocabulario = new Set(docs.flatMap((d) => [...d.pPalabras, ...d.aPalabras, ...d.tPalabras]));

  /* Puntuación de un término en un conjunto de palabras. Devuelve [puntos, formas encontradas] */
  const puntuar = (termino, conjunto) => {
    let mejor = 0;
    const formas = [];
    const max = tolerancia(termino);
    for (const p of conjunto) {
      let s = 0;
      if (p === termino) s = 3;
      else if (termino.length >= 3 && p.startsWith(termino)) s = 2;
      else if (max && distancia(termino, p, max) <= max) s = 1;
      if (s) { formas.push(p); mejor = Math.max(mejor, s); }
    }
    return [mejor, formas];
  };

  const buscar = (consulta) => {
    let terminos = palabras(consulta);
    const utiles = terminos.filter((t) => !TXT.vacias.includes(t));
    if (utiles.length) terminos = utiles;
    terminos = [...new Set(terminos)];

    const evaluados = docs.map((d) => {
      let total = 0;
      let encontrados = 0;
      const formas = new Set();
      for (const t of terminos) {
        const [sp, fp] = puntuar(t, d.pPalabras);
        const [sa, fa] = puntuar(t, d.aPalabras);
        const [st, ft] = puntuar(t, d.tPalabras);
        const s = sp * 4 + sa * 3 + st;
        if (s) {
          encontrados += 1;
          total += s;
          [...fp, ...fa, ...ft].forEach((f) => formas.add(f));
        }
      }
      return { d, total, encontrados, formas };
    }).filter((r) => r.encontrados);

    const todos = evaluados.filter((r) => r.encontrados === terminos.length);
    const resultados = (todos.length ? todos : evaluados)
      .sort((a, b) => b.encontrados - a.encontrados || b.total - a.total);
    return { resultados, completos: todos.length > 0, terminos };
  };

  /* Fragmento del texto alrededor de la primera coincidencia, con <mark> */
  const fragmento = (texto, formas) => {
    const norm = normalizar(texto);
    const regex = new RegExp(`(?<![a-z0-9ñ])(${[...formas].map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![a-z0-9ñ])`, 'g');
    const marcas = [...norm.matchAll(regex)].map((m) => [m.index, m.index + m[0].length]);
    const inicio = marcas.length ? Math.max(0, marcas[0][0] - 80) : 0;
    const fin = Math.min(texto.length, inicio + 240);
    const p = document.createElement('p');
    let cursor = inicio;
    if (inicio > 0) p.append('… ');
    for (const [a, b] of marcas) {
      if (a < cursor || b > fin) continue;
      p.append(texto.slice(cursor, a));
      const mark = document.createElement('mark');
      mark.textContent = texto.slice(a, b);
      p.append(mark);
      cursor = b;
    }
    p.append(texto.slice(cursor, fin));
    if (fin < texto.length) p.append(' …');
    return p;
  };

  const sugerencia = (terminos) => {
    const propuestas = terminos.map((t) => {
      let mejor = null;
      let dist = 3;
      for (const v of vocabulario) {
        const d = distancia(t, v, 2);
        if (d < dist && d > 0) { dist = d; mejor = v; }
      }
      return mejor;
    });
    return propuestas.every(Boolean) ? propuestas.join(' ') : null;
  };

  const pintar = (consulta) => {
    lista.replaceChildren();
    if (!consulta.trim()) { resumen.textContent = TXT.vacio; return; }
    document.title = TXT.titulo(consulta);

    const { resultados, completos, terminos } = buscar(consulta);

    if (!resultados.length) {
      resumen.textContent = TXT.ninguno(consulta);
      const propuesta = sugerencia(terminos);
      if (propuesta) {
        const a = document.createElement('a');
        a.href = `?q=${encodeURIComponent(propuesta)}`;
        a.textContent = propuesta;
        resumen.append(' ', `${TXT.quizas} `, a, '?');
      }
      const ayuda = document.createElement('a');
      ayuda.href = TXT.ayuda;
      ayuda.textContent = TXT.mapa;
      resumen.append(' ', ayuda);
      return;
    }

    const n = resultados.length;
    resumen.textContent = completos ? (n === 1 ? TXT.uno(consulta) : TXT.varios(n, consulta)) : TXT.parcial(n, consulta);

    for (const { d, formas } of resultados) {
      const li = document.createElement('li');
      const h3 = document.createElement('h3');
      const a = document.createElement('a');
      a.href = prefijo + d.url;
      a.textContent = d.apartado ? `${d.pagina} › ${d.apartado}` : d.pagina;
      h3.append(a);
      li.append(h3, fragmento(d.texto, formas));
      lista.append(li);
    }
  };

  const consulta = new URLSearchParams(location.search).get('q') || '';
  entrada.value = consulta;
  const cabecera = document.getElementById('q-cabecera');
  if (cabecera) cabecera.value = consulta;
  pintar(consulta);
  if (!consulta) entrada.focus();
})();
