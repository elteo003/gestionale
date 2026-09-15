import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { TRANSITION } from '../../motion/presets';
import { useReducedMotion } from '../../motion/useReducedMotion';

export interface CiteQuoteData {
    id?: string;
    author?: string | null;
    text: string;
}

export interface CiteDocumentData {
    id?: string;
    title?: string | null;
    url?: string | null;
    projectName?: string | null;
    size?: string;
    progress?: number;
    allowed?: boolean;
}

export function CiteQuote({ author, text }: CiteQuoteData) {
    if (!text) return null;
    return (
        <div className="mt-2 pl-3 border-l-2 border-brand-600/40">
            <p className="text-[11px] text-ink-muted leading-relaxed">
                {author && (
                    <span className="text-brand-400 font-medium">@{author} </span>
                )}
                {text}
            </p>
        </div>
    );
}

export function CiteDocument({
    title,
    url,
    projectName,
    size,
    progress,
    allowed = true,
}: CiteDocumentData) {
    const reduced = useReducedMotion();
    const locked = allowed === false;
    const label = locked ? 'Documento riservato' : (title || 'Documento');

    const inner = (
        <>
            <div className="flex items-center gap-2.5 mb-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-grad-brand">
                    <FileText className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${locked ? 'text-ink-subtle' : 'text-ink'}`}>
                        {label}
                    </p>
                    {(size || projectName) && !locked && (
                        <p className="text-[10px] text-ink-subtle truncate">
                            {projectName}{size ? ` · ${size}` : ''}
                        </p>
                    )}
                    {locked && (
                        <p className="text-[10px] text-ink-subtle">Non hai i permessi per aprirlo</p>
                    )}
                </div>
                {typeof progress === 'number' && !locked && (
                    <span className="text-xs text-ink font-semibold tabular-nums">{progress}%</span>
                )}
            </div>
            {typeof progress === 'number' && !locked && (
                <div className="h-1 rounded-full bg-surface-inset overflow-hidden mt-2">
                    <motion.div
                        className="h-full rounded-full progress-glass-fill"
                        initial={reduced ? false : { width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={reduced ? { duration: 0 } : TRANSITION.slow}
                    />
                </div>
            )}
        </>
    );

    const shell = 'mt-2 rounded-xl bg-surface-inset/70 border border-line/40 p-2.5 block w-full text-left';

    if (!locked && url) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${shell} hover:border-brand-600/40 transition-colors`}
            >
                {inner}
            </a>
        );
    }

    return <div className={shell}>{inner}</div>;
}
