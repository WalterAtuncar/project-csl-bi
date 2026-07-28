// Utilidades transversales para obtener datos de autenticación desde localStorage
// Nota: lee directamente la clave `userData` y extrae `systemUserId`

import { authService } from '../services/AuthService';

export interface StoredUserData {
  systemUserId?: number;
  userName?: string;
  roleId?: number;
  personId?: string;
  rolVentaId?: number;
  profesionId?: number;
  isAuthenticated?: boolean;
  loginTime?: string;
}

/**
 * Obtiene el objeto userData desde localStorage y lo parsea de forma segura.
 */
export function getUserDataFromLocalStorage(): StoredUserData | null {
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredUserData;
    return parsed || null;
  } catch {
    return null;
  }
}

/**
 * Obtiene el `systemUserId` desde localStorage (userData.systemUserId).
 * Si no existe, intenta obtenerlo desde AuthService como respaldo.
 */
export function getInsertaIdUsuario(): number | null {
  const stored = getUserDataFromLocalStorage();
  const id = stored?.systemUserId;
  if (typeof id === 'number' && Number.isFinite(id) && id > 0) return id;

  // Respaldo: usar AuthService si está disponible
  const fallbackId = authService.getCurrentUserId();
  return typeof fallbackId === 'number' && Number.isFinite(fallbackId) && fallbackId > 0
    ? fallbackId
    : null;
}

/**
 * Versión "strict": retorna el ID o lanza un error si no puede obtenerlo.
 */
export function ensureInsertaIdUsuario(): number {
  const id = getInsertaIdUsuario();
  if (!id) {
    throw new Error('No se encontró systemUserId en localStorage (userData).');
  }
  return id;
}