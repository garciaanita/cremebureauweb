// Creme Bureau — Playground: dibujar como con un boli Bic
// Ratón (manteniendo pulsado), dedo o lápiz. El lienzo cubre toda la pantalla.
(function () {
  "use strict";

  var lienzo = document.getElementById("boli-lienzo");
  if (!lienzo || !lienzo.getContext) return;
  var ctx = lienzo.getContext("2d");

  /* Tinta azul Bic: un azul profundo con ligeras variaciones de tono */
  var TINTA = [22, 48, 150];
  var GROSOR = 1.4;       // grosor base en px; lo cambia la barra "Grosor"
  var dpr = 1;

  /* --- Tamaño del lienzo (nítido en pantallas retina, conserva el dibujo al redimensionar) --- */
  function ajustar() {
    var anterior = null;
    if (lienzo.width && lienzo.height) {
      anterior = document.createElement("canvas");
      anterior.width = lienzo.width;
      anterior.height = lienzo.height;
      anterior.getContext("2d").drawImage(lienzo, 0, 0);
    }
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    var w = window.innerWidth;
    var h = window.innerHeight;
    lienzo.width = Math.round(w * dpr);
    lienzo.height = Math.round(h * dpr);
    lienzo.style.width = w + "px";
    lienzo.style.height = h + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (anterior) ctx.drawImage(anterior, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  ajustar();
  var esperaResize = null;
  window.addEventListener("resize", function () {
    clearTimeout(esperaResize);
    esperaResize = setTimeout(ajustar, 120);
  });

  /* --- Trazo --- */
  var trazos = {};          // un trazo por puntero (varios dedos a la vez)

  function colorTinta(ancho) {
    // Pequeña variación de tono y opacidad: la tinta de bolígrafo nunca es plana.
    // En trazos gordos la variación es menor para que no salgan "cuentas" oscuras.
    var fino = !ancho || ancho <= 2.5;
    var v = Math.round((Math.random() - 0.5) * (fino ? 18 : 8));
    var a = fino ? 0.82 + Math.random() * 0.14 : 1;
    return "rgba(" + (TINTA[0] + v) + "," + (TINTA[1] + v) + "," + (TINTA[2] + v) + "," + a.toFixed(2) + ")";
  }

  function grosorPara(t, velocidad, presion) {
    // Más rápido = trazo más fino; con lápiz se usa la presión real
    var factorVel = Math.max(0.55, Math.min(1.15, 1.2 - velocidad * 0.18));
    var factorPres = presion > 0 && presion !== 0.5 ? 0.6 + presion * 0.9 : 1;
    var objetivo = GROSOR * factorVel * factorPres;
    // Suavizado para que el grosor no salte de golpe
    t.grosor = t.grosor ? t.grosor * 0.7 + objetivo * 0.3 : objetivo;
    return t.grosor * (0.92 + Math.random() * 0.16);
  }

  function punto(e) {
    var caja = lienzo.getBoundingClientRect();
    return { x: e.clientX - caja.left, y: e.clientY - caja.top, t: e.timeStamp || Date.now() };
  }

  function empezar(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    try { lienzo.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    var p = punto(e);
    trazos[e.pointerId] = { prev: p, medio: p, inicio: p, grosor: 0, movido: false };

    // Pequeña gota de tinta al apoyar la punta
    ctx.globalCompositeOperation = GROSOR <= 2.5 ? "multiply" : "source-over";
    ctx.fillStyle = colorTinta(GROSOR);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.6, GROSOR * 0.42), 0, Math.PI * 2);
    ctx.fill();
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
      if (dist < 0.6) continue;
      if (Math.abs(p.x - t.inicio.x) + Math.abs(p.y - t.inicio.y) > 4) t.movido = true;

      var dt = Math.max(1, p.t - t.prev.t);
      var velocidad = dist / dt;                       // px por ms
      var medio = { x: (t.prev.x + p.x) / 2, y: (t.prev.y + p.y) / 2 };

      var ancho = grosorPara(t, velocidad, lista[i].pressure);
      // Trazo fino: la tinta se oscurece al cruzarse (multiply). Trazo gordo: tinta uniforme.
      ctx.globalCompositeOperation = ancho <= 2.5 ? "multiply" : "source-over";
      ctx.strokeStyle = colorTinta(ancho);
      ctx.lineWidth = ancho;
      ctx.beginPath();
      ctx.moveTo(t.medio.x, t.medio.y);
      ctx.quadraticCurveTo(t.prev.x, t.prev.y, medio.x, medio.y);
      ctx.stroke();

      t.medio = medio;
      t.prev = p;
    }
  }

  function terminar(e) {
    var t = trazos[e.pointerId];
    if (!t) return;
    delete trazos[e.pointerId];

    // Un toque sin arrastrar sobre un enlace o botón: se deja pasar el clic
    if (!t.movido && e.type === "pointerup") {
      lienzo.style.pointerEvents = "none";
      var debajo = document.elementFromPoint(e.clientX, e.clientY);
      lienzo.style.pointerEvents = "";
      var destino = debajo && debajo.closest("a, button");
      if (destino) destino.click();
    }
  }

  lienzo.addEventListener("pointerdown", empezar);
  lienzo.addEventListener("pointermove", mover);
  lienzo.addEventListener("pointerup", terminar);
  lienzo.addEventListener("pointercancel", terminar);
  lienzo.addEventListener("lostpointercapture", terminar);

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
    lienzo.style.cursor = cursorPara(GROSOR);
  }

  if (barra) {
    barra.addEventListener("input", aplicarGrosor);
    aplicarGrosor();
  }
  var borrar = document.getElementById("boli-borrar");
  if (borrar) {
    borrar.addEventListener("click", function () {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
      ctx.restore();
    });
  }

  var guardar = document.getElementById("boli-guardar");
  if (guardar) {
    guardar.addEventListener("click", function () {
      // Se exporta sobre fondo blanco, como una hoja de papel
      var hoja = document.createElement("canvas");
      hoja.width = lienzo.width;
      hoja.height = lienzo.height;
      var h = hoja.getContext("2d");
      h.fillStyle = "#ffffff";
      h.fillRect(0, 0, hoja.width, hoja.height);
      h.drawImage(lienzo, 0, 0);
      var enlace = document.createElement("a");
      enlace.download = "creme-bureau-playground.png";
      enlace.href = hoja.toDataURL("image/png");
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    });
  }
})();
