/* ============================================================================
 *  formulario.js — Formulario de opinión (ayuda.html / en/help.html)
 *  Mejora progresiva: sin JavaScript el formulario usa la validación nativa y
 *  abre el programa de correo (action="mailto:"). Con JavaScript:
 *   - Mensajes de error claros junto a cada campo (aria-invalid + aria-describedby).
 *   - Resumen accesible en una región role="status".
 *   - Mensaje de correo bien formateado y confirmación al usuario.
 * ========================================================================== */

'use strict';

(() => {
  const form = document.getElementById('form-opinion');
  const estado = document.getElementById('estado-opinion');
  if (!form || !estado) return;

  const en = document.documentElement.lang === 'en';
  const TXT = en ? {
    correoVacio: 'Enter your email address.',
    correoMal: 'The email address does not look valid (example: name@domain.com).',
    mensajeVacio: 'Write your message.',
    mensajeCorto: (n) => `The message is too short: ${n} of at least 10 characters.`,
    errores: (n) => `The form has ${n} error${n === 1 ? '' : 's'}. Please check the highlighted fields.`,
    ok: 'Thank you! Your email program will open with the message ready: you just need to press Send.',
    asunto: 'Feedback about the website'
  } : {
    correoVacio: 'Escribe tu correo electrónico.',
    correoMal: 'El correo no parece válido (ejemplo: nombre@dominio.com).',
    mensajeVacio: 'Escribe tu mensaje.',
    mensajeCorto: (n) => `El mensaje es demasiado corto: ${n} de al menos 10 caracteres.`,
    errores: (n) => `El formulario tiene ${n} error${n === 1 ? '' : 'es'}. Revisa los campos marcados.`,
    ok: '¡Gracias! Se abrirá tu programa de correo con el mensaje preparado: solo tienes que pulsar Enviar.',
    asunto: 'Opinión sobre el sitio web'
  };

  form.noValidate = true;
  const destino = form.action.replace(/^mailto:/, '').split('?')[0];

  const campos = {
    correo: form.elements.correo,
    mensaje: form.elements.mensaje
  };

  const validar = {
    correo: (v) => (!v ? TXT.correoVacio : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : TXT.correoMal),
    mensaje: (v) => (!v ? TXT.mensajeVacio : v.length < 10 ? TXT.mensajeCorto(v.length) : '')
  };

  const marcar = (nombre, mensaje) => {
    const campo = campos[nombre];
    const idError = `error-${nombre}`;
    let error = document.getElementById(idError);
    const ayuda = campo.getAttribute('aria-describedby').split(' ').filter((id) => id !== idError);
    if (mensaje) {
      if (!error) {
        error = document.createElement('strong');
        error.id = idError;
        campo.parentElement.append(error);
      }
      error.textContent = mensaje;
      campo.setAttribute('aria-invalid', 'true');
      campo.setAttribute('aria-describedby', [...ayuda, idError].join(' '));
    } else {
      if (error) error.remove();
      campo.removeAttribute('aria-invalid');
      campo.setAttribute('aria-describedby', ayuda.join(' '));
    }
    return !mensaje;
  };

  /* Revalida un campo en cuanto el usuario lo corrige */
  Object.keys(campos).forEach((nombre) => {
    campos[nombre].addEventListener('blur', () => {
      if (campos[nombre].value.trim()) marcar(nombre, validar[nombre](campos[nombre].value.trim()));
    });
    campos[nombre].addEventListener('input', () => {
      if (campos[nombre].hasAttribute('aria-invalid')) marcar(nombre, validar[nombre](campos[nombre].value.trim()));
    });
  });

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const invalidos = Object.keys(campos).filter((n) => !marcar(n, validar[n](campos[n].value.trim())));

    if (invalidos.length) {
      estado.textContent = TXT.errores(invalidos.length);
      campos[invalidos[0]].focus();
      return;
    }

    const nombre = form.elements.nombre.value.trim();
    const tipo = form.elements.tipo.value;
    const cuerpo = `${campos.mensaje.value.trim()}\n\n— ${nombre || '—'} <${campos.correo.value.trim()}>`;
    const asunto = `${TXT.asunto}: ${tipo}`;
    estado.textContent = TXT.ok;
    location.href = `mailto:${destino}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    form.reset();
  });
})();
