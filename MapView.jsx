/* global React, L */
/* MapView — Leaflet wrapper with base-map switching, clustering, heatmap, measure tool */
const { useState: useStateM, useEffect: useEffectM, useRef: useRefM, useMemo: useMemoM, useCallback: useCallbackM } = React;

/* Base layers */
const TILE_LAYERS = {
  street: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap, © CARTO",
    label: "Street",
    dark: false,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri",
    label: "Satellite",
    dark: true,
  },
};

function MapView({ points, kind = "meter", selectedId, onSelect, onNavigate, onMeasure, baseMap = "satellite", showHeatmap = false, showCluster = true }) {
  const containerRef = useRefM(null);
  const mapRef = useRefM(null);
  const tileRef = useRefM(null);
  const markersLayerRef = useRefM(null);
  const heatLayerRef = useRefM(null);
  const measureLayerRef = useRefM(null);
  const [measureMode, setMeasureMode] = useStateM(false);
  const [measurePts, setMeasurePts] = useStateM([]);
  const [measureDist, setMeasureDist] = useStateM(0);

  // Initialize map ONCE
  useEffectM(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: [19.86, 99.18],
      zoom: 11,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);
    measureLayerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.stop();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Base map switching
  useEffectM(() => {
    if (!mapRef.current) return;
    const cfg = TILE_LAYERS[baseMap] || TILE_LAYERS.street;
    if (tileRef.current) mapRef.current.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(cfg.url, { attribution: cfg.attribution, maxZoom: 19 }).addTo(mapRef.current);
  }, [baseMap]);

  // Helper: build popup HTML — uses CSS variables so it works in both light and dark mode
  const popupHtml = useCallbackM((p) => {
    const navBtn = (isMeter) => `background:linear-gradient(135deg,${isMeter ? "#6b2c91,#f47b20" : "#f47b20,#d96512"});color:white;font-weight:700;font-size:12px;cursor:pointer;border:0`;
    const outBtn = `background:var(--soft);color:var(--ink);border:1px solid var(--line);font-weight:600;font-size:11px;cursor:pointer`;
    if (kind === "meter") {
      return `
        <div style="padding:14px 16px">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#6b2c91,#8b3fc4);display:grid;place-items:center;color:white;font-weight:800">M</div>
            <div>
              <div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:var(--ink-mute);text-transform:uppercase">PEA Meter</div>
              <div style="font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:13px;color:var(--ink)">${p.PEANO || p.TAG}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12.5px;color:var(--ink-2);margin-bottom:12px">
            <div style="color:var(--ink-mute)">CODE</div><div style="font-weight:600">${p.CODE} • ROUTE ${p.ROUTE}</div>
            <div style="color:var(--ink-mute)">FEEDER</div><div style="font-weight:600">${p.FEEDERID || "—"}</div>
            <div style="color:var(--ink-mute)">PEANO</div><div style="font-family:'IBM Plex Mono',monospace">${p.PEANO}</div>
            <div style="color:var(--ink-mute)">OWNER</div><div>${p.OWNER || "—"}</div>
            <div style="color:var(--ink-mute)">พิกัด</div><div style="font-family:'IBM Plex Mono',monospace;font-size:11px">${p.LATITUDE.toFixed(5)}, ${p.LONGITUDE.toFixed(5)}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button data-nav="in"     data-id="${p.OBJECTID}" style="flex:1;height:34px;border-radius:8px;${navBtn(true)}">นำทาง</button>
            <button data-nav="google" data-id="${p.OBJECTID}" style="height:34px;padding:0 10px;border-radius:8px;${outBtn}">Google</button>
            <button data-nav="apple"  data-id="${p.OBJECTID}" style="height:34px;padding:0 10px;border-radius:8px;${outBtn}">Apple</button>
            <button data-copy="${p.LATITUDE.toFixed(6)},${p.LONGITUDE.toFixed(6)}" data-id="${p.OBJECTID}" style="height:34px;padding:0 10px;border-radius:8px;${outBtn}">📋 พิกัด</button>
          </div>
        </div>`;
    } else {
      return `
        <div style="padding:14px 16px">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#f47b20,#d96512);display:grid;place-items:center;color:white;font-weight:800">T</div>
            <div>
              <div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:var(--ink-mute);text-transform:uppercase">PEA หม้อแปลง</div>
              <div style="font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:13px;color:var(--ink)">${p.PEANO_TR || p.TAG}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12.5px;color:var(--ink-2);margin-bottom:8px">
            <div style="color:var(--ink-mute)">PEANO</div><div style="font-family:'IBM Plex Mono',monospace">${p.PEANO_TR}</div>
            <div style="color:var(--ink-mute)">ระบบ</div><div style="font-weight:600">${p.PHASE} • ${p.VOLTAGE}</div>
            <div style="color:var(--ink-mute)">พิกัด kVA</div><div style="font-weight:700">${p.KVA} kVA</div>
            <div style="color:var(--ink-mute)">เฟส</div><div>${p.INSTALL_PHASE}</div>
            <div style="color:var(--ink-mute)">เจ้าของ</div><div>${p.OWNER_TR}</div>
            <div style="color:var(--ink-mute)">Feeder</div><div>${p.FEEDER1}</div>
          </div>
          <div style="font-size:12px;color:var(--ink-2);background:var(--soft);padding:6px 8px;border-radius:6px;margin-bottom:10px">📍 ${p.LOCATION}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button data-nav="in"     data-id="${p.OBJECTID}" style="flex:1;height:34px;border-radius:8px;${navBtn(false)}">นำทาง</button>
            <button data-nav="google" data-id="${p.OBJECTID}" style="height:34px;padding:0 10px;border-radius:8px;${outBtn}">Google</button>
            <button data-nav="apple"  data-id="${p.OBJECTID}" style="height:34px;padding:0 10px;border-radius:8px;${outBtn}">Apple</button>
            <button data-copy="${p.LATITUDE.toFixed(6)},${p.LONGITUDE.toFixed(6)}" data-id="${p.OBJECTID}" style="height:34px;padding:0 10px;border-radius:8px;${outBtn}">📋 พิกัด</button>
          </div>
        </div>`;
    }
  }, [kind]);

  // Marker rendering with clustering
  useEffectM(() => {
    if (!mapRef.current || !markersLayerRef.current) return;
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    const drawMarker = (p, isSelected) => {
      const initial = kind === "meter" ? "M" : "T";
      const icon = L.divIcon({
        className: "",
        html: `<div class="pea-marker ${kind === "tr" ? "tr" : ""} ${isSelected ? "selected" : ""}" style="position:relative;overflow:visible"><div class="pea-marker-pulse"></div><div class="pea-marker-pulse pea-marker-pulse-2"></div><span>${initial}</span></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 32],
        popupAnchor: [0, -28],
      });
      const m = L.marker([p.LATITUDE, p.LONGITUDE], { icon, riseOnHover: true });
      m.bindPopup(popupHtml(p), { maxWidth: 340, closeButton: true, autoPanPadding: [40, 40] });
      m.on("click", () => onSelect?.(p));
      m.on("popupopen", (ev) => {
        const root = ev.popup.getElement();
        if (!root) return;
        root.querySelectorAll("button[data-nav]").forEach(b => {
          b.onclick = () => {
            const action = b.dataset.nav;
            if (action === "google") {
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.LATITUDE},${p.LONGITUDE}`, "_blank");
            } else if (action === "apple") {
              window.open(`https://maps.apple.com/?daddr=${p.LATITUDE},${p.LONGITUDE}`, "_blank");
            } else {
              onNavigate?.(p);
            }
          };
        });
        root.querySelectorAll("button[data-copy]").forEach(b => {
          b.onclick = () => {
            navigator.clipboard.writeText(b.dataset.copy).then(() => {
              const orig = b.textContent;
              b.textContent = "✓ คัดลอกแล้ว!";
              setTimeout(() => { b.textContent = orig; }, 2000);
            });
          };
        });
      });
      return m;
    };

    if (showCluster && points.length > 5) {
      const z = map.getZoom();
      const gridSize = z >= 15 ? 0.0006 : z >= 13 ? 0.002 : z >= 11 ? 0.008 : 0.035;
      const cells = new Map();
      points.forEach(p => {
        const key = `${Math.floor(p.LATITUDE / gridSize)}_${Math.floor(p.LONGITUDE / gridSize)}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(p);
      });
      cells.forEach(group => {
        if (group.length === 1) {
          drawMarker(group[0], group[0].OBJECTID === selectedId).addTo(layer);
        } else {
          const lat = group.reduce((s, p) => s + p.LATITUDE, 0) / group.length;
          const lng = group.reduce((s, p) => s + p.LONGITUDE, 0) / group.length;
          const icon = L.divIcon({
            className: "",
            html: `<div class="cluster-marker">${group.length}</div>`,
            iconSize: [44, 44],
            iconAnchor: [22, 22],
            popupAnchor: [0, -24],
          });
          const m = L.marker([lat, lng], { icon, riseOnHover: true });

          // Build cluster popup listing up to 5 items
          const preview = group.slice(0, 5);
          const extra = group.length - preview.length;
          const isMeter = kind === "meter";
          const accent = isMeter ? "#6b2c91" : "#f47b20";
          const rows = preview.map((p, i) => `
            <div data-cluster-item="${i}" style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;cursor:pointer;transition:background 140ms" onmouseover="this.style.background='var(--soft)'" onmouseout="this.style.background='transparent'">
              <div style="width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,${accent},${isMeter ? "#8b3fc4" : "#d96512"});display:grid;place-items:center;color:white;font-weight:800;font-size:11px;flex-shrink:0">${isMeter ? "M" : "T"}</div>
              <div style="min-width:0">
                <div style="font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:12px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${isMeter ? (p.PEANO || p.TAG) : (p.PEANO_TR || p.TAG)}</div>
                <div style="font-size:11px;color:var(--ink-mute)">${p.TAG}</div>
              </div>
            </div>`).join("");

          const popupContent = `
            <div style="padding:10px 12px 8px;min-width:230px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,${accent},${isMeter?"#8b3fc4":"#d96512"});display:grid;place-items:center;color:white;font-weight:800;font-size:13px">${group.length}</div>
                <div style="font-weight:700;font-size:13px;color:var(--ink)">${isMeter ? "PEA Meter" : "PEA Transformer"}</div>
              </div>
              <div style="font-size:11px;color:var(--ink-mute);margin-bottom:6px">กดรายการเพื่อดูข้อมูล</div>
              ${rows}
              ${extra > 0 ? `<div style="text-align:center;font-size:11px;color:var(--ink-mute);padding:4px 0">+ อีก ${extra} รายการ</div>` : ""}
              <button data-zoom-cluster style="margin-top:8px;width:100%;height:32px;border-radius:8px;background:linear-gradient(135deg,${accent},${isMeter?"#8b3fc4":"#d96512"});color:white;font-weight:700;font-size:12px;border:0;cursor:pointer">ซูมเข้าดูทั้งหมด</button>
            </div>`;

          m.bindPopup(popupContent, { maxWidth: 280, closeButton: true, autoPanPadding: [40, 40] });
          m.on("popupopen", (ev) => {
            const root = ev.popup.getElement();
            if (!root) return;
            root.querySelectorAll("[data-cluster-item]").forEach((el, i) => {
              el.onclick = () => {
                map.closePopup();
                onSelect?.(preview[i]);
                map.flyTo([preview[i].LATITUDE, preview[i].LONGITUDE], Math.max(z + 3, 16), { duration: 0.7 });
              };
            });
            const zoomBtn = root.querySelector("[data-zoom-cluster]");
            if (zoomBtn) zoomBtn.onclick = () => {
              map.closePopup();
              map.flyTo([lat, lng], Math.min(z + 3, 18), { duration: 0.6 });
            };
          });
          m.addTo(layer);
        }
      });
    } else {
      points.forEach(p => drawMarker(p, p.OBJECTID === selectedId).addTo(layer));
    }
  }, [points, kind, selectedId, showCluster, onSelect, onNavigate, popupHtml]);

  // Heatmap (custom canvas overlay)
  useEffectM(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    if (!showHeatmap || points.length === 0) return;

    const heatLayer = L.layerGroup();
    points.forEach(p => {
      L.circle([p.LATITUDE, p.LONGITUDE], {
        radius: 220, color: "transparent",
        fillColor: kind === "meter" ? "#8b3fc4" : "#f47b20",
        fillOpacity: 0.18, interactive: false,
      }).addTo(heatLayer);
      L.circle([p.LATITUDE, p.LONGITUDE], {
        radius: 110, color: "transparent",
        fillColor: kind === "meter" ? "#6b2c91" : "#d96512",
        fillOpacity: 0.28, interactive: false,
      }).addTo(heatLayer);
    });
    heatLayer.addTo(map);
    heatLayerRef.current = heatLayer;
  }, [showHeatmap, points, kind]);

  // Re-cluster on zoom
  useEffectM(() => {
    if (!mapRef.current) return;
    const m = mapRef.current;
    const onZoom = () => {
      setZoomTick(t => t + 1);
    };
    m.on("zoomend", onZoom);
    return () => m.off("zoomend", onZoom);
  }, []);
  const [zoomTick, setZoomTick] = useStateM(0);

  // Fly to selected
  useEffectM(() => {
    if (!mapRef.current || !selectedId) return;
    const p = points.find(x => x.OBJECTID === selectedId);
    if (p) {
      mapRef.current.flyTo([p.LATITUDE, p.LONGITUDE], Math.max(mapRef.current.getZoom(), 15), { duration: 0.7 });
    }
  }, [selectedId, points]);

  // Fit bounds when points change significantly
  useEffectM(() => {
    if (!mapRef.current || points.length === 0) return;
    const bounds = L.latLngBounds(points.map(p => [p.LATITUDE, p.LONGITUDE]));
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, animate: true });
    }
  }, [points.length === 0 ? 0 : points[0]?.OBJECTID, points.length]);

  // Measure tool
  useEffectM(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const layer = measureLayerRef.current;
    layer.clearLayers();
    if (!measureMode) {
      setMeasurePts([]);
      setMeasureDist(0);
      map.getContainer().style.cursor = "";
      return;
    }
    map.getContainer().style.cursor = "crosshair";
    const onClick = (e) => {
      setMeasurePts(prev => {
        const next = [...prev, [e.latlng.lat, e.latlng.lng]];
        layer.clearLayers();
        next.forEach(pt => L.circleMarker(pt, { radius: 5, color: "#f47b20", fillColor: "#fff", fillOpacity: 1, weight: 2 }).addTo(layer));
        if (next.length >= 2) {
          L.polyline(next, { color: "#f47b20", weight: 3, dashArray: "8 6" }).addTo(layer);
          let dist = 0;
          for (let i = 1; i < next.length; i++) {
            dist += map.distance(next[i - 1], next[i]);
          }
          setMeasureDist(dist);
        }
        return next;
      });
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
      map.getContainer().style.cursor = "";
    };
  }, [measureMode]);

  const [locating, setLocating] = useRefM(false);
  const goToMyLocation = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { duration: 1.2 });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  return (
    <div className="map-wrap" style={{ height: "100%" }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      {/* My Location button */}
      <button onClick={goToMyLocation} title="ตำแหน่งของฉัน" style={{
        position:"absolute", bottom: 90, right: 12, zIndex: 500,
        width: 40, height: 40, borderRadius: 12,
        background: "var(--surface)", border: "1px solid var(--line)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: locating ? "var(--pea-purple-500)" : "var(--ink)",
        fontSize: 18, transition: "color 0.2s",
      }}>
        {locating ? "⏳" : "📍"}
      </button>
      {measureMode && (
        <div className="fade-in" style={{
          position: "absolute", top: 12, left: 12, zIndex: 500,
          background: "var(--surface)", border: "1px solid var(--line)",
          padding: "10px 14px", borderRadius: 14, boxShadow: "var(--shadow-md)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Icon name="ruler" size={16} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            ระยะทาง: {measureDist < 1000 ? `${measureDist.toFixed(0)} ม.` : `${(measureDist / 1000).toFixed(2)} กม.`}
          </span>
          <span className="t-mute text-xs">คลิกเพื่อเพิ่มจุด</span>
          <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => setMeasureMode(false)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
      <div className="map-controls">
        <button className={"btn-icon " + (measureMode ? "active" : "")} title="วัดระยะทาง" onClick={() => setMeasureMode(m => !m)}>
          <Icon name="ruler" />
        </button>
      </div>
    </div>
  );
}

window.MapView = MapView;
window.TILE_LAYERS = TILE_LAYERS;
