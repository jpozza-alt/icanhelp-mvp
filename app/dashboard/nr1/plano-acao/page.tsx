import { redirect } from 'next/navigation';

type SearchParamValue = string | string[] | undefined;
type SearchParamsShape = Record<string, SearchParamValue>;

type PageProps = {
  searchParams?: Promise<SearchParamsShape> | SearchParamsShape;
};

function buildQueryString(params: SearchParamsShape): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.length > 0) {
          query.append(key, item);
        }
      }
      continue;
    }

    if (typeof value === 'string' && value.length > 0) {
      query.set(key, value);
    }
  }

  const serialized = query.toString();
  return serialized ? '?' + serialized : '';
}

export default async function LegacyNr1RedirectPage({ searchParams }: PageProps) {
  const resolved = await Promise.resolve(searchParams ?? {});
  const queryString = buildQueryString(resolved);
  redirect('/dashboard/nr1/plano-de-acao' + queryString);
}