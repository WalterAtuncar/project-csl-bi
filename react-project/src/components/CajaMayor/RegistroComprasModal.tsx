// @ts-nocheck
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, Save, Search, Plus, Building2 } from 'lucide-react';
import CajaService from '../../services/CajaService';
import ToastAlerts from '../UI/ToastAlerts';
import ProveedorQuickModal, { type CrearProveedorData, type ProveedorCreado } from './ProveedorQuickModal';
import type { CajaMayorMovimientoDbResponse } from '../../@types/caja';

export interface RegistroComprasFormData {
  fechaEmision?: string;
  fechaVencimiento?: string;
  tipoComprobante?: string;
  serie?: string;
  numero?: string;
  baseImponible?: number;
  igv?: number;
  isc?: number;
  otrosTributos?: number;
  valorNoGravado?: number;
  importeTotal?: number;
  codigoMoneda?: string;
  tipoCambio?: number;
  aplicaDetraccion?: boolean;
  porcentajeDetraccion?: number;
  montoDetraccion?: number;
  numeroConstanciaDetraccion?: string;
  aplicaRetencion?: boolean;
  montoRetencion?: number;
  observaciones?: string;
  proveedor?: ProveedorOption | null;
  idFamiliaEgreso?: number | null;
  idTipoEgreso?: number | null;
}

interface RegistroComprasModalProps {
  isOpen: boolean;
  idCajaMayorCierre: number;
  idTipoCaja: number;
  fechaMin?: string;
  fechaMax?: string;
  onClose: () => void;
  onSaved?: () => void;
  mode?: 'create' | 'edit';
  initialData?: RegistroComprasFormData;
  onCompraRegistrada?: (info: { idProveedor: number; razonSocialProveedor: string; rucProveedor: string; idMovimientoEgreso: number; fechaEmision: string }) => void;
}

interface ProveedorOption {
  idProveedor: number;
  ruc: string;
  razonSocial: string;
  direccion?: string;
  email?: string;
}

// Tipos de comprobante se cargan dinámicamente desde categorías de egreso (groupId=153)
type TipoComprobanteItem = { codigo: string; label: string; key?: number; parentKeyId?: number };
type TipoMonedaItem = { codigo: string; label: string; key?: number; parentKeyId?: number };

// Monedas se cargan dinámicamente desde categorías de egreso (groupId=154)

// Catálogo dinámico de Familias/Tipos de Egreso desde API
type CategoriaItem = { id: number; nombre: string; key?: number; parentKeyId?: number };
const mapCategoria = (c: any): CategoriaItem => ({
  id: c.key ?? c.Key ?? 0,
  nombre: c.value1 ?? c.Value1 ?? '',
  parentKeyId: c.parentKeyId ?? c.ParentKeyId ?? undefined,
});

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const RegistroComprasModal: React.FC<RegistroComprasModalProps> = ({
  isOpen,
  idCajaMayorCierre,
  idTipoCaja,
  fechaMin,
  fechaMax,
  onClose,
  onSaved,
  mode = 'create',
  initialData,
  onCompraRegistrada,
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
  const [idFamiliaEgreso, setIdFamiliaEgreso] = useState<number | null>(null);
  const [idTipoEgreso, setIdTipoEgreso] = useState<number | null>(null);
  const [familiasEgresoOpts, setFamiliasEgresoOpts] = useState<{ id: number; nombre: string }[]>([]);
  const [tiposEgresoOpts, setTiposEgresoOpts] = useState<{ id: number; nombre: string }[]>([]);
  const [categoriasCatalogo, setCategoriasCatalogo] = useState<CategoriaItem[]>([]);
  const [tipoComprobanteOpts, setTipoComprobanteOpts] = useState<TipoComprobanteItem[]>([]);
  const [monedaOpts, setMonedaOpts] = useState<TipoMonedaItem[]>([]);
  const [skipNextTotalRecalc, setSkipNextTotalRecalc] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      const useInitial = !!initialData;
      const data = initialData ?? {};
      setFechaEmision(useInitial ? (data.fechaEmision ?? (fechaMin || today)) : (fechaMin || today));
      setFechaVencimiento(useInitial ? (data.fechaVencimiento ?? '') : '');
      setTipoComprobante(useInitial ? (data.tipoComprobante ?? '01') : '01');
      setSerie(useInitial ? (data.serie ?? '') : '');
      setNumero(useInitial ? (data.numero ?? '') : '');
      const bi = useInitial ? (data.baseImponible ?? 0) : 0;
      setBaseImponible(bi);
      setBaseImponibleInput(String(bi));
      const igvInit = useInitial ? (data.igv ?? 0) : 0;
      setIgv(igvInit);
      setIgvInput(String(igvInit));
      setIsc(useInitial ? (data.isc ?? 0) : 0);
      setOtrosTributos(useInitial ? (data.otrosTributos ?? 0) : 0);
      setValorNoGravado(useInitial ? (data.valorNoGravado ?? 0) : 0);
      const imp = useInitial ? (data.importeTotal ?? 0) : 0;
      setImporteTotal(imp);
      setImporteTotalInput(String(imp));
      setCodigoMoneda(useInitial ? (data.codigoMoneda ?? 'PEN') : 'PEN');
      setTipoCambio(useInitial ? (data.tipoCambio ?? 1) : 1);
      setAplicaDetraccion(useInitial ? (data.aplicaDetraccion ?? false) : false);
      setPorcentajeDetraccion(useInitial ? (data.porcentajeDetraccion ?? 0) : 0);
      setMontoDetraccion(useInitial ? (data.montoDetraccion ?? 0) : 0);
      setNumeroConstanciaDetraccion(useInitial ? (data.numeroConstanciaDetraccion ?? '') : '');
      setAplicaRetencion(useInitial ? (data.aplicaRetencion ?? false) : false);
      setMontoRetencion(useInitial ? (data.montoRetencion ?? 0) : 0);
      setObservaciones(useInitial ? (data.observaciones ?? '') : '');
      setProveedorSearch('');
      setProveedorOptions([]);
      setProveedorSelected(useInitial ? (data.proveedor ?? null) : null);
      setCalcularDesdeTotal(true);
      setIdFamiliaEgreso(useInitial ? (data.idFamiliaEgreso ?? null) : null);
      setIdTipoEgreso(useInitial ? (data.idTipoEgreso ?? null) : null);
      // Cargar catálogo completo (groupId = 152); familias tienen ParentKeyId = -1
      (async () => {
        try {
          const resp = await cajaService.getCategoriasEgreso(152);
          const rawList = Array.isArray(resp?.objModel) ? resp.objModel : [];
          const mapped = rawList.map(mapCategoria);
          setCategoriasCatalogo(mapped);
          const familias = mapped
            .filter((x) => (x.parentKeyId ?? -1) === -1 && !!x.nombre)
            .map((x) => ({ id: x.id, nombre: x.nombre }));
          setFamiliasEgresoOpts(familias);
        } catch (err) {
          console.warn('No se pudo cargar familias de egreso:', err);
          setFamiliasEgresoOpts([]);
          setCategoriasCatalogo([]);
        }
      })();
      // Cargar tipos de comprobante (groupId = 153)
      (async () => {
        try {
          const resp = await cajaService.getCategoriasEgreso(153);
          const list = Array.isArray(resp?.objModel) ? resp.objModel : [];
          const items: TipoComprobanteItem[] = list
            .filter((c: any) => (c.parentKeyId ?? c.ParentKeyId ?? -1) === -1 && (c.value2 ?? c.Value2))
            .map((c: any) => {
              const code = String(c.value2 ?? c.Value2);
              const name = String(c.value1 ?? c.Value1 ?? '');
              return { codigo: code, label: `${code} - ${name}`, key: c.key ?? c.Key, parentKeyId: c.parentKeyId ?? c.ParentKeyId };
            });
          setTipoComprobanteOpts(items);
          // Ajustar valor seleccionado si no existe en catálogo
          const codes = items.map((i) => i.codigo);
          if (!codes.includes(tipoComprobante)) {
            if (codes.includes('01')) setTipoComprobante('01');
            else if (codes.length > 0) setTipoComprobante(codes[0]);
          }
        } catch (err) {
          console.warn('No se pudo cargar tipos de comprobante (groupId=153):', err);
          setTipoComprobanteOpts([]);
        }
      })();
      // Cargar monedas (groupId = 154)
      (async () => {
        try {
          const resp = await cajaService.getCategoriasEgreso(154);
          const list = Array.isArray(resp?.objModel) ? resp.objModel : [];
          const items: TipoMonedaItem[] = list
            .filter((c: any) => (c.parentKeyId ?? c.ParentKeyId ?? -1) === -1 && (c.value2 ?? c.Value2))
            .map((c: any) => {
              const code = String(c.value2 ?? c.Value2); // key = Value2 (PEN|USD|EUR)
              const name = String(c.value1 ?? c.Value1 ?? ''); // value = Value1 (Soles (PEN) ...)
              return { codigo: code, label: name, key: c.key ?? c.Key, parentKeyId: c.parentKeyId ?? c.ParentKeyId };
            });
          setMonedaOpts(items);
          const codes = items.map((i) => i.codigo);
          if (!codes.includes(codigoMoneda)) {
            if (codes.includes('PEN')) setCodigoMoneda('PEN');
            else if (codes.length > 0) setCodigoMoneda(codes[0]);
          }
        } catch (err) {
          console.warn('No se pudo cargar monedas (groupId=154):', err);
          setMonedaOpts([]);
        }
      })();
    }
  }, [isOpen, fechaMin, mode, initialData]);

  const setCalcuarDesdeTotal = (val: boolean) => setCalcularDesdeTotal(val);

  useEffect(() => {
    if (calcularDesdeTotal) {
      if (importeTotal > 0) {
        const base = importeTotal / 1.18;
        const igvCalc = importeTotal - base;
        setBaseImponible(round2(base));
        setBaseImponibleInput(formatMoney(round2(base)));
        setIgv(round2(igvCalc));
        setIgvInput(formatMoney(round2(igvCalc)));
      } else {
        setBaseImponible(0);
        setBaseImponibleInput('0');
        setIgv(0);
        setIgvInput('0');
      }
    } else {
      setBaseImponible(0);
      setBaseImponibleInput('0');
      setIgv(0);
      setIgvInput('0');
    }
  }, [importeTotal, calcularDesdeTotal]);

  useEffect(() => {
    if (!calcularDesdeTotal) {
      if (skipNextTotalRecalc) {
        setSkipNextTotalRecalc(false);
        return;
      }
      const total = baseImponible + igv + isc + otrosTributos + valorNoGravado;
      setImporteTotal(round2(total));
      setImporteTotalInput(formatMoney(round2(total)));
    }
  }, [baseImponible, igv, isc, otrosTributos, valorNoGravado]);

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

  // Filtrar Tipos de Egreso desde el catálogo según la familia seleccionada
  useEffect(() => {
    if (idFamiliaEgreso) {
      const tipos = categoriasCatalogo
        .filter((x) => (x.parentKeyId ?? 0) === idFamiliaEgreso && !!x.nombre)
        .map((x) => ({ id: x.id, nombre: x.nombre }));
      setTiposEgresoOpts(tipos);
    } else {
      setTiposEgresoOpts([]);
    }
  }, [idFamiliaEgreso, categoriasCatalogo]);

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
    setShowDropdown(false);
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
    // Serie y número ahora pueden ser opcionales; se permiten en blanco
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
        observaciones: observaciones || (serie?.trim() || numero?.trim() ? `Compra ${serie?.trim() || ''}${(serie?.trim() && numero?.trim()) ? '-' : ''}${numero?.trim() || ''}` : 'Compra'),
        conceptoMovimiento: proveedorSelected.razonSocial,
        subtotal: baseImponible > 0 ? baseImponible : null,
        igv: igv > 0 ? igv : null,
        origen: initialData?.origen ?? 'registro_compras',
        codigoDocumento: tipoComprobante,
        serieDocumento: (serie?.trim() || undefined),
        numeroDocumento: (numero?.trim() || undefined),
        idVenta: '---',
      };

      const egresoResp = await cajaService.insertMovimientoManual(idCajaMayorCierre, egresoBody);
      const egresoData = egresoResp?.objModel as CajaMayorMovimientoDbResponse;
      const idMovimiento = egresoData?.idMovimiento ?? egresoData?.i_IdMovimiento ?? null;
      console.debug('[RegistroComprasModal] Egreso creado', { egresoData, idMovimiento });

      if (!idMovimiento || idMovimiento <= 0) {
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
        serie: (serie?.trim() || null),
        numero: (numero?.trim() || null),
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
        idFamiliaEgreso: idFamiliaEgreso,
        idTipoEgreso: idTipoEgreso,
      };

      console.debug('[RegistroComprasModal] Preparando registro de compras', {
        idMovimientoEgreso: registroComprasBody.idMovimientoEgreso,
        referenciaIdMovimiento: idMovimiento,
      });

      await cajaService.insertRegistroCompras(idCajaMayorCierre, registroComprasBody);
      console.debug('[RegistroComprasModal] Registro de compras insertado', { idMovimientoEgreso: idMovimiento });

      ToastAlerts.success({ title: 'Registro exitoso', message: 'Egreso y registro de compras guardados correctamente.' });
      if (onCompraRegistrada) {
        onCompraRegistrada({
          idProveedor: proveedorSelected.idProveedor,
          razonSocialProveedor: proveedorSelected.razonSocial,
          rucProveedor: proveedorSelected.ruc,
          idMovimientoEgreso: idMovimiento,
          fechaEmision: fechaEmision,
        });
      }
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
                      {tipoComprobanteOpts.map((t) => (
                        <option key={t.codigo} value={t.codigo}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Serie
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
                      Número
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
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setCalcularDesdeTotal(checked);
                        if (!checked) setSkipNextTotalRecalc(true);
                      }}
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
                      {monedaOpts.map((m) => (
                        <option key={m.codigo} value={m.codigo}>
                          {m.label}
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

                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 border border-teal-200 dark:border-teal-800">
                  <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-300 mb-3">
                    Control Interno
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Familia del Egreso
                      </label>
                      <select
                        className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                        value={idFamiliaEgreso || ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          setIdFamiliaEgreso(val);
                          setIdTipoEgreso(null);
                        }}
                      >
                        <option value="">-- Seleccione --</option>
                        {familiasEgresoOpts.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tipo de Egreso
                      </label>
                      <select
                        className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        value={idTipoEgreso || ''}
                        onChange={(e) => setIdTipoEgreso(e.target.value ? Number(e.target.value) : null)}
                        disabled={!idFamiliaEgreso}
                      >
                        <option value="">-- Seleccione --</option>
                        {tiposEgresoOpts.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
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
