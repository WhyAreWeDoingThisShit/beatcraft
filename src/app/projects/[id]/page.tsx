import { BeatBoard } from "./_components/beat-board";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BeatBoard projectId={id} />;
}
