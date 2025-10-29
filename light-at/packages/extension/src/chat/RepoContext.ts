import * as vscode from 'vscode';
import * as fs from 'fs';
import path from 'path';

interface TextEditorMap {
    [key: string]: vscode.TextEditor;
}

export class RepoContext {
    selectedContent: string = '';
    activeEditor: vscode.TextEditor | undefined;
    includeTextEditors:TextEditorMap = {};
    contextItems: string[] = [];
    uploadedFiles: Map<string, string> = new Map();

    constructor() {
        const TextEditors = vscode.window.visibleTextEditors;
        for(const editor of TextEditors){
            this.includeTextEditors[editor.document.uri.fsPath] = editor;
        }
    }

    public getContextListAsString(): string {
        this.contextItems = [];
        this.activeEditor = vscode.window.activeTextEditor;
        if (this.activeEditor && this.activeEditor.selection) {
            const selection = this.activeEditor.selection;
            this.selectedContent = this.activeEditor.document.getText(selection);
        } else {
            this.selectedContent = '';
        }
        if(this.selectedContent){
            this.contextItems.push('[selected]');
        }
        for (const [key, editor] of Object.entries(this.includeTextEditors)) {
            const fileExists = fs.existsSync(editor.document.uri.fsPath);
            if (fileExists) {
                this.contextItems.push(key);
            } else {
                delete this.includeTextEditors[key];
            }
        }
        // console.log(this.contextItems);
        return JSON.stringify(this.contextItems);
    }

    public addUploadedFile(fileName: string, content: string) {
        this.uploadedFiles.set(fileName, content);
      }
    
    public getContextPrompt(contextStr: string): string {
        const contextList: string[] = JSON.parse(contextStr);
        let prompt = '';
        
        for (const contextItem of contextList) {
          if (contextItem === '[selected]') {
            prompt += `Selected content:\n${this.selectedContent}\n\n`;
          } else if (this.uploadedFiles.has(contextItem)) {
            // 处理上传的文件
            prompt += `Uploaded file: ${contextItem}\n${this.uploadedFiles.get(contextItem)}\n\n`;
          } else {
            // 处理现有文件
            const editor = this.includeTextEditors[contextItem];
            if (editor) {
              prompt += `File: ${contextItem}\n${editor.document.getText()}\n\n`;
            }
          }
        }
        return prompt;
    }
}