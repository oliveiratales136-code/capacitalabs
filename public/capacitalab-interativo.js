/* =====================================================================
   CapacitaLab · Interações da área de membros
   Cole dentro de <script> ... </script> logo antes de </body>.
   Não altera a lógica do seu site: só adiciona efeitos visuais.
   ===================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    hero.innerHTML =
      '<div class="cl-hero__body">' +
        '<span class="cl-hero__tag"><i class="ph-fill ph-lightning"></i>' +
          (pend.length ? 'Continue de onde parou' : 'Curso concluído') + '</span>' +
        '<div class="cl-hero__title"></div>' +
        '<div class="cl-hero__meta"></div>' +
        '<button type="button" class="cl-hero__cta"><i class="ph-fill ph-play-circle"></i>Ir para a aula</button>' +
      '</div>';
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
        n.classList.contains('cl-hero') || n.classList.contains('cl-filters');
    };
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.target.closest && m.target.closest('.cl-hero, .cl-filters')) continue;
      var nodes = Array.prototype.slice.call(m.addedNodes).concat(Array.prototype.slice.call(m.removedNodes));
      if (nodes.length && !nodes.every(ours)) { refresh(); break; }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();
