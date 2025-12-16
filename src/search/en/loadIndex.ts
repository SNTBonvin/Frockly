export type FnEmbedMeta = {
  dim: number;
  count: number;
  fns: string[];
  model?: string;
};

export async function loadFnIndex(baseUrl = "/embed/en") {
  const meta: FnEmbedMeta = await (await fetch(`${baseUrl}/fn_embed.meta.json`)).json();
  const buf = await (await fetch(`${baseUrl}/fn_embed.f32`)).arrayBuffer();
  const vecs = new Float32Array(buf); // count * dim

  if (vecs.length !== meta.count * meta.dim) {
    throw new Error(`embed size mismatch: vecs=${vecs.length}, expected=${meta.count * meta.dim}`);
  }
  return { meta, vecs };
}
