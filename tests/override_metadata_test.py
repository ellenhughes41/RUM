import json
import subprocess
import unittest
from datetime import datetime


class OverrideMetadataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        result = subprocess.run(
            ["bun", "-e", 'import { mockOverrideCases } from "./src/data/mockOverrideCases.ts"; console.log(JSON.stringify(mockOverrideCases.map(c => c.override)))'],
            check=True, capture_output=True, text=True,
        )
        cls.overrides = json.loads(result.stdout)

    def test_authorization_numbers_have_exactly_six_numeric_digits(self):
        self.assertGreater(len(self.overrides), 0)
        for override in self.overrides:
            self.assertRegex(override["authNumber"], r"^[0-9]{6}$")

    def test_created_at_contains_date_and_time(self):
        for override in self.overrides:
            timestamp = override["createdAt"]
            self.assertRegex(timestamp, r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$")
            self.assertEqual(datetime.fromisoformat(timestamp).year, 2026)

    def test_test_claim_cids_have_nine_numeric_digits(self):
        result = subprocess.run(
            ["bun", "-e", 'import { mockOverrideCases } from "./src/data/mockOverrideCases.ts"; console.log(JSON.stringify(mockOverrideCases.flatMap(c => [c.claimA, c.claimB].filter(Boolean))))'],
            check=True, capture_output=True, text=True,
        )
        claims = json.loads(result.stdout)
        self.assertGreater(len(claims), 0)
        self.assertEqual(claims[0]["cid"], "282047531")
        for claim in claims:
            self.assertRegex(claim["cid"], r"^[0-9]{9}$")


if __name__ == "__main__":
    unittest.main()