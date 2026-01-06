import React, { useState } from "react";

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, min, max }) => {
  return (
    <input
      type="date"
      value={value}
      min={min}
      max={max}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
};

export default React.memo(DatePicker);
