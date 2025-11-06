import * as vscode from "vscode";
// import { l10n } from 'vscode';
import { l10n } from "../utils/LangDict";
import { MessageSender } from "../utils/MessageSender";
import { Configuration } from "../utils/Configuration";
import { ConfigModels } from "../storage/ConfigModels";
import { RepoContext } from "../chat/RepoContext";
import { RequestModel } from "../chat/RequestModel";
import { SessionManifest } from "../storage/SessionManifest";
import { HttpClient } from "../utils/HttpClient";

export class RequestHandler {
  public static configModels: ConfigModels | undefined;
  public static repoContext: RepoContext | undefined;
  public static requestModel: RequestModel | undefined;
  public static sessionManifest: SessionManifest | undefined;

  public static handleRequest(message: any) {
    // console.log('Plugin receive:', JSON.stringify(message));
    switch (message.command) {
      case "init.ready":
        RequestHandler.prepareInit();
        break;
      case "modelID.update":
        RequestHandler.updateModelID(message.modelID);
        break;
      case "config.update":
        RequestHandler.updateConfig();
        break;
      case "model.add":
        RequestHandler.addModel(message.model);
        break;
      case "model.delete":
        RequestHandler.deleteModel(message.modelID);
        break;
      case "request.send":
        RequestHandler.handelRequest(message.request, message.context);
        break;
      case "dialog.delete":
        RequestHandler.deleteDialog(message.requestID);
        break;
      case "response.stop":
        RequestHandler.responseStop();
        break;
      case "context.get":
        RequestHandler.contextGet();
        break;
      case "context.goto":
        RequestHandler.contextGoto(message.path);
        break;
      case "ui.error":
        vscode.window.showErrorMessage(message.message ?? "");
        break;
      case "file.upload":
        RequestHandler.handleFileUpload(
          message.fileName,
          message.content,
          message.fileType // 现在传入的是 logType (BGL/HDFS/Liberty/Thunderbird)
        );
        break;
    }
  }

  private static async handleFileUpload(
    fileName: string,
    content: number[] | Uint8Array,
    logType: string // 现在传入的是日志类型：BGL/HDFS/Liberty/Thunderbird
  ) {
    try {
      const buffer = Buffer.from(
        content instanceof Uint8Array ? content : new Uint8Array(content)
      );
      const preview = `File: ${fileName} (Type: ${logType}, binary upload)`;
      RequestHandler.repoContext?.addUploadedFile(fileName, preview);

      // POST到目标接口 (multipart/form-data)
      const uploadResult = await RequestHandler.uploadToServer(
        fileName,
        buffer,
        logType
      );

      // 通知前端（仅名称与简单提示）
      MessageSender.fileUploaded(fileName, preview);

      if (!uploadResult.success) {
        vscode.window.showWarningMessage(
          `文件 ${fileName} 上传成功，但POST到服务器失败: ${uploadResult.error}`
        );
      } else {
        vscode.window.showInformationMessage(`文件 ${fileName} 上传并发送成功`);
        try {
          // 处理返回数据格式：{"result": result, "anomaly_content": anomaly_content, "log_content":log_content}
          const responseData = uploadResult.data;
          if (responseData && typeof responseData === 'object') {
            const result = responseData.result || [];
            const anomalyContent = responseData.anomaly_content || {};
            const logContent = responseData.log_content || [];
            
            // 格式化anomaly_content为数组格式
            let formattedAnomalies: any[] = [];
            if (Array.isArray(anomalyContent)) {
              formattedAnomalies = anomalyContent;
            } else if (typeof anomalyContent === 'object') {
              // 如果anomaly_content是对象，转换为数组
              const keys = Object.keys(anomalyContent);
              if (keys.length > 0) {
                // 尝试按数字键排序
                const sortedKeys = keys.sort((a, b) => {
                  const numA = parseInt(a);
                  const numB = parseInt(b);
                  if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                  }
                  return a.localeCompare(b);
                });
                formattedAnomalies = sortedKeys.map(key => anomalyContent[key]).filter(item => item !== null && item !== undefined);
              }
            }
            
            // 发送异常检测结果到前端显示
            const resultID = `anomaly_${Date.now()}`;
            MessageSender.anomalyResult(resultID, formattedAnomalies, logContent);
            
            // 统计异常数量
            const anomalyCount = Array.isArray(result) ? result.filter((r: any) => r === 1).length : 0;
            const totalWindows = Array.isArray(result) ? result.length : 0;
            
            // 同时发送给聊天模型进行分析
            if (anomalyCount > 0) {
              let analysisSummary = `日志文件分析完成：\n`;
              analysisSummary += `- 总窗口数：${totalWindows}\n`;
              analysisSummary += `- 异常窗口数：${anomalyCount}\n`;
              analysisSummary += `- 正常窗口数：${totalWindows - anomalyCount}\n\n`;
              analysisSummary += `详细异常检测结果已在上方显示，请查看并分析。`;
              
              const question = `请基于日志异常检测结果进行分析，并指出潜在问题与改进建议。检测结果显示：${anomalyCount}个异常窗口，${totalWindows - anomalyCount}个正常窗口。`;
              RequestHandler.requestModel?.handleRequest(question, "[]");
            }
          } else {
            // 如果返回格式不符合预期，使用原始数据
            const resultText = typeof uploadResult.data === "string"
              ? uploadResult.data
              : JSON.stringify(uploadResult.data);
            const snippet = resultText.length > 4000
              ? resultText.slice(0, 4000) + "\n...[truncated]"
              : resultText;
            const question = `请基于以下日志上传接口返回的结果进行分析：\n\n${snippet}`;
            RequestHandler.requestModel?.handleRequest(question, "[]");
          }
        } catch (e) {
          vscode.window.showWarningMessage(`处理服务器返回数据时出错: ${(e as Error).message}`);
        }
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`文件上传失败: ${error.message}`);
    }
  }

  private static async uploadToServer(
    fileName: string,
    content: Buffer,
    logType: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // 从配置获取目标URL，如果没有则使用默认值
    // 你可以通过 Configuration 来配置这个URL
    const targetUrl =
      process.env.LOG_API_URL || "http://localhost:8080/api/logs/upload";

    if (!HttpClient.isValidUrl(targetUrl)) {
      return {
        success: false,
        error: "无效的目标URL",
      };
    }

    // 只携带两个参数：日志文件本身和日志类型
    const fields = [
      { name: "logType", value: logType },
    ];
    const files = [
      {
        name: "file",
        filename: fileName,
        contentType: "text/csv", // CSV文件固定为text/csv
        content,
      },
    ];
    return await HttpClient.postMultipart(targetUrl, fields, files);
  }

  private static prepareInit() {
    MessageSender.languageSet();
    if (Configuration.get<boolean>("loadLastChatSession")) {
      RequestHandler.sessionManifest?.loadLastChatSession();
    }
    Configuration.sendSettings();
    RequestHandler.configModels?.updateModelsFromConfig();
  }

  private static updateModelID(modelID: string) {
    RequestHandler.configModels?.updatemodelID(modelID);
  }

  private static updateConfig() {
    RequestHandler.configModels?.updateModelsFromConfig();
    vscode.commands.executeCommand("light-at.goto.config");
  }

  private static addModel(model: string) {
    RequestHandler.configModels?.addModelToConfig(model);
  }

  private static deleteModel(modelID: string) {
    RequestHandler.configModels?.deleteModelFromConfig(modelID);
  }

  private static handelRequest(request: string, context: string) {
    RequestHandler.requestModel?.handleRequest(request, context);
  }

  private static deleteDialog(requestID: string) {
    RequestHandler.requestModel?.deleteDialog(requestID);
  }

  private static responseStop() {
    RequestHandler.requestModel?.handleStop();
  }

  private static contextGet() {
    const context = RequestHandler.repoContext?.getContextListAsString();
    MessageSender.contextSend(context ?? "");
  }

  private static async contextGoto(contextPath: string) {
    if (contextPath === "[selected]") {
      return;
    }
    try {
      const context = vscode.Uri.file(contextPath);
      const document = await vscode.workspace.openTextDocument(context);
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(
        `${l10n.t("ts.contextGotoError")} ${contextPath}`
      );
    }
  }

}
