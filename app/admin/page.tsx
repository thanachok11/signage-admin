"use client";

import { useEffect, useMemo, useState } from "react";

type LayoutMode = "split" | "web_only" | "video_only";
type ScreenOrientation = "row" | "column";

type ScreenConfig = {
    orientation: ScreenOrientation;
    splitRatio: number; // video %
    gapPx: number;
    paddingPx: number;
};

type SignageConfig = {
    webUrl: string;
    videoUrl: string;
    layout: LayoutMode;
    updatedAt: number;
    screen?: Partial<ScreenConfig>;
};

type StoreShape = Record<string, SignageConfig>;

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function parseNum(v: string, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export default function AdminPage() {
    const [store, setStore] = useState<StoreShape>({});
    const [selected, setSelected] = useState<string>("");
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string>("");

    const selectedCfg = useMemo(() => {
        return selected ? store[selected] : undefined;
    }, [selected, store]);

    const [deviceId, setDeviceId] = useState("");
    const [webUrl, setWebUrl] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [layout, setLayout] = useState<LayoutMode>("split");

    // ✅ screen config fields
    const [orientation, setOrientation] = useState<ScreenOrientation>("row");
    const [splitRatio, setSplitRatio] = useState<number>(50);
    const [gapPx, setGapPx] = useState<number>(0);
    const [paddingPx, setPaddingPx] = useState<number>(0);

    async function loadAll() {
        setMsg("");
        const res = await fetch("/api/admin/signage/configs", { cache: "no-store" });
        const data = (await res.json()) as StoreShape;

        if (!res.ok) {
            setMsg(`Load failed: ${JSON.stringify(data)}`);
            return;
        }

        setStore(data);

        // auto select first
        const first = Object.keys(data)[0] || "";
        setSelected((prev) => prev || first);
    }

    useEffect(() => {
        void loadAll();
    }, []);

    useEffect(() => {
        if (!selectedCfg) return;

        setDeviceId(selected);
        setWebUrl(selectedCfg.webUrl || "");
        setVideoUrl(selectedCfg.videoUrl || "");
        setLayout(selectedCfg.layout || "split");

        // ✅ hydrate screen config with fallback defaults
        const sc = selectedCfg.screen || {};
        setOrientation(sc.orientation === "column" ? "column" : "row");
        setSplitRatio(
            typeof sc.splitRatio === "number" ? clamp(sc.splitRatio, 0, 100) : 50
        );
        setGapPx(typeof sc.gapPx === "number" ? clamp(sc.gapPx, 0, 200) : 0);
        setPaddingPx(
            typeof sc.paddingPx === "number" ? clamp(sc.paddingPx, 0, 200) : 0
        );
    }, [selected, selectedCfg]);

    async function onSave() {
        setSaving(true);
        setMsg("");
        try {
            const payload = {
                deviceId,
                webUrl,
                videoUrl,
                layout,
                screen: {
                    orientation,
                    splitRatio: clamp(splitRatio, 0, 100),
                    gapPx: clamp(gapPx, 0, 200),
                    paddingPx: clamp(paddingPx, 0, 200),
                },
            };

            const res = await fetch("/api/admin/signage/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                setMsg(`Save failed: ${JSON.stringify(data)}`);
                return;
            }

            setMsg("Saved ✅");
            await loadAll();
            setSelected(deviceId);
        } finally {
            setSaving(false);
        }
    }

    function onNew() {
        setSelected("");
        setDeviceId("");
        setWebUrl("");
        setVideoUrl("");
        setLayout("split");

        // defaults for screen
        setOrientation("row");
        setSplitRatio(50);
        setGapPx(0);
        setPaddingPx(0);

        setMsg("");
    }

    // quick presets (ช่วยใช้งานเร็ว)
    function presetSplit(v: number) {
        setLayout("split");
        setSplitRatio(clamp(v, 0, 100));
    }

    const deviceIds = Object.keys(store).sort((a, b) => a.localeCompare(b));

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.h1}>Signage Admin</h1>
                    <p style={styles.sub}>
                        แก้ URL + ขนาดหน้าจอ (split) แล้วอุปกรณ์จะอัปเดตเอง
                    </p>
                </div>
                <div style={styles.actions}>
                    <button onClick={loadAll} style={styles.btnGhost}>
                        Refresh
                    </button>
                    <button onClick={onNew} style={styles.btnGhost}>
                        New device
                    </button>
                </div>
            </div>

            <div style={styles.grid}>
                {/* LEFT: list */}
                <div style={styles.card}>
                    <div style={styles.cardTitle}>Devices</div>
                    <div style={styles.list}>
                        {deviceIds.length === 0 && (
                            <div style={styles.muted}>No devices</div>
                        )}

                        {deviceIds.map((id) => (
                            <button
                                key={id}
                                onClick={() => setSelected(id)}
                                style={{
                                    ...styles.listItem,
                                    ...(id === selected ? styles.listItemActive : {}),
                                }}
                            >
                                <div style={{ fontWeight: 700 }}>{id}</div>
                                <div style={styles.mutedSmall}>
                                    {store[id]?.layout} •{" "}
                                    {store[id]?.updatedAt
                                        ? new Date(store[id].updatedAt * 1000).toLocaleString()
                                        : "-"}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* RIGHT: editor */}
                <div style={styles.card}>
                    <div style={styles.cardTitle}>Edit config</div>

                    <div style={styles.formRow}>
                        <label style={styles.label}>deviceId</label>
                        <input
                            value={deviceId}
                            onChange={(e) => setDeviceId(e.target.value)}
                            placeholder="DEVICE_001"
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.formRow}>
                        <label style={styles.label}>webUrl</label>
                        <input
                            value={webUrl}
                            onChange={(e) => setWebUrl(e.target.value)}
                            placeholder="https://yourdomain.com/queue/display?shopId=1"
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.formRow}>
                        <label style={styles.label}>videoUrl</label>
                        <input
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://yourcdn.com/ads/intro.mp4"
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.formRow}>
                        <label style={styles.label}>layout</label>
                        <select
                            value={layout}
                            onChange={(e) => setLayout(e.target.value as LayoutMode)}
                            style={styles.input}
                        >
                            <option value="split">split</option>
                            <option value="web_only">web_only</option>
                            <option value="video_only">video_only</option>
                        </select>
                    </div>

                    <hr style={styles.hr} />

                    <div style={styles.cardTitle}>Screen</div>

                    <div style={styles.formRow}>
                        <label style={styles.label}>orientation</label>
                        <select
                            value={orientation}
                            onChange={(e) => setOrientation(e.target.value as ScreenOrientation)}
                            style={styles.input}
                        >
                            <option value="row">row (ซ้าย-ขวา)</option>
                            <option value="column">column (บน-ล่าง)</option>
                        </select>
                    </div>

                    <div style={styles.formRow}>
                        <label style={styles.label}>splitRatio</label>
                        <input
                            value={String(splitRatio)}
                            onChange={(e) =>
                                setSplitRatio(clamp(parseNum(e.target.value, 50), 0, 100))
                            }
                            placeholder="video % (0-100)"
                            style={styles.input}
                            inputMode="numeric"
                        />
                    </div>

                    <div style={styles.presetRow}>
                        <button style={styles.btnGhost} onClick={() => presetSplit(50)}>
                            50/50
                        </button>
                        <button style={styles.btnGhost} onClick={() => presetSplit(35)}>
                            35/65
                        </button>
                        <button style={styles.btnGhost} onClick={() => presetSplit(25)}>
                            25/75
                        </button>
                        <button style={styles.btnGhost} onClick={() => setLayout("web_only")}>
                            Web only
                        </button>
                        <button
                            style={styles.btnGhost}
                            onClick={() => setLayout("video_only")}
                        >
                            Video only
                        </button>
                    </div>

                    <div style={styles.formRow}>
                        <label style={styles.label}>gapPx</label>
                        <input
                            value={String(gapPx)}
                            onChange={(e) =>
                                setGapPx(clamp(parseNum(e.target.value, 0), 0, 200))
                            }
                            placeholder="0-200"
                            style={styles.input}
                            inputMode="numeric"
                        />
                    </div>

                    <div style={styles.formRow}>
                        <label style={styles.label}>paddingPx</label>
                        <input
                            value={String(paddingPx)}
                            onChange={(e) =>
                                setPaddingPx(clamp(parseNum(e.target.value, 0), 0, 200))
                            }
                            placeholder="0-200"
                            style={styles.input}
                            inputMode="numeric"
                        />
                    </div>

                    <div style={styles.footerRow}>
                        <button
                            onClick={onSave}
                            disabled={saving || !deviceId}
                            style={styles.btnPrimary}
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                        {msg && <span style={styles.msg}>{msg}</span>}
                    </div>

                    <div style={styles.hint}>
                        * หลัง Save แล้ว แอป React Native จะ polling แล้วปรับ split/layout
                        อัตโนมัติ
                    </div>
                </div>
            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styles: Record<string, any> = {
    page: {
        padding: 20,
        fontFamily: "ui-sans-serif, system-ui",
        color: "#111",
        background: "#f6f7fb",
        minHeight: "100vh",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "flex-start",
        marginBottom: 16,
    },
    h1: { margin: 0, fontSize: 28, letterSpacing: -0.5 },
    sub: { margin: "6px 0 0", color: "#555" },
    actions: { display: "flex", gap: 10 },
    grid: { display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 },
    card: {
        background: "#fff",
        borderRadius: 14,
        padding: 16,
        boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    },
    cardTitle: { fontWeight: 800, marginBottom: 12 },
    list: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxHeight: 520,
        overflow: "auto",
    },
    listItem: {
        textAlign: "left",
        padding: 12,
        borderRadius: 12,
        border: "1px solid #eee",
        background: "#fff",
        cursor: "pointer",
    },
    listItemActive: { border: "1px solid #111", background: "#fafafa" },
    muted: { color: "#777" },
    mutedSmall: { color: "#777", fontSize: 12, marginTop: 2 },
    formRow: {
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        gap: 10,
        alignItems: "center",
        marginBottom: 12,
    },
    presetRow: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        margin: "0 0 12px 0",
    },
    label: { fontWeight: 700, color: "#333" },
    input: {
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #ddd",
        outline: "none",
    },
    footerRow: { display: "flex", alignItems: "center", gap: 12, marginTop: 8 },
    msg: { color: "#0a7", fontWeight: 700 },
    hint: { marginTop: 10, color: "#666", fontSize: 12 },
    hr: { border: 0, borderTop: "1px solid #eee", margin: "14px 0" },
    btnPrimary: {
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid #111",
        background: "#111",
        color: "#fff",
        fontWeight: 800,
        cursor: "pointer",
    },
    btnGhost: {
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #ddd",
        background: "#fff",
        fontWeight: 800,
        cursor: "pointer",
    },
};
