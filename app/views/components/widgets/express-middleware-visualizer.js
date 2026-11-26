(() => {
  'use strict'

  const TAG = 'express-middleware-visualizer'
  if (customElements.get(TAG)) return

  const scenarios = {
    success: 'Richiesta valida — 200',
    unauthorized: 'Utente non autenticato — 401',
    forbidden: 'Permessi insufficienti — 403',
    missing: 'Route inesistente — 404',
    sync: 'Eccezione sincrona — 500',
    explicit: 'Errore esplicito — next(err)',
    async: 'Promise rifiutata — errore asincrono',
    alternative: "Route alternativa — next('route')",
    hanging: 'Middleware bloccante — manca next()'
  }
  const stages = [
    ['request', 'HTTP Request', 'GET /…'],
    ['logger', 'Logger middleware', 'app.use()'],
    ['auth', 'Authentication', 'Route middleware'],
    ['permission', 'Authorization', 'Route middleware'],
    ['gate', 'Route guard', "next() / next('route')"],
    ['handler', 'Route handler', 'app.get()'],
    ['alternative', 'Route alternativa', 'app.get()'],
    ['missing', '404 fallback', 'app.use()'],
    ['error', 'Error handler', '(err, req, res, next)'],
    ['response', 'HTTP Response', 'Fine della richiesta']
  ]
  const format = value => JSON.stringify(value, null, 2)
  const pathFor = scenario => scenario === 'missing' ? '/missing' : '/api/users'

  function trace(scenario, version, forward) {
    const steps = []
    const add = (id, message, patch = {}) => steps.push({ id, message, ...patch })
    const respond = (id, status, body, message) => {
      add(id, message, { response: { status, body } })
      add('response', `Risposta HTTP ${status} inviata.`, { terminal: 'sent' })
    }
    const fail = message => {
      add('handler', message, { error: 'Database non disponibile' })
      respond('error', 500, { error: 'Internal Server Error' }, 'Error handler: res.status(500).json(...)')
    }
    add('request', `Ricevuta GET ${pathFor(scenario)}`)
    add('logger', scenario === 'hanging' ? 'Imposta req.requestId, ma non chiama next() né invia una risposta.' : 'Imposta req.requestId e chiama next().', { req: { requestId: 'demo-1' }, ...(scenario === 'hanging' ? { terminal: 'waiting' } : {}) })
    if (scenario === 'hanging') return steps
    if (scenario === 'missing') {
      respond('missing', 404, { error: 'Not Found' }, 'Nessuna route corrispondente: risposta 404. Non è un errore inoltrato con next(err).')
      return steps
    }
    if (scenario === 'unauthorized') {
      respond('auth', 401, { error: 'Unauthorized' }, 'Utente non autenticato: risposta 401 senza next().')
      return steps
    }
    add('auth', 'Utente dimostrativo associato a req.user; next().', { req: { user: { id: 1, role: scenario === 'forbidden' ? 'viewer' : 'admin' } } })
    if (scenario === 'forbidden') {
      respond('permission', 403, { error: 'Forbidden' }, 'Ruolo non autorizzato: risposta 403 senza next().')
      return steps
    }
    add('permission', 'Ruolo admin autorizzato; next().')
    if (scenario === 'alternative') {
      add('gate', "next('route'): salta gli handler rimanenti della route corrente.")
      respond('alternative', 200, { users: [], source: 'fallback' }, 'La route successiva corrisponde alla richiesta e invia una risposta.')
      return steps
    }
    add('gate', 'next(): prosegue nella route corrente.')
    if (scenario === 'sync') fail('throw new Error(...): Express intercetta l’eccezione sincrona.')
    else if (scenario === 'explicit') fail('next(err): prosegue saltando i middleware ordinari.')
    else if (scenario === 'async') {
      if (forward) fail('Promise rifiutata: catch(err) chiama next(err) esplicitamente.')
      else if (version === '5') fail('Promise restituita e rifiutata: Express 5 inoltra automaticamente l’errore.')
      else add('handler', 'Express 4 non inoltra automaticamente il rifiuto. Nessuna risposta garantita; Node.js può terminare il processo.', { error: 'Database non disponibile', terminal: 'unhandled' })
    } else respond('handler', 200, { users: [{ id: 1, name: 'Mario' }] }, 'res.json(...): invia la risposta senza chiamare next().')
    return steps
  }

  function source(scenario, version, forward) {
    const lines = []
    const add = (id, code) => code.split('\n').forEach(text => lines.push({ id, text }))
    add('', `// npm install express@${version}\n// Salva come server.mjs e avvia con node server.mjs\n// curl -i --max-time 5 http://localhost:3000${pathFor(scenario)}\n// Scenario locale: autenticazione e dati dimostrativi.\nimport express from 'express'\n\nconst app = express()\nconst scenario = ${JSON.stringify(scenario)}\n`)
    add('logger', `app.use((req, res, next) => {\n  req.requestId = 'demo-1'\n  console.log(req.method, req.path)\n  if (scenario === 'hanging') return\n  next()\n})\n`)
    add('auth', `function authenticate(req, res, next) {\n  if (scenario === 'unauthorized') {\n    return res.status(401).json({ error: 'Unauthorized' })\n  }\n  req.user = {\n    id: 1,\n    role: scenario === 'forbidden' ? 'viewer' : 'admin'\n  }\n  next()\n}\n`)
    add('permission', `function authorize(req, res, next) {\n  if (req.user.role !== 'admin') {\n    return res.status(403).json({ error: 'Forbidden' })\n  }\n  next()\n}\n`)
    add('gate', `function routeGuard(req, res, next) {\n  if (scenario === 'alternative') return next('route')\n  next()\n}\n`)
    if (scenario === 'async') {
      if (version === '4' && !forward) add('', '// ATTENZIONE: errore volutamente non gestito.\n// Solo in un processo locale isolato: Node.js può terminare.')
      add('handler', `app.get('/api/users', authenticate, authorize, routeGuard,\n  async (req, res, next) => {\n${forward ? "    try {\n      await Promise.reject(new Error('Database non disponibile'))\n    } catch (err) {\n      next(err)\n    }" : "    await Promise.reject(new Error('Database non disponibile'))"}\n  }\n)\n`)
    } else add('handler', `app.get('/api/users', authenticate, authorize, routeGuard,\n  (req, res, next) => {\n    if (scenario === 'sync') {\n      throw new Error('Database non disponibile')\n    }\n    if (scenario === 'explicit') {\n      return next(new Error('Database non disponibile'))\n    }\n    res.json({ users: [{ id: 1, name: 'Mario' }] })\n  }\n)\n`)
    add('alternative', `app.get('/api/users', (req, res) => {\n  res.json({ users: [], source: 'fallback' })\n})\n`)
    add('missing', `app.use((req, res) => {\n  res.status(404).json({ error: 'Not Found' })\n})\n`)
    add('error', `app.use((err, req, res, next) => {\n  if (res.headersSent) return next(err)\n  console.error(err.message)\n  res.status(500).json({ error: 'Internal Server Error' })\n})\n`)
    add('', `app.listen(3000, '127.0.0.1', () => {\n  console.log('Demo: http://localhost:3000')\n})`)
    return lines
  }

  const template = document.createElement('template')
  template.innerHTML = `
    <style>
      :host { display:block; font:inherit; color:inherit; --playground-accent:#2563eb; --playground-accent-text:#fff; --playground-border:#bbb; --playground-radius:.5rem; --playground-background:transparent; --playground-error:#b91c1c; --middleware-success:#15803d; --middleware-waiting:#a16207; }
      *, *::before, *::after { box-sizing:border-box; }
      .widget { border:1px solid var(--playground-border); border-radius:var(--playground-radius); padding:clamp(.75rem,2.5vw,1.25rem); background:var(--playground-background); display:grid; gap:1rem; min-width:0; }
      h3,h4,p,pre,ol { margin:0; } h3 { font-size:1.15em; } h4 { font-size:1em; }
      .muted,small { font-size:.85em; opacity:.85; }
      .controls,.columns,.snapshots { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%, 15rem),1fr)); gap:.75rem; min-width:0; }
      .controls label { display:grid; gap:.3rem; font-size:.9em; }
      select,button { font:inherit; color:inherit; background:transparent; border:1px solid var(--playground-border); border-radius:.35rem; padding:.45rem .65rem; min-width:0; }
      select option { color:CanvasText; background:Canvas; }
      button { cursor:pointer; } button:disabled { opacity:.5; cursor:not-allowed; }
      button.primary { background:var(--playground-accent); color:var(--playground-accent-text); border-color:var(--playground-accent); }
      button:focus-visible,select:focus-visible,input:focus-visible { outline:2px solid var(--playground-accent); outline-offset:2px; }
      .actions { display:flex; align-items:center; flex-wrap:wrap; gap:.5rem; }
      .actions .progress { margin-inline-start:auto; }
      .toggle { display:flex; align-items:center; gap:.5rem; font-size:.9em; }
      .panel { border:1px solid var(--playground-border); border-radius:var(--playground-radius); padding:.75rem; min-width:0; display:grid; gap:.6rem; align-content:start; }
      .pipeline { padding:0; list-style:none; display:grid; gap:.3rem; }
      .pipeline li { border:1px solid var(--playground-border); border-radius:.35rem; padding:.5rem; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:.2rem .5rem; align-items:center; }
      .pipeline li small { grid-column:1/-1; overflow-wrap:anywhere; }
      .pipeline li.active { border:2px solid var(--playground-accent); padding:calc(.5rem - 1px); }
      .pipeline li.visited .status { color:var(--middleware-success); }
      .pipeline li.skipped { border-style:dashed; opacity:.7; }
      .status { font-size:.75em; text-align:right; }
      .message { border-inline-start:3px solid var(--playground-accent); padding:.5rem .75rem; overflow-wrap:anywhere; }
      .message.waiting,.message.unhandled { border-color:var(--middleware-waiting); }
      .message.sent { border-color:var(--middleware-success); }
      pre { font: .85em/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; white-space:pre-wrap; overflow-wrap:anywhere; tab-size:2; min-width:0; }
      .code { max-height:28rem; overflow:auto; white-space:pre; border:1px solid var(--playground-border); border-radius:.35rem; padding:.5rem; }
      .line { display:block; min-height:1.5em; width:max-content; min-width:100%; }
      .line.active { background:color-mix(in srgb, var(--playground-accent) 16%, transparent); box-shadow:inset 3px 0 var(--playground-accent); }
      .number { display:inline-block; width:3em; user-select:none; text-align:right; margin-right:.7em; opacity:.6; }
      .logs { max-height:12rem; overflow:auto; padding-inline-start:1.5rem; font-size:.86em; overflow-wrap:anywhere; }
      .logs li + li { margin-top:.3rem; }
      .error { color:var(--playground-error); overflow-wrap:anywhere; }
      [hidden] { display:none!important; }
    </style>
    <div class="widget">
      <h3>Express Middleware Visualizer</h3>
      <p class="muted">Simulazione didattica nel browser: non viene avviato un server Express e non vengono inviate richieste HTTP.</p>
      <div class="controls">
        <label>Versione di Express<select id="version"><option value="4">Express 4</option><option value="5" selected>Express 5</option></select></label>
        <label>Scenario<select id="scenario"></select></label>
      </div>
      <label class="toggle" id="forward-row" hidden><input id="forward" type="checkbox"> Gestisci il rifiuto esplicitamente con try/catch e next(err)</label>
      <div class="actions">
        <button type="button" id="back">Indietro</button>
        <button type="button" id="next" class="primary">Avanti</button>
        <button type="button" id="play">Riproduci</button>
        <button type="button" id="reset">Reset</button>
        <span class="progress muted" id="progress"></span>
      </div>
      <p class="message" id="message" role="status" aria-live="polite"></p>
      <div class="columns">
        <section class="panel"><h4>Pipeline middleware</h4><ol class="pipeline" id="pipeline"></ol><small>Ordine di registrazione semplificato: le route includono i rispettivi middleware. I blocchi non eseguiti sono indicati come saltati quando il flusso termina.</small></section>
        <div class="panel"><h4>Request (req)</h4><pre id="request"></pre><h4>Response (res)</h4><pre id="response"></pre><h4>Errore</h4><p id="error" class="error muted"></p><h4>Registro delle operazioni</h4><ol class="logs" id="logs"></ol></div>
      </div>
      <section class="panel">
        <div class="actions"><h4>Codice Express riproducibile</h4><button type="button" id="copy">Copia codice</button></div>
        <p class="muted" id="code-note">Esempio ESM per Node.js. L'autenticazione è simulata; non utilizzare questo esempio come controllo di accesso reale.</p>
        <pre class="code" id="code" tabindex="0" aria-label="Codice Express"><code></code></pre>
        <p class="muted" id="copy-status" role="status"></p>
      </section>
    </div>`

  class ExpressMiddlewareVisualizer extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true))
      this.$ = id => this.shadowRoot.getElementById(id)
      this.timer = null
      this.index = -1
      for (const [value, label] of Object.entries(scenarios)) {
        const option = document.createElement('option')
        option.value = value
        option.textContent = label
        this.$('scenario').append(option)
      }
      this.nodes = new Map()
      for (const [id, label, subtitle] of stages) {
        const li = document.createElement('li')
        const title = document.createElement('strong')
        title.textContent = label
        const status = document.createElement('span')
        status.className = 'status'
        const small = document.createElement('small')
        small.textContent = subtitle
        li.append(title, status, small)
        this.$('pipeline').append(li)
        this.nodes.set(id, { li, status, small })
      }
      for (const id of ['version', 'scenario', 'forward']) this.$(id).addEventListener('change', () => this.reset())
      this.$('next').addEventListener('click', () => { this.stop(); this.advance() })
      this.$('back').addEventListener('click', () => { this.stop(); this.index = Math.max(-1, this.index - 1); this.render() })
      this.$('reset').addEventListener('click', () => this.reset())
      this.$('play').addEventListener('click', () => this.play())
      this.$('copy').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(this.lines.map(line => line.text).join('\n'))
          this.$('copy-status').textContent = 'Codice copiato.'
        } catch {
          this.$('copy-status').textContent = 'Copia automatica non disponibile: seleziona e copia il codice manualmente.'
        }
      })
      this.reset()
    }
    disconnectedCallback() { this.stop() }
    stop() {
      if (this.timer !== null) clearInterval(this.timer)
      this.timer = null
      this.$('play').textContent = 'Riproduci'
    }
    reset() {
      this.stop()
      this.index = -1
      this.scenario = this.$('scenario').value
      this.version = this.$('version').value
      this.forward = this.scenario === 'async' && this.$('forward').checked
      this.$('forward-row').hidden = this.scenario !== 'async'
      this.steps = trace(this.scenario, this.version, this.forward)
      this.lines = source(this.scenario, this.version, this.forward)
      this.$('copy-status').textContent = ''
      this.nodes.get('request').small.textContent = `GET ${pathFor(this.scenario)}`
      this.$('code-note').textContent = this.scenario === 'async' && this.version === '4' && !this.forward ? 'Attenzione: il codice contiene deliberatamente un rifiuto non gestito. Eseguilo soltanto in un processo locale isolato: Node.js potrebbe terminare. Attiva la gestione esplicita per correggerlo.' : 'Esempio ESM per Node.js. Autenticazione e dati sono simulati; non usare questo esempio come controllo di accesso reale.'
      const code = this.$('code').querySelector('code')
      const fragment = document.createDocumentFragment()
      this.lineNodes = this.lines.map((line, index) => {
        const span = document.createElement('span')
        span.className = 'line'
        const number = document.createElement('span')
        number.className = 'number'
        number.setAttribute('aria-hidden', 'true')
        number.textContent = index + 1
        span.append(number, document.createTextNode(line.text + '\n'))
        fragment.append(span)
        return span
      })
      code.replaceChildren(fragment)
      this.$('code').scrollTop = 0
      this.render()
    }
    advance() {
      if (this.index < this.steps.length - 1) this.index++
      if (this.index === this.steps.length - 1) this.stop()
      this.render()
    }
    play() {
      if (this.timer !== null) { this.stop(); this.render(); return }
      if (this.index === this.steps.length - 1) return
      this.advance()
      if (this.index < this.steps.length - 1) {
        this.timer = setInterval(() => this.advance(), 750)
        this.$('play').textContent = 'Pausa'
      }
    }
    render() {
      const current = this.steps[this.index]
      const done = this.index === this.steps.length - 1
      const executed = this.steps.slice(0, this.index + 1)
      const visited = new Set(executed.map(step => step.id))
      for (const [id, { li, status }] of this.nodes) {
        const active = current?.id === id
        const skipped = done && !visited.has(id)
        li.className = active ? 'active' : visited.has(id) ? 'visited' : skipped ? 'skipped' : ''
        if (active) li.setAttribute('aria-current', 'step')
        else li.removeAttribute('aria-current')
        status.textContent = active ? 'Corrente' : visited.has(id) ? 'Eseguito' : skipped ? 'Non eseguito' : 'In attesa'
      }
      const req = { method: 'GET', path: pathFor(this.scenario) }
      let response = null
      let error = null
      for (const step of executed) {
        Object.assign(req, step.req || {})
        if (step.response) response = step.response
        if (step.error) error = step.error
      }
      this.$('request').textContent = this.index < 0 ? '—' : format(req)
      this.$('response').textContent = response ? format({ ...response, headersSent: true }) : current?.terminal === 'unhandled' ? 'Non garantita (rifiuto non gestito)' : current?.terminal === 'waiting' ? 'Nessuna risposta: richiesta in attesa' : 'Non ancora inviata'
      this.$('error').textContent = error || 'Nessun errore osservato.'
      this.$('message').textContent = current?.message || 'Premi Avanti o Riproduci per iniziare.'
      this.$('message').className = `message ${current?.terminal || ''}`
      this.$('progress').textContent = `${this.index + 1} / ${this.steps.length}`
      this.$('back').disabled = this.index < 0
      this.$('next').disabled = done
      this.$('play').disabled = done
      const logs = document.createDocumentFragment()
      for (const step of executed) {
        const li = document.createElement('li')
        li.textContent = step.message
        logs.append(li)
      }
      this.$('logs').replaceChildren(logs)
      let first = null
      this.lineNodes.forEach((node, i) => {
        const active = Boolean(current && this.lines[i].id === current.id)
        node.classList.toggle('active', active)
        if (active && !first) first = node
      })
      // Scroll only the code panel, never the surrounding article.
      if (first) {
        const pre = this.$('code')
        pre.scrollTop += first.getBoundingClientRect().top - pre.getBoundingClientRect().top - 8
      }
    }
  }
  customElements.define(TAG, ExpressMiddlewareVisualizer)
})()
