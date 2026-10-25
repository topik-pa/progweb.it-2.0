/* eslint-disable max-len */
/* eslint-disable no-console */
import sharp from 'sharp'
import path from 'path'

// Recupera i parametri da riga di comando
const [,, topic, slug, title, subtitle, subtitle2] = process.argv

if (!topic || !slug, !title || !subtitle) {
  console.error('Uso: node add-text.js "<topic>" "<titolo>" "<sottotitolo>"')
  process.exit(1)
}

function escapeXml(unsafe) {
  console.log('undafe', unsafe)
  return (''+unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
    case '<': return '&lt;'
    case '>': return '&gt;'
    case '&': return '&amp;'
    case '\'': return '&apos;'
    case '"': return '&quot;'
    default: return c
    }
  })
}


async function addTextToImage() {
  try {
    // 1. Carica l'immagine per ottenerne le dimensioni
    const imagePath = path.join(import.meta.dirname, `${topic}.png`)
    const image = sharp(imagePath)
    const metadata = await image.metadata()

    console.log(metadata)

    // 2. Definisci le coordinate di partenza richieste
    const startX = 40
    const startY = 135

    // 3. Crea il codice SVG con stili, font e ombreggiature differenti
    // L'ombra viene gestita tramite il tag <filter> di SVG
    // CORREZIONE: Assicurati che l'attributo xmlns sia identico a questo
    const svgOverlay = `
  <svg width="${escapeXml(metadata.width)}" height="${escapeXml(metadata.height)}">
    <defs>
      <!-- Filtro per l'ombreggiatura del titolo -->
      <filter id="title-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="1" stdDeviation="0" flood-color="#000000" flood-opacity="1"/>
      </filter>

      <!-- Filtro per l'ombreggiatura del sottotitolo -->
      <filter id="subtitle-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="4" flood-color="#333333" flood-opacity="0.5"/>
      </filter>
    </defs>

    <style>
      .title {
        font-family: 'Liberation Sans', sans-serif;
        font-size: 64px;
        letter-spacing: 7px;
        font-weight: bold;
        fill: #FFFFFF;

      }
      .subtitle {
        font-family: 'Courier New', monospace;
        font-size: 42px;
        fill: #000000;
      }
    </style>

    <!-- Titolo principale posizionato a X=50, Y=90 -->
    <text x="${escapeXml(startX)}" y="${escapeXml(startY)}" class="title" filter="url(#title-shadow)">${escapeXml(title)}</text>

    <!-- Sottotitolo posizionato sotto al titolo (Math prima di escape) -->
    <text x="${escapeXml(startX)}" y="${escapeXml(startY + 90)}" class="subtitle">${escapeXml(subtitle)}</text>

    <text x="${escapeXml(startX)}" y="${escapeXml(startY + 147)}" class="subtitle">${escapeXml(subtitle2)}</text>
  </svg>
`



    // 4. Converte la stringa SVG in un Buffer
    // const svgBuffer = Buffer.from(svgOverlay)

    // 5. Sovrappone l'SVG all'immagine originale e salva il file di output
    const parsedPath = path.parse(imagePath)
    //const outputPath = path.join(parsedPath.dir, `${parsedPath.name}-marked${parsedPath.ext}`)

    const masterImageBuffer = await sharp(imagePath)
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
      .webp({ quality: 100 })
      .toBuffer()

    const path1200 = path.join(parsedPath.dir, `${slug}.webp`)
    await sharp(masterImageBuffer).toFile(path1200)
    console.log(`Generato formato master: ${path1200}`)

    const path1024 = path.join(parsedPath.dir, `${slug}-m.webp`)
    await sharp(masterImageBuffer)
      .resize(1024, 538)
      .toFile(path1024)
    console.log(`Generato formato ridotto: ${path1024}`)

    const path768 = path.join(parsedPath.dir, `${slug}-s.webp`)
    await sharp(masterImageBuffer)
      .resize(768, 404)
      .toFile(path768)
    console.log(`Generato formato ridotto: ${path768}`)

    console.log('Tutti i formati sono pronti!')
  } catch (error) {
    console.error('Errore durante l\'elaborazione dell\'immagine:', error)
  }
}

addTextToImage()
