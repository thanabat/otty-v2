import { ReferrerConnectionsPage } from "../../../../components/referrer-connections-page";

type ReferrerUserConnectionsPageProps = {
  params: Promise<{
    referrerUserId: string;
  }>;
  searchParams?: Promise<{
    page?: string;
  }>;
};

export default async function ReferrerUserConnectionsPage({
  params,
  searchParams
}: ReferrerUserConnectionsPageProps) {
  const { referrerUserId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const parsedPage = Number(resolvedSearchParams.page ?? "1");

  return (
    <ReferrerConnectionsPage
      currentPage={Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1}
      referrerUserId={referrerUserId}
      useReferrerUserRoute
    />
  );
}
