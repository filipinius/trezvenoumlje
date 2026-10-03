import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import type { z } from 'astro/zod';
import * as s from './content/schemas';

const data = <S extends z.ZodType>(dir: string, schema: S) =>
  defineCollection({ loader: glob({ pattern: '**/*.json', base: `./src/content/${dir}` }), schema });
const md = <S extends z.ZodType>(dir: string, schema: S) =>
  defineCollection({ loader: glob({ pattern: '**/*.md', base: `./src/content/${dir}` }), schema });

export const collections = {
  usluge: data('usluge', s.uslugaSchema), programi: data('programi', s.programSchema),
  ciljneGrupe: data('ciljneGrupe', s.ciljnaGrupaSchema), b2b: data('b2b', s.b2bSchema),
  clanci: md('clanci', s.clanakSchema), knjige: data('knjige', s.knjigaSchema),
  tim: data('tim', s.timSchema), mediji: data('mediji', s.medijSchema),
  pitanja: data('pitanja', s.pitanjeSchema), nedelje: data('nedelje', s.nedeljaSchema),
  price: data('price', s.pricaSchema), pravno: md('pravno', s.pravnoSchema),
  podesavanja: data('podesavanja', s.podesavanjaSchema),
};
