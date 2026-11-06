import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getSiteConfig } from "@/lib/site-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = await getSiteConfig();
  return {
    title: {
      default: siteConfig.siteName,
      template: `%s | ${siteConfig.siteName}`,
    },
    description: siteConfig.tagline
      ? `${siteConfig.tagline} — portfolio for ISBA 2438 built with Next.js App Router.`
      : "Portfolio for ISBA 2438 built with Next.js App Router.",
  };
}

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about-me", label: "About Me" },
  { href: "/projects", label: "My Projects" },
  { href: "/contact-me-server-form", label: "Contact Me" },
  { href: "/admin", label: "Admin" },
];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const siteConfig = await getSiteConfig();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link className="brand" href="/">
              {siteConfig.siteName}
            </Link>
            {siteConfig.tagline ? (
              <span className="brand-tagline">{siteConfig.tagline}</span>
            ) : null}
            <nav aria-label="Main navigation">
              <ul className="nav-list">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>
        <main className="page-main">{children}</main>
        <footer className="site-footer">
          <p>{siteConfig.footerText}</p>
        </footer>
      </body>
    </html>
  );
}
