import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProjectBySlug, getProjects } from "@/lib/projects";
import TagList from "@/components/tag-list";

export async function generateStaticParams() {
  return (await getProjects()).map((project) => ({ slug: project.slug }));
}

export async function generateMetadata(
  { params }: PageProps<"/projects/[slug]">,
): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  return { title: project ? project.title : "Project Not Found" };
}

async function ProjectContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <>
      <Link className="back-link" href="/projects">
        ← Back to all projects
      </Link>
      <h1>{project.title}</h1>
      {project.techStack.length > 0 ? (
        <p className="brief-meta">
          <TagList items={project.techStack} />
        </p>
      ) : null}
      <p>{project.description}</p>
      {project.repoUrl || project.liveUrl ? (
        <div className="detail-links">
          {project.repoUrl ? (
            <a
              className="button-primary"
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer"
            >
              View repository
            </a>
          ) : null}
          {project.liveUrl ? (
            <a
              className="secondary-button"
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer"
            >
              Live demo
            </a>
          ) : null}
        </div>
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
