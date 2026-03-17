import React, { useState } from 'react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { it } from 'date-fns/locale';
import { Clock, Calendar } from 'lucide-react';

const DateTimeRangePicker = ({
  range,
  onRangeChange,
  startTime = '00:00',
  endTime = '23:59',
  onStartTimeChange,
  onEndTimeChange,
  show = true,
  onClose,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!show) return null;

  const formatDateRange = () => {
    const start = range.startDate;
    const end = range.endDate;
    const startStr = start.toLocaleDateString('it-IT');
    const endStr = end.toLocaleDateString('it-IT');
    return startStr === endStr ? startStr : `${startStr} - ${endStr}`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Pulsante per aprire/chiudere il calendario */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Calendar className="h-4 w-4" />
        <span className="text-sm">{formatDateRange()}</span>
        <Clock className="h-4 w-4" />
        <span className="text-sm">{startTime} - {endTime}</span>
      </button>

      {/* Calendario popup */}
      {isOpen && (
        <div className="absolute z-50 mt-2 shadow-lg bg-white border rounded-lg p-4">
          <DateRange
            editableDateInputs={true}
            onChange={item => onRangeChange(item.selection)}
            moveRangeOnFirstSelection={false}
            ranges={[range]}
            maxDate={new Date()}
            locale={it}
            months={1}
            direction="horizontal"
          />
          <div className="flex gap-2 mt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <label className="text-sm">Ora inizio:</label>
              <input
                type="time"
                value={startTime}
                onChange={e => onStartTimeChange(e.target.value)}
                className="px-2 py-1 border rounded text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Ora fine:</label>
              <input
                type="time"
                value={endTime}
                onChange={e => onEndTimeChange(e.target.value)}
                className="px-2 py-1 border rounded text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => setIsOpen(false)}
            >
              Applica
            </button>
            <button
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              onClick={() => setIsOpen(false)}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimeRangePicker; 