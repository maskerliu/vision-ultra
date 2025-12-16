import { API_URL } from "./api.const"
import { formPost, get, post } from "./base.api"

export namespace FaceRec {


  export type EigenFace = {
    name: string,
    eigens: Array<{ id: string, snap: string, timestamp: string }>
  }

  export function getFaces() {
    return get<Array<string>>(`${API_URL.FaceRec}${API_URL.F_List}`)
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
    return formPost<string>(`${API_URL.FaceRec}${API_URL.F_Registe}`, null, null, formData)
  }

  export function recognize(vector: any) {
    let formData = new FormData()
    formData.append('eigen', new File([vector], 'eigen', { type: 'text/plain' }))
    return formPost<{ name: string, snap: string, timestamp: string }>(`${API_URL.FaceRec}${API_URL.F_Recognize}`, null, {}, formData)
  }

  export function deleteFace(eigenIds: Array<string>) {
    return post<string>(`${API_URL.FaceRec}${API_URL.F_Delete}`, null, null, eigenIds)
  }

  export function list(name: string) {
    return get<EigenFace>(`${API_URL.FaceRec}${API_URL.F_List}/${name}`)
  }
}