"use client";

import { useEffect, useMemo, useState } from "react";

type LayoutMode = "split" | "web_only" | "video_only";
type ScreenOrientation = "row" | "column";

type ScreenConfig = {
    orientation: ScreenOrientation;
    splitRatio: number;
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
    const [showDeviceList, setShowDeviceList] = useState(false);

    const selectedCfg = useMemo(() => {
        return selected ? store[selected] : undefined;
    }, [selected, store]);

    const [deviceId, setDeviceId] = useState("");
    const [webUrl, setWebUrl] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [layout, setLayout] = useState<LayoutMode>("split");

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

            const res = await fetch("/api/admin/signage/configs", {
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
            setShowDeviceList(false);
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
        setOrientation("row");
        setSplitRatio(50);
        setGapPx(0);
        setPaddingPx(0);
        setMsg("");
        setShowDeviceList(false);
    }

    function presetSplit(v: number) {
        setLayout("split");
        setSplitRatio(clamp(v, 0, 100));
    }

    const deviceIds = Object.keys(store).sort((a, b) => a.localeCompare(b));

    return (
        <div style={styles.page}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerContent}>
                    <h1 style={styles.h1}>🖥️ Signage Admin</h1>
                    <p style={styles.subtitle}>
                        จัดการ URL และการแสดงผลหน้าจอ Digital Signage
                    </p>
                </div>
                <div style={styles.headerActions}>
                    <button onClick={loadAll} style={styles.btnSecondary}>
                        <span style={styles.btnIcon}></span>
                        <span style={styles.btnText}>Refresh</span>
                    </button>
                    <button onClick={onNew} style={styles.btnPrimary}>
                        <span style={styles.btnIcon}></span>
                        <span style={styles.btnText}>New</span>
                    </button>
                </div>
            </div>

            {/* Mobile Device Toggle */}
            <button
                onClick={() => setShowDeviceList(!showDeviceList)}
                style={styles.mobileToggle}
            >
                {showDeviceList ? "แก้ไข Config" : "เลือก Device"} ({deviceIds.length})
            </button>

            <div style={styles.container}>
                {/* Device List Sidebar */}
                <aside
                    style={{
                        ...styles.sidebar,
                        ...(showDeviceList ? styles.sidebarVisible : {}),
                    }}
                >
                    <div style={styles.sidebarHeader}>
                        <h2 style={styles.sidebarTitle}>Devices</h2>
                        <span style={styles.badge}>{deviceIds.length}</span>
                    </div>

                    <div style={styles.deviceList}>
                        {deviceIds.length === 0 && (
                            <div style={styles.emptyState}>
                                <div style={styles.emptyIcon}>📭</div>
                                <div style={styles.emptyText}>ยังไม่มีอุปกรณ์</div>
                            </div>
                        )}

                        {deviceIds.map((id) => {
                            const cfg = store[id];
                            const isActive = id === selected;
                            return (
                                <button
                                    key={id}
                                    onClick={() => {
                                        setSelected(id);
                                        setShowDeviceList(false);
                                    }}
                                    style={{
                                        ...styles.deviceCard,
                                        ...(isActive ? styles.deviceCardActive : {}),
                                    }}
                                >
                                    <div style={styles.deviceHeader}>
                                        <span style={styles.deviceIcon}>
                                            {cfg?.layout === "split"
                                                ? ""
                                                : cfg?.layout === "web_only"
                                                    ? ""
                                                    : ""}
                                        </span>
                                        <span style={styles.deviceName}>{id}</span>
                                    </div>
                                    <div style={styles.deviceMeta}>
                                        <span style={styles.layoutBadge}>{cfg?.layout}</span>
                                        <span style={styles.deviceTime}>
                                            {cfg?.updatedAt
                                                ? new Date(cfg.updatedAt * 1000).toLocaleDateString(
                                                    "th-TH",
                                                    {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    }
                                                )
                                                : "-"}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Main Editor */}
                <main style={styles.main}>
                    <div style={styles.editorCard}>
                        {/* Basic Config Section */}
                        <section style={styles.section}>
                            <h3 style={styles.sectionTitle}>ตั้งค่าพื้นฐาน</h3>

                            <div style={styles.field}>
                                <label style={styles.label}>Device ID</label>
                                <input
                                    value={deviceId}
                                    onChange={(e) => setDeviceId(e.target.value)}
                                    placeholder="เช่น DEVICE_001"
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Web URL</label>
                                <input
                                    value={webUrl}
                                    onChange={(e) => setWebUrl(e.target.value)}
                                    placeholder="https://yourdomain.com/display"
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Video URL</label>
                                <input
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://cdn.com/video.mp4"
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Layout Mode</label>
                                <select
                                    value={layout}
                                    onChange={(e) => setLayout(e.target.value as LayoutMode)}
                                    style={styles.select}
                                >
                                    <option value="split">Split (แบ่งหน้าจอ)</option>
                                    <option value="web_only">Web Only</option>
                                    <option value="video_only">Video Only</option>
                                </select>
                            </div>
                        </section>

                        {/* Screen Configuration */}
                        <section style={styles.section}>
                            <h3 style={styles.sectionTitle}>ตั้งค่าหน้าจอ</h3>

                            <div style={styles.field}>
                                <label style={styles.label}>Orientation</label>
                                <select
                                    value={orientation}
                                    onChange={(e) =>
                                        setOrientation(e.target.value as ScreenOrientation)
                                    }
                                    style={styles.select}
                                >
                                    <option value="row">Row (ซ้าย-ขวา)</option>
                                    <option value="column">Column (บน-ล่าง)</option>
                                </select>
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Split Ratio
                                    <span style={styles.labelHint}>{splitRatio}% video</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={splitRatio}
                                    onChange={(e) =>
                                        setSplitRatio(clamp(parseNum(e.target.value, 50), 0, 100))
                                    }
                                    style={styles.slider}
                                />
                                <input
                                    value={String(splitRatio)}
                                    onChange={(e) =>
                                        setSplitRatio(clamp(parseNum(e.target.value, 50), 0, 100))
                                    }
                                    placeholder="0-100"
                                    style={styles.inputSmall}
                                    inputMode="numeric"
                                />
                            </div>

                            {/* Presets */}
                            <div style={styles.presetGroup}>
                                <div style={styles.presetLabel}>Quick Presets:</div>
                                <div style={styles.presetButtons}>
                                    <button
                                        style={styles.presetBtn}
                                        onClick={() => presetSplit(50)}
                                    >
                                        50/50
                                    </button>
                                    <button
                                        style={styles.presetBtn}
                                        onClick={() => presetSplit(35)}
                                    >
                                        35/65
                                    </button>
                                    <button
                                        style={styles.presetBtn}
                                        onClick={() => presetSplit(25)}
                                    >
                                        25/75
                                    </button>
                                    <button
                                        style={styles.presetBtn}
                                        onClick={() => setLayout("web_only")}
                                    >
                                        Web
                                    </button>
                                    <button
                                        style={styles.presetBtn}
                                        onClick={() => setLayout("video_only")}
                                    >
                                         Video
                                    </button>
                                </div>
                            </div>

                            <div style={styles.fieldRow}>
                                <div style={styles.fieldHalf}>
                                    <label style={styles.label}>Gap (px)</label>
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
                                <div style={styles.fieldHalf}>
                                    <label style={styles.label}>Padding (px)</label>
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
                            </div>
                        </section>

                        {/* Save Section */}
                        <div style={styles.saveSection}>
                            <button
                                onClick={onSave}
                                disabled={saving || !deviceId}
                                style={{
                                    ...styles.saveBtn,
                                    ...(saving || !deviceId ? styles.saveBtnDisabled : {}),
                                }}
                            >
                                {saving ? "Saving..." : "Save Configuration"}
                            </button>
                            {msg && (
                                <div
                                    style={{
                                        ...styles.message,
                                        ...(msg.includes("failed") ? styles.messageError : {}),
                                    }}
                                >
                                    {msg}
                                </div>
                            )}
                        </div>

                        <div style={styles.infoBox}>
                            <div style={styles.infoIcon}>ℹ️</div>
                            <div style={styles.infoText}>
                                หลังจาก Save แล้ว อุปกรณ์จะทำการ polling และอัปเดต layout
                                โดยอัตโนมัติ
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styles: Record<string, any> = {
    page: {
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding: "0",
        margin: "0",
    },
    header: {
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
        padding: "20px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        flexWrap: "wrap",
    },
    headerContent: {
        flex: "1",
        minWidth: "240px",
    },
    h1: {
        margin: "0",
        fontSize: "28px",
        fontWeight: "800",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        letterSpacing: "-0.5px",
    },
    subtitle: {
        margin: "6px 0 0",
        fontSize: "14px",
        color: "#6b7280",
        fontWeight: "400",
    },
    headerActions: {
        display: "flex",
        gap: "10px",
        flexWrap: "wrap",
    },
    mobileToggle: {
        display: "none",
        width: "calc(100% - 32px)",
        margin: "16px 16px 0",
        padding: "14px 20px",
        background: "white",
        border: "1px solid rgba(0, 0, 0, 0.1)",
        borderRadius: "12px",
        fontSize: "15px",
        fontWeight: "600",
        color: "#1f2937",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        transition: "all 0.2s ease",
    },
    container: {
        display: "grid",
        gridTemplateColumns: "340px 1fr",
        gap: "24px",
        padding: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
    },
    sidebar: {
        background: "rgba(255, 255, 255, 0.98)",
        borderRadius: "16px",
        padding: "20px",
        height: "fit-content",
        position: "sticky",
        top: "24px",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
    },
    sidebarVisible: {},
    sidebarHeader: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "16px",
    },
    sidebarTitle: {
        margin: "0",
        fontSize: "18px",
        fontWeight: "700",
        color: "#1f2937",
    },
    badge: {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "700",
    },
    deviceList: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        maxHeight: "calc(100vh - 180px)",
        overflowY: "auto",
        paddingRight: "4px",
    },
    emptyState: {
        textAlign: "center",
        padding: "40px 20px",
    },
    emptyIcon: {
        fontSize: "48px",
        marginBottom: "12px",
    },
    emptyText: {
        color: "#9ca3af",
        fontSize: "14px",
    },
    deviceCard: {
        background: "white",
        border: "2px solid #e5e7eb",
        borderRadius: "12px",
        padding: "14px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        textAlign: "left",
    },
    deviceCardActive: {
        background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
        border: "2px solid #667eea",
        boxShadow: "0 4px 12px rgba(102, 126, 234, 0.15)",
    },
    deviceHeader: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "8px",
    },
    deviceIcon: {
        fontSize: "20px",
    },
    deviceName: {
        fontWeight: "700",
        fontSize: "15px",
        color: "#1f2937",
    },
    deviceMeta: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "12px",
    },
    layoutBadge: {
        background: "#f3f4f6",
        color: "#4b5563",
        padding: "4px 8px",
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: "600",
        textTransform: "uppercase",
    },
    deviceTime: {
        color: "#9ca3af",
    },
    main: {
        minWidth: "0",
    },
    editorCard: {
        background: "rgba(255, 255, 255, 0.98)",
        borderRadius: "16px",
        padding: "28px",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
    },
    section: {
        marginBottom: "32px",
    },
    sectionTitle: {
        margin: "0 0 20px",
        fontSize: "18px",
        fontWeight: "700",
        color: "#1f2937",
    },
    field: {
        marginBottom: "20px",
    },
    fieldRow: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px",
    },
    fieldHalf: {
        display: "flex",
        flexDirection: "column",
    },
    label: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "8px",
        fontSize: "14px",
        fontWeight: "600",
        color: "#374151",
    },
    labelHint: {
        fontSize: "13px",
        fontWeight: "500",
        color: "#667eea",
    },
    input: {
        width: "100%",
        padding: "12px 16px",
        border: "2px solid #e5e7eb",
        borderRadius: "10px",
        fontSize: "14px",
        fontFamily: "inherit",
        transition: "all 0.2s ease",
        outline: "none",
        color: "#1f2937",
        background: "white",
        boxSizing: "border-box",
    },
    inputSmall: {
        width: "80px",
        padding: "8px 12px",
        border: "2px solid #e5e7eb",
        borderRadius: "8px",
        fontSize: "14px",
        color: "#1f2937",
        textAlign: "center",
        fontWeight: "600",
        outline: "none",
    },
    select: {
        width: "100%",
        padding: "12px 16px",
        border: "2px solid #e5e7eb",
        borderRadius: "10px",
        fontSize: "14px",
        fontFamily: "inherit",
        color: "#1f2937",
        background: "white",
        cursor: "pointer",
        outline: "none",
        boxSizing: "border-box",
    },
    slider: {
        width: "100%",
        height: "6px",
        borderRadius: "10px",
        background: "#e5e7eb",
        outline: "none",
        marginBottom: "12px",
        cursor: "pointer",
    },
    presetGroup: {
        padding: "16px",
        background: "#f9fafb",
        borderRadius: "12px",
        marginTop: "16px",
    },
    presetLabel: {
        fontSize: "13px",
        fontWeight: "600",
        color: "#6b7280",
        marginBottom: "10px",
    },
    presetButtons: {
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
    },
    presetBtn: {
        padding: "8px 16px",
        background: "white",
        border: "2px solid #e5e7eb",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "600",
        color: "#4b5563",
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
    saveSection: {
        marginTop: "32px",
        paddingTop: "24px",
        borderTop: "2px solid #f3f4f6",
    },
    saveBtn: {
        width: "100%",
        padding: "16px 24px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        border: "none",
        borderRadius: "12px",
        color: "white",
        fontSize: "16px",
        fontWeight: "700",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: "0 4px 16px rgba(102, 126, 234, 0.3)",
    },
    saveBtnDisabled: {
        background: "#d1d5db",
        cursor: "not-allowed",
        boxShadow: "none",
    },
    message: {
        marginTop: "16px",
        padding: "12px 16px",
        background: "#d1fae5",
        border: "2px solid #6ee7b7",
        borderRadius: "10px",
        color: "#065f46",
        fontSize: "14px",
        fontWeight: "600",
        textAlign: "center",
    },
    messageError: {
        background: "#fee2e2",
        border: "2px solid #fca5a5",
        color: "#991b1b",
    },
    infoBox: {
        display: "flex",
        gap: "12px",
        marginTop: "20px",
        padding: "14px 16px",
        background: "#eff6ff",
        border: "2px solid #bfdbfe",
        borderRadius: "10px",
    },
    infoIcon: {
        fontSize: "18px",
        lineHeight: "1",
    },
    infoText: {
        fontSize: "13px",
        color: "#1e40af",
        lineHeight: "1.5",
    },
    btnPrimary: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 20px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        border: "none",
        borderRadius: "10px",
        color: "white",
        fontSize: "14px",
        fontWeight: "700",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: "0 2px 8px rgba(102, 126, 234, 0.25)",
    },
    btnSecondary: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 20px",
        background: "white",
        border: "2px solid #e5e7eb",
        borderRadius: "10px",
        color: "#4b5563",
        fontSize: "14px",
        fontWeight: "700",
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
    btnIcon: {
        fontSize: "16px",
    },
    btnText: {
        display: "inline",
    },
    // Responsive styles (applied via media queries in actual CSS)
    "@media (max-width: 1024px)": {
        container: {
            gridTemplateColumns: "1fr",
            padding: "16px",
        },
        sidebar: {
            position: "static",
        },
    },
};

// Add media query styles for mobile
if (typeof window !== "undefined") {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const applyMobileStyles = () => {
        if (mediaQuery.matches) {
            Object.assign(styles, {
                mobileToggle: {
                    ...styles.mobileToggle,
                    display: "block",
                },
                sidebar: {
                    ...styles.sidebar,
                    position: "fixed",
                    top: "0",
                    left: "0",
                    right: "0",
                    bottom: "0",
                    zIndex: "1000",
                    transform: "translateY(100%)",
                    transition: "transform 0.3s ease",
                    borderRadius: "16px 16px 0 0",
                    maxHeight: "90vh",
                    overflowY: "auto",
                },
                sidebarVisible: {
                    transform: "translateY(0)",
                },
                container: {
                    ...styles.container,
                    gridTemplateColumns: "1fr",
                    padding: "16px",
                    gap: "16px",
                },
                editorCard: {
                    ...styles.editorCard,
                    padding: "20px",
                },
                btnText: {
                    ...styles.btnText,
                    display: "none",
                },
                header: {
                    ...styles.header,
                    padding: "16px 20px",
                },
                h1: {
                    ...styles.h1,
                    fontSize: "22px",
                },
                fieldRow: {
                    ...styles.fieldRow,
                    gridTemplateColumns: "1fr",
                },
            });
        }
    };

    applyMobileStyles();
    mediaQuery.addEventListener("change", applyMobileStyles);
}