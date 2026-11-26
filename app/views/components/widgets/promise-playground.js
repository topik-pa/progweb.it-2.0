(() => {
  'use strict'

  const tag = 'promise-playground'
  if (customElements.get(tag)) return

  const modes = {
    single: ['new Promise()', 'Una Promise passa da pending a fulfilled oppure rejected.'],
    chain: ['then() → catch() → finally()', 'Il valore viene trasformato da then(); catch() può recuperare un rifiuto. finally() viene eseguito in entrambi i casi.'],
    all: ['Promise.all()', 'Si risolve quando tutte le Promise si risolvono; si rifiuta al primo rifiuto.'],
    allSettled: ['Promise.allSettled()', 'Attende tutti gli esiti e restituisce i risultati nell’ordine di input.'],
    race: ['Promise.race()', 'Adotta l’esito della prima Promise che termina, senza annullare le altre.'],
    any: ['Promise.any()', 'Attende il primo successo; se tutte falliscono, restituisce un AggregateError come motivo del rifiuto.'],
    manual: ['Promise.withResolvers()', 'Restituisce promise, resolve e reject separatamente. Solo la prima chiamata effettiva determina l’esito.']
  }
  const names = ['A', 'B', 'C']
  const defaults = [600, 1200, 1800]
  const supportsManual = typeof Promise.withResolvers === 'function'
  const singleModes = new Set(['single', 'chain', 'manual'])
  const template = document.createElement('template')
  template.innerHTML = `
    <style>
      :host { display:block; min-width:0; margin-block:2rem; color:inherit; font-family:inherit; font-size:.875rem; }
      * { box-sizing:border-box; }
      [hidden] { display:none !important; }
      .playground { padding:1rem; border:1px solid var(--playground-border,#b5b5b5); border-radius:var(--playground-radius,.5rem); background:var(--playground-background,transparent); min-width:0; }
      .toolbar,.actions,.card-head { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.6rem; }
      .toolbar { margin-block-end:1rem; }
      .title { font-size:1.125rem; font-weight:600; margin:0; }
      p { line-height:1.55; margin-block:.65rem; }
      label { display:grid; gap:.35rem; min-width:0; }
      input,select,button { min-width:0; font:inherit; color:inherit; background:transparent; border:1px solid var(--playground-border,#b5b5b5); border-radius:.25rem; padding:.5rem .65rem; }
      select { width:100%; }
      input[type=number] { width:100%; }
      option { color:CanvasText; background:Canvas; }
      button { cursor:pointer; }
      button:hover:not(:disabled) { background:rgb(128 128 128 / 10%); }
      button:disabled { opacity:.55; cursor:default; }
      :is(button,select,input,pre):focus-visible { outline:2px solid var(--playground-accent,#2563eb); outline-offset:2px; }
      .primary { color:var(--playground-accent-text,#fff); background:var(--playground-accent,#2563eb); border-color:var(--playground-accent,#2563eb); }
      .primary:hover:not(:disabled) { filter:brightness(.9); background:var(--playground-accent,#2563eb); }
      .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr)); gap:.75rem; margin-block:1rem; }
      .card,.result,.chain { min-width:0; border:1px solid var(--playground-border,#b5b5b5); border-radius:.35rem; padding:.75rem; }
      .card label { margin-block:.65rem; }
      .state { display:inline-flex; align-items:center; gap:.35rem; font-family:monospace; font-weight:600; overflow-wrap:anywhere; }
      .state::before { content:''; width:.65rem; height:.65rem; border-radius:50%; background:currentColor; flex:none; }
      [data-state=pending] { color:var(--promise-pending,#a16207); }
      [data-state=fulfilled] { color:var(--promise-fulfilled,#15803d); }
      [data-state=rejected] { color:var(--promise-rejected,#b91c1c); }
      .track { height:.5rem; border-radius:1rem; overflow:hidden; background:rgb(128 128 128 / 17%); margin-block:.6rem; }
      .fill { display:block; height:100%; width:0%; background:var(--playground-accent,#2563eb); }
      .card[data-state=fulfilled] .fill { background:var(--promise-fulfilled,#15803d); }
      .card[data-state=rejected] .fill { background:var(--promise-rejected,#b91c1c); }
      .card { color:inherit; }
      .value { display:block; overflow-wrap:anywhere; font-family:monospace; min-height:1.2em; }
      .actions { justify-content:flex-start; margin-block:1rem; }
      .chain { margin-block:1rem; }
      .steps { display:flex; flex-wrap:wrap; gap:.4rem; margin:0; padding:0; list-style:none; }
      .steps li { border:1px solid var(--playground-border,#b5b5b5); padding:.3rem .45rem; border-radius:.25rem; font-family:monospace; }
      .steps [data-step-state=done] { border-color:var(--promise-fulfilled,#15803d); }
      .steps [data-step-state=skipped] { opacity:.55; }
      .result { background:rgb(128 128 128 / 5%); margin-block:1rem; }
      .result .state { font-size:1.05rem; }
      pre { white-space:pre-wrap; overflow-wrap:anywhere; overflow:auto; min-width:0; margin:.5rem 0 0; padding:.8rem; border-radius:.25rem; background:rgb(128 128 128 / 10%); font: .85rem/1.55 monospace; tab-size:2; }
      .log { max-height:15rem; min-height:4rem; overflow:auto; padding:.65rem .85rem; margin:.5rem 0 1rem; background:rgb(128 128 128 / 7%); border-radius:.25rem; font: .8rem/1.6 monospace; overflow-wrap:anywhere; }
      .log p { margin:0; }
      .error { color:var(--promise-rejected,#b91c1c); }
      .hint { font-size:.8rem; }
      .status { min-height:1.4em; margin-block:.5rem 0; }
    </style>
    <div class="playground">
      <div class="toolbar"><p class="title">JavaScript Promise Playground</p><button type="button" data-action="reset">Reset</button></div>
      <form novalidate>
        <label>Modalità<select name="mode">${Object.entries(modes).map(([key, [label]]) => `<option value="${key}"${key === 'manual' && !supportsManual ? ' disabled' : ''}>${label}${key === 'manual' && !supportsManual ? ' (non supportato)' : ''}</option>`).join('')}</select></label>
        <p class="mode-description"></p>
        <div class="cards">${names.map((name, i) => `
          <div class="card" data-promise="${name}">
            <div class="card-head"><strong>Promise ${name}</strong><span class="state" data-state="idle">—</span></div>
            <div class="auto-controls">
              <label>Ritardo (ms)<input type="number" name="delay${name}" min="0" max="10000" step="1" value="${defaults[i]}" required></label>
              <label>Esito<select name="outcome${name}"><option value="resolve">resolve</option><option value="reject">reject</option></select></label>
              <div class="track" aria-hidden="true"><span class="fill"></span></div>
            </div>
            <output class="value" aria-label="Valore della Promise ${name}">—</output>
          </div>`).join('')}</div>
        <label class="recover" hidden><span><input type="checkbox" name="recover" checked> Recupera l’errore in catch()</span></label>
        <div class="actions"><button type="submit" class="primary" data-action="run">Esegui</button><button type="button" data-action="stop" disabled>Interrompi simulazione</button></div>
        <div class="manual-actions actions" hidden><button type="button" data-action="resolve" disabled>resolve('A')</button><button type="button" data-action="reject" disabled>reject(Error)</button></div>
        <p class="error" role="alert" hidden></p>
      </form>
      <div class="chain" hidden><strong>Concatenamento</strong><ul class="steps" aria-label="Callback della catena">${['then','catch','finally'].map(x=>`<li data-step="${x}">${x}(): in attesa</li>`).join('')}</ul></div>
      <div class="result">
        <div class="card-head"><strong>Promise risultante</strong><span class="state" data-state="idle">—</span></div>
        <pre class="result-value" tabindex="0">Nessuna esecuzione.</pre>
        <p class="result-note hint" role="status"></p>
      </div>
      <div class="card-head"><strong>Registro degli eventi</strong><button type="button" data-action="clear">Svuota</button></div>
      <div class="log" role="log" aria-label="Registro degli eventi" tabindex="0"></div>
      <p class="hint">I tempi sono misurati nel browser e possono differire dai ritardi richiesti. Interrompi e Reset fermano solo i timer di questa demo: le Promise non dispongono di un metodo di annullamento generale.</p>
      <div class="card-head"><strong>Codice JavaScript generato</strong><button type="button" data-action="copy">Copia JS</button></div>
      <pre tabindex="0"><code class="code"></code></pre>
      <p class="status" role="status"></p>
    </div>`

  const describe = value => {
    if (value instanceof AggregateError) return { name: value.name, message: value.message, errors: [...value.errors].map(describe) }
    if (value instanceof Error) return { name: value.name, message: value.message }
    if (Array.isArray(value)) return value.map(describe)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, describe(item)]))
    return value
  }
  const format = value => JSON.stringify(describe(value), null, 2) ?? String(value)
  const errorFor = name => new Error(`Errore ${name}`)
  const stateText = { idle:'—', pending:'pending', fulfilled:'fulfilled', rejected:'rejected', stopped:'interrotta*' }

  function generateCode(mode, items, recover) {
    const end = `\nresult.then(\n  value => console.log('fulfilled:', value),\n  error => console.error('rejected:', error)\n)`
    if (mode === 'manual') return `const { promise, resolve, reject } = Promise.withResolvers()\n\nconst result = promise\n${end}\n\n// Esegui una delle due chiamate:\nresolve('A')\n// reject(new Error('Errore A'))`
    const helper = `function task(name, delay, shouldReject) {\n  return new Promise((resolve, reject) => {\n    setTimeout(() => {\n      if (shouldReject) {\n        reject(new Error('Errore ' + name))\n      } else {\n        resolve(name)\n      }\n    }, delay)\n  })\n}\n\n`
    const input = items.map(({ name, delay, outcome }) => `const ${name.toLowerCase()} = task('${name}', ${delay}, ${outcome === 'reject'})`).join('\n')
    let expr = 'const result = a'
    if (mode === 'chain') expr += `\n  .then(value => value + ' → trasformato')\n  .catch(error => {\n    ${recover ? "return 'Valore di recupero'" : 'throw error'}\n  })\n  .finally(() => console.log('finally'))`
    else if (mode !== 'single') expr = `const result = Promise.${mode}([a, b, c])`
    return helper + input + '\n\n' + expr + '\n' + end
  }

  class PromisePlayground extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode:'open' }).append(template.content.cloneNode(true))
      this.$ = selector => this.shadowRoot.querySelector(selector)
      this.form = this.$('form')
      this.cards = names.map(name => this.$(`[data-promise="${name}"]`))
      this.run = null
      this.$('form').addEventListener('submit', event => { event.preventDefault(); this.start() })
      const onConfigurationChange = () => {
        if (!this.run || this.run.done) {
          this.run = null
          this.clearDisplay()
        }
        this.configure()
      }
      this.form.addEventListener('input', onConfigurationChange)
      this.form.addEventListener('change', onConfigurationChange)
      for (const [action, callback] of Object.entries({ reset:()=>this.reset(), stop:()=>this.stop(), resolve:()=>this.manual(false), reject:()=>this.manual(true), clear:()=>this.clearLog(), copy:()=>this.copy() })) {
        this.$(`[data-action="${action}"]`).addEventListener('click', callback)
      }
    }
    connectedCallback() { this.configure() }
    disconnectedCallback() { this.cancelRun(); this.clearDisplay(); this.configure() }
    get mode() { return this.form.elements.namedItem('mode').value }
    get recover() { return this.form.elements.namedItem('recover').checked }
    get activeNames() { return singleModes.has(this.mode) ? names.slice(0,1) : names }
    get config() {
      return this.activeNames.map(name => ({ name, delay:this.form.elements.namedItem(`delay${name}`).valueAsNumber, outcome:this.form.elements.namedItem(`outcome${name}`).value }))
    }
    setState(node, state) { node.dataset.state = state; node.textContent = stateText[state] }
    setCard(index, state, value) {
      const card = this.cards[index]
      card.dataset.state = state
      this.setState(card.querySelector('.state'), state)
      card.querySelector('.value').textContent = value === undefined ? '—' : format(value)
      if (state === 'fulfilled' || state === 'rejected') card.querySelector('.fill').style.width = '100%'
    }
    setResult(state, value, note = '') {
      this.setState(this.$('.result .state'), state)
      this.$('.result-value').textContent = value === undefined ? '—' : format(value)
      this.$('.result-note').textContent = note
    }
    step(name, state) {
      const node = this.$(`[data-step="${name}"]`)
      node.dataset.stepState = state
      node.textContent = `${name}(): ${{waiting:'in attesa',done:'eseguito',skipped:'saltato'}[state]}`
    }
    clearLog() { this.$('.log').replaceChildren() }
    log(run, message) {
      if (this.run !== run) return
      const line = document.createElement('p')
      line.textContent = `[${Math.round(performance.now() - run.start)} ms] ${message}`
      const log = this.$('.log')
      log.append(line)
      log.scrollTop = log.scrollHeight
    }
    clearDisplay() {
      this.cards.forEach((card,i) => { this.setCard(i,'idle'); card.querySelector('.fill').style.width = '0%' })
      this.setResult('idle', 'Nessuna esecuzione.')
      this.$('.result-value').textContent = 'Nessuna esecuzione.'
      for (const name of ['then','catch','finally']) this.step(name,'waiting')
      this.clearLog()
      this.$('.status').textContent = ''
    }
    configure() {
      const mode = this.mode
      const running = Boolean(this.run && !this.run.done)
      this.$('.mode-description').textContent = modes[mode][1]
      this.cards.forEach((card,i) => {
        card.hidden = i >= this.activeNames.length
        card.querySelector('.auto-controls').hidden = mode === 'manual'
      })
      this.$('.recover').hidden = mode !== 'chain'
      this.$('.chain').hidden = mode !== 'chain'
      this.$('.manual-actions').hidden = mode !== 'manual'
      this.$('[data-action="stop"]').disabled = !running
      this.$('[data-action="run"]').textContent = running ? 'Riavvia' : mode === 'manual' ? 'Crea Promise' : 'Esegui'
      this.$('[data-action="resolve"]').disabled = !(running && mode === 'manual' && this.run.manual)
      this.$('[data-action="reject"]').disabled = !(running && mode === 'manual' && this.run.manual)
      // Configurazione immutabile durante un’esecuzione: si può riavviare o interrompere.
      for (const field of this.form.querySelectorAll('input, select')) field.disabled = running
      const valid = mode === 'manual' ? supportsManual : this.config.every(item => Number.isInteger(item.delay) && item.delay >= 0 && item.delay <= 10000)
      const err = this.$('.error')
      err.hidden = valid
      err.textContent = valid ? '' : 'Inserisci ritardi interi compresi tra 0 e 10000 ms.'
      this.$('[data-action="run"]').disabled = !valid
      this.$('[data-action="copy"]').disabled = !valid
      this.$('.code').textContent = valid ? generateCode(mode,this.config,this.recover) : '// Configurazione non valida'
      if (!running && this.run && this.run.mode !== mode) { this.run = null; this.clearDisplay() }
    }
    cancelRun() {
      const run = this.run
      this.run = null
      if (!run) return
      cancelAnimationFrame(run.frame)
      for (const stop of run.cancel) stop()
      run.cancel.clear()
    }
    stop() {
      const run = this.run
      if (!run || run.done) return
      this.log(run,'Simulazione interrotta: timer e aggiornamenti fermati.')
      this.cancelRun()
      this.cards.forEach((card,i) => { if (card.dataset.state === 'pending') this.setCard(i,'stopped') })
      if (this.$('.result .state').dataset.state === 'pending') this.setResult('stopped', 'Simulazione interrotta.')
      this.$('.result-note').textContent = '* Interrotta indica la demo, non uno stato nativo delle Promise.'
      this.configure()
    }
    reset() {
      this.cancelRun()
      this.form.reset()
      this.clearDisplay()
      this.configure()
      this.$('.status').textContent = 'Impostazioni ripristinate.'
    }
    task(run, item, index) {
      let cancel
      const promise = new Promise((resolve,reject) => {
        this.log(run,`Creazione Promise ${item.name} → pending`)
        const timer = setTimeout(() => {
          run.cancel.delete(cancel)
          this.log(run,`${item.name}: ${item.outcome}()`)
          if (item.outcome === 'reject') reject(errorFor(item.name))
          else resolve(item.name)
        }, item.delay)
        cancel = () => { clearTimeout(timer); reject(new Error('Simulazione interrotta')) }
        run.cancel.add(cancel)
      })
      this.observe(run,promise,item.name,index)
      return promise
    }
    observe(run,promise,name,index) {
      const settle = (state,value) => {
        if (this.run !== run) return
        this.setCard(index,state,value)
        run.remaining--
        this.log(run,`Promise ${name} → ${state}: ${value instanceof Error ? value.message : value}`)
        this.finish(run)
      }
      promise.then(value => settle('fulfilled',value), error => settle('rejected',error))
    }
    start() {
      const mode = this.mode
      const items = this.config
      const recover = this.recover
      if (mode === 'manual' ? !supportsManual : !items.every(item => Number.isInteger(item.delay) && item.delay >= 0 && item.delay <= 10000)) return
      this.cancelRun()
      this.clearDisplay()
      const run = { mode, start:performance.now(), remaining:items.length, resultSettled:false, done:false, cancel:new Set(), frame:0, manual:null }
      this.run = run
      items.forEach((_,i) => this.setCard(i,'pending'))
      let result
      if (mode === 'manual') {
        const { promise, resolve, reject } = Promise.withResolvers()
        const cancel = () => reject(new Error('Simulazione interrotta'))
        run.cancel.add(cancel)
        run.manual = { resolve, reject, cancel }
        this.log(run,'Promise.withResolvers(): Promise A → pending')
        this.observe(run,promise,'A',0)
        result = promise
      } else {
        const promises = items.map((item,i) => this.task(run,item,i))
        const [a] = promises
        if (mode === 'single') result = a
        else if (mode === 'chain') {
          result = a.then(value => {
            if (this.run === run) { this.step('then','done'); this.step('catch','skipped'); this.log(run,'then(): trasforma il valore') }
            return value + ' → trasformato'
          }).catch(error => {
            if (this.run === run) { this.step('then','skipped'); this.step('catch','done'); this.log(run,recover ? 'catch(): recupera il rifiuto' : 'catch(): rilancia l’errore') }
            if (recover) return 'Valore di recupero'
            throw error
          }).finally(() => {
            if (this.run === run) { this.step('finally','done'); this.log(run,'finally(): eseguito') }
          })
        } else result = Promise[mode](promises)
      }
      this.setResult('pending',undefined,'In attesa del risultato.')
      this.log(run,`${modes[mode][0]} → pending`)
      const settle = (state,value) => {
        if (this.run !== run) return
        run.resultSettled = true
        this.setResult(state,value,run.remaining ? `La Promise risultante è conclusa; ${run.remaining} operazioni ancora in corso.` : 'Tutte le operazioni della demo sono concluse.')
        this.log(run,`Promise risultante → ${state}`)
        this.finish(run)
      }
      result.then(value => settle('fulfilled',value), error => settle('rejected',error))
      this.configure()
      if (mode !== 'manual') {
        const tick = () => {
          if (this.run !== run || run.done) return
          const elapsed = performance.now() - run.start
          items.forEach((item,i) => {
            if (this.cards[i].dataset.state === 'pending') this.cards[i].querySelector('.fill').style.width = `${Math.min(99,item.delay ? elapsed / item.delay * 100 : 99)}%`
          })
          run.frame = requestAnimationFrame(tick)
        }
        run.frame = requestAnimationFrame(tick)
      }
    }
    manual(reject) {
      const run = this.run
      if (!run?.manual || run.done) return
      const actions = run.manual
      run.manual = null
      run.cancel.delete(actions.cancel)
      this.log(run,reject ? 'reject(Error)' : 'resolve("A")')
      if (reject) actions.reject(errorFor('A'))
      else actions.resolve('A')
      this.configure()
    }
    finish(run) {
      if (this.run !== run) return
      if (run.resultSettled && !run.remaining) {
        run.done = true
        cancelAnimationFrame(run.frame)
        this.$('.result-note').textContent = 'Tutte le operazioni della demo sono concluse.'
        this.log(run,'Fine delle operazioni.')
        this.configure()
      } else if (run.resultSettled) {
        this.$('.result-note').textContent = `La Promise risultante è conclusa; ${run.remaining} operazioni ancora in corso.`
      }
    }
    async copy() {
      try {
        await navigator.clipboard.writeText(this.$('.code').textContent)
        this.$('.status').textContent = 'Codice JavaScript copiato.'
      } catch {
        this.$('.status').textContent = 'Copia automatica non disponibile. Seleziona il codice manualmente.'
      }
    }
  }
  customElements.define(tag,PromisePlayground)
})()
