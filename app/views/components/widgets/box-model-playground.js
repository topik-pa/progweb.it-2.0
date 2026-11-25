
const controls = [
  { name: 'width', min: 80, max: 320, step: 10, value: 200 },
  { name: 'height', min: 60, max: 180, step: 10, value: 100 },
  { name: 'padding', min: 0, max: 40, step: 2, value: 20 },
  { name: 'border', min: 0, max: 20, step: 1, value: 5 },
  { name: 'margin', min: 0, max: 40, step: 2, value: 20 }
]

const template = document.createElement('template')

template.innerHTML = `
  <style>
    :host {
      --playground-accent: #2563eb;
      --playground-border: #b5b5b5;
      --playground-radius: .5rem;
      --playground-background: transparent;

      --box-margin: #f4c49a;
      --box-border: #ca8a04;
      --box-padding: #bbdba8;
      --box-content: #a5c7e7;

      display: block;
      min-width: 0;
      margin-block: 2rem;
      color: inherit;
      font-family: inherit;
      font-size: .875rem;
    }

    * {
      box-sizing: border-box;
    }

    .playground {
      padding: 1rem;
      border: 1px solid var(--playground-border);
      border-radius: var(--playground-radius);
      background: var(--playground-background);
    }

    .toolbar,
    .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: .75rem;
      margin-block-end: 1rem;
    }

    .title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .controls {
      display: grid;
      grid-template-columns: repeat(
        auto-fit,
        minmax(min(100%, 12rem), 1fr)
      );
      gap: 1rem;
      margin-block: 1rem;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: .375rem;
    }

    .control-header {
      display: flex;
      justify-content: space-between;
      gap: .5rem;
    }

    select,
    button {
      padding: .5rem .75rem;
      border: 1px solid var(--playground-border);
      border-radius: .25rem;
      background: transparent;
      color: inherit;
      font: inherit;
    }

    select {
      width: 100%;
    }

    button {
      cursor: pointer;
    }

    button:hover {
      background: rgb(128 128 128 / 10%);
    }

    select:focus-visible,
    button:focus-visible,
    input:focus-visible,
    .preview:focus-visible {
      outline: 2px solid var(--playground-accent);
      outline-offset: 2px;
    }

    input[type="range"] {
      width: 100%;
      margin: .5rem 0;
      accent-color: var(--playground-accent);
      cursor: pointer;
    }

    /* Preview */

    .preview {
      overflow: auto;
      border: 1px dashed var(--playground-border);
      border-radius: .25rem;
      background: rgb(128 128 128 / 5%);
    }

    .stage {
      display: grid;
      place-items: center;
      width: max-content;
      min-width: 100%;
      min-height: 240px;
      padding: .75rem;
    }

    .margin-box {
      display: inline-flex;
      background: var(--box-margin);
      outline: 1px dashed #b77945;
      color: #333;
    }

    .element {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr);
      flex: none;
      border-style: solid;
      border-color: var(--box-border);
      background: var(--box-padding);
    }

    .content-box {
      display: grid;
      place-content: center;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      background: var(--box-content);
      color: #24466a;
      text-align: center;
      white-space: nowrap;
    }

    .content-label {
      font-weight: 600;
    }

    .content-size {
      font-size: .75rem;
    }

    /* Legend */

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      list-style: none;
      padding: 0;
      margin-block: 1rem;
    }

    .legend li {
      display: flex;
      align-items: center;
      gap: .375rem;
    }

    .legend li::before {
      content: '';
      display: block;
      width: .875rem;
      height: .875rem;
      border: 1px solid rgb(0 0 0 / 15%);
      border-radius: .125rem;
    }

    .legend-margin::before {
      background: var(--box-margin);
    }

    .legend-border::before {
      background: var(--box-border);
    }

    .legend-padding::before {
      background: var(--box-padding);
    }

    .legend-content::before {
      background: var(--box-content);
    }

    /* Dimensions */

    .dimensions {
      display: grid;
      grid-template-columns: repeat(
        auto-fit,
        minmax(min(100%, 7rem), 1fr)
      );
      gap: .75rem;
      margin-block: 1rem;
    }

    .dimensions > div {
      padding: .75rem;
      border: 1px solid var(--playground-border);
      border-radius: .25rem;
    }

    dt {
      margin-block-end: .375rem;
      font-size: .75rem;
    }

    dd {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .description {
      padding: .75rem;
      border-inline-start: 3px solid var(--playground-accent);
      background: rgb(128 128 128 / 5%);
      line-height: 1.6;
    }

    /* Generated code */

    .code-header {
      margin-block-start: 1.5rem;
    }

    pre {
      margin: 0;
      padding: 1rem;
      overflow: auto;
      border-radius: .25rem;
      background: rgb(128 128 128 / 10%);
      font-size: .875rem;
      line-height: 1.6;
      tab-size: 2;
    }

    code {
      font-family: monospace;
    }

    .status {
      min-height: 1.5em;
      margin-block: .5rem 0;
    }
  </style>

  <div class="playground">

    <div class="toolbar">
      <p class="title">CSS Box Model Playground</p>

      <button type="button" data-action="reset">
        Reset
      </button>
    </div>

    <form>

      <label>
        box-sizing

        <select name="boxSizing">
          <option value="content-box" selected>
            content-box
          </option>
          <option value="border-box">
            border-box
          </option>
        </select>
      </label>

      <div class="controls">
        ${controls.map(control => `
          <label>
            <span class="control-header">
              <span>
                ${control.name === 'border'
                  ? 'border-width'
                  : control.name}
              </span>

              <span
                data-value="${control.name}"
                aria-hidden="true"
              >
                ${control.value}px
              </span>
            </span>

            <input
              type="range"
              name="${control.name}"
              min="${control.min}"
              max="${control.max}"
              step="${control.step}"
              value="${control.value}"
            >
          </label>
        `).join('')}
      </div>

    </form>

    <div
      class="preview"
      role="region"
      aria-label="Rappresentazione grafica del CSS Box Model"
      tabindex="0"
    >
      <div class="stage">
        <div class="margin-box">
          <div class="element">
            <div class="content-box">
              <span class="content-label">Content</span>
              <span class="content-size"></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ul class="legend" aria-label="Legenda del Box Model">
      <li class="legend-margin">Margin</li>
      <li class="legend-border">Border</li>
      <li class="legend-padding">Padding</li>
      <li class="legend-content">Content</li>
    </ul>

    <dl class="dimensions">
      <div>
        <dt>Content box</dt>
        <dd data-size="content"></dd>
      </div>

      <div>
        <dt>Padding box</dt>
        <dd data-size="padding"></dd>
      </div>

      <div>
        <dt>Border box</dt>
        <dd data-size="border"></dd>
      </div>

      <div>
        <dt>Margin box</dt>
        <dd data-size="margin"></dd>
      </div>
    </dl>

    <p class="description"></p>

    <div class="code-header">
      <span>Codice CSS generato</span>

      <button type="button" data-action="copy">
        Copia CSS
      </button>
    </div>

    <pre><code></code></pre>

    <p class="status" role="status"></p>

  </div>
`

class BoxModelPlayground extends HTMLElement {
  constructor() {
    super()

    this.attachShadow({ mode: 'open' })

    this.shadowRoot.appendChild(
      template.content.cloneNode(true)
    )

    this.form = this.shadowRoot.querySelector('form')
    this.element = this.shadowRoot.querySelector('.element')
    this.code = this.shadowRoot.querySelector('code')
    this.status = this.shadowRoot.querySelector('.status')

    this.contentSize = this.shadowRoot.querySelector(
      '.content-size'
    )

    this.description = this.shadowRoot.querySelector(
      '.description'
    )

    this.resetButton = this.shadowRoot.querySelector(
      '[data-action="reset"]'
    )

    this.copyButton = this.shadowRoot.querySelector(
      '[data-action="copy"]'
    )

    this.form.addEventListener('input', () => {
      this.update()
    })

    this.form.addEventListener('submit', event => {
      event.preventDefault()
    })

    this.resetButton.addEventListener('click', () => {
      this.reset()
    })

    this.copyButton.addEventListener('click', () => {
      this.copy()
    })
  }

  connectedCallback() {
    this.update()
  }

  /**
   * Restituisce i valori correnti dei controlli.
   */
  get properties() {
    const data = new FormData(this.form)

    return {
      boxSizing: data.get('boxSizing'),
      width: Number(data.get('width')),
      height: Number(data.get('height')),
      padding: Number(data.get('padding')),
      border: Number(data.get('border')),
      margin: Number(data.get('margin'))
    }
  }

  /**
   * Calcola le dimensioni dei quattro box.
   */
  calculateDimensions(properties) {
    const {
      boxSizing,
      width,
      height,
      padding,
      border,
      margin
    } = properties

    const extra = 2 * (padding + border)

    const content = {
      width: boxSizing === 'border-box'
        ? Math.max(0, width - extra)
        : width,

      height: boxSizing === 'border-box'
        ? Math.max(0, height - extra)
        : height
    }

    const paddingBox = {
      width: content.width + 2 * padding,
      height: content.height + 2 * padding
    }

    const borderBox = {
      width: paddingBox.width + 2 * border,
      height: paddingBox.height + 2 * border
    }

    const marginBox = {
      width: borderBox.width + 2 * margin,
      height: borderBox.height + 2 * margin
    }

    return {
      content,
      padding: paddingBox,
      border: borderBox,
      margin: marginBox
    }
  }

  /**
   * Aggiorna l'interfaccia e la rappresentazione grafica.
   */
  update() {
    const properties = this.properties

    const {
      boxSizing,
      width,
      height,
      padding,
      border,
      margin
    } = properties

    // Applica le proprietà CSS all'elemento reale
    Object.assign(this.element.style, {
      boxSizing,
      width: `${width}px`,
      height: `${height}px`,
      padding: `${padding}px`,
      borderWidth: `${border}px`,
      margin: `${margin}px`
    })

    // Aggiorna i valori visualizzati accanto agli slider
    controls.forEach(({ name }) => {
      const output = this.shadowRoot.querySelector(
        `[data-value="${name}"]`
      )

      output.textContent = `${properties[name]}px`
    })

    // Calcola le dimensioni dei quattro box
    const dimensions = this.calculateDimensions(properties)

    // Aggiorna le dimensioni nella rappresentazione grafica
    this.contentSize.textContent =
      `${dimensions.content.width} × ${dimensions.content.height}px`

    // Aggiorna il riepilogo delle dimensioni
    Object.entries(dimensions).forEach(([name, size]) => {
      const output = this.shadowRoot.querySelector(
        `[data-size="${name}"]`
      )

      output.textContent = `${size.width} × ${size.height}px`
    })

    // Aggiorna la spiegazione relativa al box-sizing
    this.updateDescription(properties)

    // Genera il codice CSS
    this.code.textContent = this.generateCSS(properties)

    this.status.textContent = ''
  }

  /**
   * Aggiorna la descrizione del comportamento del Box Model.
   */
  updateDescription(properties) {
    const {
      boxSizing,
      width,
      height,
      padding,
      border
    } = properties

    if (boxSizing === 'content-box') {
      this.description.textContent =
        'Con content-box, width e height definiscono ' +
        'le dimensioni del contenuto. Padding e border ' +
        'vengono aggiunti alle dimensioni dichiarate. ' +
        'Il margin rimane sempre esterno al border box.'

      return
    }

    const extra = 2 * (padding + border)

    if (extra > width || extra > height) {
      this.description.textContent =
        'Con border-box, padding e border sono inclusi ' +
        'nelle dimensioni dichiarate. Tuttavia, quando il ' +
        'loro spessore complessivo supera width o height, ' +
        'la dimensione del contenuto non può diventare negativa. ' +
        'Il border box può quindi superare la dimensione dichiarata.'

      return
    }

    this.description.textContent =
      'Con border-box, width e height comprendono ' +
      'il contenuto, il padding e il border. ' +
      'Aumentando padding o border si riduce lo spazio ' +
      'disponibile per il contenuto. ' +
      'Il margin rimane sempre esterno al border box.'
  }

  /**
   * Genera il codice CSS corrispondente ai valori selezionati.
   */
  generateCSS(properties) {
    const {
      boxSizing,
      width,
      height,
      padding,
      border,
      margin
    } = properties

    const borderColor = getComputedStyle(this.element)
      .borderTopColor

    return [
      '.element {',
      `  box-sizing: ${boxSizing};`,
      `  width: ${width}px;`,
      `  height: ${height}px;`,
      `  padding: ${padding}px;`,
      `  border: ${border}px solid ${borderColor};`,
      `  margin: ${margin}px;`,
      '}'
    ].join('\n')
  }

  /**
   * Ripristina i valori iniziali.
   */
  reset() {
    this.form.reset()
    this.update()

    this.status.textContent = 'Impostazioni ripristinate.'
  }

  /**
   * Copia il codice CSS negli appunti.
   */
  async copy() {
    try {
      await navigator.clipboard.writeText(
        this.code.textContent
      )

      this.status.textContent = 'Codice CSS copiato.'
    } catch {
      this.status.textContent =
        'Copia automatica non disponibile. ' +
        'Seleziona il codice manualmente.'
    }
  }
}

if (!customElements.get('box-model-playground')) {
  customElements.define(
    'box-model-playground',
    BoxModelPlayground
  )
}
