## Project Initialization

- Create a Next.js App Router project for a portfolio. Before editing, propose a route map for Home, About, Projects, and Contact plus one dynamic project route. Use TypeScript and plain CSS already supported by the project. Keep data in a local typed file for now. Do not add authentication, a database, or a UI library. After approval, scaffold only the route files and verify each URL loads.

- I just updated the file p1_requirements.md, make sure the project path is properly defined and implemented in the code.

## Assessment

- review the code against p1_requirements.md and p1_rubrics.md, summarize gaps in the current code implementation.
- give me the commandline to run this web app on my dev laptop, and give me the url for browser access.
- do we have shared site header/footer? if not, Implement a shared site header and footer in the root layout. The header needs the portfolio name, links to Home, About, Projects, and Contact, a visible keyboard focus state, and a mobile-safe wrapping behavior. Use semantic nav, main, and footer elements. Keep the design intentionally simple. Run lint and inspect all five routes at narrow and wide widths.
- go ahead and fix gaps in A2-05/06/07
- do we have a typed Project model?
- do we have reusable ProjectCard and render the collection on /projects?
- what's "Alex Rivera" test submission? what's to be fixed about it?
- review the code, find out the root cause for persist "Your message has been sent. Thank you!" notice on 'Contact Me" page. **edited code without approval!!!!**
- As a senior software developer, review the code to find out bugs and identify the root cause.
- As a senior qa engineer, verify the above 4 bugs.
- Document the 4 bugs and the reproduction steps in file BUGS.md
- As a senior software developer, fix the bugs in  BUGS.md one by one, than verify them one by one as senior qa engineer.
- what's wrong? <code>Error: Route "/projects/[slug]": Next.js encountered uncached or runtime data during prerendering.

`fetch(...)`, `cookies()`, `headers()`, `params`, `searchParams`, or `connection()` accessed outside of `<Suspense>` prevents the route from being prerendered, blocking the page load and leading to a slower user experience.


Ways to fix this:
  - [stream] Provide a placeholder with `<Suspense fallback={...}>` around the data access
  - [cache] For uncached data (`fetch`, database calls): cache the access with `"use cache"` (does not apply to `connection()`)
  - [block] Set `export const instant = false` to allow a blocking route


Learn more: https://nextjs.org/docs/messages/blocking-prerender-dynamic
    at main (<anonymous>)
    at body (<anonymous>)
    at html (<anonymous>)
To get a more detailed stack trace and pinpoint the issue, try one of the following:
  - Start the app in development mode by running `next dev`, then open "/projects/[slug]" in your browser to investigate the error.
  - Rerun the production build with `next build --debug-prerender` to generate better stack traces.
⨯ Error: 
    at async m (.next/server/chunks/ssr/[root-of-the-server]__03s38g7fsdgmc._.js:1:12027) {
  code: 'NEXT_STATIC_GEN_BAILOUT'
}
</code>


## Design
- give me 3 most popular project management websites, and quickly/concisely summarize their ui styles
- let's follow Trello's style, give me a visual effect of ui design for our project.


## New functions/pages
- implement a new mode 'admin', design an authentication mechanism to change to admin mode
- in admin mode, new pages are accessible: 'Site config' (website settings) and 'Contact requests' (list of contact requests)




