<template>
  <van-col>
    <van-cell-group inset>
      <van-cell :title="$t('cvControl.IntergrateMode')">
        <template #right-icon>
          <van-radio-group v-model="visionStore.intergrateMode" direction="horizontal">
            <van-radio :name="idx" v-for="(mode, idx) in IntergrateModes">
              <van-icon class-prefix="iconfont" :name="mode.name" :style="{ color: mode.color }" />
            </van-radio>
          </van-radio-group>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- ML framework mode -->
    <van-cell-group style="margin-top: 10px;" inset>
      <van-cell :title="$t('cvControl.ModelEngine')">
        <template #right-icon>
          <van-radio-group v-model="visionStore.modelEngine" direction="horizontal">
            <van-radio :name="engine.name" v-for="engine in ModelEngines">
              <van-icon class-prefix="iconfont" :name="engine.name" :style="{ color: engine.color }" />
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

    <!-- object detect & segment & face recognize-->
    <van-cell-group inset title="detect & segment & rec">
      <van-cell :disabled="!visionStore.enableDetect">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.enableDetect">
            <van-icon class-prefix="iconfont" name="object-detect" style="color: #2980b9;" />
            {{ $t('cvControl.Detect') }}
          </van-checkbox>
        </template>
        <template #value>
          <van-popover v-model:show="showDetectModels" placement="bottom-end" overlay>
            <template #reference>
              {{ visionStore.detectModel }}
            </template>
            <van-list style="width: 260px; height: 160px; overflow: hidden scroll;">
              <van-cell clickable :title="$t(`cvControl.DetectModel.${model}`)" @click="onDetectModelChanged(model)"
                v-for="model in DetectModels"></van-cell>
            </van-list>
          </van-popover>
        </template>
      </van-cell>

      <van-cell :disabled="!visionStore.enableSegment">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.enableSegment">
            <van-icon class-prefix="iconfont" name="segment" style="color: #2980b9;" />
            {{ $t('cvControl.Segment') }}
          </van-checkbox>
        </template>
        <template #value>
          <van-popover v-model:show="showSegmentModels" placement="bottom-end" overlay>
            <template #reference>
              {{ visionStore.segmentModel }}
            </template>
            <van-list style="width: 260px; height: 160px; overflow: hidden scroll;">
              <van-cell clickable :title="$t(`cvControl.SegmentModel.${model}`)" @click="onSegmentModelChanged(model)"
                v-for="model in SegmentModels"></van-cell>
            </van-list>
          </van-popover>
        </template>
      </van-cell>

      <van-cell :disabled="!visionStore.faceDetect">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.faceDetect">
            <van-icon class-prefix="iconfont" name="face-rec" style="color: #e67e22;" />
            <span>{{ $t('cvControl.FaceRec') }}</span>
          </van-checkbox>
        </template>
        <template #label>
          <van-row style="padding-top: 15px;" v-if="visionStore.faceDetect">
            <van-checkbox v-model="visionStore.drawEigen" :disabled="!visionStore.faceDetect">
              <template #default>
                <van-icon class-prefix="iconfont" name="mesh" />
              </template>
            </van-checkbox>

            <van-checkbox v-model="visionStore.drawFaceMesh" style="margin-left: 15px;"
              :disabled="!visionStore.faceDetect">
              <template #default>
                <van-icon class-prefix="iconfont" name="eigen" />
              </template>
            </van-checkbox>
          </van-row>
        </template>
      </van-cell>

      <van-checkbox shape="square" v-model="visionStore.imgParams.enableDetect" style="margin: 10px 15px 0 15px;">
        Opencv
      </van-checkbox>
      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableDetect"
        style="padding: 10px 15px;" v-model="visionStore.imgParams.detector[0]" @change="onParamChange">
        <van-radio name="color" style="font-size: 0.8rem;">
          {{ $t('cvControl.ColorTrack') }}
        </van-radio>
        <van-radio name="contour" style="font-size: 0.8rem;">
          {{ $t('cvControl.ContourTrack') }}
        </van-radio>
        <van-radio name="bgSub" style="font-size: 0.8rem;">
          {{ $t('cvControl.BackgroundSub') }}
        </van-radio>
      </van-radio-group>
      <van-field label="threshold" type="number" input-align="right" label-width="5rem"
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
      <van-field label="minArea" type="number" input-align="right" label-width="5rem"
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

    <!-- opencv image process -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox shape="square" v-model="visionStore.imgEnhance">
          <van-icon class-prefix="iconfont" name="opencv" style="font-size: 1rem; color: #27ae60;" />
          {{ $t('cvControl.ImgEnhance') }}
        </van-checkbox>
      </template>
      <van-field :label="$t('cvControl.Gray')" type="number" input-align="right">
        <template #input>
          <van-switch v-model="visionStore.imgParams.isGray"></van-switch>
        </template>
      </van-field>
      <van-field :label="$t('cvControl.Brightness')" type="number" input-align="right">
        <template #input>
          <van-slider bar-height="4px" min="-1" max="2" step="0.1" v-model="visionStore.imgParams.gamma"
            @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button"> {{ visionStore.imgParams.gamma }} </van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field :label="$t('cvControl.Rotate')" type="number" input-align="right">
        <template #input>
          <van-slider bar-height="4px" min="-180" max="180" step="15" v-model="visionStore.imgParams.rotate"
            @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button"> {{ visionStore.imgParams.rotate }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field ref="colorMapAnchor" center clickable input-align="right" readonly :label="$t('cvControl.ColorMap')"
        style="scroll-margin-top: 50px;">
        <template #input>
          <van-popover v-model:show="showColorMaps" placement="bottom-end" :overlay="true" @open="checkPosition"
            style="width: 300px;">
            <template #reference>
              <div style="width: 200px;">{{
                ColorMaps[visionStore.imgParams.colorMap] }}</div>
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
        </template>
      </van-field>
    </van-cell-group>

    <!-- morphological operation -->
    <van-cell-group inset>
      <van-cell center input-align="right">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.imgParams.enableMorph">
            {{ $t(`cvControl.Morph`) }}
          </van-checkbox>
        </template>
        <template #value>
          <van-popover style="width: 200px;" overlay placement="bottom-end" v-model:show="showMorphOpts">
            <template #reference>
              <span style="font-size: var(--van-font-size-md)">
                {{ $t(`cvControl.MorphOpt.${MorphOpts[visionStore.imgParams.morph[0]]}`) }}
              </span>
            </template>
            <van-radio-group direction="vertical"
              style="width: 180px; height: 100px; padding: 10px 10px 0 10px; overflow: hidden scroll;"
              v-model="visionStore.imgParams.morph[0]" @change="onParamChange">
              <van-radio :name="idx" label-position="left" style="margin-bottom: 10px;"
                v-for="(morph, idx) in MorphOpts">
                <span style="font-size: var(--van-font-size-md)">{{ $t(`cvControl.MorphOpt.${morph}`) }}</span>
              </van-radio>
            </van-radio-group>
          </van-popover>
        </template>
      </van-cell>

      <van-field center label="kernelX" input-align="right" type="number" :disabled="!visionStore.imgParams.enableMorph"
        v-model="visionStore.imgParams.morph[1]">
      </van-field>
      <van-field center label="kernelY" input-align="right" type="number" :disabled="!visionStore.imgParams.enableMorph"
        v-model="visionStore.imgParams.morph[2]">
      </van-field>
      <van-field center label="iterations" input-align="right" type="number"
        :disabled="!visionStore.imgParams.enableMorph" v-model="visionStore.imgParams.morph[3]">
      </van-field>
    </van-cell-group>

    <!-- contrast -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox shape="square" v-model="visionStore.imgParams.enableContrast"
          :disabled="!visionStore.imgParams.isGray">
          {{ $t('cvControl.Contrast') }}
        </van-checkbox>
      </template>
      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableContrast"
        style="padding: 10px 15px;" v-model="visionStore.imgParams.equalization[0]" @change="onParamChange">
        <van-radio name="equalizeHist" style="font-size: 0.8rem;">
          {{ $t('cvControl.EqualizeHist') }}
        </van-radio>
        <van-radio name="clahe" style="font-size: 0.8rem;">
          {{ $t('cvControl.CLAHE') }}
        </van-radio>
      </van-radio-group>
      <van-field label="clip" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.equalization[0] == 'clahe' && visionStore.imgParams.enableContrast">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1"
            v-model="visionStore.imgParams.equalization[1]" @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button">
                {{ visionStore.imgParams.equalization[1] }}
              </van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="sizeX" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.equalization[0] == 'clahe' && visionStore.imgParams.enableContrast">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1"
            v-model="visionStore.imgParams.equalization[2]" @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button">
                {{ visionStore.imgParams.equalization[2] }}
              </van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="sizeY" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.equalization[0] == 'clahe' && visionStore.imgParams.enableContrast">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1"
            v-model="visionStore.imgParams.equalization[3]" @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button"> {{ visionStore.imgParams.equalization[3] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <!-- blur -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox shape="square" v-model="visionStore.imgParams.enableBlur">
          {{ $t('cvControl.Blur') }}
        </van-checkbox>
      </template>

      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableBlur" style="padding: 15px 15px;"
        v-model="visionStore.imgParams.blur[0]" @change="onParamChange">
        <van-radio name="gaussian">
          <van-icon class-prefix="iconfont" name="gaussian-filter" />
        </van-radio>
        <van-radio name="avg">
          <van-icon class-prefix="iconfont" name="avg-filter" />
        </van-radio>
        <van-radio name="median">
          <van-icon class-prefix="iconfont" name="median-filter" />
        </van-radio>
        <van-radio name="bilateral" style="font-size: 0.8rem;">
          {{ $t('cvControl.BilateralBlur') }}
        </van-radio>
      </van-radio-group>
      <van-field label="sizeX" type="number" input-align="right" label-width="4rem"
        v-if="(visionStore.imgParams.blur[0] == 'gaussian' || visionStore.imgParams.blur[0] == 'avg') && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1"
            v-model="visionStore.imgParams.blur[1]" @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button"> {{ visionStore.imgParams.blur[1] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="sizeY" type="number" input-align="right" label-width="4rem"
        v-if="(visionStore.imgParams.blur[0] == 'gaussian' || visionStore.imgParams.blur[0] == 'avg') && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="31" step="1"
            v-model="visionStore.imgParams.blur[2]" @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button"> {{ visionStore.imgParams.blur[2] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="aperture" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.blur[0] == 'median' && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" min="1" max="31" step="1" v-model="visionStore.imgParams.blur[3]"
            @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button"> {{ visionStore.imgParams.blur[3] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="diameter" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.blur[0] == 'bilateral' && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" button-size="1.2rem" min="1" max="5" step="1"
            v-model="visionStore.imgParams.blur[4]" @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button"> {{ visionStore.imgParams.blur[4] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="color" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.blur[0] == 'bilateral' && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" min="10" max="255" step="1" v-model="visionStore.imgParams.blur[5]"
            @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button"> {{ visionStore.imgParams.blur[5] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="space" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.blur[0] == 'bilateral' && visionStore.imgParams.enableBlur">
        <template #input>
          <van-slider bar-height="4px" min="10" max="255" step="1" v-model="visionStore.imgParams.blur[6]"
            @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button"> {{ visionStore.imgParams.blur[6] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <!-- sharpness -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox shape="square" v-model="visionStore.imgParams.enableSharpen">
          {{ $t('cvControl.Sharpness') }}
        </van-checkbox>
      </template>
      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableSharpen"
        style="padding: 10px 15px;" v-model="visionStore.imgParams.sharpen[0]" @change="onParamChange">
        <van-radio name="laplace" style="font-size: 0.8rem;">
          laplacian
        </van-radio>
        <van-radio name="usm" style="font-size: 0.8rem;">
          usm
        </van-radio>
      </van-radio-group>
      <van-field label="origin" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.sharpen[0] !== 'laplace' && visionStore.imgParams.enableSharpen">
        <template #input>
          <van-slider bar-height="4px" min="1" max="2" step="0.1" v-model="visionStore.imgParams.sharpen[1]"
            @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button"> {{ visionStore.imgParams.sharpen[1] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="addon" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.sharpen[0] !== 'laplace' && visionStore.imgParams.enableSharpen">
        <template #input>
          <van-slider bar-height="4px" min="-2" max="2" step="0.1" v-model="visionStore.imgParams.sharpen[2]"
            @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button"> {{ visionStore.imgParams.sharpen[2] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <!-- filter -->
    <van-cell-group inset>
      <template #title>
        <van-checkbox shape="square" v-model="visionStore.imgParams.enableFilter"
          :disabled="!visionStore.imgParams.isGray">
          {{ $t('cvControl.Filter') }}
        </van-checkbox>
      </template>
      <van-radio-group direction="horizontal" :disabled="!visionStore.imgParams.enableFilter"
        style="padding: 10px 15px;" v-model="visionStore.imgParams.filter[0]" @change="onParamChange">
        <van-radio name="sobel" style="font-size: 0.8rem;">
          {{ $t('cvControl.Sobel') }}
        </van-radio>
        <van-radio name="scharr" style="font-size: 0.8rem;">
          {{ $t('cvControl.Scharr') }}
        </van-radio>
        <van-radio name="laplace" style="font-size: 0.8rem;">
          {{ $t('cvControl.Laplace') }}
        </van-radio>
      </van-radio-group>
      <van-field label="dX" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.filter[0] !== 'laplace' && visionStore.imgParams.enableFilter">
        <template #input>
          <van-slider bar-height="4px" min="0" max="3" step="0.1" v-model="visionStore.imgParams.filter[1]"
            @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button"> {{ visionStore.imgParams.filter[1] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="dY" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.filter[0] !== 'laplace' && visionStore.imgParams.enableFilter">
        <template #input>
          <van-slider bar-height="4px" min="0" max="3" step="0.1" v-model="visionStore.imgParams.filter[2]"
            @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button"> {{ visionStore.imgParams.filter[2] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="size" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.filter[0] !== 'scharr' && visionStore.imgParams.enableFilter">
        <template #input>
          <van-slider bar-height="4px" min="1" max="30" step="1" v-model="visionStore.imgParams.filter[4]"
            @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button"> {{ visionStore.imgParams.filter[4] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
      <van-field label="scale" type="number" input-align="right" label-width="4rem"
        v-if="visionStore.imgParams.enableFilter">
        <template #input>
          <van-slider bar-height="4px" min="1" max="31" step="1" v-model="visionStore.imgParams.filter[3]"
            @change="onParamChange">
            <template #button>
              <van-button plain class="slider-button"> {{ visionStore.imgParams.filter[3] }}</van-button>
            </template>
          </van-slider>
        </template>
      </van-field>
    </van-cell-group>

    <van-cell-group inset :title="$t('cvControl.FeatExtract')">
      <van-cell center :title="$t('cvControl.Canny')" :label="'[ ' + visionStore.imgParams.canny.toString() + ' ]'">
        <template #title>
          <van-checkbox shape="square" v-model="visionStore.imgParams.enableCanny">
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
import { onnx } from '../../common'
import { VisionStore } from '../../store'

const IntergrateModes = [
  { name: 'wasm', color: '#8e44ad' },
  { name: 'nodejs', color: '#2ecc71' },
  { name: 'native', color: '#3498db' }
]
const ModelEngines = [{ name: 'onnx', color: '##95a5a6' }, { name: 'tensorflow', color: '#e67e22' }]

const showDetectModels = ref(false)
const DetectModels = ['yolov8n', 'yolov10n', 'yolo11n', 'mobilenet']

const showSegmentModels = ref(false)
const SegmentModels = ['deeplab', 'yolo11n-seg', 'unet', 'sam']

const showMorphOpts = ref(false)
const MorphOpts = ['Erode', 'Dilate', 'Open', 'Close', 'Gradient', 'TopHat', 'BlackHat']

const showColorMaps = ref(false)
const ColorMaps = ['NONE', 'AUTUMN', 'BONE', 'JET', 'WINTER', 'RAINBOW', 'OCEAN', 'SUMMER',
  'SPRING', 'COOL', 'HSV', 'PINK', 'HOT', 'PARULA', 'MAGMA',
  'INFERNO', 'PLASMA', 'VIRIDIS', 'CIVIDIS', 'TWILIGHT', 'TWILIGHT_SHIFTED', 'TURBO', 'DEEPGREEN']

const visionStore = VisionStore()
const isWeb = window.isWeb

const colorMapAnchor = ref()
const modelName = ref<string>()


onMounted(() => {
})

function checkPosition() {
  colorMapAnchor.value.$el.scrollIntoView({
    behavior: 'smooth',
  })
}

function onParamChange() {
}

function onDetectModelChanged(name: string) {
  visionStore.detectModel = name
  showDetectModels.value = false
}

function onSegmentModelChanged(name: string) {
  visionStore.segmentModel = name
  showSegmentModels.value = false
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

.slider-button {
  width: 26px;
  height: 26px;
  padding: 0;
}
</style>