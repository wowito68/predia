"use client"

import { memo } from 'react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface VitalSignsChartProps {
    data: any[]
    title: string
    description?: string
    dataKeys: { key: string, name: string, color: string }[]
    xAxisKey?: string
}

export const VitalSignsChart = memo(function VitalSignsChart({
    data,
    title,
    description,
    dataKeys,
    xAxisKey = "fecha"
}: VitalSignsChartProps) {

    if (!data || data.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No hay datos disponibles para gráfico
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey={xAxisKey}
                                tickFormatter={(val) => {
                                    const date = new Date(val)
                                    return isNaN(date.getTime()) ? val : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                }}
                            />
                            <YAxis />
                            <Tooltip
                                labelFormatter={(val) => new Date(val).toLocaleDateString()}
                            />
                            <Legend />
                            {dataKeys.map((k) => (
                                <Line
                                    key={k.key}
                                    type="monotone"
                                    dataKey={k.key}
                                    name={k.name}
                                    stroke={k.color}
                                    activeDot={{ r: 8 }}
                                    strokeWidth={2}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
})
