import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layouts/AppShell";
import { CierreStoreProvider } from "./store/CierreStore";
import { PersonalStoreProvider } from "./store/PersonalStore";
import { HomePage } from "./modules/home/HomePage";
import { SimulacionPage } from "./modules/simulacion/SimulacionPage";
import { CierreProcesoPage } from "./modules/cierre/CierreProcesoPage";
import { ConsolidadoPage } from "./modules/consolidado/ConsolidadoPage";
import { NovedadesPage } from "./modules/novedades/NovedadesPage";
import { BaseDatosCierrePage } from "./modules/baseDatos/BaseDatosCierrePage";
import { OperariosPage } from "./modules/operarios/OperariosPage";
import { AsistenciaPage } from "./modules/asistencia/AsistenciaPage";

export default function App() {
  return (
    <CierreStoreProvider>
      <PersonalStoreProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="simulacion" element={<SimulacionPage />} />
              <Route path="cierre-proceso" element={<CierreProcesoPage />} />
              <Route path="consolidado" element={<ConsolidadoPage />} />
              <Route path="novedades" element={<NovedadesPage />} />
              <Route path="base-datos-cierre" element={<BaseDatosCierrePage />} />
              <Route path="operarios" element={<OperariosPage />} />
              <Route path="asistencia" element={<AsistenciaPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PersonalStoreProvider>
    </CierreStoreProvider>
  );
}
