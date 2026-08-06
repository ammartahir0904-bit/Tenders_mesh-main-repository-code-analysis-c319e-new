// ─── ScoreRadar: Recharts 4-point radar chart for AI match score ───

import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

interface ScoreRadarProps {
  scoreReasons: Record<string, number>;
}

const DEFAULT_AXES = ['relevance', 'capacity', 'location', 'requirements'];

export const ScoreRadar: React.FC<ScoreRadarProps> = ({ scoreReasons }) => {
  const axes = Object.keys(scoreReasons).length > 0
    ? Object.keys(scoreReasons)
    : DEFAULT_AXES;

  const data = axes.map((key) => ({
    axis: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
    value: Math.round((scoreReasons[key] ?? 0) * 100),
    fullMark: 100,
  }));

  return (
    <div className="h-[220px] w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          {/* Custom gradient fill definition */}
          <defs>
            <radialGradient id="scoreRadarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#0891b2" stopOpacity={0.05} />
            </radialGradient>
          </defs>
          <PolarGrid
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 4"
          />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="AI Alignment"
            dataKey="value"
            stroke="#22d3ee"
            fill="url(#scoreRadarGlow)"
            strokeWidth={1.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScoreRadar;

