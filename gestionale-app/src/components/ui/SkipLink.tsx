import React from 'react';

/**
 * Skip Link per accessibilità
 * Permette agli utenti con screen reader di saltare alla navigazione principale
 */
export const SkipLink: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg"
    >
      Salta al contenuto principale
    </a>
  );
};

