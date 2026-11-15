import { useState } from "react";
import { Copy, Building2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface DuplicatePolicyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  policyName: string;
  onCreateVariation: () => void;
  onCreateNewPolicy: (company: string, versionLetter: string) => void;
  existingVersions?: string[]; // e.g., ["A", "B"] - already used version letters
}

const mockCompanies = [
  { id: "1st-community", name: "1st Community Credit Union" },
  { id: "a-core", name: "A-Core Concrete Cutting" },
  { id: "adams-electric", name: "Adams Electric" },
  { id: "agilent", name: "Agilent Technologies" },
  { id: "allegiance-trucks", name: "Allegiance Trucks" },
  { id: "alliance-animal", name: "Alliance Animal Health" },
  { id: "allyon", name: "Allyon" },
  { id: "alter-domus", name: "Alter Domus" },
  { id: "americo", name: "Americo" },
  { id: "anduril", name: "Anduril Industries Inc." },
  { id: "arista", name: "Arista Networks" },
  { id: "artera", name: "Artera" },
  { id: "ascent-aviation", name: "Ascent Aviation" },
  { id: "atl-group", name: "ATL Group" },
  { id: "aveanna", name: "Aveanna Healthcare" },
  { id: "baird", name: "Baird" },
  { id: "banyan", name: "Banyan Treatment Centers" },
  { id: "be-secure", name: "Be Secure-DHL" },
  { id: "beam-healthcare", name: "Beam Healthcare" },
  { id: "berman-auto", name: "Berman Auto Group" },
  { id: "better-holdco", name: "Better Holdco" },
  { id: "bloom-energy", name: "Bloom Energy" },
  { id: "bob-evans", name: "Bob Evans" },
  { id: "boston-beer", name: "Boston Beer" },
  { id: "box", name: "Box" },
  { id: "brakebush", name: "Brakebush" },
  { id: "brio-living", name: "Brio Living Services" },
  { id: "bristol-farms", name: "Bristol Farms Lazy Acres" },
  { id: "bswh", name: "BSWH (Baylor Scott & White Health)" },
  { id: "bytedance", name: "ByteDance" },
  { id: "caci", name: "CACI" },
  { id: "cannondesign", name: "CannonDesign" },
  { id: "ccmc", name: "CCMC" },
  { id: "charter-mfg", name: "Charter Manufacturing" },
  { id: "checkr", name: "Checkr" },
  { id: "chef-driven", name: "Chef Driven" },
  { id: "chs", name: "CHS" },
  { id: "city-fort-worth", name: "City of Fort Worth, TX" },
  { id: "city-of-hope", name: "City of Hope" },
  { id: "clark-nuber", name: "clark Nuber" },
  { id: "cochrane-fountain", name: "Cochrane-Fountain City School District" },
  { id: "colonial-mgmt", name: "Colonial Management Group" },
  { id: "cesa4", name: "Cooperative Educational Service Agency #4" },
  { id: "crl", name: "CRL" },
  { id: "crown-castle", name: "Crown Castle" },
  { id: "cvent", name: "Cvent" },
  { id: "danfoss", name: "Danfoss" },
  { id: "dbs", name: "DBS" },
  { id: "delavan-holdings", name: "Delavan Holdings Management (Kunes Auto Group)" },
  { id: "delicious-hospitality", name: "Delicious Hospitality Group" },
  { id: "dexter-axle", name: "Dexter Axle" },
  { id: "dropbox", name: "Dropbox" },
  { id: "duly-health", name: "Duly Health" },
  { id: "duratech", name: "Duratech" },
  { id: "dyno-nobel", name: "Dyno Nobel" },
  { id: "ebay", name: "eBay" },
  { id: "edw-levy", name: "Edw. C. Levy" },
  { id: "election-systems", name: "Election System & Software" },
  { id: "eli-lilly", name: "Eli Lilly" },
  { id: "emd-serono", name: "EMD Serono" },
  { id: "engineered-floors", name: "Engineered Floors" },
  { id: "entrata", name: "Entrata" },
  { id: "epiq", name: "Epiq (Document Technologies LLC)" },
  { id: "episcopal-retirement", name: "Episcopal Retirement Services" },
  { id: "etsy", name: "Etsy" },
  { id: "everfox", name: "Everfox" },
  { id: "fw-forestry", name: "F&W Forestry Services" },
  { id: "fhg", name: "FHG" },
  { id: "flow-companies", name: "Flow Companies (ARxC)" },
  { id: "fortune-brands", name: "Fortune Brands" },
  { id: "friendship-retirement", name: "Friendship Retirement Community" },
  { id: "gale-ettrick", name: "Gale Ettrick Trempealeau School District" },
  { id: "garver", name: "Garver" },
  { id: "ge-healthcare", name: "GE Healthcare" },
  { id: "geneva-fulfillment", name: "Geneva 10 Fulfillment" },
  { id: "global-security", name: "Global Security" },
  { id: "golden-krust", name: "Golden Krust" },
  { id: "good-food-holdings", name: "Good Food Holdings" },
  { id: "grovehouse", name: "Grovehouse" },
  { id: "guild", name: "Guild" },
  { id: "hansens-iga", name: "Hansen's IGA" },
  { id: "harley-davidson", name: "Harley-Davidson" },
  { id: "hazelden-betty-ford", name: "Hazelden Betty Ford Foundation (HBFF)" },
  { id: "helena-public", name: "Helena Public Schools" },
  { id: "herzog", name: "Herzog Contracting" },
  { id: "hilton", name: "Hilton Employer Inc." },
  { id: "hinge-health", name: "Hinge Health" },
  { id: "holt-homes", name: "Holt Homes" },
  { id: "horizon-services", name: "Horizon Services" },
  { id: "hospitality-staffing", name: "Hospitality Staffing" },
  { id: "houzz", name: "Houzz" },
  { id: "hudson-automotive", name: "Hudson Automotive Group" },
  { id: "hyatt", name: "Hyatt Hotels" },
  { id: "indian-river", name: "Indian River County" },
  { id: "instacart", name: "Instacart" },
  { id: "iora-health", name: "Iora Health Colorado" },
  { id: "ipfs", name: "IPFS" },
  { id: "jacks-maintenance", name: "Jack's Maintenance" },
  { id: "jofaz", name: "Jofaz Transportation" },
  { id: "john-knox", name: "John Knox Village" },
  { id: "joyson-safety", name: "Joyson Safety Systems" },
  { id: "juniors-cheesecake", name: "Junior's Cheesecake" },
  { id: "keller-brothers", name: "Keller Brothers, Inc" },
  { id: "kenosha-county", name: "Kenosha County" },
  { id: "keurig-dr-pepper", name: "Keurig Dr. Pepper" },
  { id: "kickapoo", name: "Kickapoo Area School District" },
  { id: "kidz-medical", name: "Kidz Medical Services" },
  { id: "kin-insurance", name: "Kin Insurance" },
  { id: "ksb", name: "KSB" },
  { id: "ksb-giw", name: "KSB GIW Inc." },
  { id: "kwik-trip", name: "Kwik Trip" },
  { id: "lincoln-financial", name: "Lincoln Financial" },
  { id: "lpl-financial", name: "LPL Financial Holdings, Inc" },
  { id: "lyft", name: "Lyft" },
  { id: "magnolia", name: "Magnolia" },
  { id: "medical-solutions", name: "Medical Solutions" },
  { id: "medtronic", name: "Medtronic" },
  { id: "melrose-mindoro", name: "Melrose-Mindoro Area School District" },
  { id: "metagenics", name: "Metagenics" },
  { id: "mini-med", name: "Mini Med" },
  { id: "monroe", name: "Monroe" },
  { id: "moog", name: "Moog" },
  { id: "naic", name: "NAIC" },
  { id: "new-belgium", name: "New Belgium Brewing" },
  { id: "new-leaf", name: "New Leaf" },
  { id: "new-seasons", name: "New Seasons Market" },
  { id: "next-gen-federal", name: "Next Gen Federal Systems" },
  { id: "noble-credit", name: "Noble Credit Union" },
  { id: "northwestern-mutual", name: "Northwestern Mutual" },
  { id: "novelis", name: "Novelis" },
  { id: "nxp", name: "NXP Semiconductors" },
  { id: "ny44-health", name: "NY44 Health Benefits Plan Trust" },
  { id: "odevo", name: "Odevo US Opco" },
  { id: "om-services", name: "OM Services, P.A." },
  { id: "one-medical", name: "One Medical" },
  { id: "oneblood", name: "OneBlood" },
  { id: "other-half", name: "Other Half Brewery" },
  { id: "pb-intermodal", name: "P&B Intermodal" },
  { id: "pacific-group", name: "Pacific Group Resorts" },
  { id: "pbs-services", name: "PBS Services" },
  { id: "peloton", name: "Peloton" },
  { id: "pinterest", name: "Pinterest" },
  { id: "peht", name: "Public Education Health Trust (PEHT)" },
  { id: "pura-vida", name: "Pura Vida Holdings" },
  { id: "q2-software", name: "Q2 Software" },
  { id: "qualtrics", name: "Qualtrics" },
  { id: "racine-unified", name: "Racine Unified Schools" },
  { id: "radiology-regional", name: "Radiology Regional" },
  { id: "rain-growth", name: "Rain the Growth Agency" },
  { id: "rawhide", name: "Rawhide" },
  { id: "related-partners", name: "Related Partners" },
  { id: "reliance-matrix", name: "Reliance Matrix" },
  { id: "rev-spring", name: "Rev Spring" },
  { id: "rh", name: "RH" },
  { id: "riot-games", name: "Riot Games" },
  { id: "robinhood", name: "Robinhood" },
  { id: "roblox", name: "Roblox" },
  { id: "roche", name: "Roche" },
  { id: "rubrik", name: "Rubrik" },
  { id: "sd-bangor", name: "School District of Bangor" },
  { id: "sd-cashton", name: "School District of Cashton" },
  { id: "sd-holmen", name: "School District of Holmen" },
  { id: "sd-menomonie", name: "School District of Menomonie" },
  { id: "sd-west-salem", name: "School District of West Salem" },
  { id: "sentry-crane", name: "Sentry Crane" },
  { id: "servicetitan", name: "ServiceTitan" },
  { id: "smarsh", name: "Smarsh" },
  { id: "snap", name: "Snap Inc" },
  { id: "spotify", name: "Spotify" },
  { id: "standard-alloys", name: "Standard Alloys" },
  { id: "stonehill-college", name: "Stonehill College" },
  { id: "sunset-chevrolet", name: "Sunset Chevrolet" },
  { id: "superior-automotive", name: "Superior Automotive" },
  { id: "smi", name: "Systems, Methods, Information" },
  { id: "tailored-brands", name: "Tailored Brands" },
  { id: "tapani", name: "Tapani, Inc." },
  { id: "tenem", name: "Tenem" },
  { id: "tcu", name: "Texas Christian University (TCU)" },
  { id: "wonderful", name: "The Wonderful Company" },
  { id: "tivity-health", name: "Tivity Health" },
  { id: "tpg", name: "TPG" },
  { id: "tyson", name: "Tyson" },
  { id: "u-oklahoma", name: "University of Oklahoma" },
  { id: "u-oklahoma-health", name: "University of Oklahoma Health" },
  { id: "upstart", name: "Upstart" },
  { id: "usana", name: "Usana Health Sciences, Inc." },
  { id: "varc", name: "VARC Inc." },
  { id: "verano", name: "Verano Holdings" },
  { id: "verisign", name: "Verisign" },
  { id: "verisys", name: "Verisys" },
  { id: "verkada", name: "Verkada" },
  { id: "vimeo", name: "Vimeo" },
  { id: "vital-md", name: "Vital MD" },
  { id: "viterbo", name: "Viterbo University" },
  { id: "vytl", name: "VYTL Controls Group Inc" },
  { id: "waffle-house", name: "Waffle House" },
  { id: "walker-mfg", name: "Walker Manufacturing" },
  { id: "white-castle", name: "White Castle" },
  { id: "whitehall-sd", name: "Whitehall School District" },
  { id: "xcel-energy", name: "Xcel Energy" },
  { id: "zayo", name: "Zayo Group" },
  { id: "zoom", name: "Zoom" },
];

const versionLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function DuplicatePolicyDialog({
  isOpen,
  onClose,
  policyName,
  onCreateNewPolicy,
  existingVersions = [],
}: DuplicatePolicyDialogProps) {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  
  // Get next available version letter
  const nextVersionLetter = versionLetters.find(letter => !existingVersions.includes(letter)) || "A";
  
  const filteredCompanies = mockCompanies.filter(c => 
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const selectedCompanyName = mockCompanies.find(c => c.id === selectedCompany)?.name;

  const handleCreate = () => {
    if (selectedCompany && selectedCompanyName) {
      onCreateNewPolicy(selectedCompanyName, nextVersionLetter);
      onClose();
      // Reset state
      setSelectedCompany(null);
      setCompanySearch("");
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedCompany(null);
    setCompanySearch("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Policy Version</DialogTitle>
          <DialogDescription>
            Create a company-specific version of "{policyName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Version Preview */}
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Copy className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">New policy name:</span>
            </div>
            <p className="mt-1 font-medium text-foreground">
              {policyName} - Version {nextVersionLetter}
              {selectedCompanyName && (
                <span className="text-accent"> ({selectedCompanyName})</span>
              )}
            </p>
          </div>

          {/* Company Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Assign to Company
            </Label>
            <Input
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Search companies..."
              className="mb-2"
            />
            <ScrollArea className="h-48 rounded-lg border border-border">
              <div className="p-2 space-y-1">
                {filteredCompanies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => setSelectedCompany(company.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                      selectedCompany === company.id
                        ? "bg-accent/10 text-accent"
                        : "hover:bg-secondary text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border transition-colors",
                        selectedCompany === company.id
                          ? "border-accent bg-accent text-white"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {selectedCompany === company.id && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    {company.name}
                  </button>
                ))}
                {filteredCompanies.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No companies found
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!selectedCompany}
          >
            Create Version {nextVersionLetter}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
