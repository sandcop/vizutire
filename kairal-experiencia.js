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

/* ---------- utilidades ---------- */
function lerp(a,b,t){ return a + (b-a)*t; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function hash(n){ var x = Math.sin(n*127.1 + 311.7)*43758.5453; return x - Math.floor(x); }
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
    polvo = [];
    var nP = Math.round((movil ? 22 : 46) * (tierBajo ? 0.55 : 1));
    for (var i=0;i<nP;i++){
      polvo.push({ x:Math.random()*W, y:Math.random()*H*0.8, r:Math.random()*1.6+0.4, s:Math.random()*0.25+0.06, ph:Math.random()*6.28 });
    }
  }

  function ridge(noiseFn, y0, amp, freq, t, harsh, color, rim){
    var pasos = movil ? 70 : 130;
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
      ctx.lineTo(x,y);
    }
    ctx.lineTo(W,H);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (rim > 0.01){
      ctx.beginPath();
      for (var j=0;j<puntos.length;j++){
        if (j===0) ctx.moveTo(puntos[j][0], puntos[j][1]);
        else ctx.lineTo(puntos[j][0], puntos[j][1]);
      }
      ctx.strokeStyle = 'rgba(242,166,90,'+(rim).toFixed(3)+')';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }

  function draw(t){
    // mood: hero (p<0.15) cálido; síntomas: se oscurece y endurece; cierre: penumbra contenida
    var dureza = clamp((scrollP-0.12)/0.5, 0, 1);
    var penumbra = clamp((scrollP-0.1)/0.6, 0, 0.55);

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

    // dunas (3 capas) — la cámara baja con scroll: dunas suben
    var sube = scrollP * H * 0.16;
    ridge(n1, H*0.66 - sube*0.45, H*0.085, 3.0, t,      dureza*0.5, mix('#143B35','#0e2a25', dureza), 0.20*dawn*(1-penumbra));
    ridge(n2, H*0.76 - sube*0.75, H*0.105, 4.2, t*1.15, dureza*0.8, mix('#0E2C28','#0a201d', dureza), 0.10*dawn*(1-penumbra));
    ridge(n3, H*0.87 - sube,      H*0.12,  5.6, t*1.3,  dureza,     mix('#091F1C','#061512', dureza), 0);

    // polvo en suspensión
    ctx.fillStyle = 'rgba(237,229,214,0.14)';
    for (var i=0;i<polvo.length;i++){
      var p = polvo[i];
      p.x += p.s; p.y += Math.sin(t*0.7+p.ph)*0.08;
      if (p.x > W+4) p.x = -4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.28);
      ctx.fill();
    }

    // viñeta
    var v = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35, W/2,H/2,Math.max(W,H)*0.75);
    v.addColorStop(0,'rgba(0,0,0,0)');
    v.addColorStop(1,'rgba(3,16,14,0.5)');
    ctx.fillStyle = v;
    ctx.fillRect(0,0,W,H);
  }

  resize();
  window.addEventListener('resize', resize);

  if (reduced){
    dawn = 1;
    draw(0);
  } else {
    // amanecer al cargar
    var t0 = performance.now();
    (function anim(now){
      var t = (now - t0)/1000;
      if (dawnT0 !== null){
        dawn = clamp((now - dawnT0)/2600, 0, 1);
        dawn = 1 - Math.pow(1-dawn, 3); // expo-ish
      }
      if (visible && pagVisible) draw(t);
      requestAnimationFrame(anim);
    })(t0);
    var io = new IntersectionObserver(function(en){ visible = en[0].isIntersecting; }, {threshold:0});
    io.observe(cv.closest('.acto-superficie'));
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
  var objetivo = 0, P = 0;          // scroll objetivo y suavizado (inercia liquida)
  var visible = false;
  var lastNow = performance.now();
  var lluvia = [], anillos = [];    // interaccion: toca y llueve
  var mx = 0;                        // parallax sutil de mouse

  function geo(){
    return {
      x: movil ? W*0.5 : W*0.32,
      yIni: movil ? H*0.20 : H*0.22,
      yFin: movil ? H*0.52 : H*0.74,
      r: movil ? 14 : 19
    };
  }

  function resize(){
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W*DPR; cv.height = H*DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);
    draw(performance.now());
  }

  function gotaPath(r, T){
    ctx.beginPath();
    ctx.moveTo(0,-T);
    ctx.bezierCurveTo( r*0.42, -T*0.5,  r, -r*0.6,  r, 0);
    ctx.bezierCurveTo( r, r*0.56,  r*0.56, r,  0, r);
    ctx.bezierCurveTo(-r*0.56, r, -r, r*0.56, -r, 0);
    ctx.bezierCurveTo(-r, -r*0.6, -r*0.42, -T*0.5, 0, -T);
    ctx.closePath();
  }
  function pintaGota(px, py, r, T, alpha){
    ctx.save();
    ctx.translate(px, py);
    var gd = ctx.createRadialGradient(-r*0.35,-r*0.1,r*0.08, 0,0,r*1.15);
    gd.addColorStop(0,'rgba(240,252,248,'+(0.95*alpha).toFixed(3)+')');
    gd.addColorStop(0.45,'rgba(159,216,204,'+(0.78*alpha).toFixed(3)+')');
    gd.addColorStop(0.8,'rgba(14,124,107,'+(0.6*alpha).toFixed(3)+')');
    gd.addColorStop(1,'rgba(8,60,52,'+(0.55*alpha).toFixed(3)+')');
    ctx.fillStyle = gd;
    gotaPath(r, T);
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,245,240,'+(0.4*alpha).toFixed(3)+')';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,'+(0.8*alpha).toFixed(3)+')';
    ctx.beginPath();
    ctx.ellipse(-r*0.36, -r*0.12, r*0.17, r*0.3, -0.5, 0, 6.28);
    ctx.fill();
    ctx.restore();
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
    var dt = Math.min(0.05, (now - lastNow)/1000);
    lastNow = now;
    ctx.clearRect(0,0,W,H);

    var g = geo();
    var x = g.x + mx*10, yIni = g.yIni, yFin = g.yFin, r = g.r;

    var p4 = clamp(P,0,1)*4;
    var s = Math.min(3, Math.floor(p4));
    var t = clamp(p4 - s, 0, 1);

    // hilo: viene desde arriba — desciende del mundo anterior
    var lg = ctx.createLinearGradient(0,0,0,yFin);
    lg.addColorStop(0,'rgba(127,181,171,0.24)');
    lg.addColorStop(0.22,'rgba(127,181,171,0.12)');
    lg.addColorStop(0.55,'rgba(127,181,171,0.2)');
    lg.addColorStop(1,'rgba(127,181,171,0.32)');
    ctx.strokeStyle = lg; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,yFin); ctx.stroke();

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
    // anillos persistentes de etapas completadas
    for (var pk=0; pk<s; pk++){
      ctx.strokeStyle = 'rgba(127,181,171,0.1)';
      ctx.beginPath();
      ctx.ellipse(x, yFin+6, pw*0.5 + pk*13, (pw*0.5+pk*13)*0.2, 0, 0, 6.28);
      ctx.stroke();
    }

    // ── ciclo de la gota de esta etapa ──
    if (t < 0.18){
      var ft = t/0.18;
      ft = ft*ft*(3-2*ft);
      var rr = r*(0.4 + 0.6*ft);
      var T = rr*(0.85 + 1.05*ft*ft);
      var sway = Math.sin(tm*0.9)*1.4*ft;
      pintaGota(x + sway, yIni + T, rr, T, 0.55 + 0.45*ft);

    } else if (t <= 0.5){
      var tf = (t-0.18)/0.32;
      var yD = Math.pow(tf, 1.55);
      var yDrop = yIni + yD*(yFin - yIni - r);
      var T = r*(1.05 + 1.5*tf);
      var ondula = Math.sin(tm*1.6 + tf*5)*1.6*(1-tf);

      var gl = ctx.createRadialGradient(x,yDrop,0,x,yDrop,r*4.6);
      gl.addColorStop(0,'rgba(127,181,171,0.22)');
      gl.addColorStop(1,'rgba(127,181,171,0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(x,yDrop,r*4.6,0,6.28); ctx.fill();

      var est = ctx.createLinearGradient(0, yDrop-T-60, 0, yDrop-T);
      est.addColorStop(0,'rgba(159,216,204,0)');
      est.addColorStop(1,'rgba(159,216,204,'+(0.35*tf).toFixed(3)+')');
      ctx.strokeStyle = est; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(x, yDrop-T-60); ctx.lineTo(x+ondula*0.4, yDrop-T); ctx.stroke();

      for (var sx=1;sx<=3;sx++){
        var off = (yFin-yIni)*0.018*sx*(0.3+tf);
        if (off < 3) continue;
        pintaGota(x+ondula*(1-sx*0.25), yDrop-off, r*(1-0.2*sx), T*(1-0.16*sx), 0.14/sx + 0.02);
      }
      pintaGota(x+ondula, yDrop, r, T, 1);

    } else {
      // impacto + calma: aqui NACE la tarjeta de la etapa
      var rt = (t-0.5)/0.5;

      for (var k=0;k<4;k++){
        var rr2 = clamp(rt*0.95 - k*0.13, 0, 1);
        if (rr2 <= 0) continue;
        var eo = 1 - Math.pow(1-rr2, 2);
        var rad = (movil?40:72) + eo*(movil?85:165);
        ctx.strokeStyle = 'rgba(159,216,204,'+((1-eo)*0.5+0.05).toFixed(3)+')';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(x, yFin+6, rad, rad*0.23, 0, 0, 6.28);
        ctx.stroke();
      }
      if (rt < 0.45){
        var ct = rt/0.45;
        for (var i=0;i<8;i++){
          var a = -Math.PI*0.88 + (i/7)*Math.PI*0.76;
          var sp = (movil?38:62)*(0.65 + hash(s*9+i)*0.7);
          var gx = x + Math.cos(a)*sp*ct;
          var gy = yFin + Math.sin(a)*sp*ct + (movil?50:82)*ct*ct;
          var gr = (1.5 + hash(s*5+i)*2.2)*(1 - ct*0.4);
          ctx.fillStyle = 'rgba(220,244,238,'+((1-ct)*0.8).toFixed(3)+')';
          ctx.beginPath(); ctx.arc(gx, gy, gr, 0, 6.28); ctx.fill();
        }
      }
      var jt = Math.sin(clamp(rt/0.55, 0, 1)*Math.PI);
      var jh = (movil?32:52)*jt;
      if (jh > 2){
        var jg = ctx.createLinearGradient(0, yFin-jh, 0, yFin);
        jg.addColorStop(0,'rgba(220,244,238,'+(0.7*jt).toFixed(3)+')');
        jg.addColorStop(1,'rgba(127,181,171,'+(0.28*jt).toFixed(3)+')');
        ctx.strokeStyle = jg;
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(x, yFin+4); ctx.lineTo(x, yFin-jh); ctx.stroke();
        pintaGota(x, yFin-jh-7, r*0.32, r*0.42, jt);
      }
      var sg = ctx.createRadialGradient(x,yFin,0,x,yFin,70);
      sg.addColorStop(0,'rgba(242,166,90,'+((1-rt)*0.14).toFixed(3)+')');
      sg.addColorStop(1,'rgba(242,166,90,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(x,yFin,70,0,6.28); ctx.fill();
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

  if (!reduced){
    (function loop(now){
      if (visible && pagVisible){
        P = lerp(P, objetivo, 0.05);
        draw(now);
      } else {
        lastNow = now;
      }
      requestAnimationFrame(loop);
    })(performance.now());
    var ioG = new IntersectionObserver(function(en){ visible = en[0].isIntersecting; }, { threshold: 0 });
    var sec = document.querySelector('.acto-metodo');
    if (sec) ioG.observe(sec);
  }

  return { setP: function(p){
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
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      return;
    }
    gsap.to(wsH1, { opacity:1, y:0, filter:'blur(0px)', duration:1.1, stagger:0.08, ease:'power3.out', delay:0.3 });
    gsap.to(['#hero-copy .eyebrow', '#hero-copy p:not(.eyebrow)', '.hero-ctas'],
      {opacity:1, y:0, duration:0.9, stagger:0.14, delay:0.7, ease:'power3.out',
       onComplete: function(){ if (window.ScrollTrigger) ScrollTrigger.refresh(); }});
  };

  // timeline scrubbed de la superficie
  var tlSup = gsap.timeline({
    scrollTrigger: {
      trigger: '.acto-superficie',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: function(self){ terreno.setP(self.progress); }
    }
  });
  // Desplazamientos al azar por letra para el efecto de viento/polvo: entra
  // desde la izquierda, se dispersa hacia la derecha — mismo criterio que el
  // eyebrow del hero.
  function vientoIzq(){ return -(14 + Math.random() * 26); }
  function vientoDer(){ return 14 + Math.random() * 26; }
  function vientoGiro(){ return Math.random() * 20 - 10; }

  // El título inicial casi no se mueve: se queda quieto y legible durante
  // prácticamente todo el tramo previo a las frases-espejismo, y solo en el
  // último tramo se desliza hacia arriba y se desvanece. La opacidad la
  // sigue manejando el contenedor (como antes) — las letras solo aportan
  // el movimiento/blur del viento encima. Si la opacidad se moviera a las
  // letras, cualquier cosa que no sea texto partido en letras (por ejemplo
  // la rayita ::before del eyebrow) se quedaría visible por su cuenta.
  var letrasH1 = splitLetters(document.getElementById('h1'));
  tlSup.to(['#hero-copy .eyebrow', '#hero-copy p:not(.eyebrow)', '.hero-ctas', '#h1'],
        { opacity:0, y:-70, duration:0.015, ease:'none' }, 0.115)
       .to(letrasH1,
        { x:vientoDer, rotation:vientoGiro, filter:'blur(6px)', duration:0.015, stagger:0.0006, ease:'none' }, 0.115)
       .to('.indicador-scroll', { opacity:0, duration:0.04 }, 0.04);

  // Frases-espejismo: entran desde abajo y se van deslizando hacia arriba
  // (el fundido lo maneja el contenedor); las letras solo suman el viento
  // (posición + giro + blur) encima. La entrada y la salida son cortas y
  // casi todo el paso de cada una es tiempo quieto de lectura.
  var frases = ['.e1','.e2','.e3','.e4','.e5'];
  var ini = 0.13, paso = 0.115;
  frases.forEach(function(sel, i){
    var t = ini + i*paso;
    var letras = splitLetters(document.querySelector(sel));
    tlSup.fromTo(sel, {opacity:0, y:34}, {opacity:1, y:0, duration:0.015, ease:'none'}, t)
         .fromTo(letras,
        {x:vientoIzq, rotation:vientoGiro, filter:'blur(8px)'},
        {x:0, rotation:0, filter:'blur(0px)', duration:0.015, stagger:0.0008, ease:'none'}, t)
         .to(sel, {opacity:0, y:-26, duration:0.015, ease:'none'}, t + 0.1)
         .to(letras,
        {x:vientoDer, rotation:vientoGiro, filter:'blur(6px)', duration:0.015, stagger:0.0008, ease:'none'}, t + 0.1);
  });

  // Giro (cierre del acto 2): mismo criterio — el contenedor maneja la
  // opacidad (así la rayita del eyebrow se esconde con el resto), las
  // letras solo aportan el viento.
  var letrasGiro = splitLetters(document.getElementById('giro'));
  tlSup.fromTo('#giro', {opacity:0, scale:0.97}, {opacity:1, scale:1, duration:0.08, ease:'none'}, 0.78)
       .fromTo(letrasGiro,
        {x:vientoIzq, rotation:vientoGiro, filter:'blur(6px)'},
        {x:0, rotation:0, filter:'blur(0px)', duration:0.08, stagger:0.0015, ease:'none'}, 0.78);
  tlSup.to('#giro', {opacity:0, duration:0.04, ease:'none'}, 0.955)
       .to(letrasGiro,
        {x:vientoDer, rotation:vientoGiro, filter:'blur(6px)', duration:0.04, stagger:0.0008, ease:'none'}, 0.955);

  // ─── Acto 4: una gota por etapa + tarjetas cinematográficas ───
  var etapasCtl = (function(){
    var tarjetas = Array.prototype.slice.call(document.querySelectorAll('.tarjeta-etapa'));
    var nums = Array.prototype.slice.call(document.querySelectorAll('.numeros-etapa button'));
    var mostrada = [false,false,false,false];
    tarjetas.forEach(function(t){ splitWords(t.querySelector('h3')); });

    function entra(i){
      var t = tarjetas[i];
      t.style.visibility = 'visible';
      t.classList.add('mostrada');
      gsap.killTweensOf(t);
      gsap.to(t, {opacity:1, duration:0.35, overwrite:'auto'});
      gsap.fromTo(t.querySelectorAll('h3 .w'),
        {opacity:0, y:32, filter:'blur(8px)'},
        {opacity:1, y:0, filter:'blur(0px)', duration:0.9, stagger:0.09, ease:'power3.out', overwrite:'auto'});
      gsap.fromTo(t.querySelectorAll('.fila'),
        {opacity:0, y:22},
        {opacity:1, y:0, duration:0.85, stagger:0.15, delay:0.22, ease:'power3.out', overwrite:'auto'});
    }
    function sale(i){
      var t = tarjetas[i];
      t.classList.remove('mostrada');
      gsap.to(t.querySelectorAll('h3 .w'), {y:-18, filter:'blur(5px)', opacity:0, duration:0.5, stagger:0.02, ease:'power2.in', overwrite:'auto'});
      gsap.to(t.querySelectorAll('.fila'), {opacity:0, y:-12, duration:0.45, ease:'power2.in', overwrite:'auto'});
      gsap.to(t, {opacity:0, duration:0.55, ease:'power2.in', overwrite:'auto',
        onComplete:function(){ t.style.visibility='hidden'; }});
    }
    nums.forEach(function(b, i){
      b.addEventListener('click', function(){
        var sec = document.querySelector('.acto-metodo');
        var total = sec.offsetHeight - window.innerHeight;
        window.scrollTo({ top: sec.offsetTop + total*((i + 0.66)/4), behavior:'smooth' });
      });
    });
    return {
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

  ScrollTrigger.create({
    trigger: '.acto-metodo',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: function(self){
      gotaFondo.setP(self.progress);
      etapasCtl.update(self.progress);
    }
  });

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
  [['.servicios-head h2', 'top 82%'], ['.blog-head h2', 'top 82%'], ['.acto-faq h2', 'top 82%']].forEach(function(par){
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
   3 · RED DE RAÍCES (Acto 3) — versión premium
============================================================ */
(function(){
  var cv = document.getElementById('lienzo-red');
  var ctx = cv.getContext('2d');
  var W=0, H=0, visible = false, t0 = performance.now();
  var nf = makeNoise(7);

  var nodos = [
    { nombre:'Sistema neuroendocrino', x:0.50, y:0.14, msg:'El estrés crónico enciende la inflamación y altera tu digestión. Integra cerebro, cortisol, tiroides y hormonas — tu eje cerebro-cuerpo dirige la orquesta.', con:[1,2] },
    { nombre:'Sistema digestivo',      x:0.18, y:0.62, msg:'Tu microbiota conversa con tu cerebro. Literalmente: ansiedad y digestión suelen ser la misma historia.', con:[0,2] },
    { nombre:'Sistema inmune',         x:0.82, y:0.62, msg:'Un sistema inmune desregulado deja de proteger y empieza a atacar. Su equilibrio se decide en gran parte en tu intestino.', con:[0,1] },
    { nombre:'Sistema metabólico',     x:0.50, y:0.86, msg:'La resistencia a la insulina te roba la energía antes de que la sientas. Es el pilar silencioso detrás de la fatiga.', con:[0,1,2] }
  ];
  var aristas = [[0,1],[0,2],[1,2],[3,0],[3,1],[3,2]];

  var pulsos = [];
  var activo = -1, explorados = {}, nExpl = 0;
  var sincronizado = false, sincroT = -1;
  var glow = nodos.map(function(){ return 0; });
  var ptX = -9999, ptY = -9999;       // puntero en coords del canvas
  var esporas = [];

  function resize(){
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W*DPR; cv.height = H*DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);
    esporas = [];
    var nE = Math.round((movil ? 16 : 30) * (tierBajo ? 0.55 : 1));
    for (var i=0;i<nE;i++){
      esporas.push({ x:Math.random()*W, y:Math.random()*H, z:0.35+Math.random()*0.65, ph:Math.random()*6.28 });
    }
  }

  // posición con flotación + magnetismo de proximidad al puntero
  function pos(i, t){
    var n = nodos[i];
    var px = n.x*W + (nf(t*0.12 + i*13) - 0.5) * 10;
    var py = n.y*H + (nf(t*0.10 + i*31 + 50) - 0.5) * 10;
    var inf = 0;
    if (ptX > -999){
      var dx = ptX - px, dy = ptY - py;
      var d = Math.sqrt(dx*dx + dy*dy) || 1;
      inf = clamp(1 - d/(movil?150:200), 0, 1);
      inf *= inf;
      px += dx * inf * 0.11;
      py += dy * inf * 0.11;
    }
    return [px, py, inf];
  }
  function ctrl(p1, p2){
    return [ lerp((p1[0]+p2[0])/2, W*0.5, 0.34), lerp((p1[1]+p2[1])/2, H*0.52, 0.34) ];
  }
  function bez(p1, c, p2, t){
    var u = 1-t;
    return [ u*u*p1[0] + 2*u*t*c[0] + t*t*p2[0], u*u*p1[1] + 2*u*t*c[1] + t*t*p2[1] ];
  }

  function raicillas(p, i, t){
    ctx.strokeStyle = 'rgba(127,181,171,0.2)';
    ctx.lineWidth = 1;
    for (var k=0;k<4;k++){
      var a = (i*1.3 + k*1.7) + Math.sin(t*0.3+k)*0.08;
      var len = 26 + hash(i*10+k)*22;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.quadraticCurveTo(
        p[0] + Math.cos(a)*len*0.6, p[1] + Math.sin(a)*len*0.6 + 6,
        p[0] + Math.cos(a)*len,     p[1] + Math.sin(a)*len + 14
      );
      ctx.stroke();
    }
  }

  function draw(now){
    var t = (now - t0)/1000;
    ctx.clearRect(0,0,W,H);

    var enSincro = sincroT >= 0 && (now - sincroT) < 3400;
    var st = enSincro ? (now - sincroT)/3400 : 0;

    // ── esporas de fondo con parallax sutil ──
    var parx = (ptX > -999 ? (ptX/W - 0.5) : 0) * 12;
    var pary = (ptY > -999 ? (ptY/H - 0.5) : 0) * 8;
    for (var e=0;e<esporas.length;e++){
      var sp = esporas[e];
      sp.y -= sp.z*0.12;
      sp.x += (nf(t*0.2 + sp.ph*10) - 0.5)*0.4;
      if (sp.y < -6){ sp.y = H+6; sp.x = Math.random()*W; }
      ctx.fillStyle = 'rgba(159,216,204,'+(0.05 + sp.z*0.11).toFixed(3)+')';
      ctx.beginPath();
      ctx.arc(sp.x + parx*sp.z, sp.y + pary*sp.z, sp.z*1.9, 0, 6.28);
      ctx.fill();
    }

    // ── niebla volumétrica que respira ──
    var fogA = 0.05 + 0.02*Math.sin(t*0.4) + (enSincro ? (1-st)*0.1 : 0);
    var fog = ctx.createRadialGradient(W/2, H*0.52, 0, W/2, H*0.52, Math.max(W,H)*0.55);
    fog.addColorStop(0, 'rgba(14,124,107,'+fogA.toFixed(3)+')');
    fog.addColorStop(1, 'rgba(14,124,107,0)');
    ctx.fillStyle = fog;
    ctx.fillRect(0,0,W,H);

    var P = nodos.map(function(_, i){ return pos(i, t); });

    // ── aristas: estructura + flujo vivo ──
    aristas.forEach(function(a){
      var p1 = P[a[0]], p2 = P[a[1]], c = ctrl(p1, p2);
      var act = enSincro || activo === a[0] || activo === a[1];
      // trazo base
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(p1[0],p1[1]);
      ctx.quadraticCurveTo(c[0],c[1],p2[0],p2[1]);
      ctx.strokeStyle = 'rgba(127,181,171,'+(act?0.22:0.09)+')';
      ctx.lineWidth = act ? 1.6 : 1;
      ctx.stroke();
      // energía circulando
      ctx.setLineDash([2, 11]);
      ctx.lineDashOffset = -t*(act?26:13);
      ctx.beginPath();
      ctx.moveTo(p1[0],p1[1]);
      ctx.quadraticCurveTo(c[0],c[1],p2[0],p2[1]);
      ctx.strokeStyle = act ? 'rgba(159,216,204,0.6)' : 'rgba(127,181,171,0.25)';
      ctx.lineWidth = act ? 1.6 : 1.1;
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // ── pulsos viajeros ──
    for (var i=pulsos.length-1;i>=0;i--){
      var pl = pulsos[i];
      var pt = (now - pl.t0)/pl.dur;
      if (pt < 0) continue;
      if (pt >= 1){ glow[pl.b] = 1; pulsos.splice(i,1); continue; }
      var p1 = P[pl.a], p2 = P[pl.b], c = ctrl(p1,p2);
      var pp = bez(p1,c,p2, pt);
      var rg = ctx.createRadialGradient(pp[0],pp[1],0,pp[0],pp[1],16);
      rg.addColorStop(0,'rgba(242,166,90,0.95)');
      rg.addColorStop(0.45,'rgba(199,92,132,0.45)');
      rg.addColorStop(1,'rgba(199,92,132,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(pp[0],pp[1],16,0,6.28); ctx.fill();
      for (var s=1;s<=3;s++){
        var sp2 = bez(p1,c,p2, clamp(pt - s*0.045, 0, 1));
        ctx.fillStyle = 'rgba(242,166,90,'+(0.25/s).toFixed(2)+')';
        ctx.beginPath(); ctx.arc(sp2[0],sp2[1],5-s,0,6.28); ctx.fill();
      }
    }

    // ── anillo de sincronía (recompensa por explorar los 4) ──
    if (enSincro){
      for (var rg2=0;rg2<2;rg2++){
        var rk = clamp(st*1.15 - rg2*0.18, 0, 1);
        if (rk <= 0) continue;
        var eo = 1 - Math.pow(1-rk, 2);
        ctx.strokeStyle = 'rgba(242,166,90,'+((1-eo)*0.45).toFixed(3)+')';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(W/2, H*0.52, eo*Math.max(W,H)*0.52, 0, 6.28);
        ctx.stroke();
      }
    }

    // ── nodos con profundidad (orden por z) ──
    var orden = nodos.map(function(_,i){ return i; });
    var zs = orden.map(function(i){ return 0.86 + 0.14*Math.sin(t*0.35 + i*2.2); });
    orden.sort(function(a,b){ return zs[a] - zs[b]; });

    orden.forEach(function(i){
      var n = nodos[i];
      var p = P[i];
      var z = zs[i];
      glow[i] = Math.max(0, glow[i] - 0.012, p[2]*0.55, enSincro ? (1-st)*0.9 : 0);
      var act = (activo === i);
      var g = act ? 1 : glow[i];
      var lat = 1 + Math.sin(t*1.4 + i*1.9)*0.05;
      var R = (movil ? 17 : 22) * lat * z * (act ? 1.22 : 1 + p[2]*0.1);
      var alfa = 0.7 + 0.3*z;

      raicillas(p, i, t);

      var halo = ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],R*3.4);
      halo.addColorStop(0,'rgba(14,124,107,'+((0.16 + g*0.4)*alfa).toFixed(3)+')');
      halo.addColorStop(1,'rgba(14,124,107,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(p[0],p[1],R*3.4,0,6.28); ctx.fill();

      var cuerpo = ctx.createRadialGradient(p[0]-R*0.3,p[1]-R*0.3,R*0.1,p[0],p[1],R);
      cuerpo.addColorStop(0, mix('#9FD8CC','#FBE6C9', g*0.6));
      cuerpo.addColorStop(0.6, mix('#0E7C6B','#C75C84', g*0.5));
      cuerpo.addColorStop(1, '#0A2F2A');
      ctx.fillStyle = cuerpo;
      ctx.globalAlpha = alfa;
      ctx.beginPath(); ctx.arc(p[0],p[1],R,0,6.28); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(237,229,214,'+((0.25+g*0.5)*alfa).toFixed(3)+')';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // membrana orbital (segmento que gira)
      var ang = t*0.6 + i*1.3;
      ctx.strokeStyle = 'rgba(242,166,90,'+(0.15 + g*0.45).toFixed(3)+')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p[0], p[1], R*1.45, ang, ang + 1.7);
      ctx.stroke();

      ctx.font = '600 '+(movil?10:11)+'px "Poppins", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = act ? 'rgba(237,229,214,0.95)' : 'rgba(127,181,171,'+(0.55+0.35*z).toFixed(2)+')';
      var ly = p[1] + R + (n.y > 0.6 ? 22 : -R - 12);
      ctx.fillText(n.nombre.toUpperCase(), p[0], ly);
    });
  }

  function sincronia(){
    sincroT = performance.now();
    var now = sincroT;
    aristas.forEach(function(a, k){
      pulsos.push({ a:a[0], b:a[1], t0: now + k*120, dur: 1100 });
      pulsos.push({ a:a[1], b:a[0], t0: now + k*120 + 60, dur: 1100 });
    });
    var card = document.getElementById('tarjeta-nodo');
    card.querySelector('h3').textContent = 'La red completa';
    card.querySelector('p').textContent = 'Ahora lo ves: nada funciona aislado. Así trabaja la medicina funcional — leyendo todas las conversaciones de tu cuerpo a la vez.';
    card.querySelector('.conexiones').textContent = 'Neuroendocrino · Digestivo · Inmune · Metabólico';
    var cierre = document.getElementById('raiz-cierre');
    cierre.classList.add('visible','dorado');
  }

  function activar(i, anuncia){
    activo = i;
    var n = nodos[i];
    glow[i] = 1;
    var now = performance.now();
    var objetivo = (i === 3) ? [0,1,2] : n.con;
    objetivo.forEach(function(j, k){
      pulsos.push({ a:i, b:j, t0: now + k*180, dur: 950 });
    });
    document.querySelectorAll('.chip').forEach(function(c){
      c.classList.toggle('activo', +c.dataset.nodo === i);
    });
    var card = document.getElementById('tarjeta-nodo');
    var nombres = objetivo.map(function(j){ return nodos[j].nombre; }).join(' · ');
    card.querySelector('h3').textContent = n.nombre;
    card.querySelector('p').textContent = n.msg;
    card.querySelector('.conexiones').textContent = 'Conversa con: ' + nombres;
    if (anuncia !== false){
      if (!explorados[i]){
        explorados[i] = 1; nExpl++;
        var cont = document.getElementById('raiz-contador');
        if (cont) cont.textContent = nExpl;
      }
      if (nExpl >= 2) document.getElementById('raiz-cierre').classList.add('visible');
      if (nExpl >= 4 && !sincronizado){
        sincronizado = true;
        setTimeout(sincronia, 700);
      }
    }
  }

  document.querySelectorAll('.chip').forEach(function(c){
    c.addEventListener('click', function(){ activar(+c.dataset.nodo); });
  });

  function nodoEn(x, y){
    var t = (performance.now()-t0)/1000;
    for (var i=0;i<nodos.length;i++){
      var p = pos(i,t);
      var R = (movil?17:22)*2.0;
      var dx = x-p[0], dy = y-p[1];
      if (dx*dx + dy*dy < R*R) return i;
    }
    return -1;
  }
  cv.addEventListener('pointermove', function(e){
    var r = cv.getBoundingClientRect();
    ptX = e.clientX - r.left; ptY = e.clientY - r.top;
    cv.style.cursor = nodoEn(ptX, ptY) >= 0 ? 'pointer' : 'default';
  });
  cv.addEventListener('pointerleave', function(){ ptX = -9999; ptY = -9999; });
  cv.addEventListener('pointerdown', function(e){
    var r = cv.getBoundingClientRect();
    var i = nodoEn(e.clientX - r.left, e.clientY - r.top);
    if (i >= 0) activar(i);
  });

  resize();
  window.addEventListener('resize', resize);

  setInterval(function(){
    if (!visible || reduced) return;
    if (activo === -1 && pulsos.length === 0 && sincroT < 0){
      var a = aristas[Math.floor(Math.random()*aristas.length)];
      pulsos.push({ a:a[0], b:a[1], t0: performance.now(), dur: 1400 });
    }
  }, 4200);

  var io = new IntersectionObserver(function(en){
    visible = en[0].isIntersecting;
    if (visible && reduced){ draw(performance.now()); }
  }, { threshold: 0.15 });
  io.observe(cv);

  if (!reduced){
    (function loop(now){
      if (visible && pagVisible) draw(now);
      requestAnimationFrame(loop);
    })(performance.now());
  } else {
    activar(0, false);
    setTimeout(function(){ draw(performance.now()); }, 300);
  }
})();

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
  }
  function ridgeY(x){
    return H*0.84 + (nD(x/W*4.4) - 0.5) * H*0.07;
  }
  function crear(){
    parts = [];
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
    }
  }
  function drawBase(){
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
    (function loop(now){
      if (visible && lanzado && pagVisible) draw(now);
      requestAnimationFrame(loop);
    })(performance.now());
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
document.querySelectorAll('.caso').forEach(function(c, i){
  c.style.transitionDelay = (i*0.12)+'s';
  ioRev.observe(c);
});
document.querySelectorAll('.servicio-card').forEach(function(c, i){
  c.style.transitionDelay = (i*0.1)+'s';
  ioRev.observe(c);
});
document.querySelectorAll('.blog-card').forEach(function(c, i){
  c.style.transitionDelay = (i*0.1)+'s';
  ioRev.observe(c);
});
document.querySelectorAll('.faq-item').forEach(function(c, i){
  c.style.transitionDelay = (i*0.07)+'s';
  ioRev.observe(c);
});

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
  document.addEventListener('mousemove', function(e){ tx = e.clientX; ty = e.clientY; });
  document.querySelectorAll('a,button,[data-cursor],.chip').forEach(function(el){
    el.addEventListener('mouseenter', function(){ cur.classList.add('grande'); });
    el.addEventListener('mouseleave', function(){ cur.classList.remove('grande'); });
  });
  // cursor que habla: contexto por zona interactiva
  [['#lienzo-red','Explorar'], ['#carril','Arrastrar'], ['#lienzo-gota','Llover'], ['#lienzo-flor','Florecer']].forEach(function(par){
    var el = document.querySelector(par[0]);
    if (!el) return;
    el.addEventListener('mouseenter', function(){ tagEl.textContent = par[1]; cur.classList.add('tagged'); });
    el.addEventListener('mouseleave', function(){ cur.classList.remove('tagged'); });
  });
  // mismo sistema, para grupos de elementos repetidos (tarjetas expandibles)
  [['.servicio-card summary','Ver detalle'], ['.blog-card summary','Leer más'], ['.faq-item summary','Ver respuesta']].forEach(function(par){
    document.querySelectorAll(par[0]).forEach(function(el){
      el.addEventListener('mouseenter', function(){ tagEl.textContent = par[1]; cur.classList.add('tagged'); });
      el.addEventListener('mouseleave', function(){ cur.classList.remove('tagged'); });
    });
  });
  (function loopC(){
    if (pagVisible){
      cx = lerp(cx, tx, 0.18); cy = lerp(cy, ty, 0.18);
      cur.style.transform = 'translate('+cx+'px,'+cy+'px)';
    }
    requestAnimationFrame(loopC);
  })();

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
    (function loop(now){
      if (visible && pagVisible){
        bloomSuave = lerp(bloomSuave, bloomP, 0.045);
        draw(now);
      }
      requestAnimationFrame(loop);
    })(performance.now());
  }
})(); }catch(e){ console.error('Kairal: jardín no disponible.', e); }

/* ============================================================
   13 · SERVICIOS ESPECTACULAR: tilt 3D + foco de luz + pétalos
============================================================ */
try{ (function(){
  var cards = document.querySelectorAll('.servicio-card');
  if (!cards.length) return;

  // estallido de pétalos al abrir una tarjeta (WAAPI, sin dependencias)
  function estallido(card){
    if (reduced || !card.animate) return;
    var origen = card.querySelector('.servicio-mas');
    var cr = card.getBoundingClientRect();
    var or_ = origen ? origen.getBoundingClientRect() : cr;
    var ox = or_.left - cr.left + or_.width/2;
    var oy = or_.top - cr.top + or_.height/2;
    var colores = ['#C75C84', '#D77BA0', '#F2A65A', '#0E7C6B'];
    for (var i=0; i<9; i++){
      var p = document.createElement('span');
      p.className = 'petalo-burst';
      p.style.left = ox+'px';
      p.style.top = oy+'px';
      p.style.background = colores[i % colores.length];
      card.appendChild(p);
      var ang = -Math.PI*0.85 + (i/8)*Math.PI*0.7 + (Math.random()-0.5)*0.4;
      var dist = 34 + Math.random()*46;
      var dx = Math.cos(ang)*dist, dy = Math.sin(ang)*dist + 26;
      var anim = p.animate([
        { transform:'translate(0,0) rotate(0deg) scale(1)', opacity:1 },
        { transform:'translate('+(dx*0.7)+'px,'+(dy*0.4)+'px) rotate('+(120+Math.random()*180)+'deg) scale(1)', opacity:.9, offset:.55 },
        { transform:'translate('+dx+'px,'+dy+'px) rotate('+(260+Math.random()*180)+'deg) scale(.5)', opacity:0 }
      ], { duration: 750 + Math.random()*350, easing:'cubic-bezier(.22,1,.36,1)' });
      anim.onfinish = (function(el){ return function(){ el.remove(); }; })(p);
    }
  }
  cards.forEach(function(card){
    card.addEventListener('toggle', function(){ if (card.open) estallido(card); });
  });

  // tilt 3D + foco de luz (solo puntero fino, nunca en reduced)
  if (window.matchMedia('(pointer:fine)').matches && !reduced){
    cards.forEach(function(card){
      card.addEventListener('pointermove', function(e){
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left)/r.width;
        var py = (e.clientY - r.top)/r.height;
        card.style.setProperty('--mx', (px*100).toFixed(1)+'%');
        card.style.setProperty('--my', (py*100).toFixed(1)+'%');
        if (!card.classList.contains('visible')) return;
        card.classList.add('inclinando');
        var rx = (0.5 - py)*7, ry = (px - 0.5)*8;
        card.style.transform = 'perspective(800px) rotateX('+rx.toFixed(2)+'deg) rotateY('+ry.toFixed(2)+'deg) translateY(-4px)';
      });
      card.addEventListener('pointerleave', function(){
        card.style.transform = '';
        setTimeout(function(){ card.classList.remove('inclinando'); }, 380);
      });
    });
  }
})(); }catch(e){ console.error('Kairal: efectos de servicios no disponibles.', e); }

/* ============================================================
   10 · MENÚ MÓVIL
============================================================ */
try{
  var menuBtn = document.getElementById('menu-btn');
  var menuMovil = document.getElementById('menu-movil');
  if (menuBtn && menuMovil){
    function toggleMenu(abrir){
      var open = abrir !== undefined ? abrir : !menuMovil.classList.contains('abierto');
      menuMovil.classList.toggle('abierto', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuMovil.setAttribute('aria-hidden', String(!open));
      document.documentElement.classList.toggle('menu-abierto', open);
    }
    menuBtn.addEventListener('click', function(){ toggleMenu(); });
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
  var cvPolvoRaiz = document.getElementById('lienzo-polvo-raiz');
  // Estado inicial del cuerpo (saludo + disclaimer), para poder volver a él
  // con "Nueva conversación" sin duplicar ese texto acá también.
  var estadoInicialRaiz = cuerpoRaiz ? cuerpoRaiz.innerHTML : '';

  // Espectáculo de drones: cada partícula tiene un destino ASIGNADO y el
  // conjunto de esos destinos dibuja la silueta del panel (contorno
  // redondeado + relleno interior). Al abrir, el enjambre llega disperso y
  // se ensambla en esa formación; al cerrar parte de la formación armada y
  // cada dron se desprende con su propia trayectoria hacia afuera. No es una
  // nube que cambia de densidad: cada punto viaja de A a B con curva, retraso
  // propio y easing, que es lo que hace legible el "se está armando la caja".
  function construirPolvoRaiz(cv){
    if (!cv) return { abrir:function(){}, cerrar:function(){} };
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, drones = [], activo = false, fase = null, t0 = 0, dur = 0, serie = 0;
    var DUR_ABRIR = 1250;  // el enjambre termina de aterrizar ~950ms y se apaga al final
    var DUR_CERRAR = 760;  // el panel recién se apaga a los .46s (ver .panel-raiz en el CSS)
    var RADIO = 22;        // debe seguir al border-radius de .panel-raiz
    // Canales rgb sueltos para poder componer rgba() con alfa variable por
    // dron. Mayoría --duna, con pizcas de --bruma y --alba como luces frías/cálidas.
    var TONOS = ['201,183,154','201,183,154','201,183,154','127,181,171','242,166,90'];
    var punto = { x:0, y:0 };

    function resize(){
      W = panelRaiz.clientWidth; H = panelRaiz.clientHeight;
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    // Punto del contorno del rectángulo redondeado parametrizado por LONGITUD
    // de arco (no por ángulo): así los drones quedan repartidos parejo por el
    // borde en vez de amontonarse en las cuatro esquinas.
    function puntoContorno(s, r){
      var lh = Math.max(W - 2 * r, 0);   // tramo recto horizontal
      var lv = Math.max(H - 2 * r, 0);   // tramo recto vertical
      var la = Math.PI * r / 2;          // cuarto de circunferencia
      var d = s * (2 * lh + 2 * lv + 4 * la), a;
      if (d < lh) return { x: r + d, y: 0 };
      d -= lh;
      if (d < la){ a = -Math.PI / 2 + (d / la) * (Math.PI / 2); return { x: W - r + Math.cos(a) * r, y: r + Math.sin(a) * r }; }
      d -= la;
      if (d < lv) return { x: W, y: r + d };
      d -= lv;
      if (d < la){ a = (d / la) * (Math.PI / 2); return { x: W - r + Math.cos(a) * r, y: H - r + Math.sin(a) * r }; }
      d -= la;
      if (d < lh) return { x: W - r - d, y: H };
      d -= lh;
      if (d < la){ a = Math.PI / 2 + (d / la) * (Math.PI / 2); return { x: r + Math.cos(a) * r, y: H - r + Math.sin(a) * r }; }
      d -= la;
      if (d < lv) return { x: 0, y: H - r - d };
      d -= lv;
      a = Math.PI + Math.min(d / la, 1) * (Math.PI / 2);
      return { x: r + Math.cos(a) * r, y: r + Math.sin(a) * r };
    }

    function crearDrones(n, haciaLaFormacion){
      drones = [];
      var borde = Math.round(n * 0.72);
      var interior = n - borde;
      // El relleno va en grilla con ruido: el azar puro deja grumos y huecos
      // que rompen la lectura de "volumen" del cuadro.
      var cols = Math.max(1, Math.round(Math.sqrt(Math.max(interior, 1) * (W / Math.max(H, 1)))));
      var filas = Math.max(1, Math.ceil(Math.max(interior, 1) / cols));
      for (var i = 0; i < n; i++){
        var f, k;
        if (i < borde){
          // pequeño jitter en el parámetro para que el borde no se vea "de regla"
          f = puntoContorno(((i + Math.random() * 0.65) % borde) / borde, RADIO);
        } else {
          k = i - borde;
          f = {
            x: 15 + ((k % cols) + 0.5) / cols * Math.max(W - 30, 1) + (Math.random() - 0.5) * 14,
            y: 15 + (Math.floor(k / cols) % filas + 0.5) / filas * Math.max(H - 30, 1) + (Math.random() - 0.5) * 14
          };
        }
        // Dispersión: en anillo alrededor del centro del panel, con radios que
        // caen dentro y fuera del recorte, para que unos entren desde el borde
        // y otros ya estén sueltos adentro (enjambre, no cortina).
        var ang = Math.random() * 6.283;
        var lejos = 0.62 + Math.random() * 0.62;
        var disp = {
          x: W / 2 + Math.cos(ang) * (W / 2) * lejos,
          y: H / 2 + Math.sin(ang) * (H / 2) * lejos
        };
        var o = haciaLaFormacion ? disp : f;
        var dst = haciaLaFormacion ? f : disp;
        var mx = (o.x + dst.x) / 2, my = (o.y + dst.y) / 2;
        var vx = dst.x - o.x, vy = dst.y - o.y;
        var largoV = Math.sqrt(vx * vx + vy * vy) || 1;
        // Control de la Bézier desplazado en la perpendicular: da trayectorias
        // curvas y distintas entre sí, que es lo que se lee como "vuelo".
        var arco = (Math.random() - 0.5) * largoV * 0.42;
        drones.push({
          ox: o.x, oy: o.y, tx: dst.x, ty: dst.y,
          cx: mx + (-vy / largoV) * arco,
          cy: my + (vx / largoV) * arco,
          r: 0.75 + Math.random() * 1.35,
          tono: TONOS[(Math.random() * TONOS.length) | 0],
          retraso: Math.random() * (haciaLaFormacion ? 0.34 : 0.26),
          largo: (haciaLaFormacion ? 0.40 : 0.42) + Math.random() * 0.20,
          ph: Math.random() * 6.283
        });
      }
    }

    function enCurva(d, e){
      var u = 1 - e;
      punto.x = u * u * d.ox + 2 * u * e * d.cx + e * e * d.tx;
      punto.y = u * u * d.oy + 2 * u * e * d.cy + e * e * d.ty;
      return punto;
    }

    // Devuelve si queda animación por delante (quien la agenda decide seguir).
    function cuadro(now){
      if (!t0) t0 = now;
      var t = (now - t0) / dur;
      if (t >= 1){ activo = false; ctx.clearRect(0, 0, W, H); return false; }
      var abriendo = fase === 'abrir';
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      // 'lighter' sobre el fondo oscuro del panel: los cruces de drones suman
      // luz en vez de taparse, que es como se ve un enjambre real de luces.
      ctx.globalCompositeOperation = 'lighter';
      // Al abrir, las luces se apagan una vez completada la formación para
      // dejar a la vista el contenido real (que llega con su propio fade CSS).
      var global = abriendo ? (t < 0.76 ? 1 : Math.max(1 - (t - 0.76) / 0.24, 0)) : 1;
      for (var i = 0; i < drones.length; i++){
        var d = drones[i];
        var p = (t - d.retraso) / d.largo;
        if (p <= 0){
          // Antes de despegar: al abrir aún no existe; al cerrar sigue posado
          // en la formación, así el cuadro se ve armado hasta que se suelta.
          if (abriendo) continue;
          p = 0;
        } else if (p > 1) p = 1;
        // Llegando frenan (easeOut) y saliendo aceleran (easeIn): la asimetría
        // es lo que distingue "aterrizar en formación" de "salir disparado".
        var e = abriendo ? 1 - Math.pow(1 - p, 3) : p * p;
        var a = abriendo ? Math.min(p / 0.18, 1) : 1 - p * p;
        if (abriendo && p >= 1) a *= 0.72 + 0.28 * Math.sin(now / 95 + d.ph); // titileo posado
        a *= global;
        if (a <= 0.012) continue;
        // enCurva reusa un mismo objeto, así que hay que copiar el punto
        // anterior antes de pedir el actual.
        var q = enCurva(d, Math.max(e - 0.055, 0));
        var lx = q.x, ly = q.y;
        q = enCurva(d, e);
        var x = q.x, y = q.y;
        if (abriendo && p >= 1){
          // micro-deriva en el punto de destino: parecen sostenerse en el aire
          x += Math.sin(now / 430 + d.ph) * 0.7;
          y += Math.cos(now / 390 + d.ph) * 0.7;
        } else {
          ctx.strokeStyle = 'rgba(' + d.tono + ',' + (a * 0.42).toFixed(3) + ')';
          ctx.lineWidth = d.r * 1.05;
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(' + d.tono + ',' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y, d.r, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      return true;
    }

    function lanzar(nuevaFase){
      if (reduced) return;
      resize();
      fase = nuevaFase;
      dur = nuevaFase === 'abrir' ? DUR_ABRIR : DUR_CERRAR;
      crearDrones(movil ? 105 : 185, nuevaFase === 'abrir');
      t0 = 0; activo = true;
      // Token por lanzamiento: si se alterna rápido el FAB, el bucle anterior
      // se corta en vez de quedar dibujando en paralelo con el nuevo.
      var mio = ++serie;
      requestAnimationFrame(function paso(now){
        if (mio !== serie || !activo) return;
        if (cuadro(now)) requestAnimationFrame(paso);
      });
    }

    window.addEventListener('resize', function(){ if (panelRaiz.classList.contains('abierto')) resize(); });

    return {
      abrir: function(){ lanzar('abrir'); },
      cerrar: function(){ lanzar('cerrar'); }
    };
  }
  var polvoRaizCtl = construirPolvoRaiz(cvPolvoRaiz);

  if (fabRaiz && panelRaiz){
    function abrirRaiz(){
      panelRaiz.classList.add('abierto');
      panelRaiz.setAttribute('aria-hidden','false');
      fabRaiz.setAttribute('aria-expanded','true');
      polvoRaizCtl.abrir();
      if (!movil && inputRaiz) setTimeout(function(){ inputRaiz.focus(); }, 350);
    }
    function cerrarRaizPanel(){
      polvoRaizCtl.cerrar();
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
        r:'Kairal trabaja con cuatro enfoques: Medicina General, Medicina Funcional, Medicina Bioreguladora y Psiconeuroinmunología. Puedes ver el detalle de cada uno en la sección "Servicios" de esta página.' },
      { k:['metodo','método','proceso','como trabajan','pasos','evaluacion','diagnostico'],
        r:'El método tiene 4 etapas: Escuchar (evaluación de 60–90 min), Mapear (laboratorios funcionales), Sembrar (plan personalizado) y Cultivar (seguimiento continuo). Puedes verlo animado en la sección "El método".' },
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
  var entrado = false, fin = false;

  function entrar(){
    if (entrado) return;
    entrado = true;
    velo.classList.add('fuera');
    document.documentElement.classList.remove('velado');
    terreno.amanecer();
    // Si la página se cargó con el scroll ya movido (recarga en otra
    // sección, restauración nativa del navegador), el hero puede estar
    // fuera de vista — se le pasa a lanzarHero() para que se salte la
    // animación vistosa y solo asiente el estado final en silencio (ver
    // definición de lanzarHero, más arriba en el archivo, para el porqué
    // completo: si nunca se llama en absoluto, el hero queda invisible
    // para siempre aunque el usuario vuelva a subir hasta ahí).
    if (lanzarHero) lanzarHero(window.scrollY >= window.innerHeight * 0.5);
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
   12 · BLOG DINÁMICO — feed real de Sanity
   Mismo patrón que kairal-main/script.js: si falla, se deja el
   artículo de respaldo que ya está en el HTML.
============================================================ */
(function(){
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
  function tarjeta(post){
    var cat = escHtml(post.category || 'Medicina funcional');
    var titulo = escHtml(post.title);
    var extractoCompleto = String(post.excerpt || '').replace(/\s+/g, ' ').trim();
    var teaser = escHtml(recortar(extractoCompleto, 130));
    var extractoLargo = escHtml(extractoCompleto);
    var slug = escHtml((post.slug && post.slug.current) || '');
    return '<details class="blog-card blog-item">' +
      '<summary>' +
      '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="16"/></svg>' +
      '<span class="blog-cat">' + cat + '</span>' +
      '<h3>' + titulo + '</h3>' +
      '<p>' + teaser + '</p>' +
      '<span class="blog-mas">Leer más ↓</span>' +
      '</summary>' +
      '<div class="blog-extra"><p>' + extractoLargo + '</p>' +
      '<p style="margin-top:.8rem"><a href="https://kairal.cl/blog.html?slug=' + encodeURIComponent(slug) + '" style="color:var(--teal)">Leer el artículo completo →</a></p></div>' +
      '</details>';
  }

  var query = encodeURIComponent('*[_type == "post"] | order(publishedAt desc)[0...3] { title, slug, category, publishedAt, excerpt }');
  fetch(SANITY_API_URL + '?query=' + query)
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (!data.result || !data.result.length) return; // deja el respaldo
      var grid = document.getElementById('blog-grid');
      if (!grid) return;
      grid.innerHTML = data.result.map(tarjeta).join('');
      // las tarjetas nuevas nunca pasaron por ioRev (se insertan después de que
      // el IntersectionObserver ya se suscribió al cargar la página) — como el
      // usuario ya está viendo esta sección, se revelan directamente.
      grid.querySelectorAll('.blog-card').forEach(function(c){ c.classList.add('visible'); });
    })
    .catch(function(e){ console.log('Blog dinámico: usando respaldo estático', e); });

  // cursor contextual ("Leer más"): el bloque de la sección 7 engancha
  // .blog-card summary una sola vez al cargar, antes de este fetch. Se usa
  // delegación de eventos sobre document para cubrir también las tarjetas
  // insertadas dinámicamente, sin depender del scope de esa sección.
  document.addEventListener('mouseover', function(e){
    if (!document.body.classList.contains('con-cursor')) return;
    var el = e.target.closest && e.target.closest('.blog-card summary');
    if (!el) return;
    var curEl = document.getElementById('cursor');
    if (!curEl) return;
    var tagEl2 = curEl.querySelector('.cursor-tag');
    if (tagEl2) tagEl2.textContent = 'Leer más';
    curEl.classList.add('tagged');
  });
  document.addEventListener('mouseout', function(e){
    if (!document.body.classList.contains('con-cursor')) return;
    var el = e.target.closest && e.target.closest('.blog-card summary');
    if (!el) return;
    var curEl = document.getElementById('cursor');
    if (curEl) curEl.classList.remove('tagged');
  });
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
