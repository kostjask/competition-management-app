import { useState, type InputHTMLAttributes } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { Input } from "./Foundation";

export function PasswordInput({ id, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { id: string }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const label = t(visible ? "Shell.hidePassword" : "Shell.showPassword");

  return <div className="ui-password">
    <Input {...props} id={id} type={visible ? "text" : "password"} />
    <button type="button" className="ui-password-toggle" aria-label={label} aria-controls={id} disabled={props.disabled}
      onClick={() => setVisible(value => !value)}>
      {t(visible ? "Shell.hide" : "Shell.show")}
    </button>
  </div>;
}
