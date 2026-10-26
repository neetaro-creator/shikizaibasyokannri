export interface Route { name: 'search' | 'item' | 'browse' | 'vehicles' | 'vehicle' | 'totals'; id?: string; query: URLSearchParams }

export function parseHash(hash: string): Route {
  const [path, qs] = hash.replace(/^#/, '').split('?');
  const query = new URLSearchParams(qs ?? '');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case 'item': return { name: 'item', id: parts[1], query };
    case 'browse': return { name: 'browse', query };
    case 'vehicle': return parts[1] ? { name: 'vehicle', id: parts[1], query } : { name: 'vehicles', query };
    case 'totals': return { name: 'totals', query };
    default: return { name: 'search', query };
  }
}
