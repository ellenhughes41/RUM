import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Sparkles, Search, X, ChevronUp, ChevronDown, AlertTriangle, Paperclip, Trash2, LayoutGrid, Check, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MemberSearchModal, detachAndDismiss, detachToMember, detachToNewCase } from "@/components/intake/pageDetach";

const SHOW_FAX_SPLIT = false;

interface ChartViewerProps {
  highlightedRule?: string | null;
  highlightedRuleFailed?: boolean;
  highlightedRuleMissing?: boolean;
  caseId?: string | null;
  highlightCustomText?: string | null;
  highlightedPage?: number | null;
  onClearHighlight?: () => void;
  /** Optional page rendered before the chart notes (e.g. electronic question-set answers). */
  leadingPage?: React.ReactNode;
}

// AI Rosa highlight map: page → highlights (categories array supports shared highlights)
const rosaAIHighlightMap: Record<number, { text: string; badge: string; categories: string[] }[]> = {
  4: [
    { text: "Type 2 diabetes mellitus with diabetic neuropathy,\n  unspecified (ICD10:E11.40)", badge: "1", categories: ["FDA-Approved Diagnosis", "Exclusion Check"] },
    { text: "glimepiride 4 MG Oral Tablet", badge: "2", categories: ["Prior Oral Antidiabetic Drug Trial"] },
    { text: "linagliptin 5 MG Oral Tablet [Tradjenta]", badge: "2", categories: ["Prior Oral Antidiabetic Drug Trial"] },
    { text: "metformin hydrochloride 1000 MG Oral Tablet", badge: "2", categories: ["Prior Oral Antidiabetic Drug Trial"] },
  ],
  6: [
    { text: "BG's uncontrolled on glargine, glimepiride, metformin, and linagliptan.\n  A1c currently 8.1%.", badge: "2", categories: ["Prior Oral Antidiabetic Drug Trial"] },
  ],
};

export function ChartViewer({ highlightedRule, highlightedRuleFailed = false, highlightedRuleMissing = false, caseId, highlightCustomText, highlightedPage, onClearHighlight, leadingPage }: ChartViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState("chart-notes-3");
  const [pagesPanelOpen, setPagesPanelOpen] = useState(false);
  const [removedPages, setRemovedPages] = useState<Set<number>>(new Set());
  const [removePagesInput, setRemovePagesInput] = useState("");
  const [removePagesError, setRemovePagesError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"single" | "all">("single");
  const [selectedGridPages, setSelectedGridPages] = useState<Set<number>>(new Set());
  const [gridMemberPickerOpen, setGridMemberPickerOpen] = useState(false);
  const [gridMemberPickerIntent, setGridMemberPickerIntent] = useState<"transaction" | "case">("transaction");
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitInput, setSplitInput] = useState("");
  const [splitError, setSplitError] = useState<string | null>(null);
  const [splitMemberOpen, setSplitMemberOpen] = useState(false);
  const [splitIntent, setSplitIntent] = useState<"transaction" | "case">("transaction");
  const [splitTargetPages, setSplitTargetPages] = useState<number[]>([]);

  const selectedPageList = Array.from(selectedGridPages).sort((a, b) => a - b);
  const hasGridSelection = selectedPageList.length > 0;


  const toggleGridPage = (p: number) => {
    setSelectedGridPages(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  // Parse the split popover's page targets, e.g. "2, 4-6"
  const parseSplitPages = (): number[] | null => {
    const raw = splitInput.trim();
    if (!raw) {
      setSplitError("Enter a page or range");
      return null;
    }
    const pages: number[] = [];
    for (const rawPart of raw.split(",")) {
      const part = rawPart.trim();
      if (!part) continue;
      const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
      const single = part.match(/^(\d+)$/);
      if (range) {
        const lo = Math.min(+range[1], +range[2]);
        const hi = Math.max(+range[1], +range[2]);
        for (let n = lo; n <= hi; n++) pages.push(n);
      } else if (single) {
        pages.push(+single[1]);
      } else {
        setSplitError(`Invalid entry: "${part}"`);
        return null;
      }
    }
    if (pages.some(n => n < 1 || n > totalPages)) {
      setSplitError(`Pages must be between 1 and ${totalPages}`);
      return null;
    }
    if (!pages.length) {
      setSplitError("Enter a page or range");
      return null;
    }
    setSplitError(null);
    return Array.from(new Set(pages)).sort((a, b) => a - b);
  };

  const runSplitAction = (action: "dismiss" | "member" | "case") => {
    const pages = parseSplitPages();
    if (!pages) return;
    if (action === "dismiss") {
      detachAndDismiss(pages, caseId ?? undefined);
      setSplitInput("");
      setSplitOpen(false);
      return;
    }
    setSplitTargetPages(pages);
    setSplitIntent(action === "case" ? "case" : "transaction");
    setSplitOpen(false);
    setSplitMemberOpen(true);
  };



  // Default back to Single Page each time a new document/case is opened
  useEffect(() => {
    setViewMode("single");
    setSelectedGridPages(new Set());
  }, [selectedDocument, caseId]);


  const totalPages = (caseId === "rosa-ozempic" || caseId === "rosa-ozempic-ai") ? 7 : caseId === "7" ? 5 : caseId === "6" ? 3 : caseId === "5" ? 40 : caseId === "2" ? 4 : caseId === "4" ? 1 : caseId === "3" ? 3 : 4;
  const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => !removedPages.has(p));
  // Pages that actually have distinct mock content (some mocks render one continuous note).
  const contentPageCount = (caseId === "rosa-ozempic" || caseId === "rosa-ozempic-ai") ? 7 : caseId === "7" ? 5 : caseId === "6" ? 3 : caseId === "5" ? 4 : caseId === "3" ? 3 : 1;
  const scrollPages = visiblePages.filter(p => p <= contentPageCount);
  const leadOffset = leadingPage ? 1 : 0;
  const scrollTotal = scrollPages.length + leadOffset || 1;
  const [scrollIndex, setScrollIndex] = useState(0);
  const pageEls = () => Array.from(scrollContainerRef.current?.querySelectorAll<HTMLElement>("[data-page-index]") ?? []);
  const scrollToPageIndex = (i: number) => {
    const el = pageEls()[i];
    const c = scrollContainerRef.current;
    if (el && c) c.scrollTo({ top: el.offsetTop, behavior: "smooth" });
  };
  const handlePageScroll = () => {
    const c = scrollContainerRef.current;
    if (!c) return;
    const probe = c.scrollTop + c.clientHeight / 3;
    let idx = 0;
    pageEls().forEach((el, i) => { if (el.offsetTop <= probe) idx = i; });
    if (idx !== scrollIndex) setScrollIndex(idx);
  };
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
    setScrollIndex(0);
  }, [caseId, selectedDocument]);
  useEffect(() => {
    if (!highlightedPage) return;
    const i = scrollPages.indexOf(highlightedPage);
    if (i >= 0) setTimeout(() => scrollToPageIndex(i + leadOffset), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedPage]);
  const currentVisibleIndex = visiblePages.indexOf(currentPage);
  const goToPrevVisiblePage = () => {
    if (currentVisibleIndex > 0) setCurrentPage(visiblePages[currentVisibleIndex - 1]);
  };
  const goToNextVisiblePage = () => {
    if (currentVisibleIndex >= 0 && currentVisibleIndex < visiblePages.length - 1) {
      setCurrentPage(visiblePages[currentVisibleIndex + 1]);
    }
  };
  const toggleRemovedPage = (p: number) => {
    setRemovedPages(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };
  const applyRemovePagesInput = () => {
    const raw = removePagesInput.trim();
    if (!raw) {
      setRemovePagesError("Enter a page or range");
      return;
    }
    const pagesToRemove: number[] = [];
    for (const rawPart of raw.split(",")) {
      const part = rawPart.trim();
      if (!part) continue;
      const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
      const singleMatch = part.match(/^(\d+)$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        const lo = Math.min(start, end);
        const hi = Math.max(start, end);
        for (let n = lo; n <= hi; n++) pagesToRemove.push(n);
      } else if (singleMatch) {
        pagesToRemove.push(parseInt(singleMatch[1], 10));
      } else {
        setRemovePagesError(`Invalid entry: "${part}"`);
        return;
      }
    }
    const outOfRange = pagesToRemove.filter(n => n < 1 || n > totalPages);
    if (outOfRange.length > 0) {
      setRemovePagesError(`Pages must be between 1 and ${totalPages}`);
      return;
    }
    setRemovedPages(prev => {
      const next = new Set(prev);
      for (const n of pagesToRemove) next.add(n);
      return next;
    });
    setRemovePagesInput("");
    setRemovePagesError(null);
  };


  const documentOptions = (caseId === "rosa-ozempic" || caseId === "rosa-ozempic-ai") ? [
    { value: "chart-notes-rosa", label: "Chart Notes 04/30/2025", pages: 7 },
    { value: "appendix", label: "Appendix", pages: 1 },
  ] : [
    { value: "chart-notes-3", label: "Chart Notes 03/15/2026", pages: totalPages },
    { value: "chart-notes-2", label: "Chart Notes 02/28/2026", pages: 3 },
    { value: "chart-notes-1", label: "Chart Notes 01/10/2026", pages: 2 },
    { value: "referral-letter", label: "Referral Letter", pages: 1 },
    { value: "insurance-auth", label: "Insurance Authorization", pages: 1 },
    { value: "appendix", label: "Appendix", pages: 1 },
  ];
  const totalDocuments = documentOptions.length;
  
  // Refs for scrolling to highlighted elements
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const highlightRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  const isHighlighted = (category: string) => 
    highlightedRule?.toLowerCase() === category.toLowerCase();

  // Custom text highlight ref
  const customHighlightRef = useRef<HTMLElement | null>(null);

  // Navigate to highlighted page and scroll to element when highlightedRule changes
  // Reset page and document on case change
  useEffect(() => {
    if (caseId === "rosa-ozempic" || caseId === "rosa-ozempic-ai") {
      setCurrentPage(1);
      setSelectedDocument("chart-notes-rosa");
    } else {
      setCurrentPage(1);
      setSelectedDocument("chart-notes-3");
    }
    setRemovedPages(new Set());
    setPagesPanelOpen(false);
  }, [caseId]);

  useEffect(() => {
    setRemovedPages(new Set());
  }, [selectedDocument]);

  // If the current page becomes removed, jump to the next visible page.
  useEffect(() => {
    if (removedPages.has(currentPage)) {
      const next = Array.from({ length: totalPages }, (_, i) => i + 1).find(p => !removedPages.has(p));
      if (next) setCurrentPage(next);
    }
  }, [removedPages, currentPage, totalPages]);

  useEffect(() => {
    // First, navigate to the correct page if specified
    if (highlightedPage && highlightedPage !== currentPage) {
      setCurrentPage(highlightedPage);
    }
  }, [highlightedPage]);

  // Scroll to highlighted element after page change
  useEffect(() => {
    // If there's custom text to highlight, scroll to it instead
    if (highlightCustomText && customHighlightRef.current) {
      setTimeout(() => {
        customHighlightRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 150);
      return;
    }

    if (highlightedRule && scrollContainerRef.current) {
      const element = highlightRefs.current.get(highlightedRule.toLowerCase());
      if (element) {
        // Slightly longer delay to ensure page has rendered after navigation
        setTimeout(() => {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 150);
      }
    }
  }, [highlightedRule, highlightCustomText, currentPage]);

  // Search functionality - highlight and scroll to matches
  const searchMatchRefs = useRef<HTMLElement[]>([]);
  
  // Auto-search for custom text (corrected criteria)
  useEffect(() => {
    if (highlightCustomText && highlightCustomText.length > 3) {
      // Use part of the custom text for search (first 50 chars max)
      const searchTerm = highlightCustomText.slice(0, 50);
      setSearchQuery(searchTerm);
      setSearchOpen(true);
    } else if (!highlightCustomText && searchOpen) {
      // Clear search when custom text is removed (only if it was set by custom text)
      // Don't clear if user manually opened search
    }
  }, [highlightCustomText]);

  useEffect(() => {
    if (!searchQuery || !scrollContainerRef.current) {
      setMatchCount(0);
      setCurrentMatch(0);
      return;
    }

    // Use setTimeout to allow DOM to update with highlights
    setTimeout(() => {
      const container = scrollContainerRef.current;
      if (container) {
        const marks = container.querySelectorAll('mark[data-search-match]');
        searchMatchRefs.current = Array.from(marks) as HTMLElement[];
        setMatchCount(marks.length);
        if (marks.length > 0) {
          setCurrentMatch(1);
        } else {
          setCurrentMatch(0);
        }
      }
    }, 100);
  }, [searchQuery, currentPage]);

  // Scroll to current match
  useEffect(() => {
    if (currentMatch > 0 && searchMatchRefs.current[currentMatch - 1]) {
      searchMatchRefs.current[currentMatch - 1].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentMatch]);

  const goToNextMatch = () => {
    if (currentMatch < matchCount) {
      setCurrentMatch(currentMatch + 1);
    } else if (matchCount > 0) {
      setCurrentMatch(1);
    }
  };

  const goToPrevMatch = () => {
    if (currentMatch > 1) {
      setCurrentMatch(currentMatch - 1);
    } else if (matchCount > 0) {
      setCurrentMatch(matchCount);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchOpen(false);
    setMatchCount(0);
    setCurrentMatch(0);
  };

  // Helper to highlight search matches in text
  const highlightSearchText = (text: string): React.ReactNode => {
    if (!searchQuery || searchQuery.length < 2) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === searchQuery.toLowerCase()) {
        return (
          <mark 
            key={index} 
            data-search-match
            className="bg-yellow-300 text-gray-900 px-0.5 rounded"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  // Helper to highlight custom text (corrected criteria) in the chart
  const CustomTextHighlight = ({ text }: { text: string }) => {
    if (!highlightCustomText) return <>{text}</>;
    
    const searchTermLower = highlightCustomText.toLowerCase();
    const textLower = text.toLowerCase();
    const index = textLower.indexOf(searchTermLower);
    
    if (index === -1) return <>{text}</>;
    
    const before = text.slice(0, index);
    const match = text.slice(index, index + highlightCustomText.length);
    const after = text.slice(index + highlightCustomText.length);
    
    return (
      <>
        {before}
        <mark 
          ref={(el) => { customHighlightRef.current = el; }}
          className="bg-success/30 text-foreground px-1 rounded ring-2 ring-success animate-pulse"
        >
          {match}
        </mark>
        {after}
      </>
    );
  };

  // Register ref for a category
  const registerRef = useCallback((category: string, element: HTMLSpanElement | null) => {
    if (element) {
      highlightRefs.current.set(category.toLowerCase(), element);
    }
  }, []);

  const HighlightWrapper = ({ category, children }: { category: string; children: React.ReactNode }) => {
    const active = isHighlighted(category);
    const highlightColor = highlightedRuleFailed ? "destructive" : "accent";
    return (
      <span 
        className="relative inline-block"
        ref={(el) => registerRef(category, el)}
      >
        <span
          className={cn(
            "relative transition-all duration-300 inline-block",
            active && highlightedRuleFailed && "bg-destructive/30 rounded px-1 -mx-1 ring-2 ring-destructive",
            active && !highlightedRuleFailed && "bg-success/20 rounded px-1 -mx-1 ring-2 ring-success"
          )}
        >
          {children}
        </span>
        {active && (
          <span className={cn(
            "absolute -top-6 left-0 flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium shadow-md whitespace-nowrap z-10",
            highlightedRuleFailed ? "bg-destructive text-destructive-foreground" : "bg-success text-success-foreground"
          )}>
            <Sparkles className="h-3 w-3" />
            {category}
          </span>
        )}
      </span>
    );
  };

  // Render text with AI highlights for rosa-ozempic-ai
  const renderHighlightedRosaPage = (text: string, page: number): React.ReactNode => {
    const highlights = rosaAIHighlightMap[page];
    if (!highlights || highlights.length === 0 || caseId !== "rosa-ozempic-ai") return text;
    const positions: { start: number; end: number; badge: string; categories: string[] }[] = [];
    for (const h of highlights) {
      const idx = text.indexOf(h.text);
      if (idx !== -1) positions.push({ start: idx, end: idx + h.text.length, badge: h.badge, categories: h.categories });
    }
    positions.sort((a, b) => a.start - b.start);
    if (positions.length === 0) return text;
    const result: React.ReactNode[] = [];
    let lastEnd = 0;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      if (pos.start > lastEnd) result.push(text.slice(lastEnd, pos.start));
      const isActive = pos.categories.some(c => highlightedRule?.toLowerCase() === c.toLowerCase());
      const hasAnyHighlight = !!highlightedRule;
      result.push(
        <span
          key={`hl-${page}-${i}`}
          ref={isActive ? (el: HTMLSpanElement | null) => { if (el) highlightRefs.current.set(highlightedRule!.toLowerCase(), el); } : undefined}
          className={cn(
            "relative transition-all duration-300 inline rounded-sm",
            isActive ? "bg-amber-300/90 ring-2 ring-amber-400" : hasAnyHighlight ? "bg-yellow-100/60" : "bg-yellow-100/60",
          )}
        >
          {text.slice(pos.start, pos.end)}
          <span className={cn(
            "inline-flex items-center justify-center rounded-full text-[12px] font-bold text-white ml-0.5 w-3.5 h-3.5 align-text-top",
            isActive ? "bg-blue-600" : "bg-gray-400"
          )}>
            {pos.badge}
          </span>
        </span>
      );
      lastEnd = pos.end;
    }
    if (lastEnd < text.length) result.push(text.slice(lastEnd));
    return <>{result}</>;
  };

  const renderPage = (currentPage: number) => (
          <div className="p-8" style={{ fontSize: `${(14 * zoom) / 100}px` }}>
            {caseId === "7" ? (
              <>
                {currentPage === 1 && (
                  <>
                    {/* Page 1 Header */}
                    <div className="mb-4 text-center">
                      <p className="text-xs text-gray-500 mb-1">Office Visit</p>
                      <h1 className="text-lg font-bold text-gray-800">Sutter Internal Medicine - Los Gatos</h1>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Primary diagnosis:</span> Encounter for preventive care
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="font-medium">Reason for Visit:</span> Establish Care (New Patient Consult) • Complete physical exam • Weight problem
                      </p>
                    </div>

                    <div className="mb-4 border-b pb-2">
                      <h2 className="text-sm font-bold text-gray-800">Progress Notes</h2>
                      <p className="text-xs text-gray-500">
                        <HighlightWrapper category="Prescriber Requirements">
                          (Physician) • Internal Medicine
                        </HighlightWrapper>
                      </p>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">FEMALE PREVENTIVE VISIT</h2>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">CHIEF COMPLAINT(S)</h2>
                      <p className="text-xs text-gray-600">
                        Establish Care (New Patient Consult), Complete physical exam, and Weight problem (Would like to talk about weight loss)
                      </p>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">ASSESSMENT AND PLAN</h2>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>1. Encounter for preventive care</p>
                        <p className="pl-4">- Reviewed preventative guidelines</p>
                        <p>2. Insomnia, unspecified type</p>
                        <p className="pl-4">- On low dose Gabapentin prn</p>
                        <p>3. Anxiety</p>
                        <p className="pl-4">- Follow up with psychiatry. Benzo will not be refilled by this office but by her psychiatrist.</p>
                        <p>4. <HighlightWrapper category="BMI Requirements">BMI 27.0-27.9, adult</HighlightWrapper></p>
                        <p className="pl-4">
                          <HighlightWrapper category="Weight-Related Comorbidities">
                            - R/o OSA, chronic back pain benefit with weight reduction.
                          </HighlightWrapper>
                        </p>
                        <p>5. <HighlightWrapper category="Diagnosis / Indication">Obesity, unspecified (E66.9)</HighlightWrapper></p>
                        <p className="pl-4">- Weight management program discussed</p>
                        <p>6. <HighlightWrapper category="Weight-Related Comorbidities">Sleep apnea, unspecified type</HighlightWrapper></p>
                        <p className="pl-4">- REFERRAL TO SLEEP DISORDERS, INT</p>
                        <p>7. Colon cancer screening</p>
                        <p className="pl-4">- Patient prefers stool test.</p>
                        <p className="pl-4">- FIT-DNA (COLOGUARD)</p>
                        <p>8. <HighlightWrapper category="Exclusions">History of breast cancer</HighlightWrapper></p>
                        <p className="pl-4">- Patient has follow up apt with medical oncology.</p>
                        <p>9. Back pain, unspecified back location, unspecified back pain laterality, unspecified chronicity</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">HISTORY OF PRESENT ILLNESS</h2>
                      <p className="text-xs text-gray-600">
                        <HighlightWrapper category="Patient Eligibility (Age)">
                          is a 46 year old female
                        </HighlightWrapper> who presents for
                      </p>
                      <p className="text-xs text-gray-600 mt-2">
                        <HighlightWrapper category="Lifestyle Modifications">
                          Tried diet, meal delivery for daily calorie 1600 cal diet. Can lose but not retained. Hunger.
                        </HighlightWrapper>
                        {" "}Would like to try GLP-1.
                      </p>
                      <p className="text-xs text-gray-600 mt-2">
                        <HighlightWrapper category="Prerequisites (Step Therapy)">
                          Engaged in physician-directed lifestyle intervention since October 2025 with regular follow-ups. Program unsuccessful after 3 months with persistent obesity.
                        </HighlightWrapper>
                      </p>
                    </div>

                    <div className="text-right text-xs text-gray-400 mt-8">1/5</div>
                  </>
                )}

                {currentPage === 2 && (
                  <>
                    <div className="mb-4">
                      <p className="text-xs text-gray-600">
                        <HighlightWrapper category="Exclusions">
                          History of L breast cancer DCIS s/p lumpectomy 2022.
                        </HighlightWrapper>
                      </p>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">PROBLEM LIST</h2>
                      <p className="text-xs text-gray-600 mb-2">Patient Active Problem List:</p>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>
                          <HighlightWrapper category="Exclusions">
                            - Ductal carcinoma in situ (DCIS) of left breast
                          </HighlightWrapper>
                        </p>
                        <p>- Oncology Genetic Testing Negative</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">PAST MEDICAL HISTORY</h2>
                      
                      {/* OB History Table */}
                      <table className="w-full text-xs mb-3 border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-2 py-1 text-left">OB History</th>
                            <th className="border border-gray-300 px-2 py-1">Term</th>
                            <th className="border border-gray-300 px-2 py-1">Preterm</th>
                            <th className="border border-gray-300 px-2 py-1">AB</th>
                            <th className="border border-gray-300 px-2 py-1">Living</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['Gravida', 'Para', 'SAB', 'IAB', 'Ectopic', 'Molar', 'Multiple Live Births'].map((row) => (
                            <tr key={row}>
                              <td className="border border-gray-300 px-2 py-1">{row}</td>
                              <td className="border border-gray-300 px-2 py-1 text-center">0</td>
                              <td className="border border-gray-300 px-2 py-1 text-center">0</td>
                              <td className="border border-gray-300 px-2 py-1 text-center">0</td>
                              <td className="border border-gray-300 px-2 py-1 text-center">0</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <p className="text-xs text-gray-600 mb-2">Review of patient's past medical history indicates:</p>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>- Dysmenorrhea</p>
                        <p>- Generalized anxiety disorder</p>
                        <p>
                          <HighlightWrapper category="Exclusions">
                            - Malignant neoplasm of breast (female) (CMS/HCC)
                          </HighlightWrapper>
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">PAST SURGICAL HISTORY</h2>
                      <p className="text-xs text-gray-600 mb-2">Review of patient's past surgical history indicates:</p>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>- HX BIOPSY</p>
                        <p>- HX EXCISE BREAST LUMP</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">MEDICATIONS</h2>
                      <p className="text-xs text-gray-600 mb-2">Outpatient Medications Marked as Taking for the encounter (Office Visit) with MD:</p>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>- gabapentin (NEURONTIN) 100mg Cap, Take one Cap by mouth daily at bedtime</p>
                        <p>- Collagen-Vitamin C-Biotin (COLLAGEN 1500/C) 500-50-0.8 MG CAPS, Take by mouth</p>
                        <p>- Calcium Carbonate-Vit D-Min (CALCIUM 1200 PO), Take by mouth</p>
                        <p>- Methylcobalamin (B12-ACTIVE PO), Take by mouth</p>
                        <p>- Multiple Vitamins-Minerals (MULTIViTAL PO), Take by mouth</p>
                        <p>- clonazePAM (KLONOPIN) 0.5mg Tab, Take one Tab by mouth twice daily as needed</p>
                        <p>- ibuprofen (ADVIL LIQUI-GELS) 200mg Cap, Take one Cap by mouth every 6 hours as needed for Pain</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">ALLERGIES</h2>
                      <p className="text-xs text-gray-600">Latex</p>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">IMMUNIZATIONS</h2>
                      <p className="text-xs text-gray-600 mb-2">Immunization History</p>
                      <table className="w-full text-xs border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-2 py-1 text-left">Administered</th>
                            <th className="border border-gray-300 px-2 py-1 text-left">Date(s) Administered</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Influenza Vaccine QUADR PF 6+ MO (FLUZONE, FLULAVAL, FLUARIX)</td>
                            <td className="border border-gray-300 px-2 py-1"></td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Influenza vaccine QUADR PF 3+ YO (AFLURIA)</td>
                            <td className="border border-gray-300 px-2 py-1"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">SOCIAL HISTORY</h2>
                      <p className="text-xs text-gray-600">
                        Reports that she has never smoked. She has never used smokeless tobacco. She reports that she does not currently use alcohol. She reports that she does not use drugs.
                      </p>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">FAMILY HISTORY</h2>
                      <p className="text-xs text-gray-600">
                        Family history includes Breast cancer (age of onset: 50) in her paternal grandmother; No Current problems or disability in her father and mother; Uterine Cancer (age of onset: 51) in her maternal grandmother.
                      </p>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">REVIEW OF SYSTEMS</h2>
                      <p className="text-xs text-gray-600">
                        Except for what was stated above, the review of systems for constitutional, eyes, ears/nose/throat, neck cardiovascular, respiratory, gastrointestinal, lymphatic, skin, genitourinary, musculoskeletal, endocrine,
                      </p>
                    </div>

                    <div className="text-right text-xs text-gray-400 mt-8">2/5</div>
                  </>
                )}

                {currentPage === 3 && (
                  <>
                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">PHYSICAL EXAMINATION</h2>
                      <p className="text-xs text-gray-600 mb-3">Vitals signs: There were no vitals filed for this visit.</p>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-gray-800 mb-1">Constitutional:</h3>
                      <p className="text-xs text-gray-600">
                        The patient appears well nourished, well groomed and to be in no apparent distress.
                      </p>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-gray-800 mb-1">Eyes:</h3>
                      <p className="text-xs text-gray-600">
                        Conjunctivae are non-erythematous. Eyelids without lesions. The sclerae are anicteric. The pupils are round and reactive to light and accommodation. Iris normal bilaterally.
                      </p>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-gray-800 mb-1">Ears, nose, mouth, and throat:</h3>
                      <p className="text-xs text-gray-600">
                        External ears and nose without suspicious lesions. The tympanic membranes and external ear canals are normal bilaterally. Lips, dentition, and gums unremarkable in appearance. The oropharynx, hard and soft palates, tongue, tonsils, and posterior pharynx are normal.
                      </p>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-gray-800 mb-1">Neck:</h3>
                      <p className="text-xs text-gray-600">Supple, no masses. No thyromegaly.</p>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-gray-800 mb-1">Chest:</h3>
                      <p className="text-xs text-gray-600">
                        Breasts without dimpling or erythema. No discharge. No suspicious palpable masses or discharge. No axillary masses.
                      </p>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-gray-800 mb-1">Respiratory:</h3>
                      <p className="text-xs text-gray-600">
                        Normal effort without use of accessory muscles. Percussion: No dullness to percussion bilaterally. Auscultation: Clear breath sounds bilaterally. No wheezing.
                      </p>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-gray-800 mb-1">Cardiovascular:</h3>
                      <p className="text-xs text-gray-600">
                        Auscultation: Regular rhythm. Normal S1 and S2. No murmurs, gallops, or rubs.
                      </p>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-gray-800 mb-1">Examination of the extremities:</h3>
                      <p className="text-xs text-gray-600">
                        No edema. No carotid bruits. No abdominal bruits. Normal DP pulses.
                      </p>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-gray-800 mb-1">Gastrointestinal:</h3>
                      <p className="text-xs text-gray-600">
                        Normal bowel sounds. No masses or tenderness. No hepatomegaly or splenomegaly.
                      </p>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-gray-800 mb-1">Lymphatic:</h3>
                      <p className="text-xs text-gray-600">
                        No cervical, supraclavicular, or inguinal lymphadenopathy.
                      </p>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-gray-800 mb-1">Skin:</h3>
                      <p className="text-xs text-gray-600">
                        No visible suspicious skin or subcutaneous lesions. No suspicious palpable lesions.
                      </p>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-gray-800 mb-1">Neurologic:</h3>
                      <p className="text-xs text-gray-600">
                        Cranial nerves II-XII intact. 2+ patellar reflexes bilaterally. Sensation intact.
                      </p>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-gray-800 mb-1">Musculoskeletal:</h3>
                      <p className="text-xs text-gray-600">
                        Normal gait and station. Digits without clubbing or cyanosis. Normal joints of the right upper, right lower, left upper, and left lower extremities with regards to inspection and palpation, ROM, and stability. Normal muscle tone. Muscle strength 5/5 throughout.
                      </p>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-gray-800 mb-1">Psychiatric:</h3>
                      <p className="text-xs text-gray-600">
                        Normal mood and affect. Alert and oriented to time, place, and person.
                      </p>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">LABS AND STUDIES</h2>
                      <p className="text-xs text-gray-600">Lab results 2024 reviewed.</p>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">Instructions</h2>
                      <p className="text-xs text-gray-600">After Visit Summary (Automatic SnapShot taken)</p>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">Additional Documentation</h2>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">Vitals:</h2>
                      <p className="text-xs text-gray-600">
                        <HighlightWrapper category="BMI Requirements">
                          BP 125/75 (Site: LA, Position: Sitting, Cuff Size: R) Pulse 70 Temp 98.5 °F (36.9 °C) (Oral) Ht 1.625 m (5' 3.98") Wt 73.3 kg (161 lb 8 oz) LMP 11/01/2024 (Approximate) SpO2 97% BMI 27.74 kg/m² BSA 1.82 m
                        </HighlightWrapper>
                      </p>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">Communications</h2>
                      <p className="text-xs text-gray-600 mb-2">All Conversations: Establish Care (New Patient Consult) (Oldest Message First)</p>
                      <p className="text-xs text-gray-600">to P Ca Internal Medicine 15400 Front Office</p>
                      <p className="text-xs text-gray-600 mt-2">Appointment for:</p>
                      <p className="text-xs text-gray-600">Visit type: NEW PATIENT (15400061) MD in SGSV IM LOS (40 minutes) with GATOS 15400 LOS GATOS BLVD</p>
                      <p className="text-xs text-gray-600 mt-2">Patient comments:</p>
                      <p className="text-xs text-gray-600">Annual physical</p>
                      <p className="text-xs text-gray-600">Weight management</p>
                    </div>

                    <div className="text-right text-xs text-gray-400 mt-8">3/5</div>
                  </>
                )}

                {currentPage === 4 && (
                  <>
                    <div className="mb-4 text-xs text-gray-600">
                      <p>System to (Name not recorded)</p>
                      <p className="mt-2">Sutter Health you have an upcoming visit on ← S</p>
                      <p>Reply Y to confirm, or N to cancel.</p>
                      <p>Reply STOP to opt-out.</p>
                    </div>

                    <div className="mb-4 text-xs text-gray-600">
                      <p>System to (Name not recorded)</p>
                      <p className="mt-2">Sutter Health you have an upcoming visit on ← S</p>
                      <p>Reply Y to confirm, or N to cancel.</p>
                      <p>Reply STOP to opt-out.</p>
                    </div>

                    <div className="mb-4 text-xs text-gray-600">
                      <p>Ifc, Ehr Lab Orders And Results Anywhere In routed this conversation to EI MD</p>
                      <p className="mt-2 italic">Notes are filtered from this report.</p>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">Orders Placed</h2>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>- FIT-DNA (COLOGUARD) (Resulted)</p>
                        <p>- CBC WITHOUT DIFFERENTIAL</p>
                        <p>- COMPREHENSIVE METABOLIC PANEL W GER</p>
                        <p>- HEMOGLOBIN A1C</p>
                        <p>- LIPID PROFILE</p>
                        <p>- PR OFFICE VISIT TRACKING LEVEL 4</p>
                        <p>- REFERRAL TO SLEEP DISORDERS, INT</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">Medication Changes</h2>
                      <table className="w-full text-xs border-collapse border border-gray-300 mb-3">
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1 font-medium bg-gray-50">Added:</td>
                            <td className="border border-gray-300 px-2 py-1">
                              <HighlightWrapper category="Diagnosis / Indication">
                                tirzepatide (ZEPBOUND) 2.5mg/0.5mL Auto Injector
                              </HighlightWrapper>
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Refills</td>
                            <td className="border border-gray-300 px-2 py-1">1</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Start Date</td>
                            <td className="border border-gray-300 px-2 py-1"></td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">End Date</td>
                            <td className="border border-gray-300 px-2 py-1"></td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Administer</td>
                            <td className="border border-gray-300 px-2 py-1">0.5 mL subcutaneously once weekly</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1" colSpan={2}>After 4 weeks contact your physician for follow up. - Subcutaneous</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">Medication List at End of Visit</h2>
                      <table className="w-full text-xs border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-2 py-1 text-left">Medication</th>
                            <th className="border border-gray-300 px-2 py-1">Refills</th>
                            <th className="border border-gray-300 px-2 py-1">Start Date</th>
                            <th className="border border-gray-300 px-2 py-1">End Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Calcium Carbonate-Vit D-Min (CALCIUM 1200 PO)<br /><span className="text-gray-500">Take by mouth - Oral</span></td>
                            <td className="border border-gray-300 px-2 py-1 text-center"></td>
                            <td className="border border-gray-300 px-2 py-1 text-center"></td>
                            <td className="border border-gray-300 px-2 py-1 text-center">4/5</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="text-right text-xs text-gray-400 mt-8">4/5</div>
                  </>
                )}

                {currentPage === 5 && (
                  <>
                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">Patient-reported medication</h2>
                      <table className="w-full text-xs border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-2 py-1 text-left">Medication</th>
                            <th className="border border-gray-300 px-2 py-1 text-left">Dosage</th>
                            <th className="border border-gray-300 px-2 py-1 text-left">Instructions</th>
                            <th className="border border-gray-300 px-2 py-1 text-left">Route</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">clonazePAM (KLONOPIN)</td>
                            <td className="border border-gray-300 px-2 py-1">0.5mg Tab</td>
                            <td className="border border-gray-300 px-2 py-1">Take one Tab by mouth twice daily as needed</td>
                            <td className="border border-gray-300 px-2 py-1">Oral</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Collagen-Vitamin C-Biotin (COLLAGEN 1500/C)</td>
                            <td className="border border-gray-300 px-2 py-1">500-50-0.8 MG CAPS</td>
                            <td className="border border-gray-300 px-2 py-1">Take by mouth</td>
                            <td className="border border-gray-300 px-2 py-1">Oral</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">gabapentin (NEURONTIN)</td>
                            <td className="border border-gray-300 px-2 py-1">100mg Cap</td>
                            <td className="border border-gray-300 px-2 py-1">Take one Cap by mouth daily at bedtime</td>
                            <td className="border border-gray-300 px-2 py-1">Oral</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">ibuprofen (ADVIL LIQUI-GELS)</td>
                            <td className="border border-gray-300 px-2 py-1">200mg Cap</td>
                            <td className="border border-gray-300 px-2 py-1">Take one Cap by mouth every 6 hours as needed for Pain</td>
                            <td className="border border-gray-300 px-2 py-1">Oral</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Methylcobalamin (B12-ACTIVE PO)</td>
                            <td className="border border-gray-300 px-2 py-1"></td>
                            <td className="border border-gray-300 px-2 py-1">Take by mouth</td>
                            <td className="border border-gray-300 px-2 py-1">Oral</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Multiple Vitamins-Minerals (MULTIVITAL PO)</td>
                            <td className="border border-gray-300 px-2 py-1"></td>
                            <td className="border border-gray-300 px-2 py-1">Take by mouth</td>
                            <td className="border border-gray-300 px-2 py-1">Oral</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">tirzepatide (ZEPBOUND)</td>
                            <td className="border border-gray-300 px-2 py-1">2.5mg/0.5mL Auto Injector</td>
                            <td className="border border-gray-300 px-2 py-1">Administer 0.5 mL subcutaneously once weekly. After 4 weeks contact your physician for follow up.</td>
                            <td className="border border-gray-300 px-2 py-1">Subcutaneous</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800 mb-2">Visit Diagnoses</h2>
                      <table className="w-full text-xs border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-2 py-1 text-left">Diagnosis</th>
                            <th className="border border-gray-300 px-2 py-1 text-left">Code</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Primary: Encounter for preventive care</td>
                            <td className="border border-gray-300 px-2 py-1">Z00.00</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Insomnia, unspecified type</td>
                            <td className="border border-gray-300 px-2 py-1">G47.00</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Anxiety</td>
                            <td className="border border-gray-300 px-2 py-1">F41.9</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">
                              <HighlightWrapper category="BMI Requirements">
                                BMI 27.0-27.9, adult
                              </HighlightWrapper>
                            </td>
                            <td className="border border-gray-300 px-2 py-1">Z68.27</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">
                              <HighlightWrapper category="Weight-Related Comorbidities">
                                Sleep apnea, unspecified type
                              </HighlightWrapper>
                            </td>
                            <td className="border border-gray-300 px-2 py-1">G47.30</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Colon cancer screening</td>
                            <td className="border border-gray-300 px-2 py-1">Z12.11</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">
                              <HighlightWrapper category="Exclusions">
                                History of breast cancer
                              </HighlightWrapper>
                            </td>
                            <td className="border border-gray-300 px-2 py-1">Z85.3</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">Back pain, unspecified back location, unspecified back pain laterality, unspecified chronicity</td>
                            <td className="border border-gray-300 px-2 py-1">M54.9</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="text-right text-xs text-gray-400 mt-8">5/5</div>
                  </>
                )}
              </>
            ) : caseId === "2" ? (
              // James Wilson Chart Notes - Ozempic for MASH
              <>
                <div className="mb-6 border-b pb-4">
                  <div className="flex justify-between">
                    <div>
                      <h1 className="text-lg font-bold text-gray-800">Bay Area Gastroenterology Associates</h1>
                      <p className="text-xs text-gray-500">2500 Hospital Drive, Suite 300</p>
                    </div>
                    <div className="text-right text-xs text-gray-600">
                      <HighlightWrapper category="Prescriber">
                        <p>Dr. Michael Torres, MD</p>
                        <p>Internal Medicine</p>
                      </HighlightWrapper>
                    </div>
                  </div>
                </div>

                <div className="mb-4 rounded bg-gray-50 p-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">Patient:</span> John Travolta
                    </div>
                    <div>
                      <span className="text-gray-500">DOB:</span>{" "}
                      <HighlightWrapper category="Age">08/22/1972 (52 years old)</HighlightWrapper>
                    </div>
                    <div>
                      <span className="text-gray-500">MRN:</span> 583921
                    </div>
                    <div>
                      <span className="text-gray-500">Visit Date:</span> 01/14/2024
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Chief Complaint</h2>
                  <p className="text-xs text-gray-600">
                    Follow-up for metabolic dysfunction-associated steatohepatitis (MASH) and obesity. 
                    Patient interested in GLP-1 therapy for weight management and liver disease improvement.
                  </p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Assessment</h2>
                  <p className="text-xs text-gray-600">
                    1.{" "}
                    <HighlightWrapper category="Diagnosis">
                      Metabolic dysfunction-associated steatohepatitis (MASH) - K75.81
                    </HighlightWrapper>
                    <br />
                    2. Type 2 Diabetes Mellitus - E11.9<br />
                    3. Essential Hypertension - I10<br />
                    4. Dyslipidemia - E78.5
                  </p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Vitals</h2>
                  <p className="text-xs text-gray-600">
                      <HighlightWrapper category="BMI">
                        BP 142/88 | Pulse 78 | Temp 98.4°F | Height 1.78m (5'10") | 
                        Weight 148.3 kg (327 lb) | SpO2 96% | BMI 31.2 kg/m²
                      </HighlightWrapper>
                  </p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">History of Present Illness</h2>
                  <p className="text-xs text-gray-600">
                    52-year-old male with MASH confirmed on liver biopsy (F2 fibrosis, NAS 5). 
                    Recent FibroScan showed CAP 312 dB/m, liver stiffness 9.8 kPa. 
                    Patient reports difficulty with weight management.{" "}
                    <HighlightWrapper category="Lifestyle Modifications">
                      Patient completed a 6-month structured lifestyle intervention program including 
                      nutritionist consultations and supervised exercise regimen. Documented weight loss 
                      attempts with formal program involvement.
                    </HighlightWrapper>
                  </p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Liver Biopsy History</h2>
                  <p className="text-xs text-gray-600">
                    <HighlightWrapper category="Liver Biopsy">
                      Liver biopsy performed January 2023 (36 months ago) confirming MASH with F2 fibrosis, 
                      NAS score of 5. No repeat biopsy within the past 24 months.
                    </HighlightWrapper>
                  </p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Medication History</h2>
                  <p className="text-xs text-gray-600">
                    Current medications: Metformin 1000mg BID, Lisinopril 20mg daily, Atorvastatin 40mg daily.
                  </p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Past Medical History</h2>
                  <p className="text-xs text-gray-600">
                    <HighlightWrapper category="Exclusions">
                      - No history of medullary thyroid carcinoma<br />
                      - No MEN 2 syndrome<br />
                      - No pancreatitis history<br />
                      - Family history: Father with T2DM, Mother with HTN
                    </HighlightWrapper>
                  </p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Lab Results (01/10/2024)</h2>
                  <p className="text-xs text-gray-600">
                    AST: 58 U/L (H) | ALT: 72 U/L (H) | GGT: 85 U/L (H)<br />
                    HbA1c: 7.2% | Fasting glucose: 142 mg/dL<br />
                    Total cholesterol: 218 mg/dL | LDL: 138 mg/dL | HDL: 38 mg/dL | Triglycerides: 210 mg/dL
                  </p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Imaging</h2>
                  <p className="text-xs text-gray-600">
                    Liver ultrasound (12/2023): Hepatomegaly with diffuse increased echogenicity consistent with hepatic steatosis.<br />
                    FibroScan (01/2024): CAP 312 dB/m (S3), LSM 9.8 kPa (F2 fibrosis)
                  </p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Plan</h2>
                  <p className="text-xs text-gray-600">
                    1. Initiate semaglutide (Ozempic) 0.25mg SC weekly for MASH and weight management<br />
                    2. Refer to registered dietitian for structured lifestyle intervention<br />
                    3. Continue current medications<br />
                    4. Follow-up in 4 weeks for dose titration<br />
                    5. Repeat liver function tests in 3 months
                  </p>
                </div>

                <div>
                  <h2 className="mb-2 font-semibold text-gray-800">Allergies</h2>
                  <p className="text-xs text-gray-600">
                    No known drug allergies.
                  </p>
                </div>
              </>
            ) : caseId === "3" ? (
              // Maria Garcia Chart Notes - Dupixent for Atopic Dermatitis
              <>
                {currentPage === 1 && (
                  <>
                    {/* Page 1 Header */}
                    <div className="mb-6 border-b pb-4">
                      <div className="flex justify-between">
                        <div>
                          <h1 className="text-lg font-bold text-gray-800">Pacific Dermatology & Allergy Clinic</h1>
                          <p className="text-xs text-gray-500">450 Coastal Boulevard, Suite 200</p>
                          <p className="text-xs text-gray-500">San Francisco, CA 94107</p>
                        </div>
                        <div className="text-right text-xs text-gray-600">
                          <HighlightWrapper category="Prescriber Requirements">
                            <p className="font-medium">Dr. Rachel Kim, MD, FAAD</p>
                            <p>Board Certified Dermatologist</p>
                          </HighlightWrapper>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 rounded bg-gray-50 p-3 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-500">Patient:</span> Maria Garcia
                        </div>
                        <div>
                          <span className="text-gray-500">DOB:</span>{" "}
                          <HighlightWrapper category="Patient Eligibility (Age)">11/08/1990 (34 years old)</HighlightWrapper>
                        </div>
                        <div>
                          <span className="text-gray-500">MRN:</span> 847291
                        </div>
                        <div>
                          <span className="text-gray-500">Visit Date:</span> 01/15/2024
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Chief Complaint</h2>
                      <p className="text-xs text-gray-600">
                        {highlightSearchText("Follow-up for chronic atopic dermatitis. Patient reports persistent symptoms despite topical therapy. Requesting evaluation for systemic treatment options including Dupixent (dupilumab).")}
                      </p>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">History of Present Illness</h2>
                      <p className="text-xs text-gray-600">
                        {highlightSearchText("Maria Garcia is a ")}<HighlightWrapper category="Patient Eligibility (Age)">34-year-old female</HighlightWrapper>{highlightSearchText(" with a long-standing history of atopic dermatitis since childhood. She has experienced significant flares over the past 2 years affecting quality of life, sleep, and daily activities. Current symptoms include intense pruritus, erythematous patches on bilateral antecubital fossae, popliteal fossae, neck, and facial areas. SCORAD score: 58 (moderate-to-severe). IGA score: 4 (severe).")}
                      </p>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Assessment</h2>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>1.{" "}
                          <HighlightWrapper category="Diagnosis / Indication">
                            {highlightSearchText("Atopic dermatitis, moderate-to-severe (L20.81)")}
                          </HighlightWrapper>
                        </p>
                        <p className="pl-4">{highlightSearchText("- SCORAD: 58 (moderate-to-severe range)")}</p>
                        <p className="pl-4">{highlightSearchText("- IGA: 4 (severe)")}</p>
                        <p className="pl-4">{highlightSearchText("- BSA involvement: approximately 35%")}</p>
                        <p>{highlightSearchText("2. Allergic rhinitis (J30.9)")}</p>
                        <p>{highlightSearchText("3. Mild intermittent asthma, well-controlled (J45.20)")}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Prior Topical Therapy History</h2>
                      <div className="text-xs text-gray-600 space-y-2">
                        <p className="font-medium">{highlightSearchText("Failed/Inadequate Response to:")}</p>
                        <div className="pl-4 space-y-1">
                          <p>
                            <HighlightWrapper category="Prerequisites (Step Therapy)">
                              {highlightSearchText("1. Mometasone furoate 0.1% cream (high-potency topical corticosteroid) - Used for 8 weeks with minimal improvement, developed skin atrophy at application sites")}
                            </HighlightWrapper>
                          </p>
                          <p>
                            <HighlightWrapper category="Prerequisites (Step Therapy)">
                              {highlightSearchText("2. Tacrolimus 0.1% ointment (topical calcineurin inhibitor) - Used for 12 weeks, experienced burning sensation and inadequate symptom control, discontinued due to intolerance")}
                            </HighlightWrapper>
                          </p>
                          <p>{highlightSearchText("3. Triamcinolone 0.1% ointment - Partial response, symptoms recurred within days of discontinuation")}</p>
                          <p>{highlightSearchText("4. Eucrisa (crisaborole) 2% ointment - Trial for 6 weeks, minimal efficacy for moderate-to-severe disease")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 mt-8">1/3</div>
                  </>
                )}

                {currentPage === 2 && (
                  <>
                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Current Medications</h2>
                      <table className="w-full text-xs border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-2 py-1 text-left">Medication</th>
                            <th className="border border-gray-300 px-2 py-1 text-left">Dose</th>
                            <th className="border border-gray-300 px-2 py-1 text-left">Frequency</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Cetirizine (Zyrtec)")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("10mg")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Once daily")}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Hydrocortisone 2.5% cream")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Topical")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("PRN for mild flares")}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("CeraVe Moisturizing Cream")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Topical")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("BID")}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Fluticasone nasal spray")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("50mcg/spray")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("2 sprays each nostril daily")}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Biologic Medication Review</h2>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p className="font-medium">{highlightSearchText("Current Biologic Use:")}</p>
                        <p className="pl-4">
                          <HighlightWrapper category="Exclusions">
                            {highlightSearchText("Patient is NOT currently receiving any biologic medications. No history of Xolair (omalizumab), Rituxan (rituximab), Enbrel (etanercept), Remicade (infliximab), Inflectra (infliximab-dyyb), or any other biologic therapy.")}
                          </HighlightWrapper>
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Allergies</h2>
                      <div className="text-xs text-gray-600">
                        <p>{highlightSearchText("- Penicillin (rash)")}</p>
                        <p>{highlightSearchText("- No known allergies to dupilumab or any monoclonal antibodies")}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Physical Examination</h2>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><span className="font-medium">General:</span> {highlightSearchText("Well-appearing female in no acute distress")}</p>
                        <p><span className="font-medium">Vital Signs:</span> {highlightSearchText("BP 118/74, HR 72, Temp 98.4°F")}</p>
                        <p><span className="font-medium">Skin Examination:</span></p>
                        <div className="pl-4">
                          <p>{highlightSearchText("- Erythematous, lichenified plaques on bilateral antecubital and popliteal fossae")}</p>
                          <p>{highlightSearchText("- Scattered excoriations on arms, legs, and trunk")}</p>
                          <p>{highlightSearchText("- Xerosis generalized")}</p>
                          <p>{highlightSearchText("- Periorbital darkening (allergic shiners)")}</p>
                          <p>{highlightSearchText("- No signs of secondary bacterial infection")}</p>
                          <p>{highlightSearchText("- BSA affected: ~35%")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 mt-8">2/3</div>
                  </>
                )}

                {currentPage === 3 && (
                  <>
                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Plan</h2>
                      <div className="text-xs text-gray-600 space-y-2">
                        <p className="font-medium">{highlightSearchText("1. Dupixent (dupilumab) Initiation:")}</p>
                        <div className="pl-4 space-y-1">
                          <p>{highlightSearchText("- Loading dose: 600mg subcutaneous injection (two 300mg injections)")}</p>
                          <p>{highlightSearchText("- Maintenance dose: 300mg subcutaneous injection every 2 weeks")}</p>
                          <p>{highlightSearchText("- Prior authorization submitted to insurance")}</p>
                        </div>
                        <p className="font-medium">{highlightSearchText("2. Continue supportive care:")}</p>
                        <div className="pl-4 space-y-1">
                          <p>{highlightSearchText("- Emollient therapy BID")}</p>
                          <p>{highlightSearchText("- Antihistamine for pruritus as needed")}</p>
                          <p>{highlightSearchText("- Low-potency topical corticosteroid for acute flares")}</p>
                        </div>
                        <p className="font-medium">{highlightSearchText("3. Patient Education:")}</p>
                        <div className="pl-4 space-y-1">
                          <p>{highlightSearchText("- Reviewed Dupixent injection technique")}</p>
                          <p>{highlightSearchText("- Discussed potential side effects including injection site reactions, conjunctivitis")}</p>
                          <p>{highlightSearchText("- Provided Dupixent MyWay support program information")}</p>
                        </div>
                        <p className="font-medium">{highlightSearchText("4. Follow-up:")}</p>
                        <div className="pl-4">
                          <p>{highlightSearchText("- Return in 4 weeks to assess initial response")}</p>
                          <p>{highlightSearchText("- SCORAD and IGA reassessment at follow-up")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Medical Necessity Statement</h2>
                      <div className="text-xs text-gray-600 p-3 bg-gray-50 rounded border">
                        <p>
                          {highlightSearchText("Patient meets criteria for Dupixent (dupilumab) therapy based on:")}
                        </p>
                        <ul className="list-disc pl-4 mt-2 space-y-1">
                          <li>
                            <HighlightWrapper category="Diagnosis / Indication">
                              {highlightSearchText("Confirmed diagnosis of moderate-to-severe atopic dermatitis (ICD-10: L20.81)")}
                            </HighlightWrapper>
                          </li>
                          <li>
                            <HighlightWrapper category="Patient Eligibility (Age)">
                              {highlightSearchText("Patient age 34 years (≥6 months of age requirement met)")}
                            </HighlightWrapper>
                          </li>
                          <li>
                            <HighlightWrapper category="Prerequisites (Step Therapy)">
                              {highlightSearchText("Documented failure of TWO topical therapies: high-potency corticosteroid (mometasone) and topical calcineurin inhibitor (tacrolimus)")}
                            </HighlightWrapper>
                          </li>
                          <li>
                            <HighlightWrapper category="Exclusions">
                              {highlightSearchText("Not receiving concurrent biologic therapy")}
                            </HighlightWrapper>
                          </li>
                          <li>
                            <HighlightWrapper category="Prescriber Requirements">
                              {highlightSearchText("Prescribed by board-certified dermatologist (Dr. Rachel Kim, MD, FAAD)")}
                            </HighlightWrapper>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="mb-4 border-t pt-4">
                      <div className="text-xs text-gray-600">
                        <p><span className="font-medium">Electronically signed by:</span></p>
                        <p className="mt-1">
                          <HighlightWrapper category="Prescriber Requirements">
                            Dr. Rachel Kim, MD, FAAD<br />
                            Board Certified Dermatologist<br />
                            Pacific Dermatology & Allergy Clinic<br />
                            NPI: 1234567890
                          </HighlightWrapper>
                        </p>
                        <p className="mt-2 text-gray-400">Date: 01/15/2024 14:32 PST</p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 mt-8">3/3</div>
                  </>
                )}
              </>
            ) : caseId === "5" ? (
              // Emily Thompson Chart Notes - Humira for Rheumatoid Arthritis (missing Prior Therapy and Disease Activity)
              <>
                {currentPage === 1 && (
                  <>
                    {/* Page 1 Header */}
                    <div className="mb-6 border-b pb-4">
                      <div className="flex justify-between">
                        <div>
                          <h1 className="text-lg font-bold text-gray-800">Bay Area Rheumatology Center</h1>
                          <p className="text-xs text-gray-500">550 Medical Plaza, Suite 400</p>
                          <p className="text-xs text-gray-500">San Jose, CA 95128</p>
                        </div>
                        <div className="text-right text-xs text-gray-600">
                          <HighlightWrapper category="Prescriber">
                            <p className="font-medium">Dr. Lisa Wong, MD</p>
                            <p>Board Certified Rheumatologist</p>
                          </HighlightWrapper>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 rounded bg-gray-50 p-3 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-500">Patient:</span> Emily Thompson
                        </div>
                        <div>
                          <span className="text-gray-500">DOB:</span>{" "}
                          <HighlightWrapper category="Age">02/14/1995 (29 years old)</HighlightWrapper>
                        </div>
                        <div>
                          <span className="text-gray-500">MRN:</span> 629471
                        </div>
                        <div>
                          <span className="text-gray-500">Visit Date:</span> 01/15/2024
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Chief Complaint</h2>
                      <p className="text-xs text-gray-600">
                        {highlightSearchText("New patient consultation for rheumatoid arthritis management. Patient referred for evaluation of biologic therapy options.")}
                      </p>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">History of Present Illness</h2>
                      <p className="text-xs text-gray-600">
                        {highlightSearchText("Emily Thompson is a ")}<HighlightWrapper category="Age">29-year-old female</HighlightWrapper>{highlightSearchText(" with a diagnosis of rheumatoid arthritis confirmed 8 months ago. She presents today for evaluation of treatment options. Patient reports joint pain and stiffness primarily affecting her hands and wrists. Morning stiffness typically lasts 1-2 hours. She has been managing with NSAIDs and over-the-counter pain relievers.")}
                      </p>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Assessment</h2>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>1.{" "}
                          <HighlightWrapper category="Diagnosis">
                            {highlightSearchText("Rheumatoid arthritis, mild, with rheumatoid factor (M05.79)")}
                          </HighlightWrapper>
                        </p>
                        <p className="pl-4">{highlightSearchText("- Mild disease activity per clinical assessment")}</p>
                        <p className="pl-4">{highlightSearchText("- Seropositive RA, RF positive")}</p>
                        <p className="pl-4">{highlightSearchText("- Anti-CCP antibody positive")}</p>
                        <p>{highlightSearchText("2. Joint pain, multiple sites - well controlled with NSAIDs")}</p>
                        <p>{highlightSearchText("3. Morning stiffness - improving")}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Prior Treatment History</h2>
                      <div className="text-xs text-gray-600 space-y-2">
                        <p className="font-medium">{highlightSearchText("Current Medications:")}</p>
                        <div className="pl-4 space-y-1">
                          <p>{highlightSearchText("- Ibuprofen 600mg TID PRN for pain")}</p>
                          <p>{highlightSearchText("- Acetaminophen 500mg PRN")}</p>
                          <p>{highlightSearchText("- Calcium + Vitamin D supplement daily")}</p>
                        </div>
                        <p className="mt-2 font-medium text-amber-600">{highlightSearchText("Note: No prior DMARD therapy documented. Patient has not yet tried methotrexate or other conventional DMARDs.")}</p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 mt-8">1/4</div>
                  </>
                )}

                {currentPage === 2 && (
                  <>
                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Laboratory Results</h2>
                      <div className="text-xs text-gray-600 space-y-2">
                        <p className="font-medium">{highlightSearchText("Baseline Screening (12/15/2023):")}</p>
                        <table className="w-full text-xs border-collapse border border-gray-300 mb-3">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-2 py-1 text-left">Test</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">Result</th>
                              <th className="border border-gray-300 px-2 py-1 text-left">Reference</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-gray-300 px-2 py-1">
                                <HighlightWrapper category="Lab Work">
                                  {highlightSearchText("QuantiFERON-TB Gold")}
                                </HighlightWrapper>
                              </td>
                              <td className="border border-gray-300 px-2 py-1 text-green-600 font-medium">Negative</td>
                              <td className="border border-gray-300 px-2 py-1">Negative</td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 px-2 py-1">
                                <HighlightWrapper category="Lab Work">
                                  {highlightSearchText("Hepatitis B Surface Antigen")}
                                </HighlightWrapper>
                              </td>
                              <td className="border border-gray-300 px-2 py-1 text-green-600 font-medium">Negative</td>
                              <td className="border border-gray-300 px-2 py-1">Negative</td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 px-2 py-1">
                                <HighlightWrapper category="Lab Work">
                                  {highlightSearchText("Hepatitis C Antibody")}
                                </HighlightWrapper>
                              </td>
                              <td className="border border-gray-300 px-2 py-1 text-green-600 font-medium">Negative</td>
                              <td className="border border-gray-300 px-2 py-1">Negative</td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Rheumatoid Factor")}</td>
                              <td className="border border-gray-300 px-2 py-1">156 IU/mL</td>
                              <td className="border border-gray-300 px-2 py-1">&lt;14 IU/mL</td>
                            </tr>
                            <tr>
                              <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Anti-CCP Antibody")}</td>
                              <td className="border border-gray-300 px-2 py-1">248 U/mL</td>
                              <td className="border border-gray-300 px-2 py-1">&lt;20 U/mL</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Medical History</h2>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p className="font-medium">{highlightSearchText("Past Medical History:")}</p>
                        <div className="pl-4">
                          <p>{highlightSearchText("- Rheumatoid arthritis (diagnosed April 2023)")}</p>
                          <p>{highlightSearchText("- Seasonal allergies")}</p>
                          <p>{highlightSearchText("- No history of tuberculosis")}</p>
                          <p>{highlightSearchText("- No history of hepatitis")}</p>
                        </div>
                        <p className="font-medium mt-2">{highlightSearchText("Infection History:")}</p>
                        <div className="pl-4">
                          <p>
                            <HighlightWrapper category="Contraindications">
                              {highlightSearchText("No active infections. No history of recurrent infections. No hospitalizations for infections in past 5 years.")}
                            </HighlightWrapper>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Allergies</h2>
                      <div className="text-xs text-gray-600">
                        <p>{highlightSearchText("- Sulfa antibiotics (rash)")}</p>
                        <p>
                          <HighlightWrapper category="Contraindications">
                            {highlightSearchText("- No known allergies to adalimumab or other TNF inhibitors")}
                          </HighlightWrapper>
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 mt-8">2/4</div>
                  </>
                )}

                {currentPage === 3 && (
                  <>
                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Physical Examination</h2>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><span className="font-medium">General:</span> {highlightSearchText("Well-appearing female, no acute distress")}</p>
                        <p><span className="font-medium">Vital Signs:</span> {highlightSearchText("BP 118/72, HR 68, Temp 98.2°F")}</p>
                        <p><span className="font-medium">Musculoskeletal Examination:</span></p>
                        <div className="pl-4">
                          <p>{highlightSearchText("- Bilateral MCP joints: mild swelling noted")}</p>
                          <p>{highlightSearchText("- Bilateral PIP joints: tenderness to palpation")}</p>
                          <p>{highlightSearchText("- Wrists: limited range of motion bilaterally")}</p>
                          <p>{highlightSearchText("- No nodules palpated")}</p>
                          <p>{highlightSearchText("- Grip strength: mildly reduced bilaterally")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Disease Activity Assessment</h2>
                      <div className="text-xs text-gray-600 p-3 bg-amber-50 rounded border border-amber-200">
                        <p className="font-medium text-amber-700">{highlightSearchText("⚠ Disease Activity Documentation Incomplete")}</p>
                        <p className="mt-2 text-amber-600">{highlightSearchText("Formal disease activity scores (DAS28, CDAI, or SDAI) were not calculated at this visit. ESR and CRP inflammatory markers were not ordered.")}</p>
                        <p className="mt-2 text-amber-600">{highlightSearchText("Clinical assessment suggests active disease based on physical examination findings, but objective measures are needed for documentation.")}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Imaging</h2>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p className="font-medium">{highlightSearchText("X-rays of Hands and Wrists (11/2023):")}</p>
                        <div className="pl-4">
                          <p>{highlightSearchText("- Periarticular osteopenia bilateral hands")}</p>
                          <p>{highlightSearchText("- No erosions identified at this time")}</p>
                          <p>{highlightSearchText("- Soft tissue swelling at MCP joints")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 mt-8">3/4</div>
                  </>
                )}

                {currentPage === 4 && (
                  <>
                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Plan</h2>
                      <div className="text-xs text-gray-600 space-y-2">
                        <p className="font-medium">{highlightSearchText("1. Humira (adalimumab) Requested:")}</p>
                        <div className="pl-4 space-y-1">
                          <p>{highlightSearchText("- Dosing: 40mg subcutaneous injection every 2 weeks")}</p>
                          <p>{highlightSearchText("- Prior authorization to be submitted")}</p>
                        </div>
                        <p className="font-medium">{highlightSearchText("2. Continue supportive care:")}</p>
                        <div className="pl-4 space-y-1">
                          <p>{highlightSearchText("- Continue NSAIDs as needed for pain")}</p>
                          <p>{highlightSearchText("- Physical therapy referral for hand exercises")}</p>
                        </div>
                        <p className="font-medium">{highlightSearchText("3. Patient Education:")}</p>
                        <div className="pl-4 space-y-1">
                          <p>{highlightSearchText("- Discussed biologic therapy options")}</p>
                          <p>{highlightSearchText("- Reviewed potential side effects including injection site reactions, infection risk")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Medical Necessity Statement</h2>
                      <div className="text-xs text-gray-600 p-3 bg-gray-50 rounded border">
                        <p>{highlightSearchText("Patient meets some criteria for Humira (adalimumab) therapy:")}</p>
                        <ul className="list-disc pl-4 mt-2 space-y-1">
                          <li>
                            <HighlightWrapper category="Diagnosis">
                              {highlightSearchText("Confirmed diagnosis of rheumatoid arthritis with rheumatoid factor (M05.79)")}
                            </HighlightWrapper>
                          </li>
                          <li>
                            <HighlightWrapper category="Age">
                              {highlightSearchText("Patient age 29 years (≥18 years requirement met)")}
                            </HighlightWrapper>
                          </li>
                          <li>
                            <HighlightWrapper category="Lab Work">
                              {highlightSearchText("TB and Hepatitis B/C screening completed and negative")}
                            </HighlightWrapper>
                          </li>
                          <li>
                            <HighlightWrapper category="Contraindications">
                              {highlightSearchText("No active or recurrent infections documented")}
                            </HighlightWrapper>
                          </li>
                          <li>
                            <HighlightWrapper category="Prescriber">
                              {highlightSearchText("Prescribed by board-certified rheumatologist")}
                            </HighlightWrapper>
                          </li>
                        </ul>
                        <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                          <p className="text-amber-700 font-medium">{highlightSearchText("Documentation gaps identified:")}</p>
                          <ul className="list-disc pl-4 mt-1 text-amber-600">
                            <li>{highlightSearchText("No prior DMARD therapy (e.g., methotrexate) trial documented")}</li>
                            <li>{highlightSearchText("Disease activity measures (DAS28/CDAI/SDAI, ESR, CRP) not documented")}</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 border-t pt-4">
                      <div className="text-xs text-gray-600">
                        <p><span className="font-medium">Electronically signed by:</span></p>
                        <p className="mt-1">
                          <HighlightWrapper category="Prescriber">
                            Dr. Lisa Wong, MD<br />
                            Board Certified Rheumatologist<br />
                            Bay Area Rheumatology Center<br />
                            NPI: 9876543210
                          </HighlightWrapper>
                        </p>
                        <p className="mt-2 text-gray-400">Date: 01/15/2024 10:45 PST</p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 mt-8">4/4</div>
                  </>
                )}
              </>
            ) : caseId === "6" ? (
              // David Park Chart Notes - Dupixent Reauthorization for Atopic Dermatitis
              <>
                {currentPage === 1 && (
                  <>
                    <div className="mb-6 border-b pb-4">
                      <div className="flex justify-between">
                        <div>
                          <h1 className="text-lg font-bold text-gray-800">Valley Dermatology & Skin Health</h1>
                          <p className="text-xs text-gray-500">1200 El Camino Real, Suite 350</p>
                          <p className="text-xs text-gray-500">Mountain View, CA 94040</p>
                        </div>
                        <div className="text-right text-xs text-gray-600">
                          <HighlightWrapper category="Prescriber Specialty">
                            <p className="font-medium">Dr. Nina Patel, MD, FAAD</p>
                            <p>Board Certified Dermatologist</p>
                          </HighlightWrapper>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 rounded bg-gray-50 p-3 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-500">Patient:</span> David Park
                        </div>
                        <div>
                          <span className="text-gray-500">DOB:</span>{" "}
                          <HighlightWrapper category="Age">07/19/1980 (45 years old)</HighlightWrapper>
                        </div>
                        <div>
                          <span className="text-gray-500">MRN:</span> 934827
                        </div>
                        <div>
                          <span className="text-gray-500">Visit Date:</span> 01/10/2024
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Chief Complaint</h2>
                      <p className="text-xs text-gray-600">
                        {highlightSearchText("Reauthorization visit for Dupixent (dupilumab). Patient has been on dupilumab 300mg Q2W for 14 months with significant clinical improvement. Requesting continued authorization.")}
                      </p>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">History of Present Illness</h2>
                      <p className="text-xs text-gray-600">
                        {highlightSearchText("David Park is a ")}<HighlightWrapper category="Age">45-year-old male</HighlightWrapper>{highlightSearchText(" with a history of moderate-to-severe atopic dermatitis since his early 20s. He was initiated on Dupixent in November 2022 after failing multiple topical and systemic therapies. Since starting dupilumab, the patient reports marked improvement in pruritus, skin lesions, and sleep quality. He has tolerated the medication well with no significant adverse effects.")}
                      </p>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Assessment</h2>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>1.{" "}
                          <HighlightWrapper category="Diagnosis">
                            {highlightSearchText("Atopic dermatitis, moderate-to-severe, well-controlled on dupilumab (L20.84)")}
                          </HighlightWrapper>
                        </p>
                        <p className="pl-4">{highlightSearchText("- Current EASI score: 4.2 (from baseline of 28.6)")}</p>
                        <p className="pl-4">{highlightSearchText("- IGA: 1 (almost clear) — baseline IGA was 4 (severe)")}</p>
                        <p className="pl-4">
                          <HighlightWrapper category="Clinical Response">
                            {highlightSearchText("- BSA involvement: <5% (down from 42% at baseline)")}
                          </HighlightWrapper>
                        </p>
                        <p className="pl-4">{highlightSearchText("- DLQI: 3 (minimal impact on quality of life, was 19 at baseline)")}</p>
                        <p>{highlightSearchText("2. Allergic rhinitis, perennial (J30.89) — stable")}</p>
                        <p>{highlightSearchText("3. Mild persistent asthma (J45.30) — well-controlled, no exacerbations since starting dupilumab")}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Treatment Response Summary</h2>
                      <div className="text-xs text-gray-600 space-y-2">
                        <p className="font-medium">{highlightSearchText("Dupilumab Treatment Timeline:")}</p>
                        <div className="pl-4 space-y-1">
                          <p>
                            <HighlightWrapper category="Prior Therapy">
                              {highlightSearchText("- Initiated dupilumab 600mg loading dose on 11/08/2022")}
                            </HighlightWrapper>
                          </p>
                          <p>{highlightSearchText("- Maintenance dose: 300mg subcutaneous Q2W, ongoing")}</p>
                          <p>{highlightSearchText("- Week 4 assessment: 40% improvement in EASI")}</p>
                          <p>{highlightSearchText("- Week 16 assessment: 75% improvement in EASI (EASI-75 achieved)")}</p>
                          <p>
                            <HighlightWrapper category="Clinical Response">
                              {highlightSearchText("- Current (Month 14): 85% improvement in EASI — sustained EASI-75 response")}
                            </HighlightWrapper>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 mt-8">1/3</div>
                  </>
                )}

                {currentPage === 2 && (
                  <>
                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Prior Therapy History (Pre-Dupixent)</h2>
                      <div className="text-xs text-gray-600 space-y-2">
                        <p className="font-medium">{highlightSearchText("Failed/Inadequate Response to:")}</p>
                        <div className="pl-4 space-y-1">
                          <p>
                            <HighlightWrapper category="Prior Therapy">
                              {highlightSearchText("1. Clobetasol propionate 0.05% ointment (super-high potency TCS) — 12-week trial, partial response with skin thinning noted, 2021")}
                            </HighlightWrapper>
                          </p>
                          <p>
                            <HighlightWrapper category="Prior Therapy">
                              {highlightSearchText("2. Tacrolimus 0.1% ointment (TCI) — 8-week trial, burning/stinging intolerable, discontinued 2021")}
                            </HighlightWrapper>
                          </p>
                          <p>{highlightSearchText("3. Cyclosporine 200mg daily — 6 months, effective but discontinued due to elevated creatinine (1.8 mg/dL), 2022")}</p>
                          <p>{highlightSearchText("4. Phototherapy (NB-UVB) — 24 sessions, moderate improvement but relapsed after discontinuation, 2022")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Current Medications</h2>
                      <table className="w-full text-xs border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-2 py-1 text-left">Medication</th>
                            <th className="border border-gray-300 px-2 py-1 text-left">Dose</th>
                            <th className="border border-gray-300 px-2 py-1 text-left">Frequency</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Dupixent (dupilumab)")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("300mg SQ")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Every 2 weeks")}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Cetirizine")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("10mg")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Daily PRN")}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("CeraVe Moisturizing Cream")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Topical")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("BID")}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Hydrocortisone 1% cream")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Topical")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("PRN for residual flares")}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Montelukast")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("10mg")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Daily")}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Adverse Effects Monitoring</h2>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>{highlightSearchText("- Injection site reactions: Mild erythema at injection site, self-resolving within 24 hours")}</p>
                        <p>{highlightSearchText("- Conjunctivitis: Mild bilateral conjunctivitis noted at month 3, managed with artificial tears, now resolved")}</p>
                        <p>{highlightSearchText("- No eosinophilia on recent CBC")}</p>
                        <p>{highlightSearchText("- No herpes simplex reactivation")}</p>
                        <p>
                          <HighlightWrapper category="Contraindications">
                            {highlightSearchText("- History of anaphylactic reaction to dupilumab: Patient experienced urticaria, angioedema, and dyspnea following 3rd injection (02/2023). Epinephrine administered in ED. Dupilumab was discontinued at that time but restarted 11/2023 after allergy evaluation with pre-medication protocol.")}
                          </HighlightWrapper>
                        </p>
                        <p>{highlightSearchText("- No concurrent biologic use.")}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Physical Examination</h2>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><span className="font-medium">General:</span> {highlightSearchText("Well-appearing male, no acute distress")}</p>
                        <p><span className="font-medium">Vital Signs:</span> {highlightSearchText("BP 122/78, HR 68, Temp 98.2°F, Wt 182 lbs")}</p>
                        <p><span className="font-medium">Skin Examination:</span></p>
                        <div className="pl-4">
                          <p>{highlightSearchText("- Minimal residual lichenification bilateral antecubital fossae")}</p>
                          <p>{highlightSearchText("- No active excoriations")}</p>
                          <p>{highlightSearchText("- Mild xerosis on bilateral lower extremities")}</p>
                          <p>{highlightSearchText("- No erythematous plaques")}</p>
                          <p>{highlightSearchText("- BSA affected: <5%")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 mt-8">2/3</div>
                  </>
                )}

                {currentPage === 3 && (
                  <>
                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Laboratory Results (12/20/2023)</h2>
                      <table className="w-full text-xs border-collapse border border-gray-300 mb-3">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-2 py-1 text-left">Test</th>
                            <th className="border border-gray-300 px-2 py-1 text-left">Result</th>
                            <th className="border border-gray-300 px-2 py-1 text-left">Reference</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Total IgE")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("850 IU/mL (↓ from 2,400 at baseline)")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("0–100 IU/mL")}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("Eosinophils (absolute)")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("0.3 × 10⁹/L")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("0.0–0.5 × 10⁹/L")}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("CBC")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("WNL")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("—")}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("CMP")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("WNL, Cr 1.0")}</td>
                            <td className="border border-gray-300 px-2 py-1">{highlightSearchText("—")}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Medical Necessity for Reauthorization</h2>
                      <div className="text-xs text-gray-600 p-3 bg-gray-50 rounded border">
                        <p>{highlightSearchText("Continued dupilumab therapy is medically necessary based on:")}</p>
                        <ul className="list-disc pl-4 mt-2 space-y-1">
                          <li>
                            <HighlightWrapper category="Diagnosis">
                              {highlightSearchText("Confirmed diagnosis of moderate-to-severe atopic dermatitis (ICD-10: L20.84)")}
                            </HighlightWrapper>
                          </li>
                          <li>
                            <HighlightWrapper category="Clinical Response">
                              {highlightSearchText("Sustained EASI-75 response with EASI score reduction from 28.6 to 4.2 (85% improvement)")}
                            </HighlightWrapper>
                          </li>
                          <li>
                            <HighlightWrapper category="Prior Therapy">
                              {highlightSearchText("Documented failure of topical corticosteroids, topical calcineurin inhibitors, cyclosporine, and phototherapy")}
                            </HighlightWrapper>
                          </li>
                          <li>{highlightSearchText("Significant improvement in quality of life (DLQI 19 → 3)")}</li>
                          <li>{highlightSearchText("Disease is expected to relapse if dupilumab is discontinued, as evidenced by prior relapse after cyclosporine and phototherapy cessation")}</li>
                        </ul>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="mb-2 font-semibold text-gray-800">Plan</h2>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>{highlightSearchText("1. Continue dupilumab 300mg subcutaneous injection every 2 weeks")}</p>
                        <p>{highlightSearchText("2. Continue emollient therapy and low-potency TCS PRN")}</p>
                        <p>{highlightSearchText("3. Reauthorization submitted for additional 12 months of therapy")}</p>
                        <p>{highlightSearchText("4. Follow-up in 3 months for ongoing monitoring")}</p>
                        <p>{highlightSearchText("5. Annual ophthalmology evaluation for conjunctivitis screening")}</p>
                      </div>
                    </div>

                    <div className="mb-4 border-t pt-4">
                      <div className="text-xs text-gray-600">
                        <p><span className="font-medium">Electronically signed by:</span></p>
                        <p className="mt-1">
                          <HighlightWrapper category="Prescriber Specialty">
                            Dr. Nina Patel, MD, FAAD<br />
                            Board Certified Dermatologist<br />
                            Valley Dermatology & Skin Health<br />
                            NPI: 1987654321
                          </HighlightWrapper>
                        </p>
                        <p className="mt-2 text-gray-400">Date: 01/10/2024 11:45 PST</p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 mt-8">3/3</div>
                  </>
                )}
              </>
            ) : caseId === "4" ? (
              // Robert Chen Chart Notes - Galantamine for Alzheimer's Dementia
              <>
                <div className="mb-6 border-b pb-4">
                  <div className="flex justify-between">
                    <div>
                      <h1 className="text-lg font-bold text-gray-800">Bay Area Neurology Associates</h1>
                      <p className="text-xs text-gray-500">450 Neuro Parkway, Suite 200, San Jose, CA 95128</p>
                    </div>
                    <div className="text-right text-xs text-gray-600">
                      <HighlightWrapper category="Prescriber">
                        <p className="font-semibold">Dr. James Park, MD</p>
                        <p>Neurology</p>
                      </HighlightWrapper>
                      <p className="mt-1">NPI: 1234567890</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4 rounded bg-gray-50 p-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-gray-500">Patient:</span> Robert Chen</div>
                    <div><span className="text-gray-500">MRN:</span> 88234571</div>
                    <div><span className="text-gray-500">Visit Date:</span> 01/10/2024</div>
                  </div>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Chief Complaint</h2>
                  <p className="text-xs text-gray-600">Follow-up for progressive memory loss and cognitive decline. Wife reports worsening difficulty managing finances, forgetting appointments, and repeating questions.</p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">History of Present Illness</h2>
                  <p className="text-xs text-gray-600">
                    Robert presents with a 2-year history of progressive cognitive decline. He was initially started on{" "}
                    <HighlightWrapper category="Prior Therapy">
                      donepezil (Aricept) 10mg daily in September 2023. After 4 months of therapy, donepezil was discontinued in January 2024 due to persistent gastrointestinal side effects including nausea, vomiting, and diarrhea despite dose titration attempts.
                    </HighlightWrapper>
                    {" "}Patient and family are requesting a trial of galantamine as an alternative cholinesterase inhibitor.
                  </p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Assessment</h2>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>1. Progressive cognitive decline with functional impairment</p>
                    <p className="pl-4">- MRI brain (11/2023): bilateral hippocampal atrophy, no vascular changes</p>
                    <p>2. Essential hypertension, controlled on lisinopril 10mg</p>
                    <p>3. Hyperlipidemia, managed with atorvastatin 20mg</p>
                  </div>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Cognitive Testing</h2>
                  <p className="text-xs text-gray-600"><HighlightWrapper category="MMSE Score">Mini-Mental State Examination (MMSE) performed today: Score 18/30. Deficits noted in recall (0/3), orientation to time (3/5), and serial 7s (2/5). Consistent with moderate cognitive impairment.</HighlightWrapper></p>
                  <p className="text-xs text-gray-600 mt-1">Montreal Cognitive Assessment (MoCA): 14/30. Clock drawing test: abnormal.</p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Allergies</h2>
                  <p className="text-xs text-gray-600"><HighlightWrapper category="Contraindications">Penicillin (rash). No known allergy to cholinesterase inhibitors. No prior adverse reaction to galantamine or rivastigmine.</HighlightWrapper></p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Medication History</h2>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Current Medications:</p>
                    <p className="pl-4">- Lisinopril 10mg daily</p>
                    <p className="pl-4">- Atorvastatin 20mg daily</p>
                    <p className="pl-4">- Vitamin D3 2000 IU daily</p>
                    <p className="mt-1">Discontinued Medications:</p>
                    <p className="pl-4"><HighlightWrapper category="Prior Therapy">- Donepezil (Aricept) 10mg daily — started 09/2023, discontinued 01/2024 due to intolerable GI side effects (nausea, vomiting, weight loss of 8 lbs)</HighlightWrapper></p>
                  </div>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Lab Results (12/20/2023)</h2>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><HighlightWrapper category="Renal Function">BUN: 18 mg/dL (normal) | Creatinine: 1.0 mg/dL | eGFR: 72 mL/min/1.73m² (normal renal function)</HighlightWrapper></p>
                    <p><HighlightWrapper category="Hepatic Function">AST: 24 U/L (normal) | ALT: 28 U/L (normal) | Alkaline Phosphatase: 65 U/L (normal) | Total Bilirubin: 0.8 mg/dL (normal). No evidence of hepatic impairment.</HighlightWrapper></p>
                    <p>CBC: WNL | TSH: 2.1 mIU/L (normal) | B12: 450 pg/mL (normal)</p>
                  </div>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Plan</h2>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>1. Initiate galantamine ER 8mg daily with food, titrate to 16mg after 4 weeks if tolerated</p>
                    <p>2. Prior authorization submitted for galantamine extended-release capsules</p>
                    <p>3. Follow-up in 4 weeks to assess tolerability and cognitive response</p>
                    <p>4. Caregiver education provided to wife regarding medication administration</p>
                    <p>5. Referral to neuropsychology for comprehensive cognitive battery in 3 months</p>
                  </div>
                </div>

                <div className="text-right text-xs text-gray-400 mt-8">1/1</div>
              </>
            ) : (caseId === "rosa-ozempic" || caseId === "rosa-ozempic-ai") ? (
              // Rosa Delgado — Ozempic Chart Notes (fax-style)
              <>
                {currentPage === 1 && (
                  <div className="font-mono text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
{`05/06/2025  10:11AM  5037689232        CASCADE FAMILY MEDICINE            PAGE 01/07


                        FAX COVER SHEET

TO:       Rightway Pharmacy Benefits
FAX:      (800) 555-0199
FROM:     Cascade Family Medicine
          1820 SW Canyon Rd
          Portland, OR 97221
          Phone: (503) 445-8820
          Fax:   (503) 445-8821

PROVIDER: Michael Torres, MD
NPI:      1876543210

RE:       Prior Authorization Request — Ozempic (semaglutide)
PATIENT:  Rosa Delgado   DOB: 10/15/1953   Member ID: W00714823

PAGES:    7 (including cover)

NOTES:
Requesting prior authorization for Ozempic 0.25mg weekly injection
for patient with uncontrolled Type 2 diabetes on maximum oral therapy.
Chart notes and supporting documentation attached.

CONFIDENTIALITY NOTICE: This fax contains confidential medical
information protected under HIPAA. If you are not the intended
recipient, please notify the sender immediately.`}
                    <div className="text-right text-gray-400 mt-8">1/7</div>
                  </div>
                )}

                {currentPage === 2 && (
                  <div className="font-mono text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
{`05/06/2025  10:11AM  5037689232        CASCADE FAMILY MEDICINE            PAGE 02/07


PATIENT DEMOGRAPHICS & INSURANCE INFORMATION

Patient:        Rosa Delgado
Date of Birth:  10/15/1953 (Age 71)
Gender:         Female
Address:        4215 NE Glisan St, Portland, OR 97213
Phone:          (503) 555-7823
Member ID:      W00714823

Emergency Contact: Maria Delgado (daughter) — (503) 555-4291

Insurance:      Employer Group Health Plan
Group #:        GRP-88421
Subscriber:     Self (Retired)

Primary Care Provider:  Michael Torres, MD
Clinic:                 Cascade Family Medicine
                        1820 SW Canyon Rd, Portland, OR 97221

Referral Source:        Self-referred / Established patient since 2014

Pharmacy:       Walgreens #12847
                3280 SE Hawthorne Blvd, Portland, OR 97214
                Phone: (503) 555-3390`}
                    <div className="text-right text-gray-400 mt-8">2/7</div>
                  </div>
                )}

                {currentPage === 3 && (
                  <div className="font-mono text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
{`05/06/2025  10:11AM  5037689232        CASCADE FAMILY MEDICINE            PAGE 03/07


OFFICE VISIT — 04/30/2025

Chief Complaint:
Follow-up for diabetes management. Blood sugars remain elevated
despite current multi-drug regimen. Patient reports increasing
fatigue and intermittent numbness in feet bilaterally.

History of Present Illness:
71-year-old female with long-standing Type 2 diabetes mellitus
(diagnosed 2016) presenting for routine diabetes follow-up.
Patient has been compliant with current medications including
metformin 1000mg BID, glimepiride 4mg daily, linagliptin 5mg
daily, and insulin glargine (Semglee) 50 units daily.

Despite adherence, home glucose readings average 180-220 mg/dL
fasting and 250-300 mg/dL postprandial. Patient reports weight
has been stable at 178 lbs (BMI ~32).

Previous trial of Bydureon (exenatide) in 2020 was discontinued
due to persistent nausea. Empagliflozin was also trialed but
discontinued due to recurrent vulvovaginal candidiasis.

Vitals:
  BP: 138/82 mmHg    HR: 74 bpm    Temp: 98.4°F
  Weight: 178 lbs    Height: 5'3"   BMI: 31.5 kg/m²
  SpO2: 97% on RA`}
                    <div className="text-right text-gray-400 mt-8">3/7</div>
                  </div>
                )}

                {currentPage === 4 && (() => {
                  const page4Text = `05/06/2025  10:11AM  5037689232        CASCADE FAMILY MEDICINE            PAGE 04/07


Cascade Family Medicine
1820 SW Canyon Rd
Portland, OR 97221
503-445-8820

Problem List (Active only)
• 08/17/2016 Active: Type 2 diabetes mellitus with diabetic neuropathy,
  unspecified (ICD10:E11.40); DM II w neuropathy; bydureon-> nausea;
  empagliflozin-> vulvovaginal candidiasis
• 10/09/2024 Active: Essential (primary) hypertension (ICD10:I10)
• 08/30/2023 Active: Low back pain (ICD10:M54.5)
• 10/04/2016 Active: Mixed hyperlipidemia (ICD10:E78.2); HLP
• 03/27/2019 Active: Obstructive sleep apnea (adult) (ICD10:G47.33)
• 10/04/2016 Active: Body mass index [BMI] 32.0-32.9, adult (ICD10:Z68.32)

Medications
• Active: 0.25 MG, 0.5 MG Dose 3 ML semaglutide 0.68 MG/ML Pen Injector
  [Ozempic]; INJECT 0.25 SUBCUTANEOUS ONCE A WEEK FOR 1 MONTH,
  THEN INCREASE TO 0.5MG SUBCUTANEOUS ONCE A WEEK
• Active: 3 ML insulin glargine-yfgn 100 UNT/ML Pen Injector [Semglee]
  QD 50 units; (ongoing)
• Active: atorvastatin 40 MG Oral Tablet; (ongoing)
• Active: glimepiride 4 MG Oral Tablet QD 1 unit; (ongoing)
• Active: linagliptin 5 MG Oral Tablet [Tradjenta] QD 1 unit; (ongoing)
• Active: metformin hydrochloride 1000 MG Oral Tablet; (ongoing);
  TAKE ONE TABLET BY MOUTH TWICE A DAY

Drug Allergies
• Bydureon (exenatide microspheres); unspecified reaction; onset 05/01/2020`;
                  return (
                    <div className="font-mono text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {caseId === "rosa-ozempic-ai" ? renderHighlightedRosaPage(page4Text, 4) : page4Text}
                      <div className="text-right text-gray-400 mt-8">4/7</div>
                    </div>
                  );
                })()}

                {currentPage === 5 && (
                  <div className="font-mono text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
{`05/06/2025  10:11AM  5037689232        CASCADE FAMILY MEDICINE            PAGE 05/07


LABORATORY RESULTS — 04/30/2025

Comprehensive Metabolic Panel:
  Glucose (fasting):    198 mg/dL    (H)   [ref: 70-100]
  BUN:                  22 mg/dL           [ref: 7-20]
  Creatinine:           1.1 mg/dL          [ref: 0.6-1.2]
  eGFR:                 58 mL/min          [ref: >60]
  Sodium:               141 mEq/L          [ref: 136-145]
  Potassium:            4.3 mEq/L          [ref: 3.5-5.0]
  Chloride:             102 mEq/L          [ref: 98-106]
  CO2:                  25 mEq/L           [ref: 23-29]
  Calcium:              9.4 mg/dL          [ref: 8.5-10.5]
  Total Protein:        7.1 g/dL           [ref: 6.0-8.3]
  Albumin:              4.0 g/dL           [ref: 3.5-5.5]
  AST:                  28 U/L             [ref: 10-40]
  ALT:                  32 U/L             [ref: 7-56]
  Alk Phos:             78 U/L             [ref: 44-147]
  Total Bilirubin:      0.6 mg/dL          [ref: 0.1-1.2]

Lipid Panel:
  Total Cholesterol:    192 mg/dL          [ref: <200]
  LDL:                  98 mg/dL     (H)   [ref: <70 for DM]
  HDL:                  52 mg/dL           [ref: >50]
  Triglycerides:        210 mg/dL    (H)   [ref: <150]

Urine Microalbumin:     18 mg/L            [ref: <30]  — Normal
Urine Creatinine:       125 mg/dL
Albumin/Creat Ratio:    14.4 mg/g          [ref: <30]  — Normal

Thyroid:
  TSH:                  2.8 mIU/L          [ref: 0.4-4.0]`}
                    <div className="text-right text-gray-400 mt-8">5/7</div>
                  </div>
                )}

                {currentPage === 6 && (() => {
                  const page6Text = `05/06/2025  10:11AM  5037689232        CASCADE FAMILY MEDICINE            PAGE 06/07


Health Maintenance
Hemoglobin A1C:
• 04/30/2025 (8.1%) ||| 01/08/2025 (8.3%) ||| 09/11/2024 (8.9%) |||
  05/08/2024 (8.5%) ||| 02/07/2024 (7.8%) ||| 08/30/2023 (8.7%) |||
  11/16/2022 (7.2%) ||| 05/18/2022 (7.1%)

Assessment / Plan
# DM II w/ neuropathy. BG's remains high. Intol of bydureon, empagliflozin.
  BG's uncontrolled on glargine, glimepiride, metformin, and linagliptan.
  A1c currently 8.1%. Normal microalbumin level. Recent normal retinal exam.
  - cont metformin 1000mg BID, linagliptan 5mg daily, glimepiride 4mg daily
  - insulin glargine (semglee) 50 units daily
  - start Ozempic 0.25mg weekly, will likely need to progressively lower
    insulin dose once she starts this
  - DexCom 13 sensors / 90 days

# HTN. Borderline controlled.
  - cont losartan 100mg daily, HCTZ 25/37.5mg daily

# HLP. LDL controlled, goal < 70.
  - cont atorvastatin 40mg nightly, encouraged carb reduction`;
                  return (
                    <div className="font-mono text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {caseId === "rosa-ozempic-ai" ? renderHighlightedRosaPage(page6Text, 6) : page6Text}
                      <div className="text-right text-gray-400 mt-8">6/7</div>
                    </div>
                  );
                })()}

                {currentPage === 7 && (
                  <div className="font-mono text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
{`05/06/2025  10:11AM  5037689232        CASCADE FAMILY MEDICINE            PAGE 07/07


Signature

Michael Torres, MD — 05/02/2025 12:24pm PDT

[ END PRIMARY CARE GENERATED NOTE ]


═══════════════════════════════════════════════════════════════

ATTESTATION:
I certify that the above information is true and accurate to the
best of my knowledge. This documentation is submitted in support
of the prior authorization request for the medication listed above.

Electronically signed by:
Michael Torres, MD
Cascade Family Medicine
NPI: 1876543210
Date: 05/06/2025

═══════════════════════════════════════════════════════════════`}
                    <div className="text-right text-gray-400 mt-8">7/7</div>
                  </div>
                )}
              </>
            ) : (
              // Default Chart Notes
              <>
                <div className="mb-6 border-b pb-4">
                  <div className="flex justify-between">
                    <div>
                      <h1 className="text-lg font-bold text-gray-800">HealthFirst Medical Center</h1>
                      <p className="text-xs text-gray-500">123 Medical Drive, Suite 100</p>
                    </div>
                    <div className="text-right text-xs text-gray-600">
                      <HighlightWrapper category="Prescriber Specialty">
                        <p>Dr. Amanda Foster, MD</p>
                        <p>Dermatology</p>
                      </HighlightWrapper>
                    </div>
                  </div>
                </div>

                <div className="mb-4 rounded bg-gray-50 p-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">Patient:</span> Patient Name
                    </div>
                    <div>
                      <span className="text-gray-500">DOB:</span>{" "}
                      <HighlightWrapper category="Age">Patient DOB</HighlightWrapper>
                    </div>
                    <div>
                      <span className="text-gray-500">MRN:</span> 000000
                    </div>
                    <div>
                      <span className="text-gray-500">Visit Date:</span> Visit Date
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Chief Complaint</h2>
                  <p className="text-xs text-gray-600">
                    Follow-up visit for ongoing condition management.
                  </p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Assessment</h2>
                  <p className="text-xs text-gray-600">
                    1.{" "}
                    <HighlightWrapper category="Diagnosis">
                      Primary diagnosis documented
                    </HighlightWrapper>
                  </p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Medication History</h2>
                  <p className="text-xs text-gray-600">
                    -{" "}
                    <HighlightWrapper category="Prior Therapy">
                      Prior therapy documented
                    </HighlightWrapper>
                  </p>
                </div>

                <div className="mb-4">
                  <h2 className="mb-2 font-semibold text-gray-800">Allergies</h2>
                  <p className="text-xs text-gray-600">
                    <HighlightWrapper category="Contraindications">
                      Allergy information documented
                    </HighlightWrapper>
                  </p>
                </div>

                <div>
                  <h2 className="mb-2 font-semibold text-gray-800">Plan</h2>
                  <p className="text-xs text-gray-600">
                    Treatment plan documented.
                  </p>
                </div>
              </>
            )}
        </div>
  );

  return (
    <div className="flex h-full flex-col rounded-xl bg-card overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-input bg-background px-3 py-1 text-xs font-medium transition-colors hover:text-[#1677ff] hover:border-[#1677ff] [&:hover_svg]:stroke-[#1677ff]">
                {documentOptions.find(d => d.value === selectedDocument)?.label || "Chart Notes"}
                <ChevronDown className="h-3 w-3 opacity-50 transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {documentOptions.map(d => (
                <DropdownMenuItem key={d.value} onClick={() => { setSelectedDocument(d.value); setCurrentPage(1); }}>
                  {d.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(215,90%,95%)] border border-[hsl(215,80%,75%)] px-2 py-0.5 text-xs text-[hsl(215,80%,45%)] font-medium">
            <Paperclip className="h-3 w-3" />
            {totalDocuments}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Split pages */}
          {SHOW_FAX_SPLIT && <>
          <Popover open={splitOpen} onOpenChange={(o) => { setSplitOpen(o); if (!o) setSplitError(null); }}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Split pages">
                <Scissors className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-3">
              <p className="text-xs font-semibold text-gray-800">Split pages</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Target pages from this document (e.g. 2, 4-6)
              </p>
              <Input
                value={splitInput}
                onChange={(e) => { setSplitInput(e.target.value); setSplitError(null); }}
                placeholder={`1-${totalPages}`}
                className="mt-2 h-8 text-xs"
              />
              {splitError && <p className="mt-1 text-[11px] text-red-500">{splitError}</p>}
              <div className="mt-3 flex flex-col gap-1.5">
                <Button variant="outline" size="sm" className="h-7 justify-start text-xs" onClick={() => runSplitAction("dismiss")}>
                  Detach and Dismiss
                </Button>
                <Button variant="outline" size="sm" className="h-7 justify-start text-xs" onClick={() => runSplitAction("member")}>
                  Detach and Assign to New Member
                </Button>
                <Button size="sm" className="h-7 justify-start bg-[#12275e] text-xs hover:bg-[#12275e]/90" onClick={() => runSplitAction("case")}>
                  Detach and Create New Case
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <MemberSearchModal
            open={splitMemberOpen}
            onCancel={() => setSplitMemberOpen(false)}
            title={splitIntent === "case" ? "Create new case for member" : "Assign detached pages to member"}
            onSelect={(m) => {
              if (splitIntent === "case") detachToNewCase(splitTargetPages, m.name);
              else detachToMember(splitTargetPages, m.name);
              setSplitMemberOpen(false);
              setSplitInput("");
            }}
          />
          </>}

          {/* View mode toggle */}
          <div className="mr-1 inline-flex items-center rounded-md border border-input bg-background p-0.5">
            <button

              onClick={() => setViewMode("single")}
              title="Single Page"
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                viewMode === "single" ? "bg-[#12275e] text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileText className="h-3 w-3" />
              Single Page
            </button>
            <button
              onClick={() => setViewMode("all")}
              title="All Pages"
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                viewMode === "all" ? "bg-[#12275e] text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-3 w-3" />
              All Pages
            </button>
          </div>

          {searchOpen ? (
            <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-6 w-32 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
                autoFocus
              />
              {matchCount > 0 && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {currentMatch}/{matchCount}
                </span>
              )}
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={goToPrevMatch} disabled={matchCount === 0}>
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={goToNextMatch} disabled={matchCount === 0}>
                <ChevronDown className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={clearSearch}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(200, zoom + 25))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(50, zoom - 25))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* All Pages grid */}
      {viewMode === "all" && (
        <div className="flex flex-1 min-h-0 flex-col bg-muted/50">
          {removedPages.size > 0 && (
            <div className="flex flex-wrap items-center gap-1 border-b border-border bg-card px-3 py-2">
              <span className="mr-1 text-[11px] font-medium text-gray-700">
                Removed pages ({removedPages.size})
              </span>
              {Array.from(removedPages).sort((a, b) => a - b).map(p => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]"
                >
                  Page {p}
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => toggleRemovedPage(p)}
                    aria-label={`Restore page ${p}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                className="ml-1 text-[11px] text-[#1677ff] hover:underline"
                onClick={() => setRemovedPages(new Set())}
              >
                Restore all
              </button>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visiblePages.map(p => {
                const isSelected = SHOW_FAX_SPLIT && selectedGridPages.has(p);
                return (
                  <div key={p} className="group relative">
                    <button
                      onClick={() => { setCurrentPage(p); setViewMode("single"); }}
                      className={cn(
                        "block w-full rounded-md border bg-white p-3 text-left transition-shadow hover:shadow-md",
                        isSelected ? "border-[#12275e] ring-2 ring-[#12275e]/40" : "border-border",
                      )}
                      style={{ aspectRatio: "8.5 / 11" }}
                      title={`Open page ${p}`}
                    >
                      <div className="flex h-full flex-col gap-1.5 overflow-hidden">
                        {[80, 60, 90, 70, 85, 55, 75, 65, 88, 72].map((w, i) => (
                          <div key={i} className="h-1.5 rounded-sm bg-muted" style={{ width: `${w}%` }} />
                        ))}
                      </div>
                    </button>
                    {SHOW_FAX_SPLIT && <button
                      onClick={(e) => { e.stopPropagation(); toggleGridPage(p); }}
                      aria-label={`Select page ${p}`}
                      className={cn(
                        "absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded border transition-opacity",
                        isSelected
                          ? "border-[#12275e] bg-[#12275e] text-white opacity-100"
                          : "border-input bg-white text-transparent opacity-0 group-hover:opacity-100",
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </button>}
                    <div className="mt-1 text-center text-[11px] text-muted-foreground">Page {p}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selection action bar */}
          {SHOW_FAX_SPLIT && <>
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-card px-3 py-2">
            <span className="mr-auto text-xs text-muted-foreground">
              {hasGridSelection
                ? `${selectedPageList.length} page${selectedPageList.length === 1 ? "" : "s"} selected`
                : "Select pages to detach"}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={!hasGridSelection}
              onClick={() => { detachAndDismiss(selectedPageList, caseId ?? undefined); setSelectedGridPages(new Set()); }}
            >
              Detach and Dismiss
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={!hasGridSelection}
              onClick={() => { setGridMemberPickerIntent("transaction"); setGridMemberPickerOpen(true); }}
            >
              Detach and Assign to New Member
            </Button>
            <Button
              size="sm"
              className="h-7 bg-[#12275e] text-xs hover:bg-[#12275e]/90"
              disabled={!hasGridSelection}
              onClick={() => { setGridMemberPickerIntent("case"); setGridMemberPickerOpen(true); }}
            >
              Detach and Create New Case
            </Button>
          </div>

          <MemberSearchModal
            open={gridMemberPickerOpen}
            onCancel={() => setGridMemberPickerOpen(false)}
            title={gridMemberPickerIntent === "case" ? "Create new case for member" : "Assign detached pages to member"}
            onSelect={(m) => {
              if (gridMemberPickerIntent === "case") detachToNewCase(selectedPageList, m.name);
              else detachToMember(selectedPageList, m.name);
              setGridMemberPickerOpen(false);
              setSelectedGridPages(new Set());
            }}
          />
          </>}
        </div>
      )}

      {/* PDF Viewer */}
      <div className={cn("relative flex-1 min-h-0 overflow-hidden bg-muted/50 p-4", viewMode === "all" && "hidden")}>

        {/* Source-elsewhere overlay for Robert Chen */}
        {caseId === "4" && (highlightedRule?.toLowerCase() === "age" || highlightedRule?.toLowerCase() === "diagnosis") && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
            onClick={(e) => { e.stopPropagation(); onClearHighlight?.(); }}
          >
            <div className="mx-6 max-w-sm rounded-lg border border-orange-200 bg-white px-5 py-4 text-center shadow-xl">
              {highlightedRule?.toLowerCase() === "age" ? (
                <>
                  <p className="text-sm font-semibold text-gray-800">Criteria pulled from Case Details</p>
                  <p className="mt-1 text-xs text-gray-500">This information has been found in the member details.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-800">Criteria pulled from Internal Notes</p>
                  <p className="mt-1 text-xs text-gray-500">This information has been found in the internal notes.</p>
                </>
              )}
            </div>
          </div>
        )}
        <div
          ref={scrollContainerRef}
          className="relative h-full overflow-y-auto"
          onScroll={handlePageScroll}
        >
          <div
            className="relative mx-auto flex flex-col gap-4 pb-4"
            style={{ maxWidth: `${(8.5 * 72 * zoom) / 100}px` }}
          >
          {/* Missing criteria banner - sticky above the note */}
          {highlightedRuleMissing && highlightedRule && caseId !== "rosa-ozempic-ai" && (
            <div className="sticky top-0 z-10 flex items-center gap-2 rounded-t-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800 shadow-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
              <span className="font-medium">Unable to find in chart note</span>
            </div>
          )}
            {leadingPage && (
              <div data-page-index={0} className="bg-white shadow-lg">
                {leadingPage}
              </div>
            )}
            {scrollPages.map((p, i) => (
              <div
                key={p}
                data-page-index={i + leadOffset}
                className="bg-white shadow-lg cursor-pointer"
                onClick={onClearHighlight}
              >
                {renderPage(p)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Page Navigation Footer */}
      <div className={cn("flex items-center justify-center border-t border-border px-4 py-2 gap-2", viewMode === "all" && "hidden")}>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scrollToPageIndex(scrollIndex - 1)} disabled={scrollIndex <= 0}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground min-w-[60px] text-center">
          Page {Math.min(scrollIndex + 1, scrollTotal)} of {scrollTotal}
          {removedPages.size > 0 && (
            <span className="ml-1 text-[10px] text-red-500">({removedPages.size} removed)</span>
          )}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scrollToPageIndex(scrollIndex + 1)} disabled={scrollIndex >= scrollTotal - 1}>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

    </div>
  );
}
