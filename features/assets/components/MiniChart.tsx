import React, { useMemo } from 'react';

type Point = { x: number; y: number };

export default function MiniChart({ data, height = 64, stroke = '#38bdf8', fill = 'rgba(56,189,248,0.15)' }: { data: Point[]; height?: number; stroke?: string; fill?: string; }): React.ReactNode {
    const { path, minY, maxY } = useMemo(() => {
        if (!data || data.length === 0) return { path: '', minY: 0, maxY: 0 };
        const minX = data[0].x;
        const maxX = data[data.length - 1].x;
        const minY = data.reduce((m, p) => Math.min(m, p.y), data[0].y);
        const maxY = data.reduce((m, p) => Math.max(m, p.y), data[0].y);
        const w = 200;
        const h = height;
        const scaleX = (x: number) => (w * (x - minX)) / ((maxX - minX) || 1);
        const scaleY = (y: number) => h - (h * (y - minY)) / ((maxY - minY) || 1);
        const d = data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`).join(' ');
        const area = `${d} L ${w} ${h} L 0 ${h} Z`;
        return { path: d, fillPath: area, minY, maxY } as any;
    }, [data, height]);

    if (!data || data.length === 0) return <div className="h-16" />;
    const w = 200;
    const h = height;

    const min = minY;
    const max = maxY;

    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
            <path d={(path && (path + ` L ${w} ${h} L 0 ${h} Z`)) || ''} fill={fill} />
            <path d={path} fill="none" stroke={stroke} strokeWidth={2} />
            {/* Optional min/max dots */}
        </svg>
    );
}


