import { useEffect, useRef } from "react";

type PreferenceChoice = {
  id: string;
  label: string;
  lang?: string;
  description?: string;
  selected: boolean;
  choose: () => void;
};

export function PreferenceDisclosure({ id, label, accessibleLabel, choices }: {
  id: string;
  label: string;
  accessibleLabel?: string;
  choices: readonly PreferenceChoice[];
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      const current = details.current;
      if (current?.open && event.target instanceof Node && !current.contains(event.target)) current.open = false;
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  const close = () => {
    trigger.current?.focus();
    if (details.current) details.current.open = false;
  };

  return <details ref={details} id={id} className="workspace-preference-disclosure" name="workspace-preferences"
    onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
    }}
    onKeyDown={event => {
      if (event.key !== "Escape" || !event.currentTarget.open) return;
      event.stopPropagation();
      close();
    }}>
    <summary ref={trigger} className="workspace-utility-trigger" aria-label={accessibleLabel}>{label}</summary>
    <div className="workspace-preference-panel" role="group" aria-label={accessibleLabel ?? label}>
      {choices.map(choice => <button key={choice.id} type="button" lang={choice.lang}
        className="workspace-preference-choice" aria-pressed={choice.selected}
        onClick={() => { choice.choose(); close(); }}>
        <span>{choice.label}</span>
        {choice.description && <small>{choice.description}</small>}
      </button>)}
    </div>
  </details>;
}
