const fields = [
  ['minSize', 'Dimensione minima (rem)', 1, .125, 10, 'any'],
  ['maxSize', 'Dimensione massima (rem)', 2, .125, 10, 'any'],
  ['minViewport', 'Viewport minima (px)', 320, 1, 10000, 1],
  ['maxViewport', 'Viewport massima (px)', 1280, 1, 10000, 1],
  ['rootSize', 'Root font size di riferimento (px)', 16, 8, 40, 'any']
]

const round = value => Number(value.toFixed(5))

function calculateClamp({ minSize, maxSize, minViewport, maxViewport, rootSize }) {
  const slope = (maxSize - minSize) * rootSize / (maxViewport - minViewport)
  const intercept = minSize - slope * minViewport / rootSize
  const rem = round(intercept)
  const vw = round(slope * 100)
  const preferred = `${rem}rem + ${vw}vw`

  return {
    expression: `clamp(${minSize}rem, ${preferred}, ${maxSize}rem)`,
    sizeAt: width => Math.min(maxSize * rootSize,
      Math.max(minSize * rootSize, rem * rootSize + vw * width / 100)),
    slope,
    intercept
  }
}

const template = document.createElement('template')

template.innerHTML = `
  <style>
    :host {
      --playground-accent: #2563eb;
      --playground-border: #b5b5b5;
      --playground-radius: .5rem;
      --playground-background: transparent;
      display: block;
      min-width: 0;
      margin-block: 2rem;
      color: inherit;
      font: inherit;
      font-size: .875rem;
    }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    .playground {
      padding: 1rem;
      border: 1px solid var(--playground-border);
      border-radius: var(--playground-radius);
      background: var(--playground-background);
    }
    .toolbar, .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: .75rem;
      margin-block-end: 1rem;
    }
    .title { margin: 0; font-size: 1.125rem; font-weight: 600; }
    .controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
      gap: 1rem;
      margin-block-end: 1rem;
    }
    label { display: grid; gap: .375rem; }
    input, button { font: inherit; color: inherit; }
    input[type="number"], button {
      border: 1px solid var(--playground-border);
      border-radius: .25rem;
      padding: .5rem .75rem;
      background: transparent;
    }
    input[type="number"] { width: 100%; min-width: 0; }
    input[type="range"] { width: 100%; accent-color: var(--playground-accent); }
    button { cursor: pointer; }
    button:disabled { cursor: not-allowed; opacity: .55; }
    button:hover { background: rgb(128 128 128 / 10%); }
    :is(input, button):focus-visible {
      outline: 2px solid var(--playground-accent);
      outline-offset: 2px;
    }
    .graph { display: block; width: 100%; height: auto; }
    .axis { stroke: currentColor; opacity: .5; }
    .guide { stroke: currentColor; opacity: .3; stroke-dasharray: 4 3; }
    .curve { fill: none; stroke: var(--playground-accent); stroke-width: 3; }
    .marker { fill: var(--playground-accent); }
    svg text { fill: currentColor; font-family: inherit; font-size: 11px; }
    .preview {
      margin-block: 1rem;
      padding: 1rem;
      border: 1px dashed var(--playground-border);
      border-radius: .25rem;
      overflow-wrap: anywhere;
      background: rgb(128 128 128 / 5%);
    }
    .sample { margin: .75rem 0 0; font-weight: 600; line-height: 1.3; }
    .result { font-weight: 600; font-variant-numeric: tabular-nums; }
    pre {
      margin: 0;
      padding: 1rem;
      overflow: auto;
      border-radius: .25rem;
      background: rgb(128 128 128 / 10%);
      font-size: .875rem;
      line-height: 1.6;
    }
    .error { color: inherit; font-weight: 600; }
    .status { min-height: 1.5em; margin-block: .5rem 0; }
  </style>

  <div class="playground">
    <div class="toolbar">
      <p class="title">CSS Clamp Generator</p>
      <button type="button" data-action="reset">Reset</button>
    </div>
    <form novalidate>
      <div class="controls">
        ${fields.map(([name, label, value, min, max, step]) => `
          <label>${label}
            <input type="number" name="${name}" value="${value}"
              min="${min}" max="${max}" step="${step}" required>
          </label>
        `).join('')}
      </div>
      <p class="error" role="alert" hidden></p>
      <div class="results" hidden>
        <p class="stale" hidden>Anteprima dell’ultima configurazione valida.</p>
        <svg class="graph" viewBox="0 0 480 220" role="img"
          aria-labelledby="graph-title graph-description">
          <title id="graph-title">Andamento del dimensionamento fluido</title>
          <desc id="graph-description"></desc>
          <path class="axis" d="M56 15 V178 H462" fill="none" />
          <path class="guide min-guide" fill="none" />
          <path class="guide max-guide" fill="none" />
          <path class="curve" />
          <circle class="marker" r="5" />
          <text class="min-y" x="50" text-anchor="end" />
          <text class="max-y" x="50" text-anchor="end" />
          <text x="56" y="194" text-anchor="middle">0</text>
          <text class="min-x" y="194" text-anchor="start" />
          <text class="max-x" y="207" text-anchor="end" />
          <text class="end-x" x="454" y="194" text-anchor="end" />
          <text x="260" y="218" text-anchor="middle">Viewport (px)</text>
        </svg>
        <label>
          Simulazione viewport: <span class="viewport-value">800px</span>
          <input type="range" name="viewport" min="0" max="1600" step="1" value="800">
        </label>
        <div class="preview">
          <div>Dimensione calcolata: <output class="result"></output></div>
          <p class="sample">Programmazione Web Italia</p>
        </div>
        <div class="code-header">
          <span>Codice CSS generato</span>
          <button type="button" data-action="copy">Copia CSS</button>
        </div>
        <pre><code></code></pre>
        <p>La simulazione usa il root font size di riferimento, non la viewport reale del browser.</p>
      </div>
    </form>
    <p class="status" role="status"></p>
  </div>
`

class ClampGenerator extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.appendChild(template.content.cloneNode(true))
    this.form = this.$('form')
    this.hasValidResult = false
    this.form.addEventListener('input', () => this.update())
    this.form.addEventListener('submit', event => event.preventDefault())
    this.$('[data-action="reset"]').addEventListener('click', () => {
      this.form.elements.namedItem('viewport').max = '1600'
      this.form.reset()
      this.update()
      this.$('.status').textContent = 'Impostazioni ripristinate.'
    })
    this.$('[data-action="copy"]').addEventListener('click', () => this.copy())
  }

  $(selector) {
    return this.shadowRoot.querySelector(selector)
  }

  connectedCallback() {
    this.update()
  }

  get properties() {
    return Object.fromEntries(fields.map(([name]) => [
      name, this.form.elements.namedItem(name).valueAsNumber
    ]))
  }

  validate(p) {
    for (const [name, label] of fields) {
      const input = this.form.elements.namedItem(name)
      if (!Number.isFinite(p[name]) || !input.validity.valid) {
        return `${label}: ${input.validationMessage || 'Inserisci un numero valido.'}`
      }
    }
    if (p.maxViewport <= p.minViewport) {
      return 'La viewport massima deve essere maggiore della viewport minima.'
    }
    if (p.maxSize < p.minSize) {
      return 'La dimensione massima non può essere inferiore alla minima.'
    }
    return ''
  }

  update() {
    const p = this.properties
    const error = this.validate(p)
    this.$('.error').textContent = error
    this.$('.error').hidden = !error
    this.$('.status').textContent = ''

    if (error) {
      this.$('.results').hidden = !this.hasValidResult
      this.$('.stale').hidden = !this.hasValidResult
      this.$('[data-action="copy"]').disabled = true
      this.form.elements.namedItem('viewport').disabled = true
      return
    }

    this.hasValidResult = true
    this.$('.results').hidden = false
    this.$('.stale').hidden = true
    this.$('[data-action="copy"]').disabled = false
    this.form.elements.namedItem('viewport').disabled = false

    const result = calculateClamp(p)
    const slider = this.form.elements.namedItem('viewport')
    slider.max = String(Math.max(1600, Math.ceil(p.maxViewport * 1.2)))
    const viewport = slider.valueAsNumber
    const size = result.sizeAt(viewport)

    this.$('.viewport-value').textContent = `${viewport}px`
    this.$('.result').value = `${Number(size.toFixed(2))}px / ${Number((size / p.rootSize).toFixed(3))}rem`
    this.$('.sample').style.fontSize = `${size}px`
    this.$('code').textContent = `font-size: ${result.expression};`
    this.updateGraph(p, result, viewport, Number(slider.max))
  }

  updateGraph(p, result, viewport, limit) {
    const x = width => 56 + width / limit * 398
    const y = size => 178 - size / (p.maxSize * p.rootSize * 1.2) * 152
    const minY = y(p.minSize * p.rootSize)
    const maxY = y(p.maxSize * p.rootSize)
    const start = x(p.minViewport)
    const end = x(p.maxViewport)
    // La curva mostra l'interpolazione teorica prima dell'arrotondamento CSS.
    this.$('.curve').setAttribute('d', `M56 ${minY} H${start} L${end} ${maxY} H454`)
    this.$('.min-guide').setAttribute('d', `M${start} ${minY} V178`)
    this.$('.max-guide').setAttribute('d', `M${end} ${maxY} V178`)
    this.$('.marker').setAttribute('cx', x(viewport))
    this.$('.marker').setAttribute('cy', y(result.sizeAt(viewport)))

    const label = (selector, value, attrs = {}) => {
      const el = this.$(selector)
      el.textContent = value
      Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, val))
    }
    label('.min-y', `${p.minSize}rem`, { y: minY + 4 })
    label('.max-y', maxY < minY - 14 ? `${p.maxSize}rem` : '', { y: maxY + 4 })
    label('.min-x', p.minViewport, { x: Math.min(410, Math.max(68, start)) })
    label('.max-x', p.maxViewport, { x: Math.max(90, end) })
    label('.end-x', limit)
    label('#graph-description', `Da ${p.minSize}rem a ${p.maxSize}rem tra ${p.minViewport}px e ${p.maxViewport}px. Alla viewport simulata di ${viewport}px, la dimensione è ${result.sizeAt(viewport).toFixed(2)}px.`)
  }

  async copy() {
    if (this.$('[data-action="copy"]').disabled) return
    try {
      await navigator.clipboard.writeText(this.$('code').textContent)
      this.$('.status').textContent = 'Codice CSS copiato.'
    } catch {
      this.$('.status').textContent = 'Copia automatica non disponibile. Seleziona il codice manualmente.'
    }
  }
}

if (!customElements.get('clamp-generator')) {
  customElements.define('clamp-generator', ClampGenerator)
}
