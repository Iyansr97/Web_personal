================================================================================
  PRÁCTICA II · ESTÁNDARES Y COMPUTACIÓN WEB (ECW)
  Máster Universitario en Ingeniería Web · Curso 2026/2027
  Título: Sitio Web personal
--------------------------------------------------------------------------------
  Autor:        Iyán Solís Rodríguez
  Email:        UO295103@uniovi.com
  Fecha:        05/10/2026
  URL en línea: http://156.35.98.47:8080/Practica2/
================================================================================


1. DESCRIPCIÓN DEL SITIO
--------------------------------------------------------------------------------
Sitio web personal formado por 8 páginas HTML5, una hoja de estilos CSS3 y un
fichero JavaScript:

  index.html          Inicio: presentación y tarjetas de acceso a cada sección.
  sobre-mi.html       Información personal: nombre, apellidos, email,
                      fotografía personal, ubicación, historia y tabla de
                      formación.
  musica.html         Música: grupo favorito (Extremoduro) y podcast recomendado
                      (The Wild Project) con reproductor <audio>.
  cine-series.html    Cine: película favorita (Piratas del Caribe: El cofre del
                      hombre muerto).
  viajes.html         Viajes: destino destacado (Egipto) y reproductor <video>.
  deportes.html       Deportes: deporte favorito (balonmano).
  videojuegos.html    Videojuegos: juego favorito (Sekiro: Shadows Die Twice).
  tecnologia.html     Tecnología y Web: la inteligencia artificial en el
                      desarrollo web.

Contenido multimedia exigido por el enunciado:
  - Fotos:  fotografía personal y una imagen por cada tema.
  - Vídeo:  viajes.html (media/video-viajes.mp4).
  - Audio:  musica.html, fragmento de podcast (media/podcast.wav).
  El audio y el vídeo son archivos de ejemplo.


2. TECNOLOGÍAS UTILIZADAS Y JUSTIFICACIÓN
--------------------------------------------------------------------------------
Se han usado únicamente los estándares del W3C/WHATWG: HTML5, CSS3 y JavaScript
(ECMAScript 2015+). No se emplean bibliotecas, frameworks ni herramientas de
compilación.

  - HTML5
    Marcado exclusivamente semántico: header, nav, main, section, article,
    aside, footer, figure, figcaption, address, time, dl/dt/dd, table (con
    caption, thead, tbody y th scope), audio y video.
      * No se usa ningún elemento <div> ni <span> de maquetación (los <span>
        existentes solo indican el idioma de un texto con lang="en" o
        esconden un icono decorativo con aria-hidden).
      * El HTML no contiene información de presentación: no hay atributos
        class ni style, ni elementos <style>. Los únicos id sirven para
        JavaScript y anclas (#contenido, #navegacion, #btn-menu, #anio,
        #podcast) o para los encabezados referenciados por aria-labelledby;
        la hoja de estilos no los usa.
      * Metadatos en todas las páginas: lang="es", charset, viewport, author,
        description, title y favicon (SVG incrustado).
      * Las imágenes declaran width y height para que el navegador reserve su
        espacio y no haya saltos de maquetación mientras cargan; las de las
        tarjetas del inicio usan loading="lazy" (carga diferida).

  - CSS3 (css/estilos.css, hoja única)
    Todo el estilo se aplica mediante selectores de elemento, de atributo y
    combinadores (body > header, main > article, li > article, nav
    a[aria-current="page"], button[aria-expanded="false"] + nav…), sin clases
    ni identificadores. Ventajas:
      * Especificidad baja y homogénea: las reglas no compiten entre sí y la
        hoja es fácil de mantener y extender.
      * Separación total entre contenido (HTML) y presentación (CSS): cambiar
        el diseño no obliga a tocar el HTML.
      * El propio estado accesible hace de "gancho" de estilo: la página
        activa se resalta con aria-current y el menú móvil se abre o cierra
        según aria-expanded, así que accesibilidad y apariencia no pueden
        desincronizarse.
    Otras características: propiedades personalizadas (variables) para colores
    y medidas, Flexbox y Grid (repeat(auto-fill, minmax()) para las tarjetas),
    la pseudoclase :has() para detectar la sección de datos personales y la
    lista de tarjetas, :focus-visible, diseño responsivo con media queries,
    prefers-reduced-motion y hoja de impresión (@media print).
    Diseño: tipografía del sistema (system-ui, sin descargar fuentes), tamaños
    fluidos con clamp() y min(), cabecera translúcida (color-mix() y
    backdrop-filter) y tema oscuro automático con prefers-color-scheme: solo
    se redefinen las variables de color, sin duplicar reglas.

  - JavaScript (js/principal.js)
    Vanilla, en modo estricto y cargado con defer. Solo dos funciones:
      1. Menú desplegable en pantallas pequeñas (atributo aria-expanded, cierre
         con la tecla Escape).
      2. Año actual en el pie de página.
    Sigue el principio de mejora progresiva: el botón del menú solo aparece
    cuando JavaScript le añade aria-expanded, de modo que sin JavaScript la
    navegación se muestra siempre desplegada y todo el sitio es utilizable.

  ¿Por qué esta elección?
  - Es la opción que mejor cumple el requisito de ser técnicamente riguroso y
    ajustarse a los estándares web vigentes.
  - Sin dependencias externas: el sitio es ligero, carga rápido y funciona en
    cualquier navegador moderno sin instalación ni paso de compilación.
  - Un HTML semántico y limpio es la mejor base para reutilizar el sitio en
    la asignatura de Experiencia de Usuario (UX).


3. ACCESIBILIDAD
--------------------------------------------------------------------------------
  - Enlace "Saltar al contenido principal", visible al recibir el foco.
  - Un único <h1> por página y jerarquía de encabezados correcta.
  - Regiones etiquetadas: navegación con aria-label y secciones con
    aria-labelledby.
  - Página actual marcada con aria-current="page" en el menú.
  - Botón de menú con aria-controls y aria-expanded; el icono decorativo se
    oculta a los lectores de pantalla con aria-hidden.
  - Foco visible en todos los elementos interactivos (:focus-visible).
  - Texto alternativo descriptivo en todas las imágenes.
  - Cambios de idioma marcados con lang="en" (títulos en inglés).
  - Tabla de datos con <caption>, <thead>/<tbody> y scope="col".
  - <audio> y <video> con mensaje y enlace de descarga como alternativa.
  - Se respeta la preferencia del usuario de reducir animaciones.


4. ESTRUCTURA DE CARPETAS
--------------------------------------------------------------------------------
  Practica2/
  ├─ index.html
  ├─ sobre-mi.html
  ├─ musica.html
  ├─ cine-series.html
  ├─ viajes.html
  ├─ deportes.html
  ├─ videojuegos.html
  ├─ tecnologia.html
  ├─ css/
  │  └─ estilos.css
  ├─ js/
  │  └─ principal.js
  ├─ media/
  │  ├─ foto-personal.jpg          (fotografía personal)
  │  ├─ musica-extremoduro.jpg     (música)
  │  ├─ cine-piratas.jpg           (cine)
  │  ├─ viaje-egipto.jpg           (viajes y póster del vídeo)
  │  ├─ deporte-balonmano.jpg      (deportes)
  │  ├─ juego-sekiro.jpg           (videojuegos)
  │  ├─ tec-ia.jpg                 (tecnología)
  │  ├─ video-viajes.mp4           (vídeo de ejemplo)
  │  └─ podcast.wav                (audio de ejemplo)
  └─ readme.txt
