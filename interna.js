/* Páginas internas (autoevaluación, privacidad): header, menú móvil, barra inferior y aparición suave. */
(function(){
'use strict';

/* ═══ Páginas internas: header, menú móvil, barra inferior ═══ */
var header = document.getElementById('header');
var barraMovil = document.getElementById('barra-movil');
// En el celular el menú y la barra de abajo se turnan, igual que en la portada (ver onScroll en script.js):
// al bajar se esconde el menú y se ve la barra; al subir vuelve el menú y se esconde la barra.
var mqMovil = window.matchMedia('(max-width: 920px)');
var PASO_NAV = 8, LIMITE_BARRA = 400, navY = Math.max(0, window.scrollY), navBajando = null;
function esconderNav(si){ document.documentElement.classList.toggle('nav-oculta', si); }
function menuYBarra(y){
  if (!barraMovil || document.documentElement.classList.contains('menu-abierto')) return;
  var hMax = document.documentElement.scrollHeight - window.innerHeight;
  var yr = Math.min(Math.max(y, 0), Math.max(hMax, 0));
  if (!mqMovil.matches || yr <= LIMITE_BARRA){
    barraMovil.classList.remove('visible'); esconderNav(false);
    navY = yr; navBajando = null;
    return;
  }
  var d = yr - navY;
  if (Math.abs(d) >= PASO_NAV){ navBajando = d > 0; navY = yr; }
  esconderNav(navBajando === true);
  barraMovil.classList.toggle('visible', navBajando !== false);
}
function alScroll(){
  var y = window.scrollY;
  if (header) header.classList.toggle('solido', y > 40);
  menuYBarra(y);
}
if (header) header.addEventListener('focusin', function(){ esconderNav(false); });   // con teclado, el menú nunca queda oculto
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
          a.href = 'blog/' + encodeURIComponent((post.slug && post.slug.current) || '');
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
