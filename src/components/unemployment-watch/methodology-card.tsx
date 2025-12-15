import { Briefcase, GraduationCap, Info, Search, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function MethodologyCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-muted-foreground" />
          <CardTitle>计算方法 (Methodology)</CardTitle>
        </div>
        <CardDescription>
          各关键词组通过 Google Trends 标准化处理 (0-100)，然后根据以下权重合成最终指数：
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-primary/90"><Search className="w-4 h-4"/> 求职/个人端</span>
            <span className="font-mono font-bold text-primary">35%</span>
          </div>
          <Progress value={35} aria-label="35% 求职/个人端" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-destructive/90"><AlertCircle className="w-4 h-4"/> 失业/焦虑相关</span>
            <span className="font-mono font-bold text-destructive">25%</span>
          </div>
          <Progress value={25} indicatorClassName="bg-destructive" aria-label="25% 失业/焦虑相关" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-emerald-500"><Briefcase className="w-4 h-4"/> 招聘/企业端</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-500">20%</span>
          </div>
          <Progress value={20} indicatorClassName="bg-emerald-500" aria-label="20% 招聘/企业端" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-violet-500"><GraduationCap className="w-4 h-4"/> 考试/避险 (考研/考公)</span>
            <span className="font-mono font-bold text-violet-600 dark:text-violet-500">20%</span>
          </div>
          <Progress value={20} indicatorClassName="bg-violet-500" aria-label="20% 考试/避险" />
        </div>
      </CardContent>
    </Card>
  );
}
