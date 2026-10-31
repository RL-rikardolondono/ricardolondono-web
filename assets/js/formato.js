/* Funciones compartidas: las usa el sitio, el panel de administración y el generador inicial.
   Mantener aquí todo lo que convierte datos en HTML para que el resultado sea siempre igual. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Formato = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var SITIO = 'https://ricardolondono.com';

  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Convierte texto escrito por el autor en HTML seguro.
  // Reglas: línea en blanco = nuevo párrafo; "## " = subtítulo; "- " = viñeta;
  // **texto** = negrita; las direcciones web se vuelven enlaces.
  function enlazar(t) {
    t = esc(t);
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g, function (u) {
      var externo = u.indexOf(SITIO) !== 0;
      return '<a href="' + u + '"' + (externo ? ' target="_blank" rel="noopener"' : '') + '>' + u + '</a>';
    });
    return t;
  }

  function textoAHtml(texto) {
    var bloques = String(texto || '').replace(/\r/g, '').split(/\n\s*\n/);
    var html = [];
    bloques.forEach(function (b) {
      b = b.trim();
      if (!b) return;
      var lineas = b.split('\n');
      if (lineas.every(function (l) { return /^\s*[-•]\s+/.test(l); })) {
        html.push('<ul>' + lineas.map(function (l) { return '<li>' + enlazar(l.replace(/^\s*[-•]\s+/, '')) + '</li>'; }).join('') + '</ul>');
      } else if (/^##\s+/.test(b) && lineas.length === 1) {
        html.push('<h2>' + enlazar(b.replace(/^##\s+/, '')) + '</h2>');
      } else {
        html.push('<p>' + lineas.map(enlazar).join('<br>') + '</p>');
      }
    });
    return html.join('\n');
  }

  function textoPlano(texto, max) {
    var t = String(texto || '').replace(/^##\s+/gm, '').replace(/^\s*[-•]\s+/gm, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    if (max && t.length > max) t = t.slice(0, max).replace(/\s+\S*$/, '') + '…';
    return t;
  }

  function fechaLarga(iso) {
    if (!iso) return '';
    var p = String(iso).slice(0, 10).split('-');
    if (p.length < 3) return '';
    return parseInt(p[2], 10) + ' de ' + MESES[parseInt(p[1], 10) - 1] + ' de ' + p[0];
  }

  // etiquetaFecha: texto propio (ej. «Mayo de 2024»); null = no mostrar fecha; vacío = fecha completa.
  function etiquetaFecha(pub) {
    if (pub.etiquetaFecha === null) return '';
    if (pub.etiquetaFecha) return pub.etiquetaFecha;
    return fechaLarga(pub.fecha);
  }

  function slugify(t) {
    return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');
  }

  function idYoutube(url) {
    var m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
    return m ? m[1] : '';
  }

  function ordenar(pubs) {
    return pubs.slice().sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)); });
  }

  var VERSION = '3';

  // ---------- Armazón común de todas las páginas ----------
  var MENU = [
    ['inicio', '/', 'Inicio'],
    ['sobre', '/#sobre-mi', 'Sobre mí'],
    ['investigacion', '/#investigacion', 'Investigación'],
    ['articulos', '/articulos/', 'Artículos'],
    ['publicaciones', '/publicaciones/', 'Publicaciones'],
    ['libros', '/libros/', 'Libros'],
    ['galeria', '/galeria/', 'Galería'],
    ['conferencias', '/#conferencias', 'Conferencias']
  ];

  // Perfiles académicos que se muestran como botones y se enlazan para Google (sameAs).
  var PERFILES = [
    ['cvlac', 'CvLAC (Minciencias)'],
    ['orcid', 'ORCID'],
    ['researchgate', 'ResearchGate'],
    ['scholar', 'Google Scholar'],
    ['linkedin', 'LinkedIn']
  ];
  function listaPerfiles(sitio) {
    var p = sitio.perfiles || {}, out = [];
    PERFILES.forEach(function (x) {
      var url = x[0] === 'cvlac' ? (sitio.cvlac || p.cvlac) : p[x[0]];
      if (url && /^https?:\/\//.test(url)) out.push({ clave: x[0], nombre: x[1], url: url });
    });
    return out;
  }
  function perfilesHtml(sitio, clase) {
    var l = listaPerfiles(sitio);
    var botones = l.map(function (x) {
      return '<a class="perfil perfil--' + x.clave + '" href="' + esc(x.url) + '" target="_blank" rel="noopener me">' + esc(x.nombre) + '</a>';
    });
    if (sitio.cvPdf) botones.push('<a class="perfil perfil--cv" href="' + esc(sitio.cvPdf) + '" target="_blank" rel="noopener">⬇ Hoja de vida (PDF)</a>');
    return botones.length ? '<div class="perfiles' + (clase ? ' ' + clase : '') + '">' + botones.join('') + '</div>' : '';
  }

  // Fotos de eventos (portada y fotos) para la galería.
  function fotosEventos(pubs) {
    var out = [];
    ordenar(pubs).forEach(function (p) {
      if (/libro/i.test(p.categoria || '')) return;
      [p.portada].concat(p.fotos || []).forEach(function (f) {
        if (f && out.every(function (x) { return x.src !== f; })) out.push({ src: f, titulo: p.titulo, slug: p.slug });
      });
    });
    return out;
  }
  function esArticulo(p) { return /^art[ií]culo/i.test(p.categoria || ''); }

  function iniciales(nombre) {
    var p = String(nombre || 'RL').split(/\s+/);
    return (p[0] ? p[0][0] : 'R') + (p[1] ? p[1][0] : 'L');
  }

  function cabecera(sitio, activo) {
    var items = MENU.map(function (m) {
      return '<li><a href="' + m[1] + '"' + (m[0] === activo ? ' aria-current="page"' : '') + '>' + m[2] + '</a></li>';
    }).join('');
    return '<a class="salto" href="#contenido">Saltar al contenido</a>\n' +
      '<header class="barra"><div class="contenedor barra__in">' +
      '<a class="marca" href="/"><span class="marca__sello">' + esc(iniciales(sitio.nombre)) + '</span>' +
      '<span class="marca__nombre">' + esc(sitio.nombre) + '<small>' + esc(sitio.titulo) + '</small></span></a>' +
      '<button class="menu-boton" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="menu">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>' +
      '<nav aria-label="Principal"><ul class="menu" id="menu">' + items + '</ul></nav>' +
      '</div></header>';
  }

  function pie(sitio, anio) {
    var c = sitio.contacto || {};
    var redes = [];
    if (c.correo) redes.push('<li><a href="mailto:' + esc(c.correo) + '">' + esc(c.correo) + '</a></li>');
    if (c.whatsapp) redes.push('<li><a href="https://wa.me/57' + esc(String(c.whatsapp).replace(/\D/g, '').replace(/^57(?=\d{10}$)/, '')) + '" target="_blank" rel="noopener">WhatsApp</a></li>');
    if (c.instagram) redes.push('<li><a href="' + esc(c.instagram) + '" target="_blank" rel="noopener">Instagram</a></li>');
    listaPerfiles(sitio).forEach(function (x) { redes.push('<li><a href="' + esc(x.url) + '" target="_blank" rel="noopener me">' + esc(x.nombre) + '</a></li>'); });
    return '<footer class="pie"><div class="contenedor"><div class="pie__in">' +
      '<div><h3>' + esc(sitio.nombre) + '</h3><p>' + esc(sitio.titulo) + '. ' + esc(sitio.frase || '') + '</p></div>' +
      '<div><h3>Secciones</h3><ul>' + MENU.slice(1).map(function (m) { return '<li><a href="' + m[1] + '">' + m[2] + '</a></li>'; }).join('') + '</ul></div>' +
      '<div><h3>Contacto</h3><ul>' + redes.join('') + '<li><a href="https://www.autoreseditores.com/rikardolondono" target="_blank" rel="noopener">Libros en Autores Editores</a></li></ul></div>' +
      '</div><div class="pie__base"><span>© ' + anio + ' ' + esc(sitio.nombre) + ' · <a href="/admin/" rel="nofollow" class="pie__ingresar">Ingresar (equipo)</a></span>' +
      '<span>Sitio desarrollado por <a href="https://skynetgenesis.com" target="_blank" rel="noopener">SkyNet Genesis</a></span></div></div></footer>';
  }

  function documento(sitio, op) {
    var anio = op.anio || new Date().getFullYear();
    var titulo = op.titulo ? op.titulo + ' | ' + sitio.nombre : sitio.nombre + ' — ' + sitio.titulo;
    var imagen = SITIO + (op.imagen || sitio.fotoPortada || '/assets/img/portada.jpg');
    return '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + esc(titulo) + '</title>\n' +
      '<meta name="description" content="' + esc(op.descripcion) + '">\n' +
      (op.noindex ? '<meta name="robots" content="noindex">\n' : '') +
      '<link rel="canonical" href="' + SITIO + op.ruta + '">\n' +
      '<meta property="og:type" content="' + (op.tipo || 'website') + '">\n' +
      '<meta property="og:site_name" content="' + esc(sitio.nombre) + '">\n' +
      '<meta property="og:title" content="' + esc(op.titulo || sitio.nombre) + '">\n' +
      '<meta property="og:description" content="' + esc(op.descripcion) + '">\n' +
      '<meta property="og:url" content="' + SITIO + op.ruta + '">\n' +
      '<meta property="og:image" content="' + esc(imagen) + '">\n' +
      '<meta property="og:locale" content="es_CO">\n' +
      '<meta name="twitter:card" content="summary_large_image">\n' +
      '<meta name="theme-color" content="#0B4F8A">\n' +
      '<link rel="icon" href="/assets/img/icono.svg" type="image/svg+xml">\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
      '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">\n' +
      '<link rel="stylesheet" href="/assets/css/estilo.css?v=' + VERSION + '">\n' +
      (op.extraHead || '') +
      '</head>\n<body>\n' + cabecera(sitio, op.activo) + '\n<main id="contenido">\n' + op.cuerpo + '\n</main>\n' + pie(sitio, anio) +
      '\n<script src="/assets/js/sitio.js?v=' + VERSION + '" defer></script>\n</body>\n</html>\n';
  }

  function tarjeta(p) {
    var fecha = etiquetaFecha(p);
    return '<a class="tarjeta" href="/' + esc(p.slug) + '/" data-categoria="' + esc(p.categoria || '') + '">' +
      '<div class="tarjeta__img"><img src="' + esc(p.portada || '/assets/img/portada.jpg') + '" alt="' + esc(p.titulo) + '" loading="lazy"></div>' +
      '<div class="tarjeta__cuerpo"><div class="tarjeta__meta"><span class="etiqueta">' + esc(p.categoria || 'Publicación') + '</span>' +
      (fecha ? '<span>' + esc(fecha) + '</span>' : '') + '</div>' +
      '<h3>' + esc(p.titulo) + '</h3>' +
      (p.contenido ? '<p>' + esc(textoPlano(p.contenido, 130)) + '</p>' : '') +
      '</div></a>';
  }

  function libroHtml(l) {
    return '<a class="libro" href="' + esc(l.url || '#') + '" target="_blank" rel="noopener">' +
      '<div class="libro__tapa"><img src="' + esc(l.portada) + '" alt="Portada de ' + esc(l.titulo) + '" loading="lazy"></div>' +
      '<span class="libro__titulo">' + esc(l.titulo) + '</span><span class="libro__ver">Ver en la tienda →</span></a>';
  }

  // Artículo científico publicado en una revista: {titulo, fuente, url, pdf}
  function articuloHtml(a) {
    var enlaces = (a.url ? '<a class="boton boton--accion boton--chico" href="' + esc(a.url) + '" target="_blank" rel="noopener">Leer artículo</a>' : '') +
      (a.pdf ? '<a class="boton boton--borde boton--chico" href="' + esc(a.pdf) + '" target="_blank" rel="noopener">⬇ PDF</a>' : '');
    return '<article class="art"><span class="etiqueta">Artículo científico</span><h3>' +
      (a.url ? '<a href="' + esc(a.url) + '" target="_blank" rel="noopener">' + esc(a.titulo) + '</a>' : esc(a.titulo)) + '</h3>' +
      (a.fuente ? '<p class="art__fuente">' + esc(a.fuente) + '</p>' : '') +
      (enlaces ? '<div class="art__enlaces">' + enlaces + '</div>' : '') + '</article>';
  }

  function testimoniosHtml(sitio) {
    var t = (sitio.testimonios || []).filter(function (x) { return x && x.texto; });
    if (!t.length) return '';
    return '<section class="seccion seccion--blanca"><div class="contenedor">' +
      '<div class="seccion__cabeza"><div><span class="antetitulo">Testimonios</span><h2>Lo que dicen las instituciones</h2></div></div>' +
      '<div class="testimonios">' + t.map(function (x) {
        return '<figure class="testimonio"><blockquote>«' + esc(x.texto) + '»</blockquote><figcaption><b>' + esc(x.autor || '') + '</b>' +
          (x.cargo ? '<span>' + esc(x.cargo) + '</span>' : '') + '</figcaption></figure>';
      }).join('') + '</div></div></section>';
  }

  // Formulario para pedir una conferencia (lo envía /assets/js/sitio.js al servicio indicado en contacto.formulario).
  function formularioConferencia(sitio) {
    var c = sitio.contacto || {};
    if (!c.formulario) return '';
    var temas = (sitio.temas || []).map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('');
    return '<form class="form-conf" id="form-conferencia" data-destino="' + esc(c.formulario) + '" data-sitio="' + esc(c.sitioId || 'ricardolondono') + '" novalidate>' +
      '<h3>Solicitar una conferencia</h3>' +
      '<div class="form-conf__fila"><label>Nombre completo *<input name="nombre" required maxlength="120" autocomplete="name"></label>' +
      '<label>Institución *<input name="institucion" required maxlength="160" autocomplete="organization"></label></div>' +
      '<div class="form-conf__fila"><label>Correo *<input name="correo" type="email" required maxlength="160" autocomplete="email"></label>' +
      '<label>Teléfono<input name="telefono" type="tel" maxlength="40" autocomplete="tel"></label></div>' +
      '<div class="form-conf__fila"><label>Ciudad *<input name="ciudad" required maxlength="80"></label>' +
      '<label>Fecha tentativa<input name="fecha" type="date"></label></div>' +
      '<div class="form-conf__fila"><label>Tema<select name="tema"><option value="">Escoja un tema…</option>' + temas + '<option>Otro (lo explico en el mensaje)</option></select></label>' +
      '<label>Modalidad<select name="modalidad"><option>Presencial</option><option>Virtual</option><option>Por definir</option></select></label></div>' +
      '<div class="form-conf__fila"><label>Público<input name="publico" maxlength="120" placeholder="Ej.: docentes, médicos, padres"></label>' +
      '<label>Asistentes (aprox.)<input name="asistentes" type="number" min="1" max="100000"></label></div>' +
      '<label>Mensaje<textarea name="mensaje" maxlength="3000" rows="4"></textarea></label>' +
      '<label class="form-conf__trampa" aria-hidden="true">Deje este campo vacío<input name="web" tabindex="-1" autocomplete="off"></label>' +
      '<button class="boton boton--accion" type="submit">Enviar solicitud</button>' +
      '<p class="form-conf__aviso" role="status" aria-live="polite"></p>' +
      '<p class="form-conf__nota">Sus datos solo se usan para responder esta solicitud.' + (c.correo ? ' También puede escribir a <a href="mailto:' + esc(c.correo) + '">' + esc(c.correo) + '</a>.' : '') + '</p>' +
      '</form>';
  }

  // ---------- Páginas ----------
  function paginaInicio(sitio, pubs, libros, anio) {
    var c = sitio.contacto || {};
    var ultimas = ordenar(pubs).slice(0, 6);
    var dest = (libros.libros || []).filter(function (l) { return l.destacado; }).slice(0, 6);
    var arts = (sitio.articulos || []).filter(function (a) { return a && a.titulo; });
    var form = formularioConferencia(sitio);
    var cifras = (sitio.cifras || []).length ? '<div class="contenedor"><div class="cifras">' + sitio.cifras.map(function (x) {
      return '<div class="cifra"><b>' + esc(x.valor) + '</b><span>' + esc(x.texto) + '</span></div>';
    }).join('') + '</div></div>' : '';
    var grupos = (sitio.investigacion || []).map(function (p) {
      var inner = '<span class="grupo__sello">Minciencias · GrupLAC</span><h3>' + esc(p.nombre) + '</h3>' + (p.texto ? '<p>' + esc(p.texto) + '</p>' : '') + (p.url ? '<span class="grupo__ver">Ver en GrupLAC →</span>' : '');
      return p.url ? '<a class="proyecto" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + inner + '</a>' : '<div class="proyecto">' + inner + '</div>';
    }).join('');
    var cargo = sitio.cargo && sitio.cargo.texto ? (sitio.cargo.url ? '<a class="heroe__cargo" href="' + esc(sitio.cargo.url) + '" target="_blank" rel="noopener">' + esc(sitio.cargo.texto) + '</a>' : '<span class="heroe__cargo">' + esc(sitio.cargo.texto) + '</span>') : '';
    var botonesContacto = [];
    if (c.correo) botonesContacto.push('<a class="boton boton--borde" href="mailto:' + esc(c.correo) + '?subject=' + encodeURIComponent('Invitación a conferencia') + '">Escribir a ' + esc(c.correo) + '</a>');
    if (c.whatsapp) botonesContacto.push('<a class="boton boton--wa" href="https://wa.me/57' + esc(String(c.whatsapp).replace(/\D/g, '').replace(/^57(?=\d{10}$)/, '')) + '" target="_blank" rel="noopener">WhatsApp</a>');
    if (c.instagram) botonesContacto.push('<a class="boton boton--accion" href="' + esc(c.instagram) + '" target="_blank" rel="noopener">Instagram</a>');

    var cuerpo =
      '<section class="heroe"><div class="contenedor heroe__in"><div>' +
      '<p class="heroe__titulo">' + esc(sitio.titulo) + '</p>' +
      '<h1>' + esc(sitio.nombre) + '</h1>' + cargo +
      '<p class="heroe__frase">' + esc(sitio.frase) + '</p>' +
      '<div class="heroe__botones"><a class="boton boton--accion" href="/#investigacion">Investigación</a>' +
      '<a class="boton boton--borde" href="/publicaciones/">Conferencias y publicaciones</a></div></div>' +
      '<div class="heroe__foto"><img src="' + esc(sitio.fotoPortada) + '" alt="' + esc(sitio.nombre) + ' durante una conferencia"></div>' +
      '</div></section>' + cifras +

      '<section class="seccion" id="sobre-mi"><div class="contenedor sobre">' +
      '<div class="sobre__foto"><img src="' + esc(sitio.foto) + '" alt="' + esc(sitio.nombre) + '" loading="lazy"></div>' +
      '<div class="sobre__texto"><span class="antetitulo">Sobre mí</span><h2>Medicina, investigación y docencia al servicio del neurodesarrollo</h2>' +
      textoAHtml(sitio.sobreMi) + perfilesHtml(sitio) +
      '</div></div></section>' +

      (grupos ? '<section class="seccion seccion--blanca" id="investigacion"><div class="contenedor">' +
      '<div class="seccion__cabeza"><div><span class="antetitulo">Investigación</span><h2>Grupos de investigación que lidero</h2>' +
      '<p>Grupos registrados en la plataforma ScienTI – GrupLAC del Ministerio de Ciencia, Tecnología e Innovación de Colombia.</p></div></div>' +
      '<div class="proyectos">' + grupos + '</div></div></section>' : '') +

      seccionesIntermedias(sitio, pubs, libros, ultimas, dest, arts) +

      '<section class="seccion" id="conferencias"><div class="contenedor"><div class="contacto' + (form ? ' contacto--form' : '') + '">' +
      '<div><span class="antetitulo antetitulo--claro">Conferencias</span><h2>Conferencias para su institución</h2><p>' + esc(c.texto) + '</p>' +
      ((sitio.temas || []).length ? '<ul class="temas temas--claro">' + sitio.temas.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
      (form && botonesContacto.length ? '<div class="contacto__botones contacto__botones--fila">' + botonesContacto.join('') + '</div>' : '') +
      '</div>' + (form || '<div class="contacto__botones">' + botonesContacto.join('') + '</div>') + '</div></div></section>';

    var perfiles = listaPerfiles(sitio).map(function (x) { return x.url; });
    if (c.instagram) perfiles.push(c.instagram);
    var persona = { '@context': 'https://schema.org', '@type': 'Person', name: sitio.nombre, jobTitle: sitio.titulo, url: SITIO + '/', image: SITIO + sitio.foto,
      email: (c.correo ? 'mailto:' + c.correo : undefined), sameAs: perfiles.length ? perfiles : undefined,
      knowsAbout: (sitio.temas || []).length ? sitio.temas : undefined };
    var orcid = ((sitio.perfiles || {}).orcid || '').match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/);
    if (orcid) persona.identifier = { '@type': 'PropertyValue', propertyID: 'ORCID', value: orcid[0] };
    return documento(sitio, { ruta: '/', activo: 'inicio', descripcion: sitio.frase, cuerpo: cuerpo, anio: anio,
      extraHead: '<script type="application/ld+json">' + JSON.stringify(persona).replace(/</g, '\\u003c') + '</script>\n' });
  }

  // Secciones entre «Investigación» y «Conferencias», alternando fondo blanco y gris.
  function seccionesIntermedias(sitio, pubs, libros, ultimas, dest, arts) {
    var bloques = [];
    if (arts.length) bloques.push(['articulos', '<div class="seccion__cabeza"><div><span class="antetitulo">Artículos</span><h2>Artículos científicos recientes</h2>' +
      '<p>Revisiones publicadas en acceso abierto.</p></div>' +
      '<a class="boton boton--borde" href="/articulos/">Ver todos los artículos</a></div>' +
      '<div class="arts">' + arts.slice(0, 3).map(articuloHtml).join('') + '</div>']);
    bloques.push(['', '<div class="seccion__cabeza"><div><span class="antetitulo">Publicaciones</span><h2>Conferencias, seminarios y lanzamientos</h2></div>' +
      '<a class="boton boton--borde" href="/publicaciones/">Ver todas</a></div>' +
      (ultimas.length ? '<div class="rejilla">' + ultimas.map(tarjeta).join('') + '</div>' : '<p class="vacio">Pronto habrá publicaciones.</p>')]);
    bloques.push(['', '<div class="seccion__cabeza"><div><span class="antetitulo">Libros</span><h2>Obras destacadas</h2>' +
      '<p>' + (libros.libros || []).length + ' títulos publicados en Autores Editores.</p></div>' +
      '<a class="boton boton--borde" href="/libros/">Ver todos los libros</a></div>' +
      '<div class="libros">' + dest.map(libroHtml).join('') + '</div>']);
    var fotos = fotosEventos(pubs).slice(0, 8);
    if (fotos.length >= 4) bloques.push(['galeria', '<div class="seccion__cabeza"><div><span class="antetitulo">Galería</span><h2>Seminarios y congresos en imágenes</h2></div>' +
      '<a class="boton boton--borde" href="/galeria/">Ver la galería</a></div>' +
      '<div class="galeria galeria--inicio">' + fotos.map(function (f) {
        return '<a class="galeria__foto" href="' + esc(f.src) + '"><img src="' + esc(f.src) + '" alt="' + esc(f.titulo) + '" loading="lazy"></a>';
      }).join('') + '</div>']);
    var t = testimoniosHtml(sitio);
    if (t) bloques.push(['testimonios', t]);
    return bloques.map(function (b, i) {
      if (b[0] === 'testimonios') return b[1].replace('class="seccion seccion--blanca"', 'class="seccion' + (i % 2 ? ' seccion--blanca' : '') + '" id="testimonios"');
      return '<section class="seccion' + (i % 2 ? ' seccion--blanca' : '') + '"' + (b[0] ? ' id="' + b[0] + '"' : '') + '><div class="contenedor">' + b[1] + '</div></section>';
    }).join('');
  }

  function paginaPublicaciones(sitio, pubs, anio) {
    var lista = ordenar(pubs);
    var cats = [];
    lista.forEach(function (p) { if (p.categoria && cats.indexOf(p.categoria) < 0) cats.push(p.categoria); });
    var filtros = cats.length > 1 ? '<div class="filtros" role="group" aria-label="Filtrar por categoría"><button class="filtro" type="button" data-filtro="" aria-pressed="true">Todas (' + lista.length + ')</button>' +
      cats.map(function (c) { return '<button class="filtro" type="button" data-filtro="' + esc(c) + '" aria-pressed="false">' + esc(c) + '</button>'; }).join('') + '</div>' : '';
    var cuerpo = '<section class="seccion"><div class="contenedor">' +
      '<div class="seccion__cabeza"><div><span class="antetitulo">Publicaciones</span><h1>Conferencias, seminarios y lanzamientos</h1>' +
      '<p>Eventos académicos, congresos y novedades editoriales.</p></div></div>' + filtros +
      (lista.length ? '<div class="rejilla" id="lista-publicaciones">' + lista.map(tarjeta).join('') + '</div>' : '<p class="vacio">Pronto habrá publicaciones.</p>') +
      '</div></section>';
    return documento(sitio, { ruta: '/publicaciones/', activo: 'publicaciones', titulo: 'Publicaciones', descripcion: 'Conferencias, seminarios y lanzamientos de libros de ' + sitio.nombre + '.', cuerpo: cuerpo, anio: anio });
  }

  function paginaLibros(sitio, libros, anio) {
    var todos = libros.libros || [];
    var cats = (libros.categorias || []).slice();
    todos.forEach(function (l) { if (cats.indexOf(l.categoria) < 0) cats.push(l.categoria); });
    var grupos = cats.map(function (c) {
      var ls = todos.filter(function (l) { return l.categoria === c; });
      if (!ls.length) return '';
      return '<section class="grupo-libros"><h2>' + esc(c) + '</h2><div class="libros">' + ls.map(libroHtml).join('') + '</div></section>';
    }).join('');
    var cuerpo = '<section class="seccion"><div class="contenedor">' +
      '<div class="seccion__cabeza"><div><span class="antetitulo">Libros</span><h1>Obra publicada</h1>' +
      '<p>' + todos.length + ' títulos disponibles en Autores Editores, en versión impresa y digital.</p></div>' +
      '<a class="boton boton--accion" href="' + esc(libros.tienda || 'https://www.autoreseditores.com/rikardolondono') + '" target="_blank" rel="noopener">Ir a la tienda del autor</a></div>' +
      grupos + '</div></section>';
    return documento(sitio, { ruta: '/libros/', activo: 'libros', titulo: 'Libros', descripcion: 'Libros de ' + sitio.nombre + ': autismo, TDAH, neurodesarrollo, medicina, veterinaria y teología.', cuerpo: cuerpo, anio: anio });
  }

  function paginaPublicacion(sitio, pub, anio) {
    var portada = pub.portada || sitio.fotoPortada;
    var fotos = (pub.fotos || []).map(function (f, i) {
      return '<a class="galeria__foto" href="' + esc(f) + '"><img src="' + esc(f) + '" alt="' + esc(pub.titulo) + ' — foto ' + (i + 1) + '" loading="lazy"></a>';
    }).join('');
    var yt = idYoutube(pub.video);
    var fecha = etiquetaFecha(pub);
    var url = SITIO + '/' + pub.slug + '/';
    var cuerpo = '<article class="articulo">' +
      '<nav class="miga" aria-label="Ruta"><a href="/">Inicio</a> › ' + (esArticulo(pub) ? '<a href="/articulos/">Artículos</a>' : '<a href="/publicaciones/">Publicaciones</a>') + '</nav>' +
      '<div class="articulo__meta"><span class="etiqueta">' + esc(pub.categoria || 'Publicación') + '</span>' + (fecha ? '<span>' + esc(fecha) + '</span>' : '') + '</div>' +
      '<h1>' + esc(pub.titulo) + '</h1>' +
      '<figure class="articulo__portada"><a class="galeria__foto-portada" href="' + esc(portada) + '"><img src="' + esc(portada) + '" alt="' + esc(pub.titulo) + '"></a></figure>' +
      '<div class="articulo__cuerpo">' + textoAHtml(pub.contenido) + '</div>' +
      (yt ? '<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/' + yt + '" title="Video: ' + esc(pub.titulo) + '" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>' : '') +
      (pub.enlace ? '<p class="articulo__enlace"><a class="boton boton--accion" href="' + esc(pub.enlace) + '" target="_blank" rel="noopener">' + esc(pub.textoEnlace || 'Más información') + '</a></p>' : '') +
      (fotos ? '<section class="galeria" aria-label="Fotos del evento">' + fotos + '</section>' : '') +
      '<div class="compartir"><span>Compartir:</span>' +
      '<a class="boton boton--wa" href="https://wa.me/?text=' + encodeURIComponent(pub.titulo + ' ' + url) + '" target="_blank" rel="noopener">WhatsApp</a>' +
      '<a class="boton boton--borde" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '" target="_blank" rel="noopener">Facebook</a>' +
      '<a class="boton boton--borde" href="/publicaciones/">← Todas las publicaciones</a></div>' +
      '</article>';
    return documento(sitio, { ruta: '/' + pub.slug + '/', activo: esArticulo(pub) ? 'articulos' : 'publicaciones', titulo: pub.titulo, tipo: 'article',
      descripcion: textoPlano(pub.contenido, 160) || pub.titulo, imagen: portada, cuerpo: cuerpo, anio: anio });
  }

  function paginaArticulos(sitio, pubs, anio) {
    var arts = (sitio.articulos || []).filter(function (a) { return a && a.titulo; });
    var divul = ordenar(pubs).filter(esArticulo);
    var cuerpo = '<section class="seccion"><div class="contenedor">' +
      '<div class="seccion__cabeza"><div><span class="antetitulo">Artículos</span><h1>Artículos científicos y de divulgación</h1>' +
      '<p>Revisiones científicas publicadas y textos de divulgación sobre autismo, TDAH, neurodesarrollo y otras áreas de la medicina.</p></div></div>' +
      (arts.length ? '<h2 class="subtitulo">Artículos científicos</h2><div class="arts">' + arts.map(articuloHtml).join('') + '</div>' : '') +
      '<h2 class="subtitulo">Divulgación</h2>' +
      (divul.length ? '<div class="rejilla">' + divul.map(tarjeta).join('') + '</div>' : '<p class="vacio">Muy pronto publicaremos aquí artículos de divulgación.</p>') +
      perfilesHtml(sitio, 'perfiles--centro') +
      '</div></section>';
    return documento(sitio, { ruta: '/articulos/', activo: 'articulos', titulo: 'Artículos', descripcion: 'Artículos científicos y de divulgación de ' + sitio.nombre + ' sobre autismo, TDAH y neurodesarrollo.', cuerpo: cuerpo, anio: anio });
  }

  function paginaGaleria(sitio, pubs, anio) {
    var grupos = [];
    fotosEventos(pubs).forEach(function (f) {
      var g = grupos.filter(function (x) { return x.slug === f.slug; })[0];
      if (!g) { g = { slug: f.slug, titulo: f.titulo, fotos: [] }; grupos.push(g); }
      g.fotos.push(f);
    });
    var cuerpo = '<section class="seccion"><div class="contenedor">' +
      '<div class="seccion__cabeza"><div><span class="antetitulo">Galería</span><h1>Seminarios y congresos en imágenes</h1>' +
      '<p>Fotos de conferencias, seminarios y talleres en distintas ciudades del país. Pulse una foto para verla en grande.</p></div></div>' +
      (grupos.length ? grupos.map(function (g) {
        return '<section class="grupo-fotos"><h2><a href="/' + esc(g.slug) + '/">' + esc(g.titulo) + '</a></h2><div class="galeria">' +
          g.fotos.map(function (f, i) { return '<a class="galeria__foto" href="' + esc(f.src) + '"><img src="' + esc(f.src) + '" alt="' + esc(f.titulo) + (g.fotos.length > 1 ? ' — foto ' + (i + 1) : '') + '" loading="lazy"></a>'; }).join('') +
          '</div></section>';
      }).join('') : '<p class="vacio">Pronto habrá fotos.</p>') +
      '</div></section>';
    return documento(sitio, { ruta: '/galeria/', activo: 'galeria', titulo: 'Galería', descripcion: 'Fotos de conferencias, seminarios y congresos de ' + sitio.nombre + '.', cuerpo: cuerpo, anio: anio });
  }

  function pagina404(sitio, anio) {
    var cuerpo = '<section class="seccion"><div class="contenedor" style="text-align:center;max-width:640px">' +
      '<span class="antetitulo">Error 404</span><h1>No encontramos esta página</h1>' +
      '<p>Es posible que la dirección haya cambiado. Puede volver al inicio o ver todas las publicaciones.</p>' +
      '<p class="centro"><a class="boton boton--principal" href="/">Ir al inicio</a> <a class="boton boton--borde" href="/publicaciones/">Publicaciones</a></p>' +
      '</div></section>';
    return documento(sitio, { ruta: '/404.html', titulo: 'Página no encontrada', descripcion: 'Página no encontrada', cuerpo: cuerpo, anio: anio, noindex: true });
  }

  function paginaPrivacidad(sitio, anio) {
    var texto = 'Última actualización: 18 de septiembre de 2026\n\n' +
      'SkyNet es un asistente personal de inteligencia artificial de uso estrictamente privado, desarrollado y utilizado únicamente por Ricardo Londoño para su gestión personal (correo, agenda, documentos de Google Drive y mensajería de Slack). SkyNet no es un producto público ni está disponible para terceros.\n\n' +
      '## Datos que accede\n\n' +
      'Con autorización expresa del propietario mediante OAuth de Google y de Slack, SkyNet puede acceder a: mensajes y borradores de Gmail, archivos de Google Drive, y canales de Slack a los que ha sido invitado. Esta información se usa exclusivamente para responder consultas, redactar borradores y organizar tareas del propietario.\n\n' +
      '## Uso de la información\n\n' +
      'Los datos obtenidos no se comparten con terceros, no se venden, y no se usan para entrenar modelos de forma agregada fuera de esta cuenta. Toda acción de envío de correos o publicación de mensajes requiere confirmación explícita del propietario antes de ejecutarse (modo borrador).\n\n' +
      '## Almacenamiento\n\n' +
      'Los tokens de acceso se almacenan de forma cifrada en la infraestructura privada del propietario (Render.com) y solo son accesibles por el propio sistema de SkyNet.\n\n' +
      '## Contacto\n\n' +
      'Para cualquier pregunta sobre esta política, contactar a contacto@ricardolondono.com.';
    var cuerpo = '<article class="articulo"><h1>SkyNet – Política de Privacidad</h1><div class="articulo__cuerpo">' + textoAHtml(texto) + '</div></article>';
    return documento(sitio, { ruta: '/skynet-politica-de-privacidad/', titulo: 'SkyNet – Política de Privacidad', descripcion: 'Política de privacidad del asistente personal SkyNet.', cuerpo: cuerpo, anio: anio });
  }

  // Devuelve {ruta: contenido} con TODAS las páginas del sitio.
  function generarTodo(sitio, pubsDatos, libros, anio) {
    var pubs = pubsDatos.publicaciones || [];
    var out = {};
    out['index.html'] = paginaInicio(sitio, pubs, libros, anio);
    out['publicaciones/index.html'] = paginaPublicaciones(sitio, pubs, anio);
    out['libros/index.html'] = paginaLibros(sitio, libros, anio);
    out['articulos/index.html'] = paginaArticulos(sitio, pubs, anio);
    out['galeria/index.html'] = paginaGaleria(sitio, pubs, anio);
    out['404.html'] = pagina404(sitio, anio);
    out['skynet-politica-de-privacidad/index.html'] = paginaPrivacidad(sitio, anio);
    pubs.forEach(function (p) { out[p.slug + '/index.html'] = paginaPublicacion(sitio, p, anio); });
    out['sitemap.xml'] = mapaDelSitio(pubs);
    return out;
  }

  function mapaDelSitio(pubs) {
    var urls = ['/', '/articulos/', '/publicaciones/', '/libros/', '/galeria/', '/skynet-politica-de-privacidad/'];
    pubs.forEach(function (p) { urls.push('/' + p.slug + '/'); });
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(function (u) { return '  <url><loc>' + SITIO + u + '</loc></url>'; }).join('\n') + '\n</urlset>\n';
  }

  return {
    esc: esc, textoAHtml: textoAHtml, textoPlano: textoPlano, fechaLarga: fechaLarga,
    etiquetaFecha: etiquetaFecha, slugify: slugify, idYoutube: idYoutube, ordenar: ordenar,
    paginaPublicacion: paginaPublicacion, paginaInicio: paginaInicio, paginaPublicaciones: paginaPublicaciones,
    paginaLibros: paginaLibros, paginaArticulos: paginaArticulos, paginaGaleria: paginaGaleria, listaPerfiles: listaPerfiles, pagina404: pagina404, paginaPrivacidad: paginaPrivacidad,
    generarTodo: generarTodo, mapaDelSitio: mapaDelSitio, SITIO: SITIO, VERSION: VERSION
  };
});
