import re
import unittest
from playwright.sync_api import sync_playwright, expect


class NewIntakeTests(unittest.TestCase):
    def setUp(self):
        self.playwright = sync_playwright().start()
        self.addCleanup(self.playwright.stop)
        self.browser = self.playwright.chromium.launch(headless=True)
        self.addCleanup(self.browser.close)
        self.page = self.browser.new_page(viewport={"width": 1280, "height": 1800})
        self.page.goto("http://localhost:8080/intake")
        self.page.get_by_role("tab", name=re.compile("My cases")).click()
        self.page.get_by_role("button", name=re.compile("New Intake")).click()

    def complete_member_drug_priority(self):
        page = self.page
        page.get_by_role("button", name="Change member", exact=True).click()
        page.get_by_placeholder("Search by name, member ID, or DOB…").fill("Rosa")
        page.locator(".ant-card").filter(has=page.get_by_text("Identify member", exact=True)).get_by_text("Rosa Delgado", exact=True).click()
        page.get_by_role("button", name="Confirm member", exact=True).click()
        page.get_by_role("button", name=re.compile("Change drug")).click()
        page.get_by_role("dialog").get_by_role("row").filter(has_text="27997050100320").click()
        page.get_by_role("button", name="Confirm selection", exact=True).click()
        page.get_by_role("textbox", name="Quantity", exact=True).fill("2 pens")
        page.get_by_role("textbox", name="Days supply", exact=True).fill("28")
        page.get_by_role("button", name="Confirm drug", exact=True).click()
        page.get_by_text("Expedited", exact=True).click()

    def history_card(self):
        return self.page.locator(".ant-card").filter(has=self.page.get_by_text("Case history", exact=True))

    def upload_chart(self):
        self.page.locator("input[type=file]").set_input_files({"name": "chart.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4 demo"})

    def test_new_intake_claimed_and_excluded_from_shared_queue(self):
        page = self.page
        expect(page.get_by_role("dialog")).to_have_count(0)
        card = page.locator(".cursor-pointer").filter(has_text="TXN-M-").first
        expect(card.get_by_role("button", name="Release", exact=True)).to_have_count(0)
        transaction = card.inner_text().splitlines()[0]
        expect(card).to_be_visible()
        page.get_by_role("tab", name=re.compile(r"^Intake \(")).click()
        expect(page.locator(".cursor-pointer").filter(has_text=transaction)).to_have_count(0)
        expect(page.get_by_role("button", name=re.compile("New Intake"))).to_have_count(0)

    def test_history_requires_prescriber_fax(self):
        self.complete_member_drug_priority()
        self.upload_chart()
        expect(self.history_card().get_by_text("Locked", exact=True)).to_be_visible()
        self.page.get_by_role("textbox", name="NPI", exact=True).fill("1234567890")
        self.page.get_by_role("textbox", name="Provider name", exact=True).fill("Dr. Example")
        self.page.get_by_role("textbox", name="Phone number", exact=True).fill("555-0100")
        expect(self.history_card().get_by_text("Locked", exact=True)).to_be_visible()
        self.page.get_by_role("textbox", name="Fax number", exact=True).fill("555-0101")
        expect(self.history_card().get_by_text("Locked", exact=True)).to_have_count(0)
        expect(self.page.get_by_role("button", name=re.compile("Create case"))).to_be_enabled()
        self.page.screenshot(path="/tmp/browser/new-intake/complete.png")
        self.page.get_by_role("textbox", name="Fax number", exact=True).fill("")
        expect(self.history_card().get_by_text("Locked", exact=True)).to_be_visible()
        expect(self.page.get_by_role("button", name=re.compile("Create case"))).to_be_disabled()

    def test_history_requires_chart_notes(self):
        self.complete_member_drug_priority()
        self.page.get_by_role("textbox", name="Fax number", exact=True).fill("555-0101")
        expect(self.history_card().get_by_text("Locked", exact=True)).to_be_visible()
        self.upload_chart()
        expect(self.history_card().get_by_text("Locked", exact=True)).to_have_count(0)
        self.page.get_by_role("button", name="Remove chart.pdf", exact=True).click()
        expect(self.history_card().get_by_text("Locked", exact=True)).to_be_visible()

    def test_dismiss_available(self):
        self.page.get_by_role("button", name=re.compile("Dismiss")).click()
        expect(self.page.get_by_role("dialog")).to_be_visible()


if __name__ == "__main__":
    unittest.main()