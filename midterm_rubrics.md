# Grading Rubric

Assignment ID: midterm | Rubric version: 1.1.0 | Total: 200 points

Each rubric criterion earns its maximum for the full-credit check, half its maximum for the stated partial-credit check, and zero when the requirement is verifiably absent or the work meets neither check. Half points are allowed. A criterion can receive only one of these scores. Category scores are the sum of their criteria.

## Meaningful LocalStorage feature — 40 points

- MIDTERM-01 (10 points). The feature supports a clear user task with meaningful user-entered or selected data. Blogs, Projects, and a decorative toggle alone do not qualify.
  Half credit: The task is identifiable, but the feature is only partly useful.

- MIDTERM-02 (15 points). A user action saves the intended data in browser LocalStorage.
  Half credit: Some intended data is saved, but required values or the user action are incomplete.

- MIDTERM-03 (15 points). After refresh, saved data is retrieved and accurately displayed. Empty and invalid stored data are handled without breaking the application.
  Half credit: Retrieval works only partly, or retrieval works but empty or invalid data handling is incomplete.

## Custom backend feature and CRUD — 60 points

- MIDTERM-04 (15 points). A meaningful feature beyond Projects, Blogs, or Contact Form data serves a clear user purpose, communicates through an API, and persists its data in backend JSON.
  Half credit: The feature serves a qualifying purpose, but API communication or JSON persistence works only partly.

- MIDTERM-05 (30 points). Complete interfaces allow users to create, read, update, and delete every object type served through the API, including contact submissions, blog posts, projects, and the custom feature. Operations use the API, and changes persist to backend JSON.
  Half credit: Some operations work, but one or more required operations or object types are missing, broken, or fail to persist changes.

- MIDTERM-06 (15 points). The walkthrough identifies and successfully invokes the API endpoints, shows corresponding server logs, and shows a successful object creation returning HTTP 201 Created.
  Half credit: Some successful API behavior is demonstrated, but endpoint coverage, corresponding logs, or the 201 response is missing.

## Portfolio integration and components — 30 points

- MIDTERM-07 (10 points). The work extends the Assignment 2 portfolio, keeps earlier pages usable, and provides clear navigation and feedback for the added features.
  Half credit: The existing portfolio is retained, but an earlier page breaks or a material step in the new features is unclear.

- MIDTERM-08 (20 points). The portfolio uses reusable components where practical, including repeated content. A custom-feature component receives data through props, and the walkthrough shows where server data is fetched and how its parent passes that data to it.
  Half credit: Some componentization is present, but reuse, the custom component, or the fetch-to-props implementation or explanation is incomplete.

## Code and data flow explanation — 50 points

- MIDTERM-09 (15 points). Accurately explains relevant files, components, and responsibilities, including how the client, API, and backend JSON work together.
  Half credit: Identifies the relevant code but omits or inaccurately explains a material responsibility or client–server interaction.

- MIDTERM-10 (25 points). Identifies the LocalStorage code and accurately traces both flows: user input through state and serialization into storage, and stored data through parsing and state to the displayed result after refresh.
  Half credit: Accurately explains one flow, or explains parts of both while omitting or misstating a material step.

- MIDTERM-11 (10 points). Accurately explains an important design choice, a limitation of browser storage, and a debugging or testing decision.
  Half credit: Accurately explains at least one of these, but leaves the others incomplete.

## Walkthrough and deliverables — 20 points

- MIDTERM-12 (10 points). The walkthrough demonstrates the expanded portfolio and both meaningful features, including LocalStorage save, refresh, retrieval, and empty/error handling. Demonstrated behavior is connected to relevant code in the submitted version.
  Half credit: The walkthrough matches the submitted work but omits a required demonstration or a substantial connection to the code.

- MIDTERM-13 (10 points). The expanded portfolio’s source code is submitted in a public, open-source GitHub repository, and a walkthrough of at most 10 minutes is submitted through the HackerSquad video submission portal.
  Half credit: Both source code and a walkthrough are available, but repository access, open-source licensing, submission location, or video length does not meet the requirements.

## Assignment-wide requirements

Complete the assignment individually using the Viber Coding Agent for assessed development through incremental prompts, reviews, and revisions. Students are responsible for code correctness and accurate explanations.

Submit both deliverables by November 20, 2026, at 11:59 p.m. Pacific. The recording workflow automatically stops at 10 minutes.
