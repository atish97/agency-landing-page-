(() => {
  'use strict';

  const STAGE_WIDTH = 1440;
  const STAGE_HEIGHT = 9333;
  const viewport = document.getElementById('viewport');
  const stage = document.getElementById('stage');
  const progressBar = document.getElementById('progress');

  let currentScale = 1;

  // 1. Responsive 1440px Canvas Scaling on Desktop (>= 1024px), Natural Flow on Mobile/Tablet (< 1024px)
  const heroStrip = document.getElementById('heroStrip');
  const heroStripOriginal = heroStrip ? heroStrip.innerHTML : '';
  let heroMarqueeActive = false;

  function syncHeroStrip(isMobile) {
    if (heroStrip) {
      if (isMobile && !heroMarqueeActive) {
        heroStrip.innerHTML = `<div class="hero-strip-track">${heroStripOriginal}${heroStripOriginal}</div>`;
        heroMarqueeActive = true;
      } else if (!isMobile && heroMarqueeActive) {
        heroStrip.innerHTML = heroStripOriginal;
        heroMarqueeActive = false;
      }
    }
  }

  function updateScale() {
    if (!viewport || !stage) return;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    if (vw < 1024) {
      currentScale = 1;
      stage.style.transform = '';
      viewport.style.height = 'auto';
      syncHeroStrip(true);
    } else {
      currentScale = vw / STAGE_WIDTH;
      stage.style.transform = `scale(${currentScale})`;
      viewport.style.height = `${STAGE_HEIGHT * currentScale}px`;
      syncHeroStrip(false);
    }
  }

  // Mobile Hamburger Menu
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  if (hamburgerBtn && mobileDrawer) {
    hamburgerBtn.addEventListener('click', () => {
      const open = mobileDrawer.classList.toggle('open');
      hamburgerBtn.classList.toggle('open', open);
      hamburgerBtn.setAttribute('aria-expanded', String(open));
    });
    mobileDrawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
        hamburgerBtn.classList.remove('open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  updateScale();
  window.addEventListener('resize', updateScale, { passive: true });

  // 2. Top Scroll Progress Bar, Sequential Stacking Stat Cards & Fallback Reveal Check
  const statCards = Array.from(document.querySelectorAll('#about .stat'));
  const STAT_NAT_TOP = [1147, 1353, 1559];
  const PEEK_STEP = 28;
  const MAX_PIN_TOP = 1625;

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function updateStatStack() {
    if (statCards.length !== 3) return;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    if (vw < 1024) {
      statCards.forEach((card) => {
        card.style.zIndex = '';
        card.style.transform = '';
        card.style.opacity = '';
        card.style.pointerEvents = '';
      });
      return;
    }
    const scrollStageY = window.scrollY / (currentScale || 1);
    const pinY = scrollStageY + 180;

    // Card 1 pins between 1147 and 1625; Card 2 & 3 stay hidden until scrolled into
    const top1 = Math.min(MAX_PIN_TOP, Math.max(STAT_NAT_TOP[0], pinY));
    const p2 = clamp01((pinY - 1215) / 175);
    const p3 = clamp01((pinY - 1425) / 175);

    const top2 = top1 + PEEK_STEP + (1 - p2) * 140;
    const top3 = top1 + PEEK_STEP * 2 + (1 - p3) * 140;

    const tops = [top1, top2, top3];
    const opacities = [
      statCards[0].classList.contains('in') ? 1 : 0,
      p2,
      p3,
    ];
    const scales = [
      1 - p2 * 0.03 - p3 * 0.02,
      1 - p3 * 0.025,
      1,
    ];

    statCards.forEach((card, idx) => {
      const dy = tops[idx] - STAT_NAT_TOP[idx];
      card.style.zIndex = String(10 + idx);
      card.style.transformOrigin = 'center top';
      card.style.transform = `translate3d(0, ${dy.toFixed(2)}px, 0) scale(${scales[idx].toFixed(4)})`;
      if (idx > 0) {
        card.style.opacity = String(opacities[idx].toFixed(3));
        card.style.pointerEvents = opacities[idx] > 0.2 ? 'auto' : 'none';
      }
    });
  }

  const bentoCards = Array.from(document.querySelectorAll('#bentoStack .bento'));

  function updateBentoStack() {
    if (!bentoCards.length) return;
    bentoCards.forEach((card) => {
      card.style.zIndex = '';
      card.style.transform = '';
      card.style.opacity = '';
      card.style.pointerEvents = '';
    });
  }

  let scrollRaf = 0;
  function onScroll() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / docHeight)) : 0;
    if (progressBar) {
      progressBar.style.transform = `scaleX(${pct})`;
    }
    if (!scrollRaf) {
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        updateStatStack();
        updateBentoStack();
      });
    }
    checkRevealsFallback();
  }

  updateStatStack();
  updateBentoStack();
  window.addEventListener('scroll', onScroll, { passive: true });

  // 3. Disable all link navigation / scroll jumps on click across the entire page
  document.addEventListener('click', (e) => {
    const anchor = e.target instanceof Element ? e.target.closest('a') : null;
    if (anchor) {
      e.preventDefault();
    }
  });

  // 4. Scroll Reveal + Animated Count-Up
  const reveals = Array.from(document.querySelectorAll('.reveal'));
  const countersAnimated = new WeakSet();

  function animateCounter(el) {
    if (countersAnimated.has(el)) return;
    countersAnimated.add(el);
    const target = parseInt(el.getAttribute('data-count') || '0', 10);
    if (!target) return;
    const duration = 1200;
    const start = performance.now();

    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(eased * target));
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = String(target);
      }
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }

  function triggerReveal(el) {
    if (!el.classList.contains('in')) {
      el.classList.add('in');
      el.querySelectorAll('[data-count]').forEach(animateCounter);
    }
  }

  function checkRevealsFallback() {
    const vh = window.innerHeight;
    for (const el of reveals) {
      if (el.classList.contains('in')) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top < vh * 0.94 && rect.bottom > 0) {
        triggerReveal(el);
      }
    }
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            triggerReveal(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach(triggerReveal);
  }
  // Initial check for above-the-fold reveals
  requestAnimationFrame(checkRevealsFallback);

  // 5. Custom Agency Cursor
  const cursor = document.getElementById('cursor');
  const cursorDot = document.getElementById('cursorDot');
  let mouseX = -100;
  let mouseY = -100;
  let curX = -100;
  let curY = -100;
  let cursorStarted = false;

  if (window.matchMedia('(hover: hover)').matches && cursor && cursorDot) {
    window.addEventListener(
      'mousemove',
      (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!cursorStarted) {
          cursorStarted = true;
          curX = mouseX;
          curY = mouseY;
          document.body.classList.add('has-cursor');
        }
        cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      },
      { passive: true }
    );

    function renderCursor() {
      curX += (mouseX - curX) * 0.16;
      curY += (mouseY - curY) * 0.16;
      cursor.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);

    const hoverTargets = document.querySelectorAll(
      'a, button, .work, .svc-card, .t-card, .faq-q, .plan'
    );
    hoverTargets.forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  }

  // 6. Hero Mouse Parallax (.parallax[data-depth])
  const parallaxEls = Array.from(document.querySelectorAll('.parallax[data-depth]'));
  if (parallaxEls.length && window.matchMedia('(hover: hover)').matches) {
    window.addEventListener(
      'mousemove',
      (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        for (const el of parallaxEls) {
          const depth = parseFloat(el.getAttribute('data-depth') || '0');
          el.style.transform = `translate3d(${nx * depth}px, ${ny * depth * 0.75}px, 0)`;
        }
      },
      { passive: true }
    );
  }

  // 7. Magnetic Buttons (.magnetic)
  document.querySelectorAll('.magnetic').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.18;
      const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.18;
      btn.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });

  // 8. Subtle 3D Tilt on Cards (.tilt) — Desktop only (>= 1024px)
  document.querySelectorAll('.tilt').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      if ((document.documentElement.clientWidth || window.innerWidth) < 1024) return;
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(1000px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(
        x * 4
      ).toFixed(2)}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // Mobile tap-only effect for portfolio cards (.work)
  const workCards = document.querySelectorAll('.work');
  workCards.forEach((card) => {
    card.addEventListener('click', () => {
      if ((document.documentElement.clientWidth || window.innerWidth) >= 1024) return;
      const wasActive = card.classList.contains('active');
      workCards.forEach((c) => c.classList.remove('active'));
      if (!wasActive) card.classList.add('active');
    });
  });

  // 9. Populate & Measure Infinite Marquee Tracks (.mq-track)
  document.querySelectorAll('.mq-track[data-tags]').forEach((track) => {
    const tags = (track.getAttribute('data-tags') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!tags.length) return;

    const buildSetHtml = () =>
      tags
        .map(
          (tag) =>
            `<div class="mq-item"><img src="assets/img/marquee-star.svg" alt="" /><span>${tag}</span></div>`
        )
        .join('');

    // Render 1 set first to measure exact width, then duplicate 4x for seamless loop
    track.innerHTML = buildSetHtml();
    const setWidth = track.scrollWidth;
    track.innerHTML = buildSetHtml() + buildSetHtml() + buildSetHtml() + buildSetHtml();
    track.style.setProperty('--set', String(setWidth));

    const startOffset = track.getAttribute('data-start');
    if (startOffset && track.classList.contains('mq-right')) {
      track.style.left = `${parseFloat(startOffset) - setWidth}px`;
    }
  });

  // 10. Pricing Monthly / Quarterly Toggle
  const togglePill = document.getElementById('togglePill');
  const toggleBtns = document.querySelectorAll('.t-btn[data-plan]');
  const priceBoxes = document.querySelectorAll('.plan .price');

  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const plan = btn.getAttribute('data-plan');
      if (!plan || btn.classList.contains('active')) return;

      toggleBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      if (togglePill) {
        if (plan === 'quarterly') {
          togglePill.style.left = '150px';
          togglePill.style.width = '145px';
        } else {
          togglePill.style.left = '8px';
          togglePill.style.width = '129px';
        }
      }

      const attr = plan === 'quarterly' ? 'data-q' : 'data-m';
      priceBoxes.forEach((box) => {
        const bEl = box.querySelector('b');
        const spanEl = box.querySelector('span');
        box.classList.add('swap');
        setTimeout(() => {
          if (bEl) bEl.textContent = bEl.getAttribute(attr) || bEl.textContent;
          if (spanEl) spanEl.textContent = spanEl.getAttribute(attr) || spanEl.textContent;
          box.classList.remove('swap');
        }, 180);
      });
    });
  });

  // 11. Testimonials Carousel Controls (#tPrev, #tNext, #tTrack)
  const tTrack = document.getElementById('tTrack');
  const tPrev = document.getElementById('tPrev');
  const tNext = document.getElementById('tNext');
  let tIndex = 0;
  const STEP_PX = 307; // 283px card + 24px gap
  const MAX_INDEX = 3;

  function updateCarousel() {
    if (!tTrack) return;
    tTrack.style.transform = `translateX(${-tIndex * STEP_PX}px)`;
  }

  if (tPrev) {
    tPrev.addEventListener('click', () => {
      tIndex = tIndex > 0 ? tIndex - 1 : MAX_INDEX;
      updateCarousel();
    });
  }
  if (tNext) {
    tNext.addEventListener('click', () => {
      tIndex = tIndex < MAX_INDEX ? tIndex + 1 : 0;
      updateCarousel();
    });
  }

  // 12. FAQ Accordion
  const faqItems = document.querySelectorAll('.faq');
  faqItems.forEach((item) => {
    const qBtn = item.querySelector('.faq-q');
    if (!qBtn) return;
    qBtn.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      faqItems.forEach((other) => other.classList.remove('open'));
      if (!wasOpen) {
        item.classList.add('open');
      }
    });
  });
})();
