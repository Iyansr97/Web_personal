/* ============================================================================
 *  usabilidad.js — Herramienta de pruebas de usabilidad (tanda 2)
 *
 *  Solo se activa en "modo prueba", abriendo cualquier página con:
 *      index.html?usuario=U01&dispositivo=escritorio   (escritorio|tableta|telefono)
 *  Para recuperar los datos de la última prueba en ese navegador:
 *      index.html?prueba=descargar
 *
 *  Durante la prueba registra, por cada página visitada:
 *    - Clics / toques (mapa de calor de interacción).
 *    - Mirada estimada con la webcam mediante WebGazer.js (mapa de calor de
 *      la mirada y recorrido ocular). Necesita contexto seguro (HTTPS o
 *      localhost) y permiso de cámara; si no está disponible, la prueba sigue
 *      registrando clics, scroll y tiempo.
 *    - Profundidad de scroll, tiempo de entrada a cada página y tiempo total.
 *  Al terminar se descarga un JSON que se analiza con usabilidad/visor.html.
 *
 *  La interfaz va en un Shadow DOM para no interferir con estilos del sitio.
 * ========================================================================== */

'use strict';

(() => {
  if (window.top !== window.self) return; // dentro del visor: no registrar

  const CLAVE = 'ux-prueba-activa';
  const CLAVE_ULTIMA = 'ux-prueba-ultima';
  const TANDA = 2;
  const TAREA = 'Averigua cómo se llama el cantante y líder del grupo de música favorito de Iyán.';
  const WEBGAZER_URL = 'https://cdn.jsdelivr.net/npm/webgazer@3.3.0/dist/webgazer.js';
  const MUESTREO_MIRADA_MS = 100;
  const CLICS_POR_PUNTO = 5;

  const params = new URLSearchParams(location.search);
  const leer = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* lleno o bloqueado */ } };
  const borrar = (k) => { try { localStorage.removeItem(k); } catch { /* nada */ } };

  const detectarDispositivo = () => {
    const ancho = Math.min(screen.width, screen.height);
    if (!matchMedia('(pointer: coarse)').matches) return 'escritorio';
    return ancho >= 600 ? 'tableta' : 'telefono';
  };

  /* ---------- Sesión ---------- */
  let sesion = leer(CLAVE);
  const usuarioParam = params.get('usuario');

  if (usuarioParam && (!sesion || sesion.usuario !== usuarioParam)) {
    sesion = {
      version: 1,
      usuario: usuarioParam,
      dispositivo: params.get('dispositivo') || detectarDispositivo(),
      tanda: TANDA,
      tarea: TAREA,
      creada: new Date().toISOString(),
      inicio: null,
      fin: null,
      duracionSegundos: null,
      estado: 'pendiente',          // pendiente → en-curso → completada | abandonada
      respuesta: '',
      seguimientoOcular: false,
      pantalla: { ancho: screen.width, alto: screen.height, dpr: devicePixelRatio },
      navegador: navigator.userAgent,
      paginas: []
    };
    guardar(CLAVE, sesion);
  }

  const modoDescarga = params.get('prueba') === 'descargar';
  if (!sesion && !modoDescarga) return;

  /* ---------- Interfaz (Shadow DOM) ---------- */
  const anfitrion = document.createElement('div');
  anfitrion.setAttribute('data-ux-prueba', '');
  const raiz = anfitrion.attachShadow({ mode: 'open' });
  raiz.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: system-ui, "Segoe UI", Roboto, Arial, sans-serif; }
      .capa { position: fixed; inset: 0; z-index: 2147483646; display: grid; place-items: center;
              background: rgba(8, 26, 63, .82); padding: 16px; }
      .capa[hidden], .barra[hidden], .punto[hidden] { display: none; }
      .panel { background: #fff; color: #1d2433; border-radius: 16px; padding: 24px; max-width: 520px;
               width: 100%; box-shadow: 0 10px 40px rgba(0,0,0,.35); font-size: 17px; line-height: 1.5; }
      .panel h2 { margin: 0 0 12px; font-size: 22px; color: #123a7a; }
      .panel p { margin: 0 0 12px; }
      .tarea { background: #eef5ff; border-left: 4px solid #1a4fa8; padding: 12px 14px; border-radius: 8px;
               font-weight: 600; }
      .acciones { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
      button { font: inherit; border: 0; border-radius: 10px; padding: 10px 16px; cursor: pointer;
               background: #1a4fa8; color: #fff; }
      button.sec { background: #e3e8f0; color: #1d2433; }
      button.peligro { background: #b3261e; }
      input { font: inherit; width: 100%; padding: 10px 12px; border: 2px solid #cfe0fa; border-radius: 10px; }
      .aviso { font-size: 14px; color: #6a4b00; background: #fff4d6; padding: 8px 10px; border-radius: 8px; }
      .calibracion { position: fixed; inset: 0; z-index: 2147483646; background: rgba(255,255,255,.96); }
      .calibracion p { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0;
                       max-width: 80vw; text-align: center; color: #1d2433; font-size: 17px; }
      .punto { position: absolute; width: 32px; height: 32px; margin: -16px 0 0 -16px; border-radius: 50%;
               padding: 0; background: #d93025; box-shadow: 0 0 0 4px rgba(217,48,37,.25); }
      .punto.hecho { background: #1e8e3e; box-shadow: none; }
      .barra { position: fixed; right: 12px; bottom: 12px; z-index: 2147483645; display: flex; gap: 6px;
               padding: 6px; background: rgba(8,26,63,.9); border-radius: 14px; }
      .barra button { padding: 8px 12px; font-size: 15px; }
    </style>

    <section class="capa" data-vista="intro" hidden>
      <div class="panel">
        <h2>Prueba de usabilidad</h2>
        <p>Gracias por participar. No se evalúa a la persona, sino la página web.</p>
        <p>Tu tarea es:</p>
        <p class="tarea">${TAREA}</p>
        <p>Hazlo como lo harías normalmente, sin prisa. Cuando encuentres la respuesta,
           o si decides abandonar, pulsa <strong>Terminar</strong> (abajo a la derecha).</p>
        <p class="aviso" data-aviso-camara hidden></p>
        <div class="acciones">
          <button data-accion="preparar">Continuar</button>
        </div>
      </div>
    </section>

    <section class="capa" data-vista="posicion" hidden>
      <div class="panel">
        <h2>Coloca la cara</h2>
        <p>Mira la imagen de la cámara (arriba a la izquierda) y centra la cara hasta que el recuadro
           se vea verde. Después pulsa en los puntos rojos que irán apareciendo, mirándolos fijamente
           (${CLICS_POR_PUNTO} veces cada uno).</p>
        <div class="acciones"><button data-accion="calibrar">Calibrar</button></div>
      </div>
    </section>

    <section class="calibracion" data-vista="calibracion" hidden>
      <p>Pulsa cada punto rojo ${CLICS_POR_PUNTO} veces mirándolo fijamente.</p>
    </section>

    <section class="capa" data-vista="listo" hidden>
      <div class="panel">
        <h2>Todo listo</h2>
        <p class="tarea">${TAREA}</p>
        <p>El tiempo empieza a contar al pulsar <strong>Empezar</strong>.</p>
        <div class="acciones"><button data-accion="empezar">Empezar</button></div>
      </div>
    </section>

    <section class="capa" data-vista="ver-tarea" hidden>
      <div class="panel">
        <h2>Tu tarea</h2>
        <p class="tarea">${TAREA}</p>
        <div class="acciones"><button data-accion="cerrar">Volver a la página</button></div>
      </div>
    </section>

    <section class="capa" data-vista="terminar" hidden>
      <div class="panel">
        <h2>Terminar la prueba</h2>
        <p>Si has encontrado la respuesta, escríbela:</p>
        <p><input data-respuesta type="text" autocomplete="off" placeholder="Respuesta"></p>
        <div class="acciones">
          <button data-accion="completar">La he encontrado</button>
          <button class="peligro" data-accion="abandonar">Me rindo</button>
          <button class="sec" data-accion="cerrar">Seguir buscando</button>
        </div>
      </div>
    </section>

    <section class="capa" data-vista="final" hidden>
      <div class="panel">
        <h2>¡Gracias!</h2>
        <p data-resumen></p>
        <p>Evaluador: descarga los datos y guárdalos para el visor.</p>
        <div class="acciones">
          <button data-accion="descargar">Descargar datos (JSON)</button>
          <button class="sec" data-accion="salir">Cerrar</button>
        </div>
      </div>
    </section>

    <nav class="barra" hidden aria-label="Prueba de usabilidad">
      <button class="sec" data-accion="ver-tarea">Tarea</button>
      <button data-accion="terminar">Terminar</button>
    </nav>
  `;

  const $ = (sel) => raiz.querySelector(sel);
  const vistas = raiz.querySelectorAll('[data-vista]');
  const barra = $('.barra');
  const mostrar = (nombre) => {
    vistas.forEach((v) => { v.hidden = v.dataset.vista !== nombre; });
    barra.hidden = !(sesion && sesion.estado === 'en-curso' && !nombre);
  };

  const montar = () => document.body.appendChild(anfitrion);
  if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);

  /* ---------- Descarga ---------- */
  const descargar = (datos) => {
    const blob = new Blob([JSON.stringify(datos)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `prueba-tanda${datos.tanda}-${datos.usuario}-${datos.dispositivo}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const pantallaFinal = (datos) => {
    $('[data-resumen]').textContent = datos
      ? `Usuario ${datos.usuario} · ${datos.dispositivo} · ${datos.estado} en ${datos.duracionSegundos} s.`
      : 'No hay datos de ninguna prueba en este navegador.';
    $('[data-accion="descargar"]').hidden = !datos;
    mostrar('final');
  };

  if (modoDescarga && !usuarioParam) {
    const ultima = leer(CLAVE_ULTIMA);
    if (document.body) pantallaFinal(ultima);
    else document.addEventListener('DOMContentLoaded', () => pantallaFinal(ultima));
    return;
  }

  /* ---------- Registro de la página actual ---------- */
  let pagina = null;
  let temporizadorGuardado = null;

  const medirDocumento = () => {
    const d = document.documentElement;
    if (!pagina) return;
    pagina.docAncho = Math.max(d.scrollWidth, pagina.docAncho || 0);
    pagina.docAlto = Math.max(d.scrollHeight, pagina.docAlto || 0);
  };

  const guardarYa = () => {
    clearTimeout(temporizadorGuardado);
    temporizadorGuardado = null;
    medirDocumento();
    guardar(CLAVE, sesion);
  };
  const programarGuardado = () => {
    if (!temporizadorGuardado) temporizadorGuardado = setTimeout(guardarYa, 1500);
  };
  const ahora = () => Date.now() - sesion.inicio;

  /* Ruta desde la raíz del sitio: "musica.html" o "en/music.html" */
  const urlRelativa = () => {
    const partes = location.pathname.split('/');
    const archivo = partes.pop() || 'index.html';
    return partes[partes.length - 1] === 'en' ? `en/${archivo}` : archivo;
  };

  const abrirPagina = () => {
    pagina = {
      url: urlRelativa(),
      entrada: ahora(),
      ventana: { ancho: innerWidth, alto: innerHeight },
      docAncho: 0,
      docAlto: 0,
      scrollMax: 0,
      clics: [],   // [x, y, t, destino]
      mirada: []   // [x, y, t]
    };
    sesion.paginas.push(pagina);
    guardarYa();
  };

  const esDeLaHerramienta = (e) => e.composedPath().includes(anfitrion) ||
    (e.target instanceof Element && e.target.closest('#webgazerVideoContainer'));

  const describir = (el) => {
    if (!(el instanceof Element)) return '';
    const enlace = el.closest('a, button');
    const objetivo = enlace || el;
    const texto = (objetivo.textContent || objetivo.getAttribute('alt') || '').trim().replace(/\s+/g, ' ');
    return `${objetivo.tagName.toLowerCase()}${texto ? ': ' + texto.slice(0, 60) : ''}`;
  };

  const registrarClic = (e) => {
    if (!pagina || sesion.estado !== 'en-curso' || esDeLaHerramienta(e)) return;
    pagina.clics.push([Math.round(e.pageX), Math.round(e.pageY), ahora(), describir(e.target)]);
    guardarYa(); // un clic suele provocar navegación: guardar al momento
  };

  const registrarScroll = () => {
    if (!pagina) return;
    const fondo = Math.round(scrollY + innerHeight);
    if (fondo > pagina.scrollMax) { pagina.scrollMax = fondo; programarGuardado(); }
  };

  /* ---------- WebGazer ---------- */
  let ultimaMirada = 0;
  const contextoSeguro = window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

  const cargarWebGazer = () => new Promise((resolver, rechazar) => {
    if (window.webgazer) { resolver(window.webgazer); return; }
    const s = document.createElement('script');
    s.src = WEBGAZER_URL;
    s.onload = () => resolver(window.webgazer);
    s.onerror = () => rechazar(new Error('No se pudo cargar WebGazer'));
    document.head.appendChild(s);
  });

  const iniciarMirada = async ({ limpiar = false, verVideo = false } = {}) => {
    if (!contextoSeguro) return false;
    try {
      const wg = await cargarWebGazer();
      wg.params.showVideoPreview = verVideo;
      wg.saveDataAcrossSessions(true);
      wg.setRegression('ridge');
      wg.applyKalmanFilter(true);
      wg.setGazeListener((dato) => {
        if (!dato || !pagina || sesion.estado !== 'en-curso') return;
        const t = Date.now();
        if (t - ultimaMirada < MUESTREO_MIRADA_MS) return;
        ultimaMirada = t;
        pagina.mirada.push([Math.round(dato.x + scrollX), Math.round(dato.y + scrollY), ahora()]);
        programarGuardado();
      });
      await wg.begin();
      if (limpiar) await wg.clearData();
      wg.showPredictionPoints(false);
      wg.showVideoPreview(verVideo);
      const video = document.getElementById('webgazerVideoContainer');
      if (video) video.style.zIndex = '2147483647';
      return true;
    } catch (error) {
      console.warn('[usabilidad] Seguimiento ocular no disponible:', error);
      return false;
    }
  };

  /* ---------- Calibración ---------- */
  const calibrar = () => new Promise((resolver) => {
    const capa = $('[data-vista="calibracion"]');
    const posiciones = [10, 50, 90].flatMap((y) => [10, 50, 90].map((x) => [x, y]));
    let pendientes = posiciones.length;
    posiciones.forEach(([x, y]) => {
      const b = document.createElement('button');
      b.className = 'punto';
      b.style.left = `${x}%`;
      b.style.top = `${y}%`;
      b.setAttribute('aria-label', 'Punto de calibración');
      let clics = 0;
      b.addEventListener('click', () => {
        clics += 1;
        b.style.opacity = String(1 - clics / (CLICS_POR_PUNTO + 2));
        if (clics === CLICS_POR_PUNTO) {
          b.classList.add('hecho');
          b.disabled = true;
          pendientes -= 1;
          if (pendientes === 0) setTimeout(resolver, 300);
        }
      });
      capa.appendChild(b);
    });
    mostrar('calibracion');
  });

  /* ---------- Flujo ---------- */
  const comenzarRegistro = () => {
    addEventListener('click', registrarClic, true);
    addEventListener('scroll', registrarScroll, { passive: true });
    addEventListener('resize', () => { medirDocumento(); programarGuardado(); });
    addEventListener('pagehide', guardarYa);
    document.addEventListener('visibilitychange', () => { if (document.hidden) guardarYa(); });
    abrirPagina();
    registrarScroll();
  };

  const finalizar = (estado) => {
    sesion.estado = estado;
    sesion.respuesta = $('[data-respuesta]').value.trim();
    sesion.fin = Date.now();
    sesion.duracionSegundos = Math.round((sesion.fin - sesion.inicio) / 100) / 10;
    guardarYa();
    guardar(CLAVE_ULTIMA, sesion);
    borrar(CLAVE);
    if (window.webgazer) { try { window.webgazer.end(); } catch { /* nada */ } }
    pantallaFinal(sesion);
  };

  raiz.addEventListener('click', async (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    switch (boton.dataset.accion) {
      case 'preparar':
        if (contextoSeguro && await iniciarMirada({ limpiar: true, verVideo: true })) {
          sesion.seguimientoOcular = true;
          mostrar('posicion');
        } else {
          sesion.seguimientoOcular = false;
          mostrar('listo');
        }
        guardar(CLAVE, sesion);
        break;
      case 'calibrar':
        if (window.webgazer) window.webgazer.showVideoPreview(false);
        await calibrar();
        mostrar('listo');
        break;
      case 'empezar':
        sesion.estado = 'en-curso';
        sesion.inicio = Date.now();
        comenzarRegistro();
        mostrar(null);
        break;
      case 'ver-tarea': mostrar('ver-tarea'); break;
      case 'terminar': mostrar('terminar'); $('[data-respuesta]').focus(); break;
      case 'cerrar': mostrar(null); break;
      case 'completar': finalizar('completada'); break;
      case 'abandonar': finalizar('abandonada'); break;
      case 'descargar': descargar(leer(CLAVE_ULTIMA) || sesion); break;
      case 'salir': mostrar('__ninguna__'); history.replaceState(null, '', location.pathname); break;
      default: break;
    }
  });

  /* Estado al cargar la página */
  const alCargar = async () => {
    if (sesion.estado === 'en-curso') {
      comenzarRegistro();
      mostrar(null);
      if (sesion.seguimientoOcular) await iniciarMirada();
    } else {
      if (!contextoSeguro) {
        const aviso = $('[data-aviso-camara]');
        aviso.textContent = 'Seguimiento ocular desactivado: la cámara requiere HTTPS o localhost. ' +
          'Se registrarán clics, scroll y tiempo.';
        aviso.hidden = false;
      }
      mostrar('intro');
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', alCargar);
  else alCargar();
})();
