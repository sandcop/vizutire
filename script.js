(function(){
'use strict';

/* ═══ RED DE SEGURIDAD GLOBAL ═══
   Si CUALQUIER módulo falla más abajo, esto garantiza que la persona
   nunca quede atrapada en el preloader con el scroll bloqueado. */
window.addEventListener('error', function(ev){
  try{
    console.error('Kairal: error en la experiencia, activando modo seguro.', ev.error || ev.message);
    document.documentElement.classList.remove('velado');
    var v = document.getElementById('velo');
    if (v){ v.classList.add('fuera'); v.style.display = 'none'; }
  }catch(e){ /* ni el modo seguro puede fallar en silencio, pero no hay más red debajo */ }
});

var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var movil = window.matchMedia('(max-width: 920px)').matches;

/* ═══ DETECCIÓN DE MOTOR DE ANIMACIÓN ═══
   Si el CDN de GSAP/ScrollTrigger no cargó (red bloqueada, offline, caída del CDN),
   degradamos con elegancia al modo estático completo — nunca a una página rota. */
var gsapOK = !!(window.gsap && window.ScrollTrigger);
if (!gsapOK && !reduced){
  console.warn('Kairal: motor de animación no disponible — usando experiencia estática.');
  reduced = true;
}
if (reduced) document.body.classList.add('reduced');

/* ═══ NIVEL DE DISPOSITIVO ═══
   Heurística simple para aligerar partículas y resolución en equipos modestos. */
var tierBajo = (function(){
  var mem = navigator.deviceMemory || 4;
  var nucleos = navigator.hardwareConcurrency || 4;
  var ahorroDatos = !!(navigator.connection && navigator.connection.saveData);
  return mem <= 3 || nucleos <= 4 || ahorroDatos;
})();
var DPR = Math.min(window.devicePixelRatio || 1, tierBajo ? 1.3 : 1.75);
var pagVisible = !document.hidden;
document.addEventListener('visibilitychange', function(){ pagVisible = !document.hidden; });
if (tierBajo) document.documentElement.classList.add('tier-bajo');

/* ═══ BUCLES SOLO CUANDO SE VEN ═══
   Un bucle de animación que sigue pidiendo cuadros fuera de pantalla gasta
   CPU aunque no dibuje nada (con una docena de bucles, el hilo principal
   quedaba ocupado ~65% estando quieto). bucleVisible() corre paso(now, reanudo)
   solo mientras `el` está en pantalla y la pestaña visible; si no, el bucle se
   detiene del todo y vuelve a arrancar al reaparecer. `reanudo` es true en el
   primer cuadro después de una pausa (para no contar el tiempo detenido). */
function bucleVisible(el, paso, margen){
  var vis = false, corriendo = false;
  function tick(now){
    if (!vis || !pagVisible){ corriendo = false; return; }
    var r = reanudo; reanudo = false;
    paso(now, r);
    requestAnimationFrame(tick);
  }
  var reanudo = true;
  function despertar(){
    if (corriendo || !vis || !pagVisible) return;
    corriendo = true; reanudo = true;
    requestAnimationFrame(tick);
  }
  if (el) new IntersectionObserver(function(en){ vis = en[0].isIntersecting; despertar(); },
    { rootMargin: margen || '0px' }).observe(el);
  document.addEventListener('visibilitychange', despertar);
  return { despertar: despertar, visible: function(){ return vis; } };
}

// Pila de fotos de La doctora: cada 2.6s la de atrás pasa al frente (ver
// .foto-inclinada en style.css). Solo corre mientras la pila se ve.
(function(){
  var pila = document.querySelector('.retrato-envoltorio');
  if (!pila || reduced || !('IntersectionObserver' in window)) return;
  var i = 0, timer = 0;
  new IntersectionObserver(function(en){
    clearInterval(timer);
    if (en[0].isIntersecting) timer = setInterval(function(){
      if (document.hidden) return;
      i = (i + 1) % 3; pila.dataset.i = i;
    }, 2600);
  }).observe(pila);
})();

// Lo mismo para las animaciones CSS en bucle (motas, pila de fotos, brillo del
// botón, calor de las frases…): la sección fuera de pantalla las pone en pausa
// con .fuera-vista (ver "RENDIMIENTO" al final de style.css).
(function(){
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function(ents){
    ents.forEach(function(e){ e.target.classList.toggle('fuera-vista', !e.isIntersecting); });
  }, { rootMargin: '200px 0px' });
  // toda sección de primer nivel (algunas van dentro de .zona-luz), las motas de .zona-luz y el pie
  [].slice.call(document.querySelectorAll('section, .motas, body > footer')).filter(function(s){
    return !(s.parentElement && s.parentElement.closest('section'));
  }).forEach(function(s){ io.observe(s); });
})();

/* ---------- utilidades ---------- */
function lerp(a,b,t){ return a + (b-a)*t; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function hash(n){ var x = Math.sin(n*127.1 + 311.7)*43758.5453; return x - Math.floor(x); }
// ScrollTrigger.refresh() recalcula todos los triggers de la página y, para
// medir bien los que usan 'top top'/'bottom bottom', internamente mueve el
// scroll de un lado a otro y al final intenta restaurar la posición previa
// -pero si el usuario sigue scrolleando MIENTRAS eso ocurre (típico: unos
// segundos después de cargar, o en móvil cuando la barra de direcciones
// aparece/desaparece y dispara un 'resize'), la posición que GSAP restaura
// puede quedar desfasada de dónde el usuario está realmente parado, y el
// hero (o cualquier sección) puede terminar "atascado" varios cientos de
// px más abajo de donde el usuario intentaba estar. Capturar y reimponer
// el scroll nosotros mismos, justo después del refresh, hace que esa
// restauración interna de GSAP quede sin efecto pase lo que pase adentro.
//
// El "reimponer" tiene que ser INSTANTÁNEO, no animado: como el sitio tiene
// html{scroll-behavior:smooth} en el CSS, CUALQUIER scrollTo (el nuestro Y
// el que haga GSAP puertas adentro durante el refresh) se anima de a poco
// en vez de saltar -y si el usuario sigue moviendo la rueda mientras esa
// animación de ~1s todavía corre, el resultado final queda peleado entre
// ambos y la página termina "atascada" a mitad de camino. Apagar
// scroll-behavior mientras dura el refresh fuerza que todo salto sea
// instantáneo, sin dejarle tiempo al usuario de interferir.
function refrescarScrollTrigger(){
  if (!window.ScrollTrigger) return;
  var y = window.scrollY;
  var htmlEl = document.documentElement;
  var comportamientoPrevio = htmlEl.style.scrollBehavior;
  htmlEl.style.scrollBehavior = 'auto';
  ScrollTrigger.refresh();
  window.scrollTo(0, y);
  htmlEl.style.scrollBehavior = comportamientoPrevio;
}
function makeNoise(seed){
  return function(x){
    var i = Math.floor(x), f = x - i, u = f*f*(3-2*f);
    return lerp(hash(i+seed*57), hash(i+1+seed*57), u);
  };
}
function hexToRgb(h){
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
}
function mix(c1,c2,t){
  var a=hexToRgb(c1), b=hexToRgb(c2);
  return 'rgb('+Math.round(lerp(a[0],b[0],t))+','+Math.round(lerp(a[1],b[1],t))+','+Math.round(lerp(a[2],b[2],t))+')';
}

var lanzarHero = null;
var COL = { tinta:'#081F1D', teal:'#0E7C6B', bruma:'#7FB5AB', arena:'#EDE5D6', duna:'#C9B79A', flor:'#C75C84', alba:'#F2A65A', noche:'#03100E' };

/* ============================================================
   1 · TERRENO (Actos 1–2)
============================================================ */
var terreno = (function(){
  var cv = document.getElementById('lienzo-terreno');
  var ctx = cv.getContext('2d');
  var W=0, H=0, dawn = 0, scrollP = 0, visible = true, dawnT0 = null;
  var n1 = makeNoise(1), n2 = makeNoise(2), n3 = makeNoise(3), nh = makeNoise(9);
  var polvo = [];

  function resize(){
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W*DPR; cv.height = H*DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);
    capaCielo.width = capaVineta.width = cv.width; capaCielo.height = capaVineta.height = cv.height;
    claveCielo = '';
    pintarVineta();
    polvo = [];
    var nP = Math.round((movil ? 22 : 46) * (tierBajo ? 0.55 : 1));
    for (var i=0;i<nP;i++){
      polvo.push({ x:Math.random()*W, y:Math.random()*H*0.8, r:Math.random()*1.6+0.4, s:Math.random()*0.25+0.06, ph:Math.random()*6.28 });
    }
  }

  // Recorre la silueta: en escritorio, segmentos rectos; en mobile, curvas que pasan
  // por el punto medio de cada par (sin quiebres). conLinea: continúa un camino ya iniciado.
  function trazarCurva(p, continuar){
    var n = p.length;
    if (!movil){
      for (var i=0;i<n;i++){ if (i===0 && !continuar) ctx.moveTo(p[i][0], p[i][1]); else ctx.lineTo(p[i][0], p[i][1]); }
      return;
    }
    if (continuar) ctx.lineTo(p[0][0], p[0][1]); else ctx.moveTo(p[0][0], p[0][1]);
    for (var j=1;j<n-1;j++){
      ctx.quadraticCurveTo(p[j][0], p[j][1], (p[j][0]+p[j+1][0])/2, (p[j][1]+p[j+1][1])/2);
    }
    ctx.lineTo(p[n-1][0], p[n-1][1]);
  }
  function ridge(noiseFn, y0, amp, freq, t, harsh, color, rim){
    // En mobile el ancho es poco: con la misma frecuencia y altura que en escritorio
    // las crestas quedan angostas y altas (picudas). Ahí las ondulaciones son más
    // anchas y bajas, casi sin el temblor fino, y el trazo se suaviza con curvas.
    if (movil){ freq *= 0.6; amp *= 0.7; harsh *= 0.15; }
    var pasos = movil ? 56 : 130;
    ctx.beginPath();
    ctx.moveTo(0, H);
    var puntos = [];
    for (var i=0;i<=pasos;i++){
      var x = (i/pasos)*W;
      var y = y0
        + (noiseFn(i/pasos*freq + t*0.04) - 0.5) * amp
        + (nh(i/pasos*freq*6) - 0.5) * amp * 0.55 * harsh
        + Math.sin(t*0.6 + i*0.18) * 1.6;
      puntos.push([x,y]);
    }
    trazarCurva(puntos, true);
    ctx.lineTo(W,H);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (rim > 0.01){
      ctx.beginPath();
      trazarCurva(puntos, false);
      ctx.strokeStyle = 'rgba(242,166,90,'+(rim).toFixed(3)+')';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }

  // Cielo + sol y viñeta son degradados a pantalla completa: se pintan en
  // lienzos aparte y cada cuadro solo los copia. El cielo se rehace solo si
  // cambió el amanecer o el scroll; la viñeta, solo al cambiar el tamaño.
  var capaCielo = document.createElement('canvas'), capaVineta = document.createElement('canvas');
  var claveCielo = '';
  function enCapa(capa, pintar){
    var real = ctx; ctx = capa.getContext('2d');
    ctx.setTransform(DPR,0,0,DPR,0,0); ctx.clearRect(0,0,W,H);
    pintar(); ctx = real;
  }
  function copiarCapa(capa){
    ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(capa, 0, 0); ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  function pintarVineta(){
    enCapa(capaVineta, function(){
      var v = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35, W/2,H/2,Math.max(W,H)*0.75);
      v.addColorStop(0,'rgba(0,0,0,0)');
      v.addColorStop(1,'rgba(3,16,14,0.5)');
      ctx.fillStyle = v;
      ctx.fillRect(0,0,W,H);
    });
  }
  var ultimoT = -1;
  function draw(t){
    // mood: hero (p<0.15) cálido; síntomas: se oscurece y endurece; cierre: penumbra contenida
    var dureza = clamp((scrollP-0.12)/0.5, 0, 1);
    var penumbra = clamp((scrollP-0.1)/0.6, 0, 0.55);
    // el polvo avanza según el tiempo real (el bucle puede ir a menos cuadros en reposo)
    var pasoPolvo = ultimoT < 0 ? 1 : clamp((t - ultimoT) * 60, 0, 4);
    ultimoT = t;

    var clave = dawn.toFixed(3) + '|' + scrollP.toFixed(4);
    if (clave !== claveCielo){ claveCielo = clave; enCapa(capaCielo, function(){ cieloYSol(penumbra); }); }
    copiarCapa(capaCielo);
    dunasPolvoYVineta(t, dureza, penumbra, pasoPolvo);
  }
  function cieloYSol(penumbra){

    // cielo
    var g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, mix(COL.noche, COL.tinta, dawn));
    g.addColorStop(0.55, mix(COL.noche, '#16443D', dawn*(1-penumbra*0.7)));
    g.addColorStop(0.82, mix(COL.tinta, '#5e5440', dawn*(1-penumbra)));
    g.addColorStop(1, mix(COL.tinta, '#7a5a3a', dawn*(1-penumbra)));
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    // sol-alba
    var sx = W*0.68, sy = H*(0.62 + scrollP*0.1);
    var sr = Math.max(W,H)*0.42;
    var sg = ctx.createRadialGradient(sx,sy,0,sx,sy,sr);
    var albaA = 0.5*dawn*(1-penumbra*1.4);
    if (albaA > 0){
      sg.addColorStop(0,'rgba(242,166,90,'+albaA.toFixed(3)+')');
      sg.addColorStop(0.4,'rgba(242,166,90,'+(albaA*0.32).toFixed(3)+')');
      sg.addColorStop(1,'rgba(242,166,90,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0,0,W,H);
    }
  }
  function dunasPolvoYVineta(t, dureza, penumbra, pasoPolvo){
    // dunas (3 capas) — la cámara baja con scroll: dunas suben
    var sube = scrollP * H * 0.16;
    ridge(n1, H*0.66 - sube*0.45, H*0.085, 3.0, t,      dureza*0.5, mix('#143B35','#0e2a25', dureza), 0.20*dawn*(1-penumbra));
    ridge(n2, H*0.76 - sube*0.75, H*0.105, 4.2, t*1.15, dureza*0.8, mix('#0E2C28','#0a201d', dureza), 0.10*dawn*(1-penumbra));
    ridge(n3, H*0.87 - sube,      H*0.12,  5.6, t*1.3,  dureza,     mix('#091F1C','#061512', dureza), 0);

    // polvo en suspensión
    ctx.fillStyle = 'rgba(237,229,214,0.14)';
    for (var i=0;i<polvo.length;i++){
      var p = polvo[i];
      p.x += p.s * pasoPolvo; p.y += Math.sin(t*0.7+p.ph)*0.08 * pasoPolvo;
      if (p.x > W+4) p.x = -4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.28);
      ctx.fill();
    }

    // viñeta
    copiarCapa(capaVineta);
  }

  resize();
  window.addEventListener('resize', resize);

  if (reduced){
    dawn = 1;
    draw(0);
  } else {
    // amanecer al cargar
    var t0 = performance.now(), ultimoCuadro = 0, ultimaP = -1;
    bucleVisible(cv.closest('.acto-superficie'), function(now){
      var t = (now - t0)/1000;
      var amaneciendo = dawnT0 !== null && now - dawnT0 < 2700;
      if (dawnT0 !== null){
        dawn = clamp((now - dawnT0)/2600, 0, 1);
        dawn = 1 - Math.pow(1-dawn, 3); // expo-ish
      }
      // las dunas se mecen muy despacio: sin scroll ni amanecer en curso, ~30 cuadros/s alcanzan
      if (!amaneciendo && scrollP === ultimaP && now - ultimoCuadro < 32) return;
      ultimoCuadro = now; ultimaP = scrollP;
      draw(t);
    });
  }
  return {
    setP: function(p){ scrollP = p; },
    amanecer: function(){ if (dawnT0 === null) dawnT0 = performance.now(); }
  };
})();

/* ============================================================
   1b · GOTA DE FONDO (Acto 4 — animada con el scroll)
============================================================ */
var gotaFondo = (function(){
  var cv = document.getElementById('lienzo-gota');
  if (!cv) return { setP:function(){} };
  var ctx = cv.getContext('2d');
  var W=0, H=0;
  var tmActual = 0;                 // reloj de la escena, para el reflejo que se desliza en la gota
  var objetivo = 0, P = 0;          // scroll objetivo y suavizado (inercia liquida)
  var visible = false;
  var lastNow = performance.now();
  var lluvia = [], anillos = [];    // interaccion: toca y llueve
  var mx = 0;                        // parallax sutil de mouse

  // En mobile el título ocupa la parte de arriba de la escena: el hilo y la
  // gota nacen debajo de él (si no, la gota se forma encima de las letras).
  var bajoTitulo = 0;
  function medirTitulo(){
    bajoTitulo = 0;
    var head = document.querySelector('.metodo-head');
    if (!movil || !head) return;
    var fin = head.getBoundingClientRect().bottom - cv.getBoundingClientRect().top;
    // el CSS usa este alto para poner la línea «0X / ETAPA» de la tarjeta bajo el título
    cv.parentNode.style.setProperty('--cabeza-bajo', fin.toFixed(0) + 'px');
    bajoTitulo = fin;
  }
  function geo(){
    return {
      x: movil ? W*0.5 : W*0.32,
      yIni: movil ? Math.max(H*0.20, bajoTitulo + 70) : H*0.22,
      yFin: movil ? H*0.52 : H*0.74,
      r: movil ? 14 : 19
    };
  }

  function resize(){
    W = cv.clientWidth; H = cv.clientHeight;
    medirTitulo();
    cv.width = W*DPR; cv.height = H*DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);
    draw(performance.now());
  }

  function gotaPath(r, T){
    ctx.beginPath();
    // casi sin cola (gota en caída libre): esfera apenas ovalada, sin la
    // punta de lágrima -una gota que cae no tiene punta
    if (T < r*1.15){ ctx.ellipse(0, (r-T)/2, r, (r+T)/2, 0, 0, 6.283); return; }
    ctx.moveTo(0,-T);
    ctx.bezierCurveTo( r*0.42, -T*0.5,  r, -r*0.6,  r, 0);
    ctx.bezierCurveTo( r, r*0.56,  r*0.56, r,  0, r);
    ctx.bezierCurveTo(-r*0.56, r, -r, r*0.56, -r, 0);
    ctx.bezierCurveTo(-r, -r*0.6, -r*0.42, -T*0.5, 0, -T);
    ctx.closePath();
  }
  // sx/sy (opcionales): deformación de la gota -oscila al caer por la
  // tensión superficial; sy negativo la invierte (reflejo en el agua).
  function pintaGota(px, py, r, T, alpha, sx, sy){
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(sx || 1, sy || 1);
    // cuerpo: agua clara al centro y borde más oscuro (la refracción
    // oscurece los bordes de una gota real)
    var gd = ctx.createRadialGradient(-r*0.25,-r*0.25,r*0.05, 0,r*0.05,r*1.2);
    gd.addColorStop(0,'rgba(236,250,246,'+(0.9*alpha).toFixed(3)+')');
    gd.addColorStop(0.38,'rgba(170,222,212,'+(0.7*alpha).toFixed(3)+')');
    gd.addColorStop(0.74,'rgba(40,140,124,'+(0.62*alpha).toFixed(3)+')');
    gd.addColorStop(1,'rgba(6,46,40,'+(0.78*alpha).toFixed(3)+')');
    ctx.fillStyle = gd;
    gotaPath(r, T);
    ctx.fill();
    // cáustica: la gota funciona como lente y concentra la luz abajo
    ctx.save();
    gotaPath(r, T); ctx.clip();
    var ca = ctx.createRadialGradient(r*0.12, r*0.58, 0, r*0.12, r*0.58, r*0.62);
    ca.addColorStop(0,'rgba(255,250,232,'+(0.6*alpha).toFixed(3)+')');
    ca.addColorStop(1,'rgba(255,250,232,0)');
    ctx.fillStyle = ca;
    ctx.fillRect(-r*1.2, -T, r*2.4, T + r*1.2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(230,248,243,'+(0.3*alpha).toFixed(3)+')';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // reflejo: antes era un brillo fijo siempre en el mismo punto, por eso
    // la gota en reposo (que es la mayor parte del tiempo, mientras el
    // usuario lee) se veía como un ícono quieto. Ahora recorre lento la
    // superficie -como luz real atrapada en el agua- en vez de quedarse
    // clavado en una esquina.
    var faseReflejo = tmActual * 0.35;
    var rx = Math.cos(faseReflejo) * r*0.3 - r*0.08;
    var ry = Math.sin(faseReflejo) * r*0.22 - r*0.14;
    var brilloReflejo = 0.72 + 0.18 * Math.sin(faseReflejo * 1.7);
    ctx.fillStyle = 'rgba(255,255,255,'+(0.35*brilloReflejo*alpha).toFixed(3)+')';
    ctx.beginPath();
    ctx.ellipse(rx, ry, r*0.2, r*0.32, faseReflejo*0.6, 0, 6.28);
    ctx.fill();
    // y un punto especular nítido dentro del halo
    ctx.fillStyle = 'rgba(255,255,255,'+(0.95*alpha).toFixed(3)+')';
    ctx.beginPath();
    ctx.ellipse(rx - r*0.02, ry - r*0.05, r*0.07, r*0.11, faseReflejo*0.6, 0, 6.28);
    ctx.fill();
    ctx.restore();
  }
  function gotita(px, py, rr, a){
    if (a <= 0.01 || rr <= 0.2) return;
    var g = ctx.createRadialGradient(px - rr*0.3, py - rr*0.3, 0, px, py, rr);
    g.addColorStop(0,'rgba(240,252,248,'+a.toFixed(3)+')');
    g.addColorStop(1,'rgba(127,181,171,'+(a*0.55).toFixed(3)+')');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(px, py, rr, 0, 6.28); ctx.fill();
  }

  function brote(x, y, k, tm){
    if (k <= 0) return;
    var h = (movil?48:74)*k;
    var sway = Math.sin(tm*0.8)*2.5*k;
    ctx.strokeStyle = 'rgba(127,181,171,'+(0.9*k).toFixed(3)+')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x+5*k+sway*0.4, y-h*0.6, x+sway, y-h);
    ctx.stroke();
    var hk = clamp((k-0.3)/0.7, 0, 1);
    if (hk > 0){
      ctx.fillStyle = 'rgba(14,124,107,'+(0.8*hk).toFixed(3)+')';
      var hy = y - h*0.55;
      ctx.beginPath();
      ctx.moveTo(x, hy);
      ctx.quadraticCurveTo(x-20*hk, hy-10*hk, x-25*hk, hy+1);
      ctx.quadraticCurveTo(x-12*hk, hy+8*hk, x, hy);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, hy+8);
      ctx.quadraticCurveTo(x+19*hk, hy-2*hk+8, x+24*hk, hy+9);
      ctx.quadraticCurveTo(x+11*hk, hy+15*hk+2, x, hy+8);
      ctx.fill();
    }
    var fk = clamp((k-0.68)/0.32, 0, 1);
    if (fk > 0){
      ctx.fillStyle = 'rgba(199,92,132,'+(0.95*fk).toFixed(3)+')';
      ctx.beginPath();
      ctx.arc(x+sway, y-h-4.5*fk, 5*fk, 0, 6.28);
      ctx.fill();
      ctx.fillStyle = 'rgba(242,166,90,'+(0.85*fk).toFixed(3)+')';
      ctx.beginPath();
      ctx.arc(x+sway, y-h-4.5*fk, 2*fk, 0, 6.28);
      ctx.fill();
    }
  }

  function draw(now){
    var tm = now/1000;
    tmActual = tm;
    var dt = Math.min(0.05, (now - lastNow)/1000);
    lastNow = now;
    ctx.clearRect(0,0,W,H);

    var g = geo();
    var x = g.x + mx*10, yIni = g.yIni, yFin = g.yFin, r = g.r;

    var p4 = clamp(P,0,1)*4;
    var s = Math.min(3, Math.floor(p4));
    var t = clamp(p4 - s, 0, 1);

    // hilo: viene desde arriba — desciende del mundo anterior
    // (en mobile arranca bajo el título y la línea «0X / ETAPA», para no cruzarlos)
    var yHilo = movil ? Math.max(0, bajoTitulo + 44) : 0;
    var lg = ctx.createLinearGradient(0,yHilo,0,yFin);
    lg.addColorStop(0,'rgba(127,181,171,0.24)');
    lg.addColorStop(0.22,'rgba(127,181,171,0.12)');
    lg.addColorStop(0.55,'rgba(127,181,171,0.2)');
    lg.addColorStop(1,'rgba(127,181,171,0.32)');
    ctx.strokeStyle = lg; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x,yHilo); ctx.lineTo(x,yFin); ctx.stroke();

    // perlas con destello que respira
    [0.34,0.55,0.72].forEach(function(f,i){
      var py = yIni + (yFin-yIni)*f;
      var pr = 4 - i*0.6;
      var brillo = 0.55 + 0.2*Math.sin(tm*0.7 + i*2.1);
      var g1 = ctx.createRadialGradient(x-pr*0.35, py-pr*0.35, 0, x, py, pr);
      g1.addColorStop(0,'rgba(238,252,248,'+brillo.toFixed(3)+')');
      g1.addColorStop(0.6,'rgba(127,181,171,0.45)');
      g1.addColorStop(1,'rgba(14,124,107,0.3)');
      ctx.fillStyle = g1;
      ctx.beginPath(); ctx.arc(x,py,pr,0,6.28); ctx.fill();
    });

    // estanque que CRECE con cada gota (acumulativo)
    var poolK = clamp((s + clamp((t-0.5)*2, 0, 1)) / 4, 0, 1);
    var resp = 1 + 0.02*Math.sin(tm*0.5);
    var pw = (movil?64:108)*(1 + poolK*0.85)*resp;
    var sup = ctx.createRadialGradient(x,yFin+6,0,x,yFin+6,pw);
    sup.addColorStop(0,'rgba(127,181,171,'+(0.13+poolK*0.1).toFixed(3)+')');
    sup.addColorStop(1,'rgba(127,181,171,0)');
    ctx.fillStyle = sup;
    ctx.beginPath(); ctx.ellipse(x,yFin+6,pw,pw*0.22,0,0,6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(127,181,171,'+(0.22+poolK*0.12).toFixed(3)+')';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x,yFin+6,pw*0.82,pw*0.17,0,0,6.28); ctx.stroke();
    // ondas ambientales: el charco "respira" solo con el reloj de la
    // escena, no solo cuando cae la gota -si no, entre etapas (que es la
    // mayor parte del tiempo) se ve como un dibujo fijo. Tres ondas en
    // bucle, desfasadas entre sí, que nacen en el borde del charco y se
    // expanden desvaneciéndose.
    for (var oi = 0; oi < 3; oi++){
      var faseOnda = ((tm/3.2) + oi/3) % 1;
      var radioOnda = pw * (0.55 + faseOnda*0.9);
      var alphaOnda = (1 - faseOnda) * 0.16;
      if (alphaOnda <= 0.01) continue;
      ctx.strokeStyle = 'rgba(159,216,204,'+alphaOnda.toFixed(3)+')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, yFin+6, radioOnda, radioOnda*0.22, 0, 0, 6.28);
      ctx.stroke();
    }
    // anillos persistentes de etapas completadas
    for (var pk=0; pk<s; pk++){
      ctx.strokeStyle = 'rgba(127,181,171,0.1)';
      ctx.beginPath();
      ctx.ellipse(x, yFin+6, pw*0.5 + pk*13, (pw*0.5+pk*13)*0.2, 0, 0, 6.28);
      ctx.stroke();
    }

    // ── ciclo de la gota de esta etapa ──
    // t 0→FORMA: se forma colgada del hilo · FORMA→CAE: cae con gravedad ·
    // CAE→1: impacto (destello, corona, gotitas, chorro de rebote, ondas)
    var FORMA = 0.24, CAE = 0.56, u = movil ? 0.62 : 1, ys = yFin + 6;
    if (t < FORMA){
      var ft = t/FORMA, e = ft*ft*(3-2*ft);
      var rr = r*(0.35 + 0.7*e);
      var Tf = rr*(1.0 + 1.15*e);                 // más pesada, más estirada
      var corte = clamp((ft-0.72)/0.28, 0, 1);    // el cuello se afina y se corta
      var cyF = yIni + Tf + 7*corte*corte;
      var swF = Math.sin(tm*0.9)*1.2*e + Math.sin(tm*14)*0.6*corte; // tiembla antes de soltarse
      if (corte < 1){
        var cu = 1 - corte;
        ctx.strokeStyle = 'rgba(190,235,226,'+(0.55*cu).toFixed(3)+')';
        ctx.lineWidth = 0.6 + 2.6*cu*e;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, yIni); ctx.lineTo(x + swF*0.5, cyF - Tf + 1); ctx.stroke();
      }
      pintaGota(x + swF, cyF, rr, Tf, 0.6 + 0.4*e, 1 - 0.07*e, 1 + 0.07*e);

    } else if (t < CAE){
      var tf = (t-FORMA)/(CAE-FORMA);
      var y0 = yIni + r*2.25, y1 = ys - r*0.95;
      var yDrop = y0 + tf*tf*(y1 - y0);           // gravedad: aceleración constante
      var vel = tf;
      // al soltarse pierde la cola y queda esférica, oscilando (tensión superficial)
      var cola = Math.pow(1 - clamp(tf/0.32, 0, 1), 3);
      var Tc = r*(1 + 1.05*cola);
      var osc = Math.sin(tf*24)*Math.exp(-tf*4.5)*0.17;
      // la gotita que queda en la punta del hilo se recoge
      if (tf < 0.3){ var sk = 1 - tf/0.3; pintaGota(x, yIni + 2 + 3*sk, r*0.24*sk, r*0.3*sk, sk); }
      // halo
      var gl = ctx.createRadialGradient(x,yDrop,0,x,yDrop,r*4.2);
      gl.addColorStop(0,'rgba(127,181,171,0.2)');
      gl.addColorStop(1,'rgba(127,181,171,0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(x,yDrop,r*4.2,0,6.28); ctx.fill();
      // estela: más larga cuanto más rápido cae
      var largo = 8 + 90*vel*vel;
      var est = ctx.createLinearGradient(0, yDrop - Tc - largo, 0, yDrop - Tc*0.4);
      est.addColorStop(0,'rgba(190,235,226,0)');
      est.addColorStop(1,'rgba(190,235,226,'+(0.3*vel).toFixed(3)+')');
      ctx.strokeStyle = est; ctx.lineWidth = 0.8 + 1.4*vel; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, yDrop - Tc - largo); ctx.lineTo(x, yDrop - Tc*0.4); ctx.stroke();
      // su reflejo aparece en el agua a medida que se acerca
      var cerca = clamp((tf-0.5)/0.5, 0, 1);
      if (cerca > 0){
        pintaGota(x, ys + (ys - yDrop)*0.22 + r*0.4, r*0.85, Tc*0.85, 0.22*cerca, 1 - osc, -0.32*(1 + osc));
      }
      pintaGota(x, yDrop, r, Tc, 1, 1 - osc, 1 + osc);

    } else {
      var rt = (t-CAE)/(1-CAE);
      // destello del impacto
      if (rt < 0.16){
        var fk = 1 - rt/0.16;
        var fl = ctx.createRadialGradient(x, ys, 0, x, ys, 46*u);
        fl.addColorStop(0,'rgba(236,250,246,'+(0.55*fk).toFixed(3)+')');
        fl.addColorStop(1,'rgba(236,250,246,0)');
        ctx.fillStyle = fl;
        ctx.beginPath(); ctx.ellipse(x, ys, 46*u, 14*u, 0, 0, 6.28); ctx.fill();
      }
      // ondas: cresta clara + valle oscuro, se separan y se desvanecen
      for (var k=0;k<5;k++){
        var rr2 = clamp(rt*1.05 - k*0.12, 0, 1);
        if (rr2 <= 0) continue;
        var eo = 1 - Math.pow(1-rr2, 2);
        var rad = (16 + eo*200)*u;
        var al = (1-eo);
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(4,30,26,'+(al*0.4).toFixed(3)+')';
        ctx.beginPath(); ctx.ellipse(x, ys + 1.6, rad*0.95, rad*0.95*0.23, 0, 0, 6.28); ctx.stroke();
        ctx.strokeStyle = 'rgba(200,240,230,'+(al*0.55 + 0.04).toFixed(3)+')';
        ctx.beginPath(); ctx.ellipse(x, ys, rad, rad*0.23, 0, 0, 6.28); ctx.stroke();
      }
      // corona: un anillo de gotitas que sube sobre paredes de agua y cae
      if (rt < 0.42){
        var ck = rt/0.42, hc = Math.sin(ck*Math.PI);
        for (var ci=0; ci<14; ci++){
          var ac = ci/14*6.283 + 0.2;
          var rc = (12 + ck*30)*u;
          var bx = x + Math.cos(ac)*rc, by = ys + Math.sin(ac)*rc*0.23;
          var tx = x + Math.cos(ac)*rc*1.12, ty = by - hc*(14 + hash(s*13+ci)*14)*u;
          var aC = (1-ck);
          ctx.strokeStyle = 'rgba(200,240,230,'+(aC*0.14).toFixed(3)+')';
          ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
          gotita(tx, ty, (1.1 + hash(s*17+ci)*1.5)*(1 - ck*0.4)*u + 0.4, aC*0.9);
        }
      }
      // gotitas lanzadas en parábola hacia arriba; al caer dejan su onda
      for (var gi=0; gi<7; gi++){
        var dir = gi/6*2 - 1;                            // -1 izquierda … 1 derecha
        var vx = dir*(36 + hash(s*7+gi)*40)*u;
        var alto = (60 + hash(s*11+gi)*70)*u;
        // profundidad: unas caen más cerca (más abajo) y otras más lejos
        var vz = (hash(s*19+gi) - 0.5)*30*u;
        var tg = (rt - 0.03)/0.55;
        if (tg <= 0) continue;
        if (tg < 1){
          gotita(x + vx*tg, ys + vz*tg - alto*4*tg*(1-tg), (1.3 + hash(s*5+gi)*1.4)*u + 0.3, 0.85);
        } else {
          var tl = (tg - 1)/0.6;
          if (tl < 1){
            ctx.strokeStyle = 'rgba(190,235,226,'+((1-tl)*0.22).toFixed(3)+')';
            ctx.lineWidth = 0.8;
            var rl = (2 + tl*22)*u;
            ctx.beginPath(); ctx.ellipse(x + vx, ys + vz, rl, rl*0.23, 0, 0, 6.28); ctx.stroke();
          }
        }
      }
      // chorro de rebote (Worthington): sube, se afina y suelta una gotita
      var jt = clamp((rt-0.14)/0.5, 0, 1);
      if (jt > 0 && jt < 1){
        var jh = Math.sin(jt*Math.PI)*(54*u);
        var jw = (4.5 - 2.5*jt)*u;
        var jg = ctx.createLinearGradient(0, ys - jh, 0, ys);
        jg.addColorStop(0,'rgba(225,246,240,0.8)');
        jg.addColorStop(1,'rgba(127,181,171,0.3)');
        ctx.fillStyle = jg;
        ctx.beginPath();
        ctx.moveTo(x - jw*1.8, ys);
        ctx.quadraticCurveTo(x - jw*0.5, ys - jh*0.5, x, ys - jh);
        ctx.quadraticCurveTo(x + jw*0.5, ys - jh*0.5, x + jw*1.8, ys);
        ctx.closePath(); ctx.fill();
        if (jt > 0.42){
          // la gotita se desprende de la punta: sigue subiendo y vuelve a caer
          var dt2 = (jt - 0.42)/0.58;
          var py2 = ys - 54*u - 20*u*Math.sin(dt2*Math.PI) + dt2*dt2*54*u;
          pintaGota(x, py2, r*0.3*u + 1, r*0.3*u + 1, 1 - dt2*0.5);
        } else {
          pintaGota(x, ys - jh - r*0.3*u, r*0.3*u + 1, r*0.42*u + 1, jt/0.42);
        }
      }
      var sg = ctx.createRadialGradient(x,ys,0,x,ys,70);
      sg.addColorStop(0,'rgba(242,166,90,'+((1-rt)*0.12).toFixed(3)+')');
      sg.addColorStop(1,'rgba(242,166,90,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(x,ys,70,0,6.28); ctx.fill();
    }

    // brote final: el agua dio fruto (puente hacia la floracion)
    brote(x, yFin+2, clamp((clamp(P,0,1)-0.94)/0.06, 0, 1), tm);

    // amanecer: la luz sube desde abajo — emergemos hacia la superficie
    var albaFin = clamp((clamp(P,0,1) - 0.92)/0.08, 0, 1);
    if (albaFin > 0){
      var ga = ctx.createLinearGradient(0, H, 0, H*0.3);
      ga.addColorStop(0, 'rgba(242,166,90,'+(0.3*albaFin).toFixed(3)+')');
      ga.addColorStop(0.45, 'rgba(237,229,214,'+(0.12*albaFin).toFixed(3)+')');
      ga.addColorStop(1, 'rgba(237,229,214,0)');
      ctx.fillStyle = ga;
      ctx.fillRect(0, 0, W, H);
    }

    // ── lluvia interactiva (toca la escena) ──
    for (var li=lluvia.length-1; li>=0; li--){
      var go = lluvia[li];
      go.v += 700*dt;
      go.y += go.v*dt;
      if (go.y >= yFin){
        anillos.push({ x: go.x, t: 0 });
        lluvia.splice(li,1);
        continue;
      }
      pintaGota(go.x, go.y, go.r, go.r*1.7, 0.8);
    }
    for (var ai=anillos.length-1; ai>=0; ai--){
      var an = anillos[ai];
      an.t += dt;
      if (an.t > 1.3){ anillos.splice(ai,1); continue; }
      var ak = an.t/1.3;
      ctx.strokeStyle = 'rgba(159,216,204,'+((1-ak)*0.45).toFixed(3)+')';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(an.x, yFin+6, 8+ak*70, (8+ak*70)*0.22, 0, 0, 6.28);
      ctx.stroke();
    }
  }

  // toca la escena: llueve
  cv.addEventListener('pointerdown', function(e){
    if (reduced) return;
    var rec = cv.getBoundingClientRect();
    var cx = e.clientX - rec.left, cy = e.clientY - rec.top;
    var g = geo();
    for (var i=0;i<7;i++){
      lluvia.push({
        x: cx + (Math.random()-0.5)*100,
        y: Math.min(cy + (Math.random()-0.5)*30, g.yFin - 40),
        v: 40 + Math.random()*110,
        r: 2 + Math.random()*2.6
      });
    }
    if (lluvia.length > 60) lluvia.splice(0, lluvia.length-60);
    var hint = document.getElementById('metodo-hint');
    if (hint) hint.classList.add('oculto');
  });
  // parallax sutil
  document.addEventListener('mousemove', function(e){
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
  });

  resize();
  window.addEventListener('resize', resize);
  // la tipografía del título llega después del primer cálculo y cambia su alto
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirTitulo);
  window.addEventListener('load', medirTitulo);

  if (!reduced){
    bucleVisible(document.querySelector('.acto-metodo'), function(now, reanudo){
      if (reanudo) lastNow = now;   // no contar el tiempo que estuvo fuera de pantalla
      // 5% por cuadro a 60 fps, pero medido en tiempo real: si el teléfono baja de
      // cuadros (p. ej. mientras entra el texto), la gota NO se pone más lenta
      var dtG = Math.min(0.1, (now - lastNow) / 1000);
      P = lerp(P, objetivo, 1 - Math.pow(0.95, dtG * 60));
      draw(now);
    });
  }

  return {
    // saltar: sin la inercia de setP -para volver a una etapa anterior sin
    // ver la gota "subir" en reversa.
    saltar: function(p){ objetivo = P = p; if (reduced) draw(performance.now()); },
    setP: function(p){
    objetivo = p;
    if (p > 0.03){
      var hint = document.getElementById('metodo-hint');
      if (hint) hint.classList.add('oculto');
    }
    if (reduced){ P = p; draw(performance.now()); }
  } };
})();

/* ============================================================
   2 · NARRATIVA DE SCROLL (GSAP)
============================================================ */
if (gsapOK){
  gsap.registerPlugin(ScrollTrigger);

  // H1 palabra a palabra
  function splitWords(el){
    var nodos = Array.prototype.slice.call(el.childNodes);
    el.innerHTML = '';
    nodos.forEach(function(n){
      if (n.nodeType === 3){
        n.textContent.split(/\s+/).filter(Boolean).forEach(function(w){
          var s = document.createElement('span'); s.className='w'; s.textContent = w;
          el.appendChild(s); el.appendChild(document.createTextNode(' '));
        });
      } else if (n.nodeType === 1){
        var wrap = document.createElement(n.tagName.toLowerCase());
        n.textContent.split(/\s+/).filter(Boolean).forEach(function(w){
          var s = document.createElement('span'); s.className='w'; s.textContent = w;
          wrap.appendChild(s); wrap.appendChild(document.createTextNode(' '));
        });
        el.appendChild(wrap);
      }
    });
    return el.querySelectorAll('.w');
  }

  // Letra a letra, preservando etiquetas anidadas (em, span.calor, etc.)
  // para que sigan con su propio estilo/animación — se usa para el efecto de
  // viento/polvo en los textos que aparecen y se van con el scroll.
  // Las letras de cada palabra se agrupan en un contenedor inline-block: al
  // quedar cada letra suelta como su propia caja, el navegador puede meter
  // un salto de línea entre dos letras cualquiera, incluso a mitad de
  // palabra — el contenedor por palabra lo evita, y solo se puede cortar
  // línea en los espacios reales entre palabras, como corresponde.
  function splitLetters(el){
    var letras = [];
    function procesar(nodo){
      Array.prototype.slice.call(nodo.childNodes).forEach(function(n){
        if (n.nodeType === 3){
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function(trozo){
            if (trozo === '') return;
            if (/^\s+$/.test(trozo)){ frag.appendChild(document.createTextNode(trozo)); return; }
            var palabra = document.createElement('span');
            palabra.className = 'palabra-viento';
            trozo.split('').forEach(function(ch){
              var s = document.createElement('span');
              s.className = 'letra';
              s.textContent = ch;
              palabra.appendChild(s);
              letras.push(s);
            });
            frag.appendChild(palabra);
          });
          nodo.replaceChild(frag, n);
        } else if (n.nodeType === 1){
          procesar(n);
        }
      });
    }
    procesar(el);
    return letras;
  }
  var wsH1 = splitWords(document.getElementById('h1'));
  gsap.set(['#hero-copy .eyebrow', '#hero-copy p:not(.eyebrow)', '.hero-ctas'], {opacity:0, y:24});
  // instantaneo=true: sin animación, para cuando la página se carga con el
  // scroll ya movido a otra sección (el hero no es lo que se ve, así que
  // no tiene sentido reproducir la entrada vistosa). En ambos casos se
  // refresca ScrollTrigger al terminar: tlSup captura el "desde" de sus
  // propios tweens de fundido la primera vez que los evalúa, y si eso pasa
  // antes de que lanzarHero() corra (porque la página cargó ya scrolleada),
  // ese "desde" queda fijo en opacity:0 para siempre — el hero no vuelve a
  // aparecer ni aunque el usuario suba de nuevo hasta ahí. El refresh
  // fuerza a recalcularlo contra el estado ya asentado.
  lanzarHero = function(instantaneo){
    if (instantaneo){
      gsap.set(wsH1, { opacity:1, y:0, filter:'blur(0px)' });
      gsap.set(['#hero-copy .eyebrow', '#hero-copy p:not(.eyebrow)', '.hero-ctas'], { opacity:1, y:0 });
      refrescarScrollTrigger();
      return;
    }
    gsap.to(wsH1, { opacity:1, y:0, filter:'blur(0px)', duration:1.1, stagger:0.08, ease:'power3.out', delay:0.3 });
    gsap.to(['#hero-copy .eyebrow', '#hero-copy p:not(.eyebrow)', '.hero-ctas'],
      {opacity:1, y:0, duration:0.9, stagger:0.14, delay:0.7, ease:'power3.out',
       onComplete: refrescarScrollTrigger});
  };

  // Textos de arena (H1 → espejismos → giro): el texto MISMO se deshace en
  // arena y esa arena arma el texto siguiente. Cada frase se "fotografía"
  // (cada letra con su tipografía, color y posición reales) en un lienzo
  // propio y se corta en una grilla de pedacitos. Al irse, los pedacitos
  // se desprenden de izquierda a derecha y el viento se los lleva como una
  // nube; al llegar la frase siguiente, esos mismos granos vuelan en curva
  // y la arman pedazo a pedazo (también de izquierda a derecha). Recién al
  // completarse se muestra el texto real del DOM.
  //
  // Un pool fijo de granos: el que se desprende de una frase es el mismo
  // que arma la siguiente. Si llega otro pedido a mitad de camino (scroll
  // rápido, scroll hacia atrás), cada grano parte desde donde está ahora.
  //
  // API: mostrar(g) arma el grupo g · soltar(g) deshace el grupo g en nube
  // (solo si g es el que está a la vista o armándose) · medirEnFrio() al
  // redimensionar. Grupos: 0 = H1, 1–5 = espejismos, 6 = giro.
  function construirPolvoTextos(cv, gruposDeLetras, contenedores){
    function verDOM(g, si){ var el = contenedores[g]; if (el) gsap.set(el, { opacity: si ? 1 : 0, y: 0 }); }
    if (!cv || reduced){
      return { medirEnFrio:function(){}, mostrar:function(g){ verDOM(g, true); }, soltar:function(g){ verDOM(g, false); } };
    }
    var ctx = cv.getContext('2d');
    var escenarioEl = document.querySelector('.escenario');
    var W = 0, H = 0, visible = true;
    // equipos modestos: menos granos y pedacitos más grandes (mismo efecto, menos trabajo por cuadro)
    var POOL = tierBajo ? (movil ? 650 : 1300) : (movil ? 1100 : 2200);
    var MAX_CELDAS = tierBajo ? (movil ? 850 : 1600) : (movil ? 1600 : 2800);
    // granos de arena sobre el fondo oscuro del hero: tonos claros y cálidos
    var ARENA = [[226,206,170],[214,190,150],[240,222,190],[200,176,138],[226,206,170],[150,206,190],[244,186,120]];
    var offCv = document.createElement('canvas');
    var offCtx = offCv.getContext('2d', { willReadFrequently: true });
    var grupos = [];   // medición por grupo (se invalida al redimensionar)

    // estado de cada grano (arrays planos: miles de granos, cada cuadro)
    var sx = new Float32Array(POOL), sy = new Float32Array(POOL), tx = new Float32Array(POOL), ty = new Float32Array(POOL);
    var dl = new Float32Array(POOL), bd = new Float32Array(POOL), tam = new Float32Array(POOL);
    var r1 = new Float32Array(POOL), r2 = new Float32Array(POOL), r3 = new Float32Array(POOL);
    var gt = new Int8Array(POOL);      // grupo de texto donde estaba "pegado" al empezar (-1 = suelto)
    var ya = new Uint8Array(POOL);     // ya estaba en su lugar del texto destino
    var ca = new Uint8Array(POOL * 3), cb = new Uint8Array(POOL * 3); // color de partida y de llegada
    for (var i = 0; i < POOL; i++){
      r1[i] = Math.random(); r2[i] = Math.random(); r3[i] = Math.random();
      var u = Math.random();
      tam[i] = u < 0.7 ? 0.8 + Math.random() * 0.6 : 1.4 + Math.random() * 0.9;  // arena fina
      var a = ARENA[(Math.random() * ARENA.length) | 0];
      cb[i * 3] = a[0]; cb[i * 3 + 1] = a[1]; cb[i * 3 + 2] = a[2];
      gt[i] = -1;
    }
    var asentado = 0;   // grupo que el DOM muestra ahora (al cargar: el H1)
    var tr = null;      // transición en curso
    var vistaNube = 0;  // cuánto se ve la nube suelta (se apaga si nadie la usa)

    function sm(t){ t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

    function resize(){
      W = escenarioEl.clientWidth; H = escenarioEl.clientHeight;
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.imageSmoothingEnabled = false;   // pedacitos 1:1, sin suavizado ni costuras
      grupos = [];
    }

    // "Fotografía" del grupo g: cada letra dibujada con su fuente y color
    // reales en un lienzo del tamaño del grupo, y una grilla de pedacitos
    // sobre la tinta, ordenada de izquierda a derecha.
    function medir(g){
      if (grupos[g]) return grupos[g];
      var letras = gruposDeLetras[g] || [];
      var base = escenarioEl.getBoundingClientRect();
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, rects = [];
      for (var i = 0; i < letras.length; i++){
        var r = letras[i].getBoundingClientRect();
        rects.push(r);
        if (!r.width || !letras[i].textContent.trim()) continue;
        x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
      }
      if (x0 > x1) return (grupos[g] = { n: 0, celdas: [] });
      // Línea base real de cada letra: una sonda de tamaño cero sobre la línea
      // de base. Dibujar con textBaseline 'middle' en el centro del rect la
      // dejaba unos píxeles más arriba que el texto real (que "bajaba" al final).
      var sondas = [], bases = [];
      for (var q = 0; q < letras.length; q++){
        var sd = document.createElement('i');
        sd.style.cssText = 'display:inline-block;width:0;height:0';
        letras[q].appendChild(sd); sondas.push(sd);
      }
      for (q = 0; q < letras.length; q++) bases.push(sondas[q].getBoundingClientRect().bottom);
      for (q = 0; q < letras.length; q++) letras[q].removeChild(sondas[q]);
      var pad = 24;
      x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
      // el origen cae en un píxel entero del dispositivo: así cada pedacito se
      // dibuja sin fracciones y los vecinos no dejan líneas entre sí
      x0 = base.left + Math.floor((x0 - base.left) * DPR) / DPR;
      y0 = base.top + Math.floor((y0 - base.top) * DPR) / DPR;
      var bw = Math.ceil(x1 - x0), bh = Math.ceil(y1 - y0);
      var c = document.createElement('canvas');
      c.width = Math.ceil(bw * DPR); c.height = Math.ceil(bh * DPR);
      var cc = c.getContext('2d', { willReadFrequently: true });
      cc.setTransform(DPR, 0, 0, DPR, 0, 0);
      cc.textBaseline = 'alphabetic';
      for (var j = 0; j < letras.length; j++){
        var ch = letras[j].textContent;
        if (!ch || !ch.trim()) continue;
        var cs = getComputedStyle(letras[j]), rr = rects[j];
        // el texto real puede ir en mayúsculas por CSS (text-transform): la foto de la arena
        // tiene que dibujar lo mismo que se ve, o al terminar de formarse el texto «cambia»
        if (cs.textTransform === 'uppercase') ch = ch.toUpperCase();
        else if (cs.textTransform === 'lowercase') ch = ch.toLowerCase();
        cc.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + '/1 ' + cs.fontFamily;
        cc.fillStyle = cs.color;
        cc.fillText(ch, rr.left - x0, bases[j] - y0);
      }
      var datos;
      try { datos = cc.getImageData(0, 0, c.width, c.height).data; }
      catch (e){ return (grupos[g] = { n: 0, celdas: [] }); }
      var paso = Math.max(2, Math.round(2.5 * DPR)), celdas;
      for (;;){
        celdas = [];
        for (var py = 0; py < c.height; py += paso){
          for (var px = 0; px < c.width; px += paso){
            var w = Math.min(paso, c.width - px), h = Math.min(paso, c.height - py), hit = -1;
            for (var yy = py; yy < py + h && hit < 0; yy++) for (var xx = px; xx < px + w; xx++){
              var idx = (yy * c.width + xx) * 4;
              if (datos[idx + 3] > 70){ hit = idx; break; }
            }
            if (hit >= 0) celdas.push({ sx: px, sy: py, sw: w, sh: h,
              dx: x0 - base.left + px / DPR, dy: y0 - base.top + py / DPR,
              x: x0 - base.left + (px + w / 2) / DPR, y: y0 - base.top + (py + h / 2) / DPR,
              r: datos[hit], g: datos[hit + 1], b: datos[hit + 2] });
          }
        }
        if (celdas.length <= MAX_CELDAS) break;
        paso++;
      }
      celdas.sort(function(a, b){ return a.x - b.x; });
      return (grupos[g] = { c: c, n: celdas.length, celdas: celdas });
    }
    function celdaDe(G, k){ return G.celdas[Math.floor(k * G.n / POOL)]; }

    function ltDe(k, now){
      if (!tr || ya[k]) return 1;
      return clamp(((now - tr.t0) / tr.dur - dl[k] * 0.55) / 0.45, 0, 1);
    }
    // Posición actual del grano k. Los que flotan sueltos en la nube se
    // mecen un poco; la mecida entra y sale suave al empezar/terminar el vuelo.
    var P = { x: 0, y: 0 };
    function posicion(k, now){
      var lt = ltDe(k, now);
      var e = lt < 0.5 ? 4 * lt * lt * lt : 1 - Math.pow(-2 * lt + 2, 3) / 2;
      var ax = sx[k], ay = sy[k], bx = tx[k], by = ty[k];
      var dx = bx - ax, dy = by - ay, L = Math.sqrt(dx * dx + dy * dy) || 1;
      var arco = Math.sin(e * Math.PI) * bd[k];
      var x = ax + dx * e + (-dy / L) * arco, y = ay + dy * e + (dx / L) * arco;
      var mece = (gt[k] < 0 && tr && !ya[k] ? 1 - e : 0) + (tr && tr.tipo === 'soltar' ? e : 0);
      if (mece > 0){
        x += Math.sin(now * 0.0008 * (0.6 + r1[k]) + r2[k] * 6.28) * 6 * mece;
        y += Math.cos(now * 0.0007 * (0.6 + r2[k]) + r3[k] * 6.28) * 4 * mece;
      }
      P.x = x; P.y = y;
      return lt;
    }

    // Arranca una transición. tipo 'soltar': lo que está a la vista se
    // deshace en nube. tipo 'armar': los granos arman el grupo B.
    function iniciar(tipo, B){
      var now = performance.now(), k, c;
      var colorTmp = new Uint8Array(POOL * 3), nuevoGt = new Int8Array(POOL);
      if (asentado >= 0){
        // desde un texto quieto: cada grano está en su pedacito
        var G0 = medir(asentado);
        verDOM(asentado, false);
        for (k = 0; k < POOL; k++){
          c = G0.n ? celdaDe(G0, k) : null;
          sx[k] = c ? c.x : W / 2; sy[k] = c ? c.y : H / 2;
          nuevoGt[k] = c ? asentado : -1;
          colorTmp[k * 3] = c ? c.r : 230; colorTmp[k * 3 + 1] = c ? c.g : 220; colorTmp[k * 3 + 2] = c ? c.b : 200;
        }
        vistaNube = 1;
        asentado = -1;
      } else {
        // a mitad de otra transición (o desde la nube): desde donde esté cada grano
        for (k = 0; k < POOL; k++){
          var lt = posicion(k, now);
          sx[k] = P.x; sy[k] = P.y;
          var en = -1;
          if (tr){
            if (lt <= 0 && gt[k] >= 0) en = gt[k];                 // todavía no se había ido de su texto
            else if (tr.tipo === 'armar' && lt >= 1) en = tr.B;     // ya había llegado
          }
          nuevoGt[k] = en;
          var m = sm(lt);
          for (var q = 0; q < 3; q++){
            colorTmp[k * 3 + q] = tr ? Math.round(ca[k * 3 + q] + (cb[k * 3 + q] - ca[k * 3 + q]) * m) : cb[k * 3 + q];
          }
        }
      }
      var eros = [];
      for (k = 0; k < POOL; k++){
        gt[k] = nuevoGt[k];
        if (gt[k] >= 0 && eros.indexOf(gt[k]) < 0) eros.push(gt[k]);
        ca[k * 3] = colorTmp[k * 3]; ca[k * 3 + 1] = colorTmp[k * 3 + 1]; ca[k * 3 + 2] = colorTmp[k * 3 + 2];
      }
      var GB = tipo === 'armar' ? medir(B) : null;
      var minX = 1e9, maxX = -1e9;
      for (k = 0; k < POOL; k++){
        if (GB){
          c = GB.n ? celdaDe(GB, k) : null;
          tx[k] = c ? c.x : sx[k]; ty[k] = c ? c.y : sy[k];
          ya[k] = gt[k] === B ? 1 : 0;
          if (c){ cb[k * 3] = c.r; cb[k * 3 + 1] = c.g; cb[k * 3 + 2] = c.b; }
        } else {
          // el viento se lleva la arena a la derecha y un poco hacia arriba
          tx[k] = sx[k] + 50 + r1[k] * 120; ty[k] = sy[k] - 28 + r2[k] * 34;
          ya[k] = 0;
          var ar = ARENA[(r3[k] * ARENA.length) | 0];
          cb[k * 3] = ar[0]; cb[k * 3 + 1] = ar[1]; cb[k * 3 + 2] = ar[2];
        }
        var ref = GB ? tx[k] : sx[k];
        if (ref < minX) minX = ref;
        if (ref > maxX) maxX = ref;
      }
      for (k = 0; k < POOL; k++){
        // arena: barrido de izquierda a derecha
        var nx = ((GB ? tx[k] : sx[k]) - minX) / Math.max(1, maxX - minX);
        dl[k] = nx * 0.6 + r3[k] * 0.18;
        var ddx = tx[k] - sx[k], ddy = ty[k] - sy[k];
        bd[k] = (r1[k] - 0.5) * clamp(Math.sqrt(ddx * ddx + ddy * ddy) * 0.25, 20, 140);
      }
      tr = { tipo: tipo, B: GB ? B : -1, t0: now, dur: GB ? 1500 : 1150, eros: eros, nube0: vistaNube, fin: 0 };
    }

    function mostrar(g){
      if (asentado === g) return;
      if (tr && tr.tipo === 'armar' && tr.B === g) return;
      iniciar('armar', g);
    }
    function soltar(g){
      var aLaVista = asentado === g || (tr && tr.tipo === 'armar' && tr.B === g);
      if (!aLaVista) return;
      iniciar('soltar', -1);
    }

    var sucio = false;   // sin transición y ya limpio: no se toca el lienzo (antes se borraba en cada cuadro)
    function pintar(now){
      if (!tr){ if (sucio){ ctx.clearRect(0, 0, W, H); sucio = false; } return; }
      ctx.clearRect(0, 0, W, H); sucio = true;
      var k, j, c, lt, a;
      // pedacitos de texto que todavía no se desprendieron
      for (var e = 0; e < tr.eros.length; e++){
        var g = tr.eros[e];
        if (g === tr.B) continue;
        var G = grupos[g];
        if (!G || !G.n) continue;
        for (j = 0; j < G.n; j++){
          k = Math.floor(j * POOL / G.n);
          if (gt[k] !== g) continue;
          a = 1 - sm(ltDe(k, now) / 0.18);
          if (a <= 0.003) continue;
          c = G.celdas[j];
          ctx.globalAlpha = a;
          ctx.drawImage(G.c, c.sx, c.sy, c.sw, c.sh, c.dx, c.dy, c.sw / DPR, c.sh / DPR);
        }
      }
      // pedacitos del texto destino que ya se armaron
      if (tr.B >= 0){
        var GB = grupos[tr.B];
        if (GB && GB.n){
          for (j = 0; j < GB.n; j++){
            k = Math.floor(j * POOL / GB.n);
            a = ya[k] ? 1 : sm((ltDe(k, now) - 0.82) / 0.18);
            if (a <= 0.003) continue;
            c = GB.celdas[j];
            ctx.globalAlpha = a;
            ctx.drawImage(GB.c, c.sx, c.sy, c.sw, c.sh, c.dx, c.dy, c.sw / DPR, c.sh / DPR);
          }
        }
      }
      // la nube suelta se apaga sola si nadie la vuelve a usar
      if (tr.tipo === 'soltar' && tr.fin) vistaNube = 1 - sm((now - tr.fin - 1800) / 1600);
      // granos
      for (k = 0; k < POOL; k++){
        lt = posicion(k, now);
        var desdeTexto = gt[k] >= 0;
        if (lt <= 0){
          if (desdeTexto) continue;              // escondido: se ve su pedacito de texto
          a = 0.5 * tr.nube0;
        } else if (lt < 1){
          if (tr.tipo === 'soltar'){
            a = desdeTexto ? 0.9 * sm(lt / 0.12) : 0.5 * tr.nube0;
            a += (0.5 - a) * sm(lt);
          } else {
            a = desdeTexto ? 0.9 * sm(lt / 0.12) : 0.5 * tr.nube0 + (0.9 - 0.5 * tr.nube0) * sm(lt);
            a *= 1 - sm((lt - 0.82) / 0.18);       // se funde con su pedacito al llegar
          }
        } else {
          if (tr.tipo !== 'soltar') continue;
          a = 0.5 * vistaNube;
        }
        if (a <= 0.01) continue;
        var m = sm(lt), i3 = k * 3;
        var cr = Math.round(ca[i3] + (cb[i3] - ca[i3]) * m), cg = Math.round(ca[i3 + 1] + (cb[i3 + 1] - ca[i3 + 1]) * m),
            cbb = Math.round(ca[i3 + 2] + (cb[i3 + 2] - ca[i3 + 2]) * m);
        var lado = tam[k];
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgb(' + cr + ',' + cg + ',' + cbb + ')';
        ctx.fillRect(P.x - lado / 2, P.y - lado / 2, lado, lado);
      }
      ctx.globalAlpha = 1;
      // fin de la transición
      if ((now - tr.t0) / tr.dur >= 1){
        if (tr.tipo === 'armar'){
          verDOM(tr.B, true);
          asentado = tr.B;
          for (k = 0; k < POOL; k++){ gt[k] = tr.B; ya[k] = 1; }
          tr = null;
          ctx.clearRect(0, 0, W, H);
        } else if (!tr.fin){
          tr.fin = now;
        } else if (vistaNube <= 0){
          vistaNube = 0;
          for (k = 0; k < POOL; k++){ sx[k] = tx[k]; sy[k] = ty[k]; gt[k] = -1; }
          tr = null;
          ctx.clearRect(0, 0, W, H);
        }
      }
    }

    function medirEnFrio(){
      var todas = [].concat.apply([], gruposDeLetras);
      gsap.set(todas, { x: 0, y: 0, rotation: 0 });
      resize();
      refrescarScrollTrigger();
      if (premedirListo){ clearTimeout(tPremedir); tPremedir = setTimeout(premedir, 800); }
    }
    // Fotografiar cada frase (medir) cuesta: se adelanta en ratos libres, una
    // frase por vez, para que no caiga justo cuando empieza una transición
    // durante el scroll (eso era un cuadro largo cada vez).
    var tPremedir = 0, premedirListo = false;   // listo = el hero ya se lanzó (H1 en su lugar)
    function premedir(){
      premedirListo = true;
      var pend = gruposDeLetras.map(function(_, g){ return g; });
      var ric = window.requestIdleCallback || function(f){ return setTimeout(f, 120); };
      (function uno(){
        ric(function(){
          var g = pend.shift();
          if (g === undefined) return;
          if (!grupos[g] && (!tr || tr.B !== g)) medir(g);
          uno();
        }, { timeout: 1500 });
      })();
    }
    resize();
    window.addEventListener('resize', medirEnFrio);
    bucleVisible(cv.closest('.acto-superficie'), pintar);

    return { medirEnFrio: medirEnFrio, mostrar: mostrar, soltar: soltar, premedir: premedir };
  }

  // timeline scrubbed de la superficie
  var polvoTextos; // se arma más abajo, después de tener todos los grupos de letras
  var espejismosCtl; // ídem — controlador de índice de las frases-espejismo
  var giroCtl;       // ídem — controlador (mostrar/ocultar) del giro
  var h1Fuera = false;
  var tlSup = gsap.timeline({
    scrollTrigger: {
      trigger: '.acto-superficie',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: function(self){
        terreno.setP(self.progress);
        if (espejismosCtl) espejismosCtl.update(self.progress);
        if (giroCtl) giroCtl.update(self.progress);
        // el H1 se deshace en arena justo donde entra la primera frase (0.13)
        // y se rearma al volver: sin tramo intermedio con solo arena a la vista
        var fuera = self.progress >= 0.13;
        if (fuera !== h1Fuera) document.getElementById('hero-copy').classList.toggle('hero-oculto', fuera);
        if (polvoTextos && fuera !== h1Fuera){ h1Fuera = fuera; if (fuera) polvoTextos.soltar(0); else polvoTextos.mostrar(0); }
      }
    }
  });
  // El título inicial se queda quieto y legible durante prácticamente todo
  // el tramo previo a las frases-espejismo; en 0.115 se deshace en arena
  // (lo dispara el onUpdate de tlSup, no un tween) y el resto del bloque
  // (eyebrow, párrafo, CTAs) se desliza hacia arriba y se desvanece.
  var letrasH1 = splitLetters(document.getElementById('h1'));
  // fromTo, no to: '#hero-copy .eyebrow'/'p'/'.hero-ctas' arrancan en
  // opacity:0 por el gsap.set(...) de más arriba (para que lanzarHero() los
  // pueda hacer entrar con su propio fundido) — con un .to() normal, tlSup
  // habría capturado ESE opacity:0 como su "desde" la primera vez que se
  // renderiza (antes de que lanzarHero corra), y lo dejaría clavado ahí
  // para siempre: aunque lanzarHero después los suba a 1 y el usuario
  // vuelva a subir el scroll hasta el hero, tlSup los devolvería al
  // opacity:0 "desde" que grabó, no al 1 real — el hero no reaparecía.
  // Con fromTo el "desde" (opacity:1) queda explícito, sin depender de en
  // qué momento tlSup evalúe el tween por primera vez.
  // «Reserva tu consulta» se queda a la vista durante todas las frases: solo se retiran el
  // eyebrow, el párrafo y «Comenzar el viaje»
  tlSup.fromTo(['#hero-copy .eyebrow', '#hero-copy p:not(.eyebrow)', '.hero-ctas .btn-solido'],
        { opacity:1, y:0 },
        { opacity:0, y:-70, duration:0.015, ease:'none' }, 0.115)
       .to('.indicador-scroll', { opacity:0, duration:0.04 }, 0.04);
  // Las espejismo y el giro ya no ponen tweens en tlSup (ahora las manejan
  // sus controladores por su cuenta con self.progress), así que el último
  // tween REAL de tlSup es la salida del H1 en 0.115. Sin esto, la duración
  // total de tlSup colapsaría a ~0.13, y como el scrub mapea el scroll 0→1
  // sobre esa duración, la salida del H1 (posición absoluta 0.115) se
  // dispararía recién al ~88% del scroll en vez de al ~11.5% — el hero no
  // se ocultaba en casi todo el recorrido. Este marcador vacío en la
  // posición 1.0 fija la duración a 1.0 para que las posiciones absolutas
  // vuelvan a mapear 1:1 con el progreso de scroll.
  tlSup.set({}, { x: 0 }, 1);

  // «Reserva tu consulta» se queda durante las frases y, al irse «Comenzar el viaje», se corre
  // a la izquierda hasta el lugar que ese botón dejó libre (si están en la misma fila; apilados
  // en mobile ya está en el borde izquierdo). El CSS hace el desplazamiento con una transición;
  // acá solo se mide cuánto: offsetLeft no cambia con transformaciones, así que da lo mismo
  // cuándo se mida.
  function medirReserva(){
    var ctas = document.querySelector('.hero-ctas');
    var inicio = ctas && ctas.querySelector('.btn-solido'), reserva = ctas && ctas.querySelector('.btn-reserva');
    if (!inicio || !reserva) return;
    var mismaFila = Math.abs(inicio.offsetTop - reserva.offsetTop) < 4;
    ctas.style.setProperty('--reserva-dx', mismaFila ? (inicio.offsetLeft - reserva.offsetLeft) + 'px' : '0px');
  }
  medirReserva();
  window.addEventListener('resize', medirReserva);
  window.addEventListener('load', medirReserva);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirReserva);

  // Frases-espejismo: ANCLADAS — en vez de atarlas a una fracción exacta de
  // scroll (frágil: con scroll rápido se veían aparecer/desaparecer de
  // golpe, y quedaban desincronizadas del enjambre de polvo), cada una se
  // muestra/oculta por ÍNDICE, con animaciones de duración fija en TIEMPO
  // REAL — mismo patrón que etapasCtl (Acto 4, las tarjetas del método) más
  // abajo en este archivo. La pausa de lectura queda atada a cuánto scroll
  // real se necesita para cruzar la ventana de esa frase, pero la entrada y
  // la salida en sí siempre tardan lo mismo, sin importar qué tan rápido se
  // scrollee.
  var frases = ['.e1','.e2','.e3','.e4','.e5'];
  var ini = 0.13, paso = 0.115;
  // Tramo de scroll de cada frase, en múltiplos de `paso`. La e5 («Mis
  // exámenes salen normales… pero yo no me siento normal.») es ~1.5×
  // más larga que las demás y va en dos líneas: con el mismo tramo
  // terminaba de formarse tarde y se iba antes de alcanzar a leerla. Su
  // tramo extra sale del hueco libre antes del giro (que entra en 0.86):
  // las frases ahora van de 0.13 a ~0.774.
  var pesos = [1, 1, 1, 1, 1.6];
  var bordes = [ini];
  for (var b = 0; b < pesos.length; b++) bordes.push(bordes[b] + paso * pesos[b]);
  var finFrases = bordes[pesos.length];
  var letrasEspejismos = frases.map(function(sel){ return splitLetters(document.querySelector(sel)); });

  espejismosCtl = (function(){
    var mostrada = [false, false, false, false, false];

    // la arena hace todo: la frase se arma con los granos de la anterior
    // y al irse se deshace en una nube que espera a la siguiente
    function entra(i){ if (polvoTextos) polvoTextos.mostrar(i + 1); }
    function sale(i){ if (polvoTextos) polvoTextos.soltar(i + 1); }

    return {
      // p: progreso global 0–1 de .acto-superficie (viene de tlSup.onUpdate).
      update: function(p){
        if (p < ini || p >= finFrases){
          for (var k = 0; k < 5; k++){ if (mostrada[k]){ mostrada[k] = false; sale(k); } }
          return;
        }
        var s = 0;
        while (s < 4 && p >= bordes[s + 1]) s++;
        // Cada frase ocupa su segmento COMPLETO: en el borde la arena de la
        // que se va viaja directo a armar la siguiente. Con una ventana más
        // angosta quedaba un tramo sin ninguna frase y solo la nube a la vista.
        var visible = s;
        for (var i = 0; i < 5; i++){
          if (i === visible && !mostrada[i]){ mostrada[i] = true; entra(i); }
          if (i !== visible && mostrada[i]){ mostrada[i] = false; sale(i); }
        }
      }
    };
  })();

  // Giro (cierre del acto 2): ANCLADO igual que las espejismo, por la misma
  // razón — antes estaba atado al scroll-scrub, y con un scroll normal las
  // últimas letras seguían borrosas (el stagger tarda ~0.09 de scroll, más
  // que su ventana de entrada de 0.08) cuando ya empezaba la salida en
  // 0.955: aparecía y desaparecía sin terminar de formarse. Ahora se
  // muestra/oculta por umbral de scroll, pero la formación en sí es un tween
  // de tiempo real fijo, así que SIEMPRE termina de formarse nítido antes de
  // quedarse anclado y legible hasta casi el final de la sección.
  var letrasGiro = splitLetters(document.getElementById('giro'));
  giroCtl = (function(){
    var mostrado = false;

    function entra(){ if (polvoTextos) polvoTextos.mostrar(6); }
    function sale(){ if (polvoTextos) polvoTextos.soltar(6); }

    return {
      // Ventana de scroll del giro: se muestra al entrar en [finFrases ≈ 0.77, 1] (queda
      // anclado y legible hasta el final de .acto-superficie), y se oculta
      // al salir de ella. El fundido de salida en sí lo maneja sale() en
      // tiempo real.
      //
      // El límite de arriba era 0.99, no 1: el último 1% de .acto-superficie
      // (0.99→1) ya no corresponde a ningún tween -tlSup ya terminó todo lo
      // suyo antes de eso- así que ese tramo final solo sirve para que el
      // <div class="escenario"> (position:sticky) alcance a "despegarse" del
      // tope antes de que termine su contenedor (position:sticky SIEMPRE dejɑ
      // un tramo sin pegar del alto de un viewport al final del contenedor,
      // es cómo funciona sticky). En ese tramo, y en el viewport completo que
      // sigue después (ya fuera de .acto-superficie, antes de que la sección
      // "Causa raíz" llene la pantalla), no había NADA dibujado -sale() ya
      // había ocultado el giro en 0.99- así que se sentía como "mucho
      // scroll para nada" entre el giro y lo siguiente. Con el límite en 1
      // el giro se queda a la vista todo ese tramo final y se ve
      // desplazarse con el scroll (ya no está pegado) hasta que la
      // siguiente sección lo tapa, en vez de dejar la pantalla vacía.
      update: function(p){
        var dentro = p >= finFrases && p <= 1;
        if (dentro && !mostrado){ mostrado = true; entra(); }
        if (!dentro && mostrado){ mostrado = false; sale(); }
      }
    };
  })();

  // Ahora que existen los 7 grupos (H1, las 5 espejismo, giro), se arma el
  // enjambre y se mide su posición real — medirEnFrio() debe correr DESPUÉS
  // de que tlSup ya definió todos sus fromTo/to (si no, algunas letras
  // todavía no habrían recibido su x/rotation de "immediateRender" y la
  // medición de reset no tendría nada que neutralizar).
  polvoTextos = construirPolvoTextos(
    document.getElementById('lienzo-polvo-textos'),
    [letrasH1].concat(letrasEspejismos).concat([letrasGiro]),
    [document.getElementById('h1')].concat(frases.map(function(sel){ return document.querySelector(sel); })).concat([document.getElementById('giro')])
  );
  polvoTextos.medirEnFrio();
  // el H1 recién queda en su lugar después de su entrada animada (tras el velo):
  // ahí se adelantan las mediciones de todas las frases
  if (lanzarHero && polvoTextos.premedir){
    var lanzarHeroOriginal = lanzarHero;
    lanzarHero = function(){ var r = lanzarHeroOriginal.apply(this, arguments); setTimeout(polvoTextos.premedir, 2600); return r; };
  }

  // Un gesto de scroll = una frase. Dentro de la superficie (hero → frases →
  // giro) la rueda, el dedo y las teclas no desplazan la página a pie: cada
  // gesto lleva a la parada siguiente (o anterior), sin importar cuánto se
  // haya scrolleado. Las paradas son el hero, el centro del tramo de cada
  // frase y el giro; pasado el giro (hacia abajo) o sobre el hero (hacia
  // arriba) el scroll vuelve a ser el normal. El recorrido es una animación
  // de tiempo fijo del scroll, así que tlSup (scrub) la sigue como a
  // cualquier otro scroll.
  var paradas = [0];
  for (var q = 0; q < pesos.length; q++) paradas.push((bordes[q] + bordes[q + 1]) / 2);
  paradas.push((finFrases + 1) / 2);
  var snapAnim = null, snapLibre = 0, ultimaRueda = 0, ultimoDelta = 0;

  function zonaSup(){ var st = tlSup.scrollTrigger; return { a: st.start, b: st.end, y: window.scrollY }; }
  function enZonaSup(z){ return z.y >= z.a - 2 && z.y <= z.b + 1; }
  function paradaActual(z){
    var p = clamp((z.y - z.a) / ((z.b - z.a) || 1), 0, 1), mejor = 0, d = 9;
    for (var k = 0; k < paradas.length; k++){
      var dk = Math.abs(paradas[k] - p);
      if (dk < d){ d = dk; mejor = k; }
    }
    return mejor;
  }
  function irAParada(j){
    var z = zonaSup(), destino = z.a + paradas[j] * (z.b - z.a), cur = { y: window.scrollY };
    var htmlEl = document.documentElement, previo = htmlEl.style.scrollBehavior;
    if (snapAnim) snapAnim.kill();
    // html{scroll-behavior:smooth} suavizaría cada cuadro de esta misma animación
    htmlEl.style.scrollBehavior = 'auto';
    snapAnim = gsap.to(cur, {
      y: destino, duration: 0.95, ease: 'power2.inOut',
      onUpdate: function(){ window.scrollTo(0, cur.y); },
      onComplete: function(){ snapAnim = null; snapLibre = performance.now() + 350; htmlEl.style.scrollBehavior = previo; }
    });
  }
  // devuelve la parada a la que lleva el gesto, o -1 si el scroll debe ser el normal
  function destinoSnap(dir){
    var z = zonaSup();
    if (!enZonaSup(z)) return -1;
    var j = paradaActual(z) + dir;
    return (j < 0 || j >= paradas.length) ? -1 : j;
  }
  function snapIgnorado(e){
    var t = e.target;
    if (document.documentElement.classList.contains('velado') || document.documentElement.classList.contains('menu-abierto')) return true;
    return !!(t && t.closest && t.closest('#panel-raiz, .menu-movil'));
  }

  window.addEventListener('wheel', function(e){
    if (e.ctrlKey || !e.deltaY || snapIgnorado(e)) return;
    var dir = e.deltaY > 0 ? 1 : -1, j = destinoSnap(dir);
    if (j < 0) return;
    e.preventDefault();
    // la inercia del trackpad sigue mandando eventos un buen rato: solo
    // cuenta como gesto nuevo si hubo una pausa o la rueda vuelve a acelerar
    var ahora = performance.now(), delta = Math.abs(e.deltaY);
    var nuevo = ahora - ultimaRueda > 140 || delta > ultimoDelta + 8;
    ultimaRueda = ahora; ultimoDelta = delta;
    if (snapAnim || ahora < snapLibre || !nuevo) return;
    irAParada(j);
  }, { passive: false });

  window.addEventListener('keydown', function(e){
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || snapIgnorado(e)) return;
    var tag = e.target && e.target.tagName, dir = 0;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
    var espacio = e.key === ' ' && tag !== 'BUTTON' && tag !== 'A';
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (espacio && !e.shiftKey)) dir = 1;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (espacio && e.shiftKey)) dir = -1;
    if (!dir) return;
    var j = destinoSnap(dir);
    if (j < 0) return;
    e.preventDefault();
    if (!snapAnim && !e.repeat) irAParada(j);
  });

  // Táctil: mientras el dedo arrastra dentro de la zona se bloquea el scroll
  // nativo; al soltar, un arrastre de ≥30px lleva a la frase siguiente/anterior.
  var tocY0 = 0, tocDir = 0, tocCapturado = false;
  document.addEventListener('touchstart', function(e){
    tocCapturado = false;
    if (e.touches.length === 1) tocY0 = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchmove', function(e){
    if (e.touches.length !== 1 || snapIgnorado(e)) return;
    var dy = tocY0 - e.touches[0].clientY;
    if (!dy) return;
    var dir = dy > 0 ? 1 : -1;
    if (destinoSnap(dir) < 0){ tocCapturado = false; return; }
    if (e.cancelable) e.preventDefault();
    tocCapturado = true; tocDir = dir;
  }, { passive: false });
  document.addEventListener('touchend', function(e){
    if (!tocCapturado) return;
    tocCapturado = false;
    var dy = tocY0 - e.changedTouches[0].clientY;
    if (snapAnim || performance.now() < snapLibre || Math.abs(dy) < 30 || (dy > 0 ? 1 : -1) !== tocDir) return;
    var j = destinoSnap(tocDir);
    if (j >= 0) irAParada(j);
  }, { passive: true });

  // «Comenzar el viaje»: lleva a la primera frase.
  var btnViaje = document.getElementById('btn-viaje');
  if (btnViaje) btnViaje.addEventListener('click', function(e){
    e.preventDefault();
    irAParada(1);
  });

  // ─── Acto 4: una gota por etapa + tarjetas cinematográficas ───
  var etapasCtl = (function(){
    var tarjetas = Array.prototype.slice.call(document.querySelectorAll('.tarjeta-etapa'));
    var nums = Array.prototype.slice.call(document.querySelectorAll('.numeros-etapa button'));
    var mostrada = [false,false,false,false];
    tarjetas.forEach(function(t){ splitWords(t.querySelector('h3')); });
    // filter:blur por palabra obliga a repintar el texto en cada cuadro: en
    // celulares/equipos modestos las palabras entran solo con opacidad y altura
    var conBlur = !movil && !tierBajo;
    function sinBlur(o){ if (!conBlur) delete o.filter; return o; }

    function entra(i){
      var t = tarjetas[i];
      t.style.visibility = 'visible';
      t.classList.add('mostrada');
      gsap.killTweensOf(t);
      gsap.to(t, {opacity:1, duration:0.35, overwrite:'auto'});
      gsap.fromTo(t.querySelectorAll('h3 .w'),
        sinBlur({opacity:0, y:32, filter:'blur(8px)'}),
        sinBlur({opacity:1, y:0, filter:'blur(0px)', duration:0.9, stagger:0.09, ease:'power3.out', overwrite:'auto'}));
      gsap.fromTo(t.querySelectorAll('.fila'),
        {opacity:0, y:22},
        {opacity:1, y:0, duration:0.85, stagger:0.15, delay:0.22, ease:'power3.out', overwrite:'auto'});
    }
    function sale(i){
      var t = tarjetas[i];
      t.classList.remove('mostrada');
      gsap.to(t.querySelectorAll('h3 .w'), sinBlur({y:-18, filter:'blur(5px)', opacity:0, duration:0.5, stagger:0.02, ease:'power2.in', overwrite:'auto'}));
      gsap.to(t.querySelectorAll('.fila'), {opacity:0, y:-12, duration:0.45, ease:'power2.in', overwrite:'auto'});
      gsap.to(t, {opacity:0, duration:0.55, ease:'power2.in', overwrite:'auto',
        onComplete:function(){ t.style.visibility='hidden'; }});
    }
    return {
      nums: nums,
      tarjetas: tarjetas,
      update: function(p){
        var s = clamp(Math.floor(p*4), 0, 3);
        var t = p*4 - s;
        var visible = (t >= 0.46 && t <= 0.97) ? s : -1;
        tarjetas.forEach(function(_, i){
          if (i === visible && !mostrada[i]){ mostrada[i] = true; entra(i); }
          if (i !== visible && mostrada[i]){ mostrada[i] = false; sale(i); }
        });
        nums.forEach(function(b, i){
          b.classList.toggle('activo', i === s);
          b.classList.toggle('pasado', i < s);
        });
      }
    };
  })();

  // ─── Recorrido automático del método (una sola pantalla) ───
  // Mismo concepto que la órbita de Servicios: en vez de atar la gota al
  // scroll (~5 pantallas), un reloj recorre las 4 etapas. En cada una la
  // gota se forma, cae y salpica (progreso de etapa 0 → 0.24 en ~2.4s; la
  // tarjeta nace en el impacto) y se queda a la vista hasta completar
  // DUR_ETAPA. Se pausa con el cursor sobre la tarjeta o los números, con
  // la sección fuera de pantalla, y 12s después de tocar un número.
  var metodoCtl = (function(){
    var escena = document.querySelector('.metodo-escena');
    var progreso = document.getElementById('metodo-progreso');
    var barra = progreso && progreso.querySelector('span');
    var DUR_ETAPA = 7500, DUR_FINAL = 9000, CAIDA = 3.4, TRAMO = 0.24;
    var actual = 0, prog = { p: 0 }, tweenGota = null;
    var transcurrido = 0, ultimoT = 0, enPantalla = false, encima = false, pausaHasta = 0, arranco = false;

    function aplicar(){ gotaFondo.setP(prog.p); etapasCtl.update(prog.p); }
    function ir(i, desdeCero){
      actual = i;
      transcurrido = 0;
      if (tweenGota) tweenGota.kill();
      var inicio = i / 4;
      // hacia atrás, volviendo a empezar o saltándose etapas (clic en el 4 estando
      // en el 1): salto directo al inicio de la etapa elegida, sin pasar por las del medio
      if (desdeCero || prog.p > inicio + TRAMO || prog.p < inicio - 0.26){ prog.p = inicio; gotaFondo.saltar(inicio); etapasCtl.update(inicio); }
      // ease lineal: el ciclo de la gota ya tiene su propia física (gravedad)
      tweenGota = gsap.to(prog, { p: inicio + TRAMO, duration: CAIDA, ease: 'none', onUpdate: aplicar });
    }
    function bucle(now){
      var dt = ultimoT ? Math.min(now - ultimoT, 100) : 0;
      ultimoT = now;
      if (arranco && enPantalla){
        var pausado = encima || now < pausaHasta;
        var dur = actual === 3 ? DUR_FINAL : DUR_ETAPA;
        if (!pausado){
          transcurrido += dt;
          if (transcurrido >= dur) ir(actual === 3 ? 0 : actual + 1, actual === 3);
        }
        if (progreso) progreso.classList.toggle('pausado', pausado);
        barraSync(transcurrido, dur, pausado);
      }
      // fuera de pantalla el bucle se detiene (no pide cuadros); el observador lo despierta
      if (enPantalla && pagVisible) requestAnimationFrame(bucle); else { corriendo = false; ultimoT = 0; if (animBarra) animBarra.pause(); }
    }
    var corriendo = false;
    // La barra de progreso la anima el navegador (Web Animations, en el compositor):
    // escribir su transform en cada cuadro obligaba a repintar y reorganizar las
    // capas de toda la página en cada cuadro. Solo se rehace al cambiar de etapa o
    // si se desfasa, y se pausa/reanuda con el recorrido.
    var animBarra = null, durBarra = 0;
    function barraSync(trans, dur, pausado){
      if (!barra) return;
      if (!barra.animate){ barra.style.transform = 'scaleX(' + clamp(trans / dur, 0, 1).toFixed(3) + ')'; return; }
      if (!animBarra || durBarra !== dur || Math.abs(animBarra.currentTime - trans) > 150){
        if (animBarra) animBarra.cancel();
        animBarra = barra.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: dur, fill: 'both', easing: 'linear' });
        durBarra = dur; animBarra.currentTime = Math.min(trans, dur);
      }
      if (pausado && animBarra.playState === 'running') animBarra.pause();
      else if (!pausado && animBarra.playState === 'paused') animBarra.play();
    }
    function despertarBucle(){
      if (corriendo || !enPantalla || !pagVisible) return;
      corriendo = true; requestAnimationFrame(bucle);
    }
    document.addEventListener('visibilitychange', despertarBucle);

    etapasCtl.nums.forEach(function(b, i){
      b.addEventListener('click', function(){
        pausaHasta = performance.now() + 12000;
        arranco = true;
        if (i !== actual || prog.p < i / 4 + TRAMO - 0.01) ir(i);
      });
    });
    etapasCtl.tarjetas.concat([document.querySelector('.numeros-etapa')]).forEach(function(el){
      if (!el) return;
      el.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') encima = true; });
      el.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') encima = false; });
    });
    new IntersectionObserver(function(ents){
      enPantalla = ents[0].intersectionRatio >= 0.5;
      despertarBucle();
      if (enPantalla && !arranco){ arranco = true; ir(0, true); }
    }, { threshold: [0, 0.5] }).observe(escena);
    despertarBucle();
    return { ir: ir };
  })();

  // la chispa de luz aterriza junto a la doctora (elemento que viaja entre mundos)
  ScrollTrigger.create({
    trigger: '#doctora',
    start: 'top 60%',
    once: true,
    onEnter: function(){
      var ch = document.querySelector('.chispa');
      if (!ch) return;
      gsap.fromTo(ch,
        {y: -170, x: 30, opacity: 0},
        {y: 0, x: 0, opacity: 1, duration: 1.7, ease: 'power2.out',
         onComplete: function(){ ch.classList.add('llega'); }});
    }
  });

  // titulares de la zona de luz: mismo revelado palabra a palabra que el resto del sitio
  [['.motor-cabecera h2', 'top 82%'], ['.blog-head h2', 'top 82%'], ['.acto-faq h2', 'top 82%']].forEach(function(par){
    var h = document.querySelector(par[0]);
    if (!h) return;
    var ws = splitWords(h);
    gsap.to(ws, {
      opacity:1, y:0, filter:'blur(0px)', duration:0.9, stagger:0.06, ease:'power3.out',
      scrollTrigger: { trigger:h, start:par[1] }
    });
  });

  // CTA final palabra a palabra
  var wsF = splitWords(document.getElementById('h2-final'));
  gsap.to(wsF, {
    opacity:1, y:0, filter:'blur(0px)', duration:1, stagger:0.07, ease:'power3.out',
    scrollTrigger: { trigger:'#agendar', start:'top 65%' }
  });
} else {
  // sin GSAP / reduced: contenido estático visible, gota a mitad de caída
  gotaFondo.setP(0.45);
}

/* ============================================================
   3 · BAJO LA SUPERFICIE (Acto 3) — raíces que crecen solas al llegar
   Un solo escenario (sin pista de scroll): al entrar en pantalla las 4
   raíces se arman automáticamente y cada sistema se abre al tocar su
   etiqueta. Cada raíz es un path SVG que se "dibuja"
   moviendo su stroke-dashoffset; los filamentos entre raíces (quién
   conversa con quién) se arman acá midiendo esas raíces.
============================================================ */
try{ (function(){
  var pista = document.getElementById('raiz-pista');
  var svg = document.getElementById('raiz-svg');
  if (!pista || !svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  var raices = [].slice.call(svg.querySelectorAll('.raiz-raiz'));
  var trazos = raices.map(function(g){ return g.querySelector('.raiz-trazo'); });
  var bajadas = raices.map(function(g){ return g.querySelector('.raiz-bajada'); });
  var ramitas = raices.map(function(g){ return [].slice.call(g.querySelectorAll('.raiz-ramita')); });
  var nudo = svg.querySelector('.raiz-nudo');
  var nombres = [].slice.call(document.querySelectorAll('.raiz-nombre'));
  var textos = [].slice.call(document.querySelectorAll('.raiz-texto'));
  var cierre = document.querySelector('.raiz-cierre');

  // El texto del concepto se arma con arena, palabra por palabra, mientras crecen las raíces:
  // mismo lenguaje que las frases del hero (granos que vuelan en curva y se funden con la
  // palabra real). Cada palabra arranca cuando la animación llega a su turno, y dura lo mismo
  // sin importar el scroll. Es un efecto aparte del del hero (ese vive atado a su escena).
  var polvoConcepto = (function(){
    var parr = cierre.querySelector('.raiz-concepto'), invita = cierre.querySelector('.raiz-invita');
    var fijo = cierre.closest('.raiz-fijo');
    var sinEfecto = { actualizar:function(){}, terminar:function(){ if (invita) invita.classList.add('listo'); } };
    if (!parr || !fijo || reduced || !window.gsap || !(window.requestAnimationFrame)) return sinEfecto;

    var ARENA = [[226,206,170],[214,190,150],[240,222,190],[200,176,138],[150,206,190],[244,186,120]];
    var DUR = 1150, CAP = 130;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var texto = parr.textContent.replace(/\s+/g, ' ').trim();
    parr.textContent = '';
    var palabras = texto.split(' ').map(function(t, i){
      if (i) parr.appendChild(document.createTextNode(' '));
      var s = document.createElement('span');
      s.className = 'pw'; s.textContent = t;
      parr.appendChild(s);
      return { el: s, txt: t, iniciada: false, t0: 0, fin: false, granos: null, ya: false };
    });
    cierre.classList.add('polvo-activo');

    var cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:6';
    fijo.appendChild(cv);
    var ctx = cv.getContext('2d');
    function ajustar(){ cv.width = fijo.clientWidth * dpr; cv.height = fijo.clientHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    ajustar();
    window.addEventListener('resize', ajustar);

    function sm(t){ t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

    // «Fotografía» de la palabra: dibujada con su fuente real y muestreada en pedacitos
    function medir(w){
      var r = w.el.getBoundingClientRect(), base = fijo.getBoundingClientRect(), cs = getComputedStyle(w.el);
      var sonda = document.createElement('i');
      sonda.style.cssText = 'display:inline-block;width:0;height:0';
      w.el.appendChild(sonda);
      var linea = sonda.getBoundingClientRect().bottom;
      w.el.removeChild(sonda);
      var pad = 4, bw = Math.ceil(r.width + pad * 2), bh = Math.ceil(r.height + pad * 2);
      var c = document.createElement('canvas');
      c.width = Math.ceil(bw * dpr); c.height = Math.ceil(bh * dpr);
      var cc = c.getContext('2d', { willReadFrequently: true });
      cc.setTransform(dpr, 0, 0, dpr, 0, 0);
      cc.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + '/1 ' + cs.fontFamily;
      cc.fillStyle = cs.color; cc.textBaseline = 'alphabetic';
      cc.fillText(w.txt, pad, linea - r.top + pad);
      var d;
      try { d = cc.getImageData(0, 0, c.width, c.height).data; } catch(e){ return []; }
      var paso = Math.max(2, Math.round(2.2 * dpr)), celdas;
      for (;;){
        celdas = [];
        for (var py = 0; py < c.height; py += paso) for (var px = 0; px < c.width; px += paso){
          var hit = -1;
          for (var yy = py; yy < Math.min(py + paso, c.height) && hit < 0; yy++) for (var xx = px; xx < Math.min(px + paso, c.width); xx++){
            var ix = (yy * c.width + xx) * 4;
            if (d[ix + 3] > 70){ hit = ix; break; }
          }
          if (hit >= 0) celdas.push({
            x: r.left - base.left - pad + (px + paso / 2) / dpr, y: r.top - base.top - pad + (py + paso / 2) / dpr,
            r: d[hit], g: d[hit + 1], b: d[hit + 2] });
        }
        if (celdas.length <= CAP) break;
        paso++;
      }
      return celdas;
    }

    var activos = [], corriendo = false;
    function iniciarPalabra(w){
      w.iniciada = true; w.t0 = performance.now();
      w.granos = medir(w).map(function(c){
        var a = ARENA[(Math.random() * ARENA.length) | 0];
        return { x: c.x, y: c.y, sx: c.x + (Math.random() - 0.5) * 150, sy: c.y + 24 + Math.random() * 80,
                 r: c.r, g: c.g, b: c.b, ar: a, dl: Math.random() * 0.4, arco: (Math.random() - 0.5) * 36,
                 lado: Math.random() < 0.7 ? 1 + Math.random() * 0.7 : 1.7 + Math.random() };
      });
      activos.push(w);
      if (!corriendo){ corriendo = true; requestAnimationFrame(pintar); }
    }
    function pintar(now){
      ctx.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
      for (var i = activos.length - 1; i >= 0; i--){
        var w = activos[i], f = (now - w.t0) / DUR;
        if (f >= 0.78 && !w.ya){ w.ya = true; w.el.classList.add('on'); }   // la palabra real aparece mientras los granos se funden
        if (f >= 1.05){ w.fin = true; activos.splice(i, 1); continue; }
        for (var k = 0; k < w.granos.length; k++){
          var g = w.granos[k];
          var lt = clamp((f - g.dl * 0.5) / 0.55, 0, 1);
          if (lt <= 0) continue;
          var e = lt < 0.5 ? 4 * lt * lt * lt : 1 - Math.pow(-2 * lt + 2, 3) / 2;
          var dx = g.x - g.sx, dy = g.y - g.sy, L = Math.sqrt(dx * dx + dy * dy) || 1;
          var arco = Math.sin(e * Math.PI) * g.arco;
          var x = g.sx + dx * e + (-dy / L) * arco, y = g.sy + dy * e + (dx / L) * arco;
          var a = 0.9 * sm(lt / 0.15) * (1 - sm((lt - 0.8) / 0.2));
          if (a <= 0.01) continue;
          ctx.globalAlpha = a;
          ctx.fillStyle = 'rgb(' + Math.round(g.ar[0] + (g.r - g.ar[0]) * e) + ',' + Math.round(g.ar[1] + (g.g - g.ar[1]) * e) + ',' + Math.round(g.ar[2] + (g.b - g.ar[2]) * e) + ')';
          ctx.fillRect(x - g.lado / 2, y - g.lado / 2, g.lado, g.lado);
        }
      }
      ctx.globalAlpha = 1;
      if (activos.length) requestAnimationFrame(pintar);
      else { corriendo = false; ctx.clearRect(0, 0, cv.clientWidth, cv.clientHeight); }
    }

    return {
      // frac: avance 0–1 de la animación de las raíces
      actualizar: function(frac){
        var n = palabras.length;
        for (var i = 0; i < n; i++){
          if (!palabras[i].iniciada && frac >= 0.04 + 0.78 * i / Math.max(1, n - 1)) iniciarPalabra(palabras[i]);
        }
        if (frac >= 0.9 && invita) invita.classList.add('listo');
      },
      // se completa todo de golpe (clic antes de que termine, o fin de la animación)
      terminar: function(){
        palabras.forEach(function(w){ w.iniciada = true; w.ya = true; w.fin = true; w.el.classList.add('on'); });
        activos.length = 0;
        if (invita) invita.classList.add('listo');
      }
    };
  })();

  // Quién conversa con quién (los mismos "con" de la red anterior) y en
  // qué punto de cada raíz nace el filamento (fracción de su largo),
  // elegidos a mano para que no se encimen.
  var CONVERSAN = [
    { a:0, b:1, fa:0.55, fb:0.45 },
    { a:0, b:2, fa:0.85, fb:0.40 },
    { a:1, b:2, fa:0.75, fb:0.70 },
    { a:3, b:0, fa:0.35, fb:0.70 },
    { a:3, b:1, fa:0.80, fb:0.95 },
    { a:3, b:2, fa:0.60, fb:0.92 }
  ];

  // Un path se "dibuja" moviendo su dashoffset entre su largo (oculto) y 0.
  function preparar(path){
    var L = path.getTotalLength();
    path.style.strokeDasharray = L + ' ' + L;
    path.style.strokeDashoffset = L;
    path._largo = L;
    return path;
  }
  function trazar(path, f){ path.style.strokeDashoffset = path._largo * (1 - f); }
  function tramo(v, a, b){ return clamp((v - a) / (b - a), 0, 1); }

  trazos.forEach(preparar);
  bajadas.forEach(preparar);
  ramitas.forEach(function(rs){ rs.forEach(preparar); });

  var capa = svg.querySelector('.raiz-filamentos');
  var filamentos = CONVERSAN.map(function(c){
    var pa = trazos[c.a].getPointAtLength(trazos[c.a]._largo * c.fa);
    var pb = trazos[c.b].getPointAtLength(trazos[c.b]._largo * c.fb);
    // la curva cuelga un poco: es una raicilla, no una línea tensa
    var mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2 + 18;
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('class', 'raiz-filamento');
    p.setAttribute('d', 'M' + pa.x.toFixed(1) + ',' + pa.y.toFixed(1) +
      ' Q' + mx.toFixed(1) + ',' + my.toFixed(1) + ' ' + pb.x.toFixed(1) + ',' + pb.y.toFixed(1));
    capa.appendChild(p);
    preparar(p);
    var mid = p.getPointAtLength(p._largo / 2);
    var k = document.createElementNS(NS, 'circle');
    k.setAttribute('class', 'raiz-cruce');
    k.setAttribute('cx', mid.x.toFixed(1)); k.setAttribute('cy', mid.y.toFixed(1)); k.setAttribute('r', '3.2');
    capa.appendChild(k);
    // aparece cuando termina de crecer la MÁS tardía de las dos raíces
    return { path: p, cruce: k, tras: Math.max(c.a, c.b) };
  });

  // Las raíces crecen SOLAS al llegar a la sección (sin pista de scroll). Al
  // terminar, las etiquetas de cada sistema laten suave para invitar a tocarlas:
  // el texto de ese sistema aparece al hacer clic (otro clic lo cierra y vuelve
  // la frase de cierre). s va de 0 a S_FIN y reparte el crecimiento en pasos.
  var S_FIN = 5.7, listo = false, sel = -1;
  function crecer(s){
    for (var i = 0; i < 4; i++){
      var g = tramo(s, i + 1, i + 1.6);
      trazar(trazos[i], g);
      for (var r = 0; r < ramitas[i].length; r++) trazar(ramitas[i][r], tramo(g, 0.55, 1));
      trazar(bajadas[i], tramo(s, 5, 5.6));
      nombres[i].classList.toggle('crecida', g > 0.9);
    }
    filamentos.forEach(function(f){
      var gf = tramo(s, f.tras + 1.35, f.tras + 1.75);
      trazar(f.path, gf);
      f.cruce.classList.toggle('encendido', gf >= 1);
    });
    nudo.classList.toggle('encendido', s >= 5.6);
  }
  function elegir(i){
    sel = i;
    textos.forEach(function(t, j){ t.classList.toggle('visible', listo && j === i); });
    raices.forEach(function(rz, j){ rz.classList.toggle('activa', j === i); });
    svg.classList.toggle('enfocada', i >= 0);
    cierre.classList.toggle('visible', listo && i < 0);
    nombres.forEach(function(n){ n.classList.toggle('elegida', +n.dataset.i === i); });
  }
  function terminar(){
    if (listo) return;
    listo = true;
    polvoConcepto.terminar();
    crecer(S_FIN);
    nombres.forEach(function(n, k){ n.classList.add('parpadea'); n.style.animationDelay = (k * 0.7) + 's'; });
    elegir(-1);
  }
  [].forEach.call(document.querySelectorAll('.raiz-volver'), function(v){ v.addEventListener('click', function(){ elegir(-1); }); });
  nombres.forEach(function(b){
    b.addEventListener('click', function(){
      if (!listo){ if (anim) anim.progress(1); terminar(); }
      var i = +b.dataset.i;
      elegir(sel === i ? -1 : i);
    });
  });

  var anim = null;
  crecer(0);
  if (reduced || !window.gsap || !window.ScrollTrigger){ terminar(); return; }
  var proxy = { s: 0.9 };
  anim = gsap.to(proxy, {
    s: S_FIN - 0.05, duration: 5, ease: 'none', paused: true,
    onUpdate: function(){ crecer(proxy.s); polvoConcepto.actualizar((proxy.s - 0.9) / (S_FIN - 0.05 - 0.9)); },
    onComplete: terminar
  });
  ScrollTrigger.create({ trigger: pista, start: 'top 55%', once: true, onEnter: function(){
    // el bloque del texto ya está en su sitio (las palabras, transparentes) antes de que empiece la arena
    cierre.style.transition = 'none';
    cierre.classList.add('visible');
    requestAnimationFrame(function(){ cierre.style.transition = ''; });
    anim.play();
  } });
})(); }catch(e){ console.error('Kairal: raíces no disponibles.', e); }

/* ============================================================
   4 · FLORACIÓN FINAL (Acto 7)
============================================================ */
(function(){
  var cv = document.getElementById('lienzo-flor');
  var ctx = cv.getContext('2d');
  var W=0, H=0, parts = [], inicio = 0, lanzado = false, visible = false;
  var nD = makeNoise(21);

  function resize(){
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W*DPR; cv.height = H*DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);
    crear();
    pintarFondo();
  }
  function ridgeY(x){
    return H*0.84 + (nD(x/W*4.4) - 0.5) * H*0.07;
  }
  var finFloracion = 0;   // ms desde inicio en que la última flor terminó de abrirse
  function crear(){
    parts = []; finFloracion = 0;
    var N = Math.round((movil ? 420 : 1300) * (tierBajo ? 0.5 : 1));
    for (var i=0;i<N;i++){
      var x = Math.random()*W;
      var distC = Math.abs(x - W/2)/(W/2);
      parts.push({
        x: x,
        y: ridgeY(x) + Math.random()*H*0.13,
        delay: distC*1300 + Math.random()*900,
        dur: 900 + Math.random()*700,
        r: 1.4 + Math.random()*2.8,
        col: Math.random() < 0.78 ? COL.flor : (Math.random()<0.5 ? '#E08BAB' : COL.alba),
        ph: Math.random()*6.28,
        tallo: 6 + Math.random()*16
      });
      var pp = parts[parts.length - 1];
      finFloracion = Math.max(finFloracion, pp.delay + pp.dur);
    }
  }
  // El cielo y la duna no cambian: se pintan una vez (por tamaño) en un
  // lienzo aparte y cada cuadro solo lo copia, en vez de rehacer degradados.
  var fondo = document.createElement('canvas'), fctx = fondo.getContext('2d');
  function pintarFondo(){
    fondo.width = cv.width; fondo.height = cv.height;
    fctx.setTransform(DPR,0,0,DPR,0,0);
    var real = ctx; ctx = fctx; dibujarFondo(); ctx = real;
  }
  function drawBase(){
    ctx.setTransform(1,0,0,1,0,0);
    ctx.drawImage(fondo, 0, 0);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  function dibujarFondo(){
    // cielo en alba plena
    var g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, '#0B2B27');
    g.addColorStop(0.5, '#1E4A42');
    g.addColorStop(0.8, '#8a5e3c');
    g.addColorStop(1, '#a06a40');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    var sg = ctx.createRadialGradient(W*0.5,H*0.86,0,W*0.5,H*0.86,Math.max(W,H)*0.6);
    sg.addColorStop(0,'rgba(242,166,90,0.55)');
    sg.addColorStop(1,'rgba(242,166,90,0)');
    ctx.fillStyle = sg; ctx.fillRect(0,0,W,H);
    // duna
    ctx.beginPath(); ctx.moveTo(0,H);
    for (var i=0;i<=80;i++){ var x=(i/80)*W; ctx.lineTo(x, ridgeY(x)); }
    ctx.lineTo(W,H); ctx.closePath();
    ctx.fillStyle = '#143B35'; ctx.fill();
    ctx.fillStyle = 'rgba(8,31,29,0.65)';
    ctx.fillRect(0, H*0.9, W, H*0.1);
  }
  function flor(p, k, t){
    var px = p.x + Math.sin(t*0.9 + p.ph)*1.6*k;
    var py = p.y - p.tallo*k;
    if (k > 0.25){
      ctx.strokeStyle = 'rgba(127,181,171,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(px, py); ctx.stroke();
    }
    ctx.fillStyle = p.col;
    if (p.r > 2.6 && k > 0.6){
      for (var a=0;a<5;a++){
        var ang = p.ph + a*1.2566;
        ctx.beginPath();
        ctx.ellipse(px + Math.cos(ang)*p.r*0.9*k, py + Math.sin(ang)*p.r*0.9*k, p.r*0.62*k, p.r*0.4*k, ang, 0, 6.28);
        ctx.fill();
      }
      ctx.fillStyle = COL.alba;
      ctx.beginPath(); ctx.arc(px,py,p.r*0.4*k,0,6.28); ctx.fill();
    } else {
      ctx.globalAlpha = clamp(k,0,1);
      ctx.beginPath(); ctx.arc(px,py,p.r*k,0,6.28); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  function draw(now){
    drawBase();
    var t = (now - inicio)/1000;
    for (var i=0;i<parts.length;i++){
      var p = parts[i];
      var e = (now - inicio - p.delay)/p.dur;
      if (e <= 0) continue;
      var k = e >= 1 ? 1 : 1 - Math.pow(1-e, 3);
      flor(p, k, t);
    }
  }
  resize();
  window.addEventListener('resize', resize);

  var io = new IntersectionObserver(function(en){
    visible = en[0].isIntersecting;
    if (visible && !lanzado){
      lanzado = true;
      inicio = performance.now() + (reduced ? -100000 : 300);
      if (reduced){ draw(performance.now()); }
    }
  }, { threshold: 0.3 });
  io.observe(cv);

  if (!reduced){
    // ya abiertas todas las flores, el vaivén es de 1-2px: basta con ~25 cuadros/s
    var ultimoCuadro = 0;
    bucleVisible(cv, function(now){
      if (!lanzado) return;
      if (now - inicio > finFloracion && now - ultimoCuadro < 40) return;
      ultimoCuadro = now;
      draw(now);
    });
  }
})();

/* ============================================================
   5 · FLORES GENERATIVAS (testimonios)
============================================================ */
document.querySelectorAll('.flor-svg').forEach(function(svg){
  var seed = +svg.dataset.seed || 1;
  var nP = 5 + Math.floor(hash(seed)*4);          // 5–8 pétalos
  var rot = hash(seed*3)*360;
  var rPet = 13 + hash(seed*7)*7;
  var ns = 'http://www.w3.org/2000/svg';
  var g = document.createElementNS(ns,'g');
  g.setAttribute('transform','translate(28,28) rotate('+rot.toFixed(1)+')');
  for (var i=0;i<nP;i++){
    var a = (i/nP)*360;
    var el = document.createElementNS(ns,'ellipse');
    el.setAttribute('cx', 0); el.setAttribute('cy', -rPet*0.62);
    el.setAttribute('rx', 6 + hash(seed+i)*3);
    el.setAttribute('ry', rPet*0.62);
    el.setAttribute('fill', i%2 ? '#C75C84' : '#D77BA0');
    el.setAttribute('opacity', 0.9);
    el.setAttribute('transform','rotate('+a+')');
    g.appendChild(el);
  }
  var c = document.createElementNS(ns,'circle');
  c.setAttribute('r', 5); c.setAttribute('fill', '#F2A65A');
  g.appendChild(c);
  svg.appendChild(g);
});

/* ============================================================
   5b · CARRUSEL DE HISTORIAS (testimonios)
   Cada tarjeta lleva un paisaje del desierto generado acá (sin fotos:
   son historias con datos protegidos), sembrado por la historia para que
   siempre salga igual. La tarjeta más cercana al centro es la "activa":
   crece y muestra la cita. Se navega con flechas, arrastre (mouse),
   deslizamiento (touch, scroll nativo), clic en una tarjeta o teclado.
============================================================ */
try{ (function(){
  var carril = document.getElementById('carril');
  if (!carril) return;
  var originales = [].slice.call(carril.querySelectorAll('.caso'));
  if (!originales.length) return;
  var flechas = [].slice.call(document.querySelectorAll('.flora-flecha'));

  // cielo (arriba → horizonte) distinto por historia, dentro de la paleta del sitio
  var CIELOS = [['#2b3f5c','#c97b6b'], ['#1d4a4a','#e0a463'], ['#3a2f55','#e3876a'], ['#22403a','#d9b26f']];
  var DUNAS = [['#b9845c', .55], ['#7a4a30', .8], ['#3a2418', .95]];
  originales.forEach(function(caso, i){
    var svg = caso.querySelector('.caso-paisaje');
    if (!svg) return;
    var seed = +svg.dataset.seed || i + 1;
    var cielo = CIELOS[i % CIELOS.length], id = 'caso-cielo-' + i;
    var h = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + cielo[0] + '"/><stop offset=".72" stop-color="' + cielo[1] + '"/></linearGradient></defs>' +
      '<rect width="400" height="520" fill="url(#' + id + ')"/>';
    // granos de arena suspendidos / primeras estrellas
    for (var g = 0; g < 40; g++){
      h += '<circle cx="' + (hash(seed * 31 + g) * 400).toFixed(1) + '" cy="' + (hash(seed * 37 + g) * 300).toFixed(1) +
        '" r="' + (0.4 + hash(seed * 41 + g) * 1.1).toFixed(2) + '" fill="#fbe6c9" opacity="' + (0.25 + hash(seed * 43 + g) * 0.5).toFixed(2) + '"/>';
    }
    // tres capas de dunas, cada vez más cerca y más oscuras
    for (var k = 0; k < 3; k++){
      var base = 330 + k * 55;
      var a = (hash(seed * 11 + k) - 0.5) * 60, b = (hash(seed * 13 + k) - 0.5) * 60, cc = (hash(seed * 17 + k) - 0.5) * 50;
      h += '<path fill="' + DUNAS[k][0] + '" opacity="' + DUNAS[k][1] + '" d="M0,' + (base + a).toFixed(0) +
        ' C110,' + (base - 40 + b).toFixed(0) + ' 190,' + (base + 30 + cc).toFixed(0) + ' 280,' + (base - 10 + a / 2).toFixed(0) +
        ' S400,' + (base + b / 2).toFixed(0) + ' 400,' + (base + 10) + ' L400,520 L0,520 Z"/>';
    }
    svg.innerHTML = h;
  });

  // Bucle infinito: tres juegos de tarjetas (copias · originales · copias). Se navega siempre por
  // el juego del medio: al pasar a una copia, el carril salta sin que se note al mismo lugar del
  // juego del medio (la copia es idéntica y está en el mismo estado), así nunca llega a un borde vacío.
  var n = originales.length;
  function copia(c){
    var k = c.cloneNode(true);
    k.setAttribute('aria-hidden', 'true');
    k.removeAttribute('aria-label');
    k.setAttribute('tabindex', '-1');
    return k;
  }
  var antes = originales.map(copia), despues = originales.map(copia);
  antes.forEach(function(k){ carril.insertBefore(k, originales[0]); });
  despues.forEach(function(k){ carril.appendChild(k); });
  var casos = antes.concat(originales, despues);

  // La tarjeta activa se alinea con el borde izquierdo del título.
  var cabecera = document.querySelector('.flora-head');
  var mg = 0;
  function medirMargen(){
    if (!cabecera) return;
    var cs = getComputedStyle(cabecera);
    mg = cabecera.getBoundingClientRect().left - carril.getBoundingClientRect().left + parseFloat(cs.paddingLeft);
    carril.style.setProperty('--margen', mg + 'px');
  }
  function izquierdaDe(c){ return c.offsetLeft - mg; }
  function masCercana(){
    var x = carril.scrollLeft, mejor = 0, dist = Infinity;
    casos.forEach(function(c, j){ var d = Math.abs(izquierdaDe(c) - x); if (d < dist){ dist = d; mejor = j; } });
    return mejor;
  }
  var activa = -1;
  // «activa» (la tarjeta grande) la llevan la tarjeta elegida y sus copias: así el salto del
  // bucle cambia de tarjeta sin cambiar nada de lo que se ve.
  function marcar(i){
    if (i === activa) return;
    activa = i;
    casos.forEach(function(c, j){
      var es = j % n === i % n;
      c.classList.toggle('activa', es);
      if (j >= n && j < 2 * n) c.setAttribute('aria-current', es ? 'true' : 'false');
    });
  }
  function ir(i, instantaneo){
    i = clamp(i, 0, casos.length - 1);
    carril.scrollTo({ left: izquierdaDe(casos[i]), behavior: (instantaneo || reduced) ? 'auto' : 'smooth' });
    marcar(i);
  }
  // Fuera del juego del medio: se salta, sin animación, a la misma tarjeta del juego del medio.
  function centrar(){
    if (activa < 0 || (activa >= n && activa < 2 * n)) return;
    var destino = n + (activa % n);
    carril.classList.add('sin-snap');
    carril.scrollTo({ left: izquierdaDe(casos[destino]), behavior: 'auto' });
    activa = destino;
    // se devuelve el snap en el cuadro siguiente, ya asentado en la posición nueva
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ carril.classList.remove('sin-snap'); }); });
  }

  var pendiente = false, finScroll = 0;
  carril.addEventListener('scroll', function(){
    clearTimeout(finScroll);
    finScroll = setTimeout(centrar, 140);   // cuando el carril deja de moverse
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(function(){ pendiente = false; marcar(masCercana()); });
  }, { passive: true });

  flechas.forEach(function(f){ f.addEventListener('click', function(){ ir(activa + (+f.dataset.dir)); }); });
  carril.addEventListener('keydown', function(e){
    if (e.key === 'ArrowRight'){ e.preventDefault(); ir(activa + 1); }
    if (e.key === 'ArrowLeft'){ e.preventDefault(); ir(activa - 1); }
  });

  // Arrastre con mouse (touch y trackpad ya usan el scroll nativo). Mientras
  // se arrastra se apaga el snap; al soltar se centra la tarjeta más cercana.
  // Un arrastre no debe contar como clic sobre la tarjeta donde se soltó.
  var arrastre = null, ignorarClic = false;
  carril.addEventListener('pointerdown', function(e){
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    arrastre = { x: e.clientX, s: carril.scrollLeft, movio: false };
  });
  window.addEventListener('pointermove', function(e){
    if (!arrastre) return;
    var dx = e.clientX - arrastre.x;
    if (!arrastre.movio && Math.abs(dx) > 5){ arrastre.movio = true; carril.classList.add('arrastrando'); }
    if (arrastre.movio) carril.scrollLeft = arrastre.s - dx;
  });
  window.addEventListener('pointerup', function(){
    if (!arrastre) return;
    var movio = arrastre.movio;
    arrastre = null;
    if (!movio) return;
    carril.classList.remove('arrastrando');
    ignorarClic = true;
    setTimeout(function(){ ignorarClic = false; }, 0);
    ir(masCercana());
  });
  casos.forEach(function(c, j){
    c.addEventListener('click', function(){ if (!ignorarClic && j !== activa) ir(j); });
  });

  // arranca con la primera historia centrada y activa
  medirMargen();
  ir(n, true);
  window.addEventListener('resize', function(){ medirMargen(); if (activa >= 0) ir(activa, true); });
})(); }catch(e){ console.error('Kairal: carrusel de historias no disponible.', e); }

/* ============================================================
   6 · REVELADOS, HEADER, NAV, FLOTANTES
============================================================ */
var revelables = [
  ['#retrato','visible'], ['#viaje','visible']
];
var ioRev = new IntersectionObserver(function(ents){
  ents.forEach(function(en){
    if (en.isIntersecting){ en.target.classList.add('visible'); ioRev.unobserve(en.target); }
  });
}, { threshold: 0.3 });
revelables.forEach(function(r){
  var el = document.querySelector(r[0]); if (el) ioRev.observe(el);
});
// Las tarjetas se revelan todas juntas (escalonadas) cuando el carrusel entra
// en pantalla: con la alineada a la izquierda, la siguiente apenas asoma y no
// alcanzaría el umbral de visibilidad por sí sola.
var carrilRev = document.getElementById('carril');
if (carrilRev){
  var tarjetasRev = [].slice.call(carrilRev.querySelectorAll('.caso'));
  tarjetasRev.forEach(function(c, i){ c.style.transitionDelay = (i*0.12)+'s'; });
  var ioCarril = new IntersectionObserver(function(ents){
    if (!ents[0].isIntersecting) return;
    tarjetasRev.forEach(function(c){ c.classList.add('visible'); });
    ioCarril.disconnect();
  }, { threshold: 0.25 });
  ioCarril.observe(carrilRev);
}
document.querySelectorAll('.blog-card').forEach(function(c, i){
  c.style.transitionDelay = (i*0.1)+'s';
  ioRev.observe(c);
});
document.querySelectorAll('.faq-item').forEach(function(c, i){
  c.style.transitionDelay = (i*0.07)+'s';
  ioRev.observe(c);
});
// FAQ: la respuesta se despliega/pliega deslizándose en vez de saltar de
// golpe (lo que hace el <details> nativo). Se sigue usando <details>
// (accesible, funciona con teclado); solo se anima la altura. Arranca
// siempre desde la altura que tenga en ese momento, así un clic a mitad
// de animación no salta.
if (!reduced){
  document.querySelectorAll('.faq-item').forEach(function(item){
    var sum = item.querySelector('summary'), cuerpo = item.querySelector('.faq-r');
    if (!sum || !cuerpo || !cuerpo.animate) return;
    var abierto = item.open, anim = null;
    sum.addEventListener('click', function(ev){
      ev.preventDefault();
      var desde = item.open ? cuerpo.getBoundingClientRect().height : 0;
      if (anim){ anim.onfinish = null; anim.cancel(); }
      abierto = !abierto;
      if (abierto) item.open = true;
      var hasta = abierto ? cuerpo.scrollHeight : 0;
      anim = cuerpo.animate(
        [{ height: desde + 'px', opacity: abierto ? 0.2 : 1 }, { height: hasta + 'px', opacity: abierto ? 1 : 0 }],
        { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' });
      anim.onfinish = function(){ anim = null; if (!abierto) item.open = false; };
    });
  });
}

// header + flotantes por scroll
var header = document.getElementById('header');
var fab = document.getElementById('fab-wsp');
var barra = document.getElementById('barra-movil');
var metodoEl = document.getElementById('metodo');
function onScroll(){
  var y = window.scrollY;
  var hMax = document.documentElement.scrollHeight - window.innerHeight;
  header.classList.toggle('solido', y > window.innerHeight*0.7);
  fab.classList.toggle('visible', hMax > 0 && y/hMax > 0.42);
  if (movil && metodoEl){
    barra.classList.toggle('visible', y > metodoEl.offsetTop - window.innerHeight*0.5);
  }
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// nav de actos
var secciones = ['inicio','sintomas','causa-raiz','metodo','doctora','floraciones','agendar'];
var navLinks = {};
document.querySelectorAll('.actos-nav a').forEach(function(a){ navLinks[a.dataset.acto] = a; });
var ioNav = new IntersectionObserver(function(ents){
  ents.forEach(function(en){
    if (en.isIntersecting){
      var id = en.target.id;
      Object.keys(navLinks).forEach(function(k){ navLinks[k].classList.toggle('activo', k === id); });
    }
  });
}, { threshold: 0.25 });
secciones.forEach(function(id){
  var el = document.getElementById(id);
  if (el && el.tagName !== 'SPAN') ioNav.observe(el);
});

/* ============================================================
   7 · CURSOR CONTEXTUAL + BOTONES MAGNÉTICOS
============================================================ */
// relleno líquido: envolver el contenido de cada botón
document.querySelectorAll('.btn').forEach(function(b){
  if (!b.querySelector('.btn-texto')){
    var s = document.createElement('span');
    s.className = 'btn-texto';
    while (b.firstChild) s.appendChild(b.firstChild);
    b.appendChild(s);
  }
});

if (window.matchMedia('(pointer:fine)').matches && !reduced){
  document.body.classList.add('con-cursor');
  var cur = document.getElementById('cursor');
  var tagEl = cur.querySelector('.cursor-tag');
  var cx = -100, cy = -100, tx = -100, ty = -100;
  // El bucle del cursor corre solo mientras se mueve el mouse (y hasta que el
  // círculo alcanza al puntero); quieto, no pide cuadros ni toca estilos.
  var cursorCorriendo = false;
  document.addEventListener('mousemove', function(e){
    tx = e.clientX; ty = e.clientY;
    if (!cursorCorriendo){ cursorCorriendo = true; requestAnimationFrame(loopC); }
  });
  document.querySelectorAll('a,button,[data-cursor],.chip').forEach(function(el){
    el.addEventListener('mouseenter', function(){ cur.classList.add('grande'); });
    el.addEventListener('mouseleave', function(){ cur.classList.remove('grande'); });
  });
  // cursor que habla: contexto por zona interactiva
  [['.raiz-lienzo','Explorar'], ['#carril','Arrastrar'], ['#lienzo-gota','Llover'], ['#lienzo-flor','Florecer']].forEach(function(par){
    var el = document.querySelector(par[0]);
    if (!el) return;
    el.addEventListener('mouseenter', function(){ tagEl.textContent = par[1]; cur.classList.add('tagged'); });
    el.addEventListener('mouseleave', function(){ cur.classList.remove('tagged'); });
  });
  // mismo sistema, para grupos de elementos repetidos (tarjetas expandibles)
  [['.faq-item summary','Ver respuesta']].forEach(function(par){
    document.querySelectorAll(par[0]).forEach(function(el){
      el.addEventListener('mouseenter', function(){ tagEl.textContent = par[1]; cur.classList.add('tagged'); });
      el.addEventListener('mouseleave', function(){ cur.classList.remove('tagged'); });
    });
  });
  function loopC(){
    cx = lerp(cx, tx, 0.18); cy = lerp(cy, ty, 0.18);
    cur.style.transform = 'translate('+cx+'px,'+cy+'px)';
    if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3 && pagVisible) requestAnimationFrame(loopC);
    else cursorCorriendo = false;
  }

  // magnetismo real: el botón se inclina hacia el cursor y vuelve con elasticidad
  if (gsapOK){
    document.querySelectorAll('.btn').forEach(function(b){
      b.addEventListener('mousemove', function(e){
        var r = b.getBoundingClientRect();
        gsap.to(b, {
          x: ((e.clientX - r.left)/r.width - 0.5)*16,
          y: ((e.clientY - r.top)/r.height - 0.5)*10,
          duration: 0.4, ease: 'power3.out'
        });
      });
      b.addEventListener('mouseleave', function(){
        gsap.to(b, { x:0, y:0, duration: 0.85, ease: 'elastic.out(1,0.45)' });
      });
    });
  }
}

/* ============================================================
   8 · SONIDO AMBIENTAL (viento del desierto, WebAudio)
============================================================ */
(function(){
  var btn = document.getElementById('toggle-sonido');
  var ACtx = window.AudioContext || window.webkitAudioContext;
  if (!ACtx){
    // sin soporte de WebAudio: no ofrecemos un control que no puede funcionar
    if (btn) btn.style.display = 'none';
    return;
  }
  var actx = null, gain = null, encendido = false;
  function crear(){
    actx = new ACtx();
    var dur = 4, sr = actx.sampleRate;
    var buf = actx.createBuffer(1, sr*dur, sr);
    var d = buf.getChannelData(0), last = 0;
    for (var i=0;i<d.length;i++){
      var w = Math.random()*2-1;
      last = (last + 0.02*w)/1.02;           // brown noise
      d[i] = last*3.2;
    }
    var src = actx.createBufferSource();
    src.buffer = buf; src.loop = true;
    var lp = actx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.6;
    gain = actx.createGain(); gain.gain.value = 0;
    // LFO de viento
    var lfo = actx.createOscillator(); lfo.frequency.value = 0.09;
    var lfoG = actx.createGain(); lfoG.gain.value = 130;
    lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
    src.connect(lp); lp.connect(gain); gain.connect(actx.destination);
    src.start();
  }
  btn.addEventListener('click', function(){
    try{
      if (!actx) crear();
      if (actx.state === 'suspended') actx.resume();
      encendido = !encendido;
      gain.gain.cancelScheduledValues(actx.currentTime);
      gain.gain.linearRampToValueAtTime(encendido ? 0.06 : 0, actx.currentTime + 1.2);
      btn.classList.toggle('on', encendido);
      btn.setAttribute('aria-pressed', String(encendido));
      btn.querySelector('.etiqueta').textContent = encendido ? 'Sonido on' : 'Sonido';
    }catch(err){
      console.warn('Kairal: sonido ambiental no disponible en este navegador.', err);
      btn.style.display = 'none';
    }
  });
})();

/* ============================================================
   12 · EL JARDÍN DE LA GUÍA (sección Doctora)
   Un jardín generativo que florece con el scroll. Las flores viven
   en el borde inferior y los márgenes; el texto queda intacto.
============================================================ */
try{ (function(){
  var cv = document.getElementById('lienzo-jardin');
  var sec = document.getElementById('doctora');
  if (!cv || !sec) return;
  var ctx = cv.getContext('2d');
  var W=0, H=0, visible=false, t0=performance.now();
  var plantas=[], hierbas=[], petalosCaen=[];
  var bloomP = 0, bloomSuave = 0;
  var vientoX = -9999;
  var nJ = makeNoise(51);

  function crearJardin(){
    plantas=[]; hierbas=[]; petalosCaen=[];
    var nP = Math.round((movil?13:26)*(tierBajo?0.6:1));
    // pradera inferior
    for (var i=0;i<nP;i++){
      var fx = (i+0.5)/nP + (hash(i*7)-0.5)*0.03;
      plantas.push({
        x: fx*W,
        tallo: (movil?34:46) + hash(i*3)*(movil?42:66),
        r: 6 + hash(i*11)*8,
        nPet: 5 + Math.floor(hash(i*13)*3),
        col: hash(i*17) < 0.72 ? '#C75C84' : (hash(i*17) < 0.86 ? '#D77BA0' : '#E8A25E'),
        thr: fx*0.55 + hash(i*19)*0.35,      // oleada de izquierda a derecha, con azar
        ph: hash(i*23)*6.28,
        vel: 0.6 + hash(i*29)*0.7,
        lado: false
      });
    }
    // brotes laterales (márgenes seguros, lejos del texto)
    var nL = movil ? 4 : 7;
    for (var j=0;j<nL;j++){
      var izq = j % 2 === 0;
      plantas.push({
        x: izq ? W*(0.015 + hash(j*31)*0.02) : W*(0.965 + hash(j*31)*0.02),
        yProp: 0.25 + hash(j*37)*0.55,        // altura relativa en la sección
        tallo: 20 + hash(j*41)*26,
        r: 4.5 + hash(j*43)*4,
        nPet: 5 + Math.floor(hash(j*47)*2),
        col: hash(j*53) < 0.7 ? '#C75C84' : '#D77BA0',
        thr: 0.25 + hash(j*59)*0.55,
        ph: hash(j*61)*6.28,
        vel: 0.7 + hash(j*67)*0.6,
        lado: true
      });
    }
    // hierbas de relleno
    var nH = Math.round((movil?26:60)*(tierBajo?0.6:1));
    for (var k=0;k<nH;k++){
      hierbas.push({
        x: hash(k*71)*W,
        h: 10 + hash(k*73)*26,
        ph: hash(k*79)*6.28,
        thr: hash(k*83)*0.85,
        curva: (hash(k*89)-0.5)*14
      });
    }
  }

  function resize(){
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W*DPR; cv.height = H*DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);
    crearJardin();
    if (reduced){ bloomSuave = 1; draw(performance.now()); }
  }

  function flor(px, py, r, nPet, col, k, sway){
    if (k <= 0.02) return;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(sway);
    var rk = r*k;
    for (var a=0; a<nPet; a++){
      var ang = (a/nPet)*6.283;
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.ellipse(Math.cos(ang)*rk*0.72, Math.sin(ang)*rk*0.72, rk*0.56, rk*0.36, ang, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#F2A65A';
    ctx.beginPath(); ctx.arc(0, 0, rk*0.34, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  function draw(now){
    var t = (now - t0)/1000;
    ctx.clearRect(0,0,W,H);
    var suelo = H - 8;

    // hierbas
    hierbas.forEach(function(hb){
      var k = clamp((bloomSuave - hb.thr)/0.2, 0, 1);
      if (k <= 0.02) return;
      var sw = Math.sin(t*0.9 + hb.ph)*3;
      ctx.strokeStyle = 'rgba(14,124,107,'+(0.28*k).toFixed(3)+')';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(hb.x, suelo);
      ctx.quadraticCurveTo(hb.x + hb.curva*0.5, suelo - hb.h*k*0.6, hb.x + hb.curva + sw, suelo - hb.h*k);
      ctx.stroke();
    });

    // plantas con flor
    plantas.forEach(function(pl){
      var k = clamp((bloomSuave - pl.thr)/0.22, 0, 1);
      if (k <= 0.02) return;
      k = 1 - Math.pow(1-k, 3);
      // viento: más balanceo cerca del cursor
      var cerca = vientoX > -999 ? clamp(1 - Math.abs(vientoX - pl.x)/220, 0, 1) : 0;
      var sway = Math.sin(t*pl.vel + pl.ph) * (0.06 + cerca*0.16);
      var baseX = pl.x, baseY;
      if (pl.lado){ baseY = H*pl.yProp; } else { baseY = suelo; }
      var tipX = baseX + Math.sin(sway)*pl.tallo*k;
      var tipY = baseY - Math.cos(sway)*pl.tallo*k;
      // tallo
      ctx.strokeStyle = 'rgba(14,124,107,'+(0.55*k).toFixed(3)+')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(baseX + Math.sin(sway)*pl.tallo*0.3, baseY - pl.tallo*k*0.55, tipX, tipY);
      ctx.stroke();
      // hoja
      if (k > 0.4){
        var hk = (k-0.4)/0.6;
        var hy = baseY - pl.tallo*k*0.45;
        ctx.fillStyle = 'rgba(14,124,107,'+(0.4*hk).toFixed(3)+')';
        ctx.beginPath();
        ctx.ellipse(baseX + 7*hk, hy, 7*hk, 3*hk, -0.5, 0, 6.283);
        ctx.fill();
      }
      // flor: abre después de que el tallo crece
      var fk = clamp((k - 0.55)/0.45, 0, 1);
      fk = 1 - Math.pow(1-fk, 2);
      flor(tipX, tipY, pl.r, pl.nPet, pl.col, fk, sway*1.4);
    });

    // pétalos a la deriva
    if (!reduced && bloomSuave > 0.5 && petalosCaen.length < (movil?4:7) && Math.random() < 0.012){
      petalosCaen.push({
        x: Math.random()*W, y: H*0.3 + Math.random()*H*0.3,
        vx: 0.25 + Math.random()*0.4, ph: Math.random()*6.28, vida: 0
      });
    }
    for (var i=petalosCaen.length-1; i>=0; i--){
      var pe = petalosCaen[i];
      pe.vida += 0.004;
      pe.x += pe.vx + Math.sin(t*1.2 + pe.ph)*0.5;
      pe.y += 0.45 + Math.sin(t*0.8 + pe.ph)*0.2;
      if (pe.y > H - 14 || pe.vida > 1){ petalosCaen.splice(i,1); continue; }
      ctx.save();
      ctx.translate(pe.x, pe.y);
      ctx.rotate(t*1.5 + pe.ph);
      ctx.fillStyle = 'rgba(199,92,132,'+(0.55*(1-pe.vida)).toFixed(3)+')';
      ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 2.6, 0, 0, 6.283); ctx.fill();
      ctx.restore();
    }
  }

  // progreso de florecimiento por scroll
  function calcularBloom(){
    var rect = sec.getBoundingClientRect();
    var vh = window.innerHeight;
    bloomP = clamp(((vh*0.88) - rect.top) / (vh*0.75), 0, 1);
  }

  // viento con el cursor
  sec.addEventListener('pointermove', function(e){
    var rect = cv.getBoundingClientRect();
    vientoX = e.clientX - rect.left;
  });
  sec.addEventListener('pointerleave', function(){ vientoX = -9999; });

  resize();
  window.addEventListener('resize', resize);

  var ioJ = new IntersectionObserver(function(en){
    visible = en[0].isIntersecting;
    if (visible && reduced){ bloomSuave = 1; draw(performance.now()); }
  }, { threshold: 0.05 });
  ioJ.observe(sec);

  if (!reduced){
    window.addEventListener('scroll', calcularBloom, { passive: true });
    calcularBloom();
    // ya abierto y sin cursor encima, el balanceo es lento: ~30 cuadros/s alcanzan
    var ultimoCuadroJ = 0;
    bucleVisible(sec, function(now){
      var quieto = Math.abs(bloomSuave - bloomP) < 0.002 && vientoX < -999;
      if (quieto && now - ultimoCuadroJ < 32) return;
      var dtJ = ultimoCuadroJ ? Math.min(0.1, (now - ultimoCuadroJ) / 1000) : 1 / 60;
      ultimoCuadroJ = now;
      bloomSuave = lerp(bloomSuave, bloomP, 1 - Math.pow(1 - 0.045, dtJ * 60));   // en tiempo real, no por cuadro
      draw(now);
    });
  }
})(); }catch(e){ console.error('Kairal: jardín no disponible.', e); }

/* ============================================================
   14 · ÓRBITA DE SERVICIOS: Medicina Funcional
   Una sola pantalla: "MEDICINA FUNCIONAL" al centro de una órbita con las
   11 áreas alrededor. Un recorrido automático (6.5s por área, pausable)
   lleva el trazo de arena de área en área -pasando siempre por la
   palabra- y el panel muestra el área activa; tocar un área lleva el
   trazo ahí. Después de la última, la palabra se dispersa y la frase de
   cierre ocupa su lugar; luego vuelve a empezar. Es su propia IIFE -sin
   acceso por clausura a gsapOK/DPR/etc de otras secciones-, así que todo
   se recalcula localmente.
============================================================ */
try{ (function(){
  if (!window.gsap) return; // sin GSAP: la sección se ve estática con la primera área
  var reducedLocal = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var fijo = document.getElementById('motor-fijo');
  var orbita = document.getElementById('motor-orbita');
  var panel = document.getElementById('motor-panel');
  var frase = document.getElementById('motor-frase');
  var kickerEl = document.getElementById('motor-kicker-texto');
  var tituloEl = document.getElementById('motor-titulo');
  var descEl = document.getElementById('motor-desc');
  var progreso = document.getElementById('motor-progreso');
  if (!fijo || !orbita || !panel || !frase) return;
  var areas = [].slice.call(orbita.querySelectorAll('.motor-area'));
  var barra = progreso && progreso.querySelector('span');

  // Anillo de arena: mismo efecto de partículas que #lienzo-polvo-textos
  // del hero (mismos tonos), pero acá no dibujan letras -trazan el
  // CONTORNO de una elipse que gira sin parar y viaja (nunca salta) al
  // centro o al panel activo. Como las 3 propiedades que definen "dónde
  // está el anillo ahora" (cx, cy, rx, ry) son un solo objeto tweedeable,
  // GSAP anima esas 4 y el dibujo de cada partícula sale solo -no hace
  // falta animar cada partícula a mano como en el hero (ahí cada dron
  // viaja de una letra a otra distinta; acá todas comparten la misma
  // elipse en todo momento).
  function construirPolvoAro(cv, stage){
    if (!cv || reducedLocal) return {
      irA:function(){},
      viajar:function(prepararPanel, mostrarPanel){ prepararPanel(); mostrarPanel(); },
      vueltaInicial:function(onDone){ if (onDone) onDone(); }
    };
    var ctx = cv.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    var W = 0, H = 0;
    var movilLocal = window.matchMedia('(max-width:920px)').matches;
    // Trazo SUTIL: casi una línea fina de arena, no una franja. Pocos granos
    // diminutos (cuadraditos de ~1px con fillRect), banda angosta y tenue.
    var N = movilLocal ? 45 : 75;
    var BANDA_PX = movilLocal ? 6 : 8;
    // Tonos de arena sobre fondo claro (más oscuros que los del hero, que
    // está sobre fondo oscuro), con pocos granos turquesa y dorados.
    var TONOS = ['168,138,96', '168,138,96', '140,112,74', '140,112,74', '118,92,60', '196,162,112',
                 '196,162,112', '52,122,112', '196,118,48'];

    // El arco NUNCA cubre el círculo completo -siempre queda un hueco
    // visible-. COBERTURA_REPOSO es el barrido normal (~275°, deja un
    // hueco de ~85°). COBERTURA_VUELTA es el barrido durante la "vuelta
    // completa" del arranque del scroll (Task 4): el hueco se angosta a
    // ~20°, pero NUNCA llega a 0°/360° -la vuelta es la ROTACIÓN de
    // 360°, no el cierre geométrico del arco.
    var COBERTURA_REPOSO = 275 * Math.PI / 180;
    var COBERTURA_VUELTA = 340 * Math.PI / 180;

    var particulas = [];
    for (var i = 0; i < N; i++){
      // ~15% es "polvo": más suelto y tenue, se escapa del trazo hacia
      // los lados como arena soplada
      var polvo = Math.random() < 0.03;
      // banda con forma de campana (suma de 3 azares): densa en el
      // centro del trazo y rala hacia los bordes, no una franja pareja
      var campana = (Math.random() + Math.random() + Math.random()) / 3 * 2 - 1;
      var tam = Math.random();
      particulas.push({
        t: i / N,
        color: 'rgb(' + TONOS[(Math.random() * TONOS.length) | 0] + ')',
        r: 0.8 + tam * tam * 0.6,                   // granos chicos, pocos un poco mayores
        alfa: polvo ? 0.2 + Math.random() * 0.25 : 0.45 + Math.random() * 0.4,
        jFase: Math.random() * 6.283,
        jVel: 0.5 + Math.random() * 0.6,
        jAmp: (polvo ? 0.9 : 0.2) + Math.random() * 0.7,
        // Offset radial FIJO por partícula (no cambia cuadro a cuadro):
        // todas al mismo radio se ve como una línea; con esta banda se
        // ve como una franja de arena de varios granos de espesor.
        banda: campana * BANDA_PX * (polvo ? 1.6 : 1)
      });
    }

    // Único estado tweedeable: la elipse donde "vive" el anillo ahora
    // mismo, más coberturaRad (cuánto barre el arco) y rotacionBoost (el
    // impulso extra de la vuelta inicial, Task 4). rotacion (abajo,
    // variable de closure) es el giro ambiente continuo -independiente
    // de a dónde esté viajando la elipse o de la vuelta completa.
    // modoTrazo: 0 = las partículas dibujan el arco en reposo, 1 = dibujan
    // el trazo en viaje (ver "Trazo" más abajo). Entre medio, cada
    // partícula se mezcla entre sus dos posiciones -así el traspaso entre
    // arco quieto y trazo en marcha no salta.
    var estado = { cx: 0, cy: 0, rx: 90, ry: 90, opacidad: 0, coberturaRad: COBERTURA_REPOSO, rotacionBoost: 0, modoTrazo: 0 };
    var rotacion = 0, ultimoNow = 0, activo = false, viajes = 0, grosor = 1;
    var etiqueta = stage.querySelector('.motor-permanente');

    function resize(){
      W = stage.clientWidth; H = stage.clientHeight;
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    window.addEventListener('resize', resize);
    resize();

    // Estado de reposo y parada obligada entre párrafos: un círculo
    // alrededor del texto permanente "MEDICINA FUNCIONAL", medido sobre
    // la etiqueta real (no un % fijo -en mobile la etiqueta no está en el
    // 36% del alto). En mobile es una elipse aplanada: un círculo del
    // ancho de la etiqueta se metería debajo del header fijo.
    function centro(){
      var r = etiqueta && etiqueta.getBoundingClientRect();
      if (r && r.width){
        var base = stage.getBoundingClientRect();
        var cx = r.left + r.width / 2 - base.left, cy = r.top + r.height / 2 - base.top;
        var rx = r.width / 2 + (movilLocal ? 22 : 26);
        return { cx: cx, cy: cy, rx: rx, ry: movilLocal ? r.height / 2 + 30 : rx };
      }
      var radio = Math.min(95, W * 0.085, H * 0.16);
      return { cx: W / 2, cy: H * 0.36, rx: radio, ry: radio };
    }
    // El anillo se agranda/achica para calzar con el tamaño real del
    // panel (getBoundingClientRect en vivo, no un tamaño fijo -el texto
    // de cada escena mide distinto), con un margen para que el trazo
    // quede AFUERA del texto, no encima.
    function elipseDe(el){
      var r = el.getBoundingClientRect();
      var base = stage.getBoundingClientRect();
      // las áreas de la órbita son chicas y están juntas: margen más justo
      // para que el arco que las envuelve no tape a las vecinas
      var chico = el.classList.contains('motor-area');
      return {
        cx: r.left + r.width / 2 - base.left,
        cy: r.top + r.height / 2 - base.top,
        rx: r.width / 2 + (chico ? 16 : 30),
        ry: r.height / 2 + (chico ? 14 : 26)
      };
    }

    /* ---------- Trazo ----------
       Un viaje entre párrafos es un trazo continuo, como un lápiz: se
       arma una RUTA (arco del párrafo actual → recta → vuelta alrededor
       de "MEDICINA FUNCIONAL" → recta → arco del párrafo nuevo) y la
       punta avanza por ella; cada partícula va a una distancia fija
       detrás de la punta (t=1 es la punta, t=0 la cola), así todo el
       trazo pasa por el mismo camino que dibujó la punta. Las rectas
       salen y entran TANGENTES a las curvas (tangente común), sin quiebres.
       Cada viaje se recorre en un solo sentido (sg = 1 horario, -1
       antihorario), el que le permita dejar el párrafo viejo antes: así
       sale casi derecho en vez de dar media vuelta al párrafo primero. */
    var VEL = 1350;      // px/s de crucero de la punta
    var T_ACEL = 0.45;   // s hasta llegar a crucero (arranca suave)
    var FRENO = 260;     // px antes del final en que empieza a frenar
    var viaje = null, tweenModo = null, puntoTmp = { x: 0, y: 0, tx: 1, ty: 0 };

    function pElipse(E, th){ return { x: E.cx + E.rx * Math.cos(th), y: E.cy + E.ry * Math.sin(th) }; }
    function tElipse(E, th, sg){
      var x = -E.rx * Math.sin(th) * sg, y = E.ry * Math.cos(th) * sg, n = Math.sqrt(x * x + y * y) || 1;
      return { x: x / n, y: y / n };
    }
    // Ángulo donde una recta que viene de P entra tangente a E, ya
    // moviéndose en el sentido sg. Se resuelve como si E fuera un círculo
    // unitario (escalando por rx/ry: la escala conserva las tangencias).
    // null si P está dentro de E.
    function entradaTangente(P, E, sg){
      var ux = (P.x - E.cx) / E.rx, uy = (P.y - E.cy) / E.ry, d = Math.sqrt(ux * ux + uy * uy);
      if (d <= 1.02) return null;
      return Math.atan2(uy, ux) + sg * Math.acos(1 / d);
    }
    // Recorriendo E desde `desde` en el sentido sg, primer ángulo en que
    // la tangente de E apunta a la entrada tangente de D: ahí el trazo
    // deja E y va en recta hasta D sin quiebre. Devuelve también dónde
    // entra a D y cuánto tuvo que seguir por E (extra).
    function salidaHacia(E, desde, D, sg){
      var mejor = null, mejorAng = 9;
      for (var k = 0; k <= 180; k++){
        var th = desde + sg * k * (Math.PI / 90);
        var P = pElipse(E, th), thD = entradaTangente(P, D, sg);
        if (thD === null) continue;
        var Q = pElipse(D, thD), vx = Q.x - P.x, vy = Q.y - P.y, n = Math.sqrt(vx * vx + vy * vy) || 1;
        var t = tElipse(E, th, sg), c = (t.x * vx + t.y * vy) / n;
        if (c <= 0) continue;
        var ang = Math.acos(Math.min(1, c));
        if (ang < 0.07) return { th: th, thD: thD, extra: k };
        if (ang < mejorAng){ mejorAng = ang; mejor = { th: th, thD: thD, extra: k }; }
      }
      if (mejor) return mejor;
      var P0 = pElipse(E, desde), th0 = entradaTangente(P0, D, sg);
      return { th: desde, thD: th0 === null ? Math.atan2(P0.y - D.cy, P0.x - D.cx) : th0, extra: 0 };
    }

    // Ruta: polilínea densa (un punto cada ~2.5px) con largo acumulado,
    // para ubicar cualquier distancia s sobre ella con búsqueda binaria.
    function Ruta(){ this.x = []; this.y = []; this.s = []; }
    Ruta.prototype.punto = function(x, y){
      var n = this.x.length;
      if (n){
        var dx = x - this.x[n - 1], dy = y - this.y[n - 1], d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.5) return;
        this.s.push(this.s[n - 1] + d);
      } else this.s.push(0);
      this.x.push(x); this.y.push(y);
    };
    Ruta.prototype.largo = function(){ return this.s.length ? this.s[this.s.length - 1] : 0; };
    Ruta.prototype.elipse = function(E, th0, th1){
      var pasos = Math.max(2, Math.ceil(Math.abs(th1 - th0) * Math.max(E.rx, E.ry) / 2.5));
      for (var i = 0; i <= pasos; i++){ var p = pElipse(E, th0 + (th1 - th0) * i / pasos); this.punto(p.x, p.y); }
    };
    // Curva suave (Bézier cúbica) desde el último punto, saliendo en la
    // dirección (t0x,t0y) y llegando a (x3,y3) en la dirección (t3x,t3y):
    // empalma sin quiebres con lo que viene antes y con lo que sigue. Si
    // las dos direcciones apuntan parecido, es casi una recta.
    Ruta.prototype.curva = function(t0x, t0y, x3, y3, t3x, t3y){
      var n = this.x.length, x0 = this.x[n - 1], y0 = this.y[n - 1];
      var d = Math.sqrt((x3 - x0) * (x3 - x0) + (y3 - y0) * (y3 - y0)), h = d * 0.38;
      var x1 = x0 + t0x * h, y1 = y0 + t0y * h, x2 = x3 - t3x * h, y2 = y3 - t3y * h;
      var pasos = Math.max(2, Math.ceil(d / 2.5));
      for (var i = 1; i <= pasos; i++){
        var u = i / pasos, w = 1 - u;
        this.punto(w * w * w * x0 + 3 * w * w * u * x1 + 3 * w * u * u * x2 + u * u * u * x3,
                   w * w * w * y0 + 3 * w * w * u * y1 + 3 * w * u * u * y2 + u * u * u * y3);
      }
    };
    Ruta.prototype.linea = function(x1, y1){
      var n = this.x.length, x0 = this.x[n - 1], y0 = this.y[n - 1];
      var d = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)), pasos = Math.max(1, Math.ceil(d / 3));
      for (var i = 1; i <= pasos; i++) this.punto(x0 + (x1 - x0) * i / pasos, y0 + (y1 - y0) * i / pasos);
    };
    // Posición y tangente unitaria en la distancia s (acotada a la ruta).
    Ruta.prototype.en = function(s, out){
      var S = this.s, n = S.length;
      if (n < 2){ out.x = this.x[0] || 0; out.y = this.y[0] || 0; out.tx = 1; out.ty = 0; return out; }
      if (s <= 0) s = 0; else if (s >= S[n - 1]) s = S[n - 1];
      var lo = 0, hi = n - 1;
      while (hi - lo > 1){ var mid = (lo + hi) >> 1; if (S[mid] <= s) lo = mid; else hi = mid; }
      var seg = (S[hi] - S[lo]) || 1, f = (s - S[lo]) / seg;
      var dx = this.x[hi] - this.x[lo], dy = this.y[hi] - this.y[lo], dn = Math.sqrt(dx * dx + dy * dy) || 1;
      out.x = this.x[lo] + dx * f; out.y = this.y[lo] + dy * f; out.tx = dx / dn; out.ty = dy / dn;
      return out;
    };

    // Dónde dejar el párrafo viejo: lo antes posible recorriendo A desde
    // la punta en el sentido sg, apenas la dirección del trazo apunte más
    // o menos (±60°) a su entrada en la palabra. El resto lo absorbe la
    // curva de salida -no hace falta rodear el párrafo hasta la tangente
    // exacta-. Devuelve el punto de salida, la entrada a C y cuánto
    // tuvo que seguir por A (extra, en pasos de 2°).
    function partida(A, desde, C, sg){
      for (var k = 0; k <= 180; k++){
        var th = desde + sg * k * (Math.PI / 90);
        var P = pElipse(A, th), thC = entradaTangente(P, C, sg);
        if (thC === null) continue;
        var Q = pElipse(C, thC), vx = Q.x - P.x, vy = Q.y - P.y, n = Math.sqrt(vx * vx + vy * vy) || 1;
        var t = tElipse(A, th, sg);
        if ((t.x * vx + t.y * vy) / n >= 0.5) return { th: th, thD: thC, extra: k };
      }
      var P0 = pElipse(A, desde), th0 = entradaTangente(P0, C, sg);
      return { th: desde, thD: th0 === null ? Math.atan2(P0.y - C.cy, P0.x - C.cx) : th0, extra: 999 };
    }

    function animarModo(valor, dur){
      if (tweenModo) tweenModo.kill();
      tweenModo = gsap.to(estado, { modoTrazo: valor, duration: dur, ease: 'power1.inOut' });
    }

    // Arranca un viaje hacia el párrafo que prepare `prep`, pasando por
    // "MEDICINA FUNCIONAL". El párrafo de destino recién se elige cuando
    // la punta entra a la vuelta de la palabra (elegirDestino): ahí el
    // panel viejo ya se apagó y se puede cargar y medir el nuevo.
    function iniciarViaje(prep, mostrar){
      var C = centro();
      if (viaje && !viaje.terminado){
        // Todavía no eligió destino: sigue su camino y en la palabra
        // va al párrafo más nuevo.
        if (viaje.total === null){ viaje.prep = prep; viaje.mostrar = mostrar; return; }
        rerutear(viaje, prep, mostrar, C); return;
      }
      var A = { cx: estado.cx, cy: estado.cy, rx: estado.rx, ry: estado.ry };
      var th0 = rotacion + estado.rotacionBoost, th1 = th0 + estado.coberturaRad;
      var r = new Ruta(), sg, sal = null;
      var enPalabra = Math.abs(A.cx - C.cx) < 6 && Math.abs(A.cy - C.cy) < 6;
      if (enPalabra) sg = 1;
      else {
        // Horario sale por la punta del arco (th1), antihorario por la
        // cola (th0): gana el que deja el párrafo con menos rodeo.
        var horario = partida(A, th1, C, 1), anti = partida(A, th0, C, -1);
        sg = horario.extra <= anti.extra ? 1 : -1;
        sal = sg > 0 ? horario : anti;
      }
      // El trazo arranca siendo exactamente el arco quieto, recorrido en
      // el sentido del viaje (la punta queda del lado por el que sale).
      if (sg > 0) r.elipse(A, th0, th1); else r.elipse(A, th1, th0);
      var v = { ruta: r, sg: sg, cabeza: r.largo(), LA: r.largo(), L: r.largo(), t: 0, C: C,
                prep: prep, mostrar: mostrar, total: null, terminado: false, mostrado: false };
      if (enPalabra){
        // Ya está rodeando la palabra (primer viaje, después de la vuelta
        // inicial): sigue girando un poco y sale.
        v.sC = v.cabeza; v.thCin = th1; v.minVuelta = 0.3 * Math.PI;
      } else {
        r.elipse(A, sg > 0 ? th1 : th0, sal.th);
        var Q = pElipse(C, sal.thD), tA = tElipse(A, sal.th, sg), tC = tElipse(C, sal.thD, sg);
        r.curva(tA.x, tA.y, Q.x, Q.y, tC.x, tC.y);
        v.sC = r.largo(); v.thCin = sal.thD;
        // al menos ~1¼ vuelta alrededor de la palabra: tiene que leerse
        // que la rodea, no que la roza
        v.minVuelta = 1.25 * Math.PI;
      }
      vueltaMinima(v);
      viaje = v;
      animarModo(1, 0.25);
    }

    // La vuelta mínima alrededor de la palabra no depende del destino:
    // queda en la ruta desde el arranque, así la punta tiene por dónde
    // seguir mientras se espera para elegir el párrafo nuevo.
    function vueltaMinima(v){
      v.thLoop = v.thCin + v.sg * v.minVuelta;
      v.ruta.elipse(v.C, v.thCin, v.thLoop);
      v.sLoop = v.ruta.largo();
      v.reloj = 0;
    }

    // Cambio de escena con el destino viejo ya elegido: el trazo actual
    // (de la cola a la punta) se copia a una ruta nueva que desde la
    // punta va directo a la palabra, y desde ahí al párrafo más nuevo.
    function rerutear(v, prep, mostrar, C){
      var r = new Ruta(), cola = Math.max(0, v.cabeza - v.L);
      for (var s = cola; s < v.cabeza; s += 3){ v.ruta.en(s, puntoTmp); r.punto(puntoTmp.x, puntoTmp.y); }
      v.ruta.en(v.cabeza, puntoTmp); r.punto(puntoTmp.x, puntoTmp.y);
      var punta = { x: puntoTmp.x, y: puntoTmp.y }, dirX = puntoTmp.tx, dirY = puntoTmp.ty, cabeza = r.largo();
      var thIn = entradaTangente(punta, C, v.sg);
      if (thIn === null) thIn = Math.atan2((punta.y - C.cy) / C.ry, (punta.x - C.cx) / C.rx);
      var Q = pElipse(C, thIn), tC = tElipse(C, thIn, v.sg);
      r.curva(dirX, dirY, Q.x, Q.y, tC.x, tC.y);
      viaje = { ruta: r, sg: v.sg, cabeza: cabeza, LA: v.L, L: v.L, t: T_ACEL, C: C, sC: r.largo(), thCin: thIn,
                minVuelta: 1.25 * Math.PI, prep: prep, mostrar: mostrar, total: null, terminado: false, mostrado: false };
      vueltaMinima(viaje);
      animarModo(1, 0.25);
    }

    function elegirDestino(v){
      v.sElegido = v.cabeza; // desde acá el largo del trazo pasa al del arco nuevo
      var B = elipseDe(v.prep());
      var sal = salidaHacia(v.C, v.thLoop, B, v.sg);
      v.ruta.elipse(v.C, v.thLoop, sal.th);               // termina de rodear la palabra
      var Q = pElipse(B, sal.thD); v.ruta.linea(Q.x, Q.y); // recta al párrafo nuevo
      v.sB = v.ruta.largo();
      v.ruta.elipse(B, sal.thD, sal.thD + v.sg * COBERTURA_REPOSO); // y lo envuelve
      v.total = v.ruta.largo();
      v.LB = v.total - v.sB;
      v.B = B; v.thBin = sal.thD;
    }

    function avanzar(v, dt){
      if (v.terminado) return;
      v.t += dt; v.reloj += dt;
      var a = Math.min(1, v.t / T_ACEL), vel = VEL * Math.max(0.08, a * a * (3 - 2 * a));
      if (v.total !== null) vel = Math.min(vel, VEL * Math.max(0.06, Math.sqrt(Math.max(0, v.total - v.cabeza) / FRENO)));
      v.cabeza += vel * dt;
      // El párrafo nuevo se elige ya rodeando la palabra y con el viejo
      // casi apagado (su fade dura .5s) -o, como muy tarde, al completar
      // la vuelta mínima, para que la punta nunca se quede sin ruta.
      if (v.total === null && ((v.cabeza >= v.sC && v.reloj >= 0.45) || v.cabeza >= v.sLoop)){
        if (v.cabeza > v.sLoop) v.cabeza = v.sLoop;
        elegirDestino(v);
      }
      if (v.total !== null){
        // el largo del trazo pasa del largo del arco viejo al del nuevo
        // a lo largo del camino desde la palabra, sin saltos
        var f = Math.min(1, Math.max(0, (v.cabeza - v.sElegido) / ((v.total - v.sElegido) || 1)));
        v.L = v.LA + (v.LB - v.LA) * f;
        if (!v.mostrado && v.cabeza >= v.sB - 140){ v.mostrado = true; v.mostrar(); }
        if (v.cabeza >= v.total - 0.5){ v.cabeza = v.total; terminar(v); }
      }
    }

    // Llegó: el arco quieto toma la posición exacta en que quedó el trazo
    // (misma elipse, empezando donde quedó la cola) y se devuelve el
    // dibujo al modo arco.
    function terminar(v){
      v.terminado = true;
      if (!v.mostrado){ v.mostrado = true; v.mostrar(); }
      estado.cx = v.B.cx; estado.cy = v.B.cy; estado.rx = v.B.rx; estado.ry = v.B.ry; estado.opacidad = 1;
      // el arco quieto va de anguloBase a anguloBase+cobertura: en horario
      // eso arranca donde entró el trazo; en antihorario, donde terminó
      rotacion = (v.sg > 0 ? v.thBin : v.thBin - COBERTURA_REPOSO) - estado.rotacionBoost;
      animarModo(0, 0.4);
    }

    function dibujar(now){
      if (!activo) return;
      if (!enVista || !pagVisible){ activo = false; return; }   // fuera de pantalla: el bucle se detiene
      var dt = ultimoNow ? Math.min(now - ultimoNow, 48) : 16;
      ultimoNow = now;
      rotacion += dt * 0.00015;
      var anguloBase = rotacion + estado.rotacionBoost;
      if (viaje) avanzar(viaje, dt / 1000);
      var m = viaje ? estado.modoTrazo : 0;
      // Grosor de la banda proporcional a lo que rodea: ±16px alrededor de
      // un párrafo se ve bien, alrededor de una etiqueta chica de la órbita
      // se ve tosco. Se mueve suave hacia el del destino del viaje en curso.
      var ref = (viaje && viaje.B) ? viaje.B : estado;
      var objetivo = clamp(Math.min(ref.rx, ref.ry) / 70, 0.6, 1);
      grosor += (objetivo - grosor) * Math.min(1, dt / 220);

      ctx.clearRect(0, 0, W, H);
      // mezcla normal: 'lighter' (suma de luz) sirve sobre fondo oscuro,
      // sobre este fondo claro aclaraba los granos en vez de marcarlos
      for (var i = 0; i < particulas.length; i++){
        var p = particulas[i];
        // Los extremos del arco (cerca de t=0 o t=1, junto al hueco) se
        // afinan en opacidad y tamaño -así no se ve un corte limpio tipo
        // borde SVG, sino un trazo de arena que se dispersa hacia el
        // hueco, orgánico.
        var distExtremo = Math.min(p.t, 1 - p.t);
        var borde = Math.min(1, distExtremo / 0.06);
        if (borde <= 0.02) continue;
        var ang = p.t * estado.coberturaRad + anguloBase;
        var jx = Math.sin(now * 0.001 * p.jVel + p.jFase) * p.jAmp * grosor;
        var jy = Math.cos(now * 0.0011 * p.jVel + p.jFase) * p.jAmp * grosor;
        var banda = p.banda * grosor;
        var x = estado.cx + Math.cos(ang) * (estado.rx + banda) + jx;
        var y = estado.cy + Math.sin(ang) * (estado.ry + banda) + jy;
        // En viaje: la partícula va detrás de la punta, sobre la ruta, a
        // una distancia proporcional a t (horario: t=1 es la punta, como
        // en el arco; antihorario: t=0). La banda va perpendicular al
        // camino y del lado de afuera de la curva, igual que en el arco.
        // El afinado de bordes de arriba afina también la cola y la punta.
        if (m > 0){
          var sg = viaje.sg;
          viaje.ruta.en(viaje.cabeza - (sg > 0 ? 1 - p.t : p.t) * viaje.L, puntoTmp);
          var xT = puntoTmp.x + sg * puntoTmp.ty * banda + jx;
          var yT = puntoTmp.y - sg * puntoTmp.tx * banda + jy;
          x += (xT - x) * m;
          y += (yT - y) * m;
        }
        var a = p.alfa * estado.opacidad * borde;
        if (a <= 0.01) continue;
        var lado = 2 * p.r * (0.55 + 0.45 * borde);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.fillRect(x - lado / 2, y - lado / 2, lado, lado);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      requestAnimationFrame(dibujar);
    }
    var enVista = true;
    new IntersectionObserver(function(en){ enVista = en[0].isIntersecting; if (enVista) arrancar(); }).observe(stage);
    document.addEventListener('visibilitychange', function(){ arrancar(); });
    function arrancar(){
      if (activo || !enVista || !pagVisible) return;
      activo = true; ultimoNow = 0;
      requestAnimationFrame(dibujar);
    }

    var c0 = centro();
    estado.cx = c0.cx; estado.cy = c0.cy; estado.rx = c0.rx; estado.ry = c0.ry; estado.opacidad = 1;
    arrancar();

    return {
      // Primer viaje, al terminar la vuelta inicial: el aro ya rodea la
      // palabra y el panel de la escena 0 ya está a la vista.
      irA: function(panelEl){ if (panelEl) iniciarViaje(function(){ return panelEl; }, function(){}); },
      // Viaje entre párrafos como trazo continuo (ver "Trazo"). El
      // contenido del panel nuevo se carga recién cuando la punta llega a
      // "MEDICINA FUNCIONAL" (prepararPanel, con el panel todavía oculto,
      // así se mide con su tamaño real) y aparece cuando la punta está
      // por llegar al párrafo (mostrarPanel). Si el usuario cambia de
      // escena a mitad de camino, el trazo no se corta: sigue desde donde
      // está y pasa por la palabra antes de ir al párrafo más nuevo.
      viajar: function(prepararPanel, mostrarPanel){
        viajes++;
        resize();
        iniciarViaje(prepararPanel, mostrarPanel);
      },
      // Vuelta completa: pasa UNA sola vez, al arrancar el scroll (ver
      // "arrancoAro" más abajo). Dos tramos en una sola timeline:
      // 1) impulso de rotación de 360° (rotacionBoost 0→2π) MIENTRAS el
      //    hueco se angosta (coberturaRad sube hasta COBERTURA_VUELTA,
      //    nunca hasta 2π -el arco no se cierra, solo gira una vuelta
      //    entera alrededor del texto permanente).
      // 2) recién cuando ese tramo termina, el hueco se reabre a su
      //    tamaño normal (coberturaRad baja de vuelta a COBERTURA_REPOSO).
      // onDone se llama después de la reapertura -ahí, y no antes, debe
      // arrancar el viaje hacia el panel de la primera escena.
      // Si mientras giraba arrancó un viaje entre párrafos (scroll rápido o
      // click en el riel), onDone NO se llama: ese viaje ya lleva el aro a
      // su destino, y pisarlo dejaría su panel sin mostrarse nunca.
      vueltaInicial: function(onDone){
        var viajesAlEmpezar = viajes;
        var tl = gsap.timeline({ onComplete: function(){
          rotacion += estado.rotacionBoost; estado.rotacionBoost = 0;
          if (onDone && viajes === viajesAlEmpezar) onDone();
        } });
        tl.to(estado, { rotacionBoost: Math.PI * 2, coberturaRad: COBERTURA_VUELTA, duration: 1.2, ease: 'power2.inOut' }, 0);
        tl.to(estado, { coberturaRad: COBERTURA_REPOSO, duration: 0.35, ease: 'power2.out' });
      }
    };
  }
  var polvoAro = construirPolvoAro(document.getElementById('lienzo-polvo-motor'), fijo);

  // Contenido de las 12 escenas -mismo texto que ya se redactó para el
  // diagrama radial anterior (data-detalle), reordenado con Causa raíz
  // primero (como pide la referencia) y sumando kicker + escena de cierre.
  var escenas = [
    { kicker:'El origen', titulo:'Causa raíz', lado:'izq',
      desc:'No nos detenemos únicamente en el síntoma. Buscamos comprender qué factores pueden estar relacionados con lo que está ocurriendo.' },
    { kicker:'La energía', titulo:'Metabolismo', lado:'der',
      desc:'Cómo tu cuerpo convierte comida en energía — y por qué, cuando ese proceso se desregula, se siente como cansancio sin causa aparente.' },
    { kicker:'El combustible', titulo:'Nutrición', lado:'izq',
      desc:'Lo que comes es información para cada célula. No se trata de dietas estrictas, sino de darle a tu cuerpo lo que necesita para reparar y regular.' },
    { kicker:'La conversación interna', titulo:'Salud digestiva', lado:'der',
      desc:'Tu intestino no solo digiere: conversa con tu sistema inmune y tu cerebro. Ahí empiezan —y a veces terminan— muchos síntomas que parecían no tener relación.' },
    { kicker:'El mensajero', titulo:'Equilibrio hormonal', lado:'izq',
      desc:'Tiroides, cortisol, hormonas sexuales: rara vez fallan solas. Un desajuste en una suele arrastrar a las demás.' },
    { kicker:'La respuesta', titulo:'Inflamación', lado:'der',
      desc:'La respuesta natural de defensa de tu cuerpo, cuando se queda encendida de más, es el hilo común detrás de dolor, fatiga y piel reactiva.' },
    { kicker:'El mando', titulo:'Sistema nervioso', lado:'izq',
      desc:'Regula desde tu digestión hasta tu ánimo. Cuando vive en alerta constante, todo el cuerpo lo nota.' },
    { kicker:'La señal', titulo:'Estrés', lado:'der',
      desc:'No es solo lo que sientes: es una cascada bioquímica medible que reorganiza cómo tu cuerpo prioriza energía, digestión e inmunidad.' },
    { kicker:'La reparación', titulo:'Sueño y recuperación', lado:'izq',
      desc:'Es cuando tu cuerpo repara lo que el día desgastó. Dormir mal no es un síntoma menor: es una causa raíz en sí misma.' },
    { kicker:'La defensa', titulo:'Sistema inmunológico', lado:'der',
      desc:'Su trabajo es distinguir amigo de enemigo. Cuando pierde esa claridad, aparecen alergias, sensibilidades y enfermedad autoinmune.' },
    { kicker:'El reflejo', titulo:'Salud cardiovascular', lado:'izq',
      desc:'El corazón no trabaja aislado: refleja la inflamación y el desgaste metabólico y hormonal acumulados durante años.' },
    // Cierre: la frase toma el lugar de "MEDICINA FUNCIONAL" (que se
    // dispersa, ver dispersarEtiqueta) y es la protagonista, con la misma
    // tipografía del H1 del hero: negrita + caligrafía en el <em>.
    { kicker:'', titulo:'', lado:'centro',
      desc:'Una mirada integral para comprender qué está detrás de tus síntomas.',
      descHtml:'Una mirada integral <em>para comprender qué está detrás de tus síntomas.</em>' }
  ];

  // La etiqueta permanente se parte en letras para poder dispersarla al
  // llegar al cierre (splitLetters vive en otra IIFE, sin acceso desde acá).
  // El texto completo queda en un span solo para lectores de pantalla.
  var etiqueta = fijo.querySelector('.motor-permanente');
  var letrasEtiqueta = [];
  if (etiqueta){
    var textoEtiqueta = etiqueta.textContent.trim();
    etiqueta.textContent = '';
    var lectora = document.createElement('span');
    lectora.className = 'motor-sr';
    lectora.textContent = textoEtiqueta;
    etiqueta.appendChild(lectora);
    // cada palabra es un bloque que no se parte: en mobile la etiqueta se
    // acomoda en dos líneas (una palabra arriba, otra abajo)
    textoEtiqueta.split(' ').forEach(function(palabra, pi){
      if (pi) etiqueta.appendChild(document.createTextNode(' '));
      var w = document.createElement('span');
      w.className = 'motor-permanente-palabra';
      w.setAttribute('aria-hidden', 'true');
      palabra.split('').forEach(function(ch){
        var s = document.createElement('span');
        s.className = 'motor-permanente-letra';
        s.textContent = ch;
        w.appendChild(s);
        letrasEtiqueta.push(s);
      });
      etiqueta.appendChild(w);
    });
  }
  // Mismo lenguaje que la salida de las frases del hero: cada letra se va
  // por su cuenta (desplazada, girada, desenfocada) y vuelve igual.
  var etiquetaDispersa = false;
  function dispersarEtiqueta(si){
    if (!letrasEtiqueta.length || si === etiquetaDispersa) return;
    etiquetaDispersa = si;
    gsap.killTweensOf(letrasEtiqueta);
    if (si){
      gsap.to(letrasEtiqueta, {
        x: function(){ return (Math.random() * 2 - 1) * 70; },
        y: function(){ return (Math.random() * 2 - 1) * 32; },
        rotation: function(){ return Math.random() * 50 - 25; },
        filter: 'blur(6px)', opacity: 0,
        // ~0.9s en total: tiene que haberse ido antes de que la frase que
        // la reemplaza termine de enfocarse encima
        duration: 0.6, stagger: { each: 0.018, from: 'random' }, ease: 'power2.in'
      });
    } else {
      gsap.to(letrasEtiqueta, {
        x: 0, y: 0, rotation: 0, filter: 'blur(0px)', opacity: 1,
        duration: 0.8, stagger: { each: 0.025, from: 'random' }, ease: 'power3.out'
      });
    }
  }

  // Las 11 áreas sobre un círculo perfecto alrededor de la palabra, empezando arriba y
  // en sentido horario (mismo orden que los datos de escenas). El punto de cada área
  // está EXACTAMENTE sobre el círculo y su nombre sale hacia afuera (a la derecha en
  // la mitad derecha, a la izquierda en la mitad izquierda, centrado arriba): así la
  // forma se lee como círculo aunque los nombres midan distinto. El radio va en
  // píxeles (no en % del alto y del ancho, que lo deformaba en elipse) y es el mayor
  // que deja todos los nombres dentro de la órbita.
  function ubicarAreas(){
    var esMovil = window.matchMedia('(max-width:920px)').matches;
    var W = orbita.clientWidth, H = orbita.clientHeight;
    if (!W || !H) return;
    var n = areas.length, DOT = 13;   // del borde del botón al centro de su punto
    var R = H / 2 - (esMovil ? 28 : 24);
    if (esMovil) R = Math.min(R, W / 2 - 72);   // ahí solo se ve el nombre del área activa (~140px)
    areas.forEach(function(b, k){
      var a = -Math.PI / 2 + k * 2 * Math.PI / n, c = Math.cos(a);
      var lado = esMovil ? 'centro' : (c > 0.2 ? 'der' : c < -0.2 ? 'izq' : 'centro');
      b.classList.toggle('lado-der', lado === 'der');
      b.classList.toggle('lado-izq', lado === 'izq');
      if (lado !== 'centro'){
        var libre = W / 2 - 8 + DOT - b.offsetWidth;
        R = Math.min(R, libre / Math.abs(c));
      }
    });
    R = Math.max(60, R);
    areas.forEach(function(b, k){
      var a = -Math.PI / 2 + k * 2 * Math.PI / n;
      b.style.setProperty('--x', (W / 2 + Math.cos(a) * R).toFixed(1) + 'px');
      b.style.setProperty('--y', (H / 2 + Math.sin(a) * R).toFixed(1) + 'px');
    });
  }
  ubicarAreas();
  window.addEventListener('resize', ubicarAreas);
  window.addEventListener('load', ubicarAreas);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ubicarAreas);

  var CIERRE = escenas.length - 1;   // la última escena es la frase de cierre
  var DUR_AREA = 6500, DUR_CIERRE = 8000;
  var actual = 0;

  function marcarArea(i){
    areas.forEach(function(b, j){
      b.classList.toggle('activa', j === i);
      b.setAttribute('aria-pressed', j === i ? 'true' : 'false');
    });
  }
  function aparecer(el){
    void el.offsetWidth; // aplica el estado oculto antes de devolverle la transición
    el.classList.remove('sin-transicion');
    void el.offsetWidth;
    el.classList.add('visible');
  }

  // Lleva el trazo al área i (o a la frase de cierre). El contenido nuevo se
  // carga recién cuando la punta llega a la palabra (prep, con el panel ya
  // oculto) y aparece cuando está por llegar (mostrar) -ver viajar() en
  // construirPolvoAro.
  function ir(i){
    var e = escenas[i], esCierre = i === CIERRE, veniaDelCierre = actual === CIERRE;
    actual = i;
    transcurrido = 0;
    marcarArea(esCierre ? -1 : i);
    if (veniaDelCierre && !esCierre){
      // la palabra se rearma ya: el trazo va a pasar por ella
      dispersarEtiqueta(false);
      frase.classList.remove('visible');
      orbita.classList.remove('en-cierre'); fijo.classList.remove('en-cierre');
    }
    panel.classList.remove('visible');
    polvoAro.viajar(function(){
      if (esCierre){
        // el trazo está rodeando la palabra: se dispersa y la frase toma su lugar
        dispersarEtiqueta(true);
        orbita.classList.add('en-cierre'); fijo.classList.add('en-cierre');
        frase.classList.add('sin-transicion');
        return frase;
      }
      kickerEl.textContent = e.kicker;
      tituloEl.textContent = e.titulo;
      descEl.textContent = e.desc;
      panel.classList.add('sin-transicion');
      return areas[i];
    }, function(){ aparecer(esCierre ? frase : panel); });
  }

  // ---------- Recorrido automático ----------
  // Avanza solo, con una barra que muestra cuánto falta. Se congela con el
  // cursor encima (de la órbita o del panel), con la sección fuera de
  // pantalla, y durante 12s después de que alguien toca un área.
  var transcurrido = 0, ultimoT = 0, enPantalla = false, encima = false, pausaHasta = 0, arranco = false;
  function bucle(now){
    var dt = ultimoT ? Math.min(now - ultimoT, 100) : 0;
    ultimoT = now;
    if (arranco && enPantalla){
      var pausado = encima || now < pausaHasta;
      var dur = actual === CIERRE ? DUR_CIERRE : DUR_AREA;
      if (!pausado){
        transcurrido += dt;
        if (transcurrido >= dur) ir(actual === CIERRE ? 0 : actual + 1);
      }
      if (progreso) progreso.classList.toggle('pausado', pausado);
      barraSync(transcurrido, dur, pausado);
    }
    // fuera de pantalla el bucle se detiene (no pide cuadros); el observador lo despierta
    if (enPantalla && pagVisible) requestAnimationFrame(bucle); else { corriendo = false; ultimoT = 0; if (animBarra) animBarra.pause(); }
  }
  var corriendo = false;
  // La barra de progreso la anima el navegador (Web Animations, en el compositor):
  // escribir su transform en cada cuadro obligaba a repintar y reorganizar las
  // capas de toda la página en cada cuadro. Solo se rehace al cambiar de etapa o
  // si se desfasa, y se pausa/reanuda con el recorrido.
  var animBarra = null, durBarra = 0;
  function barraSync(trans, dur, pausado){
    if (!barra) return;
    if (!barra.animate){ barra.style.transform = 'scaleX(' + clamp(trans / dur, 0, 1).toFixed(3) + ')'; return; }
    if (!animBarra || durBarra !== dur || Math.abs(animBarra.currentTime - trans) > 150){
      if (animBarra) animBarra.cancel();
      animBarra = barra.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: dur, fill: 'both', easing: 'linear' });
      durBarra = dur; animBarra.currentTime = Math.min(trans, dur);
    }
    if (pausado && animBarra.playState === 'running') animBarra.pause();
    else if (!pausado && animBarra.playState === 'paused') animBarra.play();
  }
  function despertarBucle(){
    if (corriendo || !enPantalla || !pagVisible) return;
    corriendo = true; requestAnimationFrame(bucle);
  }
  document.addEventListener('visibilitychange', despertarBucle);

  areas.forEach(function(b, i){
    b.addEventListener('click', function(){
      pausaHasta = performance.now() + 12000;
      if (i !== actual) ir(i);
    });
  });
  [orbita, panel.parentNode].forEach(function(el){
    el.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') encima = true; });
    el.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') encima = false; });
  });

  marcarArea(0);
  if (reducedLocal) return; // sin recorrido automático: tocar un área cambia el panel al instante

  // Arranca la primera vez que la sección está a la vista: la vuelta
  // completa alrededor de la palabra y el primer viaje al área 1 (que el
  // panel ya muestra desde el principio).
  new IntersectionObserver(function(ents){
    enPantalla = ents[0].intersectionRatio >= 0.5;
    despertarBucle();
    if (enPantalla && !arranco){
      arranco = true;
      transcurrido = 0;
      polvoAro.vueltaInicial(function(){ polvoAro.irA(areas[0]); });
    }
  }, { threshold: [0, 0.5] }).observe(fijo);
  despertarBucle();
})(); }catch(e){ console.error('Kairal: órbita de servicios no disponible.', e); }

/* ============================================================
   10 · MENÚ MÓVIL
============================================================ */
try{
  var menuBtn = document.getElementById('menu-btn');
  var menuMovil = document.getElementById('menu-movil');
  var menuCerrar = document.getElementById('menu-cerrar');

  // Posts recientes del menú: los 3 últimos del mismo blog (Sanity); si no responde
  // quedan los títulos de respaldo que trae el HTML.
  var listaPostsMenu = document.getElementById('mm-posts-lista');
  if (listaPostsMenu && window.fetch){
    var consultaPosts = encodeURIComponent('*[_type == "post"] | order(publishedAt desc)[0...3] { title, slug, publishedAt }');
    fetch('https://zu3r11hb.api.sanity.io/v2021-10-21/data/query/production?query=' + consultaPosts)
      .then(function(r){ return r.json(); })
      .then(function(d){
        if (!d.result || !d.result.length) return;
        listaPostsMenu.innerHTML = '';
        d.result.forEach(function(post){
          var a = document.createElement('a');
          a.className = 'mm-post';
          a.target = '_blank'; a.rel = 'noopener';
          a.href = 'https://kairal.cl/blog.html?slug=' + encodeURIComponent((post.slug && post.slug.current) || '');
          a.appendChild(document.createTextNode(post.title));
          if (post.publishedAt){
            var f = document.createElement('small');
            f.textContent = new Date(post.publishedAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
            a.appendChild(f);
          }
          listaPostsMenu.appendChild(a);
        });
      })
      .catch(function(){ /* sin red: se quedan los de respaldo */ });
  }

  if (menuBtn && menuMovil){
    function toggleMenu(abrir){
      var open = abrir !== undefined ? abrir : !menuMovil.classList.contains('abierto');
      menuMovil.classList.toggle('abierto', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuMovil.setAttribute('aria-hidden', String(!open));
      document.documentElement.classList.toggle('menu-abierto', open);
      if (open && menuCerrar) setTimeout(function(){ menuCerrar.focus({ preventScroll:true }); }, 60);
      else if (!open && abrir === undefined) menuBtn.focus({ preventScroll:true });
    }
    menuBtn.addEventListener('click', function(){ toggleMenu(); });
    if (menuCerrar) menuCerrar.addEventListener('click', function(){ toggleMenu(false); menuBtn.focus({ preventScroll:true }); });
    menuMovil.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ toggleMenu(false); });
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') toggleMenu(false);
    });
  }
}catch(e){ console.error('Kairal: menú móvil no disponible.', e); }

/* ============================================================
   11 · ASISTENTE "RAÍZ" — placeholder de IA, listo para conexión futura
   ─────────────────────────────────────────────────────────────
   Hoy responde con reglas simples por palabra clave, basadas en el
   contenido real de la página (Servicios, Método, FAQ). El día que
   haya un agente de IA real detrás, solo hay que reemplazar la
   función `responderRaiz()` por una llamada a la API — la interfaz
   (panel, burbujas, historial, chips) ya queda lista.
   Alcance intencional: SOLO orienta sobre la clínica. Nunca da
   consejo médico ni interpreta síntomas — eso siempre va a consulta.
============================================================ */
try{
  var fabRaiz = document.getElementById('fab-raiz');
  var panelRaiz = document.getElementById('panel-raiz');
  var cerrarRaiz = document.getElementById('raiz-cerrar');
  var nuevoRaiz = document.getElementById('raiz-nuevo');
  var cuerpoRaiz = document.getElementById('raiz-cuerpo');
  var formRaiz = document.getElementById('raiz-form');
  var inputRaiz = document.getElementById('raiz-input');
  var chipsRaiz = document.getElementById('raiz-chips');
  var footerAbrirRaiz = document.getElementById('footer-abrir-raiz');
  // Estado inicial del cuerpo (saludo + disclaimer), para poder volver a él
  // con "Nueva conversación" sin duplicar ese texto acá también.
  var estadoInicialRaiz = cuerpoRaiz ? cuerpoRaiz.innerHTML : '';

  if (fabRaiz && panelRaiz){
    function abrirRaiz(){
      panelRaiz.classList.add('abierto');
      panelRaiz.setAttribute('aria-hidden','false');
      fabRaiz.setAttribute('aria-expanded','true');
      if (!movil && inputRaiz) setTimeout(function(){ inputRaiz.focus(); }, 350);
    }
    function cerrarRaizPanel(){
      panelRaiz.classList.remove('abierto');
      panelRaiz.setAttribute('aria-hidden','true');
      fabRaiz.setAttribute('aria-expanded','false');
      fabRaiz.focus();
    }
    fabRaiz.addEventListener('click', function(){
      panelRaiz.classList.contains('abierto') ? cerrarRaizPanel() : abrirRaiz();
    });
    cerrarRaiz.addEventListener('click', cerrarRaizPanel);
    function reiniciarRaiz(){
      cuerpoRaiz.innerHTML = estadoInicialRaiz;
      if (chipsRaiz) chipsRaiz.style.display = '';
      if (inputRaiz){
        inputRaiz.value = '';
        if (!movil) inputRaiz.focus();
      }
    }
    if (nuevoRaiz) nuevoRaiz.addEventListener('click', reiniciarRaiz);
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && panelRaiz.classList.contains('abierto')) cerrarRaizPanel();
    });
    if (footerAbrirRaiz){
      footerAbrirRaiz.addEventListener('click', function(e){
        e.preventDefault();
        abrirRaiz();
      });
    }

    // base de respuestas: palabra clave -> contenido real de la página
    var baseRaiz = [
      { k:['servicio','medicina funcional','pni','psiconeuro','bioregul','ofrec'],
        r:'Kairal trabaja con un enfoque de Medicina Funcional: en vez de tratar cada síntoma por separado, busca la causa raíz conectando metabolismo, hormonas, sistema nervioso, inmune y más. Puedes explorarlo en la sección "Servicios" de esta página.' },
      { k:['metodo','método','proceso','como trabajan','pasos','evaluacion','diagnostico'],
        r:'El método tiene 4 etapas: Escuchar (evaluación de 50 min), Mapear (laboratorios funcionales), Sembrar (plan personalizado) y Cultivar (seguimiento continuo). Puedes verlo animado en la sección "El método".' },
      { k:['precio','costo','valor','cuanto cuesta','plata','arancel'],
        r:'Los valores pueden variar según el tipo de consulta y exámenes necesarios — para darte un número exacto y no equivocarme, lo mejor es que lo confirmes directo por WhatsApp. ¿Te comparto el contacto?' },
      { k:['agendar','cita','hora','reservar','consulta'],
        r:'Si quieres partir con algo liviano, hay una autoevaluación de 10 minutos que te muestra qué sistema de tu cuerpo necesita más atención. Y si ya sabes que quieres consulta, puedes agendarla directo con el botón "Agendar mi primera consulta" de esta página.' },
      { k:['autoevaluacion','autoevaluación','test','por donde empiezo','por dónde empiezo'],
        r:'La autoevaluación funcional mide 4 sistemas de tu cuerpo en unos 10 minutos y te envía un informe por correo. Es el mejor primer paso — la encuentras en el botón "Autoevaluación" del menú, arriba de esta página.' },
      { k:['isapre','fonasa','cobertura','reembolso','seguro'],
        r:'La cobertura depende de tu plan específico — te recomiendo confirmarlo directo por WhatsApp para darte una respuesta certera sobre tu caso.' },
      { k:['doctora','yusneily','sanchez','quien es','quién es'],
        r:'La Dra. Yusneily Sánchez es médico con formación en Venezuela, Perú, Colombia y un Máster en Psiconeuroinmunología en Regenera (España). Puedes conocer su historia completa en la sección "La doctora".' },
      { k:['online','presencial','antofagasta','donde','dónde','ubicacion'],
        r:'Las consultas son 100% online por videollamada — atendemos pacientes de cualquier parte de Chile, no es necesario estar en Antofagasta.' },
      { k:['sintoma','síntoma','cansancio','fatiga','inflamacion','dolor','duele','ansiedad','digestion'],
        r:'Entiendo que quieras respuestas sobre eso, pero no puedo evaluar síntomas ni dar orientación médica por aquí. Un buen primer paso es la autoevaluación funcional — te muestra qué sistema podría estar detrás de lo que sientes. Si prefieres ir directo a consulta, la Dra. Sánchez revisa tu caso completo con calma.' }
    ];
    var saludo = /^(hola|buenas|hey|hi)\b/i;
    var gracias = /^(gracias|thank)/i;

    function responderRaiz(texto){
      var t = texto.toLowerCase();
      if (saludo.test(t)) return '¡Hola! ¿En qué te puedo orientar: servicios, el método, la autoevaluación, o cómo agendar?';
      if (gracias.test(t)) return 'Con gusto 🌱 ¿Necesitas algo más?';
      for (var i=0;i<baseRaiz.length;i++){
        for (var j=0;j<baseRaiz[i].k.length;j++){
          if (t.indexOf(baseRaiz[i].k[j]) !== -1) return baseRaiz[i].r;
        }
      }
      return 'Todavía no tengo una respuesta preparada para eso — muy pronto, con IA real, podré ayudarte mejor. Por ahora, escríbenos directo por WhatsApp y te responde el equipo de Kairal.';
    }

    function agregarMsg(texto, quien){
      var div = document.createElement('div');
      div.className = 'raiz-msg raiz-' + quien;
      var p = document.createElement('p');
      p.textContent = texto;
      div.appendChild(p);
      cuerpoRaiz.appendChild(div);
      cuerpoRaiz.scrollTop = cuerpoRaiz.scrollHeight;
    }
    function enviar(texto){
      texto = (texto || '').trim();
      if (!texto) return;
      agregarMsg(texto, 'user');
      if (chipsRaiz) chipsRaiz.style.display = 'none';
      setTimeout(function(){ agregarMsg(responderRaiz(texto), 'bot'); }, 420);
    }

    if (chipsRaiz){
      chipsRaiz.querySelectorAll('button').forEach(function(b){
        b.addEventListener('click', function(){ enviar(b.textContent); });
      });
    }
    if (formRaiz){
      formRaiz.addEventListener('submit', function(e){
        e.preventDefault();
        enviar(inputRaiz.value);
        inputRaiz.value = '';
      });
    }
  }
}catch(e){ console.error('Kairal: asistente Raíz no disponible.', e); }

/* ============================================================
   9 · VELO DE ENTRADA NARRATIVO
============================================================ */
(function(){
  var velo = document.getElementById('velo');
  var btn = document.getElementById('velo-btn');
  var cvv = document.getElementById('lienzo-velo');
  document.documentElement.classList.add('velado');
  // Refuerzo del arranque-desde-el-hero: además del scrollRestoration:manual
  // del <head>, se vuelve a llevar el scroll al tope acá (el layout ya está
  // listo al final del body) y en el evento load, por si el navegador
  // restauró la posición antes de que corriera lo del <head>.
  window.scrollTo(0, 0);
  window.addEventListener('load', function(){ window.scrollTo(0, 0); });
  var entrado = false, fin = false;

  function entrar(){
    if (entrado) return;
    entrado = true;
    // La página siempre arranca desde el hero (ver scrollRestoration:manual
    // en el <head>), así que al soltar el preloader nos aseguramos de estar
    // en el tope antes de lanzar la entrada del hero.
    window.scrollTo(0, 0);
    velo.classList.add('fuera');
    document.documentElement.classList.remove('velado');
    terreno.amanecer();
    if (lanzarHero) lanzarHero();
    setTimeout(function(){ velo.style.display = 'none'; fin = true; }, 1300);
  }
  btn.addEventListener('click', entrar);

  if (reduced){
    velo.classList.add('lista');
  } else {
    var c = cvv.getContext('2d');
    var W=0, H=0;
    function rs(){ W=cvv.clientWidth; H=cvv.clientHeight; cvv.width=W*DPR; cvv.height=H*DPR; c.setTransform(DPR,0,0,DPR,0,0); }
    rs(); window.addEventListener('resize', rs);

    function gotaV(px, py, r, T, a){
      c.save(); c.translate(px, py);
      var gd = c.createRadialGradient(-r*0.35,-r*0.1,r*0.08, 0,0,r*1.15);
      gd.addColorStop(0,'rgba(240,252,248,'+(0.95*a).toFixed(3)+')');
      gd.addColorStop(0.5,'rgba(159,216,204,'+(0.7*a).toFixed(3)+')');
      gd.addColorStop(1,'rgba(14,124,107,'+(0.5*a).toFixed(3)+')');
      c.fillStyle = gd;
      c.beginPath();
      c.moveTo(0,-T);
      c.bezierCurveTo( r*0.42,-T*0.5, r,-r*0.6, r,0);
      c.bezierCurveTo( r,r*0.56, r*0.56,r, 0,r);
      c.bezierCurveTo(-r*0.56,r, -r,r*0.56, -r,0);
      c.bezierCurveTo(-r,-r*0.6, -r*0.42,-T*0.5, 0,-T);
      c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,'+(0.75*a).toFixed(3)+')';
      c.beginPath(); c.ellipse(-r*0.36,-r*0.12,r*0.17,r*0.3,-0.5,0,6.28); c.fill();
      c.restore();
    }

    var t0 = performance.now(), revelado = false;
    (function anim(now){
      if (fin) return;
      var t = (now - t0)/1000;
      c.clearRect(0,0,W,H);
      var x = W/2, yImp = H*0.55;
      if (t < 1.5){
        var k = t/1.5, e = k*k;
        var y = -24 + e*(yImp + 24);
        gotaV(x, y, 9, 9*(1 + 1.5*k), 0.95);
      } else {
        var rt = t - 1.5;
        for (var i=0;i<3;i++){
          var rk = clamp((rt - i*0.13)/1.3, 0, 1);
          if (rk <= 0 || rk >= 1) continue;
          var eo = 1 - Math.pow(1-rk, 2);
          c.strokeStyle = 'rgba(127,181,171,'+((1-eo)*0.5).toFixed(3)+')';
          c.lineWidth = 1.3;
          c.beginPath(); c.ellipse(x, yImp, 18+eo*190, (18+eo*190)*0.28, 0, 0, 6.28); c.stroke();
        }
        var pk = (rt % 3.2)/3.2;
        c.strokeStyle = 'rgba(127,181,171,'+((1-pk)*0.1).toFixed(3)+')';
        c.lineWidth = 1;
        c.beginPath(); c.ellipse(x, yImp, 18+pk*230, (18+pk*230)*0.28, 0, 0, 6.28); c.stroke();
        if (!revelado){ revelado = true; velo.classList.add('lista'); }
      }
      requestAnimationFrame(anim);
    })(t0);
  }
  // failsafe: el botón siempre aparece
  setTimeout(function(){ velo.classList.add('lista'); }, 2800);
})();
})();

/* ============================================================
   12 · BLOG DINÁMICO — feed real de Sanity + rotación de texto
   Mismo patrón que kairal-main/script.js: si falla, se deja el
   artículo de respaldo que ya está en el HTML.
============================================================ */
(function(){
  // Palabra por palabra, con blur -MISMO efecto que "El blog de
  // Kairal." (splitWords en la sección 2), pero es su propia copia:
  // esta IIFE es un scope aparte, sin acceso por clausura a la de ahí.
  function splitWordsBlog(el){
    var nodos = Array.prototype.slice.call(el.childNodes);
    el.innerHTML = '';
    nodos.forEach(function(n){
      if (n.nodeType === 3){
        n.textContent.split(/\s+/).filter(Boolean).forEach(function(w){
          var s = document.createElement('span'); s.className = 'w'; s.textContent = w;
          el.appendChild(s); el.appendChild(document.createTextNode(' '));
        });
      }
    });
    return el.querySelectorAll('.w');
  }

  // Rotación de texto de la tarjeta única del blog: cada 2s pasa al
  // post siguiente. El título entra palabra por palabra con blur -el
  // mismo efecto que "El blog de Kairal."-, categoría/párrafo/botón
  // entran con un fundido simple (igual que el eyebrow/párrafo/CTAs del
  // hero, que tampoco se parten en palabras -ese tratamiento se reserva
  // para titulares). La pila de fotos sigue su propio ciclo por CSS
  // (blog-pila-N, también 2s por rol) sin depender de esto.
  function iniciarRotacion(card){
    if (!card || !window.gsap) return; // sin JS/gsap: se queda el post 1 fijo (ya visible por CSS)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var slides = Array.prototype.slice.call(card.querySelectorAll('.blog-texto-slide'));
    if (slides.length < 2) return;

    function ocultarYa(slide){
      gsap.set(slide, { visibility: 'hidden' });
      var elC = slide.querySelector('.blog-cat'), elP = slide.querySelector('p'), elB = slide.querySelector('.btn');
      gsap.set([elC, elP, elB].filter(Boolean), { opacity: 0, y: 14 });
    }
    slides.forEach(function(s, i){ if (i !== 0) ocultarYa(s); });

    function mostrar(slide){
      // El CSS de arranque (.blog-texto-slide--2/--3{opacity:0}) deja el
      // PADRE en opacity:0 -si acá solo se cambia visibility, la opacity
      // del padre se queda en 0 para siempre y multiplica a 0 la de
      // cualquier hijo, por más que ese hijo esté animado a 1-. Hay que
      // resetear la opacity del padre además de la visibility.
      slide.style.opacity = '1';
      slide.style.visibility = 'visible';
      var elC = slide.querySelector('.blog-cat'), elH = slide.querySelector('h3'),
          elP = slide.querySelector('p'), elB = slide.querySelector('.btn');
      var palabras = splitWordsBlog(elH);
      gsap.set(palabras, { opacity: 0, y: 20, filter: 'blur(5px)' });
      gsap.set([elC, elP, elB].filter(Boolean), { opacity: 0, y: 14 });
      var tl = gsap.timeline();
      tl.to(elC, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' })
        .to(palabras, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.4, stagger: 0.035, ease: 'power3.out' }, '-=.12')
        .to(elP, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }, '-=.15')
        .to(elB, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' }, '-=.12');
    }

    var idx = 0, timer;
    function siguiente(){
      if (!document.body.contains(card)){ clearInterval(timer); return; } // la tarjeta se reemplazo (ver fetch mas abajo)
      var prev = slides[idx];
      idx = (idx + 1) % slides.length;
      card.dataset.i = idx;   // la pila de fotos (móvil) sigue este índice
      var next = slides[idx];
      var salientes = prev.querySelectorAll('.blog-cat,h3,p,.btn');
      // mostrar(next) va DENTRO del onComplete, no en paralelo: si el
      // texto que entra empieza a aparecer mientras el anterior todavía
      // se está apagando, hay un instante con dos títulos parcialmente
      // visibles a la vez -se lee como texto encimado, no como una
      // transición linda (a diferencia de la pila de fotos, que sí se
      // funde bien). Primero se apaga del todo, recién ahí entra el
      // siguiente.
      gsap.to(salientes, {
        opacity: 0, duration: 0.22,
        onComplete: function(){ prev.style.visibility = 'hidden'; mostrar(next); }
      });
    }

    // Igual que el resto del sitio: la animación arranca recién cuando
    // la tarjeta entra en pantalla, no apenas carga la página.
    var io = new IntersectionObserver(function(ents){
      ents.forEach(function(en){
        if (en.isIntersecting){
          mostrar(slides[0]);
          // cada post se queda el tiempo suficiente para leerlo (igual en escritorio y móvil)
          timer = setInterval(siguiente, 5500);
          io.unobserve(card);
        }
      });
    }, { threshold: 0.3 });
    io.observe(card);
  }
  iniciarRotacion(document.getElementById('blog-rotativo'));

  var SANITY_PROJECT_ID = 'zu3r11hb';
  var SANITY_DATASET = 'production';
  var SANITY_API_URL = 'https://' + SANITY_PROJECT_ID + '.api.sanity.io/v2021-10-21/data/query/' + SANITY_DATASET;

  function escHtml(s){
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function formatDate(dateStr){
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric' });
  }
  function recortar(s, max){
    s = String(s || '').replace(/\s+/g, ' ').trim();
    return s.length > max ? s.slice(0, max).trim() + '…' : s;
  }
  // Mismo decodificador de ref de Sanity que usa kairal-main/script.js: el
  // ref del asset viene como "image-<id>-<ancho>x<alto>-<formato>" y hay que
  // recomponerlo a mano en la URL del CDN (no hace falta pedirle la URL a la
  // API, Sanity la deriva de forma determinística a partir del ref).
  function sanityImageUrl(ref){
    if (!ref) return '';
    var partes = ref.split('-');
    var id = partes[1], dimensiones = partes[2], formato = partes[3];
    if (!id || !dimensiones || !formato) return '';
    return 'https://cdn.sanity.io/images/' + SANITY_PROJECT_ID + '/' + SANITY_DATASET + '/' +
      id + '-' + dimensiones + '.' + formato + '?w=600&q=75&fit=max&auto=format&fm=webp';
  }
  var fallbackSvg = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6c4 6-2 8-2 13a6 6 0 0 0 12 0c0-2-1-3-1-3 1 6-3 8-3 8a8 8 0 0 1-6-14c0-2 0-3 0-4Z"/></svg>';
  // Una capa de la pila = la foto de ESE post (no la misma repetida): a
  // diferencia de cuando cada post tenía su propia tarjeta chica, acá los
  // 3 conviven en una sola tarjeta, así que cada capa sí es distinta.
  function capaFoto(post, capa){
    var refImg = post.image && post.image.asset && post.image.asset._ref;
    var urlImg = refImg ? sanityImageUrl(refImg) : '';
    var imgTag = urlImg
      ? '<img src="' + escHtml(urlImg) + '" alt="' + (capa === 1 ? escHtml(post.title) : '') + '" ' +
        (capa === 1 ? 'loading="lazy"' : 'aria-hidden="true"') +
        ' onerror="this.closest(\'.blog-foto\').classList.add(\'sin-foto\')">'
      : '';
    return '<span class="blog-foto blog-foto--' + capa + (urlImg ? '' : ' sin-foto') + '">' + imgTag + fallbackSvg + '</span>';
  }
  function slideTexto(post, capa){
    var cat = escHtml(post.category || 'Medicina funcional');
    var titulo = escHtml(post.title);
    var extractoCompleto = String(post.excerpt || '').replace(/\s+/g, ' ').trim();
    var teaser = escHtml(recortar(extractoCompleto, 150));
    var slug = escHtml((post.slug && post.slug.current) || '');
    return '<div class="blog-texto-slide blog-texto-slide--' + capa + '">' +
      '<span class="blog-cat">' + cat + '</span>' +
      '<h3 class="rev">' + titulo + '</h3>' +
      '<p>' + teaser + '</p>' +
      '<div class="blog-ctas"><a class="btn btn-solido" data-cursor href="https://kairal.cl/blog.html?slug=' + encodeURIComponent(slug) + '" target="_blank" rel="noopener">Leer artículo →</a>' +
      '<a class="btn btn-ghost" data-cursor href="https://kairal.cl/blog.html" target="_blank" rel="noopener">Ver todos los artículos</a></div>' +
      '</div>';
  }
  // Arma la tarjeta única con los 3 posts sincronizados (imagen y texto
  // cambian juntos, ver blog-pila-N / blog-texto-N en el CSS). Si Sanity
  // devuelve menos de 3 posts, se repiten en loop (post[i % length]) para
  // no dejar capas vacías -el mecanismo de 3 roles queda igual.
  function rotativo(posts){
    var pila = '', textos = '';
    for (var capa = 1; capa <= 3; capa++){
      var post = posts[(capa - 1) % posts.length];
      pila += capaFoto(post, capa);
      textos += slideTexto(post, capa);
    }
    return '<div class="blog-card" id="blog-rotativo">' +
      '<div class="blog-img">' + pila + '</div>' +
      '<div class="blog-textos">' + textos + '</div>' +
      '</div>';
  }

  var query = encodeURIComponent('*[_type == "post"] | order(publishedAt desc)[0...3] { title, slug, category, publishedAt, excerpt, image }');
  fetch(SANITY_API_URL + '?query=' + query)
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (!data.result || !data.result.length) return; // deja el respaldo
      var grid = document.getElementById('blog-grid');
      if (!grid) return;
      grid.innerHTML = rotativo(data.result);
      // la tarjeta nueva nunca pasó por ioRev (se inserta después de que el
      // IntersectionObserver ya se suscribió al cargar la página) — como el
      // usuario ya está viendo esta sección, se revela directamente.
      grid.querySelectorAll('.blog-card').forEach(function(c){ c.classList.add('visible'); });
      // La tarjeta estática ya tenía su propia rotación arrancada (o
      // esperando a entrar en pantalla) sobre el nodo viejo -que
      // acabamos de reemplazar-; esta la vuelve a armar sobre la
      // tarjeta real recién insertada. La rotación vieja se autolimpia
      // sola en su próximo tick (ver el chequeo de contains() adentro).
      iniciarRotacion(document.getElementById('blog-rotativo'));
      // El CTA usa la clase .btn genérica del sitio (mismo relleno al hover,
      // mismo cursor "grande" que cualquier otro botón) para que se sienta
      // igual al resto -pero el magnetismo (sección 7 del JS) se engancha
      // una sola vez a los .btn que existen al cargar la página, ANTES de
      // este fetch; el botón recién insertado se queda sin ese listener si
      // no se repite acá. Esta sección es su propia IIFE (no anidada
      // dentro de la de la sección 7), así que no tiene acceso por clausura
      // a la variable gsapOK de ahí -se recalcula la misma condición acá
      // directo sobre window.gsap en vez de asumir el closure.
      if (window.gsap){
        grid.querySelectorAll('.btn').forEach(function(b){
          b.addEventListener('mousemove', function(e){
            var r = b.getBoundingClientRect();
            gsap.to(b, {
              x: ((e.clientX - r.left) / r.width - 0.5) * 16,
              y: ((e.clientY - r.top) / r.height - 0.5) * 10,
              duration: 0.4, ease: 'power3.out'
            });
          });
          b.addEventListener('mouseleave', function(){
            gsap.to(b, { x: 0, y: 0, duration: 0.85, ease: 'elastic.out(1,0.45)' });
          });
        });
      }
    })
    .catch(function(e){ console.log('Blog dinámico: usando respaldo estático', e); });
})();

/* ============================================================
   13 · RESEÑAS REALES DE GOOGLE — misma función que index.html
============================================================ */
(function(){
  var star = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>';

  function escHtml(s){
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function tarjeta(r){
    var inicial = r.author_name ? r.author_name[0].toUpperCase() : '?';
    var foto = r.profile_photo_url;
    return '<div style="background:var(--tinta-2);border:1px solid rgba(127,181,171,.18);border-radius:16px;padding:1.4rem">' +
      '<div style="display:flex;gap:2px;margin-bottom:.7rem;color:var(--alba)">' + star.repeat(r.rating || 5) + '</div>' +
      '<p style="font-size:.92rem;line-height:1.6;margin-bottom:1rem;color:var(--arena)">"' + escHtml(r.text || 'Excelente atención.') + '"</p>' +
      '<div style="display:flex;align-items:center;gap:.7rem">' +
      (foto
        ? '<img src="' + escHtml(foto) + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover" alt="">'
        : '<div style="width:36px;height:36px;border-radius:50%;background:var(--teal);color:var(--arena);display:flex;align-items:center;justify-content:center;font-weight:600">' + inicial + '</div>') +
      '<span style="font-size:.85rem;font-weight:600;color:var(--bruma)">' + escHtml(r.author_name || 'Paciente Kairal') + '</span>' +
      '</div></div>';
  }

  fetch('/.netlify/functions/reviews')
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (data.status !== 'OK' || !data.result || !data.result.reviews) throw new Error('sin reseñas');
      var buenas = data.result.reviews.filter(function(r){ return r.rating >= 4; });
      var carga = document.getElementById('resenas-carga');
      var grid = document.getElementById('resenas-grid');
      if (carga) carga.style.display = 'none';
      if (grid) grid.innerHTML = buenas.map(tarjeta).join('');
    })
    .catch(function(e){
      var carga = document.getElementById('resenas-carga');
      var err = document.getElementById('resenas-error');
      if (carga) carga.style.display = 'none';
      if (err) err.style.display = 'block';
      console.log('Reseñas de Google:', e);
    });
})();
