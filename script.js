(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Header shadow on scroll
  const header = $('.header');
  const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const burger = $('#burger');
  const nav = $('#nav');
  const setMenu = open => {
    nav.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'סגירת תפריט' : 'פתיחת תפריט');
  };
  if (burger && nav) {
    burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
    document.addEventListener('click', e => {
      if (nav.classList.contains('open') && !nav.contains(e.target) && !burger.contains(e.target)) setMenu(false);
    });
    $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  }

  // Dropdowns (click/touch + keyboard)
  $$('.has-sub > .nav__link').forEach(btn => {
    btn.addEventListener('click', () => {
      const li = btn.parentElement;
      const open = !li.classList.contains('open');
      $$('.has-sub.open').forEach(o => { if (o !== li) { o.classList.remove('open'); $('.nav__link', o).setAttribute('aria-expanded', 'false'); } });
      li.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open);
    });
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.has-sub')) $$('.has-sub.open').forEach(o => { o.classList.remove('open'); $('.nav__link', o).setAttribute('aria-expanded', 'false'); });
  });

  // Tabs
  const tabs = $$('[role="tab"]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        panel.hidden = !on;
        if (on) $$('.reveal', panel).forEach(r => r.classList.add('in'));
      });
    });
    tab.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const i = tabs.indexOf(tab);
      const next = tabs[(i + (e.key === 'ArrowLeft' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus(); next.click();
    });
  });

  // Reveal on scroll
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = 'IntersectionObserver' in window && !reduced
    ? new IntersectionObserver(entries => entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      }), { threshold: .12, rootMargin: '0px 0px -40px 0px' })
    : null;
  $$('.reveal').forEach((el, i) => {
    if (!io) return el.classList.add('in');
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    io.observe(el);
  });

  // Counters
  const animate = el => {
    const end = parseFloat(el.dataset.count);
    const dec = +el.dataset.dec || 0;
    const start = el.hasAttribute('data-plain') ? Math.max(0, end - 32) : 0;
    const t0 = performance.now(), dur = 1600;
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur);
      const v = start + (end - start) * (1 - Math.pow(1 - p, 3));
      el.textContent = v.toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const counters = $$('[data-count]');
  if (counters.length && !reduced && 'IntersectionObserver' in window) {
    const co = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { animate(en.target); co.unobserve(en.target); }
    }), { threshold: .6 });
    counters.forEach(c => co.observe(c));
  }

  // Logo carousel – endless, auto-advancing, pauses on hover/focus or via the pause button
  $$('[data-carousel]').forEach(view => {
    const track = $('.logos__track', view);
    const originals = $$('.logos__item', track);
    const count = originals.length;
    originals.forEach(li => {
      const c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      $('img', c).alt = '';
      track.appendChild(c);
    });
    const section = view.closest('section');
    const pauseBtn = $('.logos__pause', section);
    let index = 0, timer = null, hover = false, paused = false;

    const step = () => {
      const item = track.children[0];
      return item.offsetWidth + parseFloat(getComputedStyle(track).columnGap || 0);
    };
    // RTL: the track starts at the right edge, so moving forward means shifting right
    const dir = getComputedStyle(view).direction === 'rtl' ? 1 : -1;
    const go = (i, animate = true) => {
      track.style.transition = animate ? '' : 'none';
      index = i;
      track.style.transform = `translateX(${dir * index * step()}px)`;
      if (!animate) void track.offsetWidth;
    };
    track.addEventListener('transitionend', () => { if (index >= count) go(index - count, false); });
    const next = () => go(index + 1);
    const prev = () => { if (index <= 0) go(count, false); go(index - 1); };

    const start = () => { stop(); if (!hover && !paused) timer = setInterval(next, 2600); };
    function stop() { clearInterval(timer); timer = null; }

    $$('.logos__btn[data-dir]', section).forEach(b => b.addEventListener('click', () => {
      b.dataset.dir === 'next' ? next() : prev();
      start();
    }));
    if (pauseBtn) pauseBtn.addEventListener('click', () => {
      paused = !paused;
      pauseBtn.setAttribute('aria-pressed', paused);
      pauseBtn.setAttribute('aria-label', paused ? 'הפעלת הקרוסלה' : 'עצירת הקרוסלה');
      pauseBtn.innerHTML = paused
        ? '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
        : '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>';
      start();
    });
    view.addEventListener('mouseenter', () => { hover = true; stop(); });
    view.addEventListener('mouseleave', () => { hover = false; start(); });
    window.addEventListener('resize', () => go(index, false));
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    start();
  });

  // Quote form → validated, then sent as a WhatsApp message to the office
  const form = $('#quoteForm');
  if (form) {
    const msg = $('.form__msg', form);
    form.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;
      ['name', 'phone'].forEach(n => {
        const input = form.elements[n];
        const bad = !input.value.trim() || !input.checkValidity();
        input.closest('.field').classList.toggle('invalid', bad);
        if (bad) ok = false;
      });
      const consent = form.elements.consent;
      consent.closest('.consent').classList.toggle('invalid', !consent.checked);
      if (!consent.checked) ok = false;
      if (!ok) {
        msg.className = 'form__msg err';
        msg.textContent = 'נא למלא שם, טלפון תקין ולאשר יצירת קשר';
        return;
      }
      const f = form.elements;
      const text = `שלום, אשמח לקבל הצעת מחיר.\nשם: ${f.name.value.trim()}\nטלפון: ${f.phone.value.trim()}` +
        (f.email.value.trim() ? `\nאימייל: ${f.email.value.trim()}` : '') + `\nנושא: ${f.topic.value}`;
      window.open(`https://wa.me/97297668365?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      msg.className = 'form__msg ok';
      msg.textContent = 'תודה! נחזור אליכם בהקדם.';
      form.reset();
    });
  }

  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();
