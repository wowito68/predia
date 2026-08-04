import type { Usuario } from "@/types/database"

export type PublicUsuario = Omit<Usuario, "password_hash"> & { nombre_rol: string }

export const PUBLIC_USER_SELECT = `
  u.id_usuario,
  u.username,
  u.id_rol,
  u.nombre,
  u.apellido_paterno,
  u.apellido_materno,
  u.email,
  u.telefono,
  u.cedula_profesional,
  u.especialidad,
  u.activo,
  u.ultimo_acceso,
  u.fecha_registro,
  u.fecha_modificacion,
  r.nombre_rol
`
