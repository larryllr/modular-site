<script setup>
import { useGameState } from '@/stores/useGameState.js'
import { onMounted, onUnmounted } from 'vue'
import BuildingDetails from './components/BuildingDetails.vue'
import BuildingSidebar from './components/BuildingSidebar.vue'
import DashboardFooter from './components/DashboardFooter.vue'
import GameCanvas from './components/GameCanvas.vue'
import DialogLayer from './components/layers/DialogLayer.vue'
import AppLayout from './components/layout/AppLayout.vue'
import MapOverview from './components/MapOverview.vue'
import ModeIndicator from './components/ModeIndicator.vue'
import RestorePrompt from './components/RestorePrompt.vue'
import SelectedIndicator from './components/SelectedIndicator.vue'
import ToastContainer from './components/ToastContainer.vue'
import TopBar from './components/TopBar.vue'

const gameState = useGameState()

// 时间管理 - 统一5秒计时器
let dayInterval = null
let isPaused = false

// 页面可见性监听 - 实现HX-43离屏暂停功能
function handleVisibilityChange() {
  if (document.hidden && !isPaused) {
    // 页面不可见时暂停计时器
    if (dayInterval) {
      clearInterval(dayInterval)
      isPaused = true
    }
  }
  else if (!document.hidden && isPaused) {
    // 页面可见时恢复计时器
    startDayTimer()
    isPaused = false
  }
}

// 启动每日计时器
function startDayTimer() {
  if (dayInterval) {
    clearInterval(dayInterval)
  }
  dayInterval = setInterval(() => {
    gameState.nextDay()
  }, 5000)
}

// 对话框由 DialogLayer 统一处理，无需在此监听或管理

// ESC关闭地图总览
function handleKeydown(e) {
  if (gameState.showMapOverview && (e.key === 'Escape' || e.key === 'Esc')) {
    gameState.setShowMapOverview(false)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  // 启动统一的5秒计时器（集成每日收益和稳定度更新）
  startDayTimer()
  // 监听页面可见性变化 - 实现HX-43离屏暂停功能
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  // 清除统一计时器
  if (dayInterval) {
    clearInterval(dayInterval)
  }
  // 移除页面可见性监听
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <AppLayout>
    <template #header>
      <TopBar />
    </template>

    <template #left>
      <BuildingSidebar />
    </template>

    <template #main>
      <ModeIndicator />
      <GameCanvas />
      <SelectedIndicator />
    </template>

    <template #right>
      <BuildingDetails />
    </template>

    <template #footer>
      <DashboardFooter />
    </template>

    <template #overlays>
      <!-- 继续存档提示：需要可交互 -->
      <div class="pointer-events-auto">
        <RestorePrompt />
      </div>

      <!-- 地图总览浮层：可交互 -->
      <div class="pointer-events-auto">
        <transition name="fade">
          <div
            v-if="gameState.showMapOverview"
            class="absolute top-[20%] right-[50%] translate-x-[50%] w-[min(90vw,600px)] h-[min(90vh,600px)] z-50 bg-[#212121] rounded-lg shadow-lg p-2"
            @contextmenu.prevent="gameState.setShowMapOverview(false)"
          >
            <button
              class="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full text-xl font-bold text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-150 focus:outline-none z-10"
              aria-label="关闭地图总览"
              tabindex="0"
              @click="gameState.setShowMapOverview(false)"
            >
              ❌
            </button>
            <MapOverview />
          </div>
        </transition>
      </div>

      <!-- 全局提示与对话层：可交互 -->
      <div class="pointer-events-auto">
        <ToastContainer />
      </div>
      <DialogLayer />
    </template>
  </AppLayout>
</template>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
