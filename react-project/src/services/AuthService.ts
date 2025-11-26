import { BaseApiService } from './BaseApiService';

// Interfaces para el login
export interface LoginRequest {
  nodeId: number;
  user: string;
  password: string;
}

export interface LoginResponse {
  i_SystemUserId: number;
  v_UserName: string;
  i_RoleId: number;
  v_PersonId: string;
  i_RolVentaId: number;
  i_ProfesionId: number;
}

export interface UserData {
  systemUserId: number;
  userName: string;
  roleId: number;
  personId: string;
  rolVentaId: number;
  profesionId: number;
  isAuthenticated: boolean;
  loginTime: string;
}

/**
 * Servicio para manejar la autenticación de usuarios
 * Hereda de BaseApiService para obtener todos los métodos HTTP
 */
export class AuthService extends BaseApiService {
  private readonly STORAGE_KEYS = {
    USER_DATA: 'userData',
    AUTH_TOKEN: 'authToken',
    REFRESH_TOKEN: 'refreshToken',
    LOGIN_TIME: 'loginTime'
  };

  private readonly NODE_ID = 9; // Hardcodeado por el momento

  constructor() {
    super(); // Usar la URL base por defecto
  }

  /**
   * Realiza el login del usuario
   */
  async login(user: string, password: string): Promise<UserData> {
    const loginRequest: LoginRequest = {
      nodeId: this.NODE_ID,
      user,
      password
    };

    const response = await this.post<LoginResponse, LoginRequest>('/Auth/Login', loginRequest, {
      skipLoader: false // Asegurar que se muestre el loader
    });
    
    // Crear objeto de datos del usuario
    const userData: UserData = {
      systemUserId: response.objModel.i_SystemUserId,
      userName: response.objModel.v_UserName,
      roleId: response.objModel.i_RoleId,
      personId: response.objModel.v_PersonId,
      rolVentaId: response.objModel.i_RolVentaId,
      profesionId: response.objModel.i_ProfesionId,
      isAuthenticated: true,
      loginTime: new Date().toISOString()
    };

    // Guardar datos en localStorage
    this.saveUserData(userData);

    // Si viene token en la respuesta, guardarlo
    if (response.token) {
      localStorage.setItem(this.STORAGE_KEYS.AUTH_TOKEN, response.token);
    }

    // Disparar evento personalizado para notificar login exitoso
    window.dispatchEvent(new CustomEvent('auth:login', { detail: userData }));

    return userData;
  }

  /**
   * Realiza el logout del usuario
   */
  async logout(): Promise<void> {
    try {
      // Llamar al endpoint de logout si existe
      // await this.post('/Logout');
    } catch (error) {
      console.warn('Error al hacer logout en el servidor:', error);
    } finally {
      // Limpiar datos locales siempre
      this.clearUserData();
    }
  }

  /**
   * Obtiene los datos del usuario actual desde localStorage
   */
  getCurrentUser(): UserData | null {
    try {
      const userData = localStorage.getItem(this.STORAGE_KEYS.USER_DATA);
      if (userData) {
        return JSON.parse(userData) as UserData;
      }
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
      this.clearUserData();
    }
    return null;
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    const userData = this.getCurrentUser();
    return userData?.isAuthenticated === true;
  }

  /**
   * Obtiene el ID del usuario actual
   */
  getCurrentUserId(): number | null {
    const userData = this.getCurrentUser();
    return userData?.systemUserId || null;
  }

  /**
   * Obtiene el rol del usuario actual
   */
  getCurrentUserRole(): number | null {
    const userData = this.getCurrentUser();
    return userData?.roleId || null;
  }

  /**
   * Obtiene el nombre del usuario actual
   */
  getCurrentUserName(): string | null {
    const userData = this.getCurrentUser();
    return userData?.userName || null;
  }

  /**
   * Verifica si el usuario tiene un rol específico
   */
  hasRole(roleId: number): boolean {
    const userData = this.getCurrentUser();
    return userData?.roleId === roleId;
  }

  /**
   * Verifica si el usuario tiene permisos de administrador
   */
  isAdmin(): boolean {
    return this.hasRole(1); // Asumiendo que roleId 1 es admin
  }

  /**
   * Actualiza los datos del usuario en localStorage
   */
  updateUserData(updates: Partial<UserData>): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      this.saveUserData(updatedUser);
    }
  }

  /**
   * Guarda los datos del usuario en localStorage
   */
  private saveUserData(userData: UserData): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      localStorage.setItem(this.STORAGE_KEYS.LOGIN_TIME, userData.loginTime);
    } catch (error) {
      console.error('Error al guardar datos del usuario:', error);
    }
  }

  /**
   * Limpia todos los datos del usuario del localStorage
   */
  private clearUserData(): void {
    localStorage.removeItem(this.STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(this.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(this.STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(this.STORAGE_KEYS.LOGIN_TIME);
  }

  /**
   * Obtiene el tiempo transcurrido desde el login
   */
  getSessionDuration(): number {
    const loginTime = localStorage.getItem(this.STORAGE_KEYS.LOGIN_TIME);
    if (loginTime) {
      const loginDate = new Date(loginTime);
      const now = new Date();
      return now.getTime() - loginDate.getTime();
    }
    return 0;
  }

  /**
   * Verifica si la sesión ha expirado
   */
  isSessionExpired(): boolean {
    const sessionDuration = this.getSessionDuration();
    const maxSessionTime = 8 * 60 * 60 * 1000; // 8 horas en milisegundos
    return sessionDuration > maxSessionTime;
  }

  /**
   * Renueva la sesión del usuario
   */
  renewSession(): void {
    const userData = this.getCurrentUser();
    if (userData) {
      userData.loginTime = new Date().toISOString();
      this.saveUserData(userData);
    }
  }

  /**
   * Obtiene información completa de la sesión
   */
  getSessionInfo(): {
    user: UserData | null;
    isAuthenticated: boolean;
    sessionDuration: number;
    isExpired: boolean;
  } {
    const user = this.getCurrentUser();
    return {
      user,
      isAuthenticated: this.isAuthenticated(),
      sessionDuration: this.getSessionDuration(),
      isExpired: this.isSessionExpired()
    };
  }

  /**
   * Verifica si el usuario actual es el creador de un registro
   */
  isUserCreator(creatorUserId?: number): boolean {
    if (!creatorUserId) return false;
    const currentUserId = this.getCurrentUserId();
    return currentUserId === creatorUserId;
  }
}

// Crear instancia singleton del servicio
export const authService = new AuthService(); 