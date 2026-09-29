# Live WordPress blog on the NPDA site

Replace the hardcoded sample posts with real articles from blog.npdacademy.com, shown on bootcamp.npdacademy.com/blog in the existing design. Articles open on your site, never on the WordPress domain.

## What visitors get
- **/blog**: featured latest article, responsive card grid (image, title, excerpt, date, author, category), category chips, search box, "Load more" (uses WordPress page counts). Skeletons while loading, friendly empty and "try again" states.
- **/blog/{slug}**: full article with image, author, date, formatted content (headings, lists, links, images), back-to-blog link, 3 related posts from the same category. Refreshing or sharing the link works; unknown slugs show a not-found page.
- Home page "From the blog" shows the 3 newest real posts.
- Each article gets its own Google title, description and share picture (its featured image).

## Technical details
- `src/lib/wordpress.server.ts`: single WordPress client (base `https://blog.npdacademy.com/wp-json/wp/v2`), checks status, reads `X-WP-TotalPages`, per_page max 12, timeouts, maps to plain DTOs, short in-memory cache.
- `src/lib/blog.functions.ts`: public `createServerFn`s `listPosts({page,category,search})`, `listCategories()`, `getPost(slug)`. Server-side fetch avoids CORS entirely.
- HTML sanitized server-side with `sanitize-html` (Worker-safe) allowing formatting, images, links (`rel="noopener"` + `target="_blank"` for external), responsive iframes from YouTube/Vimeo only.
- New real file routes `src/routes/blog.index.tsx` and `src/routes/blog.$slug.tsx` (take precedence over the splat) using React Query loaders for SSR, sharing the site header/footer styling; head() per article incl. og:image. Remove `P.blog`/`P.post`/`POSTS` sample data from `app.js`; home block fetches via a small hook.
- Fallback image: existing `public/og-image.jpg`; `onError` swaps to it.
- Sitemap: add a dynamic `/sitemap.xml` server route listing static pages plus WordPress posts (replacing the static file).
- Verify: curl the API (already returns 200), Playwright at 375/1280 for list, filter, search, load more, article, refresh.
