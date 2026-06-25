import { Api } from './api.const'
import { formPost, get, post } from './base.api'

export namespace FaceRec {

  export type EigenFace = {
    name: string,
    eigens: Array<{ id: string, snap: string, timestamp: string }>
  }

  export function getFaces() {
    return get<Array<string>>(`${Api.FaceRec}${Api.F_List}`)
  }

  export function registe(name: string, vector: Float16Array, avatar: File) {
    let formData = new FormData()
    let data = new Uint32Array(vector.length)
    for (let i = 0; i < vector.length; i++) {
      data[i] = vector[i] * 1000000000
    }
    formData.append('name', new File([name], 'name', { type: 'text/plain' }))
    formData.append('eigen', new File([data], 'eigen', { type: 'application/octet-stream' }))
    formData.append('avatar', avatar)
    return formPost<string>(`${Api.FaceRec}${Api.F_Registe}`, null, null, formData)
  }

  export function recognize(vector: Float16Array) {
    let formData = new FormData()
    let data = new Uint32Array(vector.length)
    for (let i = 0; i < vector.length; i++) {
      data[i] = vector[i] * 1000000000
    }
    formData.append('eigen', new File([data], 'eigen', { type: 'application/octet-stream' }))
    return formPost<{ id: string, name: string, similarity: number, timestamp: string }>(`${Api.FaceRec}${Api.F_Recognize}`, null, {}, formData)
  }

  export function deleteFace(eigenIds: Array<string>) {
    return post<string>(`${Api.FaceRec}${Api.F_Delete}`, null, null, eigenIds)
  }

  export function list(name: string) {
    return get<EigenFace>(`${Api.FaceRec}${Api.F_List}/${name}`)
  }
}