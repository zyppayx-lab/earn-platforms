export default function Card({
  title,
  value,
  subtitle,
  color = "#f5f5f5",
  icon,
  loading = false,
  trend, // "up" | "down" | null
}) {
  return (
    <div
      style={{
        padding: "16px",
        margin: "10px",
        borderRadius: "12px",
        background: color,
        color: "#111",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        minWidth: "180px"
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h4 style={{ margin: 0, fontSize: "14px", opacity: 0.8 }}>
          {title}
        </h4>

        {icon && <span>{icon}</span>}
      </div>

      {/* VALUE */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {loading ? (
          <div style={{ fontSize: "18px" }}>Loading...</div>
        ) : (
          <h2 style={{ margin: 0 }}>{value}</h2>
        )}

        {/* TREND */}
        {trend === "up" && <span style={{ color: "green" }}>▲</span>}
        {trend === "down" && <span style={{ color: "red" }}>▼</span>}
      </div>

      {/* SUBTITLE */}
      {subtitle && (
        <small style={{ opacity: 0.7 }}>{subtitle}</small>
      )}
    </div>
  );
          }
