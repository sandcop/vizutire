/* ============================================================
   RESERVA · página de reserva propia de Kairal
   Habla con el Apps Script de reservas (appscript-reservas/). Nunca recibe datos
   de salud: solo nombre, RUT, correo y teléfono, para la reserva y la boleta.
   - Sin ?t=…  → elegir hora y dejar los datos.
   - Con ?t=…  → ver la reserva: pagar, confirmación, reagendar.
   ============================================================ */
(function(){
'use strict';

// URL del web app de reservas (se pega al desplegar el Apps Script; ver appscript-reservas/LEEME.md)
var API = 'https://script.google.com/macros/s/AKfycbznoR3keSxp58PBxbEKU61qyeH74B1SWiE0AvljFKnzwW3vRvSEbawevV91WTPPIwuO/exec';
// Para pruebas locales (nunca en producción)
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){
  var apiLocal = new URLSearchParams(location.search).get('api') || window.KAIRAL_RESERVAS_URL;
  if (apiLocal) API = apiLocal;
}

var WSP = 'https://wa.me/56974843834';
var raiz = document.getElementById('rv-app');
var token = new URLSearchParams(location.search).get('t');
var timers = [];

/* ─── Ayudas ─── */
function el(tag, cls, texto){
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (texto != null) n.textContent = texto;
  return n;
}
function pon(node, hijos){ (hijos || []).forEach(function(h){ if (h) node.appendChild(typeof h === 'string' ? document.createTextNode(h) : h); }); return node; }
function limpiar(){
  timers.forEach(function(t){ clearTimeout(t); clearInterval(t); });
  timers = [];
  while (raiz.firstChild) raiz.removeChild(raiz.firstChild);
}
function dinero(n){ return '$' + Number(n).toLocaleString('es-CL'); }
function sinConexion(){ return { ok: false, error: 'red', mensaje: 'No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo, o escríbenos por WhatsApp.' }; }
function pedirGet(params){
  return fetch(API + '?' + new URLSearchParams(params)).then(function(r){ return r.json(); }).catch(sinConexion);
}
function pedirPost(cuerpo){
  return fetch(API, { method: 'POST', body: JSON.stringify(cuerpo) }).then(function(r){ return r.json(); }).catch(sinConexion);
}
function enlace(texto, href, cls, nueva){
  var a = el('a', cls, texto);
  a.href = href;
  if (nueva){ a.target = '_blank'; a.rel = 'noopener'; }
  return a;
}
// Copia al portapapeles (con respaldo para navegadores o páginas sin acceso directo) y avisa en el propio botón
function copiar(texto, boton, original, aviso){
  var listo = function(ok){
    boton.textContent = ok ? aviso : 'No se pudo copiar';
    setTimeout(function(){ boton.textContent = original; }, 1800);
  };
  var respaldo = function(){
    try {
      var t = document.createElement('textarea');
      t.value = texto; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(t); t.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(t);
      listo(ok);
    } catch(e){ listo(false); }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(function(){ listo(true); }, respaldo);
  else respaldo();
}
function foco(node){ if (node){ node.setAttribute('tabindex', '-1'); node.focus({ preventScroll: true }); } }
function arriba(){ raiz.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

/* ─── Selector de horas (lo usan reservar y reagendar) ─── */
function selectorHoras(dias, alElegir){
  var cont = el('div');
  if (!dias || !dias.length){
    cont.appendChild(el('p', 'rv-vacio', 'Por ahora no hay horas disponibles. Vuelve a revisar pronto o escríbenos por WhatsApp.'));
    return { nodo: cont, limpiar: function(){} };
  }
  var botones = [];
  dias.forEach(function(d){
    var dia = el('div', 'rv-dia');
    dia.appendChild(el('h3', null, d.texto));
    var fila = el('div', 'rv-horas');
    d.horas.forEach(function(h){
      var b = el('button', 'rv-hora', h + ' h');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', d.texto + ', ' + h + ' horas');
      b.addEventListener('click', function(){
        botones.forEach(function(x){ x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        alElegir(d.fecha + 'T' + h, d.texto + ', ' + h + ' h');
      });
      botones.push(b);
      fila.appendChild(b);
    });
    dia.appendChild(fila);
    cont.appendChild(dia);
  });
  return { nodo: cont, limpiar: function(){ botones.forEach(function(x){ x.setAttribute('aria-pressed', 'false'); }); } };
}

/* ─── Vista: reservas aún no disponibles ─── */
function vistaNoDisponible(mensaje){
  limpiar();
  var c = el('div', 'rv-card');
  c.appendChild(el('h2', 'rv-titulo', 'Las reservas en línea no están disponibles en este momento'));
  c.appendChild(el('p', 'rv-texto', mensaje || 'Escríbenos por WhatsApp y te ayudamos a agendar tu consulta.'));
  var a = el('div', 'rv-acciones');
  a.appendChild(enlace('Escribir por WhatsApp', WSP, 'btn btn-solido', true));
  c.appendChild(a);
  raiz.appendChild(c);
}

/* ─── Vista: nueva reserva ─── */
function vistaNueva(){
  limpiar();
  raiz.appendChild(el('p', 'rv-cargando', 'Buscando horas disponibles…'));
  pedirGet({ action: 'slots' }).then(function(r){
    if (!r.ok) return vistaNoDisponible(r.mensaje);
    pintarNueva(r);
  });
}

function pintarNueva(r){
  limpiar();
  var slot = null, textoSlot = '';
  var cols = el('div', 'rv-cols');
  var izq = el('div');

  // 1 · hora
  var c1 = el('section', 'rv-card');
  var t1 = el('h2', 'rv-titulo'); pon(t1, [el('span', 'n', '1'), 'Elige tu hora']);
  c1.appendChild(t1);
  var sel = selectorHoras(r.dias, function(id, texto){ slot = id; textoSlot = texto; actualizarResumen(); });
  c1.appendChild(sel.nodo);
  izq.appendChild(c1);

  // 2 · datos
  var c2 = el('section', 'rv-card');
  var t2 = el('h2', 'rv-titulo'); pon(t2, [el('span', 'n', '2'), 'Tus datos']);
  c2.appendChild(t2);
  c2.appendChild(el('p', 'rv-sub', 'Solo los necesarios para tu reserva y la boleta. Tus antecedentes de salud los completas después, en la preconsulta.'));
  var form = el('form'); form.noValidate = true;
  var campos = {};
  function campo(id, etiqueta, tipo, extra){
    var w = el('div', 'rv-campo');
    var l = el('label', null, etiqueta); l.htmlFor = 'rv-' + id;
    var i = el('input'); i.type = tipo; i.id = 'rv-' + id; i.name = id; i.required = true;
    if (extra && extra.autocomplete) i.autocomplete = extra.autocomplete;
    if (extra && extra.placeholder) i.placeholder = extra.placeholder;
    if (extra && extra.inputmode) i.inputMode = extra.inputmode;
    var err = el('span', 'error'); err.id = 'rv-err-' + id; err.hidden = true;
    i.setAttribute('aria-describedby', 'rv-err-' + id);
    w.appendChild(l); w.appendChild(i);
    if (extra && extra.ayuda) w.appendChild(el('span', 'ayuda', extra.ayuda));
    w.appendChild(err);
    campos[id] = { input: i, error: err };
    return w;
  }
  form.appendChild(campo('nombre', 'Nombre completo', 'text', { autocomplete: 'name' }));
  var fila = el('div', 'rv-2');
  fila.appendChild(campo('rut', 'RUT', 'text', { placeholder: '12.345.678-5', ayuda: 'Lo necesitamos para emitir tu boleta.' }));
  fila.appendChild(campo('telefono', 'Teléfono', 'tel', { autocomplete: 'tel', placeholder: '9 1234 5678', inputmode: 'tel' }));
  form.appendChild(fila);
  form.appendChild(campo('correo', 'Correo electrónico', 'email', { autocomplete: 'email', placeholder: 'tu@correo.cl', ayuda: 'Aquí te llegan las instrucciones y la confirmación.' }));

  // campo trampa para robots (las personas no lo ven)
  var trampa = el('div', 'rv-trampa'); trampa.setAttribute('aria-hidden', 'true');
  var ti = el('input'); ti.type = 'text'; ti.name = 'web'; ti.tabIndex = -1; ti.autocomplete = 'off';
  trampa.appendChild(ti); form.appendChild(trampa);

  var acepto = el('label', 'rv-acepto');
  var cb = el('input'); cb.type = 'checkbox'; cb.id = 'rv-acepto';
  var tx = el('span');
  pon(tx, ['Acepto las condiciones de la reserva que aparecen a la derecha, los ', enlace('Términos de uso', 'terminos.html', null, true), ' y la ', enlace('Política de privacidad', 'privacidad.html', null, true), '.']);
  acepto.appendChild(cb); acepto.appendChild(tx);
  form.appendChild(acepto);

  var errGeneral = el('p', 'rv-error'); errGeneral.hidden = true; errGeneral.setAttribute('role', 'alert');
  form.appendChild(errGeneral);
  var enviar = el('button', 'btn btn-solido rv-btn', 'Retener mi hora por 60 minutos');
  enviar.type = 'submit';
  form.appendChild(enviar);
  form.appendChild(el('p', 'rv-nota', 'Retenerla no tiene costo: tienes 60 minutos para transferir. Si no, la hora se libera sola.'));
  c2.appendChild(form);
  izq.appendChild(c2);

  // resumen
  var der = el('aside', 'rv-resumen');
  der.setAttribute('aria-label', 'Resumen de tu reserva');
  var hora = el('p', 'hora vacia', 'Aún no eliges una hora');
  pon(der, [el('p', 'eb', 'Tu reserva'), hora]);
  var l1 = el('div', 'linea'); pon(l1, [el('span', null, 'Consulta online'), el('b', null, r.duracion + ' min')]);
  var l2 = el('div', 'linea'); pon(l2, [el('span', null, 'Valor'), el('b', 'precio', dinero(r.precio))]);
  der.appendChild(l1); der.appendChild(l2);
  var ul = el('ul');
  ['Pagas por transferencia; tu hora queda retenida 60 minutos.',
   'Puedes reagendar hasta 24 horas antes, hasta 2 veces.',
   'Si no asistes, no hay reembolso; puedes reagendar una vez sin costo dentro de 5 días.',
   'Si la Dra. no puede atenderte, eliges otra hora o el reembolso.'
  ].forEach(function(t){ ul.appendChild(el('li', null, t)); });
  der.appendChild(ul);

  function actualizarResumen(){
    hora.textContent = slot ? textoSlot : 'Aún no eliges una hora';
    hora.className = slot ? 'hora' : 'hora vacia';
  }

  function limpiarErrores(){
    errGeneral.hidden = true;
    Object.keys(campos).forEach(function(k){ campos[k].error.hidden = true; campos[k].input.removeAttribute('aria-invalid'); });
  }
  function marcar(id, mensaje){
    var c = campos[id]; if (!c) return false;
    c.error.textContent = mensaje; c.error.hidden = false; c.input.setAttribute('aria-invalid', 'true');
    return true;
  }
  campos.rut.input.addEventListener('blur', function(){
    var s = campos.rut.input.value.replace(/[^0-9kK]/g, '').toUpperCase();
    if (s.length >= 8) campos.rut.input.value = s.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + s.slice(-1);
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    limpiarErrores();
    var falta = false;
    if (!slot){ errGeneral.textContent = 'Elige primero una hora.'; errGeneral.hidden = false; c1.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    Object.keys(campos).forEach(function(k){ if (!campos[k].input.value.trim()){ marcar(k, 'Este dato es necesario.'); falta = true; } });
    if (!cb.checked){ errGeneral.textContent = 'Para continuar, acepta las condiciones de la reserva.'; errGeneral.hidden = false; falta = true; }
    if (falta){ var primero = form.querySelector('[aria-invalid="true"]'); if (primero) primero.focus(); return; }

    enviar.disabled = true; enviar.textContent = 'Reteniendo tu hora…';
    pedirPost({
      action: 'crear', slot: slot, acepta: true, web: ti.value,
      nombre: campos.nombre.input.value, rut: campos.rut.input.value,
      correo: campos.correo.input.value, telefono: campos.telefono.input.value
    }).then(function(res){
      if (res.ok && res.token){
        token = res.token;
        history.replaceState(null, '', 'reservar.html?t=' + encodeURIComponent(token));
        return vistaEstado();
      }
      enviar.disabled = false; enviar.textContent = 'Retener mi hora por 60 minutos';
      if (res.ok && res.simulado) return vistaNoDisponible('No pudimos completar tu solicitud. Escríbenos por WhatsApp y te ayudamos.');
      if (res.error === 'no_disponible'){
        errGeneral.textContent = res.mensaje; errGeneral.hidden = false;
        pedirGet({ action: 'slots' }).then(function(n){ if (n.ok){ slot = null; actualizarResumen(); var nuevo = selectorHoras(n.dias, function(id, t){ slot = id; textoSlot = t; actualizarResumen(); }); c1.replaceChild(nuevo.nodo, sel.nodo); sel = nuevo; } });
        return;
      }
      if (!marcar(res.error, res.mensaje)){ errGeneral.textContent = res.mensaje || 'No pudimos retener tu hora.'; errGeneral.hidden = false; }
      var inv = form.querySelector('[aria-invalid="true"]'); if (inv) inv.focus();
    });
  });

  cols.appendChild(izq); cols.appendChild(der);
  raiz.appendChild(cols);
}

/* ─── Vista: estado de una reserva ─── */
function vistaEstado(){
  limpiar();
  raiz.appendChild(el('p', 'rv-cargando', 'Cargando tu reserva…'));
  pedirGet({ action: 'estado', t: token }).then(function(r){
    if (!r.ok){
      limpiar();
      var c = el('div', 'rv-card');
      c.appendChild(el('h2', 'rv-titulo', 'No encontramos esta reserva'));
      c.appendChild(el('p', 'rv-texto', r.mensaje || 'Revisa el enlace de tu correo.'));
      var a = el('div', 'rv-acciones');
      a.appendChild(enlace('Hacer una reserva nueva', 'reservar.html', 'btn btn-solido'));
      a.appendChild(enlace('Escribir por WhatsApp', WSP, 'btn btn-ghost', true));
      c.appendChild(a); raiz.appendChild(c);
      return;
    }
    pintarEstado(r);
  });
}

function cabecera(r, titulo, clase, chip){
  var c = el('div', 'rv-cab');
  c.appendChild(el('h2', null, titulo));
  c.appendChild(el('span', 'rv-chip ' + (clase || ''), chip));
  return c;
}

function bloqueReagendar(r){
  var c = el('section', 'rv-card');
  var t = el('h2', 'rv-titulo', r.estado === 'Confirmada' ? 'Cambiar mi hora' : 'Elige tu nueva hora');
  c.appendChild(t);
  if (!r.reagenda || !r.reagenda.puede){
    if (r.reagenda && r.reagenda.motivo) c.appendChild(el('p', 'rv-texto', r.reagenda.motivo));
    var a = el('div', 'rv-acciones');
    a.appendChild(enlace('Escribir por WhatsApp', WSP, 'btn btn-ghost', true));
    if (r.estado === 'Ausente') a.insertBefore(enlace('Reservar una hora nueva', 'reservar.html', 'btn btn-solido'), a.firstChild);
    c.appendChild(a);
    return c;
  }
  c.appendChild(el('p', 'rv-sub', r.reagenda.texto));
  var elegido = null, textoElegido = '';
  var sel = selectorHoras(r.dias, function(id, tx){ elegido = id; textoElegido = tx; boton.disabled = false; boton.textContent = 'Cambiar a ' + tx; });
  c.appendChild(sel.nodo);
  var err = el('p', 'rv-error'); err.hidden = true; err.setAttribute('role', 'alert');
  c.appendChild(err);
  var boton = el('button', 'btn btn-solido', 'Elige una hora');
  boton.type = 'button'; boton.disabled = true; boton.className = 'btn btn-solido rv-btn';
  boton.addEventListener('click', function(){
    if (!elegido) return;
    if (!window.confirm('¿Cambiar tu consulta a ' + textoElegido + '?')) return;
    boton.disabled = true; boton.textContent = 'Cambiando tu hora…'; err.hidden = true;
    pedirPost({ action: 'reagendar', t: token, slot: elegido }).then(function(res){
      if (res.ok) { vistaEstado(); arriba(); return; }
      err.textContent = res.mensaje || 'No pudimos cambiar tu hora.'; err.hidden = false;
      boton.disabled = false; boton.textContent = 'Cambiar a ' + textoElegido;
      if (res.error === 'no_disponible') vistaEstado();
    });
  });
  c.appendChild(boton);
  return c;
}

// Mensaje listo para enviar a la Dra. con el código de la reserva
function wspComprobante(r){
  return WSP + '?text=' + encodeURIComponent('Hola, hice la transferencia de mi reserva ' + r.codigo + ' (' + r.fechaTexto + '). Te envío mi comprobante.');
}

function pintarEstado(r){
  limpiar();
  var estado = r.estado;
  var caja = el('div');
  var card = el('section', 'rv-card');
  var reloj = Date.now() - r.ahoraMs;           // diferencia entre el reloj de esta persona y el del servidor

  if (estado === 'Retenida'){
    card.appendChild(cabecera(r, 'Tu hora está retenida', 'espera', 'Falta tu transferencia'));
    card.appendChild(el('p', 'rv-fecha', r.fechaTexto));
    var cuenta = el('div', 'rv-cuenta');
    var tiempo = el('span', 't', '--:--'); tiempo.setAttribute('role', 'timer');
    pon(cuenta, [tiempo, el('span', 'l', 'para transferir y avisarnos')]);
    card.appendChild(cuenta);

    var b = r.banco || {};
    var soloAlfanum = function(v){ return String(v == null ? '' : v).replace(/[^0-9A-Za-z]/g, ''); };
    var rutPlano = soloAlfanum(b.rut);
    var rutConGuion = rutPlano.length > 1 ? rutPlano.slice(0, -1) + '-' + rutPlano.slice(-1) : rutPlano;

    // Todos los datos juntos: muchos bancos detectan este texto en el portapapeles y llenan la transferencia solos
    var todo = [
      'Nombre: ' + b.titular, 'RUT: ' + rutConGuion, 'Banco: ' + b.banco, 'Tipo de cuenta: ' + b.tipo,
      'N° de cuenta: ' + soloAlfanum(b.cuenta), b.correo ? 'Correo: ' + b.correo : null,
      'Monto: ' + r.precio, 'Comentario: ' + r.codigo
    ].filter(Boolean).join('\n');
    var copiarTodo = el('button', 'btn btn-solido rv-copiar-todo', 'Copiar todos los datos'); copiarTodo.type = 'button';
    copiarTodo.addEventListener('click', function(){ copiar(todo, copiarTodo, 'Copiar todos los datos', '¡Datos copiados!'); });
    var filaCopiar = el('div', 'rv-acciones');
    filaCopiar.appendChild(copiarTodo);
    filaCopiar.appendChild(el('span', 'rv-nota', 'Si tu banco detecta lo copiado, te ofrecerá llenar la transferencia solo. También puedes copiar cada dato por separado.'));
    card.appendChild(filaCopiar);

    // [etiqueta, texto que se ve, texto que se copia, destacado]
    var tabla = el('table', 'rv-banco');
    [
      ['Titular', b.titular, b.titular],
      ['RUT', b.rut, rutPlano],
      ['Banco', b.banco, b.banco],
      ['Tipo de cuenta', b.tipo, b.tipo],
      ['N° de cuenta', b.cuenta, soloAlfanum(b.cuenta)],
      ['Monto', dinero(r.precio), String(r.precio)],
      ['Comentario', r.codigo, r.codigo, true]
    ].forEach(function(f){
      var tr = el('tr', f[3] ? 'destacado' : null);
      var td = el('td', null, f[1]);
      var bt = el('button', 'copiar', 'Copiar'); bt.type = 'button';
      bt.setAttribute('aria-label', 'Copiar ' + f[0]);
      bt.addEventListener('click', function(){ copiar(f[2], bt, 'Copiar', '¡Copiado!'); });
      td.appendChild(bt);
      pon(tr, [el('td', null, f[0]), td]);
      tabla.appendChild(tr);
    });
    card.appendChild(tabla);

    var ol = el('ol', 'rv-pasos');
    ['Haz la transferencia por ' + dinero(r.precio) + ' con tu banco.', 'Escribe el código ' + r.codigo + ' en el comentario.', 'Vuelve aquí y presiona «Ya transferí». La Dra. revisará el pago y te confirmará por correo.'].forEach(function(t){ ol.appendChild(el('li', null, t)); });
    card.appendChild(ol);

    var err = el('p', 'rv-error'); err.hidden = true; err.setAttribute('role', 'alert'); card.appendChild(err);
    var acc = el('div', 'rv-acciones');
    var ya = el('button', 'btn btn-solido', 'Ya transferí'); ya.type = 'button';
    ya.addEventListener('click', function(){
      if (!window.confirm('Presiona «Aceptar» solo si ya hiciste la transferencia. ¿La hiciste?')) return;
      ya.disabled = true; ya.textContent = 'Avisando…'; err.hidden = true;
      pedirPost({ action: 'informar', t: token }).then(function(res){
        if (res.ok) { vistaEstado(); arriba(); return; }
        err.textContent = res.mensaje || 'No pudimos registrar tu aviso.'; err.hidden = false;
        ya.disabled = false; ya.textContent = 'Ya transferí';
        if (res.error === 'vencida') vistaEstado();
      });
    });
    acc.appendChild(ya);
    acc.appendChild(enlace('Enviar comprobante por WhatsApp', wspComprobante(r), 'btn btn-ghost', true));
    card.appendChild(acc);
    card.appendChild(el('p', 'rv-nota', 'Envía tu comprobante a ' + (b.correo || 'dra.yusneily@kairal.cl') + ' o por WhatsApp. Te enviamos estas mismas instrucciones a tu correo.'));

    var pintar = function(){
      var resta = Math.max(0, Math.round((r.retencionMs - (Date.now() - reloj)) / 1000));
      tiempo.textContent = Math.floor(resta / 60) + ':' + ('0' + (resta % 60)).slice(-2);
      tiempo.className = 't' + (resta < 300 ? ' poco' : '');
      if (resta === 0){ vistaEstado(); }
    };
    pintar();
    timers.push(setInterval(pintar, 1000));

  } else if (estado === 'Pago informado'){
    card.appendChild(cabecera(r, 'Estamos revisando tu pago', 'espera', 'Pago informado'));
    card.appendChild(el('p', 'rv-fecha', r.fechaTexto));
    var p1 = el('p', 'rv-texto'); pon(p1, [el('span', 'rv-pulso'), 'La Dra. está verificando tu transferencia. Te escribiremos al correo apenas quede confirmada, normalmente el mismo día. Tu hora sigue reservada.']);
    card.appendChild(p1);
    card.appendChild(el('p', 'rv-nota', 'Puedes cerrar esta página: esta pantalla se actualiza sola mientras esté abierta. Código de reserva: ' + r.codigo + '.'));
    var a2 = el('div', 'rv-acciones'); a2.appendChild(enlace('Enviar comprobante por WhatsApp', wspComprobante(r), 'btn btn-ghost', true)); card.appendChild(a2);
    timers.push(setInterval(function(){
      pedirGet({ action: 'estado', t: token }).then(function(n){ if (n.ok && n.estado !== 'Pago informado') vistaEstado(); });
    }, 20000));

  } else if (estado === 'Confirmada'){
    card.appendChild(cabecera(r, 'Tu consulta está confirmada', '', 'Confirmada'));
    card.appendChild(el('p', 'rv-fecha', r.fechaTexto));
    card.appendChild(el('p', 'rv-texto', 'Consulta online con la Dra. Yusneily Sánchez, de ' + '50 minutos. Te enviamos la confirmación a tu correo, con recordatorios 24 horas y 2 horas antes.'));
    var a3 = el('div', 'rv-acciones');
    if (r.meet) a3.appendChild(enlace('Entrar a la videollamada', r.meet, 'btn btn-solido', true));
    a3.appendChild(enlace('Completar mi preconsulta', 'consulta-previa-ks24.html', 'btn btn-reserva'));
    card.appendChild(a3);
    card.appendChild(el('p', 'rv-nota', 'La preconsulta nos ayuda a aprovechar tu tiempo: complétala antes de tu hora.'));

  } else if (estado === 'Ausente' || estado === 'Dra. ausente'){
    card.appendChild(cabecera(r, estado === 'Ausente' ? 'No pudimos atenderte' : 'Debemos reprogramar tu consulta', 'neutro', estado));
    card.appendChild(el('p', 'rv-fecha', r.fechaTexto));
    card.appendChild(el('p', 'rv-texto', estado === 'Ausente' ? 'Esperamos que estés bien.' : 'Lamentamos el cambio. Puedes elegir otra hora sin costo, o pedir el reembolso respondiendo el correo que te enviamos.'));

  } else if (estado === 'Expirada' || estado === 'Rechazada'){
    card.appendChild(cabecera(r, estado === 'Expirada' ? 'Tu hora ya no está retenida' : 'No encontramos tu pago', 'mal', estado));
    card.appendChild(el('p', 'rv-texto', estado === 'Expirada'
      ? 'Pasó el tiempo de retención y no recibimos tu aviso de pago. Si ya transferiste, escríbenos por WhatsApp con tu comprobante y lo resolvemos; si no, puedes reservar nuevamente.'
      : 'No pudimos ver tu transferencia, así que la hora quedó libre. Si ya pagaste, escríbenos por WhatsApp con tu comprobante y lo resolvemos de inmediato.'));
    var a4 = el('div', 'rv-acciones');
    a4.appendChild(enlace('Reservar de nuevo', 'reservar.html', 'btn btn-solido'));
    a4.appendChild(enlace('Escribir por WhatsApp', WSP, 'btn btn-ghost', true));
    card.appendChild(a4);

  } else {
    card.appendChild(cabecera(r, estado === 'Realizada' ? 'Gracias por tu consulta' : 'Tu reserva', 'neutro', estado));
    card.appendChild(el('p', 'rv-fecha', r.fechaTexto));
    card.appendChild(el('p', 'rv-texto', 'Si necesitas algo más, escríbenos por WhatsApp.'));
    var a5 = el('div', 'rv-acciones');
    a5.appendChild(enlace('Escribir por WhatsApp', WSP, 'btn btn-ghost', true));
    a5.appendChild(enlace('Reservar otra hora', 'reservar.html', 'btn btn-solido'));
    card.appendChild(a5);
  }

  caja.appendChild(card);
  if ((estado === 'Confirmada' || estado === 'Ausente' || estado === 'Dra. ausente')) caja.appendChild(bloqueReagendar(r));
  if (estado === 'Confirmada'){
    var pol = el('section', 'rv-card');
    pol.appendChild(el('h2', 'rv-titulo', 'Condiciones de tu reserva'));
    var ul = el('ul', 'rv-pasos');
    ['Puedes reagendar hasta 24 horas antes de tu hora, hasta 2 veces.',
     'Si no asistes, la reserva no se reembolsa; puedes reagendar una vez sin costo dentro de 5 días.',
     'Si la Dra. no puede atenderte, puedes elegir otra hora o pedir el reembolso.'
    ].forEach(function(t){ ul.appendChild(el('li', null, t)); });
    pol.appendChild(ul);
    caja.appendChild(pol);
  }
  raiz.appendChild(caja);
  foco(caja.querySelector('h2'));
}

/* ─── Arranque ─── */
if (API === 'PENDIENTE') vistaNoDisponible();
else if (token) vistaEstado();
else vistaNueva();

})();
