import { build } from 'vite';
import { build as bundle } from 'esbuild';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('.',import.meta.url));
process.chdir(root);
await fs.mkdir('.cache',{recursive:true});
await bundle({entryPoints:['src/landing.tsx'],outfile:'.cache/prerender.mjs',bundle:true,platform:'node',format:'esm',packages:'external',alias:{'@':root},jsx:'automatic'});
const {default:Landing}=await import('./.cache/prerender.mjs');
const {createElement}=await import('react');
const {renderToString}=await import('react-dom/server');
const html=renderToString(createElement(Landing));
await build();
const target=new URL('../../v2/index.html',import.meta.url);
const page=await fs.readFile(target,'utf8');
if(!page.includes('<!--prerender-->'))throw new Error('Missing prerender marker');
await fs.writeFile(target,page.replace('<!--prerender-->',html));
console.log('V2 built and prerendered. Original root index.html was not modified.');
