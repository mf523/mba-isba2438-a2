const navItems = [
  { href: "/", label: "Home" },
  { href: "/about-me", label: "About Me" },
  { href: "/projects", label: "My Projects" },
  { href: "/blogs", label: "Blogs" },
  { href: "/contact-me-server-form", label: "Contact" },
  { href: "/contact-me", label: "Contact (API)" },
  { href: "/admin", label: "Admin" },
];

export default function SiteHeader({ tagline }: { tagline?: string }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        {tagline ? <span className="brand-tagline">{tagline}</span> : null}
        <nav aria-label="Main navigation">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
