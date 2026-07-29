export function getAdminFieldProps(name, error, descriptionId) {
  return {
    name,
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": descriptionId || undefined,
  };
}

export function focusFirstInvalidField(formRef, errors) {
  const firstInvalidName = Object.keys(errors).find((name) => Boolean(errors[name]));
  if (!firstInvalidName) return;

  window.requestAnimationFrame(() => {
    const field = formRef.current?.elements?.namedItem(firstInvalidName);
    const fallback = formRef.current?.querySelector?.(
      `[data-error-field="${CSS.escape(firstInvalidName)}"]`,
    );
    const focusTarget = typeof field?.focus === "function" ? field : field?.[0] || fallback;
    focusTarget?.focus?.();
  });
}
