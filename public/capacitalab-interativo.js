/* =====================================================================
   CapacitaLab · Interações da área de membros
   Cole dentro de <script> ... </script> logo antes de </body>.
   Não altera a lógica do seu site: só adiciona efeitos visuais.
   ===================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Desenho de eletrocardiograma (usado no banner e no login) */
  function clEcgSvg(beats) {
    var d = 'M0 30', step = 1000 / beats;
    for (var i = 0; i < beats; i++) {
      var x = i * step;
      d += ' L' + (x + step * .35) + ' 30' +
           ' L' + (x + step * .42) + ' 24' +
           ' L' + (x + step * .48) + ' 30' +
           ' L' + (x + step * .55) + ' 30' +
           ' L' + (x + step * .60) + ' 38' +
           ' L' + (x + step * .66) + ' 2' +
           ' L' + (x + step * .72) + ' 56' +
           ' L' + (x + step * .77) + ' 30' +
           ' L' + (x + step * .86) + ' 30' +
           ' L' + (x + step * .92) + ' 22' +
           ' L' + (x + step * .98) + ' 30';
    }
    d += ' L1000 30';
    return '<svg class="cl-ecg" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="base" d="' + d + '"/>' +
      '<path class="halo" pathLength="1000" d="' + d + '"/>' +
      '<path class="pulso" pathLength="1000" d="' + d + '"/></svg>';
  }
  window.clEcgSvg = clEcgSvg;

  /* ---------- 1. Cabeçalho ganha sombra ao rolar */
  function onScroll() {
    document.querySelectorAll('header.bg-white').forEach(function (h) {
      h.classList.toggle('is-scrolled', window.scrollY > 8);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 2. Efeito "ripple" nos botões e abas */
  document.addEventListener('pointerdown', function (e) {
    var el = e.target.closest('.btn, .navtab, .role-tab, .cl-hero__cta');
    if (!el || reduce) return;
    var r = el.getBoundingClientRect();
    var s = Math.max(r.width, r.height);
    var dot = document.createElement('span');
    dot.className = 'cl-ripple';
    dot.style.width = dot.style.height = s + 'px';
    dot.style.left = (e.clientX - r.left - s / 2) + 'px';
    dot.style.top = (e.clientY - r.top - s / 2) + 'px';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(dot);
    setTimeout(function () { dot.remove(); }, 650);
  });

  /* ---------- 3. Entrada suave dos elementos ao aparecer na tela */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12 }) : null;

  function reveal(list) {
    list.forEach(function (el, i) {
      if (el.classList.contains('cl-reveal')) return;
      el.classList.add('cl-reveal');
      el.style.setProperty('--d', (i % 6) * 70 + 'ms');
      if (io && !reduce) io.observe(el); else el.classList.add('is-in');
    });
  }

  /* ---------- 4. Cards das videoaulas: luz que segue o mouse + leve inclinação 3D */
  function bindCard(card) {
    if (card.dataset.clBound) return;
    card.dataset.clBound = '1';

    // aula concluída ganha selo
    if (card.querySelector('.status-aprovado')) card.classList.add('cl-done');

    // imagem quebrada vira capa em degradê com a inicial da aula
    var img = card.querySelector('img');
    if (img) {
      var fallback = function () {
        if (img.dataset.clFb) return;
        img.dataset.clFb = '1';
        var t = (card.querySelector('h4') || {}).textContent || 'Aula';
        var div = document.createElement('div');
        div.className = 'cl-fallback';
        div.textContent = t.trim().charAt(0).toUpperCase();
        img.replaceWith(div);
      };
      img.addEventListener('error', fallback);
      if (img.complete && img.naturalWidth === 0) fallback();
    }

    if (reduce) return;
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', x * 100 + '%');
      card.style.setProperty('--my', y * 100 + '%');
      card.style.transform =
        'perspective(900px) rotateX(' + ((0.5 - y) * 6) + 'deg) rotateY(' + ((x - 0.5) * 8) + 'deg) translateY(-6px)';
    });
    card.addEventListener('pointerleave', function () { card.style.transform = ''; });
  }

  /* ---------- 5. Banner "Continue assistindo" + filtros (Todas / Pendentes / Concluídas) */
  function buildCourseUI() {
    var section = document.getElementById('videoaulas');
    if (!section) return;
    var grid = section.querySelector('.grid');
    if (!grid) return;
    var cards = Array.prototype.slice.call(grid.children);
    if (!cards.length) return;

    cards.forEach(bindCard);
    reveal(cards);

    var head = section.querySelector('.flex.items-center.justify-between');
    var pend = cards.filter(function (c) { return c.querySelector('.status-cursando'); });
    var done = cards.filter(function (c) { return c.querySelector('.status-aprovado'); });

    // Banner
    var next = pend[0] || cards[0];
    var hero = section.querySelector('.cl-hero');
    if (!hero) {
      hero = document.createElement('div');
      hero.className = 'cl-hero';
      if (head) head.insertAdjacentElement('afterend', hero); else section.prepend(hero);
    }
    var nImg = next.querySelector('img');
    var nTitle = (next.querySelector('h4') || {}).textContent || '';
    var nProf = (next.querySelector('p') || {}).textContent || '';
    var nTime = ((next.querySelector('.mt-3 span') || {}).textContent || '').trim();
    hero.style.backgroundImage = nImg && nImg.src ? 'url("' + nImg.src + '")' : 'var(--grad)';
    // soma a duração de todas as aulas (formato mm:ss ou hh:mm:ss)
    var totalMin = 0;
    cards.forEach(function (c) {
      var tx = ((c.querySelector('.mt-3 span') || {}).textContent || '').trim();
      var p = tx.split(':').map(Number);
      if (p.length === 2 && !p.some(isNaN)) totalMin += p[0] + p[1] / 60;
      if (p.length === 3 && !p.some(isNaN)) totalMin += p[0] * 60 + p[1] + p[2] / 60;
    });
    var h = Math.floor(totalMin / 60), m = Math.round(totalMin % 60);
    var horas = h ? h + 'h' + (m < 10 ? '0' : '') + m : m + 'min';
    var curso = '';
    document.querySelectorAll('aside .flex.justify-between').forEach(function (row) {
      var s = row.querySelectorAll('span');
      if (s.length > 1 && /curso/i.test(s[0].textContent) && !/progresso/i.test(s[0].textContent)) curso = s[1].textContent.trim();
    });

    hero.innerHTML =
      clEcgSvg(9) +
      '<div class="cl-hero__body">' +
        '<span class="cl-hero__tag"><i class="ph-fill ph-lightning"></i>' +
          (pend.length ? 'Continue de onde parou' : 'Curso concluído') + '</span>' +
        '<span class="cl-hero__eyebrow"></span>' +
        '<div class="cl-hero__title"></div>' +
        '<div class="cl-hero__meta"></div>' +
        '<div class="cl-stats">' +
          '<div class="cl-stat"><b>' + cards.length + '</b><span>aulas no curso</span></div>' +
          (totalMin ? '<div class="cl-stat"><b>' + horas + '</b><span>de conteúdo</span></div>' : '') +
        '</div>' +
        '<button type="button" class="cl-hero__cta"><i class="ph-fill ph-play-circle"></i>Ir para a aula</button>' +
      '</div>';
    hero.querySelector('.cl-hero__eyebrow').textContent = curso;
    hero.querySelector('.cl-hero__title').textContent = nTitle;
    hero.querySelector('.cl-hero__meta').textContent =
      [nProf, nTime, done.length + ' de ' + cards.length + ' aulas concluídas'].filter(Boolean).join(' · ');
    hero.querySelector('.cl-hero__cta').onclick = function () {
      next.classList.remove('cl-hide');
      next.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      next.classList.remove('cl-flash'); void next.offsetWidth; next.classList.add('cl-flash');
    };

    // Filtros
    var bar = section.querySelector('.cl-filters');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'cl-filters';
      grid.insertAdjacentElement('beforebegin', bar);
    }
    var opts = [
      ['all', 'Todas', cards.length],
      ['pend', 'Pendentes', pend.length],
      ['done', 'Concluídas', done.length]
    ];
    var current = bar.dataset.on || 'all';
    bar.innerHTML = '';
    opts.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cl-chip' + (o[0] === current ? ' is-on' : '');
      b.innerHTML = o[1] + '<b>' + o[2] + '</b>';
      b.onclick = function () {
        bar.dataset.on = o[0];
        bar.querySelectorAll('.cl-chip').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        applyFilter(cards, o[0], true);
      };
      bar.appendChild(b);
    });
    applyFilter(cards, current, false);
  }

  function applyFilter(cards, mode, animate) {
    cards.forEach(function (c, i) {
      var isDone = !!c.querySelector('.status-aprovado');
      var show = mode === 'all' || (mode === 'done' ? isDone : !isDone);
      c.classList.toggle('cl-hide', !show);
      if (show && animate && !reduce) {
        c.classList.remove('is-in');
        c.style.setProperty('--d', (i % 6) * 60 + 'ms');
        requestAnimationFrame(function () { c.classList.add('is-in'); });
      }
    });
  }

  /* ---------- 6. Outras áreas: cards do painel e lista de vídeos entram suavemente */
  function revealPanels() {
    reveal(Array.prototype.slice.call(document.querySelectorAll('aside > .card, #videos-list > *')));
  }

  /* ---------- 7. Roda agora e sempre que o site redesenhar algo */
  var t;
  function refresh() {
    clearTimeout(t);
    t = setTimeout(function () { buildCourseUI(); revealPanels(); }, 120);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();

  var mo = new MutationObserver(function (muts) {
    var ours = function (n) {
      return n.nodeType !== 1 || n.classList.contains('cl-ripple') || n.classList.contains('cl-fallback') ||
        n.classList.contains('cl-hero') || n.classList.contains('cl-filters') ||
        n.classList.contains('cl-confetti') || n.classList.contains('cl-scrollbar') || n.classList.contains('cl-cursor-glow') ||
        n.classList.contains('cl-faixa') || n.classList.contains('cl-ecg') || n.classList.contains('cl-staff-hero');
    };
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.target.closest && m.target.closest('.cl-hero, .cl-filters, .cl-staff-hero, .cl-faixa')) continue;
      var nodes = Array.prototype.slice.call(m.addedNodes).concat(Array.prototype.slice.call(m.removedNodes));
      if (nodes.length && !nodes.every(ours)) { refresh(); break; }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();


/* =====================================================================
   v2 · EFEITOS INTERATIVOS EXTRAS
   ===================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = window.matchMedia('(hover: none)').matches;

  function start() {
    /* Barra de leitura no topo */
    var bar = document.createElement('div');
    bar.className = 'cl-scrollbar';
    document.body.appendChild(bar);
    function updateBar() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--scroll', max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    }
    window.addEventListener('scroll', updateBar, { passive: true });
    window.addEventListener('resize', updateBar);
    updateBar();

    if (reduce) return;

    /* Luz que segue o mouse */
    if (!touch) {
      var glow = document.createElement('div');
      glow.className = 'cl-cursor-glow';
      document.body.prepend(glow);
      var raf = 0, cx = 0, cy = 0;
      window.addEventListener('pointermove', function (e) {
        cx = e.clientX; cy = e.clientY;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          glow.style.setProperty('--cx', cx + 'px');
          glow.style.setProperty('--cy', cy + 'px');
          raf = 0;
        });
      }, { passive: true });
    }

    /* Cartão de login inclina com o mouse */
    var login = document.getElementById('login-screen');
    var lcard = login && login.querySelector('.card');
    if (lcard && !touch) {
      login.addEventListener('pointermove', function (e) {
        var r = lcard.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        var y = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        lcard.style.transform = 'perspective(1000px) rotateY(' + (x * 10) + 'deg) rotateX(' + (-y * 10) + 'deg)';
      });
      login.addEventListener('pointerleave', function () { lcard.style.transform = ''; });
    }

    /* Porcentagem do progresso conta de 0 até o valor */
    var pct = document.getElementById('progress-pct');
    if (pct) {
      var written = '', run = 0;
      var countUp = function () {
        var txt = pct.textContent;
        if (txt === written) return;          // fui eu que escrevi: ignora
        var target = parseInt(txt, 10);
        if (isNaN(target) || target <= 0) return;
        var my = ++run, t0 = performance.now(), dur = 1100;
        (function step() {
          if (my !== run) return;             // chegou um valor novo: para esta animação
          var p = document.hidden ? 1 : Math.min((performance.now() - t0) / dur, 1);
          written = Math.round(target * (1 - Math.pow(1 - p, 3))) + '%';
          pct.textContent = written;
          if (p < 1) setTimeout(step, 16);
        })();
      };
      new MutationObserver(countUp).observe(pct, { childList: true, characterData: true, subtree: true });
      countUp();
    }
  }

  /* Confete ao clicar em "Ir para a aula" */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.cl-hero__cta');
    if (!btn || reduce) return;
    var r = btn.getBoundingClientRect();
    var colors = ['#2BD49A', '#14A3A0', '#FF6A3D', '#FFB547', '#ffffff'];
    for (var i = 0; i < 26; i++) {
      var c = document.createElement('span');
      c.className = 'cl-confetti';
      c.style.left = (r.left + r.width / 2) + 'px';
      c.style.top = (r.top + r.height / 2) + 'px';
      c.style.background = colors[i % colors.length];
      var ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 110;
      c.style.setProperty('--tx', Math.cos(ang) * dist + 'px');
      c.style.setProperty('--ty', (Math.sin(ang) * dist + 80) + 'px');
      c.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      document.body.appendChild(c);
      setTimeout(function (el) { el.remove(); }.bind(null, c), 1200);
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();


/* =====================================================================
   v3 · FAIXA DAS AULAS PASSANDO + ECG NO LOGIN
   ===================================================================== */
(function () {
  'use strict';

  function addLoginEcg() {
    var card = document.querySelector('#login-screen > .card');
    if (!card || card.querySelector('.cl-ecg') || !window.clEcgSvg) return;
    var sub = card.querySelector('p');
    if (!sub) return;
    sub.insertAdjacentHTML('afterend', window.clEcgSvg(4));
  }

  function addFaixa() {
    var app = document.getElementById('app');
    var header = app && app.querySelector(':scope > header');
    if (!header) return;
    var titles = Array.prototype.map.call(
      document.querySelectorAll('#videoaulas .grid > div h4'),
      function (h) { return h.textContent.trim(); }
    ).filter(Boolean);
    if (!titles.length) return;

    var faixa = app.querySelector(':scope > .cl-faixa');
    var key = titles.join('|');
    if (faixa && faixa.dataset.key === key) return;
    if (!faixa) {
      faixa = document.createElement('div');
      faixa.className = 'cl-faixa';
      faixa.setAttribute('aria-hidden', 'true');
      header.insertAdjacentElement('afterend', faixa);
    }
    faixa.dataset.key = key;

    var items = ['Técnico em Enfermagem'].concat(titles);
    // repete a lista para preencher a tela e emendar sem pulo
    var one = items.map(function (t) { return '<span></span>'; }).join('');
    faixa.innerHTML = '<div class="cl-faixa__trilho">' + one + one + one + one + '</div>';
    var spans = faixa.querySelectorAll('span');
    spans.forEach(function (s, i) { s.textContent = items[i % items.length]; });
  }

  function run() { addLoginEcg(); addFaixa(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  // as aulas podem carregar depois: tenta de novo algumas vezes
  var tries = 0, iv = setInterval(function () { run(); if (++tries > 10) clearInterval(iv); }, 800);
})();


/* =====================================================================
   v4 · ÁREA DO PROFESSOR E DO ADMINISTRADOR
   ===================================================================== */
(function () {
  'use strict';
  var staff = document.getElementById('staff-app');
  if (!staff) return;

  function txt(id) { var el = document.getElementById(id); return el ? el.textContent.trim() : ''; }

  /* Faixa passando abaixo do topo do painel */
  function staffFaixa() {
    var header = staff.querySelector(':scope > header');
    if (!header) return;
    var role = txt('staff-role-label');
    var labels = Array.prototype.map.call(
      staff.querySelectorAll('#staff-tabs .navtab span'),
      function (s) { return s.textContent.trim(); }
    ).filter(Boolean);
    var items = ['Técnico em Enfermagem', role && role !== '—' ? 'Painel · ' + role : 'Painel administrativo'].concat(labels);
    var key = items.join('|');
    var faixa = staff.querySelector(':scope > .cl-faixa');
    if (faixa && faixa.dataset.key === key) return;
    if (!faixa) {
      faixa = document.createElement('div');
      faixa.className = 'cl-faixa';
      faixa.setAttribute('aria-hidden', 'true');
      header.insertAdjacentElement('afterend', faixa);
    }
    faixa.dataset.key = key;
    var one = items.map(function () { return '<span></span>'; }).join('');
    faixa.innerHTML = '<div class="cl-faixa__trilho">' + one + one + one + one + '</div>';
    faixa.querySelectorAll('span').forEach(function (s, i) { s.textContent = items[i % items.length]; });
  }

  /* Contadores do banner */
  function countStudents() {
    var rows = document.querySelectorAll('#students-tbody tr');
    var n = 0;
    rows.forEach(function (r) { if (r.querySelectorAll('td').length > 1) n++; });
    return n;
  }
  function countVideos() {
    return document.querySelectorAll('#videos-list > div').length;
  }
  function goTab(name) {
    var b = staff.querySelector('#staff-tabs [data-stab="' + name + '"]');
    if (b) b.click();
  }

  /* Banner de boas-vindas */
  function staffHero() {
    var first = document.getElementById('cadastrar-aluno');
    if (!first || !first.parentElement) return;
    var col = first.parentElement;
    var hero = col.querySelector(':scope > .cl-staff-hero');
    var name = txt('staff-name');
    var role = txt('staff-role-label');
    var first_name = name && name !== '—' ? name.split(' ')[0] : '';
    var h = new Date().getHours();
    var saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    var data = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    var nAl = countStudents(), nVi = countVideos();
    var key = [first_name, role, nAl, nVi, saud].join('|');
    if (hero && hero.dataset.key === key) return;

    if (!hero) {
      hero = document.createElement('div');
      hero.className = 'cl-staff-hero';
      col.prepend(hero);
    }
    hero.dataset.key = key;
    hero.innerHTML =
      (window.clEcgSvg ? window.clEcgSvg(8) : '') +
      '<div class="cl-staff-hero__top">' +
        '<div>' +
          '<span class="cl-hero__eyebrow" style="margin-top:0"></span>' +
          '<div class="cl-staff-hero__hello"></div>' +
          '<div class="cl-staff-hero__date"></div>' +
        '</div>' +
        '<span class="cl-staff-hero__badge"><i class="ph-fill ph-heartbeat"></i><span class="cl-r"></span></span>' +
      '</div>' +
      '<div class="cl-stats">' +
        '<div class="cl-stat" data-go="alunos-cadastrados"><i class="ph ph-users"></i><b>' + nAl + '</b><span>alunos cadastrados</span></div>' +
        '<div class="cl-stat" data-go="staff-videos"><i class="ph ph-video-camera"></i><b>' + nVi + '</b><span>videoaulas publicadas</span></div>' +
        '<div class="cl-stat" data-go="staff-diploma"><i class="ph ph-seal-check"></i><b>✚</b><span>emitir diplomas</span></div>' +
      '</div>';
    hero.querySelector('.cl-hero__eyebrow').textContent = 'Técnico em Enfermagem · Painel';
    var hello = hero.querySelector('.cl-staff-hero__hello');
    hello.textContent = saud + (first_name ? ', ' : '!');
    if (first_name) {
      var em = document.createElement('em');
      em.textContent = first_name + '!';
      hello.appendChild(em);
    }
    hero.querySelector('.cl-staff-hero__date').textContent = data.charAt(0).toUpperCase() + data.slice(1);
    hero.querySelector('.cl-r').textContent = role && role !== '—' ? role : 'Equipe';
    hero.querySelectorAll('[data-go]').forEach(function (s) {
      s.onclick = function () { goTab(s.dataset.go); };
    });
  }

  function run() { staffFaixa(); staffHero(); }
  var t;
  function later() { clearTimeout(t); t = setTimeout(run, 150); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();

  // atualiza quando o nome, a lista de alunos ou de vídeos mudar
  ['staff-name', 'staff-role-label', 'students-tbody', 'videos-list'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) new MutationObserver(later).observe(el, { childList: true, characterData: true, subtree: true });
  });
  new MutationObserver(later).observe(staff, { attributes: true, attributeFilter: ['class'] });
})();
