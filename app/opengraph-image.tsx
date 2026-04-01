import { ImageResponse } from 'next/og';
import { getTrendsData } from '@/lib/data';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  const data = getTrendsData();
  const latest = data.at(-1);
  const previous = data.at(-2);
  const change =
    latest && previous
      ? ((latest.compositeIndex ?? 0) - (previous.compositeIndex ?? 0)).toFixed(1)
      : '0.0';

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'stretch',
          background:
            'radial-gradient(circle at top right, rgba(34,211,238,0.18), transparent 26%), linear-gradient(135deg, #f7fafc 0%, #e2e8f0 50%, #f8fafc 100%)',
          color: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif',
          height: '100%',
          justifyContent: 'space-between',
          padding: '56px',
          width: '100%',
        }}
      >
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            fontSize: 24,
            fontWeight: 700,
            gap: 14,
            letterSpacing: '-0.03em',
          }}
        >
          <div
            style={{
              alignItems: 'center',
              background: '#0f172a',
              borderRadius: 999,
              color: '#f8fafc',
              display: 'flex',
              height: 44,
              justifyContent: 'center',
              width: 44,
            }}
          >
            CU
          </div>
          China Unemployment Watch
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 920 }}>
          <div
            style={{
              color: '#0891b2',
              display: 'flex',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Shadow Index Dashboard
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: '-0.05em',
              lineHeight: 1.05,
            }}
          >
            基于 Google Trends 的中国就业焦虑观察
          </div>
          <div
            style={{
              color: '#475569',
              display: 'flex',
              fontSize: 28,
              lineHeight: 1.4,
            }}
          >
            非官方研究型仪表盘，追踪求职、失业、招聘与考试相关搜索热度的周度变化。
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24 }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid rgba(148,163,184,0.25)',
              borderRadius: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minWidth: 260,
              padding: '22px 24px',
            }}
          >
            <div style={{ color: '#64748b', display: 'flex', fontSize: 18 }}>Latest Index</div>
            <div style={{ display: 'flex', fontSize: 52, fontWeight: 800 }}>
              {latest?.compositeIndex ?? '--'}
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid rgba(148,163,184,0.25)',
              borderRadius: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minWidth: 260,
              padding: '22px 24px',
            }}
          >
            <div style={{ color: '#64748b', display: 'flex', fontSize: 18 }}>Week-over-Week</div>
            <div style={{ display: 'flex', fontSize: 52, fontWeight: 800 }}>
              {Number(change) >= 0 ? `+${change}` : change}
            </div>
          </div>
          <div
            style={{
              background: '#0f172a',
              borderRadius: 24,
              color: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minWidth: 360,
              padding: '22px 24px',
            }}
          >
            <div style={{ color: '#cbd5e1', display: 'flex', fontSize: 18 }}>Updated Through</div>
            <div style={{ display: 'flex', fontSize: 36, fontWeight: 800 }}>{latest?.date ?? 'N/A'}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
