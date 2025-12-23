export default {
  common: {
    done: 'Done',
    cancel: 'Cancel',
    delete: 'Delete',
    save: 'Save',
    upload: 'Upload',
    search: 'Search',
    componetLoading: 'Component Loading...'
  },
  settings: {
    sys: {
      title: 'System Info',
      protocol: 'Protocol',
      server: 'Server',
      port: 'Server Port',
      porterror: "Port has been used",
      serverDomain: 'Server Domain',
      updateServer: 'App Update Server',
      mqttBroker: 'MQTT Broker',
      theme: 'Theme',
      lang: 'locales',
      version: 'Version',
      restart: 'restart',
      noNewVersion: 'No New Version'
    },
    boardcast: {
      onlineClient: 'Online Client',
      placeholder: 'please enter message',
      btnSend: 'Send'
    },
    resources: {
      title: 'Manage Remote Static Resources',
      upload: 'Upload File',
      manage: 'Remote Resource Manage',
      cv: {
        title: 'Face Recognition Model',
        upload: 'Upload Model File',
        manage: 'Remote Model Manage',
        uploadSuccess: 'Model File Upload Success',
        uploadError: 'Model File Upload Failed',
        deleteSuccess: 'Delete Success',
        deleteError: 'Delete Failed'
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
    IntergrateMode: 'Integrate Mode',
    ModelEngine: 'Model Engine',
    ImgEnhance: 'Image Enhancement',
    Gray: 'Gray',
    Brightness: 'Brightness', // 亮度
    BrightnessDesc: 'Gamma correction',
    Rotate: 'Rotate',
    ColorMap: 'Color Map',

    Contrast: 'Contrast', // 对比度
    EqualizeHist: 'EqualizeHist', // 直方图均衡
    CLAHE: 'CLAHE', // CLAHE

    Saturation: 'Saturation', // 饱和度
    SaturationDesc: 'HSV', // 
    Hue: 'Hue', // 色调

    Sharpness: 'Sharpen',
    Blur: 'Blur',
    GaussianBlur: 'Gaussian', // 高斯模糊
    AvgBlur: 'Average', // 均值滤波
    MedianBlur: 'Median', // 中值滤波
    BilateralBlur: 'Bilateral', // 双边滤波

    Filter: 'Filter',
    Laplace: 'Laplace',
    LaplaceDesc: 'Laplace operator',
    Sobel: 'Sobel',
    SobelDesc: 'Discrete differential operator',
    Scharr: 'Scharr',
    ScharrDesc: 'Enhanced version of Sobel operator',


    FeatExtract: 'Feature Extract', // 特征提取
    Canny: 'Canny',
    CannyDesc: 'Effective edge detection',
    HoughTransform: 'Hough Transform',
    Hough: 'Hogh Cvt',
    HoughCircle: 'Hough Circle Cvt',
    HoughLine: 'Hough Line Cvt',

    ObjectDetect: 'Object Detect',
    ColorTrack: 'Color',
    ContourTrack: 'Contour',
    BackgroundSub: 'Bg Subtract',
    MeanShit: 'MeanShift',
    CamShift: 'CamShift',

    YOLODetect: 'YOLO',
    YOLODesc: 'you only look once',
    yolov6n: 'YOLOv6 (via meituan)',
    yolov8n: 'YOLOv8 (via Ultralytics)',
    yolov10n: 'YOLOv10(via Tsinghua university)',
    yolo11n: 'YOLO11(lastest)',

    FaceRec: 'Face Recognition'

  },
  anno: {
    object: 'Object',
    label: 'Label',
    noMatch: 'no match label',
    labelPlaceholder: 'input label name',
  },
  faceRec: {
    nameInput: 'Please enter name',
    nameInputError: 'Name cannot be empty',
  },
  faceDbMgr: {
    delPersonConfirmTitle: 'delete person',
    delPersonConfirmTip: 'Deleting will render the person unrecognizable, please proceed with caution',
    delEigenConfirmTitle: 'Delete Eigenfaces',
    delEigenConfirmTip: 'Deleting this feature face may result in a decrease in the accuracy of facial recognition, please proceed with caution',
    searchPlaceholder: 'Please enter name',
    noResult: 'No relevant personnel records found',
    noSearch: 'Please enter the name of the person to search',
  }
}