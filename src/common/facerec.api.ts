import { API_URL } from "./api.const"
import { formPost, get, post } from "./base.api"

export namespace FaceRec {

  export function getFaces() {
    return get<Array<string>>(`${API_URL.FaceRec}${API_URL.F_List}`)
  }

  export function registe(name: string, vector: any, avatar: Blob) {
    let formData = new FormData()
    formData.append('name', name)
    formData.append('vector', vector)
    // formData.append('avatar', avatar)
    return formPost<string>(`${API_URL.FaceRec}${API_URL.F_Registe}`, null, null, formData)
  }

  export function recognize(vector: any) {
    return post<Array<string>>(`${API_URL.FaceRec}${API_URL.F_Recognize}`, null, {}, vector)
  }
}