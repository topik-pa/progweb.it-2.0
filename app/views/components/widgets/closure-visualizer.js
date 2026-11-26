(() => {
  'use strict'

  if (customElements.get('closure-visualizer')) return

  // Each factory contains real closures. read() exposes a binding for
  // educational purposes; it is not a JavaScript scope introspection API.
  function createReader() {
    const message = 'Ambiente lessicale'
    return function read() {
      return message
    }
  }

  function callFromAnotherScope(reader) {
    const message = 'Ambiente del chiamante'
    return { caller: message, result: reader() }
  }

  function createCounter() {
    let count = 0
    return {
      increment: () => ++count,
      read: () => count
    }
  }

  function createSharedCounter() {
    let count = 0
    return {
      increment: () => ++count,
      decrement: () => --count,
      read: () => count
    }
  }

  function createVarCallbacks() {
    const callbacks = []
    for (var i = 0; i < 3; i++) {
      callbacks.push(() => i)
    }
    return callbacks
  }

  function createLetCallbacks() {
    const callbacks = []
    for (let i = 0; i < 3; i++) {
      callbacks.push(() => i)
    }
    return callbacks
  }

  function createMultiplier(factor) {
    return value => value * factor
  }

  const group = (name, binding, value, functions) => ({
    name, binding, value, functions
  })
  const action = (label, expression, run) => ({ label, expression, run })
  const scenarios = {
    lexical: {
      label: 'Lexical Scope',
      description: 'Una funzione cerca le variabili nell’ambiente in cui è stata definita, non nell’ambiente di chi la invoca.',
      create() {
        const reader = createReader()
        return {
          code: [createReader, callFromAnotherScope].join('\n\n') + '\n\nconst reader = createReader()',
          actions: [
            action('reader()', 'reader()', () => reader()),
            action('Invoca da un altro scope', 'callFromAnotherScope(reader)', () => callFromAnotherScope(reader))
          ],
          groups: () => [group('Ambiente di createReader()', 'const message', reader(), ['reader()'])],
          note: 'Il chiamante dichiara un altro message, ma reader() continua a leggere il binding di createReader(). Il valore caller viene restituito solo per rendere visibile il confronto.'
        }
      }
    },
    independent: {
      label: 'Independent Closures',
      description: 'Ogni invocazione della factory crea un ambiente distinto. I due contatori non condividono la variabile count.',
      create() {
        const counterA = createCounter()
        const counterB = createCounter()
        return {
          code: createCounter.toString() + '\n\nconst counterA = createCounter()\nconst counterB = createCounter()',
          actions: [
            action('Incrementa A', 'counterA.increment()', counterA.increment),
            action('Incrementa B', 'counterB.increment()', counterB.increment),
            action('Leggi A', 'counterA.read()', counterA.read),
            action('Leggi B', 'counterB.read()', counterB.read)
          ],
          groups: () => [
            group('Ambiente A', 'let count', counterA.read(), ['counterA.increment()', 'counterA.read()']),
            group('Ambiente B', 'let count', counterB.read(), ['counterB.increment()', 'counterB.read()'])
          ],
          note: 'I metodi read() sono punti di osservazione non mutanti, introdotti per visualizzare il valore attuale dei binding.'
        }
      }
    },
    shared: {
      label: 'Shared State',
      description: 'Le funzioni restituite dalla stessa invocazione della factory accedono al medesimo binding count.',
      create() {
        const counter = createSharedCounter()
        return {
          code: createSharedCounter.toString() + '\n\nconst counter = createSharedCounter()',
          actions: [
            action('Incrementa', 'counter.increment()', counter.increment),
            action('Decrementa', 'counter.decrement()', counter.decrement),
            action('Leggi', 'counter.read()', counter.read)
          ],
          groups: () => [group('Ambiente condiviso', 'let count', counter.read(), ['counter.increment()', 'counter.decrement()', 'counter.read()'])],
          note: 'Le closure mantengono accesso al binding, non a una copia immutabile del valore iniziale.'
        }
      }
    },
    loops: {
      label: 'Closure in Loops — var / let',
      description: 'Confronta callback invocate dopo il ciclo: var condivide un binding, mentre let crea un binding distinto per ogni iterazione.',
      create() {
        const withVar = createVarCallbacks()
        const withLet = createLetCallbacks()
        return {
          code: [createVarCallbacks, createLetCallbacks].join('\n\n') + '\n\nconst withVar = createVarCallbacks()\nconst withLet = createLetCallbacks()',
          actions: [
            action('Invoca tutte (var)', 'withVar.map(fn => fn())', () => withVar.map(fn => fn())),
            action('Invoca tutte (let)', 'withLet.map(fn => fn())', () => withLet.map(fn => fn())),
            ...withVar.map((fn, i) => action(`var: callback ${i}`, `withVar[${i}]()`, fn)),
            ...withLet.map((fn, i) => action(`let: callback ${i}`, `withLet[${i}]()`, fn))
          ],
          groups: () => [
            group('Ambiente della funzione (var)', 'var i', withVar[0](), withVar.map((_, i) => `withVar[${i}]()`)),
            ...withLet.map((fn, i) => group(`Ambiente dell’iterazione ${i} (let)`, 'let i', fn(), [`withLet[${i}]()`]))
          ],
          note: 'Le funzioni non vengono invocate durante il ciclo. I valori visualizzati sono letti dopo il termine del ciclo, tramite le callback stesse.'
        }
      }
    },
    factory: {
      label: 'Function Factory',
      description: 'Una funzione factory restituisce nuove funzioni che conservano l’accesso ai propri parametri lessicali.',
      create() {
        const double = createMultiplier(2)
        const triple = createMultiplier(3)
        return {
          code: createMultiplier.toString() + '\n\nconst double = createMultiplier(2)\nconst triple = createMultiplier(3)',
          actions: [
            action('double(5)', 'double(5)', () => double(5)),
            action('triple(5)', 'triple(5)', () => triple(5)),
            action('double(10)', 'double(10)', () => double(10)),
            action('triple(10)', 'triple(10)', () => triple(10))
          ],
          groups: () => [
            group('Ambiente di double', 'factor', double(1), ['double(value)']),
            group('Ambiente di triple', 'factor', triple(1), ['triple(value)'])
          ],
          note: 'Il parametro factor è un binding dell’ambiente della factory. In questo esempio il suo valore si ricava invocando la funzione con 1; value è invece il parametro locale di ogni chiamata.'
        }
      }
    }
  }

  const template = document.createElement('template')
  template.innerHTML = `
    <style>
      :host {
        display: block; min-width: 0; margin-block: 2rem;
        color: inherit; font: inherit; font-size: .875rem;
      }
      *, *::before, *::after { box-sizing: border-box; }
      .playground {
        padding: 1rem; min-width: 0;
        border: 1px solid var(--playground-border, #b5b5b5);
        border-radius: var(--playground-radius, .5rem);
        background: var(--playground-background, transparent);
      }
      .toolbar, .section-header, .actions, .links {
        display: flex; align-items: center; flex-wrap: wrap; gap: .5rem;
      }
      .toolbar, .section-header { justify-content: space-between; }
      .title { font-size: 1.125rem; font-weight: 600; margin: 0; }
      .subtitle { font-weight: 600; margin: 0; }
      .control { display: grid; gap: .375rem; margin-block: 1rem; }
      button, select {
        font: inherit; color: inherit; background: transparent;
        border: 1px solid var(--playground-border, #b5b5b5);
        border-radius: .25rem; padding: .5rem .75rem;
        max-width: 100%; overflow-wrap: anywhere;
      }
      select { width: 100%; }
      button { cursor: pointer; }
      button:hover { background: rgb(128 128 128 / 10%); }
      button:focus-visible, select:focus-visible, pre:focus-visible {
        outline: 2px solid var(--playground-accent, #2563eb); outline-offset: 2px;
      }
      .description, .note { line-height: 1.6; margin-block: .75rem; }
      .note { border-inline-start: 3px solid var(--playground-accent, #2563eb); padding: .5rem .75rem; background: rgb(128 128 128 / 6%); }
      .section-header { margin-block: 1.25rem .75rem; }
      .scopes {
        display: grid; gap: .75rem;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
      }
      .scope { border: 1px solid var(--playground-border, #b5b5b5); border-radius: .375rem; padding: .75rem; min-width: 0; }
      .scope h4 { font-size: .875rem; margin: 0 0 .5rem; overflow-wrap: anywhere; }
      .links { justify-content: center; }
      .function { background: rgb(128 128 128 / 10%); border-radius: .25rem; padding: .35rem .5rem; font: .8rem monospace; overflow-wrap: anywhere; }
      .arrow { text-align: center; margin: .25rem 0; font-size: .75rem; }
      .binding { border: 1px solid var(--closure-scope-color, #0d9488); border-radius: .25rem; padding: .5rem; text-align: center; overflow-wrap: anywhere; }
      .binding code { display: block; font-size: .8rem; }
      .binding strong { display: block; margin-top: .25rem; font-size: 1.125rem; }
      pre { padding: .75rem; margin: 0; overflow: auto; max-height: 20rem; min-width: 0; background: rgb(128 128 128 / 9%); border-radius: .25rem; font: .8rem/1.6 monospace; tab-size: 2; }
      pre code { font: inherit; }
      .output { min-height: 3rem; white-space: pre-wrap; overflow-wrap: anywhere; }
      .status { min-height: 1.5em; margin-block: .5rem 0; }
      .empty { color: inherit; opacity: .8; }
      @media (max-width: 400px) { .playground { padding: .75rem; } }
    </style>
    <div class="playground">
      <div class="toolbar">
        <p class="title">JavaScript Closure Visualizer</p>
        <button type="button" data-action="reset">Reset</button>
      </div>
      <label class="control">Modalità di sperimentazione
        <select name="scenario"></select>
      </label>
      <p class="description"></p>
      <div class="section-header"><p class="subtitle">Invoca le funzioni</p></div>
      <div class="actions"></div>
      <div class="section-header"><p class="subtitle">Ambienti lessicali e binding</p></div>
      <div class="scopes"></div>
      <p class="note"></p>
      <div class="section-header">
        <p class="subtitle">Registro delle chiamate</p>
        <button type="button" data-action="clear">Svuota registro</button>
      </div>
      <pre class="output" tabindex="0" role="log" aria-label="Registro delle chiamate" aria-live="polite"></pre>
      <div class="section-header">
        <p class="subtitle">Codice JavaScript</p>
        <button type="button" data-action="copy">Copia codice</button>
      </div>
      <pre tabindex="0" aria-label="Codice JavaScript"><code class="source"></code></pre>
      <p class="status" role="status"></p>
    </div>`

  const make = (tag, text, className) => {
    const node = document.createElement(tag)
    if (text !== undefined) node.textContent = text
    if (className) node.className = className
    return node
  }
  const format = value => JSON.stringify(value) ?? String(value)

  class ClosureVisualizer extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' })
      this.shadowRoot.append(template.content.cloneNode(true))
      const $ = selector => this.shadowRoot.querySelector(selector)
      this.select = $('select')
      this.scopes = $('.scopes')
      this.actions = $('.actions')
      this.description = $('.description')
      this.note = $('.note')
      this.output = $('.output')
      this.source = $('.source')
      this.status = $('.status')
      this.records = []
      this.sequence = 0
      this.historyTruncated = false
      for (const [key, scenario] of Object.entries(scenarios)) {
        const option = make('option', scenario.label)
        option.value = key
        this.select.append(option)
      }
      this.select.value = 'independent'
      this.select.addEventListener('change', () => this.reset())
      $('[data-action="reset"]').addEventListener('click', () => this.reset(true))
      $('[data-action="clear"]').addEventListener('click', () => {
        // Clear only the visible log: preserve action history so copied code
        // continues to reproduce the current state.
        this.output.textContent = 'Registro svuotato. Lo stato delle closure non è cambiato.'
        this.logStart = this.sequence
      })
      $('[data-action="copy"]').addEventListener('click', () => this.copy())
    }

    connectedCallback() {
      if (!this.example) this.reset()
    }

    reset(announce = false) {
      const scenario = scenarios[this.select.value] || scenarios.independent
      this.example = scenario.create()
      this.sequence = 0
      this.logStart = 0
      this.records = []
      this.historyTruncated = false
      this.description.textContent = scenario.description
      this.note.textContent = this.example.note
      this.actions.replaceChildren()
      this.example.actions.forEach(item => {
        const button = make('button', item.label)
        button.type = 'button'
        button.addEventListener('click', () => this.invoke(item))
        this.actions.append(button)
      })
      this.render()
      this.status.textContent = announce ? 'Ambienti lessicali ricreati.' : ''
    }

    invoke(item) {
      const result = item.run()
      this.sequence++
      this.records.push({ number: this.sequence, expression: item.expression, result })
      // Bound the UI and source size without presenting an incomplete replay
      // as equivalent to the current state.
      if (this.records.length > 500) {
        this.records.shift()
        this.historyTruncated = true
      }
      this.render()
      this.status.textContent = `${item.expression} → ${format(result)}`
    }

    render() {
      this.scopes.replaceChildren()
      for (const scope of this.example.groups()) {
        const card = make('div', undefined, 'scope')
        const functions = make('div', undefined, 'links')
        scope.functions.forEach(fn => functions.append(make('span', fn, 'function')))
        const binding = make('div', undefined, 'binding')
        binding.append(make('code', scope.binding), make('strong', format(scope.value)))
        card.append(make('h4', scope.name), functions, make('p', '↓ accesso al binding', 'arrow'), binding)
        this.scopes.append(card)
      }
      const visible = this.records.filter(record => record.number > this.logStart).slice(-30)
      this.output.textContent = visible.length
        ? visible.map(r => `${r.number}. ${r.expression} → ${format(r.result)}`).join('\n')
        : 'Nessuna chiamata registrata.'
      const history = this.historyTruncated ? [] : this.records
      const calls = history.length
        ? history.map(r => `console.log(${r.expression}) // ${format(r.result)}`)
        : this.example.actions.slice(0, 2).map(a => `console.log(${a.expression})`)
      const heading = this.historyTruncated
        ? '// Esempio iniziale: cronologia oltre 500 chiamate, replay non disponibile.'
        : history.length ? '// Riproduzione delle chiamate effettuate' : '// Esempio di utilizzo'
      this.source.textContent = `${this.example.code}\n\n${heading}\n${calls.join('\n')}`
    }

    async copy() {
      try {
        await navigator.clipboard.writeText(this.source.textContent)
        this.status.textContent = 'Codice JavaScript copiato.'
      } catch {
        this.status.textContent = 'Copia automatica non disponibile. Seleziona il codice manualmente.'
      }
    }
  }

  customElements.define('closure-visualizer', ClosureVisualizer)
})()
