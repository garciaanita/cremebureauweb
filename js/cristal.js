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
    el.addEventListener("pointerdown", function () { alFrente(el); });

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

// Creme Bureau — Portada: el logo dibujado tiembla al pasar el ratón (o al tocarlo).
// Alterna entre tres versiones de la línea con distinto temblor, como una animación a mano.
(function () {
  "use strict";
  var logo = document.querySelector(".dibujo__logo");
  if (!logo) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var clases = ["tiembla-1", "tiembla-2", "tiembla-3"];
  var paso = 0, intervalo = null, fin = null;

  function quitar() { clases.forEach(function (c) { logo.classList.remove(c); }); }

  function empezar() {
    clearTimeout(fin);
    if (intervalo) return;
    intervalo = setInterval(function () {
      quitar();
      logo.classList.add(clases[paso++ % clases.length]);
    }, 90);
  }

  function parar() {
    clearInterval(intervalo);
    intervalo = null;
    quitar();
  }

  logo.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") empezar(); });
  logo.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") parar(); });
  // En móvil: al tocarlo tiembla un momento
  logo.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") return;
    empezar();
    fin = setTimeout(parar, 900);
  });
})();
