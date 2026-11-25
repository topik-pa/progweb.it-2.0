const examples = [
  ['#header .menu a:hover', 'nav.menu ul li a.active', 'ID e classi'],
  [':is(.card, #main)', ':where(#main .card)', ':is() e :where()'],
  ['article:has(> img)', 'article.featured', ':has()'],
  ['li:nth-child(2n of .active, #main)', 'li:not(.active)', ':nth-child()'],
  ['a, #main, .card:hover', 'a::before', 'Liste di selettori']
]

const zero = () => [0, 0, 0]
const add = (a, b) => a.map((n, i) => n + b[i])
export const compareSpecificity = (a, b) => {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return Math.sign(a[i] - b[i])
  }
  return 0
}
const maximum = list => list.reduce((a, b) =>
  compareSpecificity(a, b) >= 0 ? a : b, zero())
const whitespace = c => !!c && /[\t\n\f\r ]/.test(c)
const nameChar = c => !!c && /[\w\u0080-\uFFFF-]/.test(c)

// CSS escape: up to six hex digits and one optional whitespace.
function escapeEnd(s, i) {
  i++
  if (/[0-9a-f]/i.test(s[i] || '')) {
    let n = 0
    while (n < 6 && /[0-9a-f]/i.test(s[i] || '')) { i++; n++ }
    if (whitespace(s[i])) i += s[i] === '\r' && s[i + 1] === '\n' ? 2 : 1
    return i
  }
  return Math.min(i + 1, s.length)
}
function nameEnd(s, i) {
  while (i < s.length) {
    if (s[i] === '\\') i = escapeEnd(s, i)
    else if (nameChar(s[i])) i++
    else break
  }
  return i
}
function unescapeName(s) {
  return s.replace(/\\(?:([0-9a-f]{1,6})(?:\r\n|[\t\n\f\r ])?|([^\n\r\f]))/gi,
    (_, hex, c) => {
      if (!hex) return c
      const cp = parseInt(hex, 16)
      return String.fromCodePoint(cp && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff) ? cp : 0xfffd)
    })
}
function quoteEnd(s, i) {
  const quote = s[i++]
  while (i < s.length) {
    if (s[i] === '\\') i = escapeEnd(s, i)
    else if (s[i++] === quote) return i
  }
  throw new Error('Stringa non chiusa.')
}
function groupEnd(s, i) {
  const close = s[i] === '(' ? ')' : ']'
  i++
  while (i < s.length) {
    const c = s[i]
    if (c === close) return i + 1
    if (c === '\\') i = escapeEnd(s, i)
    else if (c === '"' || c === "'") i = quoteEnd(s, i)
    else if (c === '(' || c === '[') i = groupEnd(s, i)
    else i++
  }
  throw new Error('Parentesi non chiusa.')
}
function splitList(s) {
  const result = []
  let start = 0
  for (let i = 0; i < s.length;) {
    const c = s[i]
    if (c === '\\') i = escapeEnd(s, i)
    else if (c === '"' || c === "'") i = quoteEnd(s, i)
    else if (c === '[' || c === '(') i = groupEnd(s, i)
    else if (c === ',') { result.push(s.slice(start, i).trim()); start = ++i }
    else i++
  }
  result.push(s.slice(start).trim())
  return result
}

// Only known selector-bearing functional pseudos get recursive analysis.
const legacyElements = new Set(['before', 'after', 'first-line', 'first-letter'])
const selectorFunctions = new Set(['is', 'not', 'has'])
const simpleFunctions = new Set(['lang', 'dir', 'nth-of-type', 'nth-last-of-type', 'state', 'active-view-transition-type'])
const simpleElementFunctions = new Set(['part', 'highlight', 'view-transition-group', 'view-transition-image-pair', 'view-transition-old', 'view-transition-new', 'view-transition-group-children', 'picker', 'scroll-button', 'scroll-marker-group'])
function weight(s) {
  let a = zero()
  for (let i = 0; i < s.length;) {
    const c = s[i]
    if (whitespace(c) || c === '>' || c === '+' || c === '~' || s.startsWith('||', i)) {
      i += s.startsWith('||', i) ? 2 : 1
      continue
    }
    if (c === '&') throw new Error('Il nesting CSS (&) richiede il selettore padre: inserisci il selettore espanso.')
    if (c === '#' || c === '.') {
      a[c === '#' ? 0 : 1]++
      i = nameEnd(s, i + 1)
      continue
    }
    if (c === '[') { a[1]++; i = groupEnd(s, i); continue }
    if (c === ':') {
      const pseudoElement = s[i + 1] === ':'
      const start = i + (pseudoElement ? 2 : 1)
      i = nameEnd(s, start)
      const name = unescapeName(s.slice(start, i)).toLowerCase()
      let args = null
      if (s[i] === '(') {
        const end = groupEnd(s, i)
        args = s.slice(i + 1, end - 1)
        i = end
      }
      if (pseudoElement || legacyElements.has(name)) {
        a[2]++
        if (args !== null) {
          if (name === 'slotted') a = add(a, maximum(splitList(args).map(weight)))
          else if (!simpleElementFunctions.has(name)) throw new Error(`Pseudo-elemento funzionale non gestito: ::${name}().`)
        }
      } else if (name === 'where') {
        // No contribution, including arguments. Reject contextual nesting elsewhere.
      } else if (selectorFunctions.has(name)) {
        a = add(a, maximum(splitList(args || '').map(weight)))
      } else if (name === 'nth-child' || name === 'nth-last-child') {
        a[1]++
        const of = /\s+of\s+/i.exec(args || '')
        if (of) a = add(a, maximum(splitList(args.slice(of.index + of[0].length)).map(weight)))
      } else if (name === 'host' || name === 'host-context') {
        a[1]++
        if (args !== null) a = add(a, maximum(splitList(args).map(weight)))
      } else {
        if (args !== null && !simpleFunctions.has(name)) throw new Error(`Pseudo-classe funzionale non gestita: :${name}().`)
        a[1]++
      }
      continue
    }
    if (c === '*' || c === '|' || c === '\\' || nameChar(c)) {
      // A namespace prefix itself has no specificity.
      let end = c === '*' ? i + 1 : nameEnd(s, i)
      if (c === '|') end = i
      if (s[end] === '|' && s[end + 1] !== '|') {
        i = end + 1
        if (s[i] === '*') i++
        else { a[2]++; i = nameEnd(s, i) }
      } else {
        if (end === i) throw new Error('Selettore non gestito.')
        if (c !== '*') a[2]++
        i = end
      }
      continue
    }
    throw new Error(`Sintassi non gestita: ${c}`)
  }
  return a
}

// Create an isolated stylesheet. The fallback is never added to the live page.
function normalizeSelector(input) {
  let sheet
  try {
    sheet = new CSSStyleSheet()
  } catch {
    try {
      const doc = document.implementation.createHTMLDocument('')
      const style = doc.createElement('style')
      doc.head.append(style)
      sheet = style.sheet
    } catch {
      // Report an unavailable parser separately from an invalid selector.
    }
  }

  if (!sheet || typeof sheet.insertRule !== 'function') {
    throw new Error('Parser CSSOM non disponibile in questo ambiente.')
  }

  try {
    sheet.insertRule(`${input} {}`, 0)
  } catch (error) {
    if (error.name === 'SyntaxError') {
      throw new Error('Selettore non valido o non supportato da questo browser.')
    }
    throw new Error(`Errore CSSOM: ${error.name}: ${error.message}`)
  }

  const rule = sheet.cssRules[0]
  if (!rule || typeof rule.selectorText !== 'string') {
    throw new Error('Il parser non ha restituito un selettore CSS valido.')
  }
  return rule.selectorText
}

export function calculateSpecificity(input) {
  if (!input.trim()) return []
  if (input.length > 4000) throw new Error('Inserisci al massimo 4000 caratteri.')
  // Reject declarations/at-rules, while preserving strings, escapes and comments.
  for (let i = 0; i < input.length;) {
    const c = input[i]
    if (c === '\\') i = escapeEnd(input, i)
    else if (c === '"' || c === "'") i = quoteEnd(input, i)
    else if (input.startsWith('/*', i)) {
      const end = input.indexOf('*/', i + 2)
      if (end < 0) throw new Error('Commento non chiuso.')
      i = end + 2
    } else if (c === '&') {
      throw new Error('Il nesting CSS (&) richiede il selettore padre: inserisci il selettore espanso.')
    } else if (c === '{' || c === '}' || c === ';' || c === '@') {
      throw new Error('Inserisci soltanto selettori, senza regole, dichiarazioni o at-rule.')
    } else i++
  }
  const normalized = normalizeSelector(input)
  return splitList(normalized).map(selector => ({ selector, specificity: weight(selector) }))
}

const template = document.createElement('template')
template.innerHTML = `
<style>
  :host { display:block; min-width:0; margin-block:2rem; font:inherit; font-size:.875rem; color:inherit; }
  * { box-sizing:border-box; }
  .playground { padding:1rem; border:1px solid var(--playground-border,#b5b5b5); border-radius:var(--playground-radius,.5rem); background:var(--playground-background,transparent); }
  .toolbar,.actions { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.75rem; }
  .title { margin:0; font-size:1.125rem; font-weight:600; }
  .inputs { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr)); gap:1rem; margin-block:1rem; }
  label { display:block; font-weight:600; margin-block-end:.375rem; }
  textarea,button { color:inherit; background:transparent; font:inherit; border:1px solid var(--playground-border,#b5b5b5); border-radius:.25rem; padding:.5rem .75rem; }
  textarea { width:100%; min-height:5rem; resize:vertical; font-family:monospace; }
  button { cursor:pointer; }
  button:hover { background:rgb(128 128 128 / 10%); }
  button:disabled { opacity:.5; cursor:not-allowed; }
  :is(button,textarea,.table-wrap):focus-visible { outline:2px solid var(--playground-accent,#2563eb); outline-offset:2px; }
  .examples { display:flex; flex-wrap:wrap; gap:.5rem; margin-block:.5rem 1rem; }
  .examples button { font-size:.75rem; }
  .table-wrap { overflow:auto; }
  table { border-collapse:collapse; width:100%; text-align:left; font-variant-numeric:tabular-nums; }
  caption { text-align:left; font-weight:600; margin-block:.5rem; }
  th,td { padding:.5rem .375rem; border-bottom:1px solid var(--playground-border,#b5b5b5); vertical-align:top; }
  th:not(:first-child),td:not(:first-child) { text-align:center; }
  td:first-child { overflow-wrap:anywhere; word-break:break-word; }
  td code { font-family:monospace; }
  .weight { font-size:1rem; font-weight:700; }
  .error { margin:.25rem 0; color:inherit; border-inline-start:3px solid #b45309; padding-inline-start:.5rem; }
  .result { margin-block:1rem; padding:.75rem; border-inline-start:3px solid var(--playground-accent,#2563eb); background:rgb(128 128 128 / 8%); }
  .hint,.status { line-height:1.5; margin-block:.75rem 0; }
  [hidden] { display:none!important; }
</style>
<div class="playground">
  <div class="toolbar"><p class="title">CSS Specificity Calculator</p><button type="button" data-action="reset">Reset</button></div>
  <p class="hint">Inserisci uno o due selettori CSS, anche separati da virgole. Non inserire dichiarazioni o blocchi di stile.</p>
  <div class="inputs">
    ${['A','B'].map(k => `<div>
      <label for="selector-${k}">Selettore ${k}</label>
      <textarea id="selector-${k}" maxlength="4000" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="error-${k}"></textarea>
      <p id="error-${k}" class="error" hidden></p>
      <div class="table-wrap" tabindex="0" role="region" aria-label="Specificità selettore ${k}">
        <table><caption>Specificità ${k}</caption><thead><tr><th scope="col">Selettore</th><th scope="col" title="ID">A</th><th scope="col" title="Classi, attributi e pseudo-classi">B</th><th scope="col" title="Tipi e pseudo-elementi">C</th></tr></thead><tbody id="rows-${k}"></tbody></table>
      </div>
    </div>`).join('')}
  </div>
  <p class="hint"><strong>A</strong>: ID · <strong>B</strong>: classi, attributi e pseudo-classi · <strong>C</strong>: tipi e pseudo-elementi.</p>
  <p class="hint"><strong>Prova un esempio</strong></p>
  <div class="examples">${examples.map((e,i) => `<button type="button" data-example="${i}">${e[2]}</button>`).join('')}</div>
  <p class="result" role="status"></p>
  <div class="actions"><button type="button" data-action="copy">Copia risultati</button></div>
  <p class="status" role="status"></p>
  <p class="hint">Il confronto riguarda solo la specificità, non l'intera cascata CSS. Il parser del browser può scartare argomenti non validi nelle liste forgiving di :is() e :where().</p>
</div>`

export class SpecificityCalculator extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode:'open'}).append(template.content.cloneNode(true))
    this.inputs = ['A','B'].map(k => this.shadowRoot.getElementById(`selector-${k}`))
    this.result = this.shadowRoot.querySelector('.result')
    this.status = this.shadowRoot.querySelector('.status')
    this.copyButton = this.shadowRoot.querySelector('[data-action="copy"]')
    this.inputs.forEach(input => input.addEventListener('input', () => this.update()))
    this.shadowRoot.querySelector('[data-action="reset"]').addEventListener('click', () => this.load(0))
    this.shadowRoot.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => this.load(Number(button.dataset.example))))
    this.copyButton.addEventListener('click', () => this.copy())
    this.inputs.forEach((input,i) => { input.value = examples[0][i] })
  }
  connectedCallback() {
    this.dataset.version = '2.0.0'
    this.update()
  }
  load(index) { this.inputs.forEach((input,i) => { input.value = examples[index][i] }); this.update() }
  render(input, index) {
    const key = ['A','B'][index]
    const error = this.shadowRoot.getElementById(`error-${key}`)
    const tbody = this.shadowRoot.getElementById(`rows-${key}`)
    tbody.replaceChildren()
    error.hidden = true
    error.textContent = ''
    input.removeAttribute('aria-invalid')
    let results
    try { results = calculateSpecificity(input.value) }
    catch (e) { error.hidden = false; error.textContent = e.message; input.setAttribute('aria-invalid','true'); return null }
    if (!results.length) {
      const tr = tbody.insertRow(); const td = tr.insertCell(); td.colSpan = 4; td.textContent = 'Nessun selettore.'
    }
    for (const {selector,specificity} of results) {
      const tr = tbody.insertRow()
      const code = document.createElement('code'); code.textContent = selector; tr.insertCell().append(code)
      specificity.forEach(n => { const td = tr.insertCell(); td.className = 'weight'; td.textContent = n })
    }
    return results
  }
  update() {
    this.status.textContent = ''
    const [a,b] = this.inputs.map((input,i) => this.render(input,i))
    this.report = ''
    this.copyButton.disabled = true
    if (!a || !b) { this.result.textContent = 'Correggi i selettori non validi per continuare.'; return }
    if (!a.length && !b.length) { this.result.textContent = 'Inserisci almeno un selettore.'; return }
    if (a.length === 1 && b.length === 1) {
      const cmp = compareSpecificity(a[0].specificity,b[0].specificity)
      this.result.textContent = cmp === 0 ? 'I selettori hanno la stessa specificità.' : `Il selettore ${cmp > 0 ? 'A' : 'B'} ha maggiore specificità.`
    } else if (a.length > 1 || b.length > 1) {
      this.result.textContent = 'Ogni selettore della lista ha una specificità distinta. Il confronto automatico richiede un solo selettore per campo.'
    } else this.result.textContent = 'Specificità calcolata. Inserisci un secondo selettore per confrontarli.'
    this.report = [a,b].flatMap((list,i) => list.map(r => `${['A','B'][i]}: ${r.selector} = (${r.specificity.join(', ')})`)).concat(this.result.textContent).join('\n')
    this.copyButton.disabled = false
  }
  async copy() {
    try { await navigator.clipboard.writeText(this.report); this.status.textContent = 'Risultati copiati.' }
    catch { this.status.textContent = 'Copia automatica non disponibile. Seleziona i risultati manualmente.' }
  }
}
const registered = customElements.get('specificity-calculator')
if (!registered) {
  customElements.define('specificity-calculator', SpecificityCalculator)
} else if (registered !== SpecificityCalculator) {
  console.warn('[specificity-calculator] Componente già registrato: verifica che non sia caricato da due script.')
}
