// StreamlineOps: menu, footer year, and the Business Analyser sign-up.
(function () {
  // Mobile menu
  var toggle = document.querySelector('.menu-btn');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Footer year
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // ---- Business Analyser sign-up ----------------------------------------
  // 1. Sends the details to Netlify Forms, so sign-ups appear in your Netlify dashboard.
  // 2. Asks the server (/api/start) for a session. The server counts the two free
  //    analyses per email address, so clearing the browser does not reset them.
  var form = document.getElementById('gate-form');
  if (!form) return;
  var usedUp = document.getElementById('analyser-used-up');
  var out = form.querySelector('.form-result');
  var button = form.querySelector('button[type=submit]');

  function show(msg) { out.hidden = false; out.className = 'form-result notice'; out.textContent = msg; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.querySelector('[name=bot-field]').value) return;
    var data = new FormData(form);
    var payload = {
      name: data.get('name') || '',
      email: data.get('email') || '',
      business: data.get('business') || '',
      consent_terms: data.get('consent_terms') === 'yes',
      consent_marketing: data.get('consent_marketing') === 'yes'
    };
    button.disabled = true;
    out.hidden = true;

    // Netlify Forms copy (best effort: the analyser still works if this fails).
    var netlifyCopy = fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data).toString()
    }).catch(function () {});

    fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
      .then(function (r) {
        return netlifyCopy.then(function () {
          if (r.ok && r.body.token) {
            try { sessionStorage.setItem('so_analyser_token', r.body.token); } catch (err) { /* private mode */ }
            window.location.href = 'analyser/tool.html';
            return;
          }
          button.disabled = false;
          if (r.body.error === 'used_up') { form.hidden = true; usedUp.hidden = false; return; }
          show(r.body.error || 'Something went wrong. Please try again.');
        });
      })
      .catch(function () {
        button.disabled = false;
        show('Could not connect. Please check your internet connection and try again.');
      });
  });
})();
