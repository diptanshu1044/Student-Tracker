export interface PaginationInput {
  page?: number;
  limit?: number;
}

export function getPagination(input: PaginationInput) {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
