/* ============================================================================
   KAIRAL · Autoevaluación funcional — contenido clínico
   Dra. Yusneily Sánchez · kairal.cl

   FUENTE ÚNICA. Este archivo lo usan los dos lados:
     · el navegador  → <script src="autoeval-contenido.js"> en autoevaluacion.html
     · el servidor   → require() desde netlify/functions/autoeval-result.js
   Así el informe en pantalla y el que llega por correo nunca se contradicen.

   Criterio de redacción: describe patrones y orienta sobre qué hacer. No
   diagnostica, no promete resultados y no indica tratamientos ni dosis.
   ========================================================================== */

(function (raiz, definir) {
  if (typeof module === 'object' && module.exports) module.exports = definir();
  else raiz.KAIRAL_AUTOEVAL = definir();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── Los cuatro sistemas y sus afirmaciones ────────────────────────────────
  var SISTEMAS = [
    {
      id: 'dig',
      nombre: 'Sistema digestivo',
      corto: 'Digestivo',
      intro: 'En medicina funcional el intestino es uno de los principales moduladores del sistema inmune, hormonal y neurológico.',
      preguntas: [
        'Me inflamo después de comer',
        'Tengo gases frecuentes',
        'Alterno entre diarrea y estreñimiento',
        'Siento pesadez digestiva',
        'Tengo intolerancias alimentarias',
        'Acidez o reflujo',
        'Mi energía baja después de comer'
      ]
    },
    {
      id: 'neuro',
      nombre: 'Sistema neuroendocrino',
      corto: 'Neuroendocrino',
      intro: 'Integra cerebro, cortisol, tiroides y hormonas sexuales — el eje del estrés y las hormonas.',
      preguntas: [
        'Me despierto sin haber descansado',
        'Me cuesta recuperarme del ejercicio',
        'Siento agotamiento mental',
        'Tengo niebla mental',
        'Cambios de humor frecuentes',
        'Señales hormonales alteradas (ciclo irregular o doloroso, libido baja)',
        'Me cuesta desconectar del trabajo'
      ]
    },
    {
      id: 'inmune',
      nombre: 'Sistema inmune / inflamación',
      corto: 'Inmune',
      intro: 'La inflamación crónica de bajo grado puede existir incluso con exámenes normales.',
      preguntas: [
        'Me resfrío con frecuencia',
        'Tengo alergias o piel reactiva',
        'Dolores articulares leves pero persistentes',
        'Fatiga sin causa clara',
        'Dolores de cabeza recurrentes',
        'Sensibilidad a ciertos alimentos'
      ]
    },
    {
      id: 'metab',
      nombre: 'Sistema metabólico / energía celular',
      corto: 'Metabólico',
      intro: 'La estabilidad de la glucosa y la energía celular sostienen tu vitalidad a lo largo del día.',
      preguntas: [
        'Antojos frecuentes de azúcar',
        'Energía inestable durante el día',
        'Me cuesta mantener peso saludable',
        'Acumulación de grasa abdominal',
        'Sensación de bajones de energía',
        'Hambre intensa cada pocas horas'
      ]
    }
  ];

  // ── Franjas de gravedad y su urgencia ─────────────────────────────────────
  // Los cortes coinciden con la escala publicada en la página.
  var BANDAS = {
    estable: {
      clave: 'estable',
      etiqueta: 'Probablemente estable',
      color: '#48B9B3',
      urgencia: 'Sin urgencia',
      plazo: 'Mantén lo que ya estás haciendo',
      nivel: 1
    },
    leve: {
      clave: 'leve',
      etiqueta: 'Desequilibrio leve',
      color: '#F59B1B',
      urgencia: 'Atención preventiva',
      plazo: 'Trabájalo en las próximas 4 a 6 semanas',
      nivel: 2
    },
    moderado: {
      clave: 'moderado',
      etiqueta: 'Desequilibrio moderado',
      color: '#E07A3F',
      urgencia: 'Prioritario',
      plazo: 'Conviene abordarlo en las próximas 2 a 4 semanas',
      nivel: 3
    },
    alto: {
      clave: 'alto',
      etiqueta: 'Requiere evaluación funcional',
      color: '#C0392B',
      urgencia: 'Evaluación recomendada',
      plazo: 'Busca orientación profesional esta semana',
      nivel: 4
    }
  };

  function banda(puntaje) {
    if (puntaje >= 15) return BANDAS.alto;
    if (puntaje >= 9) return BANDAS.moderado;
    if (puntaje >= 6) return BANDAS.leve;
    return BANDAS.estable;
  }

  // ── Recomendaciones: un bloque por sistema y franja ───────────────────────
  //   lectura  → qué sugiere el patrón
  //   porque   → por qué importa que mejore (y qué pasa si no se atiende)
  //   acciones → pasos concretos
  var RECOMENDACIONES = {
    dig: {
      estable: {
        lectura: 'Tu digestión no muestra señales de alarma. El intestino está haciendo bien su trabajo de barrera y absorción.',
        porque: 'Un intestino estable sostiene tu inmunidad y tu ánimo. Cuidarlo ahora es lo que evita tener que repararlo después.',
        acciones: [
          'Mantén la variedad vegetal: apunta a 25–30 alimentos de origen vegetal distintos por semana',
          'Come sin pantallas y mastica hasta deshacer el bocado: la digestión empieza en la boca',
          'Deja 3 horas entre la última comida y el sueño'
        ]
      },
      leve: {
        lectura: 'Aparecen señales tempranas de digestión incompleta o de un desequilibrio en tu flora intestinal. Todavía es un patrón flexible.',
        porque: 'Si se sostiene, la irritación de la pared intestinal favorece una inflamación de bajo grado que suele expresarse lejos del intestino: piel, articulaciones, ánimo y energía. Corregirlo ahora es notablemente más simple que hacerlo en un año.',
        acciones: [
          'Retira ultraprocesados, alcohol y endulzantes durante 3 semanas y observa qué cambia',
          'Sube la fibra de forma gradual (verduras cocidas, legumbres bien preparadas, semillas molidas)',
          'Registra durante 2 semanas qué comes y cómo te sientes 2 horas después: el patrón suele hacerse evidente',
          'Cuida el ritmo de las comidas: horarios estables ayudan más que cualquier suplemento'
        ]
      },
      moderado: {
        lectura: 'El patrón es sostenido y compatible con un desequilibrio de la flora intestinal y/o una capacidad digestiva disminuida.',
        porque: 'Buena parte del tejido inmune del cuerpo vive alrededor del intestino. Cuando esta zona se mantiene irritada, el sistema inmune trabaja en alerta permanente y esa inflamación termina afectando tiroides, articulaciones, piel y estado de ánimo. Es el momento de estudiarlo, no de seguir probando dietas por descarte.',
        acciones: [
          'Antes de restringir alimentos, conviene saber qué está ocurriendo: las dietas de eliminación mal guiadas empobrecen la flora',
          'Evita automedicarte con protectores gástricos de forma prolongada: reducen la acidez que necesitas para digerir y absorber',
          'Prioriza el sueño y la gestión del estrés: el intestino responde directamente al sistema nervioso',
          'Mantén el registro de síntomas y llévalo a tu consulta: acorta mucho el diagnóstico'
        ]
      },
      alto: {
        lectura: 'Los síntomas son intensos y persistentes. Este nivel no corresponde autotratarlo: necesita un estudio dirigido.',
        porque: 'Un cuadro digestivo de esta magnitud compromete la absorción de nutrientes y mantiene el sistema inmune activado. Además, hay causas orgánicas —celiaquía, enfermedad inflamatoria intestinal, infección por Helicobacter— que deben descartarse antes de cualquier plan nutricional. Postergarlo suele significar años de síntomas evitables.',
        acciones: [
          'Agenda una evaluación con estudio dirigido: es el paso que realmente cambia el curso',
          'No inicies dietas restrictivas por tu cuenta: pueden enmascarar el diagnóstico',
          'Anota frecuencia, intensidad y relación con las comidas hasta la consulta',
          'Acude antes si aparece sangre, pérdida de peso involuntaria, vómitos persistentes o dolor nocturno que te despierta'
        ]
      }
    },

    neuro: {
      estable: {
        lectura: 'Tu eje del estrés está respondiendo bien: te activas cuando toca y recuperas después.',
        porque: 'Esa capacidad de recuperar es lo que protege tu sueño, tus hormonas y tu memoria a lo largo de los años. Se conserva cuidándola, no se recupera fácil.',
        acciones: [
          'Mantén un horario de sueño estable, también el fin de semana',
          'Busca luz natural en la primera hora del día: es lo que ordena tu reloj interno',
          'Conserva al menos un espacio diario sin pantallas ni tareas'
        ]
      },
      leve: {
        lectura: 'Aparecen las primeras señales de desregulación en tu ritmo de cortisol: te activas bien, pero recuperas peor de lo que deberías.',
        porque: 'El cortisol desordenado no se queda en el cansancio. Con el tiempo baja tu tolerancia al estrés, altera el ciclo menstrual y la libido, interfiere con la tiroides y desestabiliza el azúcar en sangre. Es la etapa donde revertirlo cuesta semanas y no meses.',
        acciones: [
          'Fija la hora de despertar y respétala: ancla todo el ritmo del día',
          'Corta la cafeína después de las 14:00 — aunque creas que no te afecta, fragmenta el sueño profundo',
          'Apaga pantallas 60–90 minutos antes de dormir y baja la luz de la casa',
          'Cambia parte del ejercicio intenso por caminar, movilidad o respiración mientras recuperas'
        ]
      },
      moderado: {
        lectura: 'Hay una desregulación establecida del eje que conecta estrés, sueño y hormonas. El cuerpo lleva tiempo funcionando en reserva.',
        porque: 'Cuando este eje se desajusta arrastra al resto: tiroides, glucosa, ciclo menstrual, libido, memoria y ánimo. La niebla mental y el agotamiento sostenidos no son falta de voluntad ni de carácter, son un patrón fisiológico medible. Y cuanto más se prolonga, más lenta es la recuperación.',
        acciones: [
          'Trata el sueño como tratamiento, no como un lujo: es la intervención de mayor rendimiento en este cuadro',
          'Reduce temporalmente los entrenamientos de alta intensidad: hoy suman carga en vez de restarla',
          'Come con suficiente proteína y sin saltarte comidas: los bajones de glucosa amplifican el cortisol',
          'Revisa qué puedes soltar de tu agenda las próximas 4 semanas — la recuperación necesita espacio real'
        ]
      },
      alto: {
        lectura: 'El nivel de agotamiento es alto y sostenido. Este cuadro no se resuelve con más disciplina ni con vacaciones.',
        porque: 'El desgaste prolongado del eje del estrés predispone a cuadros ansiosos y depresivos, deteriora la memoria de trabajo y se asocia a alteraciones metabólicas y hormonales. Es una de las situaciones donde esperar tiene el costo más alto, porque la recuperación se vuelve más lenta con cada mes que pasa.',
        acciones: [
          'Busca evaluación clínica con laboratorio esta semana: hay causas tratables que se confunden con "estar cansada"',
          'Protege el sueño por encima de cualquier otra prioridad mientras esperas la consulta',
          'Suspende por ahora el ejercicio extenuante y los ayunos prolongados',
          'Pide ayuda profesional sin demora si aparece desesperanza, ideas de muerte o incapacidad de funcionar en el día'
        ]
      }
    },

    inmune: {
      estable: {
        lectura: 'No hay señales de inflamación sostenida. Tu sistema inmune reacciona y vuelve a la calma, que es exactamente lo esperable.',
        porque: 'Mantener baja la inflamación de fondo es una de las decisiones que más pesa en tu salud a largo plazo, y se construye con lo cotidiano.',
        acciones: [
          'Mantén el aporte de omega 3 (pescados grasos) y de vegetales de color intenso',
          'Cuida el sueño: es cuando el sistema inmune se regula',
          'No descuides la salud bucal: la inflamación de las encías cuenta'
        ]
      },
      leve: {
        lectura: 'Hay señales de que tu sistema inmune está algo más reactivo de lo normal, sin llegar a un cuadro definido.',
        porque: 'La inflamación de bajo grado es silenciosa: no da un síntoma claro, da varios pequeños. Sostenida en el tiempo es el terreno común de los problemas cardiometabólicos y de los cuadros autoinmunes, que suelen instalarse años antes de que aparezca un diagnóstico. Bajarla ahora es prevención real.',
        acciones: [
          'Reduce azúcares libres, alcohol y aceites vegetales refinados',
          'Incorpora pescado graso 2–3 veces por semana, crucíferas y frutos rojos',
          'Duerme 7–8 horas: la privación de sueño eleva por sí sola los marcadores inflamatorios',
          'Mueve el cuerpo a diario con intensidad moderada, sin llegar al agotamiento'
        ]
      },
      moderado: {
        lectura: 'El patrón sugiere una inflamación crónica de bajo grado ya establecida, del tipo que suele convivir con exámenes de rutina normales.',
        porque: 'Este es el estado que precede, a veces por años, a las enfermedades cardiometabólicas y autoinmunes. Que los exámenes básicos salgan bien no significa que no esté ocurriendo: significa que hay que mirar los marcadores adecuados. Es la ventana donde intervenir todavía cambia el pronóstico.',
        acciones: [
          'Busca el origen en vez de tapar los síntomas: intestino, sueño, estrés crónico y salud bucal son los sospechosos habituales',
          'Evita el uso prolongado de antiinflamatorios sin indicación: alivian y a la vez irritan la mucosa intestinal',
          'Sostén un patrón antiinflamatorio real durante al menos 8 semanas antes de juzgar si funciona',
          'Revisa tu exposición al humo de tabaco, activa o pasiva'
        ]
      },
      alto: {
        lectura: 'Las señales inflamatorias son numerosas y persistentes. Amerita un estudio dirigido y no solo cambios de hábitos.',
        porque: 'Un nivel así puede corresponder a un proceso autoinmune en desarrollo, a una infección persistente o a una inflamación intestinal activa. Estos cuadros tienen mejor pronóstico cuando se identifican temprano, y su evolución natural sin tratamiento es hacia el daño de tejidos.',
        acciones: [
          'Agenda una evaluación con estudio de laboratorio dirigido, sin postergarlo',
          'Lleva anotado desde cuándo, con qué frecuencia y qué lo empeora',
          'Informa antecedentes familiares de enfermedades autoinmunes o tiroideas',
          'Consulta con prioridad si hay fiebre recurrente, articulaciones hinchadas, lesiones en la piel que no ceden o pérdida de peso sin explicación'
        ]
      }
    },

    metab: {
      estable: {
        lectura: 'Tu energía y tu manejo del azúcar se ven estables a lo largo del día, sin los picos y bajones típicos de la desregulación.',
        porque: 'La estabilidad metabólica es la base de la energía sostenida y uno de los factores que más protege tu salud cardiovascular y cognitiva con los años.',
        acciones: [
          'Mantén proteína suficiente en cada comida principal',
          'Conserva el entrenamiento de fuerza 2–3 veces por semana: el músculo es tu órgano metabólico',
          'Cuida el sueño: dormir poco desregula el apetito al día siguiente'
        ]
      },
      leve: {
        lectura: 'Hay señales de que tu glucosa está oscilando más de lo deseable: antojos, bajones y hambre a las pocas horas apuntan en esa dirección.',
        porque: 'Estos vaivenes son la etapa más temprana —y más reversible— de la resistencia a la insulina. Pueden mantenerse años con la glicemia en ayunas perfectamente normal, y son los que van sumando grasa abdominal y desgastando tu energía. Corregirlos ahora evita el camino largo.',
        acciones: [
          'Incluye proteína en el desayuno: define cómo se comporta tu energía el resto del día',
          'Cambia el orden del plato: primero verduras y proteína, los carbohidratos al final',
          'Camina 10–15 minutos después de las comidas principales',
          'No reemplaces comidas por café: adelanta el bajón, no lo evita'
        ]
      },
      moderado: {
        lectura: 'El patrón es compatible con una resistencia a la insulina en desarrollo, con la grasa abdominal y la energía inestable como señales principales.',
        porque: 'La resistencia a la insulina puede avanzar entre 5 y 10 años antes de que la glicemia en ayunas se altere. Ese periodo silencioso es precisamente cuando es más reversible, y también cuando ya está aumentando el riesgo cardiovascular y de hígado graso. Medirlo bien cambia por completo la conversación.',
        acciones: [
          'Prioriza el entrenamiento de fuerza: es la intervención con mejor evidencia para recuperar sensibilidad a la insulina',
          'Reduce bebidas azucaradas y alcohol, que impactan directamente en el hígado',
          'Cuida el sueño y el estrés: ambos elevan la glucosa por sí solos, sin cambiar la comida',
          'No te guíes solo por el peso de la balanza: la cintura y la fuerza informan mucho mejor'
        ]
      },
      alto: {
        lectura: 'Las señales metabólicas son marcadas. Conviene cuantificarlo con laboratorio antes de que se traduzca en un diagnóstico.',
        porque: 'Un patrón así se asocia a hígado graso, prediabetes y aumento del riesgo cardiovascular, y suele avanzar sin síntomas evidentes hasta que el daño ya está instalado. La buena noticia es que es una de las condiciones que mejor responde cuando se aborda con un plan medido y acompañado.',
        acciones: [
          'Solicita evaluación metabólica con laboratorio: es lo que permite dimensionar el punto de partida',
          'Empieza ya con lo que no requiere autorización: fuerza, caminar después de comer y retirar bebidas azucaradas',
          'Evita las dietas extremas: la pérdida acelerada de músculo empeora el problema de fondo',
          'Informa antecedentes familiares de diabetes o de enfermedad cardiovascular temprana'
        ]
      }
    }
  };

  function recomendacion(idSistema, claveBanda) {
    var porSistema = RECOMENDACIONES[idSistema];
    if (!porSistema) return null;
    return porSistema[claveBanda] || null;
  }

  /* Calcula el informe completo a partir de los puntajes por sistema.
     Recibe { dig: 12, neuro: 4, ... } y devuelve el detalle ordenado por
     gravedad, más una lectura de conjunto. */
  function informe(puntajes) {
    var detalle = SISTEMAS.map(function (s) {
      var bruto = Number(puntajes[s.id]);
      var puntaje = isFinite(bruto) ? Math.max(0, Math.round(bruto)) : 0;
      var maximo = s.preguntas.length * 3;
      if (puntaje > maximo) puntaje = maximo;
      var b = banda(puntaje);
      return {
        id: s.id,
        nombre: s.nombre,
        corto: s.corto,
        puntaje: puntaje,
        maximo: maximo,
        porcentaje: Math.round((puntaje / maximo) * 100),
        banda: b,
        contenido: recomendacion(s.id, b.clave)
      };
    });

    var ordenado = detalle.slice().sort(function (a, b) {
      return b.puntaje - a.puntaje;
    });
    var principal = ordenado[0];
    var atencion = ordenado.filter(function (d) { return d.banda.nivel >= 3; });

    return {
      sistemas: detalle,
      ordenados: ordenado,
      principal: principal,
      requierenAtencion: atencion,
      conjunto: lecturaDeConjunto(ordenado, atencion),
      total: detalle.reduce(function (a, d) { return a + d.puntaje; }, 0)
    };
  }

  /* La lectura de conjunto: por dónde empezar cuando hay varios sistemas
     comprometidos. Digestivo y neuroendocrino van primero porque suelen
     estar aguas arriba de los otros dos. */
  function lecturaDeConjunto(ordenado, atencion) {
    var principal = ordenado[0];

    if (!principal || principal.puntaje === 0) {
      return {
        titulo: 'Sin datos suficientes',
        texto: 'Responde las afirmaciones para obtener tu lectura.'
      };
    }

    if (atencion.length === 0) {
      return {
        titulo: 'Tu perfil se ve equilibrado',
        texto: 'Ninguno de los cuatro sistemas muestra un patrón que requiera intervención. El sistema ' +
               principal.corto.toLowerCase() + ' es el que más señales acumula, así que es el que conviene ' +
               'seguir observando. Mantener este estado es más fácil que recuperarlo: lo que hoy haces bien, sostenlo.'
      };
    }

    if (atencion.length === 1) {
      return {
        titulo: 'Un sistema concentra tus señales',
        texto: 'El sistema ' + principal.corto.toLowerCase() + ' es claramente el que necesita atención. ' +
               'Tener un solo foco es una buena noticia: permite concentrar el esfuerzo en un lugar y medir si ' +
               'funciona. Empieza por ahí antes de intentar cambiar todo a la vez.'
      };
    }

    var aguasArriba = ordenado.filter(function (d) {
      return d.banda.nivel >= 3 && (d.id === 'dig' || d.id === 'neuro');
    })[0];
    var punto = aguasArriba || principal;

    return {
      titulo: 'Varios sistemas están conectados',
      texto: 'Hay ' + atencion.length + ' sistemas con señales relevantes, y eso rara vez es casualidad: ' +
             'los sistemas no funcionan aislados y el más afectado suele estar sosteniendo a los demás. ' +
             'Lo habitual es que el intestino y el eje del estrés estén aguas arriba del resto, así que el ' +
             'punto de partida más rentable es el sistema ' + punto.corto.toLowerCase() + '. ' +
             'Intentar corregir los cuatro a la vez suele terminar en abandono; ordenarlos por prioridad, no.'
    };
  }

  var DESCARGO = 'Esta autoevaluación es una herramienta de orientación y no constituye un diagnóstico ' +
                 'ni reemplaza una consulta médica. Si tus síntomas son intensos, persistentes o empeoran, ' +
                 'consulta con un profesional de la salud.';

  var TOTAL_PREGUNTAS = SISTEMAS.reduce(function (a, s) { return a + s.preguntas.length; }, 0);

  return {
    SISTEMAS: SISTEMAS,
    BANDAS: BANDAS,
    RECOMENDACIONES: RECOMENDACIONES,
    TOTAL_PREGUNTAS: TOTAL_PREGUNTAS,
    DESCARGO: DESCARGO,
    banda: banda,
    recomendacion: recomendacion,
    informe: informe
  };
});
