#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const args = process.argv.slice(2)
const templateMode = args.includes("--template")
const envPath = path.resolve(args.find((arg) => !arg.startsWith("--")) || ".env.production")

const errors = []
const warnings = []

function parseEnv(contents) {
  const parsed = {}

  for (const [index, rawLine] of contents.split(/\r?\n/).entries()) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue

    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line
    const separator = normalized.indexOf("=")
    if (separator < 1) {
      errors.push(`Linea ${index + 1}: formato KEY=VALUE invalido`)
      continue
    }

    const key = normalized.slice(0, separator).trim()
    let value = normalized.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    parsed[key] = value
  }

  return parsed
}

function addError(message) {
  errors.push(message)
}

function addSecretError(message) {
  if (templateMode) warnings.push(message)
  else errors.push(message)
}

function isPlaceholder(value) {
  return /change[_-]?me|replace|example|xxxxxxxx|secure_password|your[_-]?|tu[_-]?dominio/i.test(value)
}

function validateSecret(env, key, minimumLength) {
  const value = env[key] || ""
  if (value.length < minimumLength) {
    addSecretError(`${key} debe tener al menos ${minimumLength} caracteres`)
  }
  if (isPlaceholder(value)) {
    addSecretError(`${key} conserva un valor de ejemplo`)
  }
}

function isValidEncryptionKey(value) {
  if (/^[a-f0-9]{64}$/i.test(value)) return true
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false

  try {
    return Buffer.from(value, "base64").length === 32
  } catch {
    return false
  }
}

if (!fs.existsSync(envPath)) {
  console.error(`ERROR: no existe ${envPath}`)
  process.exit(1)
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"))
const required = [
  "NODE_ENV",
  "PREDIA_DOMAIN",
  "APP_URL",
  "NEXT_PUBLIC_API_URL",
  "EXPO_PUBLIC_API_URL",
  "MYSQL_ROOT_PASSWORD",
  "MYSQL_DATABASE",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "JWT_REFRESH_EXPIRES_IN",
  "JWT_ISSUER",
  "JWT_AUDIENCE",
  "PREDIA_ENCRYPTION_KEY",
  "ALLOWED_ORIGINS",
  "SECURE_COOKIES",
  "COOKIE_DOMAIN",
  "LETSENCRYPT_EMAIL",
  "GRAFANA_ADMIN_PASSWORD",
]

for (const key of required) {
  if (!env[key]) addError(`Falta la variable obligatoria ${key}`)
}

if (env.NODE_ENV && env.NODE_ENV !== "production") {
  addError("NODE_ENV debe ser production")
}

if (env.SECURE_COOKIES && env.SECURE_COOKIES !== "true") {
  addError("SECURE_COOKIES debe ser true")
}

validateSecret(env, "MYSQL_ROOT_PASSWORD", 20)
validateSecret(env, "MYSQL_PASSWORD", 20)
validateSecret(env, "JWT_SECRET", 32)
validateSecret(env, "GRAFANA_ADMIN_PASSWORD", 20)

if (env.MYSQL_ROOT_PASSWORD && env.MYSQL_ROOT_PASSWORD === env.MYSQL_PASSWORD) {
  addSecretError("MYSQL_ROOT_PASSWORD y MYSQL_PASSWORD deben ser diferentes")
}

if (env.PREDIA_ENCRYPTION_KEY && !isValidEncryptionKey(env.PREDIA_ENCRYPTION_KEY)) {
  addSecretError("PREDIA_ENCRYPTION_KEY debe representar exactamente 32 bytes en base64 o hex")
}

let databaseUrl
try {
  databaseUrl = new URL(env.DATABASE_URL)
  if (databaseUrl.protocol !== "mysql:") addError("DATABASE_URL debe usar mysql://")
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(databaseUrl.hostname)) {
    addError("DATABASE_URL no puede apuntar a localhost dentro de Docker; usa db o un host MySQL externo")
  }
  if (databaseUrl.hostname === "db") {
    if (decodeURIComponent(databaseUrl.username) !== env.MYSQL_USER) {
      addError("El usuario de DATABASE_URL no coincide con MYSQL_USER")
    }
    if (decodeURIComponent(databaseUrl.password) !== env.MYSQL_PASSWORD) {
      addError("La contrasena de DATABASE_URL no coincide con MYSQL_PASSWORD")
    }
    if (databaseUrl.pathname.slice(1) !== env.MYSQL_DATABASE) {
      addError("La base de DATABASE_URL no coincide con MYSQL_DATABASE")
    }
  }
} catch {
  addError("DATABASE_URL no es una URL MySQL valida")
}

let appUrl
try {
  appUrl = new URL(env.APP_URL)
  if (appUrl.protocol !== "https:") addError("APP_URL debe usar HTTPS")
  if (appUrl.pathname !== "/") addError("APP_URL no debe incluir una ruta")
} catch {
  addError("APP_URL no es una URL valida")
}

for (const key of ["NEXT_PUBLIC_API_URL", "EXPO_PUBLIC_API_URL"]) {
  try {
    const apiUrl = new URL(env[key])
    if (apiUrl.protocol !== "https:") addError(`${key} debe usar HTTPS`)
    if (apiUrl.pathname.replace(/\/$/, "") !== "/api") addError(`${key} debe terminar en /api`)
    if (appUrl && apiUrl.origin !== appUrl.origin) addError(`${key} debe usar el mismo origen que APP_URL`)
  } catch {
    addError(`${key} no es una URL valida`)
  }
}

if (appUrl) {
  if (env.PREDIA_DOMAIN && env.PREDIA_DOMAIN !== appUrl.hostname) {
    addError("PREDIA_DOMAIN debe coincidir con el host de APP_URL")
  }
  if (env.COOKIE_DOMAIN && env.COOKIE_DOMAIN.replace(/^\./, "") !== appUrl.hostname) {
    addError("COOKIE_DOMAIN debe coincidir con el host de APP_URL")
  }
  const allowedOrigins = (env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim())
  if (!allowedOrigins.includes(appUrl.origin)) {
    addError("ALLOWED_ORIGINS debe incluir el origen exacto de APP_URL")
  }
  if (allowedOrigins.includes("*")) addError("ALLOWED_ORIGINS no puede contener *")
}

if (env.PREDIA_DOMAIN && /^(localhost|\d{1,3}(?:\.\d{1,3}){3})$/.test(env.PREDIA_DOMAIN)) {
  addError("PREDIA_DOMAIN debe ser un dominio DNS, no localhost ni una IP")
}

if (env.LETSENCRYPT_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.LETSENCRYPT_EMAIL)) {
  addError("LETSENCRYPT_EMAIL no tiene un formato valido")
}

if (env.SEED_DEMO_DATA === "true") {
  if (!env.DEMO_USER_PASSWORD || env.DEMO_USER_PASSWORD.length < 16 || isPlaceholder(env.DEMO_USER_PASSWORD)) {
    addSecretError("DEMO_USER_PASSWORD debe tener al menos 16 caracteres y no ser un valor conocido")
  }
  if (!/^\d{6}$/.test(env.DEMO_PATIENT_PIN || "") || env.DEMO_PATIENT_PIN === "123456") {
    addSecretError("DEMO_PATIENT_PIN debe ser un PIN aleatorio de 6 digitos")
  }
}

if (!env.OPENAI_API_KEY) {
  warnings.push("OPENAI_API_KEY no esta configurada; el dictado funcionara en modo demostracion")
}

for (const warning of warnings) console.warn(`AVISO: ${warning}`)

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR: ${error}`)
  console.error(`\nConfiguracion de produccion invalida: ${errors.length} error(es).`)
  process.exit(1)
}

console.log(`Configuracion de produccion valida: ${path.basename(envPath)}`)
