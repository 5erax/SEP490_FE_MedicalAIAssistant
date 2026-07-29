import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Braces, Plus, Trash2 } from "lucide-react";

function createRow(keyword = "", weight = "") {
  return {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    keyword,
    weight: String(weight),
  };
}

function parseKeywordWeights(value) {
  try {
    const parsed = value?.trim() ? JSON.parse(value) : {};
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return null;
    return Object.entries(parsed).map(([keyword, weight]) => createRow(keyword, weight));
  } catch {
    return null;
  }
}

function serializeRows(rows) {
  return rows.reduce((result, row) => {
    const keyword = row.keyword.trim();
    if (!keyword) return result;
    const numericWeight = Number(row.weight);
    return {
      ...result,
      [keyword]: row.weight !== "" && Number.isInteger(numericWeight)
        ? numericWeight
        : row.weight,
    };
  }, {});
}

function validateRows(rows) {
  const errors = {};
  const keywords = new Set();

  rows.forEach((row) => {
    const keyword = row.keyword.trim();
    if (!keyword) errors[`${row.id}-keyword`] = "Nhập từ khóa hoặc xóa dòng này.";
    if (keyword && keywords.has(keyword.toLowerCase())) {
      errors[`${row.id}-keyword`] = "Từ khóa này đang bị trùng.";
    }
    keywords.add(keyword.toLowerCase());

    const weight = Number(row.weight);
    if (row.weight === "" || !Number.isInteger(weight)) {
      errors[`${row.id}-weight`] = "Trọng số phải là số nguyên.";
    }
  });

  return errors;
}

const KeywordWeightEditor = forwardRef(function KeywordWeightEditor({
  onChange,
  value,
}, ref) {
  const parsedInitialValue = parseKeywordWeights(value);
  const [rows, setRows] = useState(parsedInitialValue ?? []);
  const [jsonValue, setJsonValue] = useState(value || "{}");
  const [errors, setErrors] = useState({});
  const [jsonError, setJsonError] = useState(parsedInitialValue ? "" : "JSON chưa đúng định dạng đối tượng.");
  const editorRef = useRef(null);

  function publishRows(nextRows) {
    const nextJson = JSON.stringify(serializeRows(nextRows), null, 2);
    setRows(nextRows);
    setJsonValue(nextJson);
    setJsonError("");
    setErrors({});
    onChange(nextJson);
  }

  function updateRow(rowId, key, nextValue) {
    publishRows(rows.map((row) => (
      row.id === rowId ? { ...row, [key]: nextValue } : row
    )));
  }

  function addRow() {
    setRows((current) => [...current, createRow()]);
    setErrors({});
  }

  function removeRow(rowId) {
    publishRows(rows.filter((row) => row.id !== rowId));
  }

  function updateJson(nextValue) {
    setJsonValue(nextValue);
    onChange(nextValue);

    const parsedRows = parseKeywordWeights(nextValue);
    if (!parsedRows) {
      setJsonError("JSON chưa đúng định dạng đối tượng từ khóa và trọng số.");
      return;
    }

    setJsonError("");
    setErrors({});
    setRows(parsedRows);
  }

  useImperativeHandle(ref, () => ({
    validate() {
      if (jsonError) {
        editorRef.current?.querySelector('[name="keywordWeights"]')?.focus();
        return null;
      }

      const nextErrors = validateRows(rows);
      setErrors(nextErrors);
      const [firstErrorName] = Object.keys(nextErrors);
      if (firstErrorName) {
        window.requestAnimationFrame(() => {
          editorRef.current?.querySelector(`[data-row-field="${firstErrorName}"]`)?.focus();
        });
        return null;
      }

      return serializeRows(rows);
    },
  }), [jsonError, rows]);

  return (
    <div className="icd-keyword-editor" ref={editorRef}>
      <div className="icd-keyword-editor-head">
        <div>
          <strong>Danh sách từ khóa</strong>
          <span>Mỗi từ khóa đi kèm một trọng số nguyên.</span>
        </div>
        <button className="btn btn-ghost btn-small" type="button" onClick={addRow}>
          <Plus size={15} aria-hidden="true" /> Thêm từ khóa
        </button>
      </div>

      {rows.length ? (
        <div className="icd-keyword-editor-list">
          {rows.map((row, index) => {
            const keywordError = errors[`${row.id}-keyword`];
            const weightError = errors[`${row.id}-weight`];
            return (
              <div className="icd-keyword-editor-row" key={row.id}>
                <label className={`clean-field ${keywordError ? "icd-field-error" : ""}`}>
                  <span>Từ khóa {index + 1}</span>
                  <input
                    name={`keywordWeights.${index}.keyword`}
                    data-row-field={`${row.id}-keyword`}
                    value={row.keyword}
                    onChange={(event) => updateRow(row.id, "keyword", event.target.value)}
                    placeholder="Ví dụ: sốt"
                    aria-invalid={keywordError ? "true" : undefined}
                    aria-describedby={keywordError ? `${row.id}-keyword-error` : undefined}
                  />
                  {keywordError && <small id={`${row.id}-keyword-error`}>{keywordError}</small>}
                </label>
                <label className={`clean-field ${weightError ? "icd-field-error" : ""}`}>
                  <span>Trọng số</span>
                  <input
                    name={`keywordWeights.${index}.weight`}
                    data-row-field={`${row.id}-weight`}
                    type="text"
                    inputMode="numeric"
                    value={row.weight}
                    onChange={(event) => updateRow(row.id, "weight", event.target.value)}
                    placeholder="Ví dụ: 5"
                    aria-invalid={weightError ? "true" : undefined}
                    aria-describedby={weightError ? `${row.id}-weight-error` : undefined}
                  />
                  {weightError && <small id={`${row.id}-weight-error`}>{weightError}</small>}
                </label>
                <button
                  className="btn btn-ghost btn-small icd-keyword-remove"
                  type="button"
                  aria-label={`Xóa từ khóa ${row.keyword || index + 1}`}
                  onClick={() => removeRow(row.id)}
                >
                  <Trash2 size={15} aria-hidden="true" /> Xóa
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="icd-keyword-editor-empty">Chưa có từ khóa. Có thể lưu danh sách trống hoặc thêm một từ khóa.</p>
      )}

      <details className="icd-advanced-json">
        <summary>
          <Braces size={16} aria-hidden="true" />
          JSON nâng cao
        </summary>
        <label className={`clean-field ${jsonError ? "icd-field-error" : ""}`}>
          <span>Đối tượng JSON từ khóa</span>
          <textarea
            name="keywordWeights"
            rows={8}
            value={jsonValue}
            onChange={(event) => updateJson(event.target.value)}
            spellCheck="false"
            aria-invalid={jsonError ? "true" : undefined}
            aria-describedby="icd-json-help"
          />
          <small id="icd-json-help">
            {jsonError || 'Ví dụ: {"sốt": 5, "ho": 3}. Payload vẫn là đối tượng keywordWeights hiện tại.'}
          </small>
        </label>
      </details>
    </div>
  );
});

export default KeywordWeightEditor;
