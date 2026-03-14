"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { UserGrowthDataPoint } from "@/types/admin";

interface UserGrowthChartProps {
  data: UserGrowthDataPoint[];
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  return (
    <Card className="p-6">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold mb-4">
        User Growth
      </h3>
      {data.length === 0 ? (
        <p className="text-text-muted text-sm py-8 text-center">No user data</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#888" }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              yAxisId="bar"
              tick={{ fontSize: 11, fill: "#888" }}
            />
            <YAxis
              yAxisId="line"
              orientation="right"
              tick={{ fontSize: 11, fill: "#888" }}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(10,10,10,0.92)",
                border: "1px solid rgba(29,185,84,0.3)",
                borderRadius: 8,
              }}
              formatter={(value: number, name: string) => [
                value,
                name === "new_users" ? "New Users" : "Total Users",
              ]}
              labelFormatter={(label) => label}
            />
            <Bar
              yAxisId="bar"
              dataKey="new_users"
              fill="#1DB954"
              fillOpacity={0.7}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="line"
              dataKey="cumulative_users"
              stroke="#F5A623"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
