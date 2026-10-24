"use client";
import type { ComponentProps } from "react";
import { formatAmountForInput } from "@/lib/money";
import { TextField } from "./Surfaces";
export function MoneyInput({ value, onValueChange, className = "", ...props }: Omit<ComponentProps<"input">, "value" | "onChange"> & {
  value: string; onValueChange: (value: string) => void;
}) {
  return <TextField {...props} type="text" inputMode="decimal" value={value}
    className={`money-value text-lg font-semibold ${className}`}
    onChange={event => onValueChange(formatAmountForInput(event.currentTarget.value))}
    onFocus={event => { onValueChange(event.currentTarget.value.replace(/\./g, "")); props.onFocus?.(event); }}
    onBlur={event => { onValueChange(formatAmountForInput(event.currentTarget.value)); props.onBlur?.(event); }} />;
}
