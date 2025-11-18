<template>
  <div class="input-upper" @click.stop>
    <div class="dropup-box">
      <div class="dropup-option" v-if="displayContext">
        <ul class="dropup-list">
          <span v-for="(val, key) in contextMap" :key="key">
            <li
              v-show="!val.selected && (key as string).includes(search)"
              @click="val.selected = !val.selected"
              :class="{ selected: val.selected }"
            >
              <span>{{ val.name === '[selected]' ? $t('input.selected') : val.name }}</span>
              <sub>{{ key }}</sub>
            </li>
          </span>
          <li v-show="!Object.keys(contextMap).length">
            <sub>{{ $t('input.noContextInfo') }}</sub>
          </li>
        </ul>
        <div class="dropup-input">
          <input
            type="text"
            class="dropup-input-content"
            v-model="search"
            :placeholder="$t('input.searchConext')"
          >
        </div>
      </div>
      <div 
        class="stop-generation"
        v-show="sendDisable"
        @click="sendStore.responseStop()"
      >
        <FontAwesomeIcon :icon="faPause" />
        <span>{{ $t('input.stopGeneration') }}</span>
      </div>
      <div class="add-context" @click="getContext">
        <FontAwesomeIcon :icon="faPlus" />
        <span>{{ $t('input.addContext') }}</span>
      </div>
      <div class="upload-log" @click="toggleUpload">
        <FontAwesomeIcon :icon="faUpload" />
        <span>上传日志</span>
      </div>
    </div>
    
    <!-- 上传模态框 -->
    <Teleport to="body">
      <div v-if="showUpload" class="upload-overlay" @click="toggleUpload" @dragover.prevent.stop @drop.prevent.stop></div>
      <div v-if="showUpload" class="upload-modal" @dragover.prevent.stop @drop.prevent.stop>
        <div class="upload-modal-content">
          <div class="upload-modal-header">
            <h2>上传日志文件</h2>
            <button class="close-btn" @click="toggleUpload">×</button>
          </div>
          <div class="upload-modal-body">
            <div v-if="errorMsg" class="upload-error">
              <span>{{ errorMsg }}</span>
              <button class="error-close" @click="errorMsg = ''">×</button>
            </div>
            
            <!-- 文件类型选择器 -->
            <div class="file-type-selector">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--vscode-foreground, #333);">选择日志类型：</label>
              <select v-model="selectedLogType" class="log-type-select">
                <option value="BGL">BGL</option>
                <option value="HDFS_v1">HDFS_v1</option>
                <option value="HDFS_v3">HDFS_v3</option>
                <option value="Liberty">Liberty</option>
                <option value="Thunderbird">Thunderbird</option>
                <option value="Apache">Apache</option>
                <option value="Linux">Linux</option>
                <option value="OpenStack">OpenStack</option>
                <option value="SSH">SSH</option>
                <option value="Hadoop">Hadoop</option>
              </select>
            </div>
            
            <!-- 自定义提示词输入框 -->
            <div class="custom-prompt">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--vscode-foreground, #333);">自定义提示词（可选）：</label>
              <input
                type="text"
                class="custom-prompt-input"
                v-model="customPrompt"
                placeholder="可选：我们有内置的提示词"
              />
            </div>

            <div v-if="!uploadedFile" class="upload-area"
              @click="triggerUpload"
              @drop.prevent.stop="handleDrop"
              @dragover.prevent.stop="onDragOver"
              @dragenter.prevent.stop="onDragEnter"
              @dragleave.prevent.stop="onDragLeave"
            >
              <input ref="fileInput" type="file" accept=".csv" style="display: none" @change="handleFileSelect" />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px;">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p style="font-size: 16px; margin: 10px 0;">点击上传CSV日志文件到这里</p>
              <p style="font-size: 13px; color: #666;">仅支持 .csv 格式</p>
            </div>
            <div v-if="uploadedFile" style="margin-top: 20px;">
              <div class="file-list-header">
                <span>已上传文件</span>
              </div>
              <div class="file-item-row">
                <div class="file-item-info">
                  <span class="file-name">{{ uploadedFile.name }}</span>
                  <span class="file-type-badge">{{ uploadedFile.logType }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="uploadedFile" class="upload-modal-footer">
            <button @click="clearFile" class="remove-file-btn">移除</button>
            <button @click="sendFile" class="send-file-btn" :disabled="sending">
              {{ sending ? '发送中...' : '发送' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 新增：等待日志解析的弹窗 -->
    <Teleport to="body">
      <div v-if="showWaitingPopup" class="waiting-overlay"></div>
      <div v-if="showWaitingPopup" class="waiting-popup">
        <div class="spinner"></div>
        <p>{{ $t('input.parsingLog') }}</p>
      </div>
    </Teleport>

    <div v-for="(val, path) in contextMap" :key="path">
      <div class="selected-context" v-show="val.selected">
        <span @click="val.selected = !val.selected">{{ val.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSenderStore } from '@/stores/sender'
import { useListenerStore } from '@/stores/listener'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPause, faPlus, faUpload } from '@fortawesome/free-solid-svg-icons'
import { Teleport } from 'vue'

const displayContext = ref(false)
const showUpload = ref(false)
const fileInput = ref<HTMLInputElement>()
const errorMsg = ref('')
const dragDepth = ref(0)
const uploadedFile = ref<{name: string, size: number, logType: string, content: Uint8Array} | null>(null)
const selectedLogType = ref('BGL')
const sending = ref(false)
const customPrompt = ref('')
const showWaitingPopup = ref(false)
const listenerStore = useListenerStore()
const { sendDisable, contextMap, logParsingComplete } = storeToRefs(listenerStore)
const sendStore = useSenderStore()
const search = ref('')

// contextMap.value = {
//   'c:data/function.ts': { name: 'function.ts', selected: false },
//   'c:data/index.ts': { name: 'index.ts', selected: false },
//   'c:data/utils.ts': { name: 'utils.ts', selected: false },
//   'c:data/types.ts': { name: 'types.ts', selected: false },
//   'c:data/test/longlong/config.ts': { name: 'config.ts', selected: false }
// }

function getContext() {
  if (!displayContext.value) {
    sendStore.contextGet()
  }
  displayContext.value = !displayContext.value
  if (showUpload.value) {
    showUpload.value = false
  }
}

function toggleUpload() {
  showUpload.value = !showUpload.value
  if (displayContext.value) {
    displayContext.value = false
  }
}

function triggerUpload() {
  fileInput.value?.click()
}

function isAllowed(file: File){
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  return ext === 'csv'
}

async function handleFileSelect(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files || files.length === 0) return
  
  // 只处理第一个文件
  const file = files[0]
  
  if(!isAllowed(file)){
    errorMsg.value = '仅支持 CSV 格式文件'
    setTimeout(() => { if(errorMsg.value) errorMsg.value = '' }, 3000)
    return
  }
  if(!selectedLogType.value){
    errorMsg.value = '请先选择日志类型'
    setTimeout(() => { if(errorMsg.value) errorMsg.value = '' }, 3000)
    return
  }
  
  const buffer = await file.arrayBuffer()
  const content = new Uint8Array(buffer)
  
  // 保存文件信息，但不立即发送
  uploadedFile.value = { 
    name: file.name, 
    size: file.size, 
    logType: selectedLogType.value,
    content: content
  }
  
  // 清空文件输入
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function handleDrop(e: DragEvent) {
  const dt = e.dataTransfer
  if (!dt) return
  const files: File[] = []
  if (dt.items && dt.items.length) {
    for (const item of Array.from(dt.items)) {
      if (item.kind === 'file') {
        const f = item.getAsFile()
        if (f) files.push(f)
      }
    }
  } else if (dt.files && dt.files.length) {
    files.push(...Array.from(dt.files))
  }
  if (!files.length) return
  
  // 只处理第一个文件
  const file = files[0]
  
  if(!isAllowed(file)){
    errorMsg.value = '仅支持 CSV 格式文件'
    setTimeout(() => { if(errorMsg.value) errorMsg.value = '' }, 3000)
    dragDepth.value = 0
    return
  }
  if(!selectedLogType.value){
    errorMsg.value = '请先选择日志类型'
    setTimeout(() => { if(errorMsg.value) errorMsg.value = '' }, 3000)
    dragDepth.value = 0
    return
  }
  
  const buffer = await file.arrayBuffer()
  const content = new Uint8Array(buffer)
  
  // 保存文件信息，但不立即发送
  uploadedFile.value = { 
    name: file.name, 
    size: file.size, 
    logType: selectedLogType.value,
    content: content
  }
  
  dragDepth.value = 0
}

function onDragOver(e: DragEvent){
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

function onDragEnter(){
  dragDepth.value++
}

function onDragLeave(){
  dragDepth.value = Math.max(0, dragDepth.value - 1)
}

function preventWindowDnD(e: DragEvent){
  // 阻止 VS Code 抢占拖拽，提升 Webview 内部 drop 识别稳定性
  e.preventDefault()
}

onMounted(() => {
  window.addEventListener('dragover', preventWindowDnD, { capture: true })
  window.addEventListener('drop', preventWindowDnD, { capture: true })
})

onUnmounted(() => {
  window.removeEventListener('dragover', preventWindowDnD, { capture: true } as any)
  window.removeEventListener('drop', preventWindowDnD, { capture: true } as any)
})

function clearFile() {
  uploadedFile.value = null
}

async function sendFile() {
  if (!uploadedFile.value || sending.value) return

  sending.value = true
  showWaitingPopup.value = true // <--- 显示等待弹窗
  try {
    // 发送文件到后端
    sendStore.fileUpload(
      uploadedFile.value.name,
      Array.from(uploadedFile.value.content) as unknown as any,
      uploadedFile.value.logType,
      customPrompt.value
    )

    // 发送成功后清空文件并关闭弹窗
    uploadedFile.value = null
    showUpload.value = false
  } catch (error) {
    errorMsg.value = '发送失败，请重试'
    showWaitingPopup.value = false // <--- 异常时隐藏弹窗
    setTimeout(() => { if (errorMsg.value) errorMsg.value = '' }, 3000)
  } finally {
    sending.value = false
  }
}

watch(logParsingComplete, () => {
  if (showWaitingPopup.value) {
    showWaitingPopup.value = false
  }
})

document.addEventListener('click', (e) => {
  if (displayContext.value) {
    displayContext.value = false
  }
})
</script>

<style scoped>
@import '../../assets/css/dropup2.css';

.input-upper {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.dropup-input {
  padding: 6px 12px;
  border-radius: 5px;
  border: 1px solid rgba(128, 128, 128, 0.4);
}

.dropup-input:focus-within {
  border: 1px solid var(--vscode-button-hoverBackground, #5a4579);
}

.dropup-input-content {
  border: none;
  width: 100%;
  color: var(--vscode-input-foreground, #616161);
  background-color: var(--vscode-input-background, #ffffff);
}

.dropup-input-content:focus {
  outline: none;
}

.add-context,
.stop-generation,
.upload-log {
  user-select: none;
  display: inline-block;
  padding: 2px 4px;
  margin: 5px;
  border-radius: 5px;
  background-color: rgba(128, 128, 128, 0.1);
}

.stop-generation svg,
.add-context svg,
.upload-log svg {
  margin-left: 2px;
  margin-right: 3px;
}

.stop-generation:hover,
.add-context:hover,
.upload-log:hover {
  background-color: rgba(128, 128, 128, 0.2);
}

/* 新增：等待弹窗样式 */
.waiting-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 1002;
}

.waiting-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: var(--vscode-editor-background, #ffffff);
  padding: 20px 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1003;
  display: flex;
  align-items: center;
  gap: 15px;
}

.spinner {
  border: 4px solid rgba(128, 128, 128, 0.2);
  border-left-color: var(--vscode-button-background, #705697);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.waiting-popup p {
  margin: 0;
  font-size: 14px;
  color: var(--vscode-foreground, #333);
}

/* 模态框蒙层 */
.upload-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 模态框容器 */
.upload-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1001;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { 
    opacity: 0; 
    transform: translate(-50%, -60%); 
  }
  to { 
    opacity: 1; 
    transform: translate(-50%, -50%); 
  }
}

.upload-modal-content {
  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  background-color: var(--vscode-editor-background, #ffffff);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.upload-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.3);
  background-color: var(--vscode-sideBar-background, #f3f3f3);
}

.upload-modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vscode-foreground, #333);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background-color: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
  color: var(--vscode-foreground, #333);
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: rgba(128, 128, 128, 0.2);
}

.upload-modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.upload-modal-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid rgba(128, 128, 128, 0.3);
  background-color: var(--vscode-sideBar-background, #f3f3f3);
}

.upload-error {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  margin-bottom: 10px;
  border-radius: 6px;
  color: #721c24;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}

.error-close {
  border: none;
  background: transparent;
  font-size: 16px;
  cursor: pointer;
  color: #721c24;
}

.upload-modal-body .upload-area {
  border: 1px dashed rgba(128, 128, 128, 0.4);
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  -webkit-user-drag: none;
  box-sizing: border-box;
}

.upload-modal-body .upload-area:hover {
  border-color: var(--vscode-button-hoverBackground, #5a4579);
  background-color: var(--vscode-input-background, #f5f5f5);
}

.file-type-selector {
  width: 100%;
  margin-bottom: 20px;
}

.log-type-select {
  width: 100%;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid rgba(128, 128, 128, 0.4);
  background-color: var(--vscode-input-background, #ffffff);
  color: var(--vscode-input-foreground, #333);
  font-size: 14px;
  cursor: pointer;
}

.log-type-select:focus {
  outline: none;
  border-color: var(--vscode-button-hoverBackground, #5a4579);
}

.custom-prompt {
  width: 100%;
  margin-bottom: 20px;
}

.custom-prompt-input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(128, 128, 128, 0.3);
  background-color: var(--vscode-input-background, #ffffff);
  color: var(--vscode-foreground, #333);
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.custom-prompt-input:focus {
  outline: none;
  border-color: var(--vscode-button-hoverBackground, #5a4579);
  box-shadow: 0 0 0 2px rgba(90, 69, 121, 0.15);
}

.upload-modal-body .upload-area {
  width: 100%;
}

.file-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin: 8px 0;
  background: var(--vscode-input-background, #f9f9f9);
  border-radius: 4px;
  border: 1px solid rgba(128, 128, 128, 0.2);
}

.file-item-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  color: var(--vscode-foreground, #333);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.file-type-badge {
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  background-color: var(--vscode-button-background, #4d3473);
  color: var(--vscode-button-foreground, #ffffff);
  white-space: nowrap;
}

.remove-file-btn {
  padding: 6px 12px;
  border: 1px solid rgba(128, 128, 128, 0.3);
  border-radius: 4px;
  background-color: transparent;
  color: var(--vscode-foreground, #333);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  white-space: nowrap;
}

.remove-file-btn:hover {
  background-color: #ffebee;
  border-color: #f44336;
  color: #f44336;
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vscode-foreground, #333);
}

.clear-all-btn {
  padding: 6px 12px;
  border: 1px solid rgba(128, 128, 128, 0.4);
  border-radius: 4px;
  background-color: transparent;
  color: var(--vscode-foreground, #333);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.clear-all-btn:hover {
  background-color: var(--vscode-input-background, #f5f5f5);
  border-color: var(--vscode-button-hoverBackground, #5a4579);
}

.send-file-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  background-color: var(--vscode-button-background, #705697);
  color: var(--vscode-button-foreground, #ffffff);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  min-width: 100px;
}

.send-file-btn:hover:not(:disabled) {
  background-color: var(--vscode-button-hoverBackground, #5a4579);
}

.send-file-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-modal-footer .remove-file-btn {
  padding: 10px 24px;
  border: 1px solid rgba(128, 128, 128, 0.4);
  border-radius: 6px;
  background-color: transparent;
  color: var(--vscode-foreground, #333);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  min-width: 100px;
}

.upload-modal-footer .remove-file-btn:hover {
  background-color: var(--vscode-input-background, #f5f5f5);
  border-color: var(--vscode-button-hoverBackground, #5a4579);
}


/* .dropup-option {
  box-shadow: 0 0 4px 2px rgba(128, 128, 128, 0.4);
} */

.selected-context {
  user-select: none;
  border-radius: 5px;
  padding: 2px 4px;
  margin: 5px;
  box-sizing: border-box;
  color: var(--vscode-foreground, #616161);
  background-color: rgba(128, 128, 128, 0.1);
}

.selected-context:hover {
  cursor: pointer;
  background-color: rgba(128, 128, 128, 0.2);
}
</style>