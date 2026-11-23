export function AppIconArt({ size, rounded }: { size: number; rounded: boolean }) {
  const record = size * 0.68;
  const label = record * 0.36;
  const hole = Math.max(2, record * 0.06);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: rounded ? size * 0.22 : 0,
        backgroundImage: "linear-gradient(160deg, #66708c 0%, #535c74 50%, #3f475d 100%)",
      }}
    >
      <div
        style={{
          width: record,
          height: record,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          backgroundImage: "radial-gradient(circle, #2a2d35 0%, #16181d 45%, #24272f 60%, #121418 100%)",
          boxShadow: `0 ${size * 0.03}px ${size * 0.06}px rgba(0,0,0,0.35)`,
        }}
      >
        <div
          style={{
            width: label,
            height: label,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            backgroundColor: "#f25c22",
          }}
        >
          <div style={{ width: hole, height: hole, borderRadius: "50%", backgroundColor: "#ebebeb" }} />
        </div>
      </div>
    </div>
  );
}
