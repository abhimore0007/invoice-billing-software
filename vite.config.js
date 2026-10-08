import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({plugins:[react(),tailwindcss()],optimizeDeps:{include:['pdfjs-dist/build/pdf.mjs']},server:{proxy:{'/api':'http://localhost:3001'}},build:{target:'es2022',rollupOptions:{output:{manualChunks:{charts:['recharts'],pdf:['jspdf','jspdf-autotable']}}}}});
