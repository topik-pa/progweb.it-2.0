(() => {
  'use strict'
  const TAG = 'node-error-handling-visualizer'
  if (customElements.get(TAG)) return

  const modes = {
    sync: ['Synchronous Errors', 'try...catch intercetta le eccezioni nella stessa catena di chiamate sincrone.', 'try...catch'],
    callback: ['Error-first Callbacks', 'Un errore passato come primo argomento non è un’eccezione lanciata automaticamente.', 'Controllo di err nella callback'],
    timer: ['Asynchronous Exceptions', 'Un try...catch esterno non intercetta un throw eseguito successivamente da un timer.', 'try...catch dentro il timer'],
    promise: ['Promise Rejection', 'Il rifiuto si propaga nella catena fino a un gestore del rifiuto.', '.catch()'],
    await: ['Async/Await', 'await trasforma il rifiuto in un’eccezione nel contesto della funzione asincrona.', 'try...catch attorno ad await'],
    emitter: ['EventEmitter Errors', 'Un evento error senza listener causa un throw sincrono in emit().', "Listener 'error'"],
    stream: ['Stream Errors', 'pipeline() coordina la terminazione degli stream coinvolti e, nella variante Promise, rifiuta in caso di errore.', 'try...catch attorno a pipeline()'],
    cause: ['Error Cause', 'Error.cause conserva il riferimento all’errore originale, ma non intercetta le eccezioni.', 'try...catch esterno']
  }
  const format = value => JSON.stringify(value, null, 2)

  function build(mode, handled) {
    const lines = [], steps = []
    const add = (id, text) => text.split('\n').forEach(text => lines.push({ id, text }))
    const step = (id, title, message, patch = {}) => steps.push({ id, title, message, ...patch })
    const error = { name: 'Error', message: 'Operazione fallita', code: 'EDEMO' }
    const cause = { name: 'Error', message: 'Configurazione non disponibile', code: 'ECONFIG', cause: error }
    const failCode = "const error = Object.assign(new Error('Operazione fallita'), { code: 'EDEMO' })"
    const logError = 'console.error(error.code, error.message)'
    const continuation = "console.log('Continua')"
    const rejected = ['promise', 'await', 'stream'].includes(mode)
    const finish = (id = 'end', text = 'Il controllo raggiunge il codice successivo. Il processo non viene terminato dall’errore.') => step(id, 'Il processo può continuare', text, { terminal: 'handled' })
    const fatal = () => {
      if (rejected) step('unhandled', 'Rifiuto non gestito', 'Il rifiuto rimane privo di gestore oltre il turno dell’event loop; con la modalità throw e senza listener unhandledRejection viene sollevato come eccezione non intercettata.')
      step('fatal', 'Eccezione non intercettata', 'Node.js stampa lo stack trace su stderr e termina con codice 1, nelle condizioni indicate.', { terminal: 'fatal' })
    }
    const capture = (message = 'Il gestore intercetta l’errore e ne registra il codice e il messaggio.') => step('handle', 'Gestione dell’errore', message)
    add('', '// Salva come demo.mjs ed esegui in un processo Node.js isolato.\n// node --unhandled-rejections=throw demo.mjs\n// Esempio didattico: errore intenzionale, nessun gestore globale.\n')
    step('start', 'Avvio', 'Inizia l’esperimento. L’errore è intenzionale.')
    if (mode === 'sync') {
      add('start', 'function readConfiguration() {')
      add('error', `  ${failCode}\n  throw error`)
      add('', '}\n')
      if (handled) {
        add('call', 'try {\n  readConfiguration()')
        add('handle', `} catch (error) {\n  ${logError}`)
        add('cleanup', "} finally {\n  console.log('Finally')\n}")
      } else add('call', 'readConfiguration()')
      add('end', continuation)
      step('call', 'Chiamata sincrona', 'readConfiguration() entra nello stack della chiamata corrente.')
      step('error', 'throw', 'Viene lanciato un oggetto Error.', { error })
      step('propagate', 'Risalita dello stack', 'Il codice successivo nella funzione non viene eseguito.')
      if (handled) { capture(); step('cleanup', 'finally', 'Il blocco finally viene eseguito prima di proseguire.'); finish() } else fatal()
    } else if (mode === 'callback') {
      add('start', 'function readConfiguration(callback) {')
      add('schedule', '  setImmediate(() => {')
      add('error', `    ${failCode}\n    callback(error)`) 
      add('', '  })\n}\n')
      add('call', 'readConfiguration((err, data) => {')
      if (handled) add('handle', "  if (err) {\n    console.error(err.code, err.message)\n    return\n  }")
      add(handled ? 'success' : 'ignored', "  console.log('Dati:', data)\n})")
      add('end', continuation)
      step('call', 'Registrazione della callback', 'readConfiguration riceve una callback error-first.')
      step('schedule', 'Operazione differita', 'setImmediate programma l’invocazione della callback.')
      step('end', 'Il chiamante prosegue', 'Il log Continua viene eseguito prima della callback.')
      step('error', 'callback(error)', 'L’errore è passato come argomento; data è undefined.', { error })
      if (handled) { capture('La callback verifica err e termina con return, saltando il percorso di successo.'); finish('handle', 'La callback termina. Nessuna eccezione non gestita.') }
      else step('ignored', 'Errore ignorato', 'La callback stampa Dati: undefined. L’operazione è fallita, ma il processo non termina per il solo fatto di aver ignorato err.', { terminal: 'ignored' })
    } else if (mode === 'timer') {
      if (handled) {
        add('schedule', 'setTimeout(() => {\n  try {')
        add('error', `    ${failCode}\n    throw error`)
        add('handle', `  } catch (error) {\n    ${logError}\n  }`)
        add('end', `  ${continuation}\n}, 0)`)
      } else {
        add('schedule', 'try {\n  setTimeout(() => {')
        add('error', `    ${failCode}\n    throw error\n  }, 0)`)
        add('handle', `} catch (error) {\n  ${logError}\n}`)
        add('caller', "console.log('Timer registrato')")
      }
      step('schedule', 'Registrazione del timer', 'setTimeout registra la callback e restituisce il controllo.')
      step('caller', 'Stack iniziale concluso', handled ? 'Il chiamante termina; il timer verrà eseguito in seguito.' : 'Il try esterno termina prima della callback; viene stampato Timer registrato.')
      step('error', 'Eccezione nella callback', 'Il timer esegue throw su un nuovo stack di chiamate.', { error })
      if (handled) { capture('Il try...catch interno alla callback intercetta l’eccezione.'); finish() }
      else { step('propagate', 'catch esterno non raggiunto', 'Lo stack della chiamata a setTimeout non è più attivo.'); fatal() }
    } else if (mode === 'promise') {
      add('start', 'function readConfiguration() {')
      add('error', `  ${failCode}\n  return Promise.reject(error)\n}\n`)
      add('call', 'const result = readConfiguration()')
      add('propagate', "  .then(data => console.log('Dati:', data))")
      if (handled) add('handle', `  .catch(error => {\n    ${logError}\n  })`)
      add('end', handled ? `await result\n${continuation}` : "console.log('Catena avviata')")
      step('call', 'Creazione della Promise', 'La funzione restituisce una Promise.')
      step('error', 'Promise rejected', 'La Promise viene rifiutata con un Error.', { error })
      if (!handled) step('end', 'Catena avviata', 'Il codice sincrono prosegue prima dell’esecuzione delle reazioni della Promise.')
      step('propagate', 'Propagazione nella catena', 'La callback di successo di then viene saltata; la Promise risultante è rejected.')
      if (handled) { capture('catch() registra l’errore e restituisce implicitamente undefined. La Promise risultante è fulfilled.'); finish() }
      else fatal()
    } else if (mode === 'await') {
      add('start', 'async function readConfiguration() {')
      add('error', `  ${failCode}\n  throw error\n}\n`)
      add('start', 'async function main() {')
      if (handled) {
        add('call', '  try {\n    const data = await readConfiguration()\n    console.log(data)')
        add('handle', `  } catch (error) {\n    ${logError}\n  }`)
        add('end', `  ${continuation}`)
      } else add('call', '  const data = await readConfiguration()\n  console.log(data)')
      add('', '}')
      add('launch', handled ? 'await main()' : "main()\nconsole.log('main avviata')")
      step('launch', 'Avvio di main()', 'La funzione asincrona viene invocata.')
      step('call', 'await', 'main invoca readConfiguration() e attende il risultato.')
      step('error', 'Promise rejected', 'Il throw nella funzione async rifiuta la Promise restituita.', { error })
      step('propagate', 'Ripresa di await', 'await riprende sollevando il motivo del rifiuto nel contesto di main.')
      if (handled) { capture(); finish() } else { step('unhandledMain', 'main() rejected', 'L’eccezione non intercettata rifiuta anche la Promise restituita da main().'); fatal() }
    } else if (mode === 'emitter') {
      add('start', "import { EventEmitter } from 'node:events'\n\nconst emitter = new EventEmitter()")
      if (handled) {
        add('register', "emitter.on('error', error => {")
        add('handle', `  ${logError}`)
        add('', '})')
      }
      add('error', `${failCode}\nemitter.emit('error', error)`)
      add('end', continuation)
      step('register', handled ? 'Listener registrato' : 'Nessun listener', handled ? 'Il listener error è registrato prima di emit().' : 'Non è registrato alcun listener per error.')
      step('error', "emit('error')", 'L’emitter emette l’evento speciale error.', { error })
      if (handled) { capture('Il listener è invocato sincronicamente da emit() e registra l’errore.'); finish() }
      else { step('propagate', 'throw sincrono', 'EventEmitter lancia l’errore: un try...catch attorno a emit() potrebbe intercettarlo, ma qui non è presente.'); fatal() }
    } else if (mode === 'stream') {
      add('start', "import { Readable, Writable } from 'node:stream'\nimport { pipeline } from 'node:stream/promises'\n\nconst source = Readable.from(['demo'])\nconst destination = new Writable({")
      add('error', `  write(chunk, encoding, callback) {\n    ${failCode}\n    callback(error)\n  }\n})\n`)
      add('start', 'async function main() {')
      if (handled) {
        add('call', '  try {\n    await pipeline(source, destination)')
        add('handle', `  } catch (error) {\n    ${logError}\n  }`)
        add('end', `  ${continuation}`)
      } else add('call', '  await pipeline(source, destination)')
      add('', '}')
      add('launch', handled ? 'await main()' : 'main()')
      step('launch', 'Avvio di main()', 'Gli stream sono creati in memoria, senza file o rete.')
      step('call', 'pipeline()', 'La pipeline trasferisce il chunk dal Readable al Writable.')
      step('error', 'Errore di scrittura', 'La callback di write segnala l’errore.', { error })
      step('propagate', 'Terminazione della pipeline', 'pipeline() coordina la distruzione degli stream non già terminati e rifiuta la Promise.')
      if (handled) { capture(); finish() } else { step('unhandledMain', 'main() rejected', 'Il rifiuto di pipeline si propaga alla Promise di main.'); fatal() }
    } else {
      add('start', 'function loadConfiguration() {\n  try {')
      add('error', `    ${failCode}\n    throw error`)
      add('wrap', "  } catch (error) {\n    throw Object.assign(\n      new Error('Configurazione non disponibile', { cause: error }),\n      { code: 'ECONFIG' }\n    )\n  }\n}\n")
      if (handled) {
        add('call', 'try {\n  loadConfiguration()')
        add('handle', `} catch (error) {\n  ${logError}\n  console.error('Cause:', error.cause.code, error.cause.message)\n}`)
      } else add('call', 'loadConfiguration()')
      add('end', continuation)
      step('call', 'Chiamata di loadConfiguration()', 'La funzione avvia l’operazione.')
      step('error', 'Errore originale', 'Il livello interno genera EDEMO.', { error })
      step('wrap', 'Wrapping con Error.cause', 'Il catch interno lancia un nuovo Error con un contesto più significativo, conservando l’errore precedente in cause.', { error: cause })
      if (handled) { capture('Il catch esterno può leggere sia l’errore di alto livello sia error.cause.'); finish() } else fatal()
    }
    return { lines, steps, code: lines.map(line => line.text).join('\n') + '\n' }
  }

  const template = document.createElement('template')
  template.innerHTML = `
    <style>
      :host { display:block; color:inherit; font:inherit; --accent:var(--playground-accent,#2563eb); --border:var(--playground-border,#aaa); --radius:var(--playground-radius,.5rem); --error:var(--playground-error,#b91c1c); --ok:var(--node-error-handled,#15803d); --warning:var(--node-error-warning,#a16207) }
      * { box-sizing:border-box }
      .widget { border:1px solid var(--border); border-radius:var(--radius); padding:clamp(.65rem,2vw,1.25rem); background:var(--playground-background,transparent); min-width:0; display:grid; gap:1rem }
      h3,h4,p { margin:0; line-height:1.5 } h3 { font-size:1.1em } h4 { font-size:1em }
      .muted { font-size:.85em; opacity:.85 }
      .row { display:flex; flex-wrap:wrap; align-items:center; gap:.5rem }
      .spread { justify-content:space-between }
      label { display:grid; gap:.35rem; font-size:.9em }
      label.check { display:flex; align-items:center; flex-wrap:wrap; gap:.5rem }
      textarea { width:100%; min-height:8rem; font: .8em/1.5 monospace; color:inherit; background:transparent; border:1px solid var(--border); border-radius:var(--radius); padding:.5rem }
      select,button { font:inherit; color:inherit; border:1px solid var(--border); background:transparent; border-radius:var(--radius); padding:.5rem .7rem; min-width:0; max-width:100% }
      select { width:100%; background:Canvas; color:CanvasText }
      button { cursor:pointer; font-size:.9em } button.primary { background:var(--accent); color:var(--playground-accent-text,#fff); border-color:var(--accent) }
      button:disabled { opacity:.45; cursor:not-allowed } button:focus-visible,select:focus-visible,input:focus-visible { outline:2px solid var(--accent); outline-offset:2px }
      .layout { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:1rem; align-items:start }
      .panel { border:1px solid var(--border); border-radius:var(--radius); padding:.75rem; min-width:0; display:grid; gap:.65rem }
      .flow { list-style:none; padding:0; margin:0; display:grid; gap:.45rem }
      .flow li { border:1px solid var(--border); border-left:3px solid var(--border); border-radius:var(--radius); padding:.5rem; overflow-wrap:anywhere; display:grid; gap:.2rem }
      .flow li.future { opacity:.65 } .flow li.current { border-color:var(--accent); border-left-width:4px; background:color-mix(in srgb,var(--accent) 8%,transparent) }
      .flow li.visited { border-left-color:var(--ok) } .flow li.failure { border-left-color:var(--error) } .flow li.ignored { border-left-color:var(--warning) }
      .flow .status { font-size:.75em; opacity:.85 } .flow strong { font-size:.9em }
      .message { border-left:4px solid var(--accent); padding:.7rem; background:color-mix(in srgb,currentColor 5%,transparent); overflow-wrap:anywhere }
      .message.fatal { border-color:var(--error) } .message.handled { border-color:var(--ok) } .message.ignored { border-color:var(--warning) }
      pre { margin:0; padding:.6rem; border-radius:var(--radius); background:color-mix(in srgb,currentColor 5%,transparent); font: .8em/1.55 ui-monospace,SFMono-Regular,Consolas,monospace; overflow:auto; max-width:100%; tab-size:2 }
      pre.error { white-space:pre-wrap; overflow-wrap:anywhere } pre.code { max-height:24rem } pre.code .line { display:block; min-height:1.55em; white-space:pre; width:max-content; min-width:100% } .line.active { background:color-mix(in srgb,var(--accent) 17%,transparent) } .number { display:inline-block; width:2.5em; user-select:none; opacity:.65 }
      .log { margin:0; padding-left:1.5rem; max-height:15rem; overflow:auto; font-size:.85em; overflow-wrap:anywhere } .log li+li { margin-top:.3rem }
      @media(max-width:650px) { .layout { grid-template-columns:minmax(0,1fr) } }
    </style>
    <div class="widget">
      <div class="row spread"><h3>Node.js Error Handling Visualizer</h3><button id="reset" type="button">Reset</button></div>
      <p class="muted">Simulazione locale del runtime Node.js. Gli esempi prevedono un errore intenzionale; nessun server viene avviato.</p>
      <label>Scenario<select id="mode"></select></label>
      <label class="check"><input id="handled" type="checkbox" checked><span id="handler-label"></span></label>
      <p id="description"></p>
      <div class="row" aria-label="Controlli di esecuzione"><button id="back" type="button">Indietro</button><button class="primary" id="next" type="button">Avanti</button><button id="play" type="button">Riproduci</button><span id="progress" class="muted"></span></div>
      <div class="message" id="message" role="status"><strong id="process"></strong><p id="detail"></p></div>
      <div class="layout">
        <div class="panel"><h4>Flusso di esecuzione</h4><ol id="flow" class="flow"></ol></div>
        <div class="panel"><div class="row spread"><h4>Codice Node.js</h4><button id="copy" type="button">Copia codice</button></div><pre class="code" id="code" tabindex="0" aria-label="Codice sorgente"><code id="source"></code></pre><p id="copy-status" role="status" class="muted"></p><textarea id="copy-buffer" aria-label="Codice da copiare manualmente" readonly hidden></textarea><h4>Oggetto Error osservato</h4><pre class="error" id="error">—</pre></div>
      </div>
      <div class="panel"><h4>Registro delle operazioni</h4><ol id="log" class="log"></ol></div>
      <p class="muted">Ipotesi: Node.js moderno, modalità --unhandled-rejections=throw, nessun listener globale uncaughtException o unhandledRejection e nessuna configurazione speciale. Stato e oggetto Error sono rappresentazioni didattiche; i passi non corrispondono a un debugger. I processi terminati sono soltanto simulati.</p>
    </div>`

  class NodeErrorHandlingVisualizer extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true))
      this.$ = id => this.shadowRoot.getElementById(id)
      this.timer = null
      for (const [value, [label]] of Object.entries(modes)) {
        const option = document.createElement('option')
        option.value = value
        option.textContent = label
        this.$('mode').append(option)
      }
      this.$('mode').addEventListener('change', () => this.initialize())
      this.$('handled').addEventListener('change', () => this.initialize())
      this.$('reset').addEventListener('click', () => this.initialize())
      this.$('next').addEventListener('click', () => { this.stop(); this.advance() })
      this.$('back').addEventListener('click', () => { this.stop(); this.index = Math.max(0, this.index - 1); this.render() })
      this.$('play').addEventListener('click', () => this.play())
      this.$('copy').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(this.model.code)
          this.$('copy-status').textContent = 'Codice copiato.'
        } catch {
          const buffer = this.$('copy-buffer')
          buffer.value = this.model.code
          buffer.hidden = false
          buffer.focus()
          buffer.select()
          this.$('copy-status').textContent = 'Copia automatica non disponibile. Seleziona il codice e copialo manualmente.'
        }
      })
      this.initialize()
    }
    connectedCallback() { this.dataset.version = '1.0.0' }
    disconnectedCallback() { this.stop() }
    stop() {
      if (this.timer !== null) clearInterval(this.timer)
      this.timer = null
      this.$('play').textContent = 'Riproduci'
    }
    initialize() {
      this.stop()
      const mode = this.$('mode').value
      const handled = this.$('handled').checked
      this.model = build(mode, handled)
      this.index = 0
      this.$('handler-label').textContent = modes[mode][2]
      this.$('description').textContent = modes[mode][1]
      this.$('copy-status').textContent = ''
      this.$('copy-buffer').hidden = true
      this.$('copy-buffer').value = ''
      this.lineNodes = this.model.lines.map((line, i) => {
        const span = document.createElement('span')
        span.className = 'line'
        const number = document.createElement('span')
        number.className = 'number'
        number.setAttribute('aria-hidden', 'true')
        number.textContent = i + 1
        span.append(number, document.createTextNode(line.text))
        return span
      })
      this.$('source').replaceChildren(...this.lineNodes)
      this.$('code').scrollTop = 0
      this.render()
    }
    advance() {
      this.index = Math.min(this.index + 1, this.model.steps.length - 1)
      if (this.index === this.model.steps.length - 1) this.stop()
      this.render()
    }
    play() {
      if (this.timer !== null) { this.stop(); return }
      this.advance()
      if (this.index < this.model.steps.length - 1) {
        this.timer = setInterval(() => this.advance(), 850)
        this.$('play').textContent = 'Pausa'
      }
    }
    render() {
      const { steps, lines } = this.model
      const current = steps[this.index]
      const past = steps.slice(0, this.index + 1)
      const done = this.index === steps.length - 1
      const error = past.reduce((value, step) => step.error || value, null)
      this.$('error').textContent = error ? format(error) : 'Nessun errore osservato.'
      this.$('process').textContent = current.terminal === 'fatal' ? 'Processo terminato (exit code 1)' : current.terminal === 'ignored' ? 'Errore ignorato — nessun crash automatico' : current.terminal === 'handled' ? 'Errore gestito — nessun crash dovuto all’errore' : 'In esecuzione'
      this.$('message').className = `message ${current.terminal || ''}`
      this.$('detail').textContent = current.message
      this.$('progress').textContent = `${this.index + 1} / ${steps.length}`
      this.$('back').disabled = this.index === 0
      this.$('next').disabled = done
      this.$('play').disabled = done
      this.$('flow').replaceChildren(...steps.map((step, i) => {
        const li = document.createElement('li')
        li.className = `${i === this.index ? 'current' : i < this.index ? 'visited' : 'future'} ${i <= this.index && (step.error || step.terminal === 'fatal') ? 'failure' : ''} ${i <= this.index && step.terminal === 'ignored' ? 'ignored' : ''}`
        if (i === this.index) li.setAttribute('aria-current', 'step')
        const title = document.createElement('strong')
        title.textContent = `${i + 1}. ${step.title}`
        const status = document.createElement('span')
        status.className = 'status'
        status.textContent = i === this.index ? 'Corrente' : i < this.index ? 'Eseguito' : 'Da eseguire'
        li.append(title, status)
        return li
      }))
      this.$('log').replaceChildren(...past.map(step => {
        const li = document.createElement('li')
        li.textContent = `${step.title}: ${step.message}`
        return li
      }))
      let first = null
      this.lineNodes.forEach((node, i) => {
        const active = lines[i].id === current.id
        node.classList.toggle('active', active)
        if (active && !first) first = node
      })
      if (first) {
        const pre = this.$('code')
        pre.scrollTop += first.getBoundingClientRect().top - pre.getBoundingClientRect().top - 8
      }
    }
  }
  customElements.define(TAG, NodeErrorHandlingVisualizer)
})()
