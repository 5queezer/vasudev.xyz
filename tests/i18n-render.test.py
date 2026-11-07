"""Build-level checks for translated UI and language-safe navigation (stdlib only)."""
import json
import os
import re
from pathlib import Path
import subprocess
import tempfile
import tomllib
import unittest
from urllib.parse import unquote
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


class InternationalizationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='vasudev-i18n-')
        cls.output = Path(cls.temp.name)
        env = {**os.environ, 'HUGO_BUILD_WRITESTATS': 'false'}
        build = subprocess.run(
            [os.environ.get('HUGO_BINARY', 'hugo'), '--destination', cls.temp.name,
             '--printI18nWarnings'], cwd=ROOT, env=env, capture_output=True, text=True,
            check=True,
        )
        cls.build_output = build.stdout + build.stderr

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
        chapter = next((self.output / 'guides').glob('*/*/index.html'))
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

    def test_english_chapter_notice_appears_once_per_guide(self):
        for lang, opening in [('de', 'Die Kapitel'), ('es', 'Los capítulos')]:
            for track in ['modern-cpp-recovery', 'typescript-ramp-up', 'raft-fine-tuning']:
                with self.subTest(lang=lang, track=track):
                    html = self.html(f'{lang}/guides/{track}')
                    self.assertEqual(len(re.findall(r'<p[^>]*>' + opening, html)), 1)

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

    def test_build_has_no_missing_translations(self):
        self.assertNotRegex(self.build_output, r'MISSING_TRANSLATION|Translation .* not found|i18n.*not found')


if __name__ == '__main__':
    unittest.main()
