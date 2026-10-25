/* Páginas internas (autoevaluación, privacidad): header, menú móvil, barra inferior y aparición suave. */
(function(){
'use strict';

/* ═══ Páginas internas: header, menú móvil, barra inferior ═══ */
var header = document.getElementById('header');
var barraMovil = document.getElementById('barra-movil');
function alScroll(){
  var y = window.scrollY;
  if (header) header.classList.toggle('solido', y > 40);
  if (barraMovil) barraMovil.classList.toggle('visible', y > 400);
}
window.addEventListener('scroll', alScroll, { passive: true });
alScroll();

try{
  var menuBtn = document.getElementById('menu-btn');
  var menuMovil = document.getElementById('menu-movil');
  var menuCerrar = document.getElementById('menu-cerrar');
  if (menuBtn && menuMovil){
    var toggleMenu = function(abrir){
      var open = abrir !== undefined ? abrir : !menuMovil.classList.contains('abierto');
      menuMovil.classList.toggle('abierto', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuMovil.setAttribute('aria-hidden', String(!open));
      document.documentElement.classList.toggle('menu-abierto', open);
    };
    menuBtn.addEventListener('click', function(){ toggleMenu(); });
    if (menuCerrar) menuCerrar.addEventListener('click', function(){ toggleMenu(false); menuBtn.focus({ preventScroll: true }); });
    menuMovil.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ toggleMenu(false); }); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') toggleMenu(false); });
  }

  // Posts recientes del menú (mismo blog que el sitio principal)
  var listaPosts = document.getElementById('mm-posts-lista');
  if (listaPosts && window.fetch){
    var q = encodeURIComponent('*[_type == "post"] | order(publishedAt desc)[0...3] { title, slug, publishedAt }');
    fetch('https://zu3r11hb.api.sanity.io/v2021-10-21/data/query/production?query=' + q)
      .then(function(r){ return r.json(); })
      .then(function(d){
        if (!d.result || !d.result.length) return;
        listaPosts.innerHTML = '';
        d.result.forEach(function(post){
          var a = document.createElement('a');
          a.className = 'mm-post'; a.target = '_blank'; a.rel = 'noopener';
          a.href = 'https://kairal.cl/blog.html?slug=' + encodeURIComponent((post.slug && post.slug.current) || '');
          a.appendChild(document.createTextNode(post.title));
          if (post.publishedAt){
            var f = document.createElement('small');
            f.textContent = new Date(post.publishedAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
            a.appendChild(f);
          }
          listaPosts.appendChild(a);
        });
      })
      .catch(function(){});
  }
}catch(e){ console.error('Menú no disponible.', e); }

// Aparición suave de las secciones
var revelables = document.querySelectorAll('.reveal');
var io = null;
if ('IntersectionObserver' in window){
  io = new IntersectionObserver(function(ents){
    ents.forEach(function(en){ if (en.isIntersecting){ en.target.classList.add('visible'); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  revelables.forEach(function(el){ io.observe(el); });
  window.KAIRAL_IO = io;   // lo usa autoevaluacion.js para las tarjetas que arma después
} else {
  revelables.forEach(function(el){ el.classList.add('visible'); });
}

})();
