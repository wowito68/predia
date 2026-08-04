# Autenticacion JWT en PREDIA

## Flujo implementado

1. Usuario/paciente inicia sesion.
2. API valida credenciales con bcrypt y rate limit.
3. API emite access token JWT de corta duracion (`JWT_EXPIRES_IN`, default `15m`).
4. API emite refresh token opaco.
5. Refresh token se guarda hasheado en `refresh_token`.
6. `/api/auth/refresh` rota refresh token y emite nuevo access token.
7. `/api/auth/logout` revoca refresh token y limpia cookies.

## Seguridad del token

- Firma: `JWT_SECRET`.
- Emisor: `JWT_ISSUER`.
- Audiencia: `JWT_AUDIENCE`.
- Refresh token: opaco, aleatorio, hasheado con SHA-256 en BD.
- Cookies web: `httpOnly`, `sameSite`, `secure` en produccion.
- Movil: SecureStore en iOS/Android; localStorage solo en Expo Web.

## Endpoints

| Endpoint | Funcion |
|---|---|
| `POST /api/auth/login` | Login personal clinico |
| `POST /api/auth/login-paciente` | Login paciente CURP/PIN |
| `POST /api/auth/refresh` | Rotacion de refresh token |
| `POST /api/auth/logout` | Revocacion |
| `GET /api/auth/me` | Usuario autenticado |

## Pruebas

```bash
pnpm --filter @predia/web exec jest --runInBand security-jwt
```

Cobertura:

- Token valido.
- Token manipulado.
- Token expirado.

## Verificacion manual API

```bash
curl -s http://localhost:3002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"dr_juan","password":"password123"}'
```

La respuesta debe incluir `token`, `refreshToken` y `user`.
