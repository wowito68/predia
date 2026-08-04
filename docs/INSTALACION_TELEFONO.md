# Instalacion en telefono

## Opcion Expo Go

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=http://<IP-LAN-PC>:3002/api npm run start -- --tunnel
```

Escanear QR con Expo Go.

## Opcion APK/AAB

Requiere configurar EAS o build local Android.

```bash
npx expo prebuild
npx expo run:android --variant release
```

## Configuracion del servidor

- El telefono debe alcanzar `EXPO_PUBLIC_API_URL`.
- En red local usar IP LAN del equipo, no `localhost`.
- Si la red bloquea conexiones, usar tunnel o hotspot propio.

## Permisos

- Camara para evidencia clinica.
- Microfono para dictado.
- Biometria para firma si el equipo la soporta.

