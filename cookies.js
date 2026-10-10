// Hoshen — cookie notice. Loaded on the home page only; shown until the visitor makes a choice.
(function () {
  var KEY = 'hoshen-cookie-consent';
  try { if (localStorage.getItem(KEY)) return; } catch (e) { /* storage blocked: show the notice */ }

  function build() {
    var box = document.createElement('section');
    box.className = 'cookie-banner';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'הודעת עוגיות');
    box.innerHTML =
      '<h2>האתר משתמש בעוגיות</h2>' +
      '<p>אנו משתמשים באחסון דפדפן חיוני ובשירותי צד שלישי (כגון Google Fonts) כדי שהאתר יעבוד כראוי ולשיפור חוויית הגלישה. ' +
      'לפרטים נוספים ראו את <a href="privacy.html">מדיניות הפרטיות</a>.</p>' +
      '<div class="cookie-actions">' +
        '<button class="cookie-accept">מאשר/ת</button>' +
        '<button class="cookie-decline">חיוניות בלבד</button>' +
      '</div>';
    document.body.appendChild(box);
    document.body.classList.add('has-cookie-banner');
    requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.add('show'); }); });

    function choose(value) {
      try { localStorage.setItem(KEY, JSON.stringify({ choice: value, date: new Date().toISOString() })); } catch (e) {}
      box.classList.remove('show');
      document.body.classList.remove('has-cookie-banner');
      setTimeout(function () { box.remove(); }, 400);
    }
    box.querySelector('.cookie-accept').addEventListener('click', function () { choose('all'); });
    box.querySelector('.cookie-decline').addEventListener('click', function () { choose('essential'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
