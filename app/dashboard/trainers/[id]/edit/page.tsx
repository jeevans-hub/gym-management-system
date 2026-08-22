import EditTrainerPageClient from './EditTrainerPageClient';

export default async function EditTrainerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditTrainerPageClient trainerId={id} />;
}
