using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configuración de CORS para permitir cualquier origen en el gateway
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Host.ConfigureAppConfiguration((hosting, config) =>
{
    config.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);
});

builder.Services.AddOcelot(builder.Configuration);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// CORS debe ir antes de Ocelot
app.UseCors("AllowAll");

app.UseHttpsRedirection();

app.UseAuthorization();

app.UseOcelot().Wait();

app.MapControllers();

app.Run();

