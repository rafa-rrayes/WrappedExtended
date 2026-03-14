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
import type { RevenueDataPoint } from "@/types/admin";

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    amount: d.amount_cents / 100,
    cumulative: d.cumulative_cents / 100,
  }));

  return (
    <Card className="p-6">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold mb-4">
        Revenue
      </h3>
      {formatted.length === 0 ? (
        <p className="text-text-muted text-sm py-8 text-center">No revenue data</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#888" }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              yAxisId="bar"
              tick={{ fontSize: 11, fill: "#888" }}
              tickFormatter={(v) => `$${v}`}
            />
            <YAxis
              yAxisId="line"
              orientation="right"
              tick={{ fontSize: 11, fill: "#888" }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(10,10,10,0.92)",
                border: "1px solid rgba(29,185,84,0.3)",
                borderRadius: 8,
              }}
              formatter={(value: number, name: string) => [
                `$${value.toFixed(2)}`,
                name === "amount" ? "Revenue" : "Cumulative",
              ]}
              labelFormatter={(label) => label}
            />
            <Bar
              yAxisId="bar"
              dataKey="amount"
              fill="#1DB954"
              fillOpacity={0.7}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="line"
              dataKey="cumulative"
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
