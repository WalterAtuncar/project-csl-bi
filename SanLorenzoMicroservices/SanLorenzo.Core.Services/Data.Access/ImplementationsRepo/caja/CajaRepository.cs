using Dapper;
using Repositories.IContractsRepo.caja;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using Data.Model.Request.caja;
using Data.Model.Response.caja;
using Data.Access.Utils;

namespace Data.Access.ImplementationsRepo.caja
{
    public class CajaRepository : ICajaRepository
    {
        private readonly string _connectionString;

        public CajaRepository(string connectionString) 
        {
            // Ajuste de timeout de conexión para evitar timeouts intermitentes en redes lentas
            _connectionString = "Data Source=192.168.1.2\\CSL_2025; Initial Catalog=20505310072; User Id=sa; Password=Alph@2536; Connection Timeout=60000";
        }

        public IEnumerable<CajaMayorCabeceraResponse> GetListCabecera(GetListCabeceraRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@Anio", request.Anio);
            p.Add("@Mes", request.Mes);
            p.Add("@EstadoCierre", request.EstadoCierre);
            p.Add("@Page", request.Page);
            p.Add("@PageSize", request.PageSize);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<CajaMayorCabeceraResponse>("[dbo].[sp_CajaMayor_GetListCabecera]", p, commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<CajaMayorCabeceraResponse> GetCierresPorRango(GetCierresPorRangoRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@PeriodoDesde", request.PeriodoDesde);
            p.Add("@PeriodoHasta", request.PeriodoHasta);
            p.Add("@EstadoCierre", request.EstadoCierre);
            p.Add("@Page", request.Page);
            p.Add("@PageSize", request.PageSize);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<CajaMayorCabeceraResponse>("[dbo].[sp_CajaMayor_GetListCabeceraPorRango]", p, commandType: CommandType.StoredProcedure);
        }

        public CajaMayorCabeceraResponse GetCabecera(GetCabeceraRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@IdCajaMayorCierre", request.IdCajaMayorCierre);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<CajaMayorCabeceraResponse>("[dbo].[sp_CajaMayor_GetCabecera]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
        }

        public CajaMayorCabeceraResponse CierreCreateUpdate(CierreCreateUpdateRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@Anio", request.Anio);
            p.Add("@Mes", request.Mes);
            // Normalizar rango de fechas: inicio 00:00:00, fin 23:59:59
            var fechaInicio = request.FechaInicio.StartOfDay();
            var fechaFin = request.FechaFin.EndOfDay();
            p.Add("@FechaInicio", fechaInicio);
            p.Add("@FechaFin", fechaFin);
            p.Add("@Observaciones", request.Observaciones);
            p.Add("@InsertaIdUsuario", request.InsertaIdUsuario);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<CajaMayorCabeceraResponse>("[dbo].[sp_CajaMayor_Cierre_CreateUpdate]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
        }

        public IEnumerable<CajaMayorResumenTipoResponse> ResumenTipos(ResumenTiposRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@IdCajaMayorCierre", request.IdCajaMayorCierre);
            p.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<CajaMayorResumenTipoResponse>("[dbo].[sp_CajaMayor_ResumenTipos]", p, commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<CajaMayorResumenMensualTipoResponse> ResumenMensualPorTipo(ResumenMensualPorTipoRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@PeriodoDesde", request.PeriodoDesde);
            p.Add("@PeriodoHasta", request.PeriodoHasta);
            p.Add("@IdTipoCaja", request.IdTipoCaja);
            p.Add("@EstadoCierre", request.EstadoCierre);
            p.Add("@Page", request.Page);
            p.Add("@PageSize", request.PageSize);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<CajaMayorResumenMensualTipoResponse>("[dbo].[sp_CajaMayor_ResumenMensualPorTipo]", p, commandType: CommandType.StoredProcedure);
        }

        public CajaMayorTotalesResponse RecalcularTotales(RecalcularTotalesRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@IdCajaMayorCierre", request.IdCajaMayorCierre);
            p.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<CajaMayorTotalesResponse>("[dbo].[sp_CajaMayor_RecalcularTotales]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
        }

        public CajaMayorResumenTipoResponse UpdateSaldoInicialTipoCaja(UpdateSaldoInicialTipoCajaRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@IdCajaMayorCierre", request.IdCajaMayorCierre);
            p.Add("@IdTipoCaja", request.IdTipoCaja);
            p.Add("@SaldoInicial", request.SaldoInicial);
            p.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<CajaMayorResumenTipoResponse>("[dbo].[sp_CajaMayor_UpdateSaldoInicialTipoCaja]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
        }

        public CajaMayorCabeceraResponse Cerrar(CerrarRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@IdCajaMayorCierre", request.IdCajaMayorCierre);
            p.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<CajaMayorCabeceraResponse>("[dbo].[sp_CajaMayor_Cerrar]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
        }

        public CajaMayorCabeceraResponse Confirmar(ConfirmarRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@IdCajaMayorCierre", request.IdCajaMayorCierre);
            p.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<CajaMayorCabeceraResponse>("[dbo].[sp_CajaMayor_Confirmar]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
        }

        public IEnumerable<CajaMayorMovimientoDbResponse> GenerarEgresosDesdeVentas(GenerarEgresosDesdeVentasRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@IdCajaMayorCierre", request.IdCajaMayorCierre);
            p.Add("@InsertaIdUsuario", request.InsertaIdUsuario);
            p.Add("@DefaultIdTipoCaja", request.DefaultIdTipoCaja);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<CajaMayorMovimientoDbResponse>("[dbo].[sp_CajaMayor_GenerarEgresosDesdeVentas]", p, commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<CajaMayorMovimientoDbResponse> GenerarIngresosDesdeCobranzas(GenerarIngresosDesdeCobranzasRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@IdCajaMayorCierre", request.IdCajaMayorCierre);
            p.Add("@InsertaIdUsuario", request.InsertaIdUsuario);
            p.Add("@DefaultIdTipoCaja", request.DefaultIdTipoCaja);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<CajaMayorMovimientoDbResponse>("[dbo].[sp_CajaMayor_GenerarDesdeCobranzas]", p, commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<CajaMayorMovimientoResponse> GetMovimientos(GetMovimientosRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@IdCajaMayorCierre", request.IdCajaMayorCierre);
            p.Add("@IdTipoCaja", request.IdTipoCaja);
            p.Add("@TipoMovimiento", request.TipoMovimiento);
            p.Add("@Origen", request.Origen);
            // Normalizar rango de fechas: inicio 00:00:00, fin 23:59:59
            var fechaDesde = request.FechaDesde.StartOfDayOrNull();
            var fechaHasta = request.FechaHasta.EndOfDayOrNull();
            p.Add("@FechaDesde", fechaDesde);
            p.Add("@FechaHasta", fechaHasta);
            p.Add("@Page", request.Page);
            p.Add("@PageSize", request.PageSize);
            p.Add("@SinPaginacion", request.SinPaginacion ?? false);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<CajaMayorMovimientoResponse>("[dbo].[sp_CajaMayor_GetMovimientos]", p, commandType: CommandType.StoredProcedure);
        }

        public CajaMayorMovimientoDbResponse InsertMovimientoManual(InsertMovimientoManualRequest request)
        {
            try
            {
                var p = new DynamicParameters();
                p.Add("@IdCajaMayorCierre", request.IdCajaMayorCierre);
                p.Add("@IdTipoCaja", request.IdTipoCaja);
                p.Add("@TipoMovimiento", request.TipoMovimiento);
                // Nuevos campos
                p.Add("@ConceptoMovimiento", request.ConceptoMovimiento);
                p.Add("@Subtotal", request.Subtotal);
                p.Add("@IGV", request.IGV);
                p.Add("@Origen", string.IsNullOrWhiteSpace(request.Origen) ? "manual" : request.Origen);
                p.Add("@Total", request.Total);
                p.Add("@FechaRegistro", request.FechaRegistro);
                p.Add("@Observaciones", request.Observaciones);
                p.Add("@CodigoDocumento", request.CodigoDocumento);
                p.Add("@SerieDocumento", request.SerieDocumento);
                p.Add("@NumeroDocumento", request.NumeroDocumento);
                p.Add("@IdVenta", request.IdVenta);
                p.Add("@InsertaIdUsuario", request.InsertaIdUsuario);
                using var cn = new SqlConnection(_connectionString);
                return cn.Query<CajaMayorMovimientoDbResponse>("[dbo].[sp_CajaMayor_InsertMovimientoManual]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
            }
            catch (Exception ex)
            {

                throw ex;
            }
            
        }

        public IEnumerable<TipoCajaResponse> GetTiposCaja(bool includeInactive = false)
        {
            var p = new DynamicParameters();
            p.Add("@IncludeInactive", includeInactive);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<TipoCajaResponse>("[dbo].[sp_TipoCaja_GetList]", p, commandType: CommandType.StoredProcedure);
        }

        public CajaMayorCierreExistsResponse CajaMayorCierreExists(CheckCierreExistsRequest request)
        {
            try
            {
                var p = new DynamicParameters();
                p.Add("@Anio", request.Anio);
                p.Add("@Mes", request.Mes);
                using var cn = new SqlConnection(_connectionString);
                return cn.Query<CajaMayorCierreExistsResponse>("[dbo].[sp_CajaMayor_Cierre_Exists]", p, commandType: CommandType.StoredProcedure, commandTimeout: 60).FirstOrDefault();
            }
            catch (Exception ex)
            {

                throw ex;
            }
            
        }

        public DeleteCajaMayorCierreResponse DeleteCajaMayorCierrePhysical(DeleteCierreRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@IdCajaMayorCierre", request.IdCajaMayorCierre);
            p.Add("@EliminaIdUsuario", request.EliminaIdUsuario);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<DeleteCajaMayorCierreResponse>("[dbo].[sp_CajaMayor_Cierre_DeletePhysical]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
        }

        public IEnumerable<ProveedorResponse> BuscarProveedores(BuscarProveedoresRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@Termino", request.Termino);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<ProveedorResponse>("[dbo].[sp_Proveedores_Buscar]", p, commandType: CommandType.StoredProcedure);
        }

        public ProveedorResponse CrearProveedor(CrearProveedorRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@Ruc", request.Ruc);
            p.Add("@RazonSocial", request.RazonSocial);
            p.Add("@Direccion", request.Direccion);
            p.Add("@Email", request.Email);
            p.Add("@InsertaIdUsuario", request.InsertaIdUsuario);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<ProveedorResponse>("[dbo].[sp_Proveedores_Insert]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
        }

        public RegistroComprasResponse InsertRegistroCompras(InsertRegistroComprasRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@IdMovimientoEgreso", request.IdMovimientoEgreso);
            p.Add("@IdProveedor", request.IdProveedor);
            p.Add("@RucProveedor", request.RucProveedor);
            p.Add("@RazonSocialProveedor", request.RazonSocialProveedor);
            p.Add("@FechaEmision", request.FechaEmision);
            p.Add("@FechaVencimiento", request.FechaVencimiento);
            p.Add("@TipoComprobante", request.TipoComprobante);
            p.Add("@Serie", request.Serie);
            p.Add("@Numero", request.Numero);
            p.Add("@BaseImponible", request.BaseImponible);
            p.Add("@IGV", request.IGV);
            p.Add("@ISC", request.ISC);
            p.Add("@OtrosTributos", request.OtrosTributos);
            p.Add("@ValorNoGravado", request.ValorNoGravado);
            p.Add("@ImporteTotal", request.ImporteTotal);
            p.Add("@CodigoMoneda", request.CodigoMoneda);
            p.Add("@TipoCambio", request.TipoCambio);
            p.Add("@AplicaDetraccion", request.AplicaDetraccion);
            p.Add("@PorcentajeDetraccion", request.PorcentajeDetraccion);
            p.Add("@MontoDetraccion", request.MontoDetraccion);
            p.Add("@NumeroConstanciaDetraccion", request.NumeroConstanciaDetraccion);
            p.Add("@AplicaRetencion", request.AplicaRetencion);
            p.Add("@MontoRetencion", request.MontoRetencion);
            p.Add("@Observaciones", request.Observaciones);
            p.Add("@IdFamiliaEgreso", request.IdFamiliaEgreso);
            p.Add("@IdTipoEgreso", request.IdTipoEgreso);
            p.Add("@InsertaIdUsuario", request.InsertaIdUsuario);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<RegistroComprasResponse>("[dbo].[sp_RegistroCompras_Insert]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
        }
    }
}
