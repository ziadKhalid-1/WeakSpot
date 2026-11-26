// Plan B app: three screens switched by the URL hash (#/, #/detail/1, #/action).
(function () {
  var LOCALE = 'ar-SA-u-ca-gregory'; // Arabic-Indic digits, Gregorian calendar: same as web/src/lib/format.js
  var money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'SAR' });
  var num = new Intl.NumberFormat(LOCALE);
  var day = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
  var data = window.MOCK;
  var root = document.getElementById('screen');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Codes with dashes stay LTR, or the RTL page shows 4471-22-0098 as 0098-22-4471.
  function code(it) {
    return it.code ? ' <span dir="ltr">' + esc(it.code) + '</span>' : '';
  }

  function home() {
    if (!data.items.length) {
      return '<div class="card empty"><p>ما فيه شي هنا للحين.</p><a class="btn" href="#/action">ابدأ أول واحد</a></div>';
    }
    var cards = data.items.map(function (it) {
      return (
        '<li><a class="card card-link" href="#/detail/' + esc(it.id) + '">' +
        '<h2><bdi>' + esc(it.title) + '</bdi>' + code(it) + '</h2>' +
        '<p class="muted">' + esc(it.subtitle) + '</p>' +
        '<div class="row"><span>' + money.format(it.price) + '</span>' +
        '<span class="muted">' + num.format(it.count) + '، ' + day.format(new Date(it.date)) + '</span></div>' +
        '</a></li>'
      );
    });
    return '<p class="muted">هلا <bdi>' + esc(data.user.name) + '</bdi></p><h1>الشاشة الرئيسية</h1>' +
      '<ul class="list grid-md">' + cards.join('') + '</ul>';
  }

  function detail(id) {
    var it = data.items.filter(function (x) { return x.id === id; })[0];
    if (!it) return '<div class="card empty"><p class="error">ما لقينا هذا العنصر.</p><a class="btn" href="#/">ارجع للرئيسية</a></div>';
    return '<a href="#/" class="muted"><span class="icon-directional" aria-hidden="true" style="display:inline-block">&larr;</span> رجوع</a>' +
      '<h1><bdi>' + esc(it.title) + '</bdi>' + code(it) + '</h1>' +
      '<div class="card"><p>' + esc(it.subtitle) + '</p><p class="muted">' + day.format(new Date(it.date)) + '</p>' +
      '<p>' + money.format(it.price) + '</p></div>';
  }

  function action() {
    return '<h1>الفعل الرئيسي</h1><form class="card" id="f"><div class="field"><label for="name">اسمك</label>' +
      '<input id="name" dir="auto" /></div><button class="btn" type="submit">أرسل</button></form>';
  }

  function render() {
    var parts = (location.hash.replace(/^#/, '') || '/').split('/');
    var html = parts[1] === 'detail' ? detail(parts[2]) : parts[1] === 'action' ? action() : home();
    root.innerHTML = html;
    var f = document.getElementById('f');
    if (f) f.onsubmit = function (e) {
      e.preventDefault();
      var n = document.getElementById('name').value.trim();
      if (n) root.innerHTML = '<div class="card empty"><h2>وصل!</h2><p>تم، يا <bdi>' + esc(n) + '</bdi>. (بيانات تجريبية)</p><a class="btn" href="#/">ارجع للرئيسية</a></div>';
    };
  }

  window.addEventListener('hashchange', render);
  render();
})();
