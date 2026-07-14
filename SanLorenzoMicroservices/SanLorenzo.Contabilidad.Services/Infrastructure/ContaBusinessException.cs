namespace Contabilidad.Infrastructure
{
    /// <summary>
    /// Error de negocio con mensaje ya apto para el usuario final.
    /// El middleware global lo mapea a HTTP 400 { message } (mismo shape que un RAISERROR de SP).
    /// Usar para traducir errores crudos (p.ej. violacion de indice unico) a texto que el front entiende.
    /// </summary>
    public class ContaBusinessException : Exception
    {
        public ContaBusinessException(string message) : base(message) { }
    }
}
