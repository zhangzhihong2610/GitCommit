import { defineStore } from 'pinia';

declare const acquireVsCodeApi: () => {
    postMessage: (data: any) => any;
};

export const useVsCodeApiStore = defineStore('vsCodeApi', () => {
    const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : undefined;

    return { vscode };
})