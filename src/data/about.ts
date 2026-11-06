export interface AboutContent {
  intro: string;
  skills: string[];
  education: string;
  experience: string;
}

export const DEFAULT_ABOUT_CONTENT: AboutContent = {
  intro:
    "I am a student and software developer studying at Santa Clara University. I enjoy building full-stack web applications and learning how products are designed, built, and shipped.",
  skills: ["Next.js", "TypeScript", "React", "Plain CSS", "Node.js"],
  education:
    "MBA coursework with a focus on technology and product development.",
  experience:
    "I have built web apps with Next.js, worked with TypeScript across the stack, and practiced shipping small features end to end.",
};
