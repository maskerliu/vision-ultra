<template>
  <van-form class="face-db-mgr">
    <van-search v-model="keyword" show-action style="width: 100%;" @search="onSearch"
      :placeholder="$t('faceDbMgr.searchPlaceholder')">
      <template #action>
        <div @click="onSearch">{{ $t('common.search') }}</div>
      </template>
    </van-search>
    <van-cell :title="eigenfaces?.name" v-if="eigenfaces && eigenfaces.eigens.length > 0"
      :title-style="{ 'margin-top': '5px', 'font-size': '1.2rem' }">
      <template #label>
        <van-button type="danger" plain size="small" style="margin-top: 20px; width: 50%" @click="onDeletePerson">
          {{ $t('common.delete') }}
        </van-button>
      </template>
      <template #right-icon>
        <van-badge style="margin: 5px 15px 0 15px;" v-for="eigen in eigenfaces.eigens" :key="eigen.id">
          <van-image fit="cover" width="80" height="80" radius="15" :src="baseDomain() + eigen.snap" />
          <template #content>
            <van-icon class-prefix="iconfont" name="cross" class="badge-icon" @click="onDeleteEigen(eigen.id)" />
          </template>
        </van-badge>
      </template>
    </van-cell>
    <van-empty v-else image="search" :description="keyword ? $t('faceDbMgr.noResult') : $t('faceDbMgr.noSearch')" />

    <van-dialog style="text-align: center;" :title="'&#9889;' + $t('faceDbMgr.delEigenConfirmTitle')" show-cancel-button
      confirmButtonColor="#c0392b" v-model:show="showDeleteEigenConfirm" @confirm="onDeleteEigenConfirm">
      <van-image fit="cover" width="100" height="100" style="margin-top: 15px;"
        :src="baseDomain() + selectedEigenSnap" />
      <p style="color: red; font-size: 0.8rem; margin: 15px;">{{ $t('faceDbMgr.delEigenConfirmTip') }}</p>
    </van-dialog>

    <van-dialog style="text-align: center;"
      :title="'&#9889;' + $t('faceDbMgr.delPersonConfirmTitle') + eigenfaces?.name" show-cancel-button
      confirmButtonColor="#c0392b" v-model:show="showDeletePersonConfirm" @confirm="onDeletePersonConfirm">
      <p style="color: red; font-size: 0.8rem; margin: 15px;">{{ $t('faceDbMgr.delPersonConfirmTip') }}</p>
    </van-dialog>
  </van-form>
</template>
<script lang="ts" setup>

import { FaceRec, baseDomain } from '@shared/index'
import { showNotify } from 'vant'
import { ref } from 'vue'

const showDeleteEigenConfirm = ref(false)
const showDeletePersonConfirm = ref(false)
const keyword = ref('')
const eigenfaces = ref<FaceRec.EigenFace>()
const selectedEigenId = ref<string>()
const selectedEigenSnap = ref<string>()

function onDeletePerson() {
  showDeletePersonConfirm.value = true
}

async function onDeletePersonConfirm() {
  let ids = eigenfaces.value?.eigens.map(eigen => eigen.id) || []
  try {
    await FaceRec.deleteFace(ids)
    showNotify({ type: 'success', message: '删除成功', duration: 500 })
  } catch (err) {
    showNotify({ type: 'danger', message: '删除失败', duration: 500 })
  }
  showDeletePersonConfirm.value = false
  eigenfaces.value = null
  keyword.value = ''
}

function onDeleteEigen(id: string) {
  showDeleteEigenConfirm.value = true
  selectedEigenId.value = id
  for (let eigen of eigenfaces.value?.eigens) {
    if (eigen.id == id) {
      selectedEigenSnap.value = eigen.snap
      break
    }
  }
}

async function onDeleteEigenConfirm() {
  let deletedId = selectedEigenId.value
  try {
    await FaceRec.deleteFace([deletedId])
    showNotify({ type: 'success', message: '删除成功', duration: 500 })
  } catch (err) {
    showNotify({ type: 'danger', message: '删除失败', duration: 500 })
  }
  showDeleteEigenConfirm.value = false
  selectedEigenId.value = null
  selectedEigenSnap.value = null
  // 刷新列表：移除已删除的项，或清空列表
  if (eigenfaces.value) {
    eigenfaces.value.eigens = eigenfaces.value.eigens.filter(e => e.id !== deletedId)
    if (eigenfaces.value.eigens.length === 0) {
      eigenfaces.value = null
      keyword.value = ''
    }
  }
}

async function onSearch() {
  if (keyword.value == '' || keyword.value == null) return
  try {
    let result = await FaceRec.list(keyword.value)
    eigenfaces.value = result
  } catch (err) {
    eigenfaces.value = null
  }
}

</script>
<style lang="css" scoped>
.face-db-mgr {
  width: 70vw;
  min-width: 375px;
  height: 100vh;
  overflow-y: auto;
  background-color: var(--van-gray-1);
  padding-top: 30px;
}

.badge-icon {
  display: block;
  color: white;
  font-size: 0.6rem;
  line-height: 1rem;
}
</style>