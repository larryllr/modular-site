<script setup>
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameState } from '../stores/useGameState'
import AnimatedNumber from './AnimatedNumber.vue'

const gameState = useGameState()
const { t } = useI18n()
const { buildingCount, dailyIncome, pollution, stability } = storeToRefs(gameState)

function showAchievements() {
  gameState.addToast(t('dashboardFooter.achievementLoading'), 'info')
}

onMounted(() => {
  // 时间管理已统一到 App.vue，无需在组件中重复启动计时器
})

onUnmounted(() => {
  // 时间管理已统一到 App.vue，无需在组件中管理计时器
})

// 系统状态数据抽离
const systemStatusList = computed(() => [
  {
    key: 'powerGrid',
    status: 'online',
    colorClass: 'text-industrial-green',
    statusClass: 'status-online',
    label: t('dashboardFooter.online'),
  },
  {
    key: 'transport',
    status: 'limited',
    colorClass: 'text-industrial-yellow',
    statusClass: 'status-warning',
    label: t('dashboardFooter.limited'),
  },
  {
    key: 'security',
    status: 'secure',
    colorClass: 'text-industrial-green',
    statusClass: 'status-online',
    label: t('dashboardFooter.secure'),
  },
  {
    key: 'environment',
    status: 'moderate',
    colorClass: 'text-industrial-yellow',
    statusClass: 'status-warning',
    label: t('dashboardFooter.moderate'),
  },
])
</script>

<template>
  <div class="grid grid-cols-3">
    <!-- 左侧统计 -->
    <div class="dashboard-card p-4 z-10">
      <h3 class="text-sm font-bold text-industrial-accent uppercase tracking-wide mb-3 neon-text">
        {{ t('dashboardFooter.cityMetrics') }}
      </h3>
      <div class="grid grid-cols-2 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-industrial-green neon-text">
            <AnimatedNumber :value="buildingCount" :duration="2" />
          </div>
          <div class="text-sm text-gray-400 uppercase" :class="gameState.language === 'zh' ? 'tracking-[0.3rem]' : 'tracking-wide'">
            {{ t('dashboardFooter.buildings') }}
          </div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-industrial-blue neon-text">
            +<AnimatedNumber :value="dailyIncome" :duration="2" separator="," />
          </div>
          <div class="text-sm text-gray-400 uppercase" :class="gameState.language === 'zh' ? 'tracking-[0.3rem]' : 'tracking-wide'">
            {{ t('dashboardFooter.dailyIncome') }}
          </div>
        </div>
        <div class="text-center">
          <div
            class="text-2xl font-bold neon-text"
            :class="pollution > 100 ? 'text-red-500' : 'text-industrial-yellow'"
          >
            <AnimatedNumber :value="pollution" :duration="2" />
            <span v-if="pollution > 100" class="text-sm"> {{ gameState.language === 'zh' ? '危险' : 'DANGER' }}</span>
          </div>
          <div class="text-sm text-gray-400 uppercase" :class="gameState.language === 'zh' ? 'tracking-[0.3rem]' : 'tracking-wide'">
            {{ t('dashboardFooter.efficiency') }}
          </div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-industrial-green neon-text">
            <AnimatedNumber :value="stability" :duration="2" />%
          </div>
          <div class="text-sm text-gray-400 uppercase" :class="gameState.language === 'zh' ? 'tracking-[0.3rem]' : 'tracking-wide'">
            {{ t('dashboardFooter.stability') }}
          </div>
        </div>
      </div>
    </div>
    <!-- 中间成就系统 -->
    <div class="dashboard-card p-4 z-10">
      <h3 class="text-sm font-bold text-industrial-accent uppercase tracking-wide mb-3 text-center neon-text">
        {{ t('dashboardFooter.achievements') }}
      </h3>
      <div class="space-y-2">
        <div class="flex items-center justify-between bg-industrial-gray rounded p-2">
          <div class="flex items-center space-x-2">
            <span class="text-industrial-yellow">🏆</span>
            <span class="text-xs text-gray-300 uppercase">{{ t('dashboardFooter.firstFactory') }}</span>
          </div>
          <div class="status-indicator status-online" />
        </div>
        <div class="flex items-center justify-between bg-industrial-gray rounded p-2">
          <div class="flex items-center space-x-2">
            <span class="text-gray-500">🏆</span>
            <span class="text-xs text-gray-500 uppercase">{{ t('dashboardFooter.industrialTycoon') }}</span>
          </div>
          <div class="text-xs text-gray-500">
            75%
          </div>
        </div>
        <button
          class="industrial-button w-full text-white font-bold py-2 px-4 text-xs uppercase tracking-wide"
          @click="showAchievements"
        >
          {{ t('dashboardFooter.viewAllAchievements') }}
        </button>
      </div>
    </div>
    <!-- 系统状态 -->
    <div class="dashboard-card p-4 z-10">
      <h3 class="text-sm font-bold text-industrial-accent uppercase tracking-wide mb-3 neon-text">
        {{ t('dashboardFooter.systemStatus') }}
      </h3>
      <div class="grid grid-cols-2 gap-4 w-[80%] mt-2 mx-auto">
        <div
          v-for="item in systemStatusList"
          :key="item.key"
          class="flex items-center space-x-3"
        >
          <!-- 图标 -->
          <div class="w-10 h-10 flex-shrink-0 rounded-full border border-orange-400/50 flex items-center justify-center">
            <!-- 电网图标 -->
            <svg
              v-if="item.key === 'powerGrid'"
              class="w-5 h-5 text-yellow-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M11.3 1.046A1 1 0 0112 2v5.293l6.293-6.293a1 1 0 011.414 1.414L13.414 8.707H18a1 1 0 01.951 1.317l-8 10a1 1 0 01-1.902-.434V10.707L2.707 17.001a1 1 0 01-1.414-1.414L7.586 9.293V4a1 1 0 01.707-1.707l3-1.5z"
                clip-rule="evenodd"
              />
            </svg>
            <!-- 运输图标 -->
            <svg
              v-else-if="item.key === 'transport'"
              class="w-5 h-5"
              :class="item.colorClass"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              <path
                fill-rule="evenodd"
                d="M17 8V6a2 2 0 00-2-2H3a2 2 0 00-2 2v8a2 2 0 002 2h1.532a2.5 2.5 0 014.936 0h2.064a2.5 2.5 0 014.936 0H17a2 2 0 002-2v-2.143a2 2 0 00-1-1.732L17 8zM15 10a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-6 0a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
            <!-- 安全图标 -->
            <svg
              v-else-if="item.key === 'security'"
              class="w-5 h-5"
              :class="item.colorClass"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM14.95 8.243a1 1 0 01-1.414 1.414L9 11.071l-1.536-1.536a1 1 0 111.414-1.414L9 8.243l4.536-3.536a1 1 0 011.414 1.414l-4.95 4.95a1 1 0 01-1.414 0L5.05 9.657a1 1 0 011.414-1.414L9 11.071l3.536-3.536z"
                clip-rule="evenodd"
              />
            </svg>
            <!-- 环境图标 -->
            <svg
              v-else-if="item.key === 'environment'"
              class="w-5 h-5"
              :class="item.colorClass"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.74 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.527-1.973 6.012 6.012 0 011.912 2.706 6.043 6.043 0 01-2.122 7.232A4.5 4.5 0 0012.5 16a4.5 4.5 0 00-1.066-3.093A6.043 6.043 0 014.332 8.027z"
                clip-rule="evenodd"
              />
            </svg>
            <!-- 默认状态指示器 -->
            <div
              v-else
              class="status-indicator"
              :class="item.statusClass"
            />
          </div>
          <!-- 文字 -->
          <div>
            <div class="text-sm text-blue-300 uppercase">
              {{ t(`dashboardFooter.${item.key}`) }}
            </div>
            <div
              class="text-sm font-bold uppercase"
              :class="item.colorClass"
            >
              {{ item.label }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ... */
</style>
