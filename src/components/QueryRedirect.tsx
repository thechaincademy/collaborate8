import { Navigate, useLocation } from "react-router-dom";

// Redirect that preserves the query string (e.g. ?utm_source=...) across the jump.
const QueryRedirect = ({ to }: { to: string }) => {
  const { search } = useLocation();
  const [pathAndQuery, hash] = to.split("#");
  const [path, query] = pathAndQuery.split("?");
  const params = new URLSearchParams(query ?? "");
  new URLSearchParams(search).forEach((v, k) => {
    if (!params.has(k)) params.set(k, v);
  });
  const qs = params.toString();
  return <Navigate to={`${path}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`} replace />;
};

export default QueryRedirect;
