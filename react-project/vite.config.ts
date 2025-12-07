import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
    include: ['onnxruntime-web']
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    // Deshabilitar HMR para evitar pings a localhost:443
    hmr: false,
    fs: {
      allow: ['..']
    },
  },
  worker: {
    format: 'es'
  },
  // Configuración específica para ONNX Runtime Web
  assetsInclude: ['**/*.onnx', '**/*.wasm'],
  // Configuración de publicPath
  base: './',  // Usar rutas relativas para mayor portabilidad
  // Configuración para archivos estáticos
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Preservar la estructura de carpetas en public
    copyPublicDir: true,
    // Configuración para mejorar el build
    sourcemap: false,  // Desactivar sourcemaps en producción
    minify: 'esbuild', // Usar esbuild para minificación más rápida
    target: 'es2015',  // Soporte para navegadores modernos
    // Configuración de chunks para optimizar carga
    rollupOptions: {
      output: {
        // Configuración de chunks para dividir el código
        manualChunks: {
          // Separar las dependencias principales
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'chart-vendor': ['recharts'],
          'utils-vendor': ['axios', 'date-fns', 'crypto-js'],
          'pdf-vendor': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'excel-vendor': ['xlsx'],
          'transformers': ['@xenova/transformers'],
        },
        // Configuración de nombres de archivos
        assetFileNames: (assetInfo) => {
          // Preservar la estructura de carpetas para assets estáticos
          if (assetInfo.name && assetInfo.name.includes('public/assets/')) {
            return assetInfo.name.replace('public/', '');
          }
          
          const extType = assetInfo.name?.split('.').pop();
          
          // Organizar por tipo de archivo
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            return 'assets/images/[name].[hash].[ext]';
          }
          if (/woff2?|eot|ttf|otf/i.test(extType || '')) {
            return 'assets/fonts/[name].[hash].[ext]';
          }
          if (/wasm/i.test(extType || '')) {
            return 'assets/wasm/[name].[hash].[ext]';
          }
          
          return 'assets/[name].[hash].[ext]';
        },
        chunkFileNames: 'assets/js/[name].[hash].js',
        entryFileNames: 'assets/js/[name].[hash].js'
      }
    },
    // Configuración de tamaño de chunks
    chunkSizeWarningLimit: 600,
    // Reportar el tamaño de los archivos comprimidos
    reportCompressedSize: true,
    // Configuraciones adicionales para optimización
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // Inline assets menores a 4kb
  },
  // Configuración CSS
  css: {
    // Configurar PostCSS para optimización
    postcss: './postcss.config.js'
  }
});
