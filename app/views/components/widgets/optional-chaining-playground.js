(() => {
  'use strict'
  if (customElements.get('optional-chaining-playground')) return

  // Each expression runs against a fresh fixture, so side effects are isolated.
  // The functions below are executed directly: no eval or Function constructor.
  const test = (expression, run) => ({ expression, run })
  const example = (label, source, create) => ({ label, source, create })
  const modes = {
    nested: {
      label: 'Nested Properties',
      description: 'Confronta accesso diretto, controllo parziale e catena opzionale completa.',
      cases: [
        example('Oggetto completo', 'const user = { profile: { name: "Mario" } }', () => ({ user: { profile: { name: 'Mario' } } })),
        example('Profilo assente', 'const user = {}', () => ({ user: {} })),
        example('Profilo null', 'const user = { profile: null }', () => ({ user: { profile: null } })),
        example('Utente null', 'const user = null', () => ({ user: null })),
        example('Utente undefined', 'const user = undefined', () => ({ user: undefined })),
        example('Nome vuoto', 'const user = { profile: { name: "" } }', () => ({ user: { profile: { name: '' } } }))
      ],
      tests: [
        test('user.profile.name', ({ user }) => user.profile.name),
        test('user?.profile.name', ({ user }) => user?.profile.name),
        test('user?.profile?.name', ({ user }) => user?.profile?.name),
        test('user?.profile?.name ?? "Anonimo"', ({ user }) => user?.profile?.name ?? 'Anonimo'),
        test('user?.profile?.name || "Anonimo"', ({ user }) => user?.profile?.name || 'Anonimo')
      ],
      note: 'user?.profile.name protegge solo l’accesso a user: se user esiste ma profile è null o undefined, .name genera un TypeError.'
    },
    computed: {
      label: 'Computed Properties & Arrays',
      description: 'Sperimenta l’accesso opzionale a un indice o a una proprietà calcolata.',
      cases: [
        example('Array con elemento', 'const items = [{ name: "CSS" }]\nconst key = 0', () => ({ items: [{ name: 'CSS' }], key: 0 })),
        example('Indice non presente', 'const items = [{ name: "CSS" }]\nconst key = 5', () => ({ items: [{ name: 'CSS' }], key: 5 })),
        example('Array vuoto', 'const items = []\nconst key = 0', () => ({ items: [], key: 0 })),
        example('Array null', 'const items = null\nconst key = 0', () => ({ items: null, key: 0 })),
        example('Proprietà dinamica', 'const items = { featured: { name: "HTML" } }\nconst key = "featured"', () => ({ items: { featured: { name: 'HTML' } }, key: 'featured' }))
      ],
      tests: [
        test('items[key].name', ({ items, key }) => items[key].name),
        test('items?.[key]', ({ items, key }) => items?.[key]),
        test('items?.[key].name', ({ items, key }) => items?.[key].name),
        test('items?.[key]?.name', ({ items, key }) => items?.[key]?.name),
        test('items?.[key]?.name ?? "Non disponibile"', ({ items, key }) => items?.[key]?.name ?? 'Non disponibile')
      ],
      note: 'L’optional chaining non controlla se un indice è valido: un elemento assente restituisce undefined. Un secondo ?. protegge il successivo accesso a name.'
    },
    calls: {
      label: 'Optional Method Calls',
      description: 'Distingui il controllo del ricevente dal controllo del metodo e osserva il valore di this.',
      cases: [
        example('Metodo disponibile', 'const service = { name: "API", read() { return this.name } }', () => ({ service: { name: 'API', read() { return this.name } } })),
        example('Metodo assente', 'const service = { name: "API" }', () => ({ service: { name: 'API' } })),
        example('Metodo null', 'const service = { read: null }', () => ({ service: { read: null } })),
        example('Metodo non invocabile', 'const service = { read: 42 }', () => ({ service: { read: 42 } })),
        example('Ricevente null', 'const service = null', () => ({ service: null })),
        example('Metodo che genera un errore', 'const service = { read() { throw new Error("Errore interno") } }', () => ({ service: { read() { throw new Error('Errore interno') } } }))
      ],
      tests: [
        test('service.read()', ({ service }) => service.read()),
        test('service?.read()', ({ service }) => service?.read()),
        test('service.read?.()', ({ service }) => service.read?.()),
        test('service?.read?.()', ({ service }) => service?.read?.())
      ],
      note: '?.() evita la chiamata solo se il metodo è null o undefined. Un valore non invocabile genera TypeError; un errore interno alla funzione continua a propagarsi. La chiamata del metodo conserva this.'
    },
    fallback: {
      label: 'Nullish Coalescing',
      description: 'Confronta il fallback nullish con quello basato sulla truthiness.',
      cases: [
        example('Valore 0', 'const config = { value: 0 }', () => ({ config: { value: 0 } })),
        example('Valore false', 'const config = { value: false }', () => ({ config: { value: false } })),
        example('Stringa vuota', 'const config = { value: "" }', () => ({ config: { value: '' } })),
        example('Valore NaN', 'const config = { value: NaN }', () => ({ config: { value: NaN } })),
        example('Valore null', 'const config = { value: null }', () => ({ config: { value: null } })),
        example('Valore undefined', 'const config = { value: undefined }', () => ({ config: { value: undefined } })),
        example('Valore presente', 'const config = { value: "Attivo" }', () => ({ config: { value: 'Attivo' } })),
        example('Configurazione assente', 'const config = null', () => ({ config: null }))
      ],
      tests: [
        test('config?.value', ({ config }) => config?.value),
        test('config?.value ?? "Default"', ({ config }) => config?.value ?? 'Default'),
        test('config?.value || "Default"', ({ config }) => config?.value || 'Default')
      ],
      note: '?? usa il fallback soltanto per null e undefined; || lo usa anche per 0, false, stringa vuota e NaN. Il valore null di una proprietà esistente non viene convertito in undefined da ?.'
    },
    short: {
      label: 'Short-Circuiting',
      description: 'Verifica se la chiave calcolata o gli argomenti di una chiamata vengono effettivamente valutati.',
      cases: [
        example('Oggetto e metodo presenti', 'const obj = { item: "JS", read(value) { return value } }', () => ({ obj: { item: 'JS', read(value) { return value } } })),
        example('Oggetto null', 'const obj = null', () => ({ obj: null })),
        example('Metodo assente', 'const obj = { item: "JS" }', () => ({ obj: { item: 'JS' } })),
        example('Metodo non invocabile', 'const obj = { read: 42 }', () => ({ obj: { read: 42 } }))
      ],
      tracked: true,
      tests: [
        test('obj[key()]', ({ obj, key }) => obj[key()]),
        test('obj?.[key()]', ({ obj, key }) => obj?.[key()]),
        test('obj?.read(arg())', ({ obj, arg }) => obj?.read(arg())),
        test('obj?.read?.(arg())', ({ obj, arg }) => obj?.read?.(arg()))
      ],
      note: 'Se la catena si interrompe, le espressioni successive della stessa catena non vengono valutate. Un metodo non invocabile ma non nullish non interrompe la valutazione degli argomenti.'
    },
    grouping: {
      label: 'Grouping',
      description: 'Osserva come le parentesi possono interrompere la continuità della catena opzionale.',
      cases: [
        example('Oggetto completo', 'const user = { profile: { name: "Mario" } }', () => ({ user: { profile: { name: 'Mario' } } })),
        example('Oggetto null', 'const user = null', () => ({ user: null })),
        example('Profilo null', 'const user = { profile: null }', () => ({ user: { profile: null } })),
        example('Profilo assente', 'const user = {}', () => ({ user: {} }))
      ],
      tests: [
        test('user?.profile.name', ({ user }) => user?.profile.name),
        test('(user?.profile).name', ({ user }) => (user?.profile).name),
        test('user?.profile?.name', ({ user }) => user?.profile?.name),
        test('(user?.profile)?.name', ({ user }) => (user?.profile)?.name)
      ],
      note: 'Le parentesi terminano la catena continua: (user?.profile).name tenta l’accesso a name anche se l’espressione tra parentesi restituisce undefined.'
    }
  }
  const trackingSource = `let keyCalls = 0\nlet argCalls = 0\nconst key = () => { keyCalls++; return 'item' }\nconst arg = () => { argCalls++; return 7 }`
  const format = value => {
    if (typeof value === 'string') return JSON.stringify(value)
    if (value === null || typeof value !== 'object') return String(value)
    return JSON.stringify(value, null, 2)
  }
  const typeOf = value => value === null ? 'null (typeof: object)' : typeof value
  const evaluate = (mode, fixture, expression) => {
    const data = fixture.create()
    let keyCalls = 0
    let argCalls = 0
    if (mode.tracked) {
      data.key = () => { keyCalls++; return 'item' }
      data.arg = () => { argCalls++; return 7 }
    }
    let result
    try {
      const value = expression.run(data)
      result = { value: format(value), type: typeOf(value), error: false }
    } catch (error) {
      result = { value: error.name, type: 'Eccezione', detail: error.message, error: true }
    }
    return { ...result, keyCalls, argCalls }
  }
  // Standalone code, with a separate block for each expression to reset state.
  const generate = (mode, fixture) => [
    "'use strict'",
    '// Ogni espressione viene eseguita con dati indipendenti.',
    ...mode.tests.map(({ expression }) => [
      '{',
      ...fixture.source.split('\n').map(line => '  ' + line),
      ...(mode.tracked ? trackingSource.split('\n').map(line => '  ' + line) : []),
      '  try {',
      `    const result = ${expression}`,
      `    console.log(${JSON.stringify(expression)}, result, typeof result)`,
      '  } catch (error) {',
      `    console.log(${JSON.stringify(expression)}, error.name, error.message)`,
      '  }',
      ...(mode.tracked ? ["  console.log('key()', keyCalls, 'arg()', argCalls)"] : []),
      '}'
    ].join('\n'))
  ].join('\n\n')

  const template = document.createElement('template')
  template.innerHTML = `
    <style>
      :host { display:block; --pg-accent:var(--playground-accent,#2563eb); --pg-border:var(--playground-border,#b5b5b5); --pg-radius:var(--playground-radius,.5rem); color:inherit; font:inherit; min-width:0 }
      *, *::before, *::after { box-sizing:border-box }
      .panel { border:1px solid var(--pg-border); border-radius:var(--pg-radius); padding:clamp(.75rem, 2.5vw, 1.25rem); background:var(--playground-background,transparent); display:grid; gap:1rem; min-width:0 }
      .head,.actions { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.5rem }
      h3,h4,p,pre { margin:0 }
      h3 { font-size:1.15em } h4 { font-size:1em }
      .controls,.results { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr)); gap:.75rem }
      label { display:grid; gap:.35rem; min-width:0; font-size:.95em; font-weight:600 }
      button,select { font:inherit; color:inherit; background:var(--playground-background,transparent); border:1px solid var(--pg-border); border-radius:var(--pg-radius); padding:.5rem .7rem; min-width:0; max-width:100% }
      select option { color:CanvasText; background:Canvas } button { cursor:pointer }
      button:hover { border-color:var(--pg-accent) } button:focus-visible,select:focus-visible,summary:focus-visible { outline:2px solid var(--pg-accent); outline-offset:2px }
      pre,code { font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:.88em; overflow-wrap:anywhere; white-space:pre-wrap; word-break:normal }
      pre { background:rgba(128,128,128,.08); border-radius:var(--pg-radius); padding:.75rem; min-width:0; max-width:100% }
      .result { min-width:0; display:grid; align-content:start; gap:.5rem; border:1px solid var(--pg-border); border-radius:var(--pg-radius); padding:.75rem; border-inline-start:3px solid var(--pg-accent) }
      .result[data-error=true] { border-inline-start-color:var(--playground-error,#b91c1c) }
      .value { font-weight:700; font-size:1em }
      .detail,.type,.hint,.status { font-size:.88em; overflow-wrap:anywhere }
      .type { opacity:.85 } .note { border-inline-start:3px solid var(--pg-accent); padding-inline-start:.75rem }
      details { min-width:0 } summary { cursor:pointer; font-weight:600; margin-bottom:.5rem }
      .status:empty { display:none }
    </style>
    <div class="panel">
      <div class="head"><h3>JavaScript Optional Chaining Playground</h3><button type="button" id="reset">Reset</button></div>
      <div class="controls">
        <label>Modalità<select id="mode"></select></label>
        <label>Scenario<select id="scenario"></select></label>
      </div>
      <p id="description"></p>
      <div><h4>Dati di partenza</h4><pre id="data"></pre></div>
      <h4>Confronto delle espressioni</h4>
      <div class="results" id="results" aria-live="polite"></div>
      <p class="note" id="note"></p>
      <p class="hint">Ogni espressione viene eseguita separatamente con una nuova copia dei dati. I messaggi di errore dipendono dal browser.</p>
      <details><summary>Codice JavaScript riproducibile</summary><div class="actions"><button type="button" id="copy">Copia codice</button></div><pre id="source" tabindex="0"></pre></details>
      <p class="status" id="status" role="status"></p>
    </div>`
  const element = (tag, text, className) => {
    const node = document.createElement(tag)
    if (text !== undefined) node.textContent = text
    if (className) node.className = className
    return node
  }
  class OptionalChainingPlayground extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true))
      this.$ = id => this.shadowRoot.getElementById(id)
      const mode = this.$('mode')
      for (const [key, value] of Object.entries(modes)) {
        const option = element('option', value.label)
        option.value = key
        mode.append(option)
      }
      mode.addEventListener('change', () => this.setMode())
      this.$('scenario').addEventListener('change', () => this.render())
      this.$('reset').addEventListener('click', () => {
        mode.value = 'nested'
        this.setMode()
      })
      this.$('copy').addEventListener('click', () => this.copy())
    }
    connectedCallback() {
      this.dataset.version = '1.0.0'
      if (!this.$('scenario').options.length) this.setMode()
    }
    setMode() {
      const mode = modes[this.$('mode').value]
      this.$('scenario').replaceChildren(...mode.cases.map((fixture, index) => {
        const option = element('option', fixture.label)
        option.value = String(index)
        return option
      }))
      this.render()
    }
    render() {
      const mode = modes[this.$('mode').value]
      const fixture = mode.cases[Number(this.$('scenario').value)]
      this.$('description').textContent = mode.description
      this.$('data').textContent = fixture.source + (mode.tracked ? '\n\n' + trackingSource : '')
      this.$('note').textContent = mode.note
      this.$('status').textContent = ''
      this.$('results').replaceChildren(...mode.tests.map(expression => {
        const result = evaluate(mode, fixture, expression)
        const card = element('div', undefined, 'result')
        card.dataset.error = String(result.error)
        card.append(element('code', expression.expression), element('pre', result.value, 'value'), element('p', result.type, 'type'))
        if (result.error) card.append(element('p', result.detail, 'detail'))
        if (mode.tracked) card.append(element('p', `Valutazioni: key() = ${result.keyCalls}; arg() = ${result.argCalls}`, 'detail'))
        return card
      }))
      this.$('source').textContent = generate(mode, fixture)
    }
    async copy() {
      try {
        await navigator.clipboard.writeText(this.$('source').textContent)
        this.$('status').textContent = 'Codice JavaScript copiato.'
      } catch {
        this.$('status').textContent = 'Copia automatica non disponibile. Seleziona il codice manualmente.'
      }
    }
  }
  customElements.define('optional-chaining-playground', OptionalChainingPlayground)
})()
