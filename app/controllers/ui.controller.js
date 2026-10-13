/**
 * Renders a view with localization support and SEO metadata
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Array} [breadcrumbs=[]] - Array of breadcrumb objects for navigation
 * @param {Array} [data={}] - Additional data to pass to the view
 * @returns {void}
 * @description
 * This controller handles view rendering with the following features:
 * - Generation of canonical URLs tag for SEO
 */

import { readFile } from 'node:fs/promises'
import logger from '../configs/logger.js'

const BASEURL = process.env.BASE_URL || 'https://progweb.it'

// Controller for slugged routes (posts)
export async function postViewController(req, res) {
  const id = 'post'
  const topic = req.params.topic
  const slug = req.params.slug
  const canonical = `${BASEURL}${req.path}`

  let data = {}
  try {
    const raw = await readFile(new URL(`./../assets/posts/${topic}/${slug}.json`, import.meta.url), 'utf8')
    data = JSON.parse(raw)
  } catch (err) {
    logger.error(new Error(`❌ Error during data retrieval for post: ${slug}\n${err}`))
    return res.status(404).render('4xx/404')
  }

  const breadcrumbs = [
    {
      name: topic,
      url: `/${topic}`
    },
    {
      name: data.title
    }
  ]
  res.render('post/post', { id, breadcrumbs, canonical, topic, slug, data })
}
