// @ts-nocheck
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, Save, Search, Plus, Building2 } from 'lucide-react';
import CajaService from '../../services/CajaService';
import ToastAlerts from '../UI/ToastAlerts';
import ProveedorQuickModal, { type CrearProveedorData, type ProveedorCreado } from './ProveedorQuickModal';

interface RegistroComprasModalProps {
  isOpen: boolean;
  idCajaMayorCierre: number;
  idTipoCaja: number;
  fechaMin?: string;
  fechaMax?: string;
  onClose: () => void;
  onSaved?: () => void;
}

interface ProveedorOption {
  idProveedor: number;
  ruc: string;
  razonSocial: string;
  direccion?: string;
  email?: string;
}

const TIPOS_COMPROBANTE = [
  { codigo: '01', nombre: 'Factura' },
  { codigo: '03', nombre: 'Boleta de Venta' },
  { codigo: '07', nombre: 'Nota de Crédito' },
  { codigo: '08', nombre: 'Nota de Débito' },
  { codigo: '12', nombre: 'Ticket o cinta emitido por máquina registradora' },
  { codigo: '14', nombre: 'Recibo de Servicios Públicos' },
  { codigo: '91', nombre: 'Comprobante emitido por bancos' },
];

const MONEDAS = [
  { codigo: 'PEN', nombre: 'Soles (PEN)' },
  { codigo: 'USD', nombre: 'Dólares (USD)' },
  { codigo: 'EUR', nombre: 'Euros (EUR)' },
];

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const RegistroComprasModal: React.FC<RegistroComprasModalProps> = ({
  isOpen,
  idCajaMayorCierre,
  idTipoCaja,
  fechaMin,
  fechaMax,
  onClose,
  onSaved,
}) => {
  const cajaService = useMemo(() => CajaService.getInstance(), []);

  const [loading, setLoading] = useState(false);
  const [fechaEmision, setFechaEmision] = useState<string>('');
  const [fechaVencimiento, setFechaVencimiento] = useState<string>('');
  const [tipoComprobante, setTipoComprobante] = useState<string>('01');
  const [serie, setSerie] = useState<string>('');
  const [numero, setNumero] = useState<string>('');
  const [baseImponible, setBaseImponible] = useState<number>(0);
  const [baseImponibleInput, setBaseImponibleInput] = useState<string>('0');
  const [igv, setIgv] = useState<number>(0);
  const [igvInput, setIgvInput] = useState<string>('0');
  const [isc, setIsc] = useState<number>(0);
  const [otrosTributos, setOtrosTributos] = useState<number>(0);
  const [valorNoGravado, setValorNoGravado] = useState<number>(0);
  const [importeTotal, setImporteTotal] = useState<number>(0);
  const [importeTotalInput, setImporteTotalInput] = useState<string>('0');
  const [codigoMoneda, setCodigoMoneda] = useState<string>('PEN');
  const [tipoCambio, setTipoCambio] = useState<number>(1);
  const [aplicaDetraccion, setAplicaDetraccion] = useState<boolean>(false);
  const [porcentajeDetraccion, setPorcentajeDetraccion] = useState<number>(0);
  const [montoDetraccion, setMontoDetraccion] = useState<number>(0);
  const [numeroConstanciaDetraccion, setNumeroConstanciaDetraccion] = useState<string>('');
  const [aplicaRetencion, setAplicaRetencion] = useState<boolean>(false);
  const [montoRetencion, setMontoRetencion] = useState<number>(0);
  const [observaciones, setObservaciones] = useState<string>('');
  const [proveedorSearch, setProveedorSearch] = useState<string>('');
  const [proveedorOptions, setProveedorOptions] = useState<ProveedorOption[]>([]);
  const [proveedorSelected, setProveedorSelected] = useState<ProveedorOption | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [calcularDesdeTotal, setCalcularDesdeTotal] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setFechaEmision(fechaMin || today);
      setFechaVencimiento('');
      setTipoComprobante('01');
      setSerie('');
      setNumero('');
      setBaseImponible(0);
      setBaseImponibleInput('0');
      setIgv(0);
      setIgvInput('0');
      setIsc(0);
      setOtrosTributos(0);
      setValorNoGravado(0);
      setImporteTotal(0);
      setImporteTotalInput('0');
      setCodigoMoneda('PEN');
      setTipoCambio(1);
      setAplicaDetraccion(false);
      setPorcentajeDetraccion(0);
      setMontoDetraccion(0);
      setNumeroConstanciaDetraccion('');
      setAplicaRetencion(false);
      setMontoRetencion(0);
      setObservaciones('');
      setProveedorSearch('');
      setProveedorOptions([]);
      setProveedorSelected(null);
      setCalcuarDesdeTotal(true);
    }
  }, [isOpen, fechaMin]);

  const setCalcuarDesdeTotal = (val: boolean) => setCalcularDesdeTotal(val);

  useEffect(() => {
    if (calcularDesdeTotal && importeTotal > 0) {
      const base = importeTotal / 1.18;
      const igvCalc = importeTotal - base;
      setBaseImponible(round2(base));
      setBaseImponibleInput(formatMoney(round2(base)));
      setIgv(round2(igvCalc));
      setIgvInput(formatMoney(round2(igvCalc)));
    }
  }, [importeTotal, calcularDesdeTotal]);

  useEffect(() => {
    if (!calcularDesdeTotal) {
      const total = baseImponible + igv + isc + otrosTributos + valorNoGravado;
      setImporteTotal(round2(total));
      setImporteTotalInput(formatMoney(round2(total)));
    }
  }, [baseImponible, igv, isc, otrosTributos, valorNoGravado, calcularDesdeTotal]);

  useEffect(() => {
    if (aplicaDetraccion && porcentajeDetraccion > 0 && importeTotal > 0) {
      const monto = (importeTotal * porcentajeDetraccion) / 100;
      setMontoDetraccion(round2(monto));
    } else {
      setMontoDetraccion(0);
    }
  }, [aplicaDetraccion, porcentajeDetraccion, importeTotal]);

  const formatMoney = (n: number) => {
    try {
      return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch {
      return String(n);
    }
  };

  const parseMoneyInput = (str: string) => {
    const s = (str || '').replace(/\s/g, '');
    const hasComma = s.includes(',');
    const hasDot = s.includes('.');
    let normalized = s;
    if (hasComma && hasDot) {
      const lastComma = s.lastIndexOf(',');
      const lastDot = s.lastIndexOf('.');
      if (lastComma > lastDot) {
        normalized = s.replace(/\./g, '').replace(',', '.');
      } else {
        normalized = s.replace(/,/g, '');
      }
    } else if (hasComma && !hasDot) {
      normalized = s.replace(',', '.');
    }
    normalized = normalized.replace(/[^0-9.]/g, '');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  const handleImporteTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseMoneyInput(raw);
    setImporteTotal(num);
    setImporteTotalInput(raw);
    setCalcularDesdeTotal(true);
  };

  const handleImporteTotalBlur = () => {
    setImporteTotalInput(formatMoney(importeTotal));
  };

  const handleImporteTotalFocus = () => {
    setImporteTotalInput(String(importeTotal ?? 0));
  };

  const handleBaseImponibleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseMoneyInput(raw);
    setBaseImponible(num);
    setBaseImponibleInput(raw);
    setCalcularDesdeTotal(false);
  };

  const handleBaseImponibleBlur = () => {
    setBaseImponibleInput(formatMoney(baseImponible));
  };

  const handleBaseImponibleFocus = () => {
    setBaseImponibleInput(String(baseImponible ?? 0));
  };

  const handleIgvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseMoneyInput(raw);
    setIgv(num);
    setIgvInput(raw);
    setCalcularDesdeTotal(false);
  };

  const handleIgvBlur = () => {
    setIgvInput(formatMoney(igv));
  };

  const handleIgvFocus = () => {
    setIgvInput(String(igv ?? 0));
  };

  const searchProveedores = useCallback(async (term: string) => {
    if (term.length < 2) {
      setProveedorOptions([]);
      setShowDropdown(false);
      return;
    }
    try {
      setSearchLoading(true);
      const resp = await cajaService.buscarProveedores(term);
      const list = Array.isArray(resp?.objModel) ? resp.objModel : [];
      setProveedorOptions(list);
      setShowDropdown(true);
    } catch (e) {
      setProveedorOptions([]);
    } finally {
      setSearchLoading(false);
    }
  }, [cajaService]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (proveedorSearch.length >= 2 && !proveedorSelected) {
        searchProveedores(proveedorSearch);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [proveedorSearch, proveedorSelected, searchProveedores]);

  const handleSelectProveedor = (prov: ProveedorOption) => {
    setProveedorSelected(prov);
    setProveedorSearch(`${prov.ruc} - ${prov.razonSocial}`);
    setShowDropdown(false);
  };

  const handleClearProveedor = () => {
    setProveedorSelected(null);
    setProveedorSearch('');
    setProveedorOptions([]);
  };

  const handleCrearProveedor = async (data: CrearProveedorData): Promise<ProveedorCreado> => {
    const resp = await cajaService.crearProveedor(data);
    const created = resp?.objModel;
    if (!created) throw new Error('No se obtuvo respuesta del servidor');
    return created;
  };

  const handleProveedorCreated = (prov: ProveedorCreado) => {
    setProveedorSelected({
      idProveedor: prov.idProveedor,
      ruc: prov.ruc,
      razonSocial: prov.razonSocial,
      direccion: prov.direccion,
      email: prov.email,
    });
    setProveedorSearch(`${prov.ruc} - ${prov.razonSocial}`);
    setShowProveedorModal(false);
  };

  const handleSubmit = async () => {
    if (!proveedorSelected) {
      ToastAlerts.warning({ title: 'Proveedor requerido', message: 'Seleccione o cree un proveedor.' });
      return;
    }
    if (!fechaEmision) {
      ToastAlerts.warning({ title: 'Fecha requerida', message: 'Ingrese la fecha de emisión.' });
      return;
    }
    if (!serie?.trim() || !numero?.trim()) {
      ToastAlerts.warning({ title: 'Comprobante requerido', message: 'Ingrese la serie y número del comprobante.' });
      return;
    }
    if (importeTotal <= 0) {
      ToastAlerts.warning({ title: 'Importe inválido', message: 'El importe total debe ser mayor a 0.' });
      return;
    }

    try {
      setLoading(true);

      const egresoBody = {
        idTipoCaja,
        tipoMovimiento: 'E',
        total: round2(importeTotal),
        fechaRegistro: `${fechaEmision}T00:00:00`,
        observaciones: observaciones || `Compra ${serie}-${numero}`,
        conceptoMovimiento: proveedorSelected.razonSocial,
        subtotal: baseImponible > 0 ? baseImponible : null,
        igv: igv > 0 ? igv : null,
        origen: 'registro_compras',
        codigoDocumento: tipoComprobante,
        serieDocumento: serie.trim(),
        numeroDocumento: numero.trim(),
        idVenta: '---',
      };

      const egresoResp = await cajaService.insertMovimientoManual(idCajaMayorCierre, egresoBody);
      const egresoData = egresoResp?.objModel;
      const idMovimiento = egresoData?.idMovimiento || egresoData?.i_IdMovimiento;

      if (!idMovimiento) {
        ToastAlerts.error({ title: 'Error', message: 'No se pudo obtener el ID del movimiento de egreso.' });
        return;
      }

      const registroComprasBody = {
        idMovimientoEgreso: idMovimiento,
        idProveedor: proveedorSelected.idProveedor,
        rucProveedor: proveedorSelected.ruc,
        razonSocialProveedor: proveedorSelected.razonSocial,
        fechaEmision: fechaEmision,
        fechaVencimiento: fechaVencimiento || null,
        tipoComprobante: tipoComprobante,
        serie: serie.trim(),
        numero: numero.trim(),
        baseImponible: baseImponible,
        igv: igv,
        isc: isc,
        otrosTributos: otrosTributos,
        valorNoGravado: valorNoGravado,
        importeTotal: importeTotal,
        codigoMoneda: codigoMoneda,
        tipoCambio: tipoCambio,
        aplicaDetraccion: aplicaDetraccion,
        porcentajeDetraccion: aplicaDetraccion ? porcentajeDetraccion : null,
        montoDetraccion: aplicaDetraccion ? montoDetraccion : null,
        numeroConstanciaDetraccion: aplicaDetraccion ? numeroConstanciaDetraccion : null,
        aplicaRetencion: aplicaRetencion,
        montoRetencion: aplicaRetencion ? montoRetencion : null,
        observaciones: observaciones,
      };

      await cajaService.insertRegistroCompras(idCajaMayorCierre, registroComprasBody);

      ToastAlerts.success({ title: 'Registro exitoso', message: 'Egreso y registro de compras guardados correctamente.' });
      onSaved && onSaved();
      onClose();
    } catch (e: any) {
      ToastAlerts.error({ title: 'Error', message: e?.message || 'Fallo al registrar la compra.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 my-4"
            >
              <div className="px-6 py-4 bg-red-600 text-white rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <h3 className="text-lg font-semibold text-white">Registro de Compras (Egreso)</h3>
                </div>
                <button className="p-2 rounded-md hover:bg-red-700" onClick={onClose}>
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Proveedor
                  </h4>
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white pr-10"
                          placeholder="Buscar por RUC o Razón Social..."
                          value={proveedorSearch}
                          onChange={(e) => {
                            setProveedorSearch(e.target.value);
                            if (proveedorSelected) setProveedorSelected(null);
                          }}
                          onFocus={() => proveedorOptions.length > 0 && setShowDropdown(true)}
                        />
                        {searchLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                          </div>
                        )}
                        {!searchLoading && proveedorSearch && (
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={handleClearProveedor}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <motion.button
                        type="button"
                        onClick={() => setShowProveedorModal(true)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus className="w-4 h-4" />
                        Nuevo
                      </motion.button>
                    </div>

                    {showDropdown && proveedorOptions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {proveedorOptions.map((p) => (
                          <button
                            key={p.idProveedor}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white"
                            onClick={() => handleSelectProveedor(p)}
                          >
                            <span className="font-medium">{p.ruc}</span>
                            <span className="mx-2">-</span>
                            <span>{p.razonSocial}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {showDropdown && proveedorOptions.length === 0 && proveedorSearch.length >= 2 && !searchLoading && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-3 text-center text-sm text-gray-500">
                        No se encontraron proveedores.
                        <button
                          type="button"
                          className="ml-2 text-blue-600 hover:underline"
                          onClick={() => setShowProveedorModal(true)}
                        >
                          Crear nuevo
                        </button>
                      </div>
                    )}
                  </div>

                  {proveedorSelected && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 text-sm">
                      <span className="text-green-700 dark:text-green-400 font-medium">Seleccionado:</span>
                      <span className="ml-2 text-gray-700 dark:text-gray-300">{proveedorSelected.razonSocial}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tipo Comprobante <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                      value={tipoComprobante}
                      onChange={(e) => setTipoComprobante(e.target.value)}
                    >
                      {TIPOS_COMPROBANTE.map((t) => (
                        <option key={t.codigo} value={t.codigo}>
                          {t.codigo} - {t.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Serie <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white uppercase"
                      placeholder="Ej: F001"
                      value={serie}
                      onChange={(e) => setSerie(e.target.value.toUpperCase())}
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Número <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ej: 00001234"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
                      maxLength={20}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fecha Emisión <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                      value={fechaEmision}
                      min={fechaMin || undefined}
                      max={fechaMax || undefined}
                      onChange={(e) => setFechaEmision(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fecha Vencimiento
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">Importes</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      id="calcDesdeTotal"
                      type="checkbox"
                      checked={calcularDesdeTotal}
                      onChange={(e) => setCalcularDesdeTotal(e.target.checked)}
                    />
                    <label htmlFor="calcDesdeTotal" className="text-sm text-gray-700 dark:text-gray-300">
                      Calcular Base e IGV desde Total (18%)
                    </label>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Base Imponible
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        value={baseImponibleInput}
                        onChange={handleBaseImponibleChange}
                        onBlur={handleBaseImponibleBlur}
                        onFocus={handleBaseImponibleFocus}
                        disabled={calcularDesdeTotal}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        IGV (18%)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        value={igvInput}
                        onChange={handleIgvChange}
                        onBlur={handleIgvBlur}
                        onFocus={handleIgvFocus}
                        disabled={calcularDesdeTotal}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        ISC
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        value={isc}
                        onChange={(e) => setIsc(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Otros Tributos
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        value={otrosTributos}
                        onChange={(e) => setOtrosTributos(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Valor No Gravado
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        value={valorNoGravado}
                        onChange={(e) => setValorNoGravado(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1 font-bold">
                        IMPORTE TOTAL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full px-3 py-2 border-2 rounded-md bg-white dark:bg-gray-800 border-blue-500 text-gray-900 dark:text-white font-bold text-lg"
                        value={importeTotalInput}
                        onChange={handleImporteTotalChange}
                        onBlur={handleImporteTotalBlur}
                        onFocus={handleImporteTotalFocus}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Moneda
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                      value={codigoMoneda}
                      onChange={(e) => setCodigoMoneda(e.target.value)}
                    >
                      {MONEDAS.map((m) => (
                        <option key={m.codigo} value={m.codigo}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tipo de Cambio
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                      value={tipoCambio}
                      onChange={(e) => setTipoCambio(parseFloat(e.target.value) || 1)}
                      disabled={codigoMoneda === 'PEN'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        id="aplicaDetraccion"
                        type="checkbox"
                        checked={aplicaDetraccion}
                        onChange={(e) => setAplicaDetraccion(e.target.checked)}
                      />
                      <label htmlFor="aplicaDetraccion" className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                        Aplica Detracción
                      </label>
                    </div>
                    {aplicaDetraccion && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">% Detracción</label>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                            value={porcentajeDetraccion}
                            onChange={(e) => setPorcentajeDetraccion(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Monto</label>
                          <input
                            type="text"
                            className="w-full px-2 py-1 border rounded text-sm bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                            value={formatMoney(montoDetraccion)}
                            disabled
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">N° Constancia</label>
                          <input
                            type="text"
                            className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                            value={numeroConstanciaDetraccion}
                            onChange={(e) => setNumeroConstanciaDetraccion(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        id="aplicaRetencion"
                        type="checkbox"
                        checked={aplicaRetencion}
                        onChange={(e) => setAplicaRetencion(e.target.checked)}
                      />
                      <label htmlFor="aplicaRetencion" className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        Aplica Retención
                      </label>
                    </div>
                    {aplicaRetencion && (
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Monto Retención</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                          value={montoRetencion}
                          onChange={(e) => setMontoRetencion(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                    rows={2}
                    placeholder="Observaciones adicionales (opcional)"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                <motion.button
                  onClick={onClose}
                  className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-2 inline" />
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="inline-flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </span>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2 inline" />
                      Registrar Compra
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProveedorQuickModal
        isOpen={showProveedorModal}
        rucInicial={proveedorSearch.replace(/\D/g, '').substring(0, 11)}
        onClose={() => setShowProveedorModal(false)}
        onSaved={handleProveedorCreated}
        onCrearProveedor={handleCrearProveedor}
      />
    </>
  );
};

export default RegistroComprasModal;
