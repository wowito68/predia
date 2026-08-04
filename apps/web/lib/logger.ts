type LogLevel = "error" | "warn" | "info" | "debug"

interface LogEntry {
    level: LogLevel
    context: string
    message: string
    timestamp: string
    metadata?: any
    stack?: string
}

class Logger {
    private isDevelopment = process.env.NODE_ENV === "development"

    private format(entry: LogEntry): string {
        const { level, context, message, timestamp, metadata } = entry
        const icon = {
            error: "❌",
            warn: "⚠️",
            info: "ℹ️",
            debug: "🐛",
        }[level]

        const metadataStr = metadata ? ` | ${JSON.stringify(metadata)}` : ""
        return `[${timestamp}] ${icon} [${level.toUpperCase()}] ${context}: ${message}${metadataStr}`
    }

    log(level: LogLevel, context: string, message: string, metadata?: any) {
        const entry: LogEntry = {
            level,
            context,
            message,
            timestamp: new Date().toISOString(),
            metadata,
        }

        const formatted = this.format(entry)

        if (level === "error") {
            console.error(formatted)
        } else if (level === "warn") {
            console.warn(formatted)
        } else if (level === "info") {
            console.info(formatted)
        } else if (this.isDevelopment) {
            console.log(formatted)
        }
    }

    error(context: string, message: string, error?: any) {
        const metadata = error ? {
            errorMessage: error.message,
            errorCode: (error as any).code,
            stack: error.stack,
        } : undefined

        this.log("error", context, message, metadata)
    }

    warn(context: string, message: string, metadata?: any) {
        this.log("warn", context, message, metadata)
    }

    info(context: string, message: string, metadata?: any) {
        this.log("info", context, message, metadata)
    }

    debug(context: string, message: string, metadata?: any) {
        this.log("debug", context, message, metadata)
    }
}

export const logger = new Logger()
