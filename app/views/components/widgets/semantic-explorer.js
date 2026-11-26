(() => {
  'use strict'

  const tag = 'semantic-explorer'
  if (customElements.get(tag)) return

  const examples = {
    semantic: `<header>
  <nav aria-label="Menu principale">
    <a href="/">Home</a>
  </nav>
</header>
<main>
  <h1>Programmazione Web Italia</h1>
  <article>
    <header>
      <h2>HTML semantico</h2>
    </header>
    <p>Usare gli elementi HTML corretti.</p>
    <section aria-labelledby="advantages">
      <h3 id="advantages">Vantaggi</h3>
      <p>Accessibilità e struttura del documento.</p>
    </section>
  </article>
  <aside aria-label="Approfondimenti">
    <h2>Articoli correlati</h2>
  </aside>
</main>
<footer>Copyright</footer>`,
    generic: `<div class="header">
  <div class="menu"><a href="/">Home</a></div>
</div>
<div class="main">
  <div class="title">Programmazione Web Italia</div>
  <div class="article">
    <div class="subtitle">HTML semantico</div>
    <div>Usare gli elementi HTML corretti.</div>
  </div>
</div>
<div class="footer">Copyright</div>`,
    issues: `<header>
  <nav><a href="/">Home</a></nav>
  <nav><a href="/contact">Contatti</a></nav>
</header>
<main>
  <h1>HTML semantico</h1>
  <h3>Un livello saltato</h3>
  <img src="example.jpg">
  <section><h2>Sezione senza nome accessibile</h2></section>
  <div role="region">Regione senza nome</div>
  <h2></h2>
</main>
<main><p>Seconda area principale</p></main>`,
    aria: `<div role="banner">Intestazione</div>
<div role="navigation" aria-label="Principale">
  <a href="/">Home</a>
</div>
<div role="main">
  <div role="heading" aria-level="1">Titolo principale</div>
  <div role="region" aria-labelledby="details">
    <h2 id="details">Dettagli</h2>
    <p>Contenuto della regione.</p>
  </div>
  <form aria-label="Contatti"><input aria-label="Nome"></form>
</div>
<div role="contentinfo">Copyright</div>`
  }

  const landmarkRoles = new Set(['banner', 'navigation', 'main', 'complementary', 'contentinfo', 'region', 'form', 'search'])
  const contextualTags = new Set(['article', 'aside', 'main', 'nav', 'section'])
  const contextualRoles = new Set(['article', 'complementary', 'main', 'navigation', 'region'])
  const structuralTags = new Set(['header', 'footer', 'main', 'nav', 'aside', 'article', 'section', 'search', 'figure', 'figcaption', 'form', 'address', 'details', 'summary', 'hgroup'])
  const HTML_NS = 'http://www.w3.org/1999/xhtml'
  const limit = 60000
  const treeLimit = 400
  const tidy = value => (value || '').replace(/\s+/g, ' ').trim()
  const short = (value, max = 160) => value.length > max ? `${value.slice(0, max)}…` : value
  const roleOf = el => tidy(el.getAttribute('role')).split(' ')[0] || ''
  const tagOf = el => el.localName.toLowerCase()
  const labelOf = el => `<${tagOf(el)}${el.id ? `#${short(el.id, 50)}` : ''}>`
  const element = (name, text, className) => {
    const node = document.createElement(name)
    if (text !== undefined) node.textContent = text
    if (className) node.className = className
    return node
  }

  // Analisi statica: il frammento non viene mai aggiunto al documento attivo.
  function analyze(source) {
    if (source.length > limit) throw new Error(`Limite di ${limit} caratteri superato.`)
    const inert = document.createElement('template')
    inert.innerHTML = source
    const nodes = [...inert.content.querySelectorAll('*')]
    const ids = new Map()
    const issues = []
    const headings = []
    const landmarks = []
    const roles = new Map()
    const hidden = new Map()
    const depths = new Map()
    let generic = 0
    let structural = 0
    const issue = (kind, message) => issues.push({ kind, message })

    for (const el of nodes) {
      if (el.id) {
        if (ids.has(el.id)) issue('warning', `ID duplicato: ${short(el.id)}.`)
        else ids.set(el.id, el)
      }
    }

    // Approssimazione del nome accessibile: non è l'algoritmo AccName completo.
    const accessibleName = el => {
      const refs = tidy(el.getAttribute('aria-labelledby')).split(' ').filter(Boolean)
      const referenced = refs.map(id => ids.get(id)).filter(Boolean)
      if (referenced.length) {
        const name = tidy(referenced.map(node => tidy(node.getAttribute('aria-label')) || tidy(node.textContent)).join(' '))
        if (name) return short(name)
      }
      return short(tidy(el.getAttribute('aria-label')) || tidy(el.getAttribute('title')))
    }
    const contextual = new Map()
    for (const el of nodes) {
      const parent = el.parentElement
      const html = el.namespaceURI === HTML_NS
      const type = tagOf(el)
      const explicit = roleOf(el)
      const inContext = parent ? Boolean(contextual.get(parent)) : false
      contextual.set(el, inContext || (html && contextualTags.has(type)) || contextualRoles.has(explicit))
      depths.set(el, parent ? (depths.get(parent) || 0) + 1 : 0)
      const isHidden = Boolean(parent && hidden.get(parent)) || el.hasAttribute('hidden') || el.hasAttribute('inert') || tidy(el.getAttribute('aria-hidden')).toLowerCase() === 'true'
      hidden.set(el, isHidden)
      if (!html) continue
      if (type === 'div' || type === 'span') generic++
      if (structuralTags.has(type)) structural++
      if (isHidden) continue
      const name = accessibleName(el)
      let role = ''
      if (explicit) {
        if (landmarkRoles.has(explicit)) role = explicit
      } else if (type === 'header' && !inContext) role = 'banner'
      else if (type === 'footer' && !inContext) role = 'contentinfo'
      else if (type === 'nav') role = 'navigation'
      else if (type === 'aside') role = 'complementary'
      else if (type === 'main' || type === 'search') role = type
      else if (type === 'section' && name) role = 'region'
      else if (type === 'form' && name) role = 'form'

      if (role) {
        if ((role === 'region' || role === 'form') && !name) {
          issue('warning', `${labelOf(el)}: role="${role}" senza un nome accessibile riconosciuto.`)
        } else {
          roles.set(el, role)
          landmarks.push({ tag: labelOf(el), role, name })
        }
      }

      let level = 0
      if (explicit === 'heading') {
        const raw = tidy(el.getAttribute('aria-level'))
        if (/^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw))) level = Number(raw)
        else {
          level = /^h[1-6]$/.test(type) ? Number(type[1]) : 2
          issue('warning', `${labelOf(el)}: role="heading" senza aria-level positivo esplicito (livello stimato: ${level}).`)
        }
      } else if (!explicit && /^h[1-6]$/.test(type)) level = Number(type[1])
      if (level) {
        const text = name || short(tidy(el.textContent))
        if (!text) issue('warning', `${labelOf(el)}: titolo senza testo o nome riconosciuto.`)
        const previous = headings.at(-1)
        if (previous && level > previous.level + 1) issue('warning', `Salto di livello da H${previous.level} a H${level}: ${text || labelOf(el)}.`)
        headings.push({ level, text, tag: labelOf(el) })
      }
      if (type === 'img' && !el.hasAttribute('alt')) issue('warning', `${labelOf(el)}: attributo alt assente. Verifica l'alternativa testuale.`)
      if (el.hasAttribute('aria-labelledby')) {
        for (const id of tidy(el.getAttribute('aria-labelledby')).split(' ').filter(Boolean)) {
          if (!ids.has(id)) issue('warning', `${labelOf(el)}: aria-labelledby fa riferimento a un ID non presente nel frammento (${short(id)}).`)
        }
      }
    }

    if (nodes.length) {
      if (!landmarks.some(x => x.role === 'main')) issue('info', 'Nessun landmark main nel frammento. Se rappresenta un componente e non una pagina intera, può essere corretto.')
      if (!headings.length) issue('info', 'Nessun titolo rilevato. Valuta se il contenuto necessita di una gerarchia di titoli.')
      else if (headings[0].level > 1) issue('info', `Il primo titolo è H${headings[0].level}. In un frammento può essere coerente con il contesto esterno.`)
      if (headings.filter(h => h.level === 1).length > 1) issue('info', 'Più titoli H1: verifica che la gerarchia complessiva sia comprensibile. Non è automaticamente un errore HTML.')
      if (landmarks.filter(x => x.role === 'main').length > 1) issue('warning', 'Più landmark main rilevati: verifica che sia identificabile un’unica area principale nel contesto della pagina.')
      const seen = new Set()
      const repeated = new Set()
      for (const item of landmarks) {
        const key = `${item.role}\u0000${item.name}`
        if (seen.has(key) && !repeated.has(key)) {
          repeated.add(key)
          issue('info', `Landmark ${item.role} ripetuti con ${item.name ? 'lo stesso nome' : 'nessun nome'}: se hanno funzioni diverse, usa nomi distinti.`)
        }
        seen.add(key)
      }
      if (!structural && generic) issue('info', 'Nessun elemento strutturale HTML tra quelli monitorati. Valuta se alcuni div o span possono essere sostituiti con elementi semantici appropriati.')
    }
    return { nodes, headings, landmarks, issues, roles, hidden, depths, generic, structural }
  }

  const template = document.createElement('template')
  template.innerHTML = `
    <style>
      :host { display:block; min-width:0; margin-block:2rem; font:inherit; font-size:.875rem; color:inherit; }
      *, *::before, *::after { box-sizing:border-box; }
      [hidden] { display:none !important; }
      .playground { padding:1rem; border:1px solid var(--playground-border,#aaa); border-radius:var(--playground-radius,.5rem); background:var(--playground-background,transparent); }
      .toolbar,.actions { display:flex; align-items:center; flex-wrap:wrap; gap:.5rem; }
      .toolbar { justify-content:space-between; }
      .title { font-size:1.125rem; font-weight:600; margin:0; }
      .hint { line-height:1.5; font-size:.8rem; }
      .controls { margin-block:1rem; display:grid; gap:.5rem; }
      label { display:grid; gap:.35rem; }
      button,select,textarea { font:inherit; color:inherit; background:transparent; border:1px solid var(--playground-border,#aaa); border-radius:.25rem; padding:.5rem .75rem; }
      select { max-width:100%; }
      textarea { display:block; width:100%; min-width:0; min-height:16rem; resize:vertical; font-family:monospace; line-height:1.5; tab-size:2; white-space:pre; overflow:auto; }
      button { cursor:pointer; }
      button:disabled { opacity:.55; cursor:not-allowed; }
      button:not(:disabled):hover { background:rgb(128 128 128 / 12%); }
      :focus-visible { outline:2px solid var(--playground-accent,#2563eb); outline-offset:2px; }
      .metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,7rem),1fr)); gap:.5rem; margin-block:1rem; }
      .metrics div { padding:.65rem; border:1px solid var(--playground-border,#aaa); border-radius:.25rem; }
      dt { font-size:.78rem; }
      dd { margin:.25rem 0 0; font-weight:600; font-size:1.25rem; font-variant-numeric:tabular-nums; }
      .panel { margin-block:1rem; }
      .panel h3 { font-size:1rem; margin:0 0 .65rem; }
      .tree,.headings,.landmarks,.issues { margin:0; list-style:none; padding:.6rem; border:1px solid var(--playground-border,#aaa); border-radius:.25rem; max-height:19rem; overflow:auto; }
      .tree li,.headings li { padding-block:.25rem; padding-inline-start:calc(var(--depth,0) * .9rem); display:flex; flex-wrap:wrap; gap:.5rem; align-items:baseline; overflow-wrap:anywhere; }
      .tree li + li,.headings li + li,.landmarks li + li,.issues li + li { border-block-start:1px solid rgb(128 128 128 / 14%); }
      .landmarks li,.issues li { padding:.45rem .2rem; overflow-wrap:anywhere; }
      .type { font-family:monospace; font-weight:600; }
      .meta { font-size:.78rem; }
      .role { border:1px solid var(--playground-border,#aaa); border-radius:.25rem; padding:0 .3rem; font-size:.75rem; }
      .muted { opacity:.72; }
      .warning { border-inline-start:3px solid #b45309; padding-inline-start:.5rem !important; }
      .info { border-inline-start:3px solid var(--playground-accent,#2563eb); padding-inline-start:.5rem !important; }
      .status { min-height:1.4em; margin-block:.5rem 0; }
    </style>
    <div class="playground">
      <div class="toolbar"><p class="title">HTML Semantic Explorer</p><button type="button" data-action="reset">Reset</button></div>
      <p class="hint">Incolla il markup da analizzare. Il codice non viene eseguito né visualizzato come pagina web.</p>
      <div class="controls">
        <label>Esempi preconfigurati
          <select name="example">
            <option value="semantic">HTML semantico</option>
            <option value="generic">Layout con div</option>
            <option value="issues">Problemi comuni</option>
            <option value="aria">Landmark e titoli ARIA</option>
            <option value="custom" disabled>Codice personalizzato</option>
          </select>
        </label>
        <label>Codice HTML (frammento del body)
          <textarea name="source" maxlength="60000" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>
        </label>
        <div class="actions">
          <button type="button" data-action="analyze">Analizza HTML</button>
          <button type="button" data-action="copy-source">Copia HTML</button>
          <button type="button" data-action="copy-report">Copia analisi</button>
          <button type="button" data-action="clear">Svuota</button>
        </div>
      </div>
      <p class="status" role="status" data-status></p>
      <div data-results>
        <dl class="metrics">
          <div><dt>Elementi</dt><dd data-count="nodes">0</dd></div>
          <div><dt>Landmark</dt><dd data-count="landmarks">0</dd></div>
          <div><dt>Titoli</dt><dd data-count="headings">0</dd></div>
          <div><dt>Div / span</dt><dd data-count="generic">0</dd></div>
        </dl>
        <div class="panel"><h3>Albero degli elementi</h3><p class="hint">Struttura DOM ricostruita dal parser HTML, non albero di accessibilità.</p><ul class="tree" aria-label="Albero degli elementi" tabindex="0"></ul></div>
        <div class="panel"><h3>Landmark di accessibilità</h3><ul class="landmarks" aria-label="Landmark rilevati" tabindex="0"></ul></div>
        <div class="panel"><h3>Gerarchia dei titoli</h3><ul class="headings" aria-label="Titoli rilevati" tabindex="0"></ul></div>
        <div class="panel"><h3>Osservazioni</h3><ul class="issues" aria-label="Osservazioni sull'HTML" tabindex="0"></ul></div>
      </div>
      <p class="hint">Analisi statica indicativa: non verifica la validità HTML, le WCAG, gli stili CSS, il DOM generato da JavaScript o il nome accessibile completo. Gli elementi hidden, inert e aria-hidden vengono esclusi dalle stime dei landmark e dei titoli; il contenuto dei template non viene esplorato. Per un documento completo, incolla il contenuto del body.</p>
    </div>`

  class SemanticExplorer extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true))
      this.$ = selector => this.shadowRoot.querySelector(selector)
      this.source = this.$('textarea')
      this.example = this.$('select')
      this.status = this.$('[data-status]')
      this.report = ''
      this.source.value = examples.semantic
      this.source.addEventListener('input', () => {
        this.example.value = 'custom'
        this.update()
      })
      this.example.addEventListener('change', () => this.load(this.example.value))
      this.$('[data-action="analyze"]').addEventListener('click', () => this.update())
      this.$('[data-action="reset"]').addEventListener('click', () => this.load('semantic'))
      this.$('[data-action="clear"]').addEventListener('click', () => {
        this.source.value = ''
        this.example.value = 'custom'
        this.update()
        this.source.focus()
      })
      this.$('[data-action="copy-source"]').addEventListener('click', () => this.copy(this.source.value, 'HTML copiato.'))
      this.$('[data-action="copy-report"]').addEventListener('click', () => this.copy(this.report, 'Analisi copiata.'))
    }
    connectedCallback() {
      this.dataset.version = '1.0.0'
      this.update()
    }
    load(name) {
      if (!Object.hasOwn(examples, name)) return
      this.example.value = name
      this.source.value = examples[name]
      this.update()
    }
    update() {
      this.report = ''
      const copyReport = this.$('[data-action="copy-report"]')
      copyReport.disabled = true
      this.$('[data-action="copy-source"]').disabled = !this.source.value
      try {
        const result = analyze(this.source.value)
        this.render(result)
        this.$('[data-results]').hidden = false
        copyReport.disabled = !this.source.value.trim()
        this.status.textContent = this.source.value.trim() ? 'Analisi aggiornata.' : 'Inserisci un frammento HTML.'
      } catch (error) {
        this.$('[data-results]').hidden = true
        this.status.textContent = `Analisi non disponibile: ${error.message}`
      }
    }
    render(result) {
      const { nodes, landmarks, headings, issues, roles, hidden, depths, generic } = result
      for (const [key, value] of Object.entries({ nodes: nodes.length, landmarks: landmarks.length, headings: headings.length, generic })) {
        this.$(`[data-count="${key}"]`).textContent = value
      }
      const tree = this.$('.tree')
      tree.replaceChildren()
      for (const el of nodes.slice(0, treeLimit)) {
        const item = element('li')
        const depth = depths.get(el)
        item.style.setProperty('--depth', Math.min(depth, 12))
        item.append(element('code', labelOf(el), 'type'))
        if (depth > 12) item.append(element('span', `Livello ${depth}`, 'meta'))
        const classes = tidy(el.getAttribute('class'))
        if (classes) item.append(element('span', `class="${short(classes, 80)}"`, 'meta'))
        if (roles.has(el)) item.append(element('span', roles.get(el), 'role'))
        if (hidden.get(el)) item.append(element('span', 'escluso dalla stima', 'meta muted'))
        tree.append(item)
      }
      if (nodes.length > treeLimit) tree.append(element('li', `Albero limitato ai primi ${treeLimit} elementi; i conteggi comprendono l’intero frammento.`))
      if (!nodes.length) tree.append(element('li', 'Nessun elemento HTML rilevato.'))

      const list = this.$('.landmarks')
      list.replaceChildren()
      for (const item of landmarks.slice(0, treeLimit)) {
        const li = element('li')
        li.append(element('code', item.role, 'type'), document.createTextNode(` — ${item.tag}${item.name ? ` — ${item.name}` : ' — senza nome esplicito'}`))
        list.append(li)
      }
      if (!landmarks.length) list.append(element('li', 'Nessun landmark rilevato.'))
      if (landmarks.length > treeLimit) list.append(element('li', `Visualizzati i primi ${treeLimit} landmark.`))

      const outline = this.$('.headings')
      outline.replaceChildren()
      for (const h of headings.slice(0, treeLimit)) {
        const li = element('li')
        li.style.setProperty('--depth', Math.min(h.level - 1, 6))
        li.append(element('code', `H${h.level}`, 'role'), element('span', h.text || '(senza testo)'))
        outline.append(li)
      }
      if (!headings.length) outline.append(element('li', 'Nessun titolo rilevato.'))
      if (headings.length > treeLimit) outline.append(element('li', `Visualizzati i primi ${treeLimit} titoli.`))

      const warnings = this.$('.issues')
      warnings.replaceChildren()
      for (const issue of issues.slice(0, treeLimit)) warnings.append(element('li', `${issue.kind === 'warning' ? 'Attenzione' : 'Nota'}: ${issue.message}`, issue.kind))
      if (!issues.length) warnings.append(element('li', this.source.value.trim() ? 'Nessuna osservazione rilevata dalle regole implementate.' : 'Nessun contenuto da analizzare.'))
      if (issues.length > treeLimit) warnings.append(element('li', `Visualizzate le prime ${treeLimit} osservazioni.`))
      this.report = [
        'HTML Semantic Explorer — Analisi statica',
        `Elementi: ${nodes.length} | Landmark: ${landmarks.length} | Titoli: ${headings.length} | Div/span: ${generic}`,
        '', 'ALBERO DEGLI ELEMENTI',
        ...nodes.slice(0, treeLimit).map(el => `${'  '.repeat(Math.min(depths.get(el), 12))}${labelOf(el)}${roles.has(el) ? ` [${roles.get(el)}]` : ''}${hidden.get(el) ? ' [escluso dalla stima]' : ''}`),
        ...(nodes.length > treeLimit ? [`Albero limitato a ${treeLimit} elementi.`] : []),
        '', 'LANDMARK', ...landmarks.map(item => `${item.role} — ${item.tag}${item.name ? ` — ${item.name}` : ''}`),
        '', 'TITOLI', ...headings.map(h => `H${h.level} — ${h.text || '(senza testo)'}`),
        '', 'OSSERVAZIONI', ...issues.map(i => `${i.kind === 'warning' ? 'Attenzione' : 'Nota'}: ${i.message}`),
        '', 'Analisi indicativa: non equivale a una validazione HTML o a un audit di accessibilità.'
      ].join('\n')
    }
    async copy(text, message) {
      try {
        await navigator.clipboard.writeText(text)
        this.status.textContent = message
      } catch {
        this.status.textContent = 'Copia automatica non disponibile. Usa la selezione manuale del testo.'
      }
    }
  }
  customElements.define(tag, SemanticExplorer)
})()
