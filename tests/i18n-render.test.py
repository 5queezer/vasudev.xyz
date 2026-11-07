"""Build-level checks for translated UI and language-safe navigation (stdlib only)."""
import json
import os
import re
from pathlib import Path
import subprocess
import tempfile
import tomllib
import unittest
from urllib.parse import unquote, urljoin, urlsplit
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]


class LanguageLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_toggle = False
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'div' and attrs.get('class') == 'lang-toggle':
            self.in_toggle = True
        if tag == 'a' and self.in_toggle:
            self.links.append(attrs['href'])

    def handle_endtag(self, tag):
        if tag == 'div':
            self.in_toggle = False


class PageReferences(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        key = 'href' if tag in ['a', 'link'] else 'src' if tag in ['img', 'script'] else None
        if key and attrs.get(key):
            self.urls.append(attrs[key])


class InternationalizationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='vasudev-i18n-')
        cls.output = Path(cls.temp.name) / 'site'
        fixtures = Path(cls.temp.name) / 'fixtures'
        fixtures.mkdir()
        (fixtures / 'qa-untranslated.md').write_text('---\ntitle: "Untranslated fixture"\n---\nEnglish-only test content.\n')
        (fixtures / 'blog').mkdir()
        (fixtures / 'blog/qa-pagination.md').write_text(
            '---\ntitle: "Pagination fixture"\ndate: 2000-01-01\n'
            'description: "An older fourth showcase post for pagination QA."\n'
            'showcase: true\ntags: ["qa"]\nimages: ["/images/home-blue.webp"]\n---\nPagination fixture.\n'
        )
        config = Path(cls.temp.name) / 'test.toml'
        config.write_text(
            '[[module.mounts]]\nsource = ' + json.dumps(str(ROOT / 'content')) + '\ntarget = "content"\n'
            '[[module.mounts]]\nsource = ' + json.dumps(str(fixtures)) + '\ntarget = "content"\n'
        )
        env = {**os.environ, 'HUGO_BUILD_WRITESTATS': 'false'}
        build = subprocess.run(
            [os.environ.get('HUGO_BINARY', 'hugo'), '--config', f'{ROOT / "hugo.toml"},{config}', '--destination', str(cls.output),
             '--printI18nWarnings'], cwd=ROOT, env=env, capture_output=True, text=True,
            check=False,
        )
        cls.build_output = build.stdout + build.stderr
        if build.returncode:
            raise RuntimeError(cls.build_output)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def html(self, route):
        return (self.output / unquote(route).strip('/') / 'index.html').read_text()

    def test_home_and_blog_ui_are_localized(self):
        for lang in ['de', 'es']:
            with self.subTest(lang=lang):
                home = self.html(lang)
                for english in ['Thoughtful software.', 'Explore my work',
                                'Read the field notes', 'Browse all writing',
                                'Rust chart generator and MCP server']:
                    self.assertFalse(english in home, f'{lang} home contains English UI: {english}')
                blog = self.html(f'{lang}/blog')
                for english in ['Search posts', 'Search suggestions', ' min read']:
                    self.assertFalse(english in blog, f'{lang} blog contains English UI: {english}')
                self.assertNotIn('By Christian', blog)

    def test_search_index_uses_localized_metadata_and_urls(self):
        for lang in ['de', 'es']:
            with self.subTest(lang=lang):
                posts = json.loads((self.output / lang / 'blog/search.json').read_text())
                self.assertTrue(posts)
                for post in posts:
                    self.assertTrue(post['url'].startswith(f'/{lang}/'))
                    self.assertNotIn('min read', post['readingTime'])
                    self.assertTrue(post['date'])
                    self.assertTrue(post['image'])

    def test_privacy_links_and_content_keep_selected_language(self):
        for lang, title in [('de', 'Datenschutz'), ('es', 'Privacidad')]:
            with self.subTest(lang=lang):
                home = self.html(lang)
                self.assertIn(f'href="/{lang}/privacy/"', home)
                page = self.html(f'{lang}/privacy')
                self.assertIn(title, page)
                self.assertNotIn('This site is a static Hugo site', page)
                self.assertIn(f'data-agent-privacy-url="/{lang}/privacy/"', page)

    def test_missing_translation_switches_to_target_language_home(self):
        chapter = self.output / 'qa-untranslated/index.html'
        links = LanguageLinks()
        links.feed(chapter.read_text())
        self.assertEqual(len(links.links), 3)
        self.assertIn('/de/', links.links)
        self.assertIn('/es/', links.links)

    def test_guide_landing_pages_are_translated(self):
        for lang in ['de', 'es']:
            with self.subTest(lang=lang):
                self.assertFalse('Start with the language track that matches the role' in self.html(f'{lang}/guides'), f'{lang} guide introduction is English')
                self.assertFalse('A compact guide for senior engineers' in self.html(f'{lang}/guides/typescript-ramp-up'), f'{lang} TypeScript introduction is English')

    def test_javascript_messages_are_embedded_in_selected_language(self):
        for lang in ['de', 'es']:
            with self.subTest(lang=lang):
                match = re.search(r'<script id="site-i18n" type="application/json">(.*?)</script>', self.html(lang), re.S)
                self.assertIsNotNone(match)
                messages = json.loads(match[1])
                self.assertTrue(all(messages.values()))
                self.assertNotEqual(messages['codeCopy'], 'Copy')
                self.assertNotEqual(messages['searchMatchingOne'], '1 matching post')
                self.assertIn('{count}', messages['searchMatchingMany'])
                self.assertNotIn('unreachable', messages['agentUnavailable'])

    def test_taxonomy_and_comment_headings_are_localized(self):
        for lang, title, comments in [('de', 'Schlagwörter', 'Kommentare'), ('es', 'Etiquetas', 'Comentarios')]:
            with self.subTest(lang=lang):
                self.assertIn(title, self.html(f'{lang}/tags'))
                index = json.loads((self.output / lang / 'blog/search.json').read_text())
                article = self.html(index[0]['url'])
                self.assertIn(f'class="comments-heading">{comments}</h3>', article)

    def test_guide_chapters_and_links_keep_selected_language(self):
        for lang in ['de', 'es']:
            for source in sorted((ROOT / 'content/guides').glob('*/[0-9]*.md')):
                if source.name.endswith(('.de.md', '.es.md')):
                    continue
                route = f'{lang}/guides/{source.parent.name}/{source.stem}'
                with self.subTest(route=route):
                    chapter = self.html(route)
                    links = LanguageLinks()
                    links.feed(chapter)
                    self.assertIn('/' + route + '/', links.links)
                    other = 'es' if lang == 'de' else 'de'
                    self.assertIn(f'/{other}/guides/{source.parent.name}/{source.stem}/', links.links)
            for track in ['modern-cpp-recovery', 'typescript-ramp-up', 'raft-fine-tuning']:
                with self.subTest(lang=lang, track=track):
                    html = self.html(f'{lang}/guides/{track}')
                    main = re.search(r'<main\b[^>]*>(.*?)</main>', html, re.S)[1]
                    self.assertFalse(re.search(r'href="/guides/', main), f'{lang}/{track}: guide content links switch to English')
                    self.assertNotIn('guide_english_notice', html)
                    self.assertNotRegex(html, r'<p[^>]*>(?:Die Kapitel|Los capítulos)')

    def test_translation_catalogs_have_matching_keys(self):
        catalogs = []
        for lang in ['en', 'de', 'es']:
            toml = tomllib.loads((ROOT / 'i18n' / f'{lang}.toml').read_text())
            yaml = re.findall(r'^- id: (.+)$', (ROOT / 'i18n' / f'{lang}.yaml').read_text(), re.M)
            self.assertEqual(len(yaml), len(set(yaml)), f'{lang} duplicate YAML keys')
            self.assertFalse(set(yaml) & set(toml), f'{lang} duplicate keys across formats')
            catalogs.append(set(yaml) | set(toml))
        self.assertEqual(catalogs[0], catalogs[1])
        self.assertEqual(catalogs[0], catalogs[2])

    def test_top_anchor_precedes_sticky_navigation(self):
        for lang in ['', 'de', 'es']:
            with self.subTest(lang=lang or 'en'):
                html = self.html(lang)
                self.assertEqual(html.count('id="top"'), 1)
                self.assertLess(html.index('id="top"'), html.index('data-navbar'),
                                'The top anchor must include the navigation, not start below it')

    def test_blog_server_pagination_with_four_showcase_posts(self):
        first = self.html('blog')
        second = self.html('blog/page/2')
        self.assertEqual(len(re.findall(r'<a[^>]+class="essay-card"', first)), 3)
        self.assertEqual(len(re.findall(r'<a[^>]+class="essay-card"', second)), 1)
        self.assertIn('Pagination fixture', second)
        self.assertEqual(len(json.loads((self.output / 'blog/search.json').read_text())), 4)

    def test_generated_internal_links_assets_and_fragments_exist(self):
        pages = {}
        for path in self.output.rglob('*.html'):
            page = PageReferences()
            page.feed(path.read_text())
            pages[path] = page
        failures = []
        for path, page in pages.items():
            route = '/' + path.relative_to(self.output).as_posix()
            for url in page.urls:
                target = urlsplit(urljoin('https://vasudev.xyz' + route, url))
                if target.scheme not in ['http', 'https'] or target.netloc != 'vasudev.xyz':
                    continue
                resolved = self.output / unquote(target.path).lstrip('/')
                if resolved.is_dir():
                    resolved = resolved / 'index.html'
                if not resolved.is_file():
                    failures.append(f'{route}: missing {url}')
                elif target.fragment and resolved in pages and unquote(target.fragment) not in pages[resolved].ids:
                    failures.append(f'{route}: missing fragment in {url}')
        self.assertFalse(failures, '\n'.join(failures))

    def test_build_has_no_missing_translations(self):
        self.assertNotRegex(self.build_output, r'MISSING_TRANSLATION|Translation .* not found|i18n.*not found')


if __name__ == '__main__':
    unittest.main()
