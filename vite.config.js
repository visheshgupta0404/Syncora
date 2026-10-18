import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';
export default defineConfig({plugins:[react(),VitePWA({registerType:'prompt',manifest:{name:'Syncora',short_name:'Syncora',description:'A private listening room for two',theme_color:'#10141f',background_color:'#10141f',display:'standalone',start_url:'/',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'}]},workbox:{globPatterns:['**/*.{js,css,html,svg,png}'],navigateFallback:'index.html'}})]});
