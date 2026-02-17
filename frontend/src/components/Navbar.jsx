export default function Navbar() {
  return (
    <header className="mb-6 flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
      <h1 className="text-xl font-semibold text-coffee-dark">Coffee Shop Ordering</h1>
      <span className="text-sm text-coffee-accent">WebSocket-Based POS</span>
    </header>
  );
}
