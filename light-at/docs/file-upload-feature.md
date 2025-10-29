# 文件上传功能说明

## 功能概述

文件上传功能允许用户上传多种格式的日志文件，并在上传完成后自动POST到目标接口。

## 支持的文件格式

- `.log` - 日志文件
- `.txt` - 文本文件
- `.json` - JSON文件
- `.csv` - CSV文件
- `.xml` - XML文件
- `.yaml` / `.yml` - YAML文件

**最大文件大小限制**: 50MB

## 使用方法

1. 点击输入框上方的"上传日志"按钮
2. 在弹出的上传区域中：
   - 点击上传区域选择文件
   - 或者将文件拖拽到上传区域
3. 文件会自动开始上传，实时显示上传进度
4. 上传完成后，文件会显示在已上传文件列表中
5. 文件会自动POST到目标接口

## 目标接口配置

### 方式一：环境变量配置（推荐）

设置环境变量 `LOG_API_URL`：

```bash
export LOG_API_URL="http://your-server.com/api/logs/upload"
```

### 方式二：代码配置

修改 `light-at/packages/extension/src/utils/RequestHandler.ts` 中的默认URL：

```typescript
const targetUrl = process.env.LOG_API_URL || 'http://localhost:8080/api/logs/upload';
```

## POST 数据格式

文件上传后会发送以下格式的POST请求：

```json
{
  "fileName": "example.log",
  "fileType": "log",
  "content": "日志内容...",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "size": 1024
}
```

### 请求头

```
Content-Type: application/json
Content-Length: <oy-payload-length>
```

## 功能特性

- ✅ 支持多种日志文件格式
- ✅ 实时显示上传进度
- ✅ 拖拽上传支持
- ✅ 多文件上传
- ✅ 文件大小验证
- ✅ 上传状态显示（成功/失败）
- ✅ 自动POST到目标接口
- ✅ 错误处理和用户提示

## 技术实现

### 前端组件

- `UploadLog.vue` - 文件上传UI组件
- 位置: `light-at/packages/gui-chat/src/components/upload/UploadLog.vue`

### 后端处理

- `RequestHandler.ts` - 处理文件上传消息
- `HttpClient.ts` - HTTP POST请求工具
- 位置: `light-at/packages/extension/src/utils/`

### 消息流程

1. 前端选择/拖拽文件
2. 读取文件内容并发送到后端
3. 后端解析文件内容
4. 后端发送POST请求到目标接口
5. 通知前端上传结果

## 常见问题

### Q: 如何修改上传文件大小限制？

A: 修改 `UploadLog.vue` 中的 `maxFileSize` 常量：

```typescript
const maxFileSize = 100 * 1024 * 1024; // 100MB
```

### Q: 如何添加新的文件格式支持？

A: 修改 `UploadLog.vue` 中的 `allowedTypes` 数组：

```typescript
const allowedTypes = ['.log', '.txt', '.json', '.csv', '.xml', '.yaml', '.yml', '.your-extension']
```

### Q: 上传失败怎么办？

A: 检查以下几点：
1. 文件大小是否超过限制（50MB）
2. 文件格式是否支持
3. 目标接口URL是否正确
4. 网络连接是否正常

## 开发计划

- [ ] 添加文件预览功能
- [ ] 支持文件内容搜索
- [ ] 添加上传历史记录
- [ ] 支持批量删除已上传文件
- [ ] 添加更多文件格式支持
