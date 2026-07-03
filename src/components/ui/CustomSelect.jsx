import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

function getOptionIndex(options, value) {
  const normalizedValue = String(value);
  return options.findIndex((option) => String(option.value) === normalizedValue);
}

export function CustomSelect({
  label,
  value,
  options,
  onChange,
  className = "",
  hideLabel = false,
  disabled = false,
}) {
  const generatedId = useId();
  const selectRef = useRef(null);
  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, getOptionIndex(options, value)));
  const selectedIndex = getOptionIndex(options, value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : options[0];
  const currentActiveIndex = Math.min(Math.max(0, activeIndex), options.length - 1);
  const labelId = `${generatedId}-label`;
  const listboxId = `${generatedId}-listbox`;

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (!selectRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  function selectOption(option) {
    onChange(option.value);
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleNativeChange(event) {
    const nextOption = options.find((option) => String(option.value) === event.target.value);
    if (nextOption) onChange(nextOption.value);
  }

  function moveActiveIndex(offset) {
    setIsOpen(true);
    setActiveIndex((current) => {
      const baseIndex = isOpen ? current : Math.max(0, selectedIndex);
      const nextIndex = (baseIndex + offset + options.length) % options.length;
      return nextIndex;
    });
  }

  function toggleOpen() {
    setActiveIndex(Math.max(0, selectedIndex));
    setIsOpen((current) => !current);
  }

  function handleKeyDown(event) {
    if (disabled) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveActiveIndex(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveActiveIndex(-1);
        break;
      case "Home":
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (isOpen) {
          selectOption(options[currentActiveIndex]);
        } else {
          setActiveIndex(Math.max(0, selectedIndex));
          setIsOpen(true);
        }
        break;
      case "Escape":
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
        }
        break;
      default:
        break;
    }
  }

  return (
    <div className={`custom-select-field ${hideLabel ? "is-label-hidden" : ""} ${className}`.trim()}>
      <span id={labelId}>{label}</span>
      <select
        className="custom-select-native"
        aria-labelledby={labelId}
        value={selectedOption?.value ?? ""}
        disabled={disabled}
        tabIndex={-1}
        onChange={handleNativeChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div ref={selectRef} className={`custom-select ${isOpen ? "is-open" : ""}`.trim()}>
        <button
          ref={triggerRef}
          type="button"
          className="custom-select-trigger"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`Mở danh sách: ${selectedOption?.label ?? ""}`}
          aria-describedby={labelId}
          aria-controls={listboxId}
          disabled={disabled}
          onClick={toggleOpen}
          onKeyDown={handleKeyDown}
        >
          <span id={`${generatedId}-value`}>{selectedOption?.label ?? ""}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {isOpen && (
          <div
            id={listboxId}
            className="custom-select-popover"
            role="listbox"
            aria-labelledby={labelId}
          >
            {options.map((option, index) => {
              const isSelected = index === selectedIndex;
              const isActive = index === currentActiveIndex;

              return (
                <div
                  key={option.value}
                  className={`custom-select-option ${isSelected ? "is-selected" : ""} ${isActive ? "is-active" : ""}`.trim()}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  {option.label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
