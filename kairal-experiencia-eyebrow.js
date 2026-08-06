/* ============================================================
   14 · EYEBROW DEL HERO — se deshace en polvo con el viento
   "Medicina funcional" y "Antofagasta" se turnan en el mismo lugar:
   una se forma letra a letra, se lee, se deshace en polvo, y recién
   entonces empieza a formarse la otra ahí mismo. Desactivado con
   reduced motion.
============================================================ */
(function(){
  // Chequeo propio e independiente: el script principal envuelve todo en su
  // propia IIFE, así que su variable `reduced` no es accesible desde aquí.
  var reduced = !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  var el = document.getElementById('eyebrow-hero');
  if (!el) return;

  var FRASES = ['Medicina funcional', 'Antofagasta'];

  el.textContent = '';
  var wrap = document.createElement('span');
  wrap.style.position = 'relative';
  wrap.style.display = 'inline-block';
  el.appendChild(wrap);

  function construirFrase(texto){
    var cont = document.createElement('span');
    cont.className = 'frase';
    var letras = [];
    texto.split('').forEach(function(ch){
      if (ch === ' '){ cont.appendChild(document.createTextNode(' ')); return; }
      var s = document.createElement('span');
      s.className = 'letra polvo';
      s.textContent = ch;

      // Dos posiciones de polvo por letra: una a la derecha (hacia donde
      // se va cuando se dispersa) y otra a la izquierda (de donde viene
      // cuando se forma) — la brisa siempre sopla de izquierda a derecha,
      // así que la letra entra desde donde sopla el viento y se la lleva
      // hacia el mismo lado por el que sigue soplando.
      var dxOut = 14 + Math.random() * 26;
      var dyOut = -(4 + Math.random() * 16);
      var drOut = Math.random() * 24 - 12;
      var dxIn = -(14 + Math.random() * 26);
      var dyIn = -(4 + Math.random() * 16);
      var drIn = Math.random() * 24 - 12;
      s.dataset.dxOut = dxOut.toFixed(1) + 'px';
      s.dataset.dyOut = dyOut.toFixed(1) + 'px';
      s.dataset.drOut = drOut.toFixed(1) + 'deg';
      s.dataset.dxIn = dxIn.toFixed(1) + 'px';
      s.dataset.dyIn = dyIn.toFixed(1) + 'px';
      s.dataset.drIn = drIn.toFixed(1) + 'deg';
      // Arranca posicionada a la izquierda, lista para su primera entrada.
      s.style.setProperty('--dx', s.dataset.dxIn);
      s.style.setProperty('--dy', s.dataset.dyIn);
      s.style.setProperty('--dr', s.dataset.drIn);
      s.style.transitionDelay = (Math.random() * 0.3).toFixed(2) + 's';

      // 3 motas de polvo por letra: vuelan más lejos y más rápido que la
      // propia letra, siempre hacia la derecha (igual que dxOut/dyOut),
      // para que se lea como polvo de verdad y no solo como un desenfoque.
      // Solo acompañan la salida, no la entrada.
      for (var i = 0; i < 3; i++){
        var mota = document.createElement('span');
        mota.className = 'mota';
        var mx = dxOut + 24 + Math.random() * 40;
        var my = dyOut - Math.random() * 22;
        mota.style.setProperty('--mx', mx.toFixed(1) + 'px');
        mota.style.setProperty('--my', my.toFixed(1) + 'px');
        mota.style.animationDelay = (Math.random() * 0.25).toFixed(2) + 's';
        s.appendChild(mota);
      }

      cont.appendChild(s);
      letras.push(s);
    });
    return { el: cont, letras: letras };
  }

  var frases = FRASES.map(construirFrase);
  frases.forEach(function(f){ wrap.appendChild(f.el); });

  // Las frases quedan en position:absolute para superponerse en el mismo
  // lugar, así que no le dan tamaño a `wrap` por sí solas — se mide el
  // ancho/alto natural de cada una (todavía en flujo normal) y se reserva
  // el máximo antes de sacarlas del flujo.
  var ancho = 0, alto = 0;
  frases.forEach(function(f){
    ancho = Math.max(ancho, f.el.offsetWidth);
    alto = Math.max(alto, f.el.offsetHeight);
  });
  wrap.style.width = ancho + 'px';
  wrap.style.height = alto + 'px';
  frases.forEach(function(f){
    f.el.style.position = 'absolute';
    f.el.style.left = '0';
    f.el.style.top = '0';
  });

  function disperse(frase){
    frase.letras.forEach(function(s){
      // Reposiciona a la derecha justo antes de dispersarse: el viento se
      // la lleva por donde sopla.
      s.style.setProperty('--dx', s.dataset.dxOut);
      s.style.setProperty('--dy', s.dataset.dyOut);
      s.style.setProperty('--dr', s.dataset.drOut);
      // Como las letras se crean con .polvo ya puesto (para que la frase que
      // espera su turno arranque invisible), la animación de sus motas ya se
      // "gastó" una vez apenas se montaron en el DOM. Se resetea a mano para
      // que el polvo sí se vea cada vez que la frase realmente se dispersa.
      var motas = s.querySelectorAll('.mota');
      motas.forEach(function(m){ m.style.animation = 'none'; });
      void s.offsetWidth;
      motas.forEach(function(m){ m.style.animation = ''; });
      s.classList.add('polvo');
    });
  }
  function formar(frase){
    frase.letras.forEach(function(s){
      // Antes de revelarse, se reubica a la izquierda sin transición
      // (sigue invisible) para que la entrada siempre venga desde ahí, sin
      // importar hacia dónde se dispersó la última vez.
      s.style.transition = 'none';
      s.style.setProperty('--dx', s.dataset.dxIn);
      s.style.setProperty('--dy', s.dataset.dyIn);
      s.style.setProperty('--dr', s.dataset.drIn);
      void s.offsetWidth;
      s.style.transition = '';
      s.classList.remove('polvo');
    });
  }

  var TIEMPO_FORMAR = 1300;   // lo que tarda una frase en terminar de formarse
  var TIEMPO_LECTURA = 3400;  // tiempo estático y legible con la frase ya formada

  // "Antofagasta" empieza a formarse en el mismo instante en que "Medicina
  // funcional" empieza a dispersarse (y viceversa) — no se espera a que una
  // termine de irse para que la otra aparezca.
  formar(frases[0]);
  var actual = frases[0];
  (function tick(){
    setTimeout(function(){
      var siguiente = (actual === frases[0]) ? frases[1] : frases[0];
      disperse(actual);
      formar(siguiente);
      actual = siguiente;
      tick();
    }, TIEMPO_FORMAR + TIEMPO_LECTURA);
  })();
})();
