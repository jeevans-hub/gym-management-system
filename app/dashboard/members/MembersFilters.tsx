import type { StatusFilter } from './types';

interface MembersFiltersProps {
  search: string;
  status: StatusFilter;
  loading: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
}

export default function MembersFilters({
  search,
  status,
  loading,
  onSearchChange,
  onStatusChange,
}: MembersFiltersProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="w-full sm:max-w-md">
        <label htmlFor="member-search" className="sr-only">Search members</label>
        <div className="relative">
          <input
            id="member-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by ID, name, email or phone"
            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 pr-20 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-gray-400">
            {loading ? 'Searching…' : 'Search'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="member-status" className="shrink-0 text-sm font-medium text-gray-600">
          Status
        </label>
        <select
          id="member-status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as StatusFilter)}
          className="min-w-32 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </div>
  );
}
