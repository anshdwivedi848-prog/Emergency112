import { useState, type InputHTMLAttributes } from "react";
import { Icon } from "./Icons";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ className = "", ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return <div className="password-input-wrap">
    <input {...inputProps} className={`text-input password-text-input ${className}`.trim()} type={visible ? "text" : "password"} />
    <button
      className="password-visibility-button"
      type="button"
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      onClick={() => setVisible((current) => !current)}
    >
      <Icon name={visible ? "eye-off" : "eye"} width={18} height={18} />
    </button>
  </div>;
}
