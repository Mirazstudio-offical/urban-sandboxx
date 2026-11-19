import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase') || id.includes('@firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('peerjs')) {
                return 'vendor-peerjs';
              }
              if (id.includes('lucide-react') || id.includes('motion')) {
                return 'vendor-ui';
              }
              if (id.includes('react-dom') || id.includes('react/')) {
                return 'vendor-react';
              }
              return 'vendor';
            }
            if (
              id.includes('/src/vehicleMasterRegistry') ||
              id.includes('/src/vehicleArchetypes') ||
              id.includes('/src/vehicleCatalog') ||
              id.includes('/src/powertrainVariants') ||
              id.includes('/src/truckChassisVariants') ||
              id.includes('/src/vehicleMeshConfigs')
            ) {
              return 'game-vehicles-data';
            }
            if (
              id.includes('/src/items') ||
              id.includes('/src/liquidSystem') ||
              id.includes('/src/unifiedSubstanceCatalog') ||
              id.includes('/src/cookingEngine') ||
              id.includes('/src/cookingIngredients') ||
              id.includes('/src/medicineSystem')
            ) {
              return 'game-items-sim';
            }
            if (
              id.includes('/src/renderer') ||
              id.includes('/src/propRenderer') ||
              id.includes('/src/vehicleVisuals') ||
              id.includes('/src/terrainRenderer') ||
              id.includes('/src/riverSystem') ||
              id.includes('/src/rollingStockRenderer') ||
              id.includes('/src/interiorFurnitureRenderer') ||
              id.includes('/src/shadowSystem') ||
              id.includes('/src/gasStationRenderer') ||
              id.includes('/src/railwayRenderer') ||
              id.includes('/src/roofRenderer')
            ) {
              return 'game-renderer';
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
