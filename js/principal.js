/* ============================================================================
 *  principal.js — Sitio web personal (Práctica II ECW)
 *  JavaScript vanilla, sin librerías. Mejora progresiva: sin JavaScript el
 *  sitio funciona igual y el menú se muestra siempre desplegado.
 *   1. Año actual en el pie de página (elemento <time>).
 *   2. Menú de navegación desplegable en pantallas pequeñas.
 * ========================================================================== */

'use strict';

(() => {
  /* 1. Año actual en el pie */
  const anio = document.getElementById('anio');
  if (anio) anio.textContent = String(new Date().getFullYear());

  /* 2. Menú móvil: el CSS muestra el botón y oculta la navegación solo cuando
        el botón tiene aria-expanded, así que se añade aquí al iniciar */
  const boton = document.getElementById('btn-menu');
  const navegacion = document.getElementById('navegacion');
  if (!boton || !navegacion) return;

  boton.setAttribute('aria-expanded', 'false');

  boton.addEventListener('click', () => {
    const abierto = boton.getAttribute('aria-expanded') === 'true';
    boton.setAttribute('aria-expanded', String(!abierto));
  });

  /* Escape cierra el menú y devuelve el foco al botón */
  navegacion.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && boton.getAttribute('aria-expanded') === 'true') {
      boton.setAttribute('aria-expanded', 'false');
      boton.focus();
    }
  });
})();
