"use client";

import { FormField, Input } from "@/components/ui";

type FansubGroupKuerzelFieldProps = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

// GAP-05: Kürzel-Eingabefeld neben dem Namensfeld auf der Gruppen-Bearbeitungsseite.
// Ausgelagert, damit FansubBasicInfoTab.tsx nicht ueber die 450-Zeilen-Obergrenze waechst.
export function FansubGroupKuerzelField({ value, disabled, onChange }: FansubGroupKuerzelFieldProps) {
  return (
    <FormField
      label="Kürzel"
      htmlFor="fansub-group-kuerzel"
      hint="Muss systemweit eindeutig sein (auch gegenüber Aliasen anderer Gruppen)."
    >
      <Input
        id="fansub-group-kuerzel"
        value={value}
        maxLength={32}
        disabled={disabled}
        placeholder="z. B. BDnP"
        onChange={(event) => onChange(event.target.value)}
      />
    </FormField>
  );
}
