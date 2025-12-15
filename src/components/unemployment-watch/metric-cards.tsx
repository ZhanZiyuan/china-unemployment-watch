import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";

interface MetricCardsProps {
  currentStatus: {
    index: number;
    change: number;
    date: string;
  };
}

export function MetricCards({ currentStatus }: MetricCardsProps) {
  const isUp = currentStatus.change >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            当前综合指数
          </CardTitle>
          <div className={`flex items-center text-xs font-medium ${isUp ? 'text-destructive' : 'text-green-600'}`}>
            {isUp ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
            {isUp ? '+' : ''}{currentStatus.change} vs上周
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">{currentStatus.index}</div>
          <p className="text-xs text-muted-foreground">
            更新至: {currentStatus.date}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">数据来源</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Google Trends</div>
          <p className="text-xs text-muted-foreground">
            追踪超过15个相关中文关键词
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">指数说明</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-4 4s1.78 4 4 4c0 2.22-1.78 4-4 4z"/>
            <path d="M12 20.94c-1.5 0-2.75 1.06-4 1.06-3 0-6-8-6-12.22A4.91 4.91 0 0 1 7 5c2.22 0-4 1.44-4 4s1.78 4 4 4c0 2.22-1.78 4-4 4z"/>
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">非官方指标</div>
          <p className="text-xs text-muted-foreground">
            反映就业市场焦虑情绪与活跃度
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
