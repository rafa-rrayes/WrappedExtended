"use client";

import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { Card } from "@/components/ui/card";
import type { AdminKPIs } from "@/types/admin";

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

interface KPICardsProps {
  kpis: AdminKPIs;
}

export function KPICards({ kpis }: KPICardsProps) {
  const cards = [
    {
      label: "Total Revenue",
      value: formatCents(kpis.total_revenue_cents),
      sub: `${formatCents(kpis.period_revenue_cents)} this period`,
      color: "text-green",
    },
    {
      label: "Users",
      value: formatNumber(kpis.total_users),
      sub: `+${formatNumber(kpis.period_new_users)} new | ${formatNumber(kpis.active_users_30d)} active`,
      color: "text-green",
    },
    {
      label: "Uploads",
      value: formatNumber(kpis.total_uploads),
      sub: `${formatNumber(kpis.period_uploads)} this period`,
      color: "text-green",
    },
    {
      label: "Success Rate",
      value: `${kpis.success_rate}%`,
      sub: `${formatNumber(kpis.total_dashboards)} dashboards`,
      color: kpis.success_rate >= 90 ? "text-green" : "text-gold",
    },
    {
      label: "Storage",
      value: formatBytes(kpis.total_storage_bytes),
      sub: `${formatNumber(kpis.total_uploads)} files`,
      color: "text-green",
    },
    {
      label: "Conversion",
      value: `${kpis.conversion_rate}%`,
      sub: `${formatNumber(kpis.paid_users)} paid users`,
      color: "text-gold",
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {cards.map((card) => (
        <motion.div key={card.label} variants={staggerItem}>
          <Card className="p-5">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              {card.label}
            </p>
            <p className={`text-2xl font-bold font-[family-name:var(--font-display)] ${card.color}`}>
              {card.value}
            </p>
            <p className="text-xs text-text-muted mt-1">{card.sub}</p>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
