// Business Analyser: Operations Health Check for existing businesses.
// Questions live in analyser-questions.js. The AI report comes from /api/claude
// (prompt "gap-report", defined on the server in netlify/lib/prompts.mjs).
(function () {
  var app = document.getElementById('hc-app');
  if (!app) return;

  var AREAS = window.SO_AREAS, SCALE = window.SO_SCALE, SERVICES = window.SO_SERVICES, PROFILE = window.SO_PROFILE;
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };
  var token = store.get('so_analyser_token');
  if (!token) { location.replace('../analyser.html'); return; }
  var person = {};
  try { person = JSON.parse(store.get('so_analyser_person') || '{}'); } catch (e) {}

  var state = { step: 0, profile: { business: person.business || '', sector: '', size: '', age: '', frustration: '' }, answers: {}, comments: {} };
  var analysisId = null;
  var TOTAL = AREAS.length + 1;

  // ---- small DOM helpers (all text goes in via textContent, never as HTML) ----
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function clear() { while (app.firstChild) app.removeChild(app.firstChild); window.scrollTo({ top: app.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' }); }
  function progress() {
    var done = state.step >= TOTAL;
    var pct = done ? 100 : Math.round((state.step / TOTAL) * 100);
    return el('div', { class: 'hc-progress' }, [
      el('span', { text: done ? 'Results' : 'Step ' + (state.step + 1) + ' of ' + TOTAL }),
      el('div', { class: 'hc-bar' }, [el('i', { style: 'width:' + pct + '%' })])
    ]);
  }
  function select(id, label, options, value, onChange) {
    var s = el('select', { id: id, onchange: function () { onChange(s.value); } }, [el('option', { value: '', text: 'Choose…' })]
      .concat(options.map(function (o) { var opt = el('option', { value: o, text: o }); if (o === value) opt.selected = true; return opt; })));
    return el('div', {}, [el('label', { for: id, text: label }), s]);
  }
  function nav(backFn, nextLabel, nextFn) {
    return el('div', { class: 'hc-nav' }, [
      backFn ? el('button', { type: 'button', class: 'hc-back', text: '← Back', onclick: backFn }) : el('span'),
      el('button', { type: 'button', class: 'button dark', text: nextLabel, onclick: nextFn })
    ]);
  }
  function warn(msg) {
    var w = app.querySelector('.hc-warn');
    if (!w) { w = el('p', { class: 'hc-warn notice', role: 'alert' }); app.querySelector('.hc-nav').before(w); }
    w.textContent = msg;
  }

  // ---- step 0: about the business ----
  function renderProfile() {
    clear();
    var p = state.profile;
    var biz = el('input', { id: 'hc-biz', type: 'text', value: p.business, autocomplete: 'organization', oninput: function () { p.business = biz.value; } });
    var fr = el('textarea', { id: 'hc-frustration', maxlength: '600', oninput: function () { p.frustration = fr.value; } });
    fr.value = p.frustration;
    app.append(
      progress(),
      el('h2', { text: 'About your business' }),
      el('p', { class: 'muted', text: 'A few basics so the report fits your situation. Takes about 5 minutes in total.' }),
      el('div', { class: 'form hc-form' }, [
        el('div', {}, [el('label', { for: 'hc-biz', text: 'Business name (optional)' }), biz]),
        select('hc-sector', 'Sector', PROFILE.sectors, p.sector, function (v) { p.sector = v; }),
        select('hc-size', 'Team size', PROFILE.sizes, p.size, function (v) { p.size = v; }),
        select('hc-age', 'How long have you been trading?', PROFILE.ages, p.age, function (v) { p.age = v; }),
        el('div', {}, [el('label', { for: 'hc-frustration', text: 'What frustrates you most about how the business runs day to day? (optional)' }), fr])
      ]),
      nav(null, 'Start the check →', function () {
        if (!p.sector || !p.size || !p.age) return warn('Please choose your sector, team size and how long you have been trading.');
        state.step = 1; renderArea();
      })
    );
  }

  // ---- steps 1-4: one area per screen ----
  function renderArea() {
    clear();
    var area = AREAS[state.step - 1];
    var list = el('ol', { class: 'hc-statements' });
    area.statements.forEach(function (text, i) {
      var key = area.id + '-' + i;
      var name = 'q-' + key;
      var opts = el('div', { class: 'hc-scale', role: 'radiogroup', 'aria-label': text });
      SCALE.concat(['Not sure']).forEach(function (label, j) {
        var val = j < SCALE.length ? String(j + 1) : 'na';
        var id = name + '-' + val;
        var input = el('input', { type: 'radio', name: name, id: id, value: val, onchange: function () { state.answers[key] = val; } });
        if (state.answers[key] === val) input.checked = true;
        opts.append(input, el('label', { for: id, text: label }));
      });
      list.append(el('li', {}, [el('p', { text: text }), opts]));
    });
    var note = el('textarea', { id: 'hc-note', maxlength: '500', placeholder: 'Optional', oninput: function () { state.comments[area.id] = note.value; } });
    note.value = state.comments[area.id] || '';
    app.append(
      progress(),
      el('p', { class: 'kicker', text: 'Area ' + state.step + ' of ' + AREAS.length }),
      el('h2', { text: area.title }),
      el('p', { class: 'muted', text: area.intro + ' How true is each statement for your business?' }),
      list,
      el('div', { class: 'form hc-form' }, [el('div', {}, [el('label', { for: 'hc-note', text: 'Anything else about this area?' }), note])]),
      nav(function () { state.step -= 1; state.step === 0 ? renderProfile() : renderArea(); },
          state.step === AREAS.length ? 'See my results →' : 'Next area →',
          function () {
            var missing = area.statements.filter(function (_, i) { return !state.answers[area.id + '-' + i]; }).length;
            if (missing) return warn('Please answer every statement (choose "Not sure" if you don\'t know).');
            state.step += 1;
            state.step > AREAS.length ? renderResults() : renderArea();
          })
    );
  }

  // ---- scoring ----
  function scoreArea(area) {
    var vals = area.statements.map(function (_, i) { return state.answers[area.id + '-' + i]; }).filter(function (v) { return v && v !== 'na'; }).map(Number);
    if (!vals.length) return null;
    var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
    return Math.round(((avg - 1) / 4) * 100);
  }
  function band(score) {
    if (score === null) return { label: 'Not enough answers', cls: 'na' };
    if (score >= 75) return { label: 'Strong', cls: 'good' };
    if (score >= 50) return { label: 'Room to improve', cls: 'mid' };
    return { label: 'Priority gap', cls: 'low' };
  }

  function buildPrompt(scores) {
    var p = state.profile, lines = [];
    lines.push('PROFILE', 'Sector: ' + p.sector, 'Team size: ' + p.size, 'Trading for: ' + p.age);
    if (p.frustration.trim()) lines.push('Biggest frustration: ' + p.frustration.trim());
    AREAS.forEach(function (area, a) {
      lines.push('', 'AREA: ' + area.title + ' (score ' + (scores[a] === null ? 'n/a' : scores[a]) + '/100)');
      area.statements.forEach(function (text, i) {
        var v = state.answers[area.id + '-' + i];
        lines.push('- ' + text + ' -> ' + (v === 'na' ? 'Not sure' : v + ' (' + SCALE[Number(v) - 1] + ')'));
      });
      if ((state.comments[area.id] || '').trim()) lines.push('Comment: ' + state.comments[area.id].trim());
    });
    return lines.join('\n');
  }

  // ---- talking to the server ----
  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; }); });
  }
  var MESSAGES = {
    used_up: 'You have used both free analyses. Your scores above still apply, and you are welcome to get in touch to talk them through.',
    session_expired: 'Your session has expired. Please go back to the analyser page and enter your email again.',
    too_many_today: 'Too many analyses have been started from this connection today. Please try again tomorrow.'
  };
  function getReport(prompt) {
    var begin = analysisId ? Promise.resolve({ ok: true, data: { analysisId: analysisId } }) : post('/api/begin', { token: token });
    return begin.then(function (r) {
      if (!r.ok) throw new Error(MESSAGES[r.data.error] || r.data.error || 'Something went wrong. Please try again.');
      analysisId = r.data.analysisId;
      if (typeof r.data.usesLeft === 'number') state.usesLeft = r.data.usesLeft;
      return post('/api/claude', { analysisId: analysisId, promptId: 'gap-report', user: prompt, maxTokens: 1500 });
    }).then(function (r) {
      if (!r.ok) throw new Error(MESSAGES[r.data.error] || r.data.error || 'Something went wrong. Please try again.');
      var raw = (r.data.text || '').replace(/```json|```/g, '').trim();
      var m = raw.match(/\{[\s\S]*\}/);
      var report;
      try { report = JSON.parse(m ? m[0] : raw); } catch (e) { throw new Error('The report came back in the wrong format. Please try again.'); }
      if (!report.summary || !Array.isArray(report.gaps) || !report.gaps.length) throw new Error('The report was incomplete. Please try again.');
      return report;
    });
  }

  // ---- results ----
  function renderResults() {
    clear();
    var scores = AREAS.map(scoreArea);
    var valid = scores.filter(function (s) { return s !== null; });
    var overall = valid.length ? Math.round(valid.reduce(function (a, b) { return a + b; }, 0) / valid.length) : null;

    var bars = el('div', { class: 'hc-scores' }, AREAS.map(function (area, a) {
      var b = band(scores[a]);
      return el('div', { class: 'hc-score ' + b.cls }, [
        el('div', { class: 'hc-score-head' }, [el('b', { text: area.title }), el('span', { text: (scores[a] === null ? '–' : scores[a] + '/100') + ' · ' + b.label })]),
        el('div', { class: 'hc-bar' }, [el('i', { style: 'width:' + (scores[a] || 0) + '%' })])
      ]);
    }));

    var reportBox = el('div', { class: 'hc-report', 'aria-live': 'polite' }, [el('p', { class: 'muted', text: 'Writing your report… this usually takes under a minute.' })]);

    app.append(
      progress(),
      el('p', { class: 'kicker', text: 'Your results' }),
      el('h2', { text: (state.profile.business ? state.profile.business + ': ' : '') + 'operations health check' }),
      overall === null ? null : el('p', { class: 'hc-overall' }, [el('b', { text: overall + '/100' }), ' overall']),
      bars,
      reportBox,
      el('div', { class: 'hc-nav' }, [el('button', { type: 'button', class: 'hc-back', text: '← Change my answers', onclick: function () { state.step = AREAS.length; renderArea(); } }), el('span')])
    );

    function load() {
      while (reportBox.firstChild) reportBox.removeChild(reportBox.firstChild);
      reportBox.append(el('p', { class: 'muted', text: 'Writing your report… this usually takes under a minute.' }));
      getReport(buildPrompt(scores)).then(function (report) { showReport(reportBox, report, scores, overall); })
        .catch(function (err) {
          while (reportBox.firstChild) reportBox.removeChild(reportBox.firstChild);
          reportBox.append(el('p', { class: 'notice', text: err.message }));
          if (!/used both|expired|Too many/.test(err.message)) reportBox.append(el('button', { type: 'button', class: 'button dark', text: 'Try again', onclick: load }));
          if (/used both/.test(err.message)) reportBox.append(el('a', { class: 'button dark', href: '../contact.html', text: 'Get in touch' }));
          if (/expired/.test(err.message)) reportBox.append(el('a', { class: 'button dark', href: '../analyser.html', text: 'Back to the analyser page' }));
        });
    }
    load();
  }

  function showReport(box, report, scores, overall) {
    while (box.firstChild) box.removeChild(box.firstChild);
    box.append(el('h3', { text: 'Summary' }), el('p', { class: 'hc-summary', text: String(report.summary) }));

    box.append(el('h3', { text: 'Your three biggest gaps' }));
    var gaps = report.gaps.slice(0, 3);
    box.append(el('ol', { class: 'hc-gaps' }, gaps.map(function (g) {
      var svc = SERVICES[g.service];
      var row = function (label, text) { return text ? el('p', {}, [el('b', { text: label + ' ' }), String(text)]) : null; };
      return el('li', {}, [
        el('span', { class: 'tag', text: String(g.area || '') }),
        el('h4', { text: String(g.title || '') }),
        row('What we found:', g.what),
        row('Why it matters:', g.why),
        row('What good looks like:', g.good),
        svc ? el('p', { class: 'hc-svc' }, ['How StreamlineOps can help: ', el('a', { href: '../services.html#' + svc.anchor, text: svc.name })]) : null
      ]);
    })));

    box.append(el('p', { class: 'small muted', text: 'This report was written by AI from your own answers. It shows where the gaps are, not how to close them: the right fix depends on how your business works, which is what a conversation is for.' }));
    box.append(el('div', { class: 'actions hc-noprint' }, [el('button', { type: 'button', class: 'button dark', text: 'Save as PDF', onclick: function () { window.print(); } })]));
    if (typeof state.usesLeft === 'number') box.append(el('p', { class: 'small muted hc-noprint', text: state.usesLeft === 1 ? 'You have 1 free analysis left.' : state.usesLeft === 0 ? 'That was your last free analysis.' : '' }));

    // Offer to send the results to StreamlineOps (Netlify form "analyser-results").
    var form = document.getElementById('results-form');
    var fill = function (n, v) { form.querySelector('[name="' + n + '"]').value = v; };
    fill('name', person.name || ''); fill('email', person.email || ''); fill('business', state.profile.business || '');
    fill('profile', [state.profile.sector, state.profile.size, state.profile.age].join(' | '));
    fill('scores', AREAS.map(function (a, i) { return a.title + ': ' + (scores[i] === null ? 'n/a' : scores[i]); }).join('; ') + (overall === null ? '' : '; Overall: ' + overall));
    fill('gaps', gaps.map(function (g, i) { return (i + 1) + '. ' + g.title + ' (' + g.area + ')'; }).join('\n'));
    fill('frustration', state.profile.frustration || '');
    form.hidden = false;
    box.after(form);
  }

  var rf = document.getElementById('results-form');
  if (rf) rf.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = rf.querySelector('button[type=submit]'); btn.disabled = true;
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(rf)).toString() })
      .then(function (res) {
        if (!res.ok) throw new Error();
        while (rf.firstChild) rf.removeChild(rf.firstChild);
        rf.append(el('h3', { text: 'Thanks, your results are on their way to StreamlineOps.' }), el('p', { text: 'You will get a personal reply to arrange a time to talk.' }));
      })
      .catch(function () { btn.disabled = false; alert('Sorry, that did not send. Please try again, or use the contact page.'); });
  });

  renderProfile();
})();
