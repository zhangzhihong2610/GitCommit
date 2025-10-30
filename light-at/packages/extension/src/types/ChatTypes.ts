export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface SessionItem {
    role: 'system' | 'user' | 'assistant';
    id: string;
    content: string;
    context?: string;
    contextList?: string;
    time: string;
    name?: string;
    type?: 'ollama' | 'openai';
    reasoning?: string;
}

export interface MainifestItem {
    name: string;
    overview: string;
    workspace: string;
    update: string;
}