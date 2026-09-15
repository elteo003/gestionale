import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const variantStyles = {
  success: 'bg-brand-950/90 border-brand-700/50 text-brand-200',
  error: 'bg-error-900/80 border-error-800/50 text-error-200',
  warning: 'bg-warning-900/80 border-warning-800/50 text-warning-200',
  info: 'bg-surface-raised border-line/60 text-ink',
};

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  message,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 10);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (duration > 0) {
      timer = setTimeout(() => handleClose(), duration);
    }
    return () => {
      clearTimeout(t);
      if (timer) clearTimeout(timer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(id), 180);
  };

  const Icon = iconMap[type];

  const [title, ...rest] = message.split(' — ');
  const body = rest.length > 0 ? rest.join(' — ') : null;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3.5 rounded-2xl border shadow-panel backdrop-blur-xl',
        'min-w-[280px] max-w-[420px]',
        'transition-[transform,opacity] duration-[180ms] ease-[cubic-bezier(0.19,1,0.22,1)]',
        variantStyles[type],
        isVisible && !isLeaving
          ? 'translate-y-0 opacity-100 scale-100'
          : 'translate-y-2 opacity-0 scale-[0.98]',
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-80" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug tracking-tight">{title}</p>
        {body && <p className="text-xs opacity-85 mt-0.5 leading-relaxed">{body}</p>}
      </div>
      <button
        type="button"
        onClick={handleClose}
        className="flex-shrink-0 text-ink-subtle hover:text-ink transition-colors"
        aria-label="Chiudi notifica"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export interface ToastContainerProps {
  toasts: Array<{
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
  }>;
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onClose,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[100] flex flex-col-reverse gap-2.5 pointer-events-none [&>*]:pointer-events-auto"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={onClose}
        />
      ))}
    </div>
  );
};
