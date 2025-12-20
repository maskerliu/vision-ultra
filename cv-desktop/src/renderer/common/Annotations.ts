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
  'select', 'Rect', 'Circle', 'Polygon', 'Line', 'multi-line'
]