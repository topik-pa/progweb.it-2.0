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
  const breadcrumbs = [{ id }]
  const canonical = `${BASEURL}${req.path}`
  res.render('privacy/privacy', {  id, breadcrumbs, canonical, data: [] })
})

// Contacts
router.get('/contacts', (req, res) => {
  const id = 'contacts'
  const breadcrumbs = [{ id }]
  const canonical = `${BASEURL}${req.path}`
  res.render('contacts/contacts', { id, breadcrumbs, canonical, data: [] })
})

// Home page
router.get('/', (req, res) => {
  const id = 'home'
  const breadcrumbs = [{ id }]
  const canonical = `${BASEURL}${req.path}`
  res.render('home/home', { id, breadcrumbs, canonical, data: [] })
})

// Posts
router.get(`/:topic(${TOPIC})/:slug`, (req, res) => postViewController(req, res))


export default router
