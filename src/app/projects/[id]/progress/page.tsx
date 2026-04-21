import { ProgressClient } from "./_components/progress-client"

export default async function ProgressPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProgressClient projectId={id} />
}
