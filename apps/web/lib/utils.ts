// lib/utils.ts
// Utilidades generales

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calcula la edad basada en fecha de nacimiento
 */
export function calcularEdad(fechaNacimiento: Date | string): number {
  const fecha = typeof fechaNacimiento === "string" ? new Date(fechaNacimiento) : fechaNacimiento
  const hoy = new Date()
  let edad = hoy.getFullYear() - fecha.getFullYear()
  const mes = hoy.getMonth() - fecha.getMonth()

  if (mes < 0 || (mes === 0 && hoy.getDate() < fecha.getDate())) {
    edad--
  }

  return edad
}

/**
 * Formatea una fecha a string legible
 */
export function formatearFecha(fecha: Date | string, formato: "corto" | "largo" = "largo"): string {
  const f = typeof fecha === "string" ? new Date(fecha) : fecha
  const opciones: Intl.DateTimeFormatOptions =
    formato === "corto"
      ? { year: "numeric", month: "2-digit", day: "2-digit" }
      : { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }
  return f.toLocaleDateString("es-ES", opciones)
}

/**
 * Formatea un número con decimales
 */
export function formatearNumero(valor: number, decimales: number = 2): string {
  return valor.toFixed(decimales).replace(".", ",")
}

/**
 * Valida formato de email
 */
export function esEmailValido(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Genera un nombre completo a partir de componentes
 */
export function generarNombreCompleto(
  nombre: string,
  apellidoPaterno: string,
  apellidoMaterno?: string,
): string {
  const partes = [nombre, apellidoPaterno]
  if (apellidoMaterno) {
    partes.push(apellidoMaterno)
  }
  return partes.join(" ")
}

/**
 * Obtiene iniciales de un nombre
 */
export function obtenerIniciales(nombre: string): string {
  return nombre
    .split(" ")
    .map((n) => n.charAt(0).toUpperCase())
    .join("")
    .substring(0, 2)
}

/**
 * Obtiene el color de riesgo según nivel
 */
export function obtenerColorRiesgo(
  nivel: "Bajo" | "Moderado" | "Alto" | "Muy Alto",
): string {
  switch (nivel) {
    case "Bajo":
      return "text-green-600 bg-green-50 border-green-200"
    case "Moderado":
      return "text-yellow-600 bg-yellow-50 border-yellow-200"
    case "Alto":
      return "text-orange-600 bg-orange-50 border-orange-200"
    case "Muy Alto":
      return "text-red-600 bg-red-50 border-red-200"
    default:
      return "text-gray-600 bg-gray-50 border-gray-200"
  }
}

/**
 * Capitaliza la primera letra de un texto
 */
export function capitalizarPrimera(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase()
}
