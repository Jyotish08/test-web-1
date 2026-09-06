import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';

// 5.1 — Register the one easing curve, once, by name
gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, CustomEase);
CustomEase.create('silk', '0.22, 1, 0.36, 1');

// Type definitions for color triples
type RGB = [number, number, number];
interface Palette {
  bg: RGB;
  mid: RGB;
  fg: RGB;
  accent: RGB;
}

const act1Vars: Palette = {
  bg: [20, 40, 31],        // #14281F canopy-deep
  mid: [46, 82, 64],       // #2E5240 canopy-mid
  fg: [185, 201, 190],     // #B9C9BE mist
  accent: [111, 169, 140]  // #6FA98C clear water
};

const act2Vars: Palette = {
  bg: [217, 207, 184],     // #D9CFB8 overcast sky
  mid: [140, 90, 52],      // #8C5A34 sun-baked clay
  fg: [91, 74, 52],        // #5B4A34 thatch/soil
  accent: [201, 162, 39]   // #C9A227 ripening paddy gold
};

const act3Vars: Palette = {
  bg: [27, 27, 24],        // #1B1B18 void
  mid: [75, 78, 70],       // #4B4E46 smog grey
  fg: [110, 122, 78],      // #6E7A4E sludge
  accent: [199, 199, 154]  // #C7C79A acid haze
};

const root = document.documentElement.style;

// Audio synthesis state (Web Audio API generative ambient atmosphere)
class RainAudioSystem {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private masterGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;

  public init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Pink noise buffer generation for ambient rain
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.frequency.setValueAtTime(700, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(this.noiseFilter);
    this.noiseFilter.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    whiteNoise.start(0);
  }

  public toggle(): boolean {
    if (!this.ctx) {
      this.init();
    }
    if (!this.ctx || !this.masterGain) return false;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (!this.isPlaying) {
      this.masterGain.gain.setTargetAtTime(0.28, this.ctx.currentTime, 0.4);
      this.isPlaying = true;
    } else {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
      this.isPlaying = false;
    }
    return this.isPlaying;
  }

  public setIntensity(freq: number) {
    if (this.ctx && this.noiseFilter) {
      this.noiseFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.5);
    }
  }
}

// 5.4 — Living palette morphing
function createPaletteMorph(
  fromVars: Palette,
  toVars: Palette,
  trigger: string | HTMLElement,
  start: string = 'top bottom',
  end: string = 'top top'
) {
  gsap.to({}, {
    scrollTrigger: {
      trigger,
      start,
      end,
      scrub: 1
    },
    onUpdate: function () {
      const p = this.progress();
      (['bg', 'mid', 'fg', 'accent'] as const).forEach(key => {
        const [r1, g1, b1] = fromVars[key];
        const [r2, g2, b2] = toVars[key];
        const r = Math.round(r1 + (r2 - r1) * p);
        const g = Math.round(g1 + (g2 - g1) * p);
        const b = Math.round(b1 + (b2 - b1) * p);
        root.setProperty(`--${key}`, `${r} ${g} ${b}`);
      });
    }
  });
}

function initRainfallApp() {
  const audio = new RainAudioSystem();
  const soundBtn = document.getElementById('sound-toggle');
  const soundCaption = document.getElementById('sound-caption');
  const captionText = document.getElementById('caption-text');
  const currentActTag = document.getElementById('current-act-tag');

  function showCaption(text: string) {
    if (!soundCaption || !captionText) return;
    captionText.textContent = text;
    soundCaption.classList.add('visible');
  }

  // Audio button handler
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const active = audio.toggle();
      soundBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
      const textEl = soundBtn.querySelector('.sound-text');
      if (textEl) {
        textEl.textContent = active ? 'Sound On' : 'Atmosphere';
      }
      if (active) {
        showCaption('Atmospheric audio enabled');
        setTimeout(() => {
          soundCaption?.classList.remove('visible');
        }, 3200);
      }
    });
  }

  // Video autoplay helper
  const videos = document.querySelectorAll<HTMLVideoElement>('video');
  videos.forEach(v => {
    v.muted = true;
    const playPromise = v.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        const startOnUser = () => {
          v.play();
          window.removeEventListener('scroll', startOnUser);
          window.removeEventListener('touchstart', startOnUser);
          window.removeEventListener('click', startOnUser);
        };
        window.addEventListener('scroll', startOnUser, { once: true });
        window.addEventListener('touchstart', startOnUser, { once: true });
        window.addEventListener('click', startOnUser, { once: true });
      });
    }
  });

  // GSAP Responsive & Accessibility MatchMedia (§5.8)
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // 5.2 — ScrollSmoother for inertial scroll
    const smoother = ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1.2,
      effects: true,
      normalizeScroll: true
    });

    // Expose smoother globally for interactions / programmatic navigation
    (window as unknown as { smoother: ScrollSmoother }).smoother = smoother;

    // 5.3 — The one orchestrated hero entrance
    const heroTitle = document.getElementById('act1-title');
    if (heroTitle) {
      const split = new SplitText(heroTitle, { type: 'chars', charsClass: 'split-char' });
      gsap.timeline({ delay: 0.2 })
        .from(split.chars, {
          yPercent: 110,
          opacity: 0,
          stagger: 0.025,
          duration: 1.0,
          ease: 'silk'
        })
        .from('#act1-subline', {
          autoAlpha: 0,
          y: 20,
          duration: 0.8,
          ease: 'silk'
        }, '-=0.4');
    }

    // 5.4 — Living palette scrubbed across boundaries
    // Act I -> Act II boundary: as #act2 scrolls from viewport bottom to top
    createPaletteMorph(act1Vars, act2Vars, '#act2', 'top bottom', 'top top');
    // Act II -> Act III boundary: as #act3 scrolls from viewport bottom to top
    createPaletteMorph(act2Vars, act3Vars, '#act3', 'top bottom', 'top top');

    // 5.5 — Display typeface hardens via proxy object
    // Act I/II: soft: 100, opsz: 20 (warm & rounded)
    // Act III: soft: 0, opsz: 144 (sharp & industrial)
    const grade = { soft: 100, opsz: 20 };
    gsap.to(grade, {
      soft: 0,
      opsz: 144,
      scrollTrigger: {
        trigger: '#act3',
        start: 'top bottom',
        end: 'top top',
        scrub: true
      },
      onUpdate: () => {
        document.querySelectorAll<HTMLElement>('h1, h2, h3, .panel-name').forEach(el => {
          el.style.fontVariationSettings = `"SOFT" ${grade.soft.toFixed(1)}, "opsz" ${grade.opsz.toFixed(1)}`;
        });
      }
    });

    // Act II Title: Held together by hand appears as camera settles
    gsap.from('#act2-title', {
      y: 35,
      autoAlpha: 0,
      duration: 1.2,
      ease: 'silk',
      scrollTrigger: {
        trigger: '.shot-2a',
        start: 'top 40%',
        end: 'center center',
        scrub: 1
      }
    });

    // Act II 2B caption reveal
    gsap.from('.act2-caption-block', {
      y: 30,
      autoAlpha: 0,
      duration: 0.8,
      ease: 'silk',
      scrollTrigger: {
        trigger: '.shot-2b',
        start: 'top 60%',
        end: 'top 30%',
        scrub: 1
      }
    });

    // 5.6 — Pollution triptych: pinned, staggered clip-path reveal
    gsap.timeline({
      scrollTrigger: {
        trigger: '#act3-panels',
        pin: true,
        scrub: 1,
        start: 'top top',
        end: '+=1400',
        anticipatePin: 1
      }
    })
      .fromTo('.panel-water',
        { clipPath: 'inset(0 0 100% 0)' },
        { clipPath: 'inset(0 0 0% 0)', ease: 'silk', duration: 1.0 }
      )
      .fromTo('.panel-air',
        { clipPath: 'inset(0 0 100% 0)' },
        { clipPath: 'inset(0 0 0% 0)', ease: 'silk', duration: 1.0 },
        '-=0.7'
      )
      .fromTo('.panel-land',
        { clipPath: 'inset(0 0 100% 0)' },
        { clipPath: 'inset(0 0 0% 0)', ease: 'silk', duration: 1.0 },
        '-=0.7'
      );

    // Closing thesis stagger
    gsap.from('#closing-thesis .thesis-line', {
      y: 40,
      autoAlpha: 0,
      stagger: 0.25,
      duration: 1.1,
      ease: 'silk',
      scrollTrigger: {
        trigger: '#act-close',
        start: 'top 70%',
        end: 'top 35%',
        scrub: 1
      }
    });

    // 5.7 — Progress indicator ticks (filling 0% → 100% per act)
    const tickFill1 = document.getElementById('tick-fill-1');
    const tickFill2 = document.getElementById('tick-fill-2');
    const tickFill3 = document.getElementById('tick-fill-3');

    const updateTick = (fillEl: HTMLElement | null, p: number) => {
      if (fillEl) {
        fillEl.style.height = `${Math.min(100, Math.max(0, p * 100))}%`;
      }
    };

    ScrollTrigger.create({
      trigger: '#act1',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: self => {
        updateTick(tickFill1, self.progress);
        if (self.isActive && currentActTag) {
          currentActTag.textContent = 'Act I · Rainforest';
          audio.setIntensity(650);
        }
      }
    });

    ScrollTrigger.create({
      trigger: '#act2',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: self => {
        updateTick(tickFill2, self.progress);
        if (self.isActive && currentActTag) {
          currentActTag.textContent = 'Act II · Human Effort';
          audio.setIntensity(480);
        }
      }
    });

    ScrollTrigger.create({
      trigger: '#act3',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: self => {
        updateTick(tickFill3, self.progress);
        if (self.isActive && currentActTag) {
          currentActTag.textContent = 'Act III · Collapse';
          audio.setIntensity(950);
        }
      }
    });

    ScrollTrigger.create({
      trigger: '#act-close',
      start: 'top center',
      onEnter: () => {
        if (currentActTag) currentActTag.textContent = 'Epilogue';
        audio.setIntensity(400);
      },
      onLeaveBack: () => {
        if (currentActTag) currentActTag.textContent = 'Act III · Collapse';
      }
    });

    // Progress tick click to jump
    document.querySelectorAll<HTMLButtonElement>('.indicator-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetSelector = btn.getAttribute('data-act-target');
        if (targetSelector) {
          smoother.scrollTo(targetSelector, true, 'top top');
        }
      });
    });

    // Share button
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const shareData = {
          title: 'RAINFALL — A Study in Three Acts',
          text: 'A single-scroll documentary: nature functioning → human effort → collapse.',
          url: window.location.href
        };
        if (navigator.share) {
          try {
            await navigator.share(shareData);
          } catch {
            // User dismissed
          }
        } else {
          navigator.clipboard.writeText(window.location.href);
          const orig = shareBtn.innerHTML;
          shareBtn.innerHTML = '<span class="btn-text">Link Copied</span>';
          setTimeout(() => {
            shareBtn.innerHTML = orig;
          }, 2400);
        }
      });
    }

    // Return to top button
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', e => {
        e.preventDefault();
        smoother.scrollTo('#act1', true, 'top top');
      });
    }
  });

  // Reduced motion fallback (§5.8)
  mm.add('(prefers-reduced-motion: reduce)', () => {
    document.querySelectorAll<HTMLElement>('.triptych-panel').forEach(panel => {
      panel.style.clipPath = 'none';
    });
    document.querySelectorAll<HTMLElement>('h1, h2, h3, .panel-name').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.fontVariationSettings = '"SOFT" 50, "opsz" 36';
    });
    const heroTitle = document.getElementById('act1-title');
    if (heroTitle) {
      heroTitle.style.opacity = '1';
    }
    const subline = document.getElementById('act1-subline');
    if (subline) {
      subline.style.opacity = '1';
    }
  });
}

// Guarantee execution whether script runs before or after DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRainfallApp);
} else {
  initRainfallApp();
}
