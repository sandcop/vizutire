/* Guías descargables: para bajar el PDF hay que dejar el correo.
   Al enviar, el contacto se guarda en la misma lista de Brevo que usa el resto del sitio
   (función /.netlify/functions/subscribe, con el nombre de la guía en RECURSO_DESCARGADO)
   y recién entonces parte la descarga. Quien ya dejó su correo en este navegador descarga
   directo. */
(function(){
'use strict';

var botones = document.querySelectorAll('[data-recurso]');
var modal = document.getElementById('rec-modal');
if (!botones.length || !modal) return;

var form = document.getElementById('rec-form');
var titulo = document.getElementById('rec-modal-titulo');
var inputEmail = document.getElementById('rec-email');
var inputNombre = document.getElementById('rec-nombre');
var consent = document.getElementById('rec-consent');
var errorEl = document.getElementById('rec-error');
var enviar = document.getElementById('rec-enviar');
var aviso = document.getElementById('rec-aviso');
var STORE = 'kairal_recursos_correo';

var actual = null;       // el botón de la guía elegida
var ultimoFoco = null;
var avisoT = 0;

function yaDejoCorreo(){ try { return localStorage.getItem(STORE) === '1'; } catch(e) { return false; } }
function recordar(){ try { localStorage.setItem(STORE, '1'); } catch(e) {} }

function descargar(archivo){
  var a = document.createElement('a');
  a.href = archivo;
  a.download = archivo.split('/').pop();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function mostrarAviso(texto){
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(avisoT);
  avisoT = setTimeout(function(){ aviso.hidden = true; }, 5000);
}

function abrir(btn){
  actual = btn;
  ultimoFoco = btn;
  titulo.textContent = btn.getAttribute('data-titulo');
  errorEl.hidden = true;
  inputEmail.classList.remove('err');
  enviar.disabled = false;
  enviar.textContent = 'Descargar guía';
  modal.classList.add('abierto');
  modal.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('modal-abierto');
  setTimeout(function(){ inputEmail.focus(); }, 80);
}

function cerrar(){
  modal.classList.remove('abierto');
  modal.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('modal-abierto');
  if (ultimoFoco) ultimoFoco.focus({ preventScroll: true });
}

botones.forEach(function(btn){
  btn.addEventListener('click', function(){
    if (yaDejoCorreo()){
      descargar(btn.getAttribute('data-archivo'));
      mostrarAviso('Tu descarga comenzó. ¡Gracias por estar aquí!');
    } else {
      abrir(btn);
    }
  });
});

document.getElementById('rec-modal-cerrar').addEventListener('click', cerrar);
modal.addEventListener('click', function(e){ if (e.target === modal) cerrar(); });
document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && modal.classList.contains('abierto')) cerrar(); });

// el foco se queda dentro de la ventana mientras está abierta
modal.addEventListener('keydown', function(e){
  if (e.key !== 'Tab') return;
  var f = modal.querySelectorAll('button, input, a[href]');
  var primero = f[0], ultimo = f[f.length - 1];
  if (e.shiftKey && document.activeElement === primero){ e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo){ e.preventDefault(); primero.focus(); }
});

function error(msg, campo){
  errorEl.textContent = msg;
  errorEl.hidden = false;
  if (campo){ campo.classList.add('err'); campo.focus(); }
}

form.addEventListener('submit', function(e){
  e.preventDefault();
  errorEl.hidden = true;
  inputEmail.classList.remove('err');
  var correo = inputEmail.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return error('Revisa tu correo: parece incompleto.', inputEmail);
  if (!consent.checked) return error('Marca la casilla para poder enviarte la guía.', null);

  var nombre = inputNombre.value.trim().replace(/\s+/g, ' ');
  var partes = nombre.split(' ');
  var btn = actual;
  enviar.disabled = true;
  enviar.textContent = 'Preparando tu descarga…';

  function listo(){
    recordar();
    descargar(btn.getAttribute('data-archivo'));
    form.reset();
    cerrar();
    mostrarAviso('Tu descarga comenzó. Te sumamos a la lista de Kairal: puedes darte de baja desde cualquier correo.');
  }

  // Si el servicio de correo no responde la persona igual recibe su guía; el envío
  // nunca debe dejarla sin descarga.
  fetch('/.netlify/functions/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: correo,
      firstName: (partes[0] || '').slice(0, 100),
      lastName: partes.slice(1).join(' ').slice(0, 100),
      recurso: btn.getAttribute('data-titulo')
    })
  }).then(listo, listo);
});
})();
