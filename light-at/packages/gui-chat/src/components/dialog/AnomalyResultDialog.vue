<template>
  <div class="anomaly-result-dialog">
    <div class="dialog-header">
      <h3 class="anomaly-title">异常内容列表 (Anomaly Content):</h3>
    </div>
    
    <div class="anomaly-content">
      <div 
        v-for="(anomaly, index) in formattedAnomalies" 
        :key="index" 
        class="anomaly-item"
      >
        <span class="anomaly-index">Line {{ calculateLineNumber(anomaly) }}:</span>
        <code class="anomaly-content-text">{{ anomaly.anomaly_content }}</code>
      </div>
    </div>

    <div v-if="logContent && logContent.length > 0" class="log-content-section">
      <div class="log-content-header">
        <h4>完整日志内容 (Log Content):</h4>
      </div>
      <div class="log-content-scrollable">
        <div 
          v-for="(item, index) in logContent" 
          :key="index" 
          class="log-content-item"
        >
          <span class="log-item-index">{{ index + 1 }}.</span>
          <span 
            class="log-item-content anomaly-log-content" 
            v-html="highlightAnomalies(formatLogItem(item))"
          ></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface AnomalyDetail {
  row_index: number
  anomaly_position: number
  anomaly_content: string
  content_length: number
  item_label_length: number
}

interface Props {
  anomalyContent: Record<string, any> | AnomalyDetail[]
  logContent: any[]
  result: any[]
}

const props = defineProps<Props>()

// 计算Line号：row_index * 100 + anomaly_position
function calculateLineNumber(anomaly: AnomalyDetail): number {
  const rowIndex = anomaly.row_index ?? 0
  const anomalyPosition = anomaly.anomaly_position ?? 0
  return rowIndex * 100 + anomalyPosition
}

const formattedAnomalies = computed(() => {
  if (Array.isArray(props.anomalyContent)) {
    return props.anomalyContent
  } else if (typeof props.anomalyContent === 'object') {
    // 如果是对象，尝试转换为数组
    const keys = Object.keys(props.anomalyContent)
    if (keys.length === 0) return []
    
    // 检查是否是按索引组织的对象
    const result: AnomalyDetail[] = []
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const item = props.anomalyContent[key]
      if (typeof item === 'object' && item !== null) {
        result.push({
          row_index: item.row_index ?? 0,
          anomaly_position: item.anomaly_position ?? 0,
          anomaly_content: item.anomaly_content ?? '',
          content_length: item.content_length ?? 0,
          item_label_length: item.item_label_length ?? 0
        })
      }
    }
    return result.length > 0 ? result : []
  }
  return []
})

function formatLogItem(item: any): string {
  if (typeof item === 'string') {
    return item
  } else if (Array.isArray(item)) {
    return item.join(' ')
  } else if (typeof item === 'object') {
    return JSON.stringify(item, null, 2)
  }
  return String(item)
}

// 在日志内容中高亮显示异常内容
function highlightAnomalies(logText: string): string {
  if (!logText || formattedAnomalies.value.length === 0) {
    return escapeHtml(logText)
  }
  
  // 收集所有需要高亮的异常内容（去重）
  const anomalyTexts: string[] = []
  const seen = new Set<string>()
  formattedAnomalies.value.forEach((anomaly) => {
    const anomalyContent = anomaly.anomaly_content
    if (anomalyContent && typeof anomalyContent === 'string' && !seen.has(anomalyContent)) {
      anomalyTexts.push(anomalyContent)
      seen.add(anomalyContent)
    }
  })
  
  if (anomalyTexts.length === 0) {
    return escapeHtml(logText)
  }
  
  // 按长度降序排序，确保先匹配更长的文本（避免短文本覆盖长文本）
  anomalyTexts.sort((a, b) => b.length - a.length)
  
  // 先转义HTML，避免特殊字符干扰
  let result = escapeHtml(logText)
  
  // 对每个异常内容进行匹配和替换
  anomalyTexts.forEach((anomalyText) => {
    // 转义异常文本用于匹配（因为result已经是HTML转义后的）
    const escapedAnomaly = escapeHtml(anomalyText)
    // 转义正则特殊字符
    const escapedPattern = escapeRegex(escapedAnomaly)
    // 使用全局匹配，不区分大小写
    const regex = new RegExp(`(${escapedPattern})`, 'gi')
    
    // 替换匹配到的异常内容为高亮标签
    result = result.replace(regex, (match) => {
      return `<span class="anomaly-highlight">${match}</span>`
    })
  })
  
  return result
}

// HTML转义函数
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 正则表达式特殊字符转义
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
</script>

<style scoped>
/* 全局样式用于动态插入的HTML */
</style>

<style>
.anomaly-highlight {
  color: #ff0000 !important;
  font-weight: 700 !important;
  background-color: transparent !important;
}
</style>

<style scoped>
.anomaly-result-dialog {
  margin: 10px;
  padding: 10px;
  color: var(--vscode-foreground, #616161);
  background-color: rgba(128, 128, 128, 0.05);
  border-radius: 10px;
  border: 1px solid rgba(128, 128, 128, 0.1);
}

.anomaly-result-dialog:hover {
  background-color: rgba(128, 128, 128, 0.1);
}

.dialog-header {
  margin-bottom: 15px;
}

.anomaly-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground, #616161);
}

.anomaly-content {
  margin-bottom: 20px;
  line-height: 1.6em;
}

.anomaly-item {
  margin: 10px 5px;
  padding: 10px 12px;
  background-color: rgba(128, 128, 128, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(128, 128, 128, 0.2);
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.anomaly-item:hover {
  background-color: rgba(128, 128, 128, 0.15);
}

.anomaly-index {
  font-weight: 600;
  color: var(--vscode-foreground, #616161);
  font-size: 13px;
  flex-shrink: 0;
  white-space: nowrap;
}

.anomaly-content-text {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6em;
  font-size: 13px;
  font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
  color: var(--vscode-foreground, #616161);
  background-color: rgba(128, 128, 128, 0.15);
  padding: 6px 10px;
  border-radius: 4px;
  display: inline-block;
}

.log-content-section {
  margin-top: 20px;
  border-top: 2px solid rgba(128, 128, 128, 0.3);
  padding-top: 15px;
}

.log-content-header {
  margin-bottom: 10px;
}

.log-content-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-foreground, #333);
}

.log-content-scrollable {
  max-height: 400px;
  height: 400px;
  overflow-y: auto;
  overflow-x: auto;
  padding: 10px;
  background-color: var(--vscode-input-background, #f5f5f5);
  border-radius: 6px;
  border: 1px solid rgba(128, 128, 128, 0.2);
  position: relative;
}

.log-content-item {
  margin: 8px 0;
  padding: 8px;
  background-color: var(--vscode-editor-background, #ffffff);
  border-radius: 4px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  line-height: 1.5;
}

.log-item-index {
  font-weight: 600;
  color: var(--vscode-foreground, #333);
  flex-shrink: 0;
}

.log-item-content {
  flex: 1;
  color: var(--vscode-descriptionForeground, #666);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.log-item-content :deep(.anomaly-highlight),
.anomaly-log-content :deep(.anomaly-highlight),
.anomaly-highlight {
  color: #ff0000 !important;
  font-weight: 700 !important;
  background-color: transparent !important;
}

.log-content-scrollable::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.log-content-scrollable::-webkit-scrollbar-track {
  background: var(--vscode-input-background, #f5f5f5);
  border-radius: 4px;
}

.log-content-scrollable::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.4);
  border-radius: 4px;
}

.log-content-scrollable::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.6);
}
</style>
