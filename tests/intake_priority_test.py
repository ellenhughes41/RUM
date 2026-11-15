import unittest
import re
from playwright.sync_api import sync_playwright


class FaxIntakePriorityTests(unittest.TestCase):
    def setUp(self):
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=True)
        self.page = self.browser.new_page(viewport={"width": 1280, "height": 1800})
        self.page.goto("http://localhost:8080/intake")
        self.page.get_by_role("button", name="Claim", exact=True).first.click()
        self.page.get_by_role("button", name="Confirm member", exact=True).click()
        self.page.get_by_role("button", name="Confirm drug", exact=True).click()

    def tearDown(self):
        self.browser.close()
        self.playwright.stop()

    def test_priority_required_before_history_actions(self):
        self.assertTrue(self.page.get_by_text("Select priority first", exact=True).is_visible())
        self.assertEqual(self.page.get_by_text("CASE-2025-0997", exact=True).count(), 0)
        self.assertTrue(self.page.get_by_role("button", name=re.compile("Create case")).is_disabled())
        self.page.get_by_text("Expedited", exact=True).click()
        self.assertTrue(self.page.get_by_text("CASE-2025-0997", exact=True).is_visible())
        self.assertTrue(self.page.get_by_role("button", name=re.compile("Create case")).is_enabled())

    def test_new_case_inherits_priority(self):
        self.page.get_by_text("Expedited", exact=True).click()
        self.page.get_by_text("CASE-2025-0997", exact=True).click()
        self.page.get_by_role("button", name="Open new case", exact=True).click()
        self.assertEqual(self.page.get_by_role("combobox").count(), 1)
        self.page.get_by_role("combobox").click()
        self.page.locator(".ant-select-item-option-content").get_by_text("Initial Request", exact=True).click()
        self.page.get_by_role("button", name="Create case", exact=True).last.click()
        self.assertTrue(self.page.get_by_role("dialog").get_by_text("Expedited", exact=True).is_visible())
        self.page.get_by_role("dialog").screenshot(path="/tmp/browser/intake-priority/new-case.png")

    def test_appeal_inherits_priority(self):
        self.page.get_by_text("Expedited", exact=True).click()
        self.page.get_by_text("CASE-2025-0765", exact=True).click()
        self.page.get_by_role("button", name="Open an appeal", exact=True).click()
        dialog = self.page.get_by_role("dialog")
        self.assertEqual(dialog.get_by_role("combobox").count(), 1)
        dialog.get_by_role("combobox").click()
        self.page.get_by_text("First Level Appeal", exact=True).click()
        dialog.get_by_role("button", name="Create appeal case", exact=True).click()
        self.assertTrue(self.page.get_by_role("dialog").get_by_text("Expedited", exact=True).is_visible())
        self.page.get_by_role("dialog").last.screenshot(path="/tmp/browser/intake-priority/appeal.png")


if __name__ == "__main__":
    unittest.main()
