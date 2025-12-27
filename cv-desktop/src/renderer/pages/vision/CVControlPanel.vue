<template>
  <van-col>
    <van-cell-group inset>
      <van-cell :title="$t('cvControl.IntergrateMode')">
        <template #right-icon>
          <van-radio-group v-model="visionStore.intergrateMode" direction="horizontal">
            <van-radio name="1" size="1rem">
              <van-icon class-prefix="iconfont" name="wasm"
                style="font-size: 1.2rem; color: #8e44ad; margin-top: 4px;" />
            </van-radio>
            <van-radio name="2" size="1rem" :disabled="isWeb">
              <van-icon class-prefix="iconfont" name="nodejs"
                style="font-size: 1.2rem; color: #27ae60; margin-top: 4px;" />
            </van-radio>
            <van-radio name="3" size="1rem" :disabled="isWeb">
              <van-icon class-prefix="iconfont" name="native"
                style="font-size: 1.2rem; color: #3498db; margin-top: 4px;" />
            </van-radio>
          </van-radio-group>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- ML framework mode -->
    <van-cell-group style="margin-top: 10px;" inset>
      <van-cell :title="$t('cvControl.ModelEngine')">
        <template #right-icon>
          <van-radio-group v-model="visionStore.intergrateMode" direction="horizontal">
            <van-radio name="1" size="1rem">
              <van-icon class-prefix="iconfont" name="onnx"
                style="font-size: 1.2rem; color: #8e44ad; margin-top: 4px;" />
            </van-radio>
            <van-radio name="2" size="1rem" :disabled="isWeb">
              <van-icon class-prefix="iconfont" name="tensorflow"
                style="font-size: 1.2rem; color: #e67e22; margin-top: 4px;" />
            </van-radio>
          </van-radio-group>
        </template>
      </van-cell>
      <van-uploader accept=".onnx" :preview-image="false" :after-read="onModelUpload">
        <van-cell center :title="$t('cvControl.ModelImport')" :value="modelName" clickable style="width: 100%;">
          <template #icon>
            <van-icon class-prefix="iconfont" name="file-upload" style="font-size: 1rem;" />
          </template>
        </van-cell>
      </van-uploader>

    </van-cell-group>

    <!-- image segment -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.enableSegment" style="margin-left: 10px;">
          <van-icon class-prefix="iconfont" name="segment" style="color: #2980b9; " />
          {{ $t('cvControl.ImageSegment') }}
        </van-checkbox>
      </template>

      <van-radio-group direction="vertical" :disabled="!visionStore.enableSegment" style="padding: 10px 15px 0 15px;"
        v-model="visionStore.segmentModel" @change="onParamChange">
        <van-radio :name="model" icon-size="1rem" style="font-size: 0.8rem; margin-bottom: 10px;"
          v-for="model in SegmentModels">
          {{ $t(`cvControl.${model}`) }}
        </van-radio>
      </van-radio-group>
    </van-cell-group>

    <!-- object detect -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.enableDetect" style="margin-left: 10px;">
          <van-icon class-prefix="iconfont" name="object-detect" style="color: #2980b9;" />
          {{ $t('cvControl.ObjectDetect') }}
        </van-checkbox>
      </template>
      <van-radio-group direction="vertical" :disabled="!visionStore.enableDetect" style="padding: 10px 15px 0 15px;"
        v-model="visionStore.detectModel" @change="onParamChange">
        <van-radio :name="model" icon-size="1rem" style="font-size: 0.8rem; margin-bottom: 10px;"
          v-for="model in DetectModels">
          {{ $t(`cvControl.DetectModel.${model}`) }}
        </van-radio>
      </van-radio-group>

      <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableDetect"
        style="margin-left: 15px;">
        Opencv
      </van-checkbox>
      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableDetect"
        style="padding: 10px 15px;" v-model="visionStore.imgParams.detector[0]" @change="onParamChange">
        <van-radio name="color" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('cvControl.ColorTrack') }}
        </van-radio>
        <van-radio name="contour" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('cvControl.ContourTrack') }}
        </van-radio>
        <van-radio name="bgSub" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('cvControl.BackgroundSub') }}
        </van-radio>
      </van-radio-group>
      <van-field label="threshold" label-align="right" type="number" input-align="right" label-width="5rem"
        v-if="visionStore.imgParams.enableDetect">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="100" step="1"
            v-model="visionStore.imgParams.detector[1]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.detector[1] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="minArea" label-align="right" type="number" input-align="right" label-width="5rem"
        v-if="visionStore.imgParams.enableDetect">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="5"
            v-model="visionStore.imgParams.detector[2]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.detector[2] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <!-- face recognize -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.faceDetect" style="margin-left: 10px;">
          <van-icon class-prefix="iconfont" name="face-rec"
            style="font-size: 1rem; color: #e67e22; margin-right: 5px;" />
          <span>{{ $t('cvControl.FaceRec') }}</span>
        </van-checkbox>
      </template>
      <van-row style="padding: 10px 15px;">
        <van-checkbox icon-size="1rem" v-model="visionStore.drawEigen" :disabled="!visionStore.faceDetect">
          <template #default>
            <van-icon class-prefix="iconfont" name="mesh" style="font-size: 1.2rem;" />
          </template>
        </van-checkbox>

        <van-checkbox icon-size="1rem" v-model="visionStore.drawFaceMesh" style="margin-left: 15px;"
          :disabled="!visionStore.faceDetect">
          <template #default>
            <van-icon class-prefix="iconfont" name="eigen" style="font-size: 1.2rem;" />
          </template>
        </van-checkbox>
      </van-row>
    </van-cell-group>

    <!-- opencv image process -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgEnhance" style="margin-left: 10px;">
          <van-icon class-prefix="iconfont" name="opencv" style="font-size: 1rem; color: #27ae60;" />
          {{ $t('cvControl.ImgEnhance') }}
        </van-checkbox>
      </template>
      <van-field :label="$t('cvControl.Gray')" label-align="right" type="number" input-align="right" label-width="4rem">
        <template #input>
          <van-switch v-model="visionStore.imgParams.isGray" size="1.3rem"></van-switch>
        </template>
      </van-field>
      <van-field :label="$t('cvControl.Rotate')" label-align="right" type="number" input-align="right"
        label-width="4rem">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="-180" max="180" step="15"
            v-model="visionStore.imgParams.rotate" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.rotate }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-popover v-model:show="showColorMaps" position="bottom" :overlay="true" style="width: 320px;">
        <template #reference>
          <van-cell center clickable style="min-width: 320px;" :title="$t('cvControl.ColorMap')"
            :value="ColorMaps[visionStore.imgParams.colorMap]"></van-cell>
        </template>
        <van-list style="height: 200px; overflow: hidden scroll;">
          <van-cell center clickable :title="val" v-for="(val, idx) in ColorMaps" :key="idx"
            @click="onColorMapChanged(idx)">
            <template #value>
              <van-image height="1rem" radius="5" :src="`/static/${val.toLowerCase()}.jpg`" v-if="idx != 0" />
            </template>
          </van-cell>
        </van-list>
      </van-popover>
      <!-- <van-collapse v-model="activeCollapse">
        <van-collapse-item :title="$t('cvControl.ColorMap')" name="1" :value="ColorMaps[visionStore.imgParams.colorMap]"
          style="padding-left: 5px;">
          <van-radio-group v-model="visionStore.imgParams.colorMap">
            <van-radio :name="idx" icon-size="1rem" style="font-size: 0.8rem; padding:0 15px 5px 15px;"
              v-for="(val, idx) in ColorMaps" :key="idx" @click="onParamChange">
              <van-row justify="space-between">
                <van-col span="6">{{ val }}</van-col>
                <van-col span="8">
                  <van-image height="1rem" radius="5" :src="`/static/${val.toLowerCase()}.jpg`" v-if="idx != 0" />
                </van-col>
              </van-row>
            </van-radio>
          </van-radio-group>
        </van-collapse-item>
      </van-collapse> -->

    </van-cell-group>

    <!-- brightness -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableGamma"
          style="margin-left: 10px;">
          {{ $t('cvControl.Brightness') }}
        </van-checkbox>
      </template>
      <van-field label="gamma" label-align="right" type="number" input-align="right" label-width="4rem">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="-1" max="2" step="0.1"
            v-model="visionStore.imgParams.gamma" :disabled="!visionStore.imgParams.enableGamma"
            @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.gamma }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <!-- contrast -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableContrast"
          style="margin-left: 10px;" :disabled="!visionStore.imgParams.isGray">
          {{ $t('cvControl.Contrast') }}
        </van-checkbox>
      </template>
      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableContrast"
        style="padding: 10px 15px;" v-model="visionStore.imgParams.equalization[0]" @change="onParamChange">
        <van-radio name="equalizeHist" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('cvControl.EqualizeHist') }}
        </van-radio>
        <van-radio name="clahe" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('cvControl.CLAHE') }}
        </van-radio>
      </van-radio-group>
      <van-field label="clip" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.equalization[0] == 'clahe' && visionStore.imgParams.enableContrast">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1"
            v-model="visionStore.imgParams.equalization[1]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.equalization[1] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="sizeX" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.equalization[0] == 'clahe' && visionStore.imgParams.enableContrast">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1"
            v-model="visionStore.imgParams.equalization[2]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.equalization[2] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="sizeY" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.equalization[0] == 'clahe' && visionStore.imgParams.enableContrast">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1"
            v-model="visionStore.imgParams.equalization[3]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.equalization[3] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <!-- blur -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableBlur"
          style="margin-left: 10px;">
          {{ $t('cvControl.Blur') }}
        </van-checkbox>
      </template>

      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableBlur" style="padding: 10px 15px;"
        v-model="visionStore.imgParams.blur[0]" @change="onParamChange">
        <van-radio name="gaussian" icon-size="1rem">
          <van-icon class-prefix="iconfont" name="gaussian-filter" style="font-size: 1.4rem; margin-top: 2px;" />
        </van-radio>
        <van-radio name="avg" icon-size="1rem">
          <van-icon class-prefix="iconfont" name="avg-filter" style="font-size: 1.4rem; margin-top: 2px;" />
        </van-radio>
        <van-radio name="median" icon-size="1rem">
          <van-icon class-prefix="iconfont" name="median-filter" style="font-size: 1.4rem; margin-top: 2px;" />
        </van-radio>
        <van-radio name="bilateral" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('cvControl.BilateralBlur') }}
        </van-radio>
      </van-radio-group>
      <van-field label="sizeX" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="(visionStore.imgParams.blur[0] == 'gaussian' || visionStore.imgParams.blur[0] == 'avg') && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1"
            v-model="visionStore.imgParams.blur[1]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.blur[1] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="sizeY" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="(visionStore.imgParams.blur[0] == 'gaussian' || visionStore.imgParams.blur[0] == 'avg') && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1"
            v-model="visionStore.imgParams.blur[2]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.blur[2] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="aperture" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.blur[0] == 'median' && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1"
            v-model="visionStore.imgParams.blur[3]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.blur[3] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="diameter" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.blur[0] == 'bilateral' && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="5" step="1"
            v-model="visionStore.imgParams.blur[4]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.blur[4] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="color" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.blur[0] == 'bilateral' && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="10" max="255" step="1"
            v-model="visionStore.imgParams.blur[5]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.blur[5] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="space" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.blur[0] == 'bilateral' && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="10" max="255" step="1"
            v-model="visionStore.imgParams.blur[6]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.blur[6] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <!-- sharpness -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableSharpen"
          style="margin-left: 10px;">
          {{ $t('cvControl.Sharpness') }}
        </van-checkbox>
      </template>
      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableSharpen"
        style="padding: 10px 15px;" v-model="visionStore.imgParams.sharpen[0]" @change="onParamChange">
        <van-radio name="laplace" icon-size="1rem" style="font-size: 0.8rem;">
          laplacian
        </van-radio>
        <van-radio name="usm" icon-size="1rem" style="font-size: 0.8rem;">
          usm
        </van-radio>
      </van-radio-group>
      <van-field label="origin" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.sharpen[0] !== 'laplace' && visionStore.imgParams.enableSharpen">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="2" step="0.1"
            v-model="visionStore.imgParams.sharpen[1]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.sharpen[1] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="addon" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.sharpen[0] !== 'laplace' && visionStore.imgParams.enableSharpen">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="-2" max="2" step="0.1"
            v-model="visionStore.imgParams.sharpen[2]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.sharpen[2] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <!-- filter -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableFilter"
          style="margin-left: 10px;" :disabled="!visionStore.imgParams.isGray">
          {{ $t('cvControl.Filter') }}
        </van-checkbox>
      </template>
      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableFilter"
        style="padding: 10px 15px;" v-model="visionStore.imgParams.filter[0]" @change="onParamChange">
        <van-radio name="sobel" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('cvControl.Sobel') }}
        </van-radio>
        <van-radio name="scharr" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('cvControl.Scharr') }}
        </van-radio>
        <van-radio name="laplace" icon-size="1rem" style="font-size: 0.8rem;">
          {{ $t('cvControl.Laplace') }}
        </van-radio>
      </van-radio-group>
      <van-field label="dX" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.filter[0] !== 'laplace' && visionStore.imgParams.enableFilter">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="0" max="3" step="0.1"
            v-model="visionStore.imgParams.filter[1]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.filter[1] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="dY" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.filter[0] !== 'laplace' && visionStore.imgParams.enableFilter">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="0" max="3" step="0.1"
            v-model="visionStore.imgParams.filter[2]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.filter[2] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="size" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.filter[0] !== 'scharr' && visionStore.imgParams.enableFilter">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="30" step="1"
            v-model="visionStore.imgParams.filter[4]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.filter[4] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="scale" label-align="right" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.enableFilter">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1"
            v-model="visionStore.imgParams.filter[3]" @change="onParamChange">
            <template #button>
              <van-button plain size="small"> {{ visionStore.imgParams.filter[3] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <van-cell-group inset :title="$t('cvControl.FeatExtract')">
      <van-cell center :title="$t('cvControl.Canny')" :label="'[ ' + visionStore.imgParams.canny.toString() + ' ]'">
        <template #title>
          <van-checkbox icon-size="1rem" shape="square" v-model="visionStore.imgParams.enableCanny">
            <span>canny</span>
            <span class="param-desc">{{ $t('cvControl.CannyDesc') }}</span>
          </van-checkbox>
        </template>
        <template #right-icon>
          <van-slider range :max="160" :min="60" bar-height="4px" button-size="1.2rem" style="width: 60%;"
            :disabled="!visionStore.imgParams.enableCanny" v-model="visionStore.imgParams.canny"
            @change="onParamChange">
          </van-slider>
        </template>
      </van-cell>
      <van-cell :title="$t('cvControl.HoughLine')" center>
        <template #right-icon>
          <van-slider bar-height="4px" button-size="1.2rem" style="width: 60%;">
          </van-slider>
        </template>
      </van-cell>
      <van-cell :title="$t('cvControl.HoughCircle')" center>
        <template #right-icon>
          <van-slider bar-height="4px" button-size="1.2rem" style="width: 60%;">
          </van-slider>
        </template>
      </van-cell>
    </van-cell-group>
  </van-col>
</template>
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { onnx } from '../../common/ONNX'
import { VisionStore } from '../../store'

const SegmentModels = ['Deeplab', 'UNet', 'SAM']
const DetectModels = ['yolov8n', 'yolov10n', 'yolo11n']
const showColorMaps = ref(false)
const activeCollapse = ref(['0'])
const ColorMaps = ['NONE', 'AUTUMN', 'BONE', 'JET', 'WINTER', 'RAINBOW', 'OCEAN', 'SUMMER',
  'SPRING', 'COOL', 'HSV', 'PINK', 'HOT', 'PARULA', 'MAGMA',
  'INFERNO', 'PLASMA', 'VIRIDIS', 'CIVIDIS', 'TWILIGHT', 'TWILIGHT_SHIFTED', 'TURBO', 'DEEPGREEN']

const visionStore = VisionStore()
const isWeb = window.isWeb

// const canny = ref<[number, number]>([60, 160])
// const rotate = ref(0)
// const gamma = ref(1)
// const equalization = ref<cvEqualizeHist>(['', 0, 0, 0])
// const blur = ref<cvBlur>(['', 0, 0, 0, 0, 0, 0])
// const sharpen = ref<cvSharpen>(['', 0, 0, 0])
// const detector = ref<cvDetector>(['', 0, 0])
// const filter = ref<cvFilter>(['', 0, 0, 0, 0])

const modelName = ref<string>()


onMounted(() => {
  // rotate.value = visionStore.imgParams.rotate
  // equalization.value = visionStore.imgParams.equalization
  // blur.value = visionStore.imgParams.blur
  // sharpen.value = visionStore.imgParams.sharpen
  // filter.value = visionStore.imgParams.filter
  // detector.value = visionStore.imgParams.detector
  // canny.value = visionStore.imgParams.canny
})

function onParamChange() {
  // visionStore.imgParams.rotate = rotate.value
  // visionStore.imgParams.gamma = gamma.value

  // visionStore.imgParams.equalization = equalization.value as cvEqualizeHist
  // visionStore.imgParams.sharpen = sharpen.value as cvSharpen
  // visionStore.imgParams.blur = blur.value as cvBlur
  // visionStore.imgParams.filter = filter.value as cvFilter
  // visionStore.imgParams.detector = detector.value as cvDetector
  // visionStore.imgParams.canny = canny.value as any
}
function onColorMapChanged(idx: number) {
  visionStore.imgParams.colorMap = idx
  showColorMaps.value = false
}

async function onModelUpload(data: any) {
  var reader = new FileReader()
  reader.readAsArrayBuffer(data.file)
  reader.onload = async function () {
    let arrayBuffer = reader.result as ArrayBuffer
    let model = await onnx.createModelCpu(arrayBuffer)
    console.log(model)
  }
}

</script>
<style>
.van-radio__label {
  width: 100%;
}
</style>