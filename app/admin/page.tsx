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
    const [isMobile, setIsMobile] = useState(false);

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

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

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
            if (isMobile) setShowDeviceList(false);
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
        if (isMobile) setShowDeviceList(false);
    }

    function presetSplit(v: number) {
        setLayout("split");
        setSplitRatio(clamp(v, 0, 100));
    }

    const deviceIds = Object.keys(store).sort((a, b) => a.localeCompare(b));

    return (
        <div style={isMobile ? mobileStyles.page : styles.page}>
            {/* Header */}
            <div style={isMobile ? mobileStyles.header : styles.header}>
                <div style={styles.headerContent}>
                    <h1 style={isMobile ? mobileStyles.h1 : styles.h1}>🖥️ Signage Admin</h1>
                    <p style={isMobile ? mobileStyles.subtitle : styles.subtitle}>
                        จัดการ URL และการแสดงผลหน้าจอ Digital Signage
                    </p>
                </div>
                <div style={styles.headerActions}>
                    <button onClick={loadAll} style={isMobile ? mobileStyles.btnSecondary : styles.btnSecondary}>
                        <span style={styles.btnIcon}>🔄</span>
                        {!isMobile && <span style={styles.btnText}>Refresh</span>}
                    </button>
                    <button onClick={onNew} style={isMobile ? mobileStyles.btnPrimary : styles.btnPrimary}>
                        <span style={styles.btnIcon}>➕</span>
                        {!isMobile && <span style={styles.btnText}>New</span>}
                    </button>
                </div>
            </div>

            {/* Mobile Device Toggle */}
            {isMobile && (
                <button
                    onClick={() => setShowDeviceList(!showDeviceList)}
                    style={mobileStyles.mobileToggle}
                >
                    <span style={mobileStyles.toggleIcon}>
                        {showDeviceList ? "📝" : "📱"}
                    </span>
                    <span style={mobileStyles.toggleText}>
                        {showDeviceList ? "แก้ไข Config" : "เลือก Device"}
                    </span>
                    <span style={mobileStyles.toggleBadge}>{deviceIds.length}</span>
                </button>
            )}

            <div style={isMobile ? mobileStyles.container : styles.container}>
                {/* Device List Sidebar */}
                <aside
                    style={
                        isMobile
                            ? {
                                ...mobileStyles.sidebar,
                                ...(showDeviceList ? mobileStyles.sidebarVisible : {}),
                            }
                            : styles.sidebar
                    }
                >
                    {/* Mobile overlay backdrop */}
                    {isMobile && showDeviceList && (
                        <div
                            style={mobileStyles.backdrop}
                            onClick={() => setShowDeviceList(false)}
                        />
                    )}

                    <div style={isMobile ? mobileStyles.sidebarContent : {}}>
                        <div style={styles.sidebarHeader}>
                            <h2 style={styles.sidebarTitle}>Devices</h2>
                            <span style={styles.badge}>{deviceIds.length}</span>
                            {isMobile && (
                                <button
                                    onClick={() => setShowDeviceList(false)}
                                    style={mobileStyles.closeBtn}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <div style={isMobile ? mobileStyles.deviceList : styles.deviceList}>
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
                                            if (isMobile) setShowDeviceList(false);
                                        }}
                                        style={{
                                            ...styles.deviceCard,
                                            ...(isActive ? styles.deviceCardActive : {}),
                                        }}
                                    >
                                        <div style={styles.deviceHeader}>
                                            <span style={styles.deviceIcon}>
                                                {cfg?.layout === "split"
                                                    ? "⚡"
                                                    : cfg?.layout === "web_only"
                                                        ? "🌐"
                                                        : "📹"}
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
                    </div>
                </aside>

                {/* Main Editor */}
                <main style={styles.main}>
                    <div style={isMobile ? mobileStyles.editorCard : styles.editorCard}>
                        {/* Basic Config Section */}
                        <section style={isMobile ? mobileStyles.section : styles.section}>
                            <h3 style={styles.sectionTitle}>⚙️ ตั้งค่าพื้นฐาน</h3>

                            <div style={styles.field}>
                                <label style={styles.label}>Device ID</label>
                                <input
                                    value={deviceId}
                                    onChange={(e) => setDeviceId(e.target.value)}
                                    placeholder="เช่น DEVICE_001"
                                    style={isMobile ? mobileStyles.input : styles.input}
                                />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Web URL</label>
                                <input
                                    value={webUrl}
                                    onChange={(e) => setWebUrl(e.target.value)}
                                    placeholder="https://yourdomain.com/display"
                                    style={isMobile ? mobileStyles.input : styles.input}
                                />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Video URL</label>
                                <input
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://cdn.com/video.mp4"
                                    style={isMobile ? mobileStyles.input : styles.input}
                                />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Layout Mode</label>
                                <select
                                    value={layout}
                                    onChange={(e) => setLayout(e.target.value as LayoutMode)}
                                    style={isMobile ? mobileStyles.select : styles.select}
                                >
                                    <option value="split">Split (แบ่งหน้าจอ)</option>
                                    <option value="web_only">Web Only</option>
                                    <option value="video_only">Video Only</option>
                                </select>
                            </div>
                        </section>

                        {/* Screen Configuration */}
                        <section style={isMobile ? mobileStyles.section : styles.section}>
                            <h3 style={styles.sectionTitle}>📐 ตั้งค่าหน้าจอ</h3>

                            <div style={styles.field}>
                                <label style={styles.label}>Orientation</label>
                                <select
                                    value={orientation}
                                    onChange={(e) =>
                                        setOrientation(e.target.value as ScreenOrientation)
                                    }
                                    style={isMobile ? mobileStyles.select : styles.select}
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
                                    style={isMobile ? mobileStyles.slider : styles.slider}
                                />
                                <div style={isMobile ? mobileStyles.sliderValue : {}}>
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
                            </div>

                            {/* Presets */}
                            <div style={isMobile ? mobileStyles.presetGroup : styles.presetGroup}>
                                <div style={styles.presetLabel}>Quick Presets:</div>
                                <div style={styles.presetButtons}>
                                    <button
                                        style={isMobile ? mobileStyles.presetBtn : styles.presetBtn}
                                        onClick={() => presetSplit(50)}
                                    >
                                        50/50
                                    </button>
                                    <button
                                        style={isMobile ? mobileStyles.presetBtn : styles.presetBtn}
                                        onClick={() => presetSplit(35)}
                                    >
                                        35/65
                                    </button>
                                    <button
                                        style={isMobile ? mobileStyles.presetBtn : styles.presetBtn}
                                        onClick={() => presetSplit(25)}
                                    >
                                        25/75
                                    </button>
                                    <button
                                        style={isMobile ? mobileStyles.presetBtn : styles.presetBtn}
                                        onClick={() => setLayout("web_only")}
                                    >
                                         Web
                                    </button>
                                    <button
                                        style={isMobile ? mobileStyles.presetBtn : styles.presetBtn}
                                        onClick={() => setLayout("video_only")}
                                    >
                                        Video
                                    </button>
                                </div>
                            </div>

                            <div style={isMobile ? mobileStyles.fieldRow : styles.fieldRow}>
                                <div style={styles.fieldHalf}>
                                    <label style={styles.label}>Gap (px)</label>
                                    <input
                                        value={String(gapPx)}
                                        onChange={(e) =>
                                            setGapPx(clamp(parseNum(e.target.value, 0), 0, 200))
                                        }
                                        placeholder="0-200"
                                        style={isMobile ? mobileStyles.input : styles.input}
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
                                        style={isMobile ? mobileStyles.input : styles.input}
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Save Section */}
                        <div style={isMobile ? mobileStyles.saveSection : styles.saveSection}>
                            <button
                                onClick={onSave}
                                disabled={saving || !deviceId}
                                style={{
                                    ...(isMobile ? mobileStyles.saveBtn : styles.saveBtn),
                                    ...(saving || !deviceId ? styles.saveBtnDisabled : {}),
                                }}
                            >
                                {saving ? " Saving..." : " Save Configuration"}
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

                        <div style={isMobile ? mobileStyles.infoBox : styles.infoBox}>
                            <div style={styles.infoIcon}>ℹ️</div>
                            <div style={isMobile ? mobileStyles.infoText : styles.infoText}>
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
        paddingTop: "0",
        paddingRight: "0",
        paddingBottom: "0",
        paddingLeft: "0",
        margin: "0",
    },
    header: {
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
        paddingTop: "20px",
        paddingRight: "24px",
        paddingBottom: "20px",
        paddingLeft: "24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        flexWrap: "wrap",
    },
    headerContent: {
        flex: "1",
        minWidth: "200px",
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
    container: {
        display: "grid",
        gridTemplateColumns: "340px 1fr",
        gap: "24px",
        paddingTop: "24px",
        paddingRight: "24px",
        paddingBottom: "24px",
        paddingLeft: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
    },
    sidebar: {
        background: "rgba(255, 255, 255, 0.98)",
        borderRadius: "16px",
        paddingTop: "20px",
        paddingRight: "20px",
        paddingBottom: "20px",
        paddingLeft: "20px",
        height: "fit-content",
        position: "sticky" as const,
        top: "24px",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
    },
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
        flex: "1",
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
        flexDirection: "column" as const,
        gap: "8px",
        maxHeight: "calc(100vh - 180px)",
        overflowY: "auto" as const,
        paddingRight: "4px",
    },
    emptyState: {
        textAlign: "center" as const,
        paddingTop: "40px",
        paddingRight: "20px",
        paddingBottom: "40px",
        paddingLeft: "20px",
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
        paddingTop: "14px",
        paddingRight: "14px",
        paddingBottom: "14px",
        paddingLeft: "14px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        textAlign: "left" as const,
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
        textTransform: "uppercase" as const,
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
        paddingTop: "28px",
        paddingRight: "28px",
        paddingBottom: "28px",
        paddingLeft: "28px",
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
        flexDirection: "column" as const,
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
        paddingTop: "12px",
        paddingRight: "16px",
        paddingBottom: "12px",
        paddingLeft: "16px",
        border: "2px solid #e5e7eb",
        borderRadius: "10px",
        fontSize: "14px",
        fontFamily: "inherit",
        transition: "all 0.2s ease",
        outline: "none",
        color: "#1f2937",
        background: "white",
        boxSizing: "border-box" as const,
    },
    inputSmall: {
        width: "80px",
        paddingTop: "8px",
        paddingRight: "12px",
        paddingBottom: "8px",
        paddingLeft: "12px",
        border: "2px solid #e5e7eb",
        borderRadius: "8px",
        fontSize: "14px",
        color: "#1f2937",
        textAlign: "center" as const,
        fontWeight: "600",
        outline: "none",
    },
    select: {
        width: "100%",
        paddingTop: "12px",
        paddingRight: "16px",
        paddingBottom: "12px",
        paddingLeft: "16px",
        border: "2px solid #e5e7eb",
        borderRadius: "10px",
        fontSize: "14px",
        fontFamily: "inherit",
        color: "#1f2937",
        background: "white",
        cursor: "pointer",
        outline: "none",
        boxSizing: "border-box" as const,
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
        paddingTop: "16px",
        paddingRight: "16px",
        paddingBottom: "16px",
        paddingLeft: "16px",
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
        flexWrap: "wrap" as const,
    },
    presetBtn: {
        paddingTop: "8px",
        paddingRight: "16px",
        paddingBottom: "8px",
        paddingLeft: "16px",
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
        paddingTop: "16px",
        paddingRight: "24px",
        paddingBottom: "16px",
        paddingLeft: "24px",
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
        paddingTop: "12px",
        paddingRight: "16px",
        paddingBottom: "12px",
        paddingLeft: "16px",
        background: "#d1fae5",
        border: "2px solid #6ee7b7",
        borderRadius: "10px",
        color: "#065f46",
        fontSize: "14px",
        fontWeight: "600",
        textAlign: "center" as const,
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
        paddingTop: "14px",
        paddingRight: "16px",
        paddingBottom: "14px",
        paddingLeft: "16px",
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
        paddingTop: "10px",
        paddingRight: "20px",
        paddingBottom: "10px",
        paddingLeft: "20px",
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
        paddingTop: "10px",
        paddingRight: "20px",
        paddingBottom: "10px",
        paddingLeft: "20px",
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
};

// Mobile-specific styles
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mobileStyles: Record<string, any> = {
    page: {
        ...styles.page,
        minHeight: "100vh",

    },
    header: {
        ...styles.header,
        paddingTop: "12px",
        paddingRight: "16px",
        paddingBottom: "12px",
        paddingLeft: "16px",
        position: "sticky" as const,
        top: "0",
        zIndex: "999",
    },
    h1: {
        ...styles.h1,
        fontSize: "20px",
    },
    subtitle: {
        ...styles.subtitle,
        fontSize: "12px",
        margin: "4px 0 0",
    },
    btnPrimary: {
        ...styles.btnPrimary,
        paddingTop: "10px",
        paddingRight: "16px",
        paddingBottom: "10px",
        paddingLeft: "16px",
        minWidth: "48px",
        justifyContent: "center",
    },
    btnSecondary: {
        ...styles.btnSecondary,
        paddingTop: "10px",
        paddingRight: "16px",
        paddingBottom: "10px",
        paddingLeft: "16px",
        minWidth: "48px",
        justifyContent: "center",
    },
    mobileToggle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        width: "calc(100% - 32px)",
        margin: "12px 16px",
        paddingTop: "14px",
        paddingRight: "20px",
        paddingBottom: "14px",
        paddingLeft: "20px",
        background: "white",
        border: "2px solid #e5e7eb",
        borderRadius: "12px",
        fontSize: "15px",
        fontWeight: "700",
        color: "#1f2937",
        cursor: "pointer",
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)",
        transition: "all 0.2s ease",
        WebkitTapHighlightColor: "transparent",
    },
    toggleIcon: {
        fontSize: "18px",
    },
    toggleText: {
        flex: "1",
        textAlign: "left" as const,
    },
    toggleBadge: {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        paddingTop: "4px",
        paddingRight: "12px",
        paddingBottom: "4px",
        paddingLeft: "12px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "700",
    },
    container: {
        display: "block",
        paddingTop: "0",
        paddingRight: "16px",
        paddingBottom: "80px",
        paddingLeft: "16px",
    },
    backdrop: {
        position: "fixed" as const,
        top: "0",
        left: "0",
        right: "0",
        bottom: "0",
        background: "rgba(0, 0, 0, 0.5)",
        zIndex: "998",
        backdropFilter: "blur(4px)",
    },
    sidebar: {
        position: "fixed" as const,
        bottom: "0",
        left: "0",
        right: "0",
        zIndex: "999",
        transform: "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        borderRadius: "20px 20px 0 0",
        maxHeight: "85vh",
        background: "white",
        boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.15)",
    },
    sidebarVisible: {
        transform: "translateY(0)",
    },
    sidebarContent: {
        paddingTop: "20px",
        paddingRight: "20px",
        paddingBottom: "20px",
        paddingLeft: "20px",
        overflowY: "auto" as const,
        maxHeight: "calc(85vh - 60px)",
        WebkitOverflowScrolling: "touch" as const,
    },
    closeBtn: {
        width: "32px",
        height: "32px",
        paddingTop: "0",
        paddingRight: "0",
        paddingBottom: "0",
        paddingLeft: "0",
        background: "#f3f4f6",
        border: "none",
        borderRadius: "8px",
        fontSize: "18px",
        color: "#6b7280",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
    },
    deviceList: {
        ...styles.deviceList,
        maxHeight: "none",
        paddingBottom: "20px",
    },
    editorCard: {
        ...styles.editorCard,
        paddingTop: "20px",
        paddingRight: "20px",
        paddingBottom: "20px",
        paddingLeft: "20px",
        margin: "16px 0",
    },
    section: {
        ...styles.section,
        marginBottom: "28px",
    },
    input: {
        ...styles.input,
        fontSize: "16px", // Prevent zoom on iOS
        paddingTop: "14px",
        paddingRight: "16px",
        paddingBottom: "14px",
        paddingLeft: "16px",
    },
    select: {
        ...styles.select,
        fontSize: "16px", // Prevent zoom on iOS
        paddingTop: "14px",
        paddingRight: "16px",
        paddingBottom: "14px",
        paddingLeft: "16px",
    },
    slider: {
        ...styles.slider,
        height: "8px",
        marginBottom: "16px",
    },
    sliderValue: {
        display: "flex",
        justifyContent: "center",
    },
    presetGroup: {
        ...styles.presetGroup,
        paddingTop: "14px",
        paddingRight: "14px",
        paddingBottom: "14px",
        paddingLeft: "14px",
    },
    presetBtn: {
        ...styles.presetBtn,
        flex: "1",
        minWidth: "calc(33.333% - 6px)",
        paddingTop: "10px",
        paddingRight: "12px",
        paddingBottom: "10px",
        paddingLeft: "12px",
        fontSize: "12px",
        textAlign: "center" as const,
    },
    fieldRow: {
        ...styles.fieldRow,
        gridTemplateColumns: "1fr",
        gap: "16px",
    },
    saveSection: {
        ...styles.saveSection,
        position: "sticky" as const,
        bottom: "0",
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(10px)",

        marginTop: "0",
        marginRight: "-20px",
        marginBottom: "-20px",
        marginLeft: "-20px",

        paddingTop: "16px",
        paddingRight: "20px",
        paddingBottom: "20px",
        paddingLeft: "20px",
        borderTop: "2px solid #f3f4f6",
        borderRadius: "0 0 16px 16px",
    },

    saveBtn: {
        ...styles.saveBtn,
        paddingTop: "16px",
        paddingRight: "24px",
        paddingBottom: "16px",
        paddingLeft: "24px",
        fontSize: "16px",
        WebkitTapHighlightColor: "transparent",
    },
    infoBox: {
        ...styles.infoBox,
        flexDirection: "column" as const,
        textAlign: "center" as const,
        marginTop: "16px",
    },
    infoText: {
        ...styles.infoText,
        fontSize: "12px",
    },
};