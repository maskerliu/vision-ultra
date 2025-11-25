<template>
  <van-form class="face-db-mgr">
    <van-search v-model="keyword" show-action style="width: 100%; margin-top: 30px;">
      <template #action>
        <div @click="onSearch">搜索</div>
      </template>
    </van-search>
    <van-list>
      <van-cell title="chris" center>
        <template #label>
          <van-button type="success" hairline plain size="small">添加</van-button>
          <van-button type="danger" hairline plain size="small" style="margin-left: 15px;">删除</van-button>
        </template>
        <template #right-icon>
          <van-badge style="margin: 5px 15px;">
            <van-image fit="cover" width="100" height="100" src="https://img.yzcdn.cn/vant/cat.jpeg" />
            <template #content>
              <van-icon name="cross" class="badge-icon" @click="onDelete" />
            </template>
          </van-badge>
          <van-badge style="margin-right: 15px;">
            <van-image fit="cover" width="100" height="100" src="https://img.yzcdn.cn/vant/cat.jpeg" />
            <template #content>
              <van-icon name="cross" class="badge-icon" @click="onDelete" />
            </template>
          </van-badge>
        </template>
      </van-cell>
    </van-list>

    <van-dialog v-model:show="deleteConfirm" show-cancel-button>
      <template #default>
        <van-image fit="cover" width="100" height="100" src="https://img.yzcdn.cn/vant/cat.jpeg" />
        <p>确定删除？</p>
      </template>
    </van-dialog>
  </van-form>
</template>
<script lang="ts" setup>
import { ref } from 'vue'
import { FaceRec } from '../../../common'

const deleteConfirm = ref(false)
const keyword = ref('')

function onDelete() {
  deleteConfirm.value = true
}

async function onSearch() {
  if (keyword.value == '' || keyword.value == null) return

  await FaceRec.list(keyword.value)
}

</script>
<style lang="css" scoped>
.face-db-mgr {
  width: 80vw;
  min-width: 375px;
  height: 100vh;
  overflow-y: auto;
  background-color: var(--van-gray-1);
}

.badge-icon {
  display: block;
  font-size: 1rem;
  line-height: 1.4rem;
}
</style>