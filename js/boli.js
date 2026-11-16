// Creme Bureau — Playground: dibujar como con un boli Bic
// Ratón (manteniendo pulsado), dedo o lápiz. El lienzo cubre toda la pantalla.
//
// Cómo se imita la tinta de bolígrafo:
// · Dos capas: el trazo en curso se pinta en una capa propia (opaca, sin marcas en
//   las uniones). Al levantar la punta se "imprime" sobre el papel en modo
//   multiplicar, así la tinta se oscurece donde se cruza con trazos anteriores.
// · Vetas: el trazo son varias hebras finas paralelas (la bolita deja rayitas). Cada
//   hebra lleva su propia carga de tinta, que cambia poco a poco y a veces se seca.
// · Cuerpo liso: debajo de las vetas hay un trazo continuo de ancho completo, así
//   el borde es suave y no hace escalones en las curvas.
// · Grano: al levantar la punta, un grano fino de intensidades variables "come"
//   un poco de tinta, como el papel al absorberla (borde ligeramente irregular).
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
  // Pantalla táctil (móvil, tableta): se ajusta la tinta para que el trazo salga nítido
  var TACTIL = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  /* --- Tamaño (nítido en retina; conserva el dibujo al redimensionar) --- */
  function redimensionar(c, conservar, dprAnterior) {
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
    if (copia) {
      // Si cambia la densidad (zoom), el dibujo se reescala para seguir en su sitio
      var k = dpr / (dprAnterior || dpr);
      c.getContext("2d").drawImage(copia, 0, 0, copia.width * k, copia.height * k);
      copia.width = copia.height = 0;          // libera memoria (importante en iPhone)
    }
  }

  // Densidad real de píxeles, contando el zoom con los dedos (si no, el lienzo
  // se estiraría y el trazo se vería borroso en el móvil)
  function densidad() {
    var zoom = window.visualViewport ? window.visualViewport.scale || 1 : 1;
    return Math.min((window.devicePixelRatio || 1) * Math.max(1, zoom), 4);
  }

  function ajustar() {
    var dprAnterior = dpr;
    dpr = densidad();
    redimensionar(papel, true, dprAnterior);
    redimensionar(capa, false);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    poros = null;
  }

  ajustar();
  var esperaResize = null;
  function alRedimensionar() {
    clearTimeout(esperaResize);
    esperaResize = setTimeout(function () {
      // En iPhone la barra de Safari cambia el alto a menudo: solo se rehace si hace falta
      var w = Math.round(window.innerWidth * densidad());
      var h = Math.round(window.innerHeight * densidad());
      if (w !== papel.width || h !== papel.height) ajustar();
    }, 120);
  }
  window.addEventListener("resize", alRedimensionar);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", alRedimensionar);

  /* --- Grano del papel: cuánta tinta "se come" cada punto (fijo en la hoja) --- */
  function crearGrano() {
    var lado = 192;
    var c = document.createElement("canvas");
    c.width = c.height = lado;
    var g = c.getContext("2d");
    var datos = g.createImageData(lado, lado);
    for (var i = 0; i < datos.data.length; i += 4) {
      var r = Math.random();
      var a = 0;
      if (TACTIL) {
        // En móvil: grano muy fino y escaso (un punto físico), nítido
        if (r < 0.022) a = 0.3 + Math.random() * 0.25;
        else if (r < 0.14) a = 0.05 + Math.random() * 0.1;
      } else if (r < 0.04) a = 0.55 + Math.random() * 0.3; // poro: casi sin tinta
      else if (r < 0.3) a = 0.08 + Math.random() * 0.22;   // fibra: un poco menos de tinta
      datos.data[i + 3] = Math.round(a * 255);
    }
    g.putImageData(datos, 0, 0);
    var patron = ctx.createPattern(c, "repeat");
    // En pantallas muy densas (móvil 3x) un grano de 1 píxel físico es tan fino que
    // se ve como neblina: se agranda para que tenga el mismo aspecto que en el ordenador.
    // Escala entera (1 o 2) y sin suavizado: puntos nítidos, nunca difuminados
    var escala = 1;                                // un punto físico: grano muy fino
    if (escala > 1 && patron.setTransform && window.DOMMatrix) patron.setTransform(new DOMMatrix().scale(escala));
    return patron;
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
    // Pocas hebras y muy parecidas entre sí: en un Bic de verdad la tinta es densa,
    // solo con una ligera variación interna (sin rayas marcadas a lo largo del trazo)
    var n = grosor <= 2.2 ? 1 : Math.max(2, Math.round(grosor / 2.6));
    var hebras = [];
    for (var i = 0; i < n; i++) {
      hebras.push({
        pos: n === 1 ? 0 : i / (n - 1) - 0.5,     // de -0,5 a 0,5 del ancho
        carga: 0.8 + Math.random() * 0.2,
        deriva: (Math.random() - 0.5) * 0.03,
        borde: 0,
        x: null, y: null                            // dónde terminó su último tramo
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
      hebras: crearHebras(GROSOR), nx: 0, ny: 0, quieto: 0,
      tactil: e.pointerType !== "mouse"            // dedo o lápiz: se pinta más rápido
    };
    activos++;

    // Al apoyar la punta, la bolita suelta un poco de tinta
    grumo(p.x, p.y, Math.max(0.6, GROSOR * 0.42));
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
      // Con el dedo se va más rápido sin querer: la velocidad aclara mucho menos la tinta
      var rapidez = Math.min(1, velocidad / (t.tactil ? 7 : 3));
      var carga = t.tactil ? 1.06 : 1;              // tinta más cargada en táctil: trazo más nítido
      var n = t.hebras.length;

      // Cuerpo: tinta densa y continua de ancho completo, con borde liso.
      // Se pinta POR DETRÁS de lo ya dibujado para no tapar el tramo anterior.
      var fino = n === 1;
      ctx.globalCompositeOperation = fino ? "source-over" : "destination-over";
      // La carga general del boli varía despacio a lo largo del trazo
      t.flujo = (t.flujo || 0.95) + (Math.random() - 0.5) * 0.03;
      t.flujo = Math.max(0.84, Math.min(1, t.flujo));
      ctx.strokeStyle = tinta((fino ? t.hebras[0].carga : t.flujo) * carga * (1 - rapidez * 0.1));
      ctx.lineWidth = fino ? ancho : ancho * (0.95 + Math.random() * 0.1);   // el grosor respira
      ctx.beginPath();
      ctx.moveTo(t.medio.x, t.medio.y);
      ctx.quadraticCurveTo(t.prev.x, t.prev.y, medio.x, medio.y);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";

      if (!fino) {
        // Variación interna muy sutil: zonas un poco más claras u oscuras que cambian
        // despacio, solapadas para que no se lean como líneas
        var anchoHebra = (ancho / n) * 1.9;
        var util = Math.max(0, ancho - anchoHebra);
        ctx.lineCap = "butt";
        ctx.globalAlpha = 0.62;
        for (var k = 0; k < n; k++) {
          var h = t.hebras[k];
          h.carga += h.deriva + (Math.random() - 0.5) * 0.02;
          h.deriva += (Math.random() - 0.5) * 0.006;
          h.deriva = Math.max(-0.025, Math.min(0.025, h.deriva));
          if (h.carga < 0.72) { h.carga = 0.72; h.deriva = Math.abs(h.deriva); }
          if (h.carga > 1) { h.carga = 1; h.deriva = -Math.abs(h.deriva); }

          var off = h.pos * util;
          var finX = medio.x + ux * off, finY = medio.y + uy * off;
          var iniX = h.x === null ? t.medio.x + ux * off : h.x;
          var iniY = h.y === null ? t.medio.y + uy * off : h.y;
          h.x = finX; h.y = finY;

          ctx.strokeStyle = tinta(h.carga * carga * (1 - rapidez * 0.1));
          ctx.lineWidth = anchoHebra;
          ctx.beginPath();
          ctx.moveTo(iniX, iniY);
          ctx.quadraticCurveTo(t.prev.x + ux * off, t.prev.y + uy * off, finX, finY);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Manchitas: zonas pequeñas un poco más claras o más cargadas, como la tinta
        // irregular de un bolígrafo
        if (Math.random() < 0.4) {
          var claro = Math.random() < 0.55;
          var rr = ancho * (0.12 + Math.random() * 0.22);
          var desv = (Math.random() - 0.5) * (ancho - rr * 2);
          ctx.globalAlpha = claro ? 0.24 : 0.22;
          ctx.fillStyle = claro ? tinta(0.62 + Math.random() * 0.12) : tinta(1, 0.84);
          ctx.beginPath();
          ctx.ellipse(medio.x + ux * desv, medio.y + uy * desv, rr * (2.2 + Math.random() * 1.6), rr * 0.8,
                      Math.atan2(uy, ux) + Math.PI / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Bordes: en el bolígrafo la tinta se acumula en los cantos del trazo,
        // que quedan nítidos y un poco más oscuros
        var canto = Math.min(1.1, Math.max(0.55, ancho * 0.09));
        var r = ancho / 2 - canto / 2;
        ctx.strokeStyle = tinta(1, 0.86);
        ctx.lineWidth = canto;
        for (var lado = -1; lado <= 1; lado += 2) {
          var bx = ux * r * lado, by = uy * r * lado;
          var clave = lado < 0 ? "bordeA" : "bordeB";
          var ix = t[clave] ? t[clave].x : t.medio.x + bx, iy = t[clave] ? t[clave].y : t.medio.y + by;
          var fx = medio.x + bx, fy = medio.y + by;
          t[clave] = { x: fx, y: fy };
          ctx.beginPath();
          ctx.moveTo(ix, iy);
          ctx.quadraticCurveTo(t.prev.x + bx, t.prev.y + by, fx, fy);
          ctx.stroke();
        }
        ctx.lineCap = "round";
      }

      // De vez en cuando, yendo lento, un grumo pequeño
      if (Math.random() < 0.01 * (1 - rapidez)) {
        grumo(medio.x + ux * (Math.random() - 0.5) * ancho * 0.6,
              medio.y + uy * (Math.random() - 0.5) * ancho * 0.6,
              Math.max(0.5, ancho * 0.28));
      }

      t.medio = medio;
      t.prev = p;
    }
  }

  // Pasa la capa del trazo al papel: multiplicar = la tinta se oscurece al cruzarse
  function imprimir() {
    // El papel absorbe la tinta: grano fino aplicado una sola vez al trazo terminado.
    // Se aplica en puntos nítidos (sin suavizado) para no difuminar el borde.
    {
      if (!poros) poros = crearGrano();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-out";
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = poros;
      ctx.fillRect(0, 0, capa.width, capa.height);
      ctx.restore();
    }

    ctxPapel.save();
    ctxPapel.setTransform(1, 0, 0, 1, 0, 0);
    ctxPapel.globalCompositeOperation = "multiply";
    ctxPapel.imageSmoothingEnabled = false;      // copia píxel a píxel, sin suavizar
    ctxPapel.globalAlpha = TACTIL ? 1 : 0.93;
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

  /* --- Guardar: como foto (PNG) o como PDF --- */

  // Hoja con fondo blanco recortada al dibujo (con margen), como una hoja de papel
  function hojaDelDibujo() {
    var w = papel.width, h = papel.height;
    var datos = ctxPapel.getImageData(0, 0, w, h).data;
    var x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y += 2) {
      for (var x = 0; x < w; x += 2) {
        if (datos[(y * w + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }     // hoja vacía: todo
    var m = Math.round(40 * dpr);
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m);
    x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
    var hoja = document.createElement("canvas");
    hoja.width = x1 - x0 + 1;
    hoja.height = y1 - y0 + 1;
    var c = hoja.getContext("2d");
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, hoja.width, hoja.height);
    c.drawImage(papel, x0, y0, hoja.width, hoja.height, 0, 0, hoja.width, hoja.height);
    return hoja;
  }

  function descargar(blob, nombre) {
    var url = URL.createObjectURL(blob);
    var enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function dataURLaBytes(url) {
    var bin = atob(url.split(",")[1]);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  // PDF mínimo de una página con la imagen en JPEG (sin librerías externas)
  function crearPDF(hoja) {
    var jpg = dataURLaBytes(hoja.toDataURL("image/jpeg", 0.95));
    var anchoPt = hoja.width / dpr * 0.75;     // px de pantalla a puntos (72 ppp)
    var altoPt = hoja.height / dpr * 0.75;
    var partes = [], desplaz = [], total = 0;
    function poner(x) {
      if (typeof x === "string") { var b = new Uint8Array(x.length); for (var i = 0; i < x.length; i++) b[i] = x.charCodeAt(i) & 255; x = b; }
      partes.push(x); total += x.length;
    }
    function objeto(n, cuerpo) { desplaz[n] = total; poner(n + " 0 obj\n" + cuerpo + "\nendobj\n"); }
    var dibujo = "q " + anchoPt.toFixed(2) + " 0 0 " + altoPt.toFixed(2) + " 0 0 cm /Im0 Do Q";

    poner("%PDF-1.4\n%âãÏÓ\n");
    objeto(1, "<< /Type /Catalog /Pages 2 0 R >>");
    objeto(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    objeto(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + anchoPt.toFixed(2) + " " + altoPt.toFixed(2) + "] " +
              "/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");
    desplaz[4] = total;
    poner("4 0 obj\n<< /Type /XObject /Subtype /Image /Width " + hoja.width + " /Height " + hoja.height +
          " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpg.length + " >>\nstream\n");
    poner(jpg);
    poner("\nendstream\nendobj\n");
    objeto(5, "<< /Length " + dibujo.length + " >>\nstream\n" + dibujo + "\nendstream");
    var xref = total;
    var tabla = "xref\n0 6\n0000000000 65535 f \n";
    for (var n = 1; n <= 5; n++) tabla += ("0000000000" + desplaz[n]).slice(-10) + " 00000 n \n";
    poner(tabla + "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");
    return new Blob(partes, { type: "application/pdf" });
  }

  // "Guardar dibu" abre un pequeño menú con las dos opciones: Foto o PDF
  var botonGuardar = document.getElementById("boli-guardar");
  var menuGuardar = document.getElementById("boli-guardar-menu");

  function menuAbierto(abrir) {
    if (!botonGuardar || !menuGuardar) return;
    menuGuardar.hidden = !abrir;
    botonGuardar.setAttribute("aria-expanded", abrir ? "true" : "false");
  }

  if (botonGuardar && menuGuardar) {
    botonGuardar.addEventListener("click", function (e) {
      e.stopPropagation();
      menuAbierto(menuGuardar.hidden);
    });
    menuGuardar.addEventListener("click", function () { menuAbierto(false); });
    document.addEventListener("click", function (e) {
      if (!menuGuardar.hidden && !e.target.closest(".boli-guardar")) menuAbierto(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") menuAbierto(false);
    });
  }

  var guardarFoto = document.getElementById("boli-guardar-foto");
  if (guardarFoto) {
    guardarFoto.addEventListener("click", function () {
      hojaDelDibujo().toBlob(function (blob) {
        if (blob) descargar(blob, "creme-bureau-dibujo.png");
      }, "image/png");
    });
  }

  var guardarPdf = document.getElementById("boli-guardar-pdf");
  if (guardarPdf) {
    guardarPdf.addEventListener("click", function () {
      descargar(crearPDF(hojaDelDibujo()), "creme-bureau-dibujo.pdf");
    });
  }
})();
