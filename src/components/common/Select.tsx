import React from "react";

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  value: string | number;
  onChange: (value: string | number) => void;
}

const Select: React.FC<SelectProps> = ({ options, value, onChange, ...props }) => {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

export default React.memo(Select);
