(function () {
  var form = document.getElementById('prayer-form');
  if (!form) return;
  var number = (form.getAttribute('data-whatsapp') || '').replace(/\D/g, '');
  var name = document.getElementById('prayer-name');
  var anon = document.getElementById('prayer-anon');
  var topic = document.getElementById('prayer-topic');
  var request = document.getElementById('prayer-request');
  var count = document.getElementById('prayer-count');
  var status = document.getElementById('prayer-status');

  function updateCount() { count.textContent = request.value.length + ' / ' + request.maxLength; }
  function updateAnon() {
    name.disabled = anon.checked;
    if (anon.checked) name.value = '';
  }
  function showStatus(html, isError) {
    status.className = 'prayer-status' + (isError ? ' error' : ' ok');
    status.innerHTML = html;
  }

  request.addEventListener('input', updateCount);
  anon.addEventListener('change', updateAnon);
  updateCount();
  updateAnon();

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var text = request.value.replace(/\s+\n/g, '\n').trim();
    if (text.length < 10) {
      showStatus('Escreva seu pedido com pelo menos 10 caracteres.', true);
      request.focus();
      return;
    }
    var who = anon.checked || !name.value.trim() ? 'Prefiro não me identificar' : name.value.trim();
    var message = 'Olá, Pastor Elton! Gostaria de deixar um pedido de oração pelo site da igreja.\n\n'
      + 'Nome: ' + who + '\n'
      + 'Assunto: ' + topic.value + '\n\n'
      + 'Pedido: ' + text;
    var url = 'https://wa.me/' + number + '?text=' + encodeURIComponent(message);
    window.open(url, '_blank', 'noopener');
    showStatus('Abrimos o WhatsApp com a sua mensagem pronta. É só tocar em enviar. '
      + 'Se não abriu, <a href="' + url + '" target="_blank" rel="noopener noreferrer">toque aqui para abrir o WhatsApp</a>.', false);
  });
})();
