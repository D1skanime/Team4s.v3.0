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
  onChange,
}: {
  disabled?: boolean;
  error?: string | null;
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <YearPicker
      id={id}
      label={label}
      value={value}
      minYear={YEAR_MIN}
      maxYear={YEAR_MAX}
      disabled={disabled}
      invalid={Boolean(error)}
      onChange={onChange}
    />
  );
}
