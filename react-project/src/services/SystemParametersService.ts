import { BaseApiService } from './BaseApiService';

export interface KeyValueDtoResponse {
  // Formato esperado por el frontend
  id?: string;
  value1?: string;
  value2?: string;

  // Compatibilidad con propiedades en mayúsculas
  Id?: string;
  Value1?: string;
  Value2?: string;

  // Identificador numérico (si el API lo provee)
  IdI?: number;

  // Metadatos opcionales
  GrupoId?: number;
  Field?: string;
  ParentId?: number;
}

class SystemParametersService extends BaseApiService {
  constructor() {
    // Apunta al microservicio de Atención Médica (7012) por defecto,
    // permitiendo override vía variable de entorno.
    super('http://190.116.90.35:8182/api' );//|| 'https://localhost:7012/api'
  }

  /**
   * GET /service/GetSystemParameterForCombo/{groupId}
   * Obtiene parámetros del sistema para combos por grupo.
   */
  async getSystemParameterForCombo(groupId: number): Promise<KeyValueDtoResponse[]> {
    const response = await this.get<KeyValueDtoResponse[]>(`/service/GetSystemParameterForCombo/${groupId}`);
    const raw = (response.objModel as any[]) || [];
    // Normalizar claves a minúsculas (id/value1) manteniendo compatibilidad
    const normalized: KeyValueDtoResponse[] = raw.map((item) => {
      const idStr: string | undefined = item.id ?? item.Id;
      const value1Str: string | undefined = item.value1 ?? item.Value1;
      const idNumeric: number | undefined = item.IdI ?? (typeof idStr === 'string' ? parseInt(idStr, 10) : undefined);
      return {
        id: idStr,
        value1: value1Str,
        value2: item.value2 ?? item.Value2,
        Id: item.Id,
        Value1: item.Value1,
        Value2: item.Value2,
        IdI: idNumeric,
        GrupoId: item.GrupoId ?? item.group ?? item.GroupId,
        Field: item.Field ?? item.field,
        ParentId: item.ParentId ?? item.parentId ?? item.parentid,
      } as KeyValueDtoResponse;
    });
    return normalized;
  }
}

export const systemParametersService = new SystemParametersService();