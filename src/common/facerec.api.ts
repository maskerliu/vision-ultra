import { API_URL } from "./api.const"
import { formPost, get, post } from "./base.api"

export namespace FaceRec {

  export function getFaces() {
    return get<Array<string>>(`${API_URL.FaceRec}${API_URL.F_List}`)
  }

  export function registe(name: string, vector: any, avatar: File) {
    let formData = new FormData()
    formData.append('name', new File([name], 'name', { type: 'text/plain' }))
    formData.append('vector', new File([vector], 'vector', { type: 'text/plain' }))
    formData.append('avatar', avatar)
    return formPost<string>(`${API_URL.FaceRec}${API_URL.F_Registe}`, null, null, formData)
  }

  export function recognize(vector: any) {
    let formData = new FormData()
    formData.append('vector', new File([vector], 'vector', { type: 'text/plain' }))
    return formPost<string>(`${API_URL.FaceRec}${API_URL.F_Recognize}`, null, {}, formData)
  }

  export function deleteFace(name: string, vectorId: string) {
    return post<string>(`${API_URL.FaceRec}${API_URL.F_Delete}`, null, { name, vectorId })
  }

  export function list(name: string) {
    return get<string>(`${API_URL.FaceRec}${API_URL.F_List}/${name}`)
  }
}