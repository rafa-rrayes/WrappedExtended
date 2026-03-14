"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { UploadFunnel } from "@/types/admin";

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "#F5A623",
  pending: "#888",
  validating: "#3B82F6",
  processing: "#8B5CF6",
  completed: "#1DB954",
  failed: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending Payment",
  pending: "Pending",
  validating: "Validating",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

interface UploadFunnelChartProps {
  data: UploadFunnel;
}

export function UploadFunnelChart({ data }: UploadFunnelChartProps) {
  const chartData = Object.entries(data).map(([status, count]) => ({
    status: STATUS_LABELS[status] || status,
    count,
    key: status,
  }));

  return (
    <Card className="p-6">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold mb-4">
        Upload Status Breakdown
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 110 }}>
          <XAxis type="number" tick={{ fontSize: 11, fill: "#888" }} />
          <YAxis
            type="category"
            dataKey="status"
            width={110}
            tick={{ fontSize: 11, fill: "#bbb" }}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(10,10,10,0.92)",
              border: "1px solid rgba(29,185,84,0.3)",
              borderRadius: 8,
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.key}
                fill={STATUS_COLORS[entry.key] || "#888"}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
