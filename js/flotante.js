// Creme Bureau — Moi: la foto flota por la pantalla y rebota en los bordes
// (como un salvapantallas). Si el ratón (o el dedo) se acerca, la foto "huye":
// recibe un empujón en dirección contraria, sale disparada y frena poco a poco
// hasta volver a su velocidad tranquila.
(function () {
  "use strict";

  var foto = document.querySelector(".flotante");
  if (!foto) return;

  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BASE = 70;             // velocidad de crucero, px por segundo
  var MAXIMA = 1100;         // velocidad máxima al huir
  var EMPUJE = 5200;         // fuerza del empujón (px/s²) cuando el cursor está encima
  var FRENADO = 1.4;         // cuánto tarda en volver a la calma (mayor = antes)

  var x = 0, y = 0;          // posición (esquina superior izquierda)
  var vx = 0, vy = 0;        // velocidad en px/s
  var cursor = null;         // última posición del ratón o del dedo
  var anterior = null;

  function limites() {
    return {
      w: Math.max(0, window.innerWidth - foto.offsetWidth),
      h: Math.max(0, window.innerHeight - foto.offsetHeight)
    };
  }

  function colocar() {
    foto.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
  }

  function base() {
    return window.innerWidth < 640 ? BASE * 0.6 : BASE;
  }

  function empezar() {
    var l = limites();
    x = Math.random() * l.w;
    y = Math.random() * l.h;
    var angulo = (0.2 + Math.random() * 0.35) * Math.PI;   // evita ángulos muy planos
    vx = Math.cos(angulo) * base() * (Math.random() < 0.5 ? -1 : 1);
    vy = Math.sin(angulo) * base() * (Math.random() < 0.5 ? -1 : 1);
    colocar();
    foto.classList.add("flotante--lista");
    if (!reducido) requestAnimationFrame(paso);
  }

  function paso(t) {
    if (anterior === null) anterior = t;
    var dt = Math.min(0.05, (t - anterior) / 1000);   // si la pestaña estuvo oculta, no salta
    anterior = t;

    var w = foto.offsetWidth, h = foto.offsetHeight;

    // Empujón: cuanto más cerca está el cursor del centro de la foto, más fuerte
    if (cursor) {
      var cx = x + w / 2, cy = y + h / 2;
      var dx = cx - cursor.x, dy = cy - cursor.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      var radio = Math.max(w, h) * 0.75 + 70;
      if (d < radio) {
        var fuerza = EMPUJE * Math.pow(1 - d / radio, 1.5);
        vx += (dx / d) * fuerza * dt;
        vy += (dy / d) * fuerza * dt;
      }
    }

    // Velocidad: tope máximo y frenado suave hasta la velocidad de crucero
    var v = Math.sqrt(vx * vx + vy * vy) || 0.01;
    var objetivo = base();
    var nueva = v > objetivo ? objetivo + (v - objetivo) * Math.exp(-FRENADO * dt) : objetivo;
    nueva = Math.min(nueva, MAXIMA);
    vx = vx / v * nueva;
    vy = vy / v * nueva;

    x += vx * dt;
    y += vy * dt;

    // Rebote en los bordes
    var l = limites();
    if (x <= 0) { x = 0; vx = Math.abs(vx); }
    if (x >= l.w) { x = l.w; vx = -Math.abs(vx); }
    if (y <= 0) { y = 0; vy = Math.abs(vy); }
    if (y >= l.h) { y = l.h; vy = -Math.abs(vy); }

    colocar();
    requestAnimationFrame(paso);
  }

  // Posición del ratón (o del dedo mientras toca la pantalla)
  window.addEventListener("pointermove", function (e) {
    cursor = { x: e.clientX, y: e.clientY };
  }, { passive: true });
  window.addEventListener("pointerdown", function (e) {
    cursor = { x: e.clientX, y: e.clientY };
  }, { passive: true });
  window.addEventListener("pointerup", function (e) {
    if (e.pointerType !== "mouse") cursor = null;   // al levantar el dedo deja de empujar
  });
  document.addEventListener("pointerleave", function () { cursor = null; });
  window.addEventListener("blur", function () { cursor = null; });

  // Si cambia el tamaño de la ventana, la foto vuelve dentro de los límites
  window.addEventListener("resize", function () {
    var l = limites();
    x = Math.min(x, l.w);
    y = Math.min(y, l.h);
    colocar();
  });

  var img = foto.querySelector("img");
  if (img && !img.complete) {
    img.addEventListener("load", empezar);
    img.addEventListener("error", empezar);
  } else {
    empezar();
  }
})();
