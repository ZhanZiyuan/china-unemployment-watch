import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'China Unemployment Watch',
    short_name: 'CU Watch',
    description: '基于 Google Trends 搜索数据构建的非官方就业焦虑监测指标。',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7fafc',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
