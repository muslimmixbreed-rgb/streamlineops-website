// Business Analyser: the visitor describes their business, then the analyser works
// through each domain in turn (McKinsey 7S, then operations), asking one follow-up
// question where the description is too thin. Stages and domains are defined in
// analyser-domains.js; the AI instructions live on the server (netlify/lib/prompts.mjs).
(function () {
  var app = document.getElementById('hc-app');
  if (!app) return;

  var STAGES = window.SO_STAGES, SERVICES = window.SO_SERVICES, RATINGS = window.SO_RATINGS;
  var ss = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };
  var token = ss.get('so_analyser_token');
  if (!token) { location.replace('../analyser.html'); return; }
  var person = {};
  try { person = JSON.parse(ss.get('so_analyser_person') || '{}'); } catch (e) {}

  // Progress is kept for this browser tab, so a refresh doesn't lose the visitor's work.
  var SAVE_KEY = 'so_analyser_state_' + token.slice(0, 8);
  var state = null;
  try { state = JSON.parse(ss.get(SAVE_KEY) || 'null'); } catch (e) {}
  if (!state) state = { view: 'describe', business: person.business || '', description: '', analysisId: null, qa: [], cards: {}, summary: null, usesLeft: null };
  function save() { ss.set(SAVE_KEY, JSON.stringify(state)); }

  var ALL = [];
  STAGES.forEach(function (s) { s.domains.forEach(function (d) { ALL.push({ stage: s, domain: d }); }); });

  // ---- DOM helpers: text always goes in via textContent, never as HTML ----
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function empty(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function top() { window.scrollTo({ top: app.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' }); }

  function stageDone(stage) { return stage.domains.every(function (d) { var c = state.cards[d.id]; return c && c.result; }); }
  function stageUnlocked(i) { return state.analysisId && (i === 0 || stageDone(STAGES[i - 1])); }
  function allDone() { return STAGES.every(stageDone); }

  // ---- step tabs ----
  function tabs() {
    var items = [{ key: 'describe', label: 'Your business', ok: !!state.analysisId, open: true }];
    STAGES.forEach(function (s, i) { items.push({ key: s.id, label: s.title, ok: stageDone(s), open: stageUnlocked(i) }); });
    items.push({ key: 'results', label: 'Results', ok: !!state.summary, open: allDone() });
    return el('ol', { class: 'az-tabs' }, items.map(function (t, i) {
      return el('li', { class: (state.view === t.key ? 'on ' : '') + (t.ok ? 'ok' : '') }, [
        el('button', { type: 'button', disabled: !t.open || (t.key === 'describe' && !!state.analysisId && false), onclick: function () { state.view = t.key; save(); render(); top(); } },
          [el('span', { class: 'n', text: t.ok ? '✓' : String(i + 1) }), t.label])
      ]);
    }));
  }

  function render() {
    empty(app);
    app.append(tabs());
    if (state.view === 'describe') return renderDescribe();
    if (state.view === 'results') return renderResults();
    var stage = STAGES.filter(function (s) { return s.id === state.view; })[0];
    if (stage) renderStage(stage);
  }

  // ---- 1. describe the business ----
  function renderDescribe() {
    var locked = !!state.analysisId;
    var biz = el('input', { id: 'az-biz', type: 'text', value: state.business, autocomplete: 'organization', disabled: locked, oninput: function () { state.business = biz.value; save(); } });
    var desc = el('textarea', { id: 'az-desc', class: 'az-desc', maxlength: '4000', disabled: locked, placeholder: 'Example: We are a family-run commercial cleaning company in Kent with 14 staff across two shifts. Jobs come in by phone and email, and the office manager adds them to a shared spreadsheet and a whiteboard. Supervisors get their lists by WhatsApp each morning. Invoices are typed up in Xero at the end of the month. Our biggest headache is missed or late jobs when a supervisor is off, and we often only find out when the client complains…', oninput: function () { state.description = desc.value; count.textContent = desc.value.trim().length + ' characters'; save(); } });
    desc.value = state.description;
    var count = el('span', { class: 'small muted', text: state.description.trim().length + ' characters' });
    var hint = el('p', { class: 'az-hint', role: 'alert' });
    var btn = el('button', { type: 'button', class: 'button dark', text: locked ? 'Continue to stage 1' : 'Begin analysis', onclick: locked ? function () { state.view = STAGES[0].id; save(); render(); top(); } : begin });

    app.append(
      el('h2', { text: 'Describe your business' }),
      el('p', { class: 'muted', text: 'Write in your own words. The more specific you are, the more accurate the analysis. Aim for a few short paragraphs covering:' }),
      el('ul', { class: 'ticks az-guide' }, [
        'What you do, who your customers are and roughly how big the team is',
        'How work comes in, gets done and gets delivered or invoiced',
        'Who does what, and what happens when someone is away',
        'The tools you use: spreadsheets, software, paper, WhatsApp',
        'What frustrates you most, and where things go wrong'
      ].map(function (t) { return el('li', { text: t }); })),
      el('div', { class: 'form hc-form' }, [
        el('div', {}, [el('label', { for: 'az-biz', text: 'Business name (optional)' }), biz]),
        el('div', {}, [el('label', { for: 'az-desc', text: 'Your business in your own words' }), desc, count])
      ]),
      locked ? el('p', { class: 'small muted', text: 'Your analysis has started, so the description is locked to keep the results consistent.' }) : el('p', { class: 'small muted', text: 'Starting the analysis uses one of your two free goes.' }),
      hint,
      el('div', { class: 'hc-nav' }, [el('span'), btn])
    );

    function begin() {
      if (state.description.trim().length < 150) { hint.className = 'az-hint notice'; hint.textContent = 'Please tell us a bit more, at least a few sentences, so the analysis has something to work with.'; return; }
      btn.disabled = true; hint.className = 'az-hint muted'; hint.textContent = 'Starting your analysis…';
      post('/api/begin', { token: token }).then(function (r) {
        if (!r.ok) throw new Error(MESSAGES[r.data.error] || r.data.error || 'Something went wrong. Please try again.');
        state.analysisId = r.data.analysisId; state.usesLeft = r.data.usesLeft;
        state.view = STAGES[0].id; save(); render(); top();
      }).catch(function (err) { btn.disabled = false; hint.className = 'az-hint notice'; hint.textContent = err.message; });
    }
  }

  // ---- talking to the server ----
  var MESSAGES = {
    used_up: 'You have used both free analyses. If you would like to talk about your business, please get in touch.',
    session_expired: 'Your session has expired. Please go back to the analyser page and enter your email again.',
    too_many_today: 'Too many analyses have been started from this connection today. Please try again tomorrow.'
  };
  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; }); },
            function () { throw new Error('Could not connect. Please check your internet connection and try again.'); });
  }
  function askClaude(promptId, text, maxTokens) {
    return post('/api/claude', { analysisId: state.analysisId, promptId: promptId, user: text, maxTokens: maxTokens }).then(function (r) {
      if (!r.ok) throw new Error(MESSAGES[r.data.error] || r.data.error || 'Something went wrong. Please try again.');
      var raw = (r.data.text || '').replace(/```json|```/g, '').trim();
      var m = raw.match(/\{[\s\S]*\}/);
      try { return JSON.parse(m ? m[0] : raw); } catch (e) { throw new Error('The answer came back in the wrong format. Please try again.'); }
    });
  }
  function context() {
    var lines = ['BUSINESS DESCRIPTION', (state.business ? 'Business name: ' + state.business + '\n' : '') + state.description.trim()];
    if (state.qa.length) {
      lines.push('', 'FOLLOW-UP ANSWERS');
      state.qa.forEach(function (x) { lines.push('Q (' + x.domain + '): ' + x.q, 'A: ' + x.a); });
    }
    return lines.join('\n');
  }

  // ---- 2. a stage of domain cards ----
  function renderStage(stage) {
    var done = stage.domains.filter(function (d) { return state.cards[d.id] && state.cards[d.id].result; }).length;
    app.append(
      el('p', { class: 'kicker', text: stage.tag }),
      el('h2', { text: stage.title }),
      el('p', { class: 'muted', text: stage.intro }),
      el('div', { class: 'hc-progress' }, [el('span', { text: done + ' of ' + stage.domains.length + ' analysed' }), el('div', { class: 'hc-bar' }, [el('i', { style: 'width:' + Math.round(done / stage.domains.length * 100) + '%' })])])
    );
    var list = el('div', { class: 'az-cards' });
    stage.domains.forEach(function (d, i) {
      var prev = i === 0 ? true : !!(state.cards[stage.domains[i - 1].id] || {}).result;
      list.append(card(stage, d, prev));
    });
    app.append(list);
    var idx = STAGES.indexOf(stage);
    if (stageDone(stage)) {
      var next = STAGES[idx + 1];
      app.append(el('div', { class: 'hc-nav' }, [el('span'), el('button', { type: 'button', class: 'button dark', text: next ? 'Continue to ' + next.title : 'See my results', onclick: function () { state.view = next ? next.id : 'results'; save(); render(); top(); } })]));
    }
  }

  function card(stage, d, unlocked) {
    var c = state.cards[d.id] || (state.cards[d.id] = {});
    var r = c.result;
    var rating = r && RATINGS[r.rating];
    var box = el('section', { class: 'az-card' + (r ? ' done ' + (rating ? rating.cls : '') : '') + (!unlocked && !r ? ' locked' : ''), id: 'card-' + d.id });
    box.append(el('div', { class: 'az-card-head' }, [
      el('div', {}, [el('h3', { text: d.title }), el('p', { class: 'muted small', text: d.focus })]),
      rating ? el('span', { class: 'az-badge ' + rating.cls, text: rating.label }) : null
    ]));
    var body = el('div', { class: 'az-card-body' });
    box.append(body);

    if (r) {
      var row = function (label, text) { return text ? el('p', {}, [el('b', { text: label + ' ' }), String(text)]) : null; };
      var svc = SERVICES[r.service];
      body.append(row('What we found:', r.found), row('Why it matters:', r.why), row('What good looks like:', r.good),
        svc ? el('p', { class: 'hc-svc' }, ['How StreamlineOps can help: ', el('a', { href: '../services.html#' + svc.anchor, text: svc.name })]) : null);
      return box;
    }
    if (!unlocked) { body.append(el('p', { class: 'small muted', text: 'Unlocks when the card above is analysed.' })); return box; }

    var status = el('div', { class: 'az-status', 'aria-live': 'polite' });
    if (c.question) {
      var ans = el('textarea', { id: 'ans-' + d.id, maxlength: '800' });
      ans.value = c.answer || '';
      ans.addEventListener('input', function () { c.answer = ans.value; save(); });
      body.append(
        el('p', { class: 'az-question' }, [el('b', { text: 'Quick question: ' }), String(c.question)]),
        el('div', { class: 'form hc-form' }, [el('div', {}, [el('label', { for: 'ans-' + d.id, text: 'Your answer' }), ans])]),
        el('div', { class: 'actions' }, [
          el('button', { type: 'button', class: 'button dark', text: 'Analyse ' + d.title, onclick: function () { run(true, ans.value.trim()); } }),
          el('button', { type: 'button', class: 'hc-back', text: 'Skip and analyse anyway', onclick: function () { run(true, ''); } })
        ]), status);
    } else {
      body.append(el('div', { class: 'actions' }, [el('button', { type: 'button', class: 'button dark', text: 'Analyse ' + d.title, onclick: function () { run(false, ''); } })]), status);
    }

    function run(followed, answer) {
      if (followed && answer) {
        state.qa = state.qa.filter(function (x) { return x.id !== d.id; });
        state.qa.push({ id: d.id, domain: d.title, q: c.question, a: answer.slice(0, 800) });
      }
      body.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      status.className = 'az-status muted'; status.textContent = 'Analysing ' + d.title + '…';
      var prompt = context() + '\n\nSTAGE: ' + stage.title + '\nDOMAIN TO ASSESS: ' + d.title + ': ' + d.focus +
        '\nFollow-up already asked: ' + (followed || c.asked ? 'yes' : 'no');
      askClaude('domain-check', prompt, 700).then(function (res) {
        if (res.status === 'need_info' && res.question && !followed && !c.asked) {
          c.asked = true; c.question = String(res.question).slice(0, 300);
        } else if (res.rating && RATINGS[res.rating] && res.found) {
          c.result = { rating: res.rating, found: res.found, why: res.why, good: res.good, service: res.service };
        } else {
          throw new Error('The analysis was incomplete. Please try again.');
        }
        save(); render();
        var target = document.getElementById('card-' + d.id);
        var nextCard = c.result ? target && target.nextElementSibling : target;
        if (nextCard) nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }).catch(function (err) {
        body.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
        status.className = 'az-status notice'; status.textContent = err.message;
      });
    }
    return box;
  }

  // ---- 3. results ----
  function stageScore(stage) {
    var vals = stage.domains.map(function (d) { var r = (state.cards[d.id] || {}).result; return r && RATINGS[r.rating] ? RATINGS[r.rating].score : null; }).filter(function (v) { return v !== null; });
    return vals.length ? Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length) : null;
  }
  function band(score) { return score >= 75 ? RATINGS.STRONG : score >= 40 ? RATINGS.MODERATE : RATINGS.WEAK; }

  function renderResults() {
    var scores = STAGES.map(stageScore);
    var overall = Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length);
    app.append(
      el('p', { class: 'kicker', text: 'Your results' }),
      el('h2', { text: (state.business ? state.business + ': ' : '') + 'business analysis' }),
      el('p', { class: 'hc-overall' }, [el('b', { text: overall + '/100' }), ' overall']),
      el('div', { class: 'hc-scores' }, STAGES.map(function (s, i) {
        var b = band(scores[i]);
        return el('div', { class: 'hc-score ' + b.cls }, [
          el('div', { class: 'hc-score-head' }, [el('b', { text: s.title }), el('span', { text: scores[i] + '/100 · ' + b.label })]),
          el('div', { class: 'hc-bar' }, [el('i', { style: 'width:' + scores[i] + '%' })]),
          el('ul', { class: 'az-mini' }, s.domains.map(function (d) {
            var r = state.cards[d.id].result, rt = RATINGS[r.rating];
            return el('li', { class: rt.cls }, [el('span', { text: d.title }), el('b', { text: rt.label })]);
          }))
        ]);
      }))
    );
    var box = el('div', { class: 'hc-report', 'aria-live': 'polite' });
    app.append(box);
    if (state.summary) showSummary(box, scores, overall); else loadSummary(box, scores, overall);
  }

  function loadSummary(box, scores, overall) {
    empty(box);
    box.append(el('p', { class: 'muted', text: 'Bringing it all together… this usually takes under a minute.' }));
    var lines = [context(), '', 'ASSESSMENTS'];
    STAGES.forEach(function (s) { s.domains.forEach(function (d) { var r = state.cards[d.id].result; lines.push(s.title + ' / ' + d.title + ': ' + r.rating + '. ' + r.found); }); });
    askClaude('final-summary', lines.join('\n'), 1000).then(function (res) {
      if (!res.summary || !Array.isArray(res.priorities) || !res.priorities.length) throw new Error('The summary was incomplete. Please try again.');
      state.summary = { summary: res.summary, priorities: res.priorities.slice(0, 3) }; save();
      showSummary(box, scores, overall);
    }).catch(function (err) {
      empty(box);
      box.append(el('p', { class: 'notice', text: err.message }), el('button', { type: 'button', class: 'button dark', text: 'Try again', onclick: function () { loadSummary(box, scores, overall); } }));
    });
  }

  function showSummary(box, scores, overall) {
    empty(box);
    var s = state.summary;
    box.append(el('h3', { text: 'Summary' }), el('p', { class: 'hc-summary', text: String(s.summary) }), el('h3', { text: 'Your top three priorities' }));
    box.append(el('ol', { class: 'hc-gaps' }, s.priorities.map(function (p) {
      var svc = SERVICES[p.service];
      return el('li', {}, [
        el('span', { class: 'tag', text: String(p.domain || '') }),
        el('h4', { text: String(p.title || '') }),
        el('p', { text: String(p.why || '') }),
        svc ? el('p', { class: 'hc-svc' }, ['How StreamlineOps can help: ', el('a', { href: '../services.html#' + svc.anchor, text: svc.name })]) : null
      ]);
    })));
    box.append(
      el('p', { class: 'small muted', text: 'This analysis was written by AI from what you told us. It shows where the gaps are, not how to close them: the right fix depends on how your business works, which is what a conversation is for.' }),
      el('div', { class: 'actions hc-noprint' }, [el('button', { type: 'button', class: 'button dark', text: 'Save as PDF', onclick: function () { window.print(); } })]),
      typeof state.usesLeft === 'number' ? el('p', { class: 'small muted hc-noprint', text: state.usesLeft === 1 ? 'You have 1 free analysis left.' : state.usesLeft === 0 ? 'That was your last free analysis.' : '' }) : null
    );

    var form = document.getElementById('results-form');
    if (!form || form.dataset.sent) return;
    var fill = function (n, v) { var f = form.querySelector('[name="' + n + '"]'); if (f) f.value = v; };
    fill('name', person.name || ''); fill('email', person.email || ''); fill('business', state.business || '');
    fill('description', state.description.trim().slice(0, 3000));
    fill('scores', STAGES.map(function (st, i) { return st.title + ': ' + scores[i]; }).join('; ') + '; Overall: ' + overall);
    fill('ratings', ALL.map(function (x) { return x.domain.title + ': ' + RATINGS[state.cards[x.domain.id].result.rating].label; }).join('; '));
    fill('gaps', s.priorities.map(function (p, i) { return (i + 1) + '. ' + p.title + ' (' + p.domain + ')'; }).join('\n'));
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
        rf.dataset.sent = '1'; empty(rf);
        rf.append(el('h3', { text: 'Thanks, your results are on their way to StreamlineOps.' }), el('p', { text: 'You will get a personal reply to arrange a time to talk.' }));
      })
      .catch(function () { btn.disabled = false; alert('Sorry, that did not send. Please try again, or use the contact page.'); });
  });

  render();
})();
