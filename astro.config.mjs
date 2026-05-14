import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Para GitHub Pages: user.github.io/repo-name/
  // Reemplaza esto con tu URL base
  site: 'https://kieefman.github.io',

  // El nombre de tu repositorio
  base: '/bosquejo-pagina-web',

  vite: {
    plugins: [tailwindcss()]
  }
});