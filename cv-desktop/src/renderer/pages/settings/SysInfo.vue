<template>
  <van-cell-group inset :title="$t('settings.sys.title')" :style="{ paddingTop: isWeb ? '0' : '10px' }">
    <van-field center :label="$t('settings.sys.protocol')" label-width="10rem" readonly input-align="right">
      <template #input>
        <van-tabs v-model:active="protocol" type="card" style="margin: 0;">
          <van-tab title="https[2]" :title-style="{ width: '5rem' }"></van-tab>
          <van-tab title="http" :title-style="{ width: '5rem' }"></van-tab>
        </van-tabs>
      </template>
    </van-field>

    <van-field :label="$t('settings.sys.server')" label-width="10rem" readonly input-align="right">
      <template #input>
        <van-popover v-model:show="showPopover" placement="bottom-end" style="min-width: 300px"
          v-if="commonStore.bizConfig.ips">
          <van-cell v-for="item in commonStore.bizConfig.ips" :value="item.address" clickable is-link
            @click="onSelectIP(item)">
            <template #title>
              <div style="max-width: 140px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                {{ item.name }}
              </div>
            </template>
          </van-cell>

          <template #reference>
            <div style="min-width: 120px; height: 1rem; padding: 2px; margin-top: -5px;">
              {{ curServerIp?.address }}
            </div>
          </template>
        </van-popover>
      </template>
    </van-field>

    <van-field center :label="$t(`settings.sys.${item.key}`)" label-width="10rem" input-align="right"
      v-for="item in perferences" v-model="commonStore.bizConfig[item.key]"
      :readonly="item.readonly ? true : item.readonly" error-message-align="right"
      :error-message="!commonStore.bizConfig['portValid'] && item.key == 'port' ? $t('settings.sys.porterror') : null">
      <template #right-icon>
        <van-switch v-if="item.hasStatus" style="margin-top: 5px;"></van-switch>
        <van-button v-if="item.openFolder" type="success" plain square size="mini" @click="onSelectFolder">
          <van-icon class-prefix="iconfont" name="folder-path" />
        </van-button>
        <van-button v-if="item.openFolder" type="primary" plain square size="mini" @click="onOpenFolder">
          <van-icon class-prefix="iconfont" name="open" />
        </van-button>
      </template>
    </van-field>

    <van-button v-if="!isWeb" plain type="primary" size="small" @click="onSave"
      style="margin: 5px; width: calc(100% - 10px);">
      {{ $t('common.save') }}
    </van-button>
  </van-cell-group>
</template>
<script lang="ts" setup>

import { inject, onMounted, ref, Ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { LocalIP } from '../../../shared'
import { CommonStore } from '../../store'

type SettingPreference = {
  key: string
  label: string
  openFolder?: boolean
  hasStatus?: boolean
  statusKey?: string
  readonly?: boolean
}

const { t } = useI18n()
const commonStore = CommonStore()
const curServerIp = ref<LocalIP>(null)
const showPopover = ref<boolean>(false)
const showSettings = inject<Ref<boolean>>('showSettings')
const protocol = ref(0)
const isWeb = window.isWeb

let perferences = [
  { key: 'domain' },
  { key: 'port', readonly: isWeb },
  { key: 'updateServer', readonly: isWeb },
  { key: 'modelPath', readonly: isWeb, openFolder: true },
] as Array<SettingPreference>

onMounted(() => {
  if (commonStore.bizConfig.ips) curServerIp.value = commonStore.bizConfig.ips[0]

  protocol.value = commonStore.bizConfig.protocol == 'https' ? 0 : 1
})

watch(() => commonStore.bizConfig, () => {
  if (commonStore.bizConfig.ips) curServerIp.value = commonStore.bizConfig.ips[0]
})

watch(() => protocol.value, () => {
  commonStore.bizConfig.protocol = protocol.value == 0 ? 'https' : 'http'
})

function onSelectIP(ip: LocalIP) {
  curServerIp.value = ip
  showPopover.value = false
}

function onSelectFolder() {
  window.mainApi?.selectFolder((path: string) => {
    commonStore.bizConfig.modelPath = path
  })
}

function onOpenFolder() {
  window.mainApi?.openFolder(commonStore.bizConfig.modelPath)
}

function onSave() {
  window.mainApi?.updateBizConfig(JSON.stringify(commonStore.bizConfig))
  showSettings.value = false
}

</script>

<style scoped>
.single-line {
  max-width: 80px;
  font-size: 0.7rem;
  color: #34495e;
  padding: 5px;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>