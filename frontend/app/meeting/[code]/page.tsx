import MeetingRoom from "@/components/MeetingRoom";

export default async function MeetingPage({ params, searchParams }: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ name?: string | string[] }>;
}) {
  const { code } = await params;
  const { name } = await searchParams;
  return <MeetingRoom code={code} displayName={typeof name === "string" ? name : "You"} />;
}
