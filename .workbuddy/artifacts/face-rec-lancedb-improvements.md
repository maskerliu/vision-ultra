# 人脸采集录入与 LanceDB 功能完善总结

## 修改文件清单

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `src/main/repository/facerec.repo.ts` | 重写 | LanceDB 核心仓库层修复与优化 |
| `src/main/service/facerec.service.ts` | 修改 | 人脸服务层修复与完善 |
| `src/shared/facerec.api.ts` | 修改 | 前后端 API 契约修复 |
| `src/renderer/pages/vision/FaceDbMgr.vue` | 修改 | 人脸数据库管理 UI 修复 |
| `src/renderer/common/ipc/ProcessorManager.ts` | 修改 | 人脸采集逻辑修复 |

---

## 1. facerec.repo.ts (LanceDB 仓库层)

### 问题与修复

| 问题 | 修复方案 |
|------|----------|
| **Schema 定义错误** | 原代码使用 `List(FixedSizeList(2, Float16))` 嵌套，不符合 LanceDB 向量索引要求。改为 `FixedSizeList(956, Float16)` 直接展平存储 478 个关键点 × 2 维坐标。 |
| **向量搜索 API 过时** | 原代码使用 `table.search(eigen, 'vector', 'vector')`，第三个参数错误（被当成全文搜索列）。改为 `table.query().nearestTo(Array.from(vector)).column('vector').distanceType('cosine')`。 |
| **删除语法错误** | 原代码使用 `_rowId`（大写 I），LanceDB 内置行 ID 是 `_rowid`（全小写）。已修正。 |
| **删除效率低** | 原代码对每个 ID 循环调用 `delete()`。改为使用 `_rowid IN (...)` 批量删除。 |
| **SQL 注入风险** | `where` 查询使用字符串拼接。改为 `name.replace(/'/g, "''")` 转义。 |
| **索引缺失** | 原代码仅在创建新表时建立索引，已存在的表可能缺少索引。改为每次 `init()` 时检查索引状态，不存在则自动创建。 |
| **重复检查效率低** | `insert` 中原代码使用 `query().where(...).toArray().length` 统计数量。改为 `countRows()`，更高效。 |
| **死代码** | 删除 `testTable` 测试方法。 |

---

## 2. facerec.service.ts (服务层)

### 问题与修复

| 问题 | 修复方案 |
|------|----------|
| **人脸注册不写入数据库** | `registe` 方法中 `await this.faceRepo.insert(...)` 被注释掉，导致人脸采集后数据丢失。取消注释并添加成功/失败处理。 |
| **类型不匹配** | 参数声明为 `Uint16Array`，但 formidable 解析 `application/octet-stream` 返回的是 `Uint32Array`。修正为 `Uint32Array`。 |
| **拼写错误** | `tiemstamp` → `timestamp`。 |
| **相似度无意义** | 原代码直接返回 `_distance`（余弦距离），范围 0~2，对用户不直观。改为 `similarity = 1 - distance/2` 并转换为百分比 0~100%。 |
| **文件残留** | 如果图片保存成功但数据库插入失败，磁盘上会残留垃圾文件。改为插入失败时自动清理已保存的图片。 |

---

## 3. facerec.api.ts (前后端 API 契约)

### 问题与修复

| 问题 | 修复方案 |
|------|----------|
| **recognize 类型错误** | `vector` 参数声明为 `any`，且上传类型为 `text/plain`。服务端按文本解析会出错。改为 `Float16Array` 类型，上传类型改为 `application/octet-stream`。 |
| **数据转换缺失** | `recognize` 未像 `registe` 一样将 `Float16Array` 转换为 `Uint32Array` 并放大。已补充转换逻辑。 |
| **返回类型不完整** | `recognize` 的返回类型缺少 `id` 和 `similarity`。已补充。 |

---

## 4. FaceDbMgr.vue (人脸管理 UI)

### 问题与修复

| 问题 | 修复方案 |
|------|----------|
| **删除单个特征无效** | `onDeleteEigen` 未设置 `selectedEigenId`，导致删除时传入 `undefined`。已补全赋值。 |
| **删除后列表不刷新** | 删除操作后用户界面未更新。已添加删除成功后从列表移除对应项，若全部删完则清空列表。 |
| **缺少错误提示** | 删除操作无成功/失败反馈。已添加 `showNotify` 提示。 |
| **缺少异常捕获** | 搜索和删除未捕获异常。已添加 `try/catch`。 |

---

## 5. ProcessorManager.ts (人脸采集逻辑)

### 问题与修复

| 问题 | 修复方案 |
|------|----------|
| **采集逻辑被跳过** | `faceCapture` 方法中有一个 `return` 语句在真正保存逻辑之前，导致所有采集操作都不会保存到数据库。已移除该 `return`。 |
| **有效人脸检查不足** | 仅检查 `landmarks.length == 0`，未检查 `face.valid`。已增加 `!this.face.valid` 检查。 |
| **异步回调问题** | 原代码使用 `canvas.toBlob(callback)` 回调式 API，嵌套在异步方法中。改为 `new Promise<Blob>()` 封装，配合 `await` 使用。 |
| **保存失败无提示** | 已完善 `try/catch` 和 `showNotify` 反馈。 |

---

## 关键影响

- **人脸采集**：现在采集的人脸数据会正确写入 LanceDB，并建立向量索引，可用于后续识别。
- **人脸识别**：`recognize` API 现在正确接收二进制向量数据，返回带百分比相似度的识别结果。
- **数据库管理**：删除操作能正确删除 LanceDB 记录，UI 实时刷新。
- **数据一致性**：注册失败时会自动清理已保存的图片，避免垃圾文件。
