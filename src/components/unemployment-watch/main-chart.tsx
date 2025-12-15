"use client";

import React from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { DataPoint } from '@/lib/data';
import { useTheme } from '../layout/theme-provider';

interface MainChartProps {
  data: DataPoint[];
}

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
  const { theme } = useTheme();
  const gridColor = theme === 'dark' ? 'hsl(var(--border))' : 'hsl(var(--border))';
  const tickColor = theme === 'dark' ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))';

  return (
    <Card>
      <CardHeader>
        <CardTitle>影子失业指数趋势图</CardTitle>
        <CardDescription>周度数据 (已标准化 0-100)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] sm:h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => val.slice(0, 7)}
                stroke={tickColor}
                tick={{fontSize: 12}}
                minTickGap={40}
                axisLine={{ stroke: gridColor }}
                tickLine={{ stroke: gridColor }}
              />
              <YAxis 
                stroke={tickColor}
                tick={{fontSize: 12}}
                domain={[0, 100]}
                axisLine={{ stroke: gridColor }}
                tickLine={{ stroke: gridColor }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}/>
              <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}}/>
              <Area 
                type="monotone" 
                dataKey="compositeIndex" 
                name="综合影子指数"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorIndex)" 
                animationDuration={1500}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
