(() => {
  'use strict'

  const tag = 'generator-functions-visualizer'
  if (customElements.get(tag)) return

  // trace() is an explicit educational observation point, not introspection.
  function* sequence(trace) {
    trace('yield A')
    yield 'A'
    trace('yield B')
    yield 'B'
    trace('return Fine')
    return 'Fine'
  }

  function* conversation(trace) {
    trace('yield Nome?')
    const name = yield 'Nome?'
    trace('yield Città?', { name })
    const city = yield 'Città?'
    trace('return', { name, city })
    return { name, city }
  }

  function* fibonacci(trace) {
    let a = 0n
    let b = 1n
    while (true) {
      trace('yield a', { a, b })
      yield a
      const next = a + b
      a = b
      b = next
    }
  }

  function* child(trace) {
    trace('child: yield 1')
    yield 1
    trace('child: yield 2')
    yield 2
    trace('child: return', { result: 'Fine child' })
    return 'Fine child'
  }

  function* delegated(trace) {
    trace('parent: yield* child()')
    const result = yield* child(trace)
    trace('parent: yield result', { result })
    yield result
    trace('parent: return')
    return 'Fine parent'
  }

  function* guarded(trace) {
    try {
      trace('try: yield ready')
      yield 'ready'
      trace('try: yield work')
      yield 'work'
    } catch (error) {
      trace('catch: yield recovered', { message: error.message })
      yield 'recovered'
    } finally {
      trace('finally: yield cleanup')
      yield 'cleanup'
      trace('finally: pulizia terminata')
    }
    trace('return Fine')
    return 'Fine'
  }

  const scenarios = {
    basic: {
      label: 'Basic Generator', fn: sequence, code: [sequence],
      description: 'Ogni next() riprende la funzione fino al prossimo yield o return. La creazione del generatore non esegue il corpo.',
      hint: 'Premi next() quattro volte: A, B, Fine e infine undefined. Il valore Fine è restituito con done: true.'
    },
    bidirectional: {
      label: 'Bidirectional Generator', fn: conversation, code: [conversation],
      description: 'Il valore passato a next(value) diventa il risultato del precedente yield sospeso. Il primo next() non trasmette un valore al corpo.',
      hint: 'Premi next() senza argomento. Inserisci "Mario" e premi next(value), poi "Udine" e premi next(value).'
    },
    infinite: {
      label: 'Infinite Generator', fn: fibonacci, code: [fibonacci],
      description: 'La sequenza di Fibonacci viene calcolata un valore alla volta, su richiesta. BigInt mantiene la precisione degli interi.',
      hint: 'Premi next() ripetutamente. Usa return() per terminare il generatore senza attendere la fine del ciclo.'
    },
    delegation: {
      label: 'Generator Delegation', fn: delegated, code: [child, delegated],
      description: 'yield* delega le operazioni al generatore figlio. Il valore restituito da child() diventa il risultato di yield*, non un valore prodotto direttamente.',
      hint: 'Osserva come il parent riprende dopo la conclusione di child() e produce esplicitamente il valore Fine child.'
    },
    errors: {
      label: 'Error Handling & Cleanup', fn: guarded, code: [guarded],
      description: 'throw(error) introduce un’eccezione nel punto di sospensione; return(value) richiede la chiusura. Il finally può sospendere ancora il generatore.',
      hint: 'Avvia con next(), poi usa throw() per entrare nel catch oppure return() per entrare nel finally. Dopo yield cleanup, usa next() per completare la chiusura.'
    }
  }

  const format = value => {
    if (typeof value === 'bigint') return `${value}n`
    if (value === undefined) return 'undefined'
    if (typeof value === 'number' && Object.is(value, -0)) return '-0'
    if (value && typeof value === 'object') {
      return `{ ${Object.entries(value).map(([key, val]) => `${key}: ${format(val)}`).join(', ')} }`
    }
    return JSON.stringify(value)
  }

  const css = `
    :host {
      --playground-accent: #2563eb;
      --playground-accent-text: #fff;
      --playground-border: #b5b5b5;
      --playground-radius: .5rem;
      --playground-background: transparent;
      --playground-error: #b91c1c;
      --generator-suspended: #a16207;
      --generator-completed: #15803d;
      display: block;
      color: inherit;
      font: inherit;
      min-width: 0;
    }
    *, *::before, *::after { box-sizing: border-box; }
    [hidden] { display: none !important; }
    .panel { border: 1px solid var(--playground-border); border-radius: var(--playground-radius); padding: 1rem; background: var(--playground-background); display: grid; gap: 1rem; min-width: 0; }
    h3, h4, p, pre { margin: 0; }
    h3 { font-size: 1.15em; }
    h4 { font-size: 1em; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
    .between { justify-content: space-between; }
    label { display: grid; gap: .35rem; font-weight: 600; min-width: 0; }
    button, input, select { font: inherit; color: inherit; background: var(--playground-background); border: 1px solid var(--playground-border); border-radius: var(--playground-radius); padding: .55rem .7rem; min-width: 0; max-width: 100%; }
    button { cursor: pointer; overflow-wrap: anywhere; }
    button.primary { background: var(--playground-accent); color: var(--playground-accent-text); border-color: var(--playground-accent); }
    button:disabled { opacity: .55; cursor: not-allowed; }
    :is(button, input, select):focus-visible { outline: 2px solid var(--playground-accent); outline-offset: 2px; }
    .small { font-size: .875em; }
    .muted { opacity: .8; }
    .error { color: var(--playground-error); }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr)); gap: .5rem; min-width: 0; }
    .card { border: 1px solid var(--playground-border); border-radius: var(--playground-radius); padding: .7rem; display: grid; gap: .3rem; min-width: 0; overflow-wrap: anywhere; }
    .card strong { font: 600 1.1em ui-monospace, monospace; }
    [data-state=suspendedYield] { color: var(--generator-suspended); }
    [data-state=completed] { color: var(--generator-completed); }
    .source, .log, .bindings { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 22rem; overflow: auto; padding: .75rem; font: .85em/1.55 ui-monospace, monospace; border: 1px solid var(--playground-border); border-radius: var(--playground-radius); min-width: 0; }
    .flow { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
    .stage { border: 1px solid var(--playground-border); border-radius: var(--playground-radius); padding: .4rem .6rem; font: .8em ui-monospace, monospace; overflow-wrap: anywhere; }
    .stage[aria-current=step] { border: 2px solid var(--playground-accent); font-weight: bold; }
    .point { overflow-wrap: anywhere; }
    .section { display: grid; gap: .5rem; min-width: 0; }
    @media (max-width: 480px) { .panel { padding: .7rem; } }
  `

  const template = document.createElement('template')
  template.innerHTML = `
    <style>${css}</style>
    <div class="panel">
      <div class="row between"><h3>Generator Functions Visualizer</h3><button type="button" id="reset">Reset</button></div>
      <label>Modalità <select id="scenario"></select></label>
      <p id="description" class="small"></p>
      <p id="hint" class="small muted"></p>
      <div class="section">
        <h4>Controlli del generatore</h4>
        <label>Argomento (valore JSON scalare opzionale)
          <input id="argument" type="text" maxlength="1000" placeholder='Es. "Mario", 42, null' autocomplete="off" spellcheck="false" aria-describedby="argument-help input-error">
        </label>
        <p id="argument-help" class="small muted">Campo vuoto = undefined. next(value) e return(value) usano il valore inserito; throw() crea un Error dal valore (o dal messaggio predefinito).</p>
        <p id="input-error" class="small error" role="alert" hidden></p>
        <div class="row">
          <button type="button" class="primary" id="next">next()</button>
          <button type="button" id="next-value">next(value)</button>
          <button type="button" id="return">return(value)</button>
          <button type="button" id="throw">throw(error)</button>
        </div>
      </div>
      <div class="section">
        <h4>Ciclo di vita</h4>
        <div class="flow" aria-label="Stati del generatore">
          <span class="stage" data-stage="suspendedStart">suspendedStart</span><span aria-hidden="true">→</span>
          <span class="stage" data-stage="executing">executing</span><span aria-hidden="true">⇄</span>
          <span class="stage" data-stage="suspendedYield">suspendedYield</span><span aria-hidden="true">→</span>
          <span class="stage" data-stage="completed">completed</span>
        </div>
        <p class="small muted">Modello semplificato: executing è transitorio durante una chiamata sincrona. return() o throw() possono anche terminare un generatore prima del primo yield.</p>
        <div class="cards" role="status" aria-live="polite">
          <div class="card"><span class="small">Stato</span><strong id="state"></strong></div>
          <div class="card"><span class="small">value</span><strong id="value"></strong></div>
          <div class="card"><span class="small">done</span><strong id="done"></strong></div>
        </div>
        <p id="exception" class="error small" role="status" hidden></p>
        <div class="card"><span class="small">Ultimo punto osservato</span><strong id="point" class="point"></strong><pre id="bindings" class="bindings"></pre></div>
        <p class="small muted">I binding mostrati sono istantanee raccolte in punti di osservazione espliciti, non un'ispezione della memoria del motore JavaScript.</p>
      </div>
      <div class="section">
        <div class="row between"><h4>Registro delle chiamate</h4><button type="button" id="clear">Svuota registro</button></div>
        <pre id="log" class="log" tabindex="0" aria-label="Registro delle chiamate"></pre>
      </div>
      <div class="section">
        <div class="row between"><h4>Codice JavaScript</h4><button type="button" id="copy">Copia codice</button></div>
        <pre class="source" tabindex="0"><code id="source"></code></pre>
        <p id="copy-status" role="status" class="small"></p>
      </div>
    </div>`

  class GeneratorFunctionsVisualizer extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true))
      this.$ = id => this.shadowRoot.getElementById(id)
      for (const [key, scenario] of Object.entries(scenarios)) {
        const option = document.createElement('option')
        option.value = key
        option.textContent = scenario.label
        this.$('scenario').append(option)
      }
      this.$('scenario').addEventListener('change', () => this.reset())
      this.$('reset').addEventListener('click', () => this.reset())
      this.$('argument').addEventListener('input', () => this.clearError())
      this.$('next').addEventListener('click', () => this.call('next', false))
      this.$('next-value').addEventListener('click', () => this.call('next', true))
      this.$('return').addEventListener('click', () => this.call('return', true))
      this.$('throw').addEventListener('click', () => this.call('throw', true))
      this.$('clear').addEventListener('click', () => {
        this.logs = []
        this.renderLog()
      })
      this.$('copy').addEventListener('click', () => this.copy())
      this.reset()
    }

    clearError() {
      this.$('input-error').hidden = true
      this.$('input-error').textContent = ''
      this.$('argument').removeAttribute('aria-invalid')
    }

    reset() {
      this.example = scenarios[this.$('scenario').value] || scenarios.basic
      this.state = 'suspendedStart'
      this.result = null
      this.exception = null
      this.point = 'Corpo non ancora eseguito'
      this.bindings = {}
      this.traces = []
      this.logs = []
      this.history = []
      this.historyTruncated = false
      this.calls = 0
      this.generator = this.example.fn((point, bindings = {}) => {
        this.point = point
        this.bindings = bindings
        this.traces.push(`${point}${Object.keys(bindings).length ? ' · ' + format(bindings) : ''}`)
      })
      this.$('argument').value = ''
      this.$('description').textContent = this.example.description
      this.$('hint').textContent = this.example.hint
      this.$('copy-status').textContent = ''
      this.clearError()
      this.render()
    }

    argument() {
      const raw = this.$('argument').value.trim()
      if (!raw) return undefined
      const value = JSON.parse(raw)
      if (value !== null && typeof value === 'object') throw new Error('Inserisci un valore JSON scalare, non un array o un oggetto.')
      if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Inserisci un numero finito.')
      return value
    }

    call(method, withValue) {
      this.clearError()
      let value
      if (withValue) {
        try { value = this.argument() } catch (error) {
          this.$('input-error').textContent = error instanceof SyntaxError ? 'Valore JSON non valido. Usa le virgolette doppie per le stringhe.' : error.message
          this.$('input-error').hidden = false
          this.$('argument').setAttribute('aria-invalid', 'true')
          return
        }
      }
      const args = method === 'throw' ? [new Error(value === undefined ? 'Errore di prova' : String(value))] : withValue ? [value] : []
      const argSource = method === 'throw' ? `new Error(${JSON.stringify(args[0].message)})` : withValue ? format(value) : ''
      const expression = `generator.${method}(${argSource})`
      const previous = this.state
      this.traces = []
      this.exception = null
      this.result = null
      this.state = 'executing'
      this.renderState()
      try {
        this.result = this.generator[method](...args)
        this.state = this.result.done ? 'completed' : 'suspendedYield'
      } catch (error) {
        this.exception = `${error.name}: ${error.message}`
        this.state = 'completed'
      }
      this.calls++
      const result = this.exception ? `Eccezione: ${this.exception}` : `{ value: ${format(this.result.value)}, done: ${this.result.done} }`
      const transitions = previous === 'completed' ? 'completed → completed' : `${previous} → executing → ${this.state}`
      const notes = []
      if (previous === 'suspendedStart' && method === 'next' && withValue) notes.push('Il primo argomento di next() viene ignorato.')
      if (method === 'return' && this.result && !this.result.done) notes.push('La chiusura è ancora sospesa: il generatore ha prodotto un altro yield.')
      if (previous !== 'completed' && this.state === 'completed' && !this.traces.length) {
        this.point = 'Terminato senza ulteriori punti osservati'
        this.bindings = {}
      }
      this.logs.push([`${this.calls}. ${expression}`, `   ${transitions}`, ...this.traces.map(t => `   ${t}`), `   → ${result}`, ...notes.map(n => `   ${n}`)].join('\n'))
      if (this.logs.length > 40) this.logs.shift()
      if (!this.historyTruncated) {
        if (this.history.length < 200) this.history.push(expression)
        else { this.historyTruncated = true; this.history = [] }
      }
      this.render()
    }

    renderState() {
      this.$('state').textContent = this.state
      this.$('state').dataset.state = this.state
      for (const stage of this.shadowRoot.querySelectorAll('[data-stage]')) {
        if (stage.dataset.stage === this.state) stage.setAttribute('aria-current', 'step')
        else stage.removeAttribute('aria-current')
      }
    }

    renderLog() {
      this.$('log').textContent = this.logs.length ? this.logs.join('\n\n') : 'Nessuna chiamata registrata.'
      this.$('log').scrollTop = this.$('log').scrollHeight
    }

    render() {
      this.renderState()
      this.$('value').textContent = this.result ? format(this.result.value) : '—'
      this.$('done').textContent = this.result ? String(this.result.done) : '—'
      this.$('exception').hidden = !this.exception
      this.$('exception').textContent = this.exception || ''
      this.$('point').textContent = this.point
      this.$('bindings').textContent = Object.keys(this.bindings).length ? Object.entries(this.bindings).map(([key, value]) => `${key} = ${format(value)}`).join('\n') : 'Nessun binding osservato in questo punto.'
      this.renderLog()
      const fallback = this.example.fn === conversation ? ['generator.next()', 'generator.next("Mario")', 'generator.next("Udine")'] : ['generator.next()', 'generator.next()', 'generator.next()']
      const calls = this.history.length ? this.history : fallback
      const header = this.historyTruncated ? '// Esempio iniziale: cronologia oltre 200 chiamate.' : this.history.length ? '// Riproduzione delle chiamate effettuate' : '// Esempio di utilizzo'
      this.$('source').textContent = `${this.example.code.map(fn => fn.toString()).join('\n\n')}\n\nconst trace = (point, bindings = {}) => console.log(point, bindings)\nconst generator = ${this.example.fn.name}(trace)\n\n${header}\n${calls.map(expr => `try { console.log(${expr}) } catch (error) { console.error(error.name + ': ' + error.message) }`).join('\n')}`
    }

    async copy() {
      try {
        await navigator.clipboard.writeText(this.$('source').textContent)
        this.$('copy-status').textContent = 'Codice JavaScript copiato.'
      } catch {
        this.$('copy-status').textContent = 'Copia automatica non disponibile. Seleziona il codice manualmente.'
      }
    }
  }

  customElements.define(tag, GeneratorFunctionsVisualizer)
})()
