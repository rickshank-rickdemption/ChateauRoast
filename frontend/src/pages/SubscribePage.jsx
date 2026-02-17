import React from 'react';
import { Link } from 'react-router-dom';

export default function SubscribePage() {
  return (
    <main className="min-h-screen bg-wh-cream px-8 py-16 text-wh-black">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-10 shadow-sm">
        <h1 className="font-serif text-5xl">Subscribe.</h1>
        <p className="mt-4 text-gray-600">Choose a recurring coffee delivery plan tailored for home brewing.</p>
        <div className="mt-8">
          <Link to="/shop" className="rounded-full border border-wh-black px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-wh-black hover:text-white">
            Browse Plans
          </Link>
        </div>
      </div>
    </main>
  );
}
