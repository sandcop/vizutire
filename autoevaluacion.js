/* Autoevaluación · lógica del cuestionario.
   El contenido (preguntas, bandas, textos del informe) vive en autoeval-contenido.js,
   el mismo módulo que usa el servidor para armar el correo. El header y el menú los maneja interna.js. */
(function(){
'use strict';

/* ═══ Cuestionario ═══ */
var A = window.KAIRAL_AUTOEVAL;
if (!A){ console.error('No se pudo cargar autoeval-contenido.js'); return; }

// Los iconos son presentación y viven aquí; el texto vive en el módulo.
var ICONOS = {
  dig:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v5a4 4 0 0 0 4 4h1a3 3 0 0 1 3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V9M9 3v4M18 21v-2"/></svg>',
  neuro:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3A2.5 2.5 0 0 0 7 5.5 2.5 2.5 0 0 0 5 8a2.5 2.5 0 0 0 0 5 2.5 2.5 0 0 0 2 4 2.5 2.5 0 0 0 5 .5V4A2.5 2.5 0 0 0 9.5 3zM14.5 3A2.5 2.5 0 0 1 17 5.5 2.5 2.5 0 0 1 19 8a2.5 2.5 0 0 1 0 5 2.5 2.5 0 0 1-2 4 2.5 2.5 0 0 1-5 .5"/></svg>',
  inmune: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/></svg>',
  metab:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>'
};
// Colores de cada nivel con la paleta del sitio (el módulo trae los de la web anterior,
// que el correo sigue usando).
var COLOR_NIVEL = { 1: '#0E7C6B', 2: '#E69A3E', 3: '#C75C84', 4: '#8E2F55' };
function colorDe(banda){ return COLOR_NIVEL[banda.nivel] || banda.color; }

var SISTEMAS   = A.SISTEMAS;
var TOTAL_Q    = A.TOTAL_PREGUNTAS;
var MIN_PARA_VER = 20;              // mínimo de respuestas para desbloquear
var STORE      = 'kairal_autoeval_v1';
var STORE_MAIL = 'kairal_autoeval_desbloqueado';

var respuestas = {};
try { respuestas = JSON.parse(localStorage.getItem(STORE)) || {}; } catch(e) { respuestas = {}; }
var desbloqueado = false;
try { desbloqueado = localStorage.getItem(STORE_MAIL) === '1'; } catch(e) {}

function esc(s){
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

var systemsEl = document.getElementById('systems');
var barsEl    = document.getElementById('bars');
var ETIQUETAS = ['Nunca', 'A veces', 'Frecuente', 'Casi siempre'];

// ── Construir el cuestionario ──
SISTEMAS.forEach(function(sys){
  var card = document.createElement('section');
  card.className = 'sys reveal';
  var stmts = sys.preguntas.map(function(q, i){
    var key = sys.id + '_' + i;
    var segs = [0,1,2,3].map(function(v){
      var on = respuestas[key] === v;
      return '<button type="button" role="radio" aria-checked="' + on + '" aria-label="' + v + ' · ' + ETIQUETAS[v] +
             '" title="' + ETIQUETAS[v] + '" data-key="' + key + '" data-v="' + v + '">' + v + '</button>';
    }).join('');
    return '<div class="stmt"><span class="q">' + esc(q) + '</span>' +
           '<div class="seg" role="radiogroup" aria-label="' + esc(q) + '">' + segs + '</div></div>';
  }).join('');
  card.innerHTML =
    '<div class="sys-head"><span class="sys-ico">' + (ICONOS[sys.id] || '') + '</span>' +
    '<h2>' + esc(sys.nombre) + '</h2>' +
    '<div class="sys-total"><span class="num" id="tot_' + sys.id + '">0</span>' +
    '<span class="max"> / ' + (sys.preguntas.length * 3) + '</span></div></div>' +
    '<p class="intro">' + esc(sys.intro) + '</p>' +
    '<div class="sys-band" id="band_' + sys.id + '" style="display:none;"></div>' +
    '<div class="stmts">' + stmts + '</div>';
  systemsEl.appendChild(card);
  var io = window.KAIRAL_IO;
  if (io) io.observe(card); else card.classList.add('visible');

  var bar = document.createElement('div');
  bar.className = 'bar';
  bar.id = 'bar_' + sys.id;
  bar.innerHTML = '<div class="top"><span class="nm">' + esc(sys.corto) + '</span>' +
                  '<span class="sc" id="sc_' + sys.id + '">0</span></div>' +
                  '<div class="track"><div class="fill" id="fill_' + sys.id + '"></div></div>';
  barsEl.appendChild(bar);
});

// ── Cálculo ──
function puntajes(){
  var p = {};
  SISTEMAS.forEach(function(sys){
    var t = 0;
    for (var i = 0; i < sys.preguntas.length; i++) {
      var v = respuestas[sys.id + '_' + i];
      if (v !== undefined) t += v;
    }
    p[sys.id] = t;
  });
  return p;
}
function nRespondidas(){ return Object.keys(respuestas).length; }

// ── Estado de la puerta del correo ──
var gate       = document.getElementById('gate');
var report     = document.getElementById('report');
var submitBtn  = document.getElementById('gate-submit');
var gateNote   = document.getElementById('gate-note');
var gateError  = document.getElementById('gate-error');
var subTexto   = document.getElementById('results-sub');
var detalle    = document.getElementById('informe-detalle');

function pintarAvance(){
  var n = nRespondidas(), pct = Math.round((n / TOTAL_Q) * 100) + '%';
  document.getElementById('pfill').style.width = pct;
  document.getElementById('pfill-movil').style.width = pct;
  document.getElementById('pcount').textContent = n + ' / ' + TOTAL_Q + ' respondidas';
  document.getElementById('pcount-movil').textContent = n + ' / ' + TOTAL_Q;
  return n;
}

function actualizar(){
  var n = pintarAvance();
  if (desbloqueado) { pintarInforme(); return; }

  // Bloqueado: sin puntajes visibles, solo el avance
  var faltan = MIN_PARA_VER - n;
  var listo  = faltan <= 0;
  submitBtn.disabled = !listo;
  gateNote.textContent = listo
    ? 'Te enviamos el informe a tu correo y lo verás aquí mismo.'
    : (faltan === 1 ? 'Responde 1 afirmación más para desbloquear tu informe.'
                    : 'Responde ' + faltan + ' afirmaciones más para desbloquear tu informe.');
}

// ── Informe en pantalla ──
function pintarInforme(){
  document.querySelector('.ae-avance-movil').hidden = true;
  gate.hidden = true;
  report.hidden = false;
  subTexto.textContent = 'Ordenado por prioridad: primero lo que más conviene atender.';

  var inf = A.informe(puntajes());

  // Barras y chips por sistema
  inf.sistemas.forEach(function(d){
    var color = colorDe(d.banda);
    document.getElementById('tot_' + d.id).textContent = d.puntaje;
    var chip = document.getElementById('band_' + d.id);
    chip.style.display = 'inline-flex';
    chip.textContent = d.banda.etiqueta;
    chip.style.background = color;
    chip.style.color = '#fff';

    var fill = document.getElementById('fill_' + d.id);
    fill.style.width = d.porcentaje + '%';
    fill.style.background = color;
    document.getElementById('sc_' + d.id).textContent = d.puntaje + '/' + d.maximo;
    document.getElementById('bar_' + d.id).classList.remove('dominant');
  });
  document.getElementById('bar_' + inf.principal.id).classList.add('dominant');

  // Tarjeta lateral
  var v = document.getElementById('verdict');
  v.innerHTML =
    '<div class="vlabel">Sistema con mayor puntaje</div>' +
    '<div class="vsys">' + esc(inf.principal.corto) + '</div>' +
    '<div class="vmsg"><strong style="color:' + (inf.principal.banda.nivel >= 3 ? '#F2A0BB' : '#F2A65A') + '">' +
      esc(inf.principal.banda.etiqueta) + '.</strong> ' +
      esc(inf.principal.banda.plazo) + '.</div>';

  // Informe detallado
  document.getElementById('informe-titulo').textContent = inf.conjunto.titulo;
  document.getElementById('informe-texto').textContent = inf.conjunto.texto;
  document.getElementById('informe-descargo').textContent = A.DESCARGO;
  document.getElementById('informe-sistemas').innerHTML = inf.ordenados.map(tarjeta).join('');
  detalle.hidden = false;
}

function tarjeta(d){
  var c = d.contenido, color = colorDe(d.banda);
  var acciones = (c.acciones || []).map(function(a){ return '<li>' + esc(a) + '</li>'; }).join('');
  return '' +
    '<article class="rec" style="border-left-color:' + color + '">' +
      '<div class="rec-head">' +
        '<h3>' + esc(d.nombre) + '</h3>' +
        '<span class="rec-score">' + d.puntaje + '<span> / ' + d.maximo + '</span></span>' +
      '</div>' +
      '<div class="rec-tags">' +
        '<span class="rec-tag" style="background:' + color + '">' + esc(d.banda.etiqueta) + '</span>' +
        '<span class="rec-tag plain">' + esc(d.banda.urgencia) + '</span>' +
      '</div>' +
      '<p class="rec-lectura">' + esc(c.lectura) + '</p>' +
      '<p class="rec-porque"><b>Por qué importa:</b> ' + esc(c.porque) + '</p>' +
      '<p class="rec-sub">Qué hacer</p>' +
      '<ul>' + acciones + '</ul>' +
      '<p class="rec-plazo"><b>Plazo sugerido:</b> ' + esc(d.banda.plazo) + '</p>' +
    '</article>';
}

// ── Responder ──
systemsEl.addEventListener('click', function(e){
  var btn = e.target.closest('button[data-key]');
  if (!btn) return;
  var key = btn.getAttribute('data-key');
  var v = parseInt(btn.getAttribute('data-v'), 10);
  var grupo = btn.parentNode;
  var yaEstaba = respuestas[key] === v;
  [].forEach.call(grupo.children, function(b){ b.setAttribute('aria-checked','false'); });
  if (yaEstaba) delete respuestas[key];
  else { respuestas[key] = v; btn.setAttribute('aria-checked','true'); }
  try { localStorage.setItem(STORE, JSON.stringify(respuestas)); } catch(err) {}
  actualizar();
});

document.getElementById('reset').addEventListener('click', function(){
  respuestas = {};
  desbloqueado = false;
  try { localStorage.removeItem(STORE); localStorage.removeItem(STORE_MAIL); } catch(e) {}
  document.querySelectorAll('.seg button[aria-checked="true"]').forEach(function(b){
    b.setAttribute('aria-checked','false');
  });
  document.querySelector('.ae-avance-movil').hidden = false;
  gate.hidden = false;
  report.hidden = true;
  detalle.hidden = true;
  gateError.hidden = true;
  submitBtn.classList.remove('enviando');
  submitBtn.textContent = 'Ver mi resultado';
  document.getElementById('informe-enviado').hidden = true;
  subTexto.textContent = 'Responde las afirmaciones y recibe tu informe completo.';
  SISTEMAS.forEach(function(s){
    document.getElementById('tot_' + s.id).textContent = '0';
    document.getElementById('band_' + s.id).style.display = 'none';
  });
  actualizar();
});

// ── Enviar el correo y desbloquear ──
document.getElementById('gate-form').addEventListener('submit', function(e){
  e.preventDefault();
  var email   = document.getElementById('gate-email');
  var nombre  = document.getElementById('gate-nombre').value.trim();
  var consent = document.getElementById('gate-consent');

  function error(msg, campo){
    gateError.textContent = msg;
    gateError.hidden = false;
    if (campo) { campo.classList.add('err'); campo.focus(); }
  }
  gateError.hidden = true;
  email.classList.remove('err');

  var valor = email.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) return error('Revisa tu correo: parece incompleto.', email);
  if (!consent.checked) return error('Marca la casilla para poder enviarte el informe.', null);
  if (nRespondidas() < MIN_PARA_VER) return error('Responde al menos ' + MIN_PARA_VER + ' afirmaciones.', null);

  submitBtn.disabled = true;
  submitBtn.classList.add('enviando');
  var textoOriginal = submitBtn.textContent;
  submitBtn.textContent = 'Enviando tu informe…';

  fetch('/.netlify/functions/autoeval-result', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: valor,
      firstName: nombre,
      consent: true,
      scores: puntajes(),
      answered: nRespondidas()
    })
  })
  .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
  .then(function(res){
    if (!res.ok || !res.d.success) throw new Error(res.d && res.d.error ? res.d.error : 'No pudimos enviar el correo.');
    desbloqueado = true;
    try { localStorage.setItem(STORE_MAIL, '1'); } catch(e) {}
    pintarInforme();
    var aviso = document.getElementById('informe-enviado');
    aviso.textContent = '✓ Te enviamos una copia a ' + valor;
    aviso.hidden = false;
    detalle.scrollIntoView({ behavior: 'smooth', block: 'start' });
  })
  .catch(function(err){
    submitBtn.disabled = false;
    submitBtn.classList.remove('enviando');
    submitBtn.textContent = textoOriginal;
    // Si el envío falla no dejamos a la persona sin su resultado:
    // se muestra en pantalla y se explica que el correo no salió.
    error((err.message || 'No pudimos enviar el correo.') + ' Te mostramos el resultado aquí abajo.', null);
    desbloqueado = true;
    pintarInforme();
    detalle.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

actualizar();
})();
