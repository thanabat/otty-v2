import { ReferrerConnectionsPage } from "../../../components/referrer-connections-page";

type ConnectionsPageProps = {
  params: Promise<{
    referrer: string;
  }>;
};

export default async function ConnectionsPage({
  params
}: ConnectionsPageProps) {
  const { referrer } = await params;

  return <ReferrerConnectionsPage referrer={decodeURIComponent(referrer)} />;
}
