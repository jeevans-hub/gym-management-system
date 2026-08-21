import EditPlanPageClient from './EditPlanPageClient';

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditPlanPageClient planId={id} />;
}
