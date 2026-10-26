/* Blog · listado y artículo
   Todo artículo que se publique en Sanity (tipo "post") sale con este mismo formato: no hay nada
   que maquetar a mano. Sin ?slug= se ve el listado; con ?slug=mi-articulo, ese artículo.
   Campos que usa de cada post: title, slug, category, publishedAt, excerpt, image (con alt opcional)
   y body (texto enriquecido: párrafos, títulos h2–h4, listas, citas, enlaces, negrita, cursiva,
   imágenes con pie). Si algún día se agrega otro tipo de bloque, se ignora sin romper la página. */
(function(){
'use strict';

var SANITY_PROJECT_ID = 'zu3r11hb';
var SANITY_DATASET = 'production';
var SANITY_API_URL = 'https://' + SANITY_PROJECT_ID + '.api.sanity.io/v2021-10-21/data/query/' + SANITY_DATASET;
var SITIO = 'https://kairal.cl';
var AGENDA = 'reservar.html';
var raiz = document.getElementById('blog-contenido');
if (!raiz) return;

var FLECHA = '<svg class="btn-reserva-flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
var DUNAS = '<svg class="ae-dunas" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 70 C 160 20 300 20 460 62 C 620 104 760 96 920 56 C 1080 16 1240 28 1440 76 L1440 120 L0 120 Z"/></svg>';
var FLOR = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 46 V24"/><path d="M32 30 q-10-1-13-13 q12 1 13 13"/><path d="M32 24 q10-1 13-13 q-12 1-13 13"/><circle cx="32" cy="16" r="4"/></svg>';

function esc(s){
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function fecha(d){
  if (!d) return '';
  var f = new Date(d);
  return isNaN(f) ? '' : f.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}
function imgUrl(img, ancho){
  var ref = img && img.asset && img.asset._ref;
  if (!ref) return '';
  var partes = ref.replace('image-', '').split('-');
  var formato = partes.pop();
  return 'https://cdn.sanity.io/images/' + SANITY_PROJECT_ID + '/' + SANITY_DATASET + '/' + partes.join('-') + '.' + formato +
    '?w=' + ancho + '&auto=format';
}
function slugDe(p){ return typeof p.slug === 'string' ? p.slug : (p.slug && p.slug.current) || ''; }
function enlaceDe(p){ return 'blog.html?slug=' + encodeURIComponent(slugDe(p)); }
function soloTexto(bloques){
  return (bloques || []).filter(function(b){ return b._type === 'block'; })
    .map(function(b){ return (b.children || []).map(function(c){ return c.text || ''; }).join(''); }).join(' ');
}
function minutosLectura(bloques){
  var palabras = soloTexto(bloques).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palabras / 200));
}
function consulta(query, params){
  var url = SANITY_API_URL + '?query=' + encodeURIComponent(query);
  Object.keys(params || {}).forEach(function(k){ url += '&%24' + k + '=' + encodeURIComponent(JSON.stringify(params[k])); });
  return fetch(url).then(function(r){ if (!r.ok) throw new Error('sanity ' + r.status); return r.json(); }).then(function(d){ return d.result; });
}

/* ─── cuerpo del artículo (texto enriquecido de Sanity → HTML) ─── */
function marcas(hijo, defs){
  var t = esc(hijo.text || '').replace(/\n/g, '<br>');
  (hijo.marks || []).forEach(function(m){
    if (m === 'strong') t = '<strong>' + t + '</strong>';
    else if (m === 'em') t = '<em>' + t + '</em>';
    else if (m === 'underline') t = '<u>' + t + '</u>';
    else if (m === 'code') t = '<code>' + t + '</code>';
    else if (m === 'strike-through') t = '<s>' + t + '</s>';
    else {
      var def = (defs || []).filter(function(d){ return d._key === m; })[0];
      if (def && def._type === 'link' && /^(https?:|mailto:|tel:|\/|#)/i.test(def.href || '')){
        var externo = /^https?:/i.test(def.href) && def.href.indexOf(SITIO) !== 0;
        t = '<a href="' + esc(def.href) + '"' + (externo ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + t + '</a>';
      }
    }
  });
  return t;
}
function cuerpo(bloques){
  if (!bloques || !bloques.length) return '<p>Este artículo todavía no tiene contenido.</p>';
  var html = '', lista = null;
  function cerrar(){ if (lista){ html += '</' + lista + '>'; lista = null; } }
  bloques.forEach(function(b){
    if (b._type === 'image'){
      cerrar();
      var u = imgUrl(b, 1400);
      if (u) html += '<figure><img src="' + esc(u) + '" alt="' + esc(b.alt || '') + '" loading="lazy" decoding="async">' +
        (b.caption ? '<figcaption>' + esc(b.caption) + '</figcaption>' : '') + '</figure>';
      return;
    }
    if (b._type !== 'block') return;
    var texto = (b.children || []).map(function(c){ return marcas(c, b.markDefs); }).join('');
    if (!texto.replace(/<[^>]+>|\s|&nbsp;/g, '')) return;
    if (b.listItem){
      var tipo = b.listItem === 'number' ? 'ol' : 'ul';
      if (lista !== tipo){ cerrar(); html += '<' + tipo + '>'; lista = tipo; }
      html += '<li>' + texto + '</li>';
      return;
    }
    cerrar();
    if (b.style === 'h1' || b.style === 'h2') html += '<h2>' + texto + '</h2>';
    else if (b.style === 'h3') html += '<h3>' + texto + '</h3>';
    else if (b.style === 'h4' || b.style === 'h5' || b.style === 'h6') html += '<h4>' + texto + '</h4>';
    else if (b.style === 'blockquote') html += '<blockquote><p>' + texto + '</p></blockquote>';
    else html += '<p>' + texto + '</p>';
  });
  cerrar();
  return html;
}

/* ─── piezas comunes ─── */
function tarjeta(p, destacada){
  var u = imgUrl(p.image, destacada ? 1200 : 700);
  var img = u ? '<img src="' + esc(u) + '" alt="' + esc((p.image && p.image.alt) || '') + '" loading="lazy" decoding="async">'
              : '<span class="bl-sin-foto">' + FLOR + '</span>';
  return '<a class="bl-card' + (destacada ? ' bl-card--grande' : '') + '" href="' + esc(enlaceDe(p)) + '" data-categoria="' + esc(p.category || '') + '">' +
    '<span class="bl-card-img">' + img + '</span>' +
    '<span class="bl-card-txt">' +
      (p.category ? '<span class="bl-cat">' + esc(p.category) + '</span>' : '') +
      '<span class="bl-card-titulo">' + esc(p.title) + '</span>' +
      (p.excerpt ? '<span class="bl-card-extracto">' + esc(p.excerpt) + '</span>' : '') +
      '<span class="bl-card-pie">' + esc(fecha(p.publishedAt)) + '<span class="bl-card-leer">Leer ' + FLECHA + '</span></span>' +
    '</span></a>';
}
function meta(nombre, valor){
  var m = document.querySelector(nombre);
  if (m) m.setAttribute('content', valor);
}
function estado(titulo, texto){
  raiz.innerHTML = '<section class="ae-hero ae-hero--corto"><div class="ae-hero-int"><p class="eyebrow">Blog</p><h1 class="display">' + esc(titulo) + '</h1>' +
    '<p class="ae-lede">' + esc(texto) + '</p></div>' + DUNAS + '</section>' +
    '<div class="ae-luz"><div class="contenedor"><a class="btn btn-solido" href="blog.html">Ver todos los artículos</a></div></div>';
}

/* ─── listado ─── */
function pintarListado(posts){
  document.title = 'Blog · Kairal';
  if (!posts || !posts.length){
    estado('Pronto, nuevos artículos', 'Estamos preparando contenido de medicina funcional. Mientras tanto, puedes empezar con tu autoevaluación.');
    return;
  }
  var cats = [];
  posts.forEach(function(p){ if (p.category && cats.indexOf(p.category) < 0) cats.push(p.category); });
  raiz.innerHTML =
    '<section class="ae-hero ae-hero--corto"><div class="ae-hero-int">' +
      '<p class="eyebrow">El blog de Kairal</p>' +
      '<h1 class="display">Medicina funcional, <em>explicada en simple.</em></h1>' +
      '<p class="ae-lede">Artículos de la Dra. Yusneily Sánchez para entender qué te dice tu cuerpo: causa raíz, intestino, estrés, sueño y energía.</p>' +
    '</div>' + DUNAS + '</section>' +
    '<div class="ae-luz"><div class="contenedor">' +
      (cats.length > 1 ? '<div class="bl-filtros" role="group" aria-label="Filtrar por tema"><button type="button" class="bl-chip activo" data-cat="">Todos</button>' +
        cats.map(function(c){ return '<button type="button" class="bl-chip" data-cat="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="bl-grid" id="bl-grid">' + posts.map(function(p, i){ return tarjeta(p, i === 0); }).join('') + '</div>' +
      '<p class="bl-vacio" id="bl-vacio" hidden>No hay artículos de este tema todavía.</p>' +
      pie() +
    '</div></div>';
  var chips = raiz.querySelectorAll('.bl-chip'), grid = document.getElementById('bl-grid');
  chips.forEach(function(chip){
    chip.addEventListener('click', function(){
      chips.forEach(function(c){ c.classList.toggle('activo', c === chip); });
      var cat = chip.getAttribute('data-cat'), n = 0;
      grid.querySelectorAll('.bl-card').forEach(function(card, i){
        var ver = !cat || card.getAttribute('data-categoria') === cat;
        card.hidden = !ver;
        if (ver){ n++; card.classList.toggle('bl-card--grande', n === 1 && !cat); }
      });
      document.getElementById('bl-vacio').hidden = n > 0;
    });
  });
}

/* cierre común: invitación a conversar */
function pie(){
  return '<aside class="bl-cierre"><div><p class="eyebrow">¿Te reconociste en algo?</p>' +
    '<h2>Conversemos sobre tu caso.</h2>' +
    '<p>Si lo que lees se parece a lo que vives, la consulta de 50 minutos con la Dra. Yusneily es el lugar para entender el porqué.</p></div>' +
    '<div class="bl-cierre-botones"><a class="btn btn-reserva" href="' + AGENDA + '" target="_blank" rel="noopener">Agendemos tu consulta ' + FLECHA + '</a>' +
    '<a class="btn btn-ghost" href="autoevaluacion.html">Empecemos con tu autoevaluación</a></div></aside>';
}

/* ─── artículo ─── */
function pintarArticulo(p, otros){
  var titulo = p.title || 'Artículo';
  var url = SITIO + '/blog.html?slug=' + encodeURIComponent(slugDe(p));
  var portada = imgUrl(p.image, 1600), min = minutosLectura(p.body);
  document.title = titulo + ' · Kairal';
  var desc = (p.excerpt || soloTexto(p.body)).replace(/\s+/g, ' ').trim().slice(0, 155);
  meta('meta[name="description"]', desc);
  meta('#og-title', titulo); meta('#og-desc', desc); meta('#og-type', 'article');
  if (portada) meta('#og-img', portada);
  var canon = document.getElementById('canonical'); if (canon) canon.setAttribute('href', url);
  var ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: titulo, description: desc,
    datePublished: p.publishedAt || undefined, image: portada || undefined, mainEntityOfPage: url,
    author: { '@type': 'Person', name: 'Dra. Yusneily Sánchez', jobTitle: 'Médico funcional' },
    publisher: { '@type': 'Organization', name: 'Kairal', url: SITIO }
  });
  document.head.appendChild(ld);

  var texto = encodeURIComponent(titulo + ' · Kairal ' + url);
  var mas = (otros || []).filter(function(o){ return slugDe(o) !== slugDe(p); }).slice(0, 3);
  raiz.innerHTML =
    '<article class="bl-art">' +
    '<header class="ae-hero ae-hero--corto bl-art-hero"><div class="ae-hero-int">' +
      '<a class="bl-volver" href="blog.html">← Todos los artículos</a>' +
      (p.category ? '<p class="eyebrow">' + esc(p.category) + '</p>' : '<p class="eyebrow">Blog</p>') +
      '<h1 class="display">' + esc(titulo) + '</h1>' +
      '<div class="bl-meta"><span class="bl-autora"><span class="bl-avatar" aria-hidden="true">YS</span>Dra. Yusneily Sánchez</span>' +
        (p.publishedAt ? '<span>' + esc(fecha(p.publishedAt)) + '</span>' : '') +
        '<span>' + min + ' min de lectura</span></div>' +
    '</div>' + DUNAS + '</header>' +
    '<div class="ae-luz"><div class="contenedor bl-art-cont">' +
      (portada ? '<img class="bl-portada" src="' + esc(portada) + '" alt="' + esc((p.image && p.image.alt) || titulo) + '" fetchpriority="high">' : '') +
      '<div class="bl-cuerpo">' + cuerpo(p.body) + '</div>' +
      '<div class="bl-compartir"><span>Compartir</span>' +
        '<a class="bl-comp" href="https://wa.me/?text=' + texto + '" target="_blank" rel="noopener">WhatsApp</a>' +
        '<button type="button" class="bl-comp" id="bl-copiar">Copiar enlace</button></div>' +
      pie() +
      (mas.length ? '<section class="bl-mas"><h2>Sigue leyendo</h2><div class="bl-grid bl-grid--mas">' +
        mas.map(function(o){ return tarjeta(o, false); }).join('') + '</div></section>' : '') +
    '</div></div></article>';

  var copiar = document.getElementById('bl-copiar');
  if (copiar) copiar.addEventListener('click', function(){
    function listo(){ copiar.textContent = '¡Enlace copiado!'; setTimeout(function(){ copiar.textContent = 'Copiar enlace'; }, 2200); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(listo, listo);
    else listo();
  });
}

/* ─── arranque ─── */
var slug = new URLSearchParams(location.search).get('slug');
var CAMPOS = 'title, category, publishedAt, excerpt, image, "slug": slug.current';

if (!slug){
  consulta('*[_type == "post" && defined(slug.current)] | order(publishedAt desc){ ' + CAMPOS + ' }')
    .then(pintarListado)
    .catch(function(){ estado('No pudimos cargar los artículos', 'Inténtalo de nuevo en unos momentos, o escríbenos por WhatsApp.'); });
} else {
  Promise.all([
    consulta('*[_type == "post" && slug.current == $slug][0]{ ' + CAMPOS + ', body }', { slug: slug }),
    consulta('*[_type == "post" && defined(slug.current) && slug.current != $slug] | order(publishedAt desc)[0...3]{ ' + CAMPOS + ' }', { slug: slug }).catch(function(){ return []; })
  ]).then(function(r){
    if (!r[0]){ estado('Artículo no encontrado', 'Este artículo no existe o fue retirado. Mira los demás artículos del blog.'); return; }
    pintarArticulo(r[0], r[1]);
    window.scrollTo(0, 0);
  }).catch(function(){ estado('No pudimos cargar el artículo', 'Inténtalo de nuevo en unos momentos.'); });
}
})();
