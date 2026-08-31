import { useState, type FormEvent } from "react";
import { MetricCard, PageHeader, Panel } from "../../components/ui";
import type { NuevoOperarioInput } from "../../data/types";
import { usePersonalStore } from "../../store/PersonalStore";
import "../../components/ui.css";

const empty: NuevoOperarioInput = {
  area: "LINEA",
  itemOrden: 0,
  puesto: "",
  nombreCompleto: "",
  documento: "",
  activo: true,
  fechaIngreso: "",
};

export function OperariosPage() {
  const { operarios, crearOperario, estados, cargando, error } = usePersonalStore();
  const [form, setForm] = useState(empty);
  const [saved, setSaved] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const activos = operarios.filter((o) => o.activo).length;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.puesto || !form.nombreCompleto) return;

    setGuardando(true);
    // itemOrden 0 significa "auto": el backend asigna el siguiente del area.
    const creado = await crearOperario({
      ...form,
      itemOrden: form.itemOrden || undefined,
    });
    setGuardando(false);
    if (!creado) return;

    setForm(empty);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Operarios"
        title="Operarios y trabajadores"
        description="Reemplaza el Excel de novedades: aquí se crean y administran los operarios de línea y PCCOM."
      />

      {error && <p className="alert-error">{error}</p>}

      <div className="metrics-grid">
        <MetricCard
          label="Total registrados"
          value={cargando ? "…" : String(operarios.length)}
          delay={0.05}
        />
        <MetricCard label="Activos" value={String(activos)} tone="ok" delay={0.1} />
        <MetricCard label="Estados disponibles" value={String(estados.length)} delay={0.15} />
        <MetricCard
          label="Estado"
          value={cargando ? "Cargando" : guardando ? "Guardando" : saved ? "Guardado" : "Listo"}
          tone={saved ? "ok" : "default"}
          hint="MySQL · operario"
          delay={0.2}
        />
      </div>

      <div className="stack-2">
        <Panel title="Crear operario" subtitle="Equivalente a nueva fila en hoja mensual (fila 30+)" delay={0.18}>
          <form onSubmit={onSubmit}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="item"># Item</label>
                <input
                  id="item"
                  type="number"
                  placeholder="Auto"
                  value={form.itemOrden || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, itemOrden: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="area">Área</label>
                <select
                  id="area"
                  value={form.area}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      area: e.target.value as "LINEA" | "PCCOM",
                    }))
                  }
                >
                  <option value="LINEA">Línea de beneficio</option>
                  <option value="PCCOM">PCCOM</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="puesto">Puesto / cargo</label>
                <input
                  id="puesto"
                  required
                  placeholder="Ej: AFANADOR, DEGUELLO"
                  value={form.puesto}
                  onChange={(e) => setForm((f) => ({ ...f, puesto: e.target.value }))}
                />
              </div>
              <div className="field span-3">
                <label htmlFor="nombre">Nombre completo</label>
                <input
                  id="nombre"
                  required
                  placeholder="Apellidos y nombres"
                  value={form.nombreCompleto}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nombreCompleto: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="doc">Documento</label>
                <input
                  id="doc"
                  value={form.documento}
                  onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="ingreso">Fecha ingreso</label>
                <input
                  id="ingreso"
                  type="date"
                  value={form.fechaIngreso}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fechaIngreso: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={guardando}>
                {guardando ? "Creando…" : "Crear operario"}
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Listado actual" subtitle="Operarios activos en el sistema" delay={0.24}>
          <div style={{ overflowX: "auto", maxHeight: 420 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Área</th>
                  <th>Puesto</th>
                  <th>Nombre</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {operarios.map((o) => (
                  <tr key={o.id}>
                    <td>{o.itemOrden}</td>
                    <td>{o.area}</td>
                    <td>{o.puesto}</td>
                    <td>
                      <strong>{o.nombreCompleto}</strong>
                      <br />
                      <small style={{ color: "var(--muted)" }}>{o.nombreCorto}</small>
                    </td>
                    <td>{o.activo ? "Activo" : "Inactivo"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
