import * as vscode from 'vscode';
// import { l10n } from 'vscode';
import { l10n } from '../utils/LangDict';
import { MessageSender } from '../utils/MessageSender';
import { Configuration } from '../utils/Configuration';
import { ConfigModels } from '../storage/ConfigModels';
import { RepoContext } from '../chat/RepoContext';
import { RequestModel } from '../chat/RequestModel';
import { SessionManifest } from '../storage/SessionManifest';
import { HttpClient } from '../utils/HttpClient';

export class RequestHandler {
    public static configModels: ConfigModels | undefined;
    public static repoContext: RepoContext | undefined;
    public static requestModel: RequestModel | undefined;
    public static sessionManifest: SessionManifest | undefined;

    public static handleRequest(message: any) {
        // console.log('Plugin receive:', JSON.stringify(message));
        switch (message.command) {
            case 'init.ready':
                RequestHandler.prepareInit();
                break;
            case 'modelID.update':
                RequestHandler.updateModelID(message.modelID);
                break;
            case 'config.update':
                RequestHandler.updateConfig();
                break;
            case 'model.add':
                RequestHandler.addModel(message.model);
                break;
            case 'model.delete':
                RequestHandler.deleteModel(message.modelID);
                break;
            case 'request.send':
                RequestHandler.handelRequest(message.request, message.context);
                break;
            case 'dialog.delete':
                RequestHandler.deleteDialog(message.requestID);
                break;
            case 'response.stop':
                RequestHandler.responseStop();
                break;
            case 'context.get':
                RequestHandler.contextGet();
                break;
            case 'context.goto':
                RequestHandler.contextGoto(message.path);
                break;
            case 'ui.error':
                vscode.window.showErrorMessage(message.message ?? '');
                break;
            case 'file.upload':
                RequestHandler.handleFileUpload(message.fileName, message.content, message.fileType);
                break;
        }
    }

    private static async handleFileUpload(fileName: string, content: number[] | Uint8Array, fileType: string) {
        try {
            const buffer = Buffer.from(content instanceof Uint8Array ? content : new Uint8Array(content));
            const preview = `File: ${fileName} (binary upload, preview omitted)`;
            RequestHandler.repoContext?.addUploadedFile(fileName, preview);

            // POST到目标接口 (multipart/form-data)
            const uploadResult = await RequestHandler.uploadToServer(fileName, buffer, fileType);

            // 通知前端（仅名称与简单提示）
            MessageSender.fileUploaded(fileName, preview);
            
            if (!uploadResult.success) {
                vscode.window.showWarningMessage(
                    `文件 ${fileName} 上传成功，但POST到服务器失败: ${uploadResult.error}`
                );
            } else {
                vscode.window.showInformationMessage(`文件 ${fileName} 上传并发送成功`);
                try{
                    // 将服务器返回结果转发给聊天模型
                    const resultText = typeof uploadResult.data === 'string' ? uploadResult.data : JSON.stringify(uploadResult.data);
                    const snippet = resultText.length > 4000 ? resultText.slice(0, 4000) + '\n...[truncated]' : resultText;
                    const question = `请基于以下日志上传接口返回的结果进行分析，并指出潜在问题与改进建议：\n\n${snippet}`;
                    RequestHandler.requestModel?.handleRequest(question, '[]');
                }
                catch(e){ /* 忽略转发异常 */ }
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`文件上传失败: ${error.message}`);
        }
    }

    private static async uploadToServer(
        fileName: string,
        content: Buffer,
        fileType: string
    ): Promise<{success: boolean, data?: any, error?: string}> {
        // 从配置获取目标URL，如果没有则使用默认值
        // 你可以通过 Configuration 来配置这个URL
        const targetUrl = process.env.LOG_API_URL || 'http://localhost:8080/api/logs/upload';
        
        if (!HttpClient.isValidUrl(targetUrl)) {
            return {
                success: false,
                error: '无效的目标URL'
            };
        }

        const fields = [
            { name: 'fileType', value: fileType },
            { name: 'timestamp', value: new Date().toISOString() }
        ];
        const files = [
            { name: 'file', filename: fileName, contentType: RequestHandler.inferMime(fileType), content }
        ];
        return await HttpClient.postMultipart(targetUrl, fields, files);
    }

    private static inferMime(ext: string): string {
        const e = (ext || '').toLowerCase();
        if(e === 'json') return 'application/json';
        if(e === 'csv') return 'text/csv';
        if(e === 'xml') return 'application/xml';
        if(e === 'yaml' || e === 'yml') return 'application/x-yaml';
        if(e === 'log' || e === 'txt') return 'text/plain';
        return 'application/octet-stream';
    }

    private static prepareInit(){
        MessageSender.languageSet();
        if(Configuration.get<boolean>('loadLastChatSession')){
            RequestHandler.sessionManifest?.loadLastChatSession();
        }
        Configuration.sendSettings();
        RequestHandler.configModels?.updateModelsFromConfig();
    }

    private static updateModelID(modelID: string){
        RequestHandler.configModels?.updatemodelID(modelID);
    }

    private static updateConfig(){
        RequestHandler.configModels?.updateModelsFromConfig();
        vscode.commands.executeCommand('light-at.goto.config');
    }

    private static addModel(model: string){
       RequestHandler.configModels?.addModelToConfig(model);
    }

    private static deleteModel(modelID: string){
        RequestHandler.configModels?.deleteModelFromConfig(modelID);
    }

    private static handelRequest(request: string, context: string){
        RequestHandler.requestModel?.handleRequest(request, context);
    }

    private static deleteDialog(requestID: string){
        RequestHandler.requestModel?.deleteDialog(requestID);
    }

    private static responseStop(){
        RequestHandler.requestModel?.handleStop();
    }

    private static contextGet(){
        const context = RequestHandler.repoContext?.getContextListAsString();
        MessageSender.contextSend(context ?? '');
    }

    private static async contextGoto(contextPath: string){
        if(contextPath === '[selected]') { return; }
        try{
            const context = vscode.Uri.file(contextPath);
            const document = await vscode.workspace.openTextDocument(context);
            await vscode.window.showTextDocument(document);
        }
        catch(error){
            vscode.window.showErrorMessage(`${l10n.t('ts.contextGotoError')} ${contextPath}`);
        }
    }

    private static parseLogFile(content: string, fileName: string): string {
        const lines = content.split('\n');
        const maxLines = 1000; // 限制行数避免token过多
        
        if (lines.length > maxLines) {
        return `File: ${fileName} (showing last ${maxLines} lines)\n` + 
                lines.slice(-maxLines).join('\n');
        }
        
        return `File: ${fileName}\n${content}`;
    }
}