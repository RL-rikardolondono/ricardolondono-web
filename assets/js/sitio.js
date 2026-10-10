(function () {
  // Menú del celular
  var boton = document.querySelector('.menu-boton'), menu = document.getElementById('menu');
  if (boton && menu) {
    boton.addEventListener('click', function () {
      var abierto = menu.classList.toggle('abierto');
      boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) { if (e.target.tagName === 'A') { menu.classList.remove('abierto'); boton.setAttribute('aria-expanded', 'false'); } });
  }

  // Filtros de publicaciones
  var filtros = document.querySelectorAll('.filtro');
  filtros.forEach(function (f) {
    f.addEventListener('click', function () {
      var cat = f.getAttribute('data-filtro');
      filtros.forEach(function (x) { x.setAttribute('aria-pressed', x === f ? 'true' : 'false'); });
      document.querySelectorAll('#lista-publicaciones .tarjeta').forEach(function (t) {
        t.style.display = !cat || t.getAttribute('data-categoria') === cat ? '' : 'none';
      });
    });
  });

  // Visor de fotos
  var enlaces = Array.prototype.slice.call(document.querySelectorAll('.galeria__foto, .galeria__foto-portada'));
  if (!enlaces.length) return;
  var visor = document.createElement('div');
  visor.className = 'visor';
  visor.setAttribute('role', 'dialog');
  visor.setAttribute('aria-label', 'Foto ampliada');
  visor.innerHTML = '<img alt=""><button class="visor__cerrar" aria-label="Cerrar">×</button><button class="visor__ant" aria-label="Anterior">‹</button><button class="visor__sig" aria-label="Siguiente">›</button>';
  document.body.appendChild(visor);
  var img = visor.querySelector('img'), actual = 0;
  function mostrar(i) { actual = (i + enlaces.length) % enlaces.length; img.src = enlaces[actual].getAttribute('href'); img.alt = (enlaces[actual].querySelector('img') || {}).alt || ''; visor.classList.add('abierto'); }
  function cerrar() { visor.classList.remove('abierto'); }
  enlaces.forEach(function (a, i) { a.addEventListener('click', function (e) { e.preventDefault(); mostrar(i); }); });
  visor.querySelector('.visor__cerrar').onclick = cerrar;
  visor.querySelector('.visor__ant').onclick = function () { mostrar(actual - 1); };
  visor.querySelector('.visor__sig').onclick = function () { mostrar(actual + 1); };
  visor.addEventListener('click', function (e) { if (e.target === visor) cerrar(); });
  document.addEventListener('keydown', function (e) {
    if (!visor.classList.contains('abierto')) return;
    if (e.key === 'Escape') cerrar(); else if (e.key === 'ArrowLeft') mostrar(actual - 1); else if (e.key === 'ArrowRight') mostrar(actual + 1);
  });
})();
