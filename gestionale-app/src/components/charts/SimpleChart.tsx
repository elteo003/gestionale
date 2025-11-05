import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { colors } from '../../design-system/theme';

const CHART_COLORS = [
  colors.primary[600],
  colors.secondary[600],
  colors.semantic.success[600],
  colors.semantic.warning[600],
  colors.semantic.info[600],
  colors.semantic.error[600],
];

export interface LineChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface SimpleLineChartProps {
  data: LineChartData[];
  dataKey: string;
  lines?: Array<{ dataKey: string; name: string; color?: string }>;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  dataKey,
  lines = [{ dataKey, name: 'Valore' }],
  height = 300,
  showGrid = true,
  showLegend = true,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={colors.neutral[200]} />}
        <XAxis dataKey="name" stroke={colors.neutral[600]} />
        <YAxis stroke={colors.neutral[600]} />
        <Tooltip
          contentStyle={{
            backgroundColor: colors.background.light,
            border: `1px solid ${colors.neutral[200]}`,
            borderRadius: '8px',
          }}
        />
        {showLegend && <Legend />}
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color || CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export interface SimpleBarChartProps {
  data: LineChartData[];
  dataKey: string;
  bars?: Array<{ dataKey: string; name: string; color?: string }>;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  dataKey,
  bars = [{ dataKey, name: 'Valore' }],
  height = 300,
  showGrid = true,
  showLegend = true,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={colors.neutral[200]} />}
        <XAxis dataKey="name" stroke={colors.neutral[600]} />
        <YAxis stroke={colors.neutral[600]} />
        <Tooltip
          contentStyle={{
            backgroundColor: colors.background.light,
            border: `1px solid ${colors.neutral[200]}`,
            borderRadius: '8px',
          }}
        />
        {showLegend && <Legend />}
        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color || CHART_COLORS[index % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export interface PieChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface SimplePieChartProps {
  data: PieChartData[];
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

export const SimplePieChart: React.FC<SimplePieChartProps> = ({
  data,
  height = 300,
  showLegend = true,
  innerRadius = 0,
  outerRadius = 80,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(props: any) => {
            const { name, percent } = props;
            return `${name} ${((percent || 0) * 100).toFixed(0)}%`;
          }}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: colors.background.light,
            border: `1px solid ${colors.neutral[200]}`,
            borderRadius: '8px',
          }}
        />
        {showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );
};

