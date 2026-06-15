import { useId } from "react";
import "./ui.css";

export function DataTable({
  caption,
  columns,
  rows,
  getRowKey,
  emptyState,
  className = "",
  rowHeaderKey = "",
}) {
  const generatedCaptionId = useId();

  if (!rows.length) {
    return emptyState ?? null;
  }

  const captionId = caption ? generatedCaptionId : undefined;

  return (
    <div
      className={`ui-table-wrap ${className}`.trim()}
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
    >
      <table className="ui-table">
        {caption && <caption className="sr-only" id={captionId}>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={getRowKey ? getRowKey(row) : index}>
              {columns.map((column) => {
                const content = column.render ? column.render(row) : row[column.key];
                if (column.key === rowHeaderKey) {
                  return <th key={column.key} scope="row">{content}</th>;
                }
                return <td key={column.key} data-label={column.header}>{content}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
