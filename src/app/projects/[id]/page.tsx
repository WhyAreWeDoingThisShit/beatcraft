export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex min-h-full flex-col items-center justify-center p-8 text-center">
      <p className="text-muted-foreground">Project {id}</p>
    </div>
  );
}
