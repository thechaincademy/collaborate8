import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DslDashboard } from "@/components/safeguarding/DslDashboard";
import { fetchDslQueue, isSafeguardingLead, type DslConcern, type DslFlag } from "@/lib/safeguarding/api";

const DslReview = () => {
  const [allowed, setAllowed] = useState(false);
  const [flags, setFlags] = useState<DslFlag[]>([]);
  const [concerns, setConcerns] = useState<DslConcern[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Route guard: only the safeguarding lead (dsl role) loads anything. Admins are refused here too.
    if (!(await isSafeguardingLead())) {
      setAllowed(false);
      setFlags([]);
      setConcerns([]);
      setLoading(false);
      return;
    }
    const queue = await fetchDslQueue();
    setAllowed(queue.allowed);
    setFlags(queue.flags);
    setConcerns(queue.concerns);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <DslDashboard allowed={allowed} flags={flags} concerns={concerns} onChange={() => void load()} />;
};

export default DslReview;
