"""Translation completeness and example integrity for every guide chapter."""
from pathlib import Path
import re
import hashlib
from collections import Counter
import unittest

ROOT = Path(__file__).resolve().parents[1]
GUIDES = ROOT / 'content/guides'
FENCES = re.compile(r'(?ms)^(`{3,}|~{3,})[^\n]*\n.*?^\1[ \t]*(?=\n|$)')


def chapters():
    return sorted(p for p in GUIDES.glob('*/[0-9]*.md')
                  if not p.name.endswith(('.de.md', '.es.md')))


def body(text):
    return text.split('\n---', 1)[1].lstrip('\n')


def field(text, name):
    match = re.search(r'^' + re.escape(name) + r':\s*(.+)$', text, re.M)
    return match[1] if match else ''


class GuideTranslationTest(unittest.TestCase):
    def test_every_chapter_has_complete_german_and_spanish_versions(self):
        for source in chapters():
            original = source.read_text()
            for lang in ['de', 'es']:
                with self.subTest(chapter=source.name, lang=lang):
                    target = source.with_name(f'{source.stem}.{lang}.md')
                    self.assertTrue(target.exists(), f'Missing {target.relative_to(ROOT)}')
                    translated = target.read_text()
                    for key in ['title', 'description']:
                        self.assertTrue(field(translated, key))
                        self.assertNotEqual(field(original, key), field(translated, key))
                    self.assertEqual(field(original, 'weight'), field(translated, 'weight'))
                    self.assertEqual(field(original, 'type'), field(translated, 'type'))
                    self.assertNotEqual(body(original).strip(), body(translated).strip())
                    self.assertGreater(len(body(translated)), len(body(original)) * .65,
                                       'Translation appears incomplete')

    def test_code_examples_are_unchanged(self):
        for source in chapters():
            source_blocks = [m[0] for m in FENCES.finditer(source.read_text())]
            for lang in ['de', 'es']:
                target = source.with_name(f'{source.stem}.{lang}.md')
                if not target.exists():
                    continue  # The completeness test reports the missing file.
                with self.subTest(chapter=source.name, lang=lang):
                    self.assertEqual(source_blocks, [m[0] for m in FENCES.finditer(target.read_text())],
                                     'Translation changed, omitted or added a code block')

    def test_inline_identifiers_and_external_reference_urls_are_unchanged(self):
        for source in chapters():
            original = FENCES.sub('', body(source.read_text()))
            identifiers = Counter(re.findall(r'`([^`\n]+)`', original))
            references = re.findall(r'\]\((https?://[^)]+)\)', original)
            for lang in ['de', 'es']:
                target = source.with_name(f'{source.stem}.{lang}.md')
                if not target.exists():
                    continue
                with self.subTest(chapter=source.name, lang=lang):
                    translated = FENCES.sub('', body(target.read_text()))
                    self.assertFalse(identifiers - Counter(re.findall(r'`([^`\n]+)`', translated)),
                                     'Translation removed or changed an inline identifier')
                    self.assertEqual(references, re.findall(r'\]\((https?://[^)]+)\)', translated))

    def test_source_hashes_and_full_translation_workflow(self):
        for source in chapters():
            digest = hashlib.sha256(source.read_bytes()).hexdigest()[:32]
            for lang in ['de', 'es']:
                target = source.with_name(f'{source.stem}.{lang}.md')
                if not target.exists():
                    continue
                with self.subTest(chapter=source.name, lang=lang):
                    self.assertEqual(field(target.read_text(), 'translationHash').strip('"'), digest)
        workflow = (ROOT / '.github/workflows/translate.yml').read_text()
        guide_command = workflow.split('--content-dir ../../content/guides', 1)[1].split('go run', 1)[0]
        self.assertNotIn('--index-only', guide_command)
        self.assertNotIn('--front-matter-only', guide_command)
        self.assertFalse((ROOT / '.github/workflows/translate-guides.yml').exists(),
                         'A competing metadata-only writer can overwrite guide translations')

    def test_chapter_structure_is_preserved(self):
        for source in chapters():
            levels = re.findall(r'^(#{1,6}) ', FENCES.sub('', body(source.read_text())), re.M)
            for lang in ['de', 'es']:
                target = source.with_name(f'{source.stem}.{lang}.md')
                if not target.exists():
                    continue
                with self.subTest(chapter=source.name, lang=lang):
                    self.assertEqual(levels, re.findall(r'^(#{1,6}) ', FENCES.sub('', body(target.read_text())), re.M),
                                     'Translation changed, omitted or added a heading')


if __name__ == '__main__':
    unittest.main()
