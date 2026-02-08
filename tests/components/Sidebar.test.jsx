import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "../../src/components/Sidebar.jsx";

function renderSidebar(overrides) {
  var defaultProps = {
    search: "",
    setSearch: vi.fn(),
    autoR: true,
    setAutoR: vi.fn(),
    sel: null,
    setSel: vi.fn(),
    expanded: {},
    toggleExpand: vi.fn(),
    expandedStates: {},
    toggleExpandState: vi.fn(),
    countyLoading: {},
    loadedCounties: {},
  };
  var merged = Object.assign({}, defaultProps, overrides || {});
  return render(<Sidebar {...merged} />);
}

describe("Sidebar", function() {
  it("renders the Population Globe title", function() {
    renderSidebar();
    expect(screen.getByText("Population Globe")).toBeInTheDocument();
  });

  it("renders search input with aria-label", function() {
    renderSidebar();
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
  });

  it("shows Rotating when autoR is true", function() {
    renderSidebar({ autoR: true });
    expect(screen.getByText("Rotating")).toBeInTheDocument();
  });

  it("shows Paused when autoR is false", function() {
    renderSidebar({ autoR: false });
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  it("calls setAutoR when rotation button clicked", async function() {
    var setAutoR = vi.fn();
    renderSidebar({ autoR: true, setAutoR: setAutoR });
    await userEvent.click(screen.getByText("Rotating"));
    expect(setAutoR).toHaveBeenCalledWith(false);
  });

  it("calls setSearch on input change", async function() {
    var setSearch = vi.fn();
    renderSidebar({ setSearch: setSearch });
    await userEvent.type(screen.getByLabelText(/search/i), "i");
    expect(setSearch).toHaveBeenCalled();
  });

  it("displays entries count", function() {
    renderSidebar();
    expect(screen.getByText(/entries$/)).toBeInTheDocument();
  });

  it("renders selection detail panel for country", function() {
    renderSidebar({
      sel: { t: "c", n: "Brazil", p: 211000000, la: -14, lo: -51, iso: "BRA", subdivisions: [], al: ["Brazil"] },
    });
    expect(screen.getAllByText("Brazil").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("COUNTRY")).toBeInTheDocument();
    expect(screen.getByText("211,000,000")).toBeInTheDocument();
  });

  it("shows tier badge for subdivision selection", function() {
    renderSidebar({
      sel: { t: "s", n: "Texas", p: 30503301, parentIso: "USA", rg: "South", cp: "Austin" },
    });
    expect(screen.getByText("Texas")).toBeInTheDocument();
    expect(screen.getByText("Mega")).toBeInTheDocument();
  });

  it("renders color legend bar", function() {
    renderSidebar();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("has correct nav aria-label", function() {
    renderSidebar();
    expect(screen.getByRole("navigation", { name: /population data sidebar/i })).toBeInTheDocument();
  });
});
