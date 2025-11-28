export default {
  common: {
    done: 'Done',
    cancel: 'Cancel',
    delete: 'Delete',
    save: 'Save',
    upload: 'Upload',
    search: 'Search',
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
    Gray: 'Gray',
    Contrast: 'Contrast', // 对比度
    ContrastDesc: 'Equalization', // 直方图均衡
    Rotate: 'Rotate',
    Brightness: 'Brightness', // 亮度
    BrightnessDesc: 'Gamma correction',

    Saturation: 'Saturation', // 饱和度
    SaturationDesc: 'HSV', // 
    Hue: 'Hue', // 色调

    Blur: 'Blur',
    GaussianBlur: 'Gaussian', // 高斯模糊
    AvgBlur: 'Average', // 均值滤波
    MedianBlur: 'Median', // 中值滤波
    BilateralBlur: 'Bilateral', // 双边滤波

    Sharpness: 'Sharpness', // 锐度
    SharpnessDesc: 'Gamma correction',
    Laplace: 'Laplace',
    LaplaceDesc: 'Laplace operator',
    Sobel: 'Sobel',
    SobelDesc:'Discrete differential operator',
    Scharr: 'Scharr',
    ScharrDesc: 'Enhanced version of Sobel operator',
    
    
    FeatExtract: 'Feature Extract', // 特征提取
    Canny: 'Canny',
    CannyDesc: 'Effective edge detection',
    HoughTransform: 'Hough Transform',
    Hough: '霍夫变换',
    HoughCircle: '霍夫圆变换',
    HoughLine: '霍夫直线变换',
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