/**
 * Express router for UI routes.
 * Handles static files (sitemap, robots.txt, favicon) and page rendering.
 * Supports internationalization with language prefixes (it|en).
 *
 * @module routes/ui.routes
 * @requires express
 * @requires path
 * @requires ../controllers/db.controller
 * @requires ../controllers/ui.controller
 * @requires url
 *
 * Routes:
 * - GET /sitemap.xml - Serves the sitemap file
 * - GET /robots.txt - Serves the robots.txt file
 * - GET /favicon.ico - Serves the favicon file
 * - GET /:lang/privacy - Displays privacy page
 * - GET /:lang/contacts - Displays contacts page
 * - GET /:lang - Displays home page
 * - GET / - Redirects to home page with browser's preferred language
 *
 * @constant {string} LANG_REGEX - Regex pattern for supported languages (it|en)
 */
// This code works with Express version 4.x

import express from 'express'
import path from 'path'
import { readFile } from 'node:fs/promises'
import { postViewController } from '../controllers/ui.controller.js'
import { fileURLToPath } from 'url'

const router = express.Router()
const TOPIC = 'html|css|javascript|nodejs|engineering|security'
const BASEURL = process.env.BASE_URL || 'https://progweb.it'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const rawData = await readFile(new URL('./../assets/posts/index.json', import.meta.url), 'utf8')
const postsIdx = JSON.parse(rawData)

const getLastPosts = () => {
  const data = []
  const size = 10
  for (let i = 0; i < postsIdx.length; i++) {
    data.push(postsIdx[i])
    if (i >= size) break
  }
  return data
}

const getPostsByTopic = (topic) => {
  const clone = structuredClone(postsIdx)
  const data = clone.filter((p) => {
    return p.topic = topic
  })
  return data
}

/*router.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/sitemap.xml'))
})*/
// sitemap.xml
router.get('/sitemap.xml', async(req, res) => {
  const deployed = '2026-11-25'
  const xml = `
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- HP -->
  <url>
    <loc>${BASEURL}</loc>
    <lastmod>${deployed}</lastmod>
    <changefreq>daily</changefreq>
  </url>
  <!-- Privacy -->
  <url>
    <loc>${BASEURL}/privacy</loc>
    <lastmod>2026-11-25</lastmod>
    <changefreq>monthly</changefreq>
  </url>
  <!-- Contatti -->
  <url>
    <loc>${BASEURL}/contatti</loc>
    <lastmod>2026-11-25</lastmod>
    <changefreq>monthly</changefreq>
  </url>
  <!-- Posts -->
  <url>
    <loc>${BASEURL}/posts</loc>
    <lastmod>${deployed}</lastmod>
    <changefreq>daily</changefreq>
  </url>
  <!-- HTML -->
  <url>
    <loc>${BASEURL}/html</loc>
    <lastmod>${deployed}</lastmod>
    <changefreq>daily</changefreq>
  </url>
  <!-- CSS -->
  <url>
    <loc>${BASEURL}/css</loc>
    <lastmod>${deployed}</lastmod>
    <changefreq>daily</changefreq>
  </url>
  <!-- JavaScript -->
  <url>
    <loc>${BASEURL}/javascript</loc>
    <lastmod>${deployed}</lastmod>
    <changefreq>daily</changefreq>
  </url>
  <!-- SW Engineering -->
  <url>
    <loc>${BASEURL}/engineer</loc>
    <lastmod>${deployed}</lastmod>
    <changefreq>daily</changefreq>
  </url>
  <!-- Cyber Security -->
  <url>
    <loc>${BASEURL}/security</loc>
    <lastmod>${deployed}</lastmod>
    <changefreq>daily</changefreq>
  </url>
  <!-- NodeJS -->
  <url>
    <loc>${BASEURL}/nodejs</loc>
    <lastmod>${deployed}</lastmod>
    <changefreq>daily</changefreq>
  </url>
  <!-- Post (Slugged) -->
    ${postsIdx.map(post => `
      <url>
        <loc>${BASEURL}/${post.topic}/${post.slug}</loc>
        <lastmod>${post.date}</lastmod>
        <changefreq>weekly</changefreq>
      </url>
    `).join('')}
  </urlset>`

  res.header('Content-Type', 'application/xml')
  res.send(xml.trim())
})
// robots.txt
router.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/robots.txt'))
})
// favicon.ico
router.get('/favicon.ico', (req, res) => {
  res.sendFile('/public/favicon.ico', { root: './app' })
})


// Privacy
router.get('/privacy', (req, res) => {
  const id = 'privacy'
  const breadcrumbs = [
    {
      title: 'Privacy'
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('privacy/privacy', { id, breadcrumbs, canonical })
})

// Contacts
router.get('/contatti', (req, res) => {
  const id = 'contacts'
  const breadcrumbs = [
    {
      title: 'Contatti'
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('contacts/contacts', { id, breadcrumbs, canonical })
})

// Home page
router.get('/', async(req, res) => {
  const posts = getLastPosts()
  const lastPosts = posts
  const id = 'home'
  const breadcrumbs = null
  const canonical = `${BASEURL}${req.path}`
  res.render('home/home', { id, breadcrumbs, canonical, posts, lastPosts })
})


// TOPIC
// all posts
router.get('/posts', (req, res) => {
  const posts = postsIdx
  const lastPosts = getLastPosts()
  const id = 'posts'
  const breadcrumbs = [
    {
      title: 'Gli ultimi post'
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('posts/posts', { id, breadcrumbs, canonical, posts, lastPosts })
})
// html
router.get('/html', (req, res) => {
  const posts = getPostsByTopic('html')
  const lastPosts = getLastPosts()
  const id = 'html'
  const breadcrumbs = [
    {
      title: 'Hyper Text Markup Language'
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('topic/html/html', { id, breadcrumbs, canonical, posts, lastPosts })
})
// css
router.get('/css', (req, res) => {
  const posts = getPostsByTopic('css')
  const lastPosts = getLastPosts()
  const id = 'css'
  const breadcrumbs = [
    {
      title: 'Cascading Style Sheets'
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('topic/css/css', { id, breadcrumbs, canonical, posts, lastPosts })
})
// javascript
router.get('/javascript', (req, res) => {
  const posts = getPostsByTopic('javascript')
  const lastPosts = getLastPosts()
  const id = 'javascript'
  const breadcrumbs = [
    {
      title: 'JavaScript'
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('topic/javascript/javascript', { id, breadcrumbs, canonical, posts, lastPosts })
})
// engineering
router.get('/engineering', (req, res) => {
  const posts = getPostsByTopic('engineering')
  const lastPosts = getLastPosts()
  const id = 'engineering'
  const breadcrumbs = [
    {
      title: 'Software Engineering'
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('topic/engineering/engineering', { id, breadcrumbs, canonical, posts, lastPosts })
})
// cyber security
router.get('/security', (req, res) => {
  const posts = getPostsByTopic('security')
  const lastPosts = getLastPosts()
  const id = 'security'
  const breadcrumbs = [
    {
      title: 'Cyber Security'
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('topic/security/security', { id, breadcrumbs, canonical, posts, lastPosts })
})
// nodejs
router.get('/nodejs', (req, res) => {
  const posts = getPostsByTopic('nodejs')
  const lastPosts = getLastPosts()
  const id = 'nodejs'
  const breadcrumbs = [
    {
      title: 'NodeJS'
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('topic/nodejs/nodejs', { id, breadcrumbs, canonical, posts, lastPosts })
})

// Posts
router.get(`/:topic(${TOPIC})/:slug`, (req, res) => postViewController(req, res))


export default router
