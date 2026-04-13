#!/usr/bin/env python3
"""Sync graphify output to static/data/graph.json with community names.

graphify generates graph.json without community_name, but the GRAPH_REPORT.md
has community names in section headers like:

    ### Community 0 - "Go Test Infrastructure"

This script parses the report, patches each node with its community_name,
and writes the result to static/data/graph.json for the Hugo graph page.

Usage:
    python3 scripts/sync-graph.py
    python3 scripts/sync-graph.py --graphify-dir graphify-out --output static/data/graph.json
"""

import argparse
import json
import re
import sys
from pathlib import Path


def parse_community_names(report_path: Path) -> dict[int, str]:
    """Extract community ID -> name mapping from GRAPH_REPORT.md."""
    pattern = re.compile(r'^### Community (\d+) - "(.+)"')
    names = {}
    with open(report_path) as f:
        for line in f:
            m = pattern.match(line)
            if m:
                names[int(m.group(1))] = m.group(2)
    return names


def main():
    parser = argparse.ArgumentParser(description="Sync graphify output with community names")
    parser.add_argument(
        "--graphify-dir",
        default="graphify-out",
        help="Directory containing graphify output (default: graphify-out)",
    )
    parser.add_argument(
        "--output",
        default="static/data/graph.json",
        help="Output path for enriched graph.json (default: static/data/graph.json)",
    )
    args = parser.parse_args()

    graphify_dir = Path(args.graphify_dir)
    graph_path = graphify_dir / "graph.json"
    report_path = graphify_dir / "GRAPH_REPORT.md"

    if not graph_path.exists():
        print(f"Error: {graph_path} not found", file=sys.stderr)
        sys.exit(1)
    if not report_path.exists():
        print(f"Error: {report_path} not found", file=sys.stderr)
        sys.exit(1)

    community_names = parse_community_names(report_path)
    if not community_names:
        print("Warning: no community names found in report", file=sys.stderr)

    with open(graph_path) as f:
        data = json.load(f)

    patched = 0
    for node in data.get("nodes", []):
        cid = node.get("community")
        if cid is not None and cid in community_names:
            node["community_name"] = community_names[cid]
            patched += 1

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")

    print(
        f"Synced {len(data.get('nodes', []))} nodes "
        f"({patched} patched with community names from {len(community_names)} communities) "
        f"-> {output_path}"
    )


if __name__ == "__main__":
    main()
