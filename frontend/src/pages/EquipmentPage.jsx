import React from 'react';

const equipment = ['Pour-over Kit', 'French Press', 'Grinder', 'Scale'];

export default function EquipmentPage() {
  return (
    <main className="min-h-screen bg-wh-cream px-8 py-16 text-wh-black">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-8 font-serif text-5xl">Equipment.</h1>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {equipment.map((item) => (
            <div key={item} className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="font-serif text-2xl">{item}</h2>
              <p className="text-sm text-gray-500">Precision tools for modern coffee brewing.</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
