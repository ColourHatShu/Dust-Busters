"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that disables itself and shows a pending label while its parent
 * <form>'s action is in flight. Prevents double-submits (e.g. double-charging a
 * deposit/balance, or double-accepting a job). Must be rendered INSIDE a <form>.
 */
export default function SubmitButton({
  children,
  pendingText = "Please wait…",
  className = "btn-base btn-primary",
  disabled,
  ...rest
}: {
  children: React.ReactNode;
  pendingText?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending || disabled}
      aria-busy={pending}
      {...rest}
    >
      {pending ? pendingText : children}
    </button>
  );
}
