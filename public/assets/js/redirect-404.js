(function () {
  var seconds = 4;
  var count = document.getElementById('count');
  var note = document.getElementById('redirect-note');
  var cancel = document.getElementById('cancel');
  var box = document.querySelector('.redirect-bar');
  var timer = setInterval(function () {
    seconds -= 1;
    if (seconds <= 0) {
      clearInterval(timer);
      window.location.replace('/');
      return;
    }
    count.textContent = seconds;
  }, 1000);
  cancel.addEventListener('click', function () {
    clearInterval(timer);
    box.classList.add('stopped');
    note.textContent = 'Redirecionamento cancelado. Use os botões abaixo para continuar navegando.';
    cancel.hidden = true;
  });
})();
