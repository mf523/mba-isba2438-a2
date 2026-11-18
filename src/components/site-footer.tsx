export default function SiteFooter({ text }: { text: string }) {
  return (
    <footer className="site-footer">
      <p>{text}</p>
    </footer>
  );
}
