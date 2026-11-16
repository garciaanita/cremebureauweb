// Creme Bureau — Playground: dibujar como con un boli Bic
// Ratón (manteniendo pulsado), dedo o lápiz. El lienzo cubre toda la pantalla.
//
// Cómo se imita la tinta de bolígrafo:
// · Dos capas: el trazo en curso se pinta en una capa propia (opaca, sin marcas en
//   las uniones). Al levantar la punta se "imprime" sobre el papel en modo
//   multiplicar, así la tinta se oscurece donde se cruza con trazos anteriores.
// · Vetas: el trazo son varias hebras finas paralelas (la bolita deja rayitas). Cada
//   hebra lleva su propia carga de tinta, que cambia poco a poco y a veces se seca.
// · Grano: diminutos poros del papel, fijos en la hoja, que se quedan sin tinta.
// · Grumos: al apoyar la punta o al quedarse quieto, la bolita suelta un pegote.
(function () {
  "use strict";

  var papel = document.getElementById("boli-lienzo");
  if (!papel || !papel.getContext) return;
  var ctxPapel = papel.getContext("2d");

  // Capa del trazo en curso, justo encima del papel (no recibe el ratón)
  var capa = document.createElement("canvas");
  capa.className = "boli-lienzo boli-lienzo--capa";
  capa.setAttribute("aria-hidden", "true");
  capa.style.pointerEvents = "none";
  papel.parentNode.insertBefore(capa, papel.nextSibling);
  var ctx = capa.getContext("2d");

  var TINTA = [20, 40, 140];   // azul Bic
  var GROSOR = 1.4;            // grosor base en px; lo cambia la barra "Grosor"
  var dpr = 1;
  var poros = null;

  /* --- Tamaño (nítido en retina; conserva el dibujo al redimensionar) --- */
  function redimensionar(c, conservar) {
    var copia = null;
    if (conservar && c.width && c.height) {
      copia = document.createElement("canvas");
      copia.width = c.width;
      copia.height = c.height;
      copia.getContext("2d").drawImage(c, 0, 0);
    }
    c.width = Math.round(window.innerWidth * dpr);
    c.height = Math.round(window.innerHeight * dpr);
    c.style.width = window.innerWidth + "px";
    c.style.height = window.innerHeight + "px";
    if (copia) c.getContext("2d").drawImage(copia, 0, 0);
  }

  function ajustar() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    redimensionar(papel, true);
    redimensionar(capa, false);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    poros = null;
  }

  ajustar();
  var esperaResize = null;
  window.addEventListener("resize", function () {
    clearTimeout(esperaResize);
    esperaResize = setTimeout(ajustar, 120);
  });

  /* --- Poros del papel: puntitos que se quedan sin tinta, fijos en la hoja --- */
  function crearPoros() {
    var lado = 160;
    var c = document.createElement("canvas");
    c.width = c.height = lado;
    var g = c.getContext("2d");
    var datos = g.createImageData(lado, lado);
    for (var i = 0; i < datos.data.length; i += 4) {
      // 0 = deja la tinta; 255 = poro (se borra del todo, así repetirlo no acumula)
      datos.data[i + 3] = Math.random() < 0.025 ? 255 : 0;
    }
    g.putImageData(datos, 0, 0);
    var patron = ctx.createPattern(c, "repeat");
    if (patron.setTransform && window.DOMMatrix) patron.setTransform(new DOMMatrix().scale(1 / dpr));
    return patron;
  }

  function aplicarPoros(x0, y0, x1, y1, margen) {
    if (!poros) poros = crearPoros();
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = poros;
    var x = Math.min(x0, x1) - margen, y = Math.min(y0, y1) - margen;
    ctx.fillRect(x, y, Math.abs(x1 - x0) + margen * 2, Math.abs(y1 - y0) + margen * 2);
    ctx.restore();
  }

  /* --- Color de la tinta según la carga (menos carga = más claro, como tinta escasa) --- */
  function tinta(carga, oscurecer) {
    var k = Math.max(0, Math.min(1, carga));
    var o = oscurecer || 1;
    var r = Math.round((255 - (255 - TINTA[0]) * k) * o);
    var g = Math.round((255 - (255 - TINTA[1]) * k) * o);
    var b = Math.round((255 - (255 - TINTA[2]) * k) * (o < 1 ? 0.92 + o * 0.08 : 1));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  /* --- Trazo --- */
  var trazos = {};          // un trazo por puntero (varios dedos a la vez)
  var activos = 0;

  function grosorPara(t, velocidad, presion) {
    // Más rápido = trazo más fino; con lápiz se usa la presión real
    var factorVel = Math.max(0.65, Math.min(1.1, 1.15 - velocidad * 0.14));
    var factorPres = presion > 0 && presion !== 0.5 ? 0.6 + presion * 0.9 : 1;
    var objetivo = GROSOR * factorVel * factorPres;
    t.grosor = t.grosor ? t.grosor * 0.8 + objetivo * 0.2 : objetivo;
    return t.grosor;
  }

  function crearHebras(grosor) {
    // Aproximadamente una hebra por píxel de grosor; un trazo fino es una sola hebra
    var n = Math.max(1, Math.round(grosor / 1.05));
    var hebras = [];
    for (var i = 0; i < n; i++) {
      hebras.push({
        pos: n === 1 ? 0 : i / (n - 1) - 0.5,     // de -0,5 a 0,5 del ancho
        carga: 0.78 + Math.random() * 0.22,
        deriva: (Math.random() - 0.5) * 0.03,
        // los bordes del trazo suelen ir algo más cargados que el centro
        borde: n > 2 && (i === 0 || i === n - 1) ? 0.08 : 0
      });
    }
    return hebras;
  }

  function grumo(x, y, r) {
    ctx.fillStyle = tinta(1, 0.82);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.7 + Math.random() * 0.3), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  function punto(e) {
    var caja = papel.getBoundingClientRect();
    return { x: e.clientX - caja.left, y: e.clientY - caja.top, t: e.timeStamp || Date.now() };
  }

  function empezar(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    try { papel.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    var p = punto(e);
    trazos[e.pointerId] = {
      prev: p, medio: p, inicio: p, grosor: 0, movido: false,
      hebras: crearHebras(GROSOR), nx: 0, ny: 0, quieto: 0
    };
    activos++;

    // Al apoyar la punta, la bolita suelta un poco de tinta
    var r = Math.max(0.6, GROSOR * 0.42);
    grumo(p.x, p.y, r);
    aplicarPoros(p.x, p.y, p.x, p.y, r + 2);
  }

  function mover(e) {
    var t = trazos[e.pointerId];
    if (!t) return;
    e.preventDefault();

    var lista = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    if (!lista || !lista.length) lista = [e];

    for (var i = 0; i < lista.length; i++) {
      var p = punto(lista[i]);
      var dx = p.x - t.prev.x;
      var dy = p.y - t.prev.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var dt = Math.max(1, p.t - t.prev.t);

      if (dist < 0.6) {
        // Boli casi parado: la tinta se acumula y acaba soltando un grumo
        t.quieto += dt;
        if (t.quieto > 160) {
          grumo(t.prev.x, t.prev.y, Math.max(0.6, t.grosor * 0.5));
          t.quieto = 0;
        }
        continue;
      }
      t.quieto = 0;
      if (Math.abs(p.x - t.inicio.x) + Math.abs(p.y - t.inicio.y) > 4) t.movido = true;

      var velocidad = dist / dt;                                 // px por ms
      var medio = { x: (t.prev.x + p.x) / 2, y: (t.prev.y + p.y) / 2 };
      var ancho = grosorPara(t, velocidad, lista[i].pressure);

      // Normal al trazo (suavizada) para repartir las hebras a lo ancho
      var nx = -dy / dist, ny = dx / dist;
      t.nx = t.nx ? t.nx * 0.65 + nx * 0.35 : nx;
      t.ny = t.ny ? t.ny * 0.65 + ny * 0.35 : ny;
      var ln = Math.sqrt(t.nx * t.nx + t.ny * t.ny) || 1;
      var ux = t.nx / ln, uy = t.ny / ln;

      // Ir rápido descarga menos tinta: un poco más claro y con más calvas
      var rapidez = Math.min(1, velocidad / 3);
      var n = t.hebras.length;
      var anchoHebra = n === 1 ? ancho : Math.max(0.85, (ancho / n) * 1.45);

      for (var k = 0; k < n; k++) {
        var h = t.hebras[k];
        // La carga cambia poco a poco (vetas) y a veces se queda corta (calvas)
        h.carga += h.deriva + (Math.random() - 0.5) * 0.05;
        h.deriva += (Math.random() - 0.5) * 0.008;
        h.deriva = Math.max(-0.04, Math.min(0.04, h.deriva));
        var minimo = n === 1 ? 0.8 : 0.35;
        if (h.carga < minimo) { h.carga = minimo; h.deriva = Math.abs(h.deriva); }
        if (h.carga > 1) { h.carga = 1; h.deriva = -Math.abs(h.deriva); }

        if (n > 1 && Math.random() < 0.006 + rapidez * 0.02) continue;   // microcalva

        var off = h.pos * ancho;
        ctx.strokeStyle = tinta(h.carga * (1 - rapidez * 0.15) + h.borde);
        ctx.lineWidth = anchoHebra;
        ctx.beginPath();
        ctx.moveTo(t.medio.x + ux * off, t.medio.y + uy * off);
        ctx.quadraticCurveTo(t.prev.x + ux * off, t.prev.y + uy * off, medio.x + ux * off, medio.y + uy * off);
        ctx.stroke();
      }

      // De vez en cuando, yendo lento, un grumo pequeño
      if (Math.random() < 0.01 * (1 - rapidez)) {
        grumo(medio.x + ux * (Math.random() - 0.5) * ancho * 0.6,
              medio.y + uy * (Math.random() - 0.5) * ancho * 0.6,
              Math.max(0.5, ancho * 0.28));
      }

      aplicarPoros(t.medio.x, t.medio.y, medio.x, medio.y, ancho + 2);

      t.medio = medio;
      t.prev = p;
    }
  }

  // Pasa la capa del trazo al papel: multiplicar = la tinta se oscurece al cruzarse
  function imprimir() {
    ctxPapel.save();
    ctxPapel.setTransform(1, 0, 0, 1, 0, 0);
    ctxPapel.globalCompositeOperation = "multiply";
    ctxPapel.globalAlpha = 0.93;
    ctxPapel.drawImage(capa, 0, 0);
    ctxPapel.restore();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, capa.width, capa.height);
    ctx.restore();
  }

  function terminar(e) {
    var t = trazos[e.pointerId];
    if (!t) return;
    delete trazos[e.pointerId];
    activos = Math.max(0, activos - 1);
    if (activos === 0) imprimir();

    // Un toque sin arrastrar sobre un enlace o botón: se deja pasar el clic
    if (!t.movido && e.type === "pointerup") {
      papel.style.pointerEvents = "none";
      var debajo = document.elementFromPoint(e.clientX, e.clientY);
      papel.style.pointerEvents = "";
      var destino = debajo && debajo.closest("a, button");
      if (destino) destino.click();
    }
  }

  papel.addEventListener("pointerdown", empezar);
  papel.addEventListener("pointermove", mover);
  papel.addEventListener("pointerup", terminar);
  papel.addEventListener("pointercancel", terminar);
  papel.addEventListener("lostpointercapture", terminar);

  /* --- Controles --- */

  // Barra de grosor: cambia el diámetro del trazo, la muestra y el cursor
  var barra = document.getElementById("boli-grosor");
  var muestra = document.getElementById("boli-grosor-punto");

  function cursorPara(d) {
    var lado = Math.max(12, Math.ceil(d) + 8);
    var c = lado / 2;
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + lado + "' height='" + lado + "'>" +
      "<circle cx='" + c + "' cy='" + c + "' r='" + Math.max(1, d / 2) + "' fill='%231630a0' fill-opacity='.85'/>" +
      "<circle cx='" + c + "' cy='" + c + "' r='" + (Math.max(1, d / 2) + 3) + "' fill='none' stroke='%231630a0' stroke-opacity='.35'/></svg>";
    return 'url("data:image/svg+xml,' + svg.replace(/</g, "%3C").replace(/>/g, "%3E") + '") ' + c + " " + c + ", crosshair";
  }

  function aplicarGrosor() {
    GROSOR = parseFloat(barra.value) || 1.4;
    if (muestra) {
      muestra.style.width = GROSOR + "px";
      muestra.style.height = GROSOR + "px";
    }
    papel.style.cursor = cursorPara(GROSOR);
  }

  if (barra) {
    barra.addEventListener("input", aplicarGrosor);
    aplicarGrosor();
  }

  var borrar = document.getElementById("boli-borrar");
  if (borrar) {
    borrar.addEventListener("click", function () {
      [ctxPapel, ctx].forEach(function (c) {
        c.save();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, c.canvas.width, c.canvas.height);
        c.restore();
      });
    });
  }

  var guardar = document.getElementById("boli-guardar");
  if (guardar) {
    guardar.addEventListener("click", function () {
      // Se exporta sobre fondo blanco, como una hoja de papel
      var hoja = document.createElement("canvas");
      hoja.width = papel.width;
      hoja.height = papel.height;
      var h = hoja.getContext("2d");
      h.fillStyle = "#ffffff";
      h.fillRect(0, 0, hoja.width, hoja.height);
      h.drawImage(papel, 0, 0);
      var enlace = document.createElement("a");
      enlace.download = "creme-bureau-playground.png";
      enlace.href = hoja.toDataURL("image/png");
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    });
  }
})();
