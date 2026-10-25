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
import { postViewController } from '../controllers/ui.controller.js'
import { fileURLToPath } from 'url'

const router = express.Router()
const TOPIC = 'html|css|js|node|eng|sec'
const BASEURL = process.env.BASE_URL || 'https://progweb.it'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

router.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/sitemap.xml'))
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
  const title = 'Privacy'
  const breadcrumbs = [
    {
      title
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('privacy/privacy', {  id, breadcrumbs, canonical })
})

// Contacts
router.get('/contatti', (req, res) => {
  const id = 'contacts'
  const title = 'Contatti'
  const breadcrumbs = [
    {
      title
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('contacts/contacts', { id, breadcrumbs, canonical })
})

// Home page
router.get('/', (req, res) => {
  const id = 'home'
  const breadcrumbs = []
  const canonical = `${BASEURL}${req.path}`
  res.render('home/home', { id, breadcrumbs, canonical })
})


// TOPIC
// all posts
router.get('/posts', (req, res) => {
  const id = 'posts'
  const title = 'Gli ultimi post'
  const breadcrumbs = [
    {
      title
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('posts', { id, breadcrumbs, canonical })
})
// html
router.get('/html', (req, res) => {
  const id = 'html'
  const title = 'Hyper Text Markup Language'
  const breadcrumbs = [
    {
      title
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('topic/html/html', { id, breadcrumbs, canonical })
})
// css
router.get('/css', (req, res) => {
  const id = 'css'
  const title = 'Cascading Style Sheets'
  const breadcrumbs = [
    {
      title
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('topic/css/css', { id, breadcrumbs, canonical })
})
// js
router.get('/javascript', (req, res) => {
  const id = 'js'
  const title = 'JavaScript'
  const breadcrumbs = [
    {
      title
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('topic/js/js', { id, breadcrumbs, canonical })
})
// engineering
router.get('/engineering', (req, res) => {
  const id = 'engineering'
  const title = 'Software Engineering'
  const breadcrumbs = [
    {
      title
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('topic/eng/eng', { id, breadcrumbs, canonical })
})
// cyber security
router.get('/security', (req, res) => {
  const id = 'security'
  const title = 'Cyber Security'
  const breadcrumbs = [
    {
      title
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('topic/sec/sec', { id, breadcrumbs, canonical })
})
// node
router.get('/nodejs', (req, res) => {
  const id = 'node'
  const title = 'NodeJS'
  const breadcrumbs = [
    {
      title
    }
  ]
  const canonical = `${BASEURL}${req.path}`
  res.render('topic/node/node', { id, breadcrumbs, canonical })
})



// Posts
router.get(`/:topic(${TOPIC})/:slug`, (req, res) => postViewController(req, res))


export default router
