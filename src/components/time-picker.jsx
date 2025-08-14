
"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

export function TimePicker({ value, onChange, disabled }) {
  const handleHourChange = (newHour) => {
    onChange(newHour);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={handleHourChange} disabled={disabled}>
        <SelectTrigger className="w-[80px]">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent position="popper">
          {hours.map((h) => (
            <SelectItem key={h} value={h}>
              {h}:00
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
