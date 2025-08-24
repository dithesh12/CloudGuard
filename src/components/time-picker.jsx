
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
const minutes = ['00', '15', '30', '45'];

export function TimePicker({ value, onChange, disabled }) {
  const [hour, minute] = value.split(':');

  const handleHourChange = (newHour) => {
    onChange(`${newHour}:${minute}`);
  };
  
  const handleMinuteChange = (newMinute) => {
    onChange(`${hour}:${newMinute}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={hour} onValueChange={handleHourChange} disabled={disabled}>
        <SelectTrigger className="w-[80px]">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent position="popper">
          {hours.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>:</span>
       <Select value={minute} onValueChange={handleMinuteChange} disabled={disabled}>
        <SelectTrigger className="w-[80px]">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent position="popper">
          {minutes.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

    