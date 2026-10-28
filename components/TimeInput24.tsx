import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;
export function TimeInput24({ value, onChange, type: _type, ...props }: Props) {
  const normalize = (text: string) =>
    text
      .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632));
  return (
    <input
      {...props}
      type="text"
      dir="ltr"
      inputMode="numeric"
      value={normalize(String(value ?? ""))}
      placeholder={props.placeholder || "HH:MM"}
      pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]"
      maxLength={5}
      title="ساعت ۲۴ساعته، مانند ۱۵:۳۰"
      autoComplete="off"
      onChange={(e) => {
        let text = normalize(e.target.value);
        if (!/^\d{0,2}(?::\d{0,2})?$/.test(text)) {
          if (/^\d{3,4}$/.test(text))
            text = `${text.slice(0, 2)}:${text.slice(2)}`;
          else {
            e.target.value = normalize(String(value ?? ""));
            return;
          }
        }
        e.target.value = text;
        onChange?.(e);
      }}
    />
  );
}
