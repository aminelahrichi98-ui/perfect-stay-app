"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui";

/** Champ mot de passe avec bouton « afficher » (utile sur téléphone). */
export function PasswordInput(props: Omit<ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        className="press absolute top-1/2 right-1 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-ink-3 hover:bg-sunken hover:text-ink"
      >
        {visible ? <EyeOff className="h-[1.1rem] w-[1.1rem]" /> : <Eye className="h-[1.1rem] w-[1.1rem]" />}
      </button>
    </div>
  );
}
