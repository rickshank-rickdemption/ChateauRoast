const items = [
  { id: 1, name: 'Espresso', price: 3.5 },
  { id: 2, name: 'Latte', price: 4.5 },
  { id: 3, name: 'Croissant', price: 3.0 }
];
const formatPHP = (value) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0));

export default function MenuGrid() {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-coffee-dark">Menu</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg bg-white p-4 shadow-sm">
            <h3 className="font-medium">{item.name}</h3>
            <p className="text-sm text-coffee-accent">{formatPHP(item.price)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
