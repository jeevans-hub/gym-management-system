export default function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
        <h2 className="text-lg font-bold text-gray-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
