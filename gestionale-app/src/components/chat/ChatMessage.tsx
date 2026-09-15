import { Reply } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { CiteDocument, CiteQuote } from './CitationBlocks';
import { MessageBody } from './MessageBody';
import type { Message } from '../../types/models';

interface ChatMessageProps {
    message: Message;
    onReply: (message: Message) => void;
}

export function ChatMessage({ message, onReply }: ChatMessageProps) {
    return (
        <div className="group flex items-start gap-2.5">
            <Avatar
                name={message.senderName || '?'}
                src={message.senderAvatar}
                color={message.senderColor}
                size="sm"
            />
            <div className="flex-1 min-w-0">
                <p className="text-xs text-ink-muted leading-snug">
                    <span className="font-semibold text-ink">{message.senderName || 'Qualcuno'}</span>
                    <span className="text-[10px] text-ink-subtle ml-1.5">
                        {new Date(message.createdAt).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                </p>

                {message.reply && (
                    <CiteQuote author={message.reply.author} text={message.reply.text} />
                )}

                {message.citation && (
                    <CiteDocument
                        title={message.citation.title}
                        url={message.citation.url}
                        projectName={message.citation.projectName}
                        allowed={message.citation.allowed}
                    />
                )}

                {message.body ? (
                    <MessageBody text={message.body} mentions={message.mentions} />
                ) : null}

                <button
                    type="button"
                    onClick={() => onReply(message)}
                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-ink-subtle
                               hover:text-brand-400 transition-colors"
                >
                    <Reply className="w-3 h-3" aria-hidden="true" />
                    Rispondi
                </button>
            </div>
        </div>
    );
}
