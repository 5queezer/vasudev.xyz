// Command graphify-update extends graphify-out/graph.json with entries
// for any blog posts that are not yet indexed.
//
// It is a CI-friendly stand-in for Safi Shamsi's Graphify tool when only
// prose content has changed: it reads each missing post, prompts an LLM
// (via OpenRouter, matching cmd/translate's auth pattern) to extract
// concept nodes and typed edges in Graphify's schema, validates the
// response, assigns a fresh community ID, and merges the result into
// graph.json. It does not touch existing nodes, edges, or hyperedges.
//
// When a real /graphify run happens later, it will overwrite these
// entries with canonical extractions, including community re-detection.
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

const (
	defaultAPIURL    = "https://openrouter.ai/api/v1/chat/completions"
	defaultModel     = "openrouter/free"
	defaultGraphFile = "graphify-out/graph.json"
	defaultContent   = "content/blog"
	maxAttempts      = 3
)

var slugReplacer = regexp.MustCompile(`[^a-z0-9]+`)

type chatRequest struct {
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// extractedGraph is the JSON shape we ask the LLM to produce per post.
type extractedGraph struct {
	Nodes      []extractedNode      `json:"nodes"`
	Edges      []extractedEdge      `json:"edges"`
	Hyperedges []extractedHyperedge `json:"hyperedges,omitempty"`
}

type extractedNode struct {
	ID      string `json:"id"`
	Label   string `json:"label"`
	Summary string `json:"summary"`
}

type extractedEdge struct {
	Source     string  `json:"source"`
	Target     string  `json:"target"`
	Relation   string  `json:"relation"`
	Provenance string  `json:"provenance"`
	Confidence float64 `json:"confidence_score"`
}

type extractedHyperedge struct {
	ID       string   `json:"id"`
	Label    string   `json:"label"`
	Nodes    []string `json:"nodes"`
	Relation string   `json:"relation"`
}

// graphFile is loaded as a generic map so we preserve any keys we don't
// model explicitly (graph metadata, multigraph flag, etc.) on write.
type graphFile struct {
	raw   map[string]json.RawMessage
	nodes []map[string]interface{}
	links []map[string]interface{}
	hyper []map[string]interface{}
}

func main() {
	contentDir := flag.String("content-dir", defaultContent, "directory containing English blog posts (read path)")
	sourcePrefix := flag.String("source-prefix", "", "prefix to stamp into source_file values (defaults to content-dir if empty)")
	graphFlag := flag.String("graph-file", defaultGraphFile, "path to graphify-out/graph.json")
	dryRun := flag.Bool("dry-run", false, "print what would be added but do not write graph.json")
	flag.Parse()

	prefix := *sourcePrefix
	if prefix == "" {
		prefix = *contentDir
	}

	missing, err := findMissingPosts(*contentDir, prefix, *graphFlag)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to scan posts: %v\n", err)
		os.Exit(1)
	}
	if len(missing) == 0 {
		fmt.Println("graph fresh: no missing posts")
		return
	}

	fmt.Printf("missing posts: %d\n", len(missing))
	for _, p := range missing {
		fmt.Printf("  - %s\n", p)
	}

	apiKey := firstNonEmpty(os.Getenv("LLM_API_KEY"), os.Getenv("OPENROUTER_API_KEY"))
	if apiKey == "" {
		fmt.Fprintln(os.Stderr, "LLM_API_KEY (or OPENROUTER_API_KEY) is required")
		os.Exit(1)
	}
	apiURL := firstNonEmpty(os.Getenv("LLM_API_URL"), defaultAPIURL)
	models := resolveModelCandidates(
		os.Getenv("LLM_MODEL"),
		os.Getenv("LLM_MODEL_FALLBACKS"),
		os.Getenv("LLM_MODELS"),
	)

	gf, err := loadGraph(*graphFlag)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load %s: %v\n", *graphFlag, err)
		os.Exit(1)
	}

	nextCommunity := nextFreeCommunity(gf.nodes)

	for _, postPath := range missing {
		diskPath := filepath.Join(*contentDir, filepath.Base(postPath))
		body, err := os.ReadFile(diskPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "failed to read %s: %v\n", diskPath, err)
			os.Exit(1)
		}

		extraction, err := extractWithLLM(apiURL, models, apiKey, postPath, string(body))
		if err != nil {
			fmt.Fprintf(os.Stderr, "extraction failed for %s: %v\n", postPath, err)
			os.Exit(1)
		}

		nodes, links, hyper := materialize(postPath, nextCommunity, extraction)
		fmt.Printf("post %s: +%d nodes, +%d edges, +%d hyperedges (community %d)\n",
			filepath.Base(postPath), len(nodes), len(links), len(hyper), nextCommunity)
		nextCommunity++

		gf.nodes = append(gf.nodes, nodes...)
		gf.links = append(gf.links, links...)
		gf.hyper = append(gf.hyper, hyper...)
	}

	if *dryRun {
		fmt.Println("dry-run: skipping write")
		return
	}

	if err := writeGraph(*graphFlag, gf); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write %s: %v\n", *graphFlag, err)
		os.Exit(1)
	}
	fmt.Printf("wrote %s\n", *graphFlag)
}

// findMissingPosts returns blog posts whose path (rendered with sourcePrefix)
// is not the source_file of any existing node in the graph.
func findMissingPosts(contentDir, sourcePrefix, graphPath string) ([]string, error) {
	entries, err := os.ReadDir(contentDir)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", contentDir, err)
	}
	var posts []string
	for _, e := range entries {
		name := e.Name()
		if !strings.HasSuffix(name, ".md") {
			continue
		}
		if strings.HasSuffix(name, ".de.md") || strings.HasSuffix(name, ".es.md") {
			continue
		}
		if name == "_index.md" || strings.HasPrefix(name, "_index.") {
			continue
		}
		posts = append(posts, filepath.Join(sourcePrefix, name))
	}
	sort.Strings(posts)

	data, err := os.ReadFile(graphPath)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", graphPath, err)
	}
	var raw struct {
		Nodes []struct {
			SourceFile string `json:"source_file"`
		} `json:"nodes"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, fmt.Errorf("parse %s: %w", graphPath, err)
	}
	indexed := make(map[string]bool)
	for _, n := range raw.Nodes {
		if n.SourceFile != "" {
			indexed[n.SourceFile] = true
		}
	}

	var missing []string
	for _, p := range posts {
		if !indexed[p] {
			missing = append(missing, p)
		}
	}
	return missing, nil
}

func loadGraph(path string) (*graphFile, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, fmt.Errorf("parse: %w", err)
	}
	gf := &graphFile{raw: raw}

	if v, ok := raw["nodes"]; ok {
		if err := json.Unmarshal(v, &gf.nodes); err != nil {
			return nil, fmt.Errorf("parse nodes: %w", err)
		}
	}
	if v, ok := raw["links"]; ok {
		if err := json.Unmarshal(v, &gf.links); err != nil {
			return nil, fmt.Errorf("parse links: %w", err)
		}
	}
	if v, ok := raw["hyperedges"]; ok {
		if err := json.Unmarshal(v, &gf.hyper); err != nil {
			return nil, fmt.Errorf("parse hyperedges: %w", err)
		}
	}
	return gf, nil
}

func writeGraph(path string, gf *graphFile) error {
	encNodes, err := json.Marshal(gf.nodes)
	if err != nil {
		return fmt.Errorf("marshal nodes: %w", err)
	}
	encLinks, err := json.Marshal(gf.links)
	if err != nil {
		return fmt.Errorf("marshal links: %w", err)
	}
	encHyper, err := json.Marshal(gf.hyper)
	if err != nil {
		return fmt.Errorf("marshal hyperedges: %w", err)
	}
	gf.raw["nodes"] = json.RawMessage(encNodes)
	gf.raw["links"] = json.RawMessage(encLinks)
	gf.raw["hyperedges"] = json.RawMessage(encHyper)

	out, err := json.MarshalIndent(gf.raw, "", " ")
	if err != nil {
		return fmt.Errorf("marshal graph: %w", err)
	}
	return os.WriteFile(path, out, 0644)
}

// nextFreeCommunity returns one greater than the highest existing community
// integer. New posts get their own community to avoid disturbing existing
// clusters; a future /graphify run will re-cluster the whole graph.
func nextFreeCommunity(nodes []map[string]interface{}) int {
	max := -1
	for _, n := range nodes {
		v, ok := n["community"]
		if !ok {
			continue
		}
		switch t := v.(type) {
		case float64:
			if int(t) > max {
				max = int(t)
			}
		case int:
			if t > max {
				max = t
			}
		}
	}
	return max + 1
}

// materialize converts the LLM's extracted JSON into Graphify-shaped maps,
// stamping every node and edge with the post path and community.
func materialize(postPath string, community int, ex *extractedGraph) (
	nodes []map[string]interface{},
	links []map[string]interface{},
	hyper []map[string]interface{},
) {
	prefix := slugify(filepath.Base(strings.TrimSuffix(postPath, ".md"))) + "_"

	idMap := make(map[string]string, len(ex.Nodes))
	validIDs := make(map[string]bool, len(ex.Nodes))

	for _, n := range ex.Nodes {
		id := normalizeID(n.ID, prefix)
		idMap[n.ID] = id
		validIDs[id] = true
		nodes = append(nodes, map[string]interface{}{
			"id":              id,
			"label":           n.Label,
			"summary":         n.Summary,
			"file_type":       "document",
			"source_file":     postPath,
			"source_url":      nil,
			"captured_at":     nil,
			"author":          "Christian Pojoni",
			"contributor":     nil,
			"community":       community,
		})
	}

	for _, e := range ex.Edges {
		src := lookupID(e.Source, idMap, prefix)
		tgt := lookupID(e.Target, idMap, prefix)
		if !validIDs[src] || !validIDs[tgt] {
			fmt.Fprintf(os.Stderr, "  warning: edge %q -> %q references unknown node, skipping\n", e.Source, e.Target)
			continue
		}
		relation := strings.TrimSpace(e.Relation)
		if relation == "" {
			relation = "references"
		}
		provenance := strings.ToUpper(strings.TrimSpace(e.Provenance))
		if provenance == "" {
			provenance = "EXTRACTED"
		}
		conf := e.Confidence
		if conf <= 0 {
			conf = 1.0
		}
		links = append(links, map[string]interface{}{
			"relation":         relation,
			"provenance":       provenance,
			"confidence_score": conf,
			"source_file":      postPath,
			"_src":             src,
			"_tgt":             tgt,
			"source":           src,
			"target":           tgt,
		})
	}

	for _, h := range ex.Hyperedges {
		var members []string
		for _, m := range h.Nodes {
			id := lookupID(m, idMap, prefix)
			if validIDs[id] {
				members = append(members, id)
			}
		}
		if len(members) < 2 {
			continue
		}
		id := normalizeID(h.ID, prefix)
		relation := strings.TrimSpace(h.Relation)
		if relation == "" {
			relation = "participate_in"
		}
		hyper = append(hyper, map[string]interface{}{
			"id":               id,
			"label":            h.Label,
			"nodes":            members,
			"relation":         relation,
			"confidence":       "EXTRACTED",
			"confidence_score": 1.0,
			"source_file":      postPath,
		})
	}

	return nodes, links, hyper
}

func slugify(s string) string {
	s = strings.ToLower(s)
	s = slugReplacer.ReplaceAllString(s, "_")
	return strings.Trim(s, "_")
}

func normalizeID(id, prefix string) string {
	id = slugify(id)
	if !strings.HasPrefix(id, prefix) {
		id = prefix + id
	}
	return id
}

func lookupID(raw string, idMap map[string]string, prefix string) string {
	if mapped, ok := idMap[raw]; ok {
		return mapped
	}
	return normalizeID(raw, prefix)
}

// extractWithLLM prompts the model and parses the JSON response.
func extractWithLLM(apiURL string, models []string, apiKey, postPath, body string) (*extractedGraph, error) {
	system := buildSystemPrompt()
	user := buildUserPrompt(postPath, body)

	for _, model := range models {
		for attempt := 1; attempt <= maxAttempts; attempt++ {
			content, err := callLLM(apiURL, model, apiKey, system, user)
			if err != nil {
				fmt.Fprintf(os.Stderr, "  model %s attempt %d: %v\n", model, attempt, err)
				time.Sleep(time.Duration(attempt) * 2 * time.Second)
				continue
			}
			parsed, perr := parseExtraction(content)
			if perr != nil {
				fmt.Fprintf(os.Stderr, "  model %s attempt %d: parse failed: %v\n", model, attempt, perr)
				continue
			}
			if len(parsed.Nodes) < 4 {
				fmt.Fprintf(os.Stderr, "  model %s attempt %d: only %d nodes returned, retrying\n", model, attempt, len(parsed.Nodes))
				continue
			}
			return parsed, nil
		}
	}
	return nil, fmt.Errorf("all models exhausted")
}

func callLLM(apiURL, model, apiKey, system, user string) (string, error) {
	reqBody, err := json.Marshal(chatRequest{
		Model: model,
		Messages: []chatMessage{
			{Role: "system", Content: system},
			{Role: "user", Content: user},
		},
	})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequest("POST", apiURL, bytes.NewReader(reqBody))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 5 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, truncate(string(respBody), 400))
	}
	var cr chatResponse
	if err := json.Unmarshal(respBody, &cr); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}
	if cr.Error != nil {
		return "", fmt.Errorf("API error: %s", cr.Error.Message)
	}
	if len(cr.Choices) == 0 {
		return "", fmt.Errorf("no choices in response")
	}
	return cr.Choices[0].Message.Content, nil
}

// parseExtraction strips Markdown code fences and parses the JSON body.
func parseExtraction(raw string) (*extractedGraph, error) {
	s := strings.TrimSpace(raw)
	if i := strings.Index(s, "```"); i >= 0 {
		rest := s[i+3:]
		if nl := strings.IndexByte(rest, '\n'); nl >= 0 {
			rest = rest[nl+1:]
		}
		if end := strings.LastIndex(rest, "```"); end >= 0 {
			s = strings.TrimSpace(rest[:end])
		} else {
			s = strings.TrimSpace(rest)
		}
	}
	var ex extractedGraph
	if err := json.Unmarshal([]byte(s), &ex); err != nil {
		return nil, err
	}
	return &ex, nil
}

func buildSystemPrompt() string {
	return `You extract a small concept graph from a single blog post for use as
an LLM-agent navigation aid.

Output strict JSON with this schema and nothing else (no prose, no
Markdown fences):

{
  "nodes":  [ {"id": "<short_snake>", "label": "<human label>", "summary": "<1-2 sentence description>"} ],
  "edges":  [ {"source": "<id>", "target": "<id>", "relation": "<verb>", "provenance": "EXTRACTED|INFERRED", "confidence_score": 0.0-1.0} ],
  "hyperedges": [ {"id": "<short_snake>", "label": "<group label>", "nodes": ["<id>", ...], "relation": "<verb>"} ]
}

Rules:
- Always include a root "post" node summarising the post itself, plus
  10 to 18 additional nodes for the most important entities, claims,
  references, papers, tools, or concepts the post discusses.
- IDs are short snake_case strings, unique within the post. They will
  be prefixed with the post slug automatically; do not include the
  slug yourself.
- Edge "relation" should be one of: references, cites, implements,
  conceptually_related_to, rationale_for, semantically_similar_to,
  contains, calls. Pick the closest fit.
- "provenance" is "EXTRACTED" when the relationship is explicit in the
  post text and "INFERRED" when you derived it. Confidence 1.0 for
  EXTRACTED, 0.6-0.9 for INFERRED.
- Add a hyperedge only if the post explicitly groups three or more
  entities into a named set or trichotomy (e.g. "the four layers").
  Otherwise omit the hyperedges field entirely.
- 15 to 30 edges total is a good target. Every edge source and target
  must be one of the node IDs you emit.
- Do not invent papers, URLs, or facts that are not in the post.`
}

func buildUserPrompt(postPath, body string) string {
	return fmt.Sprintf("Source path: %s\n\nPost body:\n\n%s", postPath, body)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

// resolveModelCandidates mirrors cmd/translate's behaviour so the same
// LLM_MODEL / LLM_MODEL_FALLBACKS / LLM_MODELS env vars work.
func resolveModelCandidates(primary, fallbacks, models string) []string {
	if ordered := uniqueModels(parseModelList(models)); len(ordered) > 0 {
		return ordered
	}
	ordered := []string{strings.TrimSpace(primary)}
	if ordered[0] == "" {
		ordered[0] = defaultModel
	}
	ordered = append(ordered, parseModelList(fallbacks)...)
	return uniqueModels(ordered)
}

func parseModelList(raw string) []string {
	split := strings.FieldsFunc(raw, func(r rune) bool {
		return r == ',' || r == '\n'
	})
	out := make([]string, 0, len(split))
	for _, item := range split {
		if t := strings.TrimSpace(item); t != "" {
			out = append(out, t)
		}
	}
	return out
}

func uniqueModels(models []string) []string {
	seen := make(map[string]struct{}, len(models))
	ordered := make([]string, 0, len(models))
	for _, m := range models {
		m = strings.TrimSpace(m)
		if m == "" {
			continue
		}
		if _, ok := seen[m]; ok {
			continue
		}
		seen[m] = struct{}{}
		ordered = append(ordered, m)
	}
	return ordered
}
