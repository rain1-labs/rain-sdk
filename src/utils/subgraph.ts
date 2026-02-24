export async function subgraphQuery<T = any>(
  subgraphUrl: string,
  query: string,
  apiKey?: string,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const res = await fetch(subgraphUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`Subgraph query failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  if (json.errors?.length) {
    throw new Error(`Subgraph query error: ${json.errors[0].message}`);
  }

  return json.data as T;
}
