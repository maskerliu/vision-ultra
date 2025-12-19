import * as fabric from 'fabric'

export type CVLabel = {
  id: number,
  name: string,
  color: string,
}

export type CVMarker = Partial<{
  id: string,
  label: number,
  shape: fabric.FabricObject,
}>

export const MarkerTypes = [
  'rect', 'circle', 'polygon', 'line', 'multi-line'
]