import mongoose from 'mongoose';

export const DEFAULT_REPORT_LIMIT = 20;
export const MAX_REPORT_LIMIT = 100;
export const MAX_REPORT_SEARCH_LENGTH = 100;

type QueryResult<T> = { success: true; data: T } | { success: false; error: string };

export function parseReportPagination(searchParams: URLSearchParams): QueryResult<{
  page: number;
  limit: number;
}> {
  const page = Number(searchParams.get('page') ?? 1);
  const limit = Number(searchParams.get('limit') ?? DEFAULT_REPORT_LIMIT);

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
    return { success: false, error: 'Page and limit must be positive integers' };
  }
  if (limit > MAX_REPORT_LIMIT) {
    return { success: false, error: `Limit cannot exceed ${MAX_REPORT_LIMIT}` };
  }

  return { success: true, data: { page, limit } };
}

export function parseReportSearch(searchParams: URLSearchParams): QueryResult<string | undefined> {
  const search = searchParams.get('search')?.trim();
  if (search && search.length > MAX_REPORT_SEARCH_LENGTH) {
    return {
      success: false,
      error: `Search cannot exceed ${MAX_REPORT_SEARCH_LENGTH} characters`,
    };
  }
  return { success: true, data: search || undefined };
}

export function parseEnumFilter<T extends string>(
  searchParams: URLSearchParams,
  name: string,
  allowed: readonly T[]
): QueryResult<T | undefined> {
  const value = searchParams.get(name)?.trim();
  if (value && !allowed.includes(value as T)) {
    return { success: false, error: `${name} must be one of: ${allowed.join(', ')}` };
  }
  return { success: true, data: (value as T | undefined) || undefined };
}

export function parseObjectIdFilter(
  searchParams: URLSearchParams,
  name: string
): QueryResult<mongoose.Types.ObjectId | undefined> {
  const value = searchParams.get(name)?.trim();
  if (!value) return { success: true, data: undefined };
  if (!mongoose.isObjectIdOrHexString(value)) {
    return { success: false, error: `${name} must be a valid ID` };
  }
  return { success: true, data: new mongoose.Types.ObjectId(value) };
}

export function parseBoundedInteger(
  searchParams: URLSearchParams,
  name: string,
  minimum: number,
  maximum: number
): QueryResult<number | undefined> {
  const value = searchParams.get(name)?.trim();
  if (!value) return { success: true, data: undefined };
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < minimum || numberValue > maximum) {
    return { success: false, error: `${name} must be an integer from ${minimum} to ${maximum}` };
  }
  return { success: true, data: numberValue };
}

export function escapeReportRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function reportPaginationResponse(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export function firstFacet<T>(value: T[] | undefined): T | undefined {
  return value?.[0];
}
