## Política de validación de errores y builds

Backend (.NET)
- Para validar errores en el backend, ejecutar únicamente `dotnet build`.
- No usar `dotnet run` ni `preview`; estas opciones generan múltiples instancias y vuelven lenta la aplicación.
- Las pruebas funcionales se realizarán manualmente por el usuario.

Frontend (React)
- Para validar errores en el frontend, ejecutar únicamente `npm run build`.
- No usar `npm run dev` ni `preview`.
- Cualquier cosa que se desee probar se hará manualmente a través del usuario.