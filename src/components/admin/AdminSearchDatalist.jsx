export default function AdminSearchDatalist({ id, values = [], limit = 40 }) {
  const suggestions = [...new Set(
    values
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .map((value) => String(value ?? "").trim())
      .filter(Boolean),
  )].slice(0, limit);

  if (!suggestions.length) return null;

  return (
    <datalist id={id}>
      {suggestions.map((suggestion) => (
        <option value={suggestion} key={suggestion} />
      ))}
    </datalist>
  );
}
