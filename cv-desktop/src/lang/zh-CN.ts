
export default {
  common: {
    done: '确定',
    cancel: '取消',
    delete: '删除',
    save: '保存',
    upload: '上传',
    search: '搜索',
    componetLoading: '组件加载中...'
  },
  settings: {
    sys: {
      title: '系统信息',
      protocol: 'Http协议',
      server: '服务IP地址',
      port: '代理Http服务端口',
      porterror: "端口已被占用，请更换",
      serverDomain: '服务域名',
      updateServer: '应用更新服务地址',
      mqttBroker: 'MQTT服务地址',
      theme: '主题',
      fontsize: '字体大小',
      lang: '语言',
      version: '版本',
      restart: '重启',
      noNewVersion: '当前已是最新版本',
    },
    boardcast: {
      onlineClient: '在线Client',
      placeholder: '请输入内容',
      btnSend: '发送'
    },
    resources: {
      title: '静态资源管理',
      upload: '上传文件',
      manage: '远程资源管理',
      cv: {
        title: '人脸识别模型',
        upload: '上传模型文件',
        manage: '远程模型管理',
        uploadSuccess: '模型文件上传成功',
        uploadError: '模型文件上传失败',
        deleteSuccess: '删除成功',
        deleteError: '删除失败'
      }
    }
  },
  debug: {
    common: {
      title: 'Common',
      versionCheck: '版本更新',
      devTools: '开发者工具',
    },
    virtualClient: {
      title: 'Virtual Client'
    }
  },
  cvControl: {
    IntergrateMode: '集成模式',
    ModelEngine: '模型引擎',
    ModelImport: '模型导入',

    ObjRec: '目标识别',
    ObjDetect: '检测',
    ObjSegment: '分割',
    ObjModel: {
      yolov6n: 'YOLOv6 (via 美团)',
      yolov8n: 'YOLOv8 (via Ultralytics)',
      yolov10n: 'YOLOv10(清华大学)',
      yolo11n: 'YOLO11n(lastest)',
      yolo11s: 'YOLO11s(lastest)',
      mobilenet: 'MobileNetv2',
      deeplab: 'Deeplabv3',
      'yolo11n-seg': 'Yolo11n',
      'yolo11s-seg': 'Yolo11s ',
      sam: 'Segment Anything',
      unet: 'u-net++',
    },

    ImgEnhance: '图像增强',
    Gray: '灰度',
    Brightness: '亮度', // 亮度
    BrightnessDesc: 'Gamma增强',
    Rotate: '旋转',
    ColorMap: '色彩映射',

    Morph: '形态学',
    MorphOpt: {
      Erode: '腐蚀',
      Dilate: '膨胀',
      Open: '开运算',
      Close: '闭运算',
      Gradient: '梯度',
      TopHat: '顶帽',
      BlackHat: '黑帽'
    },

    Contrast: '对比度',
    EqualizeHist: '直方图均衡',
    CLAHE: 'CLAHE',

    Saturation: '饱和度',
    SaturationDesc: 'HSV 色彩空间增强',
    Hue: '色调',

    Sharpness: '锐化',
    Blur: '模糊',
    BlurType: {
      Gaussian: '高斯模糊',
      Avg: '均值滤波',
      Median: '中值滤波',
      Bilateral: '双边滤波',
    },

    Filter: '滤波',
    FilterType: {
      Laplace: '拉普拉斯',
      LaplaceDesc: '通常用于特征提取和特征检测',
      Sobel: 'Sobel',
      SobelDesc: '离散的微分算子',
      Scharr: 'Scharr',
      ScharrDesc: 'Sobel算子的增强版本',
    },


    FeatExtract: '特征提取',
    Canny: 'Canny',
    CannyDesc: '边缘检测',
    Hough: '霍夫变换',
    HoughCircle: '霍夫圆变换',
    HoughLine: '霍夫直线变换',

    ObjectDetect: '目标检测',
    ColorTrack: '颜色',
    ContourTrack: '轮廓',
    BackgroundSub: '背景减除',
    MeanShit: 'MeanShift',
    CamShift: 'CamShift',



    FaceRec: '人脸识别'
  },
  anno: {
    object: '物体',
    label: '标签',
    noMatch: '未找到匹配的标签',
    labelPlaceholder: '请输入标签',
    labelDefault: '默认标签',
    labelImport: '导入标签',
  },
  faceRec: {
    nameInput: '请输入姓名',
    nameInputError: '姓名不能为空',
  },
  faceDbMgr: {
    delPersonConfirmTitle: '确认删除该人员记录？',
    delPersonConfirmTip: '删除后将导致该人员无法识别，请谨慎操作',
    delEigenConfirmTitle: '删除特征脸',
    delEigenConfirmTip: '删除该特征脸后将可能导致人脸识别的准确率下降，请谨慎操作',
    searchPlaceholder: '请输入姓名',
    noResult: '未找到相关人员记录',
    noSearch: '请输入人员姓名进行搜索',
  }
}