## Política de validación de errores y builds

Backend (.NET)
- Para validar errores en el backend, ejecutar únicamente `dotnet build`.
- No usar `dotnet run` ni `preview`; estas opciones generan múltiples instancias y vuelven lenta la aplicación.
- Las pruebas funcionales se realizarán manualmente por el usuario.

Frontend (React)
- Para validar errores en el frontend, ejecutar únicamente `npm run build`.
- No usar `npm run dev` ni `preview`.
- Cualquier cosa que se desee probar se hará manualmente a través del usuario.

## Política de conexión a bases de datos (sqlcmd)

- Conexiones por `sqlcmd` se usarán únicamente para ejecutar `SELECT` y obtener datos que ayuden a comprender las bases de datos.
- Ejecuciones de `INSERT`, `UPDATE`, `DELETE` y cualquier DDL (`CREATE`, `ALTER`, `DROP`) se propondrán en el chat como scripts/consultas para que el usuario las evalúe y las ejecute manualmente.
- Cuando corresponda, los scripts de propuesta incluirán `BEGIN TRAN` y `ROLLBACK TRAN` por defecto, y el usuario decidirá cuándo aplicar `COMMIT TRAN`.

## Referencia obligatoria de documentación

- Revisar siempre el plan de Caja Mayor mensual antes de implementar cambios:
  - Ruta absoluta: `d:\DEV_DBO_SIST\project-csl-bi\models-DB\docs\CAJA_MAYOR_MENSUAL.md`
  - Enlace de repo: `models-DB/docs/CAJA_MAYOR_MENSUAL.md`

- Revisar la guía de backend para crear controladores y endpoints con SP:
  - Ruta absoluta: `d:\DEV_DBO_SIST\project-csl-bi\models-DB\docs\BACKEND_CONTROLLER_ENDPOINTS_SP.md`
  - Enlace de repo: `models-DB/docs/BACKEND_CONTROLLER_ENDPOINTS_SP.md`

- Microservicio objetivo actual para endpoints de Caja y Agenda:
  - Ruta absoluta: `d:\DEV_DBO_SIST\project-csl-bi\SanLorenzoMicroservices\SanLorenzo.Core.Services\Agenda.Microservice\Agenda.Microservice.csproj`