"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import type { DataPoint } from "@/lib/data";

interface MainChartProps {
  data: DataPoint[];
}

const chartConfig = {
  compositeIndex: {
    label: "综合影子指数",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">日期</span>
            <span className="font-bold text-muted-foreground">{label}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">综合指数</span>
            <span className="font-bold text-primary">{payload[0].value}</span>
          </div>
        </div>
        <div className="mt-2 border-t pt-2 text-xs text-muted-foreground space-y-1">
          <p>求职意向: {payload[0].payload.jobSearch}</p>
          <p>失业焦虑: {payload[0].payload.unemployment}</p>
          <p>考试/避险: {payload[0].payload.exams}</p>
        </div>
      </div>
    );
  }
  return null;
};

export function MainChart({ data }: MainChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>影子失业指数趋势图 (Trends in the Shadow Unemployment Index)</CardTitle>
        <CardDescription>周度数据 (已标准化 0-100)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full sm:h-[450px]">
          <AreaChart accessibilityLayer data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-compositeIndex)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-compositeIndex)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickFormatter={(val) => val.slice(0, 7)}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              minTickGap={40}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              domain={[0, 100]}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--accent) / 0.1)" }} />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
            <Area
              type="monotone"
              dataKey="compositeIndex"
              name="综合影子指数"
              stroke="var(--color-compositeIndex)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorIndex)"
              animationDuration={1500}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
