/* Cookies: la medición (Google Analytics) es opcional y viene APAGADA.
   - La primera vez se muestra un aviso con dos opciones; la elección se guarda en este navegador
     (localStorage, clave kairal_cookies: "medicion" o "necesarias").
   - Solo si se acepta se carga Google Analytics. Si ya estaba aceptada y se cambia a
     «solo lo necesario», se apaga y se borran sus cookies.
   - Cualquier elemento con data-cookies-prefs (por ejemplo, el pie de página) reabre el aviso. */
(function(){
'use strict';

var CLAVE = 'kairal_cookies';
var GA_ID = 'G-59B7SRB9L4';
var gaCargado = false;

function leer(){ try { return localStorage.getItem(CLAVE); } catch(e) { return null; } }
function guardar(v){ try { localStorage.setItem(CLAVE, v); } catch(e) {} }

function cargarAnalytics(){
  if (gaCargado) return;
  gaCargado = true;
  window['ga-disable-' + GA_ID] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
}

function borrarCookiesDeAnalytics(){
  window['ga-disable-' + GA_ID] = true;
  var partes = location.hostname.split('.');
  var dominios = ['', location.hostname];
  for (var i = 1; i < partes.length - 1; i++) dominios.push('.' + partes.slice(i).join('.'));
  document.cookie.split(';').forEach(function(c){
    var nombre = c.split('=')[0].trim();
    if (nombre === '_ga' || nombre.indexOf('_ga_') === 0 || nombre === '_gid'){
      dominios.forEach(function(d){
        document.cookie = nombre + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    }
  });
}

/* ─── aviso ─── */
var aviso = null;

function construir(){
  if (aviso) return aviso;
  aviso = document.createElement('div');
  aviso.className = 'cookies-aviso';
  aviso.setAttribute('role', 'dialog');
  aviso.setAttribute('aria-label', 'Preferencias de cookies');
  aviso.setAttribute('aria-hidden', 'true');
  aviso.innerHTML =
    '<p class="cookies-titulo">Cookies</p>' +
    '<p class="cookies-texto">Usamos lo mínimo para que el sitio funcione. Con tu permiso, también Google Analytics para medir cuántas personas lo visitan. ' +
    'No usamos cookies de publicidad. <a href="cookies.html">Más información</a></p>' +
    '<div class="cookies-botones">' +
      '<button type="button" class="btn btn-reserva" data-cookies="medicion">Aceptar medición</button>' +
      '<button type="button" class="btn btn-ghost" data-cookies="necesarias">Solo lo necesario</button>' +
    '</div>';
  document.body.appendChild(aviso);
  aviso.addEventListener('click', function(e){
    var b = e.target.closest('[data-cookies]');
    if (!b) return;
    elegir(b.getAttribute('data-cookies'));
  });
  return aviso;
}

function mostrar(){
  var el = construir();
  el.setAttribute('aria-hidden', 'false');
  // el cuadro entra en el siguiente cuadro para que se vea la transición
  requestAnimationFrame(function(){ el.classList.add('visible'); });
}

function ocultar(){
  if (!aviso) return;
  aviso.classList.remove('visible');
  aviso.setAttribute('aria-hidden', 'true');
}

function elegir(v){
  var antes = leer();
  guardar(v);
  ocultar();
  if (v === 'medicion') cargarAnalytics();
  else if (antes === 'medicion') borrarCookiesDeAnalytics();
  document.dispatchEvent(new CustomEvent('kairal:cookies', { detail: v }));
}

/* ─── arranque ─── */
var actual = leer();
if (actual === 'medicion') cargarAnalytics();
else if (!actual){
  // en la portada se espera a que termine la pantalla de bienvenida
  var intentos = 0;
  (function esperar(){
    var velo = document.documentElement.classList.contains('velado');
    if (velo && intentos++ < 120) return setTimeout(esperar, 500);
    setTimeout(mostrar, 1200);
  })();
}

document.addEventListener('click', function(e){
  var t = e.target.closest('[data-cookies-prefs]');
  if (!t) return;
  e.preventDefault();
  mostrar();
});
})();
