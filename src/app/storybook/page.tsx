"use client";
import { useState } from "react";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import DatePicker from "@/components/common/DatePicker";

const selectOptions = [
  { label: "Option 1", value: "1" },
  { label: "Option 2", value: "2" },
  { label: "Option 3", value: "3" },
];

export default function StorybookPage() {
  const [selectValue, setSelectValue] = useState("1");
  const [dateValue, setDateValue] = useState("");

  const handleSelectChange = (value: string | number) => {
    setSelectValue(String(value));
  };

  return (
    <div className="max-w-xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Storybook Demo</h1>
      <div>
        <h2 className="font-semibold mb-2">Button</h2>
        <Button variant="primary">Primary Button</Button>
        <Button variant="secondary" className="ml-2">Secondary Button</Button>
      </div>
      <div>
        <h2 className="font-semibold mb-2">Select</h2>
        <Select options={selectOptions} value={selectValue} onChange={handleSelectChange} />
      </div>
      <div>
        <h2 className="font-semibold mb-2">DatePicker</h2>
        <DatePicker value={dateValue} onChange={setDateValue} />
      </div>
    </div>
  );
}
