(() => {
  'use strict'

  const NAME = 'csp-generator'
  if (customElements.get(NAME)) return

  const NONCE = "'nonce-{{NONCE}}'"
  const directives = [
    ['default-src', 'Fallback per le direttive di caricamento', "'none'"],
    ['script-src', 'JavaScript', "'self'"],
    ['style-src', 'Fogli di stile', "'self'"],
    ['img-src', 'Immagini', "'self'"],
    ['font-src', 'Font', "'self'"],
    ['connect-src', 'Fetch, XHR, WebSocket', "'self'"],
    ['media-src', 'Audio e video', "'none'"],
    ['frame-src', 'Iframe caricati dalla pagina', "'none'"],
    ['worker-src', 'Web Worker', "'none'"],
    ['manifest-src', 'Web app manifest', "'self'"],
    ['object-src', 'Object ed embed', "'none'"],
    ['base-uri', 'URL base del documento', "'none'"],
    ['frame-ancestors', 'Chi può incorporare la pagina', "'none'"],
    ['form-action', 'Destinazioni dei form', "'self'"]
  ]
  const initial = Object.fromEntries(directives.map(([name, , value]) => [name, value]))
  const presets = {
    static: initial,
    deny: Object.fromEntries(directives.map(([name]) => [name, "'none'"])),
    nonce: { ...initial, 'script-src': `${NONCE} 'strict-dynamic'` }
  }
  const descriptions = {
    static: 'Allowlist same-origin per un sito statico. Non è una strict CSP.',
    deny: 'Blocca anche le risorse same-origin. Utile per partire da zero.',
    nonce: 'Script autorizzati con nonce generato dal server per ogni risposta. Richiede adattamento dei template HTML.'
  }
  const keywords = new Set(["'self'", "'none'", '*', 'https:'])
  const special = {
    'script-src': new Set(["'unsafe-inline'", "'unsafe-eval'", "'wasm-unsafe-eval'", "'strict-dynamic'", NONCE]),
    'style-src': new Set(["'unsafe-inline'", NONCE]),
    'img-src': new Set(['data:', 'blob:']),
    'font-src': new Set(['data:']),
    'media-src': new Set(['blob:', 'data:']),
    'worker-src': new Set(['blob:'])
  }
  const css = `
    :host{display:block;color:inherit;font:inherit;line-height:1.5;--pg-accent:var(--playground-accent,#2563eb);--pg-border:var(--playground-border,#b5b5b5);--pg-radius:var(--playground-radius,.5rem)}
    *{box-sizing:border-box} [hidden]{display:none!important}
    .shell{border:1px solid var(--pg-border);border-radius:var(--pg-radius);padding:clamp(.75rem,3vw,1.25rem);background:var(--playground-background,transparent);min-width:0}
    h2,h3,p{margin:0 0 .6rem} h2{font-size:1.15em} h3{font-size:1em}
    .muted,small{font-size:.85em} .section{border-top:1px solid var(--pg-border);padding-top:1rem;margin-top:1rem}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr));gap:.8rem}
    label.field{display:grid;gap:.25rem;min-width:0} label.check{display:flex;align-items:flex-start;gap:.5rem;margin:.45rem 0}
    input,select,textarea,button{font:inherit;color:inherit} input[type=text],select,textarea{width:100%;min-width:0;padding:.5rem;border:1px solid var(--pg-border);border-radius:var(--pg-radius);background:var(--playground-input-background,transparent)}
    input[type=checkbox]{accent-color:var(--pg-accent);margin-top:.35em} input[aria-invalid=true]{border-color:var(--playground-error,#b91c1c);outline:1px solid var(--playground-error,#b91c1c)}
    textarea{font-family:ui-monospace,monospace;font-size:.85em;resize:vertical;overflow-wrap:anywhere} .output{min-height:10rem}
    .actions{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:.55rem 0}
    button{border:1px solid var(--pg-border);border-radius:var(--pg-radius);padding:.45rem .7rem;background:transparent;cursor:pointer;max-width:100%} button.primary{background:var(--pg-accent);color:var(--playground-accent-text,#fff);border-color:var(--pg-accent)} button:disabled{opacity:.55;cursor:not-allowed}
    :focus-visible{outline:2px solid var(--pg-accent);outline-offset:2px} code{font-family:ui-monospace,monospace;overflow-wrap:anywhere}
    ul{padding-inline-start:1.2rem;margin:.4rem 0} li{margin:.3rem 0;overflow-wrap:anywhere} .errors{color:var(--playground-error,#b91c1c)} .warnings{border-inline-start:3px solid var(--playground-warning,#a16207);padding-inline-start:.75rem} .status{min-height:1.4em} .hint{overflow-wrap:anywhere}
  `
  const el = (tag, text, attrs = {}) => {
    const node = document.createElement(tag)
    if (text !== null && text !== undefined) node.textContent = text
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
    return node
  }
  const select = options => {
    const node = el('select')
    for (const [value, label] of options) node.append(el('option', label, { value }))
    return node
  }
  const field = (label, input, hint) => {
    const node = el('label', null, { class: 'field' })
    node.append(el('span', label), input)
    if (hint) node.append(el('small', hint))
    return node
  }
  const checkbox = (text, checked = false) => {
    const label = el('label', null, { class: 'check' })
    const input = el('input', null, { type: 'checkbox' })
    input.checked = checked
    label.append(input, el('span', text))
    return { label, input }
  }
  const btn = (text, primary = false) => el('button', text, { type: 'button', class: primary ? 'primary' : '' })
  const section = title => {
    const node = el('section', null, { class: 'section' })
    node.append(el('h3', title))
    return node
  }
  const hashSource = token => {
    const match = /^'sha(256|384|512)-([A-Za-z0-9+/]+={0,2})'$/.exec(token)
    if (!match) return false
    try {
      const bytes = atob(match[2])
      return bytes.length === Number(match[1]) / 8 && btoa(bytes) === match[2]
    } catch { return false }
  }
  // Intentional subset: exact HTTPS origins with optional numeric port.
  const origin = token => {
    if (!/^https:\/\/[a-zA-Z0-9.-]+(?::[0-9]{1,5})?$/.test(token)) return false
    try {
      const url = new URL(token)
      return url.hostname.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))
    } catch { return false }
  }
  const validSource = (name, token) => keywords.has(token) || origin(token) || Boolean(special[name]?.has(token)) || ((name === 'script-src' || name === 'style-src') && hashSource(token))
  const reportURL = text => {
    // No quotes, whitespace, comma, semicolon, backslash, dollar, fragment or credentials.
    if (!/^https:\/\/[a-zA-Z0-9.-]+(?::[0-9]{1,5})?(?:\/[a-zA-Z0-9._~/%?&=+@!():-]*)?$/.test(text)) return false
    try { const url = new URL(text); return origin(url.origin) && !url.username && !url.password && !url.hash } catch { return false }
  }
  const quote = JSON.stringify
  const asNginx = (name, value) => `add_header ${name} "${value.replace(/"/g, '\\"')}" always;`

  class CSPGenerator extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' })
      this.inputs = new Map()
      this.hashGeneration = 0
      this.build()
    }
    connectedCallback() {
      if (!this.styleNode) this.installStyle()
      this.update()
    }
    installStyle() {
      // Optional external stylesheet for sites that disallow inline styles.
      const sheet = this.getAttribute('stylesheet')
      if (sheet) this.styleNode = el('link', null, { rel: 'stylesheet', href: sheet })
      else {
        const style = el('style', css)
        const nonce = this.nonce
        if (nonce) style.nonce = nonce
        this.styleNode = style
      }
      this.shadowRoot.prepend(this.styleNode)
    }
    build() {
      const root = el('div', null, { class: 'shell' })
      this.shadowRoot.append(root)
      root.append(el('h2', 'Content Security Policy Generator'), el('p', 'Configura una policy di partenza. Nessuna policy viene applicata a questa pagina e nessun dato viene inviato in rete.', { class: 'muted' }))
      this.preset = select([['static','Sito statico / same-origin'],['deny','Blocca tutto'],['nonce','Strict CSP per script con nonce (SSR)']])
      this.presetHint = el('p', descriptions.static, { class:'muted' })
      this.mode = select([['report','Report-Only (collaudo)'],['enforce','Enforcement (applicazione)']])
      const reset = btn('Reset')
      const top = el('div', null, { class:'grid' })
      top.append(field('Preset',this.preset),field('Modalità',this.mode))
      root.append(top,this.presetHint,reset)
      const editor = section('Direttive e sorgenti')
      editor.append(el('p', "Separa le sorgenti con spazi. Un campo vuoto omette la direttiva e può attivare un fallback. Usa 'none' per bloccare tutte le sorgenti. Sono supportati keyword selezionate, origini HTTPS esatte e hash; non l'intera grammatica CSP.", { class:'muted' }))
      const grid = el('div',null,{class:'grid'})
      for (const [name,hint,value] of directives) {
        const input = el('input',null,{type:'text',spellcheck:'false',autocomplete:'off',maxlength:'2048','data-directive':name})
        input.value = value
        this.inputs.set(name,input)
        grid.append(field(name,input,hint))
        input.addEventListener('input',()=>this.update())
      }
      editor.append(grid)
      this.upgrade = checkbox('upgrade-insecure-requests (solo enforcement)')
      const addNonce = btn('Usa nonce + strict-dynamic per script-src')
      editor.append(this.upgrade.label,addNonce)
      addNonce.addEventListener('click',()=>{ this.inputs.get('script-src').value = `${NONCE} 'strict-dynamic'`; this.update() })
      root.append(editor)
      const hash = section('Hash di script o stile inline')
      hash.append(el('p','Incolla il contenuto esatto del blocco, senza i tag. Anche spazi e ritorni a capo contano. Il digest è calcolato localmente con Web Crypto.',{class:'muted'}))
      this.hashText = el('textarea',null,{rows:'4',maxlength:'60000',spellcheck:'false',autocomplete:'off'})
      this.hashAlgorithm = select([['SHA-256','SHA-256'],['SHA-384','SHA-384'],['SHA-512','SHA-512']])
      this.hashTarget = select([['script-src','script-src'],['style-src','style-src']])
      const hashGrid = el('div',null,{class:'grid'})
      hashGrid.append(field('Algoritmo',this.hashAlgorithm),field('Destinazione',this.hashTarget))
      this.hashResult = el('input',null,{type:'text',readonly:'','aria-label':'Hash calcolato'})
      const calculate = btn('Calcola hash',true)
      this.addHash = btn('Aggiungi alla direttiva')
      this.addHash.disabled = true
      const hashActions = el('div',null,{class:'actions'})
      hashActions.append(calculate,this.addHash)
      this.hashStatus = el('p','',{role:'status',class:'muted status'})
      hash.append(field('Contenuto inline',this.hashText),hashGrid,hashActions,field('Hash CSP',this.hashResult),this.hashStatus)
      root.append(hash)
      const invalidateHash = () => { this.hashGeneration++; this.hashResult.value=''; this.addHash.disabled=true; this.hashStatus.textContent='' }
      this.hashText.addEventListener('input',invalidateHash)
      this.hashAlgorithm.addEventListener('change',invalidateHash)
      calculate.addEventListener('click',()=>this.calculateHash())
      this.addHash.addEventListener('click',()=>{
        if (!hashSource(this.hashResult.value)) return
        const input = this.inputs.get(this.hashTarget.value)
        const values = input.value.trim().split(/\s+/).filter(v=>v && v!=="'none'")
        input.value = [...new Set([...values,this.hashResult.value])].join(' ')
        this.update()
      })
      const reporting = section('Segnalazione delle violazioni')
      this.endpoint = el('input',null,{type:'text',placeholder:'https://example.com/csp-reports',maxlength:'2048',spellcheck:'false',autocomplete:'off'})
      this.legacy = checkbox('Includi report-uri (deprecato, fallback per browser meno recenti)')
      reporting.append(field('Endpoint HTTPS (facoltativo)',this.endpoint,'Il server deve esporre un endpoint POST dedicato. I report possono contenere URL e altri dati sensibili.'),this.legacy.label)
      root.append(reporting)
      const diagnostic = section('Controlli e avvertenze')
      this.errors = el('ul',null,{class:'errors','aria-live':'polite'})
      this.warnings = el('ul',null,{class:'warnings'})
      diagnostic.append(this.errors,this.warnings)
      root.append(diagnostic)
      const outputs = section('Configurazione generata')
      this.format = select([['http','Header HTTP'],['express','Middleware Express (ESM)'],['nginx','Nginx']])
      this.output = el('textarea',null,{rows:'13',readonly:'',class:'output',spellcheck:'false','aria-label':'Configurazione generata'})
      this.copy = btn('Copia configurazione',true)
      this.outputHint = el('p','',{class:'hint muted'})
      this.status = el('p','',{role:'status',class:'status muted'})
      outputs.append(field('Formato',this.format),this.outputHint,this.output,this.copy,this.status)
      root.append(outputs)
      this.copy.addEventListener('click',()=>this.copyOutput())
      this.preset.addEventListener('change',()=>this.applyPreset())
      reset.addEventListener('click',()=>{
        this.preset.value='static';this.mode.value='report';this.format.value='http'
        this.upgrade.input.checked=false;this.endpoint.value='';this.legacy.input.checked=false
        this.hashText.value='';this.hashAlgorithm.value='SHA-256';this.hashTarget.value='script-src';invalidateHash();this.applyPreset()
      })
      for (const node of [this.mode,this.upgrade.input,this.legacy.input,this.format]) node.addEventListener('change',()=>this.update())
      this.endpoint.addEventListener('input',()=>this.update())
    }
    applyPreset() {
      for (const [name,input] of this.inputs) input.value=presets[this.preset.value][name]
      this.presetHint.textContent=descriptions[this.preset.value]
      this.update()
    }
    async calculateHash() {
      const id=++this.hashGeneration
      this.hashResult.value='';this.addHash.disabled=true
      if (!globalThis.crypto?.subtle) { this.hashStatus.textContent='Web Crypto non disponibile: usa HTTPS o localhost.';return }
      if (this.hashText.value.length>60000) { this.hashStatus.textContent='Contenuto troppo lungo.';return }
      this.hashStatus.textContent='Calcolo in corso…'
      const algorithm=this.hashAlgorithm.value
      try {
        const bytes=new Uint8Array(await crypto.subtle.digest(algorithm,new TextEncoder().encode(this.hashText.value)))
        if (id!==this.hashGeneration) return
        this.hashResult.value=`'${algorithm.toLowerCase().replace('-','')}-${btoa(String.fromCharCode(...bytes))}'`
        this.addHash.disabled=false;this.hashStatus.textContent='Hash calcolato. Verifica che il contenuto servito sia identico.'
      } catch { if(id===this.hashGeneration) this.hashStatus.textContent='Impossibile calcolare il digest.' }
    }
    update() {
      const errors=[], warnings=[], policy=new Map()
      for (const [name,input] of this.inputs) {
        const raw=input.value.trim()
        const sources=[...new Set(raw.split(/\s+/).filter(Boolean))]
        let problem=''
        if (input.value.length>2048 || /[^\x20-\x7e\t]/.test(input.value)) problem='Usa solo sorgenti ASCII su una riga.'
        else if (!sources.length && name==='default-src') problem='default-src è obbligatoria in questo generatore.'
        else if (sources.some(v=>!validSource(name,v))) problem='Sorgente non supportata o sintassi non valida.'
        else if (sources.includes("'none'") && sources.length>1) problem="'none' deve essere utilizzato da solo."
        else if (sources.includes("'strict-dynamic'") && !sources.some(v=>v===NONCE || hashSource(v))) problem="'strict-dynamic' richiede un nonce o un hash in script-src."
        input.setAttribute('aria-invalid',String(Boolean(problem)))
        if (problem) errors.push(`${name}: ${problem}`)
        if (sources.length) policy.set(name,sources)
        if (sources.includes('*') || sources.includes('https:')) warnings.push(`${name}: sorgenti molto ampie; limita le origini a quelle necessarie.`)
        if (sources.includes("'unsafe-inline'")) warnings.push(`${name}: 'unsafe-inline' può consentire contenuti inline non autorizzati; preferisci nonce o hash.`)
        if (sources.includes("'unsafe-eval'")) warnings.push(`${name}: 'unsafe-eval' consente la compilazione dinamica di JavaScript.`)
        if (sources.includes("'wasm-unsafe-eval'")) warnings.push(`${name}: autorizza la compilazione WebAssembly; verifica se necessaria.`)
        if (sources.includes('blob:') || sources.includes('data:')) warnings.push(`${name}: verifica la necessità di data: o blob:.`)
      }
      for (const name of ['base-uri','frame-ancestors','form-action']) if (!policy.has(name)) warnings.push(`${name}: assente; non eredita da default-src.`)
      if (policy.get('object-src')?.join(' ')!=="'none'") warnings.push("object-src: preferisci 'none' se non servono object/embed.")
      const scripts=policy.get('script-src') || policy.get('default-src') || []
      if (!scripts.includes("'none'") && !scripts.some(v=>v===NONCE||hashSource(v))) warnings.push('script-src effettiva: allowlist senza nonce/hash; non equivale a una strict CSP.')
      if (scripts.some(v=>v===NONCE||hashSource(v)) && !scripts.includes("'strict-dynamic'") && scripts.some(v=>v==="'self'" || v==='*' || v==='https:' || origin(v))) warnings.push('script-src: nonce/hash affiancati a sorgenti autorizzate; queste ultime restano consentite. Non è una strict CSP basata esclusivamente sulla fiducia negli script.')
      if (scripts.includes("'strict-dynamic'")) warnings.push("strict-dynamic: nei browser compatibili le allowlist di host, schemi e 'self' vengono ignorate per gli script; la fiducia si propaga agli script caricati dinamicamente da script autorizzati (non parser-inserted).")
      const endpoint=this.endpoint.value.trim()
      const endpointError=(endpoint && !reportURL(endpoint)) || this.endpoint.value.length>2048
      this.endpoint.setAttribute('aria-invalid',String(Boolean(endpointError)))
      if(endpointError) errors.push('Endpoint: usa un URL HTTPS assoluto senza caratteri non supportati.')
      if(this.legacy.input.checked && !endpoint) errors.push('report-uri richiede un endpoint.')
      const report=this.mode.value==='report'
      if(report) warnings.push('Report-Only: nessuna violazione viene bloccata.' + (!endpoint?' Senza endpoint non è configurata la raccolta remota dei report.':''))
      this.upgrade.input.disabled=report
      if(report && this.upgrade.input.checked) warnings.push('upgrade-insecure-requests viene omessa in Report-Only.')
      if(endpoint) warnings.push('Reporting: configura il ricevitore POST e la gestione dei dati. report-to non è supportato uniformemente; report-uri è deprecato.')
      const parts=[...policy].map(([name,sources])=>`${name} ${sources.join(' ')}`)
      if(!report && this.upgrade.input.checked) parts.push('upgrade-insecure-requests')
      if(endpoint) { parts.push('report-to csp');if(this.legacy.input.checked) parts.push(`report-uri ${endpoint}`) }
      const value=parts.join('; ')+';'
      const nonce=value.includes(NONCE)
      if(nonce) warnings.push('NONCE: il segnaposto deve essere sostituito con un valore casuale crittografico nuovo per ogni risposta HTML e associato solo ai tag autorizzati. Non usare una policy con nonce fisso o HTML condiviso in cache.')
      this.errors.replaceChildren(...errors.map(s=>el('li',s)))
      this.errors.hidden=!errors.length
      this.warnings.replaceChildren(...(warnings.length?warnings:['Nessuna criticità rilevata dai controlli limitati del generatore. Non è una certificazione di sicurezza.']).map(s=>el('li',s)))
      const name=report?'Content-Security-Policy-Report-Only':'Content-Security-Policy'
      const reporting=endpoint?`csp=${quote(endpoint)}`:''
      const format=this.format.value
      this.status.textContent=''
      this.outputHint.textContent=nonce?'Template con {{NONCE}}: non distribuire senza sostituzione dinamica.':'Configurazione da verificare nell’applicazione prima della distribuzione.'
      this.copy.disabled=Boolean(errors.length)
      if(errors.length) { this.output.value='';return }
      if(format==='nginx' && nonce) {
        this.output.value='';this.outputHint.textContent='Nginx statico non genera nonce per risposta. Usa il middleware Express o implementa una generazione dinamica server-side.';this.copy.disabled=true;return
      }
      if(format==='http') this.output.value=`${name}: ${value}${reporting?`\nReporting-Endpoints: ${reporting}`:''}`
      else if(format==='nginx') this.output.value=[asNginx(name,value),...(reporting?[asNginx('Reporting-Endpoints',reporting)]:[])].join('\n')
      else {
        const lines=[]
        if(nonce) lines.push("import { randomBytes } from 'node:crypto'",'')
        lines.push('// Registra prima delle route HTML.', 'app.use((req, res, next) => {')
        if(nonce) lines.push("  const nonce = randomBytes(16).toString('base64')",'  res.locals.cspNonce = nonce',"  res.setHeader('Cache-Control', 'no-store')")
        lines.push(`  const policy = ${quote(value)}${nonce?".replaceAll('{{NONCE}}', nonce)":''}`,`  res.setHeader(${quote(name)}, policy)`)
        if(reporting) lines.push(`  res.setHeader('Reporting-Endpoints', ${quote(reporting)})`)
        lines.push('  next()','})')
        if(nonce) lines.push('', '// Nel template Pug, solo sui tag autorizzati:', '// script(nonce=cspNonce src="/assets/js/app.js")', ...(policy.get('style-src')?.includes(NONCE)?['// style(nonce=cspNonce)']:[]), '// Non inserire il nonce in HTML proveniente da input non attendibili.')
        if(reporting) lines.push('', '// Implementa separatamente il ricevitore POST dei report.')
        this.output.value=lines.join('\n')
        if(nonce) this.outputHint.textContent='Middleware per route HTML: genera un nonce nuovo per risposta. Verifica che template e caching siano coerenti.'
      }
    }
    async copyOutput() {
      if(this.copy.disabled || !this.output.value) return
      try { await navigator.clipboard.writeText(this.output.value);this.status.textContent='Configurazione copiata.' }
      catch { this.output.focus();this.output.select();this.status.textContent='Copia manualmente il testo selezionato (Ctrl/Cmd+C).' }
    }
  }
  customElements.define(NAME,CSPGenerator)
})()
