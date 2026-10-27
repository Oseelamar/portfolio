/* Case-study pages. Mirrors index.html's navbar, reveals and analytics
   beacon; the pages themselves are static, so there is nothing else to run. */

(function () {
  var toggle = document.querySelector('.navbar__toggle');
  var menu = document.getElementById('primary-menu');
  if (!toggle || !menu) return;

  var navbar = toggle.closest('.navbar');

  toggle.addEventListener('click', function () {
    var isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    menu.classList.toggle('is-open', !isOpen);
    /* The bar itself carries the heavier blur, since the open panel is part
       of it — the class can't come from CSS alone, as `is-open` sits on a
       descendant. */
    navbar.classList.toggle('is-expanded', !isOpen);
  });

  menu.addEventListener('click', function (event) {
    if (event.target.closest('a')) {
      navbar.classList.remove('is-expanded');
      toggle.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
    }
  });
})();

/* ---------------------------------------------------------
   Scroll reveals. Siblings in the same group are staggered
   slightly so a row settles in sequence rather than as a block.
   --------------------------------------------------------- */
(function () {
  var revealed = document.querySelectorAll('[data-reveal]');
  if (!revealed.length) return;

  var armed = document.documentElement.classList.contains('js-motion');
  function show(el) { el.classList.add('is-revealed'); }

  if (!armed || !('IntersectionObserver' in window)) {
    for (var n = 0; n < revealed.length; n++) show(revealed[n]);
    return;
  }

  var groups = new Map();
  for (var i = 0; i < revealed.length; i++) {
    var parent = revealed[i].parentElement;
    var seen = groups.get(parent) || 0;
    revealed[i].style.setProperty('--reveal-delay', Math.min(seen * 70, 280) + 'ms');
    groups.set(parent, seen + 1);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      show(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

  for (var k = 0; k < revealed.length; k++) io.observe(revealed[k]);

  /* Short elements sitting inside that bottom inset — the footer's rows —
     can never satisfy the observer once the page has run out of scroll,
     so anything still hidden at the end of the document is released here. */
  function sweepAtBottom() {
    if (window.innerHeight + window.scrollY < document.body.scrollHeight - 4) return;
    for (var j = 0; j < revealed.length; j++) show(revealed[j]);
    window.removeEventListener('scroll', sweepAtBottom);
  }
  window.addEventListener('scroll', sweepAtBottom, { passive: true });
  sweepAtBottom();
})();

/* ---------------------------------------------------------
   Analytics beacon.

   Fire-and-forget: sendBeacon hands the payload to the browser, which
   delivers it on its own time, so nothing here blocks a click or delays
   the page. No cookies and no identifiers are set on this end — the
   collector derives a daily-rotating hash and stores no IP.
   --------------------------------------------------------- */
(function () {
  var ENDPOINT = 'https://portfolio-analytics.collinsabuduac.workers.dev/collect';
  if (!navigator.sendBeacon) return;

  var device = window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop';

  /* The last path segment of /work/<slug>/ names the case study. */
  var slug = location.pathname.replace(/\/+$/, '').split('/').pop() || 'case';

  function send(payload) {
    payload.path = location.pathname;
    payload.device = device;
    try {
      /* text/plain keeps this a "simple" request, so the browser skips the
         CORS preflight and it costs one round trip rather than two. */
      navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(payload)], { type: 'text/plain' }));
    } catch (err) { /* analytics must never break the page */ }
  }

  send({ type: 'pageview', referrer: document.referrer || null });

  var ICON = { LinkedIn: 'linkedin', X: 'x', Behance: 'behance', 'Email Collins': 'email-icon' };

  function label(a) {
    if (a.classList.contains('case-visit')) return 'visit-site:' + slug;
    if (a.classList.contains('case-next')) return 'next-project:' + slug;
    if (a.classList.contains('case-back')) return 'back-to-work:' + slug;
    return ICON[a.getAttribute('aria-label')] || null;
  }

  document.addEventListener(
    'click',
    function (event) {
      var a = event.target.closest && event.target.closest('a');
      if (!a) return;
      var name = label(a);
      if (name) send({ type: 'click', name: name });
    },
    true
  );
})();
