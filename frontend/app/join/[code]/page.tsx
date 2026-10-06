import JoinMeetingForm from "@/components/JoinMeetingForm";

export default async function JoinPage({ params, searchParams }: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const { code } = await params;
  const { name } = await searchParams;
  return <JoinMeetingForm code={code} initialName={name ?? ""} />;
}
