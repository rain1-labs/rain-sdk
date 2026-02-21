export async function subgraphQuery<T = any>(
  subgraphUrl: string,
  query: string,
): Promise<T> {
  const res = await fetch(subgraphUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
