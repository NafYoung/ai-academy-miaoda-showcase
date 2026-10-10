// Resolve emitted assets beside this chunk on Miaoda's versioned application CDN.
// Development paths and inlined data URLs retain Vite's original URLs.
function deployedAssetUrl(url: string): string {
  if (import.meta.env.PROD && url.startsWith('/assets/'))
    return new URL(url.slice('/assets/'.length), import.meta.url).href;
  return url;
}
const cmaps: Record<string, string> = import.meta.glob(
  '/node_modules/pdfjs-dist/cmaps/*.bcmap',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
);
const fonts: Record<string, string> = import.meta.glob(
  '/node_modules/pdfjs-dist/standard_fonts/*.{pfb,ttf}',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
);
const wasm: Record<string, string> = import.meta.glob(
  '/node_modules/pdfjs-dist/wasm/*.wasm',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
);
async function asset(
  map: Record<string, string>,
  path: string,
): Promise<Uint8Array> {
  const url: string | undefined = map[path];
  if (!url) throw new Error('PDF asset unavailable');
  const response: Response = await fetch(deployedAssetUrl(url));
  if (!response.ok) throw new Error('PDF asset load failed');
  return new Uint8Array(await response.arrayBuffer());
}
export class PdfCMapReader {
  async fetch({ name }: { name: string }) {
    return {
      cMapData: await asset(
        cmaps,
        `/node_modules/pdfjs-dist/cmaps/${name}.bcmap`,
      ),
      isCompressed: true,
    };
  }
}
export class PdfFontReader {
  fetch({ filename }: { filename: string }): Promise<Uint8Array> {
    return asset(fonts, `/node_modules/pdfjs-dist/standard_fonts/${filename}`);
  }
}
export class PdfWasmReader {
  fetch({ filename }: { filename: string }): Promise<Uint8Array> {
    return asset(wasm, `/node_modules/pdfjs-dist/wasm/${filename}`);
  }
}
