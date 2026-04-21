import { BeatDetailClient } from "./_components/beat-detail-client";

export default async function BeatDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; beatId: string }>;
  searchParams: Promise<{ scene?: string }>;
}) {
  const { id, beatId } = await params;
  const { scene } = await searchParams;
  return <BeatDetailClient projectId={id} beatId={beatId} initialSceneId={scene} />;
}
