import { API_URL } from "./api.const";
import { get, post } from "./base.api";

export namespace FaceRec {

  export function getFaces() {
    return get<Array<string>>(`${API_URL.FaceRec}${API_URL.F_List}`)
  }

  export function registe(name: string, vector: any) {
    return post<string>(`${API_URL.FaceRec}${API_URL.F_Registe}`, null, { name }, vector)
  }

  export function recognize(vector: any) {
    return post<Array<string>>(`${API_URL.FaceRec}${API_URL.F_Recognize}`, null, {}, vector)
  }
}