import { Search as SearchIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KEYWORDS } from "@/lib/data";

export function KeywordsCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <SearchIcon className="w-5 h-5 text-muted-foreground" />
          <CardTitle>追踪关键词库</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">求职 & 失业 (Job Seeker & Anxiety)</h4>
          <div className="flex flex-wrap gap-2">
            {KEYWORDS.jobSearch.map(k => <Badge key={k} variant="secondary">{k}</Badge>)}
            {KEYWORDS.unemployment.map(k => <Badge key={k} variant="destructive">{k}</Badge>)}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">考试 & 避险 (Exams & Education)</h4>
          <div className="flex flex-wrap gap-2">
            {KEYWORDS.exams.map(k => <Badge key={k} variant="outline">{k}</Badge>)}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">招聘 (Recruitment)</h4>
          <div className="flex flex-wrap gap-2">
            {KEYWORDS.recruitment.map(k => <Badge key={k} variant="outline">{k}</Badge>)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
