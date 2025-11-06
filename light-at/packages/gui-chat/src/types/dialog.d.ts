export interface UserDialogItem {
    id: string;
    content: string;
    context: string[];
}

export interface ModelDialogItem {
    id: string;
    content: string;
    type: 'ollama' | 'openai' | undefined;
    name: string;
    prompt_tokens?: number;
    completion_tokens?: number;
}

export interface AnomalyResultDialogItem {
    id: string;
    anomalyContent: Record<string, any> | Array<any>;
    logContent: any[];
}

export type DialogItem = UserDialogItem | ModelDialogItem | AnomalyResultDialogItem;

export interface ContextMap {
    [key: string]: {
        name: string,
        selected: boolean
    }
}