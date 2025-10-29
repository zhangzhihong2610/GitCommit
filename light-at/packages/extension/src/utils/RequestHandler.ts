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
            case 'file.upload':
                RequestHandler.handleFileUpload(message.fileName, message.content, message.fileType);
                break;
        }
    }

    private static async handleFileUpload(fileName: string, content: string, fileType: string) {
        try {
            // 解析日志文件内容
            const parsedContent = RequestHandler.parseLogFile(content, fileName);
            
            // 存储到上下文
            RequestHandler.repoContext?.addUploadedFile(fileName, parsedContent);
            
            // POST到目标接口
            const uploadResult = await RequestHandler.uploadToServer(fileName, content, fileType);
            
            // 通知前端
            MessageSender.fileUploaded(fileName, parsedContent);
            
            if (!uploadResult.success) {
                vscode.window.showWarningMessage(
                    `文件 ${fileName} 上传成功，但POST到服务器失败: ${uploadResult.error}`
                );
            } else {
                vscode.window.showInformationMessage(`文件 ${fileName} 上传并发送成功`);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`文件上传失败: ${error.message}`);
        }
    }

    private static async uploadToServer(
        fileName: string, 
        content: string, 
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

        // 准备POST数据
        const postData = {
            fileName: fileName,
            fileType: fileType,
            content: content,
            timestamp: new Date().toISOString(),
            size: content.length
        };

        return await HttpClient.post(targetUrl, postData);
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