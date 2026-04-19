export default function Card({ title, value, color }) {
  return (
    <div style={{
      padding: "15px",
      margin: "10px",
      borderRadius: "10px",
      background: color || "#f5f5f5",
      color: "#000",
      boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
    }}>
      <h4>{title}</h4>
      <h2>{value}</h2>
    </div>
  );
}
