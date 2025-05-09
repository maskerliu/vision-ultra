<template>
  <van-cell-group inset :title="$t('settings.sys.title')" :style="{ paddingTop: isWeb ? '0' : '10px' }">
    <van-field center :label="$t('settings.sys.protocol')" label-width="10rem" readonly>
      <template #input>
        <van-tabs v-model:active="protocol" type="card" style="margin: 0;">
          <van-tab title="https[2]" :title-style="{ width: '5rem' }"></van-tab>
          <van-tab title="http" :title-style="{ width: '5rem' }"></van-tab>
        </van-tabs>
      </template>
    </van-field>

    <van-field :label="$t('settings.sys.server')" label-width="10rem" readonly>
      <template #input>
        <van-popover v-model:show="showPopover" placement="bottom-start" style="min-width: 300px"
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

    <van-field center :label="$t(item.tooltip)" label-width="10rem" v-for="item in perferences"
      v-model="commonStore.bizConfig[item.key]" :readonly="item.readonly ? true : item.readonly"
      :error-message="!commonStore.bizConfig['portValid'] && item.tooltip == 'settings.sys.port' ? $t('settings.sys.porterror') : null">
      <template #right-icon>
        <van-switch v-if="item.hasStatus" style="margin-top: 5px;"></van-switch>
      </template>
    </van-field>

    <van-cell v-if="!isWeb">
      <template #value>
        <van-button plain type="primary" size="normal" block @click="onSave">
          {{ $t('common.save') }}
        </van-button>
      </template>
    </van-cell>
  </van-cell-group>
</template>
<script lang="ts" setup>
import { inject, onMounted, ref, Ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { LocalIP } from '../../../common'
import { CommonStore } from '../../store'

type SettingPreference = {
  key: string
  tooltip: string
  hasStatus?: boolean
  statusKey?: string
  readonly?: boolean
}

const { t } = useI18n()
const commonStore = CommonStore()
const curServerIp = ref<LocalIP>(null)
const showPopover = ref<boolean>(false)
const isWeb = __IS_WEB__
const showSettings = inject<Ref<boolean>>('showSettings')
const protocol = ref(0)

let perferences = [
  { tooltip: 'settings.sys.serverDomain', key: 'domain' },
  { tooltip: 'settings.sys.port', key: 'port', readonly: __IS_WEB__ },
  { tooltip: 'settings.sys.updateServer', key: 'updateServer', readonly: __IS_WEB__ },
  { tooltip: 'settings.sys.mqttBroker', key: 'mqttBroker', },
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

function onSave() {
  window.electronAPI.saveSysSettings(JSON.stringify(commonStore.bizConfig))
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