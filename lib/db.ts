// lib/db.ts
// Configuración de conexión a MariaDB usando mysql2

import { createPool, Pool, PoolConnection } from "mysql2/promise"

// Configuración del pool de conexiones
const pool: Pool = createPool({
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "3306"),
  user: process.env.DATABASE_USER || "predia_app",
  password: process.env.DATABASE_PASSWORD || "",
  database: process.env.DATABASE_NAME || "predia",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Función para ejecutar queries
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  try {
    const [rows] = await pool.execute(sql, params)
    return rows as T[]
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}

// Función para obtener una sola fila
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  try {
    const rows = await query<T>(sql, params)
    return rows.length > 0 ? rows[0] : null
  } catch (error) {
    console.error("Database queryOne error:", error)
    throw error
  }
}

// Función para ejecutar un procedimiento almacenado
export async function callProcedure<T = any>(procedureName: string, params: any[]): Promise<T> {
  try {
    const placeholders = params.map(() => "?").join(", ")
    const sql = `CALL ${procedureName}(${placeholders})`
    const [rows] = await pool.execute(sql, params)
    return rows as T
  } catch (error) {
    console.error("Database procedure error:", error)
    throw error
  }
}

/**
 * Ejecuta múltiples queries dentro de una transacción MySQL
 * Garantiza consistencia: BEGIN → operaciones → COMMIT o ROLLBACK
 * @param callback Función que recibe la conexión y ejecuta queries
 * @returns Resultado del callback
 * @throws Error si la transacción falla (se hace ROLLBACK automático)
 */
export async function transaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection()

  try {
    // Iniciar transacción
    await connection.beginTransaction()

    // Ejecutar operaciones del callback
    const result = await callback(connection)

    // Si todo va bien, hacer COMMIT
    await connection.commit()

    return result
  } catch (error) {
    // Si hay error, hacer ROLLBACK automático
    await connection.rollback()

    console.error("❌ Transaction error:", error)
    throw error
  } finally {
    // Siempre liberar la conexión al pool
    connection.release()
  }
}

// Verificar conexión
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection()
    await connection.ping()
    connection.release()
    console.log("✅ Database connection successful")
    return true
  } catch (error) {
    console.error("❌ Database connection failed:", error)
    return false
  }
}

// Cerrar pool (para cuando se apaga la aplicación)
export async function closePool(): Promise<void> {
  await pool.end()
  console.log("Database pool closed")
}

// Helpers para construir queries dinámicos
export const QueryBuilder = {
  insert(table: string, data: Record<string, any>) {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map(() => "?").join(", ")

    return {
      sql: `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
      params: values,
    }
  },

  update(table: string, data: Record<string, any>, where: string, whereParams: any[]) {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const setClause = keys.map((key) => `${key} = ?`).join(", ")

    return {
      sql: `UPDATE ${table} SET ${setClause} WHERE ${where}`,
      params: [...values, ...whereParams],
    }
  },

  delete(table: string, where: string, whereParams: any[]) {
    return {
      sql: `DELETE FROM ${table} WHERE ${where}`,
      params: whereParams,
    }
  },

  select(table: string, columns: string[] = ["*"], where?: string, whereParams?: any[]) {
    const sql = `SELECT ${columns.join(", ")} FROM ${table}${where ? ` WHERE ${where}` : ""}`
    return {
      sql,
      params: whereParams || [],
    }
  },
}

export default pool
