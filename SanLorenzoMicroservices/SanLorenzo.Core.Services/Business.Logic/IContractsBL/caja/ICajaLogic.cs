using Data.Model.Request.caja;
using Data.Model.Response.caja;
using System.Collections.Generic;

namespace Business.Logic.IContractsBL.caja
{
    public interface ICajaLogic
    {
        // ================================================
        // CAJA MAYOR
        // ================================================
        
        /// <summary>
        /// Crea una nueva caja mayor con su detalle
        /// </summary>
        /// <param name="request">Datos de la caja mayor a crear</param>
        /// <returns>Respuesta con el resultado de la operación</returns>
        CreateCajaMayorResponse CreateCajaMayor(CreateCajaMayorRequest request);
        
        /// <summary>
        /// Actualiza una caja mayor existente
        /// </summary>
        /// <param name="request">Datos de la caja mayor a actualizar</param>
        /// <returns>Respuesta con el resultado de la operación</returns>
        CreateCajaMayorResponse UpdateCajaMayor(UpdateCajaMayorRequest request);
        
        /// <summary>
        /// Obtiene la lista de cajas mayor con filtros
        /// </summary>
        /// <param name="request">Filtros y parámetros de paginación</param>
        /// <returns>Lista de cajas mayor</returns>
        List<CajaMayorListResponse> GetCajaMayorList(GetCajaMayorListRequest request);
        
        /// <summary>
        /// Obtiene el detalle completo de una caja mayor
        /// </summary>
        /// <param name="idCajaMayor">ID de la caja mayor</param>
        /// <returns>Detalle completo de la caja mayor</returns>
        CajaMayorDetalleResponse GetCajaMayorDetalle(int idCajaMayor);
        
        /// <summary>
        /// Cierra una caja mayor
        /// </summary>
        /// <param name="request">Datos del cierre</param>
        /// <returns>Respuesta del cierre</returns>
        CerrarCajaMayorResponse CerrarCajaMayor(CerrarCajaMayorRequest request);
        
        /// <summary>
        /// Elimina una caja mayor
        /// </summary>
        /// <param name="request">Datos de la eliminación</param>
        /// <returns>Respuesta de la eliminación</returns>
        DeleteCajaMayorResponse DeleteCajaMayor(DeleteCajaMayorRequest request);
        
        /// <summary>
        /// Inserta un detalle individual a una caja mayor existente (Compatible con SQL Server 2012)
        /// </summary>
        /// <param name="request">Datos del detalle a insertar</param>
        /// <returns>Respuesta de la inserción</returns>
        CreateCajaMayorResponse InsertCajaMayorDetalle(InsertCajaMayorDetalleRequest request);
        
        // ================================================
        // INGRESOS MENSUALES
        // ================================================
        
        /// <summary>
        /// Registra un nuevo ingreso mensual
        /// </summary>
        /// <param name="request">Datos del ingreso</param>
        /// <returns>Respuesta con el ingreso creado</returns>
        CreateIngresoMensualResponse CreateIngresoMensual(CreateIngresoMensualRequest request);
        
        /// <summary>
        /// Obtiene la lista de ingresos mensuales
        /// </summary>
        /// <param name="request">Filtros de búsqueda</param>
        /// <returns>Lista de ingresos mensuales</returns>
        List<IngresoMensualListResponse> GetIngresoMensualList(GetIngresoMensualListRequest request);
        
        /// <summary>
        /// Actualiza un ingreso mensual
        /// </summary>
        /// <param name="request">Datos actualizados del ingreso</param>
        /// <returns>Respuesta de la actualización</returns>
        UpdateIngresoMensualResponse UpdateIngresoMensual(UpdateIngresoMensualRequest request);
        
        /// <summary>
        /// Elimina un ingreso mensual
        /// </summary>
        /// <param name="request">Datos de la eliminación</param>
        /// <returns>Respuesta de la eliminación</returns>
        DeleteIngresoMensualResponse DeleteIngresoMensual(DeleteIngresoMensualRequest request);
        
        // ================================================
        // EGRESOS MENSUALES
        // ================================================
        
        /// <summary>
        /// Registra un nuevo egreso mensual
        /// </summary>
        /// <param name="request">Datos del egreso</param>
        /// <returns>Respuesta con el egreso creado</returns>
        CreateEgresoMensualResponse CreateEgresoMensual(CreateEgresoMensualRequest request);
        
        /// <summary>
        /// Obtiene la lista de egresos mensuales
        /// </summary>
        /// <param name="request">Filtros de búsqueda</param>
        /// <returns>Lista de egresos mensuales</returns>
        List<EgresoMensualListResponse> GetEgresoMensualList(GetEgresoMensualListRequest request);
        
        /// <summary>
        /// Actualiza un egreso mensual
        /// </summary>
        /// <param name="request">Datos actualizados del egreso</param>
        /// <returns>Respuesta de la actualización</returns>
        UpdateEgresoMensualResponse UpdateEgresoMensual(UpdateEgresoMensualRequest request);
        
        /// <summary>
        /// Elimina un egreso mensual
        /// </summary>
        /// <param name="request">Datos de la eliminación</param>
        /// <returns>Respuesta de la eliminación</returns>
        DeleteEgresoMensualResponse DeleteEgresoMensual(DeleteEgresoMensualRequest request);
        
        // ================================================
        // TIPOS DE CAJA
        // ================================================
        
        /// <summary>
        /// Crea un nuevo tipo de caja
        /// </summary>
        /// <param name="request">Datos del tipo de caja</param>
        /// <returns>Respuesta con el tipo de caja creado</returns>
        CreateTipoCajaResponse CreateTipoCaja(CreateTipoCajaRequest request);
        
        /// <summary>
        /// Obtiene la lista de tipos de caja
        /// </summary>
        /// <param name="request">Filtros de búsqueda</param>
        /// <returns>Lista de tipos de caja</returns>
        List<TipoCajaResponse> GetTiposCaja(GetTiposCajaRequest request);
        
        /// <summary>
        /// Actualiza un tipo de caja
        /// </summary>
        /// <param name="request">Datos actualizados del tipo de caja</param>
        /// <returns>Respuesta de la actualización</returns>
        UpdateTipoCajaResponse UpdateTipoCaja(UpdateTipoCajaRequest request);
        
        /// <summary>
        /// Elimina un tipo de caja
        /// </summary>
        /// <param name="request">Datos de la eliminación</param>
        /// <returns>Respuesta de la eliminación</returns>
        DeleteTipoCajaResponse DeleteTipoCaja(DeleteTipoCajaRequest request);
        
        // ================================================
        // TIPOS DE INGRESO MENSUAL
        // ================================================
        
        /// <summary>
        /// Crea un nuevo tipo de ingreso mensual
        /// </summary>
        /// <param name="request">Datos del tipo de ingreso</param>
        /// <returns>Respuesta con el tipo de ingreso creado</returns>
        CreateTipoIngresoMensualResponse CreateTipoIngresoMensual(CreateTipoIngresoMensualRequest request);
        
        /// <summary>
        /// Obtiene la lista de tipos de ingreso mensual
        /// </summary>
        /// <param name="request">Filtros de búsqueda</param>
        /// <returns>Lista de tipos de ingreso mensual</returns>
        List<TipoIngresoMensualResponse> GetTiposIngresoMensual(GetTiposIngresoMensualRequest request);
        
        /// <summary>
        /// Actualiza un tipo de ingreso mensual
        /// </summary>
        /// <param name="request">Datos actualizados del tipo de ingreso</param>
        /// <returns>Respuesta de la actualización</returns>
        UpdateTipoIngresoMensualResponse UpdateTipoIngresoMensual(UpdateTipoIngresoMensualRequest request);
        
        /// <summary>
        /// Elimina un tipo de ingreso mensual
        /// </summary>
        /// <param name="request">Datos de la eliminación</param>
        /// <returns>Respuesta de la eliminación</returns>
        DeleteTipoIngresoMensualResponse DeleteTipoIngresoMensual(DeleteTipoIngresoMensualRequest request);
        
        // ================================================
        // TIPOS DE EGRESO MENSUAL
        // ================================================
        
        /// <summary>
        /// Crea un nuevo tipo de egreso mensual
        /// </summary>
        /// <param name="request">Datos del tipo de egreso</param>
        /// <returns>Respuesta con el tipo de egreso creado</returns>
        CreateTipoEgresoMensualResponse CreateTipoEgresoMensual(CreateTipoEgresoMensualRequest request);
        
        /// <summary>
        /// Obtiene la lista de tipos de egreso mensual
        /// </summary>
        /// <param name="request">Filtros de búsqueda</param>
        /// <returns>Lista de tipos de egreso mensual</returns>
        List<TipoEgresoMensualResponse> GetTiposEgresoMensual(GetTiposEgresoMensualRequest request);
        
        /// <summary>
        /// Actualiza un tipo de egreso mensual
        /// </summary>
        /// <param name="request">Datos actualizados del tipo de egreso</param>
        /// <returns>Respuesta de la actualización</returns>
        UpdateTipoEgresoMensualResponse UpdateTipoEgresoMensual(UpdateTipoEgresoMensualRequest request);
        
        /// <summary>
        /// Elimina un tipo de egreso mensual
        /// </summary>
        /// <param name="request">Datos de la eliminación</param>
        /// <returns>Respuesta de la eliminación</returns>
        DeleteTipoEgresoMensualResponse DeleteTipoEgresoMensual(DeleteTipoEgresoMensualRequest request);
        
        // ================================================
        // SALDO CAJA
        // ================================================
        
        /// <summary>
        /// Obtiene el saldo actual de caja por tipo
        /// </summary>
        /// <param name="request">Filtros para obtener saldos</param>
        /// <returns>Lista de saldos por tipo de caja</returns>
        List<SaldoCajaResponse> GetSaldoCaja(GetSaldoCajaRequest request);
    }
}
