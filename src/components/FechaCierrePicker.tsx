import { useMemo, useRef } from "react";

type Props = {
  value: string;
  fechas: string[];
  onChange: (fecha: string) => void;
  disabled?: boolean;
};

function fmtFecha(fecha: string) {
  if (!fecha) return "";
  const [y, m, d] = fecha.split("-").map(Number);
  if (!y || !m || !d) return fecha;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function FechaCierrePicker({ value, fechas, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { min, max, tieneCierre, puedeAnterior, puedeSiguiente } = useMemo(() => {
    const sorted = [...fechas].sort();
    const minF = sorted[0] ?? "";
    const maxF = sorted[sorted.length - 1] ?? "";
    const anterior = sorted.filter((f) => f < value).pop();
    const siguiente = sorted.find((f) => f > value);
    return {
      min: minF,
      max: maxF,
      tieneCierre: fechas.includes(value),
      puedeAnterior: Boolean(anterior),
      puedeSiguiente: Boolean(siguiente),
    };
  }, [fechas, value]);

  const abrirCalendario = () => {
    const el = inputRef.current;
    if (!el || disabled) return;
    el.focus();
    el.showPicker?.();
  };

  const irDia = (dir: -1 | 1) => {
    const sorted = [...fechas].sort();
    if (dir === -1) {
      const prev = sorted.filter((f) => f < value).pop();
      if (prev) onChange(prev);
      return;
    }
    const next = sorted.find((f) => f > value);
    if (next) onChange(next);
  };

  return (
    <div className={`fecha-picker${disabled ? " is-disabled" : ""}`}>
      <span className="fecha-picker-label">Fecha cierre</span>

      <div className="fecha-picker-control">
        <button
          type="button"
          className="fecha-picker-nav"
          title="Día anterior con cierre"
          disabled={disabled || !puedeAnterior}
          onClick={() => irDia(-1)}
          aria-label="Día anterior"
        >
          ‹
        </button>

        <div
          className="fecha-picker-field"
          onClick={() => !disabled && fechas.length && abrirCalendario()}
          role="button"
          tabIndex={disabled || !fechas.length ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              abrirCalendario();
            }
          }}
          aria-label="Seleccionar fecha de cierre"
        >
          <input
            ref={inputRef}
            className="fecha-picker-input"
            type="date"
            value={value}
            min={min || undefined}
            max={max || undefined}
            disabled={disabled || !fechas.length}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Fecha de cierre"
            tabIndex={-1}
          />
          <span className="fecha-picker-display" aria-hidden>
            {value ? fmtFecha(value) : "Sin fechas"}
          </span>
          <button
            type="button"
            className="fecha-picker-cal"
            title="Abrir calendario"
            disabled={disabled || !fechas.length}
            onClick={(e) => {
              e.stopPropagation();
              abrirCalendario();
            }}
            aria-label="Abrir calendario"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden focusable="false">
              <path
                fill="currentColor"
                d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10Zm0-12H5V6h14v2Z"
              />
            </svg>
          </button>
        </div>

        <button
          type="button"
          className="fecha-picker-nav"
          title="Día siguiente con cierre"
          disabled={disabled || !puedeSiguiente}
          onClick={() => irDia(1)}
          aria-label="Día siguiente"
        >
          ›
        </button>
      </div>

      {value && !tieneCierre ? (
        <span className="fecha-picker-hint">Sin cierre registrado en esta fecha</span>
      ) : null}
    </div>
  );
}
