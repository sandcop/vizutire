/* ============================================================
   HERO · historia por tiempo, con arena
   El hero no depende del scroll. Las frases de las pacientes se cuentan solas: cada una se deshace en granos de
   arena y esa misma arena arma la siguiente (el efecto de siempre), y al final queda «Son mensajes…».
   Todo el texto está en el HTML. Si la persona pidió reducir el movimiento, o el navegador no puede dibujar el
   canvas, no se hace nada de esto y el CSS deja las frases con un fundido simple (o todas visibles).
   El motor de arena (construirPolvoTextos) es el mismo del hero anterior, tomado sin cambios salvo: sin GSAP,
   sin ScrollTrigger y con una primera nube de polvo que arma la primera frase.
============================================================ */
(function(){
'use strict';
var escena = document.getElementById('hh-escena');
var cv = document.getElementById('hh-polvo');
var voces = document.querySelectorAll('#hh-voces li');
var giro = document.getElementById('giro');
if (!escena || !cv || !voces.length || !giro) return;
var reduced = !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('reduced');
if (reduced) return;
if (!cv.getContext || !window.requestAnimationFrame) return;

/* ── utilidades (las mismas del script principal, que vive en otro cierre) ── */
var movil = window.matchMedia('(max-width: 920px)').matches;
var ritmo = window.kairalRitmo || { cuadro: function(){}, salto: function(){ return 1; }, nivel: function(){ return 0; } };   // lo define script.js
var tierBajo = (function(){
  var mem = navigator.deviceMemory || 4, nucleos = navigator.hardwareConcurrency || 4;
  var ahorro = !!(navigator.connection && navigator.connection.saveData);
  return mem <= 3 || nucleos <= 4 || ahorro || ritmo.nivel() > 0;
})();
var DPR = Math.min(window.devicePixelRatio || 1, tierBajo ? 1.3 : 1.75);
var pagVisible = !document.hidden;
document.addEventListener('visibilitychange', function(){ pagVisible = !document.hidden; });
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
// un bucle de cuadros que corre solo mientras el hero se ve y la pestaña está activa
function bucleVisible(el, paso){
  var vis = true, corriendo = false, cuenta = 0;
  function tick(now){
    if (!vis || !pagVisible){ corriendo = false; return; }
    ritmo.cuadro(now);
    if (++cuenta % ritmo.salto()){ requestAnimationFrame(tick); return; }   // equipos lentos: 1 de cada 2 o 3 cuadros
    paso(now);
    requestAnimationFrame(tick);
  }
  function despertar(){ if (corriendo || !vis || !pagVisible) return; corriendo = true; requestAnimationFrame(tick); }
  if ('IntersectionObserver' in window){
    new IntersectionObserver(function(es){ vis = es[0].isIntersecting; despertar(); }, { threshold: 0 }).observe(el);
  }
  document.addEventListener('visibilitychange', despertar);
  despertar();
}

/* ── cada frase en letras (cada letra con su estilo real, para fotografiarla) ── */
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

/* ── el motor de arena ── */
  function construirPolvoTextos(cv, gruposDeLetras, contenedores){
    function verDOM(g, si){ var el = contenedores[g]; if (el) el.style.opacity = si ? '1' : '0'; }
    if (!cv || reduced){
      return { medirEnFrio:function(){}, mostrar:function(g){ verDOM(g, true); }, soltar:function(g){ verDOM(g, false); } };
    }
    var ctx = cv.getContext('2d');
    var escenarioEl = document.querySelector('.hh');
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
    var asentado = -1;  // grupo que el DOM muestra ahora (al cargar: ninguno; la arena arma el primero)
    var sembrado = false;
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
    function sembrar(GB){
      var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, i;
      for (i = 0; i < GB.celdas.length; i++){ var q = GB.celdas[i]; if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y; }
      if (x0 > x1){ x0 = 0; x1 = W; y0 = 0; y1 = H; }
      for (i = 0; i < POOL; i++){
        sx[i] = tx[i] = x0 - 170 + r1[i] * (x1 - x0 + 230);
        sy[i] = ty[i] = y0 - 150 + r2[i] * (y1 - y0 + 270);
      }
    }
    function iniciar(tipo, B){
      var now = performance.now(), k, c;
      if (asentado < 0 && !tr && tipo === 'armar' && !sembrado){ sembrar(medir(B)); sembrado = true; }
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
      resize();
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
    bucleVisible(escenarioEl, pintar);

    return { medirEnFrio: medirEnFrio, mostrar: mostrar, soltar: soltar, premedir: premedir };
  }

/* ── arranque ── */
var PERIODO = 3400;   // ms entre frase y frase
var ARRANQUE = 900;   // ms hasta que empieza la primera
function arrancar(){
  var grupos = [], contenedores = [];
  Array.prototype.forEach.call(voces, function(li){
    var texto = li.textContent;
    li.setAttribute('aria-label', texto);              // el lector de pantalla lee la frase entera
    var l = splitLetters(li); l.forEach(function(s){ s.setAttribute('aria-hidden', 'true'); });
    grupos.push(l); contenedores.push(li);
  });
  Array.prototype.forEach.call(giro.children, function(h){ h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim()); });
  var lg = splitLetters(giro); lg.forEach(function(s){ s.setAttribute('aria-hidden', 'true'); });
  grupos.push(lg); contenedores.push(giro);
  escena.classList.add('hh-arena');                    // el CSS suelta las frases: ahora las muestra la arena
  var polvo = construirPolvoTextos(cv, grupos, contenedores);
  var i = 0;
  (function siguiente(){
    polvo.mostrar(i);
    i++;
    if (i < grupos.length) setTimeout(siguiente, i === grupos.length - 1 ? PERIODO + 300 : PERIODO);
  })();
  if (polvo.premedir) polvo.premedir();
}
function listo(){ setTimeout(arrancar, ARRANQUE); }
if (document.fonts && document.fonts.ready) document.fonts.ready.then(listo); else window.addEventListener('load', listo);
})();
