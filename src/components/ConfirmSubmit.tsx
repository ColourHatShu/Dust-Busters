"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button for destructive admin actions: asks for confirmation before
 * submitting and (like SubmitButton) disables + shows a pending label while the
 * parent <form>'s action runs. If the admin cancels the confirm, the submit is
 * prevented. Must be rendered INSIDE a <form>.
 */
export default function ConfirmSubmit({
  message,
  children,
  pendingText = "Please wait…",
  className = "btn-base btn-primary",
  disabled,
  ...rest
}: {
  message: string;
  children: React.ReactNode;
  pendingText?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      type="submit"
      className={className}
      disabled={pending || disabled}
      aria-busy={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
