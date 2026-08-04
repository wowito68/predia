# Recursos de marca de PREDIA

## Archivos disponibles

| Archivo normalizado | Archivo original | Ubicación original | Formato | Dimensiones | Uso confirmado |
|---|---|---|---|---:|---|
| `logo-principal.png` | `icon.png` | `apps/mobile/assets/icon.png` | PNG RGB | 1024 x 1024 px | Icono general definido en `apps/mobile/app.json`. No contiene el nombre escrito de la marca. |
| `isotipo.png` | `android-icon-foreground.png` | `apps/mobile/assets/android-icon-foreground.png` | PNG RGBA | 512 x 512 px | Capa frontal del icono adaptativo de Android. |

## Recursos relacionados no renombrados

Los archivos originales relacionados con la identidad se copiaron también a [`../iconografia/archivos`](../iconografia/archivos/): fondo y frente adaptativos de Android, versión monocromática, favicon, icono general y splash.

## Pendientes manuales

- **`logo-blanco.png`: no disponible.** El proyecto no contiene una variante blanca validada. `android-icon-monochrome.png` es una máscara monocromática gris/transparente y no debe presentarse como logotipo blanco.
- **Logotipo horizontal: no disponible.** La marca escrita `PREDIA` se compone en tiempo de ejecución con texto Inter; no existe una imagen horizontal con isotipo y nombre.
- Antes de crear variantes nuevas se requiere aprobación de marca. No se generaron ni recolorearon imágenes para este manual.

## Consideraciones de uso

- Mantener la proporción original y evitar deformaciones.
- El archivo `logo-principal.png` incluye un fondo azul claro; no es transparente.
- Para iconos adaptativos Android deben utilizarse conjuntamente el fondo y el frente configurados en `app.json`.
