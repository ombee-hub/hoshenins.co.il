// Hoshen — accessibility widget. Settings are saved in localStorage and re-applied on every page.
(function () {
  var KEY = 'hoshen-a11y';
  var root = document.documentElement;
  var he = root.lang === 'he';

  var T = he ? {
    open: 'פתיחת תפריט נגישות', title: 'תפריט נגישות', close: 'סגירה', big: 'יישומון גדול',
    contrast: 'ניגודיות +', links: 'הדגשת קישורים', text: 'טקסט גדול', spacing: 'ריווח טקסט',
    pause: 'ביטול הנפשות', noimg: 'הסתרת תמונות', dyslexia: 'תמיכה בדיסלקציה', cursor: 'סמן גדול',
    tips: 'תיאורים', lh: 'גובה שורה', align: 'יישור טקסט', sat: 'רוויה',
    reset: 'איפוס כל הגדרות הנגישות', move: 'העברת היישומון לצד השני', hide: 'הסתרת היישומון',
    statement: 'הצהרת נגישות'
  } : {
    open: 'Open accessibility menu', title: 'Accessibility', close: 'Close', big: 'Large widget',
    contrast: 'Contrast +', links: 'Highlight links', text: 'Bigger text', spacing: 'Text spacing',
    pause: 'Pause animations', noimg: 'Hide images', dyslexia: 'Dyslexia friendly', cursor: 'Big cursor',
    tips: 'Tooltips', lh: 'Line height', align: 'Text align', sat: 'Saturation',
    reset: 'Reset all accessibility settings', move: 'Move widget to other side', hide: 'Hide widget',
    statement: 'Accessibility statement'
  };

  var ICONS = {
    contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="#111"/>',
    links: '<path d="M9 15l6-6"/><path d="M11 6.5l1.5-1.5a4 4 0 0 1 5.7 5.7L16.7 12.2"/><path d="M13 17.5l-1.5 1.5a4 4 0 0 1-5.7-5.7l1.5-1.5"/>',
    text: '<path d="M3 7V5h9v2"/><path d="M7.5 5v14"/><path d="M5.5 19h4"/><path d="M14 11V9.5h7V11"/><path d="M17.5 9.5V19"/><path d="M16 19h3"/>',
    spacing: '<path d="M3 12h18"/><path d="M6 9l-3 3 3 3"/><path d="M18 9l3 3-3 3"/>',
    pause: '<path d="M10 9v6M14 9v6"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    noimg: '<rect x="3" y="5" width="15" height="14" rx="1"/><path d="M3 16l4-4 4 4 3-3 4 4"/><path d="M17 3l4 4M21 3l-4 4"/>',
    dyslexia: '<path d="M4 6h3a5 6 0 0 1 0 12H4z"/><path d="M15 18V9a3 3 0 0 1 5-2"/><path d="M13 11h6"/>',
    cursor: '<path d="M5 3l14 8-6 1.5L10 19z"/>',
    tips: '<path d="M4 4h16v12H9l-5 4z"/><path d="M12 8v.01M12 11v3"/>',
    lh: '<path d="M10 6h11M10 10h11M10 14h11M10 18h11"/><path d="M5 4v16M3 6l2-2 2 2M3 18l2 2 2-2"/>',
    align: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
    sat: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" fill="#111"/>'
  };

  // [key, levels] — levels > 1 means the tile cycles through steps, then off
  var TOOLS = [['contrast', 1], ['links', 1], ['text', 3], ['spacing', 1], ['pause', 1], ['noimg', 1],
    ['dyslexia', 1], ['cursor', 1], ['tips', 1], ['lh', 2], ['align', 3], ['sat', 3]];
  var CLASS = { contrast: 'a11y-contrast', links: 'a11y-links', text: 'a11y-text-', spacing: 'a11y-spacing', pause: 'a11y-pause',
    noimg: 'a11y-noimg', dyslexia: 'a11y-dyslexia', cursor: 'a11y-cursor', tips: 'a11y-tips', lh: 'a11y-lh-', align: 'a11y-align-', sat: 'a11y-sat-' };

  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { state = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function apply() {
    TOOLS.forEach(function (t) {
      var k = t[0], max = t[1], v = state[k] || 0;
      if (max === 1) root.classList.toggle(CLASS[k], v > 0);
      else for (var i = 1; i <= max; i++) root.classList.toggle(CLASS[k] + i, v === i);
    });
    root.classList.toggle('a11y-right', !!state.right);
    root.classList.toggle('a11y-big', !!state.big);
  }
  apply(); // as early as possible, before the widget is built

  function svg(paths) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths + '</svg>'; }

  function build() {
    var launch = document.createElement('button');
    launch.className = 'a11y-launch';
    launch.setAttribute('aria-label', T.open);
    launch.setAttribute('aria-expanded', 'false');
    launch.setAttribute('aria-controls', 'a11y-panel');
    launch.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M19 8.5l-5 .8V13l2.4 7.2a1 1 0 0 1-1.9.6L12 14.5l-2.5 6.3a1 1 0 0 1-1.9-.6L10 13V9.3l-5-.8a1 1 0 0 1 .3-2l6.7.9 6.7-.9a1 1 0 0 1 .3 2z"/></svg>';

    var panel = document.createElement('div');
    panel.className = 'a11y-panel';
    panel.id = 'a11y-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', T.title);
    panel.setAttribute('dir', he ? 'rtl' : 'ltr');

    var tiles = TOOLS.map(function (t) {
      var dots = t[1] > 1 ? '<span class="a11y-dots">' + new Array(t[1] + 1).join('<i></i>') + '</span>' : '';
      return '<button class="a11y-tile" data-tool="' + t[0] + '" aria-pressed="false">' + svg(ICONS[t[0]]) + '<span>' + T[t[0]] + '</span>' + dots + '</button>';
    }).join('');

    panel.innerHTML =
      '<div class="a11y-head"><h2>' + T.title + '</h2><button class="a11y-x" aria-label="' + T.close + '">' + svg('<path d="M6 6l12 12M18 6L6 18"/>') + '</button></div>' +
      '<div class="a11y-body">' +
        '<div class="a11y-big-row"><span id="a11y-big-label">' + T.big + '</span><button class="a11y-switch" role="switch" aria-labelledby="a11y-big-label" aria-checked="false"></button></div>' +
        '<div class="a11y-grid">' + tiles + '</div>' +
        '<button class="a11y-reset">' + svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>') + T.reset + '</button>' +
      '</div>' +
      '<div class="a11y-foot"><button class="a11y-move">' + T.move + '</button><button class="a11y-hide">' + T.hide + '</button><a href="accessibility.html">' + T.statement + '</a></div>';

    document.body.appendChild(launch);
    document.body.appendChild(panel);

    var bigSwitch = panel.querySelector('.a11y-switch');
    function sync() {
      panel.querySelectorAll('.a11y-tile').forEach(function (b) {
        var k = b.dataset.tool, v = state[k] || 0;
        b.setAttribute('aria-pressed', v > 0 ? 'true' : 'false');
        b.querySelectorAll('.a11y-dots i').forEach(function (d, i) { d.classList.toggle('on', i < v); });
      });
      bigSwitch.setAttribute('aria-checked', state.big ? 'true' : 'false');
    }
    sync();

    function setOpen(open) {
      panel.classList.toggle('open', open);
      launch.setAttribute('aria-expanded', open);
      if (open) panel.querySelector('.a11y-x').focus(); else launch.focus();
    }
    launch.addEventListener('click', function () { setOpen(!panel.classList.contains('open')); });
    panel.querySelector('.a11y-x').addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('open')) setOpen(false); });
    document.addEventListener('click', function (e) {
      if (panel.classList.contains('open') && !panel.contains(e.target) && !launch.contains(e.target)) setOpen(false);
    });

    panel.querySelector('.a11y-grid').addEventListener('click', function (e) {
      var b = e.target.closest('.a11y-tile');
      if (!b) return;
      var k = b.dataset.tool, max = TOOLS.filter(function (t) { return t[0] === k; })[0][1];
      state[k] = ((state[k] || 0) + 1) % (max + 1);
      save(); apply(); sync();
    });
    bigSwitch.addEventListener('click', function () { state.big = !state.big; save(); apply(); sync(); });
    panel.querySelector('.a11y-reset').addEventListener('click', function () {
      var keep = { right: state.right };
      state = keep; save(); apply(); sync();
    });
    panel.querySelector('.a11y-move').addEventListener('click', function () { state.right = !state.right; save(); apply(); });
    panel.querySelector('.a11y-hide').addEventListener('click', function () {
      setOpen(false);
      root.classList.add('a11y-hidden'); // hidden until the next page load
    });

    // "Tooltips": show the alt text / label of images and links on hover and keyboard focus
    var tip = document.createElement('div');
    tip.className = 'a11y-tip';
    tip.hidden = true;
    document.body.appendChild(tip);
    function label(el) {
      var t = el.closest('img[alt], a, button, iframe');
      if (!t || panel.contains(t)) return '';
      return (t.getAttribute('alt') || t.getAttribute('aria-label') || t.getAttribute('title') || (t.tagName === 'A' ? t.textContent.trim() : '') || '').trim();
    }
    function showTip(e, el) {
      if (!state.tips) return;
      var text = label(el);
      if (!text) { tip.hidden = true; return; }
      tip.textContent = text;
      tip.hidden = false;
      var r = el.getBoundingClientRect();
      var x = e && e.clientX != null ? e.clientX + 14 : r.left;
      var y = e && e.clientY != null ? e.clientY + 18 : r.bottom + 6;
      tip.style.left = Math.min(x, window.innerWidth - tip.offsetWidth - 8) + 'px';
      tip.style.top = Math.min(y, window.innerHeight - tip.offsetHeight - 8) + 'px';
    }
    document.addEventListener('mouseover', function (e) { showTip(e, e.target); });
    document.addEventListener('mousemove', function (e) { if (!tip.hidden) showTip(e, e.target); });
    document.addEventListener('focusin', function (e) { showTip(null, e.target); });
    document.addEventListener('mouseout', function () { tip.hidden = true; });
    document.addEventListener('focusout', function () { tip.hidden = true; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
