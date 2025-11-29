# Guía de Backend — Controladores y Endpoints con Stored Procedures (SP)

Esta guía describe cómo está estructurado el backend y cómo implementar un controlador y su endpoint que llama a un Stored Procedure usando Dapper, de forma consistente con `Agenda.Microservice`.

## Arquitectura y Capas

- Microservicio ASP.NET Core (`net6.0`) con capas:
  - `Agenda.Microservice` (API HTTP): Controllers, rutas, Swagger.
  - `Business.Logic`: Implementaciones de lógica que delegan al `UnitOfWork`.
  - `UnitOfWork`: Agregador de repositorios por dominio; entrega `ICaja`, `ICalendar`, etc.
  - `Data.Access`: Repositorios que usan `Dapper`/`Dapper.Contrib` para ejecutar SPs/CRUD.
  - `Data.Model`: Clases `Request`/`Response` tipadas para contratos.
- DI en `Program.cs`:
  - `IUnitOfWork` (singleton) con `ConnectionStrings:local`.
  - Lógicas (`ICajaLogic`, etc.) registradas como `Transient`.
- Respuesta estándar: `ResponseDTO.Success(...)`/`Failed(...)` desde los controllers.

## Convenciones de Rutas y Controllers

- Base de controllers: `[ApiController]`, `[Route("api/[controller]")]` o ruta fija (`api/caja-mayor`, `api/calendar`).
- Atributos recomendados:
  - `[Produces("application/json")]`, `[Consumes("application/json")]`.
  - `[ProducesResponseType(typeof(<TipoRespuesta>), StatusCodes.Status200OK)]` y para errores `ResponseDTO`.
- Ejemplo de rutas (Caja):
  - `POST /api/Caja/caja-mayor` (crear/actualizar con detalle table-valued).
  - `GET /api/Caja/caja-mayor` (listar).
  - `GET /api/Caja/caja-mayor/{id}` (detalle via `QueryMultiple`).
  - `PATCH /api/Caja/caja-mayor/cerrar` (cierre).
  - `POST /api/Caja/caja-mayor/detalle` (insertar movimiento individual).

## Flujo End-to-End (HTTP → SP → HTTP)

1) Controller recibe el `Request` tipado (por `FromBody`/`FromQuery`/`FromRoute`).
2) Controller delega en `Business.Logic` (e.g. `_cajaLogic.Metodo(request)`).
3) Logic usa `IUnitOfWork` para invocar el repositorio (e.g. `_unitOfWork.ICaja.Metodo(request)`).
4) Repository arma `DynamicParameters` y ejecuta el SP via `Dapper`, mapeando a `Response` tipado.
5) Controller devuelve `Ok(ResponseDTO.Success(...))` o `BadRequest(ResponseDTO.Failed(...))`.

## Pasos para Crear un Nuevo Endpoint con SP

- Modelos (Data.Model):
  - Crear `Request` en `Data.Model.Request.<dominio>` y `Response` en `Data.Model.Response.<dominio>`.
- Repositorio (Data.Access):
  - Agregar firma en la interfaz `I<Domino>Repository`.
  - Implementar en `Data.Access.ImplementationsRepo.<dominio>.<Repo>`:
    - Crear `DynamicParameters`, asignar parámetros.
    - Llamar `connection.Query<TResponse>("[dbo].[sp_Nombre]", parameters, commandType: CommandType.StoredProcedure).FirstOrDefault()`.
    - Para múltiples resultsets: `QueryMultiple` y `Read<T>()` por sección.
    - Para listas de detalle: convertir a `DataTable` y pasar como `AsTableValuedParameter("dbo.<TableType>")`.
- UnitOfWork:
  - Exponer el método vía `IUnitOfWork.I<Domino>` (la propiedad del repo) y asegurar que el constructor inicializa dicho repo.
- Lógica (Business.Logic):
  - Exponer método en `I<Domino>Logic` e implementar delegando a `_unitOfWork.I<Domino>.Metodo(...)`.
- Controller (Agenda.Microservice):
  - Crear la acción con la ruta y atributos, recibir `Request`, llamar a lógica y retornar `ResponseDTO`.
- Program.cs (si se agrega una nueva lógica/repositorio):
  - Registrar `I<Domino>Logic` y su implementación (`AddTransient`). `IUnitOfWork` ya se registra.
- Stored Procedure (SQL Server):
  - Implementar el SP con firma alineada a los parámetros de `Request` y a la forma de retorno (`SELECT` de columnas con nombres que mapeen a `Response`).
  - Manejar transacciones (internamente), validaciones y códigos de estado/mensajes.

## Ejemplos de Implementación

- Insertar detalle individual (compatible con SQL Server 2012):

```csharp
// Controller
[HttpPost("caja-mayor/detalle")]
public IActionResult InsertCajaMayorDetalle([FromBody] InsertCajaMayorDetalleRequest request)
{
    _ResponseDTO = new ResponseDTO();
    try
    {
        var response = _cajaLogic.InsertCajaMayorDetalle(request);
        return Ok(_ResponseDTO.Success(_ResponseDTO, response));
    }
    catch (Exception e)
    {
        return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
    }
}

// Logic
public CreateCajaMayorResponse InsertCajaMayorDetalle(InsertCajaMayorDetalleRequest request)
    => _unitOfWork.ICaja.InsertCajaMayorDetalle(request);

// Repository (Dapper)
public CreateCajaMayorResponse InsertCajaMayorDetalle(InsertCajaMayorDetalleRequest request)
{
    var p = new DynamicParameters();
    p.Add("@IdCajaMayor", request.IdCajaMayor);
    p.Add("@IdVenta", request.IdVenta);
    p.Add("@CodigoDocumento", request.CodigoDocumento);
    p.Add("@TipoMovimiento", request.TipoMovimiento);
    p.Add("@ConceptoMovimiento", request.ConceptoMovimiento);
    p.Add("@FechaMovimiento", request.FechaMovimiento);
    p.Add("@Subtotal", request.Subtotal);
    p.Add("@IGV", request.IGV);
    p.Add("@Total", request.Total);
    p.Add("@NumeroDocumento", request.NumeroDocumento);
    p.Add("@SerieDocumento", request.SerieDocumento);
    p.Add("@Observaciones", request.Observaciones);
    p.Add("@InsertaIdUsuario", request.InsertaIdUsuario);
    using var cn = new SqlConnection(_connectionString);
    return cn.Query<CreateCajaMayorResponse>("[dbo].[sp_CajaMayorDetalle_Insert]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
}
```

- Detalle con múltiples resultsets (encabezado + movimientos):

```csharp
public CajaMayorDetalleResponse GetCajaMayorDetalle(int idCajaMayor)
{
    var p = new DynamicParameters();
    p.Add("@IdCajaMayor", idCajaMayor);
    using var cn = new SqlConnection(_connectionString);
    using var multi = cn.QueryMultiple("[dbo].[sp_CajaMayor_GetDetalle]", p, commandType: CommandType.StoredProcedure);
    var header = multi.Read<CajaMayorHeaderResponse>().FirstOrDefault();
    var movimientos = multi.Read<CajaMayorMovimientoResponse>().ToList();
    return new CajaMayorDetalleResponse { Header = header, Movimientos = movimientos };
}
```

- Table-Valued Parameter (TVP) para múltiples movimientos:

```csharp
private DataTable ToDetalleTable(List<CajaMayorDetalleRequest> detalle)
{
    var dt = new DataTable();
    dt.Columns.Add("IdVenta", typeof(string));
    // ... otras columnas
    foreach (var d in detalle)
    {
        var row = dt.NewRow();
        row["IdVenta"] = d.IdVenta ?? (object)DBNull.Value;
        // ... asignaciones
        dt.Rows.Add(row);
    }
    return dt;
}

public CreateCajaMayorResponse CreateCajaMayor(CreateCajaMayorRequest request)
{
    var p = new DynamicParameters();
    // ... parámetros simples
    var tvp = ToDetalleTable(request.Detalle);
    p.Add("@DetalleItems", tvp.AsTableValuedParameter("dbo.CajaMayorDetalleTableType"));
    using var cn = new SqlConnection(_connectionString);
    return cn.Query<CreateCajaMayorResponse>("[dbo].[sp_CajaMayor_CreateUpdate]", p, commandType: CommandType.StoredProcedure).FirstOrDefault();
}
```

## Buenas Prácticas

- `dotnet build` para validar compilación del backend (no usar `run`/`preview`).
- Validar contratos: nombres de columnas devueltos por el SP deben coincidir con propiedades del `Response`.
- Manejo de transacciones: preferible dentro del SP; si se necesita escalamiento, usar `SqlConnection.BeginTransaction()` y pasar `IDbTransaction` a Dapper.
- Errores: capturar `SqlException` y mapear mensajes; no exponer detalles sensibles.
- CORS: ya configurado como “AllowAll” en `Program.cs`.
- Swagger: habilitado en `Development` para explorar endpoints.

## Referencias y Paths

- Microservicio objetivo: `D:\DEV_DBO_SIST\project-csl-bi\SanLorenzoMicroservices\SanLorenzo.Core.Services\Agenda.Microservice\Agenda.Microservice.csproj`
- UnitOfWork: `SanLorenzoMicroservices/SanLorenzo.Core.Services/Data.Access/UnitOfWork.cs`
- Repositorios Caja: `SanLorenzoMicroservices/SanLorenzo.Core.Services/Data.Access/ImplementationsRepo/caja/CajaRepository.cs`
- Lógica Caja: `SanLorenzoMicroservices/SanLorenzo.Core.Services/Business.Logic/ImplementationsBL/caja/CajaLogic.cs`
- Controller Caja: `SanLorenzoMicroservices/SanLorenzo.Core.Services/Agenda.Microservice/Controllers/caja/CajaController.cs`
- Guía de dominio Caja Mayor: `models-DB/docs/CAJA_MAYOR_MENSUAL.md`

## Checklist para Crear Endpoint con SP

- Definir `Request`/`Response` en `Data.Model`.
- Agregar método en `I<Domino>Repository` y su implementación con Dapper.
- Exponer vía `IUnitOfWork.I<Domino>`.
- Agregar método en `I<Domino>Logic` y delegar al repositorio.
- Crear acción en Controller con ruta y atributos.
- Implementar el SP en SQL Server y alinear columnas de salida.
- Validar con `dotnet build`.