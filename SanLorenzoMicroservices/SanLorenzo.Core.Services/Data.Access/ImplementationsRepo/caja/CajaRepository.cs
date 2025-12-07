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
            if (!string.IsNullOrWhiteSpace(request.TipoMovimiento) && !string.Equals(request.TipoMovimiento, "T", StringComparison.OrdinalIgnoreCase))
            {
                p.Add("@TipoMovimiento", request.TipoMovimiento);
            }
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
            var p = new DynamicParameters();
            p.Add("@IdCajaMayorCierre", request.IdCajaMayorCierre);
            p.Add("@IdTipoCaja", request.IdTipoCaja);
            p.Add("@TipoMovimiento", request.TipoMovimiento);
            if (request.IdFormaPago.HasValue) p.Add("@IdFormaPago", request.IdFormaPago);
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
            p.Add("@OutIdMovimiento", dbType: DbType.Int32, direction: ParameterDirection.Output);
            using var cn = new SqlConnection(_connectionString);
            cn.Execute("[dbo].[sp_CajaMayor_InsertMovimientoManual]", p, commandType: CommandType.StoredProcedure);
            int newId = p.Get<int>("@OutIdMovimiento");
            return new CajaMayorMovimientoDbResponse
            {
                i_IdMovimiento = newId,
                i_IdCajaMayorCierre = request.IdCajaMayorCierre,
                i_IdTipoCaja = request.IdTipoCaja,
                v_TipoMovimiento = request.TipoMovimiento,
                d_Total = request.Total,
                t_FechaMovimiento = request.FechaRegistro,
                v_Observaciones = request.Observaciones,
                v_Origen = string.IsNullOrWhiteSpace(request.Origen) ? "manual" : request.Origen,
                v_CodigoDocumento = request.CodigoDocumento,
                v_SerieDocumento = request.SerieDocumento,
                v_NumeroDocumento = request.NumeroDocumento,
                v_IdVenta = request.IdVenta,
                i_InsertaIdUsuario = request.InsertaIdUsuario,
                t_InsertaFecha = DateTime.Now
            };
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
            p.Add("@PorcentajeDetraccion", (request.AplicaDetraccion && request.PorcentajeDetraccion.HasValue) ? request.PorcentajeDetraccion : null);
            p.Add("@MontoDetraccion", (request.AplicaDetraccion && request.MontoDetraccion.HasValue) ? request.MontoDetraccion : null);
            p.Add("@NumeroConstanciaDetraccion", request.AplicaDetraccion ? request.NumeroConstanciaDetraccion : null);
            p.Add("@AplicaRetencion", request.AplicaRetencion);
            p.Add("@MontoRetencion", (request.AplicaRetencion && request.MontoRetencion.HasValue) ? request.MontoRetencion : null);
            p.Add("@Observaciones", request.Observaciones);
            p.Add("@IdFamiliaEgreso", request.IdFamiliaEgreso);
            p.Add("@IdTipoEgreso", request.IdTipoEgreso);
            p.Add("@InsertaIdUsuario", request.InsertaIdUsuario);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<RegistroComprasResponse>("[dbo].[sp_RegistroCompras_Insert]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
        }

        public RegistroComprasResponse GetRegistroComprasById(GetRegistroComprasByIdRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@IdRegistroCompra", request.IdRegistroCompra);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<RegistroComprasResponse>("[dbo].[sp_RegistroCompras_GetById]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
        }

        public RegistroComprasResponse PagarRegistroCompras(UpdateRegistroComprasPagoRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@IdRegistroCompra", request.IdRegistroCompra);
            p.Add("@FechaPago", request.FechaPago);
            if (!string.IsNullOrWhiteSpace(request.Estado)) p.Add("@Estado", request.Estado);
            if (!string.IsNullOrWhiteSpace(request.Serie)) p.Add("@Serie", request.Serie);
            if (!string.IsNullOrWhiteSpace(request.Numero)) p.Add("@Numero", request.Numero);
            if (request.ActualizaIdUsuario.HasValue) p.Add("@ActualizaIdUsuario", request.ActualizaIdUsuario);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<RegistroComprasResponse>("[dbo].[sp_RegistroCompras_Pagar]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
        }

        public RegistroComprasResponse DeleteRegistroCompras(DeleteRegistroComprasRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@IdRegistroCompra", request.IdRegistroCompra);
            p.Add("@EliminaIdUsuario", request.EliminaIdUsuario);
            using var cn = new SqlConnection(_connectionString);
            var resp = cn.Query<RegistroComprasResponse>("[dbo].[sp_RegistroCompras_Delete]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
            // Recalcular totales del cierre
            var r = new DynamicParameters();
            r.Add("@IdCajaMayorCierre", request.IdCajaMayorCierre);
            r.Add("@ActualizaIdUsuario", request.EliminaIdUsuario);
            cn.Execute("[dbo].[sp_CajaMayor_RecalcularTotales]", r, commandType: CommandType.StoredProcedure);
            return resp;
        }

        public IEnumerable<CategoriaEgresoResponse> GetCategoriaEgresos(int groupId)
        {
            var p = new DynamicParameters();
            p.Add("@GroupId", groupId);
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<CategoriaEgresoResponse>("[dbo].[sp_CategoriasEgreso_GetList]", p, commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<FlujoCajaConsolidadoResponse> FlujoCajaConsolidado(FlujoCajaConsolidadoRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@Anio", request.Anio);
            string csv = null;
            if (request.IdsTipoCaja != null && request.IdsTipoCaja.Count > 0)
            {
                csv = string.Join(",", request.IdsTipoCaja);
            }
            p.Add("@IdsTipoCajaCsv", csv);
            if (!string.IsNullOrWhiteSpace(request.TipoMovimiento) && !string.Equals(request.TipoMovimiento, "T", StringComparison.OrdinalIgnoreCase))
            {
                p.Add("@TipoMovimiento", request.TipoMovimiento);
            }
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<FlujoCajaConsolidadoResponse>("[dbo].[sp_CajaMayor_FlujoConsolidado]", p, commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<FlujoCajaDetalladoResponse> FlujoCajaDetallado(FlujoCajaDetalladoRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@Anio", request.Anio);
            string csv = null;
            if (request.IdsTipoCaja != null && request.IdsTipoCaja.Count > 0)
            {
                csv = string.Join(",", request.IdsTipoCaja);
            }
            p.Add("@IdsTipoCajaCsv", csv);
            if (!string.IsNullOrWhiteSpace(request.TipoMovimiento) && !string.Equals(request.TipoMovimiento, "T", StringComparison.OrdinalIgnoreCase))
            {
                p.Add("@TipoMovimiento", request.TipoMovimiento);
            }
            using var cn = new SqlConnection(_connectionString);
            return cn.Query<FlujoCajaDetalladoResponse>("[dbo].[sp_CajaMayor_FlujoDetallado]", p, commandType: CommandType.StoredProcedure);
        }

        public (IEnumerable<RegistroComprasListItemResponse> data, int totalRows) ListRegistroCompras(RegistroComprasListRequest request)
        {
            var p = new DynamicParameters();
            p.Add("@Periodo", request.Periodo);
            p.Add("@FechaInicial", request.FechaInicial);
            p.Add("@FechaFinal", request.FechaFinal);
            p.Add("@TipoComprobante", request.TipoComprobante);
            p.Add("@IdProveedor", request.IdProveedor);
            p.Add("@IdTipoCaja", request.IdTipoCaja);
            p.Add("@Estado", request.Estado);
            p.Add("@Page", request.Page);
            p.Add("@PageSize", request.PageSize);
            
            using var cn = new SqlConnection(_connectionString);
            using var multi = cn.QueryMultiple("[dbo].[sp_RegistroCompras_List]", p, commandType: CommandType.StoredProcedure);

            var data = multi.Read<RegistroComprasListItemResponse>().ToList();
            var totalRows = 0;
            if (!multi.IsConsumed)
            {
                totalRows = multi.Read<int>().FirstOrDefault();
            }

            return (data, totalRows);
        }

        public object RecalcularIncremental(RecalcularIncrementalRequest request)
        {
            using var cn = new SqlConnection(_connectionString);
            var periodo = cn.QuerySingle<int>("SELECT i_Periodo FROM dbo.cajamayor_cierre WHERE i_IdCajaMayorCierre=@id", new { id = request.IdCajaMayorCierre });
            var anio = periodo / 100; var mes = periodo % 100;
            var fechaDesde = new DateTime(anio, mes, 1);
            var ultimoDiaMes = DateTime.DaysInMonth(anio, mes);
            var finPeriodo = new DateTime(anio, mes, ultimoDiaMes);
            var hoy = DateTime.Today;
            var fechaHasta = (hoy > finPeriodo) ? finPeriodo : hoy;
            var p = new DynamicParameters();
            p.Add("@IdCajaMayorCierre", request.IdCajaMayorCierre);
            p.Add("@DefaultIdTipoCaja", request.DefaultIdTipoCaja ?? 1);
            p.Add("@FechaDesde", fechaDesde);
            p.Add("@FechaHasta", fechaHasta);
            p.Add("@Preview", request.Preview ? 1 : 0);
            var res = cn.Query("[dbo].[sp_CajaMayor_RecalcularIncremental]", p, commandType: CommandType.StoredProcedure).ToList();
            return new { result = res, fechaDesde, fechaHasta };
        }
    }
}
