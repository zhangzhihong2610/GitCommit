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
          />
        </div>
      </div>
      <div class="stop-generation" v-show="sendDisable" @click="sendStore.responseStop()">
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
      <div
        v-if="showUpload"
        class="upload-overlay"
        @click="toggleUpload"
        @dragover.prevent.stop
        @drop.prevent.stop
      ></div>
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
            <div
              class="upload-area"
              @click="triggerUpload"
              @drop.prevent.stop="handleDrop"
              @dragover.prevent.stop="onDragOver"
              @dragenter.prevent.stop="onDragEnter"
              @dragleave.prevent.stop="onDragLeave"
            >
              <input
                ref="fileInput"
                type="file"
                accept=".log,.txt,.json,.csv,.xml,.yaml,.yml"
                multiple
                style="display: none"
                @change="handleFileSelect"
              />
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                style="width: 48px; height: 48px"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p style="font-size: 16px; margin: 10px 0">点击上传日志数据文件到这里</p>
              <p style="font-size: 13px; color: #666">
                支持 .log, .txt, .json, .csv, .xml, .yaml, .yml 格式
              </p>
            </div>
            <div v-if="uploadedFiles.length > 0" class="upload-list">
              <div class="upload-list-header">
                <span class="upload-count">已上传 ({{ uploadedFiles.length }})</span>
                <button class="clear-btn" @click="clearFiles">
                  {{ $t('upload.clearAll') || '清空' }}
                </button>
              </div>
              <div v-for="(file, i) in uploadedFiles" :key="i" class="upload-item">
                <span class="file-name" :title="file.name">{{ file.name }}</span>
                <button class="remove-btn" @click="removeFile(i)">
                  {{ $t('upload.remove') || '移除' }}
                </button>
              </div>
            </div>
          </div>
        </div>
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
import { ref, onMounted, onUnmounted } from 'vue'
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
const uploadedFiles = ref<{ name: string; size: number }[]>([])
const listenerStore = useListenerStore()
const { sendDisable, contextMap } = storeToRefs(listenerStore)
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

const allowedExt = ['log', 'txt', 'json', 'csv', 'xml', 'yaml', 'yml']

function isAllowed(file: File) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  return allowedExt.includes(ext)
}

async function handleFileSelect(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  for (const file of Array.from(files)) {
    if (!isAllowed(file)) {
      errorMsg.value = '仅支持日志类型文件：.log, .txt, .json, .csv, .xml, .yaml, .yml'
      setTimeout(() => {
        if (errorMsg.value) errorMsg.value = ''
      }, 3000)
      continue
    }
    const buffer = await file.arrayBuffer()
    sendStore.fileUpload(
      file.name,
      Array.from(new Uint8Array(buffer)) as unknown as any,
      (file.name.split('.').pop() || 'txt').toLowerCase(),
    )
    uploadedFiles.value.push({ name: file.name, size: file.size })
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
  for (const file of files) {
    if (!isAllowed(file)) {
      errorMsg.value = '仅支持日志类型文件：.log, .txt, .json, .csv, .xml, .yaml, .yml'
      setTimeout(() => {
        if (errorMsg.value) errorMsg.value = ''
      }, 3000)
      continue
    }
    const buffer = await file.arrayBuffer()
    sendStore.fileUpload(
      file.name,
      Array.from(new Uint8Array(buffer)) as unknown as any,
      (file.name.split('.').pop() || 'txt').toLowerCase(),
    )
    uploadedFiles.value.push({ name: file.name, size: file.size })
  }
  dragDepth.value = 0
}

function onDragOver(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

function onDragEnter() {
  dragDepth.value++
}

function onDragLeave() {
  dragDepth.value = Math.max(0, dragDepth.value - 1)
}

function preventWindowDnD(e: DragEvent) {
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

function removeFile(i: number) {
  uploadedFiles.value.splice(i, 1)
}

function clearFiles() {
  uploadedFiles.value = []
}

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
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
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
  max-height: calc(80vh - 60px);
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
  border: 2px dashed rgba(128, 128, 128, 0.4);
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  -webkit-user-drag: none;
}

.upload-modal-body .upload-area:hover {
  border-color: var(--vscode-button-hoverBackground, #5a4579);
  background-color: var(--vscode-input-background, #f5f5f5);
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

/* upload list styles */
.upload-list {
  margin-top: 20px;
}
.upload-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.upload-count {
  color: var(--vscode-foreground, #333);
  font-weight: 500;
}
.clear-btn {
  padding: 4px 10px;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid rgba(128, 128, 128, 0.15);
  background-color: var(--vscode-button-background, transparent);
  color: var(--vscode-button-foreground, var(--vscode-foreground, #333));
}
.clear-btn:hover {
  background-color: var(--vscode-button-hoverBackground, rgba(128, 128, 128, 0.12));
}
.upload-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  margin: 5px 0;
  background: var(--vscode-input-background, #f9f9f9);
  border-radius: 4px;
  border: 1px solid rgba(128, 128, 128, 0.06);
}
.file-name {
  display: inline-block;
  flex: 1 1 auto;
  margin-right: 12px;
  color: var(--vscode-foreground, #333);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}
.remove-btn {
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid rgba(128, 128, 128, 0.12);
  background-color: transparent;
  color: var(--vscode-foreground, #333);
}
.remove-btn:hover {
  background-color: rgba(128, 128, 128, 0.08);
}
</style>
