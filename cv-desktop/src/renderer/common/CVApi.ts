

export type cvMorph = [
  number, // MorphType erode, dilate, open, close
  number, // iterations
  number, // sizeX,
  number, // sizeY
]

export type cvEqualizeHist = [
  string, // type equalizeHist
  number, // clipLimit
  number, // tileGridSizeX
  number, // tileGridSizeY
]

export type cvSharpen = [
  string, // type laplacian, usm
  number, // dx
  number, // dy
  number, // scale
]

export enum cvBlurType {
  gaussian = 0,
  median,
  avg,
  bilateral
}

export type cvBlur = [
  number, // cvBlurType
  number, // sizeX
  number, // sizeY
  number, // aperture
  number, // diameter
  number, // sigmaColor
  number  // sigmaSpace
]

export enum cvFilterType {
  sobel = 0,
  laplace,
  scharr
}

export type cvFilter = [
  cvFilterType, // type sobel, laplacian, scharr
  number, // dx
  number, // dy
  number, // scale
  number, // size
]

export type cvDetector = [
  string, // type meanShift, camShift
  number, // threshold
  number, // minSize
]

export enum IntergrateMode {
  WebAssembly,
  Backend,
  Native
}
