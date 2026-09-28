import { ArrowRight, Clock3, IndianRupee, Scissors, Sparkles, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

export function ServiceCard({ service, onSelect }) {
  const normalizedName = service.name.toLowerCase();
  const Icon = normalizedName.includes("facial") || normalizedName.includes("skin")
    ? Sparkles
    : normalizedName.includes("beard") || normalizedName.includes("haircut") || normalizedName.includes("hair")
      ? Scissors
      : UserRound;

  return (
    <article className="product-service-card">
      <div className="product-service-icon"><Icon size={20} aria-hidden="true" /></div>
      <div className="product-service-copy">
        <h3>{service.name}</h3>
        <p>{service.description}</p>
      </div>
      <div className="product-service-meta">
        <span><IndianRupee size={14} aria-hidden="true" />{Number(service.price).toLocaleString("en-IN")}</span>
        <span><Clock3 size={14} aria-hidden="true" />{service.duration} min</span>
      </div>
      <div className="product-service-actions">
        <Link className="text-link" to={`/services/${service._id}`}>Details <ArrowRight size={15} /></Link>
        <button className="small-primary" onClick={() => onSelect(service)}>Book now</button>
      </div>
    </article>
  );
}

export function StatusBadge({ status }) {
  const normalized = String(status || "PENDING").toLowerCase();
  return <span className={`product-status status-${normalized}`}>{status || "PENDING"}</span>;
}

export function Notice({ type = "info", title, children, action, onAction }) {
  return (
    <div className={`product-notice notice-${type}`} role={type === "error" ? "alert" : "status"}>
      <div><strong>{title}</strong>{children && <p>{children}</p>}</div>
      {action && <button className="notice-action" onClick={onAction}>{action}</button>}
    </div>
  );
}

export function LoadingRows({ count = 3 }) {
  return <div className="loading-rows" aria-label="Loading">
    {Array.from({ length: count }, (_, index) => <div className="loading-row" key={index} />)}
  </div>;
}