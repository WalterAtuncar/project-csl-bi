using Data.Access.ImplementationsRepo.calendar;
using Data.Access.ImplementationsRepo.cobranza;
using Data.Access.ImplementationsRepo.caja;
using Data.Access.ImplementationsRepo.especialidades;
using Data.Access.ImplementationsRepo.gerencia;
using Data.Access.ImplementationsRepo.pagomedico;
using Data.Access.ImplementationsRepo.person;
using Data.Access.ImplementationsRepo.reportes;
using Data.Access.ImplementationsRepo.service;
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
using UnitOfWork;

namespace Data.Access
{
    public class UnitOfWork : IUnitOfWork
    {
        public ICalendarRepository ICalendar { get; }

        public IPersonRepository IPerson { get; }

        public ICobranzaRepository ICobranza { get; }

        public ICajaRepository ICaja { get; }

        public IServiceRepository IService { get; }

        public IOrdenreporteRepository IOrdenreporte { get; }

        public IReportesGerenciaRepository IReportesGerencia { get; }
        public IProductsRepository IProducts { get; }

        public ISystemUserRepository ISystemUser { get; }

        public IEspecialidadesRepository IEspecialidades { get; }

        public IPagoMedicosRepository IPagoMedicos { get; }

        public UnitOfWork(string connectionString)
        {
            ICalendar = new calendarRepository(connectionString);
            IPerson = new personRepository(connectionString);
            ICobranza = new cobranzaRepository(connectionString);
            ICaja = new CajaRepository(connectionString);
            IService = new serviceRepository(connectionString);
            IOrdenreporte = new OrdenReporteRepository(connectionString);
            IReportesGerencia = new ReportesGerenciaRepository(connectionString);
            IProducts = new ProductsRepository(connectionString);
            ISystemUser = new systemUserRepository(connectionString);
            IEspecialidades = new EspecialidadesRepository(connectionString);
            IPagoMedicos = new PagoMedicosRepository(connectionString);
        }
    }
}
