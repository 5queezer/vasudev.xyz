import { useEffect, useRef } from "react";

const COMMUNITY_COLORS = [
  '#d7a673', '#8ec5a0', '#7bacd9', '#d98cb8', '#c5c56a',
  '#e07a6a', '#9b8ed4', '#6ac5c5', '#d4a06a', '#a0d468',
  '#d4986a', '#6ad4b0', '#d47a9b', '#a3bfe0'
];

interface MiniGraphNode {
  id: string;
  label: string;
  sourceFile: string;
  sourceUrl?: string;
  sourceAnchor?: string;
  community?: number;
}

interface MiniGraphLink {
  source: string;
  target: string;
  relation: string;
  confidence: number;
}

interface MiniGraphProps {
  nodes: MiniGraphNode[];
  links: MiniGraphLink[];
}

let loadPromise: Promise<any> | null = null;

function loadForceGraph3D(): Promise<any> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    if ((window as any).ForceGraph3D) {
      resolve((window as any).ForceGraph3D);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/3d-force-graph@1.80.0/dist/3d-force-graph.min.js";
    script.integrity = "sha384-Y7bC2PBKu8ujxtvo5+Z61OeGdSVRzFsYWBK4i5dnL/U6aFDTodk61qOUkTfInaxS";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      const fg = (window as any).ForceGraph3D;
      if (fg) {
        resolve(fg);
      } else {
        loadPromise = null;
        script.remove();
        reject(new Error("ForceGraph3D global not available after script load"));
      }
    };
    script.onerror = (err) => {
      loadPromise = null;
      script.remove();
      reject(err);
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

function slugFromSourceFile(sf: string): string | null {
  if (!sf.startsWith("content/blog/")) return null;
  return sf.replace("content/blog/", "").replace(/\.md$/, "");
}

export function MiniGraph({ nodes, links }: MiniGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    const el = containerRef.current;
    let cancelled = false;
    let observer: ResizeObserver | null = null;

    loadForceGraph3D().then((ForceGraph3D) => {
      if (cancelled || !el) return;

      const isDark = !document.documentElement.getAttribute("data-theme") ||
        document.documentElement.getAttribute("data-theme") !== "light";

      const graph = ForceGraph3D()(el)
        .width(el.clientWidth)
        .height(el.clientHeight || 180)
        .backgroundColor("rgba(0,0,0,0)")
        .nodeLabel("label")
        .nodeVal(() => 2)
        .nodeColor((n: any) => {
          if (n.community != null && n.community >= 0) {
            return COMMUNITY_COLORS[n.community % COMMUNITY_COLORS.length];
          }
          return isDark ? "#888" : "#666";
        })
        .nodeOpacity(0.9)
        .nodeResolution(8)
        .linkWidth((e: any) => e.confidence > 0.8 ? 1.5 : 0.5)
        .linkColor(() => isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)")
        .linkOpacity(0.7)
        .onNodeClick((node: any) => {
          if (node.sourceUrl) {
            window.open(node.sourceUrl, "_blank", "noopener");
            return;
          }
          const slug = slugFromSourceFile(node.sourceFile || "");
          if (slug) {
            let url = `/blog/${slug}/`;
            if (node.sourceAnchor) url += `#${node.sourceAnchor}`;
            window.location.href = url;
          }
        })
        .d3AlphaDecay(0.06)
        .d3VelocityDecay(0.4)
        .warmupTicks(40)
        .cooldownTicks(80)
        .graphData({ nodes: [...nodes], links: [...links] });

      graphRef.current = graph;

      observer = new ResizeObserver(() => {
        if (graphRef.current && el) {
          graphRef.current.width(el.clientWidth).height(el.clientHeight || 180);
        }
      });
      observer.observe(el);

      setTimeout(() => {
        if (!cancelled && graph) {
          graph.zoomToFit(300, 20);
        }
      }, 500);
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (graphRef.current) {
        // 3d-force-graph exposes _destructor as its only cleanup method
        if (typeof graphRef.current._destructor === "function") {
          graphRef.current._destructor();
        }
        graphRef.current = null;
      }
    };
  }, [nodes, links]);

  if (nodes.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="chat-mini-graph"
    />
  );
}
