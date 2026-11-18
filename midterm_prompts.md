# Midterm prompts

## Working agreement (start of each session)

I'm turning my portfolio site (this repo) into a content creation website, one stage at a time: a place where I write and manage blog posts, projects and other content with the help of a multimodal AI assistant that takes text and images. Tech stack includes Next.js, React, TypeScript and plain CSS, and it stores data in JSON files under data/.

How I'd like you to work:

- Every stage runs as a cycle. I ask for a change and you build it. Then I ask for a review, where you explain and test what you built without editing anything. Then I ask for specific revisions.
- Stay within the scope of each request. If something outside it should change, tell me instead of changing it.
- Lint, tests and the production build all pass today (npm run lint, npm test, npm run build). Keep them passing.
- End each build or revision by telling me what you changed and why, any decision you made that I didn't specify, and how I can see it working.

## 1. Continue the Assignment 2 portfolio

### 1. Prompt: take stock and plan

Before we add anything, I want to be sure of what we're building on. Don't edit files in this step.

Take stock of the site as it stands: the pages and what each one shows, the API endpoints, the JSON stores, the admin area and the reusable components. Run lint, the tests and a production build, load every page, and tell me about anything that's already broken, because everything that works today has to keep working through the changes ahead.

Then plan those changes. I want to turn this portfolio into a content creation website. The public pages stay, and the admin area becomes a studio where I write and manage blog posts and projects with the help of a multimodal AI assistant that takes text and images. In this order:

1. A browser-only feature: writing briefs. Before I write a piece I note what it's for: a working title, the type of content, the audience, the tone and the key points. Briefs are saved in my own browser with localStorage.
2. A new backend feature: an idea board with an AI assistant. I give the assistant my notes, optionally a saved brief and an image such as a screenshot or a photo, and it suggests a title, a summary and a body. I keep the suggestions I like as ideas, which live in their own JSON store and are reached through their own API.
3. Complete create, read, update and delete for everything the API serves: projects, blog posts, contact submissions and ideas, each through REST endpoints and a studio screen that calls them, plus a way to start a blog post or project from an idea. Today that's only partly there: blogs can be created and read through /api/blogs, contact submissions can only be created, and projects have no API at all (they're added through a server action).
4. Reusable components for the UI that's repeated inline, such as blog cards, form fields and the site header.

For each of these, tell me what already exists and what's missing, and the files you'd add or change. Include a table of the API endpoints you propose with method, path, who may call it and the status codes it returns. Point out where this Next.js version's caching or prerendering rules will constrain the design, what the AI assistant adds in dependencies, secrets, cost and failure modes, and anything in my list you'd approach differently.

Put your plan in midterm_plan.md file, we will use it throughout the assignment.

## 2. Add a LocalStorage feature: writing briefs

### 2a. Prompt: build the briefs feature

Check below requirements for stage 1, adjust the plan accordingly.

Add a browser-only feature to the studio: writing briefs, at /admin/briefs.

What a brief is for: it's a short planning note for one piece of content I intend to write. It records what the piece is, who it's for, how it should sound and what it has to cover. A brief produces nothing by itself. Its job comes in the next stage, when the AI assistant gets a "Start from a brief" option: picking a brief fills in the assistant's request, so the model knows what to write, for whom and in what tone. The path a piece of content will take is a brief in my browser, then a suggestion from the assistant, then an idea saved on the server, and finally a blog post or project. Don't build the assistant hook-up now; in this stage a brief only needs to be saved, listed, edited and deleted.

Briefs are my private working notes, so they are saved only in my own browser with localStorage. Nothing on this page talks to the server, and the page should say so. A brief's text leaves the browser only later, when I choose to send it to the assistant.

A brief has a working title, a type (Blog post or Project), an audience, a tone (Friendly, Professional or Technical) and key points. I fill in the form and save it with a button. Saved briefs are listed newest first, and each can be edited or deleted, with a way to clear them all. After a refresh the same briefs are there. With nothing saved, the page shows an empty state. Add the page to the admin navigation.

How I'd like it built, so the path from input to storage and back is easy to trace:

- Keep the storage logic (the key, turning the stored string into validated briefs, and turning briefs back into a string) in a small module of pure functions that can be unit-tested without a browser.
- The page keeps the briefs in React state. Each user action updates state and writes to localStorage, and the initial state comes from reading and parsing what's stored.
- The brief form and each brief are components that receive their data and callbacks through props.


I have below comments, make sure they are properly addressed.

The parts that need care:

- localStorage doesn't exist during server rendering, and reading it during the first client render causes a hydration mismatch. The common fix of loading in useEffect and then calling setState fails lint in this repo (react-hooks/set-state-in-effect is an error). Find the simplest approach that is hydration-safe and passes lint, tell me what it is and why, then build it.
- Stored data can be missing, malformed, or valid JSON in the wrong shape. None of those may break the page or the rest of the site. If the data can't be used, start with an empty list and tell me the saved briefs couldn't be read.
- Writing can fail when storage is full or disabled. Say so on the page and keep it working.
- Briefs hold text only. Images don't belong in localStorage, so they're attached later, when I ask the assistant.

Unit-test the parsing against missing, malformed and wrong-shaped values.

### 2b. Review: the briefs feature

Review the briefs feature. Don't change any code.

Walk me through the two paths in the order the data moves: from filling in a brief to the string that ends up in localStorage, and from that string after a refresh back to what's shown on the page. Name the file and function at each point.

Then test it in a browser and tell me what you saw at each step: save two briefs and refresh; look at the stored value in DevTools; corrupt the stored value by hand and refresh; delete it and refresh. After each one, check that the other pages still work.

Finish with anything that failed, anything you couldn't check, and what you're least sure about. If you can't drive a browser, say so and give me the steps to run myself.

## 3. Add a backend feature: idea board with a multimodal AI assistant

### 3a. Prompt: build the idea board

Add a new feature to the studio: an idea board. An idea is a piece of content that isn't published yet: a title, a one-line summary and a body, meant to become either a blog post or a project. Ideas are kept on the server, and the page reaches them through an API. Next I'll add an AI assistant that suggests ideas, so each idea also records where it came from: written by hand, suggested by the assistant, or suggested from an image.

Give ideas their own JSON store, built the same way as blogs: types and a couple of placeholder seed entries in src/data/, and the store, validation and data functions in src/lib/. Use the length limits that blog posts and projects already enforce for their own fields, so an idea can become either one later without being cut down.

API at /api/ideas: list, read one, create, update and delete. Decisions I've made:

- Ideas are unpublished work, so every call, reads included, requires the existing admin session (isAdmin in src/lib/session.ts).
- Follow the conventions of the handlers already in src/app/api/: the same response shape, 201 for a create, 400 with per-field errors for invalid input, 401 without a session, 404 for an unknown idea.
- I want to match API calls to server output when I demo and debug, so every API request should print one line with its method, path and status to the server terminal. Put that, the admin check and the JSON body parsing in one small shared module instead of repeating them in each handler. The existing handlers will move onto it in the next stage.

Page at /admin/ideas, in the admin navigation. It's a client component that loads the ideas from the API with fetch, the way the blogs list does, with loading, error and empty states, a filter by type, and a form for adding an idea by hand.

Leave editing and deleting ideas on screen for the next stage, when I build the screens for every content type together. Add unit tests for the store and validation.

### 3b. Prompt: add the multimodal assistant

Add an AI assistant to the idea board. I describe what I want to write, optionally start from a saved brief and optionally attach an image, such as a screenshot of a project or a photo, and the assistant suggests a title, a one-line summary and a body. The suggestion appears in the idea form, where I can edit it and then save it as an idea. The assistant never saves or publishes anything by itself.

How it should work:

- A new endpoint, POST /api/assistant, takes the type of content, my notes, the brief details if there are any and the image if there is one, calls the model and returns the suggestion. It requires the admin session, because every call costs money.
- Use Anthropic's Claude API through the official TypeScript SDK (@anthropic-ai/sdk) with the model claude-opus-5-5, sending the image and the text together in one message. Ask for the title, summary and body as structured output, not free text to be parsed, and within the length limits ideas already have. Read the current API documentation for image input, structured output and refusal handling, including the fallback option, before writing the call: several parameters have changed recently and older examples no longer work.
- The API key comes from an environment variable and is only ever read on the server. Document it in .env.example. Without a key, the endpoint answers with a clear "assistant is not configured" error and the page says so, while everything else keeps working.
- "Start from a brief" reads the briefs saved in this browser through the briefs storage module and fills in the request.
- Accept PNG, JPEG, WebP and GIF images up to the size the API allows, and reject anything else with a clear message before calling the model. The image is used for that one request: don't store it and don't log it.
- The model can decline a request, and the call can fail or take a while. Show a pending state while waiting and a clear message for each kind of failure. A single request and response is enough; I don't need streaming.

Unit-test the request validation and the handling of the model's reply with the model call replaced by a stub, so the tests need no key and no network.

### 3c. Review: the idea board and the assistant

Review the idea board and the assistant. Don't change any code.

Explain two paths, naming the file and function at each point: how a list request travels from the fetch on the page to the route handler to the store to the JSON file and back, and how an assistant request travels from the form, with its text and image, to the route handler, to the model and back into the idea form. Show me where the API key is read and confirm it can't reach the browser or the repository.

Then call every ideas endpoint against the running app and show me, for each call, the status it returned and the line it logged: list, read one, a valid create, an invalid create, an update, a delete, an unknown id, and a call without an admin session. Confirm that data/ideas.json changes after each successful write. The calls need the admin session cookie from signing in at /admin/login; if you can't obtain it, give me the commands to run myself.

Then try the assistant and tell me what came back each time and how long it took: notes only; notes with an image; starting from a saved brief; an unsupported file; and with no key configured. If you have no key to test with, say so and give me the steps.

Finish with anything that failed, anything you couldn't check, and what you're least sure about.

## 4. Build CRUD interfaces for every object type

### 4a. Prompt: the API

Bring projects, blog posts and contact submissions up to the same level as ideas, so that each can be listed, read individually, created, updated and deleted through the API, with every change saved through the existing JSON stores in src/lib/. Projects need a new /api/projects resource; blogs and contacts need the methods they're missing. Move the existing handlers onto the shared helpers from the ideas API so all four resources log and respond alike. This step is the API and data layer only; the screens come next.

Decisions I've made:

- Writes require the admin session, except creating a contact submission, which stays public. Reading contact submissions is admin-only too, because they contain visitors' email addresses. Reading projects and blog posts stays public.
- A duplicate slug returns 409, as it does for blogs today.
- An update edits an item's content but never its slug or id, so existing URLs keep working.
- Each content type has one set of validation rules in src/lib/ that every entry point uses. Project validation currently lives inside the add-project server action, so move it.

One thing to watch: the project list is cached with "use cache" and a cache tag in src/lib/projects.ts. Each project write has to invalidate that tag from the route handler or the public pages will show stale data. How to do that from a route handler changed in this Next.js version, so check the bundled docs, and confirm it against a production build, since the dev server doesn't cache the same way.

Extend the existing unit tests in src/lib/ to cover the new update and delete functions.

### 4b. Prompt: the studio screens

Build the studio screens for managing all four content types through the API: projects, blog posts, contact submissions and ideas. On each screen I should be able to see the list, create an item, edit one and delete one.

These screens should be client components that call the API with fetch, not server actions and not direct reads of the JSON stores. I want the API to be the single path for every change, so that what I see in the browser's Network tab is the whole story.

- Projects: a new management screen that replaces the current add-project page and its server action. Redirect the old URL to the new one.
- Blog posts: the admin page only has a create form today; add the list, editing and deleting.
- Contact submissions: the admin page reads the store directly today; load it through the API and add editing and deleting. Creating one stays on the public contact form.
- Ideas: the idea board can already list ideas and create them, by hand or from the assistant; add editing and deleting.

The idea board is where content starts, so connect it to the other two: from an idea I can start a new blog post or a new project with the title, summary and body already filled in, ready for me to edit and save through the normal create form.

The public pages shouldn't change. Update the admin navigation so it reads as a studio: briefs, ideas and assistant, blog posts, projects and contact requests, alongside the existing settings pages.

On every screen, the list should update after each change without a manual reload, every action should show clear success or failure using the existing FormFeedback component, validation errors from the API should appear beside their fields, deleting should ask for confirmation, and loading, empty and failed states should each say what's happening.

The screens are similar, so share the small pieces, such as a labelled form field with its error and a delete button with confirmation, as components in src/components/. Don't go further and build a generic CRUD framework: I'd rather have four screens I can read top to bottom.

### 4c. Review: the CRUD work

Review the CRUD work as a QA engineer. Don't change any code.

For each of the four content types, go through create, read, update and delete on its studio screen. For every operation tell me the request it made (method, path and status), the line the server logged, and whether the change was in the matching file under data/ after a reload. Also check an invalid submission on each form, an admin-only endpoint without a session, and, for projects, that the home page, the projects page and a deleted project's URL reflect each change. Repeat the project checks against a production build, where caching behaves differently.

Then follow one piece of content all the way through: start a blog post from an idea, save it, and confirm it appears on the public blogs page. Do the same for a project.

Report the problems as a numbered list, most serious first, with steps to reproduce each and its likely cause. I'll tell you which to fix. Then walk me through one create from the form to the JSON file, naming the file and function at each point. If you can't drive a browser, say so and give me the checklist to run myself.

## 5. Componentize

### 5a. Prompt: refactor into components

Do a refactoring pass to turn repeated UI into reusable components. Nothing should behave or look different afterwards.

Start with the repeated content. Projects already have a ProjectCard component, but blog posts and ideas are rendered inline by the lists that fetch them. Give each its own card component in src/components/ that receives one item through props, so the list does the fetching and the card does the displaying. IdeaCard is the one I'll use to show how data moves from a parent to a child, so keep it purely presentational: typed props for the idea and for the actions on it, no fetching and no state of its own.

Other repetition I've noticed, which you should confirm and add to:

- The same date formatting and the same tag-list markup each appear in more than one page.
- The site header, navigation and footer are written inline in the root layout.
- The two public contact forms build their own fields instead of using the shared field component.
- Every admin page repeats the same heading and access-check wrapper.

Extract a component where it removes real duplication or gives a repeated piece of content a clear name. Where it would only add indirection, leave the code alone and tell me what you skipped and why. Keep components in src/components/ with typed props, and don't turn server components into client components to do it.

Finish with an inventory of the components: what each one is, the props it takes and where it's used.

### 5b. Review: the refactor

Review the refactor. Don't change any code.

For the idea board, show me the exact lines where the ideas are fetched from the API, where they're kept in state, where the parent passes an idea to IdeaCard, and where IdeaCard uses its props. Do the same for the blogs list and BlogCard.

Then confirm nothing changed for visitors or in the studio: every page renders as it did before, and lint, the tests and the build pass. Tell me which of the new components have only one caller and whether each is still worth having.

## 6. Demonstrate

### 6. Prompt: rehearse the demo

I'm going to record a demo of the site, ten minutes at most, and I want to rehearse it first. Don't edit any files.

What I plan to show:

- The site as a whole, including the pages that were there before this work.
- Briefs: saving a brief, the brief still there after a browser refresh, and the page coping with no saved data and with unreadable saved data.
- The assistant and the idea board: asking the assistant with notes and an image, editing its suggestion, saving it as an idea, and turning that idea into a published blog post.
- The API at work: each endpoint triggered from the UI with the browser's Network tab and the server terminal side by side, including a create that returns 201 Created.

Run through all of that yourself and report anything that fails, is slow, or would be confusing on screen. Don't fix it; I'll tell you what to change. Tell me whether I should record against the dev server or a production build, and why.

Then give me a run sheet. For each step: where to click, what should appear, and for API steps the method, path, status and the server log line to point at. Order it to fit in ten minutes with rough timings, and list what to set up before recording, such as being signed in as admin, having seed data and a test image in place, and which DevTools panels to have open. Include a fallback for the assistant step in case the model is slow or unavailable while I'm recording.

## 7. Explain

### 7. Prompt: map the code and quiz me

I'm going to explain this project's code myself, so help me prepare. Don't edit any files, and don't write a script for me to read.

Give me a map of the code as it is now, with file paths and line numbers that you've checked against the files:

- The structure: what each main folder and file is responsible for, and how the client, the API and the JSON files fit together.
- Briefs, saving: from the form input to state to the serialized string to localStorage.
- Briefs, loading after a refresh: from localStorage through parsing and validation to state to what's displayed, including where the empty and unreadable cases branch off.
- Idea board: where the server data is fetched, where the parent passes it to IdeaCard through props, and where IdeaCard uses it.
- One create request from end to end: the form, the fetch call, the route handler, validation, the data layer, the write to the JSON file, the 201 response and the list update.
- One assistant request from end to end: the notes and image in the form, the request to my endpoint, the call to the model, the structured reply, and the suggestion landing in the idea form. Include where the API key is read and what is and isn't stored.

Then list what I should be able to justify, sticking to things that are true of this code: the main design choices we made and the alternative to each, the limitations of browser storage that matter for briefs, and the testing and debugging decisions we made.

Finally, quiz me: about ten questions, one at a time, of the kind someone reviewing this code would ask. Wait for each answer, then tell me what I got wrong or left out and point me to the lines that show it.

## 8. Incremental prompts, reviews and revisions

### 8a. Revision: fixing what a review found (after any review in stages 2 to 5)

Fix items [numbers] from your review, one at a time. After each fix, repeat the check that exposed the problem and tell me the result. Leave the other items alone.

### 8b. Revision: changing something I found myself

Revise [the feature or screen]. Right now it [what it does], but I want it to [what it should do], because [the reason]. Change only that, rerun lint, the tests and the build, and tell me what you changed and how you checked it.

## 9. Submit

### 9. Prompt: prepare the repository

Get the repository ready to publish as a public, open-source project.

- The README is still the create-next-app boilerplate. Replace it with a description of the site and its features, how to install, run and test it (including the admin password setting in .env.example), a table of the API endpoints with method, path, access and status codes, and where the data is stored. Build the endpoint table from the route files, not from what we planned.
- Document the assistant in the README: which model and SDK it uses, how to supply the API key, what is sent to the model provider, and how the site behaves without a key.
- Add an MIT licence and the matching field in package.json. Ask me what name to use as the copyright holder.
- Go through the tracked files and the git history and tell me about anything that shouldn't be in a public repository: the API key or other secrets, local settings or runtime data. In particular, .gitignore lists the JSON files under data/, yet several are tracked, and one of them holds contact submissions with people's names and email addresses. Report what you find and what you'd do about it, but don't remove anything or rewrite history without asking me.
- Confirm that a fresh clone with no API key installs, passes lint and the tests, builds, and starts with sensible seed content on every page.
