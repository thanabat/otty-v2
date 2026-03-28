import { SiteConnectionsPage } from "../../../components/site-connections-page";

type SiteConnectionsRouteProps = {
  params: Promise<{
    site: string;
  }>;
};

export default async function SiteConnectionsRoute({
  params
}: SiteConnectionsRouteProps) {
  const { site } = await params;

  return <SiteConnectionsPage site={decodeURIComponent(site)} />;
}
