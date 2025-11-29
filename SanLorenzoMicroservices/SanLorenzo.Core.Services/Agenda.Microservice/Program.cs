using UnitOfWork;
using Data.Access;
using Business.Logic.IContractsBL.calendar;
using Business.Logic.ImplementationsBL.calendar;
using Repositories.IContractsRepo.person;
using Data.Access.ImplementationsRepo.person;
using Business.Logic.IContractsBL.person;
using Business.Logic.ImplementationsBL.person;
using Business.Logic.IContractsBL.caja;
using Business.Logic.ImplementationsBL.caja;
using Business.Logic.IContractsBL.especialidades;
using Business.Logic.ImplementationsBL.especialidades;
using Business.Logic.IContractsBL.pagomedico;
using Business.Logic.ImplementationsBL.pagomedico;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configuración de CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddSingleton<IUnitOfWork>(option => new Data.Access.UnitOfWork(builder.Configuration.GetConnectionString("local")));
builder.Services.AddTransient<ICalendarLogic, calendarLogic>();
builder.Services.AddTransient<IProductsLogic, ProductsLogic>();
builder.Services.AddTransient<ISystemUserLogic, systemUserLogic>();
builder.Services.AddTransient<ICajaLogic, CajaLogic>();
builder.Services.AddTransient<IEspecialidadesLogic, EspecialidadesLogic>();
builder.Services.AddTransient<IPagoMedicosLogic, PagoMedicosLogic>();
var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Habilitar CORS
app.UseCors("AllowAll");

app.UseAuthorization();

app.MapControllers();

app.Run();
