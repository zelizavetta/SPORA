/**
 * <spora-mascot> — маскот SPORA, чистый web component (без зависимостей).
 *
 * Использование:
 *   <script src="spora-mascot.js"></script>
 *   <spora-mascot mood="joy" size="120"></spora-mascot>
 *
 * Атрибуты:
 *   mood     — "joy" | "calm" | "idea" | "anxiety" | "sad" | "neutral"  (по умолчанию "calm")
 *   size     — размер в px (по умолчанию 120)
 *   animate  — "true"/"false", лёгкое покачивание (по умолчанию true)
 *
 * Меняется динамически: mascot.setAttribute('mood', 'joy')
 */
(function () {
  const MOOD_BLUSH = {
    joy: '#FFC93C', calm: '#6FD0E0', idea: '#B99CFF',
    anxiety: '#FF9B6B', sad: '#8FA8D8', neutral: '#a9bda3',
  };

  const FACE = {
    joy:     { eyes: 'arc',  mouth: 'big'   },
    calm:    { eyes: 'dot',  mouth: 'small' },
    idea:    { eyes: 'dot',  mouth: 'o'     },
    anxiety: { eyes: 'dot',  mouth: 'wavy'  },
    sad:     { eyes: 'dot',  mouth: 'frown' },
    neutral: { eyes: 'dot',  mouth: 'small' },
  };

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = `
    <style>
      :host {
        --acc: #4ff2a6;
        --acc-ink: #04241a;
        --mascot-fill: #f3fbe4;
        --mascot-face: #26301c;
        display: inline-block;
        line-height: 0;
      }
      @keyframes spora-bob {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50%      { transform: translateY(-0.45em) rotate(-3deg); }
      }
      @keyframes spora-blink {
        0%, 92%, 100% { transform: scaleY(1); }
        96%           { transform: scaleY(0.1); }
      }
      @keyframes spora-spark {
        0%, 100% { opacity: .4; transform: scale(.75) rotate(0deg); }
        50%      { opacity: 1;  transform: scale(1.15) rotate(45deg); }
      }
      @keyframes spora-drop {
        0%, 100% { transform: translateY(0); opacity: .9; }
        50%      { transform: translateY(0.25em); opacity: 1; }
      }
      .wrap { position: relative; width: 8em; height: 7.2em; color: var(--acc); }
      .anim { position: absolute; inset: 0; animation: spora-bob 3.4s ease-in-out infinite;
        filter: drop-shadow(0 0.3em 0.4em rgba(0,0,0,.25))
                drop-shadow(0 0 0.22em var(--acc))
                drop-shadow(0 0 0.02em var(--acc)); }
      .anim.still { animation: none; }

      /* accessory: bow */
      .bow-l { position:absolute; left:2.78em; top:-0.42em; width:0.98em; height:0.82em; border-radius:60% 30% 60% 30%; background:var(--acc); transform:rotate(-12deg); }
      .bow-r { position:absolute; left:4.25em; top:-0.42em; width:0.98em; height:0.82em; border-radius:30% 60% 30% 60%; background:var(--acc); transform:rotate(12deg); }
      .bow-c { position:absolute; left:3.72em; top:-0.2em; width:0.54em; height:0.54em; border-radius:50%; background:var(--acc); }

      /* body: spiky spore silhouette */
      .body {
        position: absolute; left: 1em; top: 0.7em; width: 6em; height: 6em;
        clip-path: polygon(50% 0%, 60.6% 10.4%, 75% 6.7%, 79% 21%, 93.3% 25%, 89.6% 39.4%, 100% 50%, 89.6% 60.6%, 93.3% 75%, 79% 79%, 75% 93.3%, 60.6% 89.6%, 50% 100%, 39.4% 89.6%, 25% 93.3%, 21% 79%, 6.7% 75%, 10.4% 60.6%, 0% 50%, 10.4% 39.4%, 6.7% 25%, 21% 21%, 25% 6.7%, 39.4% 10.4%);
        background:
          radial-gradient(rgba(74,102,44,0.13) 0.05em, transparent 0.06em) 0 0 / 0.52em 0.52em,
          repeating-linear-gradient(52deg, rgba(74,102,44,0.16) 0 0.018em, transparent 0.018em 0.62em),
          repeating-linear-gradient(-8deg, rgba(74,102,44,0.13) 0 0.018em, transparent 0.018em 0.7em),
          repeating-linear-gradient(-64deg, rgba(74,102,44,0.11) 0 0.016em, transparent 0.016em 0.66em),
          radial-gradient(circle at 40% 34%, #ffffff, var(--mascot-fill) 58%, color-mix(in oklab, var(--mascot-fill) 78%, #5f8a35) 100%);
      }

      /* eyes */
      .eye-arc { position:absolute; width:0.92em; height:0.5em; border-top:0.18em solid var(--mascot-face); border-radius:0.9em 0.9em 0 0; }
      .eye-arc.l { left:2.92em; top:3.2em; } .eye-arc.r { left:4.32em; top:3.2em; }
      .eye-dot { position:absolute; width:0.64em; height:0.8em; border-radius:50%; background:var(--mascot-face); animation:spora-blink 5.5s ease-in-out infinite; transform-origin:center; }
      .eye-dot.l { left:3.05em; top:3.08em; } .eye-dot.r { left:4.4em; top:3.08em; }
      .eye-glint { position:absolute; width:0.19em; height:0.19em; border-radius:50%; background:#fff; opacity:.85; }
      .eye-glint.l { left:3.23em; top:3.2em; } .eye-glint.r { left:4.58em; top:3.2em; }

      /* blush */
      .blush { position:absolute; width:0.8em; height:0.5em; border-radius:50%; opacity:.55; background: var(--blush-color, #a9bda3); }
      .blush.l { left:2.5em; top:3.72em; } .blush.r { left:4.72em; top:3.72em; }

      /* mouths */
      .mouth-big { position:absolute; left:3.38em; top:3.82em; width:1.24em; height:0.74em; border:0.17em solid var(--mascot-face); border-top:none; border-radius:0 0 1.3em 1.3em; background: var(--blush-color, #a9bda3); }
      .mouth-small { position:absolute; left:3.58em; top:3.92em; width:0.86em; height:0.44em; border:0.15em solid var(--mascot-face); border-top:none; border-radius:0 0 0.9em 0.9em; }
      .mouth-frown { position:absolute; left:3.58em; top:4.18em; width:0.86em; height:0.44em; border:0.15em solid var(--mascot-face); border-bottom:none; border-radius:0.9em 0.9em 0 0; }
      .mouth-o { position:absolute; left:3.74em; top:3.88em; width:0.54em; height:0.6em; border:0.15em solid var(--mascot-face); border-radius:50%; background: var(--blush-color, #a9bda3); }
      .mouth-wavy-l { position:absolute; left:3.52em; top:4.0em; width:0.5em; height:0.34em; border-bottom:0.15em solid var(--mascot-face); border-radius:0 0 0.5em 0.5em; }
      .mouth-wavy-r { position:absolute; left:3.97em; top:3.93em; width:0.5em; height:0.34em; border-top:0.15em solid var(--mascot-face); border-radius:0.5em 0.5em 0 0; }

      /* mood accessories */
      .idea-spark { position:absolute; left:5.5em; top:1.4em; width:0.55em; height:0.55em; background:var(--acc); border-radius:0.1em; transform:rotate(45deg); animation:spora-spark 1.8s ease-in-out infinite; }
      .anx-drop { position:absolute; left:5.6em; top:2.5em; width:0.5em; height:0.66em; background:#7fc9df; border-radius:0 50% 50% 50%; transform:rotate(45deg); animation:spora-drop 1.6s ease-in-out infinite; }
    </style>
    <div class="wrap">
      <div class="anim">
        <div class="bow-l"></div><div class="bow-r"></div><div class="bow-c"></div>
        <div class="body"></div>
        <div class="face"></div>
        <div class="blush l"></div><div class="blush r"></div>
        <div class="mouth"></div>
        <div class="mood-fx"></div>
      </div>
    </div>
  `;

  class SporaMascot extends HTMLElement {
    static get observedAttributes() { return ['mood', 'size', 'animate']; }

    connectedCallback() {
      if (!this.shadowRoot) {
        this.attachShadow({ mode: 'open' }).appendChild(TEMPLATE.content.cloneNode(true));
      }
      this._render();
    }

    attributeChangedCallback() { this._render(); }

    _render() {
      if (!this.shadowRoot) return;
      const mood = this.getAttribute('mood') || 'calm';
      const size = parseFloat(this.getAttribute('size')) || 120;
      const animate = this.getAttribute('animate') !== 'false';

      const wrap = this.shadowRoot.querySelector('.wrap');
      wrap.style.fontSize = (size / 8) + 'px'; // body is 8em wide

      const animEl = this.shadowRoot.querySelector('.anim');
      animEl.classList.toggle('still', !animate);

      const blush = MOOD_BLUSH[mood] || MOOD_BLUSH.neutral;
      this.style.setProperty('--blush-color', blush);
      this.shadowRoot.host.style.setProperty('--blush-color', blush);

      const cfg = FACE[mood] || FACE.neutral;

      const faceEl = this.shadowRoot.querySelector('.face');
      faceEl.innerHTML = cfg.eyes === 'arc'
        ? `<div class="eye-arc l"></div><div class="eye-arc r"></div>`
        : `<div class="eye-dot l"></div><div class="eye-dot r"></div>
           <div class="eye-glint l"></div><div class="eye-glint r"></div>`;

      const mouthEl = this.shadowRoot.querySelector('.mouth');
      const mouthMap = {
        big:   `<div class="mouth-big"></div>`,
        small: `<div class="mouth-small"></div>`,
        frown: `<div class="mouth-frown"></div>`,
        o:     `<div class="mouth-o"></div>`,
        wavy:  `<div class="mouth-wavy-l"></div><div class="mouth-wavy-r"></div>`,
      };
      mouthEl.innerHTML = mouthMap[cfg.mouth] || mouthMap.small;

      const fxEl = this.shadowRoot.querySelector('.mood-fx');
      fxEl.innerHTML = mood === 'idea' ? `<div class="idea-spark"></div>`
        : mood === 'anxiety' ? `<div class="anx-drop"></div>` : '';
    }
  }

  customElements.define('spora-mascot', SporaMascot);
})();
