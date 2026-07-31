# Seguridad criptografica en PREDIA

## Hash vs cifrado

- Hash: proceso irreversible para contrasenas y PIN. PREDIA usa bcrypt con salt automatico.
- Cifrado reversible: protege datos sensibles que deben recuperarse. PREDIA agrega AES-256-GCM mediante `apps/web/lib/crypto.ts`.

## Datos protegidos

| Dato | Tecnica | Implementacion |
|---|---|---|
| Contrasena de personal | bcrypt | `hashPassword`, `verifyPassword` en `apps/web/lib/auth.ts` |
| PIN de paciente | bcrypt | `authenticatePaciente` contra `pin_hash` |
| Datos sensibles recuperables | AES-256-GCM | `encryptSensitiveField`, `decryptSensitiveField` |
| Refresh token | SHA-256 del token opaco | tabla `refresh_token` |

## Llaves y secretos

- `JWT_SECRET`: firma de access tokens.
- `PREDIA_ENCRYPTION_KEY`: llave AES-256-GCM, base64/hex de 32 bytes.
- Generar llave: `openssl rand -base64 32`.
- Nunca guardar valores reales en git; usar `.env.local`, secretos de CI/CD o secret manager.

## Pruebas

```bash
pnpm --filter @predia/web exec jest --runInBand security-crypto
```

Cobertura:

- Hash no coincide con texto plano.
- Contrasena correcta valida.
- Contrasena incorrecta rechaza.
- AES-256-GCM cifra/descifra con llave correcta.
- Descifrado con llave incorrecta falla por autenticacion GCM.

## Demo para exposicion

1. Ejecutar pruebas criptograficas.
2. Mostrar que bcrypt produce hashes distintos aunque la contrasena sea igual.
3. Mostrar que AES-GCM genera texto cifrado sin revelar el dato.
4. Intentar descifrar con llave incorrecta y observar error.
