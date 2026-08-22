import type { TrainerStatusFilter } from './types';

interface TrainersFiltersProps {
  search: string;
  status: TrainerStatusFilter;
  specialization: string;
  specializations: string[];
  loading: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: TrainerStatusFilter) => void;
  onSpecializationChange: (value: string) => void;
}

export default function TrainersFilters({
  search,
  status,
  specialization,
  specializations,
  loading,
  onSearchChange,
  onStatusChange,
  onSpecializationChange,
}: TrainersFiltersProps) {
  return (
    <div className="grid gap-3 border-b border-gray-200 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end lg:p-5">
      <div className="w-full lg:max-w-xl">
        <label htmlFor="trainer-search" className="sr-only">Search trainers</label>
        <div className="relative">
          <input
            id="trainer-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by ID, name, email, phone or specialization"
            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 pr-20 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-gray-400">
            {loading ? 'Searching…' : 'Search'}
          </span>
        </div>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center lg:block">
        <label htmlFor="trainer-status" className="text-sm font-medium text-gray-600 lg:sr-only">Status</label>
        <select
          id="trainer-status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as TrainerStatusFilter)}
          className="w-full min-w-36 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center lg:block">
        <label htmlFor="trainer-specialization" className="text-sm font-medium text-gray-600 lg:sr-only">Specialization</label>
        <select
          id="trainer-specialization"
          value={specialization}
          onChange={(event) => onSpecializationChange(event.target.value)}
          className="w-full min-w-48 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All specializations</option>
          {specializations.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
    </div>
  );
}
