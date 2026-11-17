import { Header } from '@/components/layout/header';

export default function Page() {
  return (
    <>
      <Header />
      <main className="container py-10">
        <h1 className="text-3xl font-bold">中国就业市场观察</h1>
        <p className="mt-3 text-muted-foreground">暂无通过质量验证的观测数据。</p>
      </main>
    </>
  );
}
