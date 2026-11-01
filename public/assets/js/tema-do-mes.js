(function () {
  var root = document.getElementById('tema-do-mes');
  if (!root) return;
  var meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var now = new Date();
  var atual = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2);

  fetch('/assets/data/tema-do-mes.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (d) {
      var lista = (d.temas || []).filter(function (x) { return x.mes <= atual; })
        .sort(function (a, b) { return a.mes < b.mes ? 1 : -1; });
      var tema = lista[0];
      if (!tema) return;
      var mes = meses[parseInt(tema.mes.slice(5, 7), 10) - 1] || '';
      root.querySelector('[data-tema-mes]').textContent = 'Tema de ' + mes;
      root.querySelector('[data-tema-titulo]').textContent = tema.titulo;
      root.querySelector('[data-tema-texto]').textContent = '“' + tema.texto + '”';
      root.querySelector('[data-tema-ref]').textContent = tema.referencia;
    })
    .catch(function () { /* mantém o tema já escrito na página */ });
})();
