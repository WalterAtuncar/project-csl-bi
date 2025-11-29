# Clínica San Lorenzo - BI System

## Overview
Medical clinic management system with business intelligence capabilities. Built with React frontend and .NET 6 backend microservices architecture with SQL Server database.

**Current State:** Development environment configured and running on Replit.

## Project Architecture

### Frontend (React + Vite)
- **Location:** `react-project/`
- **Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS
- **Port:** 5000 (configured for Replit)
- **Key Features:**
  - Dashboard (General, Financiero, Operaciones)
  - Caja Mayor (Cash management)
  - Cobranzas (Collections)
  - Honorarios Médicos (Medical fees)
  - Consultas BI (Business Intelligence queries)
  - AI-powered analysis using Anthropic Claude

### Backend (.NET 6 Microservices)
- **Location:** `SanLorenzoMicroservices/SanLorenzo.Core.Services/`
- **Tech Stack:** .NET 6, ASP.NET Core, Entity Framework
- **Port:** 8080 (HTTP, localhost)
- **Main Microservice:** Agenda.Microservice
- **Controllers:**
  - CajaController (Cash management)
  - CalendarController
  - DashboardController
  - EspecialidadesController (Medical specialties)
  - AuthController
  - PagoMedicosController (Medical payments)

### Database
- **Type:** SQL Server (External)
- **Connection:** Remote database at 190.116.90.35
- **Database:** SigesoftDesarrollo_2
- **Scripts Location:** `models-DB/`

## Recent Changes (Nov 29, 2025)

### SUNAT Formato 8.1 - Registro de Compras Module
Implemented complete SUNAT-compliant purchase registration integrated with expense tracking:

**Frontend Components:**
- `RegistroComprasModal.tsx` - Main modal with all SUNAT 8.1 fields
  - Provider autocomplete with quick creation
  - Document type (Factura, Boleta, Nota Crédito/Débito, etc.)
  - Serie/Número comprobante
  - Amounts breakdown (Base Imponible, IGV, ISC, etc.)
  - Detraction/Retention controls
- `ProveedorQuickModal.tsx` - Quick provider creation (RUC, Razón Social, Dirección, Email)
- Modified `CajaMayorNew.tsx` to use RegistroComprasModal for expenses

**Backend Endpoints:**
- `GET /api/Caja/proveedores/buscar?termino=X` - Search providers
- `POST /api/Caja/proveedores` - Create provider
- `POST /api/Caja/caja-mayor-cierre/{id}/registro-compras` - Insert purchase record

**Database Scripts (to execute in SQL Server):**
- `scriptCaja/tabla_proveedores.sql` - Providers table
- `scriptCaja/tabla_registro_compras.sql` - Purchase records table (SUNAT 8.1)
- `scriptCaja/sp_Proveedores_Buscar.sql` - Search providers SP
- `scriptCaja/sp_Proveedores_Insert.sql` - Insert provider SP
- `scriptCaja/sp_RegistroCompras_Insert.sql` - Insert purchase record SP

**Integration Pattern:**
Sequential API calls - First insert expense movement, then insert purchase record with id_movimiento_egreso as FK

### Replit Environment Setup
1. Installed Node.js 20 and .NET 8.0 (compatible with .NET 6)
2. Configured Vite dev server:
   - Port: 5000
   - Host: 0.0.0.0
   - HMR configured for Replit proxy (clientPort: 443)
   - **Note:** HMR WebSocket may show intermittent reconnection attempts through Replit's proxy, which is normal behavior
3. Updated backend configuration:
   - Changed port from 7036/5174 to 8080
   - Disabled HTTPS redirection for development
4. Created environment configuration (.env)
   - Points to external production API at http://190.116.90.35:8183/api
5. Set up frontend workflow for automatic deployment on port 5000

### Configuration Files
- **Frontend:** `react-project/vite.config.ts` - Configured for Replit (port 5000, host 0.0.0.0)
- **Backend:** `SanLorenzoMicroservices/SanLorenzo.Core.Services/Agenda.Microservice/Properties/launchSettings.json` - Updated to port 8080 (for future local development)
- **Environment:** `react-project/.env` - Points to external production API (not running in Replit)

**Note:** Backend configuration files were updated for consistency (port 8080, disabled HTTPS redirection), but the backend is not deployed in this Replit environment due to database connectivity requirements.

## Development Workflow

### Running the Application
- **Frontend:** Automatically runs via workflow on port 5000
- **Backend:** The backend microservice is **not running** in this Replit environment. It requires access to an external SQL Server database (at 190.116.90.35) that is not accessible from Replit's cloud environment. 
  - The frontend is configured to connect to the external production API at `http://190.116.90.35:8183/api`
  - For local development with the backend, you would run it separately with access to the database network

### Key Commands
```bash
# Frontend Development
cd react-project
npm install          # Install dependencies
npm run dev          # Run dev server (port 5000)
npm run build        # Build for production
npm run preview      # Preview production build

# Backend (Local development only - requires database access)
cd SanLorenzoMicroservices/SanLorenzo.Core.Services/Agenda.Microservice
dotnet restore       # Restore dependencies
dotnet build         # Build project
dotnet run           # Run on configured port
```

### Deployment
The project is configured for static deployment:
- **Build Command:** `cd react-project && npm run build`
- **Output Directory:** `react-project/dist`
- **Deployment Type:** Static (frontend only)

The deployment configuration builds the React application and serves the static files. The backend API must be deployed separately or accessed from an external server.

## User Preferences
- None documented yet

## External Dependencies
- SQL Server database (external, requires VPN/network access)
- Anthropic API (for AI features, API key in config)
- External APIs configured in appsettings.json

## Notes
- The backend connects to an external SQL Server database that may not be accessible from Replit environment
- HTTPS is disabled in development for simplicity
- CORS is configured to allow all origins in development
- Frontend uses encrypted API keys for Anthropic service
