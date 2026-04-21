import { WikiClient } from "./_components/wiki-client";

export default async function WikiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WikiClient projectId={id} />;
}
