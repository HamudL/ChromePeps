"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RevenueChartProps {
  data: { month: string; revenue: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const formatted = data.map((d) => ({
    month: d.month,
    revenue: d.revenue / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="month"
          className="text-xs"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          className="text-xs"
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) =>
            `\u20AC${value.toLocaleString("de-DE")}`
          }
        />
        <Tooltip
          formatter={(value: number) => [
            `\u20AC${value.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`,
            "Revenue",
          ]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid hsl(var(--border))",
            backgroundColor: "hsl(var(--background))",
          }}
        />
        <Bar
          dataKey="revenue"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
