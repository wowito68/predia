# Navegacion movil PREDIA

## Mapa

```mermaid
flowchart TD
  Login --> MedicoTabs
  Login --> EnfermeroTabs
  Login --> PacienteTabs
  MedicoTabs --> InicioMedico
  MedicoTabs --> Agenda
  MedicoTabs --> Pacientes
  MedicoTabs --> Alertas
  MedicoTabs --> Perfil
  Pacientes --> PacienteDetalle
  PacienteDetalle --> SignosVitales
  PacienteDetalle --> DictadoNotas
  PacienteDetalle --> Firma
  PacienteDetalle --> HistorialClinico
  PacienteDetalle --> ValidacionIA
  PacienteTabs --> DashboardPaciente
  PacienteTabs --> Indicadores
  PacienteTabs --> Recetas
  PacienteTabs --> Recomendaciones
  DashboardPaciente --> Automonitoreo
  DashboardPaciente --> Expediente
```

## Proteccion de rutas

- `useAuthStore` conserva sesion.
- SecureStore en nativo; localStorage solo Expo Web.
- Sesion inactiva expira localmente.
- Refresh token renueva access token ante 401.

## QA

Runners disponibles:

```bash
node scripts/mobile-cdp-qa.js
node scripts/mobile-next-sprint-qa.js
```

