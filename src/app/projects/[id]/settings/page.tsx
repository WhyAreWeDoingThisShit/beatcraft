import { SettingsClient } from "./_components/settings-client";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SettingsClient projectId={id} />;
}
