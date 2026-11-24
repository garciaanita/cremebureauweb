// Creme Bureau — selector de idioma ES / EN
(function () {
  "use strict";

  var raiz = document.documentElement;

  var TEXTOS_INTERFAZ = {
    es: { saltar: "Ir al contenido", idiomaBoton: "English" },
    en: { saltar: "Skip to content", idiomaBoton: "Español" }
  };

  function aplicarIdioma(idioma) {
    raiz.lang = idioma;
    raiz.setAttribute("data-lang", idioma);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.hidden = el.getAttribute("data-i18n") !== idioma;
    });

    var textos = TEXTOS_INTERFAZ[idioma];

    var salto = document.querySelector(".salto");
    if (salto) salto.textContent = textos.saltar;

    var botonIdioma = document.getElementById("idioma-btn");
    if (botonIdioma) botonIdioma.textContent = textos.idiomaBoton;

    try {
      localStorage.setItem("cb-idioma", idioma);
    } catch (e) {
      /* almacenamiento no disponible, seguimos sin persistir */
    }
  }

  var idiomaGuardado = "es";
  try {
    idiomaGuardado = localStorage.getItem("cb-idioma") || "es";
  } catch (e) {
    idiomaGuardado = "es";
  }

  aplicarIdioma(idiomaGuardado === "en" ? "en" : "es");

  var botonIdioma = document.getElementById("idioma-btn");
  if (botonIdioma) {
    botonIdioma.addEventListener("click", function () {
      aplicarIdioma(raiz.getAttribute("data-lang") === "es" ? "en" : "es");
    });
  }
})();

// Creme Bureau — fotos: huecos vacíos y fotos ancladas
(function () {
  "use strict";

  /* Si una foto no existe, se marca su hueco como vacío (el CSS lo oculta) */
  function sinFoto(img) {
    var hueco = img.closest(".galeria__foto");
    if (hueco) {
      hueco.classList.add("vacia");
    } else {
      img.style.visibility = "hidden";
    }
  }

  document.querySelectorAll("img").forEach(function (img) {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) {
      sinFoto(img);
    } else {
      img.addEventListener("error", function () { sinFoto(img); });
    }
  });

  /* Fotos ancladas: al pinchar una foto de la galería se pega en grande
     en un lugar aleatorio de la pantalla. Se quedan fijas mientras la página
     se desplaza por detrás. Cada una tiene su × para despegarla. */
  var galerias = document.querySelectorAll(".galeria");
  if (!galerias.length) return;

  var esIngles = function () { return document.documentElement.getAttribute("data-lang") === "en"; };
  var capa = 100;          // z-index creciente: la última pinchada queda encima
  var ancladas = [];

  var despejar = document.createElement("button");
  despejar.type = "button";
  despejar.className = "despejar";
  despejar.hidden = true;
  document.body.appendChild(despejar);

  function actualizarDespejar() {
    despejar.hidden = ancladas.length < 2;
    despejar.textContent = esIngles() ? "Clear all" : "Quitar todas";
    despejar.style.zIndex = capa + 1;
  }

  function alFrente(el) {
    capa += 1;
    el.style.zIndex = capa;
    actualizarDespejar();
  }

  function aleatorio(min, max) {
    return min + Math.random() * (max - min);
  }

  function quitar(el) {
    ancladas = ancladas.filter(function (a) { return a !== el; });
    el.remove();
    actualizarDespejar();
  }

  function anclar(img) {
    // Si ya está pegada, solo se trae al frente
    for (var k = 0; k < ancladas.length; k++) {
      if (ancladas[k].dataset.src === img.currentSrc) {
        alFrente(ancladas[k]);
        return;
      }
    }

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var movil = vw < 640;
    var margen = 10;
    var proporcion = img.naturalHeight / img.naturalWidth || 1.25;

    var ancho = movil ? aleatorio(0.68, 0.86) * vw : aleatorio(0.24, 0.36) * vw;
    var alto = ancho * proporcion;
    var altoMax = vh * 0.82;
    if (alto > altoMax) {
      alto = altoMax;
      ancho = alto / proporcion;
    }

    var x = aleatorio(margen, Math.max(margen, vw - ancho - margen));
    var y = aleatorio(margen, Math.max(margen, vh - alto - margen));

    var el = document.createElement("figure");
    el.className = "anclada";
    el.dataset.src = img.currentSrc;
    el.style.width = Math.round(ancho) + "px";
    el.style.left = Math.round(x) + "px";
    el.style.top = Math.round(y) + "px";

    var foto = document.createElement("img");
    foto.src = img.currentSrc;
    foto.alt = img.alt;

    var cerrar = document.createElement("button");
    cerrar.type = "button";
    cerrar.className = "anclada__cerrar";
    cerrar.textContent = "×";
    cerrar.setAttribute("aria-label", esIngles() ? "Remove photo" : "Quitar foto");

    cerrar.addEventListener("click", function (e) {
      e.stopPropagation();
      quitar(el);
    });
    // Arrastrar: se puede mover la foto a cualquier sitio de la pantalla
    el.addEventListener("pointerdown", function (e) {
      alFrente(el);
      if (e.target.closest(".anclada__cerrar")) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      var inicioX = e.clientX, inicioY = e.clientY;
      var izq = parseFloat(el.style.left) || 0, arr = parseFloat(el.style.top) || 0;
      el.classList.add("anclada--arrastrando");
      try { el.setPointerCapture(e.pointerId); } catch (err) {}

      function mover(ev) {
        var w = el.offsetWidth, h = el.offsetHeight;
        // Que siempre quede al menos un trozo visible para poder recuperarla
        var nx = Math.min(window.innerWidth - 40, Math.max(40 - w, izq + ev.clientX - inicioX));
        var ny = Math.min(window.innerHeight - 40, Math.max(0, arr + ev.clientY - inicioY));
        el.style.left = nx + "px";
        el.style.top = ny + "px";
      }
      function soltar() {
        el.classList.remove("anclada--arrastrando");
        el.removeEventListener("pointermove", mover);
        el.removeEventListener("pointerup", soltar);
        el.removeEventListener("pointercancel", soltar);
      }
      el.addEventListener("pointermove", mover);
      el.addEventListener("pointerup", soltar);
      el.addEventListener("pointercancel", soltar);
    });

    el.appendChild(foto);
    el.appendChild(cerrar);
    document.body.appendChild(el);
    ancladas.push(el);
    alFrente(el);
  }

  galerias.forEach(function (galeria) {
    galeria.querySelectorAll(".galeria__foto").forEach(function (hueco) {
      hueco.tabIndex = 0;
      function activar() {
        if (hueco.classList.contains("vacia")) return;
        var img = hueco.querySelector("img");
        if (!img.complete || !img.naturalWidth) return;
        anclar(img);
      }
      hueco.addEventListener("click", activar);
      hueco.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activar(); }
      });
    });
  });

  despejar.addEventListener("click", function () {
    ancladas.slice().forEach(quitar);
  });

  // Esc despega la última foto anclada
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !ancladas.length) return;
    var ultima = ancladas.reduce(function (a, b) {
      return Number(a.style.zIndex) > Number(b.style.zIndex) ? a : b;
    });
    quitar(ultima);
  });
})();

// Creme Bureau — About: línea de tiempo del Project Journey.
// Al tocar (móvil) o pulsar una fase se abre su descripción; las demás se cierran.
(function () {
  "use strict";
  document.querySelectorAll(".linea-tiempo").forEach(function (linea) {
    var hitos = linea.querySelectorAll(".hito");
    hitos.forEach(function (hito) {
      var boton = hito.querySelector(".hito__punto");
      boton.addEventListener("click", function () {
        var abrir = !hito.classList.contains("hito--abierto");
        hitos.forEach(function (h) {
          h.classList.remove("hito--abierto");
          h.querySelector(".hito__punto").setAttribute("aria-expanded", "false");
        });
        if (abrir) {
          hito.classList.add("hito--abierto");
          boton.setAttribute("aria-expanded", "true");
        }
      });
    });
  });
})();

// Creme Bureau — Contacto: envío del formulario sin salir de la página (FormSubmit)
(function () {
  "use strict";
  document.querySelectorAll(".contacto-form").forEach(function (form) {
    var estado = form.querySelector(".contacto-form__estado");
    var boton = form.querySelector('button[type="submit"]');
    form.addEventListener("submit", function (e) {
      if (!window.fetch || !window.FormData) return;     // sin JS moderno: envío normal
      e.preventDefault();
      boton.disabled = true;
      estado.textContent = form.getAttribute("data-enviando");
      var datos = new FormData(form);
      fetch(form.action.replace("formsubmit.co/", "formsubmit.co/ajax/"), {
        method: "POST",
        headers: { Accept: "application/json" },
        body: datos
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          var bien = res.ok && (res.j.success === true || res.j.success === "true");
          var aviso = String((res.j && res.j.message) || "");
          if (!bien && /activat/i.test(aviso)) {
            // Primer envío: FormSubmit pide activar el formulario desde el correo
            estado.textContent = "El formulario está pendiente de activación: revisa el correo de hey@cremebureau.com (también spam) y pulsa “Activate Form”.";
          } else {
            estado.textContent = form.getAttribute(bien ? "data-ok" : "data-error") + (!bien && aviso ? " (" + aviso + ")" : "");
          }
          if (bien) form.reset();
        })
        .catch(function () { estado.textContent = form.getAttribute("data-error"); })
        .then(function () { boton.disabled = false; });
    });
  });
})();

// Creme Bureau — Portada: franja vertical con las disciplinas, que avanza sin parar.
(function () {
  "use strict";
  var franja = document.querySelector(".franja");
  if (!franja) return;
  var pista = franja.querySelector(".franja__pista");
  var marca = document.querySelector(".nav__marca");
  var logo = document.querySelector(".nav__logo");
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var PALABRAS = {
    es: ["Branding", "Identidad visual", "Diseño editorial", "Packaging", "Dirección de arte",
         "Ilustración", "Tipografía", "Print", "Diseño web", "UX/UI", "Redes sociales", "Tattoo design"],
    en: ["Branding", "Visual identity", "Editorial design", "Packaging", "Art direction",
         "Illustration", "Typography", "Print", "Web design", "UX/UI", "Social media", "Tattoo design"]
  };
  var VELOCIDAD = 16;   // píxeles por segundo: lento y constante
  var y = 0, largo = 0, idioma = null, anterior = null;

  function idiomaActual() {
    return document.documentElement.getAttribute("data-lang") === "en" ? "en" : "es";
  }

  // Coloca la franja justo entre el final de "Creme Bureau" y el logo
  function colocar() {
    var a = marca.getBoundingClientRect(), b = logo.getBoundingClientRect();
    franja.style.setProperty("--franja-x", ((a.right + b.left) / 2).toFixed(1) + "px");
  }

  function montar() {
    idioma = idiomaActual();
    var frase = PALABRAS[idioma].map(function (p) { return "(" + p + ")"; }).join("\u2003") + "\u2003";
    pista.textContent = frase;
    largo = pista.scrollHeight;                       // largo de una vuelta
    var veces = Math.max(3, Math.ceil(window.innerHeight * 2 / Math.max(1, largo)) + 2);
    pista.textContent = new Array(veces + 1).join(frase);
    // Largo exacto de una vuelta, medido sobre el texto ya repetido
    largo = pista.getBoundingClientRect().height / veces;
    if (largo) y = y % largo;              // sin saltos al rehacer la frase
  }

  function paso(t) {
    if (anterior === null) anterior = t;
    var dt = Math.min(0.05, (t - anterior) / 1000);
    anterior = t;
    if (idiomaActual() !== idioma) montar();
    y += VELOCIDAD * dt;
    if (largo && y >= largo) y -= largo;
    // rotate(180deg) invierte el eje: sumar y hace que el texto suba
    // Se parte desplazado una vuelta hacia arriba: así nunca queda hueco arriba,
    // y al completar una vuelta la frase siguiente ocupa exactamente su sitio
    pista.style.transform = "rotate(180deg) translateY(" + (largo - y).toFixed(2) + "px)";
    requestAnimationFrame(paso);
  }

  colocar();
  montar();
  // Solo se rehace si cambia el ancho (en el móvil la barra de Safari cambia el alto a menudo)
  var ancho = window.innerWidth;
  window.addEventListener("resize", function () {
    colocar();
    if (window.innerWidth !== ancho) { ancho = window.innerWidth; montar(); }
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { colocar(); montar(); });
  if (!reducido) requestAnimationFrame(paso);
})();

// Creme Bureau — Cursor propio con el logo (solo con ratón).
(function () {
  "use strict";
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  var cursor = document.createElement("div");
  cursor.className = "cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = '<span class="cursor__halo"></span><span class="cursor__forma"></span>';
  document.body.appendChild(cursor);
  document.documentElement.classList.add("cursor-propio");

  var INTERACTIVO = "a, button, label, input, textarea, select, summary, [role='button'], .galeria__foto, .hito__punto, .anclada__cerrar";
  var x = -100, y = -100, cx = -100, cy = -100, visto = false;
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY;
    if (!visto) { cx = x; cy = y; visto = true; }
    var t = e.target;
    // En el lienzo de Playground manda el cursor del boli
    var enLienzo = t.closest && t.closest(".boli-lienzo");
    cursor.classList.toggle("cursor--visible", !enLienzo);
    cursor.classList.toggle("cursor--activo", !!(t.closest && t.closest(INTERACTIVO)));
  }, { passive: true });

  document.addEventListener("pointerdown", function () { cursor.classList.add("cursor--pulsado"); });
  document.addEventListener("pointerup", function () { cursor.classList.remove("cursor--pulsado"); });
  document.documentElement.addEventListener("mouseleave", function () { cursor.classList.remove("cursor--visible"); });

  (function paso() {
    var k = reducido ? 1 : 0.35;          // seguimiento suave
    cx += (x - cx) * k;
    cy += (y - cy) * k;
    cursor.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
    requestAnimationFrame(paso);
  })();
})();

// Creme Bureau — Portada: viaje en 3D. El scroll mueve la cámara hacia delante y las
// fotos (a distintas profundidades y a izquierda/derecha) pasan junto al espectador.
// Las fotos salen de las galerías de archive.html: al añadir una foto allí, aparece aquí.
(function () {
  "use strict";
  var tunel = document.querySelector(".tunel");
  if (!tunel) return;
  var mundo = tunel.querySelector(".tunel__mundo");
  var fotos = Array.prototype.slice.call(tunel.querySelectorAll(".tunel__foto"));
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var SEPARACION = 1100;                 // distancia en profundidad entre fotos (px)
  var INICIO = 350;                      // la primera foto empieza algo lejos
  // Posición en pantalla de cada foto (fracción del ancho / alto de la ventana)
  var SITIOS = [[-0.36, -0.1], [0.34, 0.14], [-0.32, 0.16], [0.36, -0.12]];

  var objetivo = 0, camara = 0;

  function ajustarAltura() {
    // Recorrido de scroll proporcional al número de fotos
    tunel.style.height = Math.max(3, fotos.length * 1.1 + 1) * 100 + "vh";
  }

  function colocar() {
    var movil = window.innerWidth < 640;
    var w = window.innerWidth, h = window.innerHeight;
    fotos.forEach(function (f, i) {
      var s = SITIOS[i % SITIOS.length];
      var ancho = f.offsetWidth, alto = f.offsetHeight || ancho * 1.25;
      f._x = s[0] * w * (movil ? 0.55 : 1) - ancho / 2;
      f._y = s[1] * h - alto / 2;
      f._z = -(INICIO + i * SEPARACION);
    });
  }

  function pintar() {
    mundo.style.transform = "translateZ(" + camara.toFixed(1) + "px)";
    fotos.forEach(function (f) {
      var z = f._z + camara;                       // profundidad respecto a la cámara
      // Aparecen desde la niebla al fondo y se desvanecen al pasar junto a la cámara
      var lejos = Math.min(1, Math.max(0, (z + 3200) / 1600));
      var cerca = Math.min(1, Math.max(0, (650 - z) / 450));
      f.style.opacity = (lejos * cerca).toFixed(3);
      f.style.visibility = lejos * cerca < 0.01 ? "hidden" : "visible";
      f.style.transform = "translate3d(" + f._x.toFixed(1) + "px," + f._y.toFixed(1) + "px," + f._z + "px)";
    });
  }

  function leerScroll() {
    var recorrido = tunel.offsetHeight - window.innerHeight;
    var p = recorrido > 0 ? Math.min(1, Math.max(0, window.scrollY / recorrido)) : 0;
    // Al final la última foto queda delante, a distancia cómoda
    objetivo = p * (INICIO + (fotos.length - 1) * SEPARACION + 100);
  }

  function paso() {
    camara += (objetivo - camara) * (reducido ? 1 : 0.1);     // avance suave
    pintar();
    requestAnimationFrame(paso);
  }

  function rehacer() { colocar(); leerScroll(); }

  // Lee archive.html y usa las fotos que existan en sus galerías,
  // alternando proyectos para que el recorrido sea variado
  function cargarDesdeArchive() {
    if (!window.fetch || !window.DOMParser) return;
    fetch("archive.html", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var bloque = doc.querySelector('[data-i18n="es"]') || doc;
        var porProyecto = [];
        bloque.querySelectorAll(".galeria").forEach(function (g) {
          var lista = [];
          g.querySelectorAll("img").forEach(function (img) {
            lista.push({ src: img.getAttribute("src"), alt: img.getAttribute("alt") || "" });
          });
          porProyecto.push(lista);
        });
        // Comprueba qué fotos existen de verdad
        var todas = [];
        porProyecto.forEach(function (lista, p) { lista.forEach(function (f, i) { f.p = p; f.i = i; todas.push(f); }); });
        return Promise.all(todas.map(function (f) {
          return new Promise(function (ok) {
            var im = new Image();
            im.onload = function () { f.existe = true; ok(); };
            im.onerror = function () { ok(); };
            im.src = f.src;
          });
        })).then(function () {
          var colas = porProyecto.map(function (lista) { return lista.filter(function (f) { return f.existe; }); });
          var orden = [], quedan = true;
          for (var ronda = 0; quedan; ronda++) {
            quedan = false;
            colas.forEach(function (c) { if (c[ronda]) { orden.push(c[ronda]); quedan = true; } });
          }
          return orden;
        });
      })
      .then(function (orden) {
        if (!orden || !orden.length) return;
        mundo.innerHTML = orden.map(function (f) {
          return '<figure class="tunel__foto"><img src="' + f.src + '" alt="' + f.alt.replace(/"/g, "&quot;") + '"></figure>';
        }).join("");
        fotos = Array.prototype.slice.call(mundo.querySelectorAll(".tunel__foto"));
        ajustarAltura();
        // Recolocar cuando cada foto conozca su tamaño
        fotos.forEach(function (f) { var im = f.querySelector("img"); if (!im.complete) im.addEventListener("load", rehacer); });
        rehacer();
        pintar();
      })
      .catch(function () { /* sin conexión o abierta en local: se quedan las fotos de reserva */ });
  }

  window.addEventListener("scroll", leerScroll, { passive: true });
  window.addEventListener("resize", rehacer);
  window.addEventListener("load", rehacer);
  ajustarAltura();
  rehacer();
  camara = objetivo;
  pintar();
  requestAnimationFrame(paso);
  cargarDesdeArchive();
})();

