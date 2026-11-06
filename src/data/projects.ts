export interface Project {
  slug: string;
  title: string;
  summary: string;
  description: string;
  techStack: string[];
  repoUrl?: string;
  liveUrl?: string;
}

export const DEFAULT_PROJECTS: Project[] = [
  {
    slug: "resume-site",
    title: "Resume Site",
    summary: "A personal resume website built with server-rendered pages.",
    description:
      "A single-page resume website that renders my experience, education, and skills from structured data. Built to learn server-side rendering and static generation with Next.js.",
    techStack: ["Next.js", "TypeScript", "CSS"],
    repoUrl: "https://github.com/example/resume-site",
  },
  {
    slug: "task-tracker",
    title: "Task Tracker",
    summary: "A small task tracker with local persistence and filtering.",
    description:
      "A task tracking app that supports creating, completing, and filtering tasks by status. State is persisted locally so tasks survive page reloads.",
    techStack: ["React", "TypeScript", "CSS"],
    repoUrl: "https://github.com/example/task-tracker",
  },
];
