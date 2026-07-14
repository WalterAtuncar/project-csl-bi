using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Contabilidad.Infrastructure;
using Contabilidad.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy = null); // JSON = nombres C# (i_IdEgreso, Receptor...)
builder.Services.AddEndpointsApiExplorer();

// Swagger con soporte de Bearer token
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "SanLorenzo Contabilidad API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Ingrese el JWT (sin la palabra Bearer)."
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

// CORS abierto (igual que los microservicios existentes)
builder.Services.AddCors(o => o.AddPolicy("AllowAll",
    p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

// JWT
var jwtKey = builder.Configuration["Jwt:Key"];
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });
builder.Services.AddAuthorization();

// DI
builder.Services.AddSingleton<Db>();
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddScoped<AuthRepository>();
builder.Services.AddScoped<CatalogoRepository>();
builder.Services.AddScoped<EgresoRepository>();
builder.Services.AddScoped<CajaRepository>();
builder.Services.AddScoped<RentabilidadRepository>();
builder.Services.AddScoped<SisolRepository>();
builder.Services.AddScoped<CompraRepository>();
builder.Services.AddScoped<HonorariosRepository>();
builder.Services.AddScoped<ReconciliacionRepository>();
builder.Services.AddScoped<EpidemiologiaRepository>();

// Poller de reconciliacion de caja legacy (BackgroundService). KILL SWITCH: Reconciliacion:Enabled.
builder.Services.Configure<ReconciliacionOptions>(builder.Configuration.GetSection("Reconciliacion"));
builder.Services.AddSingleton<ReconciliacionRunner>();
builder.Services.AddHostedService<ReconciliacionHostedService>();

// Cliente legacy para el login unificado (server-to-server; la contrasena solo transita).
builder.Services.AddHttpClient<LegacyAuthClient>((sp, client) =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var baseUrl = cfg["Legacy:BaseUrl"] ?? "http://190.116.90.35:8183/api";
    if (!baseUrl.EndsWith("/")) baseUrl += "/";   // BaseAddress con '/' final: "Auth/Login" relativo conserva /api
    client.BaseAddress = new Uri(baseUrl);
    client.Timeout = TimeSpan.FromSeconds(cfg.GetValue<int?>("Legacy:TimeoutSeconds") ?? 10);
});

var app = builder.Build();

// Manejo global de errores: convierte RAISERROR de los SP en 400 con mensaje legible.
app.Use(async (ctx, next) =>
{
    try { await next(); }
    catch (Contabilidad.Infrastructure.ContaBusinessException ex)
    {
        // Error de negocio ya traducido a texto para el usuario (mismo shape que un RAISERROR).
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsJsonAsync(new { message = ex.Message });
    }
    catch (System.Data.SqlClient.SqlException ex)
    {
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsJsonAsync(new { message = ex.Message });
    }
    catch (Exception ex)
    {
        ctx.Response.StatusCode = 500;
        await ctx.Response.WriteAsJsonAsync(new { message = ex.Message });
    }
});

// Swagger UI solo en Development. En otros entornos la raiz muestra un aviso simple.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "SanLorenzo Contabilidad API v1"));
}
else
{
    app.MapGet("/", () => Results.Content(
        "<p>SanLorenzo Contabilidad API - running</p>", "text/html; charset=utf-8"));
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
