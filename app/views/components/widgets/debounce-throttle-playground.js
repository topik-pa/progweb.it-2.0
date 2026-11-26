(() => {
  'use strict'

  const tag = 'debounce-throttle-playground'
  if (customElements.get(tag)) return

  // Trailing is skipped for an isolated leading call.
  function debounce(fn, wait, { leading = false, trailing = true } = {}) {
    let timer = null
    let queued = null

    const invoke = call => fn.apply(call.context, call.args)
    const expire = () => {
      timer = null
      const call = queued
      queued = null
      if (trailing && call) invoke(call)
    }

    function wrapped(...args) {
      const first = timer === null
      const call = { context: this, args }
      if (!first) clearTimeout(timer)
      queued = trailing && !(first && leading) ? call : null
      timer = setTimeout(expire, wait)
      if (first && leading) return invoke(call)
    }

    wrapped.cancel = () => {
      clearTimeout(timer)
      timer = null
      queued = null
    }
    wrapped.pending = () => queued !== null
    return wrapped
  }

  // A trailing invocation starts a new cooldown interval.
  function throttle(fn, wait, { leading = true, trailing = true } = {}) {
    let timer = null
    let queued = null

    const invoke = call => fn.apply(call.context, call.args)
    const startWindow = () => { timer = setTimeout(expire, wait) }
    const expire = () => {
      timer = null
      const call = queued
      queued = null
      if (trailing && call) {
        startWindow()
        invoke(call)
      }
    }

    function wrapped(...args) {
      const call = { context: this, args }
      if (timer === null) {
        startWindow()
        if (leading) return invoke(call)
        if (trailing) queued = call
      } else if (trailing) {
        queued = call
      }
    }

    wrapped.cancel = () => {
      clearTimeout(timer)
      timer = null
      queued = null
    }
    wrapped.pending = () => queued !== null
    return wrapped
  }

  const defaults = { debounce: 400, throttle: 400, interval: 100, count: 12 }
  const fields = [
    ['debounce', 'Debounce delay (ms)', 20, 3000],
    ['throttle', 'Throttle interval (ms)', 20, 3000],
    ['interval', 'Intervallo eventi automatici (ms)', 20, 1000],
    ['count', 'Numero di eventi automatici', 1, 50]
  ]
  const lanes = [
    { key: 'raw', label: 'Eventi originali', short: 'Eventi', color: 'var(--events-color, #64748b)' },
    { key: 'debounce', label: 'Debounce', short: 'Debounce', color: 'var(--debounce-color, #2563eb)' },
    { key: 'throttle', label: 'Throttle', short: 'Throttle', color: 'var(--throttle-color, #0d9488)' }
  ]
  const template = document.createElement('template')
  template.innerHTML = `
    <style>
      :host { display:block; min-width:0; margin-block:2rem; color:inherit; font:inherit; font-size:.875rem; }
      * { box-sizing:border-box; }
      [hidden] { display:none !important; }
      .playground { min-width:0; padding:1rem; border:1px solid var(--playground-border,#b5b5b5); border-radius:var(--playground-radius,.5rem); background:var(--playground-background,transparent); }
      .toolbar,.actions,.heading { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.6rem; }
      .title { margin:0; font-size:1.125rem; font-weight:600; }
      p { line-height:1.55; margin-block:.65rem; }
      .controls,.options,.stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr)); gap:.75rem; margin-block:1rem; }
      label { display:grid; gap:.35rem; min-width:0; }
      input,button { min-width:0; font:inherit; color:inherit; accent-color:var(--playground-accent,#2563eb); }
      input[type=number],button { padding:.5rem .65rem; border:1px solid var(--playground-border,#b5b5b5); border-radius:.25rem; background:transparent; }
      input[type=number] { width:100%; }
      button { cursor:pointer; }
      button:hover:not(:disabled) { background:rgb(128 128 128 / 10%); }
      button:disabled { opacity:.55; cursor:default; }
      :is(button,input,pre,.chart):focus-visible { outline:2px solid var(--playground-accent,#2563eb); outline-offset:2px; }
      .primary { color:var(--playground-accent-text,#fff); background:var(--playground-accent,#2563eb); border-color:var(--playground-accent,#2563eb); }
      .primary:hover:not(:disabled) { filter:brightness(.9); background:var(--playground-accent,#2563eb); }
      fieldset { margin:0; min-width:0; padding:.6rem .75rem; border:1px solid var(--playground-border,#b5b5b5); border-radius:.35rem; }
      fieldset label { display:flex; align-items:center; gap:.45rem; margin-block:.35rem; }
      legend { font-weight:600; }
      .actions { justify-content:flex-start; margin-block:1rem; }
      .error { color:var(--playground-error,#b91c1c); }
      .hint { font-size:.8rem; }
      .stat { min-width:0; border:1px solid var(--playground-border,#b5b5b5); border-radius:.35rem; padding:.75rem; }
      .stat output { display:block; font-weight:600; font-size:1.5rem; font-variant-numeric:tabular-nums; margin-block:.25rem; }
      .stat small { display:block; }
      .dot { display:inline-block; width:.65rem; height:.65rem; border-radius:50%; margin-inline-end:.35rem; }
      .chart { overflow:auto; min-width:0; border:1px dashed var(--playground-border,#b5b5b5); border-radius:.35rem; padding:.35rem; }
      svg { display:block; width:100%; min-width:440px; height:auto; font:12px system-ui,sans-serif; }
      .guide { stroke:currentColor; opacity:.16; }
      .axis { stroke:currentColor; opacity:.4; }
      .now { stroke:currentColor; stroke-dasharray:4 3; opacity:.55; }
      pre { white-space:pre-wrap; overflow-wrap:anywhere; overflow:auto; margin:.5rem 0 0; padding:.8rem; border-radius:.25rem; background:rgb(128 128 128 / 9%); font:.85rem/1.55 monospace; tab-size:2; }
      .log { max-height:13rem; min-height:3rem; overflow:auto; }
      .code { max-height:26rem; }
      .status { min-height:1.4em; margin-block:.5rem 0; }
      .heading { margin-block-start:1rem; }
    </style>
    <div class="playground">
      <div class="toolbar"><p class="title">JavaScript Debounce &amp; Throttle Playground</p><button type="button" data-action="reset">Reset</button></div>
      <p>Genera eventi e confronta in tempo reale il numero e il momento delle esecuzioni delle callback.</p>
      <form novalidate>
        <div class="controls">${fields.map(([name,label,min,max]) => `<label>${label}<input type="number" name="${name}" min="${min}" max="${max}" step="1" value="${defaults[name]}" required></label>`).join('')}</div>
        <div class="options">
          <fieldset><legend>Debounce</legend><label><input type="checkbox" name="debounceLeading"> leading</label><label><input type="checkbox" name="debounceTrailing" checked> trailing</label></fieldset>
          <fieldset><legend>Throttle</legend><label><input type="checkbox" name="throttleLeading" checked> leading</label><label><input type="checkbox" name="throttleTrailing" checked> trailing</label></fieldset>
        </div>
      </form>
      <p class="hint">Leading: esecuzione immediata all'inizio. Trailing: esecuzione differita dell'ultimo evento in attesa. Se entrambe le opzioni sono disattivate, la tecnica non esegue alcuna callback.</p>
      <p class="error" role="alert" hidden></p>
      <div class="actions">
        <button type="button" class="primary" data-action="manual">Genera evento</button>
        <button type="button" data-action="auto">Avvia sequenza automatica</button>
        <button type="button" data-action="stop" disabled>Interrompi</button>
      </div>
      <p class="session" role="status">Pronto. Genera eventi manualmente oppure avvia una sequenza.</p>
      <div class="stats">${lanes.map(({key,label,color}) => `<div class="stat"><span><span class="dot" style="background:${color}" aria-hidden="true"></span>${label}</span><output data-count="${key}" aria-label="Conteggio ${label}">0</output><small data-saving="${key}">—</small></div>`).join('')}</div>
      <div class="chart" tabindex="0" role="region" aria-label="Timeline degli eventi">
        <svg viewBox="0 0 760 230" role="img" aria-label="Confronto temporale tra eventi originali, debounce e throttle"></svg>
      </div>
      <p class="hint">Ogni punto rappresenta un evento o una callback. Il grafico usa i tempi effettivi, che possono variare a causa dell'event loop. Il registro riporta anche l'ID dell'evento utilizzato dalla callback.</p>
      <div class="heading"><strong>Registro degli eventi</strong><button type="button" data-action="copy-log">Copia registro</button></div>
      <pre class="log" tabindex="0" aria-label="Registro cronologico">Nessun evento.</pre>
      <div class="heading"><strong>Codice JavaScript generato</strong><button type="button" data-action="copy-code">Copia JavaScript</button></div>
      <pre class="code" tabindex="0"><code></code></pre>
      <p class="status" role="status"></p>
    </div>`

  const svgNS = 'http://www.w3.org/2000/svg'
  function svgElement(name, attrs, text) {
    const node = document.createElementNS(svgNS, name)
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
    if (text !== undefined) node.textContent = text
    return node
  }
  const ms = n => Math.round(n)

  class DebounceThrottlePlayground extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true))
      this.form = this.$('form')
      this.run = null
      this.form.addEventListener('submit', event => event.preventDefault())
      this.form.addEventListener('input', () => {
        if (this.run?.active) return
        this.run = null
        this.$('.session').textContent = 'Configurazione aggiornata. Pronto per un nuovo esperimento.'
        this.configure()
        this.render()
      })
      const actions = {
        manual: () => this.manual(), auto: () => this.startAuto(),
        stop: () => this.end('Interrotto: timer e callback in attesa annullati.'),
        reset: () => this.reset(), 'copy-code': () => this.copy(this.$('code').textContent),
        'copy-log': () => this.copy(this.$('.log').textContent)
      }
      for (const [action, handler] of Object.entries(actions)) this.$(`[data-action="${action}"]`).addEventListener('click', handler)
    }

    $(selector) { return this.shadowRoot.querySelector(selector) }
    button(action) { return this.$(`[data-action="${action}"]`) }
    connectedCallback() { this.configure(); this.render() }
    disconnectedCallback() { this.end('Esecuzione interrotta.') }

    settings() {
      const data = new FormData(this.form)
      return {
        ...Object.fromEntries(fields.map(([name]) => [name, Number(data.get(name))])),
        debounceOptions: { leading: data.has('debounceLeading'), trailing: data.has('debounceTrailing') },
        throttleOptions: { leading: data.has('throttleLeading'), trailing: data.has('throttleTrailing') }
      }
    }

    validation() {
      for (const [name,label,min,max] of fields) {
        const input = this.form.elements.namedItem(name)
        if (!input.validity.valid || !Number.isInteger(input.valueAsNumber)) return `${label}: inserisci un intero tra ${min} e ${max}.`
      }
      return ''
    }

    configure() {
      const error = this.validation()
      const active = Boolean(this.run?.active)
      this.$('.error').textContent = error
      this.$('.error').hidden = !error
      for (const control of this.form.querySelectorAll('input')) control.disabled = active
      this.button('manual').disabled = Boolean(error || (active && (this.run.auto || this.run.raw.length >= 100)))
      this.button('auto').disabled = Boolean(error || active)
      this.button('stop').disabled = !active
      this.button('copy-code').disabled = Boolean(error)
      if (!active) this.$('code').textContent = error ? '// Correggi i parametri per generare il codice.' : this.generateCode(this.settings())
    }

    generateCode(settings) {
      const options = obj => `{ leading: ${obj.leading}, trailing: ${obj.trailing} }`
      return [`const debounce = ${debounce.toString()}`, `const throttle = ${throttle.toString()}`,
        '// Esempio: aggiungi un listener a un elemento con id="event-source".',
        `const debounced = debounce(event => console.log('Debounce', event.type), ${settings.debounce}, ${options(settings.debounceOptions)})`,
        `const throttled = throttle(event => console.log('Throttle', event.type), ${settings.throttle}, ${options(settings.throttleOptions)})`,
        `const source = document.querySelector('#event-source')`,
        `const onEvent = event => {\n  debounced(event)\n  throttled(event)\n}`,
        `source?.addEventListener('click', onEvent)`,
        `// Quando il listener non serve più:\n// source.removeEventListener('click', onEvent)\n// debounced.cancel()\n// throttled.cancel()`
      ].join('\n\n')
    }

    begin(auto) {
      if (this.validation() || this.run?.active) return null
      const settings = this.settings()
      const run = { active:true, auto, settings, start:performance.now(), end:0, raw:[], debounce:[], throttle:[], log:[], timers:new Set(), ticker:null }
      this.run = run
      run.debounced = debounce(id => this.record(run,'debounce',id),settings.debounce,settings.debounceOptions)
      run.throttled = throttle(id => this.record(run,'throttle',id),settings.throttle,settings.throttleOptions)
      run.ticker = setInterval(() => this.tick(run), 50)
      this.$('.status').textContent = ''
      this.$('.session').textContent = auto ? 'Sequenza automatica in corso…' : 'Sessione manuale: premi Genera evento più volte. Massimo 100 eventi o 60 secondi.'
      this.configure()
      this.render()
      return run
    }

    elapsed(run) { return run.active ? Math.max(0,performance.now()-run.start) : run.end }
    record(run, lane, id) {
      if (this.run !== run || !run.active) return
      const time = this.elapsed(run)
      run[lane].push({ id, time })
      const label = lane === 'raw' ? 'Evento' : lane === 'debounce' ? 'Debounce' : 'Throttle'
      run.log.push(`[${ms(time)} ms] ${label} #${id}`)
    }
    emit(run) {
      if (this.run !== run || !run.active) return
      const id = run.raw.length + 1
      this.record(run,'raw',id)
      run.debounced(id)
      run.throttled(id)
      this.tick(run)
    }
    manual() {
      if (this.run?.active && this.run.auto) return
      const run = this.run?.active ? this.run : this.begin(false)
      if (run && run.raw.length < 100) this.emit(run)
    }
    startAuto() {
      const run = this.begin(true)
      if (!run) return
      for (let i=1; i<run.settings.count; i++) {
        const timer = setTimeout(() => {
          run.timers.delete(timer)
          this.emit(run)
        }, i*run.settings.interval)
        run.timers.add(timer)
      }
      this.emit(run)
    }
    tick(run) {
      if (this.run !== run || !run.active) return
      const pending = run.debounced.pending() || run.throttled.pending()
      if ((run.auto && run.raw.length === run.settings.count && !pending) || (!run.auto && run.raw.length >= 100 && !pending)) {
        this.end('Esperimento concluso. Puoi avviarne uno nuovo.')
        return
      }
      if (!run.auto && this.elapsed(run) >= 60000) {
        this.end('Limite di 60 secondi raggiunto; callback in attesa annullate.')
        return
      }
      if (run.auto && run.raw.length === run.settings.count) this.$('.session').textContent = 'Tutti gli eventi generati. In attesa delle callback trailing…'
      if (!run.auto && run.raw.length >= 100) this.button('manual').disabled = true
      this.render()
    }
    end(message) {
      const run = this.run
      if (!run?.active) return
      run.end = this.elapsed(run)
      run.active = false
      clearInterval(run.ticker)
      for (const timer of run.timers) clearTimeout(timer)
      run.timers.clear()
      run.debounced.cancel()
      run.throttled.cancel()
      this.$('.session').textContent = message
      this.configure()
      this.render()
    }
    reset() {
      this.end('Interrotto.')
      this.run = null
      this.form.reset()
      this.$('.session').textContent = 'Pronto. Genera eventi manualmente oppure avvia una sequenza.'
      this.$('.status').textContent = ''
      this.configure()
      this.render()
    }
    render() {
      const run = this.run
      const total = run?.raw.length || 0
      for (const {key} of lanes) {
        const count = run?.[key].length || 0
        this.$(`[data-count="${key}"]`).textContent = count
        this.$(`[data-saving="${key}"]`).textContent = !total ? '—' : key === 'raw' ? '100% degli eventi' : `${Math.round((1-count/total)*100)}% di esecuzioni risparmiate`
      }
      const log = this.$('.log')
      const text = run?.log.length ? run.log.join('\n') : 'Nessun evento.'
      if (log.textContent !== text) {
        const atBottom = log.scrollHeight-log.scrollTop-log.clientHeight < 24
        log.textContent = text
        if (atBottom) log.scrollTop = log.scrollHeight
      }
      this.draw(run)
    }
    draw(run) {
      const svg = this.$('svg')
      const elapsed = run ? this.elapsed(run) : 0
      const planned = run?.auto ? (run.settings.count-1)*run.settings.interval+Math.max(run.settings.debounce,run.settings.throttle) : 0
      const base = Math.max(1000, elapsed, planned)
      const step = Math.max(100, Math.pow(10,Math.floor(Math.log10(base/5))))
      const tick = [1,2,5,10].map(n=>n*step).find(n=>n>=base/5) || 10*step
      const domain = Math.ceil(base/tick)*tick
      const left = 104, right = 735
      const x = t => left + Math.min(domain,t)/domain*(right-left)
      const nodes = []
      for (let t=0;t<=domain;t+=tick) {
        nodes.push(svgElement('line',{x1:x(t),x2:x(t),y1:15,y2:186,class:'guide'}),svgElement('text',{x:x(t),y:204,'text-anchor':'middle',fill:'currentColor'},`${t}`))
      }
      lanes.forEach(({key,short,color},i) => {
        const y=46+i*59
        nodes.push(svgElement('text',{x:6,y:y+4,fill:'currentColor','font-weight':'600'},short),svgElement('line',{x1:left,x2:right,y1:y,y2:y,class:'axis'}))
        for (const {id,time} of run?.[key] || []) {
          const dot=svgElement('circle',{cx:x(time),cy:y,r:4.5,fill:color})
          dot.append(svgElement('title',{},`#${id} · ${ms(time)} ms`))
          nodes.push(svgElement('line',{x1:x(time),x2:x(time),y1:y-11,y2:y+11,stroke:color,'stroke-width':1.4}),dot)
        }
      })
      if (run) nodes.push(svgElement('line',{x1:x(elapsed),x2:x(elapsed),y1:15,y2:186,class:'now'}))
      nodes.push(svgElement('text',{x:(left+right)/2,y:225,fill:'currentColor','text-anchor':'middle'},'Tempo (ms)'))
      svg.replaceChildren(...nodes)
    }
    async copy(text) {
      try {
        await navigator.clipboard.writeText(text)
        this.$('.status').textContent = 'Testo copiato negli appunti.'
      } catch {
        this.$('.status').textContent = 'Copia automatica non disponibile. Seleziona il testo manualmente.'
      }
    }
  }
  customElements.define(tag, DebounceThrottlePlayground)
})()
