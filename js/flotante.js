// Creme Bureau — Moi: la foto flota por la pantalla y rebota en los bordes
// (como un salvapantallas). Se queda fija en la pantalla mientras la página se
// desplaza por detrás. Al pasar el cursor por encima se detiene.
(function () {
  "use strict";

  var foto = document.querySelector(".flotante");
  if (!foto) return;

  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var VELOCIDAD = 70;        // píxeles por segundo
  var x = 0, y = 0;
  var vx = 1, vy = 1;
  var parado = false;
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

  function empezar() {
    var l = limites();
    // Punto de partida y dirección aleatorios
    x = Math.random() * l.w;
    y = Math.random() * l.h;
    var angulo = (0.2 + Math.random() * 0.35) * Math.PI;   // evita ángulos muy planos
    vx = Math.cos(angulo) * (Math.random() < 0.5 ? -1 : 1);
    vy = Math.sin(angulo) * (Math.random() < 0.5 ? -1 : 1);
    colocar();
    foto.classList.add("flotante--lista");
    if (!reducido) requestAnimationFrame(paso);
  }

  function paso(t) {
    if (anterior === null) anterior = t;
    var dt = Math.min(0.05, (t - anterior) / 1000);   // si la pestaña estuvo oculta, no salta
    anterior = t;

    if (!parado) {
      var l = limites();
      var vel = window.innerWidth < 640 ? VELOCIDAD * 0.6 : VELOCIDAD;
      x += vx * vel * dt;
      y += vy * vel * dt;
      if (x <= 0) { x = 0; vx = Math.abs(vx); }
      if (x >= l.w) { x = l.w; vx = -Math.abs(vx); }
      if (y <= 0) { y = 0; vy = Math.abs(vy); }
      if (y >= l.h) { y = l.h; vy = -Math.abs(vy); }
      colocar();
    }
    requestAnimationFrame(paso);
  }

  foto.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") parado = true; });
  foto.addEventListener("pointerleave", function () { parado = false; });

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
