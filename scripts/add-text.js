/* eslint-disable max-len */
/* eslint-disable no-console */
import sharp from 'sharp'
import path from 'path'

// Recupera i parametri da riga di comando
const [,, topic, title, subtitle] = process.argv

if (!topic || !title || !subtitle) {
  console.error('Uso: node add-text.js "<topic>" "<titolo>" "<sottotitolo>"')
  process.exit(1)
}

console.log('Topic: ', topic)
console.log('Title: ', title)
console.log('Subtitle: ', subtitle)

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
    const startX = 50
    const startY = 90

    // 3. Crea il codice SVG con stili, font e ombreggiature differenti
    // L'ombra viene gestita tramite il tag <filter> di SVG
    // CORREZIONE: Assicurati che l'attributo xmlns sia identico a questo
    const svgOverlay = `
  <svg width="${escapeXml(metadata.width)}" height="${escapeXml(metadata.height)}">
    <defs>
      <!-- Filtro per l'ombreggiatura del titolo -->
      <filter id="title-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="3" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.6"/>
      </filter>

      <!-- Filtro per l'ombreggiatura del sottotitolo -->
      <filter id="subtitle-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="4" flood-color="#333333" flood-opacity="0.5"/>
      </filter>
    </defs>

    <style>
      .title {
        font-family: 'Arial', sans-serif;
        font-size: 48px;
        font-weight: bold;
        fill: #FF5733;
      }
      .subtitle {
        font-family: 'Georgia', serif;
        font-size: 24px;
        font-style: italic;
        fill: #FFFFFF;
      }
    </style>

    <!-- Titolo principale posizionato a X=50, Y=90 -->
    <text x="${escapeXml(startX)}" y="${escapeXml(startY)}" class="title" filter="url(#title-shadow)">${escapeXml(title)}</text>

    <!-- Sottotitolo posizionato sotto al titolo (Math prima di escape) -->
    <text x="${escapeXml(startX)}" y="${escapeXml(startY + 45)}" class="subtitle" filter="url(#subtitle-shadow)">${escapeXml(subtitle)}</text>
  </svg>
`



    // 4. Converte la stringa SVG in un Buffer
    const svgBuffer = Buffer.from(svgOverlay)

    // 5. Sovrappone l'SVG all'immagine originale e salva il file di output
    const parsedPath = path.parse(imagePath)
    const outputPath = path.join(parsedPath.dir, `${parsedPath.name}-marked${parsedPath.ext}`)

    await image
      .composite([{ input: svgBuffer, top: 0, left: 0 }])
      .toFile(outputPath)

    console.log(`Immagine creata con successo: ${outputPath}`)
  } catch (error) {
    console.error('Errore durante l\'elaborazione dell\'immagine:', error)
  }
}

addTextToImage()
