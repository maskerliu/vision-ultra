
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
      title: '模型管理',
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
    intergrateMode: '集成模式',
    modelEngine: '模型框架',
    modelImport: '模型导入',

    objRec: '目标识别',
    objDetect: '检测',
    objSegment: '分割',
    objModel: {
      yolov8n: 'YOLOv8 (Ultralytics)',
      yolov10n: 'YOLOv10n(清华大学)',
      yolov10s: 'YOLOv10s(清华大学)',
      yolo11n: 'YOLO11n(lastest)',
      yolo11s: 'YOLO11s(lastest)',
      mobilenet: 'MobileNetv2',
      'deeplab-ade': 'Deeplab-ADE20K',
      'deeplab-cityspace': 'Deeplab-Cityspace',
      'yolo11n-seg': 'Yolo11n',
      'yolo11s-seg': 'Yolo11s ',
      'yolo11m-seg': 'Yolo11m',
      'yolo26s-seg': 'Yolo26s',
      sam: 'Segment Anything',
      unet: 'u-net++',
    },

    faceRec: '人脸识别',

    genImage: '图生图',
    ganModel: {
      animeGANv3: 'AnimateGANv3',
      anime_Kpop: 'AnimateGANv3_韩风',
      anime_Disney: 'AnimeGANv3_迪士尼',
      anime_OilPaint: 'AnimeGANv3_油画风',
      anime_Ghibli: 'AnimeGANv3_吉卜力风'
    },

    ocr: 'OCR',
    ocrModel: {

    },

    styleTransfor: 'Style Transfor',
    styleModel: {
      'mobileNet': 'mobileNet',
      'inceptionv3': 'inceptionv3'
    },
    transferModel: {
      'separable': 'Separable Conv2d',
      'origin': 'Original Transform',
    },

    imgEnhance: '图像增强',
    gray: '灰度',
    brightness: '亮度', // 亮度
    brightnessDesc: 'Gamma增强',
    rotate: '旋转',
    colorMap: '色彩映射',

    morph: '形态学',
    morphOpt: {
      erode: '腐蚀',
      dilate: '膨胀',
      open: '开运算',
      close: '闭运算',
      gradient: '梯度',
      topHat: '顶帽',
      blackHat: '黑帽'
    },

    contrast: '对比度',
    equalizeHist: '直方图均衡',
    clahe: 'CLAHE',

    saturation: '饱和度',
    saturationDesc: 'HSV 色彩空间增强',
    hue: '色调',

    sharpness: '锐化',
    blur: '模糊',
    blurType: {
      gaussian: '高斯模糊',
      avg: '均值滤波',
      median: '中值滤波',
      bilateral: '双边滤波',
    },

    filter: '滤波',
    filterType: {
      laplace: '拉普拉斯',
      laplaceDesc: '通常用于特征提取和特征检测',
      sobel: 'Sobel',
      sobelDesc: '离散的微分算子',
      scharr: 'Scharr',
      scharrDesc: 'Sobel算子的增强版本',
    },


    featExtract: '特征提取',
    canny: 'Canny',
    cannyDesc: '边缘检测',
    hough: '霍夫变换',
    houghCircle: '霍夫圆变换',
    houghLine: '霍夫直线变换',

    objectDetect: '目标检测',
    colorTrack: '颜色',
    contourTrack: '轮廓',
    backgroundSub: '背景减除',
    meanShit: 'MeanShift',
    camShift: 'CamShift',
  },
  anno: {
    object: '物体',
    label: '标签',
    noMatch: '未找到匹配的标签',
    labelPlaceholder: '请输入标签',
    labelDefault: '默认标签',
    labelImport: '导入标签',
    cvtMaskContour: '掩膜转化为轮廓'
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