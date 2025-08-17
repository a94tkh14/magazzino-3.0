import React from 'react';
import SafeNumberTest from '../components/SafeNumberTest';
import SafeStringTest from '../components/SafeStringTest';
import MagazzinoReset from '../components/MagazzinoReset';

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Impostazioni</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SafeNumberTest />
          <SafeStringTest />
        </div>

        <div className="mt-8">
          <MagazzinoReset />
        </div>
      </div>
    </div>
  );
} 