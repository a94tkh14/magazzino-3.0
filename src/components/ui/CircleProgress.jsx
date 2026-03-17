import React from 'react';

/**
 * Cerchio di progresso semplice con testo centrale
 * @param {string|number} value - Testo o numero da mostrare
 * @param {string} label - Etichetta sotto il cerchio
 * @param {string} color - Colore del bordo/cerchio (es: 'blue', 'green', 'orange')
 * @param {string} size - Dimensione (es: 'md', 'lg')
 */
const CircleProgress = ({ value, label, color = 'blue', size = 'md' }) => {
  const sizePx = size === 'lg' ? 64 : 44;
  const borderColor =
    color === 'green' ? 'border-green-500' :
    color === 'orange' ? 'border-orange-500' :
    'border-blue-500';
  const textColor =
    color === 'green' ? 'text-green-700' :
    color === 'orange' ? 'text-orange-700' :
    'text-blue-700';

  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex items-center justify-center rounded-full border-4 ${borderColor} bg-white shadow-sm`}
        style={{ width: sizePx, height: sizePx }}
      >
        <span className={`font-bold text-base ${textColor}`}>{value}</span>
      </div>
      {label && <span className="text-xs text-gray-500 mt-1 text-center">{label}</span>}
    </div>
  );
};

export default CircleProgress; 