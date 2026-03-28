import { SiteConnectionsPage } from "../../../components/site-connections-page";

type SiteConnectionsRouteProps = {
  params: Promise<{
    site: string;
  }>;
  searchParams?: Promise<{
    page?: string;
  }>;
};

export default async function SiteConnectionsRoute({
  params,
  searchParams
}: SiteConnectionsRouteProps) {
  const { site } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const parsedPage = Number(resolvedSearchParams.page ?? "1");

  return (
    <SiteConnectionsPage
      currentPage={Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1}
      site={decodeURIComponent(site)}
    />
  );
}
