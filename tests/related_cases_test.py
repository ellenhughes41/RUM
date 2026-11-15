import unittest
from playwright.sync_api import sync_playwright


class RelatedCasesTests(unittest.TestCase):
    def setUp(self):
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=True)
        self.page = self.browser.new_page(viewport={"width": 1280, "height": 1800})

    def tearDown(self):
        self.browser.close()
        self.playwright.stop()

    def test_related_case_link_opens_corresponding_case(self):
        self.page.goto("http://localhost:8080/cases?case=7")
        self.page.get_by_role("button", name="Case Details", exact=True).click()
        self.page.get_by_role("link", name="PA-2024-001551", exact=True).click()
        self.page.wait_for_url("**/cases?case=5")
        self.assertTrue(self.page.get_by_role("link", name="PA-2024-001553", exact=True).is_visible())
        self.page.reload()
        self.page.get_by_role("button", name="Case Details", exact=True).click()
        self.assertTrue(self.page.get_by_role("link", name="PA-2024-001553", exact=True).is_visible())

    def test_case_without_relationships_has_no_related_links(self):
        self.page.goto("http://localhost:8080/cases?case=2")
        self.page.get_by_role("button", name="Case Details", exact=True).click()
        self.assertEqual(self.page.locator('a[href^="/cases?case="]').count(), 0)


if __name__ == "__main__":
    unittest.main()