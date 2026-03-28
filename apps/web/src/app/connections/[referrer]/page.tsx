import { ReferrerConnectionsPage } from "../../../components/referrer-connections-page";

type ConnectionsPageProps = {
  params: Promise<{
    referrer: string;
  }>;
  searchParams?: Promise<{
    page?: string;
  }>;
};

export default async function ConnectionsPage({
  params,
  searchParams
}: ConnectionsPageProps) {
  const { referrer } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const parsedPage = Number(resolvedSearchParams.page ?? "1");

  return (
    <ReferrerConnectionsPage
      currentPage={Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1}
      referrer={decodeURIComponent(referrer)}
    />
  );
}
