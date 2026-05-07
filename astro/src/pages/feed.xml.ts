import type { APIRoute } from 'astro';
import { GET as getRss } from './rss.xml.ts';

export const GET: APIRoute = getRss;
