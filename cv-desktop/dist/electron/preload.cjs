/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/common/ipc.api.ts":
/*!*******************************!*\
  !*** ./src/common/ipc.api.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MainAPICMD: () => (/* binding */ MainAPICMD)
/* harmony export */ });
const MainAPICMD = {
    Relaunch: 'relaunch',
    OpenFile: 'openFile',
    SaveFileAs: 'saveFile',
    OpenDevTools: 'openDevTools',
    OpenMockRuleMgr: 'openMockRuleMgr',
    OpenSettings: 'openSettings',
    GetSysSettings: 'getSysSettings',
    SaveSysSettings: 'saveSysSettings',
    SetAppTheme: 'setAppTheme',
    GetSysTheme: 'getSysTheme',
    SysThemeChanged: 'sysThemeChanged',
    DownloadUpdate: 'downloadUpdate',
    SendServerEvent: 'sendServerEvent'
};


/***/ }),

/***/ "./src/main/MainApi.ts":
/*!*****************************!*\
  !*** ./src/main/MainApi.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! electron */ "electron");
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _common_ipc_api__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../common/ipc.api */ "./src/common/ipc.api.ts");


let mainApi = {
    relaunch() {
        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke(_common_ipc_api__WEBPACK_IMPORTED_MODULE_1__.MainAPICMD.Relaunch);
    },
    openFile(callback) {
        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke(_common_ipc_api__WEBPACK_IMPORTED_MODULE_1__.MainAPICMD.OpenFile);
        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.once(_common_ipc_api__WEBPACK_IMPORTED_MODULE_1__.MainAPICMD.OpenFile, (event, result) => callback(result));
    },
    saveFile(title, fileName, file, slient = false) {
        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke(_common_ipc_api__WEBPACK_IMPORTED_MODULE_1__.MainAPICMD.SaveFileAs, title, fileName, file, slient);
        // ipcRenderer.once(MainAPICMD.SaveFileAs, (event, result) => callback(result))
    },
    openDevTools(...args) {
        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke(_common_ipc_api__WEBPACK_IMPORTED_MODULE_1__.MainAPICMD.OpenDevTools, args);
    },
    saveSysSettings(...args) {
        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke(_common_ipc_api__WEBPACK_IMPORTED_MODULE_1__.MainAPICMD.SaveSysSettings, args);
    },
    downloadUpdate(newVersion) {
        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke(_common_ipc_api__WEBPACK_IMPORTED_MODULE_1__.MainAPICMD.DownloadUpdate, newVersion);
    },
    sendServerEvent() {
        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke(_common_ipc_api__WEBPACK_IMPORTED_MODULE_1__.MainAPICMD.SendServerEvent);
    },
    getSysSettings(callback) {
        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.once(_common_ipc_api__WEBPACK_IMPORTED_MODULE_1__.MainAPICMD.GetSysSettings, (_event, result) => callback(result));
    },
    setAppTheme(theme) {
        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke(_common_ipc_api__WEBPACK_IMPORTED_MODULE_1__.MainAPICMD.SetAppTheme, theme);
    },
    getSysTheme(callback) {
        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.once(_common_ipc_api__WEBPACK_IMPORTED_MODULE_1__.MainAPICMD.GetSysTheme, (theme) => callback(theme));
    },
    onOpenMockRuleMgr(callback) {
        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.once(_common_ipc_api__WEBPACK_IMPORTED_MODULE_1__.MainAPICMD.OpenMockRuleMgr, (_event) => callback());
    },
    onOpenSettings(callback) {
        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.once(_common_ipc_api__WEBPACK_IMPORTED_MODULE_1__.MainAPICMD.OpenSettings, (_event) => callback());
    },
    onSysThemeChanged(callback) {
        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.once(_common_ipc_api__WEBPACK_IMPORTED_MODULE_1__.MainAPICMD.SysThemeChanged, (_, theme) => callback(theme));
    },
    onDownloadUpdate(callback) {
        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.once(_common_ipc_api__WEBPACK_IMPORTED_MODULE_1__.MainAPICMD.DownloadUpdate, (_, ...args) => callback(...args));
    },
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (mainApi);


/***/ }),

/***/ "./src/main/Preload.ts":
/*!*****************************!*\
  !*** ./src/main/Preload.ts ***!
  \*****************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! electron */ "electron");
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _ipc_CVApi_native__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ipc/CVApi.native */ "./src/main/ipc/CVApi.native.ts");
/* harmony import */ var _ipc_CVApi_wasm__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ipc/CVApi.wasm */ "./src/main/ipc/CVApi.wasm.ts");
/* harmony import */ var _ipc_TFApi__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./ipc/TFApi */ "./src/main/ipc/TFApi.ts");
/* harmony import */ var _MainApi__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./MainApi */ "./src/main/MainApi.ts");
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_ipc_CVApi_wasm__WEBPACK_IMPORTED_MODULE_2__]);
var __webpack_async_dependencies_result__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);
_ipc_CVApi_wasm__WEBPACK_IMPORTED_MODULE_2__ = __webpack_async_dependencies_result__[0];





electron__WEBPACK_IMPORTED_MODULE_0__.contextBridge.exposeInMainWorld('mainApi', _MainApi__WEBPACK_IMPORTED_MODULE_4__["default"]);
electron__WEBPACK_IMPORTED_MODULE_0__.contextBridge.exposeInMainWorld('cvWasmApi', _ipc_CVApi_wasm__WEBPACK_IMPORTED_MODULE_2__["default"]);
electron__WEBPACK_IMPORTED_MODULE_0__.contextBridge.exposeInMainWorld('cvNativeApi', _ipc_CVApi_native__WEBPACK_IMPORTED_MODULE_1__["default"]);
electron__WEBPACK_IMPORTED_MODULE_0__.contextBridge.exposeInMainWorld('tfApi', _ipc_TFApi__WEBPACK_IMPORTED_MODULE_3__["default"]);

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ "./src/main/ipc/CVApi.native.ts":
/*!**************************************!*\
  !*** ./src/main/ipc/CVApi.native.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @u4/opencv4nodejs */ "@u4/opencv4nodejs");
/* harmony import */ var _u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);


let gamma = 1.0;
let gammaTable = Uint8Array.from({ length: 256 }, (_, i) => i);
let lut = new _u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0__.Mat(256, 1, (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().CV_8UC1));
let processedImg;
let sharedData;
let bgrFrame = new (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().Mat)();
let classifierEye;
let classifierDef;
let classifierAlt;
// create the facemark object with the landmarks model
let facemark;
let cvNativeApi = {
    async init() {
        try {
            let is_dev = "development" === 'development';
            let baseDataPath = path__WEBPACK_IMPORTED_MODULE_1___default().join(__dirname, '../../../data/');
            classifierEye = new (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().CascadeClassifier)(is_dev ? (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().HAAR_EYE_TREE_EYEGLASSES) : path__WEBPACK_IMPORTED_MODULE_1___default().join(baseDataPath, './haarcascades/haarcascade_eye.xml'));
            classifierDef = new (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().CascadeClassifier)(is_dev ? (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().HAAR_FRONTALFACE_DEFAULT) : path__WEBPACK_IMPORTED_MODULE_1___default().join(baseDataPath, './haarcascades/haarcascade_frontalface_default.xml'));
            classifierAlt = new (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().CascadeClassifier)(is_dev ? (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().HAAR_FRONTALFACE_ALT) : path__WEBPACK_IMPORTED_MODULE_1___default().join(baseDataPath, './haarcascades/haarcascade_frontalface_alt.xml'));
            facemark = new (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().FacemarkLBF)();
            const modelFile = path__WEBPACK_IMPORTED_MODULE_1___default().join(__dirname, '../../../data/lbfmodel.yaml');
            facemark.loadModel(modelFile);
            // give the facemark object it's face detection callback
            // facemark.setFaceDetector((frame: Mat) => {
            //   const { objects } = classifierAlt.detectMultiScale(frame, 1.12)
            //   return objects
            // })
        }
        catch (e) {
            console.error(e);
        }
    },
    destroy() {
        processedImg?.release();
        processedImg = null;
        lut?.release();
        lut = null;
    },
    imgProcess: function (frame, width, height, params) {
        if (processedImg == null) {
            processedImg = new (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().Mat)(height, width, (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().CV_8UC4));
        }
        if (processedImg.cols !== width || processedImg.rows !== height) {
            processedImg.release();
            processedImg = new (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().Mat)(height, width, (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().CV_8UC4));
        }
        if (sharedData == null || sharedData.length !== height * width * 4) {
            sharedData = new Uint8ClampedArray(height * width * 4);
        }
        processedImg.setData(Buffer.from(frame.data.buffer));
        processedImg = processedImg.cvtColor((_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().COLOR_RGBA2BGR));
        if (params.isGray) {
            processedImg = processedImg.cvtColor((_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().COLOR_BGR2GRAY));
        }
        if (params.isGray && params.equalizeHist) {
            processedImg = processedImg.equalizeHist();
        }
        if (params.blur && params.blur[0] === 'gaussian') {
            processedImg = processedImg.gaussianBlur(new (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().Size)(params.blur[1], params.blur[2]), 0);
        }
        if (params.blur && params.blur[0] === 'median') {
            processedImg = processedImg.medianBlur(params.blur[3]);
        }
        if (params.blur && params.blur[0] === 'bilateral') {
            processedImg = processedImg.bilateralFilter(params.blur[4], params.blur[5], params.blur[6]);
        }
        if (params.blur && params.blur[0] == 'avg') {
            processedImg = processedImg.blur(new (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().Size)(params.blur[1], params.blur[2]));
        }
        if (params.blur && params.blur[0] === 'adaptive') {
            // processedImg = processedImg.adaptiveThreshold(params.blur[3], params.blur[4], params.blur[5], params.blur[6], params.blur[7])
        }
        if (params.filter && params.filter[0] === 'sobel') {
            processedImg = processedImg.sobel(processedImg.depth, params.filter[1], params.filter[2], params.filter[3]);
        }
        if (params.filter && params.filter[0] == 'scharr') {
            processedImg = processedImg.scharr(processedImg.depth, params.filter[1], params.filter[2], params.filter[3]);
        }
        if (params.filter && params.filter[0] === 'laplacian') {
            processedImg = processedImg.laplacian(processedImg.depth, params.filter[3]);
        }
        try {
            if (params.cannyThreshold) {
                processedImg = processedImg.canny(params.cannyThreshold[0], params.cannyThreshold[1]);
            }
        }
        catch (e) {
            console.error(e);
        }
        if (params.isGray) {
            processedImg = processedImg.cvtColor((_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().COLOR_GRAY2RGBA));
        }
        else {
            processedImg = processedImg.cvtColor((_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().COLOR_BGR2RGBA));
        }
        sharedData.set(processedImg.getData());
        return sharedData;
    },
    faceRecognize: function (frame, width, height) {
        try {
            if (processedImg == null) {
                processedImg = new (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().Mat)(height, width, (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().CV_8UC4));
            }
            else {
                if (processedImg.cols !== width || processedImg.rows !== height) {
                    processedImg.release();
                    processedImg = new (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().Mat)(height, width, (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().CV_8UC4));
                }
            }
            if (sharedData == null || sharedData.length !== height * width * (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().CV_8UC4)) {
                sharedData = new Uint8ClampedArray(height * width * (_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().CV_8UC4));
            }
            processedImg.setData(Buffer.from(frame.data.buffer));
            const bgrFrame = processedImg.cvtColor((_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().COLOR_RGBA2BGR));
            let grayImage = bgrFrame.cvtColor((_u4_opencv4nodejs__WEBPACK_IMPORTED_MODULE_0___default().COLOR_BGR2GRAY));
            let faceResult = classifierAlt.detectMultiScale(grayImage, 1.1);
            const sortByNumDetections = (result) => result.numDetections
                .map((num, idx) => ({ num, idx }))
                .sort(((n0, n1) => n1.num - n0.num))
                .map(({ idx }) => idx);
            // get best result
            const faceRect = faceResult.objects[sortByNumDetections(faceResult)[0]];
            if (faceRect == null)
                return null;
            // detect eyes
            const faceRegion = grayImage.getRegion(faceRect);
            const eyeResult = classifierEye.detectMultiScale(faceRegion);
            const eyeRects = sortByNumDetections(eyeResult)
                .slice(0, 2)
                .map(idx => eyeResult.objects[idx]);
            const faceLandmarks = facemark.fit(grayImage, [faceRect]);
            // grayImage = grayImage.cvtColor(cv.COLOR_GRAY2RGBA)
            // const data = Uint8ClampedArray.from(grayImage.getData())
            // let cols = grayImage.cols, rows = grayImage.rows
            grayImage.release();
            return { face: faceRect, eyes: eyeRects, landmarks: faceLandmarks[0] };
        }
        catch (e) {
            console.error(e);
            return null;
        }
        // removed by dead control flow

    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (cvNativeApi);


/***/ }),

/***/ "./src/main/ipc/CVApi.wasm.ts":
/*!************************************!*\
  !*** ./src/main/ipc/CVApi.wasm.ts ***!
  \************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _opencvjs_node__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @opencvjs/node */ "@opencvjs/node");
/* harmony import */ var _opencvjs_node__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_opencvjs_node__WEBPACK_IMPORTED_MODULE_1__);


const cv = await (0,_opencvjs_node__WEBPACK_IMPORTED_MODULE_1__.loadOpenCV)();
let gamma = 1.0;
let gammaTable = Uint8Array.from({ length: 256 }, (_, i) => i);
let lut = cv.matFromArray(256, 1, cv.CV_8UC1, gammaTable);
let originFrame;
let sharedData = new Uint8ClampedArray(0);
let bgrFrame = new cv.Mat();
let processedImg = new cv.Mat();
// let classifierEye: CascadeClassifier
// let classifierDef: CascadeClassifier
// let classifierAlt: CascadeClassifier
// create the facemark object with the landmarks model
// let facemark: FacemarkLBF
let cvWasmApi = {
    async init() {
        try {
            let is_dev = "development" === 'development';
            let baseDataPath = path__WEBPACK_IMPORTED_MODULE_0___default().join(__dirname, '../../../data/');
            // classifierEye = new cv.CascadeClassifier(is_dev ? cv.HAAR_EYE_TREE_EYEGLASSES : path.join(baseDataPath, './haarcascades/haarcascade_eye.xml'))
            // classifierDef = new cv.CascadeClassifier(is_dev ? cv.HAAR_FRONTALFACE_DEFAULT : path.join(baseDataPath, './haarcascades/haarcascade_frontalface_default.xml'))
            // classifierAlt = new cv.CascadeClassifier(is_dev ? cv.HAAR_FRONTALFACE_ALT : path.join(baseDataPath, './haarcascades/haarcascade_frontalface_alt.xml'))
            // facemark = new cv.FacemarkLBF()
            const modelFile = path__WEBPACK_IMPORTED_MODULE_0___default().join(__dirname, `${is_dev ? '../../' : '../../../'}data/lbfmodel.yaml`);
            // facemark.loadModel(modelFile)
            // give the facemark object it's face detection callback
            // facemark.setFaceDetector((frame: Mat) => {
            //   const { objects } = classifierAlt.detectMultiScale(frame, 1.12)
            //   return objects
            // })
        }
        catch (e) {
            console.error(e);
        }
    },
    destroy() {
        originFrame?.delete();
        lut?.delete();
    },
    imgProcess: function (frame, width, height, params) {
        if (sharedData.length !== width * height * 4) {
            sharedData = null;
            sharedData = new Uint8ClampedArray(width * height * 4);
        }
        if (processedImg == null) {
            processedImg = new cv.Mat(height, width, cv.CV_8UC4);
        }
        if (processedImg.rows !== height || processedImg.cols !== width) {
            processedImg.delete();
            processedImg = new cv.Mat(height, width, cv.CV_8UC4);
        }
        processedImg.data.set(frame.data);
        cv.cvtColor(processedImg, processedImg, cv.COLOR_RGBA2BGR);
        if (params.isGray) {
            cv.cvtColor(processedImg, processedImg, cv.COLOR_BGR2GRAY);
        }
        if (params.isGray && params.equalizeHist) {
            cv.equalizeHist(processedImg, processedImg);
        }
        // if (params.blur) {
        //   if (gamma !== params.gamma) {
        //     gamma = params.gamma
        //     for (let i = 0; i < 256; ++i) {
        //       gammaTable[i] = Math.pow(i / 255.0, 1 / gamma) * 255.0
        //       lut.data[i] = gammaTable[i]
        //     }
        //     // lut = cv.matFromArray(256, 1, cv.CV_8UC1, gammaTable)
        //   }
        //   cv.LUT(processedImg, lut, processedImg)
        //   cv.normalize(processedImg, processedImg, 0, 255, cv.NORM_MINMAX)
        //   // cv.convertScaleAbs(processedImg, processedImg, 1, 0)
        // }
        if (params.blur && params.blur[0] == 'gaussian') {
            cv.GaussianBlur(processedImg, processedImg, new cv.Size(params.blur[1], params.blur[2]), 0);
        }
        if (params.blur && params.blur[0] == 'median') {
            cv.medianBlur(processedImg, processedImg, params.blur[1]);
        }
        if (params.blur && params.blur[0] == 'bilateral') {
            cv.bilateralFilter(processedImg, processedImg, params.blur[1], params.blur[2], params.blur[3]);
        }
        if (params.blur && params.blur[0] == 'avg') {
            cv.blur(processedImg, processedImg, new cv.Size(params.blur[1], params.blur[2]), new cv.Point(-1, -1), cv.BORDER_DEFAULT);
        }
        // let hsv = originFrame.cvtColor(cv.COLOR_BGR2HSV)
        if (params.filter && params.filter[0] === 'sobel') {
            cv.Sobel(processedImg, processedImg, cv.CV_8U, 1, 1, params.filter[1], params.filter[2], params.filter[3]);
        }
        if (params.filter && params.filter[0] === 'scharr') {
            cv.Scharr(processedImg, processedImg, cv.CV_8U, 1, 1, params.filter[1], params.filter[2], params.filter[3]);
        }
        if (params.filter && params.filter[0] === 'laplacian') {
            cv.Laplacian(processedImg, processedImg, cv.CV_8U, params.filter[2], 0);
        }
        if (params.cannyThreshold) {
            cv.Canny(processedImg, processedImg, params.cannyThreshold[0], params.cannyThreshold[1]);
        }
        if (params.isGray) {
            cv.cvtColor(processedImg, processedImg, cv.COLOR_GRAY2RGBA);
        }
        else {
            cv.cvtColor(processedImg, processedImg, cv.COLOR_BGR2RGBA);
        }
        sharedData.set(processedImg.data);
        return sharedData;
    },
    faceRecognize: function (frame, width, height) {
        // try {
        //   if (originFrame == null) {
        //     originFrame = new cv.Mat(height, width, cv.CV_8UC4)
        //   } else {
        //     if (originFrame.cols !== width || originFrame.rows !== height) {
        //       originFrame.release()
        //       originFrame = new cv.Mat(height, width, cv.CV_8UC4)
        //     }
        //   }
        //   if (sharedData == null || sharedData.length !== height * width * cv.CV_8UC4) {
        //     sharedData = new Uint8ClampedArray(height * width * cv.CV_8UC4)
        //   }
        //   originFrame.setData(Buffer.from(frame.data.buffer))
        //   const bgrFrame = originFrame.cvtColor(cv.COLOR_RGBA2BGR)
        //   let grayImage = bgrFrame.cvtColor(cv.COLOR_BGR2GRAY)
        //   let faceResult = classifierAlt.detectMultiScale(grayImage, 1.1)
        //   const sortByNumDetections = (result: { objects: Rect[], numDetections: number[] }) => result.numDetections
        //     .map((num, idx) => ({ num, idx }))
        //     .sort(((n0, n1) => n1.num - n0.num))
        //     .map(({ idx }) => idx)
        //   // get best result
        //   const faceRect = faceResult.objects[sortByNumDetections(faceResult)[0]]
        //   if (faceRect == null) return null
        //   // detect eyes
        //   const faceRegion = grayImage.getRegion(faceRect)
        //   const eyeResult = classifierEye.detectMultiScale(faceRegion)
        //   const eyeRects = sortByNumDetections(eyeResult)
        //     .slice(0, 2)
        //     .map(idx => eyeResult.objects[idx])
        //   const faceLandmarks = facemark.fit(grayImage, [faceRect])
        //   // grayImage = grayImage.cvtColor(cv.COLOR_GRAY2RGBA)
        //   // const data = Uint8ClampedArray.from(grayImage.getData())
        //   // let cols = grayImage.cols, rows = grayImage.rows
        //   grayImage.release()
        //   bgrFrame.release()
        // return { face: faceRect, eyes: eyeRects, landmarks: faceLandmarks[0] }
        // } catch (e) {
        //   console.error(e)
        //   return null
        // }
        return null;
    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (cvWasmApi);

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ "./src/main/ipc/TFApi.ts":
/*!*******************************!*\
  !*** ./src/main/ipc/TFApi.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// let sharedData: Uint8ClampedArray
// let faceDetector: FaceLandmarksDetector
let tfApi = {
    async init(backend) {
        // console.log(`init tf: \t faceMesh[${VERSION}]`)
        // const faceMesh = new FaceMesh({
        //   locateFile: (file) => {
        //     return path.join(__dirname, `../../node_modules/@mediapipe/face_mesh/${file}`)
        //   }
        // })
        // await faceMesh.initialize()
        // console.log(window)
        // const vision = await FilesetResolver.forVisionTasks(
        //  path.join(__dirname,  '../../node_modules/@mediapipe/tasks-vision/wasm')
        // )
        // const landmarker = await FaceLandmarker.createFromOptions(vision, {
        //   baseOptions: {
        //     modelAssetPath: path.join(__dirname, '../../data/face_landmarker.task'), // 官方模型 6.5 MB
        //     delegate: 'CPU'
        //   },
        //   runningMode: 'IMAGE',
        //   numFaces: 1
        // })
        // const runtime = backend.split('-')[0]
        // if (runtime === 'mediapipe') {
        //   faceDetector = await createDetector(SupportedModels.MediaPipeFaceMesh, {
        //     runtime,
        //     refineLandmarks: true,
        //     maxFaces: 1,
        //     solutionPath: path.join(__dirname, `../../node_modules/@mediapipe/face_mesh`)
        //   });
        // } else if (runtime === 'tfjs') {
        //   faceDetector = await createDetector(SupportedModels.MediaPipeFaceMesh, {
        //     runtime, refineLandmarks: true, maxFaces: 1,
        //   })
        // }
    },
    destroy() {
        // faceDetector?.dispose()
        // faceDetector = null
    },
    async detect(frame) {
        // try {
        //   return await faceDetector.estimateFaces(frame, { flipHorizontal: true })
        // } catch (e) {
        //   console.error(e)
        //   faceDetector.dispose()
        //   faceDetector = null
        // }
        return null;
    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (tfApi);


/***/ }),

/***/ "@opencvjs/node":
/*!*********************************!*\
  !*** external "@opencvjs/node" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@opencvjs/node");

/***/ }),

/***/ "@u4/opencv4nodejs":
/*!************************************!*\
  !*** external "@u4/opencv4nodejs" ***!
  \************************************/
/***/ ((module) => {

module.exports = require("@u4/opencv4nodejs");

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("electron");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/async module */
/******/ 	(() => {
/******/ 		var hasSymbol = typeof Symbol === "function";
/******/ 		var webpackQueues = hasSymbol ? Symbol("webpack queues") : "__webpack_queues__";
/******/ 		var webpackExports = hasSymbol ? Symbol("webpack exports") : "__webpack_exports__";
/******/ 		var webpackError = hasSymbol ? Symbol("webpack error") : "__webpack_error__";
/******/ 		
/******/ 		var resolveQueue = (queue) => {
/******/ 			if(queue && queue.d < 1) {
/******/ 				queue.d = 1;
/******/ 				queue.forEach((fn) => (fn.r--));
/******/ 				queue.forEach((fn) => (fn.r-- ? fn.r++ : fn()));
/******/ 			}
/******/ 		}
/******/ 		var wrapDeps = (deps) => (deps.map((dep) => {
/******/ 			if(dep !== null && typeof dep === "object") {
/******/ 		
/******/ 				if(dep[webpackQueues]) return dep;
/******/ 				if(dep.then) {
/******/ 					var queue = [];
/******/ 					queue.d = 0;
/******/ 					dep.then((r) => {
/******/ 						obj[webpackExports] = r;
/******/ 						resolveQueue(queue);
/******/ 					}, (e) => {
/******/ 						obj[webpackError] = e;
/******/ 						resolveQueue(queue);
/******/ 					});
/******/ 					var obj = {};
/******/ 		
/******/ 					obj[webpackQueues] = (fn) => (fn(queue));
/******/ 					return obj;
/******/ 				}
/******/ 			}
/******/ 			var ret = {};
/******/ 			ret[webpackQueues] = x => {};
/******/ 			ret[webpackExports] = dep;
/******/ 			return ret;
/******/ 		}));
/******/ 		__webpack_require__.a = (module, body, hasAwait) => {
/******/ 			var queue;
/******/ 			hasAwait && ((queue = []).d = -1);
/******/ 			var depQueues = new Set();
/******/ 			var exports = module.exports;
/******/ 			var currentDeps;
/******/ 			var outerResolve;
/******/ 			var reject;
/******/ 			var promise = new Promise((resolve, rej) => {
/******/ 				reject = rej;
/******/ 				outerResolve = resolve;
/******/ 			});
/******/ 			promise[webpackExports] = exports;
/******/ 			promise[webpackQueues] = (fn) => (queue && fn(queue), depQueues.forEach(fn), promise["catch"](x => {}));
/******/ 			module.exports = promise;
/******/ 			var handle = (deps) => {
/******/ 				currentDeps = wrapDeps(deps);
/******/ 				var fn;
/******/ 				var getResult = () => (currentDeps.map((d) => {
/******/ 		
/******/ 					if(d[webpackError]) throw d[webpackError];
/******/ 					return d[webpackExports];
/******/ 				}))
/******/ 				var promise = new Promise((resolve) => {
/******/ 					fn = () => (resolve(getResult));
/******/ 					fn.r = 0;
/******/ 					var fnQueue = (q) => (q !== queue && !depQueues.has(q) && (depQueues.add(q), q && !q.d && (fn.r++, q.push(fn))));
/******/ 					currentDeps.map((dep) => (dep[webpackQueues](fnQueue)));
/******/ 				});
/******/ 				return fn.r ? promise : getResult();
/******/ 			}
/******/ 			var done = (err) => ((err ? reject(promise[webpackError] = err) : outerResolve(exports)), resolveQueue(queue))
/******/ 			body(handle, done);
/******/ 			queue && queue.d < 0 && (queue.d = 0);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module used 'module' so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main/Preload.ts");
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;