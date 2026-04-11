"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface RevenueChartProps {
  data: { month: string; revenue: number; orders: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const formatted = data.map((d) => ({
    month: d.month,
    revenue: d.revenue / 100,
    orders: d.orders,
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="month"
          className="text-xs"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="revenue"
          orientation="left"
          className="text-xs"
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) =>
            `\u20AC${value.toLocaleString("de-DE")}`
          }
        />
        <YAxis
          yAxisId="orders"
          orientation="right"
          className="text-xs"
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === "revenue") {
              return [
                `\u20AC${value.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`,
                "Revenue",
              ];
            }
            return [value, "Orders"];
          }}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid hsl(var(--border))",
            backgroundColor: "hsl(var(--background))",
            fontSize: "12px",
          }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value: string) =>
            value === "revenue" ? "Revenue (\u20AC)" : "Orders"
          }
        />
        <Line
          yAxisId="revenue"
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          yAxisId="orders"
          type="monotone"
          dataKey="orders"
          stroke="hsl(262, 83%, 58%)"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
