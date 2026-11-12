/* ============================================================
   Scroll suave con inercia para la rueda del mouse (solo escritorio).
   Cada giro de la rueda mueve un "objetivo" y la página lo alcanza poco a poco, en vez de dar saltos de ~100 px.
   No actúa (y deja el desplazamiento nativo) cuando:
   - no hay mouse (celulares y tablets: el dedo ya tiene su propia inercia) o la ventana mide 920 px o menos;
   - la persona pidió reducir el movimiento, o el ajuste automático marcó el equipo como lento (html.tier-bajo);
   - el gesto es de trackpad (movimientos chicos y seguidos: ya traen su propia inercia), Ctrl+rueda (zoom) o Shift;
   - el puntero está sobre algo con scroll propio que aún puede moverse (panel «Ayuda de Kairal», listas, textos largos);
   - el menú móvil está abierto;
   - el propio efecto se nota pesado: si en su movimiento más del 30 % de los cuadros tardan más de 34 ms, en dos tandas
     seguidas, se apaga solo y devuelve la rueda al navegador durante el resto de la visita (el desplazamiento nativo
     corre fuera del hilo principal y en un equipo lento rinde más que este).
   El teclado, la barra lateral y los enlaces a secciones siguen siendo nativos: si la posición cambia por otro lado, se
   sincroniza sola. No pide cuadros mientras la página está quieta.
============================================================ */
(function(){
'use strict';
if (!window.matchMedia || !window.requestAnimationFrame) return;
if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

var raiz = document.documentElement;
var CLAVE = 'kairal_suave_off';
try { if (sessionStorage.getItem(CLAVE) === '1') return; } catch (e) {}
var apagado = false, tanda = 0, lentos = 0, malas = 0;
var SUAVIDAD = 0.1;                    // fracción del camino que se recorre por cuadro a 60 fps (menor = más inercia)
var actual = window.scrollY, objetivo = actual, propio = Math.round(actual), corre = false, ultimo = 0, ultimoChico = 0, gen = 0;

function activo(){
  return !apagado && window.innerWidth > 920 && !raiz.classList.contains('tier-bajo') && !raiz.classList.contains('menu-abierto') &&
    !(document.body && document.body.classList.contains('reduced'));
}
function maximo(){ return Math.max(0, raiz.scrollHeight - window.innerHeight); }
function acotar(v){ return Math.min(Math.max(v, 0), maximo()); }

// ¿hay un contenedor con scroll propio bajo el puntero que todavía puede moverse en esa dirección?
function scrollPropioEn(el, dy){
  for (var n = el; n && n.nodeType === 1 && n !== document.body && n !== raiz; n = n.parentElement){
    var cs = getComputedStyle(n);
    if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1){
      var puede = dy < 0 ? n.scrollTop > 0 : n.scrollTop + n.clientHeight < n.scrollHeight - 1;
      if (puede || /contain|none/.test(cs.overscrollBehaviorY)) return true;
    }
  }
  return false;
}

// alguien más mueve la página (enlace, teclado, barra lateral): el movimiento propio se corta ya, sin un último
// scrollTo que cancele el desplazamiento nativo
function detener(){
  gen++; corre = false;
  actual = objetivo = window.scrollY; propio = Math.round(actual);
}
function pedir(){ var g = gen; requestAnimationFrame(function(t){ if (g === gen) paso(t); }); }
function vigilar(crudo){
  if (crudo > 250) return;                          // venía de una pausa
  tanda++; if (crudo > 34) lentos++;
  if (tanda < 45) return;
  malas = lentos / tanda > 0.3 ? malas + 1 : 0;
  tanda = 0; lentos = 0;
  if (malas >= 2){
    apagado = true;
    window.scrollTo({ top: objetivo, left: 0, behavior: 'instant' });   // termina el recorrido pedido y entrega la rueda
    detener();
    try { sessionStorage.setItem(CLAVE, '1'); } catch (e) {}
  }
}
function paso(now){
  var crudo = now - ultimo, dt = Math.min(crudo, 64); ultimo = now;
  vigilar(crudo);
  if (apagado) return;
  actual += (objetivo - actual) * (1 - Math.pow(1 - SUAVIDAD, dt / 16.67));
  if (Math.abs(objetivo - actual) < 0.5) actual = objetivo;
  propio = Math.round(actual);
  window.scrollTo({ top: actual, left: 0, behavior: 'instant' });   // 'instant': el CSS tiene scroll-behavior:smooth
  if (actual !== objetivo && !document.hidden) pedir(); else corre = false;
}

window.addEventListener('wheel', function(e){
  if (e.defaultPrevented || e.ctrlKey || e.shiftKey || e.altKey || e.metaKey || !activo()) return;
  var dy = e.deltaY;
  if (!dy || Math.abs(e.deltaX) > Math.abs(dy)) return;
  if (e.deltaMode === 1) dy *= 40;
  else if (e.deltaMode === 2) dy *= window.innerHeight;
  else {
    // deltas chicos = trackpad o rueda de alta resolución: nativo (y durante medio segundo después, para no mezclar)
    if (Math.abs(dy) < 50){ ultimoChico = e.timeStamp; return; }
    if (e.timeStamp - ultimoChico < 500) return;
  }
  if (scrollPropioEn(e.target, dy)) return;
  e.preventDefault();
  if (!corre){ actual = objetivo = window.scrollY; }
  objetivo = acotar(objetivo + Math.max(-300, Math.min(300, dy)));
  if (!corre){ corre = true; ultimo = performance.now(); pedir(); }
}, { passive: false });

// si la posición cambió por otro camino (teclado, barra lateral, enlace a una sección), se sigue desde ahí
window.addEventListener('scroll', function(){
  if (Math.abs(window.scrollY - propio) > 2) detener();
}, { passive: true });
window.addEventListener('pointerdown', function(){ if (corre) detener(); }, { passive: true, capture: true });
window.addEventListener('keydown', function(e){ if (corre && !e.ctrlKey && !e.metaKey && !e.altKey) detener(); }, { passive: true, capture: true });
window.addEventListener('resize', function(){ objetivo = acotar(objetivo); });
document.addEventListener('visibilitychange', function(){ if (!document.hidden) detener(); });
})();
