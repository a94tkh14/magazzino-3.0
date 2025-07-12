import React from 'react';

const TimePicker = ({ value, onChange, label, className = "" }) => {
  const handleTimeChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        type="time"
        value={value}
        onChange={handleTimeChange}
        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
};

export default TimePicker; 