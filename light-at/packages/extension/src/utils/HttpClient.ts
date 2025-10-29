import * as https from 'https';
import * as http from 'http';
import * as vscode from 'vscode';

export class HttpClient {
    /**
     * 发送POST请求到目标接口
     * @param url 目标URL
     * @param data 要发送的数据
     * @param headers 请求头
     * @returns Promise<{success: boolean, data?: any, error?: string}>
     */
    public static async post(
        url: string,
        data: any,
        headers: Record<string, string> = {}
    ): Promise<{success: boolean, data?: any, error?: string}> {
        return new Promise((resolve) => {
            try {
                const urlObj = new URL(url);
                const isHttps = urlObj.protocol === 'https:';
                const client = isHttps ? https : http;

                const postData = JSON.stringify(data);
                
                const defaultHeaders = {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                };

                const requestOptions = {
                    hostname: urlObj.hostname,
                    port: urlObj.port || (isHttps ? 443 : 80),
                    path: urlObj.pathname,
                    method: 'POST',
                    headers: {
                        ...defaultHeaders,
                        ...headers
                    }
                };

                const req = client.request(requestOptions, (res) => {
                    let responseData = '';

                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });

                    res.on('end', () => {
                        try {
                            const jsonData = JSON.parse(responseData);
                            resolve({
                                success: res.statusCode ? res.statusCode >= 200 && res.statusCode < 300 : false,
                                data: jsonData
                            });
                        } catch (e) {
                            resolve({
                                success: res.statusCode ? res.statusCode >= 200 && res.statusCode < 300 : false,
                                data: responseData
                            });
                        }
                    });
                });

                req.on('error', (error) => {
                    resolve({
                        success: false,
                        error: error.message
                    });
                });

                req.write(postData);
                req.end();
            } catch (error: any) {
                resolve({
                    success: false,
                    error: error.message
                });
            }
        });
    }

    /**
     * 验证URL格式
     * @param url 要验证的URL
     * @returns boolean
     */
    public static isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}
