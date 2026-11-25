const template = document.createElement('template')

template.innerHTML = `
  <style>
    :host {
      --playground-accent: #2563eb;
      --playground-border: #b5b5b5;
      --playground-radius: .5rem;
      --playground-background: transparent;

      display: block;
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

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: .75rem;
      margin-block-end: 1.5rem;
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
      margin-block-end: 1rem;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: .375rem;
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
    input:focus-visible {
      outline: 2px solid var(--playground-accent);
      outline-offset: 2px;
    }

    input {
      accent-color: var(--playground-accent);
    }

    input[type="range"] {
      width: 100%;
      margin: .5rem 0;
    }

    .checkbox {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: .5rem;
      margin-block-end: 1rem;
    }

    .preview {
      display: flex;
      height: 280px;
      padding: .75rem;
      border: 1px dashed var(--playground-border);
      border-radius: .25rem;
      background: rgb(128 128 128 / 5%);
      overflow: auto;
    }

    .item {
      padding: .75rem 1.25rem;
      border-radius: .25rem;
      background: var(--playground-accent);
      color: #fff;
      text-align: center;
      font-weight: 600;
    }

    .item:nth-child(2) {
      padding: 1.25rem 1.875rem;
    }

    .item:nth-child(4) {
      padding: 1rem 1.5rem;
    }

    .description {
      margin-block: .75rem 1.5rem;
    }

    .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .75rem;
      margin-block-end: .75rem;
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
      <p class="title">CSS Flexbox Playground</p>

      <button type="button" data-action="reset">
        Reset
      </button>
    </div>

    <form>
      <div class="controls">

        <label>
          flex-direction

          <select name="flexDirection">
            <option value="row" selected>row</option>
            <option value="row-reverse">row-reverse</option>
            <option value="column">column</option>
            <option value="column-reverse">
              column-reverse
            </option>
          </select>
        </label>

        <label>
          flex-wrap

          <select name="flexWrap">
            <option value="nowrap" selected>nowrap</option>
            <option value="wrap">wrap</option>
            <option value="wrap-reverse">wrap-reverse</option>
          </select>
        </label>

        <label>
          justify-content

          <select name="justifyContent">
            <option value="flex-start">flex-start</option>
            <option value="flex-end">flex-end</option>
            <option value="center">center</option>
            <option value="space-between" selected>
              space-between
            </option>
            <option value="space-around">space-around</option>
            <option value="space-evenly">space-evenly</option>
          </select>
        </label>

        <label>
          align-items

          <select name="alignItems">
            <option value="stretch">stretch</option>
            <option value="flex-start">flex-start</option>
            <option value="flex-end">flex-end</option>
            <option value="center" selected>center</option>
            <option value="baseline">baseline</option>
          </select>
        </label>

        <label>
          align-content

          <select name="alignContent">
            <option value="normal" selected>normal</option>
            <option value="stretch">stretch</option>
            <option value="flex-start">flex-start</option>
            <option value="flex-end">flex-end</option>
            <option value="center">center</option>
            <option value="space-between">space-between</option>
            <option value="space-around">space-around</option>
            <option value="space-evenly">space-evenly</option>
          </select>
        </label>

        <label>
          <span>
            gap: <output for="gap">12px</output>
          </span>

          <input
            type="range"
            id="gap"
            name="gap"
            min="0"
            max="40"
            step="2"
            value="12"
          >
        </label>

      </div>

      <label class="checkbox">
        <input type="checkbox" name="flexGrow" value="1">
        Applica flex-grow: 1 ai flex item
      </label>
    </form>

    <div
      class="preview"
      role="region"
      aria-label="Anteprima del layout Flexbox"
      tabindex="0"
    >
      <div class="item">1</div>
      <div class="item">2</div>
      <div class="item">3</div>
      <div class="item">4</div>
    </div>

    <p class="description">
      Modifica le proprietà CSS per osservare in tempo reale
      il comportamento degli elementi flessibili.
    </p>

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

class FlexboxPlayground extends HTMLElement {
  constructor() {
    super()

    this.attachShadow({ mode: 'open' })

    this.shadowRoot.appendChild(
      template.content.cloneNode(true)
    )

    this.form = this.shadowRoot.querySelector('form')
    this.preview = this.shadowRoot.querySelector('.preview')
    this.items = this.shadowRoot.querySelectorAll('.item')
    this.output = this.shadowRoot.querySelector('output')
    this.code = this.shadowRoot.querySelector('code')
    this.status = this.shadowRoot.querySelector('.status')

    this.resetButton = this.shadowRoot.querySelector(
      '[data-action="reset"]'
    )

    this.copyButton = this.shadowRoot.querySelector(
      '[data-action="copy"]'
    )

    this.form.addEventListener('input', () => this.update())

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

  get properties() {
    const data = new FormData(this.form)

    return {
      flexDirection: data.get('flexDirection'),
      flexWrap: data.get('flexWrap'),
      justifyContent: data.get('justifyContent'),
      alignItems: data.get('alignItems'),
      alignContent: data.get('alignContent'),
      gap: `${data.get('gap')}px`,
      flexGrow: data.has('flexGrow') ? 1 : 0
    }
  }

  update() {
    const {
      flexGrow,
      ...containerProperties
    } = this.properties

    // Aggiorna le proprietà del flex container
    Object.assign(this.preview.style, containerProperties)

    // Aggiorna le proprietà dei flex item
    this.items.forEach(item => {
      item.style.flexGrow = flexGrow
    })

    // Aggiorna il valore visualizzato dello slider
    this.output.value = containerProperties.gap

    // Aggiorna il codice CSS
    this.code.textContent = this.generateCSS()

    this.status.textContent = ''
  }

  generateCSS() {
    const {
      flexDirection,
      flexWrap,
      justifyContent,
      alignItems,
      alignContent,
      gap,
      flexGrow
    } = this.properties

    const css = [
      '.container {',
      '  display: flex;',
      `  flex-direction: ${flexDirection};`,
      `  flex-wrap: ${flexWrap};`,
      `  justify-content: ${justifyContent};`,
      `  align-items: ${alignItems};`,
      `  align-content: ${alignContent};`,
      `  gap: ${gap};`,
      '}'
    ]

    if (flexGrow) {
      css.push(
        '',
        '.container > * {',
        '  flex-grow: 1;',
        '}'
      )
    }

    return css.join('\\n')
      .replaceAll('\\n', '\n')
  }

  reset() {
    this.form.reset()
    this.update()

    this.status.textContent = 'Impostazioni ripristinate.'
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(
        this.code.textContent
      )

      this.status.textContent = 'Codice CSS copiato.'
    } catch {
      this.status.textContent =
        'Copia automatica non disponibile. Seleziona il codice manualmente.'
    }
  }
}

if (!customElements.get('flexbox-playground')) {
  customElements.define(
    'flexbox-playground',
    FlexboxPlayground
  )
}
