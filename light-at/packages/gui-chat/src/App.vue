<template>
  <div class="chat-container">
    <DialogBox />
    <div class="sep-line"></div>
    <InputBox />
  </div>
</template>

<script setup lang="ts">
import DialogBox from './components/DialogBox.vue'
import InputBox from './components/InputBox.vue'
import { useSenderStore } from './stores/sender'
import { onMounted } from 'vue'

onMounted(() => {
  useSenderStore().initReady()
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.dialog-box {
  flex: 1;
  overflow: auto;
  scrollbar-width: thin;
}

.sep-line {
  border-top: 1px solid rgba(128, 128, 128, 0.4);
}

.input-box {
  flex-shrink: 0;
}
</style>
