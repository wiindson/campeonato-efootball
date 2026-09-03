const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function loadAnimations() {
  if (prefersReducedMotion) return;
  const imports = await Promise.allSettled([
    import('https://cdn.jsdelivr.net/npm/gsap@3.15.0/+esm'),
    import('https://cdn.jsdelivr.net/npm/motion@13.1.1/+esm')
  ]);

  const gsapModule = imports[0].status === 'fulfilled' ? imports[0].value : null;
  const motionModule = imports[1].status === 'fulfilled' ? imports[1].value : null;
  const gsap = gsapModule?.gsap || gsapModule?.default || null;
  const motionAnimate = motionModule?.animate || null;

  if (gsap) {
    gsap.fromTo('.hero', { y: 7, opacity: 0 }, { y: 0, opacity: 1, duration: .5, ease: 'power2.out', clearProps: 'transform' });
    gsap.fromTo('main > section', { y: 7, opacity: 0 }, { y: 0, opacity: 1, duration: .42, stagger: .055, delay: .08, ease: 'power2.out', clearProps: 'transform' });
  }

  if (motionAnimate) {
    const findInteractive = target => target.closest?.('.btn, .icon-btn, .score-box button, .player-card');
    document.addEventListener('pointerdown', event => {
      const el = findInteractive(event.target);
      if (!el || el.matches(':disabled')) return;
      motionAnimate(el, { scale: .985 }, { type: 'spring', stiffness: 520, damping: 34 });
    }, { passive: true });
    const release = event => {
      const el = findInteractive(event.target);
      if (!el || el.matches(':disabled')) return;
      motionAnimate(el, { scale: 1 }, { type: 'spring', stiffness: 460, damping: 31 });
    };
    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', release, { passive: true });
  }
}

function syncLeagueProgress() {
  const label = document.getElementById('leagueStatus')?.textContent || '';
  const match = label.match(/(\d+)\s+de\s+10/);
  const done = match ? Number(match[1]) : 0;
  const bar = document.getElementById('leagueProgressBar');
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, done * 10))}%`;
}

syncLeagueProgress();
new MutationObserver(syncLeagueProgress).observe(document.body, { childList: true, subtree: true, characterData: true });
loadAnimations();
