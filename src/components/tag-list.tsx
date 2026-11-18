export default function TagList({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item) => (
        <span className="tag" key={item}>
          {item}
        </span>
      ))}
    </>
  );
}
