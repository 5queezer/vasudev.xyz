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
    script.src = "https://unpkg.com/3d-force-graph@1";
    script.onload = () => resolve((window as any).ForceGraph3D);
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

      const h = el.clientHeight || 220;
      const graph = ForceGraph3D()(el)
        .width(el.clientWidth)
        .height(h)
        .backgroundColor("rgba(0,0,0,0)")
        .nodeLabel("label")
        .nodeVal(() => 3)
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
          const slug = slugFromSourceFile(node.sourceFile || "");
          if (slug) window.location.href = `/blog/${slug}/`;
        })
        .d3AlphaDecay(0.05)
        .d3VelocityDecay(0.4)
        .warmupTicks(40)
        .cooldownTicks(100)
        .graphData({ nodes: [...nodes], links: [...links] });

      graphRef.current = graph;

      observer = new ResizeObserver(() => {
        if (graphRef.current && el) {
          graphRef.current.width(el.clientWidth).height(el.clientHeight || 220);
        }
      });
      observer.observe(el);

      setTimeout(() => {
        if (!cancelled && graph) {
          graph.zoomToFit(300, 40);
        }
      }, 500);
    });

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (graphRef.current) {
        graphRef.current._destructor?.();
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
