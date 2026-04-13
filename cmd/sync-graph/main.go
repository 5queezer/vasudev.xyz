package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
)

// graphData mirrors the top-level structure of graph.json.
type graphData struct {
	Directed   bool              `json:"directed"`
	Multigraph bool              `json:"multigraph"`
	Graph      json.RawMessage   `json:"graph"`
	Nodes      []json.RawMessage `json:"nodes"`
	Links      json.RawMessage   `json:"links"`
}

// nodePatch holds the fields we read/write per node.
type nodePatch struct {
	Community     *int   `json:"community"`
	CommunityName string `json:"community_name,omitempty"`
}

var communityRe = regexp.MustCompile(`^### Community (\d+) - "(.+)"`)

func parseCommunityNames(reportPath string) (map[int]string, error) {
	f, err := os.Open(reportPath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	names := make(map[int]string)
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		m := communityRe.FindStringSubmatch(scanner.Text())
		if m == nil {
			continue
		}
		id, _ := strconv.Atoi(m[1])
		names[id] = m[2]
	}
	return names, scanner.Err()
}

func run(graphifyDir, output string) error {
	graphPath := filepath.Join(graphifyDir, "graph.json")
	reportPath := filepath.Join(graphifyDir, "GRAPH_REPORT.md")

	names, err := parseCommunityNames(reportPath)
	if err != nil {
		return fmt.Errorf("reading report: %w", err)
	}

	raw, err := os.ReadFile(graphPath)
	if err != nil {
		return fmt.Errorf("reading graph: %w", err)
	}

	var data graphData
	if err := json.Unmarshal(raw, &data); err != nil {
		return fmt.Errorf("parsing graph: %w", err)
	}

	patched := 0
	for i, nodeRaw := range data.Nodes {
		var p nodePatch
		if err := json.Unmarshal(nodeRaw, &p); err != nil {
			continue
		}
		if p.Community == nil {
			continue
		}
		name, ok := names[*p.Community]
		if !ok {
			continue
		}

		// Merge community_name into the existing node object.
		var obj map[string]any
		if err := json.Unmarshal(nodeRaw, &obj); err != nil {
			continue
		}
		obj["community_name"] = name
		updated, err := json.Marshal(obj)
		if err != nil {
			continue
		}
		data.Nodes[i] = updated
		patched++
	}

	out, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling output: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(output), 0o755); err != nil {
		return fmt.Errorf("creating output dir: %w", err)
	}
	if err := os.WriteFile(output, append(out, '\n'), 0o644); err != nil {
		return fmt.Errorf("writing output: %w", err)
	}

	fmt.Printf("Synced %d nodes (%d patched with community names from %d communities) -> %s\n",
		len(data.Nodes), patched, len(names), output)
	return nil
}

func main() {
	graphifyDir := flag.String("graphify-dir", "graphify-out", "directory containing graphify output")
	output := flag.String("output", "static/data/graph.json", "output path for enriched graph.json")
	flag.Parse()

	if err := run(*graphifyDir, *output); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
