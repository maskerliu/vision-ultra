
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
      fontsize: 'Font Size',
      lang: 'Locales',
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
  cvControl: {
    IntergrateMode: 'Integrate Mode',
    ModelEngine: 'Model Engine',
    ModelImport: 'Import Model',

    ObjRec: 'Object Detect',
    ObjDetect: 'Detect',
    ObjSegment: 'Segment',
    ObjModel: {
      yolov8n: 'YOLOv8 (via Ultralytics)',
      yolov10n: 'YOLOv10(via Tsinghua university)',
      yolov10s: 'YOLOv10(via Tsinghua university)',
      yolo11n: 'YOLO11n(lastest)',
      yolo11s: 'YOLO11s(lastest)',
      mobilenet: 'MobileNetv2',
      'deeplab-ade': 'Deeplabv3-ADE20K',
      'deeplab-cityspace': 'Deeplabv3-Cityspace',
      'yolo11n-seg': 'Yolo11n',
      'yolo11s-seg': 'Yolo11s',
      'yolo11m-seg': 'Yolo11m',
      sam: 'Segment Anything',
      unet: 'u-net++',
    },


    FaceRec: 'Face Recognize',

    GenImage: 'Image2Image',
    GanModel: {
      animeGANv3: 'AnimateGANv3',
      anime_Kpop: 'AnimateGANv3_Kpop',
      anime_Disney: 'AnimeGANv3_Disney',
      anime_OilPaint: 'AnimeGANv3_Oil-painting',
      anime_Ghibli: 'AnimeGANv3_Ghibli-o1'
    },

    OCR: 'OCR',
    OcrModel: {

    },

    ImgEnhance: 'Image Enhance',
    Gray: 'Gray',
    Brightness: 'Brightness', // 亮度
    BrightnessDesc: 'Gamma correction',
    Rotate: 'Rotate',
    ColorMap: 'Color Map',

    Morph: 'Morphology', // 形态学
    MorphOpt: {
      Erode: 'Erosion', // 腐蚀
      Dilate: 'Dilation', // 膨胀
      Open: 'Open', // 开运算
      Close: 'Close', // 闭运算
      Gradient: 'Gradient', // 梯度
      TopHat: 'TopHat', // 顶帽
      BlackHat: 'BlackHat' // 黑帽
    },

    Contrast: 'Contrast', // 对比度
    EqualizeHist: 'EqualizeHist', // 直方图均衡
    CLAHE: 'CLAHE', // CLAHE

    Saturation: 'Saturation', // 饱和度
    SaturationDesc: 'HSV', // 
    Hue: 'Hue', // 色调

    Sharpness: 'Sharpen',
    Blur: 'Blur',
    BlurType: {
      Gaussian: 'Gaussian', // 高斯模糊
      Avg: 'Average', // 均值滤波
      Median: 'Median', // 中值滤波
      Bilateral: 'Bilateral', // 双边滤波
    },


    Filter: 'Filter',
    FilterType: {
      Laplace: 'Laplace',
      LaplaceDesc: 'Laplace operator',
      Sobel: 'Sobel',
      SobelDesc: 'Discrete differential operator',
      Scharr: 'Scharr',
      ScharrDesc: 'Enhanced version of Sobel operator',
    },

    FeatExtract: 'Feature Extract', // 特征提取
    Canny: 'Canny',
    CannyDesc: 'Effective edge detection',
    HoughTransform: 'Hough Transform',
    Hough: 'Hogh Cvt',
    HoughCircle: 'Hough Circle Cvt',
    HoughLine: 'Hough Line Cvt',

    ColorTrack: 'Color',
    ContourTrack: 'Contour',
    BackgroundSub: 'Bg Subtract',
    MeanShit: 'MeanShift',
    CamShift: 'CamShift',


  },
  anno: {
    object: 'Object',
    label: 'Label',
    noMatch: 'no match label',
    labelPlaceholder: 'input label name',
    labelDefault: 'default',
    labelImport: 'Import Label',
    cvtMaskContour: 'Convert mask to polygon'
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