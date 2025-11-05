import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { cn } from '../../utils/cn';

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  trend,
  className,
}) => {
  const trendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-success-600" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-error-600" />;
    return <Minus className="w-4 h-4 text-neutral-400" />;
  };

  const trendColor = () => {
    if (trend === 'up') return 'text-success-600';
    if (trend === 'down') return 'text-error-600';
    return 'text-neutral-600';
  };

  return (
    <Card className={cn('hover:shadow-lg transition-shadow', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-neutral-900">{value}</p>
          </div>
          {icon && (
            <div className="flex-shrink-0 text-primary-600 bg-primary-50 rounded-lg p-3">
              {icon}
            </div>
          )}
        </div>

        {change && (
          <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor())}>
            {trendIcon()}
            <span>{change.value > 0 ? '+' : ''}{change.value}%</span>
            {change.label && (
              <span className="text-neutral-500 ml-1">vs {change.label}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

