"use client";

import { YearPicker } from "@/components/ui";

export const YEAR_MIN = 1900;
export const YEAR_MAX = new Date().getFullYear();

export function YearSelectField({
  disabled = false,
  error,
  id,
  label,
  value,
  minYear = YEAR_MIN,
  onChange,
}: {
  disabled?: boolean;
  error?: string | null;
  id: string;
  label: string;
  value: string;
  minYear?: number;
  onChange: (value: string) => void;
}) {
  return (
    <YearPicker
      id={id}
      label={label}
      value={value}
      minYear={minYear}
      maxYear={YEAR_MAX}
      disabled={disabled}
      invalid={Boolean(error)}
      onChange={onChange}
    />
  );
}
