import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { it } from 'date-fns/locale';
import TimePicker from './TimePicker';

const DateRangePicker = ({ 
  startDate, 
  endDate, 
  onDateChange, 
  startTime = "00:00",
  endTime = "23:59",
  onStartTimeChange,
  onEndTimeChange,
  className = "" 
}) => {
  const isSingleDay = startDate && endDate && 
    startDate.toDateString() === endDate.toDateString();

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <DatePicker
          selectsRange
          startDate={startDate}
          endDate={endDate}
          onChange={onDateChange}
          locale={it}
          dateFormat="dd/MM/yyyy"
          isClearable
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          calendarClassName="shadow-lg border rounded-lg"
        />
      </div>
      
      {isSingleDay && (
        <div className="flex items-center gap-4">
          <TimePicker
            value={startTime}
            onChange={onStartTimeChange}
            label="Ora inizio"
            className="flex-1"
          />
          <TimePicker
            value={endTime}
            onChange={onEndTimeChange}
            label="Ora fine"
            className="flex-1"
          />
        </div>
      )}
    </div>
  );
};

export default DateRangePicker; 