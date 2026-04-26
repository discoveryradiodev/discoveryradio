"use client";

import { useState } from "react";

type WillardPasswordInputProps = {
  id: string;
  name: string;
  inputClassName: string;
  toggleClassName: string;
};

export function WillardPasswordInput({
  id,
  name,
  inputClassName,
  toggleClassName,
}: WillardPasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={inputClassName}>
      <input
        id={id}
        name={name}
        type={isVisible ? "text" : "password"}
        autoComplete="current-password"
        required
      />
      <button
        type="button"
        className={toggleClassName}
        onClick={() => setIsVisible((prev) => !prev)}
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
      >
        {isVisible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
