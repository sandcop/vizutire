/* ══════════════════════════════════════════════
   VIZUtire — script.js
   Animations · i18n · canvas · counters
   ══════════════════════════════════════════════ */

/* ── i18n ── */
const T = {
  es: {
    'nav.sistema':'Sistema','nav.resultados':'Resultados',
    'nav.testimonios':'Clientes','nav.faq':'FAQ',
    'nav.pricing':'Planes','nav.cta':'Evaluación Técnica','ft.contact':'Contacto',
    'hero.label':'Diagnóstico Estructural · OTR Mining',
    'hero.h1a':'Diagnóstico predictivo',
    'hero.h1b':'de fallas estructurales',
    'hero.h1c':'en neumáticos OTR.',
    'hero.desc':'Identificamos daños internos antes del evento crítico. Modelo físico-matemático de 150+ variables validado en Gran Minería Mundial. Entrega en 48 horas.',
    'hero.cta':'Solicitar evaluación técnica','hero.ctag':'Ver sistema →',
    'hero.s1':'Variables operacionales','hero.s2':'Vida útil adicional','hero.s3':'Tiempo de diagnóstico',
    'hero.trust':'Validado en',
    'sis.label':'SISTEMA DE DIAGNÓSTICO OPERACIONAL',
    'sis.h2a':'Evento crítico','sis.h2b':'falla visible.',
    'sis.sub':'Captura y análisis de fallas estructurales en tiempo real. Cuatro etapas con modelo físico-matemático propio.',
    'sis.sb1l':'ESTADO','sis.sb1v':'OPERATIVO','sis.sb2l':'PROTOCOLO','sis.sb2v':'ACTIVO','sis.sb3l':'MODO','sis.sb3v':'DIAGNÓSTICO',
    'sis.sbr':'VIZUtire v2.4 · OTR STRUCTURAL ENGINE',
    'sis.n1.t':'CAPTURA','sis.n1.d':'Ultrasonido in situ. Señales capturan el estado interno de cada capa estructural del neumático en campo.','sis.n1.g':'2.4 MHz · No invasivo',
    'sis.n2.t':'MODELADO','sis.n2.d':'Modelo físico-matemático propio. +150 variables operacionales: presión, temperatura, carga, velocidad.','sis.n2.g':'150+ variables · Validado',
    'sis.n3.t':'DIAGNÓSTICO','sis.n3.d':'Fallas internas invisibles identificadas. Riesgo de reventón evaluado por unidad con nivel de criticidad.','sis.n3.g':'Riesgo por unidad · Criticidad',
    'sis.n4.t':'ACCIÓN','sis.n4.d':'Recomendación prescriptiva priorizada por criticidad. Diagnóstico entregado en menos de 48 horas.','sis.n4.g':'Prescriptivo · 48h',
    'prob.badge':'Falla estructural no detectada',
    'prob.title':'El riesgo no siempre<br>es visible.',
    'prob.desc':'El 80% de las fallas estructurales en neumáticos OTR son internas e indetectables visualmente. El reventón es el resultado — no el inicio del problema.',
    'prob.s1':'Fallas de origen interno','prob.s2':'Costo por evento — USD',
    'prob.f1t':'Fallas internas no detectadas','prob.f1d':'Separación de capas, cortes de carcasa, daño en cinturones: invisibles a inspección visual y métodos convencionales.',
    'prob.f2t':'Eventos de alta energía','prob.f2d':'Reventones bajo alta carga, temperatura y esfuerzo mecánico. Daño a equipos de alto valor y riesgo para operadores.',
    'prob.f3t':'Pérdida de continuidad operacional','prob.f3d':'Paradas no programadas que impactan disponibilidad de flota. Costo total de propiedad fuera de control.',
    'prob.f4t':'Métodos actuales insuficientes','prob.f4d':'Inspección visual, presión y temperatura: datos superficiales que no capturan el estado estructural interno.',
    'res.label':'Impacto operacional — Datos verificados','res.title':'Resultados en operación real.',
    'res.m1l':'VIDA ÚTIL','res.m1d':'Extensión de vida útil adicional por neumático OTR con diagnóstico preventivo continuo.','res.m1s':'Validado en operación',
    'res.m2l':'EVENTOS CRÍTICOS','res.m2v':'OBJETIVO: 0','res.m2d':'Objetivo operacional de reventones no planificados en flota monitoreada por VIZUtire.','res.m2s':'Meta alcanzable',
    'res.m3l':'REDUCCIÓN COSTOS','res.m3d':'Reducción en costos de reemplazo no planificado de neumáticos en operaciones monitoreadas.','res.m3s':'ROI positivo < 6 meses',
    'val.label':'Evidencia — Operación real','val.title':'Validado en condiciones<br>extremas.',
    'val.badge':'VALIDADO EN OPERACIÓN 24/7','val.h2':'Gran Minería.<br>Rajo abierto.<br>Alta exigencia.',
    'val.desc':'Tecnología probada en flotas de camiones CAEX de 400 toneladas bajo operación continua en condiciones extremas.',
    'val.c1':'Alta efectividad en detección estructural temprana','val.c2':'Operaciones de clase mundial — Norte de Chile',
    'val.c3':'Flotas CAEX de 400 ton bajo operación continua','val.c4':'Condiciones extremas: temperatura, carga y terreno','val.c5':'Reducción comprobada de costos operacionales',
    'tes.label':'Validación — Operadores reales','tes.title':'Resultados que hablan<br>por sí mismos.',
    'tes.q1':'Identificamos 3 neumáticos con falla estructural crítica antes de cualquier síntoma visible. Evitamos dos paradas no planificadas y el costo asociado en cadena.',
    'tes.a1':'Jefe de Mantenimiento','tes.r1':'Operación Rajo Abierto · Norte de Chile','tes.m1':'críticos detectados',
    'tes.q2':'El reporte en 48 horas nos permite actuar antes del turno siguiente. Es el único sistema que nos da certeza sobre el estado estructural interno sin detener la operación.',
    'tes.a2':'Superintendente de Neumáticos','tes.r2':'Flota CAEX 400t · Gran Minería','tes.m2':'diagnóstico',
    'tes.q3':'Redujimos los costos de reemplazo no planificado en un 35% en los primeros 6 meses. El ROI fue evidente desde el segundo mes de implementación.',
    'tes.a3':'Gerente de Operaciones','tes.r3':'Operación Minera · Antofagasta','tes.m3':'costos reemplazo',
    'pri.label':'Planes de servicio — Seleccione su nivel','pri.title':'Desde la evaluación inicial<br>hasta integración OEM.',
    'pri.t1':'Evaluación','pri.h1':'Diagnóstico por Neumático','pri.d1':'Evaluación estructural por unidad. Ideal para pruebas piloto o inspecciones puntuales en flota existente.','pri.tag1':'Pago por unidad',
    'pri.f1a':'Inspección ultrasónica in situ','pri.f1b':'Diagnóstico por unidad inspeccionada','pri.f1c':'Reporte estructural entregado en 48h','pri.f1d':'Recomendación de acción por neumático','pri.b1':'Solicitar cotización',
    'pri.t2':'Operacional','pri.h2':'Monitoreo de Flota','pri.d2':'Monitoreo continuo de toda la flota OTR. Ciclos periódicos de inspección con dashboard de estado por unidad.','pri.tag2':'Suscripción mensual',
    'pri.f2a':'Cobertura total de flota OTR','pri.f2b':'Ciclos de inspección programados','pri.f2c':'Dashboard de riesgo por unidad','pri.f2d':'Alertas tempranas y priorización','pri.f2e':'Soporte técnico dedicado','pri.b2':'Contactar equipo',
    'pri.t3':'Enterprise','pri.h3':'Integración OEM / API','pri.d3':'Integración del modelo VIZUtire en sistemas del fabricante o plataformas de gestión de activos. Para OEM y operaciones tier-1.','pri.tag3':'Proyecto a medida',
    'pri.f3a':'Integración API con sistemas propios','pri.f3b':'Licenciamiento del modelo FM','pri.f3c':'Co-desarrollo técnico con fabricante','pri.f3d':'SLA garantizado y equipo dedicado','pri.b3':'Hablar con ventas',
    'faq.label':'FAQ','faq.title':'Preguntas frecuentes',
    'faq.sub':'¿Cómo funciona el sistema? ¿Qué tan rápido es el diagnóstico? Respuestas directas para equipos técnicos y de gestión.',
    'faq.cta':'Consulta técnica →',
    'faq.q1':'¿Cómo funciona el diagnóstico in situ?','faq.a1':'Utilizamos ultrasonido de alta frecuencia (2.4 MHz) aplicado directamente sobre el neumático montado. El proceso no requiere desmontaje ni interrupción de operaciones. Las señales capturan el estado interno de cada capa estructural y son procesadas por nuestro modelo físico-matemático en tiempo real.',
    'faq.q2':'¿Qué tipo de neumáticos OTR son compatibles?','faq.a2':'VIZUtire es compatible con neumáticos OTR de gran minería desde 49" a 63", incluyendo los utilizados en camiones CAEX de 220 a 400+ toneladas (Caterpillar 793/795, Komatsu 830/930, Liebherr T282). El modelo ha sido validado en operaciones del norte de Chile.',
    'faq.q3':'¿Cuánto tiempo tarda el proceso completo?','faq.a3':'La captura in situ por neumático demora entre 20 y 40 minutos. El diagnóstico completo con reporte de criticidad se entrega en menos de 48 horas desde la inspección. Para flotas completas, coordinamos ciclos de inspección programados que minimizan el impacto en la disponibilidad de equipos.',
    'faq.q4':'¿Es necesario detener la operación?','faq.a4':'No. El diagnóstico se realiza con el equipo en zona de mantenimiento durante ventanas de servicio programadas, sin impacto en la continuidad operacional. El proceso es no destructivo e in situ: el neumático no requiere ser removido del vehículo.',
    'faq.q5':'¿Cómo se integra con nuestros sistemas de gestión?','faq.a5':'Los reportes se entregan en formato digital estructurado (PDF + datos) compatible con los principales sistemas CMMS. El plan Enterprise incluye integración API directa con plataformas de gestión de activos. También ofrecemos dashboard operacional propio para seguimiento continuo del estado de flota.',
    'cta.eyebrow':'Diagnóstico OTR · Antofagasta, Chile',
    'cta.h1':'Reduce el riesgo estructural','cta.h2':'antes del evento.',
    'cta.desc':'Solicite una evaluación técnica para su flota OTR. Nuestro equipo analiza su operación y entrega diagnóstico en 48 horas.',
    'cta.b1':'Solicitar evaluación técnica','cta.b2':'Ver sistema completo',
    'cta.sub':'Antofagasta, Chile · vizutire.com · contacto@vizutire.com',
  },
  en: {
    'nav.sistema':'System','nav.resultados':'Results','nav.testimonios':'Clients','nav.faq':'FAQ',
    'nav.pricing':'Plans','nav.cta':'Technical Assessment','ft.contact':'Contact',
    'hero.label':'Structural Diagnostics · OTR Mining',
    'hero.h1a':'Predictive diagnostics','hero.h1b':'for structural failures','hero.h1c':'in OTR tires.',
    'hero.desc':'We identify internal damage before the critical event. Physico-mathematical model with 150+ variables. Validated in World-Class Mining. Delivered in 48 hours.',
    'hero.cta':'Request technical assessment','hero.ctag':'See system →',
    'hero.s1':'Operational variables','hero.s2':'Additional service life','hero.s3':'Diagnosis turnaround',
    'hero.trust':'Validated in',
    'sis.label':'OPERATIONAL DIAGNOSTIC SYSTEM',
    'sis.h2a':'Critical event','sis.h2b':'visible failure.',
    'sis.sub':'Real-time structural failure capture and analysis. Four-stage process with proprietary physico-mathematical model.',
    'sis.sb1l':'STATUS','sis.sb1v':'OPERATIONAL','sis.sb2l':'PROTOCOL','sis.sb2v':'ACTIVE','sis.sb3l':'MODE','sis.sb3v':'DIAGNOSTIC',
    'sis.sbr':'VIZUtire v2.4 · OTR STRUCTURAL ENGINE',
    'sis.n1.t':'CAPTURE','sis.n1.d':'In-situ ultrasound. Signals capture the internal state of each structural layer of the tire in the field.','sis.n1.g':'2.4 MHz · Non-invasive',
    'sis.n2.t':'MODELING','sis.n2.d':'Proprietary physico-mathematical model. 150+ operational variables: pressure, temperature, load, speed.','sis.n2.g':'150+ variables · Validated',
    'sis.n3.t':'DIAGNOSIS','sis.n3.d':'Invisible internal failures identified. Blowout risk evaluated per unit with criticality level.','sis.n3.g':'Per-unit risk · Criticality',
    'sis.n4.t':'ACTION','sis.n4.d':'Prescriptive recommendation prioritized by criticality. Diagnosis delivered in under 48 hours.','sis.n4.g':'Prescriptive · 48h',
    'prob.badge':'Undetected structural failure',
    'prob.title':'The risk is not always<br>visible.',
    'prob.desc':'80% of structural failures in OTR tires are internal and visually undetectable. The blowout is the result — not the start of the problem.',
    'prob.s1':'Internally originated failures','prob.s2':'Cost per event — USD',
    'prob.f1t':'Undetected internal failures','prob.f1d':'Layer separation, carcass cuts, belt damage: invisible to visual inspection and conventional methods.',
    'prob.f2t':'High-energy events','prob.f2d':'Blowouts under high load, temperature and mechanical stress. Damage to high-value equipment and risk to operators.',
    'prob.f3t':'Loss of operational continuity','prob.f3d':'Unplanned stoppages impacting fleet availability. Total cost of ownership out of control.',
    'prob.f4t':'Current methods insufficient','prob.f4d':'Visual inspection, pressure and temperature: surface data that does not capture internal structural condition.',
    'res.label':'Operational impact — Verified data','res.title':'Results in real operation.',
    'res.m1l':'SERVICE LIFE','res.m1d':'Additional service life extension per OTR tire with continuous preventive diagnostics.','res.m1s':'Validated in operation',
    'res.m2l':'CRITICAL EVENTS','res.m2v':'TARGET: 0','res.m2d':'Operational target of unplanned blowouts in fleet monitored by VIZUtire.','res.m2s':'Achievable target',
    'res.m3l':'COST REDUCTION','res.m3d':'Reduction in unplanned tire replacement costs in monitored operations.','res.m3s':'Positive ROI < 6 months',
    'val.label':'Evidence — Real operation','val.title':'Validated under<br>extreme conditions.',
    'val.badge':'VALIDATED IN 24/7 OPERATION','val.h2':'World-Class Mining.<br>Open pit.<br>High demand.',
    'val.desc':'Technology proven in 400-ton CAEX truck fleets under continuous operation in extreme conditions.',
    'val.c1':'High effectiveness in early structural detection','val.c2':'World-class operations — Northern Chile',
    'val.c3':'400-ton CAEX fleets under continuous operation','val.c4':'Extreme conditions: temperature, load and terrain','val.c5':'Proven reduction of operational costs',
    'tes.label':'Validation — Real operators','tes.title':'Results that speak<br>for themselves.',
    'tes.q1':'We identified 3 tires with critical structural failure before any visible symptom. We avoided two unplanned shutdowns and the associated cascading costs.',
    'tes.a1':'Maintenance Manager','tes.r1':'Open Pit Operation · Northern Chile','tes.m1':'critical detected',
    'tes.q2':'The 48-hour report allows us to act before the next shift. It is the only system that gives us certainty about the internal structural condition without stopping operations.',
    'tes.a2':'Tire Superintendent','tes.r2':'400t CAEX Fleet · World-Class Mining','tes.m2':'diagnosis',
    'tes.q3':'We reduced unplanned replacement costs by 35% in the first 6 months. The ROI was evident from the second month of implementation.',
    'tes.a3':'Operations Manager','tes.r3':'Mining Operation · Antofagasta','tes.m3':'replacement costs',
    'pri.label':'Service plans — Select your level','pri.title':'From initial assessment<br>to OEM integration.',
    'pri.t1':'Assessment','pri.h1':'Per-Tire Diagnosis','pri.d1':'Structural evaluation per unit. Ideal for pilot testing or targeted inspections on an existing fleet.','pri.tag1':'Pay per unit',
    'pri.f1a':'In-situ ultrasonic inspection','pri.f1b':'Diagnosis per inspected unit','pri.f1c':'Structural report delivered in 48h','pri.f1d':'Action recommendation per tire','pri.b1':'Request quote',
    'pri.t2':'Operational','pri.h2':'Fleet Monitoring','pri.d2':'Continuous monitoring of the full OTR fleet. Periodic inspection cycles with per-unit status dashboard.','pri.tag2':'Monthly subscription',
    'pri.f2a':'Full OTR fleet coverage','pri.f2b':'Scheduled inspection cycles','pri.f2c':'Per-unit risk dashboard','pri.f2d':'Early alerts and prioritization','pri.f2e':'Dedicated technical support','pri.b2':'Contact team',
    'pri.t3':'Enterprise','pri.h3':'OEM / API Integration','pri.d3':'Integration of the VIZUtire model into manufacturer systems or asset management platforms. For OEMs and tier-1 operations.','pri.tag3':'Custom project',
    'pri.f3a':'API integration with own systems','pri.f3b':'FM model licensing','pri.f3c':'Technical co-development with manufacturer','pri.f3d':'Guaranteed SLA and dedicated team','pri.b3':'Talk to sales',
    'faq.label':'FAQ','faq.title':'Frequently asked questions',
    'faq.sub':'How does the system work? How fast is the diagnosis? Direct answers for technical and management teams.',
    'faq.cta':'Technical inquiry →',
    'faq.q1':'How does the in-situ diagnosis work?','faq.a1':'We use high-frequency ultrasound (2.4 MHz) applied directly to the mounted tire. The process requires no dismounting or operational interruption. Signals capture the internal state of each structural layer and are processed in real time by our physico-mathematical model.',
    'faq.q2':'What types of OTR tires are compatible?','faq.a2':'VIZUtire is compatible with large mining OTR tires from 49" to 63", including those used in CAEX haul trucks from 220 to 400+ tons (Caterpillar 793/795, Komatsu 830/930, Liebherr T282). The model has been validated in Northern Chile operations.',
    'faq.q3':'How long does the complete process take?','faq.a3':'In-situ capture per tire takes 20 to 40 minutes. The full diagnosis with criticality report is delivered in less than 48 hours from inspection. For full fleets, we coordinate scheduled inspection cycles that minimize impact on equipment availability.',
    'faq.q4':'Is it necessary to stop operations?','faq.a4':'No. The diagnosis is performed with the equipment in the maintenance area during scheduled service windows, with no impact on operational continuity. The process is non-destructive and in-situ: the tire does not need to be removed from the vehicle.',
    'faq.q5':'How does it integrate with our management systems?','faq.a5':'Reports are delivered in structured digital format (PDF + data) compatible with major CMMS systems. The Enterprise plan includes direct API integration with asset management platforms. We also offer our own operational dashboard for continuous fleet status monitoring.',
    'cta.eyebrow':'OTR Diagnostics · Antofagasta, Chile',
    'cta.h1':'Reduce structural risk','cta.h2':'before the event.',
    'cta.desc':'Request a technical assessment for your OTR fleet. Our team analyzes your operation and delivers diagnosis in 48 hours.',
    'cta.b1':'Request technical assessment','cta.b2':'See full system',
    'cta.sub':'Antofagasta, Chile · vizutire.com · contacto@vizutire.com',
  }
};

let lang = 'es';
function setLang(l) {
  lang = l;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = T[l][el.dataset.i18n];
    if (v !== undefined) el.innerHTML = v;
  });
  document.getElementById('lang-btn').textContent = l === 'es' ? 'EN' : 'ES';
  document.documentElement.lang = l;
}
document.getElementById('lang-btn').addEventListener('click', () => setLang(lang === 'es' ? 'en' : 'es'));

/* ── NAV SCROLL ── */
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ── NAV MOBILE MENU ── */
(function initMobileMenu() {
  const btn  = document.getElementById('nav-menu-btn');
  const menu = document.getElementById('nav-mobile');
  const nav  = document.getElementById('nav');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    nav.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', open);
  });

  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      menu.classList.remove('open');
      nav.classList.remove('menu-open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', e => {
    if (!nav.contains(e.target) && menu.classList.contains('open')) {
      menu.classList.remove('open');
      nav.classList.remove('menu-open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
})();

/* ── TICKER ── */
(function buildTicker() {
  const items = [
    'Gran Minería Mundial','Rajo Abierto','Ultrasonido In Situ',
    'Diagnóstico Estructural','150+ Variables','Detección Temprana',
    'Antofagasta · Chile','OTR Tire Diagnostics','Non-Destructive Testing',
    'Physico-Mathematical Model','CAEX 400t','Ingeniería Aplicada'
  ];
  const all = [...items, ...items];
  document.getElementById('ticker').innerHTML = all
    .map(t => `<span class="ticker-item"><span class="tdot"></span>${t}</span>`)
    .join('');
})();

/* ── CANVAS PARTICLES ── */
(function initCanvas() {
  const cv = document.getElementById('hero-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let pts = [];

  function resize() { cv.width = cv.offsetWidth; cv.height = cv.offsetHeight; }

  class Pt {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * cv.width; this.y = Math.random() * cv.height;
      this.vx = (Math.random() - 0.5) * 0.22; this.vy = (Math.random() - 0.5) * 0.22;
      this.r = Math.random() * 1.4 + 0.5;
      this.a = Math.random() * 0.35 + 0.08;
      this.life = this.maxLife = Math.random() * 300 + 100;
    }
    tick() {
      this.x += this.vx; this.y += this.vy; this.life--;
      if (this.life <= 0 || this.x < 0 || this.x > cv.width || this.y < 0 || this.y > cv.height) this.reset();
    }
    draw() {
      const f = this.life / this.maxLife;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(225,6,0,${this.a * f * 0.45})`; ctx.fill();
    }
  }

  function drawLines() {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < 100) {
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(225,6,0,${0.05*(1-d/100)})`; ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
    }
  }

  function loop() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    drawLines(); pts.forEach(p => { p.tick(); p.draw(); });
    requestAnimationFrame(loop);
  }

  resize();
  pts = Array.from({ length: 50 }, () => new Pt());
  loop();
  window.addEventListener('resize', () => { resize(); pts.forEach(p => p.reset()); }, { passive: true });
})();

/* ── SCROLL REVEAL ── */
(function initReveal() {
  /* Add class to body — CSS uses .js-ready to opt into hidden state */
  document.body.classList.add('js-ready');

  /* Mark all animatable elements */
  const selectors = [
    '.sec-hd', '.sys-status-bar', '.flow .node',
    '.prob-layout > *', '.fail-item',
    '.dash-panel', '.val-block', '.val-check',
    '.testi-card', '.price-card',
    '.faq-side', '.faq-item',
    '.cta-inner'
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.classList.add('anim-up'));
  });

  /* Hero elements get delay classes */
  const heroEls = document.querySelectorAll('.hero-content > *');
  heroEls.forEach((el, i) => {
    el.classList.add('anim-up');
    if (i === 1) el.classList.add('d1');
    if (i === 2) el.classList.add('d2');
    if (i === 3) el.classList.add('d3');
  });
  const heroVisual = document.querySelector('.hero-visual');
  if (heroVisual) heroVisual.classList.add('anim-up', 'd2');

  /* Stagger within grids */
  ['.testi-grid', '.pricing-grid', '.dashboard', '.flow'].forEach(grid => {
    const el = document.querySelector(grid);
    if (!el) return;
    [...el.children].forEach((child, i) => {
      if (i === 1) child.classList.add('d1');
      if (i === 2) child.classList.add('d2');
      if (i === 3) child.classList.add('d3');
    });
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.anim-up').forEach(el => io.observe(el));

  /* Hero reveals immediately after short delay */
  setTimeout(() => {
    document.querySelectorAll('.hero .anim-up').forEach(el => el.classList.add('on'));
  }, 200);
})();

/* ── COUNTER ANIMATION ── */
(function initCounters() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el  = e.target;
      const end = parseInt(el.dataset.cnt);
      const pfx = el.dataset.pfx || '';
      const sfx = el.dataset.sfx || '';
      if (isNaN(end)) return;
      const dur = 1800;
      const t0  = performance.now();
      function tick(now) {
        const p = Math.min((now - t0) / dur, 1);
        const v = 1 - Math.pow(1 - p, 3);
        el.textContent = pfx + Math.round(v * end) + sfx;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-cnt]').forEach(el => io.observe(el));
})();

/* ── HERO PARALLAX (no GSAP required) ── */
(function initParallax() {
  const bg = document.getElementById('hero-bg');
  if (!bg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight) bg.style.transform = `scale(1.05) translateY(${y * 0.18}px)`;
  }, { passive: true });
})();
