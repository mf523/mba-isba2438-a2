import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProjectBySlug, projects } from "@/data/projects";

export async function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata(
  { params }: PageProps<"/projects/[slug]">,
): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  return { title: project ? project.title : "Project Not Found" };
}

async function ProjectContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <>
      <h1>{project.title}</h1>
      <p>{project.description}</p>
      <section>
        <h2>Tech Stack</h2>
        <ul className="tag-list">
          {project.techStack.map((tech) => (
            <li key={tech}>{tech}</li>
          ))}
        </ul>
      </section>
      {project.repoUrl ? (
        <section>
          <h2>Repository</h2>
          <p>
            <a className="inline-link" href={project.repoUrl}>
              {project.repoUrl}
            </a>
          </p>
        </section>
      ) : null}
    </>
  );
}

export default function ProjectPage({
  params,
}: PageProps<"/projects/[slug]">) {
  return (
    <Suspense fallback={<p>Loading project…</p>}>
      <ProjectContent params={params} />
    </Suspense>
  );
}
