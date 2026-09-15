import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { FileText, MessageSquare, Plus, Send, X } from 'lucide-react';
import { messagesAPI, usersAPI } from '../services/api';
import { useChatSocket } from '../features/inbox/useChatSocket';
import type { Chat, CitableDocument, Message, Project, User } from '../types/models';
import { ChatMessage } from '../components/chat/ChatMessage';
import { CiteDocument, CiteQuote } from '../components/chat/CitationBlocks';
import { DocumentPicker } from '../components/chat/DocumentPicker';
import { MentionPicker } from '../components/chat/MentionPicker';
import {
    filterMentionCandidates,
    insertMention,
    mentionQueryAt,
    mentionsStillInBody,
} from '../lib/mentionQuery';

function upsertMessage(list: Message[], incoming: Message) {
    if (list.some(m => m.id === incoming.id)) return list;
    return [...list, incoming];
}

export function InboxPage() {
    const { activeProjectId, projects, user } = useOutletContext<{
        activeProjectId: string | null;
        user: User | null;
        projects: Project[];
    }>();
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [caret, setCaret] = useState(0);
    const [newChatName, setNewChatName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [citedDoc, setCitedDoc] = useState<CitableDocument | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [members, setMembers] = useState<User[]>([]);
    const [pendingMentions, setPendingMentions] = useState<User[]>([]);
    const [mentionIndex, setMentionIndex] = useState(0);
    const [mentionDismissedStart, setMentionDismissedStart] = useState<number | null>(null);
    const [searchParams] = useSearchParams();
    const chatFromUrl = searchParams.get('chat');
    const messagesRef = useRef<Message[]>([]);
    const activeChatIdRef = useRef<string | null>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    messagesRef.current = messages;
    activeChatIdRef.current = activeChatId;

    const applyIncoming = useCallback((incoming: Message) => {
        const currentChat = activeChatIdRef.current;
        if (incoming.chatId === currentChat) {
            setMessages(prev => upsertMessage(prev, incoming));
        }
        setChats(prev => prev.map(chat => {
            if (chat.id !== incoming.chatId) return chat;
            return {
                ...chat,
                updatedAt: incoming.createdAt,
                lastMessage: {
                    id: incoming.id,
                    body: incoming.body || incoming.citation?.title || 'Citazione',
                    senderId: incoming.senderId || '',
                    senderName: incoming.senderName || undefined,
                    createdAt: incoming.createdAt,
                },
            };
        }));
    }, []);

    const catchUp = useCallback(async () => {
        const chatId = activeChatIdRef.current;
        const lastId = messagesRef.current.at(-1)?.id;
        if (!chatId || !lastId) return;
        try {
            const extra: Message[] = await messagesAPI.getMessages(chatId, { after: lastId });
            extra.forEach(applyIncoming);
        } catch {
            /* il prossimo reconnect ritenta */
        }
    }, [applyIncoming]);

    useChatSocket({
        chatId: activeChatId,
        onMessage: applyIncoming,
        onReady: catchUp,
    });

    useEffect(() => {
        messagesAPI
            .getChats()
            .then((list: Chat[]) => {
                setChats(list);
                if (list.length) setActiveChatId(list[0].id);
            })
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!chatFromUrl) return;
        if (chats.some((c) => c.id === chatFromUrl)) setActiveChatId(chatFromUrl);
    }, [chatFromUrl, chats]);

    useEffect(() => {
        if (!activeChatId) {
            setMessages([]);
            setReplyTo(null);
            setCitedDoc(null);
            setPickerOpen(false);
            setMembers([]);
            setPendingMentions([]);
            return;
        }
        let cancelled = false;
        messagesAPI
            .getMessages(activeChatId)
            .then(msgs => { if (!cancelled) setMessages(msgs); })
            .catch((e: Error) => { if (!cancelled) setError(e.message); });
        messagesAPI
            .getMembers(activeChatId)
            .then((rows: User[]) => { if (!cancelled) setMembers(rows); })
            .catch(() => { if (!cancelled) setMembers([]); });
        return () => { cancelled = true; };
    }, [activeChatId]);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [messages, activeChatId]);

    const rawMention = mentionQueryAt(draft, caret);
    const mention = rawMention && rawMention.start !== mentionDismissedStart ? rawMention : null;
    const mentionHits = mention
        ? filterMentionCandidates(members, mention.query, user?.id)
        : [];

    const pickMention = (person: User) => {
        if (!mention) return;
        const next = insertMention(draft, caret, mention.start, person.name);
        setDraft(next.text);
        setCaret(next.caret);
        setMentionDismissedStart(null);
        setPendingMentions((prev) => (prev.some((p) => p.id === person.id) ? prev : [...prev, person]));
        requestAnimationFrame(() => {
            const el = inputRef.current;
            if (!el) return;
            el.focus();
            el.setSelectionRange(next.caret, next.caret);
        });
    };

    useEffect(() => {
        setMentionIndex(0);
    }, [mention?.query, mention?.start, activeChatId]);

    const send = async () => {
        if (!activeChatId) return;
        const body = draft.trim();
        if (!body && !replyTo && !citedDoc) return;
        const mentionIds = mentionsStillInBody(body, [...pendingMentions, ...members])
            .map((p) => p.id)
            .filter((id, i, all) => Boolean(id) && all.indexOf(id) === i);
        setDraft('');
        setCaret(0);
        const pendingReply = replyTo;
        const pendingDoc = citedDoc;
        const pendingPeople = pendingMentions;
        setReplyTo(null);
        setCitedDoc(null);
        setPickerOpen(false);
        setPendingMentions([]);
        setMentionDismissedStart(null);
        try {
            const msg = await messagesAPI.sendMessage(activeChatId, body, {
                replyToId: pendingReply?.id,
                citedResourceId: pendingDoc?.id,
                mentionIds,
            });
            applyIncoming(msg);
        } catch (e: unknown) {
            setDraft(body);
            setCaret(body.length);
            setReplyTo(pendingReply);
            setCitedDoc(pendingDoc);
            setPendingMentions(pendingPeople);
            setError((e as Error).message);
        }
    };

    const onComposerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (mention) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex((i) => Math.min(i + 1, Math.max(mentionHits.length - 1, 0)));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex((i) => Math.max(i - 1, 0));
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (mentionHits.length) {
                    pickMention(mentionHits[mentionIndex] ?? mentionHits[0]);
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setMentionDismissedStart(mention.start);
                return;
            }
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            send();
        }
    };

    const createChat = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newChatName.trim();
        if (!name) return;
        try {
            const users: User[] = await usersAPI.getAll().catch(() => []);
            const memberIds = users.map(u => u.id).filter(Boolean);
            const chat = await messagesAPI.createChat({
                name,
                memberIds,
                projectId: activeProjectId || undefined,
            });
            const created: Chat = {
                id: chat.id,
                name: chat.name,
                projectId: chat.projectId,
                isGroup: chat.isGroup,
                updatedAt: new Date().toISOString(),
                lastMessage: null,
            };
            setChats(prev => [created, ...prev]);
            setActiveChatId(created.id);
            setNewChatName('');
        } catch (err: unknown) {
            setError((err as Error).message);
        }
    };

    const activeChat = chats.find(c => c.id === activeChatId);
    const projectHint = projects.find(p => p.id === (activeChat?.projectId || activeProjectId));

    if (loading) return <p className="text-ink-muted">Caricamento inbox…</p>;

    return (
        <section className="bento-panel overflow-hidden min-h-[min(70vh,40rem)] flex flex-col">
            <div className="px-4 pt-4 pb-3 border-b border-line/40 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-ink tracking-tight">Inbox</h2>
                    <p className="text-xs text-ink-subtle mt-0.5">
                        Citazioni e documenti dell’area{projectHint ? ` · ${projectHint.name}` : ''}
                    </p>
                </div>
                {error ? <span className="text-xs text-rose-400 max-w-[14rem] truncate">{error}</span> : null}
            </div>

            <div className="flex flex-1 min-h-0">
                <aside className="w-56 border-r border-line/40 flex-shrink-0 flex flex-col">
                    <div className="flex-1 overflow-y-auto scrollbar-thin">
                        {chats.length === 0 ? (
                            <p className="p-4 text-xs text-ink-subtle">Nessuna chat.</p>
                        ) : (
                            chats.map(chat => (
                                <button
                                    key={chat.id}
                                    type="button"
                                    onClick={() => setActiveChatId(chat.id)}
                                    className={`w-full text-left px-3 py-2.5 text-sm border-b border-line/30 hover:bg-surface-inset/60 ${
                                        activeChatId === chat.id ? 'bg-brand-500/10 text-ink' : 'text-ink-muted'
                                    }`}
                                >
                                    <span className="font-medium block truncate">
                                        {chat.name || 'Senza nome'}
                                    </span>
                                    {chat.lastMessage && (
                                        <span className="text-[11px] text-ink-subtle truncate block">
                                            {chat.lastMessage.body}
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                    <form onSubmit={createChat} className="p-2 border-t border-line/40 flex gap-1">
                        <input
                            className="input !py-1.5 !text-xs flex-1"
                            value={newChatName}
                            onChange={e => setNewChatName(e.target.value)}
                            placeholder="Nome chat"
                            aria-label="Nome nuova chat"
                        />
                        <button type="submit" className="icon-btn" aria-label="Crea chat">
                            <Plus className="w-4 h-4" />
                        </button>
                    </form>
                </aside>

                <div className="flex-1 flex flex-col min-w-0">
                    <div className="px-4 py-3 border-b border-line/40 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-brand-300" />
                        <span className="text-sm font-medium text-ink">
                            {activeChat?.name || 'Seleziona una chat'}
                        </span>
                    </div>
                    <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                        {!activeChatId && (
                            <p className="text-sm text-ink-subtle">Seleziona una conversazione.</p>
                        )}
                        {activeChatId && messages.map(m => (
                            <ChatMessage key={m.id} message={m} onReply={setReplyTo} />
                        ))}
                        {!messages.length && activeChatId && (
                            <p className="text-sm text-ink-subtle">Nessun messaggio. Scrivi, @cita una persona o allega un documento.</p>
                        )}
                    </div>
                    {activeChatId && (
                        <div className="relative p-3 border-t border-line/40 space-y-2">
                            {pickerOpen && (
                                <DocumentPicker
                                    chatId={activeChatId}
                                    onPick={(doc) => {
                                        setCitedDoc(doc);
                                        setPickerOpen(false);
                                    }}
                                    onClose={() => setPickerOpen(false)}
                                />
                            )}
                            {replyTo && (
                                <div className="flex items-start justify-between gap-2">
                                    <CiteQuote
                                        author={replyTo.senderName || 'Qualcuno'}
                                        text={replyTo.body || replyTo.citation?.title || 'Messaggio'}
                                    />
                                    <button
                                        type="button"
                                        className="icon-btn !w-7 !h-7 flex-shrink-0"
                                        onClick={() => setReplyTo(null)}
                                        aria-label="Annulla risposta"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                            {citedDoc && (
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <CiteDocument
                                            title={citedDoc.title}
                                            url={citedDoc.url}
                                            projectName={citedDoc.projectName}
                                            allowed
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="icon-btn !w-7 !h-7 flex-shrink-0 mt-2"
                                        onClick={() => setCitedDoc(null)}
                                        aria-label="Rimuovi documento"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                            <div className="relative flex gap-2">
                                <button
                                    type="button"
                                    className="icon-btn"
                                    onClick={() => setPickerOpen(v => !v)}
                                    aria-label="Allega un documento"
                                    title="Allega un documento dell’area"
                                >
                                    <FileText className="w-4 h-4" />
                                </button>
                                <div className="relative flex-1 min-w-0">
                                    {mention && (
                                        <MentionPicker
                                            people={mentionHits}
                                            activeIndex={mentionIndex}
                                            onHover={setMentionIndex}
                                            onPick={pickMention}
                                        />
                                    )}
                                    <input
                                        ref={inputRef}
                                        className="input w-full"
                                        value={draft}
                                        onChange={e => {
                                            setDraft(e.target.value);
                                            setCaret(e.target.selectionStart ?? e.target.value.length);
                                        }}
                                        onKeyUp={e => setCaret(e.currentTarget.selectionStart ?? e.currentTarget.value.length)}
                                        onClick={e => setCaret(e.currentTarget.selectionStart ?? e.currentTarget.value.length)}
                                        onSelect={e => setCaret(e.currentTarget.selectionStart ?? e.currentTarget.value.length)}
                                        onKeyDown={onComposerKeyDown}
                                        placeholder="Scrivi, @ per citare una persona…"
                                        autoComplete="off"
                                    />
                                </div>
                                <button type="button" className="btn-primary px-3" onClick={send} aria-label="Invia">
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
