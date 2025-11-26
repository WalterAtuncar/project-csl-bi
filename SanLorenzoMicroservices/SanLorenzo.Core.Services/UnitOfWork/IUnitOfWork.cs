using Repositories.IContractsRepo.calendar;
using Repositories.IContractsRepo.cobranza;
using Repositories.IContractsRepo.caja;
using Repositories.IContractsRepo.especialidades;
using Repositories.IContractsRepo.gerencia;
using Repositories.IContractsRepo.pagomedico;
using Repositories.IContractsRepo.person;
using Repositories.IContractsRepo.reportes;
using Repositories.IContractsRepo.service;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace UnitOfWork
{
    public interface IUnitOfWork
    {
        ICalendarRepository ICalendar { get; }
        IPersonRepository IPerson { get; }
        ICobranzaRepository ICobranza { get; }
        ICajaRepository ICaja { get; }
        IServiceRepository IService { get; }
        IOrdenreporteRepository IOrdenreporte { get; }
        IReportesGerenciaRepository IReportesGerencia { get; }
        IProductsRepository IProducts { get; }
        ISystemUserRepository ISystemUser { get; }
        IEspecialidadesRepository IEspecialidades { get; }
        IPagoMedicosRepository IPagoMedicos { get; }
    }
}
