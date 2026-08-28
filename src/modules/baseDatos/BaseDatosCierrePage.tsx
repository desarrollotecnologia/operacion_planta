import { useMemo, useState, type FormEvent } from "react";
import { MetricCard, PageHeader, Panel, formatDate } from "../../components/ui";
import type { NuevoRegistroInput } from "../../data/mock/baseDatosCierre";
import { useCierreStore } from "../../store/CierreStore";
import "../../components/ui.css";

const empty: NuevoRegistroInput = {
  fecha: "",
  totalBeneficio: 0,
  horaInicio: "14:00",
  horaFin: "20:00",
  tiempoParadasMin: 0,
  paradaProgramadaMin: 30,
  velocidadLinea: 75,
  horasLaboradas: 0,
  tardanzaInicio: 0,
  productividad: 0,
  velocidadNeta: 75,
  velocidadBruta: 70,
  toleranciaCero: 0.01,
  pieles: 0.98,
  observacion: "",
};

export function BaseDatosCierrePage() {
  const { registros, upsertRegistro, selectedFecha, setSelectedFecha } = useCierreStore();
  const selected = useMemo(
    () => registros.find((r) => r.fecha === selectedFecha) ?? registros[0],
    [registros, selectedFecha],
  );
  const [form, setForm] = useState<NuevoRegistroInput>({ ...empty, ...selected });
  const [savedFlash, setSavedFlash] = useState(false);

  function loadRegistro(fecha: string) {
    const r = registros.find((x) => x.fecha === fecha);
    if (!r) return;
    setSelectedFecha(fecha);
    setForm({ ...r });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.fecha) return;
    upsertRegistro(form);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Módulo 5 · Capturar"
        title="Base de datos cierre"
        description="Esta es la hoja que manda: al guardar un día, el resto de vistas se actualizará cuando conectemos reglas/backend. Hoy persiste en memoria del prototipo."
      />

      <div className="metrics-grid">
        <MetricCard label="Registros" value={String(registros.length)} delay={0.05} />
        <MetricCard
          label="Seleccionado"
          value={formatDate(selected.fecha)}
          tone="accent"
          delay={0.1}
        />
        <MetricCard
          label="Beneficio"
          value={String(selected.totalBeneficio)}
          delay={0.15}
        />
        <MetricCard
          label="Estado"
          value={savedFlash ? "Guardado" : "Listo"}
          tone={savedFlash ? "ok" : "default"}
          hint="Sin BD aún · local"
          delay={0.2}
        />
      </div>

      <div className="stack-2">
        <Panel title="Formulario del día" subtitle="Campos principales de BASE DE DATOS CIERRE" delay={0.18}>
          <form onSubmit={onSubmit}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="fecha">Fecha</label>
                <input
                  id="fecha"
                  type="date"
                  required
                  value={form.fecha}
                  onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="beneficio">Total beneficio</label>
                <input
                  id="beneficio"
                  type="number"
                  value={form.totalBeneficio}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, totalBeneficio: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="vel">Velocidad línea</label>
                <input
                  id="vel"
                  type="number"
                  value={form.velocidadLinea}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, velocidadLinea: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="hi">Hora inicio</label>
                <input
                  id="hi"
                  type="time"
                  value={form.horaInicio}
                  onChange={(e) => setForm((f) => ({ ...f, horaInicio: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="hf">Hora fin</label>
                <input
                  id="hf"
                  type="time"
                  value={form.horaFin}
                  onChange={(e) => setForm((f) => ({ ...f, horaFin: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="paradas">Paradas (min)</label>
                <input
                  id="paradas"
                  type="number"
                  value={form.tiempoParadasMin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tiempoParadasMin: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="prog">Parada programada (min)</label>
                <input
                  id="prog"
                  type="number"
                  value={form.paradaProgramadaMin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paradaProgramadaMin: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="prod">Productividad</label>
                <input
                  id="prod"
                  type="number"
                  step="0.1"
                  value={form.productividad}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, productividad: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="pieles">Pieles</label>
                <input
                  id="pieles"
                  type="number"
                  step="0.01"
                  value={form.pieles}
                  onChange={(e) => setForm((f) => ({ ...f, pieles: Number(e.target.value) }))}
                />
              </div>
              <div className="field span-3">
                <label htmlFor="obs">Observación</label>
                <textarea
                  id="obs"
                  rows={3}
                  value={form.observacion}
                  onChange={(e) => setForm((f) => ({ ...f, observacion: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">
                Guardar día
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setForm({ ...empty, fecha: new Date().toISOString().slice(0, 10) })}
              >
                Nuevo vacío
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Histórico en memoria" subtitle="Click para editar" delay={0.24}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Beneficio</th>
                <th>Inicio</th>
                <th>Fin</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr
                  key={r.id}
                  style={{
                    cursor: "pointer",
                    background: r.fecha === selectedFecha ? "var(--brand-50)" : undefined,
                  }}
                  onClick={() => loadRegistro(r.fecha)}
                >
                  <td>{formatDate(r.fecha)}</td>
                  <td>
                    <strong>{r.totalBeneficio}</strong>
                  </td>
                  <td>{r.horaInicio}</td>
                  <td>{r.horaFin}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note-block" style={{ marginTop: "0.9rem" }}>
            <strong>Siguiente:</strong> API + PostgreSQL en el servidor. Este formulario ya define el contrato de captura.
          </p>
        </Panel>
      </div>
    </div>
  );
}
