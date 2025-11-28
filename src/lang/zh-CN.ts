export default {
  common: {
    done: '确定',
    cancel: '取消',
    delete: '删除',
    save: '保存',
    upload: '上传',
    search: '搜索',
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
      versionCheck: 'Check Version',
      devTools: 'Developer Tools',
    },
    virtualClient: {
      title: 'Virtual Client'
    }
  },
  imgProcess: {
    Gray: '灰度',
    Brightness: '亮度', // 亮度
    BrightnessDesc: 'Gamma增强',
    Rotate: '旋转',
    
    Contrast: '对比度', // 对比度
    ContrastDesc: '直方图均衡', // 直方图均衡

    Saturation: '饱和度', // 饱和度
    SaturationDesc: 'HSV 色彩空间增强',
    Hue: '色调', // 色调

    Blur: '模糊',
    GaussianBlur: '高斯模糊', // 高斯模糊
    AvgBlur: '均值滤波', // 均值滤波
    MedianBlur: '中值滤波', // 中值滤波
    BilateralBlur: '双边滤波', // 双边滤波

    Filter: '滤波',
    SharpnessDesc: 'Gamma correction',
    Laplace: '拉普拉斯算子',
    LaplaceDesc: '通常用于特征提取和特征检测',
    Sobel: 'Sobel算子',
    SobelDesc:'离散的微分算子',
    Scharr: 'Scharr算子',
    ScharrDesc: 'Sobel算子的增强版本',

    FeatExtract: '特征提取', 
    Canny: 'Canny',
    CannyDesc: '边缘检测',
    Hough: '霍夫变换',
    HoughCircle: '霍夫圆变换',
    HoughLine: '霍夫直线变换',
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