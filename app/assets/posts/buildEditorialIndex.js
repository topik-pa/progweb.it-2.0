
import editorialPlan from './editorial-plan.js'

export function buildEditorialIndex(
  publishedPosts,
  activeCategory = null
) {
  const selectedCategory = editorialPlan.find(
    category => category.slug === activeCategory
  )

  if (activeCategory && !selectedCategory) {
    throw new Error(`Categoria sconosciuta: ${activeCategory}`)
  }

  const categories = editorialPlan.map(category => {
    const posts = publishedPosts.filter(
      post => post.topic === category.slug
    )

    const sortPosts = posts => [...posts].sort((a, b) => {
      const orderA = a.editorialOrder ?? Number.MAX_SAFE_INTEGER
      const orderB = b.editorialOrder ?? Number.MAX_SAFE_INTEGER

      return orderA - orderB ||
        a.title.localeCompare(b.title, 'it')
    })

    const topics = category.topics.map(topic => ({
      ...topic,
      posts: sortPosts(
        posts.filter(post => post.sub === topic.slug)
      )
    }))

    // Evita di escludere dall'indice eventuali post
    // non ancora assegnati a un'area tematica.

    const knownTopics = new Set(
      category.topics.map(topic => topic.slug)
    )

    const unassignedPosts = posts.filter(
      post => !knownTopics.has(post.sub)
    )

    if (unassignedPosts.length) {
      topics.push({
        slug: 'other',
        name: 'Altri approfondimenti',
        posts: sortPosts(unassignedPosts)
      })
    }

    return {
      ...category,
      count: posts.length,
      topics: topics.filter(topic => topic.posts.length > 0)
    }
  })

  const groups = categories.filter(category =>
    category.count > 0 &&
    (!activeCategory || category.slug === activeCategory)
  )

  const visiblePosts = groups.flatMap(category =>
    category.topics.flatMap(topic => topic.posts)
  )

  const tools = new Set(
    visiblePosts
      .map(post => post.tool?.component)
      .filter(Boolean)
  )

  return {
    activeCategory,

    pageTitle: selectedCategory
      ? selectedCategory.name
      : 'Programmazione Web: tutti gli articoli',

    pageDescription: selectedCategory
      ? selectedCategory.description
      : 'Guide, approfondimenti e strumenti interattivi dedicati allo sviluppo web.',

    categories,
    groups,

    totalPosts: publishedPosts.length,
    postCount: visiblePosts.length,
    toolCount: tools.size
  }
}
