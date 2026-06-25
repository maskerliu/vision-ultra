# 功能规格文档：视频目标轨迹跟踪（Object Trajectory Tracking）

> 版本：v1.0
> 日期：2026-06-24
> 作者：产品通
> 关联 PRD：VISION-ULTRA-PRD.md（模块 3 扩展）
> 状态：待评审

---

## 一、背景与 Why

### 当前状态

Vision Ultra 的目标检测功能（`ObjectTracker.ts`）在视频模式下**每帧独立推理**，没有跨帧的目标关联。用户每次看到的是全新的检测框，无法：

- 知道"上一帧的那个人"是不是"这一帧的这个人"
- 分析目标的移动路径和行为模式
- 对特定目标做持续关注（而非每次重新框选）

### 解决的用户问题

| 用户 | 痛点 | 本功能带来的价值 |
|------|------|----------------|
| 安防分析师 | 需要手动逐帧比对目标位置 | 自动连续显示目标运动轨迹 |
| 交通分析师 | 需要统计车流方向和流量 | 轨迹聚合可导出，直接用于流量分析 |
| CV 研究者 | 需要验证跟踪算法效果 | 可视化对比不同跟踪算法的结果 |
| 体育分析师 | 需要追踪球员跑动路线 | 轨迹热力图直观展示跑动覆盖 |

---

## 二、用户故事

| # | 用户故事 | 优先级 |
|---|---------|--------|
| US-T1 | 作为安防分析师，我希望视频播放时系统自动给每个检测目标分配固定 ID 并绘制运动轨迹，以便我直观看到每个目标的完整移动路径 | P0 |
| US-T2 | 作为分析师，我希望点击某个目标的轨迹线可以高亮该目标并查看其出现时间段，以便我做针对性分析 | P0 |
| US-T3 | 作为用户，我希望可以暂停/继续跟踪，以便在关键帧仔细查看目标状态 | P1 |
| US-T4 | 作为研究者，我希望切换不同的跟踪算法（SORT / ByteTrack / DeepSORT），以便对比不同算法效果 | P1 |
| US-T5 | 作为分析师，我希望导出跟踪结果为标准格式（MOT Challenge / JSON），以便用第三方工具进一步分析 | P1 |
| US-T6 | 作为用户，我希望可以设置轨迹线的最大长度（帧数）和透明度衰减，以便控制画面整洁度 | P2 |
| US-T7 | 作为交通分析师，我希望对轨迹做聚合统计（如通行方向、停留时间），以便直接产出分析报告 | P2 |

---

## 三、功能范围（Goals）

### 3.1 核心功能

**A. 跨帧目标关联（Tracking-by-Detection）**

在现有 YOLO 检测基础上，加入跟踪算法层：

```
每帧图像
   │
   ▼
YOLO 检测（已有）
   │  boxes[], scores[], classes[]
   ▼
跟踪算法关联（新增）
   │  为每个检测框匹配/分配持久 Track ID
   ▼
带 ID 的检测结果 → 渲染 + 轨迹记录
```

支持算法：
- **SORT**（Simple Online and Realtime Tracking）：基于 IOU + 卡尔曼滤波，速度快，优先考虑
- **ByteTrack**：基于分数阈值分层匹配，对小目标跟踪更鲁棒
- **DeepSORT**（远期）：引入外观特征（Re-ID 模型），遮挡后仍能重识别

**B. 轨迹可视化**

- 每个 Track ID 用独立颜色渲染（自动分配，最多 20 个）
- 轨迹线为渐变折线：当前帧不透明 → 历史帧逐渐透明
- 轨迹点可选择显示为「小圆点」或「连线」
- 当前帧的检测框旁标注 `ID: 类别 (置信度)`

**C. 跟踪控制面板**

在 `DetectRec.vue` 顶部按钮区新增跟踪控制：

```
[检测] [暂停跟踪] [清除轨迹] [跟踪设置▼]
```

- **暂停跟踪**：冻结当前轨迹，继续播放但不新增轨迹点
- **清除轨迹**：重置所有 Track ID 和轨迹历史
- **跟踪设置**：选择算法、设置 IOU 阈值、最大丢失帧数、轨迹线长度

**D. 目标详情交互**

- 点击检测框 → 高亮该 Track ID 的整条轨迹（其他目标半透明）
- 右侧弹出信息面板：Track ID、类别、首次出现时间、出现总帧数、轨迹长度（像素）

**E. 数据导出**

导出格式：
- **MOT Challenge 格式**（标准学术格式）：`frame_id, track_id, x, y, w, h, score, class_id`
- **JSON 格式**（应用自定义）：包含完整轨迹点坐标和时间戳

---

### 3.2 非目标（Non-goals）

- **不做离线视频分析批量处理**（当前仅做实时播放跟踪，批量处理为 Later）
- **不做多摄像头跨视角跟踪**（单视频源，跨摄像头为 Later）
- **不做行为识别/动作分类**（仅跟踪位置，不分析"在做什么"）
- **不做自动跟踪目标数量统计报表**（P2 功能，本期只做数据导出）
- **不做 DeepSORT 的 Re-ID 模型集成**（本期仅做 SORT/ByteTrack，外观特征为 Later）

---

## 四、技术方案概要

### 4.1 现有代码结构分析

**需要修改/扩展的文件：**

| 文件 | 修改内容 |
|------|---------|
| `common/model/ObjectTracker.ts` | 重命名为 `ObjectDetector.ts` 更准确；新增 `ObjectTracker` 类封装跟踪算法 |
| `common/model/tracker/SortTracker.ts` | **新增**：SORT 算法实现（卡尔曼滤波 + IOU 匹配） |
| `common/model/tracker/ByteTracker.ts` | **新增**：ByteTrack 算法实现 |
| `common/model/tracker/Track.ts` | **新增**：Track 数据模型（ID、历史框、轨迹点、状态） |
| `common/ipc/ObjTrack.worker.ts` | 扩展消息协议，新增 tracking 相关 CMD |
| `common/ipc/ProcessorManager.ts` | 新增 `trackingMode`、`clearTracks()`、`setTrackAlgorithm()` 等接口 |
| `pages/vision/DetectRec.vue` | 新增跟踪控制按钮、轨迹设置面板、目标详情弹窗 |
| `store/Vision.ts` | 新增 tracking 相关状态：`enableTracking`、`trackAlgorithm`、`maxTrajectoryFrames` |
| `shared/ipc.api.ts` | 新增 `TrackingCMD` 枚举 |

### 4.2 SORT 算法核心逻辑（伪代码）

```typescript
class SortTracker {
  private tracks: Track[] = []
  private maxAge: number = 30        // 最大丢失帧数
  private minHits: number = 3        // 最少确认帧数（减少误检）
  private iouThreshold: number = 0.3  // IOU 匹配阈值

  update(detections: Detection[]): Track[] {
    // 1. 预测所有 track 的下一帧位置（卡尔曼滤波）
    for (const track of this.tracks) {
      track.predict()
    }

    // 2. 将检测结果与现有 tracks 做 IOU 匹配（匈牙利算法）
    const matches = this.hungarianMatch(detections, this.tracks)

    // 3. 更新匹配的 tracks
    for (const [detIdx, trackIdx] of matches) {
      this.tracks[trackIdx].update(detections[detIdx])
    }

    // 4. 未匹配的 track → age + 1，超过 maxAge 则删除
    // 5. 未匹配的 detection → 创建新 track
    // 6. 返回所有 confirmed tracks（age >= minHits）
  }
}
```

### 4.3 轨迹数据模型

```typescript
interface TrackPoint {
  frameId: number
  timestamp: number       // 毫秒
  box: [number, number, number, number]  // [y1, x1, y2, x2]
  center: [number, number]                 // [cx, cy]
}

interface Track {
  id: number
  classId: number
  color: string            // 渲染颜色
  points: TrackPoint[]     // 轨迹历史（最多保留 maxTrajectoryFrames 个点）
  kalmanFilter: KalmanFilter
  age: number             // 连续未匹配帧数
  hits: number            // 连续匹配帧数
  state: 'tentative' | 'confirmed' | 'deleted'
}
```

### 4.4 渲染方案

在 `ProcessorManager.onDraw()` 的渲染管线中，在检测框绘制之后新增轨迹绘制：

```typescript
// 在 previewCtx 上绘制轨迹
for (const track of confirmedTracks) {
  const points = track.points.slice(-maxTrajectoryFrames)
  for (let i = 1; i < points.length; i++) {
    const alpha = i / points.length  // 渐变透明
    previewCtx.strokeStyle = track.color + Math.round(alpha * 255).toString(16).padStart(2, '0')
    previewCtx.lineWidth = 2
    previewCtx.beginPath()
    previewCtx.moveTo(points[i-1].center[0], points[i-1].center[1])
    previewCtx.lineTo(points[i].center[0], points[i].center[1])
    previewCtx.stroke()
  }
  // 当前帧中心点画一个小圆
  const last = points[points.length - 1]
  previewCtx.fillStyle = track.color
  previewCtx.beginPath()
  previewCtx.arc(last.center[0], last.center[1], 3, 0, 2 * Math.PI)
  previewCtx.fill()
}
```

---

## 五、用户体验设计

### 5.1 控制面板布局

在 `DetectRec.vue` 现有按钮区新增跟踪相关控件：

```
[打开] [截图] [扫描] [直播] [摄像头]  |  [标注面板]  |  [跟踪:关/开] [轨迹设置⚙]
```

- **跟踪开关**：切换按钮，开启后检测框开始显示 Track ID
- **轨迹设置**：点击弹出 Popover，包含：
  - 算法选择：SORT / ByteTrack（下拉）
  - IOU 阈值：0.1 ~ 0.9（滑块，默认 0.3）
  - 最大丢失帧数：5 ~ 100（滑块，默认 30）
  - 轨迹线长度：10 ~ 300 帧（滑块，默认 100）
  - 轨迹点显示：开关
  - 清除轨迹：危险操作按钮（红色）

### 5.2 检测框标注格式

开启跟踪后，检测框上方显示：

```
┌─────────────────┐
│  ID:03   person  │  ← 跟踪信息（紫色标签）
│  0.87          │
├─────────────────┤
│                 │
│   检测框         │
│                 │
└─────────────────┘
```

### 5.3 目标详情弹窗

点击检测框或轨迹线后，右侧滑出面板：

```
┌─────────────────────────┐
│  Track #03 详情        │
├─────────────────────────┤
│  类别：person           │
│  置信度：0.87          │
│  首次出现：00:12.5     │
│  出现帧数：87 帧        │
│  轨迹长度：1240 px      │
│  状态：tracking         │
│                       │
│  [查看完整轨迹] [导出] │
└─────────────────────────┘
```

---

## 六、验收标准

| # | 验收项 | 标准 |
|---|--------|------|
| AC-1 | SORT 跟踪准确性 | 在 MOT17 测试视频上，MOTA ≥ 60%（SORT 论文基线） |
| AC-2 | 实时性能 | 跟踪计算耗时 < 5ms/帧（不阻塞检测推理） |
| AC-3 | 轨迹可视化 | 轨迹线正确连接同一目标的多帧检测框，ID 切换（ID Switch）次数可接受 |
| AC-4 | 遮挡恢复 | 目标遮挡 ≤ maxAge 帧后重新出现，ID 保持一致 |
| AC-5 | 控制面板 | 所有跟踪设置参数可实时调节并立即生效 |
| AC-6 | 数据导出 | 导出的 MOT 格式文件可被 [TrackEval](https://github.com/JonathonLui/TrackEval) 工具正确读取 |
| AC-7 | 内存占用 | 连续跟踪 5 分钟（30fps）后，前端内存增长 < 100MB |

---

## 七、风险与应对

| 风险 | 影响 | 概率 | 应对策略 |
|------|------|------|---------|
| YOLO 检测抖动导致轨迹抖动 | 中 | 高 | 对检测框做平滑处理（指数移动平均）后再送入跟踪器 |
| 高频目标（如拥挤场景）导致 ID 混淆 | 中 | 中 | 第一期限制最大跟踪目标数为 20，后续引入 DeepSORT |
| Worker 通信延迟导致跟踪不同步 | 低 | 中 | 跟踪算法放在 Worker 内与检测同周期执行，避免跨线程状态不一致 |
| 卡尔曼滤波参数调优复杂 | 低 | 低 | 使用 SORT 论文默认参数作为初始值，开放参数调节接口 |

---

## 八、开发排期建议

| 阶段 | 内容 | 工作量估算 |
|------|------|------------|
| POC | 实现 SORT 算法核心 + 基础轨迹渲染 | 3 人日 |
| 功能完整 | 完成所有 P0 用户故事 + 控制面板 | 5 人日 |
| 稳定性 | 性能优化 + AC 验收测试 + 边界场景处理 | 3 人日 |
| **合计** | | **约 11 人日（2.5 周）** |

---

## 九、后续扩展（Later）

- **DeepSORT**：引入轻量级 Re-ID 模型（MobileNet 特征提取），解决严重遮挡场景
- **轨迹分析**：自动统计通行方向、停留时间、速度
- **批量离线处理**：对整个视频文件做跟踪并导出，无需实时播放
- **多摄像头跟踪**：跨摄像头的同一目标 ID 关联
- **轨迹搜索**：在标注编辑器中搜索特定轨迹并转换为标注

---

## 十、附录：MOT Challenge 格式说明

导出文件名：`tracking_results.txt`

```
<frame_id>, <track_id>, <x1>, <y1>, <w>, <h>, <confidence>, <class_id>, <visibility>
```

示例：
```
1, 1, 312, 180, 56, 128, 0.92, 1, 1
1, 2, 400, 210, 48, 110, 0.87, 1, 1
2, 1, 315, 178, 58, 130, 0.89, 1, 1
2, 2, 405, 208, 50, 112, 0.85, 1, 1
```
