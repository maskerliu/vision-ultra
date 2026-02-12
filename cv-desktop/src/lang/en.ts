
export default {
  common: {
    done: 'Done',
    cancel: 'Cancel',
    delete: 'Delete',
    save: 'Save',
    upload: 'Upload',
    search: 'Search',
    loading: 'Loading...'
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
    intergrateMode: 'Integrate Mode',
    modelEngine: 'Model Framework',

    objTrack: 'Object Detect',
    objDetect: 'Detect',
    objSegment: 'Segment',
    objModel: {
      yolov8s: 'YOLOv8s (Ultralytics)',
      yolov10s: 'YOLOv10s(Tsinghua university)',
      yolo11s: 'YOLO11s(lastest)',
      mobilenet: 'MobileNetv2',
      'deeplab-ade': 'Deeplab-ADE20K',
      'deeplab-cityspace': 'Deeplab-Cityspace',
      'deeplabv3p-mobilenet': 'Deeplabv3+(MobileNet)',
      'bisenet': 'BiSeNet',
      'yolo11s-seg': 'Yolo11s',
      'yolo26s-seg': 'Yolo26s',
      'yoloe-26n-seg': 'Yoloe26n',
      'yoloe-26n-seg-pf': 'Yoloe26n(Prompt Free)',
      sam: 'Segment Anything(Meta)',
      fastSAMs: 'FastSAM-s',
      unet: 'u-net++',
    },

    faceDetect: 'Face Recognize',

    animeGAN: 'AnimeGAN',
    animeModel: {
      'animeGANv2': 'v2',
      'animeGANv3-Ghibli-o1': 'v3-Ghibli-o1-e299',
      'animeGANv3-Ghibli-c1': 'v3-Ghibli-c1-e299',
      'animeGANv3-Hayao': 'v3-Hayao-36',
      'animeGANv3-JPface': 'v3-JPface-v1.0',
      'animeGANv3-PortraitSketch': 'v3-PortraitSketch-25',
      'animeGANv3-Shinkai': 'v3-Shinkai-37',
      'animeGANv3-TinyCute': 'v3-TinyCute',
      'animeGANv3-FacePaint': 'v3-FacePaint',
    },

    ocr: 'OCR',
    ocrModel: {
      'tesseract': 'tesseract.js',
      'kerasOcr': 'kerasOcr',
      'easyOcr': 'easyOcr',
      'paddleOcr': '飞桨OCR',
      'GOT-OCR': 'GOT-OCR2.0',
    },

    styleTrans: 'Style Transform',
    styleModel: {
      'style-mobileNet': 'mobileNet',
      'style-inceptionv3': 'inceptionv3'
    },
    transModel: {
      'trans-separable-conv2d': 'Separable Conv2d',
      'trans-origin': 'Original Transform',
    },

    imgEnhance: 'Image Enhance',
    gray: 'Gray',
    brightness: 'Brightness', // 亮度
    brightnessDesc: 'Gamma correction',
    rotate: 'Rotate',
    colorMap: 'Color Map',

    morph: 'Morphology', // 形态学
    morphOpt: {
      erode: 'Erosion', // 腐蚀
      dilate: 'Dilation', // 膨胀
      open: 'Open', // 开运算
      close: 'Close', // 闭运算
      gradient: 'Gradient', // 梯度
      topHat: 'TopHat', // 顶帽
      blackHat: 'BlackHat' // 黑帽
    },

    contrast: 'Contrast', // 对比度
    equalizeHist: 'EqualizeHist', // 直方图均衡
    clahe: 'CLAHE', // CLAHE

    saturation: 'Saturation', // 饱和度
    saturationDesc: 'HSV', // 
    hue: 'Hue', // 色调

    sharpness: 'Sharpen',
    blur: 'Blur',
    blurType: {
      gaussian: 'Gaussian', // 高斯模糊
      avg: 'Average', // 均值滤波
      median: 'Median', // 中值滤波
      bilateral: 'Bilateral', // 双边滤波
    },


    filter: 'Filter',
    filterType: {
      laplace: 'Laplace',
      laplaceDesc: 'Laplace operator',
      sobel: 'Sobel',
      sobelDesc: 'Discrete differential operator',
      scharr: 'Scharr',
      scharrDesc: 'Enhanced version of Sobel operator',
    },

    featExtract: 'Feature Extract', // 特征提取
    canny: 'Canny',
    cannyDesc: 'Effective edge detection',
    houghTransform: 'Hough Transform',
    hough: 'Hogh Cvt',
    houghCircle: 'Hough Circle Cvt',
    houghLine: 'Hough Line Cvt',

    colorTrack: 'Color',
    contourTrack: 'Contour',
    backgroundSub: 'Bg Subtract',
    meanShit: 'MeanShift',
    camShift: 'CamShift',


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