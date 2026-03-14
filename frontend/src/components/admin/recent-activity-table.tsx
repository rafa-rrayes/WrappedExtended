"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RecentActivity } from "@/types/admin";

interface RecentActivityTableProps {
  data: RecentActivity[];
}

function getTypeBadge(type: string) {
  switch (type) {
    case "payment":
      return <Badge variant="gold">Payment</Badge>;
    case "upload":
      return <Badge variant="green">Upload</Badge>;
    case "registration":
      return <Badge variant="muted">Signup</Badge>;
    default:
      return <Badge variant="muted">{type}</Badge>;
  }
}

function getStatusColor(status: string | null): string {
  switch (status) {
    case "completed":
      return "text-green";
    case "failed":
      return "text-red-500";
    case "processing":
    case "validating":
      return "text-blue-400";
    default:
      return "text-text-muted";
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RecentActivityTable({ data }: RecentActivityTableProps) {
  return (
    <Card className="p-6">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold mb-4">
        Recent Activity
      </h3>
      {data.length === 0 ? (
        <p className="text-text-muted text-sm py-4 text-center">No recent activity</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">User</th>
                <th className="pb-2 pr-4 font-medium">Detail</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2.5 pr-4">{getTypeBadge(row.type)}</td>
                  <td className="py-2.5 pr-4 font-medium">{row.user}</td>
                  <td className="py-2.5 pr-4 text-text-muted max-w-[200px] truncate">
                    {row.detail}
                  </td>
                  <td className={`py-2.5 pr-4 ${getStatusColor(row.status)}`}>
                    {row.status || "—"}
                  </td>
                  <td className="py-2.5 text-text-muted whitespace-nowrap">
                    {formatTime(row.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
