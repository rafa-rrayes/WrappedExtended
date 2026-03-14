"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { UploadDataPoint } from "@/types/admin";

interface UploadTrendChartProps {
  data: UploadDataPoint[];
}

export function UploadTrendChart({ data }: UploadTrendChartProps) {
  return (
    <Card className="p-6">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold mb-4">
        Upload Trends
      </h3>
      {data.length === 0 ? (
        <p className="text-text-muted text-sm py-8 text-center">No upload data</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#888" }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis tick={{ fontSize: 11, fill: "#888" }} />
            <Tooltip
              contentStyle={{
                background: "rgba(10,10,10,0.92)",
                border: "1px solid rgba(29,185,84,0.3)",
                borderRadius: 8,
              }}
            />
            <Legend />
            <Bar
              dataKey="completed"
              stackId="uploads"
              fill="#1DB954"
              fillOpacity={0.8}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="failed"
              stackId="uploads"
              fill="#ef4444"
              fillOpacity={0.8}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
