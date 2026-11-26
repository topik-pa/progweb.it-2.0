(() => {
  'use strict'

  const tag = 'dialog-playground'
  if (customElements.get(tag)) return

  const template = document.createElement('template')
  template.innerHTML = `
    <style>
      :host {
        display: block;
        min-width: 0;
        margin-block: 2rem;
        color: inherit;
        font: inherit;
        font-size: .875rem;
      }
      *, *::before, *::after { box-sizing: border-box; }
      [hidden] { display: none !important; }
      .playground {
        padding: 1rem;
        border: 1px solid var(--playground-border, #aaa);
        border-radius: var(--playground-radius, .5rem);
        background: var(--playground-background, transparent);
      }
      .toolbar, .actions, .range-label {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: .5rem;
      }
      .toolbar, .range-label { justify-content: space-between; }
      .title { margin: 0; font-size: 1.125rem; font-weight: 600; }
      .controls {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
        gap: 1rem;
        margin-block: 1rem;
      }
      label { display: grid; gap: .35rem; }
      .check { display: flex; align-items: center; gap: .5rem; }
      select, button, input[type=text] {
        font: inherit;
        color: inherit;
        background: transparent;
        border: 1px solid var(--playground-border, #aaa);
        border-radius: .25rem;
        padding: .5rem .75rem;
      }
      select, input[type=text], input[type=range] { width: 100%; min-width: 0; }
      input { accent-color: var(--playground-accent, #2563eb); }
      button { cursor: pointer; }
      button:disabled { cursor: not-allowed; opacity: .55; }
      button:not(:disabled):hover { background: rgb(128 128 128 / 12%); }
      :focus-visible { outline: 2px solid var(--playground-accent, #2563eb); outline-offset: 2px; }
      .stage {
        padding: .75rem;
        margin-block: 1rem;
        border: 1px dashed var(--playground-border, #aaa);
        border-radius: .25rem;
      }
      .stage p, dialog p { line-height: 1.5; }
      dialog {
        color: var(--dialog-color, CanvasText);
        background: var(--dialog-background, Canvas);
        border: 1px solid var(--playground-border, #aaa);
        border-radius: var(--playground-radius, .5rem);
        padding: 1.25rem;
        inline-size: min(28rem, calc(100% - 2rem));
        max-block-size: calc(100% - 2rem);
        overflow: auto;
        box-shadow: 0 8px 32px rgb(0 0 0 / 18%);
      }
      dialog[open]:not(:modal) { position: static; margin: 1rem auto 0; max-inline-size: 100%; }
      dialog::backdrop { background: rgb(0 0 0 / var(--backdrop-opacity, .45)); }
      dialog h2 { margin: 0 0 .75rem; font-size: 1.125rem; }
      dialog .actions { margin-block-start: 1rem; }
      .state { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr)); gap: .5rem; }
      .state > div { padding: .6rem; border: 1px solid var(--playground-border, #aaa); border-radius: .25rem; }
      dt { font-size: .8rem; }
      dd { margin: .25rem 0 0; overflow-wrap: anywhere; font-family: monospace; }
      .log { margin: .75rem 0; padding-inline-start: 1.75rem; max-height: 12rem; overflow: auto; }
      .log li { padding-block: .2rem; overflow-wrap: anywhere; font-family: monospace; }
      .status { margin-block: .5rem 0; min-height: 1.5em; }
      .hint { font-size: .8rem; }
      pre { padding: .75rem; overflow: auto; background: rgb(128 128 128 / 10%); border-radius: .25rem; font-size: .8rem; }
      code { font-family: monospace; }
    </style>
    <div class="playground">
      <div class="toolbar">
        <p class="title">HTML Dialog Playground</p>
        <button type="button" data-action="reset">Reset</button>
      </div>
      <p class="hint" data-unsupported hidden>Il browser non supporta le API native di HTML dialog.</p>
      <div class="controls">
        <label>
          Focus iniziale (autofocus)
          <select name="focus">
            <option value="field">Campo di testo</option>
            <option value="dismiss">Pulsante Chiudi</option>
          </select>
        </label>
        <label>
          <span class="range-label">Opacità backdrop <output for="opacity">45%</output></span>
          <input id="opacity" name="opacity" type="range" min="0" max="90" step="5" value="45">
        </label>
        <label class="check">
          <input type="checkbox" name="preventCancel">
          Impedisci la chiusura tramite cancel
        </label>
      </div>
      <div class="actions">
        <button type="button" data-action="show">Apri con show()</button>
        <button type="button" data-action="modal">Apri con showModal()</button>
      </div>
      <div class="stage">
        <p>Prova a interagire con questo pulsante quando il dialog è aperto.</p>
        <button type="button" data-action="outside">Pulsante esterno: <span data-count>0</span></button>
        <dialog aria-labelledby="dialog-title" aria-describedby="dialog-description">
          <h2 id="dialog-title">Finestra di dialogo</h2>
          <p id="dialog-description"></p>
          <form method="dialog">
            <label>Campo di testo
              <input type="text" name="demoText" placeholder="Test del focus" autocomplete="off" autofocus>
            </label>
            <div class="actions">
              <button type="submit" value="confirm">Conferma (method="dialog")</button>
              <button type="button" data-action="request">requestClose()</button>
              <button type="button" data-action="close">Chiudi con close()</button>
            </div>
          </form>
          <p class="hint" data-dialog-hint></p>
        </dialog>
      </div>
      <dl class="state">
        <div><dt>dialog.open</dt><dd data-state="open">false</dd></div>
        <div><dt>Modalità</dt><dd data-state="mode">chiuso</dd></div>
        <div><dt>returnValue</dt><dd data-state="return">""</dd></div>
        <div><dt>Focus all'apertura</dt><dd data-state="focus">—</dd></div>
      </dl>
      <div class="toolbar">
        <strong>Registro eventi e operazioni</strong>
        <button type="button" data-action="clear">Svuota</button>
      </div>
      <ol class="log" aria-label="Registro eventi" aria-live="polite" aria-relevant="additions"></ol>
      <div class="toolbar">
        <strong>Esempio HTML e JavaScript</strong>
        <button type="button" data-action="copy">Copia esempio</button>
      </div>
      <pre><code></code></pre>
      <p class="status" role="status"></p>
    </div>
  `

  class DialogPlayground extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true))
      this.$ = selector => this.shadowRoot.querySelector(selector)
      this.dialog = this.$('dialog')
      this.form = this.$('form')
      this.mode = 'modal'
      this.count = 0
      this.ignoreCloseEvents = 0
      this.initialFocus = '—'
      this.supported = typeof this.dialog.showModal === 'function' && typeof this.dialog.show === 'function'
      this.requestSupported = typeof this.dialog.requestClose === 'function'
      this.$('[data-action="request"]').disabled = !this.requestSupported
      if (!this.supported) this.$('[data-unsupported]').hidden = false

      this.shadowRoot.addEventListener('click', event => {
        const action = event.target.closest('button[data-action]')?.dataset.action
        switch (action) {
          case 'show': this.open('non-modal'); break
          case 'modal': this.open('modal'); break
          case 'close': this.close(); break
          case 'request': this.requestClose(); break
          case 'outside':
            this.$('[data-count]').textContent = String(++this.count)
            this.log('Interazione con il pulsante esterno')
            break
          case 'clear': this.clearLog(); break
          case 'reset': this.reset(); break
          case 'copy': this.copy(); break
        }
      })
      this.shadowRoot.addEventListener('input', event => {
        if (event.target.matches('[name="opacity"], [name="focus"], [name="preventCancel"]')) this.update()
      })
      this.dialog.addEventListener('cancel', event => {
        if (this.$('[name="preventCancel"]').checked) event.preventDefault()
        this.log('Evento cancel — ' + (event.defaultPrevented ? 'chiusura annullata' : 'chiusura consentita'))
      })
      this.dialog.addEventListener('close', () => {
        if (this.ignoreCloseEvents) {
          this.ignoreCloseEvents--
          return
        }
        this.log('Evento close — returnValue: ' + JSON.stringify(this.dialog.returnValue))
        this.update()
      })
      this.form.addEventListener('submit', () => this.log('Evento submit — method="dialog"'))
    }

    connectedCallback() { this.update() }
    disconnectedCallback() {
      if (this.dialog.open) {
        this.ignoreCloseEvents++
        this.dialog.close()
      }
    }

    log(message) {
      const li = document.createElement('li')
      li.textContent = message
      const list = this.$('.log')
      list.append(li)
      while (list.children.length > 50) list.firstElementChild.remove()
      list.scrollTop = list.scrollHeight
    }

    clearLog() {
      this.$('.log').replaceChildren()
    }

    open(mode) {
      if (!this.supported) return
      if (this.dialog.open) {
        this.$('.status').textContent = 'Chiudi il dialog prima di cambiare modalità.'
        return
      }
      this.$('.status').textContent = ''
      this.mode = mode
      this.dialog.returnValue = ''
      this.form.reset()
      const field = this.$('[name="demoText"]')
      const dismiss = this.$('[data-action="close"]')
      const focusField = this.$('[name="focus"]').value === 'field'
      field.toggleAttribute('autofocus', focusField)
      dismiss.toggleAttribute('autofocus', !focusField)
      this.$('#dialog-description').textContent = mode === 'modal'
        ? 'Dialog modale: il resto del documento non è interattivo. Prova Tab oppure Esc.'
        : 'Dialog non modale: puoi interagire anche con il resto del documento.'
      this.$('[data-dialog-hint]').textContent = this.requestSupported
        ? 'Confronta requestClose(), close() e la conferma tramite form. Il pulsante Chiudi funziona anche se cancel è bloccato.'
        : 'requestClose() non è disponibile in questo browser. Puoi comunque chiudere con close() o tramite il form.'
      this.log(mode === 'modal' ? 'Chiamata showModal()' : 'Chiamata show()')
      try {
        if (mode === 'modal') this.dialog.showModal()
        else this.dialog.show()
        const focused = this.shadowRoot.activeElement
        this.initialFocus = focused === field ? 'Campo di testo' : focused === dismiss ? 'Pulsante Chiudi' : (focused?.localName || '—')
        this.log('Focus iniziale: ' + this.initialFocus)
      } catch (error) {
        this.$('.status').textContent = error.message
        this.log('Errore: ' + error.message)
      }
      this.update()
    }

    close() {
      if (!this.dialog.open) return
      this.log('Chiamata close("dismiss")')
      this.dialog.close('dismiss')
      this.update()
    }

    requestClose() {
      if (!this.dialog.open || !this.requestSupported) return
      this.log('Chiamata requestClose("requested")')
      this.dialog.requestClose('requested')
      this.update()
    }

    update() {
      const opacity = Number(this.$('[name="opacity"]').value)
      this.$('output').value = `${opacity}%`
      this.dialog.style.setProperty('--backdrop-opacity', String(opacity / 100))
      this.$('[data-state="open"]').textContent = String(this.dialog.open)
      this.$('[data-state="mode"]').textContent = this.dialog.open ? (this.mode === 'modal' ? 'modale' : 'non modale') : 'chiuso'
      this.$('[data-state="return"]').textContent = JSON.stringify(this.dialog.returnValue ?? '')
      this.$('[data-state="focus"]').textContent = this.initialFocus
      for (const action of ['show', 'modal']) this.$(`[data-action="${action}"]`).disabled = !this.supported
      this.$('code').textContent = this.generateExample()
    }

    generateExample() {
      const fieldFocus = this.$('[name="focus"]').value === 'field'
      const opacity = Number(this.$('[name="opacity"]').value) / 100
      const prevent = this.$('[name="preventCancel"]').checked
      const method = this.mode === 'modal' ? 'showModal' : 'show'
      return [
        '<button id="open-dialog" type="button">Apri</button>',
        '<dialog id="demo-dialog" aria-label="Esempio dialog">',
        '  <form method="dialog">',
        `    <label>Test del focus <input type="text"${fieldFocus ? ' autofocus' : ''}></label>`,
        '    <button value="confirm">Conferma</button>',
        '    <button id="request-dialog" type="button">Richiedi chiusura</button>',
        `    <button id="close-dialog" type="button"${fieldFocus ? '' : ' autofocus'}>Chiudi</button>`,
        '  </form>',
        '</dialog>',
        '<style>',
        `  dialog::backdrop { background: rgb(0 0 0 / ${opacity}); }`,
        '</style>',
        '<script>',
        '  const dialog = document.querySelector("#demo-dialog")',
        '  document.querySelector("#open-dialog").addEventListener("click", () => {',
        '    dialog.returnValue = ""',
        `    dialog.${method}()`,
        '  })',
        '  document.querySelector("#close-dialog").addEventListener("click", () => {',
        '    dialog.close("dismiss")',
        '  })',
        '  const request = document.querySelector("#request-dialog")',
        '  request.disabled = typeof dialog.requestClose !== "function"',
        '  request.addEventListener("click", () => dialog.requestClose("requested"))',
        '  dialog.addEventListener("cancel", event => {',
        ...(prevent ? ['    event.preventDefault()'] : []),
        '    console.log("cancel")',
        '  })',
        '  dialog.addEventListener("close", () => {',
        '    console.log(dialog.returnValue)',
        '  })',
        '</' + 'script>'
      ].join('\n')
    }

    reset() {
      if (this.dialog.open) {
        this.ignoreCloseEvents++
        this.dialog.close('')
      }
      this.dialog.returnValue = ''
      this.$('[name="opacity"]').value = '45'
      this.$('[name="focus"]').value = 'field'
      this.$('[name="preventCancel"]').checked = false
      this.form.reset()
      this.mode = 'modal'
      this.initialFocus = '—'
      this.count = 0
      this.$('[data-count]').textContent = '0'
      this.clearLog()
      this.update()
      this.$('.status').textContent = 'Impostazioni ripristinate.'
    }

    async copy() {
      try {
        await navigator.clipboard.writeText(this.$('code').textContent)
        this.$('.status').textContent = 'Esempio copiato.'
      } catch {
        this.$('.status').textContent = 'Copia automatica non disponibile. Seleziona il codice manualmente.'
      }
    }
  }

  customElements.define(tag, DialogPlayground)
})()
